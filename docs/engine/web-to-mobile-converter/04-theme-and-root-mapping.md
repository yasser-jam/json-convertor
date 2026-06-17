# 04 — Theme and Root Mapping

Maps web `root.props` ([docs/blocks.md §2–3](../../BLOCKS.md)) → mobile `theme` object.

---

## Colors

| Web `root.props` | Mobile `theme.colors` | Notes |
|------------------|----------------------|-------|
| `primary` | `primary` | Direct hex |
| `surface` | `surface` | Direct hex |
| `text` | `text` | Direct hex |
| `neutral` | `muted` | Web neutral → mobile muted |
| `success` | `success` | Direct hex |
| `warning` | `warning` | Direct hex |
| `error` | `error` | Direct hex |
| `dark` | — | Use for derived `background` if needed |
| — | `background` | Derive: blend `surface` ~88% + white, or use `#F1F5F9` default |

Web CSS derived vars (`--theme-color-background`, etc.) are **not** emitted — resolve to hex at conversion time.

---

## Typography scale

Web uses rem strings; mobile uses **px integers** in `theme.typography.scale`.

| Web prop | rem default | Mobile key | px |
|----------|-------------|------------|-----|
| `textSizeXs` | 0.75rem | `xs` | 12 |
| `textSizeSm` | 0.875rem | `sm` | 13–14 |
| `textSizeMd` | 1rem | `md` | 16 |
| `textSizeLg` | 1.1875rem | `lg` | 18 |
| `textSizeXl` | 1.375rem | `xl` | 22 |
| `textSize2xl` | 1.75rem | `xxl` | 28 |
| — | — | `display` | 36 (mobile-only step) |

**Conversion:** `px = round(parseFloat(rem) * 16)` unless web value is already `px`.

### Font weights

| Web | Mobile `theme.typography.weights` |
|-----|-----------------------------------|
| `fontWeightNormal` (400) | `normal: 400` |
| `fontWeightMedium` (520) | `medium: 500` (clamp to 500) |
| `fontWeightSemibold` (620) | map to `medium` or add bold usage on nodes |
| `fontWeightBold` (740) | `bold: 700` |

### Line height

| Web | Mobile |
|-----|--------|
| `lineHeightTight` (1.22) | `tight: 1.25` |
| `lineHeightNormal` (1.58) | `normal: 1.5` |
| `lineHeightRelaxed` (1.78) | `relaxed: 1.75` |

---

## Font family

| Web `bodyFont` slug | Mobile `theme.typography.fontFamily` |
|---------------------|----------------------------------------|
| `dm-sans` | `"DM Sans"` or keep prod default `Tajawal` for AR storefront |
| `inter` | `"Inter"` |
| `roboto` | `"Roboto"` |
| `tajawal` (if added) | `"Tajawal"` |
| `system` | `"Tajawal"` (prod default for SOOQ AR) |

**Rule:** For `language: "ar"`, prefer **Tajawal** unless merchant explicitly sets Latin-first font. `fontOption1` / `fontOption2` are web-only display fonts — map to node-level font overrides only when block uses `fontFamily: "option1"`.

---

## Radius

| Web prop | px string | Mobile `theme.radius` |
|----------|-----------|----------------------|
| `radiusNone` | 0 | `none: 0` |
| `radiusSm` | 8px | `sm: 6–8` |
| `radiusMd` | 12px | `md: 10–12` |
| `radiusLg` | 18px | `lg: 14–18` |
| `radiusXl` | 24px | `xl: 20–24` |
| `radiusFull` | 9999px | `full: 9999` |

Block-level `borderRadius: "md"` → resolve via this table to int on node `props.borderRadius`.

---

## Button tokens

| Web | Mobile `theme.buttons` |
|-----|------------------------|
| `buttonSmHeight`, `buttonSmPaddingX`, `buttonSmFontSize` | `buttons.sm.{height, padX, fontSize, radius}` |
| `buttonMd*` | `buttons.md.*` |
| `buttonLg*` | `buttons.lg.*` |

Web block `Button.props.size` (`sm`|`md`|`lg`) → use matching theme button token for `height` / `fontSize` on mobile `button` node.

---

## Badge defaults

Web `badgeShape`, `badgeStyle` affect web Badge component CSS — on mobile, decompose Badge to `container` + `text` and apply:

| Web `badgeShape` | Mobile `borderRadius` |
|------------------|----------------------|
| `pill` | `theme.radius.full` |
| `rounded` | `theme.radius.md` |
| `square` | `theme.radius.sm` |

---

## Locale

| Web | Mobile effect |
|-----|---------------|
| `direction: "rtl"` | Default `textAlign: "right"`; engine RTL from `MaterialApp` |
| `direction: "ltr"` | Default `textAlign: "left"` |
| `language: "ar"` | Prefer `*Ar` copy fields |
| `language: "en"` | Prefer English labels |
| `currency: "SYP"` | Price formatting context (display only) |

---

## Theme mode

Web Section `theme: "dark"` → node-level dark colors (`props.color`, `props.textColor`), not global `theme.mode` flip unless entire site is dark (out of scope — default `theme.mode: "light"`).

---

## `theme.mode`

Always `"light"` unless future builder adds global dark — do not infer from single Section.

---

## Example

**Web root.props (excerpt):**

```json
{
  "primary": "#0b78c5",
  "surface": "#f6f8fc",
  "text": "#14243f",
  "neutral": "#6b7d93",
  "bodyFont": "dm-sans",
  "direction": "rtl",
  "language": "ar"
}
```

**Mobile theme (excerpt):**

```json
{
  "mode": "light",
  "colors": {
    "primary": "#0b78c5",
    "surface": "#f6f8fc",
    "background": "#F1F5F9",
    "text": "#14243f",
    "muted": "#6b7d93",
    "success": "#16A34A",
    "warning": "#D97706",
    "error": "#DC2626"
  },
  "typography": {
    "fontFamily": "Tajawal",
    "scale": { "xs": 12, "sm": 14, "md": 16, "lg": 19, "xl": 22, "xxl": 28, "display": 36 }
  }
}
```
