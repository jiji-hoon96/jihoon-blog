import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import AiReferralReporter from "@/components/AiReferralReporter";
import { siteMetadata } from "@/lib/site-metadata";
import {
	getLanguageAlternates,
	isLocale,
	LOCALES,
	toPublicPath,
} from "@/i18n/locales";
import { getDictionary } from "@/i18n/dictionaries";
import { getOpenGraphLocale } from "@/lib/localized-metadata";
import { notFound } from "next/navigation";
import "../globals.css";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f4f1ea" },
		{ media: "(prefers-color-scheme: dark)", color: "#171815" },
	],
};

export async function generateMetadata({
	params,
}: {
	params: Promise<{ lang: string }>;
}): Promise<Metadata> {
	const { lang } = await params;
	if (!isLocale(lang)) return {};

	const dictionary = getDictionary(lang);
	const homePath = toPublicPath(lang, "/");
	const homeUrl = `${siteMetadata.siteUrl}${homePath}`;

	return {
		metadataBase: new URL(siteMetadata.siteUrl),
		title: {
			default: `${siteMetadata.author.name} · Frontend Engineering`,
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
			title: siteMetadata.title,
			description: dictionary.siteDescription,
			url: homeUrl,
			siteName: siteMetadata.title,
			locale: getOpenGraphLocale(lang),
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title: siteMetadata.title,
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

	if (!isLocale(lang)) {
		notFound();
	}

	return (
		<html lang={lang} suppressHydrationWarning>
			<head>
				{/* One-time kill switch: unregister stale Gatsby/old service worker that's
				    intercepting requests with cached Next 14/React 18 chunks. Runs first so
				    it can reload before the broken bundle executes. No-op once cleaned. */}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.getRegistrations().then(function(rs){if(!rs.length)return;Promise.all(rs.map(function(r){return r.unregister()})).then(function(){if(!('caches' in window))return window.location.reload();caches.keys().then(function(ks){Promise.all(ks.map(function(k){return caches.delete(k)})).then(function(){window.location.reload()})})})})})();`,
					}}
				/>
				<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="light">
					<div className="flex min-h-screen flex-col">
						<Header locale={lang} />
						<main className="mx-auto w-full max-w-[var(--width-content)] px-4 flex-1">
							{children}
						</main>
						<Footer locale={lang} />
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
				<AiReferralReporter />
			</body>
		</html>
	);
}
