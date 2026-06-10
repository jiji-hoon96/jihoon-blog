import { visit } from 'unist-util-visit'

type RefType = 'paper' | 'docs' | 'repo' | 'article' | 'default'

const TYPE_COLOR: Record<RefType, string> = {
  paper: '#8b5cf6',
  docs: '#3b82f6',
  repo: '#10b981',
  article: '#f59e0b',
  default: '#9ca3af',
}

/**
 * :::ref 컨테이너를 참고자료 접이식 UI로 변환하는 remark 플러그인.
 *
 * 마크다운 문법:
 * :::ref
 * - [paper] [ETH Zurich, "Evaluating AGENTS.md"](url)
 * - [docs] [Claude Code Memory](url)
 * - [repo] [oraios/serena](url)
 * :::
 *
 * - 전체 블록은 <details> 접이식으로 렌더링
 * - [타입] 태그는 제거되고 작은 컬러 도트로만 표시
 * - 설명 텍스트(— 이후)는 파싱하지 않음 (마크다운에서도 쓰지 않음)
 * - 항목은 2열 그리드로 배치
 */
export function remarkRef() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type !== 'containerDirective' || node.name !== 'ref') return

      // 전체 블록을 <details class="ref-block">으로 변환
      const data = node.data || (node.data = {})
      data.hName = 'details'
      data.hProperties = { className: ['ref-block'] }

      // <summary> 노드를 맨 앞에 삽입
      const summaryNode = {
        type: 'html',
        value: '<summary class="ref-summary">참고 자료</summary>',
      }
      node.children.unshift(summaryNode)

      // listItem → <a> 래퍼 div로 변환
      visit(node, 'listItem', (listItem: any) => {
        const listItemData = listItem.data || (listItem.data = {})
        listItemData.hName = 'div'
        listItemData.hProperties = { className: ['ref-item'] }

        const paragraph = listItem.children?.[0]
        if (!paragraph || paragraph.type !== 'paragraph') return

        const paraData = paragraph.data || (paragraph.data = {})
        paraData.hName = 'div'
        paraData.hProperties = { className: ['ref-item-inner'] }

        // [type] 파싱: 텍스트 제거 + 컬러 도트 삽입
        const firstChild = paragraph.children?.[0]
        if (firstChild?.type === 'text') {
          const match = firstChild.value.match(/^\[(\w+)\]\s*/)
          if (match) {
            const rawType = match[1].toLowerCase() as RefType
            const color = TYPE_COLOR[rawType in TYPE_COLOR ? rawType : 'default']

            const dotNode = {
              type: 'html',
              value: `<span class="ref-dot" style="background:${color}"></span>`,
            }

            firstChild.value = firstChild.value.replace(/^\[(\w+)\]\s*/, '')
            paragraph.children.unshift(dotNode)
          }
        }
      })

      // list 노드 → <div class="ref-list">
      visit(node, 'list', (listNode: any) => {
        const listData = listNode.data || (listNode.data = {})
        listData.hName = 'div'
        listData.hProperties = { className: ['ref-list'] }
      })
    })
  }
}
