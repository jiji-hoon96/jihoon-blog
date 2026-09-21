import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { FALLBACK_LOCALE } from "@/components/NotFoundScreen";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import AiReferralReporter from "@/components/AiReferralReporter";
import VisitPing from "@/components/VisitPing";
import { siteMetadata } from "@/lib/site-metadata";
import {
	getLanguageAlternates,
	isLocale,
	LOCALES,
	toPublicPath,
	type Locale,
} from "@/i18n/locales";
import { getDictionary } from "@/i18n/dictionaries";
import { getOpenGraphLocale } from "@/lib/localized-metadata";
import "../globals.css";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#111315" },
	],
};

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: string }>;
}): Promise<Metadata> {
	const { lang } = await params;
	if (!isLocale(lang)) {
		// `{}` 를 돌려주면 metadataBase 가 없어서, 파일 컨벤션이 만드는
		// opengraph-image 가 Next 기본값인 http://localhost:3000 에 대해 해석된다.
		// 프로덕션 404 응답에 `http://localhost:3000/999999/opengraph-image` 가
		// 그대로 실려 있었다. (실측)
		return {
			metadataBase: new URL(siteMetadata.siteUrl),
			robots: { index: false, follow: false },
		};
	}

	const dictionary = getDictionary(lang);
	const homePath = toPublicPath(lang, "/");
	const homeUrl = `${siteMetadata.siteUrl}${homePath}`;

	return {
		metadataBase: new URL(siteMetadata.siteUrl),
		title: {
			// 로케일마다 다른 제목을 준다. 전에는 6개 로케일 홈이 전부 같은
			// 한국어 제목이라 검색엔진에 언어 신호가 하나도 없었다.
			default: dictionary.siteTitle,
			template: `%s | ${siteMetadata.title}`,
		},
		description: dictionary.siteDescription,
		keywords: ["React", "Next.js", "TypeScript", "JavaScript", "Frontend"],
		authors: [{ name: siteMetadata.author.name, url: siteMetadata.siteUrl }],
		creator: siteMetadata.author.name,
		publisher: siteMetadata.author.name,
		alternates: {
			canonical: homeUrl,
			languages: getLanguageAlternates(siteMetadata.siteUrl, "/"),
			types: {
				"application/rss+xml": `${siteMetadata.siteUrl}${toPublicPath(lang, "/rss.xml")}`,
			},
		},
		openGraph: {
			title: dictionary.siteTitle,
			description: dictionary.siteDescription,
			url: homeUrl,
			siteName: siteMetadata.title,
			locale: getOpenGraphLocale(lang),
			alternateLocale: LOCALES.filter(candidate => candidate !== lang).map(
				getOpenGraphLocale,
			),
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: dictionary.siteTitle,
			description: dictionary.siteDescription,
		},
		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		verification: {
			google: "H_Kznnz38Boo3HJm1zCQjpG8Pxo3EZqhjkGd6Gdm-qU",
		},
	};
}

export function generateStaticParams() {
	return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({
	children,
    params,
}: Readonly<{
	children: React.ReactNode;
    params: Promise<{ lang: string }>;
}>) {
	const { lang } = await params;

	// 여기서 `notFound()` 를 부르면 `<html>` 을 그리기 전에 레이아웃이 사라진다.
	// 그러면 404 경계가 들어갈 자리가 없어서 Next 가 `<html id="__next_error__">`
	// 한 겹에 본문 0바이트를 내준다. 프로덕션에서 없는 슬러그가 그렇게 나갔다.
	// 404 판정은 페이지가 한다(`[lang]/page.tsx` 와 `[lang]/[slug]/page.tsx` 가
	// `notFound()` 를 부른다). 레이아웃은 껍데기를 그릴 언어만 정한다.
	const shellLang: Locale = isLocale(lang) ? lang : FALLBACK_LOCALE;

	return (
		<html lang={shellLang} suppressHydrationWarning>
			<head>
				{/* One-time kill switch: unregister stale Gatsby/old service worker that's
				    intercepting requests with cached Next 14/React 18 chunks. Runs first so
				    it can reload before the broken bundle executes. No-op once cleaned. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){if(!rs.length)return;Promise.all(rs.map(function(r){return r.unregister()})).then(function(){if(!('caches' in window))return window.location.reload();caches.keys().then(function(ks){Promise.all(ks.map(function(k){return caches.delete(k)})).then(function(){window.location.reload()})})})})})();`,
					}}
				/>
				{/* 폰트 CSS 는 여기서 직접 건다. globals.css 안에 @import 로 두면
				    app CSS 를 받아 파싱한 뒤에야 요청이 시작돼 왕복이 하나 더 붙는다.
				    preconnect 는 연결만 미리 열 뿐 요청 시점을 당기지 못한다.

				    업스트림 CSS 를 jsdelivr 에서 직접 받지 않는다. 그쪽은 굵기 7종
				    전부라 `@font-face` 644개인데 이 블로그가 쓰는 굵기는 둘이다.
				    `scripts/build-font-css.mjs` 가 400/700 만 남기고 폰트 URL 을
				    절대 경로로 바꿔 둔다. 다만 양쪽 다 brotli 로 협상되므로 CSS
				    전송 차이는 16,309 B 대 11,116 B 로 작다(실측). 이득은 첫 렌더를
				    막는 요청이 남의 origin 에 걸리지 않는 쪽이고, 큰 몫은 굵기를 줄여
				    폰트 파일 18개 236 KB 를 안 받게 된 것이다.
				    폰트 파일 자체는 그대로 jsdelivr 에서 받으므로 preconnect 는 남긴다. */}
				<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
				<link rel="stylesheet" href="/fonts/wanted-sans.css" />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="light">
					{/* 포커스를 받기 전에는 화면 밖에 둔다. Tab 한 번으로 헤더를 건너뛴다. */}
					<a
						href="#main-content"
						className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-canvas focus:px-4 focus:py-2 focus:text-ink focus:outline focus:outline-2 focus:outline-[var(--qa-accent)]"
					>
						{getDictionary(shellLang).actions.skipToContent}
					</a>
					<div className="flex min-h-screen flex-col">
						<Header locale={shellLang} />
						<main
							id="main-content"
							className="mx-auto w-full max-w-[var(--width-content)] px-4 flex-1"
						>
							{children}
						</main>
						<Footer locale={shellLang} />
					</div>
					<ScrollToTop locale={shellLang} />
				</ThemeProvider>

				{/* Google Analytics */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-GSVYLL0LV0"
					strategy="afterInteractive"
				/>
				<Script id="google-analytics" strategy="afterInteractive">
					{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-GSVYLL0LV0');
          `}
				</Script>
				<WebVitalsReporter />
				<AiReferralReporter />
				{/* 홈뿐 아니라 글로 바로 들어온 방문까지 센다. 숫자는 홈의
				    `VisitCounter` 만 그린다. */}
				<VisitPing />
			</body>
		</html>
	);
}
