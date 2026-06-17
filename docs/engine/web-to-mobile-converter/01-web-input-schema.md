# 01 — Web Input Schema

Web-side contract from [docs/blocks.md](../../BLOCKS.md). The converter **normalizes** this into an internal shape before block mapping.

---

## Top-level page storage

### Built-in routes (`config/pages.ts`)

| Path | Label | Dynamic |
|------|-------|---------|
| `/` | Home | No |
| `/themes` | Theme gallery | No |
| `/products/:product-slug` | Product Details | Yes |
| `/cart` | Cart | No |

Custom pages: `localStorage` key `puck-demo-custom-pages:v1`. Starter data: `config/initial-data.ts`.

### Puck `UserData` (per page)

```json
{
  "root": { "props": { } },
  "content": [ ],
  "zones": {
    "shell-left": [ ],
    "shell-right": [ ]
  }
}
```

| Key | Role |
|-----|------|
| `root.props` | Site-wide settings — see [04-theme-and-root-mapping.md](04-theme-and-root-mapping.md) |
| `content[]` | Main DropZone: `SiteHeader`, `Section`, `SiteFooter`, … |
| `zones` | Editor shell rails; `SiteDrawerShell` blocks |

---

## Normalized converter input

After ingest, each page becomes:

```json
{
  "path": "/home",
  "label": "Home",
  "rootProps": { },
  "blocks": [ ]
}
```

### Normalization rules

| Step | Rule |
|------|------|
| Path | Use page path; map `/` → mobile route `/home` in output (see [05-navigation-and-routes.md](05-navigation-and-routes.md)) |
| Label | `label` or `title` from page registry |
| `rootProps` | Copy of `root.props` (merged across site if multi-page batch) |
| `blocks` | `content[]` with shell blocks handled separately (see [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md)) |
| Section children | `props.content[]` → treat as `children[]` internally |
| FlexGroup (v0) | Alias → `Group` or `Flex` |
| Zones | Merge `zones.shell-left` / `shell-right` drawer blocks into drawer config |

---

## Web block shape

```json
{
  "type": "Section",
  "props": {
    "id": "Section-hero",
    "paddingTop": "32px",
    "content": [ ],
    "layout": { }
  }
}
```

| Field | Notes |
|-------|-------|
| `type` | Puck block name (PascalCase) |
| `props.id` | Web editor id; use as seed for mobile `id` |
| `props.layout` | Optional cross-cutting layout — [06-layout-cross-cutting.md](06-layout-cross-cutting.md) |
| Child slots | See table below |

### Child slot names

| Web `type` | Children in |
|------------|-------------|
| Section, Group | `props.content[]` |
| Flex, Grid | `props.items[]` |
| Hero | `props.buttons[]` (inline array, not nested blocks) |
| All commerce / utility leaf blocks | No child slots (props only) |

---

## Root props summary (`root.props`)

Full tables in [docs/blocks.md §2](../../BLOCKS.md). Converter consumes:

| Group | Keys (examples) |
|-------|-----------------|
| Locale | `direction`, `language`, `currency` |
| Metadata | `title`, `enableHtmlRichTextBlock` |
| Fonts | `bodyFont`, `fontOption1`, `fontOption2` |
| Colors | `primary`, `surface`, `success`, `warning`, `error`, `dark`, `text`, `neutral` |
| Badge defaults | `badgeShape`, `badgeStyle` |
| Shell | `headerVariant`, `footerVariant`, `header*`, `footer*`, `drawer*` |
| Breakpoints | `breakpointMobileMax`, `breakpointTabletMax` |
| Scales | `textSize*`, `radius*`, `button*`, `fontWeight*`, `lineHeight*` |

---

## Web-only concepts (no direct mobile field)

| Concept | Converter policy |
|---------|------------------|
| CSS custom properties (`--theme-color-*`) | Resolve to hex in mobile `theme.colors` or node `props.color` |
| `hideOnMobile` / `hideOnTablet` / `hideOnDesktop` | On mobile output, treat as **visible** unless block rule says omit |
| Float / fixed positioning | Map to `stack` + `positioned` where needed; else inline in flow |
| TipTap HTML in `richtext` fields | Strip to safe subset or plain text — [blocks/10-content-blocks.md](blocks/10-content-blocks.md) |
| Lucide icon names | Map to Material `icon.name` — [blocks/10-content-blocks.md](blocks/10-content-blocks.md) |
| Mock fixtures (`prod-001`, …) | Replace with API binding — [15-data-and-api-binding.md](15-data-and-api-binding.md) |

---

## Batch input formats

The converter accepts:

| Input | Handling |
|-------|----------|
| Single `UserData` object | One page; path from caller or `root.props.title` |
| `{ path, label, blocks[] }` | v0-style page shell |
| Array of page shells | Multi-page → multiple `pages[]` entries |
| Single block `{ type, props }` | Fragment mode (for unit tests) |

Fragment mode outputs a single mobile node or `body[]` array without full envelope.
