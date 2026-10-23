"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
  usePublicClient,
  useWriteContract,
  useSignMessage,
} from "wagmi";
import {
  formatEther,
  parseEther,
  isAddress,
  erc20Abi,
  type Address,
  decodeEventLog,
} from "viem";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  ChevronDown,
  Plus,
  Flame,
  Droplets,
  Bot,
  Layers,
  Wallet,
  Check,
  Activity,
  ExternalLink,
  Lock,
  Menu,
  X,
  BookOpen,
  SlidersHorizontal,
  Command,
  Globe,
  ShieldCheck,
  Copy,
  Loader2,
  Leaf,
} from "lucide-react";
import { factoryAbi, curveAbi, feeAbi } from "../../../packages/blockchain/abi";
import {
  DiscoveryTable,
  WalletWorkspace,
  AgentWorkspace,
  AdminWorkspace,
  LeaderboardMetrics,
} from "./workspaces";
import { TokenWorkspace } from "./token-workspace";
import {
  configuredAddress,
  validateIdentity,
  type MarketToken,
} from "../../../packages/shared/market";
const categories = [
  "Buyback & burn",
  "Auto liquidity",
  "AI operations",
  "Product treasury",
  "Creator revenue",
];
const colors = ["#ee9b80", "#e0bb81", "#b5a3c7", "#b1c1b1", "#f0d9cf"];
const icons = [Flame, Droplets, Bot, Layers, Wallet];
const strategies = [
  {
    name: "The flywheel",
    tag: "BALANCED GROWTH",
    weights: [30, 25, 20, 15, 10],
    text: "A little of everything. Built for the long game.",
  },
  {
    name: "Supply engine",
    tag: "BUYBACK FOCUSED",
    weights: [60, 20, 0, 10, 10],
    text: "Put more of every fee toward reducing supply.",
  },
  {
    name: "Builder’s fund",
    tag: "PRODUCT FIRST",
    weights: [10, 20, 25, 35, 10],
    text: "Turn community activity into product runway.",
  },
];
const factory = configuredAddress(process.env.NEXT_PUBLIC_FACTORY_ADDRESS);
const api = process.env.NEXT_PUBLIC_API_URL || "/api";
type Token = MarketToken;
function short(s: string) {
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}
function Empty({
  title = "The next wave starts here",
  text = "Verified launches will appear when the protocol goes live.",
  action = true,
}: {
  title?: string;
  text?: string;
  action?: boolean;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Activity size={23} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Link href="/launch" className="text-link">
          Create the first spark <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
function StudioSculpture() {
  return (
    <div className="studio-sculpture">
      <Image
        src="/images/studio-sculpture.png"
        alt="Coral ceramic ribbon, glossy plum loops and clay discs arranged as a sculptural flywheel"
        width={1254}
        height={1254}
        priority
        sizes="(max-width:760px) 100vw, 50vw"
      />
      <span className="art-caption">
        <span>THE ART OF PUTTING FEES TO WORK</span>
        <ArrowUpRight size={16} />
      </span>
      <div className="art-sticker">
        <span className="sticker-flower">✳</span>
        <span>
          Small fees.
          <br />
          <b>Big possibilities.</b>
        </span>
      </div>
      <div className="art-recipe">
        <span className="tiny">YOUR FEES, WITH PURPOSE</span>
        <div className="art-recipe-icons">
          {icons.map((Icon, i) => (
            <span key={i} title={categories[i]}>
              <Icon size={17} />
            </span>
          ))}
        </div>
        <small>Five utilities. One creative vision.</small>
      </div>
    </div>
  );
}
export default function App() {
  const pathname = usePathname();
  const account = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const balance = useBalance({ address: account.address, chainId: 56 });
  const [wallet, setWallet] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [dataState, setDataState] = useState("Loading indexer…");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [retry, setRetry] = useState(0);
  const [detailToken, setDetailToken] = useState<Token>();
  const [detailError, setDetailError] = useState("");
  const title = pathname.split("/")[1] || "home";
  const tokenAddress = pathname.split("/")[2] || "";
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${api}/tokens`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw Error(data.error || "Unable to read verified market data.");
        if (alive) {
          setTokens(data.items || []);
          setVerified(!!data.verified);
          setError("");
          setDataState(
            data.verified
              ? `Confirmed chain data${data.limited ? " · latest launches only" : ""}`
              : "Protocol not deployed",
          );
        }
      } catch (e) {
        if (alive && !controller.signal.aborted) {
          setTokens([]);
          setVerified(false);
          setError((e as Error).message);
          setDataState("Market data unavailable");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    setLoading(true);
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [retry]);
  useEffect(() => {
    setDetailToken(undefined);
    setDetailError("");
    if (!["token", "fees"].includes(title)) return;
    if (!isAddress(tokenAddress)) {
      setDetailError("Invalid token address.");
      return;
    }
    const controller = new AbortController();
    const load = () =>
      fetch(`${api}/tokens/${tokenAddress}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw Error(data.error || "Unable to verify this token.");
          if (!controller.signal.aborted) {
            setDetailToken(data.item);
            setDetailError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setDetailError((e as Error).message);
        });
    load();
    const timer = setInterval(load, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [title, tokenAddress, retry]);
  const selected =
    tokens.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    ) ||
    (detailToken?.address.toLowerCase() === tokenAddress.toLowerCase()
      ? detailToken
      : undefined);
  const connectButton = (
    <button className="connect" onClick={() => setWallet(true)}>
      <Wallet size={15} />
      {account.address ? short(account.address) : "Connect wallet"}
    </button>
  );
  const market = (
    <DiscoveryTable
      tokens={tokens}
      query={search}
      loading={loading}
      error={error}
      onRetry={() => setRetry((v) => v + 1)}
    />
  );
  return (
    <>
      <header>
        <Link href="/" className="brand">
          <Image
            className="brand-logo"
            src="/images/verdant-logo.png"
            alt=""
            width={44}
            height={44}
            priority
          />
          verdant<span className="brand-period">.</span>
        </Link>
        <nav className={mobile ? "open" : ""}>
          {[
            ["Explore", "/explore"],
            ["Launch", "/launch"],
            ["Agents", "/agents"],
            ["Leaderboard", "/leaderboard"],
          ].map(([s, l]) => (
            <Link
              onClick={() => setMobile(false)}
              className={pathname === l ? "active" : ""}
              href={l}
              key={l}
            >
              {s}
              {s === "Launch" && <Plus size={12} />}
            </Link>
          ))}
        </nav>
        <div className="header-right">
          <span className="chain">
            <span className="bnb">⟐</span>BNB Chain
            <ChevronDown size={12} />
          </span>
          {connectButton}
          <button
            aria-label="Toggle navigation"
            className="mobile-menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div className="network-strip">
        <div>
          <span className="status-dot" /> PRE-RELEASE{" "}
          <span className="strip-sep">/</span> Built for BNB Chain{" "}
          <span className="strip-sep">/</span> Mainnet deployment pending
          security review
        </div>
        <Link href="/docs">
          Protocol documentation <ArrowUpRight size={12} />
        </Link>
      </div>
      <main>
        {title === "home" ? (
          <>
            <section className="hero">
              <span className="hero-edition">VERDANT STUDIO / VOL. 01</span>
              <div className="hero-copy">
                <div className="eyebrow">
                  <span /> A LAUNCHPAD FOR THE BUILDERS & DREAMERS
                </div>
                <h1>
                  Launch tokens.
                  <br />
                  Put fees <em>to work.</em>
                </h1>
                <p>
                  A next-generation BNB launchpad where trading fees power
                  buybacks, liquidity, AI agents, and real products.
                </p>
                <div className="hero-actions">
                  <Link href="/launch" className="button primary">
                    Launch a token <ArrowUpRight size={17} />
                  </Link>
                  <Link href="/explore" className="button secondary">
                    Explore the market <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="hero-note">
                  <span className="hero-note-icon">
                    <ShieldCheck size={18} />
                  </span>
                  <span>
                    Made for creators.
                    <br />
                    <b>Transparent by design.</b>
                  </span>
                </div>
              </div>
              <StudioSculpture />
            </section>
            <div className="principles">
              {[
                ["01", "Fair launch", "A deterministic bonding curve."],
                [
                  "02",
                  "Purposeful fees",
                  "Five ways to build lasting utility.",
                ],
                [
                  "03",
                  "Fully transparent",
                  "Every allocation, verifiable on-chain.",
                ],
              ].map(([n, h, p]) => (
                <div key={n}>
                  <span className="principle-num">{n}</span>
                  <span>
                    <b>{h}</b>
                    <small>{p}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </div>
              ))}
            </div>
            <section className="market-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">THE ECOSYSTEM</div>
                  <h2>
                    Discover what’s <em>taking shape.</em>
                  </h2>
                </div>
                <Link href="/explore" className="text-link">
                  Explore all tokens <ArrowUpRight size={15} />
                </Link>
              </div>
              {market}
              <div className="data-caption">
                <span className="status-dot muted" />
                {dataState}
                <span>No fabricated volume. No simulated trades.</span>
              </div>
            </section>
            <section className="strategies">
              <div className="section-heading">
                <div>
                  <div className="eyebrow">MORE THAN A TRADING FEE</div>
                  <h2>
                    Good ideas deserve
                    <br />
                    <em>a great foundation.</em>
                  </h2>
                </div>
                <p>
                  Your vision. Your allocation.
                  <br />
                  Set once. Visible to everyone.
                </p>
              </div>
              <div className="strategy-grid">
                {strategies.map((s, i) => (
                  <Link
                    href={`/launch?strategy=${i}`}
                    className="strategy-card"
                    key={s.name}
                  >
                    <div className="strategy-top">
                      <span className="tiny">{s.tag}</span>
                      <ArrowUpRight size={18} />
                    </div>
                    <div
                      className={`strategy-object strategy-object-${i}`}
                      aria-hidden="true"
                    >
                      <span />
                      <i />
                      <b />
                    </div>
                    <h3>{s.name}</h3>
                    <p>{s.text}</p>
                    <div className="allocation-bar">
                      {s.weights.map((w, i) => (
                        <i
                          style={{ width: `${w}%`, background: colors[i] }}
                          key={i}
                        />
                      ))}
                    </div>
                    <div className="strategy-split">
                      <span>{s.weights[0]}% buyback</span>
                      <span>{s.weights[3]}% product</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
            <div className="bottom-cta">
              <div>
                <span className="eyebrow">BUILD SOMETHING THAT LASTS</span>
                <h2>
                  Let’s make
                  <br />
                  <em>something matter.</em>
                </h2>
              </div>
              <Link className="button primary" href="/launch">
                Create your token <Plus size={17} />
              </Link>
            </div>
          </>
        ) : title === "explore" ? (
          <section className="route-section">
            <div className="eyebrow">DISCOVER THE ECOSYSTEM</div>
            <h1 className="page-title">
              Ideas with an <em>engine.</em>
            </h1>
            <p className="subheading">
              Explore tokens by strategy, activity, and conviction.
            </p>
            <label className="search">
              <Search size={18} />
              <input
                placeholder="Search name, symbol, or contract address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            {market}
            <div className="data-caption">{dataState}</div>
          </section>
        ) : title === "launch" ? (
          <Launch
            connected={!!account.address}
            openWallet={() => setWallet(true)}
          />
        ) : title === "token" || title === "fees" ? (
          <TokenWorkspace
            key={tokenAddress}
            token={selected}
            address={pathname.split("/")[2] || ""}
            fees={title === "fees"}
            error={detailError}
            openWallet={() => setWallet(true)}
          />
        ) : title === "docs" ? (
          <Docs />
        ) : title === "agents" ? (
          <AgentWorkspace id={pathname.split("/")[2]} />
        ) : title === "portfolio" || title === "creator" ? (
          <WalletWorkspace
            tokens={tokens}
            creator={title === "creator"}
            openWallet={() => setWallet(true)}
          />
        ) : title === "leaderboard" ? (
          <section className="route-section">
            <div className="eyebrow">ACTIVITY WITH PURPOSE</div>
            <h1 className="page-title">
              The builders’ <em>board.</em>
            </h1>
            <p className="subheading">
              Rankings are calculated from confirmed trades and fee
              distributions.
            </p>
            <LeaderboardMetrics tokens={tokens} verified={verified} />
            {market}
          </section>
        ) : title === "admin" ? (
          <AdminWorkspace api={api} />
        ) : (
          <Empty
            title="Page not found"
            text="Explore the ecosystem to get back on track."
          />
        )}
      </main>
      <footer>
        <div>
          <Link className="brand" href="/">
            <Image
              className="brand-logo"
              src="/images/verdant-logo.png"
              alt=""
              width={36}
              height={36}
            />
            verdant<span className="brand-period">.</span>
          </Link>
          <p>Small fees. Lasting possibilities.</p>
        </div>
        <div>
          <Link href="/docs">
            Documentation <ArrowUpRight size={12} />
          </Link>
          <Link href="/creator">Creator studio</Link>
          <Link href="/portfolio">Portfolio</Link>
          <a href="https://bscscan.com" target="_blank" rel="noreferrer">
            BscScan <ExternalLink size={12} />
          </a>
        </div>
        <span className="footer-chain">
          <span className="bnb">⟐</span>Built on BNB Chain
          <br />
          <small>© 2026 Verdant Protocol</small>
        </span>
      </footer>
      {wallet && (
        <div className="modal-backdrop" onClick={() => setWallet(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              aria-label="Close wallet dialog"
              className="close"
              onClick={() => setWallet(false)}
            >
              <X size={20} />
            </button>
            <Wallet size={28} />
            <h2>{account.address ? "Your wallet" : "Connect your wallet"}</h2>
            <p>Use an EVM wallet to interact with BNB Chain.</p>
            {account.address ? (
              <>
                <code>{account.address}</code>
                <p>
                  {balance.data ? formatEther(balance.data.value) : "—"} BNB
                </p>
                {account.chainId !== 56 && (
                  <button
                    className="button primary"
                    onClick={() => switchChain({ chainId: 56 })}
                  >
                    Switch to BNB Chain
                  </button>
                )}
                <button
                  className="button secondary"
                  onClick={() => {
                    disconnect();
                    setWallet(false);
                  }}
                >
                  Disconnect
                </button>
              </>
            ) : (
              connectors.map((c) => (
                <button
                  className="wallet-option"
                  key={c.uid}
                  onClick={() =>
                    connect(
                      { connector: c },
                      { onSuccess: () => setWallet(false) },
                    )
                  }
                >
                  {c.name}
                  <ArrowUpRight size={18} />
                </button>
              ))
            )}
            {connectError && (
              <p className="error">{connectError.message.split("\n")[0]}</p>
            )}
            <small>We never ask for private keys or recovery phrases.</small>
          </div>
        </div>
      )}
    </>
  );
}
function Launch({
  connected,
  openWallet,
}: {
  connected: boolean;
  openWallet: () => void;
}) {
  const account = useAccount();
  const client = usePublicClient({ chainId: 56 });
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const { switchChain } = useSwitchChain();
  const [readiness, setReadiness] = useState({
    metadata: false,
    trading: false,
    message: "Checking launch availability…",
  });
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [launchedToken, setLaunchedToken] = useState<Address>();
  const [weights, setWeights] = useState([30, 25, 20, 15, 10]);
  const [step, setStep] = useState(1);
  const [fee, setFee] = useState(1);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [image, setImage] = useState("");
  const [x, setX] = useState("");
  const [telegram, setTelegram] = useState("");
  const [status, setStatus] = useState("");
  const [hash, setHash] = useState<Address>();
  const [busy, setBusy] = useState(false);
  const sum = weights.reduce((a, b) => a + b, 0);
  const identityErrors = validateIdentity({
    name,
    symbol,
    description,
    image,
    website,
    x,
    telegram,
  });
  const validAllocation =
    weights.length === 5 &&
    weights.every((v) => Number.isInteger(v) && v >= 0 && v <= 100) &&
    sum === 100;
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("verdant.launch-draft.v1") || "null",
      );
      if (stored?.version === 1) {
        for (const [key, set] of [
          ["name", setName],
          ["symbol", setSymbol],
          ["description", setDescription],
          ["image", setImage],
          ["website", setWebsite],
          ["x", setX],
          ["telegram", setTelegram],
        ] as const)
          if (typeof stored[key] === "string") set(stored[key]);
        if (
          Array.isArray(stored.weights) &&
          stored.weights.length === 5 &&
          stored.weights.every(
            (v: unknown) =>
              typeof v === "number" &&
              Number.isInteger(v) &&
              v >= 0 &&
              v <= 100,
          )
        )
          setWeights(stored.weights);
        if (Number.isFinite(stored.fee) && stored.fee >= 1 && stored.fee <= 10)
          setFee(stored.fee);
      }
    } catch {}
    const strategy = new URLSearchParams(window.location.search).get(
      "strategy",
    );
    if (
      strategy !== null &&
      /^\d+$/.test(strategy) &&
      strategies[Number(strategy)]
    )
      setWeights([...strategies[Number(strategy)].weights]);
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(
        "verdant.launch-draft.v1",
        JSON.stringify({
          version: 1,
          name,
          symbol,
          description,
          image,
          website,
          x,
          telegram,
          weights,
          fee,
        }),
      );
    } catch {}
  }, [
    draftLoaded,
    name,
    symbol,
    description,
    image,
    website,
    x,
    telegram,
    weights,
    fee,
  ]);
  useEffect(() => {
    let alive = true;
    fetch(`${api}/health`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error("Launch API unavailable.");
        if (alive)
          setReadiness({
            metadata: !!data.capabilities?.metadata,
            trading: !!data.capabilities?.trading,
            message:
              data.message ||
              (!data.capabilities?.metadata
                ? "Authenticated metadata service is unavailable."
                : "Launch services ready."),
          });
      })
      .catch(() => {
        if (alive)
          setReadiness({
            metadata: false,
            trading: false,
            message:
              "Launch API is unavailable. You can still save and configure a draft.",
          });
      });
    return () => {
      alive = false;
    };
  }, []);
  async function launch() {
    if (!factory || !readiness.trading || !readiness.metadata) {
      setStatus(
        "Launch services are not ready. Your draft is saved on this device.",
      );
      return;
    }
    if (identityErrors.length || !validAllocation) {
      setStatus("Resolve the identity and allocation errors before launching.");
      return;
    }
    if (account.chainId !== 56) {
      setStatus("Switch your wallet to BNB Chain first.");
      return;
    }
    if (!client) return;
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        symbol,
        description,
        image,
        website,
        x,
        telegram,
      };
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(payload)),
      );
      const payloadHash = Array.from(new Uint8Array(digest))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      setStatus("Preparing a one-time metadata authorization…");
      const challengeResponse = await fetch(`${api}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: account.address, payloadHash }),
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok)
        throw Error(
          challenge.message ||
            challenge.error ||
            "Metadata authorization unavailable.",
        );
      setStatus(
        "Sign the metadata upload authorization in your wallet. This does not move funds.",
      );
      const signature = await signMessageAsync({ message: challenge.message });
      const response = await fetch(`${api}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: payload,
          authorization: {
            wallet: account.address,
            nonce: challenge.nonce,
            signature,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw Error(
          body.message || body.error || "Metadata persistence unavailable.",
        );
      }
      const metadata = await response.json();
      const request = {
        address: factory,
        abi: factoryAbi,
        functionName: "launch" as const,
        args: [
          name.trim(),
          symbol,
          metadata.uri,
          Math.round(fee * 100),
          weights.map((w) => w * 100) as [
            number,
            number,
            number,
            number,
            number,
          ],
        ] as const,
        account: account.address!,
      };
      await client.simulateContract(request);
      const gas = await client.estimateContractGas(request);
      const gasPrice = await client.getGasPrice();
      setStatus(
        `Estimated network cost: ${formatEther(gas * gasPrice)} BNB. Confirm deployment in your wallet.`,
      );
      const tx = await writeContractAsync(request);
      setHash(tx);
      setStatus("Waiting for confirmation…");
      const receipt = await client.waitForTransactionReceipt({
        hash: tx,
        confirmations: 3,
      });
      if (receipt.status !== "success")
        throw Error("Launch transaction reverted.");
      for (const log of receipt.logs) {
        try {
          if (log.address.toLowerCase() !== factory.toLowerCase()) continue;
          const event = decodeEventLog({
            abi: factoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (event.eventName === "Launched")
            setLaunchedToken(event.args.token);
        } catch {}
      }
      setStatus(
        "Launch confirmed. Market discovery follows the configured confirmation window.",
      );
    } catch (e) {
      setStatus((e as Error).message.split("\n")[0]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="route-section launch-route">
      <div className="eyebrow">FROM IDEA TO ECOSYSTEM</div>
      <h1 className="page-title">
        Your idea.
        <br />
        <em>A world of possibility.</em>
      </h1>
      <p className="subheading">
        Launch a fixed-supply token. Give every trade a purpose.
      </p>
      <div className="launch-availability" role="status">
        {!factory
          ? "Contracts are not deployed or configured. Draft design is available; live launching is disabled."
          : !readiness.trading || !readiness.metadata
            ? readiness.message
            : "Launch services are available. Deployment still requires your wallet confirmation."}
        <small>{draftLoaded ? "Draft saved on this device." : ""}</small>
      </div>
      <div className="stepper">
        {["Token identity", "Fee strategy", "Review & launch"].map((s, i) => (
          <button
            onClick={() => setStep(i + 1)}
            disabled={
              (i > 0 && identityErrors.length > 0) ||
              (i === 2 && !validAllocation)
            }
            className={step === i + 1 ? "active" : ""}
            key={s}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="launch-layout">
        <div className="panel form-panel">
          {identityErrors.length > 0 && (name || symbol) && (
            <ul className="validation-errors" role="alert">
              {identityErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {step === 1 ? (
            <>
              <div className="panel-heading">
                <h2>The first impression.</h2>
                <span className="tiny">01 / 03</span>
              </div>
              <div className="form-row">
                <label>
                  Token name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your next big idea"
                    maxLength={64}
                  />
                </label>
                <label>
                  Symbol
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="TICKER"
                    maxLength={12}
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you building, and why does it matter?"
                  maxLength={2000}
                />
              </label>
              <label>
                Token image URL
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://… or ipfs://…"
                />
              </label>
              <div className="form-row">
                <label>
                  Website
                  <input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://"
                  />
                </label>
                <label>
                  X profile
                  <input
                    value={x}
                    onChange={(e) => setX(e.target.value)}
                    placeholder="https://x.com/"
                  />
                </label>
              </div>
              <label>
                Telegram
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="https://t.me/"
                />
              </label>
              <div className="fixed-supply">
                <Lock size={16} />
                <span>
                  1,000,000,000 tokens{" "}
                  <small>Fixed supply · minted once · no admin mint</small>
                </span>
              </div>
              <button
                className="button primary"
                onClick={() => setStep(2)}
                disabled={identityErrors.length > 0}
              >
                Configure fee strategy <ArrowRight size={16} />
              </button>
            </>
          ) : step === 2 ? (
            <>
              <div className="panel-heading">
                <h2>Allocation studio.</h2>
                <span className="tiny">02 / 03</span>
              </div>
              <p className="muted-text">
                Set the purpose of your creator fees. Allocations are immutable.
              </p>
              <label>
                Creator fee <span className="field-value">{fee}%</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.25"
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                />
                <small>
                  Plus a separate 0.50% protocol fee on curve trades.
                </small>
              </label>
              <div className="preset-row">
                {strategies.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setWeights([...s.weights])}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {weights.map((w, i) => {
                const Icon = icons[i];
                return (
                  <div className="allocation-input" key={i}>
                    <div>
                      <span style={{ color: colors[i] }}>
                        <Icon size={17} />
                      </span>
                      <label htmlFor={`allocation-${i}`}>{categories[i]}</label>
                      <input
                        id={`allocation-${i}`}
                        aria-label={`${categories[i]} allocation percent`}
                        type="number"
                        min="0"
                        max="100"
                        value={w}
                        onChange={(e) =>
                          setWeights(
                            weights.map((v, j) =>
                              j === i
                                ? Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      Math.round(Number(e.target.value)),
                                    ),
                                  )
                                : v,
                            ),
                          )
                        }
                      />
                      <span>%</span>
                    </div>
                    <div className="allocation-track">
                      <i style={{ width: `${w}%`, background: colors[i] }} />
                    </div>
                  </div>
                );
              })}
              <div
                className={
                  sum === 100 ? "allocation-total" : "allocation-total error"
                }
              >
                <span>Total allocation</span>
                <b>
                  {sum}% {sum === 100 && <Check size={16} />}
                </b>
              </div>
              <button
                disabled={!validAllocation}
                className="button primary"
                onClick={() => setStep(3)}
              >
                Review launch <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <h2>Ready for your first block?</h2>
                <span className="tiny">03 / 03</span>
              </div>
              <div className="review-token">
                <span className="token-avatar">
                  {symbol.slice(0, 2) || "?"}
                </span>
                <div>
                  <h3>{name || "Unnamed token"}</h3>
                  <span>${symbol || "TOKEN"}</span>
                </div>
              </div>
              <div className="review-row">
                <span>Network</span>
                <b>BNB Smart Chain · 56</b>
              </div>
              <div className="review-row">
                <span>Creator + protocol fee</span>
                <b>{fee}% + 0.50%</b>
              </div>
              <div className="review-row">
                <span>Supply</span>
                <b>1,000,000,000</b>
              </div>
              <div className="review-row">
                <span>Launch cost</span>
                <b>Network gas · wallet estimate</b>
              </div>
              <div className="notice">
                <ShieldCheck size={20} />
                <p>
                  Strategies are permanent. Tokens can lose all value. Mainnet
                  deployment requires an independent contract review. External
                  DEX trades can bypass routed creator fees.
                </p>
              </div>
              {!factory && (
                <p className="error">
                  Factory not deployed. Launch transactions are disabled.
                </p>
              )}
              <button
                className="button primary"
                disabled={
                  busy ||
                  !validAllocation ||
                  identityErrors.length > 0 ||
                  !factory ||
                  !readiness.metadata ||
                  !readiness.trading ||
                  (connected && account.chainId !== 56)
                }
                onClick={connected ? launch : openWallet}
              >
                {busy ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}{" "}
                {!factory || !readiness.metadata || !readiness.trading
                  ? "Deployment unavailable"
                  : connected
                    ? "Confirm deployment"
                    : "Connect wallet to launch"}
              </button>
              {connected && account.chainId !== 56 && (
                <button
                  className="button secondary"
                  onClick={() => switchChain({ chainId: 56 })}
                >
                  Switch to BNB Chain
                </button>
              )}
              {launchedToken && (
                <Link className="text-link" href={`/token/${launchedToken}`}>
                  Open your token <ArrowUpRight size={16} />
                </Link>
              )}
              {status && <p role="status">{status}</p>}
              {hash && (
                <a
                  className="text-link"
                  href={`https://bscscan.com/tx/${hash}`}
                  target="_blank"
                >
                  View transaction <ExternalLink size={14} />
                </a>
              )}
            </>
          )}
        </div>
        <aside className="panel launch-preview">
          <div className="preview-heading">
            <span className="tiny">THE SHAPE OF YOUR STRATEGY</span>
            <span>✳</span>
          </div>
          <div
            className="donut"
            style={{
              background: `conic-gradient(${weights.map((w, i) => `${colors[i]} ${weights.slice(0, i).reduce((a, b) => a + b, 0)}% ${weights.slice(0, i + 1).reduce((a, b) => a + b, 0)}%`).join(",")})`,
            }}
          >
            <div>
              <span>{fee}%</span>
              <small>CREATOR FEE</small>
            </div>
          </div>
          {categories.map((n, i) => (
            <div className="legend" key={n}>
              <i style={{ background: colors[i] }} />
              <span>{n}</span>
              <b>{weights[i]}%</b>
            </div>
          ))}
          <div className="projection">
            <span className="tiny">ILLUSTRATIVE DISTRIBUTION</span>
            <p>
              For every <b>1 BNB</b> in creator fees
            </p>
            {categories.map((n, i) => (
              <div key={n}>
                <span>{n}</span>
                <b>{(weights[i] / 100).toFixed(2)} BNB</b>
              </div>
            ))}
            <small>An allocation example, not projected earnings.</small>
          </div>
        </aside>
      </div>
    </section>
  );
}
function Docs() {
  return (
    <section className="route-section docs">
      <div className="eyebrow">THE PROTOCOL, IN THE OPEN</div>
      <h1 className="page-title">
        Know what you’re <em>building on.</em>
      </h1>
      {[
        [
          "Launch mechanics",
          "Every token has 1 billion units at 18 decimals, minted exactly once into its market. The virtual constant-product curve starts with 30 virtual BNB and 1.073 billion virtual tokens. Buys and sells use integer arithmetic, rounding outputs down. Real BNB reserves back redemptions.",
        ],
        [
          "Fees that add up",
          "Creator fees range from 1% to 10%. A separate 0.50% protocol fee applies to curve trades. Immutable allocations total 10,000 basis points. Rounding dust is assigned to creator revenue so every wei is accounted for. Utility balances are escrowed; production execution is not enabled.",
        ],
        [
          "Graduation & liquidity",
          "The threshold is 85 actual BNB held in the market. Graduation atomically moves remaining tokens and the BNB reserve into a fresh approved V2 pool. LP tokens are permanently held by the non-upgradeable manager. Existing pools block migration to prevent reserve manipulation; this also creates a griefing risk that needs resolution before mainnet. Graduation pricing may jump and requires economic review.",
        ],
        [
          "After graduation",
          "Ordinary PancakeSwap trades do not pay this creator fee. A custom approved route can charge explicit fees for its own traffic; external routes bypass that charge. Infinity hooks are a possible future pool-specific mechanism, requiring implementation and independent review. Permanent fees across every venue are not promised.",
        ],
        [
          "AI operations",
          "On-chain BNB is an operational budget, not a direct LLM payment. Off-chain inference uses server credentials and an approved expense record. Reconciliation must connect operator withdrawals, invoices, exchange rates, and usage. No agents may sign trades or spend arbitrary wallet funds.",
        ],
        [
          "Treasury & permissions",
          "Product milestones require two of three named reviewers before payout. Creators can claim only their own payout credit. The core fee router has no administrator withdrawal function. Utility execution modules, operational funding, and post-graduation integrations remain security gates.",
        ],
        [
          "Current release status",
          "This is an undeployed development release. No mainnet contracts, verified market statistics, completed audits, or live agents are claimed. See the repository readiness report for executed tests and remaining acceptance criteria.",
        ],
      ].map(([h, p]) => (
        <article className="panel" key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </article>
      ))}
      <a
        href="https://developer.pancakeswap.finance/contracts/infinity/overview"
        target="_blank"
        className="text-link"
      >
        PancakeSwap Infinity architecture <ExternalLink size={14} />
      </a>
    </section>
  );
}
