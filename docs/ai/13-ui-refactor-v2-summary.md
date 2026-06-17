# UI refactor v2 — `mobile_production_v2.json`

**Config:** `assets/config/mobile_production_v2.json` · **Variant:** `mobile_production_v2`

## Phase 0 — Grep audit (baseline)

| Metric | Count |
|--------|------:|
| Pages | 27 |
| `gridView` | 6 |
| `listView` (data-bound + static) | 6+ |
| `image` | 13+ |
| `childAspectRatio` (before) | 6 × `0.76` |
| `semanticType` (documentation only) | 88 |

## Design tokens (hex aligned to `theme`)

| Token | Hex |
|-------|-----|
| background | `#F1F5F9` |
| surface | `#F8FAFC` |
| primary | `#1D4ED8` |
| text | `#0F172A` |
| muted | `#475569` |
| radius md / lg | `10` / `14` |

## Canonical JSON patterns (IDs for builder reference)

| Pattern | ID prefix | Notes |
|---------|-----------|--------|
| Product tile | `tile-product-v2` | `item.image`, `item.name`, `item.price`, tap PDP `push` |
| Category tile | `tile-category-v2` | `item.imageUrl`, tap category products `push` |
| Section header | `header-section-v2` | RTL title + `variant: text` عرض الكل |
| Page shell | `page-shell-v2` | `background` #F1F5F9, `scroll: vertical`, white appBar |

## Route changelog

| Route | Changes |
|-------|---------|
| `/splash` | Brand polish, timer → carousel |
| `/splash-carousel` | Theme-aligned CTA `variant: filled` |
| `/auth/login`, `/auth/otp-reset` | Full-width filled submit, form spacing |
| `/home` | Tappable search, hero, unified tiles; grid aspect **0.72** (products) / **0.78** (categories, name-only) |
| `/categories` | 56px rounded thumbs, list cards |
| `/products` | Unified product grid tile, aspect 0.80 |
| `/product/details/:productId` | Hero + horizontal gallery, divider, fullWidth CTAs |
| `/categories/:categorySlug/products` | Header + product grid |
| `/search` | Field + autocomplete thumbs + results grid |
| `/cart` | Card rows, summary, empty hint |
| `/checkout/*` | Step cards, forms |
| `/order/*`, `/orders` | Status + order cards |
| `/profile` | Menu rows with icons |
| `/wishlist` | Product tile grid |
| `/notifications`, `/settings`, `/support` | Card/list polish |
| `/state/*` | Canonical empty/error/loading |
| `/component-coverage` | Living design-system showcase |
| Tab shell | Fixed `tab-categories` id |

## Image binding

- Lists: `item.image` (Product), `item.imageUrl` (Category)
- PDP: `dataContext.requests.product-detail.data.primaryImageUrl`, gallery `item.publicUrl`
- Fallback: picsum seeds in `url` prop when path empty

## API caveats

- Wishlist uses `/api/v1/public/products` as stand-in (no wishlist API).
- Cart / orders / notifications are static demo content until backend wired.
- Broken server image URLs are not fixed in this repo (out of scope).

## PDP fixes (2026-05-23)

- **Horizontal gallery `listView`:** bounded `height` (72), `shrinkWrap` + `SizedBox` in engine (fixes unbounded viewport crash).
- **Product detail shell `container`:** gates children on `product-detail` request (loading spinner → content; Arabic error/empty).
- **Empty gallery strip:** hidden when no items and no `emptyMessage` (no English “No items available” flash).

## Verification

- `flutter test`: **200 passed** (config, engine, features, shell). Pre-existing failure: `test/widget_test.dart` (`MyApp` stub).
- `shell_route_coverage_test` and `route_aliases_test` pass with updated JSON.
- Manual: RTL headers, grid cell height, mock catalog images

## Tooling

- One-shot refactor script: `tool/refactor_mobile_v2_ui.py` (canonical tiles + page bodies). Safe to re-run for pattern tweaks; preserves auth `cubitCall` wiring.
