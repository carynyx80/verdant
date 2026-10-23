import { formatEther, parseEther, isAddress, type Address } from "viem";
export type MarketToken = {
  address: Address;
  market: Address;
  name: string;
  symbol: string;
  creator: string;
  creatorBps: number;
  reserveBNB?: string;
  virtualToken?: string;
  totalSupply?: string;
  priceBNB?: string;
  marketCapBNB?: string;
  volume24hBNB?: string;
  volumeBNB?: string;
  volumeWindowLabel?: string;
  feeRouter?: Address;
  approvedRoute?: Address;
  dexRouter?: Address;
  poolAddress?: Address;
  graduated?: boolean;
  blockNumber?: string;
  createdAt?: string;
  weights?: number[];
};
export type MarketTrade = {
  id: string;
  buy: boolean;
  bnb: string;
  tokens: string;
  transactionHash: string;
  trader?: string;
  reserve: string;
  tokenReserve: string;
  blockNumber?: string;
  timestamp?: number;
  createdAt?: string;
};
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export function configuredAddress(
  value: string | undefined,
): Address | undefined {
  return value && isAddress(value) && value.toLowerCase() !== ZERO_ADDRESS
    ? (value as Address)
    : undefined;
}
export function parsePositiveAmount(value: string): bigint | undefined {
  if (!/^(?:\d+(?:\.\d{0,18})?|\.\d{1,18})$/.test(value)) return;
  try {
    const result = parseEther(value);
    return result > 0n && result < 2n ** 256n ? result : undefined;
  } catch {
    return;
  }
}
export function slippageBps(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return;
  const n = Math.round(Number(value) * 100);
  return Number.isFinite(n) && n >= 10 && n <= 500 ? n : undefined;
}
export function minimumReceived(quote: bigint, bps: number) {
  if (!Number.isInteger(bps) || bps < 10 || bps > 500)
    throw Error("Slippage must be between 0.10% and 5%");
  return (quote * BigInt(10000 - bps)) / 10000n;
}
export function marketMetrics(
  reserve: bigint,
  virtualToken: bigint,
  supply: bigint,
) {
  if (reserve < 0n || virtualToken <= 0n || supply < 0n)
    throw Error("Invalid market reserves");
  const virtualBNB = 30n * 10n ** 18n + reserve;
  return {
    priceBNB: formatEther((virtualBNB * 10n ** 18n) / virtualToken),
    marketCapBNB: formatEther((virtualBNB * supply) / virtualToken),
  };
}
export function discoverTokens(
  tokens: MarketToken[],
  query: string,
  sort: string,
  feeMax: number,
  utility: string,
) {
  const q = query.trim().toLowerCase();
  const filtered = tokens.filter(
    (t) =>
      `${t.name} ${t.symbol} ${t.address}`.toLowerCase().includes(q) &&
      t.creatorBps <= feeMax &&
      (utility === "all" || !!t.weights?.[Number(utility)]),
  );
  return filtered.sort((a, b) => {
    if (sort === "Near graduation")
      return Number(b.reserveBNB || 0) - Number(a.reserveBNB || 0);
    if (sort === "Top volume" || sort === "Trending")
      return (
        Number(b.volumeBNB ?? b.volume24hBNB ?? 0) -
        Number(a.volumeBNB ?? a.volume24hBNB ?? 0)
      );
    return Number(BigInt(b.blockNumber || "0") - BigInt(a.blockNumber || "0"));
  });
}
export function timeframeTrades(
  trades: MarketTrade[],
  frame: string,
  now = Date.now(),
) {
  const duration = (
    { "5M": 300, "1H": 3600, "4H": 14400, "1D": 86400 } as Record<
      string,
      number
    >
  )[frame];
  if (!duration) return [];
  return trades
    .filter((t) => {
      const time =
        t.timestamp ?? (t.createdAt ? Date.parse(t.createdAt) / 1000 : NaN);
      return (
        Number.isFinite(time) &&
        time >= now / 1000 - duration &&
        time <= now / 1000
      );
    })
    .sort(
      (a, b) =>
        (a.timestamp ?? Date.parse(a.createdAt || "") / 1000) -
        (b.timestamp ?? Date.parse(b.createdAt || "") / 1000),
    );
}
export function validateIdentity(data: {
  name: string;
  symbol: string;
  description: string;
  image: string;
  website: string;
  x: string;
  telegram: string;
}) {
  const errors: string[] = [];
  if (
    !data.name.trim() ||
    new TextEncoder().encode(data.name.trim()).length > 64
  )
    errors.push("Token name must contain 1–64 UTF-8 bytes.");
  if (!/^[A-Z0-9]{1,12}$/.test(data.symbol))
    errors.push("Symbol must use 1–12 uppercase letters or numbers.");
  if (data.description.length > 2000)
    errors.push("Description must be at most 2,000 characters.");
  for (const key of ["image", "website", "x", "telegram"] as const) {
    if (!data[key]) continue;
    try {
      const u = new URL(data[key]);
      if (data[key].length > 512 || !["https:", "ipfs:"].includes(u.protocol))
        throw Error();
    } catch {
      errors.push(`${key} must be a valid HTTPS or IPFS URL.`);
    }
  }
  return errors;
}
