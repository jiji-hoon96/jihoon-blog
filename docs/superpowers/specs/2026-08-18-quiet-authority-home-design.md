# Quiet Authority Homepage Design

## Purpose

Create the first Figma direction for `hooninedev.com` as a restrained personal editorial site. The homepage should establish Jihoon Lee's technical authority through the quality and hierarchy of the writing rather than through a large biography or manifesto.

This phase produces a design artifact only. It does not change the blog implementation.

## Approved Positioning

- Jihoon is a frontend engineer who starts from user experience and thinks across product, engineering, reading, leadership, and long-term professional growth.
- That fuller positioning belongs on the About page and should emerge through article topics.
- The homepage does not open with a self-introduction, slogan, email address, analytics, or biography.
- Name and role appear only in the site header; writing is the first substantial homepage content.

## Homepage Information Architecture

Use a single **Editorial Index** rather than separate pinned, popular, and recent card collections.

1. A quiet global header identifies the author and exposes navigation and utilities.
2. One lead article receives stronger typographic and spatial emphasis.
3. Remaining articles continue as one chronological stream.
4. A compact footer closes the page without promotional panels.

The lead article is editorially selected. It is not labeled with an emoji, flame icon, pin icon, popularity rank, or oversized badge.

## Desktop Homepage

- Artboard: 1440px wide.
- Site shell: maximum 1200px wide and centered.
- Main editorial stream: approximately 960px wide.
- Header: author name and `Frontend Engineer` on the left; Writing, About, Search, language, and theme controls on the right.
- Lead article: category and date metadata, a high-emphasis title, a short excerpt, and reading time. It uses typography and whitespace rather than a rounded card or decorative image frame.
- Article rows: date, category, title, excerpt, and reading time separated by thin mineral rules.
- The page avoids repeated section headings and does not divide content into pinned, popular, and latest groups.

## Visual Foundation

### Color

| Token | Value | Use |
| --- | --- | --- |
| Warm White | `#F4F1EA` | Main canvas |
| Near Black | `#171815` | Primary text |
| Stone Gray | `#6F716A` | Secondary text |
| Mineral | `#D8D4CA` | Rules and quiet boundaries |
| Kelp Olive | `#59634A` | Brand identity and selected state |
| Tide Blue | `#286572` | Links and interactive states |
| Persimmon | `#C65A38` | Rare status or emphasis mark only |

Color usage remains subordinate to typography and layout. The first concept is completed in the light theme; dark-theme tokens are designed only after the direction is approved.

### Typography

- Primary family: Wanted Sans Variable for display, headings, navigation, and long-form body copy.
- Metadata family: IBM Plex Mono for dates, categories, reading time, and technical labels.
- Avoid decorative display faces and oversized magazine-style typography.
- Use a strong but compact headline scale, generous body line height, and restrained weight contrast.
- Long-form article measure is 720–760px; the target is 740px.

### Shape and Spacing

- Default surfaces and editorial rows are square-cornered.
- Interactive controls may use a 2–4px radius where it improves affordance.
- Thin rules and whitespace create grouping; shadows and gradients do not.
- Use an 8px spacing base with larger editorial intervals of 24, 32, 48, 64, and 96px.

## Initial Figma Scope

The first reviewable Figma delivery contains:

1. A `Foundations` page with the approved palette, type specimens, spacing scale, grid, and core layout measurements.
2. A `Components` page with a header, metadata line, lead-article treatment, article row, and footer primitives.
3. A `Homepage` page containing one polished 1440px light-theme desktop composition using realistic Korean blog content.

Article detail, archive/exploration, mobile layouts, component variants, and dark theme are intentionally deferred until this direction is reviewed.

## Review Criteria

The concept succeeds when:

- Writing is visibly the homepage's primary content within the first viewport.
- Technical professionalism is apparent without a hero biography or explicit self-promotion.
- The hierarchy between the lead article and stream is clear without card containers.
- Olive and blue feel like a personal signature but do not dominate the reading experience.
- The composition can later accommodate Engineering, Reflections, and Journeys without restructuring the homepage.
- The result does not resemble a SaaS landing page, a conventional card-based blog, or a playful personal site.

## Explicit Non-Goals

- No blog code changes before design approval.
- No image-heavy hero, gradients, emoji headings, glass effects, or decorative illustrations.
- No separate popular-post, pinned-post, and recent-post modules.
- No complete design system or all-screen production before the first homepage direction is reviewed.
