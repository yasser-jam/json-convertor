import { describe, it, expect } from "vitest";
import { transformWebToMobile, EXAMPLE_PRESETS, TransformResult } from "./transformer";

describe("transformWebToMobile", () => {
  describe("input validation", () => {
    it("rejects invalid JSON", () => {
      const result = transformWebToMobile("not json");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid JSON");
      }
    });

    it("rejects empty string", () => {
      const result = transformWebToMobile("");
      expect(result.success).toBe(false);
    });
  });

  describe("page shell (full envelope)", () => {
    const input = {
      path: "/test",
      label: "Test Page",
      rootProps: {
        direction: "rtl",
        language: "ar",
        primary: "#0b78c5",
        surface: "#f6f8fc",
        text: "#14243f",
        neutral: "#6b7d93",
        bodyFont: "dm-sans",
        headerBrandTitle: "Test Store",
      },
      blocks: [],
    };

    const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;

    it("returns success", () => {
      expect(result.success).toBe(true);
    });

    it("produces schemaVersion", () => {
      const output = result.output as Record<string, unknown>;
      expect(output.schemaVersion).toBe("1.0");
    });

    it("produces app config", () => {
      const output = result.output as Record<string, unknown>;
      const app = output.app as Record<string, unknown>;
      expect(app.name).toBe("SOOQ Merchant Mobile");
      expect(app.bundleId).toBe("com.sooq.merchant.mobile");
    });

    it("produces theme with colors from rootProps", () => {
      const output = result.output as Record<string, unknown>;
      const theme = output.theme as Record<string, unknown>;
      const colors = theme.colors as Record<string, unknown>;
      expect(colors.primary).toBe("#0b78c5");
      expect(colors.surface).toBe("#f6f8fc");
    });

    it("produces navigation", () => {
      const output = result.output as Record<string, unknown>;
      const nav = output.navigation as Record<string, unknown>;
      expect(nav.type).toBe("tabs");
    });

    it("produces pages array", () => {
      const output = result.output as Record<string, unknown>;
      const pages = output.pages as Record<string, unknown>[];
      expect(pages).toHaveLength(1);
    });

    it("page has correct route and title", () => {
      const output = result.output as Record<string, unknown>;
      const pages = output.pages as Record<string, unknown>[];
      const page = pages[0];
      expect(page.route).toBe("/test");
      expect(page.title).toBe("Test Page");
    });

    it("page has appBar", () => {
      const output = result.output as Record<string, unknown>;
      const pages = output.pages as Record<string, unknown>[];
      const page = pages[0] as Record<string, unknown>;
      const appBar = page.appBar as Record<string, unknown>;
      expect(appBar).toBeDefined();
      expect(appBar.type).toBe("appBar");
      expect((appBar.props as Record<string, unknown>).title).toBe("Test Store");
    });

    it("page has empty body for no blocks", () => {
      const output = result.output as Record<string, unknown>;
      const pages = output.pages as Record<string, unknown>[];
      const page = pages[0] as Record<string, unknown>;
      const body = page.body as Record<string, unknown>[];
      expect(body).toHaveLength(0);
    });
  });

  describe("block: Section", () => {
    const input = {
      path: "/section-test",
      label: "Section Test",
      rootProps: { language: "en", direction: "ltr", primary: "#000" },
      blocks: [
        {
          type: "Section",
          props: {
            backgroundColor: "#f0f0f0",
            paddingTop: "16px",
            paddingBottom: "16px",
            content: [],
          },
        },
      ],
    };

    it("wraps section in container with column", () => {
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      expect(body).toHaveLength(1);
      const container = body[0];
      expect(container.type).toBe("container");
      expect((container.props as Record<string, unknown>).color).toBe("#f0f0f0");
      expect((container.child as Record<string, unknown>).type).toBe("column");
    });
  });

  describe("block: Heading", () => {
    const input = {
      path: "/heading-test",
      label: "Heading Test",
      rootProps: { language: "en", direction: "ltr", primary: "#000" },
      blocks: [
        {
          type: "Section",
          props: {
            paddingTop: "16px",
            paddingBottom: "16px",
            content: [
              {
                type: "Heading",
                props: { text: "Hello World", level: "h1", align: "center" },
              },
            ],
          },
        },
      ],
    };

    it("converts heading to text with correct fontSize", () => {
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const children = (body[0].child as Record<string, unknown>).children as Record<string, unknown>[];
      const heading = children[0];
      expect(heading.type).toBe("text");
      expect((heading.props as Record<string, unknown>).value).toBe("Hello World");
      expect((heading.props as Record<string, unknown>).fontSize).toBe(28); // h1
      expect((heading.props as Record<string, unknown>).textAlign).toBe("center");
    });
  });

  describe("block: Button", () => {
    it("converts button with href to navigate tap", () => {
      const input = {
        path: "/btn-test",
        label: "Button Test",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Button", props: { text: "Click", href: "/next", variant: "primary" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const btn = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(btn.type).toBe("button");
      expect((btn.tap as Record<string, unknown>).type).toBe("navigate");
    });

    it("uses Arabic label when language=ar", () => {
      const input = {
        path: "/btn-ar",
        label: "AR",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Button", props: { text: "Shop", labelAr: "تسوق", href: "/shop" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const btn = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect((btn.props as Record<string, unknown>).label).toBe("تسوق");
    });
  });

  describe("block: Link", () => {
    it("converts link to text variant button", () => {
      const input = {
        path: "/link-test",
        label: "Link Test",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Link", props: { text: "About", href: "/about" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const link = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(link.type).toBe("button");
      expect((link.props as Record<string, unknown>).variant).toBe("text");
    });
  });

  describe("block: Icon", () => {
    it("maps Lucide truck to Material local_shipping", () => {
      const input = {
        path: "/icon-test",
        label: "Icon Test",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Icon", props: { name: "truck", size: 24, color: "#ff0000" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const icon = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(icon.type).toBe("icon");
      expect((icon.props as Record<string, unknown>).name).toBe("local_shipping");
    });
  });

  describe("block: Image", () => {
    it("converts image with aspect ratio", () => {
      const input = {
        path: "/img-test",
        label: "Img",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Image", props: { src: "https://example.com/img.png", width: 600, height: 300 } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const img = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(img.type).toBe("image");
      expect((img.props as Record<string, unknown>).aspectRatio).toBe(2);
    });
  });

  describe("block: Video", () => {
    it("converts to videoPlayer", () => {
      const input = {
        path: "/vid-test",
        label: "Vid",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Video", props: { src: "https://example.com/v.mp4", controls: true } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const vid = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(vid.type).toBe("videoPlayer");
    });
  });

  describe("block: YouTube", () => {
    it("converts YouTube URL to thumbnail image with openUrl tap", () => {
      const input = {
        path: "/yt-test",
        label: "YT",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "YouTube", props: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const yt = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(yt.type).toBe("image");
      expect((yt.props as Record<string, unknown>).url).toContain("img.youtube.com/vi/dQw4w9WgXcQ");
      expect((yt.tap as Record<string, unknown>).type).toBe("openUrl");
    });
  });

  describe("block: Hero", () => {
    it("produces stack with background image and column overlay", () => {
      const input = {
        path: "/hero-test",
        label: "Hero",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              {
                type: "Hero",
                props: {
                  variant: "background",
                  title: "Big Sale",
                  backgroundImage: "https://example.com/bg.jpg",
                  height: "300px",
                  buttons: [{ text: "Shop", href: "/shop" }],
                },
              },
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const heroStack = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(heroStack.type).toBe("stack");
      const stackChildren = heroStack.children as Record<string, unknown>[];
      expect(stackChildren[0].type).toBe("image");
      expect(stackChildren[1].type).toBe("column");
      expect((stackChildren[1].props as Record<string, unknown>).height).toBe(300);
    });
  });

  describe("block: Card", () => {
    it("produces card with column child", () => {
      const input = {
        path: "/card-test",
        label: "Card",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Card", props: { elevation: 3, padding: 20, content: [] } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const card = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(card.type).toBe("card");
      expect((card.props as Record<string, unknown>).elevation).toBe(3);
      expect((card.child as Record<string, unknown>).type).toBe("column");
    });
  });

  describe("block: Divider", () => {
    it("converts to divider type", () => {
      const input = {
        path: "/div-test",
        label: "Div",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Divider", props: { color: "#ccc", thickness: 2 } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const div = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(div.type).toBe("divider");
    });
  });

  describe("block: Badge", () => {
    it("converts to container with text", () => {
      const input = {
        path: "/badge-test",
        label: "Badge",
        rootProps: { language: "en", direction: "ltr", primary: "#ff0000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Badge", props: { text: "SALE", variant: "primary", size: "small" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const badge = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(badge.type).toBe("container");
      expect((badge.child as Record<string, unknown>).type).toBe("text");
      expect(((badge.child as Record<string, unknown>).props as Record<string, unknown>).value).toBe("SALE");
    });
  });

  describe("block: SiteHeader", () => {
    it("is stripped from body and converted to appBar", () => {
      const input = {
        path: "/header-test",
        label: "Header Test",
        rootProps: { language: "en", direction: "ltr", primary: "#000", headerBrandTitle: "My Store" },
        blocks: [
          { type: "SiteHeader" },
          { type: "Section", props: { paddingTop: "0", paddingBottom: "0", content: [] } },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const page = (output.pages as Record<string, unknown>[])[0];
      const body = page.body as Record<string, unknown>[];
      const appBar = page.appBar as Record<string, unknown>;

      expect(body).toHaveLength(1); // SiteHeader removed
      expect(body[0].type).toBe("container");
      expect(appBar).toBeDefined();
      expect((appBar.props as Record<string, unknown>).title).toBe("My Store");
    });
  });

  describe("block: SiteFooter", () => {
    it("is stripped from body and placed on page footer", () => {
      const input = {
        path: "/footer-test",
        label: "Footer Test",
        rootProps: {
          language: "en",
          direction: "ltr",
          primary: "#000",
          footerVisible: true,
          footerTagline: "Thanks for visiting",
        },
        blocks: [
          { type: "SiteFooter" },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const page = (output.pages as Record<string, unknown>[])[0];
      const body = page.body as Record<string, unknown>[];

      expect(body).toHaveLength(0);
      expect(page.footer).toBeDefined();
      expect((page.footer as Record<string, unknown>).type).toBe("container");
    });

    it("returns null when footerVisible is false", () => {
      const input = {
        path: "/footer-hidden",
        label: "Hidden",
        rootProps: { language: "en", direction: "ltr", primary: "#000", footerVisible: false },
        blocks: [{ type: "SiteFooter" }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      expect(body).toHaveLength(0);
    });
  });

  describe("block: Flex", () => {
    it("converts to row or column based on direction", () => {
      const input = {
        path: "/flex-test",
        label: "Flex",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Flex", props: { direction: "row", gap: 8, items: [
                { type: "Text", props: { text: "A" } },
                { type: "Text", props: { text: "B" } },
              ]}}
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const flex = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(flex.type).toBe("row");
    });
  });

  describe("block: Grid (non-commerce)", () => {
    it("converts to gridView", () => {
      const input = {
        path: "/grid-test",
        label: "Grid",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Grid", props: { numColumns: 2, gap: 8, items: [
                { type: "Text", props: { text: "1" } },
                { type: "Text", props: { text: "2" } },
                { type: "Text", props: { text: "3" } },
              ]}}
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const gridNode = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0] as Record<string, unknown>;
      expect(gridNode.type).toBe("gridView");
      expect((gridNode.props as Record<string, unknown>).crossAxisCount).toBe(2);
      expect((gridNode.children as Record<string, unknown>[])).toHaveLength(3);
    });
  });

  describe("block: ProductGrid", () => {
    it("creates gridView with API data binding", () => {
      const input = {
        path: "/products",
        label: "Products",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "ProductGrid", props: { collection: "all", columns: "2", gap: 16 } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const gridView = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(gridView.type).toBe("gridView");
      expect((gridView.itemBuilder as Record<string, unknown>).type).toBe("repeat");
      expect((gridView.props as Record<string, unknown>).requestUrl).toContain("/api/v1/public/products");
    });
  });

  describe("block: ProductCard", () => {
    it("creates card with image, title, price", () => {
      const input = {
        path: "/pcard-test",
        label: "PCard",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "ProductCard", props: { layout: "vertical", title: "Widget", price: "19.99", image: "https://example.com/w.png" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const card = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(card.type).toBe("card");
      expect((card.child as Record<string, unknown>).type).toBe("column");
    });
  });

  describe("block: CheckoutForm", () => {
    it("creates address form with textFormField, switchField, and map picker", () => {
      const input = {
        path: "/checkout/address",
        label: "Address",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              {
                type: "CheckoutForm",
                props: {
                  fields: [
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "name", label: "Name", type: "text", required: false },
                    { name: "isDefault", label: "Set as default", type: "boolean" },
                  ],
                  submitLabel: "Save",
                  submissionAction: { type: "cubitCall", method: "checkout", params: {} },
                },
              }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const form = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(form.type).toBe("form");
      const formCol = form.child as Record<string, unknown>;
      const children = formCol.children as Record<string, unknown>[];
      const fields = children.filter((c) => c.type === "textFormField");
      expect(fields).toHaveLength(1);
      expect((fields[0].props as Record<string, unknown>).id).toBe("name");

      const switchField = children.find((c) => c.type === "switchField");
      expect(switchField).toBeDefined();
      expect((switchField!.props as Record<string, unknown>).id).toBe("isDefault");

      const mapBtn = children.find((c) => c.type === "button" && (c.tap as Record<string, unknown>)?.method === "pickAddressLocation");
      expect(mapBtn).toBeDefined();

      expect(result.warnings?.some((w) => w.includes("guest email"))).toBe(true);

      const submitBtn = children.find((c) => c.type === "button" && (c.tap as Record<string, unknown>)?.method !== "pickAddressLocation");
      expect(submitBtn).toBeDefined();
      expect((submitBtn!.tap as Record<string, unknown>).type).toBe("cubitCall");
    });
  });

  describe("block: Countdown", () => {
    it("creates column with timer", () => {
      const input = {
        path: "/countdown",
        label: "CD",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Countdown", props: { endDate: "2026-12-31T00:00:00Z", title: "Ends in" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const countdown = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(countdown.type).toBe("column");
      const allChildren = JSON.stringify(countdown);
      expect(allChildren).toContain('"type":"timer"');
    });
  });

  describe("block: Html", () => {
    it("strips HTML tags and creates text", () => {
      const input = {
        path: "/html-test",
        label: "HTML",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Html", props: { html: "<p>Hello <strong>World</strong></p>" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const htmlNode = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(htmlNode.type).toBe("text");
      expect((htmlNode.props as Record<string, unknown>).value).toBe("Hello World");
    });
  });

  describe("block: SearchModal", () => {
    it("creates a ghost button navigating to /search", () => {
      const input = {
        path: "/search-test",
        label: "Search",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "SearchModal", props: { action: "/search" } }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const btn = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(btn.type).toBe("button");
      expect((btn.tap as Record<string, unknown>).route).toBe("/search");
    });
  });

  describe("block: TestimonialGrid", () => {
    it("creates row of cards with quotes", () => {
      const input = {
        path: "/testimonials",
        label: "Testimonials",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              {
                type: "TestimonialGrid",
                props: {
                  columns: "2",
                  testimonials: [
                    { quote: "Great!", author: "John", rating: 5 },
                    { quote: "Awesome!", author: "Jane", rating: 4 },
                  ],
                },
              }
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const gridWrapper = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(gridWrapper.type).toBe("column");
      const row = (gridWrapper.children as Record<string, unknown>[])[0];
      expect(row.type).toBe("row");
      const cards = row.children as Record<string, unknown>[];
      expect(cards.length).toBeGreaterThanOrEqual(1);
      expect((cards[0].child as Record<string, unknown>).type).toBe("card");
    });
  });

  describe("block: Group/FlexGroup/Div", () => {
    const types = ["Group", "FlexGroup", "Div"];
    types.forEach((type) => {
      it(`converts ${type} to row/column`, () => {
        const input = {
          path: "/group-test",
          label: "Group",
          rootProps: { language: "en", direction: "ltr", primary: "#000" },
          blocks: [
            {
              type: "Section",
              props: { paddingTop: "0", paddingBottom: "0", content: [
                { type, props: { direction: "column", gap: 8, items: [
                  { type: "Text", props: { text: "A" } },
                ]}}
              ]},
            },
          ],
        };
        const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
        const output = result.output as Record<string, unknown>;
        const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
        const group = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
        expect(group.type).toBe("column");
      });
    });
  });

  describe("bilingual behavior", () => {
    it("uses Arabic text when language=ar", () => {
      const input = {
        path: "/bilingual",
        label: "Bi",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Heading", props: { text: "Hello", textAr: "مرحباً", level: "h2" } },
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const heading = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect((heading.props as Record<string, unknown>).value).toBe("مرحباً");
    });

    it("uses English text when language=en", () => {
      const input = {
        path: "/bilingual-en",
        label: "Bi EN",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Heading", props: { text: "Hello", textAr: "مرحباً", level: "h2" } },
            ]},
          },
        ],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const heading = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect((heading.props as Record<string, unknown>).value).toBe("Hello");
    });
  });

  describe("array input", () => {
    it("handles array of pages", () => {
      const input = [
        { path: "/page1", label: "Page 1", rootProps: { language: "en", direction: "ltr", primary: "#000" }, blocks: [] },
        { path: "/page2", label: "Page 2", rootProps: { language: "en", direction: "ltr", primary: "#000" }, blocks: [] },
      ];
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      expect((output.pages as Record<string, unknown>[])).toHaveLength(2);
    });

    it("handles array of blocks (no path)", () => {
      const input = [
        { type: "Text", props: { text: "Hello" } },
        { type: "Text", props: { text: "World" } },
      ];
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as unknown[];
      expect(output).toHaveLength(2);
      expect((output[0] as Record<string, unknown>).type).toBe("text");
    });
  });

  describe("example presets", () => {
    it("all presets produce successful output", () => {
      for (const preset of EXAMPLE_PRESETS) {
        const result = transformWebToMobile(preset.json);
        expect(result.success).toBe(true);
      }
    });

    it("exposes exactly one non-legacy preset — the canonical mobile example", () => {
      const current = EXAMPLE_PRESETS.filter((p) => !p.legacy);
      expect(current).toHaveLength(1);
      expect(current[0]).toBe(EXAMPLE_PRESETS[0]);
      expect(current[0].label).toContain("3 pages");
    });

    it("gives every legacy preset a reason", () => {
      for (const preset of EXAMPLE_PRESETS.filter((p) => p.legacy)) {
        expect(preset.legacyReason, preset.label).toBeTruthy();
      }
    });

    describe("canonical 3-page mobile example", () => {
      const result = transformWebToMobile(EXAMPLE_PRESETS[0].json) as Extract<TransformResult, { success: true }>;
      const pages = (result.output as Record<string, unknown>).pages as Record<string, unknown>[];
      const page = (route: string) => pages.find((p) => p.route === route) as Record<string, unknown>;

      it("converts with no warnings", () => {
        expect(result.warnings ?? []).toEqual([]);
      });

      it("uses only blocks from the mobile block set", () => {
        // docs/BLOCKS-MOBILE.md — anything outside this list must not appear in the example.
        const MOBILE_BLOCK_SET = new Set([
          "Accordion", "Blank", "ButtonGroup", "Chip", "ContentButton", "ContentDivider",
          "ContentHeading", "ContentIcon", "ContentImage", "ContentInput", "ContentLink",
          "ContentParagraph", "ContentSwitch", "Flex", "Grid", "Group", "ImageGallery",
          "Section", "Testimonials", "VideoEmbed", "ZoneDrawer", "ZoneBottomSheet",
        ]);
        const seen = new Set<string>();
        const walk = (node: unknown): void => {
          if (Array.isArray(node)) return node.forEach(walk);
          if (!node || typeof node !== "object") return;
          const obj = node as Record<string, unknown>;
          if (typeof obj.type === "string") seen.add(obj.type);
          Object.values(obj).forEach(walk);
        };
        walk(JSON.parse(EXAMPLE_PRESETS[0].json));
        const offenders = [...seen].filter((t) => !MOBILE_BLOCK_SET.has(t));
        expect(offenders).toEqual([]);
      });

      it("emits the three expected routes with / normalized to /home", () => {
        expect(pages.map((p) => p.route)).toEqual(["/home", "/login", "/products"]);
      });

      it("excludes the two non-tab routes from the navigation shell", () => {
        const nav = (result.output as Record<string, unknown>).navigation as Record<string, unknown>;
        const excluded = nav.shellExcludeRoutes as string[];
        expect(excluded).toContain("/login");
        expect(excluded).toContain("/products");
        expect(excluded).not.toContain("/home");
      });

      it("gives every page the appDrawer from the ZoneDrawer site zone", () => {
        for (const p of pages) {
          expect(p.appDrawer, p.route as string).toBeDefined();
          const appBar = p.appBar as Record<string, unknown>;
          expect((appBar.props as Record<string, unknown>).showMenu).toBe(true);
        }
      });

      it("home page body is static — no requests, taps or bound paths", () => {
        const json = JSON.stringify(page("/home").body);
        expect(json).not.toContain("requestUrl");
        expect(json).not.toContain("cubitCall");
        expect(json).not.toContain("valuePath");
        expect(json).not.toContain("urlPath");
      });

      it("login page wraps its fields in a form that the login button submits", () => {
        const p = page("/login");
        expect(p.scroll).toBe("none");
        const section = (p.body as Record<string, unknown>[])[0];
        const form = section.child as Record<string, unknown>;
        expect(form.type).toBe("form");
        expect(form.props).toMatchObject({ formId: "login-form", id: "login-form" });

        const children = (form.child as Record<string, unknown>).children as Record<string, unknown>[];
        const button = children.find((c) => c.type === "button" && (c.props as Record<string, unknown>).label === "دخول")!;
        expect(button.tap).toEqual({
          type: "cubitCall",
          cubit: "auth",
          method: "login",
          requireValidForm: true,
          formId: "login-form",
          params: {
            phone: { source: "form", field: "phone" },
            password: { source: "form", field: "password" },
          },
          onSuccess: { type: "navigate", route: "/home", navigation_type: "go" },
        });
      });

      it("login page emits ltr obscured password and a switchField", () => {
        const form = ((page("/login").body as Record<string, unknown>[])[0].child as Record<string, unknown>);
        const children = (form.child as Record<string, unknown>).children as Record<string, unknown>[];
        const password = children.find((c) => (c.props as Record<string, unknown>).id === "password")!;
        expect(password.type).toBe("textFormField");
        expect(password.props).toMatchObject({ obscureText: true, textDirection: "ltr" });

        const remember = children.find((c) => c.type === "switchField")!;
        expect(remember.props).toMatchObject({ id: "rememberMe", label: "تذكّرني" });
      });

      it("products page converts the card template to a bound gridView", () => {
        const grid = ((page("/products").body as Record<string, unknown>[])[1].child as Record<string, unknown>);
        expect(grid.type).toBe("gridView");
        expect(grid.props).toMatchObject({
          crossAxisCount: 2, // columnsMobile wins over columns: 3
          requestKey: "product-list",
          requestUrl: "/api/v1/public/collections/coll_featured/products?page=0&size=20",
        });
        const item = (grid.itemBuilder as Record<string, unknown>).item as Record<string, unknown>;
        const cardChildren = (item.child as Record<string, unknown>).children as Record<string, unknown>[];
        expect((cardChildren[0].props as Record<string, unknown>).urlPath).toBe("item.primaryImageUrl");
        expect((cardChildren[1].props as Record<string, unknown>).valuePath).toBe("item.name");
        expect((cardChildren[2].props as Record<string, unknown>).valuePath).toBe("item.price");
        expect(cardChildren[3].tap).toEqual({ type: "cubitCall", cubit: "cart", method: "addItem" });
      });
    });
  });

  describe("ContentSwitch → switchField", () => {
    const convert = (props: Record<string, unknown>) => {
      const result = transformWebToMobile(JSON.stringify({
        path: "/t",
        rootProps: { direction: "rtl", language: "ar", primary: "#0b78c5" },
        blocks: [{ type: "ContentSwitch", props }],
      })) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      return { node: body[0], warnings: result.warnings ?? [] };
    };

    it("maps name to the form field id and themes the active colour", () => {
      const { node } = convert({ label: "تذكّرني", name: "rememberMe" });
      expect(node.type).toBe("switchField");
      expect(node.props).toEqual({ id: "rememberMe", label: "تذكّرني", activeColor: "#0b78c5" });
    });

    it("stores defaultChecked as a string, and omits it when false", () => {
      expect((convert({ name: "a", defaultChecked: true }).node.props as Record<string, unknown>).value).toBe("true");
      expect((convert({ name: "a", defaultChecked: false }).node.props as Record<string, unknown>)).not.toHaveProperty("value");
    });

    it("warns that a bound switchAction is not wired", () => {
      const { warnings } = convert({ name: "in-stock-only", switchAction: "filter_in_stock_only" });
      expect(warnings.join(" ")).toContain("filter_in_stock_only");
    });

    it("warns that helperText is dropped", () => {
      const { node, warnings } = convert({ name: "a", helperText: "hint" });
      expect(node.props).not.toHaveProperty("helperText");
      expect(warnings.join(" ")).toContain("helperText");
    });
  });

  describe("auth form detection", () => {
    const loginPage = (content: Record<string, unknown>[]) =>
      transformWebToMobile(JSON.stringify({
        path: "/login",
        rootProps: { direction: "rtl", language: "ar", primary: "#0b78c5" },
        blocks: [{ type: "Section", props: { content } }],
      })) as Extract<TransformResult, { success: true }>;

    const sectionChild = (result: Extract<TransformResult, { success: true }>) => {
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      return (body[0] as Record<string, unknown>).child as Record<string, unknown>;
    };

    it("falls back to the navigate stub when the login button has no sibling inputs", () => {
      const result = loginPage([
        { type: "ContentButton", props: { label: "دخول", destinationType: "action", buttonAction: "login" } },
      ]);
      const child = sectionChild(result);
      expect(child.type).toBe("column");
      const button = (child.children as Record<string, unknown>[])[0];
      expect(button.tap).toEqual({ type: "navigate", route: "/auth/login", navigation_type: "push" });
    });

    it("does not wrap inputs in a form when no auth button is present", () => {
      const result = loginPage([
        { type: "ContentInput", props: { label: "الاسم", name: "name" } },
      ]);
      expect(sectionChild(result).type).toBe("column");
    });

    it("excludes rememberMe and password confirmations from the submitted params", () => {
      const result = loginPage([
        { type: "ContentInput", props: { name: "phone", inputType: "tel" } },
        { type: "ContentInput", props: { name: "password", inputType: "password" } },
        { type: "ContentInput", props: { name: "passwordConfirm", inputType: "password" } },
        { type: "ContentSwitch", props: { name: "rememberMe" } },
        { type: "ContentButton", props: { label: "دخول", destinationType: "action", buttonAction: "login" } },
      ]);
      const form = sectionChild(result);
      const children = (form.child as Record<string, unknown>).children as Record<string, unknown>[];
      const tap = children.find((c) => c.type === "button")!.tap as Record<string, unknown>;
      expect(Object.keys(tap.params as Record<string, unknown>)).toEqual(["phone", "password"]);
    });

    it("keeps each Section's form scope separate", () => {
      const result = transformWebToMobile(JSON.stringify({
        path: "/login",
        rootProps: { direction: "rtl", language: "ar", primary: "#0b78c5" },
        blocks: [
          {
            type: "Section",
            props: {
              content: [
                { type: "ContentInput", props: { name: "phone", inputType: "tel" } },
                { type: "ContentButton", props: { label: "دخول", destinationType: "action", buttonAction: "login" } },
              ],
            },
          },
          // A second Section with a lone input must not be pulled into the form above.
          { type: "Section", props: { content: [{ type: "ContentInput", props: { name: "newsletter" } }] } },
        ],
      })) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      expect((body[0].child as Record<string, unknown>).type).toBe("form");
      expect((body[1].child as Record<string, unknown>).type).toBe("column");

      const children = ((body[0].child as Record<string, unknown>).child as Record<string, unknown>).children as Record<string, unknown>[];
      const tap = children.find((c) => c.type === "button")!.tap as Record<string, unknown>;
      expect(Object.keys(tap.params as Record<string, unknown>)).toEqual(["phone"]);
    });
  });

  describe("single block input (no path or blocks)", () => {
    it("converts a single block", () => {
      const input = { type: "Heading", props: { text: "Hello", level: "h2" } };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const output = result.output as Record<string, unknown>;
      expect(output.type).toBe("text");
    });

    it("returns error for unsupported single block", () => {
      const input = { type: "NonExistent123", props: {} };
      const result = transformWebToMobile(JSON.stringify(input));
      expect(result.success).toBe(false);
    });
  });

  describe("BLOCKS.md type aliases and new blocks", () => {
    const pageShell = (blocks: Record<string, unknown>[]) => ({
      path: "/blocks-test",
      label: "Blocks Test",
      rootProps: { language: "ar", direction: "rtl", primary: "#0b78c5", neutral: "#6b7d93", radiusMd: "12px" },
      blocks: [{ type: "Section", props: { paddingTop: "0", paddingBottom: "0", content: blocks } }],
    });

    it("converts ContentImage", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ContentImage", props: { src: "https://example.com/a.jpg", alt: "A", radius: "theme-md" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const img = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(img.type).toBe("image");
      expect((img.props as Record<string, unknown>).url).toBe("https://example.com/a.jpg");
    });

    it("converts ContentParagraph with theme color token", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ContentParagraph", props: { text: "مرحباً", fontSize: "theme-sm", color: "theme-neutral" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const text = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(text.type).toBe("text");
      expect((text.props as Record<string, unknown>).fontSize).toBe(14);
      expect((text.props as Record<string, unknown>).color).toBe("#6b7d93");
    });

    it("converts VideoEmbed YouTube URL to thumbnail image with openUrl tap", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "VideoEmbed", props: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", size: "theme-315" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const vid = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(vid.type).toBe("image");
      expect((vid.props as Record<string, unknown>).url).toContain("img.youtube.com");
      expect((vid.tap as Record<string, unknown>).type).toBe("openUrl");
    });

    it("converts ProductsGrid with collection and maxRows", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ProductsGrid", props: { collection: "featured", columns: "2", maxRows: "4", gap: "md", cardVariant: "compact" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const grid = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(grid.type).toBe("gridView");
      expect((grid.props as Record<string, unknown>).requestUrl).toContain("/api/v1/public/collections/featured/products");
    });

    it("converts Testimonials block from inlineItems", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        {
          type: "Testimonials",
          props: {
            source: "inline",
            layoutVariant: "grid",
            columns: 2,
            inlineItems: [{ id: "1", nameAr: "سارة", textAr: "رائع", roleAr: "زبونة", rating: 5 }],
          },
        },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const grid = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(grid.type).toBe("column");
    });

    it("converts ImageGallery grid mode", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        {
          type: "ImageGallery",
          props: {
            mode: "grid",
            gridColumns: 2,
            images: [{ src: "https://example.com/1.jpg", alt: "1" }, { src: "https://example.com/2.jpg", alt: "2" }],
          },
        },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const gallery = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(gallery.type).toBe("gridView");
      expect((gallery.props as Record<string, unknown>).crossAxisCount).toBe(2);
    });

    it("converts Sidebar to inline column with dock warning", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "Sidebar", props: { title: { ar: "قائمة", en: "Menu" }, dock: "left" } },
      ])));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings?.some((w) => w.includes("dock"))).toBe(true);
        const body = (result.output as Record<string, unknown>).pages as Record<string, unknown>[];
        const sidebar = (((body[0].body as Record<string, unknown>[])[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
        expect(sidebar.type).toBe("column");
      }
    });
  });

  describe("BLOCKS.md commerce and engine features", () => {
    it("omits button height for md size", () => {
      const input = {
        path: "/btn-md",
        label: "Btn",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [{
          type: "Section",
          props: { paddingTop: "0", paddingBottom: "0", content: [
            { type: "Button", props: { label: "Go", size: "md", href: "/x" } },
          ]},
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const btn = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect((btn.props as Record<string, unknown>).height).toBeUndefined();
    });

    it("binds a product Group to its own request and maps child valueContext to it", () => {
      const input = {
        path: "/vc",
        label: "VC",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: { paddingTop: "0", paddingBottom: "0", content: [{
            type: "Group",
            props: {
              product: { id: "p1", titleAr: "قميص", slug: "classic-shirt" },
              metadata: { type: "product", method: "get", id: "p1", apiUrl: "https://api.example.com/admin/products/classic-shirt?include=PRICING" },
              content: [{
                type: "ContentHeading",
                props: { text: "fallback", valueContext: { path: "product.title" } },
              }],
            },
          }]},
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const bound = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      const boundProps = bound.props as Record<string, unknown>;
      expect(boundProps.requestKey).toBe("product-p1");
      expect(boundProps.requestUrl).toBe("/api/v1/public/products/classic-shirt?include=PRICING");
      const heading = ((bound.child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect((heading.props as Record<string, unknown>).valuePath).toBe("dataContext.requests.product-p1.data.name");
    });

    it("falls back to a public product path when a bound Group has no metadata", () => {
      const input = {
        path: "/vc2",
        label: "VC2",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: { paddingTop: "0", paddingBottom: "0", content: [{
            type: "Group",
            props: { product: { id: "p9", slug: "hat" }, content: [] },
          }]},
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const bound = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect((bound.props as Record<string, unknown>).requestUrl).toBe("/api/v1/public/products/hat");
    });

    it("maps makeOrder button to page footer", () => {
      const input = {
        path: "/cart",
        label: "Cart",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: {
            metadata: { preset: "shopping-cart" },
            content: [{
              type: "ContentButton",
              props: {
                label: "إتمام الطلب",
                destinationType: "action",
                buttonAction: "makeOrder",
              },
            }],
          },
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const page = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0];
      expect(page.footer).toBeDefined();
      expect(((page.footer as Record<string, unknown>).child as Record<string, unknown>).type).toBe("button");
    });

    it("converts RowGroup to row layout", () => {
      const input = {
        path: "/rowgroup",
        label: "RG",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [{
          type: "Section",
          props: { paddingTop: "0", paddingBottom: "0", content: [{
            type: "RowGroup",
            props: { content: [{ type: "Text", props: { text: "A" } }] },
          }]},
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const row = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(row.type).toBe("row");
    });

    it("maps cartQtyIncrease to cubitCall updateQuantity", () => {
      const input = {
        path: "/cart-qty",
        label: "Qty",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [{
          type: "Section",
          props: { paddingTop: "0", paddingBottom: "0", content: [{
            type: "ContentButton",
            props: { label: "+", destinationType: "action", buttonAction: "cartQtyIncrease" },
          }]},
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const btn = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      const tap = btn.tap as Record<string, unknown>;
      expect(tap.method).toBe("updateQuantity");
      expect((tap.params as Record<string, unknown>).variantId).toEqual({ source: "item", field: "variantId" });
      expect((tap.params as Record<string, unknown>).delta).toEqual({ source: "value", value: 1 });
    });
  });

  describe("SiteData envelope (root + zones + pages)", () => {
    const site = {
      root: { props: { direction: "rtl", language: "ar", primary: "#0b78c5", surface: "#f6f8fc" } },
      zones: {
        "root:zone-header": [{
          type: "SiteHeader",
          props: {
            title: "متجري",
            visible: true,
            showDrawerButton: true,
            drawerName: "site-drawer",
            backgroundColor: "#ffffff",
            textColor: "#0f172a",
            rightSlot: [{ type: "CartIconButton", props: {} }],
          },
        }],
        "root:zone-footer": [{
          type: "SiteFooter",
          props: {
            visible: true,
            taglineAr: "متجرك الشامل.",
            columns: [{
              titleAr: "التسوق",
              links: [{ labelAr: "المنتجات", link: { kind: "page", pageId: "/products" } }],
            }],
          },
        }],
        // legacy colon-separated alias — must canonicalise to zone-drawer
        "root:zone:drawer": [{
          type: "ZoneDrawer",
          props: {
            is_active: true,
            key: "site-drawer",
            side: "right",
            backgroundColor: "#fefefe",
            slot: [{ type: "ContentHeading", props: { text: "القائمة" } }],
          },
        }],
        "root:zone-popup": [{
          type: "ZonePopup",
          props: {
            is_active: true,
            key: "login",
            slot: [{ type: "ContentHeading", props: { text: "تسجيل الدخول" } }],
          },
        }],
      },
      pages: [
        {
          path: "/",
          slug: "/",
          name: "الرئيسية",
          content: [{
            type: "Section",
            props: {
              paddingTop: "0", paddingBottom: "0",
              content: [{
                type: "ContentButton",
                props: { label: "دخول", destinationType: "zone", zoneKey: "login", zoneAction: "open" },
              }],
            },
          }],
        },
        { path: "/about", name: "من نحن", content: [] },
      ],
    };

    const result = transformWebToMobile(JSON.stringify(site)) as Extract<TransformResult, { success: true }>;
    const output = result.output as Record<string, unknown>;
    const pages = output.pages as Record<string, unknown>[];

    it("converts every page in SiteData.pages", () => {
      expect(result.success).toBe(true);
      expect(pages).toHaveLength(2);
      expect(pages[0].route).toBe("/home");
      expect(pages[1].route).toBe("/about");
    });

    it("reads theme from root.props", () => {
      const colors = (output.theme as Record<string, unknown>).colors as Record<string, unknown>;
      expect(colors.primary).toBe("#0b78c5");
    });

    it("builds appBar from SiteHeader block props", () => {
      const appBarProps = (pages[0].appBar as Record<string, unknown>).props as Record<string, unknown>;
      expect(appBarProps.title).toBe("متجري");
      expect(appBarProps.backgroundColor).toBe("#ffffff");
      expect(appBarProps.foregroundColor).toBe("#0f172a");
      expect(appBarProps.showMenu).toBe(true);
      expect(appBarProps.showCartIcon).toBe(true);
    });

    it("applies site-wide zones to every page", () => {
      for (const page of pages) {
        expect(page.appDrawer).toBeDefined();
        expect(page.footer).toBeDefined();
      }
    });

    it("canonicalises legacy colon zone keys into the appDrawer", () => {
      const drawer = pages[0].appDrawer as Record<string, unknown>;
      const drawerProps = drawer.props as Record<string, unknown>;
      expect(drawer.type).toBe("appDrawer");
      expect(drawerProps.drawerEdge).toBe("end"); // side: "right"
      expect(drawerProps.backgroundColor).toBe("#fefefe");
    });

    it("builds the footer from SiteFooter block props and LinkValue links", () => {
      const footer = pages[0].footer as Record<string, unknown>;
      const children = ((footer.child as Record<string, unknown>).children as Record<string, unknown>[]);
      const tagline = children[0].props as Record<string, unknown>;
      expect(tagline.value).toBe("متجرك الشامل.");
      const column = children[1] as Record<string, unknown>;
      const link = (column.children as Record<string, unknown>[])[1];
      expect((link.props as Record<string, unknown>).label).toBe("المنتجات");
      expect((link.tap as Record<string, unknown>).route).toBe("/products");
    });

    it("inlines a ZonePopup slot into openBottomSheet when a button targets it", () => {
      const body = pages[0].body as Record<string, unknown>[];
      const button = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      const tap = button.tap as Record<string, unknown>;
      expect(tap.type).toBe("openBottomSheet");
      expect((tap.child as Record<string, unknown>).type).toBe("text");
    });

    it("lists non-tab routes in shellExcludeRoutes", () => {
      const nav = output.navigation as Record<string, unknown>;
      expect(nav.shellExcludeRoutes).toContain("/about");
    });
  });

  describe("BLOCKS.md blocks added for web parity", () => {
    const pageShell = (blocks: Record<string, unknown>[]) => ({
      path: "/parity",
      label: "Parity",
      rootProps: { language: "ar", direction: "rtl", primary: "#0b78c5", surface: "#f6f8fc" },
      blocks: [{ type: "Section", props: { paddingTop: "0", paddingBottom: "0", content: blocks } }],
    });
    const firstChild = (result: Extract<TransformResult, { success: true }>) => {
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      return ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
    };

    it("converts ContentLink title + LinkValue to a text button", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ContentLink", props: { title: "اقرأ المزيد", link: { kind: "page", pageId: "/about" }, color: "theme-primary" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const link = firstChild(result);
      expect(link.type).toBe("button");
      expect((link.props as Record<string, unknown>).label).toBe("اقرأ المزيد");
      expect((link.props as Record<string, unknown>).variant).toBe("text");
      expect((link.props as Record<string, unknown>).color).toBe("#0b78c5");
      expect((link.tap as Record<string, unknown>).route).toBe("/about");
    });

    it("converts ContentInput to textFormField keyed by props.id", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ContentInput", props: { label: "البريد", name: "email", inputType: "email", required: true } },
      ]))) as Extract<TransformResult, { success: true }>;
      const field = firstChild(result);
      expect(field.type).toBe("textFormField");
      const props = field.props as Record<string, unknown>;
      expect(props.id).toBe("email");
      expect(props.name).toBeUndefined();
      expect(props.keyboardType).toBe("email");
      expect(props.validateEmail).toBe(true);
      expect(props.validateRequired).toBe(true);
      expect(props.textDirection).toBe("ltr");
    });

    it("converts a static ButtonGroup to a row of buttons", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        {
          type: "ButtonGroup",
          props: {
            defaultSelectedValue: "a",
            align: "center",
            activeStyle: { bgColor: "theme-primary", buttonSize: "theme-sm" },
            inactiveStyle: { bgColor: "theme-surface", buttonSize: "theme-sm" },
            items: [
              { title: "أ", value: "a", destinationType: "link", link: { kind: "page", pageId: "/" } },
              { title: "ب", value: "b", destinationType: "link", link: { kind: "page", pageId: "/products" } },
            ],
          },
        },
      ]))) as Extract<TransformResult, { success: true }>;
      const group = firstChild(result);
      expect(group.type).toBe("row");
      const children = group.children as Record<string, unknown>[];
      expect(children).toHaveLength(2);
      expect((children[0].props as Record<string, unknown>).variant).toBe("filled");
      expect((children[1].props as Record<string, unknown>).variant).toBe("outlined");
      expect((children[0].props as Record<string, unknown>).height).toBe(36);
      expect((children[1].tap as Record<string, unknown>).route).toBe("/products");
    });

    it("emits unsupported for a runtime-bound ButtonGroup", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ButtonGroup", props: { bindingMode: "categories" } },
      ]))) as Extract<TransformResult, { success: true }>;
      expect(firstChild(result).type).toBe("unsupported");
      expect(result.warnings?.join(" ")).toContain("bindingMode");
    });

    it("skips Chip with a warning", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "Chip", props: { listValueContext: { path: "product.tags" } } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      expect(((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])).toHaveLength(0);
      expect(result.warnings?.join(" ")).toContain("Chip");
    });

    it("converts CartQuantity to a stepper row with updateQuantity calls", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "CartQuantity", props: { align: "center" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const row = firstChild(result);
      expect(row.type).toBe("row");
      const [dec, val, inc] = row.children as Record<string, unknown>[];
      expect((dec.tap as Record<string, unknown>).method).toBe("updateQuantity");
      expect(((dec.tap as Record<string, unknown>).params as Record<string, Record<string, unknown>>).delta.value).toBe(-1);
      expect((val.props as Record<string, unknown>).valuePath).toBe("item.quantity");
      expect(((inc.tap as Record<string, unknown>).params as Record<string, Record<string, unknown>>).delta.value).toBe(1);
    });

    it("converts ProductImageCarousel inside a bound Group to a bound image", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        {
          type: "Group",
          props: {
            product: { id: "p1" },
            content: [{ type: "ProductImageCarousel", props: { aspectRatio: "square", radius: "theme-md" } }],
          },
        },
      ]))) as Extract<TransformResult, { success: true }>;
      const bound = firstChild(result);
      const image = ((bound.child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(image.type).toBe("image");
      expect((image.props as Record<string, unknown>).urlPath).toBe("dataContext.requests.product-p1.data.primaryImageUrl");
    });

    it("emits unsupported for ProductVariants", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ProductVariants", props: { chipStyle: "pill" } },
      ]))) as Extract<TransformResult, { success: true }>;
      expect(firstChild(result).type).toBe("unsupported");
    });

    it("skips CartList — it is a web preset, not a persisted block", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "CartList", props: { gap: "md", showDividerLines: true } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      expect(((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])).toHaveLength(0);
      expect(result.warnings?.join(" ")).toContain("web preset, not a block");
    });

    it("renders the cart only once when a legacy CartSection sits beside a cart Group", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "Group", props: { cartLineId: "l1", content: [] } },
        { type: "CartSection", props: {} },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const children = (body[0].child as Record<string, unknown>).children as Record<string, unknown>[];
      expect(children).toHaveLength(1);
      expect(children[0].type).toBe("listView");
    });

    it("warns when an overlay zone has content but nothing opens it", () => {
      const site = {
        root: { props: { language: "ar", direction: "rtl" } },
        zones: {
          "root:zone-popup": [{
            type: "ZonePopup",
            props: { is_active: true, key: "promo", slot: [{ type: "ContentHeading", props: { text: "عرض" } }] },
          }],
        },
        pages: [{ path: "/", name: "H", content: [] }],
      };
      const result = transformWebToMobile(JSON.stringify(site)) as Extract<TransformResult, { success: true }>;
      expect(result.warnings?.join(" ")).toContain('Overlay zone "promo" is never opened');
    });

    it("ignores metadata.preset / sectionKind once the preset content is expanded", () => {
      // Strip generated ids: they are counter-based, so only structure/props are comparable.
      const stripIds = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(stripIds);
        if (value && typeof value === "object") {
          return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
              .filter(([key]) => key !== "id")
              .map(([key, v]) => [key, stripIds(v)])
          );
        }
        return value;
      };
      const page = (sectionProps: Record<string, unknown>) => JSON.stringify({
        path: "/p", label: "P",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: {
            paddingTop: "0", paddingBottom: "0",
            ...sectionProps,
            content: [
              { type: "ContentHeading", props: { text: "المنتجات" } },
              {
                type: "Group",
                props: {
                  product: { id: "p1", slug: "shirt" },
                  content: [{ type: "ContentHeading", props: { text: "x", valueContext: { path: "product.title" } } }],
                },
              },
            ],
          },
        }],
      });

      const plain = transformWebToMobile(page({})) as Extract<TransformResult, { success: true }>;
      const preset = transformWebToMobile(page({
        metadata: { preset: "products-grid" },
        sectionKind: "products-grid",
        collection: { id: "coll_featured", slug: "featured" },
      })) as Extract<TransformResult, { success: true }>;

      expect(stripIds(preset.output)).toEqual(stripIds(plain.output));
    });

    describe("products-grid / products-page card template", () => {
      const templateSection = (sectionProps: Record<string, unknown>) => JSON.stringify({
        path: "/products", label: "Products",
        rootProps: { language: "ar", direction: "rtl", primary: "#0b78c5", surface: "#f6f8fc" },
        blocks: [{
          type: "Section",
          props: {
            paddingTop: "0", paddingBottom: "0", columns: 3, columnsMobile: 2, gridGap: "16px",
            ...sectionProps,
          },
        }],
      });

      const cardTemplateGroup = {
        type: "Group",
        props: {
          product: null, metadata: null, skipProductDetailFetch: true,
          direction: "column", gap: 10,
          content: [
            { type: "ContentImage", props: { src: "https://placehold.co/400x400", valueContext: { path: "images[0].url" } } },
            { type: "ContentHeading", props: { text: "اسم المنتج", valueContext: { path: "product.title" } } },
            { type: "ContentParagraph", props: { text: "٠ ل.س", valueContext: { path: "pricing.displayPrice" } } },
          ],
        },
      };

      const gridOf = (result: Extract<TransformResult, { success: true }>) => {
        const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
        return (body[0].child as Record<string, unknown>);
      };

      it("repeats the one card-template Group over the picked collection", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-grid" },
          collection: { id: "coll_featured", name: "Featured", slug: "featured", productCount: 24 },
          content: [cardTemplateGroup],
        })) as Extract<TransformResult, { success: true }>;

        const grid = gridOf(result);
        expect(grid.type).toBe("gridView");
        const gridProps = grid.props as Record<string, unknown>;
        expect(gridProps.crossAxisCount).toBe(2);
        expect(gridProps.requestKey).toBe("product-list");
        expect(gridProps.requestUrl).toBe("/api/v1/public/collections/coll_featured/products?page=0&size=20");

        const itemBuilder = grid.itemBuilder as Record<string, unknown>;
        expect(itemBuilder.type).toBe("repeat");
        expect(itemBuilder.source).toBe("dataContext.requests.product-list.data");
      });

      it("binds template children to item.* instead of keeping static fallbacks", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-grid" },
          collection: { id: "coll_featured", slug: "featured" },
          content: [cardTemplateGroup],
        })) as Extract<TransformResult, { success: true }>;

        const itemBuilder = gridOf(result).itemBuilder as Record<string, unknown>;
        const children = ((itemBuilder.item as Record<string, unknown>).children as Record<string, unknown>[]);
        const [image, title, price] = children.map((c) => c.props as Record<string, unknown>);
        expect(image.urlPath).toBe("item.primaryImageUrl");
        expect(image.url).toBeUndefined();
        expect(title.valuePath).toBe("item.name");
        expect(title.value).toBeUndefined();
        expect(price.valuePath).toBe("item.price");
      });

      it("falls back to the collection slug when the picker ref has no id", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-grid" },
          collection: { name: "Featured", slug: "featured" },
          content: [cardTemplateGroup],
        })) as Extract<TransformResult, { success: true }>;

        expect((gridOf(result).props as Record<string, unknown>).requestUrl)
          .toBe("/api/v1/public/collections/featured/products?page=0&size=20");
      });

      it("reads the template from cardTemplate when content was cleared", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-grid" },
          collection: { id: "coll_featured", slug: "featured" },
          content: [],
          cardTemplate: [cardTemplateGroup],
        })) as Extract<TransformResult, { success: true }>;

        expect(gridOf(result).type).toBe("gridView");
      });

      it("requests the whole catalogue for products-page — it has no collection picker", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-page" },
          content: [cardTemplateGroup],
        })) as Extract<TransformResult, { success: true }>;

        expect((gridOf(result).props as Record<string, unknown>).requestUrl)
          .toBe("/api/v1/public/products?page=0&size=20");
      });

      it("leaves a preset Section alone when its content is a product-bound Group", () => {
        const result = transformWebToMobile(templateSection({
          metadata: { preset: "products-grid" },
          collection: { id: "coll_featured", slug: "featured" },
          content: [{
            type: "Group",
            props: { product: { id: "p1", slug: "shirt" }, content: [] },
          }],
        })) as Extract<TransformResult, { success: true }>;

        const grid = gridOf(result);
        expect(grid.type).toBe("gridView");
        expect((grid.props as Record<string, unknown>).requestUrl).toBeUndefined();
        expect(grid.itemBuilder).toBeUndefined();
      });
    });

    it("collapses cartLineId Groups into one cart listView regardless of section preset", () => {
      const input = {
        path: "/cart",
        label: "Cart",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: {
            content: [
              { type: "Group", props: { cartLineId: "l1", content: [{ type: "CartQuantity", props: {} }] } },
              { type: "Group", props: { cartLineId: "l2", content: [{ type: "CartQuantity", props: {} }] } },
            ],
          },
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const children = (body[0].child as Record<string, unknown>).children as Record<string, unknown>[];
      expect(children).toHaveLength(1);
      expect(children[0].type).toBe("listView");
      expect((children[0].itemBuilder as Record<string, unknown>).source).toBe("cart.items");
      expect(result.warnings?.join(" ")).toContain("l2");
    });

    it("keeps shopping-cart shell blocks in authored order around the cart listView", () => {
      const input = {
        path: "/cart",
        label: "Cart",
        rootProps: { language: "ar", direction: "rtl", primary: "#000" },
        blocks: [{
          type: "Section",
          props: {
            metadata: { preset: "shopping-cart" },
            content: [
              { type: "ContentHeading", props: { text: "سلة التسوق" } },
              { type: "Group", props: { cartLineId: "l1", content: [{ type: "CartQuantity", props: {} }] } },
              { type: "ContentButton", props: { label: "إتمام", destinationType: "action", buttonAction: "makeOrder" } },
            ],
          },
        }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
      const page = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0];
      const body = page.body as Record<string, unknown>[];
      const children = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[]);
      expect(children[0].type).toBe("text");
      expect(children[1].type).toBe("listView");
      expect(page.footer).toBeDefined();
    });
  });
});
