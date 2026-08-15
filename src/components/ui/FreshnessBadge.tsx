import { cn } from "../../lib/cn.ts";
import "./FreshnessBadge.css";

type FreshnessLevel = "fresh" | "stale" | "unknown";

type FreshnessBadgeProps = {
  level: FreshnessLevel;
  date?: string;
  className?: string;
};

const FRESHNESS_CONFIG: Record<FreshnessLevel, { label: string; className: string }> = {
  fresh: { label: "fresh", className: "freshness-fresh" },
  stale: { label: "stale", className: "freshness-stale" },
  unknown: { label: "unknown", className: "freshness-unknown" },
};

function FreshnessBadge({ level, date, className }: FreshnessBadgeProps) {
  const config = FRESHNESS_CONFIG[level];

  return (
    <span
      className={cn(`freshness-badge ${config.className}`, className)}
      aria-label={`Data freshness: ${config.label}${date ? `, as of ${date}` : ""}`}
    >
      {date && <time dateTime={date}>{date}</time>}
      <span className="freshness-badge-label">{config.label}</span>
    </span>
  );
}

export default FreshnessBadge;
