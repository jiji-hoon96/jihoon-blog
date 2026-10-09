import pulls from '@/data/open-source.json'

export type OpenSourceRepo = {
  repo: string
  owner: string
  name: string
  count: number
  url: string
}

const AUTHOR = 'jiji-hoon96'

/**
 * 화면 순서. 머지 수로 정렬하면 문서 수정 다섯 건이 런타임 버그 수정보다 위에
 * 온다. 여기에 없는 저장소는 그 뒤에 머지 수 순으로 붙는다.
 */
const ORDER = [
  'TanStack/router',
  'TanStack/form',
  'TanStack/db',
  'TanStack/store',
  'vitejs/vite',
  'colinhacks/zod',
  'toss/es-toolkit',
  'toss/overlay-kit',
  'toss/es-hangul',
  'toss/suspensive',
  'toss/react-simplikit',
]

function rank(repo: string): number {
  const index = ORDER.indexOf(repo)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/**
 * `pnpm oss:sync` 가 만든 PR 목록을 저장소별로 묶는다. 링크는 그 저장소에서
 * 머지된 내 PR 목록이다.
 */
export function getOpenSourceRepos(): OpenSourceRepo[] {
  const counts = new Map<string, number>()
  for (const pull of pulls) counts.set(pull.repo, (counts.get(pull.repo) ?? 0) + 1)

  const query = encodeURIComponent(`is:pr is:merged author:${AUTHOR}`)
  return [...counts.entries()]
    .map(([repo, count]) => {
      const [owner, name] = repo.split('/')
      return { repo, owner, name, count, url: `https://github.com/${repo}/pulls?q=${query}` }
    })
    .sort((a, b) => rank(a.repo) - rank(b.repo) || b.count - a.count)
}

export const openSourcePullCount = pulls.length

/** 이 목록과 같은 범위의 PR 을 GitHub 검색으로 연다. 범위는 `sync-open-source.mjs` 의 `SCOPES`. */
export const openSourceSearchUrl = `https://github.com/search?type=pullrequests&q=${encodeURIComponent(
  `author:${AUTHOR} is:pr is:merged org:TanStack org:vitejs org:toss repo:colinhacks/zod`,
)}`
