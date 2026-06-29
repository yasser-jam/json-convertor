# 03 — Global Engine Rules

**Strict rules every conversion step must obey.** Violations cause parse failures, layout overflow, or runtime errors.

References: [LAYOUT_CONSTRAINT_AUDIT.md](../LAYOUT_CONSTRAINT_AUDIT.md), [docs/ai/03-engine.md](../../ai/03-engine.md), [AGENTS.md](../../../AGENTS.md).

---

## 1. Node shape

| Rule | Detail |
|------|--------|
| G-01 | Every node has `id` (string), `type` (string), `props` (object) |
| G-02 | Never set both `child` and `children` on the same node |
| G-03 | `children` must be a JSON array of objects |
| G-04 | `type` selects renderer — **never** use `semanticType` as dispatch key |
| G-05 | `semanticType` is optional metadata (e.g. `"ProductList"`) for documentation only |
| G-06 | Do not nest arbitrary objects inside `props` except documented `data`, `tap` sub-shapes |
| G-07 | Never author `button.onTap` in JSON — use node-level `tap` |
| G-08 | Never use removed `type: "spacer"` — use `gap`, `sizedBox`, or `mainAxisAlignment` |

---

## 2. ID generation

Algorithm (deterministic per conversion run):

```
mobileId(webBlock) =
  slugify(webBlock.props.id ?? webBlock.type) + "-" + counter++
```

| Rule | Detail |
|------|--------|
| G-09 | IDs unique within a page |
| G-10 | Prefer retaining web `props.id` when valid (alphanumeric + hyphen) |
| G-11 | Prefix with mobile type when collision: `gridView-products-grid` |
| G-12 | Page id: `page-{routeSlug}` where `/product/details/:id` → `page-product-details` |

Reset counter at each page boundary.

---

## 3. Page scroll contract

| Rule | When | Setting |
|------|------|---------|
| G-13 | Default catalog / home / long content | `pages[].scroll: "vertical"` |
| G-14 | List/grid on catalog pages | `gridView` / `listView` with `enableInnerScroll: false` |
| G-15 | Short auth / static forms | `scroll: "none"` + short `body[]` |
| G-16 | Full-screen centered splash | `scroll: "none"` + `layout: "centered"` |
| G-17 | Never nest `singleChildScrollView` under page vertical scroll | Omit inner scroll wrapper |

### Overflow errors to avoid

| Code | Condition | Fix |
|------|-----------|-----|
| `viewport_center_without_expand` | `column` + `mainAxisSize: max` + `mainAxisAlignment: center` under `scroll: vertical` without expand child | Add `container.expand` or use `layout: centered` |
| `static_page_overflow_risk` | `scroll: none` + tall unscrollable body | Add inner scroll or shorten body |

---

## 4. Flex layout

| Rule | Detail |
|------|--------|
| G-18 | `column` default `mainAxisSize: min`; `row` default `mainAxisSize: max` |
| G-19 | Uniform sibling spacing: parent `props.gap` (no per-child skip) |
| G-20 | Push to edges: `mainAxisAlignment: "spaceBetween"` or `container` with `expand: true` |
| G-21 | Row child that should fill width: wrap in `container` with `expand: true`, `expandAxis: "horizontal"` |
| G-22 | Map web flex alignment to mobile `mainAxis` / `crossAxis` — see [blocks/09-layout-blocks.md](blocks/09-layout-blocks.md) |

### Alignment enum map

| Web (`alignItems` / `justifyContent`) | Mobile (`crossAxis` / `mainAxis`) |
|---------------------------------------|-------------------------------------|
| `flex-start`, `start` | `start` |
| `center` | `center` |
| `flex-end`, `end` | `end` |
| `stretch` | `stretch` |
| `space-between`, `spaceBetween` | `spaceBetween` |
| `space-around` | `spaceAround` |
| `space-evenly` | `spaceEvenly` |

---

## 5. Style vs props

| Rule | Detail |
|------|--------|
| G-23 | Put padding/margin in `style.padding` / `style.margin` when using box model |
| G-24 | Background on containers: `style.color` or `props.color` (hex) — **not** misnamed fields |
| G-25 | Parse web `"32px"` → numeric `32` for mobile padding where renderer expects numbers |
| G-26 | Border radius: map web steps (`sm`, `md`, …) to theme radius px or literal int |

---

## 6. Actions (`tap`)

Supported `tap.type` values:

| Type | Use |
|------|-----|
| `navigate` | In-app routes |
| `cubitCall` | Auth, cart, checkout, order |
| `openUrl` | External HTTP(S) |
| `openContact` | WhatsApp, tel, sms, email |
| `openDrawer` / `closeDrawer` | App drawer |
| `apiCall` | Direct HTTP (rare; prefer collection `data`) |

| Rule | Detail |
|------|--------|
| G-27 | `navigate.route` required for navigation |
| G-28 | `navigation_type`: omit/`go` = clear stack; `push` = stack push |
| G-29 | Auth-gated routes: `requireAuth: true` + `onUnauthenticated` tap |
| G-30 | Forms: `requireValidForm: true` + `formId` on submit taps |
| G-31 | Logout: `cubitCall` `cubit: auth`, `method: logout` before navigate |

Full web → mobile action map: [07-shared-fields.md](07-shared-fields.md).

---

## 7. API paths and requests

| Rule | Detail |
|------|--------|
| G-32 | Public catalog: `/api/v1/public/*` — no auth headers |
| G-33 | Customer auth: `/api/v1/customer/auth/otp/*` |
| G-34 | Never use `/api/v1/auth/otp` or bare `/api/v1/products` |
| G-35 | Every collection node needs matching `requestKey` + `requestUrl` in `props.data` |
| G-36 | `requestKey` stable and unique per request shape on a page |

### `requestKey` naming

```
requestKey = kebab-case semantic name
Examples: product-list, product-detail, category-products, search-results
```

Optional derived form: `get-api-v1-public-products` (v0 style) — prefer semantic names matching prod JSON.

### Cubit routing (EngineRequestMapper)

| URL pattern | Cubit |
|-------------|-------|
| `/api/v1/public/products` | ProductCubit |
| `/api/v1/public/products/search` | ProductSearchCubit |
| `/api/v1/public/products/{slug}` | ProductDetailCubit |
| `/api/v1/public/categories` | CategoryCubit |

Full table: [15-data-and-api-binding.md](15-data-and-api-binding.md).

---

## 8. Locale and copy

| Rule | Detail |
|------|--------|
| G-37 | When `root.props.language === "ar"`, prefer `labelAr`, `titleAr`, `messageAr` over English |
| G-38 | When `root.props.direction === "rtl"`, default `textAlign: "right"` on text nodes |
| G-39 | Phone / OTP fields: `textDirection: "ltr"` regardless of page direction |
| G-40 | Currency display uses mobile formatter (SYP default from web `currency`) |

---

## 9. Canonical patterns (copy from prod)

When decomposing commerce/catalog UI, **copy subtree shapes** from [mobile_production_v2.json](../../../assets/config/mobile_production_v2.json):

| Pattern | Approx location | Nodes |
|---------|-----------------|-------|
| Product grid | `pages[].route == "/products"` | `gridView` + `itemBuilder.repeat` + `card` → `column` → `image` + `text` |
| Product detail CTA | `/product/details/:productId` | `button` + `cubitCall cart` or `navigate` |
| Cart line list | `/cart` | `repeat` source `cart.items` |
| Checkout wizard | `/checkout/*` | Multi-page + `cubit: checkout` |

---

## 10. Forbidden patterns

| Don't | Do instead |
|-------|------------|
| Hardcode API URLs in converter output per tenant | Use relative `requestUrl`; `apiBaseUrl` in `app` |
| `if (tenantSlug == 'x')` branches | Same rules for all merchants |
| Per-merchant Dart screens | JSON-only pages |
| `ScaffoldMessenger` / SnackBar in JSON | `AppMessenger` via `onSuccess` message actions |
| Fetch in renderers | `data` + cubits |
| `semanticType` as `type` | Primitive `type` + composition |

---

## 11. Validation hook

After conversion, run [16-post-conversion-validation.md](16-post-conversion-validation.md). Debug builds also run `LayoutConstraintValidator` when loading config in app.

---

## 12. Commerce metadata & picker refs

| Rule | Detail |
|------|--------|
| G-41 | When `props.metadata.apiUrl` exists on `ProductCard` or `ProductsGrid`, use it as the **primary** source for `requestUrl` (normalize to relative public path) |
| G-42 | `collection` must be `CollectionPickerRef` object `{ id, name?, productCount? }` — coerce legacy string to `{ id: string }` |
| G-43 | `product` must be `ProductPickerRef` `{ id, titleAr?, titleEn? }` — ignore extra embedded fields (`price`, images) |
| G-44 | Do not persist `metadata` as editable mobile props — copy only resolved `requestUrl` / ids into `data` nodes |
| G-45 | Legacy block types (`Heading`, `Text`, `Button`, …) remain accepted — normalize to `Content*` rules where aliases exist |
