import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Check,
  Heart,
  KeyRound,
  LogIn,
  LogOut,
  Medal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X
} from "lucide-react";
import "./styles.css";

type Tier = "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier";
type View = "leaderboard" | "admin";
type AuthMode = "login" | "register";

type Candidate = {
  id: string;
  name: string;
  pickupLine?: string | null;
  tier: Tier;
  score: number;
  note: string;
  delta?: string;
  isUser?: boolean;
  hasLogin?: boolean;
};

type AuthUser = {
  id: string;
  name: string;
  role: "admin" | "user";
  pickupLine?: string | null;
  hasLogin: boolean;
};

type Boost = {
  id: "nudge" | "push" | "launch";
  name: string;
  spots: number;
  price: number;
};

type CandidateForm = Omit<Candidate, "id" | "hasLogin"> & { password?: string };
type RankedCandidate = Candidate & { rank: number };

const tiers: Tier[] = ["S-Tier", "A-Tier", "B-Tier", "C-Tier"];
const emptyForm: CandidateForm = {
  name: "",
  pickupLine: "",
  tier: "C-Tier",
  score: 0,
  note: "",
  delta: "New",
  isUser: false,
  password: ""
};

const boosts: Boost[] = [
  { id: "nudge", name: "Nudge", spots: 1, price: 2.99 },
  { id: "push", name: "Push", spots: 3, price: 6.99 },
  { id: "launch", name: "Launch", spots: 5, price: 12.99 }
];

function App() {
  const [view, setView] = React.useState<View>("leaderboard");
  const [authMode, setAuthMode] = React.useState<AuthMode>("login");
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [candidates, setCandidates] = React.useState<Candidate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [boostOpen, setBoostOpen] = React.useState(false);
  const [selectedBoost, setSelectedBoost] = React.useState<Boost>(boosts[1]);
  const [boosted, setBoosted] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [paymentNotice, setPaymentNotice] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [tier, setTier] = React.useState<"All" | Tier>("All");

  const isAdmin = currentUser?.role === "admin";

  React.useEffect(() => {
    void loadInitialData();

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

  const rankedCandidates = React.useMemo(() => rankCandidates(candidates), [candidates]);
  const userCandidate = rankedCandidates.find((candidate) => candidate.id === currentUser?.id);
  const boostableCandidate = userCandidate ?? rankedCandidates.find((candidate) => candidate.isUser);
  const boostedRank = boostableCandidate ? Math.max(1, boostableCandidate.rank - selectedBoost.spots) : 1;
  const boostedScore = boostableCandidate ? Math.min(80, boostableCandidate.score + selectedBoost.spots * 4) : 0;

  const visibleCandidates = rankedCandidates.filter((candidate) => {
    const matchesQuery = [candidate.name, candidate.note, candidate.pickupLine, candidate.tier]
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

  async function loadInitialData() {
    setLoading(true);
    try {
      const [me, leaderboard] = await Promise.all([
        api<{ user: AuthUser | null }>("/api/auth-me"),
        api<{ candidates: Candidate[] }>("/api/candidates")
      ]);
      setCurrentUser(me.user);
      setCandidates(leaderboard.candidates);
    } catch (error) {
      setNotice(readError(error, "Unable to load app data"));
    } finally {
      setLoading(false);
    }
  }

  async function reloadCandidates() {
    const payload = await api<{ candidates: Candidate[] }>("/api/candidates");
    setCandidates(payload.candidates);
  }

  async function handleAuthSubmit(payload: { name: string; password: string; pickupLine?: string }) {
    const endpoint = authMode === "login" ? "/api/login" : "/api/register";
    const result = await api<{ user: AuthUser }>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setCurrentUser(result.user);
    setNotice(authMode === "login" ? `Logged in as ${result.user.name}.` : "Registration complete. You are on the board.");
    await reloadCandidates();
  }

  async function handleLogout() {
    await api("/api/logout", { method: "POST" });
    setCurrentUser(null);
    setView("leaderboard");
    setNotice("Logged out.");
  }

  async function handlePasswordChange(currentPassword: string, newPassword: string) {
    await api("/api/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });
    setNotice("Password updated.");
  }

  async function handleContinue() {
    if (!boostableCandidate) {
      return;
    }

    setCheckoutLoading(true);
    setPaymentNotice(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boostId: selectedBoost.id,
          candidateId: boostableCandidate.id,
          candidateName: boostableCandidate.name
        })
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Checkout failed");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setPaymentNotice("Checkout is not configured yet. Add Stripe and database env vars, then try again.");
      console.error(error);
    } finally {
      setCheckoutLoading(false);
    }
  }

  function handleResetBoost() {
    setBoosted(false);
    setSelectedBoost(boosts[1]);
  }

  async function handleSaveCandidate(candidate: CandidateForm, candidateId?: string) {
    const normalized = {
      ...candidate,
      score: clampScore(candidate.score),
      delta: candidate.delta?.trim() || undefined
    };
    const result = await api<{ candidates: Candidate[] }>("/api/candidates", {
      method: candidateId ? "PUT" : "POST",
      body: JSON.stringify(candidateId ? { ...normalized, id: candidateId } : normalized)
    });
    setCandidates(result.candidates);
    setNotice(candidateId ? "User rating updated." : "User added.");
  }

  async function handleDeleteCandidate(candidateId: string) {
    const result = await api<{ candidates: Candidate[] }>("/api/candidates", {
      method: "DELETE",
      body: JSON.stringify({ id: candidateId })
    });
    setCandidates(result.candidates);
    setNotice("User removed.");
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
          {isAdmin ? (
            <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
              <Shield size={17} />
              Admin
            </button>
          ) : null}
        </nav>
      </header>

      <section className="stats-grid" aria-label="Leaderboard summary">
        <Metric icon={<Users size={18} />} label="Contenders" value={String(candidates.length)} />
        <Metric icon={<Medal size={18} />} label="Leader" value={rankedCandidates[0]?.name ?? "None"} />
        <Metric icon={<Sparkles size={18} />} label="Avg score" value={`${averageScore}/80`} />
      </section>

      {notice ? (
        <section className="payment-notice" aria-live="polite">
          <Sparkles size={18} />
          <span>{notice}</span>
        </section>
      ) : null}

      <section className="account-panel" aria-label="Account">
        {currentUser ? (
          <AccountSummary user={currentUser} candidate={userCandidate} onLogout={handleLogout} onPasswordChange={handlePasswordChange} />
        ) : (
          <AuthPanel mode={authMode} onModeChange={setAuthMode} onSubmit={handleAuthSubmit} />
        )}
      </section>

      {loading ? (
        <section className="rankings">
          <div className="section-heading">
            <h2>Loading</h2>
            <span>Fetching leaderboard</span>
          </div>
        </section>
      ) : view === "admin" && isAdmin ? (
        <AdminView candidates={rankedCandidates} onSave={handleSaveCandidate} onDelete={handleDeleteCandidate} />
      ) : (
        <LeaderboardView
          candidates={visibleCandidates}
          podiumCandidates={podiumCandidates}
          query={query}
          tier={tier}
          boosted={boosted}
          boostedRank={boostedRank}
          boostedScore={boostedScore}
          user={boostableCandidate}
          canBoost={Boolean(currentUser && currentUser.role === "user")}
          onQueryChange={setQuery}
          onTierChange={setTier}
          onBoost={() => setBoostOpen(true)}
          onResetBoost={handleResetBoost}
          paymentNotice={paymentNotice}
        />
      )}

      {boostOpen && boostableCandidate ? (
        <BoostSheet
          boosts={boosts}
          selectedBoost={selectedBoost}
          userRank={boostableCandidate.rank}
          loading={checkoutLoading}
          onSelect={setSelectedBoost}
          onClose={() => setBoostOpen(false)}
          onContinue={handleContinue}
        />
      ) : null}
    </main>
  );
}

function AuthPanel({
  mode,
  onModeChange,
  onSubmit
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (payload: { name: string; password: string; pickupLine?: string }) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [pickupLine, setPickupLine] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ name, pickupLine, password });
      setName("");
      setPickupLine("");
      setPassword("");
    } catch (submitError) {
      setError(readError(submitError, "Unable to authenticate"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <h2>{mode === "login" ? "Login" : "Register"}</h2>
          <span>{mode === "login" ? "Deme can access admin after login." : "New users start at the bottom."}</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => onModeChange(mode === "login" ? "register" : "login")}>
          {mode === "login" ? <UserPlus size={16} /> : <LogIn size={16} />}
          {mode === "login" ? "Register" : "Login"}
        </button>
      </div>
      <div className="form-row">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={mode === "login" ? "Deme" : "Your name"} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
        </label>
      </div>
      {mode === "register" ? (
        <label>
          Pickup line
          <input value={pickupLine} onChange={(event) => setPickupLine(event.target.value)} placeholder="Your best opener" />
        </label>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={loading}>
          {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
          {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </div>
    </form>
  );
}

function AccountSummary({
  user,
  candidate,
  onLogout,
  onPasswordChange
}: {
  user: AuthUser;
  candidate?: RankedCandidate;
  onLogout: () => Promise<void>;
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await onPasswordChange(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed.");
    } catch (error) {
      setMessage(readError(error, "Unable to change password"));
    }
  }

  return (
    <div className="account-summary">
      <div>
        <p>{user.role === "admin" ? "Admin" : "Signed in"}</p>
        <h2>{user.name}</h2>
        {candidate ? <span>Rank #{candidate.rank} · {candidate.score}/80</span> : <span>Admin dashboard access</span>}
      </div>
      <div className="account-actions">
        <button className="secondary-button" onClick={() => setOpen((value) => !value)}>
          <KeyRound size={16} />
          Password
        </button>
        <button className="secondary-button" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
      {open ? (
        <form className="password-form" onSubmit={handlePasswordSubmit}>
          <label>
            Current password
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label>
            New password
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <button className="primary-button" type="submit">
            <Check size={16} />
            Save password
          </button>
          {message ? <p className="form-error">{message}</p> : null}
        </form>
      ) : null}
    </div>
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
  canBoost,
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
  canBoost: boolean;
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
          <span>Register to join the board. Admin ratings decide the official rank.</span>
        </div>
        <Podium candidates={podiumCandidates} />
        {boosted && user ? (
          <section className="boost-result" aria-live="polite">
            <div>
              <Sparkles size={18} />
              <span>{user.name} boosted to #{boostedRank}</span>
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
            <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search contenders" />
          </label>
          <select aria-label="Filter by tier" value={tier} onChange={(event) => onTierChange(event.target.value as "All" | Tier)}>
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
              candidate={boosted && user?.id === candidate.id ? { ...candidate, rank: boostedRank, score: boostedScore } : candidate}
              onBoost={onBoost}
              boosted={boosted}
              canBoost={canBoost && user?.id === candidate.id}
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
  onDelete
}: {
  candidates: RankedCandidate[];
  onSave: (candidate: CandidateForm, candidateId?: string) => Promise<void>;
  onDelete: (candidateId: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = React.useState<string | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const editingCandidate = candidates.find((candidate) => candidate.id === editingId);

  async function handleSaved(candidate: CandidateForm) {
    setError(null);
    try {
      await onSave(candidate, editingId);
      setEditingId(undefined);
    } catch (saveError) {
      setError(readError(saveError, "Unable to save user"));
    }
  }

  async function handleDelete(candidateId: string) {
    setError(null);
    try {
      await onDelete(candidateId);
    } catch (deleteError) {
      setError(readError(deleteError, "Unable to delete user"));
    }
  }

  return (
    <div className="admin-grid">
      <section className="admin-panel" aria-labelledby="admin-title">
        <div className="section-heading">
          <div>
            <h2 id="admin-title">{editingCandidate ? "Rate User" : "Add User"}</h2>
            <span>Admin ratings update the leaderboard immediately.</span>
          </div>
        </div>
        <CandidateEditor
          key={editingCandidate?.id ?? "new-candidate"}
          candidate={editingCandidate}
          onSave={handleSaved}
          onCancel={() => setEditingId(undefined)}
        />
        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <section className="admin-panel" aria-labelledby="admin-list-title">
        <div className="section-heading">
          <div>
            <h2 id="admin-list-title">Manage Users</h2>
            <span>{candidates.length} registered and listed users</span>
          </div>
        </div>

        <div className="admin-list">
          {candidates.map((candidate) => (
            <article className="admin-row" key={candidate.id}>
              <div className="rank-number">{candidate.rank}</div>
              <div className="admin-copy">
                <div className="candidate-header">
                  <h3>{candidate.name}</h3>
                  {candidate.hasLogin ? <span className="you-badge">Login</span> : null}
                  <span className={`tier tier-${candidate.tier[0].toLowerCase()}`}>{candidate.tier}</span>
                </div>
                {candidate.pickupLine ? <p>{candidate.pickupLine}</p> : null}
                <p>{candidate.note}</p>
                <strong>{candidate.score}/80</strong>
              </div>
              <div className="row-actions">
                <button className="icon-button" aria-label={`Edit ${candidate.name}`} onClick={() => setEditingId(candidate.id)}>
                  <Pencil size={17} />
                </button>
                <button className="icon-button danger" aria-label={`Delete ${candidate.name}`} onClick={() => void handleDelete(candidate.id)}>
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
  onSave: (candidate: CandidateForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState<CandidateForm>(
    candidate
      ? {
          name: candidate.name,
          pickupLine: candidate.pickupLine ?? "",
          tier: candidate.tier,
          score: candidate.score,
          note: candidate.note,
          delta: candidate.delta ?? "",
          isUser: Boolean(candidate.isUser),
          password: ""
        }
      : emptyForm
  );
  const [saving, setSaving] = React.useState(false);
  const canSave = form.name.trim().length > 0 && form.note.trim().length > 0;

  function updateForm<Key extends keyof CandidateForm>(key: Key, value: CandidateForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        pickupLine: form.pickupLine?.trim(),
        note: form.note.trim(),
        delta: form.delta?.trim(),
        password: candidate ? "" : form.password?.trim()
      });
      if (!candidate) {
        setForm(emptyForm);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="candidate-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="New user" />
      </label>

      <label>
        Pickup line
        <input value={form.pickupLine ?? ""} onChange={(event) => updateForm("pickupLine", event.target.value)} placeholder="Their opener" />
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

      {!candidate ? (
        <label>
          Login password
          <input
            type="password"
            value={form.password ?? ""}
            onChange={(event) => updateForm("password", event.target.value)}
            placeholder="Optional for admin-added users"
          />
        </label>
      ) : null}

      <label>
        Movement
        <input value={form.delta ?? ""} onChange={(event) => updateForm("delta", event.target.value)} placeholder="+2, -1, New" />
      </label>

      <label>
        Leaderboard note
        <textarea value={form.note} onChange={(event) => updateForm("note", event.target.value)} placeholder="Add the rating note" />
      </label>

      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(form.isUser)} onChange={(event) => updateForm("isUser", event.target.checked)} />
        Set as boostable fallback user
      </label>

      <div className="form-actions">
        {candidate ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            <X size={16} />
            Cancel
          </button>
        ) : null}
        <button className="primary-button" type="submit" disabled={!canSave || saving}>
          {candidate ? <Check size={17} /> : <Plus size={17} />}
          {saving ? "Saving..." : candidate ? "Save rating" : "Add user"}
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
  boosted,
  canBoost
}: {
  candidate: RankedCandidate;
  onBoost: () => void;
  boosted: boolean;
  canBoost: boolean;
}) {
  return (
    <article className={`ranking-row ${canBoost ? "is-user" : ""}`}>
      <div className="rank-number">{candidate.rank}</div>
      <div className="candidate-copy">
        <div className="candidate-header">
          <h3>{candidate.name}</h3>
          {canBoost ? <span className="you-badge">You</span> : null}
          {candidate.delta ? <span className="movement">{candidate.delta}</span> : null}
        </div>
        {candidate.pickupLine ? <p>{candidate.pickupLine}</p> : null}
        <p>{candidate.note}</p>
        {canBoost ? (
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
              <button className={`boost-option ${selected ? "selected" : ""}`} key={boost.id} onClick={() => onSelect(boost)}>
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

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

function rankCandidates(candidates: Candidate[]): RankedCandidate[] {
  return [...candidates]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function clampScore(score: number) {
  if (Number.isNaN(score)) {
    return 0;
  }
  return Math.min(80, Math.max(0, Math.round(score)));
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
