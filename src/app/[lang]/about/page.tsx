import { isLocale, toPublicPath } from "@/i18n/locales";
import { notFound, permanentRedirect } from "next/navigation";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) notFound();

  permanentRedirect(toPublicPath(lang, "/"));
}
