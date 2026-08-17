import type { Root } from 'hast'
import { visit } from 'unist-util-visit'

export function rehypeOpenLinksInNewTab() {
  return (tree: Root) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a' || !node.properties?.href) return

      const href = String(node.properties.href)
      if (href.startsWith('#')) return

      const existingRel = Array.isArray(node.properties.rel)
        ? node.properties.rel.map(String)
        : String(node.properties.rel ?? '').split(/\s+/).filter(Boolean)

      node.properties.target = '_blank'
      node.properties.rel = [
        ...new Set([...existingRel, 'noopener', 'noreferrer']),
      ]
    })
  }
}
