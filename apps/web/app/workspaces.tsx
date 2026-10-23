"use client";
import { useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  usePublicClient,
  useWriteContract,
} from "wagmi";
import { erc20Abi, formatEther, type Address } from "viem";
import {
  ArrowUpRight,
  ArrowRight,
  Flame,
  SlidersHorizontal,
  Wallet,
  Bot,
  Lock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { factoryAbi, feeAbi } from "../../../packages/blockchain/abi";
import {
  discoverTokens,
  configuredAddress,
  type MarketToken,
} from "../../../packages/shared/market";
const factory = configuredAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS);
const categories = [
  "Buyback & burn",
  "Auto liquidity",
  "AI operations",
  "Product treasury",
  "Creator revenue",
];
const short = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
const n = (value: string | undefined) =>
  value === undefined
    ? "—"
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 5 });
export function DiscoveryTable({
  tokens,
  query = "",
  loading,
  error,
  onRetry,
}: {
  tokens: MarketToken[];
  query?: string;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [sort, setSort] = useState("Trending"),
    [show, setShow] = useState(false),
    [fee, setFee] = useState(1000),
    [utility, setUtility] = useState("all");
  const items = discoverTokens(tokens, query, sort, fee, utility);
  return (
    <>
      <div className="market-toolbar">
        <div className="tabs">
          {["Trending", "New launches", "Top volume", "Near graduation"].map(
            (s, i) => (
              <button
                key={s}
                className={sort === s ? "selected" : ""}
                onClick={() => setSort(s)}
              >
                {i === 0 && <Flame size={15} />} {s}
              </button>
            ),
          )}
        </div>
        <button
          className="filter"
          aria-expanded={show}
          aria-controls="market-filters"
          onClick={() => setShow(!show)}
        >
          <SlidersHorizontal size={14} />
          Filters{fee < 1000 || utility !== "all" ? " · active" : ""}
        </button>
      </div>
      {show && (
        <div className="panel filter-panel" id="market-filters">
          <label>
            Maximum creator fee: {fee / 100}%
            <input
              type="range"
              min="100"
              max="1000"
              step="25"
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
            />
          </label>
          <label>
            Fee utility
            <select
              value={utility}
              onChange={(e) => setUtility(e.target.value)}
            >
              <option value="all">All strategies</option>
              {categories.map((s, i) => (
                <option key={s} value={i}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            className="text-link"
            onClick={() => {
              setFee(1000);
              setUtility("all");
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <div className="table">
        <div className="table-head">
          <span>TOKEN</span>
          <span>MARKET CAP · BNB</span>
          <span>OBSERVED VOLUME · BNB</span>
          <span>CREATOR FEE</span>
          <span>CURVE PROGRESS</span>
          <span />
        </div>
        {items.map((t) => (
          <Link
            className="table-row"
            key={t.address}
            href={`/token/${t.address}`}
          >
            <span>
              <b className="token-avatar">{t.symbol.slice(0, 2)}</b>
              <strong>
                {t.name}
                <small>${t.symbol}</small>
              </strong>
            </span>
            <span>{n(t.marketCapBNB)}</span>
            <span title={t.volumeWindowLabel || "Volume data unavailable"}>
              {n(t.volumeBNB ?? t.volume24hBNB)}
            </span>
            <span>{t.creatorBps / 100}%</span>
            <span>
              {t.graduated
                ? "Graduated"
                : t.reserveBNB !== undefined
                  ? `${Math.min(100, (Number(formatEther(BigInt(t.reserveBNB))) / 85) * 100).toFixed(1)}%`
                  : "—"}{" "}
              <ArrowUpRight size={14} />
            </span>
            <ArrowRight size={15} />
          </Link>
        ))}
        {loading && !tokens.length ? (
          <div className="empty" role="status">
            <RefreshCw size={23} className="spin" />
            <h3>Reading confirmed launches…</h3>
          </div>
        ) : error ? (
          <div className="empty">
            <h3>Market data is unavailable</h3>
            <p>{error}</p>
            <button className="text-link" onClick={onRetry}>
              Retry verified data <RefreshCw size={14} />
            </button>
          </div>
        ) : !items.length ? (
          <div className="empty">
            <h3>
              {tokens.length
                ? "No matching tokens"
                : "The next wave starts here"}
            </h3>
            <p>
              {tokens.length
                ? "Try another name, symbol, address, or fee filter."
                : "Confirmed launches appear after the protocol is deployed."}
            </p>
            <Link className="text-link" href="/launch">
              Design your token <ArrowUpRight size={15} />
            </Link>
          </div>
        ) : null}
      </div>
      <p className="data-caption">
        Observed volume uses the available confirmed curve-trade window. A dash
        means unavailable, never zero inferred from missing data.
      </p>
    </>
  );
}
function CreatorCard({ token }: { token: MarketToken }) {
  const account = useAccount(),
    client = usePublicClient({ chainId: 56 });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useReadContract({
    address: factory,
    abi: factoryAbi,
    functionName: "feeRouter",
    chainId: 56,
    query: { enabled: !!factory },
  });
  const source = token.feeRouter || router.data;
  const credit = useReadContract({
    address: source,
    abi: feeAbi,
    functionName: "credit",
    args: [token.address, 4],
    chainId: 56,
    query: { enabled: !!source, refetchInterval: 12000 },
  });
  async function claim() {
    if (!source || !client || !account.address) return;
    if (account.chainId !== 56) {
      setStatus("Switch your wallet to BNB Chain before claiming.");
      return;
    }
    setBusy(true);
    try {
      const configuration = await client.readContract({
        address: source,
        abi: feeAbi,
        functionName: "configuration",
        args: [token.address],
      });
      if (configuration.payout.toLowerCase() !== account.address.toLowerCase())
        throw Error("This wallet is not the registered payout wallet.");
      const request = {
        address: source,
        abi: feeAbi,
        functionName: "claimCreator" as const,
        args: [token.address] as const,
        account: account.address,
      };
      await client.simulateContract(request);
      const hash = await writeContractAsync(request);
      setStatus("Waiting for creator claim confirmation…");
      const receipt = await client.waitForTransactionReceipt({
        hash,
        confirmations: 3,
      });
      if (receipt.status !== "success") throw Error("Claim reverted.");
      await credit.refetch();
      setStatus(`Confirmed: ${hash}`);
    } catch (e) {
      setStatus((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel creator-card">
      <div className="review-token">
        <span className="token-avatar">{token.symbol.slice(0, 2)}</span>
        <div>
          <h3>{token.name}</h3>
          <span>${token.symbol}</span>
        </div>
      </div>
      <div className="review-row">
        <span>Creator fee</span>
        <b>{token.creatorBps / 100}%</b>
      </div>
      <div className="review-row">
        <span>Claimable creator revenue</span>
        <b>{credit.data === undefined ? "—" : formatEther(credit.data)} BNB</b>
      </div>
      <div className="card-actions">
        <Link className="text-link" href={`/fees/${token.address}`}>
          Fee dashboard <ArrowUpRight size={15} />
        </Link>
        <button
          className="button primary"
          disabled={busy || !credit.data || account.chainId !== 56}
          onClick={claim}
        >
          {busy ? "Confirming…" : "Claim revenue"}
        </button>
      </div>
      {account.chainId !== 56 && <small>Switch to BNB Chain to claim.</small>}
      {status && <p role="status">{status}</p>}
    </div>
  );
}
export function WalletWorkspace({
  tokens,
  creator,
  openWallet,
}: {
  tokens: MarketToken[];
  creator: boolean;
  openWallet: () => void;
}) {
  const account = useAccount();
  const reads = useReadContracts({
    contracts: account.address
      ? tokens.map((t) => ({
          address: t.address,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [account.address!] as const,
          chainId: 56,
        }))
      : [],
    query: {
      enabled: !!account.address && tokens.length > 0,
      refetchInterval: 12000,
    },
  });
  const owned = tokens.filter(
    (t) => t.creator.toLowerCase() === account.address?.toLowerCase(),
  );
  const holdings = tokens
    .map((t, i) => ({
      token: t,
      balance:
        reads.data?.[i]?.status === "success"
          ? (reads.data[i].result as bigint)
          : undefined,
    }))
    .filter((t) => t.balance !== undefined && t.balance > 0n);
  return (
    <section className="route-section">
      <div className="eyebrow">YOUR CORNER OF THE ECOSYSTEM</div>
      <h1 className="page-title">
        {creator ? "Creator studio." : "Your portfolio."}
      </h1>
      {!account.address ? (
        <div className="panel">
          <div className="empty">
            <Wallet size={27} />
            <h3>A wallet makes it yours</h3>
            <p>
              Connect to view balances and launches associated with your
              address.
            </p>
          </div>
          <button className="button primary centered" onClick={openWallet}>
            Connect wallet <Wallet size={16} />
          </button>
        </div>
      ) : (
        <>
          <p className="subheading">
            {short(account.address)} ·{" "}
            {creator
              ? "Launches registered to this wallet"
              : "Balances in tokens visible to this launchpad"}
          </p>
          {creator ? (
            <>
              <div className="card-actions">
                <Link href="/launch" className="button primary">
                  Design a new launch <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="agent-grid">
                {owned.map((t) => (
                  <CreatorCard key={t.address} token={t} />
                ))}
              </div>
              {!owned.length && (
                <div className="panel empty">
                  <h3>No confirmed launches for this wallet</h3>
                  <p>
                    Launches appear after the confirmation window. Other
                    wallets’ launches are not shown.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="panel">
              <h2>Token holdings</h2>
              {reads.isPending && tokens.length > 0 ? (
                <p role="status">Reading balances from BNB Chain…</p>
              ) : (
                holdings.map(({ token, balance }) => (
                  <Link
                    href={`/token/${token.address}`}
                    className="review-row"
                    key={token.address}
                  >
                    <span>
                      {token.name} · ${token.symbol}
                    </span>
                    <b>
                      {Number(formatEther(balance!)).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      <ArrowUpRight size={14} />
                    </b>
                  </Link>
                ))
              )}
              {!holdings.length && !reads.isFetching && (
                <p>
                  No nonzero balances found in the visible launchpad tokens.
                </p>
              )}
              {reads.error && (
                <p className="error">
                  Balance reads failed.{" "}
                  <button className="text-link" onClick={() => reads.refetch()}>
                    Retry
                  </button>
                </p>
              )}
              <small>
                This is a launchpad-token view, not a complete wallet asset
                scan. Balances are always read from chain 56.
              </small>
            </div>
          )}
        </>
      )}
    </section>
  );
}
const templates = [
  {
    name: "Community Assistant",
    description: "Help a community navigate token documentation.",
    tasks: [
      "Answer questions from approved documentation",
      "Explain public token and fee information",
      "Escalate uncertain answers to the operator",
    ],
  },
  {
    name: "Token Analytics Agent",
    description: "Explain confirmed on-chain activity.",
    tasks: [
      "Summarize indexed trades and allocations",
      "Cite block and transaction references",
      "Distinguish unavailable data from zero activity",
    ],
  },
  {
    name: "Research Agent",
    description: "Turn approved sources into referenced research.",
    tasks: [
      "Research an operator-approved question",
      "Cite sources and separate inference from fact",
      "Stay within a reserved inference budget",
    ],
  },
  {
    name: "Documentation Assistant",
    description: "Answer questions from a curated knowledge base.",
    tasks: [
      "Locate protocol and product documentation",
      "Explain documented features and limitations",
      "Never claim unverified deployment status",
    ],
  },
  {
    name: "Developer Support Agent",
    description: "Help developers understand protocol integrations.",
    tasks: [
      "Explain documented contract interfaces",
      "Help interpret verified transaction failures",
      "Refer security-sensitive issues to reviewers",
    ],
  },
];
export function AgentWorkspace({ id }: { id?: string }) {
  const [search, setSearch] = useState("");
  const selected =
    id !== undefined && /^\d+$/.test(id) ? templates[Number(id)] : undefined;
  if (id !== undefined && !selected)
    return (
      <section className="route-section">
        <h1 className="page-title">Agent template not found.</h1>
        <Link className="text-link" href="/agents">
          Back to agent directory <ArrowRight size={16} />
        </Link>
      </section>
    );
  return (
    <section className="route-section">
      <div className="eyebrow">INTELLIGENCE, WITH BOUNDARIES</div>
      <h1 className="page-title">
        {selected ? (
          selected.name
        ) : (
          <>
            Meet the <em>operators.</em>
          </>
        )}
      </h1>
      <p className="subheading">
        {selected
          ? selected.description
          : "Purpose-built assistants. Transparent budgets. No autonomous wallet access."}
      </p>
      {selected ? (
        <>
          <Link className="text-link" href="/agents">
            ← All templates
          </Link>
          <div className="panel agent-detail">
            <Bot size={35} />
            <span className="pill">TEMPLATE · NOT RUNNING</span>
            <h2>What this agent can do</h2>
            <ul>
              {selected.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <div className="notice">
              <Lock size={20} />
              <p>
                Activation requires an associated token, approved operator,
                funded and reconciled budget, configured LLM provider, and
                spending limits. An allocation alone does not start an agent or
                pay an inference provider.
              </p>
            </div>
            <Link className="button primary" href="/launch?strategy=2">
              Design an AI-funded token <ArrowUpRight size={16} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <label className="search">
            <input
              aria-label="Search agent templates"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agent templates"
            />
          </label>
          <div className="agent-grid">
            {templates
              .map((t, i) => ({ t, i }))
              .filter(({ t }) =>
                `${t.name} ${t.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map(({ t, i }) => (
                <Link
                  className="panel agent-card"
                  href={`/agents/${i}`}
                  key={t.name}
                >
                  <Bot size={28} />
                  <span className="pill">TEMPLATE</span>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <span className="text-link">
                    Inspect template <ArrowUpRight size={15} />
                  </span>
                </Link>
              ))}
          </div>
          {!templates.some((t) =>
            `${t.name} ${t.description}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          ) && <p>No templates match this search.</p>}
        </>
      )}
    </section>
  );
}
export function AdminWorkspace({ api }: { api: string }) {
  const [token, setToken] = useState(""),
    [status, setStatus] = useState(""),
    [data, setData] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  async function load(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setData(undefined);
    try {
      const response = await fetch(`${api}/admin/health`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw Error(
          body.error || body.message || `Admin API returned ${response.status}`,
        );
      setData(body);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="route-section">
      <div className="eyebrow">RESTRICTED OPERATIONS</div>
      <h1 className="page-title">Protocol control.</h1>
      <div className="panel">
        <h2>Read-only operational health</h2>
        <p>
          An authorized server-side admin credential is required. It is sent
          only in the request header and is never saved in browser storage.
        </p>
        <form onSubmit={load}>
          <label>
            Admin API token
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
          <div className="card-actions">
            <button className="button primary" disabled={busy || !token}>
              {busy ? "Checking…" : "Inspect health"}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setToken("");
                setData(undefined);
                setStatus("");
              }}
            >
              Clear session
            </button>
          </div>
        </form>
        {status && (
          <p role="alert" className="error">
            {status}
          </p>
        )}
        {data !== undefined && (
          <pre className="health-output">{JSON.stringify(data, null, 2)}</pre>
        )}
        <small>This console cannot move creator or utility funds.</small>
      </div>
    </section>
  );
}
export function LeaderboardMetrics({
  tokens,
  verified,
}: {
  tokens: MarketToken[];
  verified: boolean;
}) {
  const reserve = tokens.reduce(
    (sum, t) => sum + BigInt(t.reserveBNB || "0"),
    0n,
  );
  const volume = tokens.some((t) => t.volumeBNB !== undefined)
    ? tokens.reduce((sum, t) => sum + Number(t.volumeBNB || 0), 0)
    : undefined;
  return (
    <>
      <div className="metrics">
        {[
          ["Visible launches", String(tokens.length)],
          ["Curve reserves · BNB", formatEther(reserve)],
          [
            "Graduated in view",
            String(tokens.filter((t) => t.graduated).length),
          ],
          [
            "Observed volume · BNB",
            volume === undefined
              ? "—"
              : volume.toLocaleString(undefined, { maximumFractionDigits: 5 }),
          ],
        ].map(([title, value]) => (
          <div className="panel" key={title}>
            <span className="tiny">{title}</span>
            <strong>{verified ? value : "—"}</strong>
            <small>
              {verified
                ? "Confirmed feed snapshot"
                : "Awaiting configured contracts"}
            </small>
          </div>
        ))}
      </div>
      <p className="muted-text">
        Totals cover only launches visible in this feed. Observed volume covers
        the available confirmed curve-trade window.
      </p>
    </>
  );
}
