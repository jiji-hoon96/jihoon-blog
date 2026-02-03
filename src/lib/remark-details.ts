import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'

export function remarkDetails() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (
        node.type === 'containerDirective' &&
        node.name === 'details'
      ) {
        const data = node.data || (node.data = {})
        const title = node.children?.[0]?.type === 'paragraph'
          ? node.children[0]
          : null

        // details 태그로 변환
        data.hName = 'details'
        data.hProperties = {}

        if (title) {
          // 첫 번째 paragraph를 summary로 변환
          const titleData = title.data || (title.data = {})
          titleData.hName = 'summary'
        }
      }
    })
  }
}
