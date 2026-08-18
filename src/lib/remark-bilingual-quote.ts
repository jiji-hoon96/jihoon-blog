import { visit } from 'unist-util-visit'
import { isLocale, type Locale } from '../i18n/locales.ts'

type AstData = {
  hName?: string
  hProperties?: Record<string, unknown>
}

type AstNode = {
  type: string
  name?: string
  value?: string
  children?: AstNode[]
  data?: AstData
}

const ERROR_MESSAGE =
  'Invalid bilingual quote: expected exactly one non-empty translation and original'

function getDocumentLocale(path?: string): Locale {
  const suffix = path?.match(/\/index\.([^.\/]+)\.md$/)?.[1]
  return suffix && isLocale(suffix) ? suffix : 'ko'
}

function hasContent(node: AstNode): boolean {
  if (typeof node.value === 'string' && node.value.trim()) return true
  return node.children?.some(hasContent) ?? false
}

export function remarkBilingualQuote() {
  return (tree: AstNode, file?: { path?: string }) => {
    const documentLocale = getDocumentLocale(file?.path)

    visit(tree, 'containerDirective', (node: AstNode) => {
      if (node.name !== 'quote') return

      const translations = node.children?.filter(
        child => child.type === 'containerDirective' && child.name === 'translation',
      ) ?? []
      const originals = node.children?.filter(
        child => child.type === 'containerDirective' && child.name === 'original',
      ) ?? []

      if (
        translations.length !== 1 ||
        originals.length !== 1 ||
        !hasContent(translations[0]) ||
        !hasContent(originals[0])
      ) {
        throw new Error(ERROR_MESSAGE)
      }

      node.data = {
        hName: 'blockquote',
        hProperties: { className: ['bilingual-quote'] },
      }

      if (documentLocale === 'en') {
        node.children = [originals[0]]
        originals[0].data = {
          hName: 'div',
          hProperties: { className: ['quote-translation'], lang: 'en' },
        }
        return
      }

      node.children = [translations[0], originals[0]]
      translations[0].data = {
        hName: 'div',
        hProperties: {
          className: ['quote-translation'],
          lang: documentLocale,
        },
      }
      originals[0].data = {
        hName: 'div',
        hProperties: { className: ['quote-original'], lang: 'en' },
      }
    })
  }
}
