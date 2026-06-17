# 14 — Utility Blocks

Web utility blocks ([docs/blocks.md §5.6](../../BLOCKS.md)).

---

## Html

Raw HTML textarea block.

### Mobile decomposition

| Condition | Output |
|-----------|--------|
| Safe subset HTML | `richtext` |
| Complex/unsafe HTML | `text` with tags stripped |
| `enableHtmlRichTextBlock: false` on root | prefer strip policy |

### Gaps

- No arbitrary HTML widget in mobile engine.
- Scripts, iframes, custom CSS **must not** pass through.

---

## Countdown

Countdown to `targetDate` (ISO 8601).

### Mobile decomposition

```
column
  ├── text (title / titleAr)
  └── row (days, hours, minutes, seconds)
        └── text or timer widgets
```

| Web | Mobile |
|-----|--------|
| `targetDate` | **Gap:** mobile `timer` uses `durationMs` from now → target; compute delta at convert time for static JSON, or use engine countdown if added |
| `showDays/Hours/Minutes/Seconds` | omit unit columns when off |
| `size` sm/md/lg | fontSize on unit labels |

### Fallback

Use four `text` nodes bound to static computed values for marketing snapshots; for live countdown requires runtime timer node:

```json
{
  "type": "timer",
  "props": { "durationMs": 86400000 },
  "tap": { "type": "navigate", "route": "/products" }
}
```

Document: live countdown needs engine support or periodic rebuild.

---

## CookieConsent

GDPR banner block.

### Mobile decomposition

```
container (position bottom — last child in body)
  └── column
        ├── text (message / messageAr)
        └── row
              ├── button (accept)
              └── button (decline)
```

| Web | Mobile |
|-----|--------|
| `position: top/bottom` | order in column (top = insert first body child) |
| accept/decline labels | `button.props.label` |
| — | **Gap:** no persistent cookie store — buttons can noop or navigate |

**Policy:** Include as static UI; persistence is out of SDUI scope.

---

## SearchModal

Product search overlay on web.

### Mobile decomposition

**Preferred:** `tap.navigate` to `/search` page (prod has full search UI).

| Web | Mobile |
|-----|--------|
| `placeholder` / `placeholderAr` | search page `textFormField.hint` |
| `maxResults` | search request `size` |
| `showPrice`, `showCategory` | search result item template |

Alternative: `button` "Search" → navigate `/search`.

### Gaps

- Modal overlay pattern → full page on mobile (no modal primitive in engine).

### Before / after

**Web:**

```json
{
  "type": "SearchModal",
  "props": {
    "placeholder": "Search products…",
    "maxResults": "8"
  }
}
```

**Mobile:**

```json
{
  "id": "search-nav-button-1",
  "type": "button",
  "props": { "label": "بحث عن منتجات…", "icon": "search" },
  "tap": { "type": "navigate", "route": "/search", "navigation_type": "push" }
}
```

Or rely on tab shell search tab without extra node.

---

## Utility summary

| Web | Mobile strategy |
|-----|-----------------|
| Html | richtext / stripped text |
| Countdown | timer + text / static unit row |
| CookieConsent | bottom banner composite |
| SearchModal | navigate to `/search` |
