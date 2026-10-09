import { isLocale, toPublicPath } from "@/i18n/locales";
import { notFound, permanentRedirect } from "next/navigation";

/**
 * 이력서는 2026-10-09 에 `/about` 으로 옮겼다. 검색 결과와 이미 공유된 링크가
 * 아직 이 주소를 가리키므로 308 로 넘긴다. 리다이렉트를 `next.config` 의
 * `redirects` 가 아니라 페이지에 두는 이유는 한국어 경로가 프록시 rewrite 를 타기
 * 때문이다. 거기서는 config 리다이렉트가 로컬은 통과하고 프로덕션에서만 404 가 났다.
 */
export default async function ResumePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLocale(lang)) notFound();

  permanentRedirect(toPublicPath(lang, "/about"));
}
