# 07 — Shared Fields

Maps web shared field helpers ([docs/BLOCKS.md](../../BLOCKS.md) Shared Concepts) to mobile node props and `tap` actions.

---

## ProductPickerRef

Used by `ProductCard`, `ProductImage`, `ProductInfo`:

```json
{ "id": "prod_01", "titleAr": "قميص", "titleEn": "Shirt" }
```

| Web | Mobile |
|-----|--------|
| `id` | route param `:productId`, `cubitCall` params |
| `titleAr` / `titleEn` | static fallback `text.value` when API not loaded |
| embedded `price` etc. | **Ignore** — not part of picker ref; use API |

---

## CollectionPickerRef

Used by `ProductsGrid`:

```json
{ "id": "coll_featured", "name": "Featured", "productCount": 24 }
```

| Web | Mobile |
|-----|--------|
| `id` | `data.collection`, query filter on `requestUrl` |
| `name` | documentation / warning context only |
| `productCount` | default `data.size` cap when `maxRows` is `"0"` |
| legacy string `"featured"` | normalize to `{ "id": "featured" }` |

---

## Resource metadata (read-only)

Auto-populated in `store_config.json` when product/collection is selected.

### ProductCard — `ProductResourceMetadata`

```json
{
  "type": "product",
  "method": "get",
  "id": "prod_01",
  "apiUrl": "https://api.example.com/admin/products/prod_01?include=PRICING&include=IMAGES&include=INVENTORY"
}
```

| Web | Mobile |
|-----|--------|
| `metadata.apiUrl` | rewrite to relative path under `app.apiBaseUrl` for optional prefetch |
| `metadata.id` | must match `product.id` |

### ProductsGrid — `ProductsGridResourceMetadata`

```json
{
  "type": "collection",
  "method": "get",
  "collectionId": "coll_featured",
  "productCount": 24,
  "apiUrl": "https://api.example.com/admin/collections/coll_featured/products?page=0&size=100"
}
```

| Web | Mobile |
|-----|--------|
| `metadata.apiUrl` | **Primary** source for `gridView.props.data.requestUrl` |
| `metadata.collectionId` | must match `collection.id` |
| `metadata.productCount` | informs `data.size` when `maxRows` unset |

**Rule:** Never embed full product payloads in mobile JSON — bind at render time via `data` + `valuePath`.

---

## Color triple

Web blocks use `colorMode`, `colorTheme`, `colorFixed`.

| Web | Mobile |
|-----|--------|
| `colorMode: "theme"` + `colorTheme: "primary"` | `props.color: theme.colors.primary` (resolved hex at convert time) |
| `colorMode: "fixed"` + `colorFixed: "#..."` | `props.color: "#..."` |
| Text on colored background | Set `props.color` on `text` for foreground; container `props.color` for background |

Resolver reference: web `resolveContentColor(mode, theme, fixed)` → emit literal hex in mobile JSON.

### ColorKey map

| Web `colorTheme` | Mobile `theme.colors` key |
|------------------|---------------------------|
| `primary` | `primary` |
| `surface` | `surface` |
| `success` | `success` |
| `warning` | `warning` |
| `error` | `error` |
| `dark` | derive from `text` or `#10213a` |
| `text` | `text` |
| `neutral` | `muted` |

---

## Typography steps

Web block typography (theme/fixed mode):

| Web text size | Mobile `fontSize` (px) |
|---------------|------------------------|
| `xs` | 12 |
| `sm` | 14 |
| `md` | 16 |
| `lg` | 18 |
| `xl` | 22 |
| `2xl` | 28 |

| Web weight | Mobile `fontWeight` |
|------------|---------------------|
| `normal` | `"normal"` or 400 |
| `medium` | `"medium"` or 500 |
| `semibold` | `"semibold"` if supported else `"medium"` |
| `bold` | `"bold"` or 700 |

| Web `fontFamily` | Mobile |
|------------------|--------|
| `body` | theme `fontFamily` |
| `option1` | omit or custom if engine adds font slot |
| `option2` | omit or custom |

---

## Link object (LinkValue)

Used by `Button`, `ContentButton`, `NavMenu`, shell blocks, drawers.

| Web sub-field | Mobile |
|---------------|--------|
| `kind: "page"` + `pageId` | `tap.navigate.route` after [05-navigation-and-routes.md](05-navigation-and-routes.md) |
| `kind: "url"` + `url` | External: `tap.type: "openUrl"`, `url`; in-app path: `navigate` |
| `kind: "anchor"` + `hash` | **Gap:** map to route with fragment or omit |
| `kind: "none"` | omit `tap` |
| `target: "_blank"` | `openUrl` |
| legacy `href` string | `navigate` when path-like, else `openUrl` |

**Precedence:** `link` object > `href` > `buttonAction` defaults.

---

## Button actions

| Web `buttonAction` | Mobile `tap` |
|--------------------|--------------|
| `link` | `{ "type": "navigate", "route": "...", "navigation_type": "push" }` |
| `login` | `{ "type": "navigate", "route": "/auth/login", "navigation_type": "push" }` |
| `logout` | `{ "type": "cubitCall", "cubit": "auth", "method": "logout", "onSuccess": { "type": "navigate", "route": "/auth/login", "navigation_type": "go" } }` |
| `addToCart` | `{ "type": "cubitCall", "cubit": "cart", "method": "addItem", "params": { ... } }` — see [blocks/11-commerce-blocks.md](blocks/11-commerce-blocks.md) |
| `addToWishlist` | **Gap:** `navigate` to `/wishlist` or noop + message until wishlist cubit exists |

### Button variant / size

| Web `variant` | Mobile `button.props.variant` |
|---------------|--------------------------------|
| `primary` | `"elevated"` |
| `secondary` | `"outlined"` |
| `outline` | `"outlined"` |
| `ghost` | `"text"` |
| `danger` | `"filled"` + `color: theme.colors.error` (resolved hex) |

| Web `size` | Mobile height from `theme.buttons.{sm,md,lg}` |
|------------|-----------------------------------------------|
| `fullWidth: "on"` | `fullWidth: true` on button |

---

## YouTube URL

**Hard rule:** YouTube URLs are **NOT** supported by `videoPlayer`. The mobile engine uses the Flutter `video_player` package (MP4/HLS streams only). YouTube iframes are blocked.

For any YouTube URL (`youtube.com/watch?v=ID`, `youtu.be/ID`, `/shorts/ID`):

1. Extract `videoId` from the URL
2. Emit `image` node with `url: "https://img.youtube.com/vi/{videoId}/hqdefault.jpg"`, `source: "network"`, `aspectRatio: 1.777`, `fit: "cover"`
3. Add node-level `tap: { "type": "openUrl", "url": "<original YouTube URL>" }`

For MP4/HLS direct URLs only, use `videoPlayer` with `props.url`.

---

## Bilingual labels

| Web field | When `language: "ar"` |
|-----------|----------------------|
| `label` + `labelAr` | `props.label` = `labelAr` if non-empty else `label` |
| Same for `titleAr`, `messageAr`, `placeholderAr` | Apply to corresponding mobile text props |

---

## Text color modes (Text block)

| Web `color: "default"` | `props.color: theme.colors.text` |
| Web `color: "muted"` | `props.color: theme.colors.muted` |

---

## Theme tokens

Many fields accept `"theme-*"` tokens — resolve at convert time to px/hex from `root.props` + theme scales.

| Token family | Examples | Mobile |
|--------------|----------|--------|
| Color | `theme-primary`, `theme-text`, `theme-neutral` | `theme.colors.*` |
| Font size | `theme-sm` … `theme-xl` | numeric `fontSize` |
| Font weight | `theme-light`, `theme-bold` | `fontWeight` |
| Radius | `theme-sm`, `theme-md`, `theme-none`, `theme-full` | `borderRadius` px (`theme-none` → `0`) |
| Space | `theme-8`, `theme-16`, `theme-24`, `theme-40` | padding/gap px |

---

## Rich text (TipTap HTML)

Policy for `Heading`, `Text`, `ContentParagraph`, `Hero.description`, `Card.description`, `RichText`:

1. Strip scripts and unsafe tags
2. If only `<p>`, `<strong>`, `<em>`, `<a>` → `richtext` with simplified spans
3. Else → plain `text` with HTML stripped

**Gap:** Complex web typography in richtext — best-effort only.
