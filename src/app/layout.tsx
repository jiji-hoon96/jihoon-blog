import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { siteMetadata } from "@/lib/site-metadata";
import "./globals.css";

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
						<main className="mx-auto w-full max-w-[1200px] px-4 flex-1">
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
			</body>
		</html>
	);
}
