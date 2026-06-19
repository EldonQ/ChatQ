import { NextRequest, NextResponse } from "next/server";
import { runMapVisualization } from "@/lib/map-runner";
import { z } from "zod";

const bodySchema = z.object({
  csv: z.string().min(1),
  species: z.union([z.string(), z.array(z.string())]).optional(),
  speciesColumn: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await runMapVisualization(parsed.data);

    return NextResponse.json({
      success: true,
      png: result.png,
      html: result.html,
      count: result.count,
      center: result.center,
      species: result.species,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Map API error:", err);
    return NextResponse.json(
      { error: "Map generation failed", details: message },
      { status: 500 },
    );
  }
}
