#!/usr/bin/env node
/**
 * 홈의 "오픈소스 기여" 목록을 GitHub 에서 다시 뽑아 `src/data/open-source.json` 에 쓴다.
 *
 * 런타임에 GitHub API 를 부르지 않고 이 파일을 커밋한다. 서버리스에서 외부 API 가
 * 응답 없이 매달린 전례가 있고(JIHOON-BLOG-2, -8), 검색 API 는 인증 없이 분당
 * 10회라 방문마다 부를 수 없다. 기여가 늘면 이 스크립트를 다시 돌린다.
 *
 * 대상은 머지된 PR 만이다. 닫혔지만 머지되지 않은 PR 은 기여라고 쓰지 않는다.
 * 저장소 범위는 `SCOPES` 가 정한다. 팀 프로젝트나 스터디 저장소가 섞이지 않게
 * 조직 단위로 허용한다.
 *
 * 사용: `pnpm oss:sync` (gh CLI 로그인이 필요하다)
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const AUTHOR = 'jiji-hoon96'
const SCOPES = ['org:TanStack', 'org:vitejs', 'org:toss', 'repo:colinhacks/zod', 'org:facebook', 'org:reactjs']
const OUTPUT = fileURLToPath(new URL('../src/data/open-source.json', import.meta.url))
// 조직 아바타도 같이 받아 둔다. 화면에서 github.com 이미지를 직접 걸면 방문마다
// 남의 origin 에 요청이 나가고, 48px 네 장이라 리포에 두는 편이 싸다.
const AVATAR_DIR = fileURLToPath(new URL('../public/oss/', import.meta.url))

function search(scope) {
  const raw = execFileSync(
    'gh',
    ['api', '-X', 'GET', 'search/issues', '-f', `q=author:${AUTHOR} type:pr is:merged ${scope}`, '-f', 'per_page=100'],
    { encoding: 'utf8' },
  )
  const { total_count: total, items } = JSON.parse(raw)
  if (total > items.length) throw new Error(`${scope}: ${total}건 중 ${items.length}건만 받았다. 페이지를 넘겨야 한다.`)
  return items.map((item) => ({
    repo: item.repository_url.split('/').slice(-2).join('/'),
    number: item.number,
    title: item.title.trim(),
    url: item.html_url,
    mergedAt: item.pull_request.merged_at.slice(0, 10),
  }))
}

const pulls = SCOPES.flatMap(search).sort(
  (a, b) => b.mergedAt.localeCompare(a.mergedAt) || a.repo.localeCompare(b.repo),
)
writeFileSync(OUTPUT, `${JSON.stringify(pulls, null, 2)}\n`)

// GitHub 는 아바타를 PNG 와 JPEG 로 섞어 준다. 확장자를 하나로 두려고 sharp 로 PNG 로 바꾼다.
const { createRequire } = await import('node:module')
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
mkdirSync(AVATAR_DIR, { recursive: true })
for (const owner of new Set(pulls.map((pull) => pull.repo.split('/')[0]))) {
  const response = await fetch(`https://github.com/${owner}.png?size=48`)
  if (!response.ok) throw new Error(`${owner} 아바타: ${response.status}`)
  await sharp(Buffer.from(await response.arrayBuffer())).png().toFile(`${AVATAR_DIR}${owner}.png`)
}
console.log(`${pulls.length}건을 ${OUTPUT} 에 썼다.`)
