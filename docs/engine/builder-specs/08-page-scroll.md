# Page scroll — `scroll: "none"`

**Phase:** 8  
**Status:** ready-for-builder  
**Production JSON:** all pages use `"scroll": "vertical"` — no `none` yet.

---

## Context

`pages[].scroll` is already emitted in `mobile_production_v2.json` as `"vertical"`. The mobile app reads it in `VariantRepository` and passes `properties.pageScroll` on the synthetic scaffold root.

## New supported value

| Page field | Engine (`pageScroll`) | Builder action |
|------------|----------------------|----------------|
| `"scroll": "none"` | `none` | Disable outer page scroll in preview; ensure body uses scrollable list/grid or `singleChildScrollView` if content overflows |

## When to use `none`

- Full-screen scrollable child (e.g. `gridView` / `listView` with `enableInnerScroll: true`)
- Avoid nested scroll conflicts with outer scaffold scroll

## Do not use `none` when

- Body uses `enableInnerScroll: false` on list/grid (current catalog pattern) — page will not scroll without changing those nodes or keeping `vertical`.
- **The page is a static form (auth, splash, onboarding).** Reach for [`layout: "centered"`](15-page-layout-preset.md) instead. `none` only removes the scroll; it does not give the page a bounded height, inject a `container.expand`, or set the root column to `mainAxisSize: max`, so the form shrink-wraps under the app bar and overflows as soon as it is taller than the viewport. `layout: "centered"` does all three and is exempt from `static_page_overflow_risk`.

## Verification

```powershell
Select-String -Path assets\config\mobile_production_v2.json -Pattern '"scroll":'
```
