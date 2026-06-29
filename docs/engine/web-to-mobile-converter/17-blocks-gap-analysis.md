# 17 — BLOCKS.md Gap Analysis

Structured comparison of [docs/BLOCKS.md](../../BLOCKS.md) (web Puck catalog, v2026-06) vs mobile conversion rules and [lib/transformer.ts](../../../lib/transformer.ts).

Status legend: **full** = converts with documented mapping; **partial** = decomposes with known gaps; **unsupported** = skipped with warning.

---

## What's new in BLOCKS.md (converter impact)

| Change | Affected blocks | Converter action |
|--------|-----------------|------------------|
| **Block registry** groups (layout / blocks / storeBlocks / shell / legacy) | all | Normalize legacy types; prefer `Content*` over `Heading`/`Text` |
| **`metadata.apiUrl`** on commerce blocks | `ProductCard`, `ProductsGrid` | **G-41** — primary `requestUrl` source ([15-data-and-api-binding.md](15-data-and-api-binding.md)) |
| **`CollectionPickerRef`** object | `ProductsGrid` | Replace string `collection: "featured"` with `{ id, name?, productCount? }` |
| **`ProductPickerRef`** shape | `ProductCard`, `ProductImage`, `ProductInfo` | Use `id` + optional titles only; ignore embedded price |
| **Section** `backgroundImage`, `backgroundOverlayColor`, `columns`, `columnsMobile` | `Section` | Stack decomposition; multi-column **partial** |
| **Group** surface props | `Group` | Card-like wrapper when bg/shadow set |
| **SiteHeader** block props | `SiteHeader` | `layoutMode`, `menuAlign`, `navStyle` documented; ignored on mobile |
| **ContentHeading** `level` 1–6 | `ContentHeading` | Map to font scale |
| **Lucide kebab-case** icons | `ContentIcon`, `Card` | Normalize PascalCase legacy values |
| **`theme-none`** radius token | layout/content | Resolve to `0` |
| **Layout** `hideOnMobile` etc. documented | all WithLayout | Omit when `hideOnMobile: true` |
| **`Blank` dev-only** | `Blank` | Skip unless legacy data |

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
| Zones / drawer | `appDrawer` from `SiteDrawerShell` | [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md) | partial | **partial** | Block-level drawer props + zones merge |
| Multi-page batch | Single envelope, merged theme | [08-page-assembly.md](08-page-assembly.md) | array of pages | **partial** | `themeMergeStrategy` undefined |

---

## 2. Layout blocks (Section, Group, Flex, Grid, Sidebar)

| Web | Mobile | Spec | Code | Status | Issues |
|-----|--------|------|------|--------|--------|
| Section `content[]` | `container` → `column` | [blocks/09-layout-blocks.md](blocks/09-layout-blocks.md) | `transformSection` | **full** | Default gap 16 |
| Section `backgroundImage` + overlay | `stack` + cover image | 09-layout-blocks | partial | **partial** | Overlay rgba approximation |
| Section `columns` / `columnsMobile` | single column default | 09-layout-blocks | — | **partial** | No CSS grid on mobile |
| Section `visible: false` | omit block | — | `transformSection` | **full** | |
| Group surface props | outer `container` / `card` | 09-layout-blocks | partial | **partial** | New in BLOCKS.md |
| `Flex` / `Grid` | `row`/`column` / row chunks | 09-layout-blocks | existing | **full** | Legacy types |
| `Sidebar` | — | — | — | **unsupported** | Use routes / filters page |

---

## 3. Content blocks

| BLOCKS.md type | Registry | Mobile | Spec | Status | Issues |
|----------------|----------|--------|------|--------|--------|
| `ContentHeading` | blocks | `text` | [10-content-blocks.md](blocks/10-content-blocks.md) | **full** | `level` 1–6 |
| `Heading` | legacy | `text` | 10-content-blocks | **full** | alias |
| `ContentParagraph` | blocks | `text` / `richtext` | 10-content-blocks | **full** | |
| `Text` | legacy | `text` | 10-content-blocks | **full** | |
| `RichText` | legacy | `richtext` | 10-content-blocks | **full** | |
| `ContentButton` | blocks | `button` + `tap` | 10-content-blocks | **full** | `destinationType` |
| `Button` | legacy | `button` | 10-content-blocks | **full** | |
| `ContentImage` | blocks | `image` | 10-content-blocks | **full** | |
| `VideoEmbed` | blocks | `videoPlayer` | 10-content-blocks | **full** | |
| `Space` | blocks | `sizedBox` | 10-content-blocks | **full** | |
| `ContentDivider` | blocks | `divider` | 10-content-blocks | **full** | |
| `ContentIcon` | blocks/legacy | `icon` | 10-content-blocks | **full** | kebab-case Lucide |
| `ContentHtml` | legacy | stripped `text` | [14-utility-blocks.md](blocks/14-utility-blocks.md) | **partial** | |
| `Accordion` | blocks | `expansionTile` column | 10-content-blocks | **full** | |
| `Hero` | legacy | composite | 10-content-blocks | **partial** | `image.mode: custom` slot |
| `Card` | legacy | composite + icon | 10-content-blocks | **partial** | |
| `ImageGallery` | blocks | grid / `imageSlider` | 10-content-blocks | **partial** | slider `slidesPerView` |
| `Testimonials` | blocks | card grid / list | [12-testimonial-blocks.md](blocks/12-testimonial-blocks.md) | **full** | cms source partial |
| `ContactForm` | blocks | — | — | **unsupported** | No mobile form template |
| `Blank` | dev-only | `text` | 10-content-blocks | **full** | Rare |

---

## 4. Commerce blocks (storeBlocks)

| BLOCKS.md type | Mobile | Spec | Status | Issues |
|----------------|--------|------|--------|--------|
| `ProductCard` + `metadata` | `card` + API | [11-commerce-blocks.md](blocks/11-commerce-blocks.md) | **full** | Use `metadata.apiUrl` |
| `ProductsGrid` + `metadata` | `gridView` + `data` | 11-commerce-blocks | **full** | `CollectionPickerRef` |
| `ProductImage` | `image` | 11-commerce-blocks | **partial** | Legacy |
| `ProductInfo` | `column` | 11-commerce-blocks | **full** | Legacy |
| `CartSection` | `listView` | 11-commerce-blocks | **full** | `layoutStyle`, `gap` |
| `CheckoutForm` | multi-route | 11-commerce-blocks | **partial** | `showDataHints` ignored |
| `OrderHistory` | `listView` + API | 11-commerce-blocks | **full** | `limit`, `statusFilter` |
| `Wishlist` | `gridView` + API | 11-commerce-blocks | **partial** | Auth required |
| `CategoryListMenu` | navigate `/categories` | 11-commerce-blocks | **unsupported** | |
| `ProductSearchMenu` | navigate `/search` | 11-commerce-blocks | **unsupported** | |

---

## 5. Shell blocks

| BLOCKS.md type | Mobile | Spec | Status | Issues |
|----------------|--------|------|--------|--------|
| `SiteHeader` (block props) | `appBar` | [13-shell-blocks.md](blocks/13-shell-blocks.md) | **full** | Nav style ignored |
| `SiteFooter` (block props) | footer `column` | 13-shell-blocks | **full** | Per-page footer |
| `SiteDrawerShell` (block props) | `appDrawer` | 13-shell-blocks | **partial** | `openOnEdgeHover` ignored |
| `SideDrawer` | legacy | — | **unsupported** | Use `SiteDrawerShell` |
| `NavMenu` | legacy | — | **unsupported** | Tabs / drawer |

---

## 6. Legacy decompose-only

| BLOCKS.md type | Mobile strategy | Status |
|----------------|-----------------|--------|
| `Logos` | `row` of `image` | **partial** (warning + manual) |
| `Stats` | `row` of stat `text` pairs | **partial** (warning + manual) |
| `Template` | skip | **unsupported** |
| `Flex`, `Grid` | layout rules | **full** (legacy) |

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

---

## Full BLOCKS.md catalog (43 blocks)

| Block | Registry | Status |
|-------|----------|--------|
| Accordion | blocks | full |
| Blank | dev-only | full |
| Button | legacy | full |
| Card | legacy | partial |
| CartSection | storeBlocks | full |
| CategoryListMenu | storeBlocks | unsupported |
| CheckoutForm | storeBlocks | partial |
| ContactForm | blocks | unsupported |
| ContentButton | blocks | full |
| ContentDivider | blocks | full |
| ContentHeading | blocks | full |
| ContentHtml | legacy | partial |
| ContentIcon | blocks/legacy | full |
| ContentImage | blocks | full |
| ContentParagraph | blocks | full |
| Flex | legacy | full |
| Grid | legacy | full |
| Group | layout | full |
| Heading | legacy | full |
| Hero | legacy | partial |
| ImageGallery | blocks | partial |
| Logos | legacy | partial |
| NavMenu | legacy | unsupported |
| OrderHistory | storeBlocks | full |
| ProductCard | storeBlocks | full |
| ProductImage | legacy | partial |
| ProductInfo | legacy | full |
| ProductSearchMenu | storeBlocks | unsupported |
| ProductsGrid | storeBlocks | full |
| RichText | legacy | full |
| Section | layout | full |
| Sidebar | layout | unsupported |
| SideDrawer | legacy | unsupported |
| SiteDrawerShell | shell | partial |
| SiteFooter | shell | full |
| SiteHeader | shell | full |
| Space | blocks | full |
| Stats | legacy | partial |
| Template | legacy | unsupported |
| Testimonials | blocks | full |
| Text | legacy | full |
| VideoEmbed | blocks | full |
| Wishlist | storeBlocks | partial |

---

## Related

- Conversion rules index: [README.md](README.md)
- Fixture matrix: [fixtures/README.md](fixtures/README.md)
- Post-conversion checklist: [16-post-conversion-validation.md](16-post-conversion-validation.md)
