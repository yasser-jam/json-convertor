# 11 — Commerce Blocks

Web commerce blocks ([docs/BLOCKS.md](../../BLOCKS.md) **storeBlocks**) decompose to mobile primitives + **`cubitCall`** / **`data`** bindings.

> **Runtime metadata:** `ProductCard` and `ProductsGrid` persist a read-only `props.metadata` object with `apiUrl`. **Always prefer `metadata.apiUrl`** for `requestUrl` when present — see [15-data-and-api-binding.md](../15-data-and-api-binding.md).

**Required reading:**
- [20-commerce-cart-cubit-call.md](../builder-specs/20-commerce-cart-cubit-call.md)
- [21-commerce-checkout-cubit-call.md](../builder-specs/21-commerce-checkout-cubit-call.md)
- [22-commerce-order-cubit-call.md](../builder-specs/22-commerce-order-cubit-call.md)
- Prod reference: `mobile_production_v2.json` routes `/products`, `/product/details/:productId`, `/cart`, `/checkout/*`

---

## ProductImage (legacy)

Legacy block — still in old `store_config.json`. Registered editor uses `ProductCard` / PDP template instead.

### Decomposition

```
stack (optional badges)
  └── image
```

| Web | Mobile |
|-----|--------|
| `product` (`ProductPickerRef`) | static preview title; live image from API on PDP |
| `aspectRatio`, `width`, `borderRadius` | image props |
| `showBadges` | overlay badge `text` nodes |

---

## ProductCard

### Web contract

| Prop | Notes |
|------|-------|
| `product` | `ProductPickerRef`: `{ id, titleAr?, titleEn? }` |
| `metadata` | **Read-only** `ProductResourceMetadata` with `apiUrl` |
| `variant` | vertical / horizontal / compact / featured |
| `language` | ar / en — pick `titleAr` vs `titleEn` for static fallback |
| `show*` flags | control visible sub-nodes |
| `actionButtonVariant*` | button styling |

### Decomposition

```
card
  └── column
        ├── image (urlPath or static from picker)
        ├── text (title)
        ├── text (price) — from API at runtime when metadata present
        └── optional action row (addToCart, viewDetails, favorite)
```

| Web | Mobile |
|-----|--------|
| `product.id` | route param + `cubitCall` params |
| `metadata.apiUrl` | optional prefetch `data` on detail navigation |
| `variant` vertical/horizontal/compact/featured | `row` vs `column` layout inside card |
| `showAddToCart`, `showViewDetails`, `showFavoriteButton` | omit buttons when false |
| `showVariants` | **Gap:** variants on PDP only, not card |

### Tap

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

### Before / after

**Web:**

```json
{
  "type": "ProductCard",
  "props": {
    "product": { "id": "prod_01", "titleAr": "قميص كلاسيكي", "titleEn": "Classic Shirt" },
    "metadata": {
      "type": "product",
      "method": "get",
      "id": "prod_01",
      "apiUrl": "https://api.example.com/admin/products/prod_01?include=PRICING&include=IMAGES&include=INVENTORY"
    },
    "variant": "vertical",
    "showAddToCart": true
  }
}
```

**Mobile (static preview excerpt):** title from picker; price/image empty until detail fetch — see [fixtures/08-blocks-md-catalog.mobile.json](../fixtures/08-blocks-md-catalog.mobile.json).

---

## ProductsGrid / ProductGrid

**Rule 2.3** — ProductsGrid → `gridView` + collection `data`.

`ProductGrid` is the legacy alias; web catalog type is **`ProductsGrid`**.

### Web contract

| Prop | Type | Default |
|------|------|---------|
| `collection` | `CollectionPickerRef \| null` | `{ id, name, productCount? }` |
| `metadata` | `ProductsGridResourceMetadata \| null` | auto-populated with `apiUrl` |
| `columns` | `"1"`…`"6"` | `"3"` |
| `maxRows` | `"0"`…`"10"` (`"0"` = all) | `"0"` |
| `gap` | sm / md / lg / xl | `md` |
| `cardVariant` | vertical / horizontal / compact / featured | `vertical` |

**Legacy input:** `collection: "featured"` (string) or `collection: "all"` — normalize to `{ id: "<string>" }` and synthesize `requestUrl` without metadata.

### Mobile decomposition

Single `gridView` node — copy prod item template from `page-products` in [mobile_production_v2.json](../../../assets/config/mobile_production_v2.json).

### Prop mapping

| Web | Mobile |
|-----|--------|
| `columns` | `props.crossAxisCount` |
| `gap` | `mainAxisSpacing`, `crossAxisSpacing` via `resolveGridGap` |
| `maxRows` | `data.size` = `columns * maxRows` when `maxRows > 0` |
| `collection.id` | `data.collection` + query param on `requestUrl` |
| `metadata.apiUrl` | **Primary** `requestUrl` (rewrite host to `app.apiBaseUrl` path) |
| `cardVariant` | `itemBuilder` card template layout |
| — | `enableInnerScroll: false` on catalog pages |

### Data block

```json
"data": {
  "source": "collection",
  "id": "products-grid",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/collections/coll_featured/products?page=0&size=8",
  "page": 0,
  "size": 8,
  "collection": "coll_featured"
}
```

When `metadata.apiUrl` is present, extract path + query from it (strip admin host) rather than guessing from collection name string.

### Before / after

**Web:**

```json
{
  "type": "ProductsGrid",
  "props": {
    "collection": { "id": "coll_featured", "name": "Featured", "productCount": 24 },
    "metadata": {
      "type": "collection",
      "method": "get",
      "collectionId": "coll_featured",
      "productCount": 24,
      "apiUrl": "https://api.example.com/admin/collections/coll_featured/products?page=0&size=100"
    },
    "columns": "2",
    "maxRows": "2",
    "gap": "md",
    "cardVariant": "compact"
  }
}
```

**Mobile:** Full `gridView` subtree — see [fixtures/08-blocks-md-catalog.mobile.json](../fixtures/08-blocks-md-catalog.mobile.json).

---

## ProductInfo (legacy)

### Decomposition

`column` of `text` nodes from product picker + API paths on PDP.

| Web | Mobile |
|-----|--------|
| `product` | `ProductPickerRef` |
| `showTitle`, `showPrice`, etc. | conditional `text` nodes |
| `titleSize`, `priceSize`, `align`, `padding` | typography + container padding |

---

## CartSection

### Web contract

| Prop | Default |
|------|---------|
| `layoutStyle` | rows \| cards |
| `gap` | sm / md / lg / xl |
| `showDividerLines` | true |

### Decomposition

```
column
  └── listView OR repeat column (source: cart.items)
```

| Web | Mobile |
|-----|--------|
| `layoutStyle: rows` | compact row template per line |
| `layoutStyle: cards` | `card` wrapper per line |
| `gap` | row/column spacing |
| `showDividerLines` | `divider` between items |

See [20-commerce-cart-cubit-call.md](../builder-specs/20-commerce-cart-cubit-call.md).

---

## CheckoutForm

### Decomposition

Multi-route wizard — **not** one page.

| Web | Mobile routes |
|-----|---------------|
| CheckoutForm on `/cart` | `/checkout` + `/checkout/address` + `/checkout/payment` |

| Web | Mobile |
|-----|--------|
| `showDataHints` | **Ignore** on mobile (editor debug only) |

Submit: `cubitCall checkout saveAddress` / `placeOrder`.

---

## OrderHistory / OrderList

### Web contract

| Prop | Default |
|------|---------|
| `limit` | 5 (1–50) |
| `currency` | SYP / USD / EUR |
| `statusFilter` | all / pending / … |
| `showThumbnails` | true |
| `emptyStateText` | string |

### Decomposition

```
listView
  data: GET /api/v1/customer/orders (authenticated)
```

| Web | Mobile |
|-----|--------|
| `limit` | `data.size` |
| `statusFilter` | append query param if API supports |
| `showThumbnails` | image in line template |
| `emptyStateText` | empty-state `text` node |

---

## Wishlist

### Web contract

| Prop | Default |
|------|---------|
| `columns` | 2 / 3 / 4 |
| `gap` | sm / md / lg |
| `currency` | SYP / USD / EUR |
| `showAddToCart` | true |
| `ctaLabel` | Add to cart |
| `emptyStateText` | string |

### Decomposition

`gridView` + wishlist API — auth required at runtime.

---

## CategoryListMenu / ProductSearchMenu

**Unsupported** as blocks — convert to navigation:

| Web | Mobile |
|-----|--------|
| `CategoryListMenu` | `tap.navigate` → `/categories` |
| `ProductSearchMenu` | `tap.navigate` → `/search` |

---

## Commerce button actions

| Web `buttonAction` | Mobile |
|--------------------|--------|
| `addToCart` | `cubitCall cart addItem` |
| `link` to `/cart` | `navigate` `/cart` |

---

## API path summary

| Feature | Mobile `requestUrl` |
|---------|---------------------|
| Product list | `/api/v1/public/products?page=0&size=20` |
| Collection products | from `metadata.apiUrl` or `/api/v1/public/collections/:id/products` |
| Product detail | `/api/v1/public/products/:productId` |
| My orders | `/api/v1/customer/orders` |

Full table: [15-data-and-api-binding.md](../15-data-and-api-binding.md).
