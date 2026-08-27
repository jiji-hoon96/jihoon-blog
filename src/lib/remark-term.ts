import { toString } from 'mdast-util-to-string'
import { visit } from 'unist-util-visit'

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

type DirectiveNode = Parameters<typeof visit>[0] & {
  name: string
  attributes?: Record<string, string | null | undefined>
  children: Array<{ type: string; value?: string }>
  data?: Record<string, unknown>
}

export function remarkTerm() {
  return (tree: Parameters<typeof visit>[0], file?: { path?: string }) => {
    visit(tree, node => {
      if (node.type !== 'textDirective') return
      const directive = node as DirectiveNode
      if (directive.name !== 'term') return

      const label = toString(directive).trim()
      const attributes = directive.attributes ?? {}
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

      directive.children = [{ type: 'text', value: label }]
      directive.data = {
        hName: 'span',
        hProperties: {
          className: ['glossary-term-source'],
          'data-glossary-key': key,
        },
      }
    })
  }
}
