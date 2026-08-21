import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "..");

function readFixture<T>(relativePath: string): T {
  const absolute = join(root, relativePath);
  const raw = readFileSync(absolute, "utf-8");
  return JSON.parse(raw) as T;
}

export function getAddressSearchSuccess() {
  return readFixture<{ addresses: unknown[]; host: string }>("tests/fixtures/address-search.json");
}

export function getParcelResolveResolved() {
  return readFixture<{ status: string; candidates: unknown[] }>(
    "tests/fixtures/parcel-resolve-resolved.json"
  );
}

export function getParcelResolveNotFound() {
  return readFixture<{ status: string; candidates: unknown[] }>(
    "tests/fixtures/parcel-resolve-not-found.json"
  );
}

export function getParcelResolveAmbiguous() {
  return readFixture<{ status: string; candidates: unknown[] }>(
    "tests/fixtures/parcel-resolve-ambiguous.json"
  );
}
