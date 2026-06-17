# 09 — Layout Blocks

Web layout blocks ([docs/blocks.md §5.1](../../BLOCKS.md)) → mobile `container`, `column`, `row`, `gridView`.

---

## Section

**Rule 1.2** — Section → `container` + `column`.

### Web contract

| Prop | Type | Default |
|------|------|---------|
| `content[]` | blocks | — |
| `paddingTop/Bottom/Horizontal` | px string | `0px` |
| `maxWidth` | string | `1280px` |
| `backgroundColor` | hex | inherit |
| `theme` | `light` \| `dark` | `light` |

### Mobile decomposition

```
container (background + padding)
  └── column (crossAxis: stretch, mainAxis: start, gap: 16)
        └── children[] (recursive)
```

### Prop mapping

| Web | Mobile |
|-----|--------|
| `backgroundColor` | `container.style.color` (background fill) |
| `paddingTop` | `style.padding.top` |
| `paddingBottom` | `style.padding.bottom` |
| `paddingHorizontal` | `style.padding.left` + `style.padding.right` |
| `theme: dark` | dark bg/text on container + default child text colors |
| `maxWidth` | **Ignore** on mobile |
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

Same rules as **Flex**; default web direction is `column`.

| Web alias | Normalized to |
|-----------|---------------|
| `FlexGroup` (v0) | `Group` |
| `Div` (v0) | `Group` |

### Web contract

| Prop | Default |
|------|---------|
| `direction` | `column` |
| `content[]` | blocks (Group uses `content`, Flex uses `items`) |

**Normalize:** `content[]` → `children[]` internally.

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
