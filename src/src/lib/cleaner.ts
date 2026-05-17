import type { GbifOccurrence } from "./gbif";

export interface CleanedRecord {
  index: number;
  key: number;
  scientificName: string;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate: string | null;
  country: string | null;
  locality: string | null;
  basisOfRecord: string | null;
  coordinateUncertainty: number | null;
  datasetName: string | null;
  issues: string[];
  flags: string[];
}

export interface CleaningSummary {
  total: number;
  removed: number;
  kept: number;
  reasons: Record<string, number>;
}

export interface CleanedResult {
  records: CleanedRecord[];
  summary: CleaningSummary;
}

export function cleanOccurrences(records: GbifOccurrence[]): CleanedResult {
  const reasons: Record<string, number> = {};
  const cleaned: CleanedRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const flags: string[] = [];

    // 1. Check for coordinates
    if (r.decimalLatitude == null || r.decimalLongitude == null) {
      reasons["missing_coordinates"] = (reasons["missing_coordinates"] || 0) + 1;
      continue;
    }

    // 2. Boundary checks
    if (Math.abs(r.decimalLatitude) > 90 || Math.abs(r.decimalLongitude) > 180) {
      reasons["coordinate_out_of_bounds"] = (reasons["coordinate_out_of_bounds"] || 0) + 1;
      continue;
    }

    // 3. Zero coordinates
    if (r.decimalLatitude === 0 && r.decimalLongitude === 0) {
      flags.push("zero_coordinates");
    }

    // 4. Coordinate precision
    const latStr = r.decimalLatitude.toFixed(10);
    const lngStr = r.decimalLongitude.toFixed(10);
    const latDecimals = latStr.split(".")[1]?.replace(/0+$/, "").length || 0;
    const lngDecimals = lngStr.split(".")[1]?.replace(/0+$/, "").length || 0;
    if (latDecimals <= 2 || lngDecimals <= 2) {
      flags.push("low_coordinate_precision");
    }

    // 5. GBIF-flagged issues
    const knownIssues = [
      "COUNTRY_COORDINATE_MISMATCH",
      "ZERO_COORDINATE",
      "COORDINATE_OUT_OF_RANGE",
      "COORDINATE_INVALID",
      "GEODETIC_DATUM_INVALID",
      "COORDINATE_REPROJECTED",
      "COORDINATE_ROUNDED",
      "PRESUMED_NEGATED_LATITUDE",
      "PRESUMED_NEGATED_LONGITUDE",
      "PRESUMED_SWAPPED_COORDINATE",
    ];
    for (const issue of r.issues || []) {
      if (knownIssues.includes(issue)) {
        flags.push(`gbif_${issue.toLowerCase()}`);
      }
    }

    // 6. Basis of record validation
    if (r.basisOfRecord === "FOSSIL_SPECIMEN" || r.basisOfRecord === "LIVING_SPECIMEN") {
      flags.push(`basis_${r.basisOfRecord.toLowerCase()}`);
    }

    cleaned.push({
      index: i,
      key: r.key,
      scientificName: r.scientificName || r.species || "Unknown",
      decimalLatitude: r.decimalLatitude,
      decimalLongitude: r.decimalLongitude,
      eventDate: r.eventDate,
      country: r.country,
      locality: r.locality,
      basisOfRecord: r.basisOfRecord,
      coordinateUncertainty: r.coordinateUncertaintyInMeters,
      datasetName: r.datasetName,
      issues: r.issues || [],
      flags,
    });
  }

  return {
    records: cleaned,
    summary: {
      total: records.length,
      removed: records.length - cleaned.length,
      kept: cleaned.length,
      reasons,
    },
  };
}

export function formatCleanedCSV(records: CleanedRecord[]): string {
  const headerKeys = [
    "index", "key", "scientificName", "decimalLatitude", "decimalLongitude",
    "eventDate", "country", "locality", "basisOfRecord",
    "coordinateUncertainty", "datasetName", "flags",
  ] as const;

  const csvRows = [headerKeys.join(",")];
  for (const r of records) {
    csvRows.push(
      headerKeys
        .map((h) => {
          const val = r[h];
          if (val == null) return "";
          const str = Array.isArray(val) ? val.join(";") : String(val);
          // CSV-escape: quote fields containing commas, quotes, or newlines
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    );
  }
  return csvRows.join("\n");
}
