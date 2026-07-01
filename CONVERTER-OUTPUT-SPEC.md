# Converter Output Specification

**Version:** 2026-07-01  
**Source file:** `lib/transformer.ts` → `transformWebToMobile()`  
**Audience:** Mobile engine team — Flutter SDUI renderers, schema validation, Dart model generation  
**Purpose:** Authoritative description of every JSON shape the converter emits. Use this document as the single source of truth when building renderers, writing Dart schemas, and validating converter output.

> **Scope:** This document describes **mobile output only**. Web JSON (Puck blocks) is never forwarded to the engine as-is. The converter transforms every web block type into the mobile primitives listed below.

---

## Table of Contents

1. [Input formats accepted](#1-input-formats-accepted)
2. [Valid mobile output types](#2-valid-mobile-output-types)
3. [Web type aliases](#3-web-type-aliases)
4. [Global rules (apply to every node)](#4-global-rules)
5. [Token resolution tables](#5-token-resolution-tables)
6. [Block transformations with examples](#6-block-transformations)
7. [Page envelope structure](#7-page-envelope-structure)
8. [Locale rules](#8-locale-rules)
9. [Data-bound blocks (API-connected)](#9-data-bound-blocks)
10. [Unsupported blocks](#10-unsupported-blocks)
11. [Validation checklist](#11-validation-checklist)

---

## 1. Input Formats Accepted

The transformer accepts three input shapes:

### 1a — Single block object
```json
{ "type": "Section", "props": { ... } }
```
Output: a single converted node.

### 1b — Array of blocks
```json
[
  { "type": "Hero", "props": { ... } },
  { "type": "Section", "props": { ... } }
]
```
Output: an array of converted nodes.

### 1c — Page object (recommended for full pages)
```json
{
  "path": "/home",
  "label": "Home",
  "rootProps": {
    "direction": "rtl",
    "language": "ar",
    "primary": "#0b78c5",
    "surface": "#f6f8fc",
    "text": "#14243f",
    "neutral": "#6b7d93",
    "bodyFont": "dm-sans",
    "headerBrandTitle": "SOOQ",
    "headerBackgroundColor": "#ffffff",
    "headerTextColor": "#0f172a",
    "headerShowDrawerButton": "on"
  },
  "blocks": [ ... ]
}
```
Output: full app config envelope (see [Section 7](#7-page-envelope-structure)).

### 1d — Array of page objects
An array of page objects produces a multi-page app config with the full envelope.

---

## 2. Valid Mobile Output Types

Every `"type"` field in converter output is one of these registered engine primitives:

| Category | Types |
|----------|-------|
| Scaffold / scroll | `scaffold`, `singleChildScrollView` |
| Layout | `column`, `row`, `container`, `stack`, `listView`, `gridView`, `sizedBox` |
| Content | `text`, `richtext`, `image`, `icon`, `divider`, `videoPlayer`, `imageSlider` |
| Input / forms | `textFormField`, `form`, `button`, `contactButton`, `otpInput`, `dropdown` |
| Chrome | `appBar`, `appDrawer`, `tabs`, `card`, `expansionTile` |
| Other | `timer`, `progressIndicator`, `unsupported` |

Web block type names (`Button`, `Section`, `ContentParagraph`, etc.) **never appear** in converter output.

---

## 3. Web Type Aliases

The converter normalises the following web type names before dispatch:

| Web type | Resolved as |
|----------|-------------|
| `ContentImage` | `Image` |
| `ContentParagraph` | `Text` |
| `ContentHeading` | `Heading` |
| `ContentButton` | `Button` |
| `ContentDivider` | `Divider` |
| `ContentIcon` | `Icon` |
| `ContentHtml` | `Html` (→ `richtext`) |
| `VideoEmbed` | `YouTube` (handles both YouTube and MP4/HLS) |
| `ProductsGrid` | `ProductGrid` |
| `OrderHistory` | `OrderList` |

---

## 4. Global Rules

### G1 — Node shape

Every emitted node has exactly these top-level keys:

```json
{
  "id": "<unique-string>",
  "type": "<mobile-primitive>",
  "props": { ... }
}
```

- `id` is auto-generated as `<prefix>-<counter>`, unique per conversion run.
- Child slots use **either** `"child"` (single node) **or** `"children"` (array) — never both on the same node.
- `"props"` is always present, even if empty (`{}`).

### G2 — `tap` is node-level, never inside `props`

All navigation, actions and links are placed as a **sibling of `props`** on the node.

**Wrong:**
```json
{
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Correct:**
```json
{
  "id": "button-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated", "height": 48 },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

`buttonAction`, `link`, `href`, `destinationType` are **never** emitted inside `props`. `onTap` is never emitted at all (runtime-injected).

### G3 — No theme tokens in output

All `"theme-*"` strings, `colorMode`/`colorTheme`/`colorFixed` triples, and `px` strings are resolved to concrete numbers or hex strings at conversion time. See [Section 5](#5-token-resolution-tables).

### G4 — Flat `props` (no `style` wrapper)

All visual and box-model properties live directly in `props`. There is no nested `style` object.

**Wrong:** `"style": { "color": "#fff", "padding": { "top": 32 } }`  
**Correct:** `"props": { "color": "#fff", "padding": { "top": 32 } }`

### G5 — Full alignment property names

| Wrong | Correct |
|-------|---------|
| `"mainAxis": "center"` | `"mainAxisAlignment": "center"` |
| `"crossAxis": "stretch"` | `"crossAxisAlignment": "stretch"` |

Valid `mainAxisAlignment` values: `start`, `center`, `end`, `spaceBetween`, `spaceAround`, `spaceEvenly`  
Valid `crossAxisAlignment` values: `start`, `center`, `end`, `stretch`, `baseline`

### G6 — Numeric props are JSON numbers

| Wrong | Correct |
|-------|---------|
| `"columns": "4"` | `"crossAxisCount": 4` |
| `"gap": "md"` | `"mainAxisSpacing": 12, "crossAxisSpacing": 12` |
| `"thickness": "1px"` | `"thickness": 1` |

---

## 5. Token Resolution Tables

### Typography / spacing tokens

| Web token | Resolved number | Context |
|-----------|-----------------|---------|
| `theme-xs` | `12` | fontSize |
| `theme-sm` | `14` | fontSize |
| `theme-sm` | `4` | borderRadius |
| `theme-md` | `16` | fontSize / spacing |
| `theme-md` | `8` | borderRadius |
| `theme-lg` | `18` | fontSize |
| `theme-lg` | `12` | borderRadius |
| `theme-xl` | `22` | fontSize |
| `theme-xl` | `16` | borderRadius |
| `theme-2xl` / `theme-xxl` | `28` | fontSize |
| `theme-none` | `0` | borderRadius |
| `theme-full` | `999` | borderRadius |
| `theme-4` | `4` | spacing |
| `theme-8` | `8` | spacing |
| `theme-16` | `16` | spacing |
| `theme-24` | `24` | spacing |
| `theme-40` | `40` | spacing |
| `theme-315` | `315` | height |
| `theme-480` | `480` | height |
| `theme-5` | `5000` | `intervalMs` (autoplay milliseconds) |
| `"60px"` | `60` | any numeric prop (px stripped) |

> **Note:** `theme-sm/md/lg/xl` borderRadius values use the above fixed fallbacks. If `rootProps` contains `radiusSm`, `radiusMd`, `radiusLg`, `radiusXl`, those values override the fixed fallbacks.

### Gap token map

| Web `gap` | Mobile number |
|-----------|---------------|
| `sm` | `8` |
| `md` | `12` |
| `lg` | `16` |
| `xl` | `24` |

### Color triple → hex

| Web | Mobile |
|-----|--------|
| `colorMode: "theme"`, `colorTheme: "primary"` | `rootProps.primary` or `"#0b78c5"` |
| `colorMode: "theme"`, `colorTheme: "surface"` | `rootProps.surface` or `"#ffffff"` |
| `colorMode: "theme"`, `colorTheme: "text"` | `rootProps.text` or `"#0f172a"` |
| `colorMode: "theme"`, `colorTheme: "neutral"` | `rootProps.neutral` or `"#64748b"` |
| `colorMode: "theme"`, `colorTheme: "error"` | `rootProps.error` or `"#ef4444"` |
| `colorMode: "theme"`, `colorTheme: "success"` | `rootProps.success` or `"#0f9d73"` |
| `colorMode: "theme"`, `colorTheme: "warning"` | `rootProps.warning` or `"#c77a15"` |
| `colorMode: "theme"`, `colorTheme: "dark"` | `rootProps.dark` or `"#10213a"` |
| `colorMode: "fixed"`, `colorFixed: "#hex"` | `"#hex"` (pass-through) |

`colorMode`, `colorTheme`, `colorFixed` are **never** emitted in output.

### Button variant map

| Web `variant` / `buttonVariant` | Mobile `props.variant` |
|---------------------------------|------------------------|
| `primary` | `elevated` |
| `secondary` | `outlined` |
| `outline` | `outlined` |
| `ghost` | `text` |
| `danger` | `filled` |
| *(any other / missing)* | `elevated` |

### Button size → height

| Web `size` | Mobile `props.height` |
|------------|-----------------------|
| `sm` | `36` |
| `md` *(default)* | `48` |
| `lg` | `56` |

### Aspect ratio map

| Web `aspectRatio` | Mobile number |
|-------------------|---------------|
| `square` / `1:1` | `1.0` |
| `landscape` / `16:9` | `1.777` |
| `portrait` | `0.75` |
| `wide` / `21:9` | `2.333` |
| `4:3` | `1.333` |

### Font weight map

| Web `fontWeight` | Mobile `fontWeight` |
|-----------------|---------------------|
| `theme-light` / `light` / `normal` | `"normal"` |
| `theme-normal` | `"normal"` |
| `theme-semibold` / `semibold` | `"bold"` |
| `theme-bold` / `bold` | `"bold"` |
| `medium` | `"medium"` |

### Web flex alignment → mobile

| Web `justifyContent` / `alignItems` | Mobile value |
|-------------------------------------|--------------|
| `flex-start`, `start` | `start` |
| `center` | `center` |
| `flex-end`, `end` | `end` |
| `space-between`, `spaceBetween` | `spaceBetween` |
| `space-around`, `spaceAround` | `spaceAround` |
| `space-evenly`, `spaceEvenly` | `spaceEvenly` |
| `stretch` | `stretch` |
| `baseline` | `baseline` |

### Lucide icon → Material icon name

| Lucide | Material |
|--------|----------|
| `shield-check`, `ShieldCheck` | `verified_user` |
| `truck`, `Truck` | `local_shipping` |
| `heart`, `Heart` | `favorite` |
| `star`, `Star` | `star` |
| `shopping-cart`, `ShoppingCart` | `shopping_cart` |
| `menu`, `Menu` | `menu` |
| `search`, `Search` | `search` |
| `user`, `User` | `person` |
| `arrow-right`, `ArrowRight` | `arrow_forward` |
| `arrow-left`, `ArrowLeft` | `arrow_back` |
| `check-circle` | `check_circle` |
| `alert-circle` | `error_outline` |
| `x`, `X`, `close` | `close` |
| `home`, `Home` | `home` |
| `bell`, `Bell` | `notifications` |
| `mail`, `Mail` | `email` |
| `phone`, `Phone` | `phone` |
| `map-pin`, `MapPin` | `location_on` |
| `clock`, `Clock` | `access_time` |
| `check`, `Check` | `check` |
| `info`, `Info` | `info` |
| `edit`, `Edit`, `pencil` | `edit` |
| `settings`, `Settings` | `settings` |
| `trash`, `Trash` | `delete` |
| `plus`, `Plus` | `add` |
| `minus`, `Minus` | `remove` |
| `calendar` | `calendar_today` |
| `tag` | `label` |
| `eye` | `visibility` |
| `share` | `share` |
| `filter` | `filter_list` |
| *unknown* | `help_outline` |

---

## 6. Block Transformations

Each subsection shows the web input (what the converter receives) and the exact mobile output it emits.

---

### 6.1 Text / ContentParagraph

**Web input:**
```json
{
  "type": "ContentParagraph",
  "props": {
    "text": "نحن نقدم أفضل المنتجات",
    "fontSize": "theme-md",
    "fontWeight": "theme-light",
    "color": "theme-text",
    "align": "right"
  }
}
```

**Mobile output:**
```json
{
  "id": "text-1",
  "type": "text",
  "props": {
    "value": "نحن نقدم أفضل المنتجات",
    "fontSize": 16,
    "fontWeight": "normal",
    "color": "#0f172a",
    "textAlign": "right"
  }
}
```

**Field mapping:**

| Web field | Mobile field | Notes |
|-----------|--------------|-------|
| `text` | `value` | required rename |
| `align` | `textAlign` | |
| `fontSize` (token) | `fontSize` (number) | resolved |
| `fontWeight` (token) | `fontWeight` (string) | resolved |
| `color` (token) | `color` (hex) | resolved |
| `fontFamily` | — | **deleted** (not in engine schema) |
| `lineHeight` | — | **deleted** (not in engine schema) |

> If the `text` value contains HTML tags, the node type is automatically promoted to `richtext` with the raw HTML in `value`.

---

### 6.2 Heading / ContentHeading

**Web input:**
```json
{
  "type": "Heading",
  "props": {
    "text": "منتجاتنا",
    "level": "2",
    "align": "center",
    "colorMode": "theme",
    "colorTheme": "text"
  }
}
```

**Mobile output:**
```json
{
  "id": "heading-1",
  "type": "text",
  "props": {
    "value": "منتجاتنا",
    "fontSize": 22,
    "fontWeight": "bold",
    "textAlign": "center",
    "color": "#0f172a"
  }
}
```

**Heading level → fontSize / fontWeight:**

| Level | `fontSize` | `fontWeight` |
|-------|------------|--------------|
| h1 | 28 | `bold` |
| h2 | 22 | `bold` |
| h3 | 18 | `w600` |
| h4 | 16 | `w600` |

---

### 6.3 RichText / ContentHtml

**Web input:**
```json
{ "type": "RichText", "props": { "richtext": "<h2>عن المتجر</h2><p>نحن متجر متخصص...</p>" } }
```

**Mobile output:**
```json
{
  "id": "richtext-1",
  "type": "richtext",
  "props": { "value": "<h2>عن المتجر</h2><p>نحن متجر متخصص...</p>" }
}
```

The HTML is passed through as-is. The mobile renderer strips tags for display.

---

### 6.4 Space

**Web input:**
```json
{ "type": "Space", "props": { "size": "theme-40", "direction": "vertical" } }
```

**Mobile output:**
```json
{ "id": "spacer-1", "type": "sizedBox", "props": { "height": 40 } }
```

- `direction: "horizontal"` → emits `"width"` instead of `"height"`.
- Default direction is `vertical`.

---

### 6.5 Button / ContentButton

**Web input:**
```json
{
  "type": "ContentButton",
  "props": {
    "label": "تسوق الآن",
    "labelAr": "تسوق الآن",
    "buttonVariant": "primary",
    "size": "md",
    "fullWidth": "on",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Mobile output:**
```json
{
  "id": "button-1",
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "variant": "elevated",
    "height": 48,
    "fullWidth": true
  },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

**Supported `button` props:** `label`, `variant`, `height`, `fullWidth`, `color` (from theme).

**`buttonAction` → `tap` mapping:**

| Web `buttonAction` | Mobile `tap` |
|--------------------|--------------|
| `link` + `link.kind: "page"` | `{ "type": "navigate", "route": "<pageId>", "navigation_type": "push" }` |
| `link` + `link.kind: "url"` | `{ "type": "openUrl", "url": "<url>" }` |
| `href` (internal path) | `{ "type": "navigate", "route": "<path>", "navigation_type": "push" }` |
| `href` (http/https/www) | `{ "type": "openUrl", "url": "<href>" }` |
| `login` | `{ "type": "navigate", "route": "/auth/login", "navigation_type": "push" }` |
| `logout` | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }` |
| `addToCart` | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem" }` |
| `addToWishlist` | `{ "type": "navigate", "route": "/wishlist", "navigation_type": "push" }` |

> `buttonAction`, `link`, `href`, `destinationType` are **never** emitted inside `props`.

---

### 6.6 Link

A `Link` block becomes a `button` with `variant: "ghost"` and height `36`.

```json
{
  "id": "link-1",
  "type": "button",
  "props": { "label": "تفاصيل", "variant": "ghost", "height": 36 },
  "tap": { "type": "navigate", "route": "/about", "navigation_type": "push" }
}
```

---

### 6.7 Icon / ContentIcon

**Web input:**
```json
{
  "type": "ContentIcon",
  "props": {
    "icon": "shield-check",
    "size": 48,
    "colorMode": "theme",
    "colorTheme": "primary"
  }
}
```

**Mobile output:**
```json
{
  "id": "icon-1",
  "type": "icon",
  "props": { "name": "verified_user", "size": 48, "color": "#0b78c5" }
}
```

Unknown Lucide icons resolve to `help_outline`.

---

### 6.8 Image / ContentImage

**Web input:**
```json
{
  "type": "ContentImage",
  "props": {
    "src": "https://example.com/banner.jpg",
    "alt": "صورة البانر",
    "objectFit": "cover",
    "radius": "theme-lg",
    "aspectRatio": "landscape"
  }
}
```

**Mobile output:**
```json
{
  "id": "image-1",
  "type": "image",
  "props": {
    "url": "https://example.com/banner.jpg",
    "source": "network",
    "semanticsLabel": "صورة البانر",
    "fit": "cover",
    "borderRadius": 12,
    "aspectRatio": 1.777
  }
}
```

| Web field | Mobile field | Notes |
|-----------|--------------|-------|
| `src` | `url` | required rename |
| — | `source: "network"` | always set |
| `alt` | `semanticsLabel` | |
| `objectFit` | `fit` | |
| `radius` (token) | `borderRadius` (number) | resolved |
| `aspectRatio` (string) | `aspectRatio` (number) | resolved |
| `width` / `height` | `width` / `height` (numbers) | px stripped |
| `align`, `maxWidth` | — | wrap caller in `container` instead |

---

### 6.9 Divider / ContentDivider

**Web input:**
```json
{ "type": "ContentDivider", "props": { "thickness": "1px", "colorMode": "theme", "colorTheme": "neutral" } }
```

**Mobile output:**
```json
{
  "id": "divider-1",
  "type": "divider",
  "props": { "thickness": 1, "color": "#64748b" }
}
```

- `orientation: "vertical"` → emits a `container` with `width: 1` instead of a `divider`.

---

### 6.10 Video (MP4 / HLS)

`Video` blocks (direct MP4/HLS src) are transformed to `videoPlayer`.

**Web input:**
```json
{
  "type": "Video",
  "props": {
    "src": "https://example.com/promo.mp4",
    "controls": "on",
    "autoPlay": "off",
    "aspectRatio": "16:9"
  }
}
```

**Mobile output:**
```json
{
  "id": "video-wrapper-1",
  "type": "container",
  "props": { "aspectRatio": 1.777 },
  "child": {
    "id": "video-2",
    "type": "videoPlayer",
    "props": {
      "url": "https://example.com/promo.mp4",
      "showControls": true,
      "autoplay": false,
      "loop": false,
      "muted": false
    }
  }
}
```

When no `aspectRatio` is set, the `container` wrapper is omitted and `videoPlayer` is emitted directly.

---

### 6.11 VideoEmbed (YouTube)

YouTube URLs are converted to a thumbnail image with an `openUrl` tap.

**Web input:**
```json
{ "type": "VideoEmbed", "props": { "src": "https://www.youtube.com/watch?v=ABC123" } }
```

**Mobile output:**
```json
{
  "id": "youtube-thumb-1",
  "type": "image",
  "props": {
    "url": "https://img.youtube.com/vi/ABC123/hqdefault.jpg",
    "source": "network",
    "aspectRatio": 1.777,
    "fit": "cover"
  },
  "tap": { "type": "openUrl", "url": "https://www.youtube.com/watch?v=ABC123" }
}
```

YouTube is **never** emitted as `videoPlayer` (Flutter `video_player` does not support YouTube).

### 6.11b VideoEmbed (MP4 / HLS)

Non-YouTube `VideoEmbed` is treated the same as a `Video` block:
```json
{
  "id": "video-1",
  "type": "videoPlayer",
  "props": {
    "url": "https://example.com/video.mp4",
    "showControls": true,
    "autoplay": false
  }
}
```

---

### 6.12 Hero

#### Background image mode → `stack`

**Web input:**
```json
{
  "type": "Hero",
  "props": {
    "title": "ابدأ التسوق",
    "description": "أفضل المنتجات بأفضل الأسعار",
    "align": "center",
    "padding": "40px",
    "image": { "url": "https://example.com/hero.jpg", "mode": "background" },
    "buttons": [
      { "label": "تسوق الآن", "variant": "primary", "href": "/products" }
    ]
  }
}
```

**Mobile output:**
```json
{
  "id": "hero-stack-1",
  "type": "stack",
  "props": { "fit": "loose" },
  "children": [
    {
      "id": "hero-bg-2",
      "type": "image",
      "props": { "url": "https://example.com/hero.jpg", "source": "network", "fit": "cover" }
    },
    {
      "id": "hero-col-3",
      "type": "column",
      "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "center", "gap": 16, "padding": 40 },
      "children": [
        { "id": "hero-title-4", "type": "text", "props": { "value": "ابدأ التسوق", "fontSize": 28, "fontWeight": "bold", "textAlign": "center" } },
        { "id": "hero-desc-5", "type": "text", "props": { "value": "أفضل المنتجات بأفضل الأسعار", "fontSize": 16, "textAlign": "center" } },
        {
          "id": "hero-buttons-6",
          "type": "row",
          "props": { "mainAxisAlignment": "center", "crossAxisAlignment": "center", "gap": 12 },
          "children": [
            {
              "id": "hero-btn-7",
              "type": "button",
              "props": { "label": "تسوق الآن", "variant": "elevated", "height": 48 },
              "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
            }
          ]
        }
      ]
    }
  ]
}
```

#### No background image → `container` + `column`

When no background image is present, Hero emits:
```json
{
  "id": "hero-container-1",
  "type": "container",
  "props": { "padding": { "top": 80, "bottom": 80, "left": 24, "right": 24 } },
  "child": {
    "id": "hero-col-2",
    "type": "column",
    "props": { "crossAxisAlignment": "center", "mainAxisAlignment": "center", "gap": 16 },
    "children": [ ... ]
  }
}
```

---

### 6.13 Card

**Web input:**
```json
{
  "type": "Card",
  "props": {
    "title": "شحن سريع",
    "description": "توصيل خلال يومي عمل",
    "icon": "truck",
    "mode": "card"
  }
}
```

**Mobile output:**
```json
{
  "id": "card-1",
  "type": "card",
  "props": { "elevation": 2, "borderRadius": 8 },
  "child": {
    "id": "card-body-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "start", "gap": 8, "padding": 16 },
    "children": [
      { "id": "card-icon-3", "type": "icon", "props": { "name": "local_shipping", "size": 32, "color": "#0b78c5" } },
      { "id": "card-title-4", "type": "text", "props": { "value": "شحن سريع", "fontSize": 16, "fontWeight": "bold" } },
      { "id": "card-desc-5", "type": "text", "props": { "value": "توصيل خلال يومي عمل", "fontSize": 14, "color": "#64748b" } }
    ]
  }
}
```

**`mode` → `elevation` map:**

| Web `mode` / `variant` | Mobile `elevation` |
|------------------------|-------------------|
| `card` | `2` |
| `flat` | `0` |
| `outlined` | `0` |
| `elevated` | `4` |
| `default` | `1` |

---

### 6.14 Badge

**Web input:**
```json
{ "type": "Badge", "props": { "label": "-20%", "variant": "discount", "size": "md" } }
```

**Mobile output:**
```json
{
  "id": "badge-1",
  "type": "container",
  "props": { "padding": { "left": 8, "right": 8, "top": 4, "bottom": 4 }, "color": "#FEE2E2", "borderRadius": 9999 },
  "child": {
    "id": "badge-label-2",
    "type": "text",
    "props": { "value": "-20%", "fontSize": 14, "fontWeight": "bold", "color": "#DC2626" }
  }
}
```

**Badge variants and colors:**

| Variant | Background | Foreground |
|---------|------------|------------|
| `discount` | `#FEE2E2` | `#DC2626` |
| `inStock` | `#DCFCE7` | `#16A34A` |
| `outOfStock` | `#F3F4F6` | `#6B7280` |
| `custom` / *other* | `#EBF5FF` | `#2563EB` |

**Font size by `size`:** `sm` → 12, `md` → 14, `lg` → 16.

---

### 6.15 Accordion

**Web input:**
```json
{
  "type": "Accordion",
  "props": {
    "heading": "الأسئلة الشائعة",
    "variant": "soft",
    "items": [
      { "title": "كم يستغرق التوصيل؟", "body": "2-4 أيام عمل", "open": true },
      { "title": "كيف أتتبع طلبي؟", "body": "عبر تطبيقنا" }
    ]
  }
}
```

**Mobile output:**
```json
{
  "id": "accordion-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 0 },
  "children": [
    {
      "id": "accordion-heading-2",
      "type": "text",
      "props": { "value": "الأسئلة الشائعة", "fontSize": 18, "fontWeight": "bold" }
    },
    {
      "id": "accordion-item-3",
      "type": "expansionTile",
      "props": {
        "title": "كم يستغرق التوصيل؟",
        "initiallyExpanded": true,
        "backgroundColor": "#f8fafc",
        "borderRadius": 8,
        "showDivider": true
      },
      "children": [
        { "id": "accordion-body-4", "type": "text", "props": { "value": "2-4 أيام عمل", "fontSize": 14 } }
      ]
    },
    {
      "id": "accordion-item-5",
      "type": "expansionTile",
      "props": {
        "title": "كيف أتتبع طلبي؟",
        "initiallyExpanded": false,
        "backgroundColor": "#f8fafc",
        "borderRadius": 8,
        "showDivider": true
      },
      "children": [
        { "id": "accordion-body-6", "type": "text", "props": { "value": "عبر تطبيقنا", "fontSize": 14 } }
      ]
    }
  ]
}
```

**`variant` → `expansionTile` styling:**

| Web `variant` | `expansionTile` props |
|---------------|-----------------------|
| `soft` *(default)* | `backgroundColor: "#f8fafc"`, `borderRadius: 8`, `showDivider: true` |
| `outline` | wrapped in `container` with border, `showDivider: true` |
| `minimal` | `showDivider: false` |

---

### 6.16 ImageGallery (slider mode)

**Web input:**
```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "slider",
    "images": [
      { "src": "https://example.com/slide1.jpg" },
      { "src": "https://example.com/slide2.jpg" }
    ],
    "aspectRatio": "landscape",
    "autoplay": true,
    "autoplayDuration": "theme-5"
  }
}
```

**Mobile output:**
```json
{
  "id": "gallery-slider-1",
  "type": "imageSlider",
  "props": {
    "images": [
      { "url": "https://example.com/slide1.jpg", "alt": "" },
      { "url": "https://example.com/slide2.jpg", "alt": "" }
    ],
    "aspectRatio": 1.777,
    "fit": "cover",
    "borderRadius": 8,
    "autoPlay": true,
    "intervalMs": 5000,
    "showIndicators": true,
    "indicatorStyle": "dot"
  }
}
```

| Web | Mobile | Notes |
|-----|--------|-------|
| `images[].src` | `images[].url` | required rename |
| `aspectRatio: "landscape"` | `1.777` | resolved |
| `autoplay` | `autoPlay` | capital P |
| `autoplayDuration: "theme-5"` | `intervalMs: 5000` | token × 1000 ms |
| `showArrows`, `slidesPerView` | — | **not emitted** (not in engine schema) |

---

### 6.16b ImageGallery (grid mode)

**Mobile output:**
```json
{
  "id": "gallery-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 3,
    "mainAxisSpacing": 16,
    "crossAxisSpacing": 16,
    "childAspectRatio": 1.777
  },
  "children": [
    { "id": "gallery-image-2", "type": "image", "props": { "url": "...", "source": "network", "fit": "cover", "aspectRatio": 1.777, "borderRadius": 8 } }
  ]
}
```

---

### 6.17 Section

**Web input:**
```json
{
  "type": "Section",
  "props": {
    "backgroundColor": "#f8f9fa",
    "paddingTop": "60px",
    "paddingBottom": "60px",
    "paddingHorizontal": "24px",
    "visible": true,
    "content": [ ... ]
  }
}
```

**Mobile output:**
```json
{
  "id": "section-container-1",
  "type": "container",
  "props": {
    "color": "#f8f9fa",
    "padding": { "top": 60, "bottom": 60, "left": 24, "right": 24 }
  },
  "child": {
    "id": "section-column-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [ ... ]
  }
}
```

**Section rules:**

| Condition | Mobile output |
|-----------|---------------|
| `visible: false` | **Entire subtree omitted** |
| `columns > 1` (or `columnsMobile > 1`) | Inner `gridView` instead of `column` |
| `backgroundImage` set | Outer `stack` with cover `image` + optional overlay + inner `container` |
| `anchorId` | **Ignored** (no in-page anchor scroll on mobile) |
| `content[]` / `items[]` | → `children[]` on inner column |

---

### 6.18 Group / Flex

**Web input:**
```json
{
  "type": "Group",
  "props": {
    "direction": "row",
    "gap": 16,
    "alignItems": "center",
    "justifyContent": "space-between",
    "content": [ ... ]
  }
}
```

**Mobile output:**
```json
{
  "id": "row-1",
  "type": "row",
  "props": {
    "mainAxisAlignment": "spaceBetween",
    "crossAxisAlignment": "center",
    "gap": 16
  },
  "children": [ ... ]
}
```

- `direction: "column"` / `orientation: "vertical"` → `type: "column"`
- `direction: "row"` / `orientation: "horizontal"` → `type: "row"` (default)
- When `backgroundColor`, `padding`, `borderRadius`, or `boxShadow` are set, the flex node is **wrapped** in an outer `container` with those props.
- `wrap: "wrap"` is **not supported** — approximated as column-of-rows with a warning.
- Children are read from `content[]`, `items[]`, or `children[]`.

---

### 6.19 Grid (layout)

**Web input:**
```json
{ "type": "Grid", "props": { "numColumns": 3, "gap": 24, "items": [ ... ] } }
```

**Mobile output:**
```json
{
  "id": "grid-layout-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 3,
    "mainAxisSpacing": 24,
    "crossAxisSpacing": 24,
    "childAspectRatio": 1.0
  },
  "children": [ ... ]
}
```

---

### 6.20 Section with background image

When `backgroundImage` is present on a `Section`:

```json
{
  "id": "section-stack-1",
  "type": "stack",
  "props": { "fit": "loose" },
  "children": [
    { "id": "section-bg-image-2", "type": "image", "props": { "url": "...", "source": "network", "fit": "cover" } },
    {
      "id": "section-overlay-3",
      "type": "container",
      "props": { "color": "rgba(0,0,0,0.4)" }
    },
    {
      "id": "section-inner-4",
      "type": "container",
      "props": { "padding": { "top": 60, "bottom": 60, "left": 24, "right": 24 } },
      "child": {
        "id": "section-column-5",
        "type": "column",
        "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
        "children": [ ... ]
      }
    }
  ]
}
```

---

### 6.21 Stats

**Web input:**
```json
{
  "type": "Stats",
  "props": {
    "items": [
      { "title": "١٠٠٠+", "description": "عميل سعيد" },
      { "title": "٥٠+", "description": "منتج" }
    ]
  }
}
```

**Mobile output:**
```json
{
  "id": "stats-row-1",
  "type": "row",
  "props": { "mainAxisAlignment": "spaceAround", "crossAxisAlignment": "center" },
  "children": [
    {
      "id": "stat-col-2",
      "type": "column",
      "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "center", "gap": 4 },
      "children": [
        { "id": "stat-value-3", "type": "text", "props": { "value": "١٠٠٠+", "fontSize": 22, "fontWeight": "bold" } },
        { "id": "stat-label-4", "type": "text", "props": { "value": "عميل سعيد", "fontSize": 14 } }
      ]
    }
  ]
}
```

---

### 6.22 Logos

**Mobile output:**
```json
{
  "id": "logos-list-1",
  "type": "listView",
  "props": { "scrollDirection": "horizontal", "height": 60 },
  "children": [
    { "id": "logo-2", "type": "image", "props": { "url": "...", "source": "network", "height": 48, "fit": "contain" } }
  ]
}
```

---

### 6.23 ContactForm

**Mobile output:**
```json
{
  "id": "contact-form-1",
  "type": "form",
  "props": { "id": "contact-form" },
  "child": {
    "id": "contact-col-2",
    "type": "column",
    "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
    "children": [
      {
        "id": "contact-field-3",
        "type": "textFormField",
        "props": { "label": "الاسم", "hint": "", "name": "name", "textDirection": "rtl" }
      },
      {
        "id": "contact-field-4",
        "type": "textFormField",
        "props": { "label": "البريد الإلكتروني", "hint": "", "name": "email", "textDirection": "ltr" }
      },
      {
        "id": "contact-submit-5",
        "type": "button",
        "props": { "label": "إرسال", "height": 48, "variant": "elevated", "fullWidth": true },
        "tap": { "type": "apiCall", "method": "POST", "url": "/api/v1/public/contact", "requireValidForm": true, "formId": "contact-form" }
      }
    ]
  }
}
```

- Email field always gets `textDirection: "ltr"`.
- `submitUrl` prop overrides the default `/api/v1/public/contact`.

---

### 6.24 NavMenu

**Mobile output:**
```json
{
  "id": "nav-menu-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 0 },
  "children": [
    {
      "id": "nav-link-2",
      "type": "button",
      "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
      "tap": { "type": "navigate", "route": "/home", "navigation_type": "push" }
    }
  ]
}
```

---

### 6.25 Testimonials

#### Grid layout (default)
```json
{
  "id": "testimonials-grid-1",
  "type": "column",
  "props": { "crossAxisAlignment": "stretch", "mainAxisAlignment": "start", "gap": 16 },
  "children": [
    {
      "id": "tm-row-2",
      "type": "row",
      "props": { "mainAxisAlignment": "spaceBetween", "crossAxisAlignment": "stretch", "gap": 16 },
      "children": [
        {
          "id": "tm-row-cell-3",
          "type": "container",
          "props": { "expand": true, "expandAxis": "horizontal" },
          "child": {
            "id": "testimonial-4",
            "type": "card",
            "props": { "elevation": 1, "borderRadius": 12 },
            "child": {
              "id": "tm-body-5",
              "type": "column",
              "props": { "crossAxisAlignment": "start", "mainAxisAlignment": "start", "gap": 8 },
              "children": [
                { "id": "tm-rating-6", "type": "text", "props": { "value": "★★★★★", "fontSize": 16, "color": "#f59e0b" } },
                { "id": "tm-quote-7", "type": "text", "props": { "value": "منتج رائع!", "fontSize": 14 } },
                { "id": "tm-name-8", "type": "text", "props": { "value": "سارة", "fontSize": 14, "fontWeight": "bold" } }
              ]
            }
          }
        }
      ]
    }
  ]
}
```

#### Carousel layout (`layoutVariant: "carousel"`)
```json
{
  "id": "testimonials-carousel-1",
  "type": "listView",
  "props": { "scrollDirection": "horizontal" },
  "children": [
    {
      "id": "tm-carousel-cell-2",
      "type": "container",
      "props": { "width": 280 },
      "child": { ... }
    }
  ]
}
```

---

### 6.26 Sidebar

Sidebar is emitted as an inline `column` (the `dock` prop is ignored with a warning).

```json
{
  "id": "sidebar-1",
  "type": "column",
  "props": { "mainAxisAlignment": "start", "crossAxisAlignment": "stretch", "gap": 16 },
  "children": [ ... ]
}
```

---

### 6.27 Template

`Template` is flattened: children are emitted directly. The wrapper node is discarded. When there is exactly one child, that child is returned unwrapped.

---

### 6.28 Blank

`Blank` blocks are **omitted** entirely (return `null`). No node is emitted.

---

## 7. Page Envelope Structure

When the input is a page object or array of page objects, the converter emits a full app config:

```json
{
  "schemaVersion": "1.0",
  "app": {
    "name": "SOOQ Merchant Mobile",
    "bundleId": "com.sooq.merchant.mobile",
    "apiBaseUrl": "https://sooq.up.railway.app",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "tenantSlug": "example-merchant"
  },
  "theme": {
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
      "scale": { "xs": 12, "sm": 14, "md": 16, "lg": 18, "xl": 22, "xxl": 28, "display": 36 },
      "weights": { "normal": 400, "medium": 500, "bold": 700 },
      "lineHeight": { "tight": 1.25, "normal": 1.5, "relaxed": 1.75 }
    },
    "radius": { "none": 0, "sm": 8, "md": 12, "lg": 18, "xl": 24, "full": 9999 },
    "spacing": { "xs": 4, "sm": 10, "md": 16, "lg": 24, "xl": 36 },
    "buttons": {
      "sm": { "height": 36, "padX": 14, "fontSize": 14, "radius": 10 },
      "md": { "height": 48, "padX": 18, "fontSize": 16, "radius": 12 },
      "lg": { "height": 56, "padX": 26, "fontSize": 16, "radius": 14 }
    }
  },
  "navigation": {
    "type": "tabs",
    "initialRoute": "/splash",
    "shellExcludeRoutes": [
      "/splash", "/splash-carousel", "/auth/login", "/auth/otp-reset",
      "/product/details", "/categories", "/checkout", "/checkout/address",
      "/checkout/payment", "/checkout/success", "/orders"
    ],
    "tabs": [
      { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" },
      { "id": "tab-categories", "label": "الأقسام", "icon": "grid_view", "route": "/categories" },
      { "id": "tab-search", "label": "بحث", "icon": "search", "route": "/search" },
      { "id": "tab-cart", "label": "السلة", "icon": "shopping_cart", "route": "/cart" },
      { "id": "tab-profile", "label": "حسابي", "icon": "person", "route": "/profile" }
    ]
  },
  "pages": [
    {
      "id": "page-home",
      "route": "/home",
      "title": "Home",
      "background": "#ffffff",
      "scroll": "vertical",
      "appBar": { ... },
      "body": [ ... ],
      "appDrawer": { ... }
    }
  ]
}
```

### Page rules

| Rule | Value |
|------|-------|
| Route `/` | Normalized to `/home` |
| Default scroll | `"vertical"` |
| Auth / splash pages | Set `"scroll": "none"` on page input |
| `background` default | `"#ffffff"` |

### `appBar` structure

The `appBar` is built from the page `SiteHeader` block and `rootProps`:

```json
{
  "id": "home-app-bar",
  "type": "appBar",
  "props": {
    "title": "SOOQ",
    "showBackButton": false,
    "backgroundColor": "#ffffff",
    "foregroundColor": "#0f172a",
    "elevation": 0,
    "showMenu": true,
    "menuAction": { "type": "openDrawer" },
    "showCartIcon": true,
    "cartBadgePath": "cart.itemCount",
    "cartAction": { "type": "navigate", "route": "/cart" }
  }
}
```

| Field | Condition |
|-------|-----------|
| `showBackButton: true` | any route that is not `/home` |
| `showMenu: true` + `menuAction` | `rootProps.headerShowDrawerButton: "on"` OR a `SiteDrawerShell` block is present |
| `showCartIcon: true` + `cartBadgePath` + `cartAction` | always (unless `rootProps.headerShowCart: "off"`) |

### `appDrawer` structure

Emitted when a `SiteDrawerShell` or `SideDrawer` block is found in the page blocks (placed alongside `body` on the page node, not inside `body`):

```json
{
  "id": "drawer-1",
  "type": "appDrawer",
  "props": {
    "drawerEdge": "start",
    "width": 320,
    "backgroundColor": "#ffffff"
  },
  "child": {
    "id": "drawer-col-2",
    "type": "column",
    "props": { "gap": 0 },
    "children": [
      {
        "id": "drawer-link-3",
        "type": "button",
        "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
        "tap": { "type": "navigate", "route": "/home", "navigation_type": "go" }
      }
    ]
  }
}
```

| Web `side` | Mobile `drawerEdge` |
|------------|---------------------|
| `left` | `start` (RTL-aware) |
| `right` | `end` |
| *(default / RTL)* | `start` |

---

## 8. Locale Rules

| rootProp | Behaviour |
|----------|-----------|
| `language: "ar"` | Prefers `labelAr`, `titleAr`, `textAr`, `messageAr` over English equivalents |
| `direction: "rtl"` | Default `textAlign: "right"` on all text nodes |
| Phone / email / OTP fields | Always `textDirection: "ltr"` |
| `language: "ar"` | Font family → `"Tajawal"` (overrides `bodyFont`) |

---

## 9. Data-Bound Blocks

These blocks emit nodes that fetch data from the API at runtime.

### 9.1 ProductsGrid / ProductGrid

**Web input:**
```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": { "id": "coll_featured" },
    "columns": "4",
    "gap": "md",
    "maxProducts": "20",
    "cardVariant": "vertical"
  }
}
```

**Mobile output:**
```json
{
  "id": "products-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 4,
    "mainAxisSpacing": 12,
    "crossAxisSpacing": 12,
    "childAspectRatio": 0.75,
    "enableInnerScroll": false,
    "requestKey": "product-list",
    "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=20",
    "emptyMessage": "لا توجد منتجات",
    "errorMessage": "حدث خطأ"
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.product-list.data",
    "item": {
      "id": "product-template-2",
      "type": "card",
      "props": { "elevation": 1, "borderRadius": 12 },
      "tap": { "type": "navigate", "route": "/product/details/:productId", "navigation_type": "push" },
      "child": {
        "id": "pt-body-3",
        "type": "column",
        "props": { "crossAxisAlignment": "start", "mainAxisAlignment": "start", "gap": 8 },
        "children": [
          { "id": "pt-image-4", "type": "image", "props": { "urlPath": "item.primaryImageUrl", "source": "network", "fit": "cover", "aspectRatio": 1.0 } },
          { "id": "pt-name-5", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14, "fontWeight": "w600" } },
          { "id": "pt-price-6", "type": "text", "props": { "valuePath": "item.price", "fontSize": 13 } }
        ]
      }
    }
  }
}
```

**URL rules:**
- `collection: "all"` or no collection → `/api/v1/public/products?page=0&size=<n>`
- `collection: { id: "X" }` or `collection: "X"` → `/api/v1/public/collections/X/products?page=0&size=<n>`
- `metadata.apiUrl` (admin URL) → rewritten to relative public path
- Max size capped at `20`

### 9.2 CartSection

**Mobile output:**
```json
{
  "id": "cart-list-1",
  "type": "listView",
  "props": { "emptyMessage": "السلة فارغة" },
  "itemBuilder": {
    "type": "repeat",
    "source": "cart.items",
    "item": {
      "id": "cart-line-tpl-2",
      "type": "row",
      "props": { "gap": 12, "crossAxisAlignment": "center" },
      "children": [
        { "id": "cart-img-tpl-3", "type": "image", "props": { "urlPath": "item.imageUrl", "source": "network", "width": 72, "height": 72, "fit": "cover" } },
        { "id": "cart-name-tpl-4", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14 } }
      ]
    }
  }
}
```

### 9.3 OrderHistory / OrderList

**Mobile output:**
```json
{
  "id": "orders-list-1",
  "type": "listView",
  "props": {
    "requestKey": "order-history",
    "requestUrl": "/api/v1/customer/orders?page=0&size=10",
    "emptyMessage": "لا توجد طلبات بعد."
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.order-history.data",
    "item": {
      "id": "order-item-2",
      "type": "card",
      "props": { "borderRadius": 8 }
    }
  }
}
```

Default size is `10`. Override with `props.maxOrders`.

### 9.4 Wishlist

**Mobile output:**
```json
{
  "id": "wishlist-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "requestKey": "wishlist",
    "requestUrl": "/api/v1/customer/wishlist",
    "emptyMessage": "قائمة المفضلة فارغة."
  },
  "itemBuilder": {
    "type": "repeat",
    "source": "dataContext.requests.wishlist.data",
    "item": {}
  }
}
```

Default `crossAxisCount` is `2`. Override with `props.columns`.

### API path rules

| Purpose | Path pattern |
|---------|-------------|
| Public product catalog | `/api/v1/public/products?page=0&size=<n>` |
| Collection products | `/api/v1/public/collections/<id>/products?page=0&size=<n>` |
| Customer orders | `/api/v1/customer/orders?page=0&size=<n>` |
| Customer wishlist | `/api/v1/customer/wishlist` |
| Contact form submission | `/api/v1/public/contact` |

Absolute admin URLs in `metadata.apiUrl` are automatically rewritten to relative public paths.

---

## 10. Unsupported Blocks

| Web block | Mobile output | Note |
|-----------|---------------|------|
| `CategoryListMenu` | `{ "type": "unsupported", "props": { "blockType": "CategoryListMenu" } }` + warning | No static decomposition |
| `ProductSearchMenu` | `{ "type": "unsupported", "props": { "blockType": "ProductSearchMenu" } }` + warning | Needs cubit wiring |
| `SideDrawer` | Handled as `SiteDrawerShell` (generates `appDrawer`) | |
| `Blank` | `null` (omitted entirely) | |
| `SiteHeader` | Not in `body[]` — used to build `appBar` | |
| `SiteFooter` | Emitted as `container` + `column` at the **end** of `body[]` | |
| `SiteDrawerShell` | Not in `body[]` — emitted as `appDrawer` on the page node | |
| `Template` | Flattened (wrapper discarded) | |

**Unknown block types with children** → wrapped in a `container` + `column` with the children converted; a warning is emitted.  
**Unknown leaf block types** → `null` (skipped); a warning is emitted.

### Warnings

The converter accumulates warnings and returns them in `{ success: true, output: ..., warnings: ["..."] }`. Watch for:

- `"Nested Section detected; converted as sibling container"`
- `"Block type \"CategoryListMenu\" has no mobile equivalent; rendered as unsupported"`
- `"Sidebar dock prop is ignored on mobile; rendered as inline column"`
- `"Testimonials CMS source not supported; using inline items only"`
- `"Unknown block type \"<X>\"; converted children only"`
- `"Unsupported leaf block type \"<X>\"; skipped"`

---

## 11. Validation Checklist

Use this checklist before sending converter output to the engine.

### Schema / parse

- [ ] All `type` values are from the allowed list (Section 2)
- [ ] Every node has `id`, `type`, `props`
- [ ] No `child` + `children` on the same node
- [ ] No `style` wrapper — only flat `props`
- [ ] No web block type names in output (`Button`, `Section`, `ContentParagraph`, etc.)

### Props / values

- [ ] No `"theme-*"` strings anywhere in output
- [ ] No CSS `px` strings — all numbers
- [ ] No `colorMode` / `colorTheme` / `colorFixed` — hex only
- [ ] `mainAxisAlignment` / `crossAxisAlignment` full names (not `mainAxis` / `crossAxis`)
- [ ] Button `variant` is `elevated`, `filled`, `outlined`, or `text`
- [ ] `image.url` present (not `src`)
- [ ] `image.semanticsLabel` (not `alt`)
- [ ] `text.value` present (not `text` prop)
- [ ] `richtext.value` (not `richtext` prop)
- [ ] `imageSlider.autoPlay` (capital P) and `intervalMs`
- [ ] `videoPlayer.showControls` (not `controls`)
- [ ] `videoPlayer.autoplay` (lowercase p)
- [ ] `sizedBox.height` / `sizedBox.width` are numbers
- [ ] `divider.thickness` is a number (not `"1px"`)
- [ ] `gridView.crossAxisCount` is a number (not `"3"`)

### Actions

- [ ] All navigation on node-level `tap`, not inside `props`
- [ ] No `buttonAction`, `link`, `href` in `props`
- [ ] YouTube → `image` + `tap.openUrl`, not `videoPlayer`
- [ ] `addToCart` → `cubitCall` cart
- [ ] `logout` → `cubitCall` auth with `onSuccess` navigate

### API / data

- [ ] Relative paths only (`/api/v1/public/...`, `/api/v1/customer/...`)
- [ ] No absolute admin URLs
- [ ] `requestKey` + `requestUrl` flat in `props` on data-bound `gridView` / `listView`
- [ ] `itemBuilder.source` uses `dataContext.requests.<requestKey>.data`
- [ ] Cart items use `source: "cart.items"` (not an API call)
- [ ] Orders URL includes `?page=0&size=<n>`

### Layout

- [ ] `visible: false` sections are absent from output
- [ ] Section background on `container.props.color`
- [ ] Accordion → `column` + `expansionTile` children
- [ ] `imageSlider.images[].url` (not `.src`)
- [ ] `ProductsGrid` → `gridView` with `childAspectRatio: 0.75`
- [ ] `CartSection` → `listView` with `source: "cart.items"`

### Shell / chrome

- [ ] `SiteHeader` not in `body[]` — only as `appBar` key on page
- [ ] `SiteDrawerShell` not in `body[]` — only as `appDrawer` key on page
- [ ] `appBar.showMenu` / `menuAction` present when drawer is configured
- [ ] `appBar.showCartIcon` / `cartBadgePath` / `cartAction` present on catalog pages

---

## 12. Known Limitations

These are by design — the mobile team should not expect different output for these:

| Item | Reason |
|------|--------|
| YouTube in `videoPlayer` | Flutter `video_player` supports MP4/HLS only |
| `fontFamily` on text nodes | Not in engine schema — deleted |
| `lineHeight` as standalone prop | Not in engine schema — deleted |
| `wrap: "wrap"` on Flex/Group | No native flex-wrap |
| `backgroundAttachment: fixed` on Hero | No Flutter scroll-attachment equivalent |
| `showArrows` / `slidesPerView` on `imageSlider` | Not in engine schema — omitted |
| `anchorId` on Section | No in-page anchor scroll on mobile |
| `align` / `maxWidth` on `image` | Wrap image in `container` instead |
| `CheckoutForm` as single page | Multi-route flow: `/checkout`, `/checkout/address`, `/checkout/payment` |
| `CategoryListMenu` | Runtime category data — emits `unsupported` node |
| `ProductSearchMenu` | Needs cubit + search field wiring — emits `unsupported` node |
| Wishlist `itemBuilder.item` | Empty object `{}` — renderer builds its own template |

---

*Source: `lib/transformer.ts` — last updated 2026-07-01. Report mismatches with: block type name, web input sample, what the converter currently emits, and what your renderer expects.*
