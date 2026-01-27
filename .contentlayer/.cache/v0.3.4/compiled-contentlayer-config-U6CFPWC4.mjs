// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import readingTime from "reading-time";

// src/lib/rehype-image-path.ts
import { visit } from "unist-util-visit";
import path from "path";
function rehypeImagePath() {
  return (tree, file) => {
    let folderName = "";
    if (file.history && file.history.length > 0) {
      const filePath = file.history[0];
      const match = filePath.match(/content\/([^\/]+)\//);
      if (match) {
        folderName = match[1];
      }
    }
    if (!folderName && file.path) {
      const match = file.path.match(/content\/([^\/]+)\//);
      if (match) {
        folderName = match[1];
      }
    }
    if (!folderName && file.dirname) {
      folderName = path.basename(file.dirname);
    }
    if (!folderName && file.data?.rawDocumentData?.sourceFileDir) {
      folderName = file.data.rawDocumentData.sourceFileDir;
    }
    if (!folderName) {
      console.warn("[rehype-image-path] Could not determine folder name for:", file.path || file.history?.[0] || "unknown");
      return;
    }
    visit(tree, "element", (node) => {
      if (node.tagName === "img" && node.properties?.src) {
        const src = node.properties.src;
        if (!src.startsWith("http") && !src.startsWith("https") && !src.startsWith("/")) {
          const newSrc = `/content/${folderName}/${src}`;
          console.log(`[rehype-image-path] Converting: ${src} -> ${newSrc}`);
          node.properties.src = newSrc;
        }
      }
    });
  };
}

// contentlayer.config.ts
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `**/*.md`,
  contentType: "markdown",
  fields: {
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    categories: { type: "string", required: true },
    draft: { type: "boolean", required: false }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => {
        const pathParts = doc._raw.flattenedPath.split("/");
        return `/${pathParts[pathParts.length - 1]}`;
      }
    },
    categoryArray: {
      type: "list",
      resolve: (doc) => doc.categories.split(" ").filter((c) => !c.includes("ignore"))
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text
    },
    excerpt: {
      type: "string",
      resolve: (doc) => {
        const text = doc.body.raw.replace(/```[\s\S]*?```/g, "").replace(/<[^>]*>/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[[^\]]*\]\([^)]*\)/g, (match) => {
          const textMatch = match.match(/\[([^\]]*)\]/);
          return textMatch ? textMatch[1] : "";
        }).replace(/`[^`]+`/g, (match) => match.slice(1, -1)).replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/_([^_]+)_/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/^>\s*/gm, "").replace(/^[-*+]\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/^---+$/gm, "").replace(/[\u{1F600}-\u{1F64F}]/gu, "").replace(/[\u{1F300}-\u{1F5FF}]/gu, "").replace(/[\u{1F680}-\u{1F6FF}]/gu, "").replace(/[\u{2600}-\u{26FF}]/gu, "").replace(/[\u{2700}-\u{27BF}]/gu, "").replace(/[\u{1F900}-\u{1F9FF}]/gu, "").replace(/[\u{1FA00}-\u{1FA6F}]/gu, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
        return text.slice(0, 200) + (text.length > 200 ? "..." : "");
      }
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./content",
  documentTypes: [Post],
  disableImportAliasWarning: true,
  markdown: {
    remarkPlugins: [],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
          properties: {
            className: ["anchor"]
          }
        }
      ],
      [
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark",
            light: "github-light"
          },
          keepBackground: false
        }
      ],
      rehypeImagePath
    ]
  }
});
export {
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-U6CFPWC4.mjs.map
