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
        // Generate excerpt from body (first 200 chars)
        const text = doc.body.raw.replace(/```[\s\S]*?```/g, '').replace(/#/g, '').trim()
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
