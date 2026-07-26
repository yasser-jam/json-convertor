# Zones — Site-Level Layout Areas

Zones are **global, site-wide areas** stored in `SiteData.zones` (not inside per-page `content[]`). They render outside the main page flow — fixed positions like header, footer, drawers, popups, and bottom sheets.

See also: [BLOCKS.md](./BLOCKS.md) for per-block property reference.

---

## Zone types

Zone keys use `-` (hyphen) separators — Puck splits `${parentId}:${zone}` on `:`, so zone names may never contain a colon.

| Zone key | DropZone in root | Block types | Placement |
|---|---|---|---|
| `root:zone-header` | `zone-header` | `SiteHeader` | Top of every page |
| `root:zone-footer` | `zone-footer` | `SiteFooter` | Bottom of every page |
| `root:zone-drawer` | `zone-drawer` | `ZoneDrawer`, `SiteDrawerShell` (legacy) | Portaled overlay — slides from left/right |
| `root:zone-popup` | `zone-popup` | `ZonePopup` | Portaled overlay — centered dialog |
| `root:zone-bottom-sheet` | `zone-bottom-sheet` | `ZoneBottomSheet` | Portaled overlay — slides up from bottom |

> **Legacy aliases**: Older payloads with `zone:header` / `root:zone:header` (and the same for footer/drawer/popup/bottom-sheet) are auto-remapped to the hyphenated keys by `canonicalZoneName()` in `config/lib/normalize-editor-data.ts`. Also migrated: `shell-left-zone` / `shell-right-zone` → `root:zone-drawer`.

**Page content** (`default-zone`) accepts only `Section` blocks. Header, footer, and overlay zones are never mixed into page `content[]`; `normalizeEditorData()` and `stripShellFromContent()` enforce this on save.

### Editor permissions on zone blocks

All zone-owned blocks (`SiteHeader`, `SiteFooter`, `ZoneDrawer`, `ZonePopup`, `ZoneBottomSheet`, `SiteDrawerShell`) apply `ZONE_BLOCK_PERMISSIONS`:

```ts
{ insert: false, duplicate: false, drag: false, delete: false }
```

They are created/removed exclusively through the **المناطق** plugin. Their slots also forbid nesting any `Section` or other zone block via `slot: { type: "slot", disallow: ["Section", ...ZONE_BLOCK_TYPES] }`.

---

## Activation flags

| Block | Activation prop | Meaning |
|---|---|---|
| `SiteHeader`, `SiteFooter` | `visible: boolean` | When `false`, the zone block does not render on the live site |
| `ZoneDrawer`, `ZonePopup`, `ZoneBottomSheet` | `is_active: boolean` | When `false`, overlay is not mounted on the live site (editor still previews it) |

### `is_mobile_only`

All zone blocks support `is_mobile_only: boolean` (default `false`).

- `false` — visible on all breakpoints
- `true` — hidden on desktop (viewport > 640px), visible on mobile only

Applied via shared CSS in `config/lib/zone-responsive.module.css`.

---

## JSON storage (`SiteData`)

```json
{
  "root": { "props": { "direction": "rtl", "language": "ar" } },
  "zones": {
    "root:zone-header": [
      {
        "type": "SiteHeader",
        "props": {
          "id": "SiteHeader-shell",
          "title": "متجري",
          "visible": true,
          "is_mobile_only": false,
          "drawerName": "site-drawer",
          "rightSlot": []
        }
      }
    ],
    "root:zone-footer": [
      {
        "type": "SiteFooter",
        "props": { "visible": true, "is_mobile_only": false }
      }
    ],
    "root:zone-drawer": [
      {
        "type": "ZoneDrawer",
        "props": {
          "is_active": true,
          "is_mobile_only": true,
          "key": "site-drawer",
          "side": "left",
          "backgroundColor": "#ffffff",
          "overlay": true,
          "showCloseButton": true,
          "slot": [
            { "type": "ContentHeading", "props": { "text": "القائمة" } }
          ]
        }
      }
    ],
    "root:zone-popup": [
      {
        "type": "ZonePopup",
        "props": {
          "is_active": false,
          "key": "popup-main",
          "backgroundColor": "#ffffff",
          "borderRadius": "12px",
          "maxWidth": "480px",
          "overlay": true,
          "showCloseButton": true,
          "slot": []
        }
      }
    ],
    "root:zone-bottom-sheet": []
  },
  "pages": [
    { "path": "/", "content": [{ "type": "Section", "props": {} }] }
  ]
}
```

Zone keys are defined in `config/shell-zones.ts`. Legacy `root:shell-left-zone` / `root:shell-right-zone` drawers are migrated into `root:zone-drawer` automatically, and legacy colon-separated aliases (`root:zone:*`) are canonicalised on read.

---

## Event system (`sooq:zone`)

Overlay zones (drawer, popup, bottom sheet) open/close via a unified document event:

```ts
document.dispatchEvent(
  new CustomEvent("sooq:zone", {
    detail: { key: "login", action: "open" }, // "open" | "close" | "toggle"
  })
);
```

Helpers (`config/lib/zone-events.ts`):

```ts
import { openZone, closeZone, toggleZone } from "@/core/config/lib/zone-events";

openZone("site-drawer");
closeZone("login");
toggleZone("cart-sheet");
```

### HTML attribute triggers

Any clickable element can toggle a zone without JavaScript:

```html
<button data-sooq-zone-toggle="site-drawer" data-sooq-zone-action="toggle">
  Menu
</button>
```

`SiteHeader` drawer button sets both `data-sooq-zone-toggle` and legacy `data-sooq-drawer-toggle` for backward compatibility.

### ContentButton wiring

Set `destinationType: "zone"` on a `ContentButton`:

```json
{
  "type": "ContentButton",
  "props": {
    "label": "تسجيل الدخول",
    "destinationType": "zone",
    "zoneKey": "login",
    "zoneAction": "open"
  }
}
```

---

## Zone presets

Zone presets live in `config/presets/` as `ZonePreset` (not `SectionPreset`) and are indexed by `ZonePresetCategory`.

```ts
type ZonePresetCategory =
  | "zone-header"
  | "zone-footer"
  | "zone-drawer"
  | "zone-popup"
  | "zone-bottom-sheet";

type ZonePreset = {
  id: string;
  category: ZonePresetCategory;
  title: string;
  previewImage?: string;
  componentData: ComponentDataOptionalId;
  headerLayout?: HeaderPresetLayout; // header presets only
};
```

| Category | Export | Presets |
|---|---|---|
| `zone-header` | `ZONE_HEADER_PRESETS` | transparent centered, solid split, commerce actions, light actions (each also carries a `headerLayout` id — `logo-right-links-left` \| `logo-center-actions` \| `logo-left-links-center` \| `logo-right-burger-left`) |
| `zone-footer` | `ZONE_FOOTER_PRESETS` | commerce full, default classic, commerce minimal |
| `zone-drawer` | `ZONE_DRAWER_PRESETS` | mobile nav drawer (title + NavMenu) |
| `zone-popup` | `ZONE_POPUP_PRESETS` | login popup, basic empty popup |
| `zone-bottom-sheet` | `ZONE_BOTTOM_SHEET_PRESETS` | basic bottom sheet |

Apply via `getZonePresetsByCategory("zone-header")` from `config/presets/index.ts`; header presets are inserted through `applyHeaderZonePreset()` which merges the preset tree into `root:zone-header`.

---

## Editor integration

- **Zones plugin** (`plugins/zones`) — left sidebar tab **المناطق** lists all site zones as cards. Selecting a card opens the **Fields** sidebar for that zone's properties, highlights it on the canvas, and opens overlay previews (drawer/popup/bottom sheet). Click the same card again to deselect and close overlays.
- Zone blocks are **not** in the blocks palette (`shell` category removed). They are managed exclusively through the Zones plugin.
- **Root layout** (`config/root.tsx`) exposes five zone DropZones; overlay drop chrome is hidden in the editor.

---

## Zone block property reference

Full field list for the overlay zone blocks (`SiteHeader` / `SiteFooter` are documented in [BLOCKS.md](./BLOCKS.md#siteheader)).

### ZoneDrawer (`type: "ZoneDrawer"`)

| Property | Type | Default | Notes |
|---|---|---|---|
| `is_active` | `boolean` | `false` | Storefront gate — editor still previews when `false` |
| `is_mobile_only` | `boolean` | `true` | Hides on viewports > 640px on the live site |
| `key` | `string` | `"site-drawer"` | Match this value from `sooq:zone` event / `data-sooq-zone-toggle` |
| `side` | `"left" \| "right"` | `"left"` | Which edge the drawer slides from |
| `backgroundColor` | `string` | `"#ffffff"` | Empty → white |
| `overlay` | `boolean` | `true` | Backdrop scrim |
| `showCloseButton` | `boolean` | `true` | × button in the corner |
| `slot` | `Slot` | `[]` | Any block except `Section` or another zone block |

### ZonePopup (`type: "ZonePopup"`)

| Property | Type | Default | Notes |
|---|---|---|---|
| `is_active` | `boolean` | `false` | |
| `is_mobile_only` | `boolean` | `false` | |
| `key` | `string` | `"popup-main"` | |
| `backgroundColor` | `string` | `"#ffffff"` | |
| `borderRadius` | `string` | `"12px"` | Any CSS value |
| `maxWidth` | `string` | `"480px"` | |
| `overlay` | `boolean` | `true` | |
| `showCloseButton` | `boolean` | `true` | |
| `slot` | `Slot` | `[]` | |

### ZoneBottomSheet (`type: "ZoneBottomSheet"`)

| Property | Type | Default | Notes |
|---|---|---|---|
| `is_active` | `boolean` | `false` | |
| `is_mobile_only` | `boolean` | `true` | |
| `key` | `string` | `"cart-sheet"` | |
| `backgroundColor` | `string` | `"#ffffff"` | |
| `borderRadius` | `string` | `"16px 16px 0 0"` | Any CSS value |
| `maxHeight` | `string` | `"80vh"` | |
| `overlay` | `boolean` | `true` | |
| `showCloseButton` | `boolean` | `true` | |
| `slot` | `Slot` | `[]` | |

---

## Migration notes

| From | To |
|---|---|
| `SiteHeader` / `SiteFooter` in page `content[]` | `root:zone-header` / `root:zone-footer` (auto-migrated by `enforceShellPlacement`) |
| `SiteDrawerShell` in shell rails (`root:shell-left-zone`) | `ZoneDrawer` in `root:zone-drawer` |
| Colon-separated zone keys (`root:zone:header`, `zone:header`, …) | Hyphen keys (`root:zone-header`, …) — remapped by `canonicalZoneName()` in `normalize-editor-data.ts` |
| `sooq:drawer` events | `sooq:zone` events (legacy `sooq:drawer` still works on `SiteDrawerShell` / `SiteDrawer` component) |
| Header/footer section presets | `ZonePreset` with category `zone-header` / `zone-footer` |

`SiteDrawerShell` is **deprecated** — moved to the legacy category (hidden from picker). Existing JSON continues to load; new stores should use `ZoneDrawer` with a `slot` for flexible content.

---

## Constants reference

```ts
// config/shell-zones.ts
ZONE_HEADER          // "zone-header"
ZONE_FOOTER          // "zone-footer"
ZONE_DRAWER          // "zone-drawer"
ZONE_POPUP           // "zone-popup"
ZONE_BOTTOM_SHEET    // "zone-bottom-sheet"

ROOT_ZONE_HEADER          // "root:zone-header"       — key in SiteData.zones
ROOT_ZONE_FOOTER          // "root:zone-footer"
ROOT_ZONE_DRAWER          // "root:zone-drawer"
ROOT_ZONE_POPUP           // "root:zone-popup"
ROOT_ZONE_BOTTOM_SHEET    // "root:zone-bottom-sheet"

// Legacy shell rails (SiteDrawerShell v1)
SHELL_LEFT_ZONE           // "shell-left-zone"
SHELL_RIGHT_ZONE          // "shell-right-zone"
ROOT_SHELL_LEFT_ZONE      // "root:shell-left-zone"
ROOT_SHELL_RIGHT_ZONE     // "root:shell-right-zone"

ZONE_BLOCK_TYPES = [
  "SiteHeader", "SiteFooter", "SiteDrawerShell",
  "ZoneDrawer", "ZonePopup", "ZoneBottomSheet",
];

ZONE_BLOCK_PERMISSIONS = {
  insert: false, duplicate: false, drag: false, delete: false,
};
```
