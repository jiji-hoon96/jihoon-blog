import { siteMetadata } from './site-metadata.ts'

export function getAuthorEntityId(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/#person`
}

/**
 * 사이트 엔티티의 `@id`.
 *
 * BlogPosting 의 `isPartOf` 가 `@id: https://hooninedev.com` 을 가리키는데
 * 그 `@id` 를 정의하는 노드가 어느 페이지에도 없었다. 홈이 내보내는 것은
 * `@id` 가 아예 없는 WebSite 라 둘을 잇는 것이 없었고, 한 URL 에 Blog 와
 * WebSite 두 타입이 따로 떠 있었다. 프래그먼트 `@id` 하나로 묶는다.
 */
export function getSiteEntityId(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/#website`
}

/**
 * Person 노드 하나를 여기서만 만든다.
 *
 * 홈은 `alternateName` 에 사이트 브랜드(`훈지`)와 `jobTitle: Frontend Engineer`
 * 를, 글은 저자 닉네임(`후니`)과 `Frontend Developer` 를 넣고 있었다. `@id` 는
 * 양쪽 다 `#person` 이라 한 사람 엔티티가 상충하는 속성을 갖는다. `url` 도
 * 홈에서는 로케일별 홈이라 한 엔티티가 서로 다른 url 을 6개 갖는다.
 * 그래서 로케일과 무관한 값 하나로 고정한다.
 */
export function getAuthorPersonNode(siteUrl: string) {
  const baseUrl = siteUrl.replace(/\/+$/, '')

  return {
    '@type': 'Person' as const,
    '@id': getAuthorEntityId(baseUrl),
    name: siteMetadata.author.name,
    alternateName: siteMetadata.author.nickname,
    email: siteMetadata.author.bio.email,
    url: `${baseUrl}/`,
    image: `${baseUrl}/images/jihoon.jpeg`,
    jobTitle: 'Frontend Engineer',
    knowsAbout: siteMetadata.author.stack,
    sameAs: [
      siteMetadata.author.social.github,
      siteMetadata.author.social.linkedIn,
    ],
  }
}
