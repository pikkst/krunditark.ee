import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../lib/i18n";
import ParcelDisambiguation from "./ParcelDisambiguation";
import type { Parcel } from "../../domain/parcel/types";

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

const MOCK_PARCEL_A: Parcel = {
  id: "CP:12345:678:9012",
  cadastralId: "123456789012",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1000, 0],
        [1000, 500],
        [0, 500],
        [0, 0],
      ],
    ],
  },
  geometryCrs: "EPSG:3301",
  facts: {
    areaM2Computed: 500000,
    addressText: "Test address A",
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

const MOCK_PARCEL_B: Parcel = {
  id: "CP:12345:678:9013",
  cadastralId: "123456789013",
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [2000, 2000],
          [3000, 2000],
          [3000, 3000],
          [2000, 3000],
          [2000, 2000],
        ],
      ],
      [
        [
          [4000, 4000],
          [5000, 4000],
          [5000, 5000],
          [4000, 5000],
          [4000, 4000],
        ],
      ],
    ],
  },
  geometryCrs: "EPSG:3301",
  facts: {
    areaM2Computed: 2000000,
    addressText: "",
  },
  source: {
    sourceId: "maru.cadastre.parcels.inspire",
    sourceDatasetVersionId: "2026-08-16",
    sourceSyncRunId: "sync-1",
    sourceObjectId: "obj-2",
    normalizerVersion: "1",
    retrievedAt: "2026-08-16T00:00:00Z",
  },
  freshnessState: "fresh",
  contentHash: "hash-2",
};

describe("ParcelDisambiguation", () => {
  it("renders the title and description", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={() => {}} />);

    expect(screen.getByText("Leidsime mitu võimalikku katastriüksust")).toBeDefined();
    expect(screen.getByText("Vali õige krunt allolevast nimekirjast.")).toBeDefined();
  });

  it("renders each candidate with address, cadastral id and area", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={() => {}} />);

    expect(screen.getByText("Test address A")).toBeDefined();
    expect(screen.getByText("12345:678:9012")).toBeDefined();
    expect(screen.getByText(/500 000 m²/)).toBeDefined();
  });

  it("renders fallback when address text is missing", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_B]} onSelect={() => {}} />);

    expect(screen.getByText("Aadress puudub")).toBeDefined();
    expect(screen.getByText("12345:678:9013")).toBeDefined();
  });

  it("renders candidate index labels", () => {
    renderWithI18n(
      <ParcelDisambiguation candidates={[MOCK_PARCEL_A, MOCK_PARCEL_B]} onSelect={() => {}} />
    );

    expect(screen.getByText("Kandidaat 1")).toBeDefined();
    expect(screen.getByText("Kandidaat 2")).toBeDefined();
  });

  it("renders a select button for each candidate", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={() => {}} />);

    expect(screen.getByRole("button", { name: "Kasuta seda krunti" })).toBeDefined();
  });

  it("calls onSelect with the correct parcel when button is clicked", async () => {
    const onSelect = vi.fn();
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={onSelect} />);

    const button = screen.getByRole("button", { name: "Kasuta seda krunti" });
    button.click();

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(MOCK_PARCEL_A);
    });
  });

  it("renders SVG outline for each candidate", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={() => {}} />);

    const svg = document.querySelector(".parcel-disambiguation__svg");
    expect(svg).toBeDefined();
    const paths = document.querySelectorAll(".parcel-disambiguation__outline");
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it("has accessible listbox role", () => {
    renderWithI18n(<ParcelDisambiguation candidates={[MOCK_PARCEL_A]} onSelect={() => {}} />);

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeDefined();
  });
});
