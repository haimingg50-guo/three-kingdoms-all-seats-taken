import { NextResponse } from "next/server";
import { fail } from "@/server/http";
import { refereeAct } from "@/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { token?: string; roleId?: string; reason?: string };
    if (!body.token || !body.roleId || !body.reason) {
      return NextResponse.json({ error: "需要令牌、席位和原因" }, { status: 400 });
    }
    const result = await refereeAct(id, body.token, body.roleId, body.reason);
    return NextResponse.json(result);
  } catch (error) {
    return fail(error);
  }
}
