import { defineDocumentType, makeSource } from 'contentlayer/source-files'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import readingTime from 'reading-time'
import { rehypeImagePath } from './src/lib/rehype-image-path'

export const Post = defineDocumentType(() => ({
  name: 'Post',
  filePathPattern: `**/*.md`,
  contentType: 'markdown',
  fields: {
    title: { type: 'string', required: true },
    date: { type: 'date', required: true },
    categories: { type: 'string', required: true },
    draft: { type: 'boolean', required: false },
  },
  computedFields: {
    slug: {
      type: 'string',
      resolve: (doc) => {
        // Extract YYMMDD from path: content/240101/index.md -> /240101
        const pathParts = doc._raw.flattenedPath.split('/')
        return `/${pathParts[pathParts.length - 1]}`
      },
    },
    categoryArray: {
      type: 'list',
      resolve: (doc) => doc.categories.split(' ').filter(c => !c.includes('ignore')),
    },
    readingTime: {
      type: 'string',
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    excerpt: {
      type: 'string',
      resolve: (doc) => {
        const text = doc.body.raw
          .replace(/```[\s\S]*?```/g, '') // 코드 블록
          .replace(/<[^>]*>/g, '') // HTML 태그
          .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 이미지
          .replace(/\[[^\]]*\]\([^)]*\)/g, (match) => {
            const textMatch = match.match(/\[([^\]]*)\]/)
            return textMatch ? textMatch[1] : ''
          })
          .replace(/`[^`]+`/g, (match) => match.slice(1, -1))
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/__([^_]+)__/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/_([^_]+)_/g, '$1')
          .replace(/~~([^~]+)~~/g, '$1')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/^>\s*/gm, '')
          .replace(/^[-*+]\s+/gm, '')
          .replace(/^\d+\.\s+/gm, '')
          .replace(/^---+$/gm, '')
          .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 이모지 제거
          .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
          .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
          .replace(/[\u{2600}-\u{26FF}]/gu, '')
          .replace(/[\u{2700}-\u{27BF}]/gu, '')
          .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
          .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        return text.slice(0, 200) + (text.length > 200 ? '...' : '')
      },
    },
  },
}))

export default makeSource({
  contentDirPath: './content',
  documentTypes: [Post],
  disableImportAliasWarning: true,
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'wrap',
          properties: {
            className: ['anchor'],
          },
        },
      ],
      [
        rehypePrettyCode as any,
        {
          theme: {
            dark: 'github-dark',
            light: 'github-light',
          },
          keepBackground: false,
        },
      ],
      rehypeImagePath as any,
    ],
  },
})
