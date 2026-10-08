import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { fromMarkdown } from 'mdast-util-from-markdown'

// docs/post-structure.md 의 역할표를 기계로 검사한다. 역할표는 한글 원문만 본다.
// 번역본은 validate-translations 가 원문과 구조를 맞추므로 따로 보지 않는다.
// 순서 없는 나열에 쓴 `1.` 처럼 판단이 필요한 것은 여기서 잡지 않는다.
// 볼드가 열리거나 닫히지 않아 `**` 가 글자로 남는 것은 로케일마다 다르게 깨지므로 전 로케일을 본다.

const RULES = [
  ['h1', /^# /u, '본문에 # 을 쓰지 않는다. 제목은 프론트매터 title 이다'],
  ['numbered-heading', /^#{2,4} +\d+[.)] /u, '소제목에 번호를 붙이지 않는다'],
  ['bold-line', /^\*\*[^*]+\*\*\s*$/u, '굵은 글씨만 있는 줄 대신 #### 이나 볼드 첫 문장을 쓴다'],
  ['separator', /^\s*(?:<hr\s*\/?>|---|\*\*\*|___)\s*$/u, '본문에 구분선을 쓰지 않는다'],
  ['star-marker', /^\s*\* /u, '목록 기호는 - 를 쓴다'],
  ['label-space-colon', /^\s*(?:-|\d+\.) \*\*[^*]+\*\* :/u, '라벨은 **라벨**: 로 쓴다. 콜론 앞을 띄우지 않는다'],
  // `- **문장이다.** 이어지는 문장` 처럼 볼드가 '다.' 로 끝나는 문장이면 라벨이 아니라 굵은 첫 문장이다.
  ['label-period', /^\s*(?:-|\d+\.) \*\*[^*]{1,30}(?<!다)\.\*\* /u, '라벨은 **라벨**: 로 쓴다. 마침표로 닫지 않는다'],
]

export function validatePostStructure(markdown) {
  const lines = markdown.split('\n')
  const violations = []
  let frontmatterFences = 0
  let fence = null
  let lastText = ''
  let listIndents = []
  let inRef = false

  lines.forEach((line, index) => {
    if (frontmatterFences < 2 && line.trim() === '---') {
      frontmatterFences += 1
      return
    }
    if (frontmatterFences < 2) return

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/u)
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1][0]
      else if (fenceMatch[1][0] === fence) fence = null
      return
    }
    if (fence) return

    for (const [id, pattern, message] of RULES) {
      if (pattern.test(line)) violations.push({ line: index + 1, id, message })
    }
    if (inRef) {
      if (/^:::\s*$/u.test(line)) inRef = false
      else if (line.trim() && !/^- /u.test(line)) {
        // remark-ref 는 목록 항목만 링크 카드로 만든다. 하이픈이 없으면 평문 한 덩어리가 된다.
        violations.push({ line: index + 1, id: 'ref-item', message: ':::ref 항목은 - [docs] [제목](URL) 로 쓴다' })
      }
      return
    }
    if (/^:::ref\s*$/u.test(line)) inRef = true
    if (/^:::ref\s*$/u.test(line) && /^#{2,4} /u.test(lastText)) {
      violations.push({
        line: index + 1,
        id: 'heading-before-ref',
        message: ':::ref 앞에 소제목을 두지 않는다. 블록이 제목을 그린다',
      })
    }
    // 목록 항목의 들여쓰기를 쌓아 깊이를 잰다. 항목 안의 문단처럼 들여쓴 본문은 깊이로 세지 않는다.
    const item = line.match(/^(\s*)(?:[-*]|\d+\.) /u)
    if (item) {
      const indent = item[1].length
      while (listIndents.length && listIndents.at(-1) >= indent) listIndents.pop()
      if (listIndents.length >= 2) {
        violations.push({ line: index + 1, id: 'deep-nesting', message: '중첩 목록은 한 단계까지만 쓴다' })
      }
      listIndents.push(indent)
    } else if (line.trim() && !/^\s/u.test(line)) {
      listIndents = []
    }
    if (line.trim()) lastText = line
  })

  return violations
}

// `**決める。**ひとつ` 처럼 구두점 뒤에서 닫거나 `は**`code`**` 처럼 구두점 앞에서 열면
// CommonMark 가 강조로 읽지 않는다. 파싱한 뒤 코드와 HTML 을 뺀 텍스트에 남은 `**` 를 찾는다.
export function findBrokenEmphasis(markdown) {
  const frontmatter = markdown.match(/^---\n[\s\S]*?\n---\n/u)?.[0] ?? ''
  const body = frontmatter.replace(/[^\n]/gu, '') + markdown.slice(frontmatter.length)
  const lines = new Set()
  const walk = (node) => {
    if (node.type === 'code' || node.type === 'inlineCode' || node.type === 'html') return
    if (node.type === 'text' && node.value.includes('**')) lines.add(node.position.start.line)
    node.children?.forEach(walk)
  }
  walk(fromMarkdown(body))
  return [...lines].map((line) => ({
    line,
    id: 'broken-bold',
    message: '볼드가 렌더되지 않는다. 구두점을 ** 밖으로 내보낸다. 공백으로 때우지 않는다',
  }))
}

export async function validateAllPosts({ rootDirectory = process.cwd(), post } = {}) {
  const contentDirectory = path.join(rootDirectory, 'content')
  const entries = await readdir(contentDirectory, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d{6}$/u.test(entry.name)) continue
    if (post && entry.name !== post) continue
    const files = (await readdir(path.join(contentDirectory, entry.name)))
      .filter((name) => /^index(?:\.[\w-]+)?\.md$/u.test(name))
    for (const file of files) {
      const markdown = await readFile(path.join(contentDirectory, entry.name, file), 'utf8')
      const key = file === 'index.md' ? entry.name : `${entry.name}/${file}`
      const violations = file === 'index.md'
        ? [...validatePostStructure(markdown), ...findBrokenEmphasis(markdown)]
        : findBrokenEmphasis(markdown)
      for (const violation of violations) results.push({ post: key, ...violation })
    }
  }

  return results.sort((a, b) => a.post.localeCompare(b.post) || a.line - b.line)
}

async function main() {
  const postIndex = process.argv.indexOf('--post')
  const post = postIndex >= 0 ? process.argv[postIndex + 1] : undefined
  const results = await validateAllPosts({ post })

  if (results.length === 0) {
    console.log(post ? `Post structure for ${post} passed.` : 'All post structures passed.')
    return
  }

  for (const { post: key, line, id, message } of results) {
    console.error(`${key}:${line} ${id} ${message}`)
  }
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
