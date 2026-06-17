# Puck Blocks — Reference Documentation

Each block is described with its **properties**, accepted **values**, and a ready-to-use **JSON example** (the exact shape stored in `store_config.json`).

> **Common note — `layout`**  
> Most blocks wrap their props with a `WithLayout` higher-order type that adds a shared `layout` object. The `layout` prop controls advanced positioning (padding, shadow, sticky, float, visibility per breakpoint). It is omitted from the examples below for brevity; add it only when you need non-default positioning.

---

## Table of Contents

1. [Accordion](#accordion)
2. [Blank](#blank)
3. [Button](#button)
4. [Card](#card)
5. [CartSection](#cartsection)
6. [CategoryListMenu](#categorylistmenu)
7. [CheckoutForm](#checkoutform)
8. [ContactForm](#contactform)
9. [ContentButton](#contentbutton)
10. [ContentDivider](#contentdivider)
11. [ContentHeading](#contentheading)
12. [ContentHtml](#contenthtml)
13. [ContentIcon](#contenticon)
14. [ContentImage](#contentimage)
15. [ContentParagraph](#contentparagraph)
16. [Flex](#flex)
17. [Grid](#grid)
18. [Group](#group)
19. [Heading](#heading)
20. [Hero](#hero)
21. [ImageGallery](#imagegallery)
22. [Logos](#logos)
23. [NavMenu](#navmenu)
24. [OrderHistory](#orderhistory)
25. [ProductCard](#productcard)
26. [ProductImage](#productimage)
27. [ProductInfo](#productinfo)
28. [ProductSearchMenu](#productsearchmenu)
29. [ProductsGrid](#productsgrid)
30. [RichText](#richtext)
31. [Section](#section)
32. [Sidebar](#sidebar)
33. [SideDrawer](#sidedrawer)
34. [SiteDrawerShell](#sitedrawershell)
35. [SiteFooter](#sitefooter)
36. [SiteHeader](#siteheader)
37. [Space](#space)
38. [Stats](#stats)
39. [Template](#template)
40. [Testimonials](#testimonials)
41. [Text](#text)
42. [VideoEmbed](#videoembed)
43. [Wishlist](#wishlist)

---

## Accordion

**Label:** أكورديون  
**Description:** Collapsible FAQ / accordion list with a heading, description, and expandable items.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `heading` | `string` | Section heading | `"الأسئلة الشائعة"` |
| `description` | `string` | Subtitle below heading | `"إجابات مختصرة..."` |
| `variant` | `"soft" \| "outline" \| "minimal"` | Visual style | `"soft"` |
| `backgroundColor` | `string` | CSS color or empty (use theme) | `""` |
| `textColor` | `string` | CSS color or empty | `""` |
| `items` | `AccordionItem[]` | Array of accordion items | see below |
| `items[].title` | `string` | Item question/title | `"سؤال"` |
| `items[].body` | `string` | Item answer/body | `"إجابة"` |
| `items[].open` | `boolean` | Open by default | `false` |

### JSON Example

```json
{
  "type": "Accordion",
  "props": {
    "heading": "الأسئلة الشائعة",
    "description": "إجابات مختصرة وعملية.",
    "variant": "soft",
    "backgroundColor": "",
    "textColor": "",
    "items": [
      { "title": "كم يستغرق التوصيل؟", "body": "2-4 أيام عمل.", "open": true },
      { "title": "هل يمكن الدفع عند الاستلام؟", "body": "نعم.", "open": false }
    ]
  }
}
```

---

## Blank

**Label:** Placeholder  
**Description:** A simple placeholder block used during development or as a fallback.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `message` | `string` | Display message | `"Placeholder block"` |

### JSON Example

```json
{
  "type": "Blank",
  "props": {
    "message": "Coming soon…"
  }
}
```

---

## Button

**Label:** الزر  
**Description:** A standalone CTA button supporting link navigation or in-app actions.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `label` | `string` | Button text | `"الزر"` |
| `variant` | `"primary" \| "secondary"` | Visual variant | `"primary"` |
| `buttonAction` | `ButtonAction` | `"link"` or functional action key | `"link"` |
| `link` | `LinkValue` | Structured navigation target (see LinkValue) | `EMPTY_LINK` |
| `href` | `string` | *(Deprecated)* legacy fallback href | — |

> **LinkValue** shape: `{ kind: "page" | "url" | "anchor" | "none", pageId?: string, url?: string, hash?: string, target?: "_blank" | "_self" }`

### JSON Example

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

---

## Card

**Label:** Card  
**Description:** A feature card with an icon, title, and description.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `string` | Card title | `"Title"` |
| `description` | `string` | Card description | `"Description"` |
| `icon` | `string` | Lucide icon name (e.g. `"Feather"`, `"Star"`) | `"Feather"` |
| `mode` | `"flat" \| "card"` | Visual style | `"flat"` |

### JSON Example

```json
{
  "type": "Card",
  "props": {
    "title": "شحن سريع",
    "description": "توصيل خلال يومي عمل لجميع المحافظات.",
    "icon": "Truck",
    "mode": "card"
  }
}
```

---

## CartSection

**Label:** Cart Section  
**Description:** Displays the current user's shopping cart items. Bound to cart data at render time.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `layoutStyle` | `"rows" \| "cards"` | Display layout | `"rows"` |
| `gap` | `"sm" \| "md" \| "lg" \| "xl"` | Space between items | `"md"` |
| `showDividerLines` | `boolean` | Show separator lines | `true` |

### JSON Example

```json
{
  "type": "CartSection",
  "props": {
    "layoutStyle": "rows",
    "gap": "md",
    "showDividerLines": true
  }
}
```

---

## CategoryListMenu

**Label:** Category list menu  
**Description:** A browsable category list menu that displays product categories and their items.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `buttonLabel` | `string` | Trigger button text | `"Browse categories"` |
| `categoriesMenuTitle` | `string` | Header title inside the menu | `"Shop by category"` |
| `backLabel` | `string` | Accessibility label for back button | `"Back to categories"` |
| `maxProducts` | `number` | Max products per category (0 = all) | `24` |

### JSON Example

```json
{
  "type": "CategoryListMenu",
  "props": {
    "buttonLabel": "تصفح الفئات",
    "categoriesMenuTitle": "تسوق حسب الفئة",
    "backLabel": "العودة للفئات",
    "maxProducts": 20
  }
}
```

---

## CheckoutForm

**Label:** Checkout Form  
**Description:** Full checkout form bound to the store's checkout flow.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `showDataHints` | `boolean` | Show session/debug hints in editor | `true` |

### JSON Example

```json
{
  "type": "CheckoutForm",
  "props": {
    "showDataHints": false
  }
}
```

---

## ContactForm

**Label:** نموذج اتصال  
**Description:** A contact form that submits to the tenant's contact endpoint. Supports bilingual labels.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `BilingualString` | Heading `{ ar, en }` | `{ ar: "تواصل معنا", en: "Get in touch" }` |
| `subtitle` | `BilingualString` | Subheading `{ ar, en }` | `{ ar: "سنرد...", en: "We'll reply..." }` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |
| `showPhone` | `boolean` | Show phone field | `true` |
| `requirePhone` | `boolean` | Make phone required | `false` |
| `showSubject` | `boolean` | Show subject field | `true` |
| `submitLabel` | `string` | Submit button label | `"إرسال"` |
| `successMessage` | `string` | Message after successful submission | `"شكراً — تم إرسال رسالتك."` |
| `enableCaptcha` | `boolean` | Enable CAPTCHA protection | `true` |
| `submitWidth` | `"auto" \| "full"` | Submit button width | `"auto"` |

### JSON Example

```json
{
  "type": "ContactForm",
  "props": {
    "title": { "ar": "تواصل معنا", "en": "Get in touch" },
    "subtitle": { "ar": "سنرد خلال يوم عمل.", "en": "We'll reply within one business day." },
    "language": "ar",
    "showPhone": true,
    "requirePhone": false,
    "showSubject": true,
    "submitLabel": "إرسال",
    "successMessage": "شكراً — تم إرسال رسالتك.",
    "enableCaptcha": true,
    "submitWidth": "auto"
  }
}
```

---

## ContentButton

**Label:** زر  
**Description:** A fully customizable button block with theme variants, manual color overrides, and alignment control.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `label` | `string` | Button text | `"زر"` |
| `align` | `"left" \| "center" \| "right"` | Horizontal alignment | `"center"` |
| `destinationType` | `"link" \| "action"` | Navigate to URL or trigger an action | `"link"` |
| `link` | `LinkValue` | Navigation target | `EMPTY_LINK` |
| `buttonAction` | `ButtonAction` | In-app action key (when `destinationType = "action"`) | `"login"` |
| `buttonVariantMode` | `"variant" \| "fixed"` | Use theme variant or manual colors | `"variant"` |
| `buttonVariant` | `"primary" \| "secondary" \| "error"` | Theme variant | `"primary"` |
| `buttonVariantSize` | `"sm" \| "md" \| "lg"` | Size when using variant mode | `"md"` |
| `radius` | `string` | Border radius (e.g. `"theme-md"` or `"8"`) | `"theme-md"` |
| `bgColor` | `string` | Background color (e.g. `"theme-primary"` or `"#2563eb"`) | `"theme-primary"` |
| `textColor` | `string` | Text color | `"theme-surface"` |
| `buttonSize` | `string` | Size in fixed mode (e.g. `"theme-md"`) | `"theme-md"` |

### JSON Example

```json
{
  "type": "ContentButton",
  "props": {
    "label": "اشتر الآن",
    "align": "center",
    "destinationType": "link",
    "link": { "kind": "page", "pageId": "/products" },
    "buttonVariantMode": "variant",
    "buttonVariant": "primary",
    "buttonVariantSize": "lg"
  }
}
```

---

## ContentDivider

**Label:** فاصل  
**Description:** A horizontal rule / divider line with configurable thickness and color.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `thickness` | `string` | CSS value e.g. `"1px"`, `"2px"` | `"1px"` |
| `colorMode` | `"theme" \| "fixed"` | Use a theme color token or a fixed hex | `"theme"` |
| `colorTheme` | `ColorKey` | Theme color key (e.g. `"neutral"`, `"primary"`) | `"neutral"` |
| `colorFixed` | `string` | Hex color used when `colorMode = "fixed"` | `"#e5e7eb"` |

### JSON Example

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

---

## ContentHeading

**Label:** عنوان  
**Description:** A richly styled heading block with full typography control.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `text` | `string` | Heading text | `"عنوان"` |
| `textAlign` | `"left" \| "center" \| "right"` | Text alignment | `"right"` |
| `fontFamily` | `"body" \| "option1" \| "option2"` | Font family | `"body"` |
| `fontSize` | `string` | `"theme-lg"` or pixel value | `"theme-lg"` |
| `fontWeight` | `string` | `"theme-semibold"` or numeric | `"theme-semibold"` |
| `lineHeight` | `string` | `"theme-normal"` or numeric | `"theme-normal"` |
| `fontStyle` | `"normal" \| "italic"` | Font style | `"normal"` |
| `textTransform` | `"none" \| "uppercase" \| "lowercase" \| "capitalize"` | Text transform | `"none"` |
| `color` | `string` | `"theme-text"` or CSS color | `"theme-text"` |

### JSON Example

```json
{
  "type": "ContentHeading",
  "props": {
    "text": "مرحباً بك في متجرنا",
    "textAlign": "center",
    "fontFamily": "body",
    "fontSize": "theme-xl",
    "fontWeight": "theme-bold",
    "lineHeight": "theme-normal",
    "fontStyle": "normal",
    "textTransform": "none",
    "color": "theme-text"
  }
}
```

---

## ContentHtml

**Label:** HTML  
**Description:** A raw HTML block for advanced custom markup. Not shown on mobile/small screens.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `html` | `string` | Raw HTML string | `"<p>Edit <strong>HTML</strong> here.</p>"` |

### JSON Example

```json
{
  "type": "ContentHtml",
  "props": {
    "html": "<table><tr><td>Custom HTML content</td></tr></table>"
  }
}
```

---

## ContentIcon

**Label:** أيقونة  
**Description:** Renders a single Lucide icon with size and color options.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `icon` | `string` | Lucide icon name (e.g. `"Star"`, `"Heart"`) | `"Star"` |
| `size` | `number` | Size in pixels (8–128) | `24` |
| `colorMode` | `"theme" \| "fixed"` | Color source | `"theme"` |
| `colorTheme` | `ColorKey` | Theme color key | `"primary"` |
| `colorFixed` | `string` | Hex color when `colorMode = "fixed"` | `"#2563eb"` |

### JSON Example

```json
{
  "type": "ContentIcon",
  "props": {
    "icon": "ShieldCheck",
    "size": 48,
    "colorMode": "theme",
    "colorTheme": "primary"
  }
}
```

---

## ContentImage

**Label:** صورة  
**Description:** An image block with alignment, fit, radius, and max-width options.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `src` | `string` | Image URL | placeholder URL |
| `alt` | `string` | Alt text | `""` |
| `align` | `"left" \| "center" \| "right"` | Horizontal alignment | `"center"` |
| `objectFit` | `"cover" \| "contain" \| "fill" \| "none" \| "scale-down"` | CSS object-fit | `"cover"` |
| `radius` | `string` | Border radius (`"theme-md"` or pixel value) | `"theme-md"` |
| `maxWidth` | `string` | Max width CSS value | `"100%"` |

### JSON Example

```json
{
  "type": "ContentImage",
  "props": {
    "src": "https://example.com/banner.jpg",
    "alt": "صورة البانر الرئيسي",
    "align": "center",
    "objectFit": "cover",
    "radius": "theme-lg",
    "maxWidth": "800px"
  }
}
```

---

## ContentParagraph

**Label:** نص  
**Description:** A paragraph block with full typography customisation.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `text` | `string` | Paragraph text | `"نص"` |
| `textAlign` | `"left" \| "center" \| "right"` | Text alignment | `"right"` |
| `fontFamily` | `"body" \| "option1" \| "option2"` | Font family | `"body"` |
| `fontSize` | `string` | `"theme-md"` or pixel value | `"theme-md"` |
| `fontWeight` | `string` | `"theme-light"` or numeric | `"theme-light"` |
| `lineHeight` | `string` | `"theme-normal"` or numeric | `"theme-normal"` |
| `fontStyle` | `"normal" \| "italic"` | Font style | `"normal"` |
| `textTransform` | `"none" \| "uppercase" \| "lowercase" \| "capitalize"` | Transform | `"none"` |
| `color` | `string` | Color token or hex | `"theme-text"` |

### JSON Example

```json
{
  "type": "ContentParagraph",
  "props": {
    "text": "نحن نقدم أفضل المنتجات بأسعار تنافسية مع ضمان الجودة.",
    "textAlign": "right",
    "fontFamily": "body",
    "fontSize": "theme-md",
    "fontWeight": "theme-light",
    "lineHeight": "theme-normal",
    "fontStyle": "normal",
    "textTransform": "none",
    "color": "theme-text"
  }
}
```

---

## Flex

**Label:** Flex  
**Description:** A flexible container (CSS flexbox) that holds child blocks.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `direction` | `"row" \| "column"` | Flex direction | `"row"` |
| `justifyContent` | `"start" \| "center" \| "end"` | Main-axis alignment | `"start"` |
| `gap` | `number` | Gap in pixels | `24` |
| `wrap` | `"wrap" \| "nowrap"` | Whether items wrap | `"wrap"` |
| `items` | `Slot` | Child blocks slot | starter content |

### JSON Example

```json
{
  "type": "Flex",
  "props": {
    "direction": "row",
    "justifyContent": "center",
    "gap": 16,
    "wrap": "wrap",
    "items": []
  }
}
```

---

## Grid

**Label:** Grid  
**Description:** A CSS grid container for laying out child blocks in columns.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `numColumns` | `number` | Number of columns (1–12) | `4` |
| `gap` | `number` | Gap in pixels | `24` |
| `items` | `Slot` | Child blocks slot | starter content |

### JSON Example

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

---

## Group

**Label:** مجموعة  
**Description:** A flexible inline container (flexbox) for grouping blocks side-by-side or stacked.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `direction` | `"row" \| "column"` | Flex direction | `"row"` |
| `gap` | `number` | Gap in pixels (0–120) | `16` |
| `alignItems` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | Cross-axis alignment | `"stretch"` |
| `justifyContent` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | Main-axis alignment | `"flex-start"` |
| `wrap` | `"wrap" \| "nowrap"` | Whether items wrap | `"nowrap"` |
| `content` | `Slot` | Child blocks (Section not allowed) | starter content |

### JSON Example

```json
{
  "type": "Group",
  "props": {
    "direction": "row",
    "gap": 16,
    "alignItems": "center",
    "justifyContent": "space-between",
    "wrap": "nowrap",
    "content": []
  }
}
```

---

## Heading

**Label:** Heading  
**Description:** A section heading with size, level, alignment, font family, and color controls.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `text` | `string` | Heading text | `"Heading"` |
| `size` | `"xxxl" \| "xxl" \| "xl" \| "l" \| "m" \| "s" \| "xs"` | Visual size scale | `"m"` |
| `level` | `"1"…"6" \| ""` | HTML heading level | `""` |
| `align` | `"left" \| "center" \| "right"` | Text alignment | `"left"` |
| `fontFamily` | `"body" \| "option1" \| "option2"` | Font family | `"body"` |
| `colorMode` | `"theme" \| "fixed"` | Color source | `"theme"` |
| `colorTheme` | `ColorKey` | Theme color key | `"text"` |
| `colorFixed` | `string` | Hex color when `colorMode = "fixed"` | `"#0f172a"` |

### JSON Example

```json
{
  "type": "Heading",
  "props": {
    "text": "منتجاتنا المميزة",
    "size": "xl",
    "level": "2",
    "align": "right",
    "fontFamily": "body",
    "colorMode": "theme",
    "colorTheme": "text"
  }
}
```

---

## Hero

**Label:** Hero  
**Description:** A full-featured hero section with title, rich-text description, CTA buttons, and optional background/inline image.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `string` | Hero heading | `"Hero"` |
| `description` | `RichText` | HTML rich-text description | `"<p>Description</p>"` |
| `align` | `"left" \| "center"` | Content alignment | `"left"` |
| `padding` | `string` | Vertical padding e.g. `"64px"` | `"64px"` |
| `buttons` | `HeroButton[]` | Array of CTA buttons | `[{ label: "Learn more", href: "#" }]` |
| `buttons[].label` | `string` | Button text | `"الزر"` |
| `buttons[].href` | `string` | Button URL | `"#"` |
| `buttons[].variant` | `"primary" \| "secondary"` | Button variant | `"primary"` |
| `image.mode` | `"inline" \| "background" \| "custom"` | Image display mode | — |
| `image.url` | `string` | Image URL | — |
| `image.backgroundAttachment` | `"scroll" \| "fixed" \| "local"` | Background attachment style | `"scroll"` |
| `quote` | `{ index: number, label: string }` | Auto-fill from quote picker | — |

### JSON Example

```json
{
  "type": "Hero",
  "props": {
    "title": "ابدأ التسوق الآن",
    "description": "<p>آلاف المنتجات بأسعار لا تُقاوم.</p>",
    "align": "left",
    "padding": "80px",
    "buttons": [
      { "label": "تسوق الآن", "href": "/products", "variant": "primary" },
      { "label": "تعرف أكثر", "href": "/about", "variant": "secondary" }
    ],
    "image": {
      "mode": "background",
      "url": "https://example.com/hero.jpg",
      "backgroundAttachment": "scroll"
    }
  }
}
```

---

## ImageGallery

**Label:** معرض الصور  
**Description:** A grid or slider gallery of images with aspect ratio, radius, and autoplay controls.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `mode` | `"grid" \| "slider"` | Display mode | `"grid"` |
| `images` | `GalleryImageItem[]` | Array of `{ src, alt }` | 3 placeholders |
| `aspectRatio` | `"landscape" \| "portrait" \| "square"` | Image aspect ratio | `"landscape"` |
| `objectFit` | `"cover" \| "contain" \| "fill" \| "none" \| "scale-down"` | CSS object-fit | `"cover"` |
| `radius` | `string` | Border radius | `"theme-md"` |
| `gap` | `string` | Gap between images | `"theme-16"` |
| `gridColumns` | `1…6` | Columns (grid mode) | `3` |
| `gridRows` | `0…6` | Max rows, 0 = all (grid mode) | `0` |
| `slidesPerView` | `1…4` | Slides visible (slider mode) | `1` |
| `autoplay` | `boolean` | Auto-advance slides | `true` |
| `autoplayDuration` | `string` | Duration e.g. `"theme-4"` (seconds) | `"theme-4"` |
| `showArrows` | `boolean` | Show prev/next arrows | `true` |

### JSON Example (Grid)

```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "grid",
    "images": [
      { "src": "https://example.com/img1.jpg", "alt": "صورة 1" },
      { "src": "https://example.com/img2.jpg", "alt": "صورة 2" },
      { "src": "https://example.com/img3.jpg", "alt": "صورة 3" }
    ],
    "aspectRatio": "landscape",
    "objectFit": "cover",
    "radius": "theme-md",
    "gap": "theme-16",
    "gridColumns": 3,
    "gridRows": 0
  }
}
```

### JSON Example (Slider)

```json
{
  "type": "ImageGallery",
  "props": {
    "mode": "slider",
    "images": [
      { "src": "https://example.com/slide1.jpg", "alt": "" },
      { "src": "https://example.com/slide2.jpg", "alt": "" }
    ],
    "aspectRatio": "landscape",
    "objectFit": "cover",
    "radius": "theme-md",
    "gap": "theme-16",
    "slidesPerView": 1,
    "autoplay": true,
    "autoplayDuration": "theme-5",
    "showArrows": true
  }
}
```

---

## Logos

**Label:** Logos  
**Description:** A horizontal strip of partner / brand logos.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `logos` | `LogoItem[]` | Array of `{ alt, imageUrl }` | 5 Google logos |
| `logos[].alt` | `string` | Alt text | `""` |
| `logos[].imageUrl` | `string` | Image URL | `""` |

### JSON Example

```json
{
  "type": "Logos",
  "props": {
    "logos": [
      { "alt": "Apple", "imageUrl": "https://example.com/apple.png" },
      { "alt": "Google", "imageUrl": "https://example.com/google.png" },
      { "alt": "Amazon", "imageUrl": "https://example.com/amazon.png" }
    ]
  }
}
```

---

## NavMenu

**Label:** قائمة التنقل  
**Description:** A generic navigation list (header, footer columns, breadcrumbs). Supports bilingual labels and structured link values.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `orientation` | `"horizontal" \| "vertical"` | Layout direction | `"horizontal"` |
| `variant` | `"plain" \| "pill" \| "button"` | Visual style | `"plain"` |
| `activePath` | `string` | Highlight items matching this path | `""` |
| `items` | `NavMenuItem[]` | Navigation items | Home + Cart |
| `items[].label` | `BilingualString` | `{ ar, en }` label | `{ ar: "عنصر", en: "Item" }` |
| `items[].link` | `LinkValue` | Navigation target | — |

### JSON Example

```json
{
  "type": "NavMenu",
  "props": {
    "orientation": "horizontal",
    "variant": "plain",
    "activePath": "/",
    "items": [
      {
        "label": { "ar": "الرئيسية", "en": "Home" },
        "link": { "kind": "page", "pageId": "/" }
      },
      {
        "label": { "ar": "المنتجات", "en": "Products" },
        "link": { "kind": "page", "pageId": "/products" }
      },
      {
        "label": { "ar": "السلة", "en": "Cart" },
        "link": { "kind": "page", "pageId": "/cart" }
      }
    ]
  }
}
```

---

## OrderHistory

**Label:** Order History  
**Description:** Displays the authenticated customer's recent orders. Data is bound at render time; JSON carries display config only.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `limit` | `number` | Max orders to show (1–50) | `5` |
| `currency` | `"SYP" \| "USD" \| "EUR"` | Display currency | `"SYP"` |
| `statusFilter` | `"all" \| "pending" \| "confirmed" \| "shipped" \| "delivered" \| "cancelled" \| "returned"` | Filter by status | `"all"` |
| `showThumbnails` | `boolean` | Show product thumbnails | `true` |
| `emptyStateText` | `string` | Message when no orders | `"You have no orders yet."` |

### JSON Example

```json
{
  "type": "OrderHistory",
  "props": {
    "limit": 10,
    "currency": "USD",
    "statusFilter": "all",
    "showThumbnails": true,
    "emptyStateText": "لا توجد طلبات بعد."
  }
}
```

---

## ProductCard

**Label:** بطاقة المنتج  
**Description:** A single product card bound to a product via the product picker. Supports multiple layouts and extensive display controls.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `product` | `ProductPickerRef \| null` | `{ id, titleAr, titleEn }` | `null` |
| `variant` | `"vertical" \| "horizontal" \| "compact" \| "featured"` | Card layout | `"vertical"` |
| `radius` | `string` | Border radius | `"theme-md"` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |
| `showTags` | `boolean` | Show product tags | `true` |
| `showVariants` | `boolean` | Show variant selectors | `true` |
| `showDescription` | `boolean` | Show description | `true` |
| `showCategories` | `boolean` | Show category badges | `true` |
| `showActionButtons` | `boolean` | Show action buttons | `true` |
| `actionButtonsFirst` | `boolean` | Buttons before content | `false` |
| `showAddToCart` | `boolean` | Show add-to-cart button | `true` |
| `showViewDetails` | `boolean` | Show view-details button | `true` |
| `showFavoriteButton` | `boolean` | Show favorite button | `true` |
| `actionButtonVariantMode` | `"variant" \| "fixed"` | Button style mode | `"variant"` |
| `actionButtonVariant` | `"primary" \| "secondary" \| "error"` | Button variant | `"primary"` |
| `actionButtonVariantSize` | `"sm" \| "md" \| "lg"` | Button size | `"md"` |
| `actionRadius` | `string` | Button radius (fixed mode) | `"theme-md"` |
| `actionBgColor` | `string` | Button bg color (fixed mode) | `"theme-primary"` |
| `actionTextColor` | `string` | Button text color (fixed mode) | `"theme-surface"` |
| `titleColor` | `string` | Title color | `"theme-text"` |
| `descriptionColor` | `string` | Description color | `"theme-neutral"` |

### JSON Example

```json
{
  "type": "ProductCard",
  "props": {
    "product": { "id": "prod_01", "titleAr": "قميص كلاسيكي", "titleEn": "Classic Shirt" },
    "variant": "vertical",
    "radius": "theme-md",
    "language": "ar",
    "showTags": true,
    "showVariants": true,
    "showDescription": true,
    "showCategories": false,
    "showActionButtons": true,
    "showAddToCart": true,
    "showViewDetails": false,
    "showFavoriteButton": true,
    "actionButtonVariantMode": "variant",
    "actionButtonVariant": "primary",
    "actionButtonVariantSize": "md",
    "titleColor": "theme-text",
    "descriptionColor": "theme-neutral"
  }
}
```

---

## ProductImage

**Label:** Product Image  
**Description:** Displays the image of a bound product with aspect ratio, width, and badge options.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `product` | `ProductPickerRef \| null` | Product reference | `null` |
| `aspectRatio` | `"square" \| "landscape" \| "portrait"` | Image aspect ratio | `"landscape"` |
| `width` | `"auto" \| "120px" \| "160px" \| "200px" \| "240px" \| "280px" \| "320px" \| "400px"` | Fixed width or auto | `"auto"` |
| `borderRadius` | `"none" \| "sm" \| "md" \| "lg"` | Border radius | `"sm"` |
| `showBadges` | `boolean` | Show sale/new badges | `true` |

### JSON Example

```json
{
  "type": "ProductImage",
  "props": {
    "product": { "id": "prod_01", "titleAr": "قميص", "titleEn": "Shirt" },
    "aspectRatio": "square",
    "width": "240px",
    "borderRadius": "md",
    "showBadges": true
  }
}
```

---

## ProductInfo

**Label:** Product Info  
**Description:** Displays textual information (title, description, price, categories, stock) of a bound product.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `product` | `ProductPickerRef \| null` | Product reference | `null` |
| `showTitle` | `boolean` | Show product title | `true` |
| `showDescription` | `boolean` | Show description | `true` |
| `showCategories` | `boolean` | Show category tags | `true` |
| `showPrice` | `boolean` | Show price | `true` |
| `showStockBadge` | `boolean` | Show stock badge | `true` |
| `titleSize` | `"s" \| "m" \| "l" \| "xl"` | Title font size | `"m"` |
| `priceSize` | `"s" \| "m" \| "l"` | Price font size | `"m"` |
| `align` | `"left" \| "center" \| "right"` | Content alignment | `"left"` |
| `padding` | `"none" \| "sm" \| "md" \| "lg"` | Internal padding | `"md"` |

### JSON Example

```json
{
  "type": "ProductInfo",
  "props": {
    "product": { "id": "prod_01", "titleAr": "قميص", "titleEn": "Shirt" },
    "showTitle": true,
    "showDescription": true,
    "showCategories": true,
    "showPrice": true,
    "showStockBadge": true,
    "titleSize": "l",
    "priceSize": "m",
    "align": "right",
    "padding": "md"
  }
}
```

---

## ProductSearchMenu

**Label:** Product search menu  
**Description:** A search menu overlay for finding products by name or category.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `buttonLabel` | `string` | Trigger button text | `"Search products"` |
| `searchPlaceholder` | `string` | Input placeholder | `"Search by name, category…"` |
| `menuHeading` | `string` | Results section title | `"Search results"` |
| `maxResults` | `number` | Max results (0 = all) | `12` |

### JSON Example

```json
{
  "type": "ProductSearchMenu",
  "props": {
    "buttonLabel": "ابحث عن منتج",
    "searchPlaceholder": "ابحث بالاسم أو الفئة...",
    "menuHeading": "نتائج البحث",
    "maxResults": 10
  }
}
```

---

## ProductsGrid

**Label:** Products Grid  
**Description:** A responsive grid of product cards sourced from a collection.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `collection` | `string` | Collection name | first available |
| `columns` | `"1"…"6"` | Number of columns | `"3"` |
| `maxRows` | `"0"…"10"` | Max rows, `"0"` = all | `"0"` |
| `gap` | `"sm" \| "md" \| "lg" \| "xl"` | Gap between cards | `"md"` |
| `cardVariant` | `"vertical" \| "horizontal" \| "compact" \| "featured"` | Card layout | `"vertical"` |

### JSON Example

```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": "featured",
    "columns": "4",
    "maxRows": "2",
    "gap": "md",
    "cardVariant": "vertical"
  }
}
```

---

## RichText

**Label:** RichText  
**Description:** A WYSIWYG rich-text block supporting headings, lists, and inline formatting.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `richtext` | `string` | HTML rich-text string | `"<h2>Heading</h2><p>Body</p>"` |

### JSON Example

```json
{
  "type": "RichText",
  "props": {
    "richtext": "<h2>عن المتجر</h2><p>نحن متجر متخصص في الملابس العصرية.</p><ul><li>شحن مجاني</li><li>إرجاع 30 يوم</li></ul>"
  }
}
```

---

## Section

**Label:** قسم  
**Description:** The primary page-level container. Wraps blocks in a full-width band with padding, background, grid columns, and optional anchor.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `name` | `string` | Human-readable label for the outline | `"Section"` |
| `anchorId` | `string` | CSS id for in-page links | `""` |
| `visible` | `boolean` | Show/hide in published renderer | `true` |
| `paddingTop` | `string` | CSS value e.g. `"80px"` | `"80px"` |
| `paddingBottom` | `string` | CSS value | `"80px"` |
| `paddingHorizontal` | `string` | Side padding | `"24px"` |
| `backgroundColor` | `string` | CSS color | `"#ffffff"` |
| `theme` | `"dark" \| "light"` | Text color tone inside section | `"dark"` |
| `maxWidth` | `string` | Container max-width | `"1280px"` |
| `columns` | `number \| string` | Grid column count (1–6) | `1` |
| `gridGap` | `string` | Gap between columns | `"24px"` |
| `content` | `Slot` | Child blocks (no nested Section) | starter content |

### JSON Example

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
    "theme": "dark",
    "maxWidth": "1280px",
    "columns": 1,
    "gridGap": "24px",
    "content": []
  }
}
```

---

## Sidebar

**Label:** الشريط الجانبي  
**Description:** A vertical sidebar container. Can be inline (flows in document), or docked to the left/right of the viewport.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `BilingualString` | `{ ar, en }` | `{ ar: "القائمة الجانبية", en: "Sidebar" }` |
| `showTitle` | `boolean` | Show title header | `true` |
| `dock` | `"inline" \| "left" \| "right"` | Positioning mode | `"inline"` |
| `dockOffsetTop` | `string` | Top offset when docked (e.g. header height) | `"64px"` |
| `width` | `"narrow" \| "medium" \| "wide"` | 220 / 280 / 340 px | `"medium"` |
| `stickyTop` | `string` | Sticky top offset (empty = not sticky) | `"16px"` |
| `borderStyle` | `"none" \| "bordered" \| "card" \| "divider"` | Visual frame style | `"card"` |
| `backgroundColor` | `"transparent" \| "surface" \| "muted"` | Background | `"surface"` |
| `showOnMobile` | `"collapse" \| "hidden" \| "always"` | Mobile behavior | `"collapse"` |
| `items` | `Slot` | Child blocks | starter content |

### JSON Example

```json
{
  "type": "Sidebar",
  "props": {
    "title": { "ar": "الفلاتر", "en": "Filters" },
    "showTitle": true,
    "dock": "inline",
    "dockOffsetTop": "64px",
    "width": "medium",
    "stickyTop": "16px",
    "borderStyle": "card",
    "backgroundColor": "surface",
    "showOnMobile": "collapse",
    "items": []
  }
}
```

---

## SideDrawer

**Label:** درج جانبي  
**Description:** A slide-in panel from the left or right edge. Supports link lists, trigger types, animation, and external control via `window.sooqDrawers`.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `name` | `string` | Stable identifier for external toggles | `"main-menu"` |
| `title` | `BilingualString` | Panel title `{ ar, en }` | `{ ar: "القائمة", en: "Menu" }` |
| `showTitle` | `boolean` | Show title in header | `true` |
| `side` | `"left" \| "right"` | Which edge the panel slides from | `"left"` |
| `width` | `"narrow" \| "medium" \| "wide" \| "fullscreen"` | Panel width | `"medium"` |
| `animation` | `"slide" \| "fade" \| "scale" \| "none"` | Open/close animation | `"slide"` |
| `animationDuration` | `number` | Duration in ms | `260` |
| `trigger` | `"button" \| "floating" \| "auto" \| "external"` | How the drawer opens | `"button"` |
| `triggerLabel` | `BilingualString` | Trigger button label | `{ ar: "القائمة", en: "Menu" }` |
| `triggerIcon` | `"menu" \| "filter" \| "cart" \| "user" \| "panel" \| "none"` | Icon on trigger | `"menu"` |
| `overlay` | `boolean` | Show backdrop overlay | `true` |
| `overlayOpacity` | `number` | Overlay opacity 0–100 | `50` |
| `closeOnOverlayClick` | `boolean` | Close when overlay clicked | `true` |
| `closeOnEsc` | `boolean` | Close on Escape key | `true` |
| `showCloseButton` | `boolean` | Show × button | `true` |
| `startOpen` | `boolean` | Open on page load | `false` |
| `visible` | `boolean` | Enable/disable entirely | `true` |
| `showOnMobile` | `boolean` | Show on mobile | `true` |
| `showOnDesktop` | `boolean` | Show on desktop | `true` |
| `links` | `DrawerLink[]` | Navigation links `[{ label: BilingualString, link: LinkValue }]` | 3 default links |
| `items` | `Slot` | Custom content slot | starter text |

### JSON Example

```json
{
  "type": "SideDrawer",
  "props": {
    "name": "main-menu",
    "title": { "ar": "القائمة الرئيسية", "en": "Main Menu" },
    "showTitle": true,
    "side": "left",
    "width": "medium",
    "animation": "slide",
    "animationDuration": 260,
    "trigger": "external",
    "triggerLabel": { "ar": "القائمة", "en": "Menu" },
    "triggerIcon": "menu",
    "overlay": true,
    "overlayOpacity": 50,
    "closeOnOverlayClick": true,
    "closeOnEsc": true,
    "showCloseButton": true,
    "startOpen": false,
    "visible": true,
    "showOnMobile": true,
    "showOnDesktop": true,
    "links": [
      { "label": { "ar": "الرئيسية", "en": "Home" }, "link": { "kind": "page", "pageId": "/" } },
      { "label": { "ar": "المنتجات", "en": "Products" }, "link": { "kind": "page", "pageId": "/products" } }
    ],
    "items": []
  }
}
```

---

## SiteDrawerShell

**Label:** درج جانبي  
**Description:** Site-level drawer shell (singleton). Configures the global side-navigation drawer registered in the site layout. Cannot be inserted, duplicated, or deleted by users.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `name` | `string` | Drawer identifier | `"site-drawer"` |
| `enabled` | `boolean` | Enable/disable | `true` |
| `side` | `"left" \| "right"` | Docked edge | `"left"` |
| `widthPx` | `number` | Width in px (200–720) | `320` |
| `animation` | `"slide" \| "fade" \| "scale" \| "none"` | Animation type | `"slide"` |
| `animationDurationMs` | `number` | Duration in ms | `260` |
| `trigger` | `"external" \| "floating" \| "auto" \| "none"` | Open trigger | `"external"` |
| `triggerLabel` | `string` | Button label (EN) | `"Menu"` |
| `triggerLabelAr` | `string` | Button label (AR) | `"القائمة"` |
| `triggerIcon` | `"menu" \| "filter" \| "cart" \| "user" \| "panel" \| "none"` | Trigger icon | `"menu"` |
| `title` | `string` | Title (EN) | `"Menu"` |
| `titleAr` | `string` | Title (AR) | `"القائمة"` |
| `showTitle` | `boolean` | Show title | `true` |
| `links` | `SiteDrawerLink[]` | `[{ label, labelAr, link }]` | default links |
| `backgroundColor` | `string` | Panel background color | `"#ffffff"` |
| `textColor` | `string` | Text color | `"#111827"` |
| `accentColor` | `string` | Hover/link accent | `"#2563eb"` |
| `triggerBackgroundColor` | `string` | Trigger button bg | `"#ffffff"` |
| `triggerTextColor` | `string` | Trigger button text | `"#111827"` |
| `overlay` | `boolean` | Show backdrop | `true` |
| `overlayOpacityPercent` | `number` | Overlay opacity 0–100 | `50` |
| `closeOnOverlayClick` | `boolean` | Close on backdrop click | `true` |
| `closeOnEsc` | `boolean` | Close on Escape | `true` |
| `showCloseButton` | `boolean` | Show × button | `true` |
| `startOpen` | `boolean` | Open on load | `false` |
| `showOnMobile` | `boolean` | Show on mobile | `true` |
| `showOnDesktop` | `boolean` | Show on desktop | `true` |
| `openOnEdgeHover` | `boolean` | Open when mouse hovers edge | `true` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |

### JSON Example

```json
{
  "type": "SiteDrawerShell",
  "props": {
    "name": "site-drawer",
    "enabled": true,
    "side": "left",
    "widthPx": 320,
    "animation": "slide",
    "animationDurationMs": 260,
    "trigger": "external",
    "triggerLabel": "Menu",
    "triggerLabelAr": "القائمة",
    "triggerIcon": "menu",
    "title": "Menu",
    "titleAr": "القائمة",
    "showTitle": true,
    "links": [
      { "label": "Home", "labelAr": "الرئيسية", "link": { "kind": "page", "pageId": "/" } },
      { "label": "Shop", "labelAr": "المتجر", "link": { "kind": "page", "pageId": "/products" } }
    ],
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "accentColor": "#2563eb",
    "triggerBackgroundColor": "#ffffff",
    "triggerTextColor": "#111827",
    "overlay": true,
    "overlayOpacityPercent": 50,
    "closeOnOverlayClick": true,
    "closeOnEsc": true,
    "showCloseButton": true,
    "startOpen": false,
    "showOnMobile": true,
    "showOnDesktop": true,
    "openOnEdgeHover": true,
    "language": "ar"
  }
}
```

---

## SiteFooter

**Label:** تذييل الموقع  
**Description:** Site-level footer with brand title, tagline, link columns, bottom bar, and color overrides.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `string` | Brand name in footer | `""` |
| `variant` | `"commerce" \| "default"` | Layout style | `"commerce"` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |
| `visible` | `boolean` | Show/hide footer | `true` |
| `tagline` | `string` | Tagline (EN) | `""` |
| `taglineAr` | `string` | Tagline (AR) | `""` |
| `showBottomBar` | `boolean` | Show bottom bar | `true` |
| `bottomBarText` | `string` | Bottom bar text (EN) | `""` |
| `bottomBarTextAr` | `string` | Bottom bar text (AR) | `""` |
| `columns` | `FooterColumn[]` | Link columns `[{ title, titleAr, links[] }]` | default columns |
| `columns[].title` | `string` | Column title (EN) | — |
| `columns[].titleAr` | `string` | Column title (AR) | — |
| `columns[].links` | `FooterLinkData[]` | `[{ label, labelAr, link }]` | — |
| `bottomLinks` | `FooterLinkData[]` | Bottom bar links | default links |
| `backgroundColor` | `string` | Background color (empty = theme) | `""` |
| `textColor` | `string` | Text color (empty = theme) | `""` |

### JSON Example

```json
{
  "type": "SiteFooter",
  "props": {
    "title": "متجري",
    "variant": "commerce",
    "language": "ar",
    "visible": true,
    "tagline": "Your one-stop shop.",
    "taglineAr": "متجرك الشامل.",
    "showBottomBar": true,
    "bottomBarText": "© 2026 Meridian",
    "bottomBarTextAr": "© ٢٠٢٦ متجري",
    "columns": [
      {
        "title": "Shop",
        "titleAr": "التسوق",
        "links": [
          { "label": "Products", "labelAr": "المنتجات", "link": { "kind": "page", "pageId": "/products" } }
        ]
      }
    ],
    "bottomLinks": [
      { "label": "Privacy", "labelAr": "الخصوصية", "link": { "kind": "page", "pageId": "/privacy" } }
    ],
    "backgroundColor": "",
    "textColor": ""
  }
}
```

---

## SiteHeader

**Label:** رأس الموقع  
**Description:** Site-level header with brand title, navigation links, color overrides, and optional drawer toggle button.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `title` | `string` | Brand/site title | `""` |
| `variant` | `"commerce" \| "default"` | Layout style | `"commerce"` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |
| `visible` | `boolean` | Show/hide header | `true` |
| `brandHref` | `string` | Brand logo/title link | `"/"` |
| `links` | `HeaderLink[]` | Nav links `[{ label, labelAr, link }]` | default links |
| `backgroundColor` | `string` | Background color (empty = theme) | `""` |
| `textColor` | `string` | Text color (empty = theme) | `""` |
| `showDrawerButton` | `boolean` | Show hamburger button | `false` |
| `drawerButtonIcon` | `"menu" \| "filter" \| "cart" \| "user" \| "none"` | Icon type | `"menu"` |
| `drawerName` | `string` | Target drawer name | `"site-drawer"` |

### JSON Example

```json
{
  "type": "SiteHeader",
  "props": {
    "title": "متجري",
    "variant": "commerce",
    "language": "ar",
    "visible": true,
    "brandHref": "/",
    "links": [
      { "label": "Home", "labelAr": "الرئيسية", "link": { "kind": "page", "pageId": "/" } },
      { "label": "Products", "labelAr": "المنتجات", "link": { "kind": "page", "pageId": "/products" } },
      { "label": "Cart", "labelAr": "السلة", "link": { "kind": "page", "pageId": "/cart" } }
    ],
    "backgroundColor": "",
    "textColor": "",
    "showDrawerButton": true,
    "drawerButtonIcon": "menu",
    "drawerName": "site-drawer"
  }
}
```

---

## Space

**Label:** فراغ  
**Description:** An empty vertical spacer block with configurable height.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `size` | `string` | `"theme-24"` or pixel value like `"32"` | `"theme-24"` |

### JSON Example

```json
{
  "type": "Space",
  "props": {
    "size": "theme-40"
  }
}
```

---

## Stats

**Label:** Stats  
**Description:** A horizontal strip of statistic numbers with labels.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `items` | `StatItem[]` | Array of stats | `[{ title: "Stat", description: "1,000" }]` |
| `items[].title` | `string` | Stat label (e.g. "العملاء") | `"Stat"` |
| `items[].description` | `string` | Stat value (e.g. "١٢,٠٠٠") | `"1,000"` |

### JSON Example

```json
{
  "type": "Stats",
  "props": {
    "items": [
      { "title": "العملاء", "description": "+١٠,٠٠٠" },
      { "title": "المنتجات", "description": "٥٠٠+" },
      { "title": "التقييم", "description": "٤.٩/٥" }
    ]
  }
}
```

---

## Template

**Label:** Template  
**Description:** A slot-based container that can be pre-populated from saved templates (stored in `localStorage`). Useful for reusable section patterns.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `template` | `string` | Template key (`"blank"`, `"example_1"`, `"example_2"`, or saved key) | `"example_1"` |
| `children` | `Slot` | Inner blocks (populated by selected template) | `[]` |

### JSON Example

```json
{
  "type": "Template",
  "props": {
    "template": "example_1",
    "children": []
  }
}
```

---

## Testimonials

**Label:** آراء العملاء  
**Description:** Customer review cards in grid, carousel, or minimal layout. Supports inline or CMS data sources, bilingual names.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `source` | `"inline" \| "cms"` | Data source | `"inline"` |
| `layoutVariant` | `"grid" \| "carousel" \| "minimal"` | Display layout | `"grid"` |
| `columns` | `2 \| 3` | Columns in grid | `3` |
| `language` | `"ar" \| "en"` | Display language | `"ar"` |
| `showRating` | `boolean` | Show star rating | `true` |
| `showAvatars` | `boolean` | Show avatar images | `true` |
| `itemCount` | `number` | Max items shown (1–12) | `3` |
| `inlineItems` | `Testimonial[]` | Inline testimonials array | sample data |
| `inlineItems[].id` | `string` | Unique id | `""` |
| `inlineItems[].name` | `string` | Author name (EN) | `""` |
| `inlineItems[].nameAr` | `string` | Author name (AR) | `""` |
| `inlineItems[].role` | `string` | Role/title (EN) | `""` |
| `inlineItems[].roleAr` | `string` | Role/title (AR) | `""` |
| `inlineItems[].avatar` | `string` | Avatar image URL | `""` |
| `inlineItems[].rating` | `1…5` | Star rating | `5` |
| `inlineItems[].text` | `string` | Quote text (EN) | `""` |
| `inlineItems[].textAr` | `string` | Quote text (AR) | `""` |

### JSON Example

```json
{
  "type": "Testimonials",
  "props": {
    "source": "inline",
    "layoutVariant": "grid",
    "columns": 3,
    "language": "ar",
    "showRating": true,
    "showAvatars": true,
    "itemCount": 3,
    "inlineItems": [
      {
        "id": "t1",
        "name": "Ahmed Ali",
        "nameAr": "أحمد علي",
        "role": "Customer",
        "roleAr": "عميل",
        "avatar": "",
        "rating": 5,
        "text": "Great products!",
        "textAr": "منتجات رائعة!"
      }
    ]
  }
}
```

---

## Text

**Label:** نص  
**Description:** A `<span>` text block with alignment, font, size, weight, and color customisation.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `text` | `string` | Text content | `"نص"` |
| `align` | `"left" \| "center" \| "right"` | Text alignment | `"right"` |
| `fontFamily` | `"body" \| "option1" \| "option2"` | Font family | `"body"` |
| `fontSize` | `string` | `"theme-md"` or pixel value | `"theme-md"` |
| `fontWeight` | `string` | `"theme-light"` or numeric | `"theme-light"` |
| `lineHeight` | `string` | `"theme-normal"` or numeric | `"theme-normal"` |
| `color` | `string` | Color token or hex | `"theme-text"` |

### JSON Example

```json
{
  "type": "Text",
  "props": {
    "text": "جميع المنتجات متوفرة للشحن الفوري.",
    "align": "right",
    "fontFamily": "body",
    "fontSize": "theme-sm",
    "fontWeight": "theme-light",
    "lineHeight": "theme-normal",
    "color": "theme-neutral"
  }
}
```

---

## VideoEmbed

**Label:** فيديو  
**Description:** Embeds a YouTube video with alignment, size, and corner radius.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `src` | `string` | YouTube URL (watch or short URL) | `"https://www.youtube.com/watch?v=dQw4w9WgXcQ"` |
| `align` | `"left" \| "center" \| "right"` | Horizontal alignment | `"center"` |
| `size` | `string` | Height: `"theme-315"`, `"theme-480"`, etc. or pixel value | `"theme-315"` |
| `radius` | `string` | Border radius | `"theme-md"` |

### JSON Example

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

---

## Wishlist

**Label:** Wishlist  
**Description:** Displays the authenticated customer's saved (wishlisted) products. Data is bound at render time.

### Properties

| Property | Type | Values / Notes | Default |
|---|---|---|---|
| `columns` | `2 \| 3 \| 4` | Number of grid columns | `3` |
| `gap` | `"sm" \| "md" \| "lg"` | Gap between cards | `"md"` |
| `currency` | `"SYP" \| "USD" \| "EUR"` | Price currency | `"SYP"` |
| `showAddToCart` | `boolean` | Show add-to-cart button | `true` |
| `ctaLabel` | `string` | Add-to-cart button text | `"Add to cart"` |
| `emptyStateText` | `string` | Message when wishlist is empty | `"Your wishlist is empty."` |

### JSON Example

```json
{
  "type": "Wishlist",
  "props": {
    "columns": 3,
    "gap": "md",
    "currency": "USD",
    "showAddToCart": true,
    "ctaLabel": "أضف للسلة",
    "emptyStateText": "قائمة المفضلة فارغة."
  }
}
```

---

## Shared Concepts

### LinkValue

Used by `Button`, `ContentButton`, `NavMenu`, `SideDrawer`, `SiteHeader`, `SiteFooter`, `SiteDrawerShell`, etc.

```json
{ "kind": "page", "pageId": "/products" }
{ "kind": "url", "url": "https://external.com", "target": "_blank" }
{ "kind": "anchor", "hash": "features" }
{ "kind": "none" }
```

### BilingualString

Used where text appears in both Arabic and English:

```json
{ "ar": "العربية", "en": "English" }
```

### Theme Tokens

Many color and size fields accept `"theme-*"` tokens which resolve to CSS variables defined in the active theme:

| Token type | Examples |
|---|---|
| Color | `"theme-primary"`, `"theme-text"`, `"theme-surface"`, `"theme-neutral"` |
| Size (font) | `"theme-sm"`, `"theme-md"`, `"theme-lg"`, `"theme-xl"` |
| Font weight | `"theme-light"`, `"theme-normal"`, `"theme-semibold"`, `"theme-bold"` |
| Radius | `"theme-sm"`, `"theme-md"`, `"theme-lg"`, `"theme-full"` |
| Space | `"theme-8"`, `"theme-16"`, `"theme-24"`, `"theme-40"` |
