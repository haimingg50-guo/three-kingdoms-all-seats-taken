import { NextResponse } from "next/server";
import { actorHash, fail } from "@/server/http";
import { submitOrder, unlockOrder } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = await submitOrder(id, await actorHash(request), body);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await unlockOrder(id, await actorHash(request));
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
