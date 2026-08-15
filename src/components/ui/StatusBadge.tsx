import { cn } from "../../lib/cn.ts";
import "./StatusBadge.css";

type Status = "clear" | "condition" | "conflict" | "unknown";

type StatusBadgeProps = {
  status: Status;
  label?: string;
  className?: string;
};

const STATUS_CONFIG: Record<Status, { className: string }> = {
  clear: { className: "status-badge-clear" },
  condition: { className: "status-badge-condition" },
  conflict: { className: "status-badge-conflict" },
  unknown: { className: "status-badge-unknown" },
};

function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label || status;

  return (
    <span
      className={cn(`status-badge ${config.className}`, className)}
      aria-label={`Status: ${displayLabel}`}
    >
      <span className="status-badge-indicator" aria-hidden="true" />
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
