"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useBalance,
  useSwitchChain,
} from "wagmi";
import { erc20Abi, formatEther, parseAbi, type Address } from "viem";
import { ArrowUpRight, ExternalLink, Activity, RefreshCw } from "lucide-react";
import { factoryAbi, curveAbi, feeAbi } from "../../../packages/blockchain/abi";
import {
  configuredAddress,
  parsePositiveAmount,
  slippageBps,
  minimumReceived,
  timeframeTrades,
  type MarketToken,
  type MarketTrade,
} from "../../../packages/shared/market";
const api = process.env.NEXT_PUBLIC_API_URL || "/api";
const factory = configuredAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS);
const categories = [
  "Buyback & burn",
  "Auto liquidity",
  "AI operations",
  "Product treasury",
  "Creator revenue",
];
const routeAbi = parseAbi([
  "function buy(address t,uint256 minTokens,uint256 deadline) payable",
  "function sell(address t,uint256 amount,uint256 minBNB,uint256 deadline)",
]);
const dexAbi = parseAbi([
  "function WETH() view returns(address)",
  "function getAmountsOut(uint256 amountIn,address[] path) view returns(uint256[] amounts)",
]);
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
const amountText = (value: bigint | undefined) =>
  value === undefined
    ? "—"
    : Number(formatEther(value)).toLocaleString(undefined, {
        maximumFractionDigits: 8,
      });
type Quote = {
  out: bigint;
  creator: bigint;
  protocol: bigint;
  impact?: number;
  at: number;
};
type FeeEvent = {
  id: string;
  name: string;
  transactionHash: string;
  blockNumber: string;
  args: { creatorFee?: string; protocolFee?: string; amount?: string };
};
export function TokenWorkspace({
  token,
  address,
  fees,
  error,
  openWallet,
}: {
  token?: MarketToken;
  address: string;
  fees: boolean;
  error?: string;
  openWallet: () => void;
}) {
  const account = useAccount(),
    client = usePublicClient({ chainId: 56 });
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const native = useBalance({ address: account.address, chainId: 56 });
  const [side, setSide] = useState("Buy"),
    [amount, setAmount] = useState(""),
    [slip, setSlip] = useState("1"),
    [quote, setQuote] = useState<Quote>(),
    [quoteError, setQuoteError] = useState("");
  const [reserve, setReserve] = useState<bigint>(),
    [vt, setVt] = useState<bigint>(),
    [creatorFee, setCreatorFee] = useState(token?.creatorBps || 100),
    [graduated, setGraduated] = useState(!!token?.graduated),
    [tokenBalance, setTokenBalance] = useState<bigint>(),
    [router, setRouter] = useState<Address>(),
    [credits, setCredits] = useState<bigint[]>([]),
    [collected, setCollected] = useState<bigint>(),
    [payout, setPayout] = useState<Address>(),
    [weights, setWeights] = useState<number[]>(token?.weights || []);
  const [status, setStatus] = useState(""),
    [readError, setReadError] = useState(""),
    [hash, setHash] = useState<Address>(),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState("Trades"),
    [frame, setFrame] = useState("1H");
  const [history, setHistory] = useState<MarketTrade[]>([]),
    [historyError, setHistoryError] = useState(""),
    [historyScope, setHistoryScope] = useState(""),
    [holders, setHolders] = useState<{ address: string; balance: string }[]>(
      [],
    ),
    [holderScope, setHolderScope] = useState(""),
    [holderError, setHolderError] = useState(""),
    [events, setEvents] = useState<FeeEvent[]>([]),
    [eventError, setEventError] = useState("");
  const n = parsePositiveAmount(amount),
    bps = slippageBps(slip);
  const min =
    quote && bps !== undefined ? minimumReceived(quote.out, bps) : undefined;
  const routed =
    graduated &&
    !!configuredAddress(token?.approvedRoute) &&
    !!configuredAddress(token?.dexRouter);
  useEffect(() => {
    let alive = true;
    if (!token || !client) return;
    async function load() {
      try {
        const [r, v, f, g, b, fr] = await Promise.all([
          client!.readContract({
            address: token!.market,
            abi: curveAbi,
            functionName: "reserveBNB",
          }),
          client!.readContract({
            address: token!.market,
            abi: curveAbi,
            functionName: "virtualToken",
          }),
          client!.readContract({
            address: token!.market,
            abi: curveAbi,
            functionName: "creatorBps",
          }),
          client!.readContract({
            address: token!.market,
            abi: curveAbi,
            functionName: "graduated",
          }),
          account.address
            ? client!.readContract({
                address: token!.address,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [account.address],
              })
            : Promise.resolve(undefined),
          token!.feeRouter
            ? Promise.resolve(token!.feeRouter)
            : factory
              ? client!.readContract({
                  address: factory,
                  abi: factoryAbi,
                  functionName: "feeRouter",
                })
              : Promise.resolve(undefined),
        ]);
        if (alive) {
          setReserve(r);
          setVt(v);
          setCreatorFee(f);
          setGraduated(g);
          setTokenBalance(b);
          setReadError("");
        }
        if (fr) {
          const [c, total, config] = await Promise.all([
            Promise.all(
              categories.map((_, i) =>
                client!.readContract({
                  address: fr,
                  abi: feeAbi,
                  functionName: "credit",
                  args: [token!.address, i],
                }),
              ),
            ),
            client!.readContract({
              address: fr,
              abi: feeAbi,
              functionName: "collected",
              args: [token!.address],
            }),
            client!.readContract({
              address: fr,
              abi: feeAbi,
              functionName: "configuration",
              args: [token!.address],
            }),
          ]);
          if (alive) {
            setRouter(fr);
            setCredits(c);
            setCollected(total);
            setPayout(config.payout);
            setWeights([...config.weights]);
          }
        }
      } catch (e) {
        if (alive)
          setReadError(
            "Unable to verify current contract state. Trading is disabled until reads recover.",
          );
      }
    }
    load();
    const timer = setInterval(load, 12000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [token, client, account.address, revision]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`${api}/tokens/${token!.address}/trades`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok)
          throw Error(body.error || "Trade history unavailable");
        if (alive) {
          setHistory(body.items || []);
          setHistoryScope(body.scope || "Confirmed indexed trades");
          setHistoryError("");
        }
      } catch (e) {
        if (alive && !controller.signal.aborted)
          setHistoryError((e as Error).message);
      }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [token, revision]);
  useEffect(() => {
    if (!token || (!fees && tab !== "Fee activity" && tab !== "Holders"))
      return;
    const controller = new AbortController();
    const isHolders = !fees && tab === "Holders";
    fetch(`${api}/tokens/${token.address}/${isHolders ? "holders" : "fees"}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw Error(body.error || "Activity data unavailable");
        if (isHolders) {
          setHolders(body.items || []);
          setHolderScope(body.scope || "Confirmed holder data");
          setHolderError("");
        } else {
          setEvents(body.items || []);
          setEventError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          (isHolders ? setHolderError : setEventError)((e as Error).message);
      });
    return () => controller.abort();
  }, [token, tab, fees, revision]);
  useEffect(() => {
    let alive = true;
    setQuote(undefined);
    setQuoteError("");
    if (!token || !client || n === undefined) return;
    async function load() {
      try {
        let next: Quote;
        if (graduated) {
          if (!routed)
            throw Error("Approved post-graduation route is unavailable.");
          const wrapped = await client!.readContract({
            address: token!.dexRouter!,
            abi: dexAbi,
            functionName: "WETH",
          });
          if (side === "Buy") {
            const c = (n! * BigInt(creatorFee)) / 10000n,
              p = (n! * 50n) / 10000n;
            const amounts = await client!.readContract({
              address: token!.dexRouter!,
              abi: dexAbi,
              functionName: "getAmountsOut",
              args: [n! - c - p, [wrapped, token!.address]],
            });
            next = {
              out: amounts[amounts.length - 1],
              creator: c,
              protocol: p,
              at: Date.now(),
            };
          } else {
            const amounts = await client!.readContract({
              address: token!.dexRouter!,
              abi: dexAbi,
              functionName: "getAmountsOut",
              args: [n!, [token!.address, wrapped]],
            });
            const gross = amounts[amounts.length - 1],
              c = (gross * BigInt(creatorFee)) / 10000n,
              p = (gross * 50n) / 10000n;
            next = {
              out: gross - c - p,
              creator: c,
              protocol: p,
              at: Date.now(),
            };
          }
        } else {
          const result = await client!.readContract({
            address: token!.market,
            abi: curveAbi,
            functionName: side === "Buy" ? "quoteBuy" : "quoteSell",
            args: [n!],
          });
          let impact: number | undefined;
          if (reserve !== undefined && vt) {
            const spot =
              side === "Buy"
                ? (result[3] * vt) / (30n * 10n ** 18n + reserve)
                : (n! * (30n * 10n ** 18n + reserve)) / vt;
            const actual = side === "Buy" ? result[0] : result[3];
            if (spot > 0n)
              impact = Math.max(
                0,
                Number(((spot - actual) * 10000n) / spot) / 100,
              );
          }
          next = {
            out: result[0],
            creator: result[1],
            protocol: result[2],
            impact,
            at: Date.now(),
          };
          if (
            side === "Buy" &&
            reserve !== undefined &&
            reserve + result[3] > 85n * 10n ** 18n
          )
            throw Error(
              "This buy exceeds the remaining graduation reserve. Reduce the amount.",
            );
          if (side === "Sell" && reserve !== undefined && result[3] > reserve)
            throw Error("This sell exceeds the real BNB reserve.");
        }
        if (alive) {
          setQuote(next);
          setQuoteError("");
        }
      } catch (e) {
        if (alive) {
          setQuote(undefined);
          setQuoteError((e as Error).message.split("\n")[0]);
        }
      }
    }
    load();
    const timer = setInterval(load, 12000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [
    token,
    client,
    amount,
    side,
    graduated,
    routed,
    creatorFee,
    reserve,
    vt,
    revision,
  ]);
  async function trade() {
    if (!account.address) {
      openWallet();
      return;
    }
    if (account.chainId !== 56) {
      setStatus("Switch to BNB Chain.");
      return;
    }
    if (
      !client ||
      !token ||
      n === undefined ||
      min === undefined ||
      !quote ||
      !factory
    )
      return;
    setBusy(true);
    setHash(undefined);
    try {
      if (Date.now() - quote.at > 30000)
        throw Error("This quote expired. Wait for a fresh quote.");
      const registered = await client.readContract({
        address: factory,
        abi: factoryAbi,
        functionName: "marketOf",
        args: [token.address],
      });
      if (registered.toLowerCase() !== token.market.toLowerCase())
        throw Error(
          "Token market is not registered to the configured factory.",
        );
      const deadline = (await client.getBlock()).timestamp + 120n;
      const spender = graduated ? token.approvedRoute! : token.market;
      if (side === "Sell") {
        if (tokenBalance === undefined || n > tokenBalance)
          throw Error("Insufficient token balance.");
        const allowance = await client.readContract({
          address: token.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account.address, spender],
        });
        if (allowance < n) {
          setStatus("Confirm the exact token allowance in your wallet.");
          const approval = await writeContractAsync({
            address: token.address,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, n],
          });
          const receipt = await client.waitForTransactionReceipt({
            hash: approval,
          });
          if (receipt.status !== "success")
            throw Error("Token approval reverted.");
        }
      } else if (native.data && n >= native.data.value)
        throw Error("Keep enough BNB in your wallet for network gas.");
      setStatus("Confirm the trade in your wallet.");
      let tx: Address;
      if (graduated) {
        if (!routed) throw Error("Approved DEX route is unavailable.");
        if (side === "Buy") {
          const request = {
            address: token.approvedRoute!,
            abi: routeAbi,
            functionName: "buy" as const,
            args: [token.address, min, deadline] as const,
            value: n,
            account: account.address,
          };
          await client.simulateContract(request);
          tx = await writeContractAsync(request);
        } else {
          const request = {
            address: token.approvedRoute!,
            abi: routeAbi,
            functionName: "sell" as const,
            args: [token.address, n, min, deadline] as const,
            account: account.address,
          };
          await client.simulateContract(request);
          tx = await writeContractAsync(request);
        }
      } else if (side === "Buy") {
        const request = {
          address: token.market,
          abi: curveAbi,
          functionName: "buy" as const,
          args: [min, deadline] as const,
          value: n,
          account: account.address,
        };
        await client.simulateContract(request);
        tx = await writeContractAsync(request);
      } else {
        const request = {
          address: token.market,
          abi: curveAbi,
          functionName: "sell" as const,
          args: [n, min, deadline] as const,
          account: account.address,
        };
        await client.simulateContract(request);
        tx = await writeContractAsync(request);
      }
      setHash(tx);
      setStatus("Waiting for three confirmations…");
      const receipt = await client.waitForTransactionReceipt({
        hash: tx,
        confirmations: 3,
      });
      if (receipt.status !== "success")
        throw Error("Trade reverted. No successful trade is recorded.");
      setStatus("Trade confirmed. History follows the confirmed-block window.");
      setRevision((v) => v + 1);
      await native.refetch();
    } catch (e) {
      setStatus((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  async function claim() {
    if (!account.address) {
      openWallet();
      return;
    }
    if (account.chainId !== 56) {
      setStatus("Switch to BNB Chain to claim fees.");
      return;
    }
    if (
      !router ||
      !client ||
      !token ||
      payout?.toLowerCase() !== account.address.toLowerCase()
    )
      return;
    setBusy(true);
    try {
      const request = {
        address: router,
        abi: feeAbi,
        functionName: "claimCreator" as const,
        args: [token.address] as const,
        account: account.address,
      };
      await client.simulateContract(request);
      const tx = await writeContractAsync(request);
      setHash(tx);
      setStatus("Waiting for claim confirmation…");
      const receipt = await client.waitForTransactionReceipt({
        hash: tx,
        confirmations: 3,
      });
      if (receipt.status !== "success") throw Error("Claim reverted.");
      setStatus("Creator claim confirmed.");
      setRevision((v) => v + 1);
      await native.refetch();
    } catch (e) {
      setStatus((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  const eligible =
    !!account.address &&
    payout?.toLowerCase() === account.address.toLowerCase();
  const price = graduated
    ? token?.priceBNB
    : reserve !== undefined && vt
      ? Number(30n * 10n ** 18n + reserve) / Number(vt)
      : undefined;
  const activity = (
    <>
      {eventError ? (
        <p className="error">{eventError}</p>
      ) : events.length ? (
        events.map((event) => (
          <a
            className="review-row"
            key={event.id}
            href={`https://bscscan.com/tx/${event.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              {event.name} · block {event.blockNumber}
            </span>
            <b>
              {event.args.creatorFee !== undefined
                ? `${amountText(BigInt(event.args.creatorFee))} creator BNB`
                : event.args.amount !== undefined
                  ? `${amountText(BigInt(event.args.amount))} BNB`
                  : "View event"}{" "}
              <ExternalLink size={12} />
            </b>
          </a>
        ))
      ) : (
        <p>No fee events in the available confirmed window.</p>
      )}
      <small>
        Available history is bounded. Lifetime totals above come directly from
        contract accounting.
      </small>
    </>
  );
  return (
    <section className="route-section">
      <Link className="text-link" href="/explore">
        ← Back to explore
      </Link>
      <div className="token-heading">
        <div className="token-avatar">{token?.symbol.slice(0, 2) || "?"}</div>
        <div>
          <h1>
            {token?.name ||
              (error ? "Token unavailable" : "Reading verified token…")}{" "}
            <span className="muted-text">
              {token ? `$${token.symbol}` : ""}
            </span>
          </h1>
          {token && (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={`https://bscscan.com/token/${token.address}`}
            >
              {short(token.address)} <ExternalLink size={12} />
            </a>
          )}
        </div>
        {token && (
          <Link
            className="button secondary"
            href={fees ? `/token/${address}` : `/fees/${address}`}
          >
            {fees ? "Trade token" : "Fee intelligence"}{" "}
            <ArrowUpRight size={15} />
          </Link>
        )}
      </div>
      {!token ? (
        <div className="notice" role="status">
          {error || "Confirming factory registration and token identity…"}
        </div>
      ) : (
        <>
          {readError && (
            <div className="notice">
              {readError}
              <button
                onClick={() => setRevision((v) => v + 1)}
                className="text-link"
              >
                Retry <RefreshCw size={14} />
              </button>
            </div>
          )}
          {fees ? (
            <>
              <div className="metrics">
                {[
                  ["Total fees · BNB", amountText(collected)],
                  ["Creator claimable · BNB", amountText(credits[4])],
                  ["Curve reserve · BNB", amountText(reserve)],
                  ["Creator fee", `${creatorFee / 100}%`],
                ].map(([name, value]) => (
                  <div className="panel" key={name}>
                    <span className="tiny">{name}</span>
                    <strong>{value}</strong>
                    <small>
                      {name === "Creator fee"
                        ? "Plus 0.50% protocol fee"
                        : "Read directly from the contract"}
                    </small>
                  </div>
                ))}
              </div>
              <div className="panel">
                <h2>Immutable fee allocation</h2>
                {categories.map((name, i) => (
                  <div className="review-row" key={name}>
                    <span>
                      {name}{" "}
                      {weights[i] !== undefined ? `· ${weights[i] / 100}%` : ""}
                    </span>
                    <b>{amountText(credits[i])} BNB</b>
                  </div>
                ))}
                <p>
                  Utility credit is held in the router until reviewed utility
                  modules are integrated. It is not an executed buyback or a
                  paid AI expense.
                </p>
                <p className="muted-text">
                  Payout wallet: {payout ? short(payout) : "—"}
                </p>
                {account.address && account.chainId !== 56 ? (
                  <button
                    className="button primary"
                    onClick={() => switchChain({ chainId: 56 })}
                  >
                    Switch to BNB Chain
                  </button>
                ) : (
                  <button
                    className="button primary"
                    onClick={claim}
                    disabled={busy || !eligible || !credits[4] || !!readError}
                  >
                    Claim creator revenue
                  </button>
                )}
                {account.address && !eligible && (
                  <small>
                    Only the registered payout wallet can claim this credit.
                  </small>
                )}
              </div>
              <div className="panel">
                <h2>Confirmed fee events</h2>
                {activity}
              </div>
            </>
          ) : (
            <div className="trading-grid">
              <div>
                <div className="panel chart-panel">
                  <div className="chart-top">
                    <span className="tiny">BNB / {token.symbol}</span>
                    <strong>
                      {price === undefined ? "—" : Number(price).toPrecision(6)}{" "}
                      <small>BNB</small>
                    </strong>
                    <div className="tabs">
                      {["5M", "1H", "4H", "1D"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setFrame(t)}
                          className={frame === t ? "selected" : ""}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ExecutionChart trades={history} frame={frame} />
                  {historyError && <p className="error">{historyError}</p>}
                  <small>
                    {historyScope ||
                      "Confirmed curve execution prices. External DEX trades are excluded."}
                  </small>
                </div>
                <div className="panel">
                  <div className="tabs">
                    {["Trades", "Holders", "Fee activity"].map((t) => (
                      <button
                        key={t}
                        className={tab === t ? "selected" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {tab === "Trades" ? (
                    historyError ? (
                      <p className="error">{historyError}</p>
                    ) : history.length ? (
                      history.map((t) => (
                        <a
                          className="review-row"
                          key={t.id}
                          target="_blank"
                          rel="noreferrer"
                          href={`https://bscscan.com/tx/${t.transactionHash}`}
                        >
                          <span>
                            {t.buy ? "Buy" : "Sell"} ·{" "}
                            {amountText(BigInt(t.tokens))} tokens
                            <br />
                            <small>
                              {t.timestamp
                                ? new Date(t.timestamp * 1000).toLocaleString()
                                : t.blockNumber
                                  ? `Block ${t.blockNumber}`
                                  : "Time unavailable"}
                            </small>
                          </span>
                          <b>
                            {amountText(BigInt(t.bnb))} BNB{" "}
                            <ExternalLink size={12} />
                          </b>
                        </a>
                      ))
                    ) : (
                      <p>No confirmed curve trades in the available window.</p>
                    )
                  ) : tab === "Holders" ? (
                    <>
                      {holderError ? (
                        <p className="error">{holderError}</p>
                      ) : (
                        holders.map((h) => (
                          <a
                            className="review-row"
                            href={`https://bscscan.com/address/${h.address}`}
                            key={h.address}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <span>{short(h.address)}</span>
                            <b>{amountText(BigInt(h.balance))} tokens</b>
                          </a>
                        ))
                      )}
                      {!holders.length && !holderError && (
                        <p>No observed holders in this window.</p>
                      )}
                      <small>
                        {holderScope || "Reading observed transfer addresses…"}
                      </small>
                    </>
                  ) : (
                    activity
                  )}
                </div>
              </div>
              <aside>
                <div className="panel trade-panel">
                  <div className="trade-sides">
                    {["Buy", "Sell"].map((t) => (
                      <button
                        key={t}
                        className={side === t ? "active" : ""}
                        onClick={() => setSide(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {graduated && (
                    <div className="notice">
                      {routed
                        ? "Trades use the approved DEX route. Direct external swaps bypass creator fees."
                        : "Graduated. An approved trading route is not configured."}
                    </div>
                  )}
                  <label>
                    {side === "Buy" ? "You pay" : "You sell"}
                    <div className="trade-input">
                      <input
                        inputMode="decimal"
                        aria-label="Trade amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                      />
                      <span>{side === "Buy" ? "BNB" : token.symbol}</span>
                    </div>
                  </label>
                  <div className="amounts">
                    {["0.1", "0.5", "1", "2"].map((v) => (
                      <button key={v} onClick={() => setAmount(v)}>
                        {v}
                      </button>
                    ))}
                    {side === "Sell" &&
                      tokenBalance !== undefined &&
                      tokenBalance > 0n && (
                        <button
                          onClick={() => setAmount(formatEther(tokenBalance))}
                        >
                          Max
                        </button>
                      )}
                  </div>
                  <small>
                    Balance:{" "}
                    {side === "Buy"
                      ? amountText(native.data?.value)
                      : amountText(tokenBalance)}{" "}
                    {side === "Buy" ? "BNB" : token.symbol}
                  </small>
                  {amount && n === undefined && (
                    <p className="error">
                      Enter a positive decimal amount with at most 18 decimal
                      places.
                    </p>
                  )}
                  <div className="review-row">
                    <span>You receive</span>
                    <b>
                      {amountText(quote?.out)}{" "}
                      {side === "Buy" ? token.symbol : "BNB"}
                    </b>
                  </div>
                  <label>
                    Slippage tolerance (%)
                    <input
                      aria-label="Slippage tolerance percent"
                      inputMode="decimal"
                      value={slip}
                      onChange={(e) => setSlip(e.target.value)}
                    />
                  </label>
                  {bps === undefined && (
                    <p className="error">Slippage must be 0.10%–5.00%.</p>
                  )}
                  <div className="review-row">
                    <span>Minimum received</span>
                    <b>{amountText(min)}</b>
                  </div>
                  <div className="review-row">
                    <span>Estimated curve price impact</span>
                    <b>
                      {quote?.impact === undefined
                        ? "—"
                        : `${quote.impact.toFixed(2)}%`}
                    </b>
                  </div>
                  <div className="review-row">
                    <span>Creator + protocol fee</span>
                    <b>
                      {quote
                        ? `${amountText(quote.creator + quote.protocol)} BNB`
                        : "—"}
                    </b>
                  </div>
                  {quoteError && <p className="error">{quoteError}</p>}
                  {!factory && (
                    <small>
                      Public factory configuration is required to enable
                      transactions.
                    </small>
                  )}
                  {account.address && account.chainId !== 56 ? (
                    <button
                      className="button primary"
                      onClick={() => switchChain({ chainId: 56 })}
                    >
                      Switch to BNB Chain
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      disabled={
                        !!account.address &&
                        (busy ||
                          !quote?.out ||
                          min === undefined ||
                          !factory ||
                          !!readError ||
                          (graduated && !routed))
                      }
                      onClick={trade}
                    >
                      {busy
                        ? "Waiting for transaction…"
                        : account.address
                          ? `${side} ${token.symbol}`
                          : "Connect wallet"}
                    </button>
                  )}
                  <small>
                    Quotes refresh every 12 seconds. Transactions are simulated
                    before signing and expire after 120 seconds.
                  </small>
                </div>
                <div className="panel">
                  <h3>
                    {graduated ? "Liquidity migrated" : "Graduation progress"}
                  </h3>
                  <div className="allocation-track">
                    <i
                      style={{
                        width: `${graduated ? 100 : reserve ? Math.min(100, (Number(formatEther(reserve)) / 85) * 100) : 0}%`,
                        background: "#b36e5c",
                      }}
                    />
                  </div>
                  <p>
                    {graduated
                      ? "Graduated"
                      : `${amountText(reserve)} / 85 BNB reserve`}
                  </p>
                  <small>
                    Threshold uses actual curve BNB, not market capitalization.
                  </small>
                  {token.poolAddress && (
                    <a
                      className="text-link"
                      href={`https://bscscan.com/address/${token.poolAddress}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Verify liquidity pool <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}
      {status && (
        <p role="status" className="notice">
          {status}
        </p>
      )}
      {hash && (
        <a
          className="text-link"
          target="_blank"
          rel="noreferrer"
          href={`https://bscscan.com/tx/${hash}`}
        >
          Verify transaction <ExternalLink size={14} />
        </a>
      )}
    </section>
  );
}
function ExecutionChart({
  trades,
  frame,
}: {
  trades: MarketTrade[];
  frame: string;
}) {
  const records = timeframeTrades(trades, frame);
  const points = records
    .filter((t) => t.reserve && t.tokenReserve && BigInt(t.tokenReserve) > 0n)
    .map((t) => ({
      time: t.timestamp ?? Date.parse(t.createdAt || "") / 1000,
      price:
        Number(30n * 10n ** 18n + BigInt(t.reserve)) /
        Number(BigInt(t.tokenReserve)),
    }));
  if (!points.length)
    return (
      <div className="chart-empty">
        <Activity size={30} />
        <p>No confirmed executions in this timeframe</p>
        <span>
          Choose a wider range or wait for confirmed trading activity.
        </span>
      </div>
    );
  const low = Math.min(...points.map((p) => p.price)),
    high = Math.max(...points.map((p) => p.price)),
    range = high - low || high * 0.01 || 1;
  const from = points[0].time,
    to = points[points.length - 1].time;
  const coordinates = points.map((p, i) => ({
    x:
      20 +
      (to === from
        ? i / Math.max(1, points.length - 1)
        : (p.time - from) / (to - from)) *
        760,
    y: 260 - ((p.price - low) / range) * 220,
  }));
  return (
    <div className="verified-chart">
      <svg
        viewBox="0 0 800 290"
        role="img"
        aria-label={`Confirmed BNB execution prices for ${frame}`}
      >
        <polyline
          points={coordinates.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#a4495b"
          strokeWidth="2"
        />
        {coordinates.length === 1 && (
          <circle
            cx={coordinates[0].x}
            cy={coordinates[0].y}
            r="4"
            fill="#a4495b"
          />
        )}
      </svg>
      <small>
        {points.length} confirmed executions · {frame} · BNB per token
      </small>
    </div>
  );
}
