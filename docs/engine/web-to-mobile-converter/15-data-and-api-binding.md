# 15 — Data and API Binding

Maps web `store_config.json` bindings ([docs/BLOCKS.md](../../BLOCKS.md) Shared Concepts) to mobile live API bindings.

---

## Web fixture vs mobile API

| Web (demo / picker) | Mobile (production) |
|---------------------|---------------------|
| `product.id` from `ProductPickerRef` | `item.id` from list API |
| `product.titleAr` | static fallback; live `item.name` |
| `metadata.apiUrl` on ProductCard / ProductsGrid | **Primary** `requestUrl` source |
| `MockCartLine` | `cart.items` via CartCubit |
| `sampleOrders` | `/api/v1/customer/orders` |

---

## Resource metadata → requestUrl

When `props.metadata.apiUrl` is present, normalize it for mobile:

1. Parse URL path + query from `metadata.apiUrl` (may be absolute admin host).
2. Strip host; keep path starting with `/api/...`.
3. Rewrite admin paths to public mobile paths when needed:
   - `/admin/products/:id` → `/api/v1/public/products/:id`
   - `/admin/collections/:id/products` → `/api/v1/public/collections/:id/products`
4. Set `props.data.requestUrl` to relative path; `app.apiBaseUrl` supplies host.

| Metadata type | `requestKey` suggestion |
|---------------|-------------------------|
| `product` | `product-detail` (prefetch) or omit on card — navigate only |
| `collection` | `product-list` |

**Never** embed product arrays in mobile JSON.

---

## CollectionPickerRef binding

| Web | Mobile `data` |
|-----|---------------|
| `collection: { id: "coll_featured" }` | `collection: "coll_featured"` |
| `metadata.apiUrl` | `requestUrl` (normalized) |
| `metadata.productCount` | default `size` when `maxRows` is `"0"` |
| `maxRows: "2"` + `columns: "2"` | `size: 4` |
| legacy `collection: "featured"` (string) | `collection: "featured"` + default public list URL |

---

## Field path map

| Web / fixture field | Mobile `valuePath` / `urlPath` |
|---------------------|--------------------------------|
| Product title | `item.name` |
| Product description | `item.description` |
| Product image | `item.image` or `item.primaryImageUrl` |
| Product price | `item.price` |
| Product slug | `item.slug` → route param `:productId` |
| Category names | `item.categories` (array — may need join in text) |
| Discount % | `item.discountPercent` if API provides |

Detail page (`product-detail` request):

| API field | valuePath |
|-----------|-----------|
| Name | `dataContext.requests.product-detail.data.name` |
| Images array | `imagesPath` on `imageSlider` |
| Variants | `dropdown.itemsPath` |

---

## Standard requestUrl paths

| Use case | `requestUrl` | `requestKey` |
|----------|--------------|--------------|
| Product grid | `/api/v1/public/products?page=0&size=20` | `product-list` |
| Collection products | from `metadata.apiUrl` or `/api/v1/public/collections/:collectionId/products?page=0&size=20` | `product-list` |
| Category products | `/api/v1/public/categories/:categorySlug/products?page=0&size=20` | `category-products` |
| Product detail | `/api/v1/public/products/:productId?include=PRICING,IMAGES,VARIANTS,CATEGORIES,TAGS` | `product-detail` |
| Search | `/api/v1/public/products/search?q={query}&page=0&size=20` | `search-results` |
| Categories | `/api/v1/public/categories` | `category-list` |
| Payment methods | `/api/v1/public/payments/methods` | `payment-methods` |

**Never use:** `/api/v1/products`, `/api/v1/auth/otp/*`

---

## Collection `props.data` shape

```json
{
  "source": "collection",
  "id": "unique-collection-id",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=8",
  "page": 0,
  "size": 8,
  "collection": "coll_featured"
}
```

Rules:
- `requestKey` must match `itemBuilder.source` path segment
- `id` unique per node on page
- Prefer `metadata.apiUrl` over guessed URLs

---

## itemBuilder.repeat sources

| Data source | `source` string |
|-------------|-----------------|
| Product list cubit | `dataContext.requests.product-list.data` |
| Cart lines | `cart.items` |
| Order lines | `dataContext.requests.order-detail.data.lines` or cubit path |
| Static array (testimonials) | omit repeat — use static `children` |

---

## Cubit data bindings (commerce)

| Cubit | Context paths |
|-------|---------------|
| `cart` | `cart.items`, `cart.subtotal`, `cart.itemCount` |
| `checkout` | `checkout.draft.*`, `checkout.lastOrder.*` |
| `order` | `dataContext.requests.my-orders.data` |

See builder-specs 20–22.

---

## Route param binding

Navigate tap:

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

Engine resolves `:productId` from:
1. `item.id` in repeat context
2. `ProductPickerRef.id` on static ProductCard
3. `routeParams` on detail page load

---

## Auth-required requests

| Endpoint | Auth |
|----------|------|
| `/api/v1/public/*` | Tenant header only |
| `/api/v1/customer/orders` | Bearer token |
| Wishlist endpoints | Bearer token |

Converted taps to my-orders: `requireAuth: true`.
