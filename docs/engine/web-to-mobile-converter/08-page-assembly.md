# 08 — Page Assembly

Rule **1.x**: web page shell → mobile `pages[]` entry.

---

## Rule 1.1 — Page shell → `pages[]`

### Web input

```json
{
  "path": "/home",
  "label": "Home",
  "blocks": [ ]
}
```

Or Puck `UserData` + external path.

### Mobile output

```json
{
  "id": "page-home",
  "route": "/home",
  "title": "Home",
  "background": "#FFFFFF",
  "scroll": "vertical",
  "appBar": { },
  "body": [ ]
}
```

| Web field | Mobile field | Rule |
|-----------|--------------|------|
| `path` | `route` | Apply [05-navigation-and-routes.md](05-navigation-and-routes.md) |
| `label` / `title` | `title` | AppBar title |
| `blocks[]` | `body[]` | Each block recursively converted |
| — | `id` | `page-{slug}` from route |
| `root.props` surface color | `background` | Optional page background |
| — | `scroll` | Default `vertical`; see below |

### `showBackButton` (v0 pattern — appBar)

Mobile prod uses explicit `appBar.props.showBackButton`. Derive:

| Route | `showBackButton` |
|-------|------------------|
| `/home`, `/` | `false` |
| Tab root routes | `false` |
| Detail / checkout / auth | `true` |

---

## Body assembly order

1. Strip `SiteHeader` from blocks → lift to `pages[].appBar`
2. Strip `SiteFooter` from blocks → append converted footer subtree at **end** of `body[]`
3. Strip `SiteDrawerShell` from zones → global `appDrawer` on shell host page or home page
4. Convert remaining blocks in document order
5. Merge adjacent `Section` blocks as separate container siblings (do not flatten unless empty)

---

## Scroll selection

| Page kind | `scroll` | `layout` |
|-----------|----------|----------|
| Home, products, search results | `vertical` | omit |
| Product detail | `vertical` | omit |
| Cart, checkout steps | `vertical` | omit |
| Auth login, OTP | `none` | omit |
| Splash | `none` | `centered` |

Catalog rule: outer scroll + `gridView.enableInnerScroll: false` — [03-global-engine-rules.md](03-global-engine-rules.md).

---

## AppBar from SiteHeader

When web `content[]` contains `SiteHeader`:

```json
{
  "id": "home-app-bar",
  "type": "appBar",
  "props": {
    "title": "Home",
    "showBackButton": false,
    "backgroundColor": "#FFFFFF",
    "foregroundColor": "#0F172A",
    "elevation": 0
  }
}
```

Map from `root.props.headerBrandTitle`, `headerBackgroundColor`, `headerTextColor`. Drawer button → trailing icon with `tap: { type: "openDrawer" }`.

Details: [blocks/13-shell-blocks.md](blocks/13-shell-blocks.md).

---

## Multi-page batch

Input: array of `{ path, label, blocks }`.

Output: single `MobileAppConfig` with merged `theme`, shared `navigation`, and `pages[]` concatenation.

**Rule:** One `theme` from last-wins or first-wins `root.props` — document converter flag `themeMergeStrategy`.

---

## Full envelope assembly

```javascript
{
  schemaVersion: "1.0",
  app: injectAppDefaults(config),
  theme: convertTheme(rootProps),
  navigation: buildNavigation(rootProps, pages),
  pages: pages.map(convertPage)
}
```

---

## Before / after (empty page)

**Web:**

```json
{
  "path": "/profile",
  "label": "User Profile",
  "blocks": []
}
```

**Mobile page entry:**

```json
{
  "id": "page-profile",
  "route": "/profile",
  "title": "User Profile",
  "background": "#FFFFFF",
  "scroll": "vertical",
  "appBar": {
    "id": "profile-app-bar",
    "type": "appBar",
    "props": {
      "title": "User Profile",
      "showBackButton": true
    }
  },
  "body": []
}
```

Full envelope example: [fixtures/01-page-shell.mobile.json](fixtures/01-page-shell.mobile.json).
