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
      expect((container.style as Record<string, unknown>).color).toBe("#f0f0f0");
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
      expect((heading.props as Record<string, unknown>).fontSize).toBe(32); // h1
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
    it("converts link to ghost button", () => {
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
      expect((link.props as Record<string, unknown>).variant).toBe("ghost");
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
    it("extracts video ID and builds embed URL", () => {
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
      const ytRaw = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      const yt = ytRaw.type === "container" ? (ytRaw.child as Record<string, unknown>) : ytRaw;
      expect(yt.type).toBe("videoPlayer");
      expect((yt.props as Record<string, unknown>).url).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });
  });

  describe("block: Hero", () => {
    it("produces container with background image and column", () => {
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
      const heroContainer = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(heroContainer.type).toBe("container");
      expect((heroContainer.style as Record<string, unknown>).height).toBe(300);
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
    it("is stripped from body and appended at end", () => {
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
      const body = (output.pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];

      expect(body).toHaveLength(1);
      expect(body[0].type).toBe("container");
    });

    it("returns null when footerVisible is false", () => {
      const input = {
        path: "/footer-hidden",
        label: "Hidden",
        rootProps: { language: "en", direction: "ltr", primary: "#000", footerVisible: false },
        blocks: [{ type: "SiteFooter" }],
      };
      const result = transformWebToMobile(JSON.stringify(input)) as Extract<TransformResult, { success: true }>;
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
    it("converts to column of rows", () => {
      const input = {
        path: "/grid-test",
        label: "Grid",
        rootProps: { language: "en", direction: "ltr", primary: "#000" },
        blocks: [
          {
            type: "Section",
            props: { paddingTop: "0", paddingBottom: "0", content: [
              { type: "Grid", props: { columns: "2", gap: 8, items: [
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
      const gridChildren = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0] as Record<string, unknown>;
      // Should be a column containing rows
      expect(gridChildren.type).toBe("column");
      const rows = gridChildren.children as Record<string, unknown>[];
      expect(rows).toHaveLength(2); // 3 items in 2 columns = 2 rows
      expect(rows[0].type).toBe("row");
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
      const data = (gridView.itemBuilder as Record<string, unknown>).data as Record<string, unknown>;
      expect(data.type).toBe("api");
      expect(data.path).toContain("/api/v1/public/products");
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
    it("creates form with textFormField children", () => {
      const input = {
        path: "/checkout",
        label: "Checkout",
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
                  ],
                  submitLabel: "Buy Now",
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
      const col = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      const form = (col.children as Record<string, unknown>[]).find((c) => c.type === "form");
      expect(form).toBeDefined();
      const fields = form!.children as Record<string, unknown>[];
      expect(fields).toHaveLength(2);
      expect(fields[0].type).toBe("textFormField");
      expect((fields[0].props as Record<string, unknown>).validator).toBe("required");

      const submitBtn = (col.children as Record<string, unknown>[]).find((c) => c.type === "button");
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
      const timer = (countdown.children as Record<string, unknown>[]).find((c) => c.type === "timer");
      expect(timer).toBeDefined();
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
      const row = ((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0];
      expect(row.type).toBe("row");
      const cards = row.children as Record<string, unknown>[];
      expect(cards).toHaveLength(2);
      expect(cards[0].type).toBe("card");
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

    it("converts VideoEmbed via src prop", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "VideoEmbed", props: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", size: "theme-315" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const vidRaw = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      const vid = vidRaw.type === "container" ? (vidRaw.child as Record<string, unknown>) : vidRaw;
      expect(vid.type).toBe("videoPlayer");
      expect((vid.props as Record<string, unknown>).url).toContain("embed/dQw4w9WgXcQ");
    });

    it("converts ProductsGrid with collection and maxRows", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "ProductsGrid", props: { collection: "featured", columns: "2", maxRows: "4", gap: "md", cardVariant: "compact" } },
      ]))) as Extract<TransformResult, { success: true }>;
      const body = ((result.output as Record<string, unknown>).pages as Record<string, unknown>[])[0].body as Record<string, unknown>[];
      const grid = (((body[0].child as Record<string, unknown>).children as Record<string, unknown>[])[0]);
      expect(grid.type).toBe("gridView");
      const data = (grid.props as Record<string, unknown>).data as Record<string, unknown>;
      expect(data.requestUrl).toContain("collection=featured");
      expect(data.size).toBe(4);
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
      expect(gallery.type).toBe("column");
    });

    it("emits warning for unsupported Sidebar block", () => {
      const result = transformWebToMobile(JSON.stringify(pageShell([
        { type: "Sidebar", props: { title: { ar: "قائمة", en: "Menu" } } },
      ])));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings?.some((w) => w.includes("Sidebar"))).toBe(true);
      }
    });
  });
});
