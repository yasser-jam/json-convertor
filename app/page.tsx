"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsContent } from "@/components/docs/docs-content";
import { navigation } from "@/lib/docs-data";
import { Menu, X, Zap } from "lucide-react";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("pages-structure");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (id: string) => {
    setActiveSection(id);
    setIsMobileMenuOpen(false);
    
    // Scroll to section
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Erteqa Docs</h1>
          <p className="text-xs text-muted-foreground">Block Reference</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/converter"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
          >
            <Zap className="h-3.5 w-3.5" />
            Converter
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md hover:bg-sidebar-accent transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-[57px] left-0 bottom-0 w-72 z-40 transform transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DocsSidebar
          navigation={navigation}
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Desktop Layout */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <DocsSidebar
            navigation={navigation}
            activeSection={activeSection}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:pt-0 pt-[57px]">
          <DocsContent activeSection={activeSection} />
        </div>
      </div>
    </div>
  );
}
