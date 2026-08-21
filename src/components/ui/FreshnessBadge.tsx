import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn.ts";
import "./FreshnessBadge.css";

type FreshnessLevel = "fresh" | "warning" | "stale" | "unknown";

type FreshnessBadgeProps = {
  level: FreshnessLevel;
  date?: string;
  className?: string;
};

const LEVEL_KEYS: Record<FreshnessLevel, string> = {
  fresh: "ui.freshness.fresh",
  warning: "ui.freshness.warning",
  stale: "ui.freshness.stale",
  unknown: "ui.freshness.unknown",
};

function FreshnessBadge({ level, date, className }: FreshnessBadgeProps) {
  const { t } = useTranslation();
  const label = t(LEVEL_KEYS[level]);
  const classNames = cn(`freshness-badge freshness-${level}`, className);

  return (
    <span
      className={classNames}
      aria-label={`Data freshness: ${label}${date ? `, as of ${date}` : ""}`}
    >
      {date && <time dateTime={date}>{date}</time>}
      <span className="freshness-badge-label">{label}</span>
    </span>
  );
}

export default FreshnessBadge;
