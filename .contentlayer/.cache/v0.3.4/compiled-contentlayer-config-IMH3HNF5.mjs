// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import readingTime from "reading-time";

// src/lib/rehype-image-path.ts
import { visit } from "unist-util-visit";
function rehypeImagePath() {
  return (tree, file) => {
    const filePath = file.history[0] || "";
    const match = filePath.match(/content\/([^\/]+)\//);
    const folderName = match ? match[1] : "";
    if (!folderName)
      return;
    visit(tree, "element", (node) => {
      if (node.tagName === "img" && node.properties?.src) {
        const src = node.properties.src;
        if (!src.startsWith("http") && !src.startsWith("/")) {
          node.properties.src = `/content/${folderName}/${src}`;
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
    emoji: { type: "string", required: true },
    categories: { type: "string", required: true }
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
        const text = doc.body.raw.replace(/```[\s\S]*?```/g, "").replace(/#/g, "").trim();
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
//# sourceMappingURL=compiled-contentlayer-config-IMH3HNF5.mjs.map
