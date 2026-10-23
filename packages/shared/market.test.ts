import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePositiveAmount,
  slippageBps,
  minimumReceived,
  discoverTokens,
  timeframeTrades,
  validateIdentity,
  marketMetrics,
  type MarketToken,
} from "./market";
test("rejects malformed and overflowing financial inputs without throwing", () => {
  for (const v of [
    "",
    "-1",
    "NaN",
    "1e5",
    "0",
    "0.0000000000000000001",
    "1.2345678901234567890",
    (2n ** 256n).toString(),
  ])
    assert.equal(parsePositiveAmount(v), undefined);
  assert.equal(parsePositiveAmount(".1"), 10n ** 17n);
  assert.equal(slippageBps(""), undefined);
  assert.equal(slippageBps("NaN"), undefined);
  assert.equal(slippageBps("10"), undefined);
  assert.equal(slippageBps("0.10"), 10);
  assert.equal(minimumReceived(10001n, 100), 9900n);
});
test("filters and discovery sorting use actual token properties", () => {
  const items = [
    {
      name: "Alpha",
      symbol: "AAA",
      address: "0x1",
      market: "0x11",
      creator: "0x12",
      creatorBps: 100,
      reserveBNB: "1",
      volume24hBNB: "9",
      blockNumber: "1",
      weights: [3000, 0, 0, 0, 7000],
    },
    {
      name: "Beta",
      symbol: "BBB",
      address: "0x2",
      market: "0x21",
      creator: "0x22",
      creatorBps: 300,
      reserveBNB: "8",
      volume24hBNB: "2",
      blockNumber: "2",
      weights: [0, 0, 0, 0, 10000],
    },
  ] as MarketToken[];
  assert.equal(
    discoverTokens(items, "", "Near graduation", 1000, "all")[0].name,
    "Beta",
  );
  assert.equal(
    discoverTokens(items, "", "Top volume", 1000, "all")[0].name,
    "Alpha",
  );
  assert.equal(
    discoverTokens(items, "", "New launches", 1000, "all")[0].name,
    "Beta",
  );
  assert.equal(discoverTokens(items, "", "Trending", 100, "all").length, 1);
  assert.equal(discoverTokens(items, "beta", "Trending", 1000, "0").length, 0);
  assert.equal(items[0].name, "Alpha");
});
test("chart frames filter by actual block time and exclude untimed data", () => {
  const now = 1700000000000;
  const input = [
    { id: "recent", timestamp: now / 1000 - 60 },
    { id: "hour", timestamp: now / 1000 - 1800 },
    { id: "old", timestamp: now / 1000 - 90000 },
    { id: "unknown" },
  ] as any;
  assert.deepEqual(
    timeframeTrades(input, "5M", now).map((t) => t.id),
    ["recent"],
  );
  assert.deepEqual(
    timeframeTrades(input, "1H", now).map((t) => t.id),
    ["hour", "recent"],
  );
});
test("identity validation matches contract byte limits and rejects unsafe links", () => {
  const good = {
    name: "Verdant",
    symbol: "VERD",
    description: "",
    image: "",
    website: "https://example.com",
    x: "",
    telegram: "",
  };
  assert.equal(validateIdentity(good).length, 0);
  assert(validateIdentity({ ...good, name: "🌱".repeat(17) }).length);
  assert(
    validateIdentity({ ...good, symbol: "a b", website: "javascript:alert(1)" })
      .length >= 2,
  );
  assert.equal(
    marketMetrics(0n, 1_073_000_000n * 10n ** 18n, 1_000_000_000n * 10n ** 18n)
      .marketCapBNB,
    "27.958993476234855545",
  );
});
