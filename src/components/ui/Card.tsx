import { cn } from "../../lib/cn.ts";
import "./Card.css";

type CardProps = {
  className?: string;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

function Card({ className, children, header, footer }: CardProps) {
  return (
    <article className={cn("card", className)}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </article>
  );
}

export default Card;
