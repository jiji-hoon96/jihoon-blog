# Translation review protocol

Every Korean post is translated into English, Japanese, Spanish, Brazilian Portuguese, and Simplified Chinese. Translation is a two-pass editorial process, not a bulk string replacement.

## Pass 1: meaning and voice

- Translate the complete article, including localized `title`, `seoTitle`, `description`, and `keywords`.
- Preserve the author’s first-person reasoning, degree of certainty, humor, and paragraph boundaries.
- Preserve product names, identifiers, API names, code, URLs, image paths, directives, and the English text inside `:::original` exactly.
- For `:term[visible label]{key="stable-key"}`, translate the visible label naturally but preserve `key` exactly and in the same order. Add the target-locale `name` and `definition` to `content/glossary.json` before publication.
- Use `content/terminology.yml` as the shared terminology policy. Prefer established technical English when a localized calque loses precision or searchability.
- Add `locale`, `translationOf`, and the current `sourceHash` to frontmatter.

## Pass 2: source comparison

Compare every heading and paragraph with the Korean source. Reject the translation if any of these checks fail:

1. No paragraph, list item, table row, qualification, or counterexample is omitted.
2. Certainty is unchanged: a hypothesis must not become a fact, and a recommendation must not become a requirement.
3. Cause and effect, comparisons, negation, quantities, dates, and units retain their direction and value.
4. Technical terms are accurate and consistent with the glossary; identifiers and code remain untouched.
5. Phrasing is natural in the target locale instead of mirroring Korean word order.
6. SEO metadata reflects search intent in that language rather than translating keywords word for word.
7. `pnpm content:translations -- --post YYMMDD` passes.
8. `pnpm content:glossary` passes before the translation validator.

The optional `scripts/compare-deepl.mjs` pass can surface sentences whose independent DeepL rendering differs substantially. It is a review signal, not the source of truth, and never rewrites Markdown.

Mark a locale in `content/translations.json` as reviewed only after both passes are complete.
