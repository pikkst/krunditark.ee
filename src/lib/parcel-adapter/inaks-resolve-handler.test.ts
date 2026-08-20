import { buildAddressResolutionWfsFilter } from "./inaks-resolve-handler";

describe("buildAddressResolutionWfsFilter (KT-034)", () => {
  const addressResultId = "ME01087725";
  const addressId = "2105921";

  test("resolves from selected cadastral-unit tunnus", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087725",
          adr_id: "2105921",
          liik: "4",
          tunnus: "78401:101:3143",
        },
        {
          ads_oid: "ME01087726",
          adr_id: "2105922",
          liik: "4",
          tunnus: "78401:101:3144",
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.wfsFilter).toBe("nationalcadastralreference='78401:101:3143'");
      expect(result.count).toBe(1);
    }
  });

  test("ignores cadastral rows from other ads_oid values", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087726",
          adr_id: "2105922",
          liik: "4",
          tunnus: "78401:101:3144",
        },
        {
          ads_oid: "ME01087725",
          adr_id: "2105921",
          liik: "4",
          tunnus: "78401:101:3143",
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.wfsFilter).toBe("nationalcadastralreference='78401:101:3143'");
      expect(result.count).toBe(1);
    }
  });

  test("returns not_found when addressResultId + addressId do not match any object", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087726",
          adr_id: "2105922",
          liik: "4",
          tunnus: "78401:101:3144",
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("not_found");
  });

  test("uses spatial INTERSECTS for non-cadastral selected result", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087725",
          adr_id: "2105921",
          liik: "E",
          tunnus: "1234567890",
          viitepunkt_x: 650000,
          viitepunkt_y: 6600000,
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.wfsFilter).toBe("INTERSECTS(geometry, POINT(650000 6600000))");
      expect(result.count).toBe(10);
    }
  });

  test("returns invalid_source for null JSON root", () => {
    const result = buildAddressResolutionWfsFilter(null, addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("non-null object");
    }
  });

  test("returns invalid_source for primitive JSON root", () => {
    const result = buildAddressResolutionWfsFilter("not an object", addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("non-null object");
    }
  });

  test("returns invalid_source for missing addresses array", () => {
    const inaksData = { host: "aks.geoportaal.ee" };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("addresses array");
    }
  });

  test("returns invalid_source for non-array addresses", () => {
    const inaksData = { addresses: "not-an-array" };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("addresses array");
    }
  });

  test("returns invalid_source when selected cadastral unit has invalid tunnus", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087725",
          adr_id: "2105921",
          liik: "4",
          tunnus: "not-a-cadastral-id",
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("invalid tunnus");
    }
  });

  test("returns invalid_source when selected non-cadastral result lacks viitepunkt", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087725",
          adr_id: "2105921",
          liik: "E",
          tunnus: "1234567890",
          viitepunkt_x: null,
          viitepunkt_y: 6600000,
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, addressResultId, addressId);

    expect(result.status).toBe("invalid_source");
    if (result.status === "invalid_source") {
      expect(result.error).toContain("viitepunkt_x/viitepunkt_y");
    }
  });

  test("mismatched addressResultId never resolves another object", () => {
    const inaksData = {
      addresses: [
        {
          ads_oid: "ME01087726",
          adr_id: "2105922",
          liik: "4",
          tunnus: "78401:101:3144",
        },
      ],
    };

    const result = buildAddressResolutionWfsFilter(inaksData, "ME01087725", "2105921");

    expect(result.status).toBe("not_found");
  });
});
