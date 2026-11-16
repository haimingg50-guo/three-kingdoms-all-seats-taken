import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { createInstance, listExperiments } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ worlds: await listExperiments() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      profile?: string;
      kind?: "experiment" | "sandbox";
      acknowledgeSeason?: boolean;
    };
    const created = await createInstance({
      actorHash: await actorHash(request),
      name: body.name ?? "",
      profile: body.profile ?? "river_board",
      kind: body.kind === "experiment" ? "experiment" : "sandbox",
      acknowledgeSeason: body.acknowledgeSeason,
    });
    return NextResponse.json(created);
  } catch (error) {
    return fail(error);
  }
}
