import { PrismaClient } from "@prisma/client";
import {
  createPublicClient,
  http,
  isAddress,
  decodeEventLog,
  type Address,
  type Abi,
} from "viem";
import { bsc } from "viem/chains";
import {
  factoryAbi,
  curveAbi,
  routerEventsAbi,
  feeAbi,
} from "../../../packages/blockchain/abi";
const json = (x: unknown) =>
  JSON.parse(
    JSON.stringify(x, (_, v) =>
      typeof v === "bigint"
        ? v.toString()
        : typeof v === "string" && /^0x[a-fA-F0-9]{40}$/.test(v)
          ? v.toLowerCase()
          : v,
    ),
  );
export async function indexBatch(db: PrismaClient) {
  const rpc = process.env.BNB_RPC_URL,
    factory = process.env.FACTORY_ADDRESS?.toLowerCase() as Address;
  if (
    !rpc ||
    !factory ||
    !isAddress(factory) ||
    !/^\d+$/.test(process.env.START_BLOCK || "")
  )
    throw Error(
      "Valid BNB_RPC_URL, FACTORY_ADDRESS and START_BLOCK are required",
    );
  const checkpointId = `bsc:${factory}`,
    start = BigInt(process.env.START_BLOCK!);
  const client = createPublicClient({
    chain: bsc,
    transport: http(rpc, { retryCount: 3, timeout: 15000 }),
  });
  if ((await client.getChainId()) !== 56) throw Error("Wrong chain");
  const head = await client.getBlockNumber({ cacheTime: 0 });
  if (head < 20n) return;
  const target = head - 20n;
  let cursor = await db.checkpoint.findUnique({ where: { id: checkpointId } });
  if (
    cursor &&
    (await client.getBlock({ blockNumber: cursor.blockNumber })).hash !==
      cursor.blockHash
  ) {
    const retained = await db.canonicalBlock.findMany({
      where: { checkpointId },
      orderBy: { blockNumber: "desc" },
      take: 32,
    });
    let ancestor: (typeof retained)[number] | undefined;
    for (const block of retained) {
      if (
        (await client.getBlock({ blockNumber: block.blockNumber })).hash ===
        block.blockHash
      ) {
        ancestor = block;
        break;
      }
    }
    if (!ancestor)
      throw Error(
        "CONFIRMED_REORG: no trusted retained ancestor; pause and reconcile before replay.",
      );
    const previous = cursor,
      common = ancestor;
    const recovered = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(566180)`;
      const current = await tx.checkpoint.findUnique({
        where: { id: checkpointId },
      });
      if (
        current?.blockHash !== previous.blockHash ||
        current.blockNumber !== previous.blockNumber
      )
        return false;
      const owned = await tx.token.findMany({
        where: { factory },
        select: { address: true },
      });
      const tokens = owned.map((t) => t.address);
      await tx.trade.deleteMany({
        where: {
          token: { in: tokens },
          blockNumber: { gt: common.blockNumber },
        },
      });
      await tx.chainEvent.deleteMany({
        where: { factory, blockNumber: { gt: common.blockNumber } },
      });
      await tx.token.deleteMany({
        where: { factory, blockNumber: { gt: common.blockNumber } },
      });
      await tx.canonicalBlock.deleteMany({
        where: { checkpointId, blockNumber: { gt: common.blockNumber } },
      });
      await tx.checkpoint.update({
        where: { id: checkpointId },
        data: { blockNumber: common.blockNumber, blockHash: common.blockHash },
      });
      await tx.auditLog.create({
        data: {
          actor: "indexer",
          action: "CONFIRMED_REORG_REPLAY",
          payload: {
            factory,
            previous: previous.blockNumber.toString(),
            ancestor: common.blockNumber.toString(),
          },
        },
      });
      return true;
    });
    if (!recovered) return { retry: true };
    cursor = await db.checkpoint.findUnique({ where: { id: checkpointId } });
  }
  const from = cursor ? cursor.blockNumber + 1n : start;
  if (from > target) return;
  const to = from + 99n < target ? from + 99n : target;
  const markets = await db.token.findMany({
    where: { factory },
    select: { market: true, address: true },
  });
  const router = await client.readContract({
    address: factory,
    abi: factoryAbi,
    functionName: "feeRouter",
    blockNumber: to,
  });
  const launchEvent = factoryAbi.find((a) => a.type === "event")!;
  const launches = await client.getLogs({
    address: factory,
    event: launchEvent as any,
    fromBlock: from,
    toBlock: to,
    strict: true,
  });
  const decoded = launches.map((l) => ({
    log: l,
    args: (
      decodeEventLog({ abi: factoryAbi, data: l.data, topics: l.topics }) as any
    ).args,
  }));
  const addresses = [
    ...new Set(
      [
        router,
        ...markets.flatMap((t) => [t.market, t.address]),
        ...decoded.flatMap((d) => [d.args.market, d.args.token]),
      ].map((a) => a.toLowerCase()),
    ),
  ] as Address[];
  const logs: any[] = [];
  for (let i = 0; i < addresses.length; i += 50)
    logs.push(
      ...(await client.getLogs({
        address: addresses.slice(i, i + 50),
        fromBlock: from,
        toBlock: to,
      })),
    );
  const heights = [
    ...new Set([
      ...logs.map((l) => l.blockNumber.toString()),
      ...launches.map((l) => l.blockNumber!.toString()),
      to.toString(),
    ]),
  ];
  const blocks = new Map<string, Awaited<ReturnType<typeof client.getBlock>>>();
  for (let i = 0; i < heights.length; i += 8) {
    for (const block of await Promise.all(
      heights
        .slice(i, i + 8)
        .map((n) => client.getBlock({ blockNumber: BigInt(n) })),
    ))
      blocks.set(block.number!.toString(), block);
  }
  for (const log of [...launches, ...logs])
    if (blocks.get(log.blockNumber!.toString())?.hash !== log.blockHash)
      throw Error("Reorg during range read; retry without committing");
  const final = blocks.get(to.toString())!;
  if ((await client.getBlock({ blockNumber: to })).hash !== final.hash)
    throw Error("Reorg before commit");
  const expected = cursor;
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(566180)`;
      const current = await tx.checkpoint.findUnique({
        where: { id: checkpointId },
      });
      if (
        (current?.blockHash || null) !== (expected?.blockHash || null) ||
        (current?.blockNumber ?? null) !== (expected?.blockNumber ?? null)
      )
        return { retry: true };
      for (const { log, args: a } of decoded) {
        const record = {
          factory,
          address: a.token.toLowerCase(),
          market: a.market.toLowerCase(),
          name: a.name,
          symbol: a.symbol,
          creator: a.creator.toLowerCase(),
          creatorBps: a.creatorBps,
          metadataURI: a.metadataURI,
          blockNumber: log.blockNumber!,
          blockHash: log.blockHash!,
          transactionHash: log.transactionHash!,
          createdAt: new Date(
            Number(blocks.get(log.blockNumber!.toString())!.timestamp) * 1000,
          ),
        };
        await tx.token.upsert({
          where: { address: record.address },
          update: record,
          create: record,
        });
      }
      for (const log of logs) {
        let event: any;
        try {
          event = decodeEventLog({
            abi: [
              ...curveAbi,
              ...routerEventsAbi,
              {
                type: "event",
                name: "Transfer",
                inputs: [
                  { name: "from", type: "address", indexed: true },
                  { name: "to", type: "address", indexed: true },
                  { name: "value", type: "uint256", indexed: false },
                ],
              },
            ] as Abi,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          continue;
        }
        const id = `56:${log.transactionHash}:${log.logIndex}`;
        const record = {
          id,
          factory,
          contract: log.address.toLowerCase(),
          name: event.eventName,
          payload: json(event.args),
          blockNumber: log.blockNumber!,
          blockHash: log.blockHash!,
          transactionHash: log.transactionHash!,
          logIndex: log.logIndex!,
        };
        await tx.chainEvent.upsert({
          where: { id },
          update: record,
          create: record,
        });
        if (event.eventName === "Trade") {
          const token = await tx.token.findUnique({
            where: { market: log.address.toLowerCase() },
          });
          if (!token || token.factory !== factory)
            throw Error("Unknown or cross-factory market");
          const a = event.args;
          const trade = {
            id,
            token: token.address,
            trader: a.trader.toLowerCase(),
            buy: a.buy,
            bnb: a.bnb.toString(),
            tokens: a.tokens.toString(),
            creatorFee: a.creatorFee.toString(),
            protocolFee: a.protocolFee.toString(),
            reserve: a.reserve.toString(),
            tokenReserve: a.tokenReserve.toString(),
            blockNumber: log.blockNumber!,
            blockHash: log.blockHash!,
            transactionHash: log.transactionHash!,
            logIndex: log.logIndex!,
            createdAt: new Date(
              Number(blocks.get(log.blockNumber!.toString())!.timestamp) * 1000,
            ),
          };
          await tx.trade.upsert({
            where: { id },
            update: trade,
            create: trade,
          });
        }
      }
      await tx.canonicalBlock.upsert({
        where: { id: `${checkpointId}:${to}` },
        update: { blockHash: final.hash! },
        create: {
          id: `${checkpointId}:${to}`,
          checkpointId,
          blockNumber: to,
          blockHash: final.hash!,
        },
      });
      await tx.canonicalBlock.deleteMany({
        where: {
          checkpointId,
          blockNumber: { lt: to > 10000n ? to - 10000n : 0n },
        },
      });
      await tx.checkpoint.upsert({
        where: { id: checkpointId },
        update: { blockNumber: to, blockHash: final.hash! },
        create: { id: checkpointId, blockNumber: to, blockHash: final.hash! },
      });
      return { from: from.toString(), to: to.toString(), events: logs.length };
    },
    { timeout: 30000 },
  );
}
