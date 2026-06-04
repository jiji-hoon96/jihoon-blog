import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { siteMetadata } from "@/lib/site-metadata";
import "./globals.css";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0f172a" },
	],
};

export const metadata: Metadata = {
	metadataBase: new URL(siteMetadata.siteUrl),
	title: {
		default: siteMetadata.title,
		template: `%s | ${siteMetadata.title}`,
	},
	description: siteMetadata.description,
	keywords: [
		"개발 블로그",
		"프론트엔드",
		"프론트엔드 개발자",
		"React",
		"Next.js",
		"TypeScript",
		"JavaScript",
		"웹 개발",
		"Frontend",
		"frontend",
		"이지훈",
		"후니",
		siteMetadata.author.name,
	],
	authors: [{ name: siteMetadata.author.name, url: siteMetadata.siteUrl }],
	creator: siteMetadata.author.name,
	publisher: siteMetadata.author.name,
	alternates: {
		canonical: siteMetadata.siteUrl,
		types: {
			"application/rss+xml": `${siteMetadata.siteUrl}/rss.xml`,
		},
	},
	openGraph: {
		title: siteMetadata.title,
		description: siteMetadata.description,
		url: siteMetadata.siteUrl,
		siteName: siteMetadata.title,
		locale: "ko_KR",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: siteMetadata.title,
		description: siteMetadata.description,
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<head>
				{/* One-time kill switch: unregister stale Gatsby/old service worker that's
				    intercepting requests with cached Next 14/React 18 chunks. Runs first so
				    it can reload before the broken bundle executes. No-op once cleaned. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){if(!rs.length)return;Promise.all(rs.map(function(r){return r.unregister()})).then(function(){if(!('caches' in window))return window.location.reload();caches.keys().then(function(ks){Promise.all(ks.map(function(k){return caches.delete(k)})).then(function(){window.location.reload()})})})})})();`,
					}}
				/>
				{/* Font preloading */}
				<link
					rel="preload"
					href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansLight.woff"
					as="font"
					type="font/woff"
					crossOrigin="anonymous"
				/>
				<link
					rel="preload"
					href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff"
					as="font"
					type="font/woff"
					crossOrigin="anonymous"
				/>
				<link
					rel="preload"
					href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff"
					as="font"
					type="font/woff"
					crossOrigin="anonymous"
				/>
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="light">
					<div className="flex min-h-screen flex-col">
						<Header />
						<main className="mx-auto w-full max-w-[var(--width-content)] px-4 flex-1">
							{children}
						</main>
						<Footer />
					</div>
					<ScrollToTop />
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
			</body>
		</html>
	);
}
