// ─── Module-level state ─────────────────────────────────────────────────────
let _idCounter = 0;
let _warnings: string[] = [];

function generateId(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}
function resetIdCounter() {
  _idCounter = 0;
}
function resetWarnings() {
  _warnings = [];
}
function addWarning(message: string) {
  _warnings.push(message);
}
function takeWarnings(): string[] {
  const w = [..._warnings];
  _warnings = [];
  return w;
}

/** Maps BLOCKS-MOBILE.md Puck type names to internal converter type names. */
const WEB_TYPE_ALIASES: Record<string, string> = {
  ContentImage: "Image",
  ContentParagraph: "Text",
  ContentHeading: "Heading",
  ContentButton: "Button",
  ContentDivider: "Divider",
  ContentIcon: "Icon",
  ContentHtml: "Html",
  ContentLink: "Link",
  ContentInput: "Input",
  ContentSwitch: "Switch",
  VideoEmbed: "YouTube",
  ProductsGrid: "ProductGrid",
  OrderHistory: "OrderList",
  CartItem: "Group",
  ProductImageCarousel: "ProductGallery",
};

const UNSUPPORTED_LEAF_BLOCKS = new Set([
  "CategoryListMenu",
  "ProductSearchMenu",
  "ProductVariants",
]);

/**
 * Web presets, not persisted block types. A preset is an authoring shortcut that
 * expands into ordinary blocks before the JSON is saved, so it must never reach the
 * converter — seeing one means the web side saved an unexpanded tree.
 */
const PRESET_ONLY_TYPES = new Set(["CartList"]);

/**
 * Binding scope for `valueContext` → `valuePath` resolution inside bound Groups.
 * `base` is the dataContext prefix every bound field hangs off:
 *   - `"item"` inside a repeat template (cart line, grid item)
 *   - `"dataContext.requests.<key>.data"` for a standalone product-bound Group
 */
type BindingScope = { kind: "product" | "cart"; base: string };
let _bindingScope: BindingScope | null = null;
/** One cart-line template per page — later `cartLineId` Groups are duplicates of the same list. */
let _cartTemplateEmitted = false;
let _warnedContainerRequest = false;
let _pageStickyFooter: Record<string, unknown> | null = null;
let _zoneSlots: Map<string, Record<string, unknown>[]> = new Map();
/** Overlay zone keys that some tap actually opened — the rest are dead weight on this page. */
let _zoneSlotsUsed: Set<string> = new Set();
/** Zone keys that resolve to the page-level appDrawer (ZoneDrawer / SiteDrawerShell / SiteHeader.drawerName). */
let _drawerZoneKeys: Set<string> = new Set();

/**
 * The auth form currently being converted. Set by transformSection when a Section holds both
 * ContentInput fields and a ContentButton whose `buttonAction` is an auth action — the Section's
 * content is then wrapped in a `form` node and the button submits it (see resolveAuthFormTap).
 * Without this, a `login` button is only a navigate stub to the engine's native /auth/login screen.
 */
type AuthForm = { formId: string; fields: string[] };
let _activeAuthForm: AuthForm | null = null;

/** Auth `buttonAction`s that submit the surrounding form rather than navigating. */
const AUTH_FORM_ACTIONS = new Set(["login"]);

/** Field ids that are never sent as auth params (confirmations, UI-only toggles). */
const AUTH_PARAM_EXCLUDED_FIELDS = new Set(["passwordConfirm", "confirmPassword", "rememberMe"]);

/**
 * Collects the ContentInput field ids in a block subtree, stopping at nested Sections
 * (each Section owns its own form scope).
 */
function collectFormFieldIds(blocks: Record<string, unknown>[], acc: string[] = []): string[] {
  for (const block of blocks) {
    const type = normalizeBlockType((block.type as string) || "");
    if (type === "Section") continue;
    const props = (block.props || {}) as Record<string, unknown>;
    if (type === "Input") {
      const id = (props.name as string) || (props.id as string) || "field";
      if (!acc.includes(id)) acc.push(id);
      continue;
    }
    if (type === "Switch") {
      const id = (props.name as string) || (props.id as string) || "switch";
      if (!acc.includes(id)) acc.push(id);
      continue;
    }
    collectFormFieldIds(getChildren(block), acc);
  }
  return acc;
}

/** The auth `buttonAction` submitted by this block subtree, if any. */
function findAuthFormAction(blocks: Record<string, unknown>[]): string | null {
  for (const block of blocks) {
    const type = normalizeBlockType((block.type as string) || "");
    if (type === "Section") continue;
    const props = (block.props || {}) as Record<string, unknown>;
    if (type === "Button" && AUTH_FORM_ACTIONS.has((props.buttonAction as string) || "")) {
      return props.buttonAction as string;
    }
    const nested = findAuthFormAction(getChildren(block));
    if (nested) return nested;
  }
  return null;
}

/** Web `valueContext.path` → the mobile field name, appended to the active binding base. */
const VALUE_CONTEXT_MAP: Record<string, { valueField?: string; urlField?: string }> = {
  "product.title": { valueField: "name" },
  "product.description": { valueField: "description" },
  "images[0].url": { urlField: "primaryImageUrl" },
  "pricing.displayPrice": { valueField: "price" },
  "pricing.displayLineTotal": { valueField: "lineTotal" },
  quantity: { valueField: "quantity" },
  lineId: { valueField: "lineId" },
  variantId: { valueField: "variantId" },
};

function withBindingScope<T>(scope: BindingScope | null, fn: () => T): T {
  const prev = _bindingScope;
  _bindingScope = scope;
  try {
    return fn();
  } finally {
    _bindingScope = prev;
  }
}

function getValueContextPath(props: Record<string, unknown>): string | undefined {
  const vc = props.valueContext as Record<string, unknown> | undefined;
  return vc?.path as string | undefined;
}

function applyValueContext(
  props: Record<string, unknown>,
  outProps: Record<string, unknown>,
  kind: "text" | "image" | "button"
): void {
  const path = getValueContextPath(props);
  if (path && _bindingScope) {
    const mapped = VALUE_CONTEXT_MAP[path];
    const base = _bindingScope.base;
    if (mapped?.valueField && (kind === "text" || kind === "button")) {
      outProps.valuePath = `${base}.${mapped.valueField}`;
      delete outProps.value;
    }
    if (mapped?.urlField && kind === "image") {
      outProps.urlPath = `${base}.${mapped.urlField}`;
      delete outProps.url;
    }
    if (!mapped) {
      addWarning(`valueContext path "${path}" has no mobile field mapping; the static fallback value was kept`);
    }
  }
  // labelValueContext / altValueContext: engine has no labelPath or semanticsLabelPath —
  // use a sibling text node with valuePath for dynamic labels in repeat templates.
}

function normalizeBlockType(type: string): string {
  return WEB_TYPE_ALIASES[type] || type;
}

const GAP_TOKEN_MAP: Record<string, number> = { sm: 8, md: 12, lg: 16, xl: 24 };

const BUTTON_VARIANT_MAP: Record<string, string> = {
  primary: "elevated",
  secondary: "outlined",
  outline: "outlined",
  ghost: "text",
  danger: "filled",
  error: "filled",
};

/** `"theme-md"` / `"md"` / `"44|18|9|1rem"` → `sm` | `md` | `lg`. */
function resolveButtonSizeToken(size: string | undefined): string {
  if (!size) return "md";
  const key = size.replace(/^theme-/, "");
  return key === "sm" || key === "lg" ? key : "md";
}

function resolveButtonVariant(variant: string | undefined): string {
  if (!variant) return "elevated";
  return BUTTON_VARIANT_MAP[variant] || "elevated";
}

function flexProps(
  mainAxisAlignment: string,
  crossAxisAlignment: string,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return { mainAxisAlignment, crossAxisAlignment, ...extra };
}

// ─── Utility functions ──────────────────────────────────────────────────────

function parsePx(value: string | number | undefined, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "number") return value;
  const n = parseFloat(String(value));
  return isNaN(n) ? fallback : n;
}

function resolveBilingual(en: string | undefined, ar: string | undefined, language: string): string {
  if (language === "ar" && ar) return ar;
  return en || "";
}

function resolveColor(
  colorMode: string | undefined,
  colorTheme: string | undefined,
  colorFixed: string | undefined,
  rootProps: Record<string, unknown>
): string | undefined {
  if (colorMode === "fixed" && colorFixed) return colorFixed;
  if (colorMode === "theme" && colorTheme) {
    const colorMap: Record<string, string> = {
      primary: (rootProps.primary as string) || "#0b78c5",
      surface: (rootProps.surface as string) || "#ffffff",
      success: (rootProps.success as string) || "#0f9d73",
      warning: (rootProps.warning as string) || "#c77a15",
      error: (rootProps.error as string) || "#ef4444",
      dark: (rootProps.dark as string) || "#10213a",
      text: (rootProps.text as string) || "#0f172a",
      neutral: (rootProps.neutral as string) || "#64748b",
    };
    return colorMap[colorTheme];
  }
  return undefined;
}

function resolveTextColor(color: string | undefined): string | undefined {
  if (color === "default") return undefined; // theme default
  if (color === "muted") return "#6b7d93";
  return undefined;
}

const FONT_SIZE_MAP: Record<string, number> = {
  xs: 12, sm: 14, s: 14, md: 16, m: 16, lg: 18, l: 18, xl: 22, xxl: 28, "2xl": 28,
};
function resolveFontSize(size: string | undefined, fallback = 16): number {
  return FONT_SIZE_MAP[size || ""] || fallback;
}

function resolveThemePx(
  value: string | number | undefined,
  rootProps: Record<string, unknown>,
  fallback = 0
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "number") return value;
  const s = String(value);
  if (!s.startsWith("theme-")) return parsePx(s, fallback);

  const themeKey = s.replace("theme-", "");
  const bareNum = themeKey.match(/^(\d+)$/);
  if (bareNum) return parseInt(bareNum[1], 10);

  const spacingMap: Record<string, number> = {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 36, "4": 4, "8": 8, "16": 16, "24": 24, "40": 40,
  };
  if (spacingMap[themeKey] !== undefined) return spacingMap[themeKey];

  if (themeKey === "none") return 0;
  if (themeKey === "full") return 999;

  // Radius tokens: fixed spec defaults, override with rootProps if available
  const radiusPropMap: Record<string, string> = {
    sm: "radiusSm", md: "radiusMd", lg: "radiusLg", xl: "radiusXl",
  };
  const radiusFallbackMap: Record<string, number> = { sm: 4, md: 8, lg: 12, xl: 16 };
  if (radiusPropMap[themeKey]) {
    const fromRoot = rootProps[radiusPropMap[themeKey]];
    if (fromRoot !== undefined) return parsePx(fromRoot as string, radiusFallbackMap[themeKey]);
    return radiusFallbackMap[themeKey];
  }

  return resolveFontSize(themeKey, fallback);
}

function resolveThemeColor(
  token: string | undefined,
  rootProps: Record<string, unknown>
): string | undefined {
  if (!token) return undefined;
  if (token.startsWith("theme-")) {
    const key = token.replace("theme-", "");
    return resolveColor("theme", key, undefined, rootProps);
  }
  const muted = resolveTextColor(token);
  if (muted) return muted;
  if (token.startsWith("#")) return token;
  return token;
}

function resolveThemeFontWeight(weight: string | undefined): string | undefined {
  if (!weight) return undefined;
  const map: Record<string, string> = {
    "theme-light": "normal",
    "theme-normal": "normal",
    "theme-semibold": "semibold",
    "theme-bold": "bold",
    light: "normal",
    normal: "normal",
    semibold: "semibold",
    bold: "bold",
  };
  return map[weight] || resolveFontWeight(weight);
}

function resolveThemeFontSize(
  value: string | undefined,
  rootProps: Record<string, unknown>,
  fallback = 16
): number {
  if (!value) return fallback;
  if (value.startsWith("theme-")) {
    const key = value.replace("theme-", "");
    if (FONT_SIZE_MAP[key] !== undefined) return FONT_SIZE_MAP[key];
  }
  return resolveThemePx(value, rootProps, fallback);
}

function resolveGridGap(gap: string | number | undefined): number {
  if (typeof gap === "number") return gap;
  if (!gap) return 16;
  if (GAP_TOKEN_MAP[gap]) return GAP_TOKEN_MAP[gap];
  return parsePx(gap, 16);
}

/** `CollectionPickerRef` → the segment the collection endpoint is keyed by (`id`, else `slug`). */
function resolveCollectionRef(collection: unknown): string {
  if (typeof collection === "string") return collection;
  if (collection && typeof collection === "object") {
    const ref = collection as Record<string, unknown>;
    return String(ref.id || ref.slug || "all");
  }
  return "all";
}

function buildCollectionRequestUrl(collection: string | Record<string, unknown>, maxSize: number): string {
  const size = Math.min(maxSize, 20);
  const collectionId =
    typeof collection === "object" && collection?.id
      ? String(collection.id)
      : collection && collection !== "all"
        ? String(collection)
        : "";
  if (!collectionId || collectionId === "all") {
    return `/api/v1/public/products?page=0&size=${size}`;
  }
  return `/api/v1/public/collections/${encodeURIComponent(collectionId)}/products?page=0&size=${size}`;
}

/**
 * `metadata.apiUrl` → a relative mobile path. Strips the host, rewrites `/admin/`
 * to `/public/`, and guarantees the `/api/v1` prefix the engine expects
 * (see 15-data-and-api-binding.md § Standard requestUrl paths).
 */
function normalizeAdminApiUrl(apiUrl: string): string {
  let path = apiUrl;
  let search = "";
  try {
    const url = new URL(apiUrl);
    path = url.pathname;
    search = url.search;
  } catch {
    path = apiUrl.replace(/^https?:\/\/[^/]+/, "");
    const q = path.indexOf("?");
    if (q >= 0) {
      search = path.slice(q);
      path = path.slice(0, q);
    }
  }

  path = path.replace(/^\/admin\//, "/public/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (!path.startsWith("/api/")) path = `/api/v1${path}`;
  return path + search;
}

const FONT_WEIGHT_MAP: Record<string, string> = {
  normal: "normal", medium: "medium", semibold: "semibold", bold: "bold",
};
function resolveFontWeight(weight: string | undefined): string | undefined {
  return FONT_WEIGHT_MAP[weight || ""];
}

const LINE_HEIGHT_MAP: Record<string, number> = {
  tight: 1.25, normal: 1.5, relaxed: 1.75,
};
function resolveLineHeight(lh: string | undefined): number | undefined {
  return LINE_HEIGHT_MAP[lh || ""];
}

const LUCIDE_TO_MATERIAL: Record<string, string> = {
  Star: "star", star: "star", Heart: "favorite", heart: "favorite",
  ShoppingCart: "shopping_cart", "shopping-cart": "shopping_cart",
  Menu: "menu", menu: "menu", X: "close", x: "close", close: "close",
  Search: "search", search: "search", User: "person", user: "person",
  Home: "home", home: "home", Package: "package",
  Palette: "palette", ArrowRight: "arrow_forward", "arrow-right": "arrow_forward",
  ArrowLeft: "arrow_back", "arrow-left": "arrow_back",
  ChevronDown: "expand_more", ChevronUp: "expand_less", Plus: "add", plus: "add",
  Minus: "remove", minus: "remove", Trash: "delete", trash: "delete",
  Edit: "edit", edit: "edit", pencil: "edit", Settings: "settings",
  Bell: "notifications", bell: "notifications", Mail: "email", mail: "email",
  Phone: "phone", phone: "phone", MapPin: "location_on", "map-pin": "location_on",
  Clock: "access_time", clock: "access_time", Check: "check", check: "check",
  AlertCircle: "error_outline", "alert-circle": "error_outline",
  Info: "info", info: "info", XCircle: "cancel",
  ExternalLink: "open_in_new", Grid: "grid_view", grid: "grid_view",
  List: "list", list: "list", Sliders: "tune",
  "shield-check": "verified_user", ShieldCheck: "verified_user",
  truck: "local_shipping", Truck: "local_shipping",
  filter: "filter_list", share: "share", eye: "visibility",
  "check-circle": "check_circle", feather: "edit",
  calendar: "calendar_today", tag: "label",
};

function kebabToPascal(str: string): string {
  return str.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
}

function resolveIcon(lucideName: string | undefined): string {
  if (!lucideName) return "help_outline";
  if (LUCIDE_TO_MATERIAL[lucideName]) return LUCIDE_TO_MATERIAL[lucideName];
  const pascal = kebabToPascal(lucideName);
  if (LUCIDE_TO_MATERIAL[pascal]) return LUCIDE_TO_MATERIAL[pascal];
  return "help_outline";
}

function getChildren(block: Record<string, unknown>): Record<string, unknown>[] {
  const props = (block.props || {}) as Record<string, unknown>;
  return (props.content as Record<string, unknown>[]) || (props.items as Record<string, unknown>[]) || (props.children as Record<string, unknown>[]) || [];
}

// ─── Aspect ratio map ────────────────────────────────────────────────────────
const ASPECT_RATIO_MAP: Record<string, number> = {
  square: 1, landscape: 16 / 9, portrait: 3 / 4, wide: 21 / 9, "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1,
};
function resolveAspectRatio(ratio: string | undefined): number | undefined {
  return ASPECT_RATIO_MAP[ratio || ""];
}

// ─── Button size → height ────────────────────────────────────────────────────
const BUTTON_SIZE_HEIGHT: Record<string, number> = { sm: 36, md: 48, lg: 56 };

// ─── Resolve tap action from button/link props ────────────────────────────────
function resolveTap(props: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | undefined {
  const destType = (props.destinationType as string) || "";

  if (destType === "zone") {
    const zoneKey = (props.zoneKey as string) || "";
    const zoneAction = (props.zoneAction as string) || "open";
    if (zoneAction === "close") return { type: "closeBottomSheet" };
    if (_drawerZoneKeys.has(zoneKey)) return { type: "openDrawer" };
    const slotBlocks = _zoneSlots.get(zoneKey);
    if ((!slotBlocks || slotBlocks.length === 0) && (zoneKey === "login" || zoneKey === "site-drawer")) {
      return zoneKey === "login"
        ? { type: "navigate", route: "/auth/login", navigation_type: "push" }
        : { type: "openDrawer" };
    }
    if (slotBlocks && slotBlocks.length > 0) {
      _zoneSlotsUsed.add(zoneKey);
      const converted = slotBlocks.map((b) => transformBlock(b, rootProps)).filter(Boolean) as Record<string, unknown>[];
      const child = converted.length === 1
        ? converted[0]
        : {
            id: generateId("zone-sheet-col"),
            type: "column",
            props: flexProps("start", "stretch", { gap: 12 }),
            children: converted,
          };
      return { type: "openBottomSheet", child };
    }
    addWarning(`Zone "${zoneKey}" has no slot content; zone tap omitted`);
    return undefined;
  }

  const action = destType === "action"
    ? ((props.buttonAction as string) || "")
    : ((props.buttonAction as string) || "link");

  if (action === "link" || destType === "link") {
    const link = props.link as Record<string, unknown> | undefined;
    if (link) {
      const kind = link.kind as string;
      if (kind === "page") {
        const route = (link.pageId as string) || (link.url as string);
        if (route) return { type: "navigate", route: normalizeRoute(route), navigation_type: "push" };
      }
      if (kind === "url") {
        const url = link.url as string;
        if (url) return { type: "openUrl", url };
      }
    }
    const href = (props.href as string) || "";
    if (href) {
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("www.")) {
        return { type: "openUrl", url: href };
      }
      return { type: "navigate", route: normalizeRoute(href), navigation_type: "push" };
    }
    return undefined;
  }

  const redirect = (props.submitRedirectUrl as string) || "";
  const onRedirect = redirect
    ? { type: "navigate", route: normalizeRoute(redirect), navigation_type: "go" }
    : undefined;

  switch (action) {
    case "login":
      // A `login` button inside a Section that also holds input fields is a real login form:
      // submit it. On its own it is only an entry point to the engine's native auth screen.
      return _activeAuthForm
        ? buildAuthFormTap("login", _activeAuthForm, onRedirect)
        : { type: "navigate", route: "/auth/login", navigation_type: "push" };
    case "logout":
      return {
        type: "cubitCall", cubit: "auth", method: "logout",
        onSuccess: { type: "navigate", route: "/auth/login", navigation_type: "go" },
      };
    case "addToCart":
      return { type: "cubitCall", cubit: "cart", method: "addItem" };
    case "addToWishlist":
      return { type: "navigate", route: "/wishlist", navigation_type: "push" };
    case "makeOrder":
      return {
        type: "cubitCall", cubit: "checkout", method: "placeOrder",
        ...(onRedirect ? { onSuccess: onRedirect } : {}),
      };
    case "cartQtyIncrease":
      return {
        type: "cubitCall", cubit: "cart", method: "updateQuantity",
        params: {
          variantId: { source: "item", field: "variantId" },
          delta: { source: "value", value: 1 },
        },
      };
    case "cartQtyDecrease":
      return {
        type: "cubitCall", cubit: "cart", method: "updateQuantity",
        params: {
          variantId: { source: "item", field: "variantId" },
          delta: { source: "value", value: -1 },
        },
      };
    case "verifyOtp":
      return {
        type: "cubitCall", cubit: "auth", method: "verifyOtp",
        requireValidForm: true, formId: "otp-verify-form",
        params: { phone: { source: "authState", field: "phone" } },
        ...(onRedirect ? { onSuccess: onRedirect } : {}),
      };
    default:
      return undefined;
  }
}

/**
 * `cubitCall auth.<method>` that submits an auth form: every collected field is passed as a
 * `source: "form"` param, and the engine gates the call on form validity via `requireValidForm`.
 */
function buildAuthFormTap(
  method: string,
  form: AuthForm,
  onRedirect: Record<string, unknown> | undefined
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of form.fields) {
    if (AUTH_PARAM_EXCLUDED_FIELDS.has(field)) continue;
    params[field] = { source: "form", field };
  }
  return {
    type: "cubitCall",
    cubit: "auth",
    method,
    requireValidForm: true,
    formId: form.formId,
    ...(Object.keys(params).length > 0 ? { params } : {}),
    ...(onRedirect ? { onSuccess: onRedirect } : {}),
  };
}

function resolveLayoutTap(props: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | undefined {
  const link = props.link as Record<string, unknown> | undefined;
  if (link) {
    const kind = link.kind as string;
    if (kind === "page") {
      const route = (link.pageId as string) || (link.url as string);
      if (route) return { type: "navigate", route: normalizeRoute(route), navigation_type: "push" };
    }
    if (kind === "url") {
      const url = link.url as string;
      if (url) return { type: "openUrl", url };
    }
  }
  const href = (props.href as string) || "";
  if (href) {
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("www.")) {
      return { type: "openUrl", url: href };
    }
    return { type: "navigate", route: normalizeRoute(href), navigation_type: "push" };
  }
  return undefined;
}

function normalizeRoute(route: string): string {
  if (route === "/" || route === "") return "/home";
  return route;
}

// ─── Apply layout cross-cutting (padding, margin, float) ─────────────────────
function applyLayout(
  node: Record<string, unknown>,
  layout: Record<string, unknown> | undefined,
  rootProps: Record<string, unknown>
): Record<string, unknown> {
  if (!layout) return node;

  const boxProps: Record<string, unknown> = {};
  const padding: Record<string, number> = {};
  const margin: Record<string, number> = {};

  const pad = layout.padding as string;
  if (pad && pad !== "0px") {
    const p = parsePx(pad);
    padding.top = p; padding.bottom = p; padding.left = p; padding.right = p;
  }
  const pt = layout.paddingTop as string; if (pt) padding.top = parsePx(pt);
  const pr = layout.paddingRight as string; if (pr) padding.right = parsePx(pr);
  const pb = layout.paddingBottom as string; if (pb) padding.bottom = parsePx(pb);
  const pl = layout.paddingLeft as string; if (pl) padding.left = parsePx(pl);

  const mt = layout.marginTop as string; if (mt) margin.top = parsePx(mt);
  const mr = layout.marginRight as string; if (mr) margin.right = parsePx(mr);
  const mb = layout.marginBottom as string; if (mb) margin.bottom = parsePx(mb);
  const ml = layout.marginLeft as string; if (ml) margin.left = parsePx(ml);

  if (Object.keys(padding).length > 0) boxProps.padding = padding;
  if (Object.keys(margin).length > 0) boxProps.margin = margin;

  if (Object.keys(boxProps).length > 0) {
    node = { ...node, props: { ...((node.props || {}) as Record<string, unknown>), ...boxProps } };
  }

  const posMode = layout.positionMode as string;
  if (posMode === "float") {
    const preset = (layout.floatPreset as string) || "top-left";
    const anchorMap: Record<string, Record<string, number>> = {
      "top-left": { stackTop: 0, stackLeft: 0 },
      "top-middle": { stackTop: 0 },
      "top-right": { stackTop: 0, stackRight: 0 },
      "middle-left": { stackLeft: 0 },
      "middle-right": { stackRight: 0 },
      "bottom-left": { stackBottom: 0, stackLeft: 0 },
      "bottom-middle": { stackBottom: 0 },
      "bottom-right": { stackBottom: 0, stackRight: 0 },
    };
    const stacked = {
      ...node,
      props: { ...((node.props || {}) as Record<string, unknown>), stackLayer: "positioned", ...(anchorMap[preset] || {}) },
    };
    if (margin.top) (stacked.props as Record<string, unknown>).stackTop = margin.top;
    if (margin.right) (stacked.props as Record<string, unknown>).stackRight = margin.right;

    return {
      id: generateId("stack-wrapper"),
      type: "stack",
      children: [stacked],
    };
  }

  return node;
}

// ─── Content Block Transformers ──────────────────────────────────────────────

function transformText(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const dir = (rootProps.direction as string) || "rtl";
  const text = (props.text as string) || "";
  const isRich = /<[a-z][\s\S]*>/i.test(text);
  const type = isRich ? "richtext" : "text";

  const fontSize = props.fontSize
    ? resolveThemeFontSize(props.fontSize as string, rootProps, 16)
    : resolveFontSize(props.size as string, 16);

  const node: Record<string, unknown> = {
    id: generateId("text"),
    type,
    props: {
      value: isRich ? text : text.replace(/<[^>]*>/g, ""),
      fontSize,
      textAlign: (props.textAlign as string) || (props.align as string) || (dir === "rtl" ? "right" : "left"),
    },
  };

  const fontWeight = resolveThemeFontWeight(props.fontWeight as string);
  if (fontWeight) (node.props as Record<string, unknown>).fontWeight = fontWeight;

  const textColor = resolveThemeColor(props.color as string, rootProps)
    || resolveTextColor(props.color as string);
  if (textColor) (node.props as Record<string, unknown>).color = textColor;

  if (_bindingScope) applyValueContext(props, node.props as Record<string, unknown>, "text");

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformHeading(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const dir = (rootProps.direction as string) || "rtl";
  const levelRaw = (props.level as string) || "2";
  const levelNum = levelRaw.startsWith("h")
    ? parseInt(levelRaw.replace("h", ""), 10)
    : parseInt(levelRaw, 10) || 2;
  const sizeMap: Record<number, number> = { 1: 28, 2: 22, 3: 18, 4: 16 };
  const levelSize = resolveFontSize(props.size as string, sizeMap[levelNum] || 22);
  // ContentHeading carries `fontSize` as a theme token; legacy Heading carries `size`.
  const fontSize = props.fontSize
    ? resolveThemeFontSize(props.fontSize as string, rootProps, levelSize)
    : levelSize;

  const node: Record<string, unknown> = {
    id: generateId("heading"),
    type: "text",
    props: {
      value: resolveBilingual(props.text as string, props.textAr as string, lang),
      fontSize,
      fontWeight: resolveThemeFontWeight(props.fontWeight as string) || (levelNum <= 2 ? "bold" : "w600"),
      textAlign: (props.align as string) || (props.textAlign as string) || (dir === "rtl" ? "right" : "left"),
    },
  };

  const color = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps)
    || resolveThemeColor(props.color as string, rootProps);
  if (color) (node.props as Record<string, unknown>).color = color;

  if (_bindingScope) applyValueContext(props, node.props as Record<string, unknown>, "text");

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformSpace(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const size = resolveThemePx(props.size as string | number, rootProps, 16);
  const dir = (props.direction as string) || "vertical";

  const node: Record<string, unknown> = {
    id: generateId("spacer"),
    type: "sizedBox",
    props: dir === "vertical" ? { height: size } : { width: size },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

/** Returns `null` when the button is hoisted into the page-level sticky footer (makeOrder). */
function transformButton(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const label = resolveBilingual(props.label as string, props.labelAr as string, lang);
  const isFixedMode = (props.buttonVariantMode as string) === "fixed";
  const size = resolveButtonSizeToken(
    (props.size as string)
      || (isFixedMode ? (props.buttonSize as string) : (props.buttonVariantSize as string))
  );
  const fullWidth = (props.fullWidth as string) === "on" || props.fullWidth === true
    || (props.submitWidth as string) === "full";

  const outProps: Record<string, unknown> = {
    label,
    variant: resolveButtonVariant((props.variant as string) || (props.buttonVariant as string)),
  };
  if (size !== "md") outProps.height = BUTTON_SIZE_HEIGHT[size] || 48;

  // Fixed mode overrides the theme variant colours; only `color` is an engine button prop
  // (`textColor` / `radius` have no equivalent — see CONVERTER-OUTPUT-SPEC §6.5).
  const btnColor = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps)
    || (isFixedMode ? resolveThemeColor(props.bgColor as string, rootProps) : undefined);
  if (btnColor) outProps.color = btnColor;
  if (fullWidth) outProps.fullWidth = true;

  const tap = resolveTap(props, rootProps);
  if (tap?.type === "cubitCall" && (tap as Record<string, unknown>).cubit === "checkout"
    && (tap as Record<string, unknown>).method === "placeOrder") {
    _pageStickyFooter = {
      id: generateId("sticky-footer"),
      type: "container",
      props: { color: "#FFFFFF", shadow: "md", padding: { top: 12, bottom: 12, left: 16, right: 16 } },
      child: {
        id: generateId("sticky-footer-btn"),
        type: "button",
        props: { ...outProps },
        tap,
      },
    };
    return null;
  }

  const node: Record<string, unknown> = {
    id: generateId("button"),
    type: "button",
    props: outProps,
  };
  if (tap) node.tap = tap;

  if (_bindingScope) applyValueContext(props, node.props as Record<string, unknown>, "button");

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformLink(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  // ContentLink stores its text in `title`; the legacy Link block uses `label` / `labelAr`.
  const label = (props.title as string) || resolveBilingual(props.label as string, props.labelAr as string, lang);

  const outProps: Record<string, unknown> = { label, variant: "text" };

  const color = resolveThemeColor(props.color as string, rootProps);
  if (color) outProps.color = color;

  const icon = props.icon as string;
  if (icon && icon !== "none") {
    addWarning(`ContentLink icon "${icon}" dropped; the engine \`button\` has no icon prop`);
  }

  const tap = resolveLayoutTap(props, rootProps);

  const node: Record<string, unknown> = { id: generateId("link"), type: "button", props: outProps };
  if (tap) node.tap = tap;

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Form input blocks ───────────────────────────────────────────────────────

const INPUT_KEYBOARD_MAP: Record<string, string> = {
  email: "email",
  tel: "phone",
  number: "number",
  text: "text",
  search: "text",
  password: "text",
};

function transformInput(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const dir = (rootProps.direction as string) || "rtl";
  const fieldId = (props.name as string) || (props.id as string) || "field";
  const inputType = (props.inputType as string) || "text";
  // Credentials and contact identifiers are always Latin-keyed, even in an RTL app.
  const isLtrField = inputType === "email" || inputType === "tel" || inputType === "password";

  const outProps: Record<string, unknown> = {
    id: fieldId,
    label: (props.label as string) || "",
    hint: (props.placeholder as string) || "",
    textDirection: isLtrField ? "ltr" : dir === "rtl" ? "rtl" : "ltr",
  };

  const keyboardType = INPUT_KEYBOARD_MAP[inputType];
  if (keyboardType && keyboardType !== "text") outProps.keyboardType = keyboardType;
  if (inputType === "password") outProps.obscureText = true;
  if (inputType === "email") outProps.validateEmail = true;
  if (inputType === "tel") outProps.validatePhone = true;
  if (props.required === true) outProps.validateRequired = true;
  if ((props.prependIcon as string) === "search") outProps.prefixIcon = "search";

  if ((props.inputAction as string) === "search_products") {
    addWarning(
      `ContentInput "${fieldId}" uses inputAction "search_products"; the mobile field is emitted without wiring — connect it to the search cubit manually`
    );
  }

  const node: Record<string, unknown> = { id: generateId("input"), type: "textFormField", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformSwitch(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const fieldId = (props.name as string) || (props.id as string) || "switch";

  const outProps: Record<string, unknown> = {
    id: fieldId,
    label: (props.label as string) || "",
    activeColor: (rootProps.primary as string) || "#1D4ED8",
  };

  // `switchField` stores "true" / "false" strings in FormStateStore.
  if (props.defaultChecked === true) outProps.value = "true";

  const switchAction = (props.switchAction as string) || "";
  if (switchAction) {
    addWarning(
      `ContentSwitch "${fieldId}" uses switchAction "${switchAction}"; the mobile field is emitted as a plain switchField without store wiring — connect it manually`
    );
  }
  // `helperText` and `labelPosition` have no engine equivalent on switchField.
  if (props.helperText) {
    addWarning(`ContentSwitch "${fieldId}" helperText dropped; the engine switchField has no helper-text prop`);
  }

  const node: Record<string, unknown> = { id: generateId("switch"), type: "switchField", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformButtonGroup(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  const bindingMode = (props.bindingMode as string) || "static";

  if (bindingMode !== "static") {
    addWarning(
      `ButtonGroup bindingMode "${bindingMode}" builds its items from runtime store data; no static mobile equivalent. Wire category filters / pagination manually.`
    );
    return { id: generateId("unsupported"), type: "unsupported", props: { blockType: "ButtonGroup" } };
  }

  const items = (props.items as Record<string, unknown>[]) || [];
  if (items.length === 0) return null;

  const selected = props.defaultSelectedValue as string;
  const activeStyle = (props.activeStyle as Record<string, unknown>) || {};
  const inactiveStyle = (props.inactiveStyle as Record<string, unknown>) || {};
  const gap = resolveThemePx(props.gap as string, rootProps, 8);
  const alignMap: Record<string, string> = { left: "start", center: "center", right: "end" };

  addWarning(
    "ButtonGroup selection state is not tracked on mobile; converted to a row of buttons with the default item styled as active"
  );

  const children = items.map((item) => {
    const isActive = (item.value as string) === selected;
    const style = isActive ? activeStyle : inactiveStyle;
    const outProps: Record<string, unknown> = {
      label: (item.title as string) || "",
      variant: isActive ? "filled" : "outlined",
    };
    const bg = resolveThemeColor(style.bgColor as string, rootProps);
    if (bg) outProps.color = bg;
    const size = resolveButtonSizeToken(style.buttonSize as string);
    if (size !== "md") outProps.height = BUTTON_SIZE_HEIGHT[size];

    const tap = resolveTap(item, rootProps);
    return {
      id: generateId("btn-group-item"),
      type: "button",
      props: outProps,
      ...(tap ? { tap } : {}),
    };
  });

  const node: Record<string, unknown> = {
    id: generateId("button-group"),
    type: "row",
    props: flexProps(alignMap[(props.align as string) || "center"] || "center", "center", { gap }),
    children,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformChip(block: Record<string, unknown>, _rootProps: Record<string, unknown>): null {
  const props = (block.props || {}) as Record<string, unknown>;
  const path = ((props.listValueContext as Record<string, unknown>)?.path as string) || "(unbound)";
  addWarning(
    `Chip renders a runtime array from "${path}"; the engine has no chip-list primitive and the path is not in the valueContext map — block skipped`
  );
  return null;
}

function transformCartQuantity(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const alignMap: Record<string, string> = { left: "start", center: "center", right: "end" };
  const qtyAction = (delta: number) => ({
    type: "cubitCall",
    cubit: "cart",
    method: "updateQuantity",
    params: {
      variantId: { source: "item", field: "variantId" },
      delta: { source: "value", value: delta },
    },
  });

  const node: Record<string, unknown> = {
    id: generateId("cart-qty"),
    type: "row",
    props: flexProps(alignMap[(props.align as string) || "right"] || "end", "center", { gap: 8 }),
    children: [
      { id: generateId("cart-qty-dec"), type: "button", props: { label: "−", height: 36, variant: "outlined" }, tap: qtyAction(-1) },
      { id: generateId("cart-qty-val"), type: "text", props: { valuePath: "item.quantity", fontSize: 14, textAlign: "center" } },
      { id: generateId("cart-qty-inc"), type: "button", props: { label: "+", height: 36, variant: "outlined" }, tap: qtyAction(1) },
    ],
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformProductGallery(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const aspect = resolveAspectRatio((props.aspectRatio as string) || "square") ?? 1.0;
  const radius = resolveThemePx((props.radius as string) || "theme-md", rootProps, 12);

  addWarning(
    "ProductImageCarousel thumbnail strip has no engine equivalent; converted to the bound main image only"
  );

  const outProps: Record<string, unknown> = {
    source: "network",
    fit: "cover",
    aspectRatio: aspect,
    borderRadius: radius,
  };
  if (_bindingScope) outProps.urlPath = `${_bindingScope.base}.primaryImageUrl`;
  else outProps.url = (props.placeholderSrc as string) || "";

  const node: Record<string, unknown> = { id: generateId("product-gallery"), type: "image", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformIcon(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const iconName = resolveIcon((props.icon as string) || (props.name as string));
  const size = parsePx(props.size as string, 24);

  const outProps: Record<string, unknown> = { name: iconName, size };

  const color = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps);
  if (color) outProps.color = color;

  const node: Record<string, unknown> = { id: generateId("icon"), type: "icon", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformImage(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const wRaw = props.width ?? props.maxWidth ?? "100%";
  const w = String(wRaw);
  const hRaw = props.height ?? "auto";
  const h = String(hRaw);
  const aspect = resolveAspectRatio(props.aspectRatio as string);

  const outProps: Record<string, unknown> = {
    url: (props.src as string) || "",
    source: "network",
    semanticsLabel: (props.alt as string) || "",
    fit: (props.objectFit as string) || "cover",
  };
  const wNum = w !== "100%" && !w.includes("auto") ? parsePx(w) : undefined;
  const hNum = h !== "auto" ? parsePx(h) : undefined;
  if (aspect !== undefined) outProps.aspectRatio = aspect;
  else if (wNum && hNum && hNum > 0) outProps.aspectRatio = wNum / hNum;

  const radiusToken = (props.radius as string) || (props.borderRadius as string);
  if (radiusToken) {
    outProps.borderRadius = radiusToken.startsWith("theme-")
      ? resolveThemePx(radiusToken, rootProps, 12)
      : radiusToken;
  }

  if (w !== "100%" && !w.includes("auto")) outProps.width = parsePx(w);
  if (h !== "auto") outProps.height = parsePx(h);

  if (_bindingScope) applyValueContext(props, outProps, "image");

  const node: Record<string, unknown> = { id: generateId("image"), type: "image", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformVideo(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const aspect = resolveAspectRatio(props.aspectRatio as string);

  const outProps: Record<string, unknown> = {
    url: (props.src as string) || "",
    showControls: (props.controls as string) !== "off",
    autoplay: (props.autoPlay as string) === "on",
  };
  if (props.poster) outProps.poster = props.poster;
  if (props.borderRadius) outProps.borderRadius = props.borderRadius;

  let node: Record<string, unknown> = { id: generateId("video"), type: "videoPlayer", props: outProps };

  if (aspect !== undefined) {
    node = {
      id: generateId("video-wrapper"),
      type: "container",
      props: { aspectRatio: aspect },
      child: node,
    };
  }

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformYouTube(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const rawUrl = (props.url as string) || (props.src as string) || "";
  const videoId = extractYouTubeVideoId(rawUrl);
  const aspect = resolveAspectRatio((props.aspectRatio as string) || "16:9") ?? 1.777;

  const radiusToken = (props.radius as string) || (props.borderRadius as string);
  const borderRadius = radiusToken
    ? (radiusToken.startsWith("theme-") ? resolveThemePx(radiusToken, rootProps, 12) : parsePx(radiusToken, 12))
    : undefined;

  if (videoId || isYouTubeUrl(rawUrl)) {
    const id = videoId || extractYouTubeVideoId(toEmbedUrl(rawUrl)) || "";
    const imageProps: Record<string, unknown> = {
      url: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : rawUrl,
      source: "network",
      aspectRatio: aspect,
      fit: "cover",
    };
    if (borderRadius !== undefined) imageProps.borderRadius = borderRadius;

    const node: Record<string, unknown> = {
      id: generateId("youtube-thumb"),
      type: "image",
      props: imageProps,
      tap: { type: "openUrl", url: rawUrl },
    };
    return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
  }

  const outProps: Record<string, unknown> = {
    url: rawUrl,
    showControls: true,
    autoplay: false,
  };

  const sizeToken = props.size as string;
  if (sizeToken) outProps.height = resolveThemePx(sizeToken, rootProps, 480);
  if (borderRadius !== undefined) outProps.borderRadius = borderRadius;

  let node: Record<string, unknown> = { id: generateId("video"), type: "videoPlayer", props: outProps };

  if (aspect !== undefined && !sizeToken) {
    node = {
      id: generateId("video-wrapper"),
      type: "container",
      props: { aspectRatio: aspect },
      child: node,
    };
  }

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function toEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("/embed/")) return url;
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  return url;
}

function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function transformHero(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const dir = (rootProps.direction as string) || "rtl";
  const align = (props.align as string) || "center";
  const lang = (rootProps.language as string) || "ar";
  const padding = parsePx(props.padding as string, 80);

  const children: Record<string, unknown>[] = [];

  const title = props.title as string;
  if (title) {
    children.push({
      id: generateId("hero-title"),
      type: "text",
      props: { value: title, fontSize: 28, fontWeight: "bold", textAlign: align },
    });
  }

  const desc = props.description as string;
  if (desc) {
    const isRich = /<[a-z][\s\S]*>/i.test(desc);
    children.push({
      id: generateId("hero-desc"),
      type: isRich ? "richtext" : "text",
      props: { value: desc.replace(/<[^>]*>/g, ""), fontSize: 16, textAlign: align },
    });
  }

  const buttons = (props.buttons as Record<string, unknown>[]) || [];
  if (buttons.length > 0) {
    const btnNodes = buttons.map((btn) => {
      const bProps: Record<string, unknown> = {
        label: resolveBilingual(
          (btn.label as string) || (btn.text as string),
          btn.labelAr as string,
          lang
        ),
        height: 48,
        variant: resolveButtonVariant((btn.variant as string) || "primary"),
      };
      const tapHref = (btn.href as string) || "";
      return {
        id: generateId("hero-btn"),
        type: "button",
        props: bProps,
        ...(tapHref ? { tap: { type: "navigate", route: normalizeRoute(tapHref), navigation_type: "push" } } : {}),
      };
    });
    children.push({
      id: generateId("hero-buttons"),
      type: "row",
      props: { mainAxisAlignment: align === "center" ? "center" : align === "right" ? "end" : "start", crossAxisAlignment: "center", gap: 12 },
      children: btnNodes,
    });
  }

  const imgMode = (props.image as Record<string, unknown>)?.mode as string
    || ((props.variant as string) === "background" ? "background" : undefined);
  const imgUrl = (props.image as Record<string, unknown>)?.url as string
    || (props.backgroundImage as string);
  const heroHeight = props.height ? parsePx(props.height as string, 0) : undefined;

  if (imgMode === "background" && imgUrl) {
    const innerCol: Record<string, unknown> = {
      id: generateId("hero-col"),
      type: "column",
      props: flexProps("center", align === "center" ? "center" : align === "right" ? "end" : "start", {
        gap: 16,
        padding,
        ...(heroHeight ? { height: heroHeight } : {}),
      }),
      children,
    };
    return applyLayout(
      {
        id: generateId("hero-stack"),
        type: "stack",
        props: { fit: "loose" },
        children: [
          {
            id: generateId("hero-bg"),
            type: "image",
            props: { url: imgUrl, source: "network", fit: "cover" },
          },
          innerCol,
        ],
      },
      props.layout as Record<string, unknown> | undefined,
      rootProps
    );
  }

  if (imgUrl && imgMode === "split") {
    const col: Record<string, unknown> = {
      id: generateId("hero-split-col"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 16 },
      children: [
        {
          id: generateId("hero-split-img"),
          type: "image",
          props: { url: imgUrl, source: "network", fit: "cover" },
        },
        {
          id: generateId("hero-split-content"),
          type: "column",
          props: { crossAxisAlignment: align, mainAxisAlignment: "start", gap: 16 },
          children,
        },
      ],
    };
    return applyLayout(col, props.layout as Record<string, unknown> | undefined, rootProps);
  }

  const column: Record<string, unknown> = {
    id: generateId("hero-col"),
    type: "column",
    props: { crossAxisAlignment: align, mainAxisAlignment: "center", gap: 16 },
    children,
  };

  return applyLayout(
    {
      id: generateId("hero-container"),
      type: "container",
      props: { padding: { top: padding, bottom: padding, left: 24, right: 24 } },
      child: column,
    },
    props.layout as Record<string, unknown> | undefined,
    rootProps
  );
}

function transformCard(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const title = props.title as string;
  const description = props.description as string;
  const image = props.image as Record<string, unknown> | undefined;
  const mode = (props.mode as string) || (props.variant as string) || "card";

  const cardChildren: Record<string, unknown>[] = [];

  if (props.icon) {
    const iconColor = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps) || "#2563eb";
    cardChildren.push({
      id: generateId("card-icon"),
      type: "icon",
      props: { name: resolveIcon(props.icon as string), size: 32, color: iconColor },
    });
  }

  if (image?.url) {
    cardChildren.push({
      id: generateId("card-img"),
      type: "image",
      props: { url: image.url as string, alt: (image.alt as string) || "", source: "network", fit: "cover", borderRadius: "md" },
    });
  }
  if (title) {
    cardChildren.push({
      id: generateId("card-title"),
      type: "text",
      props: { value: title, fontSize: 16, fontWeight: "bold" },
    });
  }
  if (description) {
    cardChildren.push({
      id: generateId("card-desc"),
      type: "text",
      props: { value: description.replace(/<[^>]*>/g, ""), fontSize: 14, color: "#6b7d93" },
    });
  }

  const elevationMap: Record<string, number> = { flat: 0, card: 2, default: 1, outlined: 0, elevated: 4 };
  let elevation = elevationMap[mode] ?? 2;
  if (typeof props.elevation === "number") elevation = props.elevation;
  const cardOutProps: Record<string, unknown> = { elevation, borderRadius: 8 };
  if (typeof props.padding === "number") {
    cardOutProps.padding = props.padding;
  }

  const color = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps);
  if (color) cardOutProps.color = color;

  const node: Record<string, unknown> = {
    id: generateId("card"),
    type: "card",
    props: cardOutProps,
    child: {
      id: generateId("card-body"),
      type: "column",
      props: flexProps("start", "start", { gap: 8, padding: 16 }),
      children: cardChildren,
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformBadge(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const label = resolveBilingual(props.label as string, props.labelAr as string, lang)
    || (props.text as string) || "";
  const variant = (props.variant as string) || "discount";

  const badgeColors: Record<string, { bg: string; fg: string }> = {
    discount: { bg: "#FEE2E2", fg: "#DC2626" },
    inStock: { bg: "#DCFCE7", fg: "#16A34A" },
    outOfStock: { bg: "#F3F4F6", fg: "#6B7280" },
    custom: { bg: "#EBF5FF", fg: "#2563EB" },
  };
  const bc = badgeColors[variant] || badgeColors.custom;
  const size = (props.size as string) || "sm";
  const fontSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

  const node: Record<string, unknown> = {
    id: generateId("badge"),
    type: "container",
    props: { padding: { left: 8, right: 8, top: 4, bottom: 4 }, color: bc.bg, borderRadius: 9999 },
    child: {
      id: generateId("badge-label"),
      type: "text",
      props: { value: label, fontSize, fontWeight: "bold", color: bc.fg },
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformDivider(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const orient = (props.orientation as string) || "horizontal";
  const thickness = parsePx(props.thickness as string, 1);

  const color = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps);

  if (orient === "vertical") {
    const dividerProps: Record<string, unknown> = { width: 1, color: color || "#cbd5e1" };
    const w = props.width as string;
    if (w) dividerProps.width = parsePx(w);
    const h = props.height as string;
    if (h) dividerProps.height = parsePx(h);

    return applyLayout(
      {
        id: generateId("v-divider"),
        type: "container",
        props: dividerProps,
      },
      props.layout as Record<string, unknown> | undefined,
      rootProps
    );
  }

  const node: Record<string, unknown> = {
    id: generateId("divider"),
    type: "divider",
    props: { thickness },
  };
  if (color) (node.props as Record<string, unknown>).color = color;
  if ((props.variant as string) === "dashed" || (props.style as string) === "dashed") {
    (node.props as Record<string, unknown>).variant = "dashed";
  }

  const w = props.width as string;
  if (w && w !== "100%") (node.props as Record<string, unknown>).width = parsePx(w);

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Layout Block Transformers ──────────────────────────────────────────────

function transformSection(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  if (props.visible === false) return null;

  // Section presets (`metadata.preset`, legacy `sectionKind`) are mostly a web authoring
  // convenience: once the preset has been expanded into ordinary blocks, every Section
  // converts the same way and the commerce behaviour lives on the blocks themselves
  // (bound Group, cartLineId Group, makeOrder ContentButton). The one exception is a
  // products-grid / products-page Section still holding its unexpanded card template —
  // see transformProductsTemplateSection.
  const children = getChildren(block);

  for (const child of children) {
    if ((child.type as string) === "Section") {
      addWarning("Nested Section detected; converted as sibling container");
    }
  }

  const paddingTop = parsePx(props.paddingTop as string, 0);
  const paddingBottom = parsePx(props.paddingBottom as string, 0);
  const padH = parsePx(props.paddingHorizontal as string, 16);
  const bgImage = (props.backgroundImage as string) || "";
  const bgColor = (props.backgroundColor as string) || undefined;
  const columnsMobile = parseInt(String(props.columnsMobile || props.columns || 1), 10);
  const gridGap = parsePx(props.gridGap as string, 16);

  // An auth Section (input fields + a login button) becomes a real `form` node so the submit
  // button can gate on validity and read its params out of FormStateStore.
  const authAction = findAuthFormAction(children);
  const authFields = authAction ? collectFormFieldIds(children) : [];
  const authForm: AuthForm | null =
    authAction && authFields.length > 0
      ? { formId: `${authAction}-form`, fields: authFields }
      : null;

  const templateGrid = transformProductsTemplateSection(block, rootProps);
  const prevAuthForm = _activeAuthForm;
  if (authForm) _activeAuthForm = authForm;
  let transformedChildren: Record<string, unknown>[];
  try {
    transformedChildren = templateGrid
      ? []
      : (children.map((c: Record<string, unknown>) => transformBlock(c, rootProps)).filter(Boolean) as Record<string, unknown>[]);
  } finally {
    _activeAuthForm = prevAuthForm;
  }

  let contentWrapper: Record<string, unknown>;
  if (templateGrid) {
    contentWrapper = templateGrid;
  } else if (columnsMobile > 1) {
    contentWrapper = {
      id: generateId("section-grid"),
      type: "gridView",
      props: {
        crossAxisCount: columnsMobile,
        mainAxisSpacing: gridGap,
        crossAxisSpacing: gridGap,
        childAspectRatio: 1.0,
      },
      children: transformedChildren,
    };
  } else {
    contentWrapper = {
      id: generateId("section-column"),
      type: "column",
      props: flexProps("start", "stretch", { gap: 16 }),
      children: transformedChildren,
    };
  }

  if (authForm) {
    contentWrapper = {
      id: generateId("form"),
      type: "form",
      props: { formId: authForm.formId, id: authForm.formId },
      child: contentWrapper,
    };
  }

  const innerContainer: Record<string, unknown> = {
    id: generateId("section-inner"),
    type: "container",
    props: {
      ...(bgColor && !bgImage ? { color: bgColor } : {}),
      padding: { top: paddingTop, bottom: paddingBottom, left: padH, right: padH },
    },
    child: contentWrapper,
  };

  if (bgImage) {
    const stackChildren: Record<string, unknown>[] = [
      {
        id: generateId("section-bg-image"),
        type: "image",
        props: { url: bgImage, source: "network", fit: "cover" },
      },
    ];
    if (props.backgroundOverlayColor) {
      stackChildren.push({
        id: generateId("section-overlay"),
        type: "container",
        props: { color: props.backgroundOverlayColor as string },
      });
    }
    stackChildren.push(innerContainer);
    return applyLayout(
      {
        id: generateId("section-stack"),
        type: "stack",
        props: { fit: "loose" },
        children: stackChildren,
      },
      props.layout as Record<string, unknown> | undefined,
      rootProps
    );
  }

  const container: Record<string, unknown> = {
    ...innerContainer,
    id: generateId("section-container"),
  };

  return applyLayout(container, props.layout as Record<string, unknown> | undefined, rootProps);
}

function wrapWithSurfaceContainer(
  node: Record<string, unknown>,
  props: Record<string, unknown>,
  rootProps: Record<string, unknown>
): Record<string, unknown> {
  const bgColor = (props.backgroundColor as string) || "";
  const padding = props.padding as string;
  const borderRadius = props.borderRadius as string;
  const boxShadow = (props.boxShadow as string) || "none";
  const bgImage = (props.backgroundImage as string) || "";

  const hasSurface =
    (bgColor && bgColor !== "") ||
    (padding && padding !== "0px") ||
    (borderRadius && borderRadius !== "theme-none" && borderRadius !== "0") ||
    (boxShadow && boxShadow !== "none") ||
    (bgImage && bgImage !== "");

  if (!hasSurface) return node;

  const containerProps: Record<string, unknown> = {};
  if (bgColor) containerProps.color = resolveThemeColor(bgColor, rootProps) || bgColor;
  if (padding && padding !== "0px") {
    const p = parsePx(padding);
    containerProps.padding = { top: p, bottom: p, left: p, right: p };
  }
  if (borderRadius) {
    containerProps.borderRadius = borderRadius.startsWith("theme-")
      ? resolveThemePx(borderRadius, rootProps, 0)
      : parsePx(borderRadius, 0);
  }
  if (boxShadow && boxShadow !== "none") containerProps.shadow = boxShadow;

  if (bgImage) {
    return {
      id: generateId("group-surface-stack"),
      type: "stack",
      props: { fit: "loose" },
      children: [
        { id: generateId("group-bg"), type: "image", props: { url: bgImage, source: "network", fit: "cover" } },
        { id: generateId("group-surface"), type: "container", props: containerProps, child: node },
      ],
    };
  }

  return {
    id: generateId("group-surface"),
    type: "container",
    props: containerProps,
    child: node,
  };
}

function transformFlex(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = getChildren(block);
  let direction = (props.direction as string) || "";
  if (!direction) {
    const orientation = props.orientation as string;
    if (orientation === "vertical") direction = "column";
    else if (orientation === "horizontal") direction = "row";
    else direction = "row";
  }
  const isRow = direction === "row" || direction === "horizontal";
  const gap = parsePx(props.gap as string | number, 0);

  const axisMap: Record<string, string> = {
    center: "center", "flex-start": "start", start: "start",
    "flex-end": "end", end: "end", "space-between": "spaceBetween",
    spaceBetween: "spaceBetween", "space-around": "spaceAround", spaceAround: "spaceAround",
    "space-evenly": "spaceEvenly", spaceEvenly: "spaceEvenly",
    stretch: "stretch", baseline: "baseline",
  };
  const crossAxisAlignment = axisMap[(props.alignItems as string) || ""] || (isRow ? "center" : "stretch");
  const mainAxisAlignment = axisMap[(props.justifyContent as string) || ""] || "start";

  let node: Record<string, unknown> = {
    id: generateId(isRow ? "row" : "column"),
    type: isRow ? "row" : "column",
    props: flexProps(mainAxisAlignment, crossAxisAlignment, { gap }),
    children: items.map((c: Record<string, unknown>) => transformBlock(c, rootProps)),
  };

  node = wrapWithSurfaceContainer(node, props, rootProps);
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

/** `metadata.apiUrl` → relative public path, or a public product path built from the picker ref. */
function resolveProductRequestUrl(
  metadata: Record<string, unknown> | undefined,
  product: Record<string, unknown> | undefined
): string {
  if (metadata?.apiUrl) {
    return normalizeAdminApiUrl(metadata.apiUrl as string);
  }
  const ref = (product?.slug as string) || (product?.id as string) || "";
  return ref ? `/api/v1/public/products/${encodeURIComponent(ref)}` : "";
}

function transformGroup(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;

  // A Group with `cartLineId` is a cart-row template, whatever section it sits in.
  // Mobile cart lines are dynamic, so the first one becomes the list; the rest are
  // the same row repeated by the web editor and would duplicate the whole cart.
  if (props.cartLineId) {
    if (_cartTemplateEmitted) {
      addWarning(`Cart line Group "${props.cartLineId}" dropped; the cart already renders as one listView over cart.items`);
      return null;
    }
    _cartTemplateEmitted = true;
    const template = withBindingScope({ kind: "cart", base: "item" }, () => transformFlex(block, rootProps));
    return {
      id: generateId("cart-lines"),
      type: "listView",
      props: { emptyMessage: "السلة فارغة" },
      itemBuilder: { type: "repeat", source: "cart.items", item: template },
    };
  }

  // A Group with `product` is a card bound to one product: it owns its own request,
  // so its children resolve against that request rather than a repeat item.
  const product = props.product as Record<string, unknown> | undefined;
  if (product) {
    const productId = String(product.id || product.slug || generateId("product"));
    const requestKey = `product-${productId}`;
    const requestUrl = resolveProductRequestUrl(props.metadata as Record<string, unknown> | undefined, product);
    const node = withBindingScope(
      { kind: "product", base: `dataContext.requests.${requestKey}.data` },
      () => transformFlex(block, rootProps)
    );

    if (!requestUrl) {
      addWarning(`Bound Group for product "${productId}" has no metadata.apiUrl, id or slug; emitted without a request`);
      return node;
    }
    if (!_warnedContainerRequest) {
      _warnedContainerRequest = true;
      addWarning(
        "Product-bound Groups declare a per-card request (requestKey/requestUrl on the wrapping container) and bind children to dataContext.requests.<key>.data.* — confirm the engine resolves requests on container nodes"
      );
    }
    return {
      id: generateId("product-bound"),
      type: "container",
      props: { requestKey, requestUrl },
      child: node,
    };
  }

  return transformFlex(block, rootProps);
}

function transformLayoutGrid(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = getChildren(block);
  const numCols = parseInt((props.numColumns as string) || "2", 10);
  const gap = parsePx(props.gap as string | number, 16);

  const converted = items.map((c: Record<string, unknown>) => transformBlock(c, rootProps)).filter(Boolean) as Record<string, unknown>[];

  const node: Record<string, unknown> = {
    id: generateId("grid-layout"),
    type: "gridView",
    props: {
      crossAxisCount: numCols,
      mainAxisSpacing: gap,
      crossAxisSpacing: gap,
      childAspectRatio: 1.0,
    },
    children: converted,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Commerce Block Transformers ─────────────────────────────────────────────

function transformProductImage(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const aspect = resolveAspectRatio(props.aspectRatio as string);
  const outProps: Record<string, unknown> = {
    url: (props.product as Record<string, unknown>)?.image as string || "",
    source: "network",
    fit: (props.objectFit as string) || "cover",
    alt: (props.product as Record<string, unknown>)?.title as string || "",
  };
  if (aspect !== undefined) outProps.aspectRatio = aspect;
  if (props.borderRadius) outProps.borderRadius = props.borderRadius;

  const node: Record<string, unknown> = { id: generateId("prod-img"), type: "image", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function buildProductGridItemTemplate(cardVariant: string): Record<string, unknown> {
  const isHorizontal = cardVariant === "horizontal";
  const imageHeight = cardVariant === "compact" ? 120 : cardVariant === "featured" ? 240 : 200;

  const imageNode = {
    id: generateId("pt-image"),
    type: "image",
    props: {
      urlPath: "item.primaryImageUrl",
      source: "network",
      fit: "cover",
      aspectRatio: 1.0,
      ...(isHorizontal ? { width: 120, height: imageHeight } : {}),
    },
  };

  const textNodes = [
    { id: generateId("pt-name"), type: "text", props: { valuePath: "item.name", fontSize: cardVariant === "compact" ? 12 : 14, fontWeight: "w600" } },
    { id: generateId("pt-price"), type: "text", props: { valuePath: "item.price", fontSize: cardVariant === "compact" ? 12 : 13 } },
  ];

  const bodyChildren = isHorizontal
    ? [{
        id: generateId("pt-row"),
        type: "row",
        props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 12 },
        children: [imageNode, { id: generateId("pt-info"), type: "column", props: { crossAxisAlignment: "start", gap: 4 }, children: textNodes }],
      }]
    : [imageNode, ...textNodes];

  return {
    id: generateId("product-template"),
    type: "card",
    props: { elevation: cardVariant === "featured" ? 3 : 1, borderRadius: 12 },
    child: {
      id: generateId("pt-body"),
      type: "column",
      props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 8 },
      children: bodyChildren,
    },
    tap: { type: "navigate", route: "/product/details/:productId", navigation_type: "push" },
  };
}

function transformProductCard(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const product = props.product as Record<string, unknown> | undefined;
  const lang = (props.language as string) || (rootProps.language as string) || "ar";
  const variant = (props.variant as string) || "vertical";
  const isHorizontal = variant === "horizontal";
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  const productTitle = lang === "ar"
    ? (product?.titleAr as string) || (product?.title as string) || ""
    : (product?.titleEn as string) || (product?.title as string) || "";

  const imageHeight = isCompact ? 120 : isFeatured ? 240 : 200;

  const imageNode = {
    id: generateId("pc-img"),
    type: "image",
    props: {
      url: (product?.image as string) || (product?.primaryImageUrl as string) || "",
      source: "network",
      fit: (props.imageObjectFit as string) || "cover",
      borderRadius: resolveThemePx((props.radius as string) || "theme-md", rootProps, 12),
      height: imageHeight,
    },
  };

  const textChildren: Record<string, unknown>[] = [
    {
      id: generateId("pc-name"),
      type: "text",
      props: {
        value: productTitle,
        fontSize: isCompact ? 12 : isFeatured ? 16 : 14,
        fontWeight: "bold",
        color: resolveThemeColor(props.titleColor as string, rootProps),
      },
    },
    {
      id: generateId("pc-price"),
      type: "text",
      props: {
        value: `${product?.price ?? ""}`,
        fontSize: isCompact ? 12 : 14,
        color: resolveThemeColor(props.descriptionColor as string, rootProps) || "#0b78c5",
      },
    },
  ];

  if (props.showDescription !== false && product?.description) {
    textChildren.push({
      id: generateId("pc-desc"),
      type: "text",
      props: {
        value: product.description as string,
        fontSize: 12,
        color: resolveThemeColor(props.descriptionColor as string, rootProps) || "#6b7d93",
      },
    });
  }

  const actionButtons: Record<string, unknown>[] = [];
  if (props.showAddToCart !== false) {
    actionButtons.push({
      id: generateId("pc-add-cart"),
      type: "button",
      props: { label: lang === "ar" ? "أضف للسلة" : "Add to cart", height: 40, variant: resolveButtonVariant((props.actionButtonVariant as string) || "primary") },
      tap: { type: "cubitCall", cubit: "cart", method: "addItem", params: { productId: product?.id } },
    });
  }
  if (props.showViewDetails !== false) {
    actionButtons.push({
      id: generateId("pc-view"),
      type: "button",
      props: { label: lang === "ar" ? "التفاصيل" : "View details", height: 40, variant: "outlined" },
      tap: {
        type: "navigate",
        route: product?.id ? `/product/details/${product.id}` : "/product/details/:productId",
        navigation_type: "push",
      },
    });
  }
  if (props.showFavoriteButton !== false) {
    actionButtons.push({
      id: generateId("pc-wishlist"),
      type: "button",
      props: { label: "♥", height: 40, variant: "text" },
      tap: { type: "navigate", route: "/wishlist", navigation_type: "push" },
    });
  }

  if (actionButtons.length > 0 && props.showActionButtons !== false) {
    textChildren.push({
      id: generateId("pc-actions"),
      type: "row",
      props: { mainAxisAlignment: "start", crossAxisAlignment: "center", gap: 8 },
      children: actionButtons,
    });
  }

  const cardChildren: Record<string, unknown>[] = isHorizontal
    ? [{
        id: generateId("pc-row"),
        type: "row",
        props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 12 },
        children: [
          { ...imageNode, props: { ...imageNode.props, width: 120, height: 120 } },
          { id: generateId("pc-info"), type: "column", props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 4 }, children: textChildren },
        ],
      }]
    : [imageNode, ...textChildren];

  const node: Record<string, unknown> = {
    id: generateId("product-card"),
    type: "card",
    props: { elevation: isFeatured ? 3 : 1, borderRadius: resolveThemePx((props.radius as string) || "theme-md", rootProps, 12) },
    child: {
      id: generateId("pc-body"),
      type: "column",
      props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 8 },
      children: cardChildren,
    },
    tap: {
      type: "navigate",
      route: product?.id ? `/product/details/${product.id}` : "/product/details/:productId",
      navigation_type: "push",
    },
  };

  return node;
}

function transformProductGrid(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const columns = parseInt(String(props.columns || "3"), 10);
  const gap = resolveGridGap(props.gap as string | number);
  const maxProducts = parseInt(
    (props.maxProducts as string) || (props.maxRows as string) || "6",
    10
  );
  const collectionRaw = props.collection;
  const collection =
    typeof collectionRaw === "object" && collectionRaw !== null
      ? (collectionRaw as Record<string, unknown>).id as string
      : (collectionRaw as string) || "all";
  const metadata = props.metadata as Record<string, unknown> | undefined;
  const cardVariant = (props.cardVariant as string) || (props.variant as string) || "vertical";
  const requestKey = "product-list";

  let requestUrl = buildCollectionRequestUrl(collection, maxProducts);
  if (metadata?.apiUrl) {
    requestUrl = normalizeAdminApiUrl(metadata.apiUrl as string);
  }

  return {
    id: generateId("products-grid"),
    type: "gridView",
    props: {
      crossAxisCount: columns,
      mainAxisSpacing: gap,
      crossAxisSpacing: gap,
      childAspectRatio: 0.75,
      enableInnerScroll: false,
      requestKey,
      requestUrl,
      emptyMessage: "لا توجد منتجات",
      errorMessage: "حدث خطأ",
    },
    itemBuilder: {
      type: "repeat",
      source: `dataContext.requests.${requestKey}.data`,
      item: buildProductGridItemTemplate(cardVariant),
    },
  };
}

/** `metadata.preset`, falling back to the legacy `sectionKind` field. */
function readSectionPreset(props: Record<string, unknown>): string {
  const metadata = props.metadata as Record<string, unknown> | undefined;
  const fromMetadata = typeof metadata?.preset === "string" ? metadata.preset : "";
  return fromMetadata || (typeof props.sectionKind === "string" ? props.sectionKind : "");
}

/**
 * A products-grid / products-page Section that still holds its **unexpanded** card
 * template: `content` is exactly one `Group` with `product: null` whose children bind
 * through `valueContext`, and the web repeater clones it once per product at render
 * time (BLOCKS.md § "Section presets: the one-template-card contract").
 *
 * Mobile has the same primitive, so the template maps straight onto a `gridView` whose
 * `itemBuilder` repeats it over the collection request, with children bound to `item.*`.
 *
 * Returns `null` for anything that does not match the contract — a preset Section whose
 * content is already expanded into ordinary blocks converts as a plain Section (§9.6).
 */
function transformProductsTemplateSection(
  block: Record<string, unknown>,
  rootProps: Record<string, unknown>
): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  const preset = readSectionPreset(props);
  if (preset !== "products-grid" && preset !== "products-page") return null;

  // `cardTemplate` mirrors `content[0]`; it is the only copy left if content was cleared.
  const children = getChildren(block);
  const cardTemplate = Array.isArray(props.cardTemplate) ? (props.cardTemplate as Record<string, unknown>[]) : [];
  const source = children.length > 0 ? children : cardTemplate;
  if (source.length !== 1) return null;

  const template = source[0];
  const templateProps = (template?.props || {}) as Record<string, unknown>;
  if (template?.type !== "Group" || templateProps.product) return null;

  const columns = parseInt(String(props.columnsMobile || props.columns || 2), 10) || 2;
  const gap = resolveGridGap(props.gridGap as string | number);
  const requestKey = "product-list";
  // products-page has no collection picker — its grid is the whole catalogue, filtered
  // at runtime by the search / category controls that sit in the wrapper Section.
  const requestUrl = buildCollectionRequestUrl(
    preset === "products-grid" ? resolveCollectionRef(props.collection) : "all",
    20
  );

  const item = withBindingScope({ kind: "product", base: "item" }, () =>
    transformBlock(template, rootProps)
  );
  if (!item) {
    addWarning(`Section preset "${preset}" has an empty card template; the grid was dropped`);
    return null;
  }

  return {
    id: generateId("products-grid"),
    type: "gridView",
    props: {
      crossAxisCount: columns,
      mainAxisSpacing: gap,
      crossAxisSpacing: gap,
      childAspectRatio: 0.75,
      enableInnerScroll: false,
      requestKey,
      requestUrl,
      emptyMessage: "لا توجد منتجات",
      errorMessage: "حدث خطأ",
    },
    itemBuilder: {
      type: "repeat",
      source: `dataContext.requests.${requestKey}.data`,
      item,
    },
  };
}

function transformProductCarousel(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const maxProducts = parseInt((props.maxProducts as string) || "8", 10);
  const requestKey = "product-list";

  return {
    id: generateId("product-carousel"),
    type: "listView",
    props: {
      scrollDirection: "horizontal",
      data: {
        source: "collection",
        id: "product-carousel",
        requestKey,
        requestUrl: "/api/v1/public/products?page=0&size=20",
        page: 0,
        size: Math.min(maxProducts, 20),
      },
    },
    itemBuilder: {
      type: "repeat",
      source: `dataContext.requests.${requestKey}.data`,
      item: {
        id: generateId("carousel-item"),
        type: "card",
        props: { elevation: 1, borderRadius: 12 },
        child: {
          id: generateId("carousel-body"),
          type: "column",
          props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 4 },
          children: [
            { id: generateId("carousel-img"), type: "image", props: { urlPath: "item.image", source: "network", fit: "cover", width: 160, height: 160, borderRadius: "md" } },
            { id: generateId("carousel-name"), type: "text", props: { valuePath: "item.name", fontSize: 12, fontWeight: "bold" } },
            { id: generateId("carousel-price"), type: "text", props: { valuePath: "item.price", fontSize: 12 } },
          ],
        },
        tap: { type: "navigate", route: "/product/details/:productId", navigation_type: "push" },
      },
    },
  };
}

function transformProductDetails(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const node: Record<string, unknown> = {
    id: generateId("product-detail"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 16 },
    children: [
      {
        id: generateId("pd-image"),
        type: "image",
        props: { urlPath: "dataContext.requests.product-detail.data.image", source: "network", fit: "cover", borderRadius: "md", height: 300 },
      },
      {
        id: generateId("pd-name"),
        type: "text",
        props: { valuePath: "dataContext.requests.product-detail.data.name", fontSize: 22, fontWeight: "bold" },

      },
      {
        id: generateId("pd-price"),
        type: "text",
        props: { valuePath: "dataContext.requests.product-detail.data.price", fontSize: 18, color: "#0b78c5" },
      },
      {
        id: generateId("pd-add-cart"),
        type: "button",
        props: { label: "أضف إلى السلة", height: 48, variant: "elevated", fullWidth: true },
        tap: { type: "cubitCall", cubit: "cart", method: "addItem" },
      },
    ],
  };
  return applyLayout(node, (block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

/** Legacy `CartSection` / `CartList` — a generic cart list with a fixed row template. */
function transformCartSection(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  // Shares the one-cart-list-per-page rule with `cartLineId` Groups: a page carrying
  // both a legacy CartList and a modern cart-row Group would otherwise render twice.
  if (_cartTemplateEmitted) {
    addWarning(`${block.type as string} dropped; the cart already renders as one listView over cart.items`);
    return null;
  }
  _cartTemplateEmitted = true;

  const node: Record<string, unknown> = {
    id: generateId("cart-list"),
    type: "listView",
    props: { emptyMessage: "السلة فارغة" },
    itemBuilder: {
      type: "repeat",
      source: "cart.items",
      item: {
        id: generateId("cart-line-tpl"),
        type: "row",
        props: { gap: 12, crossAxisAlignment: "center" },
        children: [
          { id: generateId("cart-img-tpl"), type: "image", props: { urlPath: "item.imageUrl", source: "network", width: 72, height: 72, fit: "cover" } },
          { id: generateId("cart-name-tpl"), type: "text", props: { valuePath: "item.name", fontSize: 14 } },
        ],
      },
    },
  };
  return applyLayout(node, (block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

function transformCartSummary(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const node: Record<string, unknown> = {
    id: generateId("cart-summary"),
    type: "card",
    props: { elevation: 1, borderRadius: 12 },
    child: {
      id: generateId("cs-body"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 12 },
      children: [
        { id: generateId("cs-subtotal"), type: "text", props: { valuePath: "cart.subtotal", fontSize: 16, fontWeight: "bold" } },
        { id: generateId("cs-shipping"), type: "text", props: { valuePath: "cart.shipping", fontSize: 14, color: "#6b7d93" } },
        { id: generateId("cs-total"), type: "text", props: { valuePath: "cart.total", fontSize: 18, fontWeight: "bold", color: "#0b78c5" } },
      ],
    },
  };
  return applyLayout(node, (block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

function transformCheckoutForm(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const rawFields = (props.fields as Record<string, unknown>[]) || [
    { name: "name", label: "الاسم الكامل", hint: "أدخل اسمك" },
    { name: "phone", label: "رقم الهاتف", hint: "09XXXXXXXX" },
    { name: "address", label: "العنوان", hint: "المدينة، الشارع" },
  ];
  const submissionAction = props.submissionAction as Record<string, unknown> | undefined;

  const addressFields = rawFields.filter((field) => {
    const fieldId = (field.name as string) || "";
    if (fieldId === "email") {
      addWarning("Email field omitted from address form; guest email belongs on /checkout contact card → placeOrder.params.guestEmail");
      return false;
    }
    return true;
  });

  const fieldNodes = addressFields.map((field) => {
    const fieldId = (field.name as string) || "";
    const fieldType = (field.type as string) || "";
    if (fieldType === "boolean" || fieldId === "isDefault") {
      return {
        id: generateId("cf-switch"),
        type: "switchField",
        props: {
          id: fieldId || "isDefault",
          label: (field.label as string) || "تعيين كعنوان افتراضي",
          activeColor: (rootProps.primary as string) || "#1D4ED8",
        },
      };
    }
    const fieldProps: Record<string, unknown> = {
      id: fieldId,
      label: (field.label as string) || "",
      hint: (field.placeholder as string) || (field.hint as string) || "",
      textDirection: fieldId === "phone" ? "ltr" : "rtl",
    };
    if (fieldId === "email") {
      fieldProps.keyboardType = "email";
      fieldProps.validateEmail = true;
    }
    if ((field.required as boolean) || fieldId === "name" || fieldId === "phone" || fieldId === "recipientName" || fieldId === "recipientPhone" || fieldId === "streetAddress") {
      fieldProps.validateRequired = true;
    }
    return { id: generateId("cf-field"), type: "textFormField", props: fieldProps };
  });

  const mapPickerBtn = {
    id: generateId("cf-map-picker"),
    type: "button",
    props: {
      label: lang === "ar" ? "تحديد الموقع على الخريطة" : "Pick location on map",
      variant: "outlined",
      fullWidth: true,
    },
    tap: { type: "cubitCall", cubit: "checkout", method: "pickAddressLocation" },
  };

  const node: Record<string, unknown> = {
    id: generateId("checkout-form"),
    type: "form",
    props: { formId: "checkout-address-form", id: "checkout-address-form" },
    child: {
      id: generateId("cf-fields"),
      type: "column",
      props: flexProps("start", "stretch", { gap: 16 }),
      children: [
        ...fieldNodes,
        mapPickerBtn,
        {
          id: generateId("cf-submit"),
          type: "button",
          props: {
            label: (props.submitLabel as string) || "متابعة",
            height: 48,
            variant: "elevated",
            fullWidth: true,
          },
          tap: submissionAction || {
            type: "cubitCall",
            cubit: "checkout",
            method: "saveAddress",
            requireValidForm: true,
            formId: "checkout-address-form",
          },
        },
      ],
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformCheckoutSummary(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const node: Record<string, unknown> = {
    id: generateId("co-summary"),
    type: "card",
    props: { elevation: 1, borderRadius: 12 },
    child: {
      id: generateId("cos-body"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 12 },
      children: [
        { id: generateId("cos-subtotal"), type: "text", props: { valuePath: "checkout.draft.subtotal", fontSize: 16, fontWeight: "bold" } },
        { id: generateId("cos-shipping"), type: "text", props: { valuePath: "checkout.draft.shipping", fontSize: 14 } },
        { id: generateId("cos-total"), type: "text", props: { valuePath: "checkout.draft.total", fontSize: 18, fontWeight: "bold", color: "#0b78c5" } },
      ],
    },
  };
  return applyLayout(node, (block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

function transformOrderList(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  // BLOCKS.md OrderHistory uses `limit`; the legacy converter input used `maxOrders`.
  const maxOrders = parseInt(String(props.maxOrders ?? props.limit ?? "10"), 10);
  const statusFilter = (props.statusFilter as string) || "all";
  const requestKey = "order-history";
  const statusQuery = statusFilter && statusFilter !== "all" ? `&status=${encodeURIComponent(statusFilter)}` : "";
  return {
    id: generateId("orders-list"),
    type: "listView",
    props: {
      requestKey,
      requestUrl: `/api/v1/customer/orders?page=0&size=${maxOrders}${statusQuery}`,
      emptyMessage: (props.emptyStateText as string) || "لا توجد طلبات بعد.",
    },
    itemBuilder: {
      type: "repeat",
      source: `dataContext.requests.${requestKey}.data`,
      item: {
        id: generateId("order-item"),
        type: "card",
        props: { borderRadius: 8 },
      },
    },
  };
}

function transformOrderDetails(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const node: Record<string, unknown> = {
    id: generateId("order-detail"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 16 },
    children: [
      { id: generateId("od-number"), type: "text", props: { valuePath: "dataContext.requests.order-detail.data.orderNumber", fontSize: 18, fontWeight: "bold" } },
      { id: generateId("od-status"), type: "text", props: { valuePath: "dataContext.requests.order-detail.data.status", fontSize: 14 } },
      { id: generateId("od-total"), type: "text", props: { valuePath: "dataContext.requests.order-detail.data.total", fontSize: 16, fontWeight: "bold", color: "#0b78c5" } },
    ],
  };
  return applyLayout(node, (block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

// ─── BLOCKS.md-specific transformers ─────────────────────────────────────────

function buildTestimonialCardFromItem(
  item: Record<string, unknown>,
  parentProps: Record<string, unknown>,
  rootProps: Record<string, unknown>
): Record<string, unknown> {
  const lang = (parentProps.language as string) || (rootProps.language as string) || "ar";
  const dir = (rootProps.direction as string) || "rtl";
  const showAvatar = parentProps.showAvatars !== false;
  const showRating = parentProps.showRating !== false;

  const children: Record<string, unknown>[] = [];

  if (showAvatar && item.avatar) {
    children.push({
      id: generateId("tm-avatar"),
      type: "image",
      props: {
        url: item.avatar as string,
        source: "network",
        fit: "cover",
        borderRadius: "full",
        width: 48,
        height: 48,
      },
    });
  }

  if (showRating && item.rating) {
    children.push({
      id: generateId("tm-rating"),
      type: "text",
      props: { value: "★".repeat(item.rating as number), fontSize: 16, color: "#f59e0b" },
    });
  }

  const quote = resolveBilingual(item.text as string, item.textAr as string, lang);
  if (quote) {
    children.push({
      id: generateId("tm-quote"),
      type: "text",
      props: { value: quote, fontSize: 14, textAlign: dir === "rtl" ? "right" : "left" },
    });
  }

  const name = resolveBilingual(item.name as string, item.nameAr as string, lang);
  if (name) {
    children.push({
      id: generateId("tm-name"),
      type: "text",
      props: { value: name, fontSize: 14, fontWeight: "bold" },
    });
  }

  const role = resolveBilingual(item.role as string, item.roleAr as string, lang);
  if (role) {
    children.push({
      id: generateId("tm-role"),
      type: "text",
      props: { value: role, fontSize: 12, color: "#6b7d93" },
    });
  }

  return {
    id: generateId("testimonial"),
    type: "card",
    props: { elevation: 1, borderRadius: 12 },
    child: {
      id: generateId("tm-body"),
      type: "column",
      props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 8 },
      children,
    },
  };
}

function transformRichText(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const html = (props.richtext as string) || "";

  const node: Record<string, unknown> = {
    id: generateId("richtext"),
    type: "richtext",
    props: { value: html },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformTestimonials(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;

  if (props.source === "cms") {
    addWarning("Testimonials CMS source not supported; using inline items only");
  }

  const inlineItems = (props.inlineItems as Record<string, unknown>[]) || Object.values(SAMPLE_TESTIMONIALS);
  const itemCount = Math.min(parseInt(String(props.itemCount || inlineItems.length), 10) || inlineItems.length, 12);
  const items = inlineItems.slice(0, itemCount);
  const layoutVariant = (props.layoutVariant as string) || "grid";
  const columns = parseInt(String(props.columns || 3), 10);
  const gap = 16;

  const cards = items.map((item) => buildTestimonialCardFromItem(item, props, rootProps));

  if (layoutVariant === "carousel") {
    return applyLayout(
      {
        id: generateId("testimonials-carousel"),
        type: "listView",
        props: { scrollDirection: "horizontal" },
        children: cards.map((card) => ({
          id: generateId("tm-carousel-cell"),
          type: "container",
          props: { width: 280 },
          child: card,
        })),
      },
      props.layout as Record<string, unknown> | undefined,
      rootProps
    );
  }

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < cards.length; i += columns) {
    const rowItems = cards.slice(i, i + columns).map((card) => ({
      id: generateId("tm-row-cell"),
      type: "container",
      props: { expand: true, expandAxis: "horizontal" },
      child: card,
    }));
    rows.push({
      id: generateId("tm-row"),
      type: "row",
      props: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "stretch", gap },
      children: rowItems,
    });
  }

  return applyLayout(
    {
      id: generateId("testimonials-grid"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap },
      children: rows,
    },
    props.layout as Record<string, unknown> | undefined,
    rootProps
  );
}

function transformImageGallery(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const images = (props.images as Record<string, unknown>[]) || [];
  const mode = (props.mode as string) || "grid";
  const gap = resolveThemePx(props.gap as string, rootProps, 16);
  const aspect = resolveAspectRatio(props.aspectRatio as string);
  const radius = resolveThemePx((props.radius as string) || "theme-md", rootProps, 12);
  const objectFit = (props.objectFit as string) || "cover";

  const imageNodes = images.map((img) => ({
    id: generateId("gallery-image"),
    type: "image",
    props: {
      url: (img.src as string) || "",
      source: "network",
      alt: (img.alt as string) || "",
      fit: objectFit,
      ...(aspect !== undefined ? { aspectRatio: aspect } : {}),
      borderRadius: radius,
    },
  }));

  if (mode === "slider") {
    const intervalMs = props.autoplayDuration
      ? (String(props.autoplayDuration).startsWith("theme-5") ? 5000 : parsePx(props.autoplayDuration as string, 5) * 1000)
      : 5000;
    return applyLayout(
      {
        id: generateId("gallery-slider"),
        type: "imageSlider",
        props: {
          images: images.map((img) => ({
            url: (img.src as string) || (img.url as string) || "",
            alt: (img.alt as string) || "",
          })),
          aspectRatio: aspect ?? 1.777,
          fit: objectFit,
          borderRadius: radius,
          autoPlay: props.autoplay === true || props.autoplay === "on",
          intervalMs,
          showIndicators: true,
          indicatorStyle: "dot",
        },
      },
      props.layout as Record<string, unknown> | undefined,
      rootProps
    );
  }

  const cols = parseInt(String(props.gridColumns || 3), 10);
  const gapSpacing = gap;
  const maxRows = parseInt(String(props.gridRows || 0), 10);
  let displayImages = imageNodes;
  if (maxRows > 0) displayImages = imageNodes.slice(0, cols * maxRows);

  return applyLayout(
    {
      id: generateId("gallery-grid"),
      type: "gridView",
      props: {
        crossAxisCount: cols,
        mainAxisSpacing: gapSpacing,
        crossAxisSpacing: gapSpacing,
        childAspectRatio: aspect ?? 1.0,
      },
      children: displayImages,
    },
    props.layout as Record<string, unknown> | undefined,
    rootProps
  );
}

function transformAccordion(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = (props.items as Record<string, unknown>[]) || [];
  const children: Record<string, unknown>[] = [];

  if (props.heading) {
    children.push({
      id: generateId("accordion-heading"),
      type: "text",
      props: { value: props.heading as string, fontSize: 18, fontWeight: "bold" },
    });
  }
  if (props.description) {
    children.push({
      id: generateId("accordion-desc"),
      type: "text",
      props: { value: props.description as string, fontSize: 14, color: "#6b7d93" },
    });
  }

  const variant = (props.variant as string) || "soft";
  const variantStyles: Record<string, Record<string, unknown>> = {
    soft: { backgroundColor: "#f8fafc", borderRadius: 8, showDivider: true },
    outline: { showDivider: true },
    minimal: { showDivider: false },
  };
  const tileStyle = variantStyles[variant] || variantStyles.soft;

  for (const item of items) {
    let tile: Record<string, unknown> = {
      id: generateId("accordion-item"),
      type: "expansionTile",
      props: {
        title: item.title as string,
        initiallyExpanded: item.open === true,
        ...tileStyle,
      },
      children: [
        {
          id: generateId("accordion-body"),
          type: "text",
          props: { value: (item.body as string) || "", fontSize: 14 },
        },
      ],
    };

    if (variant === "outline") {
      tile = {
        id: generateId("accordion-outline-wrap"),
        type: "container",
        props: { border: { width: 1, color: "#e2e8f0" }, borderRadius: 8 },
        child: tile,
      };
    }

    children.push(tile);
  }

  const node: Record<string, unknown> = {
    id: generateId("accordion"),
    type: "column",
    props: flexProps("start", "stretch", { gap: 0 }),
    children,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformBlank(_block: Record<string, unknown>, _rootProps: Record<string, unknown>): null {
  return null;
}

function transformProductInfo(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const product = props.product as Record<string, unknown> | undefined;
  const lang = (rootProps.language as string) || "ar";
  const dir = (rootProps.direction as string) || "rtl";
  const align = (props.align as string) || (dir === "rtl" ? "right" : "left");

  const title = lang === "ar"
    ? (product?.titleAr as string) || (product?.title as string) || ""
    : (product?.titleEn as string) || (product?.title as string) || "";

  const children: Record<string, unknown>[] = [];
  if (props.showTitle !== false && title) {
    children.push({
      id: generateId("pi-title"),
      type: "text",
      props: { value: title, fontSize: resolveFontSize(props.titleSize as string, 18), fontWeight: "bold", textAlign: align },
    });
  }
  if (props.showDescription !== false && product?.description) {
    children.push({
      id: generateId("pi-desc"),
      type: "text",
      props: { value: product.description as string, fontSize: 14, textAlign: align, color: "#6b7d93" },
    });
  }
  if (props.showPrice !== false) {
    children.push({
      id: generateId("pi-price"),
      type: "text",
      props: { value: `${product?.price ?? ""}`, fontSize: resolveFontSize(props.priceSize as string, 16), color: "#0b78c5", textAlign: align },
    });
  }

  const node: Record<string, unknown> = {
    id: generateId("product-info"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 8 },
    children,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformWishlist(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const columns = parseInt(String(props.columns || 2), 10);
  const requestKey = "wishlist";

  return applyLayout(
    {
      id: generateId("wishlist-grid"),
      type: "gridView",
      props: {
        crossAxisCount: columns,
        mainAxisSpacing: resolveGridGap(props.gap as string),
        crossAxisSpacing: resolveGridGap(props.gap as string),
        requestKey,
        requestUrl: "/api/v1/customer/wishlist",
        emptyMessage: (props.emptyStateText as string) || "قائمة المفضلة فارغة.",
      },
      itemBuilder: {
        type: "repeat",
        source: `dataContext.requests.${requestKey}.data`,
        item: {},
      },
    },
    props.layout as Record<string, unknown> | undefined,
    rootProps
  );
}

// ─── Testimonial Block Transformers ──────────────────────────────────────────

const SAMPLE_TESTIMONIALS: Record<string, Record<string, unknown>> = {
  "t-1": { id: "t-1", name: "Sarah", nameAr: "سارة", role: "Customer", roleAr: "زبونة", avatar: "", rating: 5, text: "Great product and excellent service!", textAr: "منتج رائع وخدمة ممتازة!" },
  "t-2": { id: "t-2", name: "Ahmed", nameAr: "أحمد", role: "Merchant", roleAr: "تاجر", avatar: "", rating: 4, text: "Very satisfied with the quality.", textAr: "راضٍ جداً عن الجودة." },
  "t-3": { id: "t-3", name: "Layla", nameAr: "ليلى", role: "Designer", roleAr: "مصممة", avatar: "", rating: 5, text: "Beautiful designs and fast delivery!", textAr: "تصاميم جميلة وتوصيل سريع!" },
};

function transformTestimonialCard(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const dir = (rootProps.direction as string) || "rtl";
  const testimonialId = (props.testimonial as string) || "t-1";
  const t = SAMPLE_TESTIMONIALS[testimonialId] || SAMPLE_TESTIMONIALS["t-1"];
  const variant = (props.variant as string) || "default";
  const elevationMap: Record<string, number> = { default: 1, outlined: 0, elevated: 4 };

  const children: Record<string, unknown>[] = [];

  const showAvatar = (props.showAvatar as string) !== "off";
  if (showAvatar && (t.avatar as string)) {
    children.push({
      id: generateId("tm-avatar"),
      type: "image",
      props: { url: t.avatar as string, source: "network", fit: "cover", borderRadius: "full", width: 48, height: 48 },
    });
  }

  const showRating = (props.showRating as string) !== "off";
  if (showRating && t.rating) {
    const stars = "★".repeat(t.rating as number);
    children.push({
      id: generateId("tm-rating"),
      type: "text",
      props: { value: stars, fontSize: 16, color: "#f59e0b" },
    });
  }

  const quote = resolveBilingual(t.text as string, t.textAr as string, lang);
  if (quote) {
    children.push({
      id: generateId("tm-quote"),
      type: "text",
      props: { value: quote, fontSize: 14, textAlign: dir === "rtl" ? "right" : "left" },
    });
  }

  const name = resolveBilingual(t.name as string, t.nameAr as string, lang);
  if (name) {
    children.push({
      id: generateId("tm-name"),
      type: "text",
      props: { value: name, fontSize: 14, fontWeight: "bold" },
    });
  }

  const role = resolveBilingual(t.role as string, t.roleAr as string, lang);
  if (role) {
    children.push({
      id: generateId("tm-role"),
      type: "text",
      props: { value: role, fontSize: 12, color: "#6b7d93" },
    });
  }

  const node: Record<string, unknown> = {
    id: generateId("testimonial"),
    type: "card",
    props: { elevation: elevationMap[variant] || 1, borderRadius: 12 },
    child: {
      id: generateId("tm-body"),
      type: "column",
      props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 8 },
      children,
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformTestimonialGrid(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const columns = parseInt((props.columns as string) || "2", 10);
  const gap = parsePx(props.gap as string | number, 24);
  const maxItems = parseInt((props.maxItems as string) || "6", 10);

  const cards = Object.values(SAMPLE_TESTIMONIALS)
    .slice(0, maxItems)
    .map((t) => {
      const cardBlock: Record<string, unknown> = {
        type: "TestimonialCard",
        props: { testimonial: t.id, showAvatar: props.showAvatar, showRating: props.showRating, variant: props.cardVariant || "default" },
      };
      return transformTestimonialCard(cardBlock as Record<string, unknown>, rootProps);
    });

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < cards.length; i += columns) {
    const rowItems = cards.slice(i, i + columns).map((card) => ({
      id: generateId("tgrid-cell"),
      type: "container",
      props: { expand: true, expandAxis: "horizontal" },
      child: card,
    }));
    rows.push({
      id: generateId("tgrid-row"),
      type: "row",
      props: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "stretch", gap },
      children: rowItems,
    });
  }

  const node: Record<string, unknown> = {
    id: generateId("testimonial-grid"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap },
    children: rows,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Utility Block Transformers ─────────────────────────────────────────────

function transformHtml(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const html = (props.html as string) || "";
  const stripped = html.replace(/<[^>]*>/g, "").trim();

  const node: Record<string, unknown> = {
    id: generateId("html-block"),
    type: "text",
    props: { value: stripped || "(empty)", fontSize: 14 },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformCountdown(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const title = resolveBilingual(props.title as string, props.titleAr as string, lang);
  const showDays = (props.showDays as string) !== "off";
  const showHours = (props.showHours as string) !== "off";
  const showMinutes = (props.showMinutes as string) !== "off";
  const showSeconds = (props.showSeconds as string) !== "off";

  const units: { key: string; label: string; labelAr: string }[] = [];
  if (showDays) units.push({ key: "days", label: "Days", labelAr: "أيام" });
  if (showHours) units.push({ key: "hours", label: "Hours", labelAr: "ساعات" });
  if (showMinutes) units.push({ key: "minutes", label: "Minutes", labelAr: "دقائق" });
  if (showSeconds) units.push({ key: "seconds", label: "Seconds", labelAr: "ثواني" });

  const children: Record<string, unknown>[] = [];

  if (title) {
    children.push({
      id: generateId("cd-title"),
      type: "text",
      props: { value: title, fontSize: 18, fontWeight: "bold", textAlign: "center" },
    });
  }

  const unitNodes = units.map((unit) => ({
    id: generateId(`cd-${unit.key}`),
    type: "column",
    props: { crossAxisAlignment: "center", mainAxisAlignment: "center", gap: 4 },
    children: [
      { id: generateId(`cd-${unit.key}-val`), type: "timer", props: { durationMs: 0 } },
      { id: generateId(`cd-${unit.key}-lbl`), type: "text", props: { value: resolveBilingual(unit.label, unit.labelAr, lang), fontSize: 12, color: "#6b7d93" } },
    ],
  }));

  children.push({
    id: generateId("cd-units"),
    type: "row",
    props: { mainAxisAlignment: "center", crossAxisAlignment: "center", gap: 16 },
    children: unitNodes,
  });

  const node: Record<string, unknown> = {
    id: generateId("countdown"),
    type: "column",
    props: { crossAxisAlignment: "center", mainAxisAlignment: "center", gap: 12 },
    children,
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformCookieConsent(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const message = resolveBilingual(props.message as string, props.messageAr as string, lang);
  const acceptLabel = resolveBilingual(props.acceptLabel as string, props.acceptLabelAr as string, lang) || (lang === "ar" ? "قبول" : "Accept");
  const declineLabel = resolveBilingual(props.declineLabel as string, props.declineLabelAr as string, lang) || (lang === "ar" ? "رفض" : "Decline");

  const node: Record<string, unknown> = {
    id: generateId("cookie-consent"),
    type: "container",
    props: { color: "#1f2937", padding: { top: 16, bottom: 16, left: 16, right: 16 } },
    child: {
      id: generateId("cc-body"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 12 },
      children: [
        { id: generateId("cc-message"), type: "text", props: { value: message, fontSize: 14, color: "#ffffff" } },
        {
          id: generateId("cc-buttons"),
          type: "row",
          props: { mainAxisAlignment: "end", crossAxisAlignment: "center", gap: 12 },
          children: [
            { id: generateId("cc-decline"), type: "button", props: { label: declineLabel, height: 36, variant: "outlined" } },
            { id: generateId("cc-accept"), type: "button", props: { label: acceptLabel, height: 36, variant: "elevated" } },
          ],
        },
      ],
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformSearchModal(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const placeholder = resolveBilingual(props.placeholder as string, props.placeholderAr as string, lang) || (lang === "ar" ? "بحث عن منتجات…" : "Search products…");

  const node: Record<string, unknown> = {
    id: generateId("search-btn"),
    type: "button",
    props: { label: placeholder, icon: "search", height: 48, variant: "outlined", fullWidth: true },
    tap: { type: "navigate", route: "/search", navigation_type: "push" },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Shell Block Transformers ───────────────────────────────────────────────

function transformLogo(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;

  const node: Record<string, unknown> = {
    id: generateId("logo"),
    type: "image",
    props: {
      url: (props.src as string) || "",
      source: "network",
      alt: (props.alt as string) || "Logo",
      fit: "contain",
      width: parsePx(props.width as string, 120),
      height: parsePx(props.height as string, 36),
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Legacy / Gap Block Transformers ─────────────────────────────────────────

function transformLogos(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const logos = (props.logos as Record<string, unknown>[]) || [];

  const node: Record<string, unknown> = {
    id: generateId("logos-list"),
    type: "listView",
    props: { scrollDirection: "horizontal", height: 60 },
    children: logos.map((logo) => ({
      id: generateId("logo"),
      type: "image",
      props: {
        url: (logo.src as string) || (logo.url as string) || "",
        source: "network",
        height: 48,
        fit: "contain",
        alt: (logo.alt as string) || "",
      },
    })),
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformStats(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = (props.items as Record<string, unknown>[]) || [];

  const node: Record<string, unknown> = {
    id: generateId("stats-row"),
    type: "row",
    props: flexProps("spaceAround", "center"),
    children: items.map((item) => ({
      id: generateId("stat-col"),
      type: "column",
      props: flexProps("start", "center", { gap: 4 }),
      children: [
        {
          id: generateId("stat-value"),
          type: "text",
          props: { value: (item.title as string) || (item.value as string) || "", fontSize: 22, fontWeight: "bold" },
        },
        {
          id: generateId("stat-label"),
          type: "text",
          props: { value: (item.description as string) || (item.label as string) || "", fontSize: 14 },
        },
      ],
    })),
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformContactForm(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (props.language as string) || (rootProps.language as string) || "ar";
  const ar = lang === "ar";
  const formId = (props.id as string) || "contact-form";

  // BLOCKS.md ContactForm exposes field toggles rather than a `fields[]` array.
  const defaultFields: Record<string, unknown>[] = [
    { name: "name", label: ar ? "الاسم" : "Name" },
    { name: "email", label: ar ? "البريد الإلكتروني" : "Email" },
    ...(props.showPhone !== false
      ? [{ name: "phone", label: ar ? "رقم الهاتف" : "Phone", required: props.requirePhone === true }]
      : []),
    ...(props.showSubject !== false ? [{ name: "subject", label: ar ? "الموضوع" : "Subject" }] : []),
    { name: "message", label: ar ? "الرسالة" : "Message" },
  ];
  const fields = (props.fields as Record<string, unknown>[]) || defaultFields;

  if (props.enableCaptcha === true) {
    addWarning("ContactForm CAPTCHA has no mobile equivalent; the converted form submits without it");
  }

  const fieldNodes = fields.map((field) => {
    const fieldId = (field.name as string) || "";
    const isLtrField = fieldId === "email" || fieldId === "phone";
    const fieldProps: Record<string, unknown> = {
      id: fieldId,
      label: (field.label as string) || "",
      hint: (field.placeholder as string) || "",
      textDirection: isLtrField ? "ltr" : ((rootProps.direction as string) === "rtl" ? "rtl" : "ltr"),
    };
    if (fieldId === "email") {
      fieldProps.keyboardType = "email";
      fieldProps.validateEmail = true;
    }
    if (fieldId === "phone") {
      fieldProps.keyboardType = "phone";
      fieldProps.validatePhone = true;
    }
    if (fieldId === "name" || fieldId === "email" || field.required === true) {
      fieldProps.validateRequired = true;
    }
    if (fieldId === "message") {
      fieldProps.maxLines = 5;
      fieldProps.minLines = 3;
    }
    return { id: generateId("contact-field"), type: "textFormField", props: fieldProps };
  });

  const headingNodes: Record<string, unknown>[] = [];
  const title = props.title as Record<string, unknown> | string | undefined;
  const subtitle = props.subtitle as Record<string, unknown> | string | undefined;
  const bilingual = (v: Record<string, unknown> | string | undefined) =>
    typeof v === "string" ? v : resolveBilingual(v?.en as string, v?.ar as string, lang);

  if (bilingual(title)) {
    headingNodes.push({
      id: generateId("contact-title"),
      type: "text",
      props: { value: bilingual(title), fontSize: 22, fontWeight: "bold" },
    });
  }
  if (bilingual(subtitle)) {
    headingNodes.push({
      id: generateId("contact-subtitle"),
      type: "text",
      props: { value: bilingual(subtitle), fontSize: 14, color: "#6b7d93" },
    });
  }

  const node: Record<string, unknown> = {
    id: generateId("contact-form"),
    type: "form",
    props: { formId, id: formId },
    child: {
      id: generateId("contact-col"),
      type: "column",
      props: flexProps("start", "stretch", { gap: 16 }),
      children: [
        ...headingNodes,
        ...fieldNodes,
        {
          id: generateId("contact-submit"),
          type: "button",
          props: {
            label: resolveBilingual(props.submitLabel as string, props.submitLabelAr as string, lang) || (ar ? "إرسال" : "Submit"),
            height: 48,
            variant: "elevated",
            fullWidth: (props.submitWidth as string) !== "auto",
          },
          tap: {
            type: "apiCall",
            method: "POST",
            url: (props.submitUrl as string) || "/api/v1/public/contact",
            requireValidForm: true,
            formId,
          },
        },
      ],
    },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformNavMenu(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = (props.items as Record<string, unknown>[]) || (props.links as Record<string, unknown>[]) || [];
  const lang = (rootProps.language as string) || "ar";

  const node: Record<string, unknown> = {
    id: generateId("nav-menu"),
    type: "column",
    props: flexProps("start", "stretch", { gap: 0 }),
    children: items.map((item) => {
      const linkProps = { link: item.link, href: item.href, pageId: item.pageId };
      const tap = resolveLayoutTap(linkProps as Record<string, unknown>, rootProps);
      return {
        id: generateId("nav-link"),
        type: "button",
        props: {
          label: resolveBilingual(item.label as string, item.labelAr as string, lang),
          variant: "text",
          fullWidth: true,
        },
        ...(tap ? { tap } : {}),
      };
    }),
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformSidebar(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  if ((props.showOnMobile as string) === "hidden") {
    addWarning("Sidebar has showOnMobile: \"hidden\"; block omitted");
    return null;
  }
  if (props.dock) addWarning("Sidebar dock prop is ignored on mobile; rendered as inline column");

  const children = getChildren(block);
  const node: Record<string, unknown> = {
    id: generateId("sidebar"),
    type: "column",
    props: flexProps("start", "stretch", { gap: 16 }),
    children: children.map((c) => transformBlock(c, rootProps)).filter(Boolean),
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformTemplate(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const children = getChildren(block)
    .map((c) => transformBlock(c, rootProps))
    .filter(Boolean) as Record<string, unknown>[];

  if (children.length === 0) return null;
  if (children.length === 1) return children[0];

  return {
    id: generateId("template-flat"),
    type: "column",
    props: flexProps("start", "stretch", { gap: 8 }),
    children,
  };
}

function transformLoginButton(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const node: Record<string, unknown> = {
    id: generateId("login-btn"),
    type: "button",
    props: {
      label: (props.guestLabel as string) || (lang === "ar" ? "تسجيل الدخول" : "Login"),
      variant: "text",
    },
    tap: { type: "navigate", route: "/auth/login", navigation_type: "push" },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformCartIconButton(_block: Record<string, unknown>, _rootProps: Record<string, unknown>): null {
  addWarning("CartIconButton omitted; use appBar.showCartIcon when SiteHeader is present");
  return null;
}

// ─── Block Dispatcher ───────────────────────────────────────────────────────

function transformBlock(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  if (!block || typeof block !== "object") return null;

  const blockProps = (block.props || {}) as Record<string, unknown>;
  const layout = blockProps.layout as Record<string, unknown> | undefined;
  if (layout?.hideOnMobile === true) return null;

  const rawType = (block.type as string) || "";

  if (PRESET_ONLY_TYPES.has(rawType)) {
    addWarning(
      `"${rawType}" is a web preset, not a block — it should already be expanded into a cartLineId Group before export; skipped`
    );
    return null;
  }

  const type = normalizeBlockType(rawType);

  switch (type) {
    // Layout blocks
    case "Section": return transformSection(block, rootProps);
    case "Flex": return transformFlex(block, rootProps);
    case "Grid": return transformLayoutGrid(block, rootProps);
    case "RowGroup": {
      const rowBlock = {
        ...block,
        props: { ...blockProps, direction: "row" },
      };
      return transformGroup(rowBlock, rootProps);
    }
    case "Group":
    case "FlexGroup":
    case "Div": return transformGroup(block, rootProps);

    // Content blocks
    case "Heading": return transformHeading(block, rootProps);
    case "Text":
    case "Paragraph": return transformText(block, rootProps);
    case "RichText": return transformRichText(block, rootProps);
    case "Space": return transformSpace(block, rootProps);
    case "Button": return transformButton(block, rootProps);
    case "ButtonGroup": return transformButtonGroup(block, rootProps);
    case "Chip": return transformChip(block, rootProps);
    case "Link": return transformLink(block, rootProps);
    case "Input": return transformInput(block, rootProps);
    case "Switch": return transformSwitch(block, rootProps);
    case "Icon": return transformIcon(block, rootProps);
    case "Image": return transformImage(block, rootProps);
    case "Video": return transformVideo(block, rootProps);
    case "YouTube": return transformYouTube(block, rootProps);
    case "Hero": return transformHero(block, rootProps);
    case "Card": return transformCard(block, rootProps);
    case "Badge": return transformBadge(block, rootProps);
    case "Divider": return transformDivider(block, rootProps);
    case "Accordion": return transformAccordion(block, rootProps);
    case "Blank": return transformBlank(block, rootProps);
    case "ImageGallery": return transformImageGallery(block, rootProps);
    case "Logos": return transformLogos(block, rootProps);
    case "Stats": return transformStats(block, rootProps);
    case "ContactForm": return transformContactForm(block, rootProps);
    case "NavMenu": return transformNavMenu(block, rootProps);
    case "Sidebar": return transformSidebar(block, rootProps);
    case "Template": return transformTemplate(block, rootProps);

    // Commerce blocks
    case "ProductImage": return transformProductImage(block, rootProps);
    case "ProductInfo": return transformProductInfo(block, rootProps);
    case "ProductCard": return transformProductCard(block, rootProps);
    case "ProductGrid": return transformProductGrid(block, rootProps);
    case "ProductCarousel": return transformProductCarousel(block, rootProps);
    case "ProductGallery": return transformProductGallery(block, rootProps);
    case "ProductDetails": return transformProductDetails(block, rootProps);
    case "CartSection": return transformCartSection(block, rootProps);
    case "CartQuantity": return transformCartQuantity(block, rootProps);
    case "CartSummary": return transformCartSummary(block, rootProps);
    case "CheckoutForm": return transformCheckoutForm(block, rootProps);
    case "CheckoutSummary": return transformCheckoutSummary(block, rootProps);
    case "OrderList": return transformOrderList(block, rootProps);
    case "OrderDetails": return transformOrderDetails(block, rootProps);
    case "Wishlist": return transformWishlist(block, rootProps);

    // Testimonial blocks
    case "Testimonials": return transformTestimonials(block, rootProps);
    case "TestimonialCard": return transformTestimonialCard(block, rootProps);
    case "TestimonialGrid": return transformTestimonialGrid(block, rootProps);

    // Utility blocks
    case "Html": return transformHtml(block, rootProps);
    case "Countdown": return transformCountdown(block, rootProps);
    case "CookieConsent": return transformCookieConsent(block, rootProps);
    case "SearchModal": return transformSearchModal(block, rootProps);

    // Header chrome blocks
    case "LoginButton": return transformLoginButton(block, rootProps);
    case "CartIconButton": return transformCartIconButton(block, rootProps);

    // Logo
    case "Logo": return transformLogo(block, rootProps);

    // Zone / shell blocks handled at page level — return null to skip
    case "SiteHeader":
    case "SiteFooter":
    case "SiteDrawerShell":
    case "SideDrawer":
    case "ZoneDrawer":
      return null;

    // Overlay zones only reach the body when nothing triggers them (they are
    // otherwise inlined into `openBottomSheet` by resolveTap).
    case "ZonePopup":
    case "ZoneBottomSheet":
      addWarning(`${rawType} "${(blockProps.key as string) || ""}" has no zone trigger on this page; emitted as unsupported`);
      return { id: generateId("unsupported"), type: "unsupported", props: { blockType: rawType } };

    default: {
      if (UNSUPPORTED_LEAF_BLOCKS.has(type)) {
        addWarning(`Block type "${rawType}" has no mobile equivalent; rendered as unsupported. If this merchant has a ${rawType === "CategoryListMenu" ? "categories" : "search"} screen, wire manually; otherwise omit the block.`);
        return { id: generateId("unsupported"), type: "unsupported", props: { blockType: rawType } };
      }

      const props = block.props as Record<string, unknown> || {};
      const children = getChildren(block);
      if (children.length > 0) {
        addWarning(`Unknown block type "${rawType}"; converted children only`);
        return {
          id: generateId("unknown"),
          type: "container",
          child: {
            id: generateId("unknown-body"),
            type: "column",
            props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 8 },
            children: children.map((c) => transformBlock(c, rootProps)).filter(Boolean),
          },
        };
      }

      addWarning(`Unsupported leaf block type "${rawType}"; skipped`);
      return null;
    }
  }
}

// ─── Theme Mapping ──────────────────────────────────────────────────────────

function transformFontFamily(fontSlug: string | undefined, language: string): string {
  if (language === "ar") return "Tajawal";
  const fontMap: Record<string, string> = {
    "dm-sans": "DM Sans", inter: "Inter", roboto: "Roboto", "open-sans": "Open Sans",
    lato: "Lato", poppins: "Poppins", montserrat: "Montserrat", raleway: "Raleway",
    nunito: "Nunito", manrope: "Manrope", sora: "Sora", tajawal: "Tajawal",
    "playfair-display": "Playfair Display", merriweather: "Merriweather",
    lora: "Lora", "space-grotesk": "Space Grotesk", geist: "Geist",
    fraunces: "Fraunces", system: "Tajawal",
  };
  return fontMap[fontSlug || ""] || "Tajawal";
}

function transformTheme(rootProps: Record<string, unknown>): Record<string, unknown> {
  const lang = (rootProps.language as string) || "ar";

  return {
    mode: "light",
    colors: {
      primary: (rootProps.primary as string) || "#0b78c5",
      surface: (rootProps.surface as string) || "#f6f8fc",
      background: "#F1F5F9",
      text: (rootProps.text as string) || "#14243f",
      muted: (rootProps.neutral as string) || "#6b7d93",
      success: (rootProps.success as string) || "#16A34A",
      warning: (rootProps.warning as string) || "#D97706",
      error: (rootProps.error as string) || "#DC2626",
    },
    typography: {
      fontFamily: transformFontFamily(rootProps.bodyFont as string, lang),
      scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, display: 36 },
      weights: { normal: 400, medium: 500, bold: 700 },
      lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    },
    radius: {
      none: 0, sm: parsePx(rootProps.radiusSm as string, 8), md: parsePx(rootProps.radiusMd as string, 12),
      lg: parsePx(rootProps.radiusLg as string, 18), xl: parsePx(rootProps.radiusXl as string, 24), full: 9999,
    },
    spacing: { xs: 4, sm: 10, md: 16, lg: 24, xl: 36 },
    buttons: {
      sm: { height: parsePx(rootProps.buttonSmHeight as string, 36), padX: parsePx(rootProps.buttonSmPaddingX as string, 14), fontSize: parsePx(rootProps.buttonSmFontSize as string, 14), radius: 10 },
      md: { height: parsePx(rootProps.buttonMdHeight as string, 48), padX: parsePx(rootProps.buttonMdPaddingX as string, 18), fontSize: parsePx(rootProps.buttonMdFontSize as string, 16), radius: 12 },
      lg: { height: parsePx(rootProps.buttonLgHeight as string, 56), padX: parsePx(rootProps.buttonLgPaddingX as string, 26), fontSize: parsePx(rootProps.buttonLgFontSize as string, 16), radius: 14 },
    },
  };
}

function transformNavigation(rootProps: Record<string, unknown>, pages: Record<string, unknown>[]): Record<string, unknown> {
  const tabs = [
    { id: "tab-home", label: "الرئيسية", icon: "home", route: "/home" },
    { id: "tab-categories", label: "الأقسام", icon: "grid_view", route: "/categories" },
    { id: "tab-search", label: "بحث", icon: "search", route: "/search" },
    { id: "tab-cart", label: "السلة", icon: "shopping_cart", route: "/cart" },
    { id: "tab-profile", label: "حسابي", icon: "person", route: "/profile" },
  ];

  const tabRoutes = new Set(tabs.map((t) => t.route));
  const systemExcludeRoutes = [
    "/splash", "/splash-carousel", "/auth/login", "/auth/otp-reset",
    "/product/details", "/checkout", "/checkout/address",
    "/checkout/payment", "/checkout/success", "/orders",
  ];
  const pageRoutes = pages
    .map((p) => normalizeRoute((p.route as string) || "/"))
    .filter((r) => !tabRoutes.has(r));
  const shellExcludeRoutes = [...new Set([...systemExcludeRoutes, ...pageRoutes])];

  return {
    type: "tabs",
    initialRoute: "/splash",
    shellExcludeRoutes,
    tabs,
  };
}

// ─── Page Assembly ──────────────────────────────────────────────────────────

function buildAppDrawer(drawerBlock: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (drawerBlock.props || {}) as Record<string, unknown>;
  const dir = (rootProps.direction as string) || "rtl";
  const sideRaw = (props.side as string) || (props.drawerSide as string) || "";
  let drawerEdge = "start";
  if (sideRaw === "right") drawerEdge = "end";
  else if (sideRaw === "left") drawerEdge = "start";
  else drawerEdge = dir === "rtl" ? "start" : "start";

  const bg = (props.backgroundColor as string) || "#ffffff";
  const width = parsePx(props.width as string, 320);
  const lang = (rootProps.language as string) || "ar";

  const navLinks = (props.items as Record<string, unknown>[]) || (props.links as Record<string, unknown>[]) || [];
  const slot = (props.slot as Record<string, unknown>[]) || [];

  if (slot.length > 0) {
    const slotChildren = slot.map((b) => transformBlock(b, rootProps)).filter(Boolean) as Record<string, unknown>[];
    return {
      id: generateId("drawer"),
      type: "appDrawer",
      props: { drawerEdge, width, backgroundColor: bg },
      child: {
        id: generateId("drawer-col"),
        type: "column",
        props: { gap: 0 },
        children: slotChildren.length > 0 ? slotChildren : [{
          id: generateId("drawer-link-home"),
          type: "button",
          props: { label: lang === "ar" ? "الرئيسية" : "Home", variant: "text", fullWidth: true },
          tap: { type: "navigate", route: "/home", navigation_type: "go" },
        }],
      },
    };
  }

  const linkNodes = navLinks.map((item) => {
    const tap = resolveLayoutTap({ link: item.link, href: item.href } as Record<string, unknown>, rootProps);
    return {
      id: generateId("drawer-link"),
      type: "button",
      props: {
        label: resolveBilingual(item.label as string, item.labelAr as string, lang),
        variant: "text",
        fullWidth: true,
      },
      ...(tap ? { tap } : {}),
    };
  });

  if (linkNodes.length === 0) {
    linkNodes.push({
      id: generateId("drawer-link-home"),
      type: "button",
      props: { label: lang === "ar" ? "الرئيسية" : "Home", variant: "text", fullWidth: true },
      tap: { type: "navigate", route: "/home", navigation_type: "go" },
    });
  }

  return {
    id: generateId("drawer"),
    type: "appDrawer",
    props: { drawerEdge, width, backgroundColor: bg },
    child: {
      id: generateId("drawer-col"),
      type: "column",
      props: { gap: 0 },
      children: linkNodes,
    },
  };
}

function transformPage(page: Record<string, unknown>): Record<string, unknown> {
  const path = normalizeRoute((page.path as string) || "/");
  const label = (page.label as string) || (page.title as string) || "Page";
  const blocks = Array.isArray(page.blocks) ? (page.blocks as Record<string, unknown>[]) : [];
  const rootProps = (page.rootProps as Record<string, unknown>) || {};
  const slugPart = path.replace(/^\//, "").replace(/[/:]/g, "-") || "home";

  _pageStickyFooter = null;
  _zoneSlots = new Map();
  _zoneSlotsUsed = new Set();
  _drawerZoneKeys = new Set();
  _cartTemplateEmitted = false;
  _activeAuthForm = null;

  // Separate zone / shell blocks from body blocks
  const bodyBlocks: Record<string, unknown>[] = [];
  let headerBlock: Record<string, unknown> | null = null;
  let footerBlock: Record<string, unknown> | null = null;
  let drawerBlock: Record<string, unknown> | null = null;

  for (const block of blocks) {
    const type = block.type as string;
    const bProps = (block.props || {}) as Record<string, unknown>;

    if (type === "SiteHeader" || type === "SiteFooter") {
      // `visible: false` (ZONES.md activation flag) keeps the zone out of the live site.
      if (bProps.visible === false) continue;
      if (type === "SiteHeader") headerBlock = block;
      else footerBlock = block;
      continue;
    }

    if (type === "ZonePopup" || type === "ZoneBottomSheet") {
      if (bProps.is_active === false) {
        addWarning(`${type} "${(bProps.key as string) || ""}" is inactive (is_active: false); overlay skipped`);
        continue;
      }
      const key = (bProps.key as string) || type.toLowerCase();
      _zoneSlots.set(key, (bProps.slot as Record<string, unknown>[]) || []);
      continue;
    }

    if (type === "SiteDrawerShell" || type === "SideDrawer" || type === "ZoneDrawer") {
      const inactive = bProps.is_active === false || bProps.enabled === false || bProps.visible === false;
      if (inactive) {
        addWarning(`${type} "${(bProps.key as string) || (bProps.name as string) || ""}" is inactive; appDrawer skipped`);
        continue;
      }
      const key = (bProps.key as string) || (bProps.name as string) || "site-drawer";
      _drawerZoneKeys.add(key);
      if (drawerBlock) addWarning(`Multiple drawer zones found; "${key}" dropped — mobile supports one appDrawer per page`);
      else drawerBlock = block;
      continue;
    }

    bodyBlocks.push(block);
  }

  const headerProps = (headerBlock?.props || {}) as Record<string, unknown>;
  const headerDrawerName = (headerProps.drawerName as string) || "";
  if (headerDrawerName) _drawerZoneKeys.add(headerDrawerName);

  // Convert body blocks
  const body = bodyBlocks.map((b) => transformBlock(b, rootProps)).filter(Boolean) as Record<string, unknown>[];

  // An overlay zone only reaches mobile through the tap that opens it (openBottomSheet).
  // Anything left unopened on this page would silently disappear.
  for (const [key, slot] of _zoneSlots) {
    if (slot.length > 0 && !_zoneSlotsUsed.has(key)) {
      addWarning(
        `Overlay zone "${key}" is never opened on route "${path}"; nothing triggers it, so its content was dropped. Add a ContentButton with destinationType "zone" and zoneKey "${key}".`
      );
    }
  }

  // Build appBar from the SiteHeader block, falling back to root props
  const headerTitle = (headerProps.title as string) || (rootProps.headerBrandTitle as string) || label;
  const headerBg = (headerProps.backgroundColor as string) || (rootProps.headerBackgroundColor as string) || "#ffffff";
  const headerFg = (headerProps.textColor as string) || (rootProps.headerTextColor as string) || "#0f172a";
  const showDrawer = headerProps.showDrawerButton === true
    || (rootProps.headerShowDrawerButton as string) === "on"
    || rootProps.headerShowDrawerButton === true
    || drawerBlock !== null;

  const rightSlot = (headerProps.rightSlot as Record<string, unknown>[]) || [];
  const hasCartInSlot = rightSlot.some((b) => (b.type as string) === "CartIconButton");
  const unmappedSlot = rightSlot.filter((b) => (b.type as string) !== "CartIconButton");
  if (unmappedSlot.length > 0) {
    addWarning(
      `SiteHeader.rightSlot blocks [${unmappedSlot.map((b) => b.type).join(", ")}] have no appBar equivalent; wire them as appBar trailing actions manually`
    );
  }
  const showCartIcon = hasCartInSlot || (rootProps.headerShowCart as string) !== "off";

  const appBarProps: Record<string, unknown> = {
    title: headerTitle || label,
    backgroundColor: headerBg,
    foregroundColor: headerFg,
    elevation: 0,
  };

  if (showDrawer) {
    appBarProps.showMenu = true;
    appBarProps.menuAction = { type: "openDrawer" };
  }

  if (showCartIcon) {
    appBarProps.showCartIcon = true;
    appBarProps.cartBadgePath = "cart.itemCount";
    appBarProps.cartAction = { type: "navigate", route: "/cart" };
  }

  const gradientTop = (rootProps.headerBackgroundGradientTop as string) || "";
  const gradientBottom = (rootProps.headerBackgroundGradientBottom as string) || "";
  const useBrandGradient = rootProps.headerBackgroundGradient === true
    || rootProps.headerBackgroundGradient === "on"
    || rootProps.headerUseBrandGradient === true
    || rootProps.headerUseBrandGradient === "on";
  if (gradientTop && gradientBottom) {
    appBarProps.backgroundGradientTop = gradientTop;
    appBarProps.backgroundGradientBottom = gradientBottom;
  } else if (useBrandGradient) {
    appBarProps.backgroundGradient = true;
  }

  const appBar: Record<string, unknown> = {
    id: `${slugPart}-app-bar`,
    type: "appBar",
    props: appBarProps,
  };

  // Build footer — page-level slot, not body[]
  const siteFooterNode = footerBlock ? buildFooter(footerBlock, rootProps) : null;
  const stickyFooter = _pageStickyFooter;
  const footerNode = stickyFooter || siteFooterNode;

  // Build appDrawer from the drawer zone, or from SiteHeader nav links when the
  // header exposes a burger button but the merchant defined no drawer zone.
  let appDrawer: Record<string, unknown> | undefined;
  if (drawerBlock) {
    appDrawer = buildAppDrawer(drawerBlock, rootProps);
  } else if (showDrawer && Array.isArray(headerProps.links) && (headerProps.links as unknown[]).length > 0) {
    appDrawer = buildAppDrawer(
      { type: "ZoneDrawer", props: { links: headerProps.links, side: "left" } },
      rootProps
    );
  }

  const pageNode: Record<string, unknown> = {
    id: `page-${slugPart}`,
    route: path,
    title: label,
    background: (page.background as string) || "#ffffff",
    scroll: (page.scroll as string) || "vertical",
    appBar,
    body,
  };

  if (footerNode) {
    if (path.includes("/product/") && stickyFooter) {
      pageNode.footer = { overlay: true, ...footerNode };
      body.push({ id: generateId("footer-spacer"), type: "sizedBox", props: { height: 116 } });
    } else {
      pageNode.footer = footerNode;
    }
  }
  if (appDrawer) pageNode.appDrawer = appDrawer;

  return pageNode;
}

function buildFooterLinkNode(
  link: Record<string, unknown>,
  lang: string,
  fg: string,
  rootProps: Record<string, unknown>
): Record<string, unknown> {
  // Web footers carry a structured LinkValue; legacy root-prop footers carry `href`.
  const tap = resolveLayoutTap(link, rootProps)
    || { type: "navigate", route: normalizeRoute("/"), navigation_type: "push" };
  return {
    id: generateId("footer-link"),
    type: "button",
    props: {
      label: resolveBilingual(link.label as string, link.labelAr as string, lang),
      height: 32,
      variant: "text",
      color: fg,
    },
    tap,
  };
}

function buildFooter(
  footerBlock: Record<string, unknown> | null,
  rootProps: Record<string, unknown>
): Record<string, unknown> | null {
  const props = (footerBlock?.props || {}) as Record<string, unknown>;
  if (props.visible === false) return null;
  if ((rootProps.footerVisible as string) === "false" || rootProps.footerVisible === false) return null;

  const lang = (props.language as string) || (rootProps.language as string) || "ar";
  const bg = (props.backgroundColor as string) || (rootProps.footerBackgroundColor as string) || "#10213a";
  const fg = (props.textColor as string) || (rootProps.footerTextColor as string) || "#ffffff";
  const title = (props.title as string) || "";
  const tagline = resolveBilingual(
    (props.tagline as string) || (rootProps.footerTagline as string),
    (props.taglineAr as string) || (rootProps.footerTaglineAr as string),
    lang
  );
  const columns = (props.columns as Record<string, unknown>[])
    || (rootProps.footerColumns as Record<string, unknown>[])
    || [];

  const children: Record<string, unknown>[] = [];

  if (title) {
    children.push({
      id: generateId("footer-title"),
      type: "text",
      props: { value: title, fontSize: 16, fontWeight: "bold", color: fg },
    });
  }

  if (tagline) {
    children.push({
      id: generateId("footer-tagline"),
      type: "text",
      props: { value: tagline, fontSize: 14, color: fg },
    });
  }

  for (const col of columns) {
    const colTitle = resolveBilingual(col.title as string, col.titleAr as string, lang);
    const links = (col.links as Record<string, unknown>[]) || [];
    const linkNodes = links.map((link) => buildFooterLinkNode(link, lang, fg, rootProps));

    if (colTitle || linkNodes.length > 0) {
      children.push({
        id: generateId("footer-col"),
        type: "column",
        props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 4 },
        children: [
          ...(colTitle
            ? [{ id: generateId("footer-col-title"), type: "text", props: { value: colTitle, fontSize: 14, fontWeight: "bold", color: fg } }]
            : []),
          ...linkNodes,
        ],
      });
    }
  }

  if (props.showBottomBar !== false) {
    const bottomText = resolveBilingual(props.bottomBarText as string, props.bottomBarTextAr as string, lang);
    const bottomLinks = (props.bottomLinks as Record<string, unknown>[]) || [];

    if (bottomLinks.length > 0) {
      children.push({
        id: generateId("footer-bottom-links"),
        type: "row",
        props: flexProps("center", "center", { gap: 8 }),
        children: bottomLinks.map((link) => buildFooterLinkNode(link, lang, fg, rootProps)),
      });
    }
    if (bottomText) {
      children.push({
        id: generateId("footer-bottom-text"),
        type: "text",
        props: { value: bottomText, fontSize: 12, color: fg, textAlign: "center" },
      });
    }
  }

  if (children.length === 0) return null;

  return {
    id: generateId("footer"),
    type: "container",
    props: { color: bg, padding: { top: 24, bottom: 24, left: 16, right: 16 } },
    child: {
      id: generateId("footer-body"),
      type: "column",
      props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 16 },
      children,
    },
  };
}

// ─── SiteData ingest (ZONES.md / BLOCKS.md envelope) ────────────────────────

/** Zone bucket order — header first, footer last, overlays in between. */
const ZONE_ORDER = ["zone-header", "zone-drawer", "zone-popup", "zone-bottom-sheet", "zone-footer"];

/**
 * `root:zone-header` | `zone:header` | `root:shell-left-zone` → `zone-header` | `zone-drawer`.
 * Mirrors `canonicalZoneName()` in the web editor (ZONES.md § Migration notes).
 */
function canonicalZoneName(key: string): string {
  let name = String(key || "").trim();
  if (name.startsWith("root:")) name = name.slice("root:".length);
  name = name.replace(/^zone:/, "zone-");
  if (name === "shell-left-zone" || name === "shell-right-zone") return "zone-drawer";
  return name;
}

function collectZoneBlocks(zones: unknown): Record<string, unknown>[] {
  if (!zones || typeof zones !== "object") return [];

  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const [key, value] of Object.entries(zones as Record<string, unknown>)) {
    if (!Array.isArray(value) || value.length === 0) continue;
    const name = canonicalZoneName(key);
    buckets.set(name, [...(buckets.get(name) || []), ...(value as Record<string, unknown>[])]);
  }

  const ordered: Record<string, unknown>[] = [];
  for (const name of ZONE_ORDER) ordered.push(...(buckets.get(name) || []));
  for (const [name, blocks] of buckets) {
    if (ZONE_ORDER.includes(name)) continue;
    addWarning(`Unknown zone "${name}"; its blocks were converted into the page body`);
    ordered.push(...blocks);
  }
  return ordered;
}

/** True for a web `SiteData` payload or a single-page Puck `UserData` payload. */
function isSiteDataEnvelope(obj: Record<string, unknown>): boolean {
  if (Array.isArray(obj.pages)) return true;
  return Boolean(obj.root) && (Array.isArray(obj.content) || Boolean(obj.zones));
}

/** `{ root, zones, pages }` → the converter's `{ path, label, rootProps, blocks }` page shells. */
function normalizeSiteData(site: Record<string, unknown>): Record<string, unknown>[] {
  const root = site.root as Record<string, unknown> | undefined;
  const rootProps = (root?.props as Record<string, unknown>) || {};
  const zoneBlocks = collectZoneBlocks(site.zones);

  const rawPages = Array.isArray(site.pages) && site.pages.length > 0
    ? (site.pages as Record<string, unknown>[])
    : [{ path: "/", name: rootProps.title, content: Array.isArray(site.content) ? site.content : [] }];

  return rawPages.map((page) => {
    // Dynamic routes keep the web path verbatim (`/products/:product-slug`) — the
    // engine resolves `:param` from the repeat item / route params.
    const path = (page.path as string) || (page.slug as string) || (page.link as string) || "/";
    const content = Array.isArray(page.content) ? (page.content as Record<string, unknown>[]) : [];
    return {
      path,
      label: (page.title as string) || (page.name as string) || (page.label as string) || "Page",
      rootProps,
      blocks: [...zoneBlocks, ...content],
      ...(page.background ? { background: page.background } : {}),
      ...(page.scroll ? { scroll: page.scroll } : {}),
    };
  });
}

function buildEnvelope(pages: Record<string, unknown>[], rootProps: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: "1.0",
    app: {
      name: "SOOQ Merchant Mobile",
      bundleId: "com.sooq.merchant.mobile",
      apiBaseUrl: "https://sooq.up.railway.app",
      tenantId: "00000000-0000-0000-0000-000000000000",
      tenantSlug: "example-merchant",
    },
    theme: transformTheme(rootProps),
    navigation: transformNavigation(rootProps, pages),
    pages,
  };
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export type TransformResult =
  | { success: true; output: unknown; warnings?: string[] }
  | { success: false; error: string };

function successResult(output: unknown): TransformResult {
  const warnings = takeWarnings();
  return warnings.length > 0 ? { success: true, output, warnings } : { success: true, output };
}

export function transformWebToMobile(input: string): TransformResult {
  resetIdCounter();
  resetWarnings();
  _warnedContainerRequest = false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  try {
    if (Array.isArray(parsed)) {
      const isPageArray = parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).path === "string";

      if (isPageArray) {
        const pages = (parsed as Record<string, unknown>[]).map(transformPage);
        const rootProps = ((parsed[0] as Record<string, unknown>).rootProps as Record<string, unknown>) || {};
        return successResult(buildEnvelope(pages, rootProps));
      }

      const rootProps = {};
      const output = (parsed as Record<string, unknown>[]).map((b) => transformBlock(b, rootProps)).filter(Boolean);
      return successResult(output);
    }

    const obj = parsed as Record<string, unknown>;

    // Web `SiteData` / Puck `UserData`: { root, zones, pages | content }
    if (isSiteDataEnvelope(obj)) {
      const rootProps = ((obj.root as Record<string, unknown> | undefined)?.props as Record<string, unknown>) || {};
      const pageShells = normalizeSiteData(obj);
      const pages = pageShells.map(transformPage);
      return successResult(buildEnvelope(pages, rootProps));
    }

    if (typeof obj.path === "string" || typeof obj.blocks !== "undefined") {
      const rootProps = (obj.rootProps as Record<string, unknown>) || {};
      const page = transformPage(obj);
      return successResult(buildEnvelope([page], rootProps));
    }

    const rootProps = {};
    const output = transformBlock(obj, rootProps);
    if (output === null) return { success: false, error: "Unsupported block type or empty result" };
    return successResult(output);
  } catch (e) {
    return { success: false, error: `Transform error: ${(e as Error).message}` };
  }
}

// ─── Example Presets ─────────────────────────────────────────────────────────

const PK = (o: Record<string, unknown>) => JSON.stringify(o, null, 2);

export type ExamplePreset = {
  label: string;
  json: string;
  /**
   * Legacy presets are authored from web block types that are **not** in the mobile block set
   * (docs/BLOCKS-MOBILE.md) — `Text`, `Heading`, `Button`, `Hero`, `Card`, `Badge`, `Space`,
   * `ProductGrid`, `TestimonialGrid`, `Countdown`, … They still convert, so they are kept as
   * regression fixtures for old `store_config.json` payloads, but they must not be used as a
   * template for new work. The converter UI shows them disabled behind a "Show legacy" toggle.
   */
  legacy?: boolean;
  /** Why this preset is legacy — shown in the UI. */
  legacyReason?: string;
};

export const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    // ── Canonical example ──────────────────────────────────────────────────────
    // Three pages, authored strictly from the mobile block set in docs/BLOCKS-MOBILE.md:
    //   /          static content only  — ContentHeading, ContentParagraph, ContentImage,
    //                                     ImageGallery, ContentIcon, ContentDivider,
    //                                     Accordion, Testimonials, VideoEmbed, Group, Flex
    //   /login     a real form          — ContentInput + ContentSwitch + ContentButton(login)
    //   /products  products-grid preset — one unexpanded card-template Group (§9.7)
    // No SiteHeader / SiteFooter / ZonePopup / Space / RowGroup: none are in the mobile set.
    label: "Mobile Site JSON · 3 pages (home · login · products)",
    json: PK({
      root: {
        props: {
          title: "متجري", direction: "rtl", language: "ar",
          primary: "#0b78c5", surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
          success: "#0f9d73", warning: "#c77a15", error: "#c24133",
          bodyFont: "cairo", radiusSm: "8px", radiusMd: "12px", radiusLg: "18px",
          breakpointMobileMax: 767, breakpointTabletMax: 1023,
        },
      },
      zones: {
        // ZoneDrawer is one of the two site zones in the mobile block set. Its slot content
        // becomes the page-level `appDrawer`; the appBar gets showMenu + openDrawer from it.
        "root:zone-drawer": [{
          type: "ZoneDrawer",
          props: {
            is_active: true, is_mobile_only: true, zoneKey: "site-drawer", side: "left",
            backgroundColor: "#ffffff", overlay: true, showCloseButton: true,
            slot: [
              { type: "ContentHeading", props: { text: "القائمة", level: "3", textAlign: "right", fontSize: "theme-lg", fontWeight: "theme-semibold", color: "theme-text" } },
              { type: "ContentLink", props: { title: "الرئيسية", link: { kind: "page", pageId: "/" }, align: "right", color: "theme-text", fontSize: "theme-md" } },
              { type: "ContentLink", props: { title: "المنتجات", link: { kind: "page", pageId: "/products" }, align: "right", color: "theme-text", fontSize: "theme-md" } },
              { type: "ContentLink", props: { title: "تسجيل الدخول", link: { kind: "page", pageId: "/login" }, align: "right", color: "theme-primary", fontSize: "theme-md" } },
            ],
          },
        }],
      },
      pages: [
        // ── 1. Home — static blocks only, no data binding, no actions ──────────
        {
          path: "/", slug: "/", name: "الرئيسية", link: "/", title: "الرئيسية",
          description: "الصفحة الرئيسية للمتجر", iconName: "home",
          content: [
            {
              type: "Section",
              props: {
                name: "الترحيب", anchorId: "", visible: true,
                paddingTop: "40px", paddingBottom: "32px", paddingHorizontal: "16px",
                backgroundColor: "#f6f8fc", theme: "dark", maxWidth: "1280px",
                columns: 1, columnsMobile: 1, gridGap: "16px",
                content: [
                  { type: "ContentHeading", props: { text: "أهلاً بك في متجري", level: "1", textAlign: "center", fontFamily: "body", fontSize: "theme-2xl", fontWeight: "theme-bold", lineHeight: "theme-tight", color: "theme-text" } },
                  { type: "ContentParagraph", props: { text: "تشكيلة مختارة بعناية، وتوصيل خلال ٢-٤ أيام عمل لكل المحافظات.", textAlign: "center", fontFamily: "body", fontSize: "theme-md", fontWeight: "theme-light", lineHeight: "theme-normal", color: "theme-neutral" } },
                  { type: "ContentImage", props: { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80", alt: "صورة البانر الرئيسي", align: "center", objectFit: "cover", radius: "theme-lg", maxWidth: "100%" } },
                  { type: "ContentButton", props: { label: "تصفّح المنتجات", align: "center", destinationType: "link", link: { kind: "page", pageId: "/products" }, buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
                ],
              },
            },
            {
              // Flex row of icon+text pairs — the mobile-set way to build a features strip
              // (the legacy `Card` / `Stats` blocks are not in the mobile registry).
              type: "Section",
              props: {
                name: "المزايا", visible: true,
                paddingTop: "32px", paddingBottom: "32px", paddingHorizontal: "16px",
                backgroundColor: "#ffffff", columns: 1, columnsMobile: 1, gridGap: "16px",
                content: [
                  { type: "ContentHeading", props: { text: "لماذا نحن؟", level: "2", textAlign: "right", fontSize: "theme-xl", fontWeight: "theme-bold", color: "theme-text" } },
                  {
                    type: "Flex",
                    props: {
                      direction: "row", justifyContent: "center", gap: 16, wrap: "nowrap",
                      items: [
                        {
                          type: "Group",
                          props: {
                            direction: "column", gap: 8, alignItems: "center", justifyContent: "flex-start", wrap: "nowrap",
                            backgroundColor: "theme-surface", padding: "16px", borderRadius: "theme-md", boxShadow: "sm",
                            content: [
                              { type: "ContentIcon", props: { icon: "truck", size: 32, colorMode: "theme", colorTheme: "primary" } },
                              { type: "ContentHeading", props: { text: "توصيل سريع", level: "3", textAlign: "center", fontSize: "theme-md", fontWeight: "theme-semibold", color: "theme-text" } },
                              { type: "ContentParagraph", props: { text: "٢-٤ أيام عمل", textAlign: "center", fontSize: "theme-sm", color: "theme-neutral" } },
                            ],
                          },
                        },
                        {
                          type: "Group",
                          props: {
                            direction: "column", gap: 8, alignItems: "center", justifyContent: "flex-start", wrap: "nowrap",
                            backgroundColor: "theme-surface", padding: "16px", borderRadius: "theme-md", boxShadow: "sm",
                            content: [
                              { type: "ContentIcon", props: { icon: "shield-check", size: 32, colorMode: "theme", colorTheme: "success" } },
                              { type: "ContentHeading", props: { text: "دفع آمن", level: "3", textAlign: "center", fontSize: "theme-md", fontWeight: "theme-semibold", color: "theme-text" } },
                              { type: "ContentParagraph", props: { text: "الدفع عند الاستلام متاح", textAlign: "center", fontSize: "theme-sm", color: "theme-neutral" } },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  { type: "ContentDivider", props: { thickness: "1px", colorMode: "theme", colorTheme: "neutral" } },
                ],
              },
            },
            {
              type: "Section",
              props: {
                name: "المعرض", visible: true,
                paddingTop: "32px", paddingBottom: "32px", paddingHorizontal: "16px",
                backgroundColor: "#ffffff", columns: 1, columnsMobile: 1, gridGap: "16px",
                content: [
                  { type: "ContentHeading", props: { text: "من المتجر", level: "2", textAlign: "right", fontSize: "theme-xl", fontWeight: "theme-bold", color: "theme-text" } },
                  {
                    type: "ImageGallery",
                    props: {
                      mode: "slider", aspectRatio: "landscape", objectFit: "cover",
                      radius: "theme-md", gap: "theme-16", slidesPerView: 1,
                      autoplay: true, autoplayDuration: "theme-5", showArrows: true,
                      images: [
                        { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80", alt: "ساعة" },
                        { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1000&q=80", alt: "كاميرا" },
                      ],
                    },
                  },
                  { type: "ContentHeading", props: { text: "شاهد الفيديو التعريفي", level: "3", textAlign: "right", fontSize: "theme-lg", fontWeight: "theme-semibold", color: "theme-text" } },
                  { type: "VideoEmbed", props: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", align: "center", size: "theme-315", radius: "theme-lg" } },
                ],
              },
            },
            {
              type: "Section",
              props: {
                name: "آراء العملاء والأسئلة", visible: true,
                paddingTop: "32px", paddingBottom: "40px", paddingHorizontal: "16px",
                backgroundColor: "#f6f8fc", columns: 1, columnsMobile: 1, gridGap: "16px",
                content: [
                  {
                    type: "Testimonials",
                    props: {
                      source: "inline", layoutVariant: "carousel", columns: 2, language: "ar",
                      showRating: true, showAvatars: false, itemCount: 2,
                      inlineItems: [
                        { id: "t1", name: { ar: "أحمد علي", en: "Ahmed Ali" }, role: { ar: "عميل", en: "Customer" }, avatar: "", rating: 5, text: { ar: "منتجات رائعة وتوصيل سريع.", en: "Great products, fast delivery." } },
                        { id: "t2", name: { ar: "سارة حسن", en: "Sara Hasan" }, role: { ar: "عميلة", en: "Customer" }, avatar: "", rating: 4, text: { ar: "خدمة عملاء ممتازة.", en: "Excellent support." } },
                      ],
                    },
                  },
                  {
                    type: "Accordion",
                    props: {
                      heading: "الأسئلة الشائعة",
                      description: "إجابات مختصرة وعملية.",
                      variant: "soft", backgroundColor: "", textColor: "",
                      items: [
                        { title: "كم يستغرق التوصيل؟", body: "معظم الطلبات تصل خلال ٢-٤ أيام عمل حسب المدينة.", open: true },
                        { title: "هل يمكن الدفع عند الاستلام؟", body: "نعم، الدفع عند الاستلام متاح لجميع المناطق المؤهلة.", open: false },
                        { title: "هل تقدّمون إرجاعاً للمنتجات؟", body: "يمكنك طلب الإرجاع خلال ٧ أيام للمنتجات غير المستخدمة.", open: false },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },

        // ── 2. Login — form fields + a login-action button ─────────────────────
        // The Section holds ContentInput fields *and* a ContentButton with
        // buttonAction "login", so the converter wraps its content in a `form` node and the
        // button submits it via cubitCall auth.login (requireValidForm + formId + form params).
        // `scroll: "none"` keeps the auth screen from scrolling (§7 page rules).
        {
          path: "/login", slug: "/login", name: "تسجيل الدخول", link: "/login",
          title: "تسجيل الدخول", description: "الدخول إلى حسابك", iconName: "user",
          isCustom: true, scroll: "none",
          content: [{
            type: "Section",
            props: {
              name: "نموذج الدخول", visible: true,
              paddingTop: "48px", paddingBottom: "48px", paddingHorizontal: "24px",
              backgroundColor: "#ffffff", maxWidth: "480px",
              columns: 1, columnsMobile: 1, gridGap: "16px",
              content: [
                { type: "ContentHeading", props: { text: "تسجيل الدخول", level: "1", textAlign: "center", fontSize: "theme-2xl", fontWeight: "theme-bold", color: "theme-text" } },
                { type: "ContentParagraph", props: { text: "أدخل رقم هاتفك وكلمة المرور للمتابعة.", textAlign: "center", fontSize: "theme-sm", fontWeight: "theme-light", color: "theme-neutral" } },
                { type: "ContentInput", props: { label: "رقم الهاتف", name: "phone", inputType: "tel", placeholder: "09xxxxxxxx", required: true, prependIcon: "none", inputAction: "" } },
                { type: "ContentInput", props: { label: "كلمة المرور", name: "password", inputType: "password", placeholder: "••••••••", required: true, prependIcon: "none", inputAction: "" } },
                { type: "ContentSwitch", props: { label: "تذكّرني", name: "rememberMe", helperText: "", defaultChecked: false, labelPosition: "start", switchAction: "" } },
                { type: "ContentButton", props: { label: "دخول", align: "center", destinationType: "action", buttonAction: "login", submitRedirectUrl: "/", buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
                { type: "ContentDivider", props: { thickness: "1px", colorMode: "theme", colorTheme: "neutral" } },
                { type: "ContentLink", props: { title: "العودة إلى الرئيسية", link: { kind: "page", pageId: "/" }, align: "center", color: "theme-primary", hoverEffect: "underline", fontSize: "theme-sm", icon: "none" } },
              ],
            },
          }],
        },

        // ── 3. Products — the products-grid section preset ─────────────────────
        // The preset Section is NOT expanded on the web side: `content` holds exactly one
        // card-template Group with `product: null`, and the repeater clones it per product.
        // The converter maps that onto gridView + itemBuilder.repeat over the collection
        // request (§9.7); children `valueContext` paths become item.* paths (§9.5).
        {
          path: "/products", slug: "/products", name: "المنتجات", link: "/products",
          title: "كل المنتجات", description: "تصفّح كل منتجات المتجر", iconName: "package",
          isCustom: true,
          content: [
            {
              type: "Section",
              props: {
                name: "مقدمة", visible: true,
                paddingTop: "32px", paddingBottom: "0px", paddingHorizontal: "16px",
                backgroundColor: "#ffffff", columns: 1, columnsMobile: 1, gridGap: "16px",
                content: [
                  { type: "ContentHeading", props: { text: "المنتجات المميزة", level: "2", textAlign: "right", fontSize: "theme-xl", fontWeight: "theme-bold", color: "theme-text" } },
                  { type: "ContentParagraph", props: { text: "اضغط على أي منتج لعرض تفاصيله.", textAlign: "right", fontSize: "theme-sm", fontWeight: "theme-light", color: "theme-neutral" } },
                ],
              },
            },
            {
              type: "Section",
              props: {
                name: "Featured", visible: true,
                paddingTop: "16px", paddingBottom: "40px", paddingHorizontal: "16px",
                backgroundColor: "#ffffff", maxWidth: "1280px",
                columns: 3, columnsMobile: 2, gridGap: "16px",
                metadata: { preset: "products-grid" },
                collection: { id: "coll_featured", name: "Featured", slug: "featured", productCount: 24 },
                content: [{
                  type: "Group",
                  props: {
                    product: null, metadata: null,
                    direction: "column", gap: 10, alignItems: "stretch", justifyContent: "flex-start", wrap: "nowrap",
                    backgroundColor: "theme-surface", padding: "12px", borderRadius: "theme-md", boxShadow: "sm",
                    language: "ar",
                    content: [
                      { type: "ContentImage", props: { src: "https://placehold.co/400x400", valueContext: { path: "images[0].url" }, alt: "صورة المنتج", altValueContext: { path: "product.title" }, align: "center", objectFit: "cover", radius: "theme-md", maxWidth: "100%" } },
                      { type: "ContentHeading", props: { text: "اسم المنتج", valueContext: { path: "product.title" }, level: "3", textAlign: "right", fontSize: "theme-md", fontWeight: "theme-semibold", color: "theme-text" } },
                      { type: "ContentParagraph", props: { text: "٠ ل.س", valueContext: { path: "pricing.displayPrice" }, textAlign: "right", fontSize: "theme-sm", fontWeight: "theme-semibold", color: "theme-primary" } },
                      { type: "ContentButton", props: { label: "إضافة إلى السلة", align: "center", destinationType: "action", buttonAction: "addToCart", buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "sm" } },
                    ],
                  },
                }],
              },
            },
          ],
        },
      ],
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses SiteHeader / SiteFooter / ZonePopup / CartIconButton — none are in the mobile block set (docs/BLOCKS-MOBILE.md).",
    label: "Site JSON (root + zones + pages)",
    json: PK({
      root: {
        props: {
          title: "متجري", direction: "rtl", language: "ar",
          primary: "#0b78c5", surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
          bodyFont: "dm-sans", radiusMd: "12px",
        },
      },
      zones: {
        "root:zone-header": [{
          type: "SiteHeader",
          props: {
            title: "متجري", visible: true, showDrawerButton: true, drawerName: "site-drawer",
            backgroundColor: "#ffffff", textColor: "#0f172a",
            links: [
              { label: "Home", labelAr: "الرئيسية", link: { kind: "page", pageId: "/" } },
              { label: "Products", labelAr: "المنتجات", link: { kind: "page", pageId: "/products" } },
            ],
            rightSlot: [{ type: "CartIconButton", props: { href: "/cart" } }],
          },
        }],
        "root:zone-footer": [{
          type: "SiteFooter",
          props: {
            visible: true, taglineAr: "متجرك الشامل.", showBottomBar: true, bottomBarTextAr: "© ٢٠٢٦ متجري",
            columns: [{
              title: "Shop", titleAr: "التسوق",
              links: [{ label: "Products", labelAr: "المنتجات", link: { kind: "page", pageId: "/products" } }],
            }],
          },
        }],
        "root:zone-drawer": [{
          type: "ZoneDrawer",
          props: {
            is_active: true, key: "site-drawer", side: "left", backgroundColor: "#ffffff",
            slot: [{ type: "ContentHeading", props: { text: "القائمة", fontSize: "theme-lg" } }],
          },
        }],
        "root:zone-popup": [{
          type: "ZonePopup",
          props: {
            is_active: true, key: "login",
            slot: [
              { type: "ContentHeading", props: { text: "تسجيل الدخول" } },
              { type: "ContentInput", props: { label: "رقم الهاتف", name: "phone", inputType: "tel", required: true } },
              { type: "ContentButton", props: { label: "دخول", destinationType: "action", buttonAction: "login" } },
            ],
          },
        }],
        "root:zone-bottom-sheet": [],
      },
      pages: [{
        path: "/", slug: "/", name: "الرئيسية", title: "الرئيسية",
        content: [{
          type: "Section",
          props: {
            name: "Hero", paddingTop: "48px", paddingBottom: "48px", paddingHorizontal: "24px",
            content: [
              { type: "ContentHeading", props: { text: "مرحباً بك", level: "1", textAlign: "center", fontSize: "theme-xl", color: "theme-primary" } },
              { type: "ContentParagraph", props: { text: "أفضل المنتجات بأفضل الأسعار", textAlign: "center", fontSize: "theme-md", color: "theme-neutral" } },
              { type: "ContentButton", props: { label: "تسجيل الدخول", destinationType: "zone", zoneKey: "login", zoneAction: "open" } },
            ],
          },
        }],
      }],
    }),
  },
  {
    legacy: true,
    legacyReason: "SiteHeader / SiteFooter zones plus a shopping-cart preset; neither block is in the mobile block set.",
    label: "Site JSON · multi-page (home · products · detail · cart)",
    json: PK({
      root: {
        props: {
          title: "متجري", direction: "rtl", language: "ar",
          primary: "#0b78c5", surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
          bodyFont: "cairo", radiusMd: "12px",
        },
      },
      zones: {
        "root:zone-header": [{
          type: "SiteHeader",
          props: {
            title: "متجري", variant: "commerce", language: "ar", visible: true, brandHref: "/",
            backgroundColor: "#ffffff", textColor: "#0f172a",
            links: [
              { label: "Home", labelAr: "الرئيسية", link: { kind: "page", pageId: "/" } },
              { label: "Products", labelAr: "المنتجات", link: { kind: "page", pageId: "/products" } },
              { label: "Cart", labelAr: "السلة", link: { kind: "page", pageId: "/cart" } },
            ],
            rightSlot: [{ type: "CartIconButton", props: { href: "/cart" } }],
          },
        }],
        "root:zone-footer": [{
          type: "SiteFooter",
          props: {
            visible: true, taglineAr: "توصيل سريع لكل المحافظات.",
            showBottomBar: true, bottomBarTextAr: "© ٢٠٢٦ متجري",
            columns: [{
              title: "Shop", titleAr: "التسوق",
              links: [
                { label: "Products", labelAr: "المنتجات", link: { kind: "page", pageId: "/products" } },
                { label: "Cart", labelAr: "السلة", link: { kind: "page", pageId: "/cart" } },
              ],
            }],
          },
        }],
      },
      pages: [
        {
          path: "/", slug: "/", name: "الرئيسية", link: "/", title: "الرئيسية",
          description: "الصفحة الرئيسية للمتجر", iconName: "Home",
          content: [{
            type: "Section",
            props: {
              name: "Hero", paddingTop: "56px", paddingBottom: "56px", paddingHorizontal: "24px",
              backgroundColor: "#f6f8fc", maxWidth: "1280px", columns: 1, columnsMobile: 1,
              content: [
                { type: "ContentHeading", props: { text: "أهلاً بك في متجري", level: "1", textAlign: "center", fontSize: "theme-2xl", fontWeight: "theme-bold", color: "theme-text" } },
                { type: "ContentParagraph", props: { text: "تشكيلة مختارة بعناية، وتوصيل خلال ٢-٤ أيام عمل.", textAlign: "center", fontSize: "theme-md", color: "theme-neutral" } },
                { type: "ContentButton", props: { label: "تصفّح المنتجات", align: "center", destinationType: "link", link: { kind: "page", pageId: "/products" }, buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
              ],
            },
          }],
        },
        {
          path: "/products", slug: "/products", name: "المنتجات", link: "/products",
          title: "كل المنتجات", iconName: "Package", isCustom: true,
          content: [{
            type: "Section",
            props: {
              name: "قائمة المنتجات", paddingTop: "40px", paddingBottom: "40px", paddingHorizontal: "24px",
              columns: 1, columnsMobile: 1,
              content: [
                { type: "ContentHeading", props: { text: "كل المنتجات", level: "2", textAlign: "right", fontSize: "theme-xl", color: "theme-text" } },
                { type: "ContentParagraph", props: { text: "اختر منتجاً لعرض تفاصيله.", textAlign: "right", fontSize: "theme-sm", color: "theme-neutral" } },
                { type: "ContentButton", props: { label: "عرض منتج تجريبي", align: "right", destinationType: "link", link: { kind: "page", pageId: "/products/:product-slug", dynamicSegment: { param: "product-slug", valueContext: "product.slug" } }, buttonVariantMode: "variant", buttonVariant: "secondary" } },
              ],
            },
          }],
        },
        {
          // Dynamic route: the engine fills `:product-slug` from the repeat item / route params.
          path: "/products/:product-slug", slug: "/products/example-product", name: "تفاصيل المنتج",
          link: "/products/example-product", title: "تفاصيل المنتج",
          dynamic: true, examplePath: "/products/example-product", iconName: "Package",
          content: [{
            type: "Section",
            props: {
              name: "تفاصيل المنتج", paddingTop: "32px", paddingBottom: "32px", paddingHorizontal: "24px",
              columns: 1, columnsMobile: 1,
              content: [{
                type: "Group",
                props: {
                  direction: "column", gap: 16, alignItems: "stretch",
                  product: { id: "prod-001", titleAr: "قميص كلاسيكي", titleEn: "Classic Shirt", slug: "classic-shirt" },
                  metadata: { type: "product", method: "get", id: "prod-001", apiUrl: "https://api.example.com/public/products/classic-shirt?include=PRICING&include=IMAGES" },
                  language: "ar",
                  content: [
                    { type: "ContentImage", props: { src: "https://placehold.co/600x600", valueContext: { path: "images[0].url" }, alt: "صورة المنتج", radius: "theme-lg" } },
                    { type: "ContentHeading", props: { text: "قميص كلاسيكي", valueContext: { path: "product.title" }, level: "1", textAlign: "right", fontSize: "theme-xl" } },
                    { type: "ContentParagraph", props: { text: "٠ ل.س", valueContext: { path: "pricing.displayPrice" }, textAlign: "right", fontSize: "theme-lg", color: "theme-primary" } },
                    { type: "ContentButton", props: { label: "إضافة إلى السلة", align: "center", destinationType: "action", buttonAction: "addToCart", buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
                  ],
                },
              }],
            },
          }],
        },
        {
          path: "/cart", slug: "/cart", name: "السلة", link: "/cart", title: "سلة التسوق", iconName: "ShoppingCart",
          content: [{
            type: "Section",
            props: {
              name: "سلة التسوق", paddingTop: "32px", paddingBottom: "32px", paddingHorizontal: "24px",
              maxWidth: "900px", columns: 1,
              metadata: { preset: "shopping-cart" },
              content: [
                { type: "ContentHeading", props: { text: "سلة التسوق", level: "2", textAlign: "right", fontSize: "theme-2xl" } },
                {
                  type: "Group",
                  props: {
                    cartLineId: "prod-001:{\"Color\":\"Red\"}", direction: "row", gap: 12,
                    alignItems: "center", language: "ar",
                    content: [
                      { type: "ContentImage", props: { src: "https://placehold.co/144x144", valueContext: { path: "images[0].url" }, maxWidth: "72px", radius: "theme-md" } },
                      { type: "ContentHeading", props: { text: "اسم المنتج", valueContext: { path: "product.title" }, level: "3", fontSize: "theme-md" } },
                      { type: "ContentParagraph", props: { text: "٠ ل.س", valueContext: { path: "pricing.displayLineTotal" }, fontSize: "theme-sm", color: "theme-neutral" } },
                      { type: "ContentButton", props: { label: "−", destinationType: "action", buttonAction: "cartQtyDecrease", buttonVariantMode: "fixed", buttonVariantSize: "sm" } },
                      { type: "ContentParagraph", props: { text: "1", valueContext: { path: "quantity" }, textAlign: "center", fontSize: "theme-md" } },
                      { type: "ContentButton", props: { label: "+", destinationType: "action", buttonAction: "cartQtyIncrease", buttonVariantMode: "fixed", buttonVariantSize: "sm" } },
                    ],
                  },
                },
                { type: "ContentButton", props: { label: "إتمام الطلب", align: "center", destinationType: "action", buttonAction: "makeOrder", submitRedirectUrl: "/", buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
              ],
            },
          }],
        },
      ],
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses Space and RowGroup — web-only layout blocks, not in the mobile block set.",
    label: "Blocks: buttons · images · divider · spacing · video",
    json: PK({
      root: {
        props: {
          title: "معرض البلوكات", direction: "rtl", language: "ar",
          primary: "#0b78c5", surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
          bodyFont: "cairo", radiusMd: "12px", radiusLg: "18px",
        },
      },
      zones: {},
      pages: [{
        path: "/showcase", slug: "/showcase", name: "معرض البلوكات", link: "/showcase", title: "معرض البلوكات",
        content: [{
          type: "Section",
          props: {
            name: "المحتوى", paddingTop: "40px", paddingBottom: "40px", paddingHorizontal: "24px",
            backgroundColor: "#ffffff", maxWidth: "1280px", columns: 1, columnsMobile: 1, gridGap: "24px",
            content: [
              { type: "ContentHeading", props: { text: "بلوكات المحتوى", level: "2", textAlign: "right", fontSize: "theme-xl", fontWeight: "theme-bold", color: "theme-text" } },

              // Image — single banner
              { type: "ContentImage", props: { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80", alt: "حذاء رياضي", align: "center", objectFit: "cover", radius: "theme-lg", maxWidth: "800px" } },

              // Spacing
              { type: "Space", props: { size: "theme-24" } },

              // Images — gallery grid
              {
                type: "ImageGallery",
                props: {
                  mode: "grid", gridColumns: 2, gridRows: 0, aspectRatio: "landscape",
                  objectFit: "cover", radius: "theme-md", gap: "theme-16",
                  images: [
                    { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80", alt: "ساعة" },
                    { src: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80", alt: "كاميرا" },
                  ],
                },
              },

              // Divider — theme colour
              { type: "ContentDivider", props: { thickness: "1px", colorMode: "theme", colorTheme: "neutral" } },

              // Buttons — variant mode and fixed mode, side by side
              {
                type: "RowGroup",
                props: {
                  gap: 12, alignItems: "center", justifyContent: "center", wrap: "wrap", padding: "0px",
                  content: [
                    { type: "ContentButton", props: { label: "تسوّق الآن", align: "center", destinationType: "link", link: { kind: "page", pageId: "/products" }, buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "lg" } },
                    { type: "ContentButton", props: { label: "تابعنا", align: "center", destinationType: "link", link: { kind: "url", url: "https://example.com", target: "_blank" }, buttonVariantMode: "fixed", bgColor: "theme-neutral", textColor: "theme-surface", buttonSize: "theme-md", radius: "theme-full" } },
                  ],
                },
              },

              { type: "Space", props: { size: "theme-40" } },

              // Divider — fixed colour
              { type: "ContentDivider", props: { thickness: "2px", colorMode: "fixed", colorFixed: "#0b78c5" } },

              // Video — YouTube embed
              { type: "ContentHeading", props: { text: "شاهد الفيديو التعريفي", level: "3", textAlign: "right", fontSize: "theme-lg" } },
              { type: "VideoEmbed", props: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", align: "center", size: "theme-480", radius: "theme-lg" } },
            ],
          },
        }],
      }],
    }),
  },
  {
    legacy: true,
    legacyReason: "Superseded by the /products page of the 3-page mobile example.",
    label: "Products Grid preset (bound card template)",
    json: PK({
      root: {
        props: {
          title: "متجري", direction: "rtl", language: "ar",
          primary: "#0b78c5", surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
          bodyFont: "cairo", radiusMd: "12px",
        },
      },
      zones: {},
      pages: [{
        path: "/products", slug: "/products", name: "المنتجات", link: "/products", title: "كل المنتجات",
        content: [
          {
            type: "Section",
            props: {
              name: "مقدمة", paddingTop: "32px", paddingBottom: "0px", paddingHorizontal: "24px",
              columns: 1, columnsMobile: 1,
              content: [
                { type: "ContentHeading", props: { text: "المنتجات المميزة", level: "2", textAlign: "right", fontSize: "theme-xl", color: "theme-text" } },
              ],
            },
          },
          {
            // Products Grid preset: `content` holds exactly ONE card-template Group with
            // `product: null`. The repeater clones it per product in the picked collection,
            // and children read live values through `valueContext` — no per-product blocks.
            type: "Section",
            props: {
              name: "Featured", paddingTop: "24px", paddingBottom: "48px", paddingHorizontal: "24px",
              maxWidth: "1280px", columns: 3, columnsMobile: 2, gridGap: "16px",
              metadata: { preset: "products-grid" },
              sectionKind: "products-grid",
              collection: { id: "coll_featured", name: "Featured", slug: "featured", productCount: 24 },
              content: [{
                type: "Group",
                props: {
                  product: null, metadata: null, skipProductDetailFetch: true,
                  direction: "column", gap: 10, alignItems: "stretch", justifyContent: "flex-start",
                  backgroundColor: "theme-surface", padding: "12px", borderRadius: "theme-md", boxShadow: "sm",
                  language: "ar",
                  content: [
                    { type: "ContentImage", props: { src: "https://placehold.co/400x400", valueContext: { path: "images[0].url" }, altValueContext: { path: "product.title" }, alt: "صورة المنتج", objectFit: "cover", radius: "theme-md" } },
                    { type: "ContentHeading", props: { text: "اسم المنتج", valueContext: { path: "product.title" }, level: "3", textAlign: "right", fontSize: "theme-md", fontWeight: "theme-semibold", color: "theme-text" } },
                    { type: "ContentParagraph", props: { text: "٠ ل.س", valueContext: { path: "pricing.displayPrice" }, textAlign: "right", fontSize: "theme-sm", color: "theme-primary" } },
                    { type: "ContentButton", props: { label: "إضافة إلى السلة", align: "center", destinationType: "action", buttonAction: "addToCart", buttonVariantMode: "variant", buttonVariant: "primary", buttonVariantSize: "sm" } },
                  ],
                },
              }],
            },
          },
        ],
      }],
    }),
  },
  {
    legacy: true,
    legacyReason: "Bare 1c page envelope with no blocks; kept only as an envelope smoke test.",
    label: "Page Shell (Envelope)",
    json: PK({
      path: "/profile",
      label: "User Profile",
      blocks: [],
      rootProps: {
        direction: "rtl", language: "ar", primary: "#0b78c5",
        surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
        bodyFont: "dm-sans",
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses legacy Text / Space / Button web block types.",
    label: "Section → container+column",
    json: PK({
      type: "Section",
      props: {
        backgroundColor: "#F9FAFB", paddingTop: "32px", paddingBottom: "32px",
        content: [
          { type: "Text", props: { text: "Hello World", size: "m", align: "center", color: "default" } },
          { type: "Space", props: { size: "24px", direction: "vertical" } },
          { type: "Button", props: { label: "Click Me", variant: "primary", href: "/products" } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses legacy Heading / Text / Button web block types.",
    label: "Heading + Text + Button",
    json: PK({
      type: "Section",
      props: {
        paddingTop: "48px", paddingBottom: "48px",
        content: [
          { type: "Heading", props: { text: "Our Products", level: "2", align: "center", size: "xl", colorMode: "theme", colorTheme: "text" } },
          { type: "Text", props: { text: "Browse our collection of premium items.", size: "m", align: "center", color: "muted" } },
          { type: "Button", props: { label: "Shop Now", labelAr: "تسوق الآن", variant: "primary", size: "lg", fullWidth: "on", href: "/products" } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses the legacy Button web block type.",
    label: "Flex Row + Button",
    json: PK({
      type: "Flex",
      props: {
        direction: "row", justifyContent: "center", alignItems: "center", gap: 16,
        items: [
          { type: "Button", props: { label: "Shop Now", variant: "primary", href: "/products" } },
          { type: "Button", props: { label: "Learn More", variant: "outline", href: "/about" } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Uses legacy Image / Icon / Video web block types.",
    label: "Image + Video + Icon",
    json: PK({
      type: "Section",
      props: {
        content: [
          { type: "Image", props: { src: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", alt: "Product", aspectRatio: "landscape", borderRadius: "md", objectFit: "cover" } },
          { type: "Icon", props: { name: "Star", size: "32", colorMode: "theme", colorTheme: "primary" } },
          { type: "Video", props: { src: "https://example.com/video.mp4", controls: "on", aspectRatio: "16:9" } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Hero is not in the mobile block set; compose Section + Group + ContentHeading instead.",
    label: "Hero Banner",
    json: PK({
      type: "Hero",
      props: {
        title: "Summer Sale",
        description: "Up to 50% off on selected items",
        align: "center",
        padding: "80px",
        buttons: [
          { label: "Shop Now", labelAr: "تسوق الآن", variant: "primary", href: "/products" },
          { label: "Learn More", variant: "outline", href: "/about" },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Card and Badge are not in the mobile block set; use a styled Group instead.",
    label: "Card + Badge + Divider",
    json: PK({
      type: "Section",
      props: {
        content: [
          {
            type: "Card",
            props: {
              title: "Product Name",
              description: "High-quality item with great features.",
              image: { url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", alt: "Product" },
              variant: "elevated",
            },
          },
          { type: "Divider", props: { orientation: "horizontal", thickness: "2px" } },
          { type: "Badge", props: { label: "-20%", variant: "discount", size: "md" } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Standalone ProductGrid is legacy; use the products-grid Section preset.",
    label: "Commerce: Product Grid",
    json: PK({
      type: "ProductGrid",
      props: { collection: "all", columns: "2", gap: 16, maxProducts: "6" },
    }),
  },
  {
    legacy: true,
    legacyReason: "ProductCard / ProductCarousel are legacy; use a bound Group inside a products-grid Section.",
    label: "Commerce: Product Card + Details",
    json: PK({
      type: "Section",
      props: {
        content: [
          {
            type: "ProductCard",
            props: {
              product: { id: "prod-001", title: "Classic Sneakers", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", price: 89.99 },
              variant: "vertical", showDescription: "on", showBadge: "on",
            },
          },
          {
            type: "ProductCarousel",
            props: { collection: "all", maxProducts: "8", variant: "vertical" },
          },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "TestimonialGrid is legacy; the mobile block set has Testimonials.",
    label: "Testimonial + Grid",
    json: PK({
      type: "Section",
      props: {
        content: [
          {
            type: "TestimonialGrid",
            props: { columns: "2", gap: 16, maxItems: "4", showAvatar: "on", showRating: "on" },
          },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Countdown / SearchModal / CookieConsent are not in the mobile block set.",
    label: "Utility: Countdown + Search + Cookie",
    json: PK({
      type: "Section",
      props: {
        content: [
          { type: "Countdown", props: { targetDate: "2026-12-31T23:59:59Z", title: "Offer Ends In", titleAr: "العرض ينتهي في", showDays: "on", showHours: "on", showMinutes: "on", showSeconds: "on" } },
          { type: "SearchModal", props: { placeholder: "Search products…", placeholderAr: "بحث عن منتجات…" } },
          { type: "CookieConsent", props: { message: "We use cookies to improve your experience.", messageAr: "نستخدم ملفات تعريف الارتباط لتحسين تجربتك." } },
        ],
      },
    }),
  },
  {
    legacy: true,
    legacyReason: "Built from Hero / Heading / Space / ProductGrid / TestimonialGrid / Card / SiteHeader / SiteFooter — all outside the mobile block set.",
    label: "Full Home Page (All Blocks)",
    json: PK({
      path: "/",
      label: "Home",
      rootProps: {
        direction: "rtl", language: "ar", primary: "#0b78c5",
        surface: "#f6f8fc", text: "#14243f", neutral: "#6b7d93",
        bodyFont: "dm-sans", headerBrandTitle: "SOOQ",
        headerBackgroundColor: "#FFFFFF", headerTextColor: "#0F172A",
        headerShowDrawerButton: "on",
      },
      blocks: [
        { type: "SiteHeader", props: { id: "header-1" } },
        {
          type: "Section", props: {
            backgroundColor: "#f0f4ff", paddingTop: "80px", paddingBottom: "80px",
            content: [
              {
                type: "Hero", props: {
                  title: "مرحباً بكم في متجرنا", description: "أفضل المنتجات بأفضل الأسعار",
                  align: "center", padding: "40px",
                  buttons: [{ label: "تسوق الآن", labelAr: "تسوق الآن", variant: "primary", href: "/products" }],
                },
              },
            ],
          },
        },
        {
          type: "Section", props: {
            paddingTop: "64px", paddingBottom: "64px",
            content: [
              { type: "Heading", props: { text: "منتجاتنا المميزة", level: "2", align: "center", size: "xl", colorMode: "theme", colorTheme: "text" } },
              { type: "Space", props: { size: "32px", direction: "vertical" } },
              { type: "ProductGrid", props: { columns: "2", gap: 16, maxProducts: "4" } },
            ],
          },
        },
        {
          type: "Section", props: {
            backgroundColor: "#f9fafb", paddingTop: "64px", paddingBottom: "64px",
            content: [
              { type: "Heading", props: { text: "ماذا يقول عملاؤنا", level: "2", align: "center", size: "lg" } },
              { type: "Space", props: { size: "24px", direction: "vertical" } },
              { type: "TestimonialGrid", props: { columns: "2", gap: 16, maxItems: "2", showAvatar: "on", showRating: "on" } },
            ],
          },
        },
        {
          type: "Section", props: {
            paddingTop: "48px", paddingBottom: "48px",
            content: [
              { type: "Card", props: { title: "توصيل مجاني", description: "لجميع الطلبات فوق 100 دولار", variant: "elevated" } },
            ],
          },
        },
        { type: "SiteFooter", props: { id: "footer-1" } },
      ],
    }),
  },
];
