import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function remarkTerm() {
  return (tree: any, file?: { path?: string }) => {
    visit(tree, 'textDirective', (node: any) => {
      if (node.name !== 'term') return

      const label = toString(node).trim()
      const attributes = node.attributes ?? {}
      const key = attributes.key
      const validAttributes = Object.keys(attributes).length === 1

      if (
        !label ||
        !validAttributes ||
        typeof key !== 'string' ||
        !KEY_PATTERN.test(key)
      ) {
        throw new Error(
          `${file?.path ?? 'unknown file'}: Invalid term directive`,
        )
      }

      node.children = [{ type: 'text', value: label }]
      node.data = {
        hName: 'span',
        hProperties: {
          className: ['glossary-term-source'],
          'data-glossary-key': key,
        },
      }
    })
  }
}
