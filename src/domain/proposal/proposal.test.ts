import {
  isValidStructureType,
  normalizeStructureType,
  validateProposal,
  type Proposal,
  type ProposalFacts,
} from "./types";

describe("proposal domain model (KT-021)", () => {
  describe("isValidStructureType", () => {
    test("accepts all supported structure types", () => {
      expect(isValidStructureType("detached_house")).toBe(true);
      expect(isValidStructureType("sauna")).toBe(true);
      expect(isValidStructureType("shed")).toBe(true);
      expect(isValidStructureType("garage")).toBe(true);
      expect(isValidStructureType("auxiliary_building")).toBe(true);
    });

    test("rejects unsupported types", () => {
      expect(isValidStructureType("unknown_type")).toBe(false);
      expect(isValidStructureType("")).toBe(false);
    });
  });

  describe("normalizeStructureType", () => {
    test("normalizes hyphenated input", () => {
      expect(normalizeStructureType("detached-house")).toBe("detached_house");
    });

    test("normalizes spaced input", () => {
      expect(normalizeStructureType("detached house")).toBe("detached_house");
    });

    test("preserves already-normalized type", () => {
      expect(normalizeStructureType("sauna")).toBe("sauna");
    });

    test("returns undefined for unsupported input", () => {
      expect(normalizeStructureType("factory")).toBeUndefined();
    });
  });

  describe("validateProposal", () => {
    const makePolygon = (overrides: Partial<Proposal> = {}): Proposal => ({
      id: "proposal-1",
      projectId: "project-1",
      version: 1,
      structureType: "sauna",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [650000, 6600000],
            [651000, 6600000],
            [651000, 6601000],
            [650000, 6601000],
            [650000, 6600000],
          ],
        ],
      },
      geometryCrs: "EPSG:3301",
      facts: { areaM2: 100000, heightM: 4, storeys: 1, widthM: 10, lengthM: 10, orientationDeg: 0 },
      createdAt: "2026-08-01T00:00:00Z",
      ...overrides,
    });

    test("returns valid for a complete Polygon proposal", () => {
      const result = validateProposal(makePolygon());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("canonical valid proposal is persistence-compatible with database schema", () => {
      const proposal = makePolygon();
      const result = validateProposal(proposal);
      expect(result.valid).toBe(true);
      expect(proposal.geometry.type).toBe("Polygon");
      expect(proposal.geometryCrs).toBe("EPSG:3301");
      expect(result.errors).toHaveLength(0);
    });

    test("requires id", () => {
      const result = validateProposal(makePolygon({ id: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "id")).toBe(true);
    });

    test("requires projectId", () => {
      const result = validateProposal(makePolygon({ projectId: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "projectId")).toBe(true);
    });

    test("requires valid structureType", () => {
      const result = validateProposal(
        makePolygon({ structureType: "factory" as Proposal["structureType"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "structureType")).toBe(true);
    });

    test("requires geometry", () => {
      const result = validateProposal(
        makePolygon({ geometry: null as unknown as Proposal["geometry"] })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("requires Polygon geometry type", () => {
      const result = validateProposal(
        makePolygon({
          geometry: { type: "MultiPolygon" as Proposal["geometry"]["type"], coordinates: [] },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry")).toBe(true);
    });

    test("rejects empty Polygon coordinates", () => {
      const result = validateProposal(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [],
          },
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates")).toBe(true);
    });

    test("rejects Polygon ring with fewer than 4 positions", () => {
      const result = validateProposal(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
              ],
            ],
          } as unknown as Proposal["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon with unclosed ring", () => {
      const result = validateProposal(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
                [650000, 6601000],
              ],
            ],
          } as unknown as Proposal["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0]")).toBe(true);
    });

    test("rejects Polygon with non-finite coordinate", () => {
      const result = validateProposal(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [650000, 6600000],
                [651000, 6600000],
                [651000, 6601000],
                [650000, 6601000],
                [NaN, 6600000],
              ],
            ],
          } as unknown as Proposal["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometry.coordinates[0][4][0]")).toBe(true);
    });

    test("rejects EPSG:3301 coordinate outside Estonian bounds", () => {
      const result = validateProposal(
        makePolygon({
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [1000, 0],
                [1000, 1000],
                [0, 1000],
                [0, 0],
              ],
            ],
          } as unknown as Proposal["geometry"],
        })
      );
      expect(result.valid).toBe(false);
      expect(
        result.errors.some(
          (e) => e.field.startsWith("geometry.coordinates[0][") && e.field.endsWith("][0]")
        )
      ).toBe(true);
    });

    test("requires geometryCrs", () => {
      const result = validateProposal(makePolygon({ geometryCrs: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("rejects unsupported geometryCrs", () => {
      const result = validateProposal(makePolygon({ geometryCrs: "EPSG:banana" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "geometryCrs")).toBe(true);
    });

    test("rejects non-positive area", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 0 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.areaM2")).toBe(true);
    });

    test("rejects negative area", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: -10 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.areaM2")).toBe(true);
    });

    test("rejects area exceeding maximum", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100001 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.areaM2")).toBe(true);
    });

    test("rejects NaN area", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: NaN } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.areaM2")).toBe(true);
    });

    test("rejects Infinity area", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: Infinity } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.areaM2")).toBe(true);
    });

    test("rejects non-positive height", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, heightM: 0 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.heightM")).toBe(true);
    });

    test("rejects negative height", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, heightM: -5 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.heightM")).toBe(true);
    });

    test("rejects height exceeding maximum", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, heightM: 201 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.heightM")).toBe(true);
    });

    test("rejects NaN height", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, heightM: NaN } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.heightM")).toBe(true);
    });

    test("rejects non-positive storeys", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, storeys: 0 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.storeys")).toBe(true);
    });

    test("rejects fractional storeys", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, storeys: 1.5 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.storeys")).toBe(true);
    });

    test("rejects storeys exceeding maximum", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, storeys: 101 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.storeys")).toBe(true);
    });

    test("rejects non-positive width", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, widthM: 0 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.widthM")).toBe(true);
    });

    test("rejects width exceeding maximum", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, widthM: 2001 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.widthM")).toBe(true);
    });

    test("rejects NaN width", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, widthM: NaN } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.widthM")).toBe(true);
    });

    test("rejects non-positive length", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, lengthM: 0 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.lengthM")).toBe(true);
    });

    test("rejects length exceeding maximum", () => {
      const result = validateProposal(makePolygon({ facts: { areaM2: 100000, lengthM: 2001 } }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.lengthM")).toBe(true);
    });

    test("rejects Infinity length", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, lengthM: Infinity } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.lengthM")).toBe(true);
    });

    test("rejects orientation below 0", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, orientationDeg: -1 } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.orientationDeg")).toBe(true);
    });

    test("rejects orientation at or above 360", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, orientationDeg: 360 } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.orientationDeg")).toBe(true);
    });

    test("rejects NaN orientation", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, orientationDeg: NaN } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.orientationDeg")).toBe(true);
    });

    test("rejects Infinity orientation", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, orientationDeg: Infinity } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.orientationDeg")).toBe(true);
    });

    test("accepts orientation at boundary 0", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, orientationDeg: 0 } })
      );
      expect(result.valid).toBe(true);
    });

    test("rejects non-string intendedUse", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, intendedUse: 123 as unknown as string } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.intendedUse")).toBe(true);
    });

    test("rejects intendedUse exceeding max length", () => {
      const longUse = "a".repeat(501);
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, intendedUse: longUse } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.intendedUse")).toBe(true);
    });

    test("rejects non-string userNotes", () => {
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, userNotes: null as unknown as string } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.userNotes")).toBe(true);
    });

    test("rejects userNotes exceeding max length", () => {
      const longNotes = "a".repeat(2001);
      const result = validateProposal(
        makePolygon({ facts: { areaM2: 100000, userNotes: longNotes } })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts.userNotes")).toBe(true);
    });

    test("requires version to be a positive integer", () => {
      const result = validateProposal(makePolygon({ version: 0 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
    });

    test("rejects fractional version", () => {
      const result = validateProposal(makePolygon({ version: 1.5 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
    });

    test("rejects Infinity version", () => {
      const result = validateProposal(makePolygon({ version: Infinity }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
    });

    test("rejects negative version", () => {
      const result = validateProposal(makePolygon({ version: -1 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
    });

    test("requires createdAt", () => {
      const result = validateProposal(makePolygon({ createdAt: "" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects invalid createdAt timestamp", () => {
      const result = validateProposal(makePolygon({ createdAt: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "createdAt")).toBe(true);
    });

    test("rejects invalid supersededAt timestamp", () => {
      const result = validateProposal(makePolygon({ supersededAt: "not-a-date" }));
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "supersededAt")).toBe(true);
    });

    test("accepts valid supersededAt timestamp", () => {
      const result = validateProposal(makePolygon({ supersededAt: "2026-08-15T12:00:00Z" }));
      expect(result.valid).toBe(true);
    });

    test("requires facts object", () => {
      const result = validateProposal(
        makePolygon({ facts: undefined as unknown as ProposalFacts })
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "facts")).toBe(true);
    });
  });
});
