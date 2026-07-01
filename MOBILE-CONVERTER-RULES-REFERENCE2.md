# Mobile Converter Rules Reference

**Version:** 2026-06-30  
**Audience:** Mobile engine team (Flutter SDUI renderers + schema validation)  
**Purpose:** Single source of truth for what the **web-to-mobile converter must output**. Use this document to compare your engine implementation, renderer props, and schema validation against the expected mobile JSON shape.

> **Important:** This spec describes **mobile output only**. Web JSON (`BLOCKS.md` / Puck blocks) is never passed to the engine as-is. The converter transforms web blocks into the primitives below.

---

## How to use this document

1. For each block type your renderer supports, verify prop names, value types, and node structure match the **Mobile output** examples.
2. Run the validation checklist in [Section 12](#12-validation-checklist) against converted JSON before integration.
3. Flag any mismatch between this spec and your `component_schemas.dart` / renderers — those gaps block production pages from rendering correctly.

**Live converter:** `lib/transformer.ts` → `transformWebToMobile()`  
**Interactive UI:** `/converter` in the documentation app

---

## 1. Valid mobile engine types

Every `"type"` in converter output must be one of these registered primitives:

| Category | Types |
|----------|-------|
| Scaffold / scroll | `scaffold`, `singleChildScrollView` |
| Layout | `column`, `row`, `container`, `stack`, `listView`, `gridView`, `sizedBox` |
| Content | `text`, `richtext`, `image`, `icon`, `divider`, `videoPlayer`, `imageSlider` |
| Input / forms | `textFormField`, `form`, `button`, `contactButton`, `otpInput`, `dropdown` |
| Chrome | `appBar`, `appDrawer`, `tabs`, `card`, `expansionTile` |
| Other | `timer`, `progressIndicator`, `unsupported` |

Web block type names (`Button`, `ContentParagraph`, `Section`, etc.) are **never** valid in mobile output.

---

## 2. Global rules (apply to every node)

### G1 — Lowercase mobile primitive types

| Web input type | Mobile output `type` |
|----------------|----------------------|
| `Button`, `ContentButton` | `button` |
| `ContentParagraph`, `ContentHeading`, `Text`, `Heading` | `text` |
| `RichText`, `ContentHtml` | `richtext` |
| `ContentImage`, `ProductImage` | `image` |
| `ContentIcon` | `icon` |
| `ContentDivider` | `divider` |
| `Space` | `sizedBox` |
| `VideoEmbed` (MP4/HLS) | `videoPlayer` |
| `VideoEmbed` (YouTube) | `image` + `tap.openUrl` |
| `ImageGallery` (slider) | `imageSlider` |
| `ImageGallery` (grid) | `gridView` |
| `Section` | `container` (+ child `column` or `gridView`) |
| `Group`, `Flex` (row) | `row` |
| `Group`, `Flex` (column) | `column` |
| `Grid` (layout) | `gridView` or `column` of `row`s |
| `Accordion` | `column` + N × `expansionTile` |
| `Card` (content) | `card` (+ child `column`) |
| `Hero` | `stack` or `column` composite |
| `ProductsGrid` | `gridView` (+ `requestUrl`, `itemBuilder`) |
| `CartSection` | `listView` (+ `cart.items` binding) |
| `OrderHistory` | `listView` (+ customer API) |
| `Wishlist` | `gridView` (+ customer API) |
| `SiteHeader` | `appBar` (per page, not in `body`) |
| `SiteDrawerShell`, `SideDrawer` | `appDrawer` (global scaffold) |
| `SiteFooter` | `column` at page bottom |
| `Template` | flattened (wrapper omitted) |
| `Blank` | omitted or `unsupported` |

---

### G2 — `tap` is node-level, never inside `props`

Button actions, links, and navigation **must** be a sibling of `props` on the node.

**Wrong:**
```json
{
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "variant": "elevated",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Correct:**
```json
{
  "id": "button-shop-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated" },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

Rules:
- Never emit `buttonAction`, `link`, or `href` inside `props`
- Never author `onTap` in JSON (runtime-injected)

---

### G3 — Resolve theme tokens and colors at conversion time

The engine does **not** understand `"theme-md"`, `"theme-40"`, or `colorMode`/`colorTheme` triples. All values must be concrete numbers or hex strings.

#### Typography / spacing tokens

| Web token | Mobile resolved value |
|-----------|----------------------|
| `theme-xs` | `12` (fontSize) |
| `theme-sm` | `14` (fontSize) or `4` (borderRadius) |
| `theme-md` | `16` (fontSize) or `8` (borderRadius) |
| `theme-lg` | `18` (fontSize) or `12` (borderRadius) |
| `theme-xl` | `22` (fontSize) or `16` (borderRadius) |
| `theme-2xl` | `28` (fontSize) |
| `theme-none` | `0` (borderRadius) |
| `theme-full` | `999` (borderRadius) |
| `theme-8` | `8` (spacing) |
| `theme-16` | `16` (spacing) |
| `theme-24` | `24` (spacing) |
| `theme-40` | `40` (spacing) |
| `theme-315` | `315` (height) |
| `theme-480` | `480` (height) |
| `theme-5` (autoplay) | `5000` (`intervalMs` in ms) |
| `"60px"` | `60` (strip `px`) |

#### Gap size map

| Web `gap` | Mobile spacing |
|-----------|----------------|
| `sm` | `8` |
| `md` | `12` |
| `lg` | `16` |
| `xl` | `24` |

#### Color triple → hex

| Web | Mobile |
|-----|--------|
| `colorMode: "theme"`, `colorTheme: "primary"` | `"color": "#<primary from theme>"` |
| `colorMode: "fixed"`, `colorFixed: "#2563eb"` | `"color": "#2563eb"` |
| `colorMode: "theme"`, `colorTheme: "neutral"` | `"color": "#64748b"` (muted) |
| `colorMode: "theme"`, `colorTheme: "text"` | `"color": "#0f172a"` |
| `colorMode: "theme"`, `colorTheme: "surface"` | `"color": "#ffffff"` |
| `colorMode: "theme"`, `colorTheme: "error"` | `"color": "#ef4444"` |

Never pass `colorMode`, `colorTheme`, or `colorFixed` into mobile JSON.

---

### G4 — Use full alignment property names

| Wrong | Correct |
|-------|---------|
| `"mainAxis": "center"` | `"mainAxisAlignment": "center"` |
| `"crossAxis": "stretch"` | `"crossAxisAlignment": "stretch"` |

Valid `mainAxisAlignment`: `start`, `center`, `end`, `spaceBetween`, `spaceAround`, `spaceEvenly`  
Valid `crossAxisAlignment`: `start`, `center`, `end`, `stretch`, `baseline`

#### Web flex → mobile alignment

| Web `justifyContent` / `alignItems` | Mobile value |
|-------------------------------------|--------------|
| `flex-start`, `start` | `start` |
| `center` | `center` |
| `flex-end`, `end` | `end` |
| `space-between`, `spaceBetween` | `spaceBetween` |
| `space-around` | `spaceAround` |
| `space-evenly` | `spaceEvenly` |
| `stretch` | `stretch` |
| `baseline` | `baseline` |

---

### G5 — Flat `props` only (no `style` wrapper)

All box-model and visual properties live in `props`. There is no `style` namespace.

**Wrong:**
```json
{ "style": { "color": "#F9FAFB", "padding": { "top": 32 } } }
```

**Correct:**
```json
{
  "props": {
    "color": "#F9FAFB",
    "padding": { "top": 32, "bottom": 32, "left": 16, "right": 16 }
  }
}
```

---

### G6 — Numeric props must be JSON numbers

| Wrong | Correct |
|-------|---------|
| `"columns": "4"` | `"crossAxisCount": 4` |
| `"gap": "md"` | `"mainAxisSpacing": 12, "crossAxisSpacing": 12` |
| `"thickness": "1px"` | `"thickness": 1` |

---

### G7 — Node shape

| Rule | Detail |
|------|--------|
| Every node | `id` (string), `type` (string), `props` (object) |
| Child slots | Use `child` **or** `children`, never both on same node |
| `children` | Must be JSON array of node objects |
| IDs | Unique within each page |

---

## 3. Actions (`tap`)

Supported `tap.type` values:

| Type | Use |
|------|-----|
| `navigate` | In-app routes (`route` required) |
| `cubitCall` | Auth, cart, checkout, orders |
| `openUrl` | External HTTP(S) — YouTube, external links |
| `openContact` | WhatsApp, tel, sms, email |
| `openDrawer` / `closeDrawer` | App drawer |
| `apiCall` | Direct HTTP (forms) |

#### Button action mapping

| Web `buttonAction` | Mobile `tap` |
|--------------------|--------------|
| `link` + `link.kind: "page"` | `{ "type": "navigate", "route": "{pageId}", "navigation_type": "push" }` |
| `link` + `link.kind: "url"` | `{ "type": "openUrl", "url": "{url}" }` |
| `login` | `{ "type": "navigate", "route": "/auth/login", "navigation_type": "push" }` |
| `logout` | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }` |
| `addToCart` | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem" }` |

#### Button variant mapping

| Web `variant` | Mobile `props.variant` |
|---------------|------------------------|
| `primary` | `elevated` |
| `secondary` | `outlined` |
| `outline` | `outlined` |
| `ghost` | `text` |
| `danger` | `filled` + error `color` hex |

---

## 4. API paths

| Rule | Detail |
|------|--------|
| Public catalog | `/api/v1/public/*` only |
| Customer (auth) | `/api/v1/customer/*` |
| Never use | `/api/v1/auth/otp`, bare `/api/v1/products`, absolute `https://api.../admin/...` |
| Collection products | `/api/v1/public/collections/{id}/products?page=0&size={n}` |
| All products | `/api/v1/public/products?page=0&size={n}` |
| Orders | `/api/v1/customer/orders?page=0&size={n}` |
| Wishlist | `/api/v1/customer/wishlist` |

When web `metadata.apiUrl` exists, rewrite admin URL to relative public path under `app.apiBaseUrl`.

---

## 5. Block rules with examples

Each subsection: **Web input** → **Mobile output** (what the converter emits).

---

### 5.1 Button / ContentButton

**Web:**
```json
{
  "type": "ContentButton",
  "props": {
    "label": "تسوق الآن",
    "destinationType": "link",
    "link": { "kind": "page", "pageId": "/products" },
    "buttonVariant": "primary"
  }
}
```

**Mobile:**
```json
{
  "id": "button-shop-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated", "height": 48 },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

Supported `button` props: `label`, `variant`, `backgroundColor`, `textColor`, `foregroundColor`, `borderRadius`, `padding`, `fullWidth`, `maxWidth`, `fontSize`, `fontWeight`, `icon`, `iconPosition`, `iconSize`, `enabled`, `enabledPath`, `shadow`, `height`.

---

### 5.2 Text / ContentParagraph / ContentHeading

**Web:**
```json
{
  "type": "ContentParagraph",
  "props": {
    "text": "نحن نقدم أفضل المنتجات...",
    "textAlign": "right",
    "fontSize": "theme-md",
    "fontWeight": "theme-light",
    "color": "theme-text"
  }
}
```

**Mobile:**
```json
{
  "id": "text-para-1",
  "type": "text",
  "props": {
    "value": "نحن نقدم أفضل المنتجات...",
    "textAlign": "right",
    "fontSize": 16,
    "fontWeight": "normal",
    "color": "#0f172a"
  }
}
```

| Web field | Mobile | Notes |
|-----------|--------|-------|
| `text` | `value` | Required rename |
| `fontSize: "theme-md"` | `fontSize: 16` | Resolve token |
| `fontFamily` | — | **Delete** (not supported) |
| `lineHeight` | — | **Delete** (not supported) |

#### Heading levels

| Web level | `fontSize` | `fontWeight` |
|-----------|------------|--------------|
| h1 | 28 | `bold` |
| h2 | 22 | `bold` |
| h3 | 18 | `w600` |
| h4 | 16 | `w600` |

---

### 5.3 Image / ContentImage

**Web:**
```json
{
  "type": "ContentImage",
  "props": {
    "src": "https://example.com/banner.jpg",
    "alt": "صورة",
    "objectFit": "cover",
    "radius": "theme-lg"
  }
}
```

**Mobile:**
```json
{
  "id": "image-banner-1",
  "type": "image",
  "props": {
    "url": "https://example.com/banner.jpg",
    "source": "network",
    "fit": "cover",
    "borderRadius": 12,
    "semanticsLabel": "صورة"
  }
}
```

| Web | Mobile |
|-----|--------|
| `src` | `url` + `source: "network"` |
| `objectFit` | `fit` |
| `radius` | `borderRadius` (number) |
| `alt` | `semanticsLabel` |
| `align`, `maxWidth` | Wrap in `container` (no direct image prop) |

---

### 5.4 Icon / ContentIcon

**Web:**
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

**Mobile:**
```json
{
  "id": "icon-shield-1",
  "type": "icon",
  "props": { "name": "verified_user", "size": 48, "color": "#2563eb" }
}
```

Lucide (kebab-case) → Material `name`:

| Lucide | Material |
|--------|----------|
| `shield-check` | `verified_user` |
| `truck` | `local_shipping` |
| `heart` | `favorite` |
| `star` | `star` |
| `shopping-cart` | `shopping_cart` |
| `menu` | `menu` |
| `search` | `search` |
| `user` | `person` |
| `arrow-right` | `arrow_forward` |
| `check-circle` | `check_circle` |
| Unknown | `help_outline` |

---

### 5.5 Divider / ContentDivider

**Web:**
```json
{ "type": "ContentDivider", "props": { "thickness": "1px", "colorMode": "theme", "colorTheme": "neutral" } }
```

**Mobile:**
```json
{
  "id": "divider-1",
  "type": "divider",
  "props": { "thickness": 1, "color": "#64748b" }
}
```

---

### 5.6 Space

**Web:**
```json
{ "type": "Space", "props": { "size": "theme-40" } }
```

**Mobile:**
```json
{ "id": "spacer-1", "type": "sizedBox", "props": { "height": 40 } }
```

---

### 5.7 RichText / ContentHtml

**Web:**
```json
{ "type": "RichText", "props": { "richtext": "<h2>عن المتجر</h2><p>نحن متجر...</p>" } }
```

**Mobile:**
```json
{
  "id": "richtext-1",
  "type": "richtext",
  "props": { "value": "<h2>عن المتجر</h2><p>نحن متجر...</p>" }
}
```

> Engine note: mobile `richtext` renderer strips HTML tags — plain text output only.

---

### 5.8 VideoEmbed

#### YouTube (not supported in `videoPlayer`)

**Web:**
```json
{
  "type": "VideoEmbed",
  "props": { "src": "https://www.youtube.com/watch?v=VIDEO_ID" }
}
```

**Mobile:**
```json
{
  "id": "youtube-thumb-1",
  "type": "image",
  "props": {
    "url": "https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg",
    "source": "network",
    "aspectRatio": 1.777,
    "fit": "cover"
  },
  "tap": { "type": "openUrl", "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
}
```

#### MP4 / HLS

**Mobile:**
```json
{
  "id": "video-1",
  "type": "videoPlayer",
  "props": {
    "url": "https://example.com/video.mp4",
    "autoplay": false,
    "showControls": true,
    "height": 480,
    "borderRadius": 12
  }
}
```

---

### 5.9 ImageGallery

#### Slider mode

**Web:**
```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "slider",
    "images": [{ "src": "https://example.com/slide1.jpg" }],
    "aspectRatio": "landscape",
    "autoplay": true,
    "autoplayDuration": "theme-5"
  }
}
```

**Mobile:**
```json
{
  "id": "slider-hero-1",
  "type": "imageSlider",
  "props": {
    "images": [{ "url": "https://example.com/slide1.jpg", "alt": "" }],
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
| `images[].src` | `images[].url` | |
| `aspectRatio: "landscape"` | `1.777` | portrait → `0.75`, square → `1.0` |
| `autoplay` | `autoPlay` | camelCase P |
| `autoplayDuration` | `intervalMs` | seconds × 1000 |
| `showArrows`, `slidesPerView` | — | **Not supported — omit** |

#### Grid mode

**Mobile:**
```json
{
  "id": "gallery-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 3,
    "mainAxisSpacing": 16,
    "crossAxisSpacing": 16,
    "childAspectRatio": 1.0
  },
  "children": [
    { "id": "gallery-img-1", "type": "image", "props": { "url": "...", "source": "network", "fit": "cover" } }
  ]
}
```

---

### 5.10 Section

**Web:**
```json
{
  "type": "Section",
  "props": {
    "backgroundColor": "#f8f9fa",
    "paddingTop": "60px",
    "paddingBottom": "60px",
    "paddingHorizontal": "24px",
    "visible": true,
    "content": []
  }
}
```

**Mobile:**
```json
{
  "id": "section-featured-1",
  "type": "container",
  "props": {
    "color": "#f8f9fa",
    "padding": { "top": 60, "bottom": 60, "left": 24, "right": 24 }
  },
  "child": {
    "id": "section-column-2",
    "type": "column",
    "props": { "crossAxisAlignment": "stretch", "mainAxisAlignment": "start", "gap": 16 },
    "children": []
  }
}
```

| Web | Mobile | Notes |
|-----|--------|-------|
| `content[]` | `children[]` on inner column | |
| `visible: false` | Omit entire subtree | |
| `anchorId` | — | **Ignore** |
| `backgroundImage` | `stack` with cover `image` + overlay | |
| `columns > 1` | Inner `gridView` instead of `column` | |

---

### 5.11 Group / Flex

**Web:**
```json
{
  "type": "Group",
  "props": {
    "direction": "row",
    "gap": 16,
    "alignItems": "center",
    "justifyContent": "space-between",
    "content": []
  }
}
```

**Mobile:**
```json
{
  "id": "group-row-1",
  "type": "row",
  "props": {
    "mainAxisAlignment": "spaceBetween",
    "crossAxisAlignment": "center",
    "gap": 16
  },
  "children": []
}
```

When `backgroundColor`, `padding`, `borderRadius`, or `boxShadow` are set, wrap the flex node in an outer `container` with those props.

| Web | Mobile |
|-----|--------|
| `content[]` / `items[]` | `children[]` |
| `wrap: "wrap"` | **Not supported** — approximate with column-of-rows |

---

### 5.12 Grid (layout)

**Web:**
```json
{ "type": "Grid", "props": { "numColumns": 3, "gap": 24, "items": [] } }
```

**Mobile:**
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
  "children": []
}
```

---

### 5.13 Accordion

**Web:**
```json
{
  "type": "Accordion",
  "props": {
    "heading": "الأسئلة الشائعة",
    "items": [{ "title": "كم يستغرق التوصيل؟", "body": "2-4 أيام", "open": true }]
  }
}
```

**Mobile:**
```json
{
  "id": "accordion-faq-1",
  "type": "column",
  "props": { "gap": 0, "crossAxisAlignment": "stretch" },
  "children": [
    {
      "id": "accordion-heading-2",
      "type": "text",
      "props": { "value": "الأسئلة الشائعة", "fontSize": 18, "fontWeight": "bold" }
    },
    {
      "id": "accordion-item-3",
      "type": "expansionTile",
      "props": { "title": "كم يستغرق التوصيل؟", "initiallyExpanded": true, "showDivider": true },
      "children": [
        {
          "id": "accordion-body-4",
          "type": "text",
          "props": { "value": "2-4 أيام", "fontSize": 14 }
        }
      ]
    }
  ]
}
```

| Web `variant` | `expansionTile` styling |
|---------------|-------------------------|
| `soft` | `backgroundColor: "#f8fafc"`, `borderRadius: 8` |
| `outline` | `container` border wrapper |
| `minimal` | no fill |

---

### 5.14 Card (content)

**Web:**
```json
{
  "type": "Card",
  "props": {
    "title": "شحن سريع",
    "description": "توصيل خلال يومي عمل...",
    "icon": "truck",
    "mode": "card"
  }
}
```

**Mobile:**
```json
{
  "id": "card-shipping-1",
  "type": "card",
  "props": { "elevation": 2, "borderRadius": 8 },
  "child": {
    "id": "card-col-2",
    "type": "column",
    "props": { "gap": 8, "padding": 16 },
    "children": [
      { "id": "card-icon-3", "type": "icon", "props": { "name": "local_shipping", "size": 32, "color": "#2563eb" } },
      { "id": "card-title-4", "type": "text", "props": { "value": "شحن سريع", "fontSize": 16, "fontWeight": "bold" } },
      { "id": "card-desc-5", "type": "text", "props": { "value": "توصيل خلال يومي عمل...", "fontSize": 14 } }
    ]
  }
}
```

| Web `mode` | Mobile |
|------------|--------|
| `card` | `elevation: 2` |
| `flat` | `elevation: 0` |

---

### 5.15 Hero

Background image mode decomposes to `stack`:

**Mobile:**
```json
{
  "id": "hero-1",
  "type": "stack",
  "props": { "fit": "loose" },
  "children": [
    {
      "id": "hero-bg-2",
      "type": "image",
      "props": { "url": "https://...", "source": "network", "fit": "cover" }
    },
    {
      "id": "hero-content-3",
      "type": "column",
      "props": { "padding": 40, "gap": 16, "crossAxisAlignment": "start" },
      "children": [
        { "id": "hero-title-4", "type": "text", "props": { "value": "ابدأ التسوق", "fontSize": 28, "fontWeight": "bold", "color": "#ffffff" } },
        {
          "id": "hero-btn-6",
          "type": "button",
          "props": { "label": "تسوق الآن", "variant": "elevated" },
          "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
        }
      ]
    }
  ]
}
```

---

### 5.16 ProductsGrid

**Web:**
```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": { "id": "coll_featured" },
    "columns": "4",
    "gap": "md",
    "cardVariant": "vertical"
  }
}
```

**Mobile:**
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
      "id": "product-card-tpl",
      "type": "card",
      "props": { "borderRadius": 8 },
      "tap": { "type": "navigate", "route": "/product/details/:productId", "navigation_type": "push" },
      "child": {
        "id": "product-col-tpl",
        "type": "column",
        "props": { "gap": 4 },
        "children": [
          { "id": "product-img-tpl", "type": "image", "props": { "urlPath": "item.primaryImageUrl", "source": "network", "fit": "cover", "aspectRatio": 1.0 } },
          { "id": "product-name-tpl", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14, "fontWeight": "w600" } },
          { "id": "product-price-tpl", "type": "text", "props": { "valuePath": "item.price", "fontSize": 13 } }
        ]
      }
    }
  }
}
```

---

### 5.17 CartSection

**Mobile:**
```json
{
  "id": "cart-list-1",
  "type": "listView",
  "props": { "emptyMessage": "السلة فارغة" },
  "itemBuilder": {
    "type": "repeat",
    "source": "cart.items",
    "item": {
      "id": "cart-line-tpl",
      "type": "row",
      "props": { "gap": 12, "crossAxisAlignment": "center" },
      "children": [
        { "id": "cart-img-tpl", "type": "image", "props": { "urlPath": "item.imageUrl", "source": "network", "width": 72, "height": 72, "fit": "cover" } },
        { "id": "cart-name-tpl", "type": "text", "props": { "valuePath": "item.name", "fontSize": 14 } }
      ]
    }
  }
}
```

---

### 5.18 OrderHistory

**Mobile:**
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
    "item": { "type": "card", "props": { "borderRadius": 8 } }
  }
}
```

---

### 5.19 Wishlist

**Mobile:**
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
  "itemBuilder": { "type": "repeat", "source": "dataContext.requests.wishlist.data", "item": {} }
}
```

---

### 5.20 Shell blocks

#### SiteHeader → per-page `appBar`

Do **not** emit a `SiteHeader` node in `body[]`.

```json
{
  "id": "appbar-1",
  "type": "appBar",
  "props": {
    "title": "متجري",
    "backgroundColor": "#ffffff",
    "showMenu": true,
    "menuAction": { "type": "openDrawer" },
    "showCartIcon": true,
    "cartBadgePath": "cart.itemCount",
    "cartAction": { "type": "navigate", "route": "/cart" }
  }
}
```

#### SiteDrawerShell → global `appDrawer`

```json
{
  "id": "drawer-1",
  "type": "appDrawer",
  "props": { "drawerEdge": "start", "width": 320, "backgroundColor": "#ffffff" },
  "child": {
    "id": "drawer-col-2",
    "type": "column",
    "props": { "gap": 0 },
    "children": [
      {
        "id": "drawer-link-home",
        "type": "button",
        "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
        "tap": { "type": "navigate", "route": "/", "navigation_type": "go" }
      }
    ]
  }
}
```

| Web `side` | Mobile `drawerEdge` |
|------------|---------------------|
| `left` | `start` (RTL-aware) |
| `right` | `end` |

---

### 5.21 Composite / decomposed blocks

| Web block | Mobile decomposition |
|-----------|---------------------|
| `Testimonials` (grid) | `gridView` or `column` of `row`s with `card` items |
| `Testimonials` (carousel) | horizontal `listView` |
| `Stats` | `row` with `mainAxisAlignment: "spaceAround"` → `column` per stat |
| `Logos` | horizontal `listView` of `image` nodes |
| `ContactForm` | `form` + `column` of `textFormField` + submit `button` |
| `NavMenu` | `column` of `button` nodes with `tap` |
| `Sidebar` | inline `column` (`dock` ignored) |
| `Badge` | `container` (rounded) + child `text` |
| `Template` | flatten children, discard wrapper |
| `CategoryListMenu` | `unsupported` + warning |
| `ProductSearchMenu` | `unsupported` + warning |

---

## 6. Page envelope structure

Full converted app config shape:

```json
{
  "schemaVersion": "1.0",
  "app": {
    "name": "SOOQ Merchant Mobile",
    "bundleId": "com.sooq.merchant.mobile",
    "apiBaseUrl": "https://sooq.up.railway.app",
    "tenantId": "...",
    "tenantSlug": "..."
  },
  "theme": { "colors": {}, "typography": {}, "radius": {}, "spacing": {}, "buttons": {} },
  "navigation": {
    "type": "tabs",
    "initialRoute": "/splash",
    "shellExcludeRoutes": ["/splash", "/auth/login", "/checkout", "..."],
    "tabs": [{ "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" }]
  },
  "pages": [
    {
      "id": "page-home",
      "route": "/home",
      "title": "Home",
      "scroll": "vertical",
      "appBar": { "type": "appBar", "props": { "title": "..." } },
      "body": []
    }
  ]
}
```

| Page rule | Value |
|-----------|-------|
| Default scroll | `"vertical"` for catalog / long content |
| Catalog grids | `enableInnerScroll: false` on `gridView` / `listView` |
| Auth / splash | `scroll: "none"` |
| Route `/` | Normalized to `/home` |

---

## 7. Locale rules

| Web / root | Mobile |
|------------|--------|
| `language: "ar"` | Prefer `labelAr`, `titleAr`, `messageAr` over English |
| `direction: "rtl"` | Default `textAlign: "right"` on text nodes |
| Phone / OTP fields | `textDirection: "ltr"` always |

---

## 8. Complete type mapping (quick reference)

| Web block | Mobile root type | Notes |
|-----------|------------------|-------|
| `Section` | `container` | + child `column` or `gridView` |
| `Group` / `Flex` (row) | `row` | |
| `Group` / `Flex` (column) | `column` | |
| `Grid` | `gridView` | |
| `Heading`, `ContentHeading` | `text` | fontSize by level |
| `Text`, `ContentParagraph` | `text` | |
| `RichText`, `ContentHtml` | `richtext` | HTML stripped at render |
| `Space` | `sizedBox` | |
| `Button`, `ContentButton` | `button` | `tap` at node level |
| `ContentIcon` | `icon` | Lucide → Material |
| `ContentImage`, `ProductImage` | `image` | `src` → `url` |
| `ContentDivider` | `divider` | |
| `VideoEmbed` (MP4) | `videoPlayer` | |
| `VideoEmbed` (YouTube) | `image` + `tap.openUrl` | |
| `ImageGallery` (slider) | `imageSlider` | |
| `ImageGallery` (grid) | `gridView` | |
| `Hero` | `stack` / `column` | composite |
| `Card` | `card` + `column` | composite |
| `Accordion` | `column` + `expansionTile` | |
| `Testimonials` | `gridView` / `listView` | composite |
| `Stats` | `row` + `column` | composite |
| `Logos` | horizontal `listView` | composite |
| `ProductsGrid` | `gridView` + API | data-bound |
| `CartSection` | `listView` + `cart.items` | data-bound |
| `OrderHistory` | `listView` + customer API | auth |
| `Wishlist` | `gridView` + customer API | auth |
| `SiteHeader` | `appBar` | per-page |
| `SiteDrawerShell` | `appDrawer` | global |
| `SiteFooter` | `column` | page bottom |
| `ContactForm` | `form` + fields | composite |
| `Template`, `Blank` | omit / `unsupported` | |

---

## 9. Known limitations (cannot be fully implemented)

These are **by design** — mobile team should not expect converter output for these behaviors:

| Item | Reason |
|------|--------|
| YouTube in `videoPlayer` | Flutter `video_player` supports MP4/HLS only |
| `fontFamily` on text nodes | Not in engine schema |
| `lineHeight` as standalone prop | Not in engine schema |
| `wrap: wrap` on Flex/Group | No native flex-wrap — approximated only |
| `backgroundAttachment: fixed` on Hero | No Flutter scroll-attachment equivalent |
| `showArrows` / `slidesPerView` on `imageSlider` | Not in engine schema |
| `anchorId` on Section | No in-page anchor scroll on mobile |
| `align` / `maxWidth` on `image` | Requires `container` wrapper |
| `CheckoutForm` as single page | Multi-route flow: `/checkout`, `/checkout/address`, `/checkout/payment` |
| `CategoryListMenu` | Runtime category data — no static decomposition |
| `ProductSearchMenu` | No direct widget — needs cubit + search field wiring |

---

## 10. Comparison checklist for mobile team

Use this when validating your engine against converter output:

### Schema / parse

- [ ] All `type` values are from the allowed list (Section 1)
- [ ] Every node has `id`, `type`, `props`
- [ ] No `child` + `children` on same node
- [ ] No `style` wrapper — only flat `props`
- [ ] No web block type names in output

### Props / values

- [ ] No `"theme-*"` strings in output
- [ ] No CSS px strings (`"60px"`) — all numbers
- [ ] No `colorMode` / `colorTheme` / `colorFixed` — hex only
- [ ] `mainAxisAlignment` / `crossAxisAlignment` (not short forms)
- [ ] Button `variant` is `elevated`, `filled`, `outlined`, or `text`
- [ ] `image.url` present (not `src`)
- [ ] `text.value` present (not `text` prop name)
- [ ] `richtext.value` (not `richtext` prop name)
- [ ] `imageSlider.autoPlay` (capital P) and `intervalMs`

### Actions

- [ ] All navigation on node-level `tap`, not inside `props`
- [ ] YouTube → `image` + `openUrl`, not `videoPlayer`
- [ ] `addToCart` → `cubitCall` cart
- [ ] Logout → `cubitCall` auth before navigate

### API / data

- [ ] Relative paths only (`/api/v1/public/...`, `/api/v1/customer/...`)
- [ ] No absolute admin URLs
- [ ] `requestKey` + `requestUrl` on data-bound grids/lists
- [ ] `itemBuilder.source` matches `dataContext.requests.{key}.data`

### Layout

- [ ] Catalog pages: `scroll: vertical` + `enableInnerScroll: false` on grids
- [ ] Section backgrounds on `container.props.color`
- [ ] Accordion → `expansionTile` children (not raw Accordion type)

---

## 11. Source files (for deeper review)

| Document | Path |
|----------|------|
| Global engine rules | `docs/engine/web-to-mobile-converter/03-global-engine-rules.md` |
| Shared fields (colors, tap, tokens) | `docs/engine/web-to-mobile-converter/07-shared-fields.md` |
| Layout blocks | `docs/engine/web-to-mobile-converter/blocks/09-layout-blocks.md` |
| Content blocks | `docs/engine/web-to-mobile-converter/blocks/10-content-blocks.md` |
| Commerce blocks | `docs/engine/web-to-mobile-converter/blocks/11-commerce-blocks.md` |
| Shell blocks | `docs/engine/web-to-mobile-converter/blocks/13-shell-blocks.md` |
| Post-conversion validation | `docs/engine/web-to-mobile-converter/16-post-conversion-validation.md` |
| Audit report (mobile team feedback) | `CONVERTER-AUDIT-REPORT.md` |
| Converter implementation | `lib/transformer.ts` |

---

## 12. Validation checklist (pre-ship)

- [ ] All `type` values are valid mobile engine types
- [ ] No `buttonAction`, `link`, `href` inside `props`
- [ ] No `"theme-*"` strings anywhere
- [ ] No CSS px strings — all numbers
- [ ] No `colorMode/colorTheme/colorFixed` — hex resolved
- [ ] No absolute API URLs
- [ ] `images[].url` in `imageSlider` (not `src`)
- [ ] `autoPlay` + `intervalMs` on `imageSlider`
- [ ] `mainAxisAlignment` / `crossAxisAlignment` full names
- [ ] `props.color` for backgrounds (not `style.color`)
- [ ] `children` (not `content`, `items`) for child slots
- [ ] Accordion → `column` + `expansionTile`
- [ ] `CartSection`, `OrderHistory`, `Wishlist` → data-bound lists
- [ ] `ProductsGrid` → `gridView` with relative `requestUrl`
- [ ] Every navigable `button` has node-level `tap`
- [ ] YouTube → `image` + `openUrl`
- [ ] Every node has unique `id`

---

*Generated from converter rules updated 2026-06-30. Send questions or mismatches back with the specific block type, web input sample, expected mobile JSON, and what your renderer currently accepts.*
