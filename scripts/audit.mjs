#!/usr/bin/env node
// 기계로 확인할 수 있는 것만 확인한다. 판단이 필요한 것은 .claude/commands/audit.md 가 맡는다.
//
//   pnpm audit:repo            게이트 + 번들 측정 (.next 가 이미 있으면 그것을 읽는다)
//   pnpm audit:repo --build    앞에 프로덕션 빌드를 돌린다 (.next 를 지운다)
//   pnpm audit:repo --live     프로덕션 응답까지 확인한다
//   pnpm audit:repo --json     결과를 JSON 으로 stdout 에 쓴다

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const flags = new Set(process.argv.slice(2));
const asJson = flags.has("--json");
const results = [];
const log = (...a) => { if (!asJson) console.log(...a); };

// 예산. 실측으로 갱신한다. 넘으면 실패가 아니라 경고다.
const BUDGET = {
	clientJsGzipKb: 215,     // 2026-09-16 실측 205.7 KB
	buildSeconds: 90,        // 2026-09-16 실측 30.6 s
	ttfbSeconds: 2.0,
};

const ORIGIN = "https://hooninedev.com";

function record(area, name, status, detail) {
	results.push({ area, name, status, detail });
	const mark = { pass: "PASS", warn: "WARN", fail: "FAIL", info: "INFO" }[status];
	log(`  ${mark.padEnd(4)} ${name}${detail ? `  ${detail}` : ""}`);
}

function run(cmd) {
	const started = Date.now();
	try {
		const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		return { ok: true, out, seconds: (Date.now() - started) / 1000 };
	} catch (err) {
		return { ok: false, out: `${err.stdout ?? ""}${err.stderr ?? ""}`, seconds: (Date.now() - started) / 1000 };
	}
}

function lastLine(text) {
	const lines = text.trim().split("\n").filter((l) => l.trim());
	return lines.at(-1) ?? "";
}

// 1. 게이트
log("\n게이트");
const GATES = [
	["pnpm -s content:dates", "content:dates"],
	["pnpm -s content:terms", "content:terms"],
	["pnpm -s content:glossary", "content:glossary"],
	["pnpm -s content:translations", "content:translations"],
	["pnpm -s content:hreflang", "content:hreflang"],
	["pnpm -s content:meta", "content:meta"],
	["pnpm -s test", "test"],
	["pnpm -s lint", "lint"],
];
for (const [cmd, name] of GATES) {
	const r = run(cmd);
	// lint 는 생성 파일(.contentlayer)까지 훑어서 빌드와 무관하게 빨간불이 난다. 경고로 둔다.
	const status = r.ok ? "pass" : name === "lint" ? "warn" : "fail";
	record("gate", name, status, `${r.seconds.toFixed(1)}s ${r.ok ? "" : lastLine(r.out)}`);
}

// 2. 매니페스트 등록 누락. validator 는 등록된 글만 돈다.
log("\n콘텐츠");
const manifest = JSON.parse(readFileSync("content/translations.json", "utf8"));
const registered = new Set(manifest.posts.map((p) => p.key));
// index.md 가 없는 디렉터리는 글이 아니다. 빈 디렉터리가 남아 매니페스트 누락으로 오인되지 않게 한다.
const postDirs = readdirSync("content").filter((d) => /^\d{6}$/.test(d) && existsSync(join("content", d, "index.md")));
const emptyDirs = readdirSync("content", { withFileTypes: true })
	.filter((e) => e.isDirectory() && /^\d{6}$/.test(e.name) && !existsSync(join("content", e.name, "index.md")))
	.map((e) => e.name);
const unregistered = postDirs.filter((d) => !registered.has(d));
record(
	"content",
	"translations.json 등록",
	unregistered.length ? "fail" : "pass",
	`${postDirs.length}개 중 ${registered.size}개 등록${unregistered.length ? `, 누락: ${unregistered.join(", ")}` : ""}`,
);

// 프론트매터 필수 필드. 없으면 검색 노출은 되어도 클릭이 0 에 수렴한다.
const FRONT_REQUIRED = ["title", "date", "categories", "description", "keywords"];
const frontGaps = [];
for (const dir of postDirs) {
	for (const file of readdirSync(join("content", dir)).filter((f) => /^index(\.[\w-]+)?\.md$/.test(f))) {
		const raw = readFileSync(join("content", dir, file), "utf8");
		const front = raw.split(/^---\s*$/m)[1] ?? "";
		const missing = FRONT_REQUIRED.filter((k) => !new RegExp(`^${k}\\s*:`, "m").test(front));
		if (missing.length) frontGaps.push(`${dir}/${file}: ${missing.join(",")}`);
	}
}
record("content", "프론트매터 필수 필드", frontGaps.length ? "fail" : "pass", frontGaps.slice(0, 5).join(" | "));

// 비공개 글. 발행 전에 ignore 를 실제 카테고리로 바꿔야 한다.
const hidden = postDirs.filter((d) => {
	const p = join("content", d, "index.md");
	return existsSync(p) && /^categories\s*:.*\bignore\b/m.test(readFileSync(p, "utf8").split(/^---\s*$/m)[1] ?? "");
});
record("content", "빈 글 디렉터리", emptyDirs.length ? "warn" : "pass", emptyDirs.join(", "));
record("content", "비공개(ignore) 글", hidden.length ? "info" : "pass", hidden.join(", "));

// em dash 는 전역 지침이 금지한다. 그 근거가 "한국어 문장에서 번역투를 만든다" 이므로
// 같은 문제를 갖는 CJK 로케일까지만 본다. 영어·스페인어·포르투갈어에서 em dash 는
// 그 언어의 정상 구두점이라 걷어내면 문장이 나빠진다. (CLAUDE.md 의 로케일 예외 참고)
// 중국어의 겹낫표 破折号(——)는 그 언어의 표준 부호이므로 통과시킨다.
// 코드 블록은 번역본 5개가 원문과 바이트 단위로 같아야 하므로 손대지 않는다.
// 인용 블록과 :::original 은 외부 원문의 구두점을 그대로 둔다.
const DASH_CHECKED_FILES = ["index.md", "index.ja.md", "index.zh-CN.md"];
const dashHits = [];
for (const dir of postDirs) {
	for (const file of DASH_CHECKED_FILES) {
		const path = join("content", dir, file);
		if (!existsSync(path)) continue;
		let inFence = false;
		let inOriginal = false;
		readFileSync(path, "utf8").split("\n").forEach((line, i) => {
			if (/^\s*```/.test(line)) { inFence = !inFence; return; }
			if (/^:::original/.test(line)) inOriginal = true;
			else if (/^:::\s*$/.test(line)) inOriginal = false;
			if (inFence || inOriginal || line.startsWith(">")) return;
			// 破折号 제거를 인라인 코드 제거보다 먼저 한다. 순서를 바꾸면 코드 조각을 사이에 둔
			// 서로 다른 두 dash 가 붙어 보여서 겹부호로 오인된다.
			const prose = line.replace(/\u2014\u2014/g, "").replace(/`[^`]*`/g, "");
			if (/[\u2014\u2013]/.test(prose)) dashHits.push(`${path}:${i + 1}`);
		});
	}
}

// 이탤릭은 로케일 예외가 없다. 한글에서 렌더가 어색한 것이 이유의 절반이고,
// 나머지 절반은 강조 표기를 하나로 유지하는 것이다.
const italicHits = [];
for (const dir of postDirs) {
	for (const file of readdirSync(join("content", dir)).filter((f) => f.endsWith(".md"))) {
		const path = join("content", dir, file);
		let inFence = false;
		readFileSync(path, "utf8").split("\n").forEach((line, i) => {
			if (/^\s*```/.test(line)) { inFence = !inFence; return; }
			if (inFence) return;
			const prose = line.replace(/`[^`]*`/g, "").replace(/\*\*[^*]+\*\*/g, "");
			if (/(^|[^*\w])\*[^*\s][^*]*\*/.test(prose) || /(^|\s)_[^_\s][^_]*_(\s|$|[.,)])/.test(prose)) {
				italicHits.push(`${path}:${i + 1}`);
			}
		});
	}
}
record("content", "em/en dash (ko·ja·zh 산문)", dashHits.length ? "warn" : "pass", dashHits.slice(0, 5).join(" "));
record("content", "이탤릭 강조", italicHits.length ? "warn" : "pass", italicHits.slice(0, 5).join(" "));

// 이미지 참조가 디스크의 파일과 맞는지. contentlayer 캐시는 이것을 거짓 통과시킨다.
// 오래된 글은 이미지를 public/content/ 에 직접 두므로 양쪽을 다 본다.
const danglingImages = [];
for (const dir of postDirs) {
	for (const file of readdirSync(join("content", dir)).filter((f) => f.endsWith(".md"))) {
		const raw = readFileSync(join("content", dir, file), "utf8");
		for (const m of raw.matchAll(/!\[[^\]]*\]\((?!https?:)([^)?\s]+)/g)) {
			const ref = m[1];
			const candidates = ref.startsWith("/")
				? [join("public", ref.slice(1))]
				: [join("content", dir, ref), join("public", "content", dir, ref)];
			if (!candidates.some(existsSync)) danglingImages.push(`${dir}/${file} -> ${ref}`);
		}
	}
}
record("content", "이미지 참조", danglingImages.length ? "fail" : "pass", danglingImages.slice(0, 5).join(" | "));

// 3. 빌드와 번들
log("\n빌드");
if (flags.has("--build")) {
	const r = run("rm -rf .next && pnpm build");
	record("build", "pnpm build", r.ok ? "pass" : "fail", `${r.seconds.toFixed(1)}s`);
	if (r.seconds > BUDGET.buildSeconds) record("build", "빌드 시간 예산", "warn", `${r.seconds.toFixed(1)}s > ${BUDGET.buildSeconds}s`);
	if (!r.ok) { log(r.out.slice(-2000)); }
}

if (existsSync(".next/static/chunks")) {
	const chunks = readdirSync(".next/static/chunks").filter((f) => f.endsWith(".js"));
	const gzipBytes = chunks.reduce((sum, f) => sum + gzipSync(readFileSync(join(".next/static/chunks", f))).length, 0);
	const kb = gzipBytes / 1024;
	record("build", "client JS (gzip)", kb > BUDGET.clientJsGzipKb ? "warn" : "pass", `${kb.toFixed(1)} KB / 예산 ${BUDGET.clientJsGzipKb} KB, 청크 ${chunks.length}개`);

	// 소스맵은 업로드 후 지운다. 남으면 Netlify 함수 번들에 그대로 실린다.
	const maps = [];
	const walk = (dir) => {
		if (!existsSync(dir)) return;
		for (const e of readdirSync(dir, { withFileTypes: true })) {
			const p = join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.name.endsWith(".map")) maps.push(p);
		}
	};
	walk(".next/server");
	walk(".next/static");
	const mapMb = maps.reduce((s, p) => s + statSync(p).size, 0) / 1048576;
	record("build", "소스맵 잔존", maps.length ? "fail" : "pass", maps.length ? `${maps.length}개 ${mapMb.toFixed(1)} MB` : "없음");

	// 서버 전용 Sentry 구성을 유지하는지. 클라이언트 SDK 는 번들을 79 KB 늘린다.
	record(
		"build",
		"Sentry 서버 전용 구성",
		existsSync("src/instrumentation-client.ts") ? "warn" : "pass",
		existsSync("src/instrumentation-client.ts") ? "instrumentation-client.ts 가 생겼다" : "",
	);
} else {
	record("build", "번들 측정", "info", ".next 가 없다. --build 를 붙이거나 pnpm build 를 먼저 돌린다");
}

// 4. 프로덕션 응답
if (flags.has("--live")) {
	log("\n프로덕션");
	const SECURITY_HEADERS = [
		"strict-transport-security",
		"x-content-type-options",
		"x-frame-options",
		"referrer-policy",
		"content-security-policy",
		"permissions-policy",
	];
	const probe = (path) => {
		const r = run(`curl -sS -o /dev/null -D - -w '\\nHTTPCODE %{http_code}\\nTTFB %{time_starttransfer}\\n' -L '${ORIGIN}${path}'`);
		const code = /HTTPCODE (\d+)/.exec(r.out)?.[1];
		const ttfb = Number(/TTFB ([\d.]+)/.exec(r.out)?.[1] ?? 0);
		return { code, ttfb, headers: r.out.toLowerCase() };
	};

	for (const path of ["/", "/posts", "/sitemap.xml", "/robots.txt"]) {
		const { code, ttfb } = probe(path);
		const status = code !== "200" ? "fail" : ttfb > BUDGET.ttfbSeconds ? "warn" : "pass";
		record("live", `GET ${path}`, status, `${code} ttfb=${ttfb.toFixed(2)}s`);
	}

	const home = probe("/");
	const missingHeaders = SECURITY_HEADERS.filter((h) => !home.headers.includes(`${h}:`));
	record("live", "보안 헤더", missingHeaders.length ? "fail" : "pass", missingHeaders.join(", "));

	// 사이트맵이 비공개 글을 흘리는지
	const sitemap = run(`curl -sS '${ORIGIN}/sitemap.xml'`).out;
	const leaked = hidden.filter((d) => sitemap.includes(`/${d}`));
	record("live", "사이트맵 비공개 글 유출", leaked.length ? "fail" : "pass", leaked.join(", "));
	record("live", "사이트맵 URL 수", "info", String((sitemap.match(/<loc>/g) ?? []).length));
}

// 5. 요약
const counts = { fail: 0, warn: 0, pass: 0, info: 0 };
for (const r of results) counts[r.status]++;
if (asJson) {
	console.log(JSON.stringify({ generatedAt: new Date().toISOString(), counts, results }, null, 2));
} else {
	log(`\n요약: FAIL ${counts.fail} / WARN ${counts.warn} / PASS ${counts.pass} / INFO ${counts.info}`);
	log("판단이 필요한 항목은 .claude/commands/audit.md 로 이어서 본다.\n");
}
writeFileSync(".audit-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), counts, results }, null, 2));
process.exit(counts.fail ? 1 : 0);
