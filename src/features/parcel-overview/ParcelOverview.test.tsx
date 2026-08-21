import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../lib/i18n";
import ParcelOverview from "./ParcelOverview";
import type { Parcel } from "../../domain/parcel/types";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const MOCK_PARCEL: Parcel = {
  id: "CP:12345:678:9012",
  cadastralId: "123456789012",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
  geometryCrs: "EPSG:3301",
  facts: {
    areaM2Computed: 10000,
    addressText: "Test address",
  },
  source: {
    sourceId: "maru.cadastre.parcels.inspire",
    sourceDatasetVersionId: "2026-08-16",
    sourceSyncRunId: "sync-1",
    sourceObjectId: "obj-1",
    normalizerVersion: "1",
    retrievedAt: "2026-08-16T00:00:00Z",
  },
  freshnessState: "fresh",
  contentHash: "hash-1",
};

describe("ParcelOverview", () => {
  it("renders parcel address and cadastral id", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.getByRole("heading", { name: "Test address" })).toBeDefined();
    expect(screen.getByText("12345:678:9012")).toBeDefined();
  });

  it("renders parcel area", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.getByText(/10 000/)).toBeDefined();
  });

  it("renders the parcel boundary map", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.getByLabelText("Katastriüksuse piiride kaart")).toBeDefined();
  });

  it("renders supported coverage statement", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.getByText("Mida Krunditark saab kontrollida?")).toBeDefined();
  });

  it("renders intent choice buttons", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.getByRole("button", { name: /Uue hoone ehitus/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Ostukontroll/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Mõistan krunti/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Muudan olemasolevat hoonet/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Professionaalne/i })).toBeDefined();
  });

  it("calls onIntentSelected when an intent is clicked", () => {
    const handleIntent = vi.fn();
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={handleIntent} />);
    screen.getByRole("button", { name: /Uue hoone ehitus/i }).click();
    expect(handleIntent).toHaveBeenCalledWith("build");
  });

  it("does not render a false all-clear status", () => {
    renderWithI18n(<ParcelOverview parcel={MOCK_PARCEL} onIntentSelected={() => {}} />);
    expect(screen.queryByText(/Selge|Lubatud|100%|ehitatav/i)).toBeNull();
  });
});
