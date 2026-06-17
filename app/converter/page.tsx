"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowRight, Copy, Check, RotateCcw, Zap, AlertCircle, BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { transformWebToMobile, EXAMPLE_PRESETS } from "@/lib/transformer";
import { cn } from "@/lib/utils";

const RULE_BADGES: Record<string, { label: string; color: string }> = {
  Section: { label: "Layout → container", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  Flex: { label: "Flex → row/col", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  FlexGroup: { label: "Flex → row/col", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  Group: { label: "Flex → row/col", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  Grid: { label: "Grid → rows", color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  Heading: { label: "Content → text", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Text: { label: "Content → text", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Paragraph: { label: "Content → text", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Space: { label: "Content → sizedBox", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Button: { label: "Content → button", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Link: { label: "Content → button", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Icon: { label: "Content → icon", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Image: { label: "Content → image", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Video: { label: "Content → videoPlayer", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  YouTube: { label: "Content → videoPlayer", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Hero: { label: "Content → stack/col", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Card: { label: "Content → card", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Badge: { label: "Content → container", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  Divider: { label: "Content → divider", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  ProductImage: { label: "Commerce → image", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  ProductCard: { label: "Commerce → card", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  ProductGrid: { label: "Commerce → gridView", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  ProductCarousel: { label: "Commerce → listView", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  ProductDetails: { label: "Commerce → column", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  CartSection: { label: "Commerce → listView", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  CartSummary: { label: "Commerce → card", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  CheckoutForm: { label: "Commerce → form", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  CheckoutSummary: { label: "Commerce → card", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  OrderList: { label: "Commerce → listView", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  OrderDetails: { label: "Commerce → column", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  TestimonialCard: { label: "Testimonial → card", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  TestimonialGrid: { label: "Testimonial → grid", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  Html: { label: "Utility → text", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  Countdown: { label: "Utility → timer", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  CookieConsent: { label: "Utility → banner", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  SearchModal: { label: "Utility → navigate", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  Logo: { label: "Shell → image", color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30" },
};

function detectRules(json: string): string[] {
  const rules: string[] = [];
  try {
    const parsed = JSON.parse(json);
    const str = JSON.stringify(parsed);
    if (/"path"\s*:/.test(str) && /"blocks"\s*:/.test(str)) rules.push("Page Shell → Full Envelope");
    if (/"type"\s*:\s*"Section"/.test(str)) rules.push("Section → container+column");
    if (/"type"\s*:\s*"(FlexGroup|Flex|Group|Div)"/.test(str)) rules.push("Flex/Group → row/column");
    if (/"type"\s*:\s*"Grid"/.test(str) && !/"ProductGrid"/.test(str)) rules.push("Grid Layout → column of rows");
    if (/"type"\s*:\s*"Heading"/.test(str)) rules.push("Heading → text");
    if (/"type"\s*:\s*"Text"/.test(str) || /"type"\s*:\s*"Paragraph"/.test(str)) rules.push("Text → text/richtext");
    if (/"type"\s*:\s*"Space"/.test(str)) rules.push("Space → sizedBox");
    if (/"type"\s*:\s*"Button"/.test(str)) rules.push("Button → button+tap");
    if (/"type"\s*:\s*"Link"/.test(str)) rules.push("Link → button (ghost)");
    if (/"type"\s*:\s*"Icon"/.test(str)) rules.push("Icon → icon (Lucide→Material)");
    if (/"type"\s*:\s*"Image"/.test(str)) rules.push("Image → image");
    if (/"type"\s*:\s*"Video"/.test(str)) rules.push("Video → videoPlayer");
    if (/"type"\s*:\s*"YouTube"/.test(str)) rules.push("YouTube → videoPlayer/fallback");
    if (/"type"\s*:\s*"Hero"/.test(str)) rules.push("Hero → stack/column composite");
    if (/"type"\s*:\s*"Card"/.test(str)) rules.push("Card → card");
    if (/"type"\s*:\s*"Badge"/.test(str)) rules.push("Badge → container+text");
    if (/"type"\s*:\s*"Divider"/.test(str)) rules.push("Divider → divider");
    if (/"type"\s*:\s*"ProductImage"/.test(str)) rules.push("ProductImage → image");
    if (/"type"\s*:\s*"ProductCard"/.test(str)) rules.push("ProductCard → card");
    if (/"type"\s*:\s*"ProductGrid"/.test(str)) rules.push("ProductGrid → gridView+API");
    if (/"type"\s*:\s*"ProductCarousel"/.test(str)) rules.push("ProductCarousel → listView");
    if (/"type"\s*:\s*"ProductDetails"/.test(str)) rules.push("ProductDetails → column");
    if (/"type"\s*:\s*"CartSection"/.test(str)) rules.push("Cart → listView+cart data");
    if (/"type"\s*:\s*"CartSummary"/.test(str)) rules.push("CartSummary → card");
    if (/"type"\s*:\s*"CheckoutForm"/.test(str)) rules.push("Checkout → form");
    if (/"type"\s*:\s*"CheckoutSummary"/.test(str)) rules.push("CheckoutSummary → card");
    if (/"type"\s*:\s*"OrderList"/.test(str)) rules.push("OrderList → listView");
    if (/"type"\s*:\s*"OrderDetails"/.test(str)) rules.push("OrderDetails → column");
    if (/"type"\s*:\s*"TestimonialCard"/.test(str)) rules.push("TestimonialCard → card");
    if (/"type"\s*:\s*"TestimonialGrid"/.test(str)) rules.push("TestimonialGrid → grid");
    if (/"type"\s*:\s*"Html"/.test(str)) rules.push("Html → stripped text");
    if (/"type"\s*:\s*"Countdown"/.test(str)) rules.push("Countdown → timer");
    if (/"type"\s*:\s*"CookieConsent"/.test(str)) rules.push("CookieConsent → banner");
    if (/"type"\s*:\s*"SearchModal"/.test(str)) rules.push("SearchModal → navigate /search");
    if (/"type"\s*:\s*"Logo"/.test(str)) rules.push("Logo → image");
    if (/"SiteHeader"/.test(str)) rules.push("SiteHeader → appBar");
    if (/"SiteFooter"/.test(str)) rules.push("SiteFooter → column");
  } catch {
    // ignore
  }
  return rules;
}

function getApplicableBadge(json: string): { label: string; color: string } | null {
  try {
    const parsed = JSON.parse(json);
    const type = parsed?.type as string | undefined;
    if (type && RULE_BADGES[type]) return RULE_BADGES[type];
    if (parsed?.path !== undefined) return { label: "Rule 1.1", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
  } catch {
    // ignore
  }
  return null;
}

export default function ConverterPage() {
  const [input, setInput] = useState(EXAMPLE_PRESETS[5].json);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [activePreset, setActivePreset] = useState(5);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [detectedRules, setDetectedRules] = useState<string[]>([]);

  const runTransform = useCallback((json: string) => {
    if (!json.trim()) {
      setOutput("");
      setError(null);
      setDetectedRules([]);
      return;
    }
    const result = transformWebToMobile(json);
    if (result.success) {
      setOutput(JSON.stringify(result.output, null, 2));
      setError(null);
      setDetectedRules(detectRules(json));
    } else {
      setOutput("");
      setError(result.error);
      setDetectedRules([]);
    }
  }, []);

  // Run on mount with default preset
  useEffect(() => {
    runTransform(EXAMPLE_PRESETS[5].json);
  }, [runTransform]);

  const handleInputChange = (value: string) => {
    setInput(value);
    setActivePreset(-1);
    runTransform(value);
  };

  const handlePresetSelect = (index: number) => {
    setActivePreset(index);
    setInput(EXAMPLE_PRESETS[index].json);
    runTransform(EXAMPLE_PRESETS[index].json);
    setPresetsOpen(false);
  };

  const handleReset = () => {
    handlePresetSelect(5);
    setActivePreset(5);
  };

  const handleCopyOutput = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const badge = getApplicableBadge(input);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-border bg-sidebar shrink-0">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </Link>
            <span className="text-border">/</span>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h1 className="text-sm font-semibold text-foreground">Web → Mobile Converter</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">SDUI Transformer</span>
            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium border border-accent/30">
              v1.0
            </span>
          </div>
        </div>
      </header>

      {/* Rule Detection Bar */}
      {detectedRules.length > 0 && (
        <div className="border-b border-border bg-card/50 px-4 md:px-6 py-2 flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">Detected rules:</span>
          {detectedRules.map((rule) => (
            <span
              key={rule}
              className="px-2 py-0.5 text-xs rounded border bg-primary/10 text-primary border-primary/20 font-mono"
            >
              {rule}
            </span>
          ))}
        </div>
      )}

      {/* Presets + Actions bar */}
      <div className="border-b border-border bg-card/30 px-4 md:px-6 py-2.5 flex items-center gap-2 shrink-0 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium shrink-0">Examples:</span>
        {/* Desktop: show all presets as pills */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {EXAMPLE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => handlePresetSelect(i)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md border transition-colors font-medium",
                activePreset === i
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* Mobile: dropdown */}
        <div className="md:hidden relative">
          <button
            onClick={() => setPresetsOpen(!presetsOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            {activePreset >= 0 ? EXAMPLE_PRESETS[activePreset].label : "Select example"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", presetsOpen && "rotate-180")} />
          </button>
          {presetsOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[200px]">
              {EXAMPLE_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetSelect(i)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs transition-colors",
                    activePreset === i
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {badge && (
            <span className={cn("px-2 py-0.5 text-xs rounded border font-mono hidden sm:inline", badge.color)}>
              {badge.label}
            </span>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* LEFT: Web JSON Input */}
        <div className="flex-1 flex flex-col min-h-[300px] md:min-h-0 border-b md:border-b-0 md:border-r border-border">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Web JSON Input</span>
            </div>
            <span className="text-xs text-muted-foreground">Paste or edit your web block structure</span>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              spellCheck={false}
              className={cn(
                "absolute inset-0 w-full h-full resize-none bg-transparent font-mono text-sm p-4 focus:outline-none text-foreground/90 leading-relaxed",
                error ? "bg-red-500/5" : ""
              )}
              placeholder={`Paste your web JSON here...\n\nExample:\n{\n  "type": "Section",\n  "props": {\n    "backgroundColor": "#FFFFFF",\n    "paddingTop": "24px",\n    "children": []\n  }\n}`}
            />
          </div>
          {error && (
            <div className="shrink-0 border-t border-red-500/30 bg-red-500/10 px-4 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400 font-mono">{error}</p>
            </div>
          )}
        </div>

        {/* Center Arrow (desktop) */}
        <div className="hidden md:flex items-center justify-center w-10 shrink-0 bg-card/20 border-r border-border">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-px bg-border" />
            <ArrowRight className="h-5 w-5 text-primary" />
            <div className="h-8 w-px bg-border" />
          </div>
        </div>

        {/* Center Arrow (mobile) */}
        <div className="md:hidden flex items-center justify-center h-10 shrink-0 bg-card/20 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-px bg-border" />
            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
            <div className="w-8 h-px bg-border" />
          </div>
        </div>

        {/* RIGHT: Mobile JSON Output */}
        <div className="flex-1 flex flex-col min-h-[300px] md:min-h-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Mobile SDUI Output</span>
            </div>
            <button
              onClick={handleCopyOutput}
              disabled={!output}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                output
                  ? "text-muted-foreground hover:text-foreground cursor-pointer"
                  : "text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              {copiedOutput ? (
                <>
                  <Check className="h-3.5 w-3.5 text-accent" />
                  <span className="text-accent">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy output</span>
                </>
              )}
            </button>
          </div>
          <div className="flex-1 relative overflow-auto">
            {output ? (
              <pre className="absolute inset-0 overflow-auto p-4 font-mono text-sm text-foreground/90 leading-relaxed">
                <OutputHighlight code={output} />
              </pre>
            ) : !error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Output will appear here</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Type or paste valid JSON in the left panel</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom: Rule Reference strip */}
      <div className="border-t border-border bg-card/30 px-4 md:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Block categories:</span>
          {[
            { label: "Layout", desc: "Section, Flex, Grid, Group", color: "text-blue-400" },
            { label: "Content", desc: "Heading, Text, Button, Image, Video, Icon, Hero, Card, Badge, Space, Divider, Link", color: "text-orange-400" },
            { label: "Commerce", desc: "ProductGrid, ProductCard, Cart, Checkout, Orders", color: "text-green-400" },
            { label: "Testimonial", desc: "TestimonialCard, TestimonialGrid", color: "text-pink-400" },
            { label: "Shell", desc: "SiteHeader, SiteFooter, Logo, Drawer", color: "text-neutral-400" },
            { label: "Utility", desc: "Html, Countdown, CookieConsent, SearchModal", color: "text-cyan-400" },
          ].map(({ label, desc, color }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs">
              <span className={cn("font-mono font-semibold", color)}>{label}</span>
              <span className="text-muted-foreground">{desc}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Lightweight JSON syntax highlighting ────────────────────────────────────
function OutputHighlight({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <div key={i}>
          <HighlightedLine line={line} />
          {"\n"}
        </div>
      ))}
    </>
  );
}

function HighlightedLine({ line }: { line: string }) {
  // Tokenize: strings, numbers, booleans, null, keys, punctuation
  const tokenRegex = /("(?:[^"\\]|\\.)*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:])/g;
  const parts: { text: string; type: string }[] = [];
  let last = 0;
  let match;
  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > last) {
      parts.push({ text: line.slice(last, match.index), type: "plain" });
    }
    const token = match[0];
    let type = "plain";
    if (token.endsWith(":")) type = "key";
    else if (token.startsWith('"')) type = "string";
    else if (token === "true" || token === "false") type = "boolean";
    else if (token === "null") type = "null";
    else if (/^-?\d/.test(token)) type = "number";
    else if (/[{}[\]]/.test(token)) type = "bracket";
    else if (token === "," || token === ":") type = "punct";
    parts.push({ text: token, type });
    last = match.index + token.length;
  }
  if (last < line.length) {
    parts.push({ text: line.slice(last), type: "plain" });
  }

  const colorMap: Record<string, string> = {
    key: "text-blue-300",
    string: "text-green-300",
    number: "text-orange-300",
    boolean: "text-purple-300",
    null: "text-red-300",
    bracket: "text-yellow-200/80",
    punct: "text-muted-foreground",
    plain: "text-foreground/50",
  };

  return (
    <>
      {parts.map((p, i) => (
        <span key={i} className={colorMap[p.type] ?? ""}>
          {p.text}
        </span>
      ))}
    </>
  );
}
