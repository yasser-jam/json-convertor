# 10 — Content Blocks

Web content blocks ([docs/BLOCKS.md](../../BLOCKS.md)) → mobile primitives.

> **Registry:** Current editor content primitives include `ContentHeading`, `ContentParagraph`, `ContentButton`, `ContentImage`, `ContentDivider`, `ContentIcon`, `Accordion`, `ImageGallery`, `Testimonials`, `VideoEmbed`, `Space`, `ContactForm`. **Legacy** types (`Heading`, `Text`, `RichText`, `Button`, `Card`, `Hero`, `Logos`, `Stats`, `ContentHtml`, `ContentIcon`) still appear in old `store_config.json` — accept both shapes; prefer `Content*` when both exist.

---

## Heading / ContentHeading

`ContentHeading` is the registered editor type; `Heading` is **legacy** with a different prop surface (`size`, `colorMode`).

### Decomposition

`text` (or `richtext` if HTML spans)

### Prop mapping — ContentHeading

| Web | Mobile |
|-----|--------|
| `text` | `props.value` (strip TipTap) |
| `level` `"1"`…`"6"` | `fontSize` / `fontWeight` scale (h1 largest) |
| `textAlign` | `props.textAlign` |
| `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `fontStyle`, `textTransform` | resolve theme tokens — [07-shared-fields.md](../07-shared-fields.md) |
| `color` | `props.color` (theme token → hex) |

### Prop mapping — legacy Heading

| Web | Mobile |
|-----|--------|
| `text` | `props.value` |
| `size` xxxl…xs | fontSize scale |
| `level` 1–6 or `""` | semantic weight when set |
| `align` | `textAlign` |
| `colorMode/Theme/Fixed` | `props.color` |

---

## Text / ContentParagraph

`ContentParagraph` is registered; `Text` is **legacy** (uses `align` instead of `textAlign`).

### Decomposition

`text` or `richtext`

| Web | Mobile |
|-----|--------|
| `text` (TipTap HTML) | `richtext` or stripped `text.value` |
| `textAlign` / `align` | `textAlign` |
| `fontSize` theme-md etc. | resolve via [07-shared-fields.md](../07-shared-fields.md) |
| `color` / `color: muted` | theme text/muted |

---

## RichText

### Decomposition

`richtext`

| Web | Mobile |
|-----|--------|
| `richtext` (HTML) | `props.richtext` (safe subset) or stripped `text` |

---

## Space

### Decomposition

`sizedBox`

| Web | Mobile |
|-----|--------|
| `size` (`theme-24`, px) | `props.height` = parsed px (vertical spacer) |

---

## Button / ContentButton

`ContentButton` is registered with extended styling; `Button` is **legacy**.

### Decomposition

`button` + node `tap`

| Web (both) | Mobile |
|-----|--------|
| `label` | `props.label` |
| `link` / `href` / `buttonAction` | `tap` — [07-shared-fields.md](../07-shared-fields.md) |

| Web (ContentButton only) | Mobile |
|-----|--------|
| `destinationType: "link"` | `tap.navigate` / `openUrl` from `link` |
| `destinationType: "action"` | `tap` from `buttonAction` |
| `align` left/center/right | wrap in `container` with alignment |
| `buttonVariantMode`, `buttonVariant`, `buttonVariantSize` | `button.props.variant`, height from theme |
| `buttonVariantMode: "fixed"` | `bgColor`, `textColor`, `radius`, `buttonSize` → literal props |

### Before / after

**Web (ContentButton):**

```json
{
  "type": "ContentButton",
  "props": {
    "label": "اشتر الآن",
    "destinationType": "link",
    "link": { "kind": "page", "pageId": "/products" },
    "buttonVariant": "primary",
    "buttonVariantSize": "lg"
  }
}
```

**Mobile:**

```json
{
  "id": "button-shop-1",
  "type": "button",
  "props": { "label": "اشتر الآن", "height": 56, "variant": "primary" },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

---

## ContentIcon / Icon

`ContentIcon` is registered; legacy `ContentIcon` in old configs may use PascalCase Lucide names — normalize to **lowercase kebab-case** (`shield-check`, not `ShieldCheck`).

### Decomposition

`icon`

| Web | Mobile |
|-----|--------|
| `icon` (Lucide kebab-case) | `props.name` Material map |
| `size` | `props.size` numeric |
| `colorMode/Theme/Fixed` | `props.color` |

### Lucide → Material (common)

| Lucide | Material `name` |
|--------|-----------------|
| `star` | `star` |
| `heart` | `favorite` |
| `shopping-cart` | `shopping_cart` |
| `menu` | `menu` |
| `x` | `close` |
| `search` | `search` |
| `user` | `person` |
| `truck` | `local_shipping` |
| `shield-check` | `verified_user` |

**Gap:** Unknown Lucide → `error_outline` fallback.

---

## ContentImage / Image

### Decomposition

`image`

| Web | Mobile |
|-----|--------|
| `src` | `props.url`, `source: "network"` |
| `alt` | `props.alt` / `semanticsLabel` |
| `align` | parent `column` `crossAxis` |
| `objectFit` | `props.fit`: cover/contain/fill |
| `radius` | `props.borderRadius` (resolve `theme-md`, etc.) |
| `maxWidth` | `container` max width constraint |

---

## VideoEmbed / YouTube

### Decomposition

`videoPlayer` with embed URL, or `image` poster + `tap.openUrl`

| Web | Mobile |
|-----|--------|
| `src` (YouTube watch/short URL) | normalized embed URL |
| `size` (`theme-315`, px) | `props.height` |
| `align` | wrapper alignment |
| `radius` | `props.borderRadius` |

**Gap:** YouTube iframe policies — fallback to `openUrl` tap.

---

## Hero (legacy)

Still rendered from old `store_config.json`; decompose to mobile composite.

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
| `description` (HTML) | `richtext` / `text` |
| `buttons[]` | each → `button` in `row`; `variant` optional (defaults primary) |
| `buttons[].href` | `tap.navigate` (legacy string href — prefer LinkValue on new blocks) |
| `align` | column `crossAxis` + text `textAlign` |
| `padding` | container padding |
| `image.mode: background` | `stack` with full-bleed `image` |
| `image.mode: inline` | `column`: image then content |
| `image.mode: custom` | recurse `image.content[]` slot as child blocks |
| `image.backgroundAttachment: fixed` | **Gap:** use scroll attachment |
| `quote` | **Ignore** — editor demo auto-fill only |

---

## Card (legacy)

Feature card with icon, title, description.

### Decomposition

```
card or column
  ├── icon (from Lucide key)
  ├── text (title)
  └── text (description)
```

| Web | Mobile |
|-----|--------|
| `title` | `text` |
| `description` | `text` |
| `icon` (kebab-case, optional) | `icon` node |
| `mode: flat` \| `card` | elevation / border on wrapper |

---

## Accordion

### Decomposition

```
column
  ├── text (heading) — optional
  ├── text (description) — optional
  └── expansionTile[] (one per items[])
```

| Web | Mobile |
|-----|--------|
| `heading`, `description` | leading `text` nodes |
| `items[].title` | `expansionTile.props.title` |
| `items[].body` | `expansionTile` child `text` |
| `items[].open` | `expansionTile.props.initiallyExpanded` |
| `variant`, `backgroundColor`, `textColor` | tile/card styling |

---

## Blank (dev-only)

**Not registered** in editor — ignore unless legacy data contains `"type": "Blank"`.

| Web | Mobile |
|-----|--------|
| `message` | `text` with message value |

---

## Stats / Logos (legacy)

No dedicated mobile type — **decompose manually**:

| Web | Mobile decomposition |
|-----|---------------------|
| `Stats` `items[]` | `row` of `column` (title + description `text`) |
| `Logos` `logos[]` | `row` or horizontal `listView` of `image` nodes |

Emit conversion **warning** when encountered; include decomposed subtree if merchant content depends on it.

---

## ContentHtml (legacy)

Raw HTML — **not shown on mobile/small screens** on web. Mobile policy unchanged:

| Web | Mobile |
|-----|--------|
| `html` | stripped `text` or safe `richtext` subset |

---

## Divider / ContentDivider

### Decomposition

`divider`

| Web | Mobile |
|-----|--------|
| `thickness` | `props.thickness` |
| `colorMode/Theme/Fixed` | `props.color` |

---

## Summary table

| Web type | Registry | Mobile root type |
|----------|----------|------------------|
| ContentHeading | blocks | `text` / `richtext` |
| Heading | legacy | `text` |
| ContentParagraph | blocks | `text` / `richtext` |
| Text | legacy | `text` / `richtext` |
| RichText | legacy | `richtext` |
| Space | blocks | `sizedBox` |
| ContentButton | blocks | `button` |
| Button | legacy | `button` |
| ContentIcon | blocks / legacy | `icon` |
| ContentImage | blocks | `image` |
| VideoEmbed | blocks | `videoPlayer` |
| Hero | legacy | `stack` / `column` composite |
| Card | legacy | `card` / `column` composite |
| Accordion | blocks | `column` + `expansionTile` |
| Blank | dev-only | `text` |
| Stats, Logos | legacy | `row` composite (manual) |
| ContentHtml | legacy | stripped `text` |
| ContentDivider | blocks | `divider` |
