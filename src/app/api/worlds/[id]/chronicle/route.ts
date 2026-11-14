import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { chronicle } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const entries = await chronicle(id, await actorHash(request));
    return NextResponse.json({ entries });
  } catch (error) {
    return fail(error);
  }
}
