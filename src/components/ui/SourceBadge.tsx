import { cn } from "../../lib/cn.ts";
import "./SourceBadge.css";

type SourceBadgeProps = {
  authority: string;
  href?: string;
  date?: string;
  className?: string;
};

function SourceBadge({ authority, href, date, className }: SourceBadgeProps) {
  return (
    <span className={cn("source-badge", className)}>
      {href ? (
        <a href={href} className="source-badge-link" target="_blank" rel="noopener noreferrer">
          {authority}
        </a>
      ) : (
        <span className="source-badge-text">{authority}</span>
      )}
      {date && (
        <time className="source-badge-date" dateTime={date}>
          {date}
        </time>
      )}
    </span>
  );
}

export default SourceBadge;
