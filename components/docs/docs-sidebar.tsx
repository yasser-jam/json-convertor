"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/docs-data";

interface DocsSidebarProps {
  navigation: NavItem[];
  activeSection: string;
  onNavigate: (id: string) => void;
}

export function DocsSidebar({ navigation, activeSection, onNavigate }: DocsSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(navigation.map((item) => item.id))
  );

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  const handleClick = (item: NavItem) => {
    if (item.children) {
      toggleSection(item.id);
    }
    onNavigate(item.id);
  };

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-sidebar overflow-y-auto h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Erteqa Docs</h1>
        <p className="text-sm text-muted-foreground mt-1">Block & Component Reference</p>
      </div>
      <div className="px-4 pt-3 pb-1">
        <Link
          href="/converter"
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
        >
          <Zap className="h-4 w-4" />
          Web → Mobile Converter
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  activeSection === item.id
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <span className="font-medium">{item.label}</span>
                {item.children && (
                  <span className="text-muted-foreground">
                    {expandedSections.has(item.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>
              {item.children && expandedSections.has(item.id) && (
                <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <button
                        onClick={() => onNavigate(child.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                          activeSection === child.id
                            ? "text-sidebar-primary bg-sidebar-accent"
                            : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )}
                      >
                        {child.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
