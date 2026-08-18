import { siteMetadata } from "@/lib/site-metadata";
import Utterances from "@/components/Utterances";
import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionaries";
import { getLanguageAlternates, isLocale, toPublicPath } from "@/i18n/locales";
import { getOpenGraphLocale } from "@/lib/localized-metadata";
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
    openGraph: { title: dictionary.navigation.guestbook, description: dictionary.guestbook.description, url, type: "website", locale: getOpenGraphLocale(lang) },
  };
}

export default async function GuestbookPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dictionary = getDictionary(lang);
  return (
    <div className="py-12">
      {/* Guestbook Banner */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">{dictionary.guestbook.title}</h1>
        <p className="text-lg text-light-gray80 dark:text-dark-gray80">
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
