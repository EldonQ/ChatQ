import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csv, species } = body;

    if (!csv || !species) {
      return NextResponse.json(
        { error: "Missing csv or species" },
        { status: 400 },
      );
    }

    // Write CSV to temp file
    const mapsDir = path.join(process.cwd(), "public", "maps");
    await mkdir(mapsDir, { recursive: true });
    const ts = Date.now();
    const csvPath = path.join(mapsDir, `data_${ts}.csv`);
    await writeFile(csvPath, csv, "utf-8");

    // Call Python map script
    const scriptPath = path.join(process.cwd(), "scripts", "map_viz.py");

    try {
      const pythonPath = "E:\\anaconda3\\envs\\new\\python.exe";
      const { stdout, stderr } = await execFileAsync(pythonPath, [
        scriptPath,
        "--csv",
        csvPath,
        "--species",
        species,
        "--output-dir",
        mapsDir,
      ], { timeout: 30000 });

      if (stderr) console.warn("Python stderr:", stderr);

      const result = JSON.parse(stdout);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // Convert absolute paths to public URLs
      const pngUrl = result.png
        ? "/maps/" + path.basename(result.png)
        : null;
      const htmlUrl = result.html
        ? "/maps/" + path.basename(result.html)
        : null;

      return NextResponse.json({
        success: true,
        png: pngUrl,
        html: htmlUrl,
        count: result.count,
        center: result.center,
        species,
      });
    } catch (execErr) {
      const stderr = (execErr as { stderr?: string })?.stderr || "";
      console.error("Python exec error:", execErr);
      if (stderr) console.error("Python stderr:", stderr);
      return NextResponse.json(
        { error: "Map generation failed", details: stderr || String(execErr) },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
