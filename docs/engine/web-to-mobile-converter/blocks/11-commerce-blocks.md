# 11 — Commerce Blocks

Web commerce blocks ([docs/blocks.md §5.3](../../BLOCKS.md)) decompose to mobile primitives + **`cubitCall`** / **`data`** bindings.

**Required reading:**
- [20-commerce-cart-cubit-call.md](../builder-specs/20-commerce-cart-cubit-call.md)
- [21-commerce-checkout-cubit-call.md](../builder-specs/21-commerce-checkout-cubit-call.md)
- [22-commerce-order-cubit-call.md](../builder-specs/22-commerce-order-cubit-call.md)
- Prod reference: `mobile_production_v2.json` routes `/products`, `/product/details/:productId`, `/cart`, `/checkout/*`

---

## ProductImage

### Decomposition

```
stack (optional badges)
  └── image
```

| Web | Mobile |
|-----|--------|
| `product` (fixture id) | **Replace** with context `valuePath` / detail request |
| `aspectRatio` | `image.props.aspectRatio` |
| `showBadges` | overlay `container`+`text` discount/stock |
| `borderRadius`, `objectFit` | image props |

**Gap:** Web `external` product picker → mobile uses API `item` or detail `dataContext`.

---

## ProductCard

### Decomposition

```
card
  └── column
        ├── image (urlPath: item.image / item.primaryImageUrl)
        ├── text (title / name)
        ├── text (price)
        └── optional badges row
```

| Web | Mobile |
|-----|--------|
| `product` single fixture | Used in static preview only; in grids use `item.*` paths |
| `variant` vertical/horizontal | `row` vs `column` inside card |
| `showDescription`, `showCategories` | extra `text` nodes with `valuePath` |
| `showBadge`, `showStockBadge` | badge containers |
| `imageMode: background` | `stack` with positioned text |
| `advanced` CSS object | map known keys to props; ignore rest |

### Tap

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

---

## ProductGrid

**Rule 2.3** — ProductGrid → `gridView` + collection `data`.

### Web contract

| Prop | Default |
|------|---------|
| `collection` | `all` |
| `maxProducts` | 6 |
| `columns` | 3 |
| `variant`, `gap`, `colorScheme` | display |

### Mobile decomposition

Single `gridView` node — **copy prod item template** from `page-products` in [mobile_production_v2.json](../../../assets/config/mobile_production_v2.json).

### Prop mapping

| Web | Mobile |
|-----|--------|
| `columns` | `props.crossAxisCount` |
| `gap` | `mainAxisSpacing`, `crossAxisSpacing` |
| `collection` | filter query on `requestUrl` if not `all` |
| `maxProducts` | `data.size` cap |
| — | `enableInnerScroll: false` on catalog pages |

### Data block

```json
"data": {
  "source": "collection",
  "id": "products-grid",
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/products?page=0&size=20",
  "page": 0,
  "size": 20
}
```

### itemBuilder

```json
"itemBuilder": {
  "type": "repeat",
  "source": "dataContext.requests.product-list.data",
  "item": { "type": "card", "child": { "type": "column", "children": [ "..."] },
    "tap": { "type": "navigate", "route": "/product/details/:productId", "navigation_type": "push" }
  }
}
```

Field paths: [15-data-and-api-binding.md](../15-data-and-api-binding.md) (`item.name`, `item.image`, `item.price`).

### Before / after

**Web:**

```json
{
  "type": "ProductGrid",
  "props": { "collection": "all", "maxProducts": "6", "columns": "2", "gap": 24 }
}
```

**Mobile:** Full `gridView` subtree — see [fixtures/03-product-grid.mobile.json](../fixtures/03-product-grid.mobile.json).

---

## ProductCarousel

### Decomposition

Horizontal `listView` with same `data` + `itemBuilder` as ProductGrid, or `imageSlider` for banner-style.

| Web | Mobile |
|-----|--------|
| `autoPlay` | `imageSlider.autoPlay` if slider; else scroll physics default |
| `autoPlayIntervalMs` | timer interval |
| `maxProducts` | `data.size` |

**Scroll:** `listView` with `scrollDirection: horizontal` if prop supported; else row inside singleChildScrollView **avoid** — use horizontal listView.

---

## ProductDetails

Web block uses hard-coded demo layout bound to one `product` external field.

### Mobile strategy

**Do not** convert as single node. Map web page `/products/:product-slug` to existing mobile page **`/product/details/:productId`** template from prod JSON:

- `data.requestKey: product-detail`
- `requestUrl: /api/v1/public/products/:productId`
- `imageSlider`, variant `dropdown`, `cubitCall cart addItem`

| Web prop | Mobile equivalent |
|----------|-------------------|
| `showQuantitySelector` | `dropdown` / stepper + form field |
| `showSku`, `showCategories` | `text` with `valuePath` |
| `showBreadcrumb` | **Gap:** omit or simple `text` back link |

---

## CartSection

### Decomposition

```
column
  ├── listView OR repeat column (source: cart.items)
  └── optional coupon form
```

| Web | Mobile |
|-----|--------|
| `showCouponInput` | `textFormField` + checkout `validateDiscount` |
| `showRemoveButton` | per-line button `cubitCall cart removeItem` |

### Data binding

```json
"itemBuilder": {
  "type": "repeat",
  "source": "cart.items",
  "item": { "... line template ..." }
}
```

See [20-commerce-cart-cubit-call.md](../builder-specs/20-commerce-cart-cubit-call.md).

---

## CartSummary

### Decomposition

`column` of label/value `text` rows.

| Web | Mobile |
|-----|--------|
| `showShippingEstimate` | `valuePath: cart.shipping` or checkout draft |
| `showTaxEstimate` | `valuePath: cart.tax` |

**Gap:** Web mock tax constants → mobile `CheckoutCubit` / cart totals.

---

## CheckoutForm

### Decomposition

Multi-route wizard — **not** one page.

| Web | Mobile routes |
|-----|---------------|
| CheckoutForm on `/cart` | Split: `/checkout` + `/checkout/address` + `/checkout/payment` |

```
form (checkout-address-form)
  └── column of textFormField
```

| Web | Mobile |
|-----|--------|
| `showBillingAddress` | extra field group on address page |
| `showOrderNotes` | `textFormField` multiline |

Submit: `cubitCall checkout saveAddress` / `placeOrder` — [21-commerce-checkout-cubit-call.md](../builder-specs/21-commerce-checkout-cubit-call.md).

---

## CheckoutSummary

Same as CartSummary plus order notes display; bind to `checkout.draft.*` / `cart.*` paths.

---

## OrderList

### Decomposition

```
gridView or listView
  data: GET /api/v1/customer/orders (authenticated)
```

| Web | Mobile |
|-----|--------|
| `maxOrders` | `data.size` |
| `showStatus`, `showDate`, `showTotal`, `showThumbnail` | item template fields |

Web uses mock `sampleOrders` — mobile uses **OrderCubit** — [22-commerce-order-cubit-call.md](../builder-specs/22-commerce-order-cubit-call.md).

---

## OrderDetails

### Decomposition

Column bound to order detail request or `orderId` param.

| Web | Mobile |
|-----|--------|
| `orderId` select | route param `:orderId` |
| `showTimeline` | `column` of status `text` / `expansionTile` |
| `showItems` | nested repeat for line items |

---

## Commerce button actions

| Web `buttonAction` | Mobile |
|--------------------|--------|
| `addToCart` | `cubitCall cart addItem` with variant params from form/detail context |
| `link` to `/cart` | `navigate` `/cart` |

---

## API path summary

| Feature | Mobile `requestUrl` |
|---------|---------------------|
| Product list | `/api/v1/public/products?page=0&size=20` |
| Product detail | `/api/v1/public/products/:productId` |
| Search | `/api/v1/public/products/search?q=...` |
| Payment methods | `/api/v1/public/payments/methods` |
| Checkout | `POST` via `checkout.placeOrder` cubitCall |
| My orders | `/api/v1/customer/orders` |

Full table: [15-data-and-api-binding.md](../15-data-and-api-binding.md).
