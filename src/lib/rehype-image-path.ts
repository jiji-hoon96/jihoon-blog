import { visit } from 'unist-util-visit'
import { Root } from 'hast'
import path from 'path'

/**
 * Rehype plugin to convert relative image paths to absolute paths
 * Converts: ![alt](image.jpg) -> ![alt](/content/240909/image.jpg)
 */
export function rehypeImagePath() {
  return (tree: Root, file: any) => {
    // Extract folder name from multiple possible sources
    let folderName = ''
    
    // Try file.history first
    if (file.history && file.history.length > 0) {
      const filePath = file.history[0]
      const match = filePath.match(/content\/([^\/]+)\//)
      if (match) {
        folderName = match[1]
      }
    }
    
    // Fallback to file.path
    if (!folderName && file.path) {
      const match = file.path.match(/content\/([^\/]+)\//)
      if (match) {
        folderName = match[1]
      }
    }
    
    // Fallback to file.dirname (used by contentlayer)
    if (!folderName && file.dirname) {
      folderName = path.basename(file.dirname)
    }

    // Fallback to _raw.sourceFileDir (contentlayer specific)
    if (!folderName && file.data?.rawDocumentData?.sourceFileDir) {
      folderName = file.data.rawDocumentData.sourceFileDir
    }

    if (!folderName) {
      console.warn('[rehype-image-path] Could not determine folder name for:', file.path || file.history?.[0] || 'unknown')
      return
    }

    visit(tree, 'element', (node: any) => {
      // Process img tags
      if (node.tagName === 'img' && node.properties?.src) {
        const src = node.properties.src as string

        // Only process relative paths (not starting with http, https, or /)
        if (!src.startsWith('http') && !src.startsWith('https') && !src.startsWith('/')) {
          const newSrc = `/content/${folderName}/${src}`
          console.log(`[rehype-image-path] Converting: ${src} -> ${newSrc}`)
          node.properties.src = newSrc
        }
      }
    })
  }
}
