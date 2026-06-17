# 05 — Navigation and Routes

Web paths ([docs/blocks.md §1](../../BLOCKS.md)) → mobile routes, tab shell, and exclude list.

---

## Route mapping table

| Web path | Mobile route | Notes |
|----------|--------------|-------|
| `/` | `/home` | Home tab |
| `/home` | `/home` | If custom page uses `/home` |
| `/cart` | `/cart` | Cart tab |
| `/products/:product-slug` | `/product/details/:productId` | **Param rename:** slug → productId |
| `/products` | `/products` | Catalog listing |
| `/categories` | `/categories` | If present in web custom pages |
| `/themes` | — | **Skip** or map to `/settings` (non-commerce gallery) |
| `/auth/login` | `/auth/login` | Shell excluded |
| `/checkout` | `/checkout` | Wizard start — shell excluded |
| Custom `{path}` | Same path if valid | Add to `pages[]` + exclude if full-screen |

### Link resolution

Web `link.kind`:

| kind | Resolution |
|------|------------|
| `page` | `link.pageId` → apply route table above |
| `url` | External: `tap.type: openUrl`; in-app path: apply route table |

Web `Button.props.href` (legacy) → direct path after table mapping.

---

## Default tab shell

When converting a full storefront, emit `navigation` matching prod pattern:

```json
{
  "type": "tabs",
  "initialRoute": "/splash",
  "shellExcludeRoutes": [
    "/splash",
    "/splash-carousel",
    "/auth/login",
    "/auth/otp-reset",
    "/product/details/:productId",
    "/categories/:categorySlug/products",
    "/checkout",
    "/checkout/address",
    "/checkout/payment",
    "/checkout/success",
    "/orders/:orderId",
    "/orders/track"
  ],
  "tabs": [
    { "id": "tab-home", "label": "الرئيسية", "icon": "home", "route": "/home" },
    { "id": "tab-categories", "label": "الأقسام", "icon": "grid_view", "route": "/categories" },
    { "id": "tab-search", "label": "بحث", "icon": "search", "route": "/search" },
    { "id": "tab-cart", "label": "السلة", "icon": "shopping_cart", "route": "/cart" },
    { "id": "tab-profile", "label": "حسابي", "icon": "person", "route": "/profile" }
  ]
}
```

**Rule:** Web `headerLinks` inform tab labels/routes but **do not remove** mobile system routes (auth, splash) from `shellExcludeRoutes`.

---

## Deriving tabs from web header

| Web `headerLinks[]` | Mobile action |
|---------------------|---------------|
| Link to `/` or `/home` | Maps to `tab-home` |
| Link to `/cart` | Maps to `tab-cart` |
| Link to `/products` | Navigate target, not necessarily a tab |
| Custom link | Add as `navigate` only unless added to `tabs[]` explicitly |

Converter **defaults** to 5-tab prod shell when web provides no header links.

---

## `initialRoute`

| Storefront type | `initialRoute` |
|-----------------|----------------|
| Production SOOQ mobile | `/splash` |
| Web-only preview (no splash) | `/home` |

Document in converter config flag: `includeSplashFlow: true|false`.

---

## Page-level navigation props

| Web concept | Mobile |
|-------------|--------|
| `SiteHeader` on every page | Single `pages[].appBar` per page — not repeated in body |
| `headerBrandHref: "/"` | AppBar logo tap → `navigate` `/home` |
| `headerShowDrawerButton` | AppBar action → `openDrawer` |
| `drawerLinks[]` | `appDrawer` child menu items |

See [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md).

---

## Dynamic route params

| Mobile route | Param source |
|--------------|--------------|
| `/product/details/:productId` | Product API `id` or slug resolved at navigate time |
| `/categories/:categorySlug/products` | Category slug from tap context |

Web `/products/:product-slug` product detail taps must become:

```json
"tap": {
  "type": "navigate",
  "route": "/product/details/:productId",
  "navigation_type": "push"
}
```

Item context: `:productId` from `item.id` or `item.slug` per API shape — [15-data-and-api-binding.md](15-data-and-api-binding.md).

---

## `navigation_type` defaults

| Flow | `navigation_type` |
|------|-------------------|
| Tab switch | `go` (clear stack) |
| Product detail, checkout step | `push` |
| Post-login home | `go` to `/home` |
| Logout success | `go` to `/auth/login` |

See [builder-spec 13-navigation-type.md](../builder-specs/13-navigation-type.md).
