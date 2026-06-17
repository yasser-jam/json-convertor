# 00 — Overview

## Goal

Define **complete, engine-aligned** transformation rules so a web Puck page can be converted into a production-valid **`MobileAppConfig`** JSON file that the Flutter SDUI engine renders without layout overflow, parse errors, or wrong API paths.

Output target: full envelope — `schemaVersion`, `app`, `theme`, `navigation`, `pages[]` — not a `pages[]` slice alone.

## Non-goals

- Dart or TypeScript converter implementation in this repo (reference docs only)
- Automated test runner for fixtures (manual reference until implementation exists)
- Per-merchant `tenantSlug` branching in conversion logic
- Inventing new mobile component types or undeclared JSON props
- 100% visual parity with web CSS (mobile uses Flutter layout primitives)

## Terminology

| Term | Meaning |
|------|---------|
| **Web JSON** | Erteqa Puck `UserData`: `{ root, content, zones }` per page path |
| **Web block** | Puck component: `{ type: "Section", props: { ... } }` |
| **Mobile JSON** | `MobileAppConfig` in `assets/config/mobile_production_v2.json` shape |
| **Mobile node** | Component in `pages[].body[]`: `{ id, type, props, ... }` |
| **Decomposition** | Expanding one web block into a tree of mobile primitives |
| **Synthetic scaffold** | Engine wraps each page as `scaffold` → `column` → `[appBar?, ...body]` at runtime |

## Transformation phases

| Phase | Doc | Action |
|-------|-----|--------|
| 1. Ingest | [01-web-input-schema.md](01-web-input-schema.md) | Parse Puck JSON; normalize slots |
| 2. Theme | [04-theme-and-root-mapping.md](04-theme-and-root-mapping.md) | `root.props` → `theme` |
| 3. Navigation | [05-navigation-and-routes.md](05-navigation-and-routes.md) | Routes, tabs, shell excludes |
| 4. Pages | [08-page-assembly.md](08-page-assembly.md) | Page shell + body |
| 5. Blocks | [blocks/](blocks/) | Recursive block → primitive mapping |
| 6. Envelope | [02-mobile-output-schema.md](02-mobile-output-schema.md) | Assemble full config |
| 7. Validate | [16-post-conversion-validation.md](16-post-conversion-validation.md) | Layout + schema checks |

Apply [03-global-engine-rules.md](03-global-engine-rules.md) at **every** phase.

## Unsupported web concepts — policy

When no 1:1 mobile block exists:

1. **Decompose** to the closest primitive subtree (card, column, text, image, button, …).
2. Document the gap in the block rule **Gaps & fallback** section.
3. Prefer functional equivalence (navigation, data load, cart action) over pixel parity.
4. Do **not** emit `type: unsupported` in authored mobile JSON unless the engine team explicitly adds a placeholder page for debugging.

## v0 converter deltas

The [v0 SDUI Transformer](https://v0-documentation-for-json-builder.vercel.app/converter) (v1.0) is a **5-rule prototype**. This suite supersedes it:

| v0 behavior | Correct rule |
|-------------|--------------|
| Output `{ pages: [...] }` only | Full `MobileAppConfig` envelope |
| `GET /api/v1/products` | `/api/v1/public/products?page=0&size=20` |
| Product grid item = title text only | Full prod `card` + `image` + `text` subtree |
| Section `backgroundColor` → `style.color` | `style.color` or `props.color` for **background** (see [blocks/09-layout-blocks.md](blocks/09-layout-blocks.md)) |
| `FlexGroup` web type | Alias for `Group` / `Flex` (normalize on ingest) |
| 5 block types | All 43 types in [docs/BLOCKS.md](../../BLOCKS.md) — see [17-blocks-gap-analysis.md](17-blocks-gap-analysis.md) |

## Mobile component inventory (30 types)

Author only these `type` values in converted JSON:

`scaffold`, `singleChildScrollView`, `column`, `row`, `container`, `listView`, `gridView`, `text`, `textFormField`, `form`, `button`, `contactButton`, `card`, `image`, `appBar`, `divider`, `sizedBox`, `icon`, `richtext`, `videoPlayer`, `stack`, `imageSlider`, `timer`, `progressIndicator`, `appDrawer`, `tabs`, `otpInput`, `dropdown`, `expansionTile`

Details: [docs/ai/03-engine.md](../../ai/03-engine.md).
