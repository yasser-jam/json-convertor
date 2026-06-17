import { cn } from "@/lib/utils";

interface PropTableProps {
  columns: { key: string; header: string }[];
  rows: Record<string, string>[];
  className?: string;
}

export function PropTable({ columns, rows, className }: PropTableProps) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden my-4", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-muted-foreground">
                    {col.key === "type" || col.key === "default" || col.key === "options" ? (
                      <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-foreground/80">
                        {row[col.key] || "—"}
                      </code>
                    ) : (
                      row[col.key] || "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
