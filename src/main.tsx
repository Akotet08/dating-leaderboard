import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Heart,
  LayoutDashboard,
  Medal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X
} from "lucide-react";
import "./styles.css";

type Tier = "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier";
type View = "leaderboard" | "admin";

type Candidate = {
  id: string;
  name: string;
  tier: Tier;
  score: number;
  note: string;
  delta?: string;
  isUser?: boolean;
};

type Boost = {
  id: "nudge" | "push" | "launch";
  name: string;
  spots: number;
  price: number;
};

type CandidateForm = Omit<Candidate, "id">;

const STORAGE_KEY = "dating-leaderboard:candidates";
const tiers: Tier[] = ["S-Tier", "A-Tier", "B-Tier", "C-Tier"];

const defaultCandidates: Candidate[] = [
  {
    id: "tyrone",
    name: "Tyrone",
    tier: "S-Tier",
    score: 79,
    note: "Remembers every detail you mention and still shows up 10 minutes early.",
    delta: "+4"
  },
  {
    id: "dante",
    name: "Dante",
    tier: "S-Tier",
    score: 76,
    note: "Main-character energy, replies in under 3 minutes, and has a 5-year plan.",
    delta: "+2"
  },
  {
    id: "isaac",
    name: "Isaac",
    tier: "S-Tier",
    score: 72,
    note: "Asked one thoughtful question and accidentally cleared the field.",
    delta: "New"
  },
  {
    id: "hector",
    name: "Hector",
    tier: "A-Tier",
    score: 68,
    note: "Brings flowers without making it a personality reveal.",
    delta: "+1"
  },
  {
    id: "jordan",
    name: "Jordan",
    tier: "A-Tier",
    score: 64,
    note: "Great dinner pick. Suspiciously vague about his weekday schedule.",
    delta: "-1"
  },
  {
    id: "andre",
    name: "Andre",
    tier: "A-Tier",
    score: 61,
    note: "Sent a voice note that was somehow charming and under 20 seconds.",
    delta: "+3"
  },
  {
    id: "marcus",
    name: "Marcus",
    tier: "A-Tier",
    score: 58,
    note: "Reliable, kind, and still recovering from the group chat audit.",
    delta: "-2"
  },
  {
    id: "caleb",
    name: "Caleb",
    tier: "B-Tier",
    score: 54,
    note: "Has potential if the phrase 'let's play it by ear' is retired.",
    delta: "+1"
  },
  {
    id: "nate",
    name: "Nate",
    tier: "B-Tier",
    score: 51,
    note: "Good vibes, solid intentions, still working on the follow-through.",
    delta: "-1"
  },
  {
    id: "miles",
    name: "Miles",
    tier: "B-Tier",
    score: 48,
    note: "Sweet and spontaneous - just needs to answer texts before 11 PM.",
    delta: "+2"
  },
  {
    id: "cole",
    name: "Cole",
    tier: "B-Tier",
    score: 46,
    note: "Looks great on paper. The paper is a parking ticket.",
    delta: "-3"
  },
  {
    id: "jalen",
    name: "Jalen",
    tier: "B-Tier",
    score: 45,
    note: "Nice guy. Took 48 hours to confirm dinner plans.",
    delta: "0"
  },
  {
    id: "you",
    name: "You",
    tier: "B-Tier",
    score: 44,
    note: "You have potential - real potential - but 'I'm bad at texting' is not a personality trait.",
    delta: "You",
    isUser: true
  },
  {
    id: "trey",
    name: "Trey",
    tier: "C-Tier",
    score: 38,
    note: "Keeps cancelling plans because of a 'work thing.' That thing is a PS5.",
    delta: "-4"
  },
  {
    id: "kendrick",
    name: "Kendrick",
    tier: "C-Tier",
    score: 34,
    note: "Emotionally available once a month, around the new moon, if conditions are right.",
    delta: "-1"
  }
];

const emptyForm: CandidateForm = {
  name: "",
  tier: "B-Tier",
  score: 40,
  note: "",
  delta: "",
  isUser: false
};

const boosts: Boost[] = [
  { id: "nudge", name: "Nudge", spots: 1, price: 2.99 },
  { id: "push", name: "Push", spots: 3, price: 6.99 },
  { id: "launch", name: "Launch", spots: 5, price: 12.99 }
];

function App() {
  const [view, setView] = React.useState<View>("leaderboard");
  const [candidates, setCandidates] = React.useState<Candidate[]>(() => loadCandidates());
  const [boostOpen, setBoostOpen] = React.useState(false);
  const [selectedBoost, setSelectedBoost] = React.useState<Boost>(boosts[1]);
  const [boosted, setBoosted] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [paymentNotice, setPaymentNotice] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [tier, setTier] = React.useState<"All" | Tier>("All");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (payment === "success") {
      setBoosted(true);
      setPaymentNotice("Payment confirmed. Boost applied locally while the webhook records it.");
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (payment === "cancelled") {
      setPaymentNotice("Checkout cancelled. No boost was applied.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  }, [candidates]);

  const rankedCandidates = React.useMemo(() => rankCandidates(candidates), [candidates]);
  const user = rankedCandidates.find((candidate) => candidate.isUser);
  const boostedRank = user ? Math.max(1, user.rank - selectedBoost.spots) : 1;
  const boostedScore = user ? Math.min(80, user.score + selectedBoost.spots * 4) : 0;

  const visibleCandidates = rankedCandidates.filter((candidate) => {
    const matchesQuery = [candidate.name, candidate.note, candidate.tier]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesTier = tier === "All" || candidate.tier === tier;
    return matchesQuery && matchesTier;
  });

  const podiumCandidates = rankedCandidates.slice(0, 3);
  const averageScore =
    candidates.length === 0
      ? 0
      : Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length);

  async function handleContinue() {
    if (!user) {
      return;
    }

    setCheckoutLoading(true);
    setPaymentNotice(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          boostId: selectedBoost.id,
          candidateId: user.id,
          candidateName: user.name
        })
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout failed");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setPaymentNotice("Checkout is not configured yet. Add Stripe and Supabase env vars, then try again.");
      console.error(error);
    } finally {
      setCheckoutLoading(false);
    }
  }

  function handleResetBoost() {
    setBoosted(false);
    setSelectedBoost(boosts[1]);
  }

  function handleResetData() {
    setCandidates(defaultCandidates);
    setBoosted(false);
    setSelectedBoost(boosts[1]);
  }

  function handleSaveCandidate(candidate: CandidateForm, candidateId?: string) {
    const normalized: Candidate = {
      ...candidate,
      id: candidateId ?? createId(candidate.name),
      score: clampScore(candidate.score),
      delta: candidate.delta?.trim() || undefined
    };

    setCandidates((current) => {
      const withoutUserFlag = normalized.isUser
        ? current.map((item) => ({ ...item, isUser: item.id === candidateId ? item.isUser : false }))
        : current;

      if (candidateId) {
        return withoutUserFlag.map((item) => (item.id === candidateId ? { ...normalized, id: candidateId } : item));
      }

      return [...withoutUserFlag, normalized];
    });
  }

  function handleDeleteCandidate(candidateId: string) {
    setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Heart size={18} fill="currentColor" />
          </span>
          <div>
            <p>The Official Rankings</p>
            <h1>Dating Leaderboard</h1>
          </div>
        </div>

        <nav className="view-tabs" aria-label="Application views">
          <button className={view === "leaderboard" ? "active" : ""} onClick={() => setView("leaderboard")}>
            <Trophy size={17} />
            Rankings
          </button>
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
            <Shield size={17} />
            Admin
          </button>
        </nav>
      </header>

      <section className="stats-grid" aria-label="Leaderboard summary">
        <Metric icon={<Users size={18} />} label="Contenders" value={String(candidates.length)} />
        <Metric icon={<Medal size={18} />} label="Leader" value={rankedCandidates[0]?.name ?? "None"} />
        <Metric icon={<Sparkles size={18} />} label="Avg score" value={`${averageScore}/80`} />
      </section>

      {view === "leaderboard" ? (
        <LeaderboardView
          candidates={visibleCandidates}
          podiumCandidates={podiumCandidates}
          query={query}
          tier={tier}
          boosted={boosted}
          boostedRank={boostedRank}
          boostedScore={boostedScore}
          user={user}
          onQueryChange={setQuery}
          onTierChange={setTier}
          onBoost={() => setBoostOpen(true)}
          onResetBoost={handleResetBoost}
          paymentNotice={paymentNotice}
        />
      ) : (
        <AdminView
          candidates={rankedCandidates}
          onSave={handleSaveCandidate}
          onDelete={handleDeleteCandidate}
          onResetData={handleResetData}
        />
      )}

      {boostOpen && user ? (
        <BoostSheet
          boosts={boosts}
          selectedBoost={selectedBoost}
          userRank={user.rank}
          loading={checkoutLoading}
          onSelect={setSelectedBoost}
          onClose={() => setBoostOpen(false)}
          onContinue={handleContinue}
        />
      ) : null}
    </main>
  );
}

function LeaderboardView({
  candidates,
  podiumCandidates,
  query,
  tier,
  boosted,
  boostedRank,
  boostedScore,
  user,
  onQueryChange,
  onTierChange,
  onBoost,
  onResetBoost,
  paymentNotice
}: {
  candidates: RankedCandidate[];
  podiumCandidates: RankedCandidate[];
  query: string;
  tier: "All" | Tier;
  boosted: boolean;
  boostedRank: number;
  boostedScore: number;
  user?: RankedCandidate;
  onQueryChange: (query: string) => void;
  onTierChange: (tier: "All" | Tier) => void;
  onBoost: () => void;
  onResetBoost: () => void;
  paymentNotice: string | null;
}) {
  return (
    <div className="content-grid">
      <section className="feature-panel" aria-labelledby="feature-title">
        <div className="title-block">
          <p>Current board</p>
          <h2 id="feature-title">Where everyone stands right now.</h2>
          <span>Search, filter by tier, and boost the active user from the ranking row.</span>
        </div>
        <Podium candidates={podiumCandidates} />
        {boosted && user ? (
          <section className="boost-result" aria-live="polite">
            <div>
              <Sparkles size={18} />
              <span>
                {user.name} boosted to #{boostedRank}
              </span>
            </div>
            <button onClick={onResetBoost}>
              <RotateCcw size={16} />
              Reset
            </button>
          </section>
        ) : null}
        {paymentNotice ? (
          <section className="payment-notice" aria-live="polite">
            <BadgeDollarSign size={18} />
            <span>{paymentNotice}</span>
          </section>
        ) : null}
      </section>

      <section className="rankings" aria-labelledby="rankings-title">
        <div className="control-strip" aria-label="Ranking controls">
          <label className="search-box">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search contenders"
            />
          </label>
          <select
            aria-label="Filter by tier"
            value={tier}
            onChange={(event) => onTierChange(event.target.value as "All" | Tier)}
          >
            <option>All</option>
            {tiers.map((tierName) => (
              <option key={tierName}>{tierName}</option>
            ))}
          </select>
        </div>

        <div className="section-heading">
          <h2 id="rankings-title">Full Rankings</h2>
          <span>{candidates.length} shown</span>
        </div>

        <div className="ranking-list">
          {candidates.map((candidate) => (
            <RankingRow
              key={candidate.id}
              candidate={
                boosted && candidate.isUser
                  ? { ...candidate, rank: boostedRank, score: boostedScore }
                  : candidate
              }
              onBoost={onBoost}
              boosted={boosted}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminView({
  candidates,
  onSave,
  onDelete,
  onResetData
}: {
  candidates: RankedCandidate[];
  onSave: (candidate: CandidateForm, candidateId?: string) => void;
  onDelete: (candidateId: string) => void;
  onResetData: () => void;
}) {
  const [editingId, setEditingId] = React.useState<string | undefined>();
  const editingCandidate = candidates.find((candidate) => candidate.id === editingId);

  function handleEdit(candidate: Candidate) {
    setEditingId(candidate.id);
  }

  function handleSaved(candidate: CandidateForm) {
    onSave(candidate, editingId);
    setEditingId(undefined);
  }

  return (
    <div className="admin-grid">
      <section className="admin-panel" aria-labelledby="admin-title">
        <div className="section-heading">
          <div>
            <h2 id="admin-title">{editingCandidate ? "Edit Contender" : "Add Contender"}</h2>
            <span>Changes update the leaderboard immediately.</span>
          </div>
        </div>
        <CandidateEditor
          key={editingCandidate?.id ?? "new-candidate"}
          candidate={editingCandidate}
          onSave={handleSaved}
          onCancel={() => setEditingId(undefined)}
        />
      </section>

      <section className="admin-panel" aria-labelledby="admin-list-title">
        <div className="section-heading">
          <div>
            <h2 id="admin-list-title">Manage Records</h2>
            <span>{candidates.length} saved contenders</span>
          </div>
          <button className="secondary-button" onClick={onResetData}>
            <RotateCcw size={16} />
            Reset data
          </button>
        </div>

        <div className="admin-list">
          {candidates.map((candidate) => (
            <article className="admin-row" key={candidate.id}>
              <div className="rank-number">{candidate.rank}</div>
              <div className="admin-copy">
                <div className="candidate-header">
                  <h3>{candidate.name}</h3>
                  {candidate.isUser ? <span className="you-badge">User</span> : null}
                  <span className={`tier tier-${candidate.tier[0].toLowerCase()}`}>{candidate.tier}</span>
                </div>
                <p>{candidate.note}</p>
                <strong>{candidate.score}/80</strong>
              </div>
              <div className="row-actions">
                <button className="icon-button" aria-label={`Edit ${candidate.name}`} onClick={() => handleEdit(candidate)}>
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${candidate.name}`}
                  onClick={() => onDelete(candidate.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CandidateEditor({
  candidate,
  onSave,
  onCancel
}: {
  candidate?: Candidate;
  onSave: (candidate: CandidateForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<CandidateForm>(
    candidate
      ? {
          name: candidate.name,
          tier: candidate.tier,
          score: candidate.score,
          note: candidate.note,
          delta: candidate.delta ?? "",
          isUser: Boolean(candidate.isUser)
        }
      : emptyForm
  );

  const canSave = form.name.trim().length > 0 && form.note.trim().length > 0;

  function updateForm<Key extends keyof CandidateForm>(key: Key, value: CandidateForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      note: form.note.trim(),
      delta: form.delta?.trim()
    });
    if (!candidate) {
      setForm(emptyForm);
    }
  }

  return (
    <form className="candidate-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="New contender" />
      </label>

      <div className="form-row">
        <label>
          Tier
          <select value={form.tier} onChange={(event) => updateForm("tier", event.target.value as Tier)}>
            {tiers.map((tierName) => (
              <option key={tierName}>{tierName}</option>
            ))}
          </select>
        </label>
        <label>
          Score
          <input
            type="number"
            min="0"
            max="80"
            value={form.score}
            onChange={(event) => updateForm("score", Number(event.target.value))}
          />
        </label>
      </div>

      <label>
        Movement
        <input value={form.delta ?? ""} onChange={(event) => updateForm("delta", event.target.value)} placeholder="+2, -1, New" />
      </label>

      <label>
        Roast note
        <textarea value={form.note} onChange={(event) => updateForm("note", event.target.value)} placeholder="Add the leaderboard note" />
      </label>

      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(form.isUser)} onChange={(event) => updateForm("isUser", event.target.checked)} />
        Set as boostable user
      </label>

      <div className="form-actions">
        {candidate ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            <X size={16} />
            Cancel
          </button>
        ) : null}
        <button className="primary-button" type="submit" disabled={!canSave}>
          {candidate ? <Check size={17} /> : <Plus size={17} />}
          {candidate ? "Save changes" : "Add contender"}
        </button>
      </div>
    </form>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

type RankedCandidate = Candidate & { rank: number };

function Podium({ candidates }: { candidates: RankedCandidate[] }) {
  const podium = [candidates[1], candidates[0], candidates[2]].filter(Boolean);

  return (
    <div className="podium" aria-label="Top three rankings">
      {podium.map((candidate) => (
        <article className={`podium-card rank-${candidate.rank}`} key={candidate.id}>
          <Medal size={18} aria-hidden="true" />
          <strong>#{candidate.rank}</strong>
          <h3>{candidate.name}</h3>
          <p>{candidate.tier}</p>
          <span>{candidate.score}/80</span>
        </article>
      ))}
    </div>
  );
}

function RankingRow({
  candidate,
  onBoost,
  boosted
}: {
  candidate: RankedCandidate;
  onBoost: () => void;
  boosted: boolean;
}) {
  return (
    <article className={`ranking-row ${candidate.isUser ? "is-user" : ""}`}>
      <div className="rank-number">{candidate.rank}</div>
      <div className="candidate-copy">
        <div className="candidate-header">
          <h3>{candidate.name}</h3>
          {candidate.isUser ? <span className="you-badge">You</span> : null}
          {candidate.delta ? <span className="movement">{candidate.delta}</span> : null}
        </div>
        <p>{candidate.note}</p>
        {candidate.isUser ? (
          <button className="boost-button" onClick={onBoost} disabled={boosted}>
            <span>{boosted ? "Boost Applied" : "Boost Your Rank"}</span>
            <small>{boosted ? `now #${candidate.rank}` : `from #${candidate.rank}`}</small>
            <ArrowUpRight size={18} />
          </button>
        ) : null}
      </div>
      <div className="score-block">
        <span className={`tier tier-${candidate.tier[0].toLowerCase()}`}>{candidate.tier}</span>
        <strong>{candidate.score}/80</strong>
      </div>
    </article>
  );
}

function BoostSheet({
  boosts,
  selectedBoost,
  userRank,
  loading,
  onSelect,
  onClose,
  onContinue
}: {
  boosts: Boost[];
  selectedBoost: Boost;
  userRank: number;
  loading: boolean;
  onSelect: (boost: Boost) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="boost-sheet"
        aria-labelledby="boost-title"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="sheet-close" aria-label="Close boost sheet" onClick={onClose}>
          <X size={19} />
        </button>
        <div className="sheet-title">
          <h2 id="boost-title">Boost Your Rank</h2>
          <p>Skip the line. No judgment.</p>
        </div>
        <div className="boost-options">
          {boosts.map((boost) => {
            const newRank = Math.max(1, userRank - boost.spots);
            const selected = selectedBoost.id === boost.id;
            return (
              <button
                className={`boost-option ${selected ? "selected" : ""}`}
                key={boost.id}
                onClick={() => onSelect(boost)}
              >
                <span>
                  <strong>{boost.name}</strong>
                  <small>
                    Move up {boost.spots} {boost.spots === 1 ? "spot" : "spots"} {"->"} #{newRank}
                  </small>
                </span>
                <b>${boost.price.toFixed(2)}</b>
              </button>
            );
          })}
        </div>
        <button className="continue-button" onClick={onContinue} disabled={loading}>
          {loading ? "Starting checkout..." : `Continue - $${selectedBoost.price.toFixed(2)}`}
        </button>
      </section>
    </div>
  );
}

function rankCandidates(candidates: Candidate[]): RankedCandidate[] {
  return [...candidates]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function loadCandidates() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultCandidates;
    }
    const parsed = JSON.parse(stored) as Candidate[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCandidates;
  } catch {
    return defaultCandidates;
  }
}

function createId(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "contender"}-${crypto.randomUUID().slice(0, 8)}`;
}

function clampScore(score: number) {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.min(80, Math.max(0, Math.round(score)));
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
