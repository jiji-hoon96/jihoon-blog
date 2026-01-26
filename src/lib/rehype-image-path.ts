import { visit } from 'unist-util-visit'
import { Root } from 'hast'

/**
 * Rehype plugin to convert relative image paths to absolute paths
 * Converts: ![alt](image.jpg) -> ![alt](/content/240909/image.jpg)
 */
export function rehypeImagePath() {
  return (tree: Root, file: any) => {
    // Extract folder name from file path (e.g., content/240909/index.md -> 240909)
    const filePath = file.history[0] || ''
    const match = filePath.match(/content\/([^\/]+)\//)
    const folderName = match ? match[1] : ''

    if (!folderName) return

    visit(tree, 'element', (node: any) => {
      // Process img tags
      if (node.tagName === 'img' && node.properties?.src) {
        const src = node.properties.src as string

        // Only process relative paths (not starting with http, https, or /)
        if (!src.startsWith('http') && !src.startsWith('/')) {
          node.properties.src = `/content/${folderName}/${src}`
        }
      }
    })
  }
}
