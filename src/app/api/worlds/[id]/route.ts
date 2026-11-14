import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { viewWorld } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const world = await viewWorld(id, await actorHash(request));
    return NextResponse.json(world);
  } catch (error) {
    return fail(error);
  }
}
