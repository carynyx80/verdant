import {
  createPublicClient,
  http,
  erc20Abi,
  parseAbi,
  formatEther,
  isAddress,
  type Address,
  type PublicClient,
  decodeEventLog,
} from "viem";
import { bsc } from "viem/chains";
import { factoryAbi, curveAbi, feeAbi, routerEventsAbi } from "./abi";
import {
  configuredAddress,
  marketMetrics,
  type MarketToken,
  type MarketTrade,
  ZERO_ADDRESS,
} from "../shared/market";

const marketExtra = parseAbi([
  "function graduationAdapter() view returns(address)",
]);
const routerExtra = parseAbi([
  "function approvedRoute() view returns(address)",
]);
const managerAbi = parseAbi(["function poolOf(address) view returns(address)"]);
const routeAbi = parseAbi(["function dex() view returns(address)"]);
const dexAbi = parseAbi(["function WETH() view returns(address)"]);
const pairAbi = parseAbi([
  "function token0() view returns(address)",
  "function getReserves() view returns(uint112 reserve0,uint112 reserve1,uint32 blockTimestampLast)",
]);
const transferAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
export class ProtocolError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export type ProtocolToken = MarketToken & {
  feeRouter: Address;
  approvedRoute?: Address;
  dexRouter?: Address;
  poolAddress?: Address;
  volumeBNB?: string;
  volumeWindowLabel?: string;
};
type ReaderConfig = {
  factory?: Address;
  rpc?: string;
  startBlock?: bigint;
  confirmations?: bigint;
  expectedChainId?: number;
  client?: PublicClient;
};

export class ProtocolReader {
  readonly client: PublicClient;
  readonly factory?: Address;
  readonly confirmations: bigint;
  readonly startBlock: bigint;
  readonly expectedChainId: number;
  private cache = new Map<string, { expires: number; value: Promise<any> }>();
  constructor(config: ReaderConfig = {}) {
    this.factory = config.factory;
    this.client =
      config.client ??
      (createPublicClient({
        chain: bsc,
        transport: http(config.rpc || "https://bsc-dataseed.bnbchain.org", {
          timeout: 12000,
          retryCount: 2,
        }),
      }) as PublicClient);
    this.confirmations = config.confirmations ?? 20n;
    this.startBlock = config.startBlock ?? 0n;
    this.expectedChainId = config.expectedChainId ?? 56;
  }
  private remember<T>(
    key: string,
    fn: () => Promise<T>,
    ttl = 15000,
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const value = fn().catch((error) => {
      this.cache.delete(key);
      throw error;
    });
    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(key, { expires: Date.now() + ttl, value });
    return value;
  }
  async snapshot() {
    if (!this.factory)
      throw new ProtocolError(
        "No launchpad factory has been deployed or configured.",
      );
    return this.remember("snapshot", async () => {
      if ((await this.client.getChainId()) !== this.expectedChainId)
        throw new ProtocolError(
          "RPC network does not match the configured chain.",
        );
      const head = await this.client.getBlockNumber({ cacheTime: 0 });
      const blockNumber =
        head > this.confirmations ? head - this.confirmations : 0n;
      if (this.startBlock > blockNumber)
        throw new ProtocolError(
          "Configured start block is beyond the confirmed chain head.",
        );
      const code = await this.client.getBytecode({
        address: this.factory!,
        blockNumber,
      });
      if (!code || code === "0x")
        throw new ProtocolError(
          "The configured factory has no confirmed contract code.",
        );
      return { blockNumber, head };
    });
  }
  async health() {
    if (!this.factory)
      return {
        status: "ok",
        mode: "undeployed",
        chainId: this.expectedChainId,
        capabilities: {
          discovery: false,
          trading: false,
          metadata: false,
          agents: false,
        },
        message:
          "Contracts have not been deployed. Wallet connection and allocation design are available.",
      };
    try {
      const state = await this.snapshot();
      return {
        status: "ok",
        mode: "configured",
        chainId: this.expectedChainId,
        blockNumber: state.blockNumber.toString(),
        capabilities: {
          discovery: true,
          trading: true,
          metadata: false,
          agents: false,
        },
        message:
          "Confirmed read-only contract data. A persistent authenticated API is required to store launch metadata.",
      };
    } catch (e) {
      return {
        status: "degraded",
        mode: "misconfigured",
        chainId: this.expectedChainId,
        capabilities: {
          discovery: false,
          trading: false,
          metadata: false,
          agents: false,
        },
        message:
          e instanceof ProtocolError
            ? e.message
            : "RPC verification unavailable. Check the server configuration.",
      };
    }
  }
  async token(address: string): Promise<ProtocolToken> {
    if (!isAddress(address) || address.toLowerCase() === ZERO_ADDRESS)
      throw new ProtocolError("Invalid token address.", 400);
    const normalized = address.toLowerCase() as Address;
    return this.remember(`token:${normalized}`, async () => {
      const { blockNumber } = await this.snapshot();
      const market = await this.client.readContract({
        address: this.factory!,
        abi: factoryAbi,
        functionName: "marketOf",
        args: [normalized],
        blockNumber,
      });
      if (market === ZERO_ADDRESS)
        throw new ProtocolError(
          "Token is not registered with this factory.",
          404,
        );
      const feeRouter = await this.client.readContract({
        address: this.factory!,
        abi: factoryAbi,
        functionName: "feeRouter",
        blockNumber,
      });
      const values = await this.client.multicall({
        blockNumber,
        allowFailure: false,
        contracts: [
          { address: normalized, abi: erc20Abi, functionName: "name" },
          { address: normalized, abi: erc20Abi, functionName: "symbol" },
          { address: normalized, abi: erc20Abi, functionName: "totalSupply" },
          { address: market, abi: curveAbi, functionName: "creatorBps" },
          { address: market, abi: curveAbi, functionName: "reserveBNB" },
          { address: market, abi: curveAbi, functionName: "virtualToken" },
          { address: market, abi: curveAbi, functionName: "graduated" },
          {
            address: feeRouter,
            abi: feeAbi,
            functionName: "configuration",
            args: [normalized],
          },
        ],
      });
      const [
        name,
        symbol,
        supply,
        creatorBps,
        reserve,
        virtualToken,
        graduated,
        config,
      ] = values;
      if (
        !config.exists ||
        config.source.toLowerCase() !== market.toLowerCase()
      )
        throw new ProtocolError(
          "Token registration and fee accounting disagree.",
        );
      let approvedRoute: Address | undefined,
        poolAddress: Address | undefined,
        dexRouter: Address | undefined;
      try {
        const route = await this.client.readContract({
          address: feeRouter,
          abi: routerExtra,
          functionName: "approvedRoute",
          blockNumber,
        });
        approvedRoute = configuredAddress(route);
        if (approvedRoute)
          dexRouter = await this.client.readContract({
            address: approvedRoute,
            abi: routeAbi,
            functionName: "dex",
            blockNumber,
          });
      } catch {}
      let metrics: ReturnType<typeof marketMetrics> | undefined;
      if (!graduated) metrics = marketMetrics(reserve, virtualToken, supply);
      else {
        try {
          const manager = await this.client.readContract({
            address: market,
            abi: marketExtra,
            functionName: "graduationAdapter",
            blockNumber,
          });
          poolAddress = configuredAddress(
            await this.client.readContract({
              address: manager,
              abi: managerAbi,
              functionName: "poolOf",
              args: [normalized],
              blockNumber,
            }),
          );
          if (poolAddress && dexRouter) {
            const [first, rs, wrapped] = await Promise.all([
              this.client.readContract({
                address: poolAddress,
                abi: pairAbi,
                functionName: "token0",
                blockNumber,
              }),
              this.client.readContract({
                address: poolAddress,
                abi: pairAbi,
                functionName: "getReserves",
                blockNumber,
              }),
              this.client.readContract({
                address: dexRouter,
                abi: dexAbi,
                functionName: "WETH",
                blockNumber,
              }),
            ]);
            const native =
              first.toLowerCase() === wrapped.toLowerCase() ? rs[0] : rs[1];
            const tokens =
              first.toLowerCase() === wrapped.toLowerCase() ? rs[1] : rs[0];
            if (tokens > 0n)
              metrics = {
                priceBNB: formatEther((native * 10n ** 18n) / tokens),
                marketCapBNB: formatEther((native * supply) / tokens),
              };
          }
        } catch {}
      }
      return {
        address: normalized,
        market,
        feeRouter,
        name,
        symbol,
        creator: config.payout.toLowerCase(),
        creatorBps,
        reserveBNB: reserve.toString(),
        virtualToken: virtualToken.toString(),
        totalSupply: supply.toString(),
        graduated,
        weights: [...config.weights],
        blockNumber: blockNumber.toString(),
        approvedRoute,
        dexRouter,
        poolAddress,
        ...metrics,
      };
    });
  }
  private async window() {
    const { blockNumber } = await this.snapshot();
    return {
      fromBlock:
        this.startBlock > blockNumber - 5000n
          ? this.startBlock
          : blockNumber > 5000n
            ? blockNumber - 5000n
            : 0n,
      toBlock: blockNumber,
    };
  }
  private async logs(address: Address | Address[], abi: any) {
    const { fromBlock, toBlock } = await this.window();
    const result: any[] = [];
    for (let from = fromBlock; from <= toBlock; from += 1000n) {
      const to = from + 999n < toBlock ? from + 999n : toBlock;
      result.push(
        ...(await this.client.getLogs({
          address,
          fromBlock: from,
          toBlock: to,
          events: abi,
          strict: true,
        })),
      );
    }
    return { logs: result, fromBlock, toBlock };
  }
  async tokens() {
    if (!this.factory)
      return { items: [], verified: false, mode: "undeployed", total: 0 };
    return this.remember("tokens", async () => {
      const { blockNumber } = await this.snapshot();
      const count = await this.client.readContract({
        address: this.factory!,
        abi: factoryAbi,
        functionName: "tokenCount",
        blockNumber,
      });
      const limit = count > 60n ? 60n : count;
      const addresses = limit
        ? await this.client.multicall({
            blockNumber,
            allowFailure: false,
            contracts: Array.from({ length: Number(limit) }, (_, i) => ({
              address: this.factory!,
              abi: factoryAbi,
              functionName: "tokens" as const,
              args: [count - 1n - BigInt(i)] as const,
            })),
          })
        : [];
      const items: ProtocolToken[] = [];
      for (let i = 0; i < addresses.length; i += 4) {
        items.push(
          ...(await Promise.all(
            addresses.slice(i, i + 4).map((a) => this.token(a)),
          )),
        );
      }
      let volumeComplete = false;
      let fromBlock: string | undefined;
      if (items.length) {
        try {
          const history = await this.logs(
            items.map((t) => t.market),
            [curveAbi.find((a) => a.type === "event")],
          );
          fromBlock = history.fromBlock.toString();
          const sums = new Map<string, bigint>();
          for (const log of history.logs) {
            const args = log.args as any;
            sums.set(
              log.address.toLowerCase(),
              (sums.get(log.address.toLowerCase()) || 0n) + BigInt(args.bnb),
            );
          }
          for (const item of items) {
            item.volumeBNB = formatEther(
              sums.get(item.market.toLowerCase()) || 0n,
            );
            item.volumeWindowLabel =
              "Last 5,000 confirmed blocks · curve trades";
          }
          volumeComplete = true;
        } catch {}
      }
      return {
        items,
        verified: true,
        source: "confirmed-rpc",
        blockNumber: blockNumber.toString(),
        total: count.toString(),
        limited: count > limit,
        volumeComplete,
        fromBlock,
      };
    });
  }
  async trades(address: string) {
    return this.remember(`trades:${address.toLowerCase()}`, async () => {
      const token = await this.token(address);
      const history = await this.logs(token.market, [
        curveAbi.find((a) => a.type === "event"),
      ]);
      const last = history.logs.slice(-300);
      const blocks = new Map<string, number>();
      const heights = [...new Set(last.map((l) => l.blockNumber.toString()))];
      for (let i = 0; i < heights.length; i += 8) {
        await Promise.all(
          heights.slice(i, i + 8).map(async (n) => {
            const block = await this.client.getBlock({
              blockNumber: BigInt(n),
            });
            blocks.set(n, Number(block.timestamp));
          }),
        );
      }
      const items: MarketTrade[] = last.map((log) => {
        const a = log.args as any;
        return {
          id: `${log.transactionHash}:${log.logIndex}`,
          buy: a.buy,
          bnb: a.bnb.toString(),
          tokens: a.tokens.toString(),
          trader: a.trader,
          transactionHash: log.transactionHash,
          reserve: a.reserve.toString(),
          tokenReserve: a.tokenReserve.toString(),
          blockNumber: log.blockNumber.toString(),
          timestamp: blocks.get(log.blockNumber.toString()),
          creatorFee: a.creatorFee.toString(),
          protocolFee: a.protocolFee.toString(),
        };
      });
      return {
        items: items.reverse(),
        verified: true,
        partial: true,
        fromBlock: history.fromBlock.toString(),
        toBlock: history.toBlock.toString(),
        scope:
          "Curve trades in the last 5,000 confirmed blocks, up to 300 records. External DEX trades are not included.",
      };
    });
  }
  async feeActivity(address: string) {
    return this.remember(`fees:${address}`, async () => {
      const token = await this.token(address);
      const history = await this.logs(token.feeRouter, routerEventsAbi);
      const items = history.logs
        .filter((l) => (l.args as any).token?.toLowerCase() === token.address)
        .slice(-100)
        .reverse()
        .map((l) => ({
          id: `${l.transactionHash}:${l.logIndex}`,
          name: l.eventName,
          transactionHash: l.transactionHash,
          blockNumber: l.blockNumber.toString(),
          args: JSON.parse(
            JSON.stringify(l.args, (_, v) =>
              typeof v === "bigint" ? v.toString() : v,
            ),
          ),
        }));
      return {
        items,
        verified: true,
        partial: true,
        scope: "Fee events in the last 5,000 confirmed blocks.",
      };
    });
  }
  async holders(address: string) {
    return this.remember(`holders:${address}`, async () => {
      const token = await this.token(address);
      const history = await this.logs(token.address, transferAbi);
      const addresses = [
        ...new Set(
          history.logs
            .flatMap((l) => [(l.args as any).from, (l.args as any).to])
            .filter((a) => a && a.toLowerCase() !== ZERO_ADDRESS),
        ),
      ].slice(-100) as Address[];
      const balances = addresses.length
        ? await this.client.multicall({
            blockNumber: history.toBlock,
            allowFailure: false,
            contracts: addresses.map((a) => ({
              address: token.address,
              abi: erc20Abi,
              functionName: "balanceOf" as const,
              args: [a] as const,
            })),
          })
        : [];
      return {
        items: addresses
          .map((a, i) => ({ address: a, balance: balances[i].toString() }))
          .filter((a) => BigInt(a.balance) > 0n)
          .sort((a, b) => (BigInt(a.balance) > BigInt(b.balance) ? -1 : 1)),
        verified: true,
        partial: true,
        scope:
          "Balances of up to 100 addresses observed transferring in the last 5,000 confirmed blocks. This is not the full holder set.",
      };
    });
  }
}
