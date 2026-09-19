"use client";

type SearchBoxProps = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
};

export function SearchBox({ value, onChange, placeholder }: SearchBoxProps) {
  return (
    <div className="search-box" role="search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search by name, skill, practice, location, designation…"}
        aria-label="Search resources"
        autoComplete="off"
      />
    </div>
  );
}
