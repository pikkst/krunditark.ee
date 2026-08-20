import { getCacheControl } from "./cache";

describe("getCacheControl (KT-034)", () => {
  test("resolved returns 24h public cache", () => {
    expect(getCacheControl("resolved")).toBe("public, max-age=86400, s-maxage=86400");
  });

  test("ambiguous returns 24h public cache", () => {
    expect(getCacheControl("ambiguous")).toBe("public, max-age=86400, s-maxage=86400");
  });

  test("not_found returns no-store", () => {
    expect(getCacheControl("not_found")).toBe("no-store, max-age=0");
  });

  test("unavailable returns no-store", () => {
    expect(getCacheControl("unavailable")).toBe("no-store, max-age=0");
  });

  test("invalid_source returns no-store", () => {
    expect(getCacheControl("invalid_source")).toBe("no-store, max-age=0");
  });

  test("unknown status returns no-store", () => {
    expect(getCacheControl("unknown")).toBe("no-store, max-age=0");
  });
});
