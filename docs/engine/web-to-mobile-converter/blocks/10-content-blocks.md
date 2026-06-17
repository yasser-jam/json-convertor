# 10 — Content Blocks

Web content blocks ([docs/blocks.md §5.2](../../BLOCKS.md)) → mobile primitives.

---

## Heading

### Decomposition

`text` (or `richtext` if HTML spans)

### Prop mapping

| Web | Mobile |
|-----|--------|
| `text` | `props.value` (strip TipTap) |
| `level` 1–4 | `fontSize` / `fontWeight` scale (h1 largest) |
| `align` | `props.textAlign` |
| `size` md/lg/xl/xxl | Map via [07-shared-fields.md](../07-shared-fields.md) |
| `colorMode/Theme/Fixed` | `props.color` |

---

## Text / Paragraph

`Paragraph` is deprecated alias — same rules as **Text**.

### Decomposition

`text` or `richtext`

| Web | Mobile |
|-----|--------|
| `text` (TipTap HTML) | `richtext` or stripped `text.value` |
| `size` s/m/l | fontSize 14/16/18 |
| `color` default/muted | theme text/muted |
| `align` | `textAlign` |

---

## Space

### Decomposition

`sizedBox`

| Web | Mobile |
|-----|--------|
| `size` | `height` if vertical, `width` if horizontal |
| `direction: vertical` | `props.height` = parsed px |
| `direction: horizontal` | `props.width` = parsed px |

---

## Button

**Rule 2.2**

### Decomposition

`button` + node `tap`

| Web | Mobile |
|-----|--------|
| `label` / `labelAr` | `props.label` |
| `variant`, `size` | [07-shared-fields.md](../07-shared-fields.md) |
| `fullWidth` | `props.fullWidth: true` |
| `buttonAction`, `href`, `link` | `tap` |

### Before / after

**Web:**

```json
{
  "type": "Button",
  "props": {
    "label": "Checkout Now",
    "variant": "primary",
    "href": "/checkout"
  }
}
```

**Mobile:**

```json
{
  "id": "button-checkout-1",
  "type": "button",
  "props": { "label": "Checkout Now", "height": 48, "variant": "primary" },
  "tap": { "type": "navigate", "route": "/checkout", "navigation_type": "push" }
}
```

---

## Link

### Decomposition

`button` with `variant: ghost` or `text` + `tap` (prefer button for tap target)

Same link resolution as Button; `label`/`labelAr` → `props.label`.

---

## Icon

### Decomposition

`icon`

| Web | Mobile |
|-----|--------|
| `name` (Lucide) | `props.name` Material map — see table below |
| `size` | `props.size` numeric |
| `strokeWidth` | **Ignore** |
| colors | `props.color` |

### Lucide → Material (common)

| Lucide | Material `name` |
|--------|-----------------|
| Star | `star` (use `Icons.star` — add to parser if missing) |
| Heart | `favorite` |
| ShoppingCart | `shopping_cart` |
| Menu | `menu` |
| X | `close` |
| Search | `search` |
| User | `person` |

**Gap:** Unknown Lucide → `error_outline` or `circle` fallback.

---

## Image

### Decomposition

`image`

| Web | Mobile |
|-----|--------|
| `src` | `props.url`, `source: "network"` |
| `alt` | `props.alt` / `semanticsLabel` |
| `aspectRatio` | `props.aspectRatio` (1, 16/9, etc.) |
| `borderRadius` | `props.borderRadius` from theme step |
| `objectFit` | `props.fit`: cover/contain/fill |
| `width`, `height` | pass through where numeric |

---

## Video

### Decomposition

`videoPlayer`

| Web | Mobile |
|-----|--------|
| `src` (mp4) | `props.url` |
| `poster` | thumbnail `image` sibling if player lacks poster prop |
| `controls`, `autoPlay`, `loop`, `muted` | map to `videoPlayer` props if supported |
| `aspectRatio` | wrapper `aspectRatio` on container |

---

## YouTube

### Decomposition

`videoPlayer` with embed URL, or `image` poster + `tap.openUrl`

Apply [07-shared-fields.md](../07-shared-fields.md) YouTube normalizer.

| Web | Mobile |
|-----|--------|
| `url` | normalized embed URL |
| `aspectRatio` | 16:9 default |

**Gap:** YouTube iframe policies — fallback to `openUrl` tap.

---

## Hero

### Decomposition

```
container or stack
  ├── image (background mode) OR column
  ├── text (title)
  ├── richtext/text (description)
  └── row (buttons[])
```

| Web | Mobile |
|-----|--------|
| `title` | `text.value` |
| `description` | `richtext` / `text` |
| `buttons[]` | convert each to `button` in `row` |
| `align` | column `crossAxis` + text `textAlign` |
| `padding` | container padding |
| `image.mode: background` | `stack` with full-bleed `image` |
| `image.mode: split` | `column`: image then content |
| `backgroundAttachment: fixed` | **Gap:** use scroll attachment |

---

## Card

### Decomposition

`card` → `column` child

| Web | Mobile |
|-----|--------|
| `title` | `text` |
| `description` | `text` / `richtext` |
| `image.url` | `image` |
| `variant` default/outlined/elevated | `card.props.elevation`, border |
| colors | `card.props.color` |

---

## Badge

### Decomposition

```
container (padding, background, borderRadius)
  └── text (label)
```

| Web | Mobile |
|-----|--------|
| `label` / `labelAr` | `text.value` |
| `variant` discount/inStock/outOfStock | preset colors from theme |
| `size` sm/md/lg | fontSize |

Float layout: [06-layout-cross-cutting.md](../06-layout-cross-cutting.md).

---

## Divider

### Decomposition

`divider`

| Web | Mobile |
|-----|--------|
| `orientation: horizontal` | default divider |
| `orientation: vertical` | **Gap:** `container` width 1 + background color |
| `thickness` | `props.thickness` |
| colors | `props.color` |
| `width` / `height` | container constraints |

---

## Summary table

| Web type | Mobile root type |
|----------|------------------|
| Heading | `text` / `richtext` |
| Text, Paragraph | `text` / `richtext` |
| Space | `sizedBox` |
| Button, Link | `button` |
| Icon | `icon` |
| Image | `image` |
| Video, YouTube | `videoPlayer` (+ fallbacks) |
| Hero | `stack` / `column` composite |
| Card | `card` |
| Badge | `container` + `text` |
| Divider | `divider` |
