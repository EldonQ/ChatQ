import { describe, it, expect, beforeEach } from "vitest";
import { SessionCache, sessionCache } from "./session-cache";
import type { GbifOccurrence } from "./gbif";

function makeRecord(name: string, lat: number, lng: number): GbifOccurrence {
  return {
    key: 1,
    scientificName: name,
    decimalLatitude: lat,
    decimalLongitude: lng,
    eventDate: null,
    country: null,
    countryCode: null,
    locality: null,
    basisOfRecord: null,
    occurrenceStatus: null,
    coordinateUncertaintyInMeters: null,
    species: name,
    genus: null,
    family: null,
    order: null,
    class: null,
    phylum: null,
    kingdom: null,
    datasetName: null,
    publisher: null,
    license: null,
    hasCoordinate: true,
    issues: [],
  };
}

describe("SessionCache", () => {
  let cache: SessionCache;

  beforeEach(() => {
    cache = new SessionCache({ maxSessions: 2, ttlMs: 1000 * 60 });
  });

  it("stores and retrieves species entries", () => {
    cache.setSpecies("conv1", "panthera tigris", {
      scientificName: "Panthera tigris",
      csv: "csv",
      records: [makeRecord("Panthera tigris", 10, 20)],
      count: 1,
      center: [10, 20],
    });

    const entry = cache.getSpecies("conv1", "panthera tigris");
    expect(entry).toBeDefined();
    expect(entry?.scientificName).toBe("Panthera tigris");
  });

  it("lists all species for a conversation", () => {
    cache.setSpecies("conv1", "a", {
      scientificName: "A",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });
    cache.setSpecies("conv1", "b", {
      scientificName: "B",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });

    expect(cache.getAllSpecies("conv1").map((e) => e.scientificName).sort()).toEqual(["A", "B"]);
  });

  it("evicts oldest session when over limit", () => {
    cache.setSpecies("conv1", "a", {
      scientificName: "A",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });
    cache.setSpecies("conv2", "b", {
      scientificName: "B",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });
    cache.setSpecies("conv3", "c", {
      scientificName: "C",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });

    expect(cache.getSpecies("conv1", "a")).toBeUndefined();
    expect(cache.getSpecies("conv2", "b")).toBeDefined();
    expect(cache.getSpecies("conv3", "c")).toBeDefined();
  });

  it("global instance can be cleared", () => {
    sessionCache.setSpecies("test", "x", {
      scientificName: "X",
      csv: "",
      records: [],
      count: 0,
      center: [0, 0],
    });
    expect(sessionCache.getSpecies("test", "x")).toBeDefined();
    sessionCache.clear("test");
    expect(sessionCache.getSpecies("test", "x")).toBeUndefined();
  });
});
