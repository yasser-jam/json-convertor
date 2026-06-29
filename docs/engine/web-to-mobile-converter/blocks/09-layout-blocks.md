# 09 — Layout Blocks

Web layout blocks ([docs/blocks.md §5.1](../../BLOCKS.md)) → mobile `container`, `column`, `row`, `gridView`.

---

## Section

**Rule 1.2** — Section → `container` + `column`.

> **Registry:** Primary **layout** block. Nested `Section` inside `Section` is invalid on web — emit a conversion warning and flatten to sibling containers.

### Web contract

| Prop | Type | Default |
|------|------|---------|
| `name` | string | `"New Section"` |
| `anchorId` | string | `""` |
| `visible` | boolean | `true` |
| `content[]` | blocks | — |
| `paddingTop/Bottom/Horizontal` | px string | `80px` / `80px` / `24px` |
| `backgroundColor` | hex | `#ffffff` (ignored when `backgroundImage` set) |
| `backgroundImage` | string URL | `""` |
| `backgroundOverlayColor` | string (rgba ok) | `""` |
| `theme` | `light` \| `dark` | `dark` |
| `maxWidth` | string | `1280px` |
| `columns` | number \| string 1–6 | `1` |
| `columnsMobile` | number \| string 1–6 | `1` |
| `gridGap` | string | `24px` |

### Mobile decomposition

```
container (background + padding)
  └── column (crossAxis: stretch, mainAxis: start, gap: 16)
        └── children[] (recursive)
```

### Prop mapping

| Web | Mobile |
|-----|--------|
| `visible: false` | **Omit** entire section subtree |
| `backgroundColor` | `container.style.color` (background fill) when no `backgroundImage` |
| `backgroundImage` | `stack`: full-bleed `image` (cover) + content column on top |
| `backgroundOverlayColor` | semi-transparent `container` layer between image and content |
| `paddingTop` | `style.padding.top` |
| `paddingBottom` | `style.padding.bottom` |
| `paddingHorizontal` | `style.padding.left` + `style.padding.right` |
| `theme: dark` / `light` | default child text colors on section column |
| `maxWidth` | **Ignore** on mobile (full bleed + horizontal padding) |
| `columns` / `columnsMobile` | **Gap:** mobile is single-column flow; use `columnsMobile` as hint for `gridView` chunking inside section only when all children are homogeneous cards |
| `gridGap` | `column.props.gap` when multi-column chunking applied |
| `anchorId` | **Ignore** — no in-page anchor scroll on mobile |
| `name` | **Ignore** — editor outline label only |
| `content[]` | `column.children[]` |

**Fix v0 bug:** use `style.color` for **background**, not text color.

### Layout constraints

- Section is scroll-safe as block sibling under `scroll: vertical`
- Default `gap: 16` between section children unless web Section adds explicit gap prop

### Before / after

**Web:**

```json
{
  "type": "Section",
  "props": {
    "backgroundColor": "#F9FAFB",
    "paddingTop": "32px",
    "paddingBottom": "32px",
    "content": []
  }
}
```

**Mobile:**

```json
{
  "id": "section-container-1",
  "type": "container",
  "style": {
    "color": "#F9FAFB",
    "padding": { "top": 32, "bottom": 32, "left": 16, "right": 16 }
  },
  "child": {
    "id": "section-column-2",
    "type": "column",
    "props": { "crossAxis": "stretch", "mainAxis": "start", "gap": 16 },
    "children": []
  }
}
```

---

## Flex

**Rule 2.1** (with Group).

### Web contract

| Prop | Options |
|------|---------|
| `direction` | `row`, `column` |
| `justifyContent` | flex-start, center, flex-end, space-between, space-around |
| `alignItems` | flex-start, center, flex-end, stretch, baseline |
| `wrap` | nowrap, wrap |
| `gap` | 4–32 |
| `items[]` | child blocks |

### Mobile decomposition

| Web `direction` | Mobile `type` |
|-----------------|---------------|
| `row` | `row` |
| `column` | `column` |

### Prop mapping

| Web | Mobile |
|-----|--------|
| `items[]` | `children[]` |
| `gap` | `props.gap` |
| `justifyContent` | `props.mainAxis` |
| `alignItems` | `props.crossAxis` |
| `wrap: wrap` | **Gap:** use `wrap` not native — split into column of rows or single row with horizontal scroll `listView` if many items |

### Layout constraints

- Row inside unbounded width: ensure parent has finite width (page column stretch OK)
- For centered icon rows: `mainAxis: center`, `crossAxis: center`

---

## Grid (layout)

Structural grid — **not** ProductGrid.

### Web contract

| Prop | Default |
|------|---------|
| `numColumns` | 2, 3, 4 |
| `gap` | 16 |
| `items[]` | blocks |

### Mobile decomposition

**Option A (preferred for small N):** `column` of `row` chunks (N columns per row).

**Option B:** If items are homogeneous cards, `gridView` without API `data` — static `children` only if engine supports (prefer Option A).

### Prop mapping

| Web | Mobile |
|-----|--------|
| `numColumns: 2` | Rows with 2 `Expanded` children each |
| `gap` | `gap` on row/column |
| `items[]` | Distribute into row groups |

---

## Group

Same flex rules as **Flex**; default web direction is `row`. **Legacy** `FlexGroup` / `Div` aliases normalize to `Group`.

| Web alias | Normalized to |
|-----------|---------------|
| `FlexGroup` (v0) | `Group` |
| `Div` (v0) | `Group` |

### Web contract

| Prop | Default |
|------|---------|
| `direction` | `row` |
| `gap` | `16` (0–120 px) |
| `alignItems` | `stretch` |
| `justifyContent` | `flex-start` |
| `wrap` | `nowrap` |
| `backgroundColor` | `""` (theme token or hex; empty = none) |
| `backgroundImage` | `""` |
| `backgroundOverlayColor` | `""` |
| `padding` | `"0px"` |
| `borderRadius` | `"theme-none"` |
| `boxShadow` | `none` \| `sm` \| `md` \| `lg` |
| `content[]` | blocks (Group uses `content`, Flex uses `items`; **no nested Section**) |

**Normalize:** `content[]` → `children[]` internally.

### Surface styling (Group-only)

When any surface prop is non-default, wrap the flex node in an outer `container`:

| Web | Mobile |
|-----|--------|
| `backgroundColor` | `container.style.color` |
| `backgroundImage` | `stack` with cover `image` + overlay |
| `backgroundOverlayColor` | overlay `container` rgba |
| `padding` | `container.style.padding` |
| `borderRadius` | `container.props.borderRadius` (resolve `theme-none` → `0`) |
| `boxShadow` sm/md/lg | `container` elevation or card wrapper |

### Before / after (FlexGroup horizontal)

**Web:**

```json
{
  "type": "FlexGroup",
  "props": {
    "orientation": "horizontal",
    "alignItems": "center",
    "gap": "16px",
    "items": [
      { "type": "Button", "props": { "text": "Shop Now", "href": "/products" } }
    ]
  }
}
```

**Mobile:**

```json
{
  "id": "group-row-1",
  "type": "row",
  "props": { "mainAxis": "start", "crossAxis": "center", "gap": 16 },
  "children": [
    {
      "id": "button-shop-2",
      "type": "button",
      "props": { "label": "Shop Now", "height": 48 },
      "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
    }
  ]
}
```

Note: v0 uses `orientation`; web Puck uses `direction` on Flex/Group — accept both.
