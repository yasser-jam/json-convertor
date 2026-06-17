# 15 — Data and API Binding

Maps web mock fixtures ([docs/blocks.md §7](../../BLOCKS.md)) to mobile live API bindings.

---

## Web fixture vs mobile API

| Web (demo) | Mobile (production) |
|------------|---------------------|
| `prod-001` product id | `item.id` from `/api/v1/public/products` |
| `product.title` | `item.name` |
| `product.image` | `item.image` or `item.primaryImageUrl` |
| `product.price` (USD number) | `item.price` (formatted by engine) |
| `MockCartLine` | `cart.items` via CartCubit |
| `sampleOrders` | `/api/v1/customer/orders` |

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
| Category products | `/api/v1/public/categories/:categorySlug/products?page=0&size=20` | `category-products` |
| Product detail | `/api/v1/public/products/:productId?include=PRICING,IMAGES,VARIANTS,CATEGORIES,TAGS` | `product-detail` |
| Search | `/api/v1/public/products/search?q={query}&page=0&size=20` | `search-results` |
| Categories | `/api/v1/public/categories` | `category-list` |
| Autocomplete | `/api/v1/public/products/autocomplete?q={query}` | `search-autocomplete` |
| Payment methods | `/api/v1/public/payments/methods` | `payment-methods` |

**Never use:** `/api/v1/products`, `/api/v1/auth/otp/*`

---

## Collection `props.data` shape

```json
{
  "source": "collection",
  "id": "unique-collection-id",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/products?page=0&size=20",
  "page": 0,
  "size": 20
}
```

Rules:
- `requestKey` must match `itemBuilder.source` path segment
- `id` unique per node on page
- Pagination: increment `page` on load-more if implemented

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

## Web collection filter

Web ProductGrid `collection: "Summer 2025"` → append query or client filter:

**Option A:** `requestUrl` with collection query param if API supports it.

**Option B:** `requestKey: product-list` + filter in cubit (engine must support — **gap**).

Default converter: fetch all products with max `size: maxProducts`.

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
2. `routeParams` on detail page load

Web `/products/:product-slug` → use slug as `:productId` if API accepts slug in path.

---

## Auth-required requests

| Endpoint | Auth |
|----------|------|
| `/api/v1/public/*` | Tenant header only |
| `/api/v1/customer/orders` | Bearer token |
| `/api/v1/customer/auth/otp/*` | Public OTP endpoints |

Converted taps to my-orders: `requireAuth: true`.
