/// <reference types="vitest" />
import { render, screen } from "@testing-library/react";
import Container from "./Container";

describe("Container", () => {
  it("renders children", () => {
    render(<Container>Hello</Container>);
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("applies size class", () => {
    const { container } = render(<Container size="readable">Readable</Container>);
    expect(container.firstChild).toHaveClass("container-readable");
  });

  it("supports custom className", () => {
    const { container } = render(<Container className="custom">Custom</Container>);
    expect(container.firstChild).toHaveClass("custom");
  });
});
