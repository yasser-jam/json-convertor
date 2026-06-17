# 16 — Post-Conversion Validation

Checklist before shipping converted JSON to `assets/config/` or production pipeline.

References: [03-global-engine-rules.md](03-global-engine-rules.md), [LAYOUT_CONSTRAINT_AUDIT.md](../LAYOUT_CONSTRAINT_AUDIT.md), `lib/engine/validation/`.

---

## 1. Envelope

- [ ] `schemaVersion` is `"1.0"`
- [ ] `app.apiBaseUrl`, `app.tenantId`, `app.tenantSlug` populated from deployment (not fabricated)
- [ ] `theme` contains `colors`, `typography`, `radius`, `spacing`, `buttons`
- [ ] `navigation.type` is `"tabs"`
- [ ] `navigation.initialRoute` exists in `pages[]`
- [ ] Every `navigation.tabs[].route` has matching `pages[]` entry (or redirect policy documented)
- [ ] All full-screen flows listed in `shellExcludeRoutes`

---

## 2. Pages

- [ ] Each page has unique `id` and `route`
- [ ] Each page has `title` and `body` array
- [ ] `scroll` is `vertical` or `none` only
- [ ] `layout: centered` only with `scroll: none`
- [ ] No `SiteHeader` / `SiteFooter` raw web types left in `body[]`

---

## 3. Component tree

- [ ] Every node has `id`, `type`, `props`
- [ ] No node has both `child` and `children`
- [ ] All `type` values are valid `GenericComponentType` strings
- [ ] No `type: spacer`
- [ ] No `semanticType` used where `type` should be
- [ ] IDs unique within each page

---

## 4. Layout safety

- [ ] Catalog pages: `scroll: vertical` + list/grid `enableInnerScroll: false`
- [ ] No viewport-centered `column` under vertical scroll without `expand` or `layout: centered`
- [ ] `scroll: none` pages have short body OR inner scrollable list/grid
- [ ] No nested `singleChildScrollView` under page scroll
- [ ] Row search bars use `container.expand` horizontal where needed
- [ ] Spacing uses `gap` / `sizedBox`, not removed spacer type

Run app in debug — `LayoutConstraintValidator` logs warnings.

---

## 5. Actions

- [ ] All navigation taps have `route`
- [ ] Checkout/auth logout uses `cubitCall` before navigate
- [ ] No `button.onTap` inside props
- [ ] `addToCart` uses `cubit: cart`, not bare navigate
- [ ] External URLs use `openUrl`, not `navigate`

---

## 6. Data / API

- [ ] All catalog URLs under `/api/v1/public/`
- [ ] Each `gridView`/`listView` collection has `requestKey` + `requestUrl`
- [ ] `itemBuilder.source` matches `dataContext.requests.{requestKey}.data`
- [ ] Product paths use `:productId` param consistently
- [ ] No web fixture ids (`prod-001`) left in production bindings

---

## 7. Locale

- [ ] Arabic storefront: labels prefer `*Ar` fields where provided
- [ ] RTL pages: text nodes default `textAlign: right` where appropriate
- [ ] Phone/OTP fields use `textDirection: ltr`

---

## 8. Schema validation

- [ ] `contactButton` has `channel`, `label`
- [ ] `image` has `url` (or `urlPath`)
- [ ] `videoPlayer` has `url`
- [ ] `expansionTile` has `title`
- [ ] `timer` has `durationMs`

Lenient unknown props are allowed but should be minimized.

---

## 9. Manual smoke test

1. `flutter run` with converted config
2. Walk each converted route
3. Verify product grid loads, detail opens, cart actions work
4. Rotate device — no overflow exceptions
5. Tab navigation returns to shell correctly

---

## 10. Diff against v0 output

If migrating from [v0 converter](https://v0-documentation-for-json-builder.vercel.app/converter):

- [ ] Full envelope present (not pages-only)
- [ ] API paths corrected to `/api/v1/public/products`
- [ ] Product grid uses full card template
- [ ] Section backgrounds on `container.style.color` correctly

---

## Validation severity

| Issue | Severity |
|-------|----------|
| Unknown component type | **Error** — won't parse |
| child + children | **Error** |
| Wrong API path | **Error** — empty/wrong data |
| Layout overflow risk | **Warning** in debug |
| Missing Arabic label | **Warning** — UX |
| Html block stripped | **Info** — document in gap log |
