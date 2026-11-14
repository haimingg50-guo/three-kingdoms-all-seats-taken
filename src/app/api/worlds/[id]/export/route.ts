import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { exportBundle } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const bundle = await exportBundle(id, await actorHash(request));
    return NextResponse.json(bundle, {
      headers: { "content-disposition": `attachment; filename="${id}-chronicle.json"` },
    });
  } catch (error) {
    return fail(error);
  }
}
