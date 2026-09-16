import { siteMetadata } from "@/lib/site-metadata";
import Utterances from "@/components/Utterances";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { getLanguageAlternates, isLocale, toPublicPath } from "@/i18n/locales";
import { getLocalizedOpenGraphImageUrl, getOpenGraphLocale } from "@/lib/localized-metadata";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dictionary = getDictionary(lang);
  const url = `${siteMetadata.siteUrl}${toPublicPath(lang, "/guestbook")}`;
  return {
    title: dictionary.navigation.guestbook,
    description: dictionary.guestbook.description,
    alternates: { canonical: url, languages: getLanguageAlternates(siteMetadata.siteUrl, "/guestbook") },
    openGraph: { title: dictionary.navigation.guestbook, description: dictionary.guestbook.description, url, images: [getLocalizedOpenGraphImageUrl(siteMetadata.siteUrl, lang)], type: "website", locale: getOpenGraphLocale(lang) },
  };
}

export default async function GuestbookPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = getDictionary(lang);
  const guestbookUrl = `${siteMetadata.siteUrl}${toPublicPath(lang, "/guestbook")}`;
  const pageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: dictionary.navigation.guestbook,
    description: dictionary.guestbook.description,
    url: guestbookUrl,
    inLanguage: lang,
    isPartOf: {
      "@type": "WebSite",
      name: siteMetadata.title,
      url: siteMetadata.siteUrl,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteMetadata.siteUrl}${toPublicPath(lang, "/")}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: dictionary.navigation.guestbook,
        item: guestbookUrl,
      },
    ],
  };

  return (
    <div className="py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* Guestbook Banner */}
      <div className="mb-12">
        <h1 className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.18] tracking-[-0.03em] mb-3">{dictionary.guestbook.title}</h1>
        <p className="text-[17px] leading-[1.75] text-stone">
          {dictionary.guestbook.description}
        </p>
      </div>

      {/* Utterances Comments */}
      <Utterances
        repo={siteMetadata.comments.utterances.repo}
        path="guestbook"
      />
    </div>
  );
}
