import React from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Heart,
  ListFilter,
  Medal,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  X
} from "lucide-react";
import "./styles.css";

type Tier = "S-Tier" | "A-Tier" | "B-Tier" | "C-Tier";

type Candidate = {
  rank: number;
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

const candidates: Candidate[] = [
  {
    rank: 1,
    name: "Tyrone",
    tier: "S-Tier",
    score: 79,
    note: "Remembers every detail you mention and still shows up 10 minutes early.",
    delta: "+4"
  },
  {
    rank: 2,
    name: "Dante",
    tier: "S-Tier",
    score: 76,
    note: "Main-character energy, replies in under 3 minutes, and has a 5-year plan.",
    delta: "+2"
  },
  {
    rank: 3,
    name: "Isaac",
    tier: "S-Tier",
    score: 72,
    note: "Asked one thoughtful question and accidentally cleared the field.",
    delta: "New"
  },
  {
    rank: 4,
    name: "Hector",
    tier: "A-Tier",
    score: 68,
    note: "Brings flowers without making it a personality reveal.",
    delta: "+1"
  },
  {
    rank: 5,
    name: "Jordan",
    tier: "A-Tier",
    score: 64,
    note: "Great dinner pick. Suspiciously vague about his weekday schedule.",
    delta: "-1"
  },
  {
    rank: 6,
    name: "Andre",
    tier: "A-Tier",
    score: 61,
    note: "Sent a voice note that was somehow charming and under 20 seconds.",
    delta: "+3"
  },
  {
    rank: 7,
    name: "Marcus",
    tier: "A-Tier",
    score: 58,
    note: "Reliable, kind, and still recovering from the group chat audit.",
    delta: "-2"
  },
  {
    rank: 8,
    name: "Caleb",
    tier: "B-Tier",
    score: 54,
    note: "Has potential if the phrase 'let's play it by ear' is retired.",
    delta: "+1"
  },
  {
    rank: 9,
    name: "Nate",
    tier: "B-Tier",
    score: 51,
    note: "Good vibes, solid intentions, still working on the follow-through.",
    delta: "-1"
  },
  {
    rank: 10,
    name: "Miles",
    tier: "B-Tier",
    score: 48,
    note: "Sweet and spontaneous - just needs to answer texts before 11 PM.",
    delta: "+2"
  },
  {
    rank: 11,
    name: "Cole",
    tier: "B-Tier",
    score: 46,
    note: "Looks great on paper. The paper is a parking ticket.",
    delta: "-3"
  },
  {
    rank: 12,
    name: "Jalen",
    tier: "B-Tier",
    score: 45,
    note: "Nice guy. Took 48 hours to confirm dinner plans.",
    delta: "0"
  },
  {
    rank: 13,
    name: "You",
    tier: "B-Tier",
    score: 44,
    note: "You have potential - real potential - but 'I'm bad at texting' is not a personality trait.",
    delta: "You",
    isUser: true
  },
  {
    rank: 14,
    name: "Trey",
    tier: "C-Tier",
    score: 38,
    note: "Keeps cancelling plans because of a 'work thing.' That thing is a PS5.",
    delta: "-4"
  },
  {
    rank: 15,
    name: "Kendrick",
    tier: "C-Tier",
    score: 34,
    note: "Emotionally available once a month, around the new moon, if conditions are right.",
    delta: "-1"
  }
];

const boosts: Boost[] = [
  { id: "nudge", name: "Nudge", spots: 1, price: 2.99 },
  { id: "push", name: "Push", spots: 3, price: 6.99 },
  { id: "launch", name: "Launch", spots: 5, price: 12.99 }
];

function App() {
  const [boostOpen, setBoostOpen] = React.useState(false);
  const [selectedBoost, setSelectedBoost] = React.useState<Boost>(boosts[1]);
  const [boosted, setBoosted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [tier, setTier] = React.useState<"All" | Tier>("All");

  const user = candidates.find((candidate) => candidate.isUser)!;
  const boostedRank = Math.max(1, user.rank - selectedBoost.spots);
  const visibleCandidates = candidates.filter((candidate) => {
    const matchesQuery = [candidate.name, candidate.note, candidate.tier]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesTier = tier === "All" || candidate.tier === tier;
    return matchesQuery && matchesTier;
  });

  function handleContinue() {
    setBoosted(true);
    setBoostOpen(false);
  }

  function handleReset() {
    setBoosted(false);
    setSelectedBoost(boosts[1]);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="page-title">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">
            <Heart size={18} fill="currentColor" />
          </div>
          <nav className="header-actions" aria-label="Primary">
            <button className="icon-button" aria-label="Filter rankings">
              <ListFilter size={18} />
            </button>
            <button className="icon-button" aria-label="View trophies">
              <Trophy size={18} />
            </button>
          </nav>
        </header>

        <div className="title-block">
          <p>The Official Rankings</p>
          <h1 id="page-title">Dating Leaderboard</h1>
          <span>Where everyone stands. Scroll to see all rankings.</span>
        </div>

        <Podium />
      </section>

      <section className="control-strip" aria-label="Ranking controls">
        <label className="search-box">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contenders"
          />
        </label>
        <select
          aria-label="Filter by tier"
          value={tier}
          onChange={(event) => setTier(event.target.value as "All" | Tier)}
        >
          <option>All</option>
          <option>S-Tier</option>
          <option>A-Tier</option>
          <option>B-Tier</option>
          <option>C-Tier</option>
        </select>
      </section>

      {boosted ? (
        <section className="boost-result" aria-live="polite">
          <div>
            <Sparkles size={18} />
            <span>Rank boosted to #{boostedRank}</span>
          </div>
          <button onClick={handleReset}>
            <RotateCcw size={16} />
            Reset
          </button>
        </section>
      ) : null}

      <section className="rankings" aria-labelledby="rankings-title">
        <div className="section-heading">
          <h2 id="rankings-title">Full Rankings</h2>
          <span>{visibleCandidates.length} contenders</span>
        </div>

        <div className="ranking-list">
          {visibleCandidates.map((candidate) => (
            <RankingRow
              key={candidate.name}
              candidate={
                boosted && candidate.isUser
                  ? { ...candidate, rank: boostedRank, score: Math.min(80, candidate.score + selectedBoost.spots * 4) }
                  : candidate
              }
              onBoost={() => setBoostOpen(true)}
              boosted={boosted}
            />
          ))}
        </div>
      </section>

      {boostOpen ? (
        <BoostSheet
          boosts={boosts}
          selectedBoost={selectedBoost}
          userRank={user.rank}
          onSelect={setSelectedBoost}
          onClose={() => setBoostOpen(false)}
          onContinue={handleContinue}
        />
      ) : null}

      <footer className="bottom-nav" aria-label="App navigation">
        <button aria-label="Rankings" className="active">
          <Trophy size={20} />
        </button>
        <button aria-label="Boosts">
          <BadgeDollarSign size={20} />
        </button>
        <button aria-label="Matches">
          <Heart size={20} />
        </button>
      </footer>
    </main>
  );
}

function Podium() {
  const podium = [candidates[1], candidates[0], candidates[2]];

  return (
    <div className="podium" aria-label="Top three rankings">
      {podium.map((candidate) => (
        <article className={`podium-card rank-${candidate.rank}`} key={candidate.name}>
          <Medal size={18} aria-hidden="true" />
          <strong>#{candidate.rank}</strong>
          <h2>{candidate.name}</h2>
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
  candidate: Candidate;
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
            <small>{boosted ? `now #${candidate.rank}` : "from #13"}</small>
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
  onSelect,
  onClose,
  onContinue
}: {
  boosts: Boost[];
  selectedBoost: Boost;
  userRank: number;
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
        <button className="continue-button" onClick={onContinue}>
          Continue - ${selectedBoost.price.toFixed(2)}
        </button>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
