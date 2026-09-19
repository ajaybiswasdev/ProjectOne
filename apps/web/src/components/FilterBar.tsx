"use client";

type FilterBarProps = {
  hrbps: string[];
  leaders: string[];
  selectedHrbp: string;
  selectedLeader: string;
  onHrbpChange: (val: string) => void;
  onLeaderChange: (val: string) => void;
  onClear: () => void;
  count?: string;
};

export function FilterBar({
  hrbps, leaders, selectedHrbp, selectedLeader,
  onHrbpChange, onLeaderChange, onClear, count,
}: FilterBarProps) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter resources">
      <label htmlFor="hrbp-filter">🎯 POD HRBP</label>
      <select
        id="hrbp-filter"
        value={selectedHrbp}
        onChange={(e) => onHrbpChange(e.target.value)}
        aria-label="Filter by HRBP"
      >
        <option value="">All HRBPs</option>
        {hrbps.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <label htmlFor="leader-filter">👤 POD Leader</label>
      <select
        id="leader-filter"
        value={selectedLeader}
        onChange={(e) => onLeaderChange(e.target.value)}
        aria-label="Filter by Leader"
      >
        <option value="">All Leaders</option>
        {leaders.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      <button className="clear-btn" onClick={onClear} aria-label="Clear all filters">✕ Clear</button>
      {count && <span className="filter-count" aria-live="polite">{count}</span>}
    </div>
  );
}
