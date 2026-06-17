// Documentation data structure based on the Erteqa Block Documentation

export interface NavItem {
  id: string;
  label: string;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    id: "pages-structure",
    label: "1. Pages Structure",
  },
  {
    id: "system-settings",
    label: "2. System Settings",
    children: [
      { id: "locale", label: "2.1 Locale" },
      { id: "page-metadata", label: "2.2 Page Metadata" },
      { id: "fonts", label: "2.3 Fonts" },
      { id: "colors", label: "2.4 Colors" },
      { id: "badge", label: "2.5 Badge" },
      { id: "shell", label: "2.6 Shell" },
      { id: "breakpoints", label: "2.7 Breakpoints" },
      { id: "typography-scales", label: "2.8 Typography Scales" },
      { id: "shell-header", label: "2.9 Shell: Header" },
      { id: "shell-footer", label: "2.10 Shell: Footer" },
      { id: "shell-drawer", label: "2.11 Shell: Site Drawer" },
    ],
  },
  {
    id: "theme-design-tokens",
    label: "3. Theme & Design Tokens",
    children: [
      { id: "css-variable-architecture", label: "3.1 CSS Variable Architecture" },
      { id: "font-options", label: "3.2 Font Options" },
      { id: "component-font-options", label: "3.3 Component Font Options" },
      { id: "shared-spacing", label: "3.4 Shared Spacing" },
      { id: "theme-presets", label: "3.5 Theme Presets" },
    ],
  },
  {
    id: "layout-system",
    label: "4. Layout System",
    children: [
      { id: "grid-spanning", label: "4.1 Grid Spanning" },
      { id: "spacing", label: "4.2 Spacing" },
      { id: "float-positioning", label: "4.3 Float / Positioning" },
      { id: "border", label: "4.4 Border" },
      { id: "box-shadow", label: "4.5 Box Shadow" },
      { id: "display-visibility", label: "4.6 Display & Visibility" },
      { id: "layout-puck", label: "4.7 Layout in Puck" },
    ],
  },
  {
    id: "blocks",
    label: "5. Blocks",
    children: [
      { id: "layout-blocks", label: "5.1 Layout Blocks" },
      { id: "content-blocks", label: "5.2 Content Blocks" },
      { id: "commerce-blocks", label: "5.3 Commerce Blocks" },
      { id: "testimonial-blocks", label: "5.4 Testimonial Blocks" },
      { id: "shell-blocks", label: "5.5 Shell Blocks" },
      { id: "utility-blocks", label: "5.6 Utility Blocks" },
    ],
  },
  {
    id: "shared-fields",
    label: "6. Shared Fields",
    children: [
      { id: "typography-fields", label: "6.1 Typography" },
      { id: "color-fields", label: "6.2 Color" },
      { id: "button-action", label: "6.3 Button Action" },
      { id: "link-object", label: "6.4 Link Object" },
      { id: "youtube-normalizer", label: "6.5 YouTube URL Normalizer" },
    ],
  },
  {
    id: "data-fixtures",
    label: "7. Data Fixtures",
    children: [
      { id: "products", label: "7.1 Products" },
      { id: "cart", label: "7.2 Cart" },
      { id: "checkout", label: "7.3 Checkout" },
      { id: "orders", label: "7.4 Orders" },
      { id: "testimonials", label: "7.5 Testimonials" },
    ],
  },
  {
    id: "json-examples",
    label: "8. JSON Examples",
    children: [
      { id: "page-structure", label: "8.1 Page Structure" },
      { id: "section-nested", label: "8.2 Section with Nested Children" },
      { id: "group-nested", label: "8.3 Group Nested Blocks" },
      { id: "hero-block", label: "8.4 Hero Block" },
      { id: "grid-block", label: "8.5 Grid Block" },
      { id: "flex-block", label: "8.6 Flex Block" },
      { id: "layout-float", label: "8.7 Layout with Float" },
      { id: "countdown-block", label: "8.8 Countdown Block" },
      { id: "youtube-block", label: "8.9 YouTube Block" },
      { id: "video-block", label: "8.10 Video Block" },
    ],
  },
];

export interface TableColumn {
  key: string;
  header: string;
}

export interface PropTableData {
  columns: TableColumn[];
  rows: Record<string, string>[];
}

export interface BlockInfo {
  name: string;
  description?: string;
  props: PropTableData;
  slotInfo?: string;
}
