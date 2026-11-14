import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { claim } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      roleId?: string;
      citizen?: boolean;
      cityId?: string;
      release?: boolean;
    };
    const result = await claim(id, await actorHash(request), body);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
