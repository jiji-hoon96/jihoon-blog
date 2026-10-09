import pulls from '@/data/open-source.json'

export type OpenSourcePull = (typeof pulls)[number]

export type OpenSourceRepo = {
  repo: string
  count: number
  featured: OpenSourcePull
}

/**
 * 저장소마다 홈에 한 줄로 보여 줄 PR. 고른 기준은 남이 겪던 문제를 고친 것이다.
 * 오탈자나 테스트 이름 정리보다 그쪽이 이 기여를 설명한다. 여기에 없는 저장소는
 * 가장 최근 PR 을 보여 준다.
 *
 * 키 순서가 곧 화면 순서다. 머지 수로 정렬하면 문서 수정 다섯 건이 런타임 버그
 * 수정보다 위에 온다. 여기에 없는 저장소는 그 뒤에 머지 수 순으로 붙는다.
 */
const FEATURED: Record<string, number> = {
  'TanStack/router': 4513,
  'TanStack/form': 1691,
  'TanStack/db': 122,
  'TanStack/store': 198,
  'vitejs/vite': 20926,
  'colinhacks/zod': 5098,
  'toss/es-toolkit': 1176,
  'toss/overlay-kit': 167,
  'toss/es-hangul': 355,
  'toss/suspensive': 1557,
  'toss/react-simplikit': 239,
}

/** `pnpm oss:sync` 가 만든 PR 목록을 저장소별로 묶는다. */
export function getOpenSourceRepos(): OpenSourceRepo[] {
  const byRepo = new Map<string, OpenSourcePull[]>()
  for (const pull of pulls) {
    byRepo.set(pull.repo, [...(byRepo.get(pull.repo) ?? []), pull])
  }

  return [...byRepo.entries()]
    .map(([repo, list]) => {
      const sorted = [...list].sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
      return {
        repo,
        count: list.length,
        featured: sorted.find((pull) => pull.number === FEATURED[repo]) ?? sorted[0],
      }
    })
    .sort((a, b) => rank(a.repo) - rank(b.repo) || b.count - a.count)
}

function rank(repo: string): number {
  const index = Object.keys(FEATURED).indexOf(repo)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/** 이 목록과 같은 범위의 PR 을 GitHub 검색으로 연다. 범위는 `sync-open-source.mjs` 의 `SCOPES`. */
export const openSourceSearchUrl = `https://github.com/search?type=pullrequests&q=${encodeURIComponent(
  'author:jiji-hoon96 is:pr is:merged org:TanStack org:vitejs org:toss repo:colinhacks/zod',
)}`
