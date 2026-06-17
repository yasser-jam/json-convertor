"use client";

import { PropTable } from "./prop-table";
import { CodeBlock } from "./code-block";
import { CollapsibleSection } from "./collapsible-section";

interface DocsContentProps {
  activeSection: string;
}

export function DocsContent({ activeSection }: DocsContentProps) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Erteqa Block & Component Documentation
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            This document is the single source of truth for the Erteqa (SOOQ) visual editor. 
            It covers pages, system settings, all blocks with their props and field types, the layout system, 
            shared field helpers, data fixtures, and theme presets.
          </p>
        </div>

        {/* 1. Pages Structure */}
        <section id="pages-structure" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            1. Pages Structure
          </h2>
          <p className="text-muted-foreground mb-4">
            Defined in <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/pages.ts</code>. 
            Pages are registered in a typed array:
          </p>
          <PropTable
            columns={[
              { key: "path", header: "Path" },
              { key: "label", header: "Label" },
              { key: "icon", header: "Icon" },
              { key: "dynamic", header: "Dynamic" },
              { key: "description", header: "Description" },
            ]}
            rows={[
              { path: "/", label: "Home", icon: "Home", dynamic: "No", description: "Main landing page" },
              { path: "/themes", label: "Theme gallery", icon: "Palette", dynamic: "No", description: "Browse and edit theme presets" },
              { path: "/products/:product-slug", label: "Product Details", icon: "Package", dynamic: "Yes", description: "Individual product page" },
              { path: "/cart", label: "Cart", icon: "ShoppingCart", dynamic: "No", description: "Shopping cart & checkout" },
            ]}
          />
          <div className="bg-muted/30 rounded-lg p-4 mt-4 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Custom pages</strong> are stored in <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">localStorage</code> under key <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">puck-demo-custom-pages:v1</code>. 
              Merchants can create additional pages at runtime. Dynamic pages use <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">examplePath</code> for editing.
            </p>
          </div>
        </section>

        {/* 2. System Settings */}
        <section id="system-settings" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            2. System Settings (Root Config)
          </h2>
          <p className="text-muted-foreground mb-6">
            File: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/root.tsx</code>. 
            These are site-wide props available in the Settings panel.
          </p>

          {/* 2.1 Locale */}
          <CollapsibleSection title="2.1 Locale (direction/language/currency)" id="locale">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "direction", type: '"rtl" | "ltr"', default: '"rtl"', options: "—" },
                { prop: "language", type: '"ar" | "en"', default: '"ar"', options: "—" },
                { prop: "currency", type: '"SYP" | "USD" | "EUR"', default: '"SYP"', options: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.2 Page Metadata */}
          <CollapsibleSection title="2.2 Page Metadata" id="page-metadata">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
              ]}
              rows={[
                { prop: "title", type: "string", default: '"SOOQ — متجر"' },
                { prop: "enableHtmlRichTextBlock", type: "boolean", default: "false" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.3 Fonts */}
          <CollapsibleSection title="2.3 Fonts (Theme)" id="fonts">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "bodyFont", type: "string", default: '"dm-sans"', options: "All FONT_OPTIONS values" },
                { prop: "fontOption1", type: "string", default: '"space-grotesk"', options: "All font option values" },
                { prop: "fontOption2", type: "string", default: '"fraunces"', options: "All font option values" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.4 Colors */}
          <CollapsibleSection title="2.4 Colors" id="colors">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { prop: "primary", type: "string (hex)", default: "#0b78c5", description: "Brand / action color" },
                { prop: "surface", type: "string (hex)", default: "#f6f8fc", description: "Card & panel backgrounds" },
                { prop: "success", type: "string (hex)", default: "#0f9d73", description: "Positive feedback" },
                { prop: "warning", type: "string (hex)", default: "#c77a15", description: "Caution / alerts" },
                { prop: "error", type: "string (hex)", default: "#c24133", description: "Destructive / danger" },
                { prop: "dark", type: "string (hex)", default: "#10213a", description: "Dark backgrounds" },
                { prop: "text", type: "string (hex)", default: "#14243f", description: "Default body text" },
                { prop: "neutral", type: "string (hex)", default: "#6b7d93", description: "Borders, dividers, muted" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.5 Badge */}
          <CollapsibleSection title="2.5 Badge (shared component)" id="badge">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "badgeShape", type: '"pill" | "rounded" | "square"', default: '"rounded"', options: "—" },
                { prop: "badgeStyle", type: '"solid" | "outline" | "soft"', default: '"solid"', options: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.6 Shell */}
          <CollapsibleSection title="2.6 Shell (header/footer variant)" id="shell">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "headerVariant", type: '"default" | "commerce"', default: '"commerce"', options: "—" },
                { prop: "footerVariant", type: '"default" | "commerce"', default: '"commerce"', options: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.7 Breakpoints */}
          <CollapsibleSection title="2.7 Breakpoints (responsive visibility)" id="breakpoints">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { prop: "breakpointMobileMax", type: "number (px)", default: "767", description: 'Inclusive max for "mobile"' },
                { prop: "breakpointTabletMax", type: "number (px)", default: "1023", description: 'Inclusive max for "tablet"' },
              ]}
            />
          </CollapsibleSection>

          {/* 2.8 Typography Scales */}
          <CollapsibleSection title="2.8 Typography Scales" id="typography-scales">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
              ]}
              rows={[
                { prop: "textSizeXs", type: "string", default: '"0.75rem"' },
                { prop: "textSizeSm", type: "string", default: '"0.875rem"' },
                { prop: "textSizeMd", type: "string", default: '"1rem"' },
                { prop: "textSizeLg", type: "string", default: '"1.1875rem"' },
                { prop: "textSizeXl", type: "string", default: '"1.375rem"' },
                { prop: "textSize2xl", type: "string", default: '"1.75rem"' },
                { prop: "radiusNone", type: "string", default: '"0"' },
                { prop: "radiusSm", type: "string", default: '"8px"' },
                { prop: "radiusMd", type: "string", default: '"12px"' },
                { prop: "radiusLg", type: "string", default: '"18px"' },
                { prop: "radiusXl", type: "string", default: '"24px"' },
                { prop: "radiusFull", type: "string", default: '"9999px"' },
                { prop: "buttonSmHeight", type: "string", default: '"34px"' },
                { prop: "buttonSmPaddingX", type: "string", default: '"14px"' },
                { prop: "buttonSmPaddingY", type: "string", default: '"6px"' },
                { prop: "buttonSmFontSize", type: "string", default: '"0.875rem"' },
                { prop: "buttonMdHeight", type: "string", default: '"44px"' },
                { prop: "buttonMdPaddingX", type: "string", default: '"18px"' },
                { prop: "buttonMdPaddingY", type: "string", default: '"9px"' },
                { prop: "buttonMdFontSize", type: "string", default: '"1rem"' },
                { prop: "buttonLgHeight", type: "string", default: '"54px"' },
                { prop: "buttonLgPaddingX", type: "string", default: '"26px"' },
                { prop: "buttonLgPaddingY", type: "string", default: '"12px"' },
                { prop: "buttonLgFontSize", type: "string", default: '"1.0625rem"' },
                { prop: "fontWeightNormal", type: "string", default: '"400"' },
                { prop: "fontWeightMedium", type: "string", default: '"520"' },
                { prop: "fontWeightSemibold", type: "string", default: '"620"' },
                { prop: "fontWeightBold", type: "string", default: '"740"' },
                { prop: "lineHeightTight", type: "string", default: '"1.22"' },
                { prop: "lineHeightNormal", type: "string", default: '"1.58"' },
                { prop: "lineHeightRelaxed", type: "string", default: '"1.78"' },
              ]}
            />
          </CollapsibleSection>

          {/* 2.9 Shell: Header */}
          <CollapsibleSection title="2.9 Shell: Header" id="shell-header">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { prop: "headerVisible", type: "boolean", default: "true", description: "Show/hide site-wide header" },
                { prop: "headerBrandHref", type: "string", default: '"/"', description: "Brand/logo link target" },
                { prop: "headerBrandTitle", type: "string", default: "(empty)", description: "Brand text override" },
                { prop: "headerLinks", type: "HeaderLink[]", default: "see defaults", description: "Nav items (bilingual)" },
                { prop: "headerBackgroundColor", type: "string (hex)", default: '""', description: "Theme default" },
                { prop: "headerTextColor", type: "string (hex)", default: '""', description: "Theme default" },
                { prop: "headerShowDrawerButton", type: "boolean", default: "false", description: "Hamburger toggle for drawer" },
                { prop: "headerDrawerButtonIcon", type: '"menu" | "x"', default: '"menu"', description: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.10 Shell: Footer */}
          <CollapsibleSection title="2.10 Shell: Footer" id="shell-footer">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { prop: "footerVisible", type: "boolean", default: "true", description: "Show/hide site-wide footer" },
                { prop: "footerTagline", type: "string", default: '""', description: "Short tagline (EN)" },
                { prop: "footerTaglineAr", type: "string", default: '""', description: "Short tagline (AR)" },
                { prop: "footerBrandTitle", type: "string", default: '""', description: "Brand text override" },
                { prop: "footerColumns", type: "FooterColumn[]", default: "see defaults", description: "Link columns (bilingual)" },
                { prop: "footerBackgroundColor", type: "string (hex)", default: '""', description: "—" },
                { prop: "footerTextColor", type: "string (hex)", default: '""', description: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 2.11 Shell: Site Drawer */}
          <CollapsibleSection title="2.11 Shell: Site Drawer" id="shell-drawer">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "drawerEnabled", type: "boolean", default: "false", options: "Master switch" },
                { prop: "drawerSide", type: '"left" | "right"', default: '"left"', options: "—" },
                { prop: "drawerWidthPx", type: "number", default: "320", options: "Panel width (min 200)" },
                { prop: "drawerAnimation", type: '"slide" | "fade" | "slide-fade"', default: '"slide"', options: "—" },
                { prop: "drawerAnimationDurationMs", type: "number", default: "260", options: "—" },
                { prop: "drawerTrigger", type: '"external" | "icon" | "both"', default: '"external"', options: "How drawer opens" },
                { prop: "drawerTriggerLabel", type: "string", default: '"Menu"', options: "—" },
                { prop: "drawerTriggerLabelAr", type: "string", default: '"القائمة"', options: "—" },
                { prop: "drawerTriggerIcon", type: '"menu" | "x" | "panel-left" | "panel-right"', default: '"menu"', options: "—" },
                { prop: "drawerTitle", type: "string", default: '"Menu"', options: "—" },
                { prop: "drawerTitleAr", type: "string", default: '"القائمة"', options: "—" },
                { prop: "drawerShowTitle", type: "boolean", default: "true", options: "—" },
                { prop: "drawerLinks", type: "SiteDrawerLink[]", default: "see defaults", options: "—" },
                { prop: "drawerBackgroundColor", type: "string (hex)", default: '"#ffffff"', options: "—" },
                { prop: "drawerTextColor", type: "string (hex)", default: '"#111827"', options: "—" },
                { prop: "drawerAccentColor", type: "string (hex)", default: '"#2563eb"', options: "—" },
                { prop: "drawerTriggerBackgroundColor", type: "string (hex)", default: '"#ffffff"', options: "—" },
                { prop: "drawerTriggerTextColor", type: "string (hex)", default: '"#111827"', options: "—" },
                { prop: "drawerOverlay", type: "boolean", default: "true", options: "Show backdrop" },
                { prop: "drawerOverlayOpacityPercent", type: "number (0–100)", default: "50", options: "—" },
                { prop: "drawerCloseOnOverlayClick", type: "boolean", default: "true", options: "—" },
                { prop: "drawerCloseOnEsc", type: "boolean", default: "true", options: "—" },
                { prop: "drawerShowCloseButton", type: "boolean", default: "true", options: "—" },
                { prop: "drawerStartOpen", type: "boolean", default: "false", options: "—" },
                { prop: "drawerShowOnMobile", type: "boolean", default: "true", options: "—" },
                { prop: "drawerShowOnDesktop", type: "boolean", default: "true", options: "—" },
              ]}
            />
          </CollapsibleSection>
        </section>

        {/* 3. Theme & Design Tokens */}
        <section id="theme-design-tokens" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            3. Theme & Design Tokens
          </h2>

          {/* 3.1 CSS Variable Architecture */}
          <CollapsibleSection title="3.1 CSS Variable Architecture" id="css-variable-architecture">
            <p className="text-muted-foreground mb-4">
              All theme values are exposed as CSS custom properties on the <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">.theme-root</code> element:
            </p>
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2">Color vars</h4>
                <code className="text-sm text-muted-foreground">--theme-color-{'{key}'}</code>
                <p className="text-sm text-muted-foreground mt-1">(e.g. --theme-color-primary, --theme-color-text)</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2">Derived vars (computed from colors)</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><code className="text-xs font-mono">--theme-color-background</code> — page background (surface 88% + white)</li>
                  <li><code className="text-xs font-mono">--theme-color-surface</code> — card/panel bg</li>
                  <li><code className="text-xs font-mono">--theme-color-surface-elevated</code></li>
                  <li><code className="text-xs font-mono">--theme-color-border</code> — neutral 34% + white</li>
                  <li><code className="text-xs font-mono">--theme-color-muted</code></li>
                  <li><code className="text-xs font-mono">--theme-color-text-muted</code></li>
                  <li><code className="text-xs font-mono">--theme-color-primaryMuted</code> — primary 15% + white</li>
                  <li><code className="text-xs font-mono">--theme-color-primaryHover</code> — primary 84% + black</li>
                  <li><code className="text-xs font-mono">--theme-color-on-primary</code> — white</li>
                  <li><code className="text-xs font-mono">--theme-color-onPrimary</code> — white</li>
                  <li><code className="text-xs font-mono">--theme-color-focusRing</code></li>
                </ul>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2">Scale vars</h4>
                <code className="text-sm text-muted-foreground">--theme-text-size-{'{step}'}, --theme-radius-{'{step}'}, --theme-button-{'{size}'}-{'{dimension}'}, --theme-font-weight-{'{step}'}, --theme-line-height-{'{step}'}</code>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2">Font vars</h4>
                <code className="text-sm text-muted-foreground">--theme-body-font, --theme-font-1, --theme-font-2</code>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2">Badge vars</h4>
                <code className="text-sm text-muted-foreground">--theme-badge-radius, --theme-badge-padding-x, --theme-badge-padding-y, --theme-badge-font-size, --theme-badge-font-weight, --theme-badge-{'{type}'}-{'{bg,fg,border}'}</code>
                <p className="text-sm text-muted-foreground mt-1">(types: discount, stock, out)</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* 3.2 Font Options */}
          <CollapsibleSection title="3.2 Font Options" id="font-options">
            <PropTable
              columns={[
                { key: "value", header: "Value" },
                { key: "cssFont", header: "CSS Font" },
              ]}
              rows={[
                { value: "system", cssFont: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
                { value: "inter", cssFont: "'Inter', sans-serif" },
                { value: "roboto", cssFont: "'Roboto', sans-serif" },
                { value: "open-sans", cssFont: "'Open Sans', sans-serif" },
                { value: "lato", cssFont: "'Lato', sans-serif" },
                { value: "poppins", cssFont: "'Poppins', sans-serif" },
                { value: "montserrat", cssFont: "'Montserrat', sans-serif" },
                { value: "raleway", cssFont: "'Raleway', sans-serif" },
                { value: "nunito", cssFont: "'Nunito', sans-serif" },
                { value: "dm-sans", cssFont: "'DM Sans', sans-serif" },
                { value: "manrope", cssFont: "'Manrope', sans-serif" },
                { value: "sora", cssFont: "'Sora', sans-serif" },
                { value: "playfair-display", cssFont: "'Playfair Display', Georgia, serif" },
                { value: "merriweather", cssFont: "'Merriweather', Georgia, serif" },
                { value: "lora", cssFont: "'Lora', Georgia, serif" },
                { value: "space-grotesk", cssFont: "'Space Grotesk', sans-serif" },
                { value: "geist", cssFont: "'Geist', sans-serif" },
                { value: "fraunces", cssFont: "'Fraunces', serif" },
              ]}
            />
          </CollapsibleSection>

          {/* 3.3 Component Font Options */}
          <CollapsibleSection title="3.3 Component Font Options" id="component-font-options">
            <p className="text-muted-foreground">
              Selectable on blocks: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">"body"</code> (= var(--theme-body-font)), 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">"option1"</code> (= var(--theme-font-1)), 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">"option2"</code> (= var(--theme-font-2)).
            </p>
          </CollapsibleSection>

          {/* 3.4 Shared Spacing */}
          <CollapsibleSection title="3.4 Shared Spacing" id="shared-spacing">
            <p className="text-muted-foreground">
              File: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/options.ts</code>. 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">spacingOptions</code> = 8px through 160px in 8px steps (20 options).
            </p>
          </CollapsibleSection>

          {/* 3.5 Theme Presets */}
          <CollapsibleSection title="3.5 Theme Presets" id="theme-presets">
            <p className="text-muted-foreground mb-4">
              File: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/theme-presets.ts</code>.
            </p>
            <PropTable
              columns={[
                { key: "preset", header: "Preset" },
                { key: "id", header: "ID" },
                { key: "font", header: "Font" },
                { key: "colors", header: "Colors" },
              ]}
              rows={[
                { preset: "Atelier", id: "atelier", font: "body: Merriweather, option1: Playfair Display, option2: Raleway", colors: "primary: #9f1239, surface: #faf7f5, warm neutrals" },
              ]}
            />
            <p className="text-sm text-muted-foreground mt-4">
              Presets override the full <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">FullThemeProps</code> shape. 
              Each preset has a demo page at <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">/themes/{'{id}'}</code>.
            </p>
          </CollapsibleSection>
        </section>

        {/* 4. Layout System */}
        <section id="layout-system" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            4. Layout System
          </h2>
          <p className="text-muted-foreground mb-6">
            Every block can optionally include a <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">layout</code> prop drawn from <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">LayoutFieldProps</code>. The layout system provides:
          </p>

          {/* 4.1 Grid Spanning */}
          <CollapsibleSection title="4.1 Grid Spanning" id="grid-spanning">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
              ]}
              rows={[
                { prop: "spanCol", type: "number", default: "1" },
                { prop: "spanRow", type: "number", default: "1" },
                { prop: "grow", type: "boolean", default: "false" },
              ]}
            />
          </CollapsibleSection>

          {/* 4.2 Spacing */}
          <CollapsibleSection title="4.2 Spacing (Margin & Padding)" id="spacing">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
              ]}
              rows={[
                { prop: "padding (deprecated)", type: "string", default: '"0px"' },
                { prop: "paddingTop", type: "string", default: '"0px"' },
                { prop: "paddingRight", type: "string", default: '"0px"' },
                { prop: "paddingBottom", type: "string", default: '"0px"' },
                { prop: "paddingLeft", type: "string", default: '"0px"' },
                { prop: "marginTop", type: "string", default: '"0px"' },
                { prop: "marginRight", type: "string", default: '"0px"' },
                { prop: "marginBottom", type: "string", default: '"0px"' },
                { prop: "marginLeft", type: "string", default: '"0px"' },
              ]}
            />
          </CollapsibleSection>

          {/* 4.3 Float / Positioning */}
          <CollapsibleSection title="4.3 Float / Positioning" id="float-positioning">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "positionMode", type: '"static" | "float"', default: '"static"', options: "—" },
                { prop: "floatUseFixedPosition", type: "boolean", default: "true", options: "fixed vs absolute" },
                { prop: "floatPlacementMode", type: '"custom" | "preset"', default: '"preset"', options: "—" },
                { prop: "floatPreset", type: "(8 anchors)", default: '"top-left"', options: "top-left, top-middle, top-right, middle-left, middle-right, bottom-left, bottom-middle, bottom-right" },
                { prop: "fixedTop / fixedRight / fixedBottom / fixedLeft", type: "string", default: '"auto"', options: "auto or 0%–100% in 5% steps" },
              ]}
            />
          </CollapsibleSection>

          {/* 4.4 Border */}
          <CollapsibleSection title="4.4 Border" id="border">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "borderWidth", type: "string", default: '"0px"', options: "—" },
                { prop: "borderStyle", type: '"solid" | "dashed" | "none"', default: '"solid"', options: "—" },
                { prop: "borderColor", type: "string", default: '"#cbd5e1"', options: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 4.5 Box Shadow */}
          <CollapsibleSection title="4.5 Box Shadow" id="box-shadow">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "shadowMode", type: '"none" | "preset" | "custom"', default: '"none"', options: "—" },
                { prop: "shadowPreset", type: '"sm" | "md" | "lg" | "xl"', default: '"md"', options: "—" },
                { prop: "shadowOffsetX / shadowOffsetY", type: "string", default: '"0px" / "4px"', options: "—" },
                { prop: "shadowBlur", type: "string", default: '"6px"', options: "—" },
                { prop: "shadowSpread", type: "string", default: '"0px"', options: "—" },
                { prop: "shadowColor", type: "string", default: '"rgba(0, 0, 0, 0.12)"', options: "—" },
              ]}
            />
          </CollapsibleSection>

          {/* 4.6 Display & Visibility */}
          <CollapsibleSection title="4.6 Display & Visibility" id="display-visibility">
            <PropTable
              columns={[
                { key: "prop", header: "Prop" },
                { key: "type", header: "Type" },
                { key: "default", header: "Default" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { prop: "displayMode", type: '"block" | "flex" | "grid"', default: '"block"', options: "—" },
                { prop: "hideOnMobile", type: "boolean", default: "false", options: "Hides at <= breakpointMobileMax" },
                { prop: "hideOnTablet", type: "boolean", default: "false", options: "Hides at mobile+1 to tabletMax" },
                { prop: "hideOnDesktop", type: "boolean", default: "false", options: "Hides at >= tabletMax+1" },
              ]}
            />
          </CollapsibleSection>

          {/* 4.7 Layout in Puck */}
          <CollapsibleSection title="4.7 Layout in Puck" id="layout-puck">
            <p className="text-muted-foreground mb-4">The root render wraps content in:</p>
            <CodeBlock
              code={`[Shell Left Zone] [DropZone (SiteHeader, Section, SiteFooter)] [Shell Right Zone]`}
              language="text"
            />
            <p className="text-sm text-muted-foreground mt-4">
              Shell zones are 56px editing rails (hidden on live site), accepting <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">SiteDrawerShell</code> blocks.
            </p>
          </CollapsibleSection>
        </section>

        {/* 5. Blocks */}
        <section id="blocks" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            5. Blocks
          </h2>
          <p className="text-muted-foreground mb-6">
            Blocks are registered in <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/blocks/{'<Name>'}/index.tsx</code>. Each exports a Puck <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">ComponentConfig</code> with:
          </p>
          <ul className="list-disc list-inside text-muted-foreground mb-6 space-y-1">
            <li><code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">fields</code> — field definitions (text, number, radio, select, custom, external, array, object)</li>
            <li><code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">defaultProps</code> — default values</li>
            <li><code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">render</code> — React component</li>
            <li>Optional <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">blockRules</code> (allowed children for Section, Flex, Grid, Group)</li>
          </ul>

          {/* 5.1 Layout Blocks */}
          <CollapsibleSection title="5.1 Layout Blocks" id="layout-blocks" badge="4 blocks">
            {/* Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Section</h4>
              <p className="text-sm text-muted-foreground mb-4">The outermost container. Accepts child blocks in its <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">content</code> Slot.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options / Notes" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "Unique identifier" },
                  { field: "paddingTop", label: "Padding top", type: "select", default: '"0px"', options: "spacingOptions" },
                  { field: "paddingBottom", label: "Padding bottom", type: "select", default: '"0px"', options: "spacingOptions" },
                  { field: "paddingHorizontal", label: "Padding horizontal", type: "select", default: '"0px"', options: "spacingOptions" },
                  { field: "maxWidth", label: "Max width", type: "text", default: '"1280px"', options: "CSS max-width value" },
                  { field: "backgroundColor", label: "Background color", type: "text", default: '""', options: "Fixed hex or empty (inherit)" },
                  { field: "theme", label: "Theme mode", type: "radio", default: '"light"', options: '"light" | "dark"' },
                ]}
              />
              <p className="text-sm text-muted-foreground mt-2"><strong>Slot:</strong> <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">content</code> — allows any block.</p>
            </div>

            {/* Flex */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Flex</h4>
              <p className="text-sm text-muted-foreground mb-4">Flexbox container with <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">items</code> array of child blocks.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "direction", label: "Direction", type: "radio", default: '"row"', options: '"row" | "column"' },
                  { field: "justifyContent", label: "Justify", type: "select", default: '"flex-start"', options: "flex-start, center, flex-end, space-between, space-around" },
                  { field: "alignItems", label: "Align", type: "select", default: '"stretch"', options: "flex-start, center, flex-end, stretch, baseline" },
                  { field: "wrap", label: "Wrap", type: "radio", default: '"nowrap"', options: '"nowrap" | "wrap"' },
                  { field: "gap", label: "Gap", type: "select", default: "8", options: "4, 8, 12, 16, 20, 24, 28, 32" },
                ]}
              />
              <p className="text-sm text-muted-foreground mt-2"><strong>Slot:</strong> <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">items</code> — array blocks (each item is a child block).</p>
            </div>

            {/* Grid */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Grid</h4>
              <p className="text-sm text-muted-foreground mb-4">Grid container with <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">items</code> array of child blocks.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "numColumns", label: "Columns", type: "radio", default: "2", options: "2, 3, 4" },
                  { field: "gap", label: "Gap", type: "select", default: "16", options: "4–32 in 4px steps" },
                ]}
              />
              <p className="text-sm text-muted-foreground mt-2"><strong>Slot:</strong> <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">items</code> — array blocks.</p>
            </div>

            {/* Group */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Group</h4>
              <p className="text-sm text-muted-foreground mb-4">Multi-child wrapper with inline <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">content</code> slots (like a strip).</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "direction", label: "Direction", type: "radio", default: '"column"', options: '"row" | "column"' },
                  { field: "alignItems", label: "Align items", type: "select", default: '"flex-start"', options: "flex-start, center, flex-end, stretch" },
                  { field: "justifyContent", label: "Justify", type: "select", default: '"flex-start"', options: "flex-start, center, flex-end, space-between, space-around" },
                  { field: "wrap", label: "Wrap", type: "radio", default: '"nowrap"', options: '"nowrap" | "wrap"' },
                  { field: "gap", label: "Gap", type: "select", default: "8", options: "4–32 in 4px steps" },
                ]}
              />
              <p className="text-sm text-muted-foreground mt-2"><strong>Slot:</strong> <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">content</code> — allows any block.</p>
            </div>
          </CollapsibleSection>

          {/* 5.2 Content Blocks */}
          <CollapsibleSection title="5.2 Content Blocks" id="content-blocks" badge="12 blocks">
            {/* Heading */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Heading</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "text", label: "Text", type: "text", default: '"Heading"', options: "Rich text (TipTap)" },
                  { field: "level", label: "Level", type: "radio", default: '"2"', options: '"1", "2", "3", "4"' },
                  { field: "align", label: "Alignment", type: "radio", default: '"center"', options: '"left", "center", "right"' },
                  { field: "size", label: "Size", type: "radio", default: '"xl"', options: '"md", "lg", "xl", "xxl"' },
                  { field: "fontFamily", label: "Font", type: "select", default: '"body"', options: '"body", "option1", "option2"' },
                  { field: "colorMode", label: "Color mode", type: "radio", default: '"theme"', options: '"theme" | "fixed"' },
                  { field: "colorTheme", label: "Theme color", type: "select", default: '"text"', options: "All ColorKey values" },
                  { field: "colorFixed", label: "Fixed color", type: "custom", default: '"#0f172a"', options: "Color picker + hex input" },
                ]}
              />
            </div>

            {/* Text */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Text (paragraph body)</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "text", label: "Text", type: "richtext", default: '"Text content..."', options: "TipTap rich text" },
                  { field: "align", label: "Alignment", type: "radio", default: '"left"', options: '"left", "center", "right"' },
                  { field: "size", label: "Size", type: "radio", default: '"m"', options: '"s", "m", "l"' },
                  { field: "color", label: "Color", type: "radio", default: '"default"', options: '"default" | "muted"' },
                  { field: "fontFamily", label: "Font", type: "select", default: '"body"', options: '"body", "option1", "option2"' },
                ]}
              />
            </div>

            {/* Space */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Space</h4>
              <p className="text-sm text-muted-foreground mb-4">Empty spacer block.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "size", label: "Size", type: "select", default: '"16px"', options: "spacingOptions (8px–160px)" },
                  { field: "direction", label: "Direction", type: "radio", default: '"vertical"', options: '"vertical" | "horizontal"' },
                ]}
              />
            </div>

            {/* Button */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Button</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "label", label: "Label", type: "text", default: '"Button"', options: "—" },
                  { field: "labelAr", label: "Label (Arabic)", type: "text", default: '""', options: "—" },
                  { field: "buttonAction", label: "Action", type: "radio", default: '"link"', options: "link, login, logout, addToCart, addToWishlist" },
                  { field: "href", label: "URL", type: "text", default: '""', options: "—" },
                  { field: "link", label: "Link", type: "object", default: "—", options: "Sub-fields: kind, pageId, url, newWindow" },
                  { field: "variant", label: "Variant", type: "radio", default: '"primary"', options: '"primary", "secondary", "outline", "ghost", "danger"' },
                  { field: "size", label: "Size", type: "radio", default: '"md"', options: '"sm", "md", "lg"' },
                  { field: "fullWidth", label: "Full width", type: "radio", default: '"off"', options: '"on" | "off"' },
                  { field: "fontFamily", label: "Font", type: "select", default: '"body"', options: "Font options" },
                  { field: "colorMode", label: "Color mode", type: "radio", default: '"theme"', options: '"theme" | "fixed"' },
                  { field: "colorTheme", label: "Theme color", type: "select", default: '"primary"', options: "ColorKey values" },
                  { field: "colorFixed", label: "Fixed color", type: "custom", default: '"#0f172a"', options: "Color picker + hex" },
                ]}
              />
            </div>

            {/* Icon */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Icon</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "name", label: "Icon name", type: "text", default: '"Star"', options: "Any Lucide icon name" },
                  { field: "size", label: "Size", type: "select", default: '"24"', options: '"16", "20", "24", "32", "40", "48"' },
                  { field: "colorMode", label: "Color mode", type: "radio", default: '"theme"', options: '"theme" | "fixed"' },
                  { field: "colorTheme", label: "Theme color", type: "select", default: '"text"', options: "ColorKey values" },
                  { field: "colorFixed", label: "Fixed color", type: "custom", default: '"#0f172a"', options: "Color picker + hex" },
                  { field: "strokeWidth", label: "Stroke width", type: "select", default: '"2"', options: '"1", "1.5", "2", "2.5", "3"' },
                ]}
              />
            </div>

            {/* Image */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Image</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "src", label: "Image URL", type: "text", default: "Unsplash placeholder", options: "—" },
                  { field: "alt", label: "Alt text", type: "text", default: '""', options: "Accessibility" },
                  { field: "aspectRatio", label: "Aspect ratio", type: "radio", default: '"auto"', options: '"auto", "square", "landscape", "portrait", "wide"' },
                  { field: "borderRadius", label: "Radius", type: "select", default: '"md"', options: "none, sm, md, lg, xl, full" },
                  { field: "shadow", label: "Shadow", type: "select", default: '"none"', options: "none, sm, md, lg, xl" },
                  { field: "objectFit", label: "Object fit", type: "select", default: '"cover"', options: "cover, contain, fill, none" },
                  { field: "width", label: "Width", type: "text", default: '"100%"', options: "CSS value" },
                  { field: "height", label: "Height", type: "text", default: '"auto"', options: "CSS value" },
                ]}
              />
            </div>

            {/* Video */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Video</h4>
              <p className="text-sm text-muted-foreground mb-4">Embeds a video player with custom poster.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "src", label: "Video URL", type: "text", default: '""', options: "MP4 URL" },
                  { field: "poster", label: "Poster image", type: "text", default: '""', options: "Unsplash placeholder" },
                  { field: "controls", label: "Controls", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "autoPlay", label: "Auto-play", type: "radio", default: '"off"', options: '"on" | "off"' },
                  { field: "loop", label: "Loop", type: "radio", default: '"off"', options: '"on" | "off"' },
                  { field: "muted", label: "Muted", type: "radio", default: '"off"', options: '"on" | "off"' },
                  { field: "borderRadius", label: "Border radius", type: "select", default: '"md"', options: "Radius steps" },
                  { field: "aspectRatio", label: "Aspect ratio", type: "radio", default: '"16:9"', options: '"auto", "16:9", "4:3", "1:1"' },
                ]}
              />
            </div>

            {/* YouTube */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">YouTube</h4>
              <p className="text-sm text-muted-foreground mb-4">Embeds a YouTube video from any URL format.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "url", label: "YouTube URL", type: "text", default: '""', options: "Accepts youtube.com/watch?v=, youtu.be/, /embed/, /shorts/" },
                  { field: "aspectRatio", label: "Aspect ratio", type: "radio", default: '"16:9"', options: '"auto", "16:9", "4:3", "1:1"' },
                  { field: "borderRadius", label: "Border radius", type: "select", default: '"md"', options: "Radius steps" },
                ]}
              />
            </div>

            {/* Hero */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Hero</h4>
              <p className="text-sm text-muted-foreground mb-4">Full-bleed hero banner with title, description, buttons, and optional background image.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "title", label: "Title", type: "text", default: '"Hero title"', options: "—" },
                  { field: "description", label: "Description", type: "richtext", default: '""', options: "TipTap rich text" },
                  { field: "buttons", label: "Buttons", type: "array", default: "[]", options: "Array of { label, labelAr, href, variant }" },
                  { field: "align", label: "Alignment", type: "radio", default: '"center"', options: '"left", "center", "right"' },
                  { field: "padding", label: "Padding", type: "select", default: '"80px"', options: "spacingOptions" },
                  { field: "image.url", label: "Background image", type: "text", default: '""', options: "URL" },
                  { field: "image.mode", label: "Image mode", type: "radio", default: '"none"', options: "none, background, split" },
                  { field: "image.backgroundAttachment", label: "Attachment", type: "radio", default: '"scroll"', options: "scroll, fixed" },
                ]}
              />
            </div>

            {/* Card */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Card</h4>
              <p className="text-sm text-muted-foreground mb-4">Generic content card.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "title", label: "Title", type: "text", default: '""', options: "—" },
                  { field: "description", label: "Description", type: "richtext", default: '""', options: "—" },
                  { field: "image", label: "Image", type: "object", default: "—", options: "{ url, alt }" },
                  { field: "variant", label: "Variant", type: "radio", default: '"default"', options: '"default", "outlined", "elevated"' },
                  { field: "colorMode / colorTheme / colorFixed", label: "Color", type: "—", default: "—", options: "Shared color fields" },
                ]}
              />
            </div>

            {/* Badge */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Badge</h4>
              <p className="text-sm text-muted-foreground mb-4">Small label/chip (e.g. discount, stock status).</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "label", label: "Label", type: "text", default: '"Badge"', options: "Text content" },
                  { field: "labelAr", label: "Label (Arabic)", type: "text", default: '""', options: "—" },
                  { field: "variant", label: "Variant", type: "radio", default: '"discount"', options: '"discount", "inStock", "outOfStock", "custom"' },
                  { field: "colorMode / colorTheme / colorFixed", label: "Color", type: "—", default: "—", options: "Shared color fields" },
                  { field: "size", label: "Size", type: "radio", default: '"sm"', options: '"sm", "md", "lg"' },
                ]}
              />
            </div>

            {/* Divider */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Divider</h4>
              <p className="text-sm text-muted-foreground mb-4">Horizontal or vertical rule.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "orientation", label: "Orientation", type: "radio", default: '"horizontal"', options: '"horizontal" | "vertical"' },
                  { field: "thickness", label: "Thickness", type: "select", default: '"1px"', options: '"1px", "2px", "3px", "4px"' },
                  { field: "colorMode / colorTheme / colorFixed", label: "Color", type: "—", default: "—", options: "Shared color fields" },
                  { field: "width", label: "Width", type: "text", default: '"100%"', options: "CSS value (horizontal only)" },
                  { field: "height", label: "Height", type: "text", default: '"100%"', options: "CSS value (vertical only)" },
                ]}
              />
            </div>
          </CollapsibleSection>

          {/* 5.3 Commerce Blocks */}
          <CollapsibleSection title="5.3 Commerce Blocks" id="commerce-blocks" badge="11 blocks">
            {/* ProductCard */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">ProductCard</h4>
              <p className="text-sm text-muted-foreground mb-4">Individual product card with image, title, price, badges.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "product", label: "Product", type: "external", default: "first product", options: "Searchable via productExternalField" },
                  { field: "variant", label: "Layout", type: "radio", default: '"vertical"', options: '"vertical", "horizontal"' },
                  { field: "colorScheme", label: "Color scheme", type: "radio", default: '"light"', options: '"light" | "dark"' },
                  { field: "fontFamily", label: "Font", type: "select", default: '"body"', options: "Font options" },
                  { field: "fontWeight", label: "Font weight", type: "select", default: '"500"', options: "Font weight steps" },
                  { field: "lineHeight", label: "Line height", type: "select", default: '"normal"', options: "Line height steps" },
                  { field: "imageMode", label: "Image mode", type: "radio", default: '"img"', options: '"img" | "background"' },
                  { field: "imageHeight", label: "Image height", type: "text", default: '"200px"', options: "—" },
                  { field: "imageBorderRadius", label: "Image radius", type: "select", default: '"md"', options: "Radius steps" },
                  { field: "imageObjectFit", label: "Object fit", type: "select", default: '"cover"', options: "cover, contain, fill" },
                  { field: "spacing", label: "Spacing", type: "select", default: '"normal"', options: '"compact", "normal", "relaxed"' },
                  { field: "showDescription", label: "Show description", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showCategories", label: "Show categories", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showBadge", label: "Show discount badge", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showStockBadge", label: "Show stock badge", type: "radio", default: '"on"', options: '"on" | "off"' },
                ]}
              />
            </div>

            {/* ProductGrid */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">ProductGrid</h4>
              <p className="text-sm text-muted-foreground mb-4">Grid of product cards.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "collection", label: "Collection filter", type: "select", default: '"all"', options: '"all" or any allCollections value' },
                  { field: "maxProducts", label: "Max products", type: "select", default: '"6"', options: "1–12" },
                  { field: "columns", label: "Columns", type: "radio", default: '"3"', options: "2, 3, 4" },
                  { field: "variant", label: "Card variant", type: "radio", default: '"vertical"', options: '"vertical", "horizontal"' },
                  { field: "gap", label: "Gap", type: "select", default: "24", options: "4–32 in 4px steps" },
                  { field: "colorScheme", label: "Color scheme", type: "radio", default: '"light"', options: '"light" | "dark"' },
                ]}
              />
            </div>

            {/* ProductCarousel */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">ProductCarousel</h4>
              <p className="text-sm text-muted-foreground mb-4">Horizontal carousel/scrollable strip of product cards.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "collection", label: "Collection", type: "select", default: '"all"', options: "—" },
                  { field: "maxProducts", label: "Max products", type: "select", default: '"8"', options: "2–20" },
                  { field: "variant", label: "Card variant", type: "radio", default: '"vertical"', options: '"vertical", "horizontal"' },
                  { field: "autoPlay", label: "Auto-play", type: "radio", default: '"off"', options: '"on" | "off"' },
                  { field: "autoPlayIntervalMs", label: "Interval", type: "text", default: '"3000"', options: "Milliseconds" },
                ]}
              />
            </div>

            {/* CartSection */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">CartSection</h4>
              <p className="text-sm text-muted-foreground mb-4">Full shopping cart table with line items, quantity controls, remove buttons, and per-item totals.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "showCouponInput", label: "Show coupon", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showRemoveButton", label: "Show remove", type: "radio", default: '"on"', options: '"on" | "off"' },
                ]}
              />
            </div>

            {/* CartSummary */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">CartSummary</h4>
              <p className="text-sm text-muted-foreground mb-4">Sidebar summary with subtotal, shipping, estimated tax, and total.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "showShippingEstimate", label: "Show shipping", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showTaxEstimate", label: "Show tax", type: "radio", default: '"on"', options: '"on" | "off"' },
                ]}
              />
            </div>
          </CollapsibleSection>

          {/* 5.4 Testimonial Blocks */}
          <CollapsibleSection title="5.4 Testimonial Blocks" id="testimonial-blocks" badge="2 blocks">
            {/* TestimonialCard */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">TestimonialCard</h4>
              <p className="text-sm text-muted-foreground mb-4">Single testimonial with avatar, name, role, rating, text.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "testimonial", label: "Testimonial", type: "select", default: "first entry", options: "From sampleTestimonials options" },
                  { field: "showAvatar", label: "Show avatar", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showRating", label: "Show rating", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "variant", label: "Variant", type: "radio", default: '"default"', options: '"default", "outlined", "elevated"' },
                ]}
              />
            </div>

            {/* TestimonialGrid */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">TestimonialGrid</h4>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "columns", label: "Columns", type: "radio", default: '"3"', options: "1, 2, 3, 4" },
                  { field: "gap", label: "Gap", type: "select", default: "24", options: "4–32 in 4px steps" },
                  { field: "maxItems", label: "Max items", type: "select", default: '"6"', options: "1–12" },
                  { field: "showAvatar", label: "Show avatar", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showRating", label: "Show rating", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "cardVariant", label: "Card variant", type: "radio", default: '"default"', options: '"default", "outlined", "elevated"' },
                ]}
              />
            </div>
          </CollapsibleSection>

          {/* 5.5 Shell Blocks */}
          <CollapsibleSection title="5.5 Shell Blocks" id="shell-blocks" badge="4 blocks">
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">SiteHeader</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Site-wide header block (placed in root DropZone). Draws from root props for links, brand, colors. Renders logo, navigation links, drawer toggle button.
              </p>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">No configurable fields in the block itself</strong> — all props come from root config (headerLinks, headerBrandTitle, etc.).
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">SiteFooter</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Site-wide footer with columns of links. Renders brand, tagline, link columns.
              </p>
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">No configurable fields in the block itself</strong> — props come from root config (footerColumns, footerTagline, etc.).
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">SiteDrawerShell</h4>
              <p className="text-sm text-muted-foreground mb-4">Side-panel drawer (left/right rail). Uses root config for all behavior.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                ]}
              />
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Logo</h4>
              <p className="text-sm text-muted-foreground mb-4">Simple image logo block for use in headers, footers, etc.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "src", label: "Image URL", type: "text", default: '""', options: "—" },
                  { field: "alt", label: "Alt text", type: "text", default: '"Logo"', options: "—" },
                  { field: "width", label: "Width", type: "text", default: '"120"', options: "Pixels" },
                  { field: "height", label: "Height", type: "text", default: '"36"', options: "Pixels" },
                ]}
              />
            </div>
          </CollapsibleSection>

          {/* 5.6 Utility Blocks */}
          <CollapsibleSection title="5.6 Utility Blocks" id="utility-blocks" badge="4 blocks">
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Html</h4>
              <p className="text-sm text-muted-foreground mb-4">Raw HTML block.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "html", label: "HTML", type: "textarea", default: '""', options: "Raw HTML string" },
                ]}
              />
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">Countdown</h4>
              <p className="text-sm text-muted-foreground mb-4">Countdown timer to a target date.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "targetDate", label: "Target date", type: "text", default: "future date", options: "ISO 8601 string" },
                  { field: "title", label: "Title", type: "text", default: '""', options: "Optional heading above timer" },
                  { field: "titleAr", label: "Title (Arabic)", type: "text", default: '""', options: "—" },
                  { field: "size", label: "Size", type: "radio", default: '"md"', options: '"sm", "md", "lg"' },
                  { field: "showDays / showHours / showMinutes / showSeconds", label: "Units", type: "radio", default: 'all "on"', options: '"on" | "off"' },
                ]}
              />
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">CookieConsent</h4>
              <p className="text-sm text-muted-foreground mb-4">GDPR cookie consent banner.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "message", label: "Message", type: "text", default: "default", options: "—" },
                  { field: "messageAr", label: "Message (Arabic)", type: "text", default: "default", options: "—" },
                  { field: "acceptLabel", label: "Accept label", type: "text", default: '"Accept"', options: "—" },
                  { field: "acceptLabelAr", label: "Accept label (AR)", type: "text", default: '"قبول"', options: "—" },
                  { field: "declineLabel", label: "Decline label", type: "text", default: '"Decline"', options: "—" },
                  { field: "declineLabelAr", label: "Decline label (AR)", type: "text", default: '"رفض"', options: "—" },
                  { field: "position", label: "Position", type: "radio", default: '"bottom"', options: '"top", "bottom"' },
                ]}
              />
            </div>

            <div className="mb-8">
              <h4 className="text-lg font-semibold text-foreground mb-2">SearchModal</h4>
              <p className="text-sm text-muted-foreground mb-4">Product search modal with live filtering.</p>
              <PropTable
                columns={[
                  { key: "field", header: "Field" },
                  { key: "label", header: "Label" },
                  { key: "type", header: "Type" },
                  { key: "default", header: "Default" },
                  { key: "options", header: "Options" },
                ]}
                rows={[
                  { field: "id", label: "ID", type: "text", default: "auto-generated", options: "—" },
                  { field: "placeholder", label: "Placeholder", type: "text", default: '"Search products…"', options: "—" },
                  { field: "placeholderAr", label: "Placeholder (AR)", type: "text", default: '"بحث عن منتجات…"', options: "—" },
                  { field: "maxResults", label: "Max results", type: "select", default: '"8"', options: "4–20" },
                  { field: "showPrice", label: "Show price", type: "radio", default: '"on"', options: '"on" | "off"' },
                  { field: "showCategory", label: "Show category", type: "radio", default: '"on"', options: '"on" | "off"' },
                ]}
              />
            </div>
          </CollapsibleSection>
        </section>

        {/* 6. Shared Fields */}
        <section id="shared-fields" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            6. Shared Fields
          </h2>

          <CollapsibleSection title="6.1 Typography" id="typography-fields">
            <p className="text-muted-foreground mb-4">
              Mode toggle: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">"theme"</code> / <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">"fixed"</code> (radio).
            </p>
            <PropTable
              columns={[
                { key: "field", header: "Field" },
                { key: "options", header: "Options" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { field: "Text size", options: "xs, sm, md, lg, xl, 2xl", description: "Maps to --theme-text-size-{step}" },
                { field: "Radius", options: "none, sm, md, lg, xl, full", description: "Maps to --theme-radius-{step}" },
                { field: "Font weight", options: "normal, medium, semibold, bold", description: "Maps to --theme-font-weight-{step}" },
                { field: "Line height", options: "tight, normal, relaxed", description: "Maps to --theme-line-height-{step}" },
              ]}
            />
          </CollapsibleSection>

          <CollapsibleSection title="6.2 Color" id="color-fields">
            <p className="text-muted-foreground mb-4">Three-field combo on many content blocks:</p>
            <PropTable
              columns={[
                { key: "field", header: "Field" },
                { key: "type", header: "Type" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { field: "colorMode", type: "radio", options: '"theme" / "fixed"' },
                { field: "colorTheme", type: "select", options: "All 8 ColorKey values (primary, surface, success, warning, error, dark, text, neutral)" },
                { field: "colorFixed", type: "custom", options: "Color picker + hex text input" },
              ]}
            />
            <p className="text-sm text-muted-foreground mt-4">
              Resolver: <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">resolveContentColor(mode, theme, fixed) → CSS color string</code>.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="6.3 Button Action" id="button-action">
            <PropTable
              columns={[
                { key: "action", header: "Action" },
                { key: "value", header: "Value" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { action: "Link", value: '"link"', description: "Navigate to a URL" },
                { action: "Login", value: '"login"', description: "Trigger login flow" },
                { action: "Logout", value: '"logout"', description: "Trigger logout flow" },
                { action: "Add to cart", value: '"addToCart"', description: "Add item to cart" },
                { action: "Add to wishlist", value: '"addToWishlist"', description: "Add item to wishlist" },
              ]}
            />
          </CollapsibleSection>

          <CollapsibleSection title="6.4 Link Object" id="link-object">
            <p className="text-muted-foreground mb-4">Used by Button and Link blocks:</p>
            <PropTable
              columns={[
                { key: "subfield", header: "Sub-field" },
                { key: "type", header: "Type" },
                { key: "options", header: "Options" },
              ]}
              rows={[
                { subfield: "kind", type: "radio", options: '"page" / "url"' },
                { subfield: "pageId", type: "text", options: "Path when kind=page" },
                { subfield: "url", type: "text", options: "URL when kind=url" },
                { subfield: "newWindow", type: "radio", options: '"on" / "off"' },
              ]}
            />
          </CollapsibleSection>

          <CollapsibleSection title="6.5 YouTube URL Normalizer" id="youtube-normalizer">
            <p className="text-muted-foreground mb-4">
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">toYouTubeEmbedUrl(input)</code> normalizes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="text-xs font-mono">youtube.com/watch?v=ID</code> → <code className="text-xs font-mono">youtube.com/embed/ID</code></li>
              <li><code className="text-xs font-mono">youtu.be/ID</code> → <code className="text-xs font-mono">youtube.com/embed/ID</code></li>
              <li><code className="text-xs font-mono">youtube.com/shorts/ID</code> → <code className="text-xs font-mono">youtube.com/embed/ID</code></li>
              <li>Already <code className="text-xs font-mono">/embed/</code> URLs pass through</li>
            </ul>
          </CollapsibleSection>
        </section>

        {/* 7. Data Fixtures */}
        <section id="data-fixtures" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            7. Data Fixtures
          </h2>
          <p className="text-muted-foreground mb-6">
            File: <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">config/data/</code>
          </p>

          <CollapsibleSection title="7.1 Products" id="products">
            <p className="text-muted-foreground mb-4">Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">Product</code>:</p>
            <PropTable
              columns={[
                { key: "field", header: "Field" },
                { key: "type", header: "Type" },
                { key: "description", header: "Description" },
              ]}
              rows={[
                { field: "id", type: "string", description: 'e.g. "prod-001"' },
                { field: "title", type: "string", description: "Product name" },
                { field: "image", type: "string", description: "Unsplash URL" },
                { field: "description", type: "string", description: "Short description" },
                { field: "price", type: "number", description: "In USD (display via formatPrice())" },
                { field: "inStock", type: "boolean", description: "—" },
                { field: "categories", type: "string[]", description: 'e.g. ["Footwear", "Men", "Casual"]' },
                { field: "collections", type: "string[]", description: 'e.g. ["Summer 2025", "Essentials"]' },
                { field: "discount", type: "number?", description: "Percentage 0–100 (undefined = none)" },
              ]}
            />
            <p className="text-sm text-muted-foreground mt-4">
              <strong>14 products</strong> with IDs prod-001 through prod-014. Two out-of-stock (prod-004, prod-014). Most have discounts.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Helpers: <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">formatPrice(price)</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">discountedPrice(price, discount)</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">productOptions</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">allCollections</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">productExternalField</code>
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="7.2 Cart" id="cart">
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">MockCartLine</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">{`{ lineId, productId, quantity }`}</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Mock cart</strong> has 5 items (product IDs: prod-001×2, prod-003×1, prod-007×3, prod-011×1, prod-002×1).
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Helpers: <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">resolveCartLine(line)</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">resolveMockCartLines()</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">cloneMockCartItems()</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">mockCartSubtotal(lines)</code>
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="7.3 Checkout" id="checkout">
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">MockShippingAddress</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">{`{ fullName, line1, line2, city, region, postalCode, country }`}</code>.
            </p>
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">MockPaymentMethod</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">{`{ brand, last4, expiry }`}</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Constants:</strong> <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">CHECKOUT_DEMO_SHIPPING = 9.99</code>, 
              <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono ml-1">CHECKOUT_DEMO_TAX_RATE = 0.0825</code>
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="7.4 Orders" id="orders">
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">OrderStatus</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">"pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned"</code>.
            </p>
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">Order</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">{`{ id, orderNumber, date, status, total, itemCount, thumbnail? }`}</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>4 sample orders</strong> (ord-1001 through ord-1004) in various statuses.
            </p>
          </CollapsibleSection>

          <CollapsibleSection title="7.5 Testimonials" id="testimonials">
            <p className="text-muted-foreground mb-4">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">Testimonial</code>: 
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono ml-2">{`{ id, name, nameAr?, role?, roleAr?, avatar?, rating, text, textAr? }`}</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>3 testimonials</strong> (t-1, t-2, t-3) from bilingual customers (Arabic + English fields).
            </p>
          </CollapsibleSection>
        </section>

        {/* 8. JSON Examples */}
        <section id="json-examples" className="mb-16 scroll-mt-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b border-border">
            8. JSON Structure Examples
          </h2>

          <CollapsibleSection title="8.1 Overall Page Structure" id="page-structure">
            <p className="text-muted-foreground mb-4">Empty page with main keys only:</p>
            <CodeBlock
              title="page-structure.json"
              code={`{
  "root": {
    "props": {}
  },
  "content": [],
  "zones": {}
}`}
            />
            <div className="bg-muted/30 rounded-lg p-4 border border-border mt-4">
              <h4 className="font-medium text-foreground mb-2">Breakdown:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code className="text-xs font-mono">root.props</code> — system settings (locale, fonts, colors, header, footer, drawer, badges, breakpoints, scales)</li>
                <li><code className="text-xs font-mono">content</code> — array of top-level blocks rendered in the main DropZone (SiteHeader, Section, SiteFooter)</li>
                <li><code className="text-xs font-mono">zones</code> — named zones for shell areas (e.g. "shell-left", "shell-right" accepting SiteDrawerShell)</li>
              </ul>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="8.4 Hero Block" id="hero-block">
            <CodeBlock
              title="hero-block.json"
              code={`{
  "type": "Hero",
  "props": {
    "id": "Hero-main",
    "title": "Summer Collection 2026",
    "description": "<p>Discover lightweight styles crafted for warm days and warm nights.</p>",
    "buttons": [
      {
        "label": "Shop Now",
        "labelAr": "تسوق الآن",
        "href": "/products/example-product",
        "variant": "primary"
      },
      {
        "label": "Learn More",
        "href": "/themes",
        "variant": "secondary"
      }
    ],
    "align": "center",
    "padding": "140px",
    "image": {
      "url": "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=2000&auto=format&fit=crop&q=80",
      "mode": "background",
      "backgroundAttachment": "scroll",
      "content": []
    }
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.5 Grid Block" id="grid-block">
            <CodeBlock
              title="grid-block.json"
              code={`{
  "type": "Grid",
  "props": {
    "id": "Grid-featured",
    "numColumns": 2,
    "gap": 24,
    "items": [
      {
        "type": "Card",
        "props": {
          "id": "Card-1",
          "title": "Free Shipping",
          "description": "<p>On orders over 200 SAR</p>",
          "variant": "elevated",
          "colorMode": "theme",
          "colorTheme": "primary",
          "colorFixed": "#0f172a",
          "layout": {
            "spanCol": 1,
            "spanRow": 1,
            "grow": true,
            "padding": "0px"
          }
        }
      },
      {
        "type": "Card",
        "props": {
          "id": "Card-2",
          "title": "Easy Returns",
          "description": "<p>30-day return policy, no questions asked</p>",
          "variant": "elevated",
          "layout": {
            "spanCol": 1,
            "spanRow": 1,
            "grow": true,
            "padding": "0px"
          }
        }
      }
    ]
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.6 Flex Block" id="flex-block">
            <CodeBlock
              title="flex-block.json"
              code={`{
  "type": "Flex",
  "props": {
    "id": "Flex-icon-row",
    "direction": "row",
    "justifyContent": "center",
    "alignItems": "center",
    "wrap": "wrap",
    "gap": 24,
    "items": [
      {
        "type": "Icon",
        "props": {
          "id": "Icon-star",
          "name": "Star",
          "size": "32",
          "colorMode": "theme",
          "colorTheme": "primary",
          "colorFixed": "#0f172a",
          "strokeWidth": "2",
          "layout": {
            "padding": "0px"
          }
        }
      },
      {
        "type": "Icon",
        "props": {
          "id": "Icon-heart",
          "name": "Heart",
          "size": "32",
          "colorMode": "theme",
          "colorTheme": "error",
          "colorFixed": "#c24133",
          "strokeWidth": "2",
          "layout": {
            "padding": "0px"
          }
        }
      }
    ]
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.7 Layout with Float/Positioning" id="layout-float">
            <CodeBlock
              title="layout-float.json"
              code={`{
  "type": "Badge",
  "props": {
    "id": "Badge-floating-discount",
    "label": "-20%",
    "labelAr": "-٢٠٪",
    "variant": "discount",
    "size": "md",
    "colorMode": "theme",
    "colorTheme": "error",
    "colorFixed": "#c24133",
    "layout": {
      "positionMode": "float",
      "floatUseFixedPosition": false,
      "floatPlacementMode": "preset",
      "floatPreset": "top-right",
      "marginTop": "8px",
      "marginRight": "8px",
      "borderWidth": "0px",
      "borderStyle": "none",
      "shadowMode": "preset",
      "shadowPreset": "md",
      "hideOnMobile": false,
      "hideOnTablet": false,
      "hideOnDesktop": false
    }
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.8 Countdown Block" id="countdown-block">
            <CodeBlock
              title="countdown-block.json"
              code={`{
  "type": "Countdown",
  "props": {
    "id": "Countdown-sale",
    "targetDate": "2026-07-15T23:59:59Z",
    "title": "Sale Ends In",
    "titleAr": "ينتهي التخفيض بعد",
    "size": "md",
    "showDays": "on",
    "showHours": "on",
    "showMinutes": "on",
    "showSeconds": "on"
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.9 YouTube Block" id="youtube-block">
            <CodeBlock
              title="youtube-block.json"
              code={`{
  "type": "YouTube",
  "props": {
    "id": "YouTube-product-video",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "aspectRatio": "16:9",
    "borderRadius": "lg"
  }
}`}
            />
          </CollapsibleSection>

          <CollapsibleSection title="8.10 Video Block" id="video-block">
            <CodeBlock
              title="video-block.json"
              code={`{
  "type": "Video",
  "props": {
    "id": "Video-bg",
    "src": "https://example.com/video.mp4",
    "poster": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&auto=format&fit=crop&q=80",
    "controls": "on",
    "autoPlay": "on",
    "loop": "on",
    "muted": "on",
    "borderRadius": "md",
    "aspectRatio": "16:9"
  }
}`}
            />
          </CollapsibleSection>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            Erteqa Block Documentation — Single source of truth for the SOOQ visual editor
          </p>
        </footer>
      </div>
    </main>
  );
}
