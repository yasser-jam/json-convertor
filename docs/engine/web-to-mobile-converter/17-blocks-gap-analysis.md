# 17 — BLOCKS.md Gap Analysis

Structured comparison of [docs/BLOCKS.md](../../BLOCKS.md) (web Puck catalog) vs mobile conversion rules and [lib/transformer.ts](../../../lib/transformer.ts).

Status legend: **full** = converts with documented mapping; **partial** = decomposes with known gaps; **unsupported** = skipped with warning.

---

## Type alias map (BLOCKS.md → converter)

| BLOCKS.md type | Normalized converter type |
|----------------|---------------------------|
| `ContentImage` | `Image` |
| `ContentParagraph` | `Text` |
| `ContentHeading` | `Heading` |
| `ContentButton` | `Button` |
| `ContentDivider` | `Divider` |
| `ContentIcon` | `Icon` |
| `ContentHtml` | `Html` |
| `VideoEmbed` | `YouTube` |
| `ProductsGrid` | `ProductGrid` |
| `OrderHistory` | `OrderList` |

All other BLOCKS.md types use the same PascalCase name in the converter switch.

---

## 1. General structure (envelope, pages, theme, navigation)

| Area | Mobile target | Spec | Code | Status | Issues |
|------|---------------|------|------|--------|--------|
| Puck `UserData` | Normalized `{ path, label, rootProps, blocks }` | [01-web-input-schema.md](01-web-input-schema.md) | ingest in UI | **partial** | Raw `{ root, content, zones }` must be normalized before transform |
| Full envelope | `schemaVersion`, `app`, `theme`, `navigation`, `pages[]` | [02-mobile-output-schema.md](02-mobile-output-schema.md) | `transformWebToMobile` | **full** | Fixture `01-page-shell` |
| Page shell | `pages[].route`, `title`, `scroll`, `appBar`, `body[]` | [08-page-assembly.md](08-page-assembly.md) | `transformPage` | **full** | `/` → `/home` via `normalizeRoute` |
| Theme | `theme.colors`, typography, radius, buttons | [04-theme-and-root-mapping.md](04-theme-and-root-mapping.md) | `transformTheme` | **full** | `app.tenantId` injected, not from web |
| Navigation | Tab shell + `shellExcludeRoutes` | [05-navigation-and-routes.md](05-navigation-and-routes.md) | `transformNavigation` | **partial** | Web has no bottom tabs; mobile adds defaults |
| Zones / drawer | `appDrawer` from `SiteDrawerShell` | [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md) | partial | **partial** | `zones.shell-left/right` merge documented; limited fixture coverage |
| Multi-page batch | Single envelope, merged theme | [08-page-assembly.md](08-page-assembly.md) | array of pages | **partial** | `themeMergeStrategy` undefined |

---

## 2. Basic sections and items inside

| Web (Section) | Mobile | Spec | Code | Status | Issues |
|---------------|--------|------|------|--------|--------|
| `content[]` | `container` → `column` → children | [blocks/09-layout-blocks.md](blocks/09-layout-blocks.md) | `transformSection` | **full** | Default gap 16 |
| padding, `backgroundColor` | `container.style` | 09-layout-blocks | `transformSection` | **full** | v0 bg bug fixed |
| `columns`, `gridGap` | — | — | — | **unsupported** | Section multi-column layout not mapped |
| `maxWidth` | ignored | 09-layout-blocks | — | **partial** | Documented gap |
| `anchorId` | — | — | — | **unsupported** | No in-page anchors on mobile |
| `visible: false` | omit block | — | `transformSection` | **full** | Returns null |
| Nested `Section` | sibling containers | — | warning | **partial** | Emits conversion warning |
| Child slots `content[]` / `items[]` | internal `children[]` | [01-web-input-schema.md](01-web-input-schema.md) | `getChildren` | **full** | Flex uses `items[]`, Group uses `content[]` |

---

## 3. Basic blocks (text, button, image, video)

| BLOCKS.md type | Mobile | Spec | Code | Status | Issues |
|----------------|--------|------|------|--------|--------|
| `Text` | `text` / `richtext` | [blocks/10-content-blocks.md](blocks/10-content-blocks.md) | `transformText` | **full** | HTML → richtext |
| `ContentParagraph` | alias → `Text` | 10-content-blocks | alias | **full** | |
| `Heading` | `text` | 10-content-blocks | `transformHeading` | **full** | |
| `ContentHeading` | alias → `Heading` | 10-content-blocks | alias | **full** | |
| `RichText` | `richtext` | 10-content-blocks | `transformRichText` | **full** | Preserves HTML in `props.richtext` |
| `Button` | `button` + `tap` | 10-content-blocks | `transformButton` | **full** | LinkValue → navigate |
| `ContentButton` | alias → `Button` | 10-content-blocks | alias | **full** | |
| `ContentImage` | alias → `image` | 10-content-blocks | alias | **full** | `src` → `url`; theme `radius` resolved |
| `VideoEmbed` | alias → `videoPlayer` | 10-content-blocks | alias | **full** | `src` YouTube URL; `size` theme token → height |
| `Space` | `sizedBox` | 10-content-blocks | `transformSpace` | **full** | |
| `ContentDivider` | alias → `divider` | 10-content-blocks | alias | **full** | |
| `ContentIcon` | alias → `icon` | 10-content-blocks | alias | **full** | Lucide → Material |
| `ContentHtml` | alias → stripped `text` | [blocks/14-utility-blocks.md](blocks/14-utility-blocks.md) | alias | **partial** | HTML stripped, not richtext |

**Prop-level notes:**

- Theme tokens (`theme-sm`, `theme-md`, `theme-neutral`, etc.) resolved via `resolveThemePx` / `resolveThemeColor` ([07-shared-fields.md](07-shared-fields.md)).
- YouTube embed may fall back to `openUrl` on device policy failures (documented gap).
- Legacy types `Image`, `Video`, `YouTube`, `Link`, `Badge` still accepted for fixtures.

---

## 4. Group block and nested elements

| BLOCKS.md type | Mobile | Spec | Code | Status | Issues |
|----------------|--------|------|------|--------|--------|
| `Group` | `row` / `column` | [blocks/09-layout-blocks.md](blocks/09-layout-blocks.md) | `transformGroup` | **full** | `FlexGroup`, `Div` aliases |
| `Flex` | `row` / `column` | 09-layout-blocks | `transformFlex` | **full** | `items[]` slot |
| `Grid` (layout) | `column` of `row` chunks | 09-layout-blocks | `transformLayoutGrid` | **full** | Not product grid |
| No `Section` in `Group` | — | BLOCKS.md | — | **partial** | Not validated at ingest |
| `wrap: wrap` | column-of-rows or horizontal scroll | 09-layout-blocks | partial | **partial** | No native Flutter wrap |
| `layout` (WithLayout) | `style`, `stack`, `positioned` | [06-layout-cross-cutting.md](06-layout-cross-cutting.md) | `applyLayout` | **partial** | Breakpoint visibility ignored |

---

## 5. Complex blocks (ImageGallery, Testimonials)

| BLOCKS.md type | Mobile decomposition | Spec | Code | Status | Issues |
|----------------|---------------------|------|------|--------|--------|
| `ImageGallery` `mode: grid` | `column` of `row` groups with `image` nodes | this doc | `transformImageGallery` | **full** | Static images only; `gridRows` caps count |
| `ImageGallery` `mode: slider` | `imageSlider` | this doc | `transformImageGallery` | **partial** | `slidesPerView` not mapped |
| `Testimonials` inline | `column` of card rows or horizontal `listView` | [blocks/12-testimonial-blocks.md](blocks/12-testimonial-blocks.md) | `transformTestimonials` | **full** | Uses `inlineItems[]` |
| `Testimonials` `source: cms` | static fallback | 12-testimonial-blocks | warning | **partial** | No testimonial API |
| `Testimonials` carousel | horizontal `listView` | 12-testimonial-blocks | `transformTestimonials` | **partial** | No autoplay carousel |
| `TestimonialCard` / `TestimonialGrid` | legacy fixture types | 12-testimonial-blocks | existing | **full** | Superseded by `Testimonials` in BLOCKS.md |
| `Accordion` | `column` of `expansionTile` | — | `transformAccordion` | **full** | |
| `Hero`, `Card`, `Stats`, `Logos` | composite / partial | 10-content-blocks | Hero/Card only | **partial** | `Stats`, `Logos` not in BLOCKS.md converter rules |

---

## 6. Bound blocks (ProductCard, ProductsGrid)

| BLOCKS.md type | Mobile | Spec | Code | Status | Issues |
|----------------|--------|------|------|--------|--------|
| `ProductCard` | `card` composite + `tap` | [blocks/11-commerce-blocks.md](blocks/11-commerce-blocks.md) | `transformProductCard` | **full** | `product.id` → detail route; action buttons |
| `ProductCard` variants | vertical / horizontal / compact / featured | 11-commerce-blocks | `transformProductCard` | **full** | Layout differs per variant |
| `ProductCard` `showVariants` | — | — | — | **partial** | Variants on PDP only, not card |
| `ProductsGrid` | alias → `gridView` + API `data` | 11-commerce-blocks | `transformProductGrid` | **full** | |
| `collection` filter | `requestUrl` query param | [15-data-and-api-binding.md](15-data-and-api-binding.md) | `buildCollectionRequestUrl` | **full** | `&collection=` appended |
| `maxRows` | `data.size` cap | 11-commerce-blocks | `transformProductGrid` | **full** | Maps from `maxRows` or `maxProducts` |
| `gap` sm/md/lg | numeric spacing | 11-commerce-blocks | `resolveGridGap` | **full** | |
| `cardVariant` | item template layout | 11-commerce-blocks | `buildProductGridItemTemplate` | **full** | |
| `ProductImage` | `image` | 11-commerce-blocks | `transformProductImage` | **partial** | Static picker vs API paths in grids |
| `ProductInfo` | `column` of `text` | — | `transformProductInfo` | **full** | Decomposed from product picker |
| `Wishlist` | `gridView` + wishlist API | — | `transformWishlist` | **partial** | Auth required at runtime |
| `OrderHistory` | alias → `OrderList` | 11-commerce-blocks | alias | **full** | |
| `CartSection`, `CheckoutForm` | listView / multi-route wizard | 11-commerce-blocks | existing | **partial** | Checkout splits across routes |

---

## Unsupported web blocks (warning + skip)

| BLOCKS.md type | Reason |
|----------------|--------|
| `Sidebar` | Web docked layout; no mobile drawer page equivalent |
| `SideDrawer` | Replaced by global `appDrawer` shell |
| `NavMenu` | Inline web nav; mobile uses tabs / appBar |
| `CategoryListMenu` | Overlay menu; use `/categories` route |
| `ProductSearchMenu` | Use `/search` route |
| `ContactForm` | No mobile form template yet |
| `Template` | Editor-only placeholder |
| `Logos` | Logo strip; decompose manually to `row` of `image` |
| `Stats` | Stat strip; decompose to `row` of `text` |

---

## Full BLOCKS.md catalog (43 blocks)

| Block | Status |
|-------|--------|
| Accordion | full |
| Blank | full |
| Button | full |
| Card | full |
| CartSection | full |
| CategoryListMenu | unsupported |
| CheckoutForm | partial |
| ContactForm | unsupported |
| ContentButton | full (alias) |
| ContentDivider | full (alias) |
| ContentHeading | full (alias) |
| ContentHtml | partial (alias) |
| ContentIcon | full (alias) |
| ContentImage | full (alias) |
| ContentParagraph | full (alias) |
| Flex | full |
| Grid | full |
| Group | full |
| Heading | full |
| Hero | full |
| ImageGallery | full |
| Logos | unsupported |
| NavMenu | unsupported |
| OrderHistory | full (alias) |
| ProductCard | full |
| ProductImage | partial |
| ProductInfo | full |
| ProductSearchMenu | unsupported |
| ProductsGrid | full (alias) |
| RichText | full |
| Section | full |
| Sidebar | unsupported |
| SideDrawer | unsupported |
| SiteDrawerShell | partial (shell) |
| SiteFooter | full (shell) |
| SiteHeader | full (shell) |
| Space | full |
| Stats | unsupported |
| Template | unsupported |
| Testimonials | full |
| Text | full |
| VideoEmbed | full (alias) |
| Wishlist | partial |

---

## Related

- Conversion rules index: [README.md](README.md)
- Fixture matrix: [fixtures/README.md](fixtures/README.md)
- Post-conversion checklist: [16-post-conversion-validation.md](16-post-conversion-validation.md)
