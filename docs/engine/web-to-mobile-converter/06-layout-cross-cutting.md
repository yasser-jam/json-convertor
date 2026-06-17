# 06 — Layout Cross-Cutting

Maps web `props.layout` ([docs/blocks.md §4](../../BLOCKS.md)) onto mobile `style`, `container`, and `stack`.

Every web block may include optional `props.layout` (`LayoutFieldProps`).

---

## Grid spanning

Web layout grid span applies inside web CSS Grid — mobile has no grid-span prop.

| Web | Mobile policy |
|-----|---------------|
| `spanCol`, `spanRow` | **Ignore** on mobile unless parent is `gridView` (commerce only) |
| `grow: true` | Child wrapped in `container` with `expand: true` appropriate axis |

---

## Spacing (margin & padding)

| Web layout field | Mobile target |
|------------------|---------------|
| `paddingTop/Right/Bottom/Left` | `style.padding.{top,right,bottom,left}` (numeric px) |
| `padding` (deprecated) | Uniform padding on all sides |
| `marginTop/Right/Bottom/Left` | `style.margin.*` |

**Parse:** `"16px"` → `16`; `"0px"` → `0`.

If layout padding conflicts with block props (e.g. Section `paddingTop`), **merge** — block props win for section container, layout margins apply to outer wrapper.

---

## Float / positioning

| Web | Mobile decomposition |
|-----|---------------------|
| `positionMode: "static"` | Normal flow — no extra wrapper |
| `positionMode: "float"` | Wrap node in `stack` parent; child uses `stackLayer: "positioned"` |

### Float preset → stack offsets

| Web `floatPreset` | Mobile `stack` child |
|-------------------|---------------------|
| `top-left` | `positioned` top/left |
| `top-right` | `positioned` top/right |
| `bottom-right` | `positioned` bottom/right |
| … | Map remaining 8 anchors |

Use web `fixedTop/Right/Bottom/Left` when `floatPlacementMode: "custom"`.

**Gap:** Web `fixed` vs `absolute` (`floatUseFixedPosition`) — mobile stack uses positioned within bounded stack; full-viewport fixed overlays use page-level `stack` with expand.

### Badge on product image (common pattern)

```
stack
  ├── image (product)
  └── container (positioned top-right)
        └── text/badge label
```

---

## Border

| Web | Mobile |
|-----|--------|
| `borderWidth` | `props.borderWidth` or `style.border` if supported |
| `borderStyle: dashed` | **Gap:** use solid or omit |
| `borderColor` | `props.borderColor` hex |

---

## Box shadow

| Web `shadowMode` | Mobile |
|------------------|--------|
| `none` | omit shadow |
| `preset: sm/md/lg/xl` | `card.props.elevation` or container shadow if defined |
| `custom` | **Gap:** approximate with `elevation: 2` on `card` |

---

## Display & visibility

| Web | Mobile policy |
|-----|---------------|
| `displayMode: block` | Default column/flow |
| `displayMode: flex` | Already handled by Flex/Group block rules |
| `displayMode: grid` | Parent `gridView` or column of rows |
| `hideOnMobile: true` | **Omit node** on mobile (mobile is always "mobile") |
| `hideOnTablet: true` | Include node (no tablet form factor) |
| `hideOnDesktop: true` | Include node |

---

## Section maxWidth

Web Section `maxWidth: "1280px"` → mobile full bleed; apply horizontal padding via Section padding props instead. **Do not** set fixed 1280px width on mobile.

---

## Layout application order

1. Convert block core (type decomposition)
2. Apply block intrinsic padding (Section, Hero, …)
3. Merge `props.layout` margin/padding onto outermost mobile node of decomposition
4. If float: wrap in `stack` per above

---

## Example

**Web Badge with float layout** (from [docs/blocks.md §8.27](../../BLOCKS.md)):

```json
{
  "type": "Badge",
  "props": {
    "label": "-20%",
    "layout": {
      "positionMode": "float",
      "floatPreset": "top-right",
      "marginTop": "8px",
      "marginRight": "8px"
    }
  }
}
```

**Mobile:**

```json
{
  "id": "badge-discount-positioned",
  "type": "container",
  "props": { "stackLayer": "positioned", "stackTop": 8, "stackRight": 8 },
  "child": {
    "id": "badge-discount-text",
    "type": "container",
    "style": { "padding": { "left": 8, "right": 8, "top": 4, "bottom": 4 }, "color": "#FEE2E2" },
    "child": {
      "id": "badge-discount-label",
      "type": "text",
      "props": { "value": "-20%", "fontSize": 12, "fontWeight": "bold", "color": "#DC2626" }
    }
  }
}
```

(Parent `stack` must wrap this + sibling content in decomposition.)
