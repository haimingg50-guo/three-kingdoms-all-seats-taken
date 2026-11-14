import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GameError } from "./store";

const COOKIE = "tx_session";

export async function actorHash(request: Request): Promise<string> {
  const jar = await cookies();
  let token = jar.get(COOKIE)?.value;
  if (!token || !/^[\w-]{20,120}$/.test(token)) {
    token = randomBytes(24).toString("base64url");
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      secure: proto === "https",
    });
  }
  return createHash("sha256").update(token).digest("hex");
}

export function fail(error: unknown) {
  if (error instanceof GameError) {
    return NextResponse.json(
      { error: error.message, existingId: error.existingId },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "unknown";
  if (!message.includes("://")) console.error(message);
  return NextResponse.json({ error: "这一步没有完成" }, { status: 500 });
}
