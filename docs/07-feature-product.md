# 07 — Feature: Product

## AI must know

- All catalog APIs are **public** — `/api/v1/public/*`, no auth header.
- Repos return `Either<Failure, T>`; cubits expose loading/success/error for `VariantScreen`.
- JSON uses `requestUrl` strings — must match repo paths for mapper wiring.
- Pagination: `ProductCubit` supports load-more for browse + category lists.

## Structure

```
lib/features/product/
├── data/models/   — Product, ProductDetail, Category, ProductListResponse, search/autocomplete DTOs
├── data/repos/    — product_repo.dart, product_repo_impl.dart
└── presentation/manager/
    ├── product_cubit/
    ├── product_detail_cubit/
    ├── product_search_cubit/
    ├── product_autocomplete_cubit/
    └── category_cubit/
```

## API endpoints (implemented)

| Method | Path | Repo method |
|--------|------|-------------|
| GET | `/api/v1/public/products` | `getProducts` |
| GET | `/api/v1/public/categories/{slug}/products` | `getCategoryProducts` |
| GET | `/api/v1/public/products/search` | `searchProducts` |
| GET | `/api/v1/public/products/autocomplete` | `autocomplete` |
| GET | `/api/v1/public/products/{slug}` | `getProductDetail` |
| GET | `/api/v1/public/categories` | `getCategories` (cached 24h) |
| GET | `/api/v1/public/categories/{slug}` | `getCategory` |

Query params: `page`, `size`, `sort`, `tenantId`, search filters (`q`, `categoryId`, `minPrice`, etc.).

## Models

| Model | Use |
|-------|-----|
| `ProductListResponse` | Paginated product grids/lists |
| `ProductDetail` | PDP from slug |
| `Category` | Category tree/cards |
| `ProductSearchResult` | Search page |
| `ProductAutocompleteResult` | Search suggestions |
| `ProductMeta` | Shared metadata fields |

## Cubits

| Cubit | Triggered by mapper when |
|-------|--------------------------|
| `ProductCubit` | Browse or category product URLs |
| `ProductSearchCubit` | `/products/search` |
| `ProductAutocompleteCubit` | `/products/autocomplete` |
| `ProductDetailCubit` | `/products/{slug}` in URL |
| `CategoryCubit` | `/categories` tree or single category |

## JSON binding pattern

```json
"data": {
  "requestKey": "product-list",
  "requestUrl": "/api/v1/public/products?page=0&size=20",
  "page": 0,
  "size": 20
}
```

`VariantScreen` loads cubit → stores under `requests.product-list` in `dataContext`.

Product card tap:

```json
"tap": { "type": "navigate", "route": "/product/details/:productId" }
```

Mapper resolves `productId` from `item.slug` or `item.id`.

## Repo conventions

- Retries: 3 attempts, 500ms / 1s / 2s delays
- Categories cached in memory with TTL
- `AppLogger` for debug paths
- Parse envelope in repo — widgets never parse raw JSON

## Mock catalog behavior (dev mode)

- File: `lib/dev/product_mock/mock_product_data.dart`.
- `MockProductData.productDetail(slug)` now returns a multi-image `images[]` set (`publicUrl`, `isPrimary`, `alt`) instead of a single image only.
- Purpose: validate PDP slider swipe, indicators, fullscreen preview, and thumbnail selection in mock mode.

## Adding a product endpoint

1. Add/extend model in `data/models/`
2. Add method to `ProductRepo` + `ProductRepoImpl`
3. Create or extend cubit
4. Register factory in `service_locator.dart`
5. Extend `EngineRequestMapper` detection + `VariantScreen` load handler
6. Add JSON `requestUrl` on target page
7. Tests under `test/features/product/`

## Anti-patterns

- `Dio.get` in renderers
- Hardcoded product lists in Dart screens
- New `semanticType` without primitive composition + data binding

## Related

- [04-actions-and-requests.md](04-actions-and-requests.md)
- [08-feature-variant-shell.md](08-feature-variant-shell.md)
