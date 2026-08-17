import { getBasePath, stripBasePath } from "./basePath";

type Env = Record<string, string | undefined>;

describe("basePath", () => {
  const originalEnv = (import.meta.env as Env).VITE_BASE_PATH;

  afterEach(() => {
    (import.meta.env as Env).VITE_BASE_PATH = originalEnv;
  });

  it("defaults to / when VITE_BASE_PATH is unset", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "";
    expect(getBasePath()).toBe("/");
  });

  it("returns / when VITE_BASE_PATH is /", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/";
    expect(getBasePath()).toBe("/");
  });

  it("normalizes a repository base path with trailing slash", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/krunditark.ee/";
    expect(getBasePath()).toBe("/krunditark.ee/");
  });

  it("appends trailing slash when missing", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/krunditark.ee";
    expect(getBasePath()).toBe("/krunditark.ee/");
  });

  it("stripBasePath returns pathname unchanged for root base", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/";
    expect(stripBasePath("/et/landing")).toBe("/et/landing");
  });

  it("stripBasePath removes repository base path prefix", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/krunditark.ee/";
    expect(stripBasePath("/krunditark.ee/et/landing")).toBe("/et/landing");
    expect(stripBasePath("/krunditark.ee/")).toBe("/");
  });

  it("stripBasePath preserves pathname when base does not match", () => {
    (import.meta.env as Env).VITE_BASE_PATH = "/krunditark.ee/";
    expect(stripBasePath("/other/et/landing")).toBe("/other/et/landing");
  });
});
