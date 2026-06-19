import { describe, it, expect } from "vitest";
import { cleanOccurrences, formatCleanedCSV } from "./cleaner";
import type { GbifOccurrence } from "./gbif";

function makeRecord(overrides: Partial<GbifOccurrence> = {}): GbifOccurrence {
  return {
    key: 1,
    scientificName: "Panthera tigris",
    decimalLatitude: 10.123456789,
    decimalLongitude: 20.123456789,
    eventDate: "2024-01-01",
    country: "India",
    countryCode: "IN",
    locality: "Bandipur",
    basisOfRecord: "HUMAN_OBSERVATION",
    occurrenceStatus: "PRESENT",
    coordinateUncertaintyInMeters: 100,
    species: "Panthera tigris",
    genus: "Panthera",
    family: "Felidae",
    order: "Carnivora",
    class: "Mammalia",
    phylum: "Chordata",
    kingdom: "Animalia",
    datasetName: "Test dataset",
    publisher: "Test publisher",
    license: "CC-BY",
    hasCoordinate: true,
    issues: [],
    ...overrides,
  };
}

describe("cleanOccurrences", () => {
  it("keeps valid records", () => {
    const records = [makeRecord()];
    const result = cleanOccurrences(records);
    expect(result.summary.total).toBe(1);
    expect(result.summary.kept).toBe(1);
    expect(result.summary.removed).toBe(0);
    expect(result.records[0].flags).toEqual([]);
  });

  it("removes records with missing coordinates", () => {
    const records = [makeRecord({ decimalLatitude: null })];
    const result = cleanOccurrences(records);
    expect(result.summary.kept).toBe(0);
    expect(result.summary.removed).toBe(1);
    expect(result.summary.reasons.missing_coordinates).toBe(1);
  });

  it("removes records with out-of-bounds coordinates", () => {
    const records = [makeRecord({ decimalLatitude: 95 })];
    const result = cleanOccurrences(records);
    expect(result.summary.kept).toBe(0);
    expect(result.summary.reasons.coordinate_out_of_bounds).toBe(1);
  });

  it("flags zero coordinates", () => {
    const records = [makeRecord({ decimalLatitude: 0, decimalLongitude: 0 })];
    const result = cleanOccurrences(records);
    expect(result.summary.kept).toBe(1);
    expect(result.records[0].flags).toContain("zero_coordinates");
  });

  it("flags low precision coordinates", () => {
    const records = [makeRecord({ decimalLatitude: 10.1, decimalLongitude: 20.12 })];
    const result = cleanOccurrences(records);
    expect(result.records[0].flags).toContain("low_coordinate_precision");
  });

  it("flags known GBIF issues", () => {
    const records = [makeRecord({ issues: ["COUNTRY_COORDINATE_MISMATCH"] })];
    const result = cleanOccurrences(records);
    expect(result.records[0].flags).toContain("gbif_country_coordinate_mismatch");
  });

  it("flags fossil and living specimens", () => {
    const records = [
      makeRecord({ basisOfRecord: "FOSSIL_SPECIMEN" }),
      makeRecord({ basisOfRecord: "LIVING_SPECIMEN" }),
    ];
    const result = cleanOccurrences(records);
    expect(result.records[0].flags).toContain("basis_fossil_specimen");
    expect(result.records[1].flags).toContain("basis_living_specimen");
  });
});

describe("formatCleanedCSV", () => {
  it("produces a valid CSV header and rows", () => {
    const records = [makeRecord()];
    const cleaned = cleanOccurrences(records).records;
    const csv = formatCleanedCSV(cleaned);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("scientificName");
    expect(lines[1]).toContain("Panthera tigris");
  });

  it("escapes fields containing commas", () => {
    const records = [makeRecord({ locality: "Bandipur, Karnataka" })];
    const cleaned = cleanOccurrences(records).records;
    const csv = formatCleanedCSV(cleaned);
    expect(csv).toContain('"Bandipur, Karnataka"');
  });
});
