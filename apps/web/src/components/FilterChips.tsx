"use client";

type FilterChipsProps = {
  filters: { key: string; label: string; count?: number }[];
  active: string;
  onSelect: (key: string) => void;
};

export function FilterChips({ filters, active, onSelect }: FilterChipsProps) {
  return (
    <div className="filter-strip" role="group" aria-label="Status filters">
      {filters.map((f) => (
        <button
          key={f.key}
          className={`filter-chip ${active === f.key ? "active" : ""}`}
          onClick={() => onSelect(f.key)}
          role="radio"
          aria-checked={active === f.key}
          aria-label={`Filter: ${f.label}`}
        >
          {f.label}{f.count != null ? ` (${f.count})` : ""}
        </button>
      ))}
    </div>
  );
}
