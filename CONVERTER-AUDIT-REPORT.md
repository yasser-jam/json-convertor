# Converter Audit Report — BLOCKS.md vs Mobile Engine

**Date:** 2026-06-30  
**Scope:** Full audit of `docs/BLOCKS.md` against the live mobile renderers (`lib/engine/tree/renderers/`) and component schemas (`lib/engine/validation/component_schemas.dart`).

> **Bottom line:** The current `BLOCKS.md` documents the *web input* block shapes, not mobile engine output. The converter must transform web blocks into the mobile primitives described in this report. Many block type names, property names, value formats, and structural patterns are wrong and will cause runtime parse failures or silent data loss.

---

## 1. Global Critical Errors (Fix First)

These problems affect every block in the output. Fix these rules before touching individual blocks.

---

### G1 — Type names must be lowercased mobile primitives

Every `"type"` value in the converter output must be a **registered mobile engine type**. Web block type names are NEVER valid mobile types.

| Web input type | Required mobile output type |
|----------------|-----------------------------|
| `Button`, `ContentButton` | `button` |
| `ContentParagraph`, `ContentHeading`, `Text`, `Heading` | `text` |
| `RichText`, `ContentHtml` | `richtext` |
| `ContentImage`, `ProductImage` | `image` |
| `ContentIcon` | `icon` |
| `ContentDivider` | `divider` |
| `Space` | `sizedBox` |
| `VideoEmbed` | `videoPlayer` |
| `ImageGallery` (slider mode) | `imageSlider` |
| `ImageGallery` (grid mode) | `gridView` |
| `Section` | `container` |
| `Group`, `Flex` (direction=row) | `row` |
| `Group`, `Flex` (direction=column) | `column` |
| `Grid` (layout) | `gridView` or `column` of `row`s |
| `Accordion` | `column` (+ N × `expansionTile` children) |
| `Card` (content card) | `card` (with child `column`) |
| `Hero` | `stack` or `column` composite |
| `ProductsGrid` | `gridView` (with `requestUrl`) |
| `Testimonials` | `gridView` or `listView` |
| `CartSection` | `column` + `listView` |
| `OrderHistory` | `listView` (with `requestUrl`) |
| `Wishlist` | `gridView` (with `requestUrl`) |

All valid mobile types: `scaffold`, `singleChildScrollView`, `column`, `row`, `container`, `listView`, `gridView`, `text`, `textFormField`, `form`, `button`, `contactButton`, `card`, `image`, `appBar`, `divider`, `sizedBox`, `icon`, `richtext`, `videoPlayer`, `stack`, `imageSlider`, `timer`, `progressIndicator`, `appDrawer`, `tabs`, `otpInput`, `dropdown`, `expansionTile`, `unsupported`.

---

### G2 — `tap` is a node-level field, never inside `props`

Button actions, link navigation, and any interaction **must** be a sibling of `props` on the node, not inside `props`.

**WRONG (current output):**
```json
{
  "type": "button",
  "props": {
    "label": "تسوق الآن",
    "variant": "primary",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**CORRECT:**
```json
{
  "id": "button-shop-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated" },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

Rules:
- `buttonAction`, `link`, `href` → NEVER in `props` → convert to `tap` at node level
- `onTap` must never be authored in JSON (it is runtime-injected)

---

### G3 — Theme token strings must be resolved to concrete values

The engine does not understand `"theme-md"`, `"theme-40"`, `"theme-lg"`. All CSS-like values must be resolved to concrete numbers or hex strings at conversion time.

| Web value | Mobile resolved value |
|-----------|-----------------------|
| `"theme-xs"` | `12` (fontSize) |
| `"theme-sm"` | `14` (fontSize) or `4` (borderRadius) |
| `"theme-md"` | `16` (fontSize) or `8` (borderRadius) |
| `"theme-lg"` | `18` (fontSize) or `12` (borderRadius) |
| `"theme-xl"` | `22` (fontSize) or `16` (borderRadius) |
| `"theme-2xl"` | `28` (fontSize) |
| `"theme-none"` | `0` (borderRadius) |
| `"theme-full"` | `999` (borderRadius) |
| `"theme-8"` | `8` (spacing) |
| `"theme-16"` | `16` (spacing) |
| `"theme-24"` | `24` (spacing) |
| `"theme-40"` | `40` (spacing) |
| `"theme-315"` | `315` (height) |
| `"theme-480"` | `480` (height) |
| `"theme-5"` (autoplayDuration) | `5000` (intervalMs in ms) |
| `"1px"`, `"60px"` → any CSS px string | Strip `px` → parse to number: `1`, `60` |

**Color triple** (`colorMode`, `colorTheme`, `colorFixed`) must be resolved to a literal hex string using the active merchant theme. Never pass these three fields into mobile JSON.

| Web | Mobile |
|-----|--------|
| `colorMode: "theme"`, `colorTheme: "primary"` | `"color": "#hexFromTheme"` |
| `colorMode: "fixed"`, `colorFixed: "#2563eb"` | `"color": "#2563eb"` |
| `colorMode: "theme"`, `colorTheme: "neutral"` | `"color": "#64748b"` (muted) |
| `colorMode: "theme"`, `colorTheme: "text"` | `"color": "#0f172a"` |
| `colorMode: "theme"`, `colorTheme: "surface"` | `"color": "#ffffff"` |
| `colorMode: "theme"`, `colorTheme: "error"` | `"color": "#ef4444"` |

---

### G4 — `mainAxis` / `crossAxis` must be full property names

The conversion docs (09-layout-blocks.md) contain a bug: they use `mainAxis` and `crossAxis` (short forms). **The actual engine schema and renderers use `mainAxisAlignment` and `crossAxisAlignment`.**

| Wrong (from doc example) | Correct |
|--------------------------|---------|
| `"mainAxis": "center"` | `"mainAxisAlignment": "center"` |
| `"crossAxis": "stretch"` | `"crossAxisAlignment": "stretch"` |

Valid values: `start`, `center`, `end`, `spaceBetween`, `spaceAround`, `spaceEvenly` (for mainAxis); `start`, `center`, `end`, `stretch`, `baseline` (for crossAxis).

---

### G5 — `style` object does not exist; use flat `props`

The 09-layout-blocks.md before/after example incorrectly uses a `"style"` sub-object for padding and color. **The engine reads all properties from the flat `props` object.** There is no `style` namespace.

**WRONG:**
```json
{ "style": { "color": "#F9FAFB", "padding": { "top": 32 } } }
```

**CORRECT:**
```json
{ "props": { "color": "#F9FAFB", "padding": { "top": 32, "bottom": 32, "left": 16, "right": 16 } } }
```

---

### G6 — String columns/gap values must be numbers

Numeric props must always be JSON numbers, not strings.

| Wrong | Correct |
|-------|---------|
| `"columns": "4"` | `"crossAxisCount": 4` |
| `"gap": "md"` | `"mainAxisSpacing": 12, "crossAxisSpacing": 12` |
| `"maxRows": "2"` | Use pagination or `data.size` cap |

Gap size map: `sm` → 8, `md` → 12, `lg` → 16, `xl` → 24.

---

## 2. Block-by-Block Audit

---

### BUTTON / ContentButton

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Button",
  "props": {
    "label": "تسوق الآن",
    "variant": "primary",
    "buttonAction": "link",
    "link": { "kind": "page", "pageId": "/products" }
  }
}
```

**Issues:**
1. `type: "Button"` → must be `type: "button"`
2. `variant: "primary"` → must be `variant: "elevated"` (or omit for default). Valid values: `elevated`, `filled`, `outlined`, `text`. The engine silently accepts `secondary` as alias for `outlined`, but output should use canonical values.
3. `buttonAction` → DELETE from props; convert to node-level `tap`
4. `link` object → DELETE from props; convert to `tap.route`
5. Missing `id` field

**Correct mobile output:**
```json
{
  "id": "button-shop-1",
  "type": "button",
  "props": { "label": "تسوق الآن", "variant": "elevated" },
  "tap": { "type": "navigate", "route": "/products", "navigation_type": "push" }
}
```

**Button action mapping:**

| Web `buttonAction` | Mobile `tap` |
|--------------------|--------------|
| `link` + `link.kind: "page"` | `{ "type": "navigate", "route": "{link.pageId}" }` |
| `link` + `link.kind: "url"` | `{ "type": "openUrl", "url": "{link.url}" }` |
| `login` | `{ "type": "navigate", "route": "/auth/login" }` |
| `logout` | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }` |
| `addToCart` | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem" }` |

**Supported button props (mobile engine):**

| Prop | Type | Notes |
|------|------|-------|
| `label` | string | |
| `variant` | string | `elevated`, `filled`, `outlined`, `text` |
| `backgroundColor` | string (hex) | |
| `textColor` | string (hex) | |
| `foregroundColor` | string (hex) | alias for textColor |
| `borderRadius` | number | |
| `padding` | number or `{top,bottom,left,right}` | |
| `fullWidth` | bool | |
| `maxWidth` | number | |
| `fontSize` | number | |
| `fontWeight` | string | |
| `icon` | string | Material icon name |
| `iconPosition` | string | `leading`, `trailing` |
| `iconSize` | number | |
| `enabled` | bool | |
| `enabledPath` | string | dataContext path for dynamic enabled state |
| `shadow` | string | `sm`, `md`, `lg`, `xl`, `none` |

---

### TEXT / ContentParagraph / ContentHeading / Heading

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "ContentParagraph",
  "props": {
    "text": "نحن نقدم أفضل المنتجات...",
    "textAlign": "right",
    "fontFamily": "body",
    "fontSize": "theme-md",
    "fontWeight": "theme-light",
    "lineHeight": "theme-normal",
    "color": "theme-text"
  }
}
```

**Issues:**
1. `type: "ContentParagraph"` → `type: "text"`
2. `text` → `value`
3. `fontSize: "theme-md"` → `fontSize: 16`
4. `fontWeight: "theme-light"` → `fontWeight: "normal"` (light → normal, semibold/bold supported, not "light")
5. `color: "theme-text"` → resolve to hex e.g. `"color": "#0f172a"`
6. `fontFamily` → NOT supported in mobile engine, **delete**
7. `lineHeight` → NOT supported as standalone prop, **delete**

**Correct mobile output:**
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

**For ContentHeading / Heading:** Same mapping. Use `fontSize` to convey heading level:

| Web heading level | `fontSize` | `fontWeight` |
|-------------------|------------|--------------|
| h1 | 28 | `"bold"` |
| h2 | 22 | `"bold"` |
| h3 | 18 | `"w600"` |
| h4 | 16 | `"w600"` |

**Supported text props:** `value`, `valuePath`, `fontSize` (number), `fontWeight`, `color` (hex), `textAlign` (`left|center|right|justify`), `maxLines` (number), `overflow`, `fontStyle`.

---

### IMAGE / ContentImage / ProductImage

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "ContentImage",
  "props": {
    "src": "https://example.com/banner.jpg",
    "alt": "صورة",
    "align": "center",
    "objectFit": "cover",
    "radius": "theme-lg",
    "maxWidth": "800px"
  }
}
```

**Issues:**
1. `type: "ContentImage"` → `type: "image"`
2. `src` → `url` (REQUIRED by engine schema)
3. `objectFit` → `fit` (values stay the same: `cover`, `contain`, `fill`, `fitWidth`, `fitHeight`, `scaleDown`)
4. `radius: "theme-lg"` → `borderRadius: 12` (resolve theme token to number)
5. `maxWidth` → NOT supported directly; wrap `image` in a `container` with `width` prop
6. `align` → NOT supported on image; wrap in `container` or parent with alignment
7. Missing `source: "network"` for network images
8. `alt` is supported via `semanticsLabel` prop (also accepts `alt` in renderer, keep it)

**Correct mobile output:**
```json
{
  "id": "image-banner-1",
  "type": "image",
  "props": {
    "url": "https://example.com/banner.jpg",
    "source": "network",
    "fit": "cover",
    "aspectRatio": 1.777,
    "borderRadius": 12,
    "semanticsLabel": "صورة"
  }
}
```

---

### ICON / ContentIcon

**Current BLOCKS.md output (WRONG):**
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

**Issues:**
1. `type: "ContentIcon"` → `type: "icon"`
2. `icon` → `name` (engine reads `props.name`)
3. Icon name must be a **Material icon name**, not a Lucide icon name
4. `colorMode/colorTheme` → resolve to `color: "#hex"`

**Lucide → Material icon mapping (extended):**

| Lucide | Material `name` |
|--------|-----------------|
| `shield-check` | `verified_user` |
| `truck` | `local_shipping` |
| `heart` | `favorite` |
| `star` | `star` |
| `shopping-cart` | `shopping_cart` |
| `menu` | `menu` |
| `x`, `close` | `close` |
| `search` | `search` |
| `user` | `person` |
| `bell` | `notifications` |
| `home` | `home` |
| `phone` | `phone` |
| `mail` | `email` |
| `map-pin` | `location_on` |
| `check` | `check` |
| `arrow-right` | `arrow_forward` |
| `arrow-left` | `arrow_back` |
| `info` | `info` |
| `alert-circle` | `error_outline` |
| `calendar` | `calendar_today` |
| `clock` | `access_time` |
| `tag` | `label` |
| `grid` | `grid_view` |
| `list` | `list` |
| `filter` | `filter_list` |
| `share` | `share` |
| `eye` | `visibility` |
| `trash` | `delete` |
| `edit`, `pencil` | `edit` |
| `plus` | `add` |
| `minus` | `remove` |
| `check-circle` | `check_circle` |
| `feather` | `edit` |
| Unknown Lucide | `help_outline` (fallback) |

**Correct mobile output:**
```json
{
  "id": "icon-shield-1",
  "type": "icon",
  "props": {
    "name": "verified_user",
    "size": 48,
    "color": "#2563eb"
  }
}
```

---

### DIVIDER / ContentDivider

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "ContentDivider",
  "props": {
    "thickness": "1px",
    "colorMode": "theme",
    "colorTheme": "neutral"
  }
}
```

**Issues:**
1. `type: "ContentDivider"` → `type: "divider"`
2. `thickness: "1px"` → `thickness: 1` (number, not string)
3. `colorMode/colorTheme` → `color: "#64748b"` (resolved hex)

**Correct mobile output:**
```json
{
  "id": "divider-1",
  "type": "divider",
  "props": { "thickness": 1, "color": "#64748b" }
}
```

---

### SPACER / Space

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Space",
  "props": { "size": "theme-40" }
}
```

**Issues:**
1. `type: "Space"` → `type: "sizedBox"`
2. `size: "theme-40"` → `height: 40` (parse numeric part from token; use `height` for vertical, `width` for horizontal)

**Correct mobile output:**
```json
{
  "id": "spacer-1",
  "type": "sizedBox",
  "props": { "height": 40 }
}
```

---

### RICHTEXT / RichText / ContentHtml

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "RichText",
  "props": { "richtext": "<h2>عن المتجر</h2><p>نحن متجر...</p>" }
}
```

**Issues:**
1. `type: "RichText"` → `type: "richtext"` (lowercase)
2. `richtext` → `value` (the engine reads `props.value`)
3. Note: The mobile `richtext` renderer **strips all HTML tags**. It is plain text output only. For real rich formatting, decompose into separate `text` nodes.

**Correct mobile output:**
```json
{
  "id": "richtext-1",
  "type": "richtext",
  "props": { "value": "<h2>عن المتجر</h2><p>نحن متجر...</p>" }
}
```

---

### VIDEO / VideoEmbed

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "VideoEmbed",
  "props": {
    "src": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
    "align": "center",
    "size": "theme-480",
    "radius": "theme-lg"
  }
}
```

**Issues:**
1. `type: "VideoEmbed"` → `type: "videoPlayer"`
2. `src` → `url`
3. **CRITICAL: YouTube URLs are NOT supported** by the `videoPlayer` renderer. The engine uses the `video_player` Flutter package which plays MP4/HLS streams only. YouTube iframes are blocked.
   - For YouTube: Use a thumbnail `image` + `tap: { "type": "openUrl", "url": "https://youtube.com/..." }` instead
   - For MP4: use `videoPlayer` normally
4. `size: "theme-480"` → `height: 480`
5. `radius: "theme-lg"` → `borderRadius: 12`
6. `align` → NOT supported

**Correct mobile output (MP4):**
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

**Correct mobile output (YouTube fallback):**
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

---

### IMAGE GALLERY / ImageGallery

**Slider mode — current BLOCKS.md output (WRONG):**
```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "slider",
    "images": [{ "src": "https://example.com/slide1.jpg", "alt": "" }],
    "aspectRatio": "landscape",
    "objectFit": "cover",
    "radius": "theme-md",
    "autoplay": true,
    "autoplayDuration": "theme-5",
    "showArrows": true,
    "slidesPerView": 1
  }
}
```

**Issues (slider):**
1. `type: "ImageGallery"` → `type: "imageSlider"`
2. `images[].src` → `images[].url`
3. `aspectRatio: "landscape"` → `aspectRatio: 1.777` (16:9 number; portrait → 0.75; square → 1.0)
4. `objectFit` → `fit`
5. `radius: "theme-md"` → `borderRadius: 8`
6. `autoplay: true` → `autoPlay: true` (**camelCase — capital P is required**)
7. `autoplayDuration: "theme-5"` → `intervalMs: 5000` (seconds × 1000)
8. `showArrows` → NOT supported in engine imageSlider, **delete**
9. `slidesPerView` → NOT supported, **delete**

**Correct mobile output (slider):**
```json
{
  "id": "slider-hero-1",
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

**Grid mode — issues:**
1. `type: "ImageGallery"` → `type: "gridView"` with static `children` of `image` nodes
2. `gridColumns` → `crossAxisCount`
3. `gap: "theme-16"` → `mainAxisSpacing: 16, crossAxisSpacing: 16`

---

### SECTION

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Section",
  "props": {
    "name": "Featured Products",
    "anchorId": "featured",
    "visible": true,
    "paddingTop": "60px",
    "paddingBottom": "60px",
    "paddingHorizontal": "24px",
    "backgroundColor": "#f8f9fa",
    "backgroundImage": "",
    "columns": 1,
    "content": []
  }
}
```

**Issues:**
1. `type: "Section"` → `type: "container"` wrapping a `column`
2. `paddingTop: "60px"` → parse px string → `padding.top: 60`
3. `paddingHorizontal: "24px"` → `padding.left: 24, padding.right: 24`
4. `content` → `children` on the inner `column`
5. `anchorId` → NOT supported, **delete**
6. `visible: false` → **omit the node entirely** from output
7. `backgroundImage` → If non-empty, requires `stack` composition: `container` (bg color) → `stack` → [`image` (fill), `column` (content)]
8. `columns > 1` → use `gridView` as the content wrapper instead of `column`
9. `name` → NOT supported as mobile prop (add as `"id"` for readability)
10. **`style.color` bug in docs** → use `props.color` (flat, not nested under `style`)

**Correct mobile output:**
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

---

### GROUP / Flex

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Group",
  "props": {
    "direction": "row",
    "gap": 16,
    "alignItems": "center",
    "justifyContent": "space-between",
    "wrap": "nowrap",
    "backgroundColor": "",
    "borderRadius": "theme-none",
    "boxShadow": "none",
    "content": []
  }
}
```

**Issues:**
1. `type: "Group"` → `type: "row"` (or `type: "column"` when `direction: "column"`)
2. `alignItems` → `crossAxisAlignment` (rename AND use correct values below)
3. `justifyContent` → `mainAxisAlignment` (rename AND use correct values below)
4. `wrap: "nowrap"` → NOT supported, **delete**
5. `backgroundColor` → if non-empty: wrap in `container` with `color`; if empty: delete
6. `borderRadius: "theme-none"` → `0`; if non-empty background, apply to container wrapper
7. `boxShadow` → `shadow` prop; `"none"` → omit
8. `content` → `children`

**Alignment value map:**

| Web `justifyContent` / `alignItems` | Mobile `mainAxisAlignment` / `crossAxisAlignment` |
|-------------------------------------|---------------------------------------------------|
| `flex-start`, `start` | `start` |
| `center` | `center` |
| `flex-end`, `end` | `end` |
| `space-between`, `spaceBetween` | `spaceBetween` |
| `space-around` | `spaceAround` |
| `space-evenly` | `spaceEvenly` |
| `stretch` | `stretch` |
| `baseline` | `baseline` |

**Correct mobile output:**
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

---

### GRID (layout)

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Grid",
  "props": {
    "numColumns": 3,
    "gap": 24,
    "items": []
  }
}
```

**Issues:**
1. `type: "Grid"` → `type: "gridView"` (for homogeneous children) or `column` of `row`s (for mixed content)
2. `numColumns` → `crossAxisCount`
3. `gap` → `mainAxisSpacing: 24, crossAxisSpacing: 24`
4. `items` → `children`

**Correct mobile output:**
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

### ACCORDION

**No direct mobile equivalent.** Must be decomposed.

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "Accordion",
  "props": {
    "heading": "الأسئلة الشائعة",
    "variant": "soft",
    "items": [
      { "title": "كم يستغرق التوصيل؟", "body": "...", "open": true }
    ]
  }
}
```

**Correct mobile output:**
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
      "props": {
        "title": "كم يستغرق التوصيل؟",
        "initiallyExpanded": true,
        "showDivider": true
      },
      "children": [
        {
          "id": "accordion-body-4",
          "type": "text",
          "props": { "value": "معظم الطلبات في سوريا تصل خلال 2-4 أيام عمل.", "fontSize": 14 }
        }
      ]
    }
  ]
}
```

**Variant mapping:**

| Web `variant` | Mobile `expansionTile` props |
|---------------|------------------------------|
| `soft` | `backgroundColor: "#f8fafc"`, `borderRadius: 8` |
| `outline` | no fill; wrap in `container` with `border: {width: 1, color: "#e2e8f0"}` |
| `minimal` | no fill, no background |

---

### CARD (content card)

**No direct one-to-one mapping.** Web `Card` has embedded `title`, `description`, `icon` — mobile `card` is a pure container with a `child`.

**Current BLOCKS.md output (WRONG):**
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

**Correct mobile output:**
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
      {
        "id": "card-icon-3",
        "type": "icon",
        "props": { "name": "local_shipping", "size": 32, "color": "#2563eb" }
      },
      {
        "id": "card-title-4",
        "type": "text",
        "props": { "value": "شحن سريع", "fontSize": 16, "fontWeight": "bold" }
      },
      {
        "id": "card-desc-5",
        "type": "text",
        "props": { "value": "توصيل خلال يومي عمل لجميع المحافظات.", "fontSize": 14 }
      }
    ]
  }
}
```

**Mode mapping:**

| Web `mode` | Mobile `card` props |
|------------|---------------------|
| `card` | `elevation: 2` |
| `flat` | `elevation: 0` |

---

### HERO

**Must be decomposed — no direct mobile type.**

**Decomposition rules:**
- `image.mode: "background"` → `stack` with full-bleed `image` + `column` overlay
- `image.mode: "inline"` → `column`: image on top, content below
- `align: "center"` → `crossAxisAlignment: "center"` on the inner column

**Correct mobile output (background image):**
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
        {
          "id": "hero-title-4",
          "type": "text",
          "props": { "value": "ابدأ التسوق الآن", "fontSize": 28, "fontWeight": "bold", "color": "#ffffff" }
        },
        {
          "id": "hero-desc-5",
          "type": "text",
          "props": { "value": "آلاف المنتجات بأسعار لا تُقاوم.", "fontSize": 16, "color": "#ffffff" }
        },
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

### IMAGE GALLERY (grid mode)

**Correct mobile output:**
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
    {
      "id": "gallery-img-2",
      "type": "image",
      "props": { "url": "https://example.com/img1.jpg", "source": "network", "fit": "cover" }
    }
  ]
}
```

---

### PRODUCTS GRID / ProductsGrid

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": { "id": "coll_featured" },
    "metadata": { "apiUrl": "https://api.example.com/admin/collections/..." },
    "columns": "4",
    "gap": "md",
    "cardVariant": "vertical"
  }
}
```

**Issues:**
1. `type: "ProductsGrid"` → `type: "gridView"`
2. `metadata.apiUrl` uses the **admin API** — must use the **public API** with relative path
3. `columns: "4"` → `crossAxisCount: 4` (integer)
4. `gap: "md"` → `mainAxisSpacing: 12, crossAxisSpacing: 12`
5. `cardVariant` → determines the `itemBuilder.item` layout inside the grid
6. Missing: `requestKey`, `requestUrl`, `itemBuilder`

**Correct mobile output:**
```json
{
  "id": "products-grid-1",
  "type": "gridView",
  "props": {
    "crossAxisCount": 2,
    "mainAxisSpacing": 12,
    "crossAxisSpacing": 12,
    "childAspectRatio": 0.75,
    "enableInnerScroll": false,
    "requestKey": "product-list",
    "requestUrl": "/api/v1/public/products?page=0&size=20",
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
          {
            "id": "product-img-tpl",
            "type": "image",
            "props": { "urlPath": "item.primaryImageUrl", "source": "network", "fit": "cover", "aspectRatio": 1.0 }
          },
          {
            "id": "product-name-tpl",
            "type": "text",
            "props": { "valuePath": "item.name", "fontSize": 14, "fontWeight": "w600" }
          },
          {
            "id": "product-price-tpl",
            "type": "text",
            "props": { "valuePath": "item.price", "fontSize": 13 }
          }
        ]
      }
    }
  }
}
```

> **API path rule:** NEVER output absolute `https://api.example.com/admin/...` URLs. ALWAYS use relative paths starting with `/api/v1/public/` for catalog, `/api/v1/customer/` for authenticated endpoints. See `03-global-engine-rules.md §7`.

---

### SITE HEADER / SiteHeader

SiteHeader is a **shell-level block**, not a page block. On mobile it maps to the `appBar` component placed inside each page's `body` column.

**Correct mobile output (per page):**
```json
{
  "id": "appbar-1",
  "type": "appBar",
  "props": {
    "title": "متجري",
    "backgroundColor": "#ffffff",
    "showMenu": true,
    "menuIcon": "menu",
    "menuAction": { "type": "openDrawer" },
    "showCartIcon": true,
    "cartBadgePath": "cart.itemCount",
    "cartAction": { "type": "navigate", "route": "/cart" }
  }
}
```

**Do NOT emit a `SiteHeader` node.** Wire `showDrawerButton`, `showCartIcon`, `title` to the per-page `appBar`.

---

### SIDE DRAWER / SiteDrawerShell / SideDrawer

These are **global shell components**. On mobile the drawer is defined once in the `scaffold → appDrawer` structure. Not per page.

**`drawerEdge` mapping:**

| Web `side` | Mobile `drawerEdge` |
|------------|---------------------|
| `"left"` | `"start"` (RTL-aware) |
| `"right"` | `"end"` |

**Correct mobile output (in page scaffold):**
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
        "id": "drawer-link-home",
        "type": "button",
        "props": { "label": "الرئيسية", "variant": "text", "fullWidth": true },
        "tap": { "type": "navigate", "route": "/", "navigation_type": "go" }
      }
    ]
  }
}
```

---

### TESTIMONIALS

**No direct mobile type.** Must be decomposed.

| Web `layoutVariant` | Mobile |
|---------------------|--------|
| `grid` | `gridView` with static `children` of card items |
| `carousel` | `listView` with `scrollDirection: "horizontal"` |
| `minimal` | `column` of simple `row` items |

Each testimonial item → `card` with `column` containing rating icons + `text` (name) + `text` (quote).

---

### STATS / Stats

**No direct mobile type.** Decompose into a `row`:

```json
{
  "id": "stats-row-1",
  "type": "row",
  "props": { "mainAxisAlignment": "spaceAround" },
  "children": [
    {
      "id": "stat-col-1",
      "type": "column",
      "props": { "gap": 4, "crossAxisAlignment": "center" },
      "children": [
        { "id": "stat-num-1", "type": "text", "props": { "value": "+١٠,٠٠٠", "fontSize": 22, "fontWeight": "bold" } },
        { "id": "stat-lbl-1", "type": "text", "props": { "value": "العملاء", "fontSize": 14 } }
      ]
    }
  ]
}
```

---

### LOGOS / Logos

Decompose into a horizontal `listView` of `image` nodes:

```json
{
  "id": "logos-list-1",
  "type": "listView",
  "props": { "scrollDirection": "horizontal", "height": 60 },
  "children": [
    { "id": "logo-1", "type": "image", "props": { "url": "https://...", "source": "network", "height": 48, "fit": "contain" } }
  ]
}
```

---

### CART SECTION / CartSection

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "CartSection",
  "props": { "layoutStyle": "rows", "gap": "md", "showDividerLines": true }
}
```

`CartSection` is NOT a mobile engine type. Decompose to a `listView` bound to `cart.items`.

**Correct mobile output:**
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

### ORDER HISTORY / OrderHistory

**Current BLOCKS.md output (WRONG):**
```json
{
  "type": "OrderHistory",
  "props": { "limit": 10, "statusFilter": "all" }
}
```

`OrderHistory` is NOT a mobile engine type. Decompose to `listView` + authenticated request.

**Correct mobile output:**
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
    "item": { "...order row template..." }
  }
}
```

---

### WISHLIST / Wishlist

`Wishlist` is NOT a mobile engine type. Decompose to `gridView` + wishlist cubit.

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
  "itemBuilder": { "...product card template..." }
}
```

---

## 3. Blocks with No Coverage in BLOCKS.md

The following web blocks are **not documented** in the current BLOCKS.md. The converter must handle them:

| Web block | Mobile decomposition strategy |
|-----------|-------------------------------|
| `ContactForm` | `form` (with `id`) + `column` + multiple `textFormField` nodes + submit `button` |
| `NavMenu` | → `appDrawer` child `column` (navigation links as `button` nodes with `tap`) |
| `Sidebar` | → inline `column` (no docking on mobile; ignore `dock` prop) |
| `SiteFooter` | → `column` at page bottom with `text` + link `button` nodes per column |
| `CheckoutForm` | Multi-route flow: `/checkout` + `/checkout/address` + `/checkout/payment` pages |
| `ProductCard` (single) | `card` + `column` (image + title + price + CTA button) with `valuePath` binding |
| `ProductInfo` (bound) | `column` of `text` nodes with `valuePath: "item.name"`, `"item.price"`, etc. |
| `CategoryListMenu` | Complex — use `tabs` for category switching or `dropdown` + `reloadRequest` tap |
| `ProductSearchMenu` | No direct equivalent; recommend `textFormField` + `reloadRequest` with `search` requestUrl |
| `Badge` | `container` (rounded, colored) with `text` child |
| `Template` | Flatten/inline its children; discard the template wrapper |
| `Blank` | → `unsupported` or omit entirely |

---

## 4. Converter Rule Corrections (Errata for Existing Docs)

The following errors exist in the current converter rule files:

| File | Error | Correction |
|------|-------|------------|
| `09-layout-blocks.md` | Uses `"mainAxis"` and `"crossAxis"` (short form) | Must be `"mainAxisAlignment"` and `"crossAxisAlignment"` |
| `09-layout-blocks.md` | Uses `"style": { "color": "..." }` for container background | Must be `"props": { "color": "..." }` (no `style` wrapper) |
| `10-content-blocks.md` | Button example keeps `variant: "primary"` in mobile output | Mobile valid variants: `elevated`, `filled`, `outlined`, `text` |
| `07-shared-fields.md` | Button variant table maps `primary` → "default filled" without specifying the mobile prop value | Specify explicitly: `variant: "elevated"` |
| `07-shared-fields.md` | YouTube note says `videoPlayer.url` with embed URL | Clarify that YouTube iframe is NOT supported; use `openUrl` fallback |

---

## 5. Quick Reference — Complete Type Mapping

| Web block | Mobile type | Notes |
|-----------|-------------|-------|
| `Section` | `container` | Wrap with child `column` |
| `Group` (row) | `row` | |
| `Group` (column) | `column` | |
| `Flex` (row) | `row` | |
| `Flex` (column) | `column` | |
| `Grid` | `gridView` | |
| `Sidebar` | `column` | No docking |
| `Heading`, `ContentHeading` | `text` | fontSize by level |
| `Text`, `ContentParagraph` | `text` | |
| `RichText`, `ContentHtml` | `richtext` | HTML stripped by engine |
| `Space` | `sizedBox` | |
| `Button`, `ContentButton` | `button` | tap at node level |
| `ContentIcon` | `icon` | Lucide → Material name |
| `ContentImage`, `ProductImage` | `image` | src → url |
| `ContentDivider` | `divider` | |
| `VideoEmbed` (MP4) | `videoPlayer` | |
| `VideoEmbed` (YouTube) | `image` + tap openUrl | Fallback |
| `ImageGallery` (slider) | `imageSlider` | |
| `ImageGallery` (grid) | `gridView` | |
| `Hero` | `stack` / `column` | Composite |
| `Card` | `card` + child `column` | Composite |
| `Accordion` | `column` + N × `expansionTile` | Decompose |
| `Testimonials` | `gridView` / `listView` | Decompose |
| `Stats` | `row` + `column` items | Decompose |
| `Logos` | horizontal `listView` | Decompose |
| `ProductsGrid` | `gridView` + `requestUrl` | Data-bound |
| `CartSection` | `listView` + `cart.items` | Data-bound |
| `OrderHistory` | `listView` + `/api/v1/customer/orders` | Data-bound, auth |
| `Wishlist` | `gridView` + `/api/v1/customer/wishlist` | Data-bound, auth |
| `SiteHeader` | `appBar` (per-page) | Shell → page |
| `SiteDrawerShell`, `SideDrawer` | `appDrawer` | Global, once |
| `SiteFooter` | `column` (page bottom) | Shell → page |
| `NavMenu` | `appDrawer` children | |
| `ContactForm` | `form` + `textFormField` | Composite |
| `Badge` | `container` + `text` | |
| `Template`, `Blank` | omit / `unsupported` | |

---

## 6. Validation Checklist

Run this check on every converted page before delivery:

- [ ] All `type` values are valid mobile engine types (see complete list in §1 G1)
- [ ] No `buttonAction`, `link`, `href` inside `props`; all converted to node-level `tap`
- [ ] No `"theme-*"` strings anywhere in output
- [ ] No CSS px strings (`"1px"`, `"60px"`) — all converted to numbers
- [ ] No `colorMode/colorTheme/colorFixed` fields — all resolved to hex strings
- [ ] No absolute API URLs (`https://api.example.com/...`) — use relative paths
- [ ] `images[].src` → `images[].url` in `imageSlider`
- [ ] `autoplay` → `autoPlay` (capital P) in `imageSlider`
- [ ] `mainAxisAlignment` and `crossAxisAlignment` (full names, not `mainAxis`/`crossAxis`)
- [ ] `props.color` for background (not `style.color`)
- [ ] `children` (not `content`, `items`) for child slots
- [ ] Accordion → decomposed to `column` + `expansionTile` nodes
- [ ] `CartSection`, `OrderHistory`, `Wishlist` → decomposed to data-bound lists
- [ ] `ProductsGrid` → `gridView` with relative `requestUrl`
- [ ] Every `button` that navigates has a `tap` at node level
- [ ] Every `button` variant is `elevated`, `filled`, `outlined`, or `text`
- [ ] YouTube URLs → `image` + `openUrl` tap (not `videoPlayer`)
- [ ] Every node has a unique `id`
