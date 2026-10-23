import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  ProtocolReader,
  ProtocolError,
} from "../../../../../packages/blockchain/reader";
import { configuredAddress } from "../../../../../packages/shared/market";
export const dynamic = "force-dynamic";
const reader = new ProtocolReader({
  factory: configuredAddress(
    process.env.FACTORY_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  ),
  rpc: process.env.BNB_RPC_URL || process.env.NEXT_PUBLIC_BNB_RPC_URL,
  startBlock: /^\d+$/.test(process.env.START_BLOCK || "")
    ? BigInt(process.env.START_BLOCK!)
    : 0n,
});
export async function GET(request: Request) {
  try {
    const path = new URL(request.url).pathname;
    if (path === "/api/admin/health") {
      const expected = process.env.ADMIN_API_TOKEN,
        supplied =
          request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
      if (
        !expected ||
        expected.length < 32 ||
        Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
      )
        return NextResponse.json(
          { error: "Admin authentication required" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      return NextResponse.json(
        { protocol: await reader.health(), database: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (path === "/api/health") return NextResponse.json(await reader.health());
    if (path === "/api/tokens") return NextResponse.json(await reader.tokens());
    const match = path.match(
      /^\/api\/tokens\/([^/]+)(?:\/(trades|fees|holders))?$/,
    );
    if (match) {
      const [, address, resource] = match;
      return NextResponse.json(
        resource === "trades"
          ? await reader.trades(address)
          : resource === "fees"
            ? await reader.feeActivity(address)
            : resource === "holders"
              ? await reader.holders(address)
              : { item: await reader.token(address), verified: true },
      );
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    const error =
      e instanceof ProtocolError
        ? e
        : new ProtocolError(
            "Unable to verify blockchain data. Check the configured RPC and factory.",
          );
    return NextResponse.json(
      { error: error.message, verified: false },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Persistent authenticated metadata API is not configured. Set NEXT_PUBLIC_API_URL to the Nest API before launching.",
    },
    { status: 503 },
  );
}
