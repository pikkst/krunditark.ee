import { cn } from "../../lib/cn.ts";
import "./Container.css";

type ContainerProps = {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "main" | "section" | "article";
  size?: "content" | "readable";
};

function Container({
  className,
  children,
  as: Component = "div",
  size = "content",
}: ContainerProps) {
  return <Component className={cn(`container container-${size}`, className)}>{children}</Component>;
}

export default Container;
