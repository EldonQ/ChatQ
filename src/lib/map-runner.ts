import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import { unlink } from "fs/promises";
import path from "path";
import { env } from "./env";

const execFileAsync = promisify(execFile);

export interface MapRunOptions {
  csv: string;
  species?: string | string[];
  speciesColumn?: string;
  outputDir?: string;
}

export interface MapRunResult {
  png: string;
  html: string;
  count: number;
  center: [number, number];
  species?: string | string[];
}

const DEFAULT_PYTHON_PATHS = [
  "python",
  "python3",
  "E:\\anaconda3\\envs\\new\\python.exe",
];

async function tryExecFile(
  pythonPath: string,
  args: string[],
  options: { timeout: number; maxBuffer: number },
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execFileAsync(pythonPath, args, options);
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (e) {
    const err = e as { code?: string; stdout?: string; stderr?: string; message?: string };
    if (err.code === "ENOENT") throw e;
    if (err.stdout != null || err.stderr != null) {
      return { stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
    }
    throw e;
  }
}

function toPublicUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const mapsIndex = normalized.indexOf("/maps/");
  if (mapsIndex >= 0) {
    return normalized.slice(mapsIndex);
  }
  return `/maps/${path.basename(filePath)}`;
}

export async function runMapVisualization(
  options: MapRunOptions,
): Promise<MapRunResult> {
  const outputDir = options.outputDir || path.join(process.cwd(), "public", "maps");
  await mkdir(outputDir, { recursive: true });

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const baseName = `data_${timestamp}_${randomSuffix}`;
  const csvPath = path.join(outputDir, `${baseName}.csv`);

  let stdout = "";
  let stderr = "";

  try {
    // Validate CSV before writing
    if (!options.csv || options.csv.trim().length === 0) {
      throw new Error("CSV content is empty — no data to map. Run fetchAndClean first.");
    }
    const csvLines = options.csv.trim().split("\n");
    if (csvLines.length < 2) {
      throw new Error(`CSV has only ${csvLines.length} line(s) — no data rows. Run fetchAndClean first.`);
    }

    await writeFile(csvPath, options.csv, "utf-8");

    const scriptPath = path.join(process.cwd(), "scripts", "map_viz.py");

    const args = [scriptPath, "--csv", csvPath, "--output-dir", outputDir];

    if (options.speciesColumn) {
      args.push("--species-column", options.speciesColumn);
    }

    if (options.species) {
      const names = Array.isArray(options.species)
        ? options.species
        : [options.species];
      for (const name of names) {
        args.push("--species", name);
      }
    }

    const execOptions = { timeout: 60000, maxBuffer: 10 * 1024 * 1024 };

    let result: { stdout: string; stderr: string } | null = null;
    if (env.PYTHON_PATH) {
      result = await tryExecFile(env.PYTHON_PATH, args, execOptions);
    } else {
      let lastErr: unknown;
      for (const p of DEFAULT_PYTHON_PATHS) {
        try {
          result = await tryExecFile(p, args, execOptions);
          break;
        } catch (e) {
          lastErr = e;
          const err = e as { code?: string };
          if (err.code !== "ENOENT") {
            result = { stdout: "", stderr: (e as { stderr?: string }).stderr ?? "" };
            break;
          }
        }
      }
      if (!result) throw lastErr;
    }

    stdout = result.stdout;
    stderr = result.stderr;

    const parsed = JSON.parse(stdout.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return {
      png: toPublicUrl(parsed.png),
      html: toPublicUrl(parsed.html),
      count: parsed.count,
      center: parsed.center,
      species: options.species,
    };
  } catch (error) {
    const detail = stderr || stdout || (error instanceof Error ? error.message : String(error));
    throw new Error(`Map generation failed: ${detail}`);
  } finally {
    // Clean up temporary CSV
    try {
      await unlink(csvPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
