# Converter Fixtures

Paired **web input** (`*.web.json`) and **expected mobile output** (`*.mobile.json`) for the web-to-mobile SDUI converter.

See [17-blocks-gap-analysis.md](../17-blocks-gap-analysis.md) for full BLOCKS.md coverage status.

---

## Quick Reference: Block Conversion Matrix

### Layout

| Web type (BLOCKS.md) | Mobile target | Spec |
|----------------------|---------------|------|
| `Section` | `container` + `column` | [09-layout-blocks.md](../blocks/09-layout-blocks.md) |
| `Flex` | `row` / `column` | 09-layout-blocks.md |
| `Group` / `FlexGroup` / `Div` | `row` / `column` | 09-layout-blocks.md |
| `Grid` | `column` of `row` groups | 09-layout-blocks.md |

### Content (BLOCKS.md + legacy aliases)

| Web type | Mobile target | Spec |
|----------|---------------|------|
| `Heading`, `ContentHeading` | `text` | [10-content-blocks.md](../blocks/10-content-blocks.md) |
| `Text`, `ContentParagraph` | `text` / `richtext` | 10-content-blocks.md |
| `RichText` | `richtext` | 10-content-blocks.md |
| `Space` | `sizedBox` | 10-content-blocks.md |
| `Button`, `ContentButton` | `button` + `tap` | 10-content-blocks.md |
| `ContentImage` (`Image` legacy) | `image` | 10-content-blocks.md |
| `VideoEmbed` (`YouTube` legacy) | `videoPlayer` | 10-content-blocks.md |
| `Video` (legacy mp4) | `videoPlayer` | 10-content-blocks.md |
| `ContentDivider`, `ContentIcon`, `ContentHtml` | `divider`, `icon`, stripped `text` | 10-content-blocks.md |
| `Hero`, `Card`, `Accordion`, `Blank` | composite / `expansionTile` / `text` | 10-content-blocks.md |
| `ImageGallery` | `column` grid or `imageSlider` | [17-blocks-gap-analysis.md](../17-blocks-gap-analysis.md) |

### Commerce

| Web type | Mobile target | Spec |
|----------|---------------|------|
| `ProductCard`, `ProductInfo` | `card` / `column` composite | [11-commerce-blocks.md](../blocks/11-commerce-blocks.md) |
| `ProductsGrid` (`ProductGrid` legacy) | `gridView` + API `data` | 11-commerce-blocks.md |
| `ProductCarousel`, `CartSection`, `CheckoutForm`, … | see commerce spec | 11-commerce-blocks.md |
| `OrderHistory` (`OrderList` legacy) | `listView` + API | 11-commerce-blocks.md |
| `Wishlist` | `gridView` + wishlist API | 17-blocks-gap-analysis.md |

### Testimonials

| Web type | Mobile target | Spec |
|----------|---------------|------|
| `Testimonials` | `column` of card rows / horizontal `listView` | [12-testimonial-blocks.md](../blocks/12-testimonial-blocks.md) |
| `TestimonialCard`, `TestimonialGrid` | legacy fixture types | 12-testimonial-blocks.md |

### Shell & utility

| Web type | Mobile target | Spec |
|----------|---------------|------|
| `SiteHeader` | `pages[].appBar` | [13-shell-blocks.md](../blocks/13-shell-blocks.md) |
| `SiteFooter` | footer `container` | 13-shell-blocks.md |
| `Html`, `Countdown`, `CookieConsent`, `SearchModal` | utility decomposition | [14-utility-blocks.md](../blocks/14-utility-blocks.md) |

---

## Not convertible (warning + skip)

| Web block | Reason |
|-----------|--------|
| `Sidebar`, `SideDrawer` | Web docked layout; use `appDrawer` shell |
| `NavMenu`, `CategoryListMenu`, `ProductSearchMenu` | Use mobile routes (`/categories`, `/search`) |
| `ContactForm` | No mobile form template yet |
| `Template`, `Logos`, `Stats` | Decompose manually or add custom rules |

---

## Fixture Index

| # | Web JSON | Mobile JSON | Blocks Covered |
|---|----------|-------------|----------------|
| 01 | [page-shell.web.json](01-page-shell.web.json) | [page-shell.mobile.json](01-page-shell.mobile.json) | Empty page shell, full envelope |
| 02 | [section-flex-button.web.json](02-section-flex-button.web.json) | [section-flex-button.mobile.json](02-section-flex-button.mobile.json) | Section, Flex, Button |
| 03 | [product-grid.web.json](03-product-grid.web.json) | [product-grid.mobile.json](03-product-grid.mobile.json) | ProductGrid legacy / ProductsGrid alias |
| 04 | [hero.web.json](04-hero.web.json) | [hero.mobile.json](04-hero.mobile.json) | Hero decomposition |
| 05 | [cart-checkout.web.json](05-cart-checkout.web.json) | [cart-checkout.mobile.json](05-cart-checkout.mobile.json) | CartSection, CheckoutForm, cubitCall |
| 06 | [full-home.web.json](06-full-home.web.json) | [full-home.mobile.json](06-full-home.mobile.json) | Composite home page |
| 07 | [mega-full-page.web.json](07-mega-full-page.web.json) | [mega-full-page.mobile.json](07-mega-full-page.mobile.json) | Mega demo with BLOCKS.md types |
| 08 | [blocks-md-catalog.web.json](08-blocks-md-catalog.web.json) | [blocks-md-catalog.mobile.json](08-blocks-md-catalog.mobile.json) | **BLOCKS.md catalog sample** — Content*, VideoEmbed, ProductsGrid, Testimonials, ImageGallery |

---

## Usage

1. Open the [Web → Mobile Converter](/converter) in the browser.
2. Select an example preset or paste a `*.web.json` fixture.
3. The converter output (right pane) should structurally match the `*.mobile.json` fixture.
4. IDs will differ due to deterministic counter — compare structure, not exact IDs.
5. Run [16-post-conversion-validation.md](../16-post-conversion-validation.md) checklist.
6. Review conversion warnings for partial/unsupported blocks.

## Notes

- `app.tenantId` / `apiBaseUrl` in mobile fixtures use placeholder values.
- Fixture mobile files are **reference fragments** unless marked `fullEnvelope: true`.
- The converter produces `fullEnvelope` output when input contains `rootProps`.
- Type aliases (`ContentImage` → `Image`, `ProductsGrid` → `ProductGrid`, etc.) are applied in [lib/transformer.ts](../../../lib/transformer.ts).
