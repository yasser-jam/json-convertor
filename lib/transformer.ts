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

/** Maps BLOCKS.md Puck type names to internal converter type names. */
const WEB_TYPE_ALIASES: Record<string, string> = {
  ContentImage: "Image",
  ContentParagraph: "Text",
  ContentHeading: "Heading",
  ContentButton: "Button",
  ContentDivider: "Divider",
  ContentIcon: "Icon",
  ContentHtml: "Html",
  VideoEmbed: "YouTube",
  ProductsGrid: "ProductGrid",
  OrderHistory: "OrderList",
};

const UNSUPPORTED_LEAF_BLOCKS = new Set([
  "CategoryListMenu",
  "ProductSearchMenu",
  "SideDrawer",
]);

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
};

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
      surface: (rootProps.surface as string) || "#f6f8fc",
      success: (rootProps.success as string) || "#0f9d73",
      warning: (rootProps.warning as string) || "#c77a15",
      error: (rootProps.error as string) || "#c24133",
      dark: (rootProps.dark as string) || "#10213a",
      text: (rootProps.text as string) || "#14243f",
      neutral: (rootProps.neutral as string) || "#6b7d93",
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

  if (themeKey === "full") return 9999;
  const radiusPropMap: Record<string, string> = {
    sm: "radiusSm", md: "radiusMd", lg: "radiusLg", xl: "radiusXl",
  };
  if (radiusPropMap[themeKey]) {
    return parsePx(rootProps[radiusPropMap[themeKey]] as string, fallback);
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
    "theme-semibold": "bold",
    "theme-bold": "bold",
    light: "normal",
    normal: "normal",
    semibold: "bold",
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

function normalizeAdminApiUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    const path = url.pathname.replace(/^\/admin\//, "/public/");
    return path + url.search;
  } catch {
    return apiUrl.replace(/https?:\/\/[^/]+\/admin\//, "/api/v1/public/");
  }
}

const FONT_WEIGHT_MAP: Record<string, string> = {
  normal: "normal", medium: "medium", semibold: "bold", bold: "bold",
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
  const action = (props.buttonAction as string) || "link";

  if (action === "link") {
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

  switch (action) {
    case "login":
      return { type: "navigate", route: "/auth/login", navigation_type: "push" };
    case "logout":
      return {
        type: "cubitCall", cubit: "auth", method: "logout",
        onSuccess: { type: "navigate", route: "/auth/login", navigation_type: "go" },
      };
    case "addToCart":
      return { type: "cubitCall", cubit: "cart", method: "addItem" };
    case "addToWishlist":
      return { type: "navigate", route: "/wishlist", navigation_type: "push" };
    default:
      return undefined;
  }
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
    if (margin.top) stacked.props = { ...(stacked.props as Record<string, unknown>), stackTop: margin.top };
    if (margin.right) stacked.props = { ...(stacked.props as Record<string, unknown>), stackRight: margin.right };

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
      textAlign: (props.align as string) || (dir === "rtl" ? "right" : "left"),
    },
  };

  const fontWeight = resolveThemeFontWeight(props.fontWeight as string);
  if (fontWeight) (node.props as Record<string, unknown>).fontWeight = fontWeight;

  const textColor = resolveThemeColor(props.color as string, rootProps)
    || resolveTextColor(props.color as string);
  if (textColor) (node.props as Record<string, unknown>).color = textColor;

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
  const fontSize = resolveFontSize(props.size as string, sizeMap[levelNum] || 22);

  const node: Record<string, unknown> = {
    id: generateId("heading"),
    type: "text",
    props: {
      value: resolveBilingual(props.text as string, props.textAr as string, lang),
      fontSize,
      fontWeight: levelNum <= 2 ? "bold" : "w600",
      textAlign: (props.align as string) || (props.textAlign as string) || (dir === "rtl" ? "right" : "left"),
    },
  };

  const color = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps);
  if (color) (node.props as Record<string, unknown>).color = color;

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

function transformButton(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const label = resolveBilingual(props.label as string, props.labelAr as string, lang);
  const size = (props.size as string) || "md";
  const fullWidth = (props.fullWidth as string) === "on";

  const outProps: Record<string, unknown> = {
    label,
    height: BUTTON_SIZE_HEIGHT[size] || 48,
    variant: resolveButtonVariant((props.variant as string) || (props.buttonVariant as string)),
  };

  const btnColor = resolveColor(props.colorMode as string, props.colorTheme as string, props.colorFixed as string, rootProps);
  if (btnColor) outProps.color = btnColor;
  if (fullWidth) outProps.fullWidth = true;

  const tap = resolveTap(props, rootProps);

  const node: Record<string, unknown> = {
    id: generateId("button"),
    type: "button",
    props: outProps,
  };
  if (tap) node.tap = tap;

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformLink(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const lang = (rootProps.language as string) || "ar";
  const label = resolveBilingual(props.label as string, props.labelAr as string, lang);

  const outProps: Record<string, unknown> = { label, variant: "ghost", height: 36 };
  const tap = resolveLayoutTap(props, rootProps);

  const node: Record<string, unknown> = { id: generateId("link"), type: "button", props: outProps };
  if (tap) node.tap = tap;

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
    alt: (props.alt as string) || "",
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

  const node: Record<string, unknown> = { id: generateId("image"), type: "image", props: outProps };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

function transformVideo(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const aspect = resolveAspectRatio(props.aspectRatio as string);

  const outProps: Record<string, unknown> = {
    url: (props.src as string) || "",
    controls: (props.controls as string) !== "off",
    autoPlay: (props.autoPlay as string) === "on",
    loop: (props.loop as string) === "on",
    muted: (props.muted as string) === "on",
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

  const w = props.width as string;
  if (w && w !== "100%") (node.props as Record<string, unknown>).width = parsePx(w);

  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
}

// ─── Layout Block Transformers ──────────────────────────────────────────────

function transformSection(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  const props = (block.props || {}) as Record<string, unknown>;
  if (props.visible === false) return null;

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

  const transformedChildren = children.map((c: Record<string, unknown>) => transformBlock(c, rootProps)).filter(Boolean) as Record<string, unknown>[];

  let contentWrapper: Record<string, unknown>;
  if (columnsMobile > 1) {
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
    spaceBetween: "spaceBetween", "space-around": "spaceAround", stretch: "stretch",
    baseline: "baseline",
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

function transformGroup(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  return transformFlex(block, rootProps);
}

function transformLayoutGrid(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const items = getChildren(block);
  const numCols = parseInt((props.numColumns as string) || "2", 10);
  const gap = parsePx(props.gap as string | number, 16);

  const converted = items.map((c: Record<string, unknown>) => transformBlock(c, rootProps));

  // Distribute items into rows of numCols
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < converted.length; i += numCols) {
    const rowItems = converted.slice(i, i + numCols).map((item) => ({
      id: generateId("grid-cell"),
      type: "container",
      props: { expand: true, expandAxis: "horizontal" },
      child: item,
    }));
    rows.push({
      id: generateId("grid-row"),
      type: "row",
      props: { mainAxisAlignment: "spaceBetween", crossAxisAlignment: "stretch", gap },
      children: rowItems,
    });
  }

  const node: Record<string, unknown> = {
    id: generateId("grid-wrapper"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap },
    children: rows,
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
      urlPath: "item.image",
      source: "network",
      fit: "cover",
      borderRadius: "md",
      height: imageHeight,
      ...(isHorizontal ? { width: 120 } : {}),
    },
  };

  const textNodes = [
    { id: generateId("pt-name"), type: "text", props: { valuePath: "item.name", fontSize: cardVariant === "compact" ? 12 : 14, fontWeight: "bold" } },
    { id: generateId("pt-price"), type: "text", props: { valuePath: "item.price", fontSize: cardVariant === "compact" ? 12 : 14, color: "#0b78c5" } },
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
    const normalized = normalizeAdminApiUrl(metadata.apiUrl as string);
    requestUrl = normalized.startsWith("/") ? normalized : `/api/v1/public${normalized}`;
  }

  return {
    id: generateId("products-grid"),
    type: "gridView",
    props: {
      crossAxisCount: columns,
      mainAxisSpacing: gap,
      crossAxisSpacing: gap,
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

function transformCartSection(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const children: Record<string, unknown>[] = [];

  children.push({
    id: generateId("cart-title"),
    type: "text",
    props: { value: "سلة التسوق", fontSize: 22, fontWeight: "bold" },
  });

  children.push({
    id: generateId("cart-items"),
    type: "listView",
    props: {
      data: { source: "collection", id: "cart-items", requestKey: "cart-list", requestUrl: "/api/v1/customer/cart" },
    },
    itemBuilder: {
      type: "repeat",
      source: "cart.items",
      item: {
        id: generateId("cart-line"),
        type: "card",
        props: { elevation: 1, borderRadius: 8 },
        child: {
          id: generateId("cl-row"),
          type: "row",
          props: { crossAxisAlignment: "center", mainAxisAlignment: "spaceBetween", gap: 12 },
          children: [
            { id: generateId("cl-image"), type: "image", props: { urlPath: "item.image", source: "network", fit: "cover", width: 60, height: 60, borderRadius: "sm" } },
            { id: generateId("cl-name"), type: "text", props: { valuePath: "item.name", fontSize: 14 } },
            { id: generateId("cl-qty"), type: "text", props: { valuePath: "item.quantity", fontSize: 14 } },
            { id: generateId("cl-price"), type: "text", props: { valuePath: "item.price", fontSize: 14, color: "#0b78c5" } },
          ],
        },
      },
    },
  });

  const node: Record<string, unknown> = {
    id: generateId("cart-section"),
    type: "column",
    props: { crossAxisAlignment: "stretch", mainAxisAlignment: "start", gap: 16 },
    children,
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
  const fields = (props.fields as Record<string, unknown>[]) || [
    { name: "name", label: "الاسم الكامل", hint: "أدخل اسمك" },
    { name: "phone", label: "رقم الهاتف", hint: "09XXXXXXXX" },
    { name: "address", label: "العنوان", hint: "المدينة، الشارع" },
  ];
  const submissionAction = props.submissionAction as Record<string, unknown> | undefined;

  const fieldNodes = fields.map((field) => ({
    id: generateId("cf-field"),
    type: "textFormField",
    props: {
      label: (field.label as string) || "",
      hint: (field.placeholder as string) || "",
      name: (field.name as string) || "",
      textDirection: (field.type as string) === "email" || (field.name as string) === "phone" ? "ltr" : "rtl",
      ...((field.required as boolean) ? { validator: "required" } : {}),
    },
  }));

  const node: Record<string, unknown> = {
    id: generateId("checkout-form"),
    type: "form",
    props: { id: "checkout-address-form" },
    child: {
      id: generateId("cf-fields"),
      type: "column",
      props: flexProps("start", "stretch", { gap: 16 }),
      children: [
        ...fieldNodes,
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
  return applyLayout(node, (_block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
}

function transformOrderList(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const maxOrders = parseInt(((block.props as Record<string, unknown>).maxOrders as string) || "5", 10);
  return {
    id: generateId("order-list"),
    type: "listView",
    props: {
      data: {
        source: "collection",
        id: "my-orders",
        requestKey: "my-orders",
        requestUrl: "/api/v1/customer/orders",
        size: maxOrders,
      },
    },
    itemBuilder: {
      type: "repeat",
      source: "dataContext.requests.my-orders.data",
      item: {
        id: generateId("order-item"),
        type: "card",
        props: { elevation: 1, borderRadius: 8 },
        child: {
          id: generateId("oi-body"),
          type: "row",
          props: { crossAxisAlignment: "center", mainAxisAlignment: "spaceBetween", gap: 12 },
          children: [
            { id: generateId("oi-number"), type: "text", props: { valuePath: "item.orderNumber", fontSize: 14, fontWeight: "bold" } },
            { id: generateId("oi-status"), type: "text", props: { valuePath: "item.status", fontSize: 12 } },
            { id: generateId("oi-total"), type: "text", props: { valuePath: "item.total", fontSize: 14, color: "#0b78c5" } },
          ],
        },
        tap: { type: "navigate", route: "/orders/:orderId", navigation_type: "push" },
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
  return applyLayout(node, (_block.props as Record<string, unknown>).layout as Record<string, unknown> | undefined, rootProps);
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
      props: { value: props.heading as string, fontSize: 22, fontWeight: "bold" },
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

function transformBlank(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
  const node: Record<string, unknown> = {
    id: generateId("blank"),
    type: "text",
    props: { value: (props.message as string) || "Placeholder", fontSize: 14, color: "#6b7d93" },
  };
  return applyLayout(node, props.layout as Record<string, unknown> | undefined, rootProps);
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
  const columns = parseInt(String(props.columns || 3), 10);
  const gap = resolveGridGap(props.gap as string);
  const lang = (rootProps.language as string) || "ar";
  const requestKey = "wishlist";

  const itemTemplate = buildProductGridItemTemplate("vertical");
  if (props.showAddToCart !== false) {
    const cardChild = itemTemplate.child as Record<string, unknown>;
    const col = cardChild.children as Record<string, unknown>[];
    col.push({
      id: generateId("wl-add-cart"),
      type: "button",
      props: { label: (props.ctaLabel as string) || (lang === "ar" ? "أضف للسلة" : "Add to cart"), height: 40, variant: "elevated" },
      tap: { type: "cubitCall", cubit: "cart", method: "addItem" },
    });
  }

  return applyLayout(
    {
      id: generateId("wishlist"),
      type: "gridView",
      props: {
        crossAxisCount: columns,
        mainAxisSpacing: gap,
        crossAxisSpacing: gap,
        enableInnerScroll: false,
        data: {
          source: "collection",
          id: "wishlist-grid",
          requestKey,
          requestUrl: "/api/v1/customer/wishlist",
        },
      },
      itemBuilder: {
        type: "repeat",
        source: `dataContext.requests.${requestKey}.data`,
        item: itemTemplate,
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
  const lang = (rootProps.language as string) || "ar";
  const formId = (props.id as string) || "contact-form";
  const fields = (props.fields as Record<string, unknown>[]) || [
    { name: "name", label: lang === "ar" ? "الاسم" : "Name" },
    { name: "email", label: lang === "ar" ? "البريد الإلكتروني" : "Email" },
    { name: "message", label: lang === "ar" ? "الرسالة" : "Message" },
  ];

  const fieldNodes = fields.map((field) => ({
    id: generateId("contact-field"),
    type: "textFormField",
    props: {
      label: (field.label as string) || "",
      hint: (field.placeholder as string) || "",
      name: (field.name as string) || "",
      textDirection: (field.name as string) === "email" ? "ltr" : ((rootProps.direction as string) === "rtl" ? "rtl" : "ltr"),
    },
  }));

  const node: Record<string, unknown> = {
    id: generateId("contact-form"),
    type: "form",
    props: { id: formId },
    child: {
      id: generateId("contact-col"),
      type: "column",
      props: flexProps("start", "stretch", { gap: 16 }),
      children: [
        ...fieldNodes,
        {
          id: generateId("contact-submit"),
          type: "button",
          props: {
            label: resolveBilingual(props.submitLabel as string, props.submitLabelAr as string, lang) || (lang === "ar" ? "إرسال" : "Submit"),
            height: 48,
            variant: "elevated",
            fullWidth: true,
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

function transformSidebar(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> {
  const props = (block.props || {}) as Record<string, unknown>;
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

// ─── Block Dispatcher ───────────────────────────────────────────────────────

function transformBlock(block: Record<string, unknown>, rootProps: Record<string, unknown>): Record<string, unknown> | null {
  if (!block || typeof block !== "object") return null;

  const rawType = (block.type as string) || "";
  const type = normalizeBlockType(rawType);

  switch (type) {
    // Layout blocks
    case "Section": return transformSection(block, rootProps);
    case "Flex": return transformFlex(block, rootProps);
    case "Grid": return transformLayoutGrid(block, rootProps);
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
    case "Link": return transformLink(block, rootProps);
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
    case "ProductDetails": return transformProductDetails(block, rootProps);
    case "CartSection": return transformCartSection(block, rootProps);
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

    // Logo
    case "Logo": return transformLogo(block, rootProps);

    // Shell blocks handled at page level — return null to skip
    case "SiteHeader":
    case "SiteFooter":
    case "SiteDrawerShell":
      return null;

    default: {
      if (UNSUPPORTED_LEAF_BLOCKS.has(type)) {
        addWarning(`Block type "${rawType}" has no mobile equivalent; skipped`);
        return null;
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
  const excludeRoutes = [
    "/splash", "/splash-carousel", "/auth/login", "/auth/otp-reset",
    "/product/details", "/categories", "/checkout", "/checkout/address",
    "/checkout/payment", "/checkout/success", "/orders",
  ];

  const tabs = [
    { id: "tab-home", label: "الرئيسية", icon: "home", route: "/home" },
    { id: "tab-categories", label: "الأقسام", icon: "grid_view", route: "/categories" },
    { id: "tab-search", label: "بحث", icon: "search", route: "/search" },
    { id: "tab-cart", label: "السلة", icon: "shopping_cart", route: "/cart" },
    { id: "tab-profile", label: "حسابي", icon: "person", route: "/profile" },
  ];

  return {
    type: "tabs",
    initialRoute: "/splash",
    shellExcludeRoutes: excludeRoutes,
    tabs,
  };
}

// ─── Page Assembly ──────────────────────────────────────────────────────────

function transformPage(page: Record<string, unknown>): Record<string, unknown> {
  const path = normalizeRoute((page.path as string) || "/");
  const label = (page.label as string) || (page.title as string) || "Page";
  const blocks = Array.isArray(page.blocks) ? (page.blocks as Record<string, unknown>[]) : [];
  const rootProps = (page.rootProps as Record<string, unknown>) || {};
  const slugPart = path.replace(/^\//, "").replace(/\//g, "-") || "home";
  const dir = (rootProps.direction as string) || "rtl";

  // Separate shell blocks from body blocks
  const bodyBlocks: Record<string, unknown>[] = [];
  let hasHeader = false;
  let hasFooter = false;

  for (const block of blocks) {
    const type = block.type as string;
    if (type === "SiteHeader") { hasHeader = true; continue; }
    if (type === "SiteFooter") { hasFooter = true; continue; }
    bodyBlocks.push(block);
  }

  // Convert body blocks
  const body = bodyBlocks.map((b) => transformBlock(b, rootProps)).filter(Boolean) as Record<string, unknown>[];

  // Build appBar from SiteHeader / root props
  const headerTitle = (rootProps.headerBrandTitle as string) || label;
  const headerBg = (rootProps.headerBackgroundColor as string) || "#FFFFFF";
  const headerFg = (rootProps.headerTextColor as string) || "#0F172A";
  const showDrawer = (rootProps.headerShowDrawerButton as string) === "on" || rootProps.headerShowDrawerButton === true;

  const appBar: Record<string, unknown> = {
    id: `${slugPart}-app-bar`,
    type: "appBar",
    props: {
      title: headerTitle || label,
      showBackButton: path !== "/home",
      backgroundColor: headerBg,
      foregroundColor: headerFg,
      elevation: 0,
    },
  };
  if (showDrawer) {
    (appBar.props as Record<string, unknown>).actions = [
      { type: "icon", name: "menu", tap: { type: "openDrawer" } },
    ];
  }

  // Build footer if SiteHeader was present (footer is optional)
  const footerNode = hasFooter ? buildFooter(rootProps) : null;
  if (footerNode) body.push(footerNode);

  return {
    id: `page-${slugPart}`,
    route: path,
    title: label,
    background: (page.background as string) || "#FFFFFF",
    scroll: (page.scroll as string) || "vertical",
    appBar,
    body,
  };
}

function buildFooter(rootProps: Record<string, unknown>): Record<string, unknown> | null {
  if ((rootProps.footerVisible as string) === "false" || rootProps.footerVisible === false) return null;

  const lang = (rootProps.language as string) || "ar";
  const tagline = resolveBilingual(rootProps.footerTagline as string, rootProps.footerTaglineAr as string, lang);
  const bg = (rootProps.footerBackgroundColor as string) || "#10213a";
  const fg = (rootProps.footerTextColor as string) || "#ffffff";
  const columns = (rootProps.footerColumns as Record<string, unknown>[]) || [];

  const children: Record<string, unknown>[] = [];

  if (tagline) {
    children.push({
      id: generateId("footer-tagline"),
      type: "text",
      props: { value: tagline, fontSize: 14, color: fg },
    });
  }

  for (const col of columns) {
    const title = resolveBilingual(col.title as string, (col as Record<string, unknown>).titleAr as string, lang);
    const links = (col.links as Record<string, unknown>[]) || [];
    const linkNodes = links.map((link) => ({
      id: generateId("footer-link"),
      type: "button",
      props: { label: resolveBilingual(link.label as string, (link as Record<string, unknown>).labelAr as string, lang), height: 32, variant: "text" },
      tap: { type: "navigate", route: normalizeRoute((link.href as string) || "/"), navigation_type: "push" },
    }));

    if (title) {
      children.push({
        id: generateId("footer-col"),
        type: "column",
        props: { crossAxisAlignment: "start", mainAxisAlignment: "start", gap: 4 },
        children: [
          { id: generateId("footer-col-title"), type: "text", props: { value: title, fontSize: 14, fontWeight: "bold", color: fg } },
          ...linkNodes,
        ],
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
        const output = {
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
        return successResult(output);
      }

      const rootProps = {};
      const output = (parsed as Record<string, unknown>[]).map((b) => transformBlock(b, rootProps)).filter(Boolean);
      return successResult(output);
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj.path === "string" || typeof obj.blocks !== "undefined") {
      const rootProps = (obj.rootProps as Record<string, unknown>) || {};
      const page = transformPage(obj);
      const output = {
        schemaVersion: "1.0",
        app: {
          name: "SOOQ Merchant Mobile",
          bundleId: "com.sooq.merchant.mobile",
          apiBaseUrl: "https://sooq.up.railway.app",
          tenantId: "00000000-0000-0000-0000-000000000000",
          tenantSlug: "example-merchant",
        },
        theme: transformTheme(rootProps),
        navigation: transformNavigation(rootProps, []),
        pages: [page],
      };
      return successResult(output);
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

export const EXAMPLE_PRESETS: { label: string; json: string }[] = [
  {
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
    label: "Commerce: Product Grid",
    json: PK({
      type: "ProductGrid",
      props: { collection: "all", columns: "2", gap: 16, maxProducts: "6" },
    }),
  },
  {
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
