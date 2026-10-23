import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  Module,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  HttpException,
} from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { PrismaClient } from "@prisma/client";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";
import { verifyMessage, isAddress, type Address } from "viem";
import {
  ProtocolReader,
  ProtocolError,
} from "../../../packages/blockchain/reader";
import { configuredAddress } from "../../../packages/shared/market";
import {
  metadataSchema,
  metadataHash,
  metadataMessage,
} from "../../../packages/shared/metadata";
const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const reader = new ProtocolReader({
  factory: configuredAddress(
    process.env.FACTORY_ADDRESS || process.env.NEXT_PUBLIC_FACTORY_ADDRESS,
  ),
  rpc: process.env.BNB_RPC_URL,
  startBlock: /^\d+$/.test(process.env.START_BLOCK || "")
    ? BigInt(process.env.START_BLOCK!)
    : 0n,
});
const origin = (process.env.PUBLIC_API_URL || "http://localhost:3001").replace(
  /\/$/,
  "",
);
const json = (value: unknown) =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
const address = z
  .string()
  .refine((v) => isAddress(v), "Invalid wallet address");
const requests = new Map<string, { count: number; until: number }>();
function limit(key: string, max = 20) {
  const now = Date.now();
  if (requests.size > 10000)
    for (const [k, value] of requests)
      if (value.until < now) requests.delete(k);
  if (requests.size > 10000) throw new HttpException("Try again later", 429);
  let entry = requests.get(key);
  if (!entry || entry.until < now) {
    entry = { count: 0, until: now + 60000 };
    requests.set(key, entry);
  }
  if (++entry.count > max)
    throw new HttpException("Too many requests. Try again in one minute.", 429);
}
function admin(authorization?: string) {
  const expected = process.env.ADMIN_API_TOKEN,
    supplied = authorization?.replace(/^Bearer /, "") || "";
  if (
    !expected ||
    expected.length < 32 ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    throw new UnauthorizedException("Admin authentication required");
}
async function chain<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ProtocolError)
      throw new HttpException(e.message, e.status);
    throw new ServiceUnavailableException("Unable to verify blockchain data");
  }
}
@Controller()
class API {
  @Get("health") async health() {
    let database = false;
    if (db)
      try {
        await db.$queryRaw`SELECT 1`;
        database = true;
      } catch {}
    const status = await reader.health();
    return {
      ...status,
      database,
      capabilities: {
        ...status.capabilities,
        metadata: database,
        agents: false,
      },
    };
  }
  @Get("tokens") async tokens() {
    return chain(() => reader.tokens());
  }
  @Get("tokens/:address") async token(@Param("address") a: string) {
    return { item: await chain(() => reader.token(a)), verified: true };
  }
  @Get("tokens/:address/trades") async trades(@Param("address") a: string) {
    if (!isAddress(a)) throw new BadRequestException("Invalid address");
    if (!reader.factory) return { items: [], verified: false };
    const token = await chain(() => reader.token(a));
    if (db) {
      const cursor = await db.checkpoint.findUnique({
        where: { id: `bsc:${reader.factory.toLowerCase()}` },
      });
      if (cursor) {
        const canonical = await reader.client.getBlock({
          blockNumber: cursor.blockNumber,
        });
        const head = await reader.client.getBlockNumber();
        if (
          canonical.hash !== cursor.blockHash ||
          head - cursor.blockNumber > 300n
        )
          throw new ServiceUnavailableException(
            "Indexer requires reconciliation or catch-up",
          );
        return {
          items: json(
            await db.trade.findMany({
              where: {
                token: token.address,
                blockNumber: { lte: cursor.blockNumber },
              },
              orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
              take: 300,
            }),
          ),
          verified: true,
          partial: true,
          scope: "Latest 300 confirmed indexed curve trades.",
        };
      }
    }
    return chain(() => reader.trades(a));
  }
  @Get("tokens/:address/fees") async fees(@Param("address") a: string) {
    return chain(() => reader.feeActivity(a));
  }
  @Get("tokens/:address/holders") async holders(@Param("address") a: string) {
    return chain(() => reader.holders(a));
  }
  @Get("metadata/:id") async getMetadata(@Param("id") id: string) {
    if (!db) throw new ServiceUnavailableException("Database not configured");
    const m = await db.tokenMetadata.findUnique({ where: { id } });
    if (!m) throw new NotFoundException();
    return m.payload;
  }
  @Post("auth/challenge") async challenge(
    @Body() body: unknown,
    @Req() req: { ip?: string },
  ) {
    if (!db)
      throw new ServiceUnavailableException("Metadata database not configured");
    limit(`challenge:${req.ip || "unknown"}`);
    const parsed = z
      .object({
        wallet: address,
        payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        "Wallet and SHA256 metadata hash are required",
      );
    const nonce = randomUUID(),
      expiresAt = new Date(Date.now() + 300000);
    const message = metadataMessage(
      parsed.data.wallet,
      nonce,
      parsed.data.payloadHash,
      expiresAt.toISOString(),
      origin,
    );
    await db.walletNonce.create({
      data: {
        id: nonce,
        wallet: parsed.data.wallet.toLowerCase(),
        payloadHash: parsed.data.payloadHash,
        message,
        expiresAt,
      },
    });
    return { nonce, message, expiresAt: expiresAt.toISOString() };
  }
  @Post("metadata") async saveMetadata(
    @Body() body: unknown,
    @Req() req: { ip?: string },
  ) {
    if (!db) throw new ServiceUnavailableException("Database not configured");
    limit(`metadata:${req.ip || "unknown"}`, 10);
    const parsed = z
      .object({
        metadata: metadataSchema,
        authorization: z.object({
          wallet: address,
          nonce: z.string().uuid(),
          signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
        }),
      })
      .safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        "Valid metadata and a one-time wallet signature are required",
      );
    const { metadata, authorization } = parsed.data;
    const nonce = await db.walletNonce.findUnique({
      where: { id: authorization.nonce },
    });
    if (
      !nonce ||
      nonce.consumedAt ||
      nonce.expiresAt.getTime() <= Date.now() ||
      nonce.wallet !== authorization.wallet.toLowerCase() ||
      nonce.payloadHash !== metadataHash(metadata)
    )
      throw new UnauthorizedException(
        "Challenge expired, used, or does not match this upload",
      );
    let verified = false;
    try {
      verified = await verifyMessage({
        address: authorization.wallet as Address,
        message: nonce.message,
        signature: authorization.signature as `0x${string}`,
      });
    } catch {}
    if (!verified)
      throw new UnauthorizedException("Wallet signature verification failed");
    const result = await db.$transaction(async (tx) => {
      const consumed = await tx.walletNonce.updateMany({
        where: {
          id: nonce.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new UnauthorizedException("Challenge has already been used");
      const m = await tx.tokenMetadata.create({ data: { payload: metadata } });
      await tx.auditLog.create({
        data: {
          actor: nonce.wallet,
          action: "METADATA_CREATED",
          payload: { id: m.id, payloadHash: nonce.payloadHash },
        },
      });
      return m;
    });
    return { uri: `${origin}/metadata/${result.id}` };
  }
  @Get("admin/health") async inspect(
    @Req() req: { headers: { authorization?: string }; ip?: string },
  ) {
    limit(`admin:${req.ip || "unknown"}`, 30);
    admin(req.headers.authorization);
    return {
      protocol: await reader.health(),
      database: db ? await db.$queryRaw`SELECT 1` : null,
      checkpoint:
        db && reader.factory
          ? json(
              await db.checkpoint.findUnique({
                where: { id: `bsc:${reader.factory.toLowerCase()}` },
              }),
            )
          : null,
    };
  }
}
@Module({ controllers: [API] })
class AppModule {}
async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["error", "warn", "log"],
  });
  app.useBodyParser("json", { limit: "16kb" });
  app.enableCors({
    origin: (process.env.WEB_ORIGIN || "http://localhost:3000")
      .split(",")
      .map((s) => s.trim()),
    methods: ["GET", "POST"],
  });
  app.use(
    (
      _req: unknown,
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.enableShutdownHooks();
  await app.listen(
    Number(process.env.PORT || 3001),
    process.env.API_BIND_HOST ||
      (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
