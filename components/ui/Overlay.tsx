"use client";

import { useEffect, useMemo, useState } from "react";
import { ROCKETS, ROCKET_BY_ID, formatDate, onThisDay, type RocketId } from "@/lib/rockets";
import { useAtlas } from "@/lib/store";

const Arrow = ({ dir = "right" }: { dir?: "right" | "left" }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ transform: dir === "left" ? "scaleX(-1)" : undefined }}>
    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ============================== HEADER ============================== */
export function Header() {
  const view = useAtlas((s) => s.view);
  const setView = useAtlas((s) => s.setView);
  const select = useAtlas((s) => s.select);
  const chatOpen = useAtlas((s) => s.chatOpen);
  const setChatOpen = useAtlas((s) => s.setChatOpen);
  const launching = useAtlas((s) => s.launch.status !== "idle");
  const [mode, setMode] = useState<"openai" | "offline" | null>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setMode(d.mode))
      .catch(() => setMode("offline"));
  }, []);

  const nav: [typeof view, string][] = [
    ["collection", "The collection"],
    ["compare", "Compare rockets"],
    ["about", "About the exhibit"],
  ];

  return (
    <header className={`header ${launching ? "is-muted" : ""}`}>
      <button
        className="brand"
        onClick={() => {
          select(null);
          setView("collection");
        }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
          <circle cx="13" cy="13" r="11.5" stroke="currentColor" strokeOpacity="0.55" />
          <ellipse cx="13" cy="13" rx="11.5" ry="4.2" transform="rotate(-32 13 13)" stroke="var(--accent)" />
          <circle cx="21.6" cy="7.6" r="1.6" fill="var(--accent)" />
        </svg>
        <span>
          <strong>Rocket Atlas</strong>
          <small>An interactive exhibit</small>
        </span>
      </button>
      <nav className="nav">
        {nav.map(([v, label]) => (
          <button key={v} className={view === v ? "is-active" : ""} onClick={() => setView(v)} disabled={launching}>
            {label}
          </button>
        ))}
      </nav>
      <button className={`guide-status ${chatOpen ? "is-open" : ""}`} onClick={() => setChatOpen(!chatOpen)}>
        <i className={mode === "openai" ? "live" : ""} />
        Atlas guide
        <span>{mode === "openai" ? "Live" : mode === "offline" ? "Archive" : "…"}</span>
      </button>
    </header>
  );
}

/* =============================== HERO =============================== */
export function Hero() {
  const select = useAtlas((s) => s.select);
  const selected = useAtlas((s) => s.selected);
  const view = useAtlas((s) => s.view);
  const launching = useAtlas((s) => s.launch.status !== "idle");
  const today = useMemo(() => onThisDay(), []);
  const visible = !selected && view === "collection" && !launching;

  return (
    <section className={`hero panel-left ${visible ? "is-in" : ""}`} aria-hidden={!visible}>
      <p className="eyebrow">
        <span className="rule" /> The pioneers of human spaceflight
      </p>
      <h1>
        Small steps.
        <br />
        Giant <em>leaps.</em>
      </h1>
      <p className="lede">
        Three rockets, shown at true scale, that took America from a fifteen-minute hop above the atmosphere to the
        surface of the Moon — in just eight years.
      </p>
      <button className="cta" onClick={() => select("mercury-redstone")}>
        Explore the collection <Arrow />
      </button>
      <ul className="hint mono">
        <li>Drag to orbit</li>
        <li>Scroll to zoom</li>
        <li>Click a rocket</li>
      </ul>
      {today && (
        <button className="on-this-day" onClick={() => select(today.rocket.id)}>
          <span className="mono">On this day · {today.year}</span>
          {today.milestone.title}
          <small>{today.milestone.detail}</small>
        </button>
      )}
    </section>
  );
}

/* ============================ DETAIL PANEL ============================ */
export function DetailPanel() {
  const selected = useAtlas((s) => s.selected);
  const [last, setLast] = useState<RocketId>("saturn-v");
  const [tab, setTab] = useState<"story" | "milestones" | "specs">("story");
  const select = useAtlas((s) => s.select);
  const startLaunch = useAtlas((s) => s.startLaunch);
  const askAtlas = useAtlas((s) => s.askAtlas);
  const launching = useAtlas((s) => s.launch.status !== "idle");

  useEffect(() => {
    if (selected) setLast(selected);
  }, [selected]);
  useEffect(() => setTab("story"), [selected]);

  const r = ROCKET_BY_ID[selected ?? last];
  const i = ROCKETS.findIndex((x) => x.id === r.id);
  const visible = !!selected && !launching;
  const go = (d: number) => select(ROCKETS[(i + d + ROCKETS.length) % ROCKETS.length].id);

  return (
    <section className={`detail panel-left ${visible ? "is-in" : ""}`} aria-hidden={!visible} key={r.id}>
      <button className="back" onClick={() => select(null)}>
        <Arrow dir="left" /> Back to collection
      </button>
      <div className="detail-top">
        <p className="eyebrow">
          <span className="rule" /> {r.programme} · {r.era}
        </p>
        <div className="pager mono">
          <button onClick={() => go(-1)} aria-label="Previous rocket">
            ‹
          </button>
          {r.index} / 03
          <button onClick={() => go(1)} aria-label="Next rocket">
            ›
          </button>
        </div>
      </div>
      <h2>{r.name}</h2>
      <p className="tagline">{r.tagline}</p>

      <dl className="stats">
        <div>
          <dt>Height</dt>
          <dd>
            {r.heightM}
            <small>m</small>
          </dd>
        </div>
        <div>
          <dt>Stages</dt>
          <dd>{r.stages}</dd>
        </div>
        <div>
          <dt>Crew</dt>
          <dd>{r.crew}</dd>
        </div>
      </dl>

      <div className="tabs" role="tablist">
        {(
          [
            ["story", "The story"],
            ["milestones", "Milestones"],
            ["specs", "Specs"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === "story" && (
          <div className="fade-in">
            <p>{r.story}</p>
            <p className="why">
              <span className="mono">Why it matters</span>
              {r.whyItMatters}
            </p>
          </div>
        )}
        {tab === "milestones" && (
          <ol className="timeline fade-in">
            {r.milestones.map((m) => (
              <li key={m.date}>
                <time className="mono">{formatDate(m.date)}</time>
                <strong>{m.title}</strong>
                <span>{m.detail}</span>
              </li>
            ))}
          </ol>
        )}
        {tab === "specs" && (
          <dl className="specs fade-in">
            <div>
              <dt>Diameter</dt>
              <dd>{r.diameterM} m</dd>
            </div>
            <div>
              <dt>Liftoff mass</dt>
              <dd>≈ {r.massT.toLocaleString("en-GB")} t</dd>
            </div>
            <div>
              <dt>Liftoff thrust</dt>
              <dd>{r.thrustLabel}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{r.destination}</dd>
            </div>
            <div className="wide">
              <dt>Engines</dt>
              <dd>{r.engines}</dd>
            </div>
            <div className="wide">
              <dt>Propellants</dt>
              <dd>{r.propellants}</dd>
            </div>
            <div className="wide">
              <dt>Flights</dt>
              <dd>{r.flights}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="actions">
        <button className="cta solid" onClick={() => startLaunch(r.id)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 1c2 1.6 3 3.8 3 6.4L8.6 10H5.4L4 7.4C4 4.8 5 2.6 7 1Z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5.6 11.2 7 13l1.4-1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          Simulate launch
        </button>
        <button className="cta ghost" onClick={() => askAtlas(`Tell me the story of the ${r.name}.`)}>
          Ask Atlas about {r.shortName}
        </button>
      </div>
    </section>
  );
}

/* ============================ COMPARE PANEL ============================ */
type Metric = "height" | "thrust" | "mass" | "crew";
export function ComparePanel() {
  const view = useAtlas((s) => s.view);
  const select = useAtlas((s) => s.select);
  const [metric, setMetric] = useState<Metric>("height");
  const visible = view === "compare";
  const value = (id: RocketId) => {
    const r = ROCKET_BY_ID[id];
    return metric === "height" ? r.heightM : metric === "thrust" ? r.liftoffThrustKN : metric === "mass" ? r.massT : r.crew;
  };
  const unit = metric === "height" ? "m" : metric === "thrust" ? "kN" : metric === "mass" ? "t" : "crew";
  const max = Math.max(...ROCKETS.map((r) => value(r.id)));
  const ratio = Math.round(value("saturn-v") / value("mercury-redstone"));
  const notes: Record<Metric, string> = {
    height: `Saturn V stands ${(110.6 / 25.4).toFixed(1)}× taller than Mercury-Redstone.`,
    thrust: `Liftoff thrust grew about ${ratio}× in six years.`,
    mass: `A fuelled Saturn V weighed about ${ratio}× as much as Mercury-Redstone.`,
    crew: "One seat, then two, then three — each step a harder destination.",
  };

  return (
    <section className={`compare panel-left ${visible ? "is-in" : ""}`} aria-hidden={!visible}>
      <p className="eyebrow">
        <span className="rule" /> Side by side
      </p>
      <h2>Compare rockets</h2>
      <p className="lede small">Every rocket on the platform is modelled at true relative scale. The ruler marks real height in metres.</p>
      <div className="seg" role="tablist">
        {(["height", "thrust", "mass", "crew"] as Metric[]).map((m) => (
          <button key={m} className={metric === m ? "is-active" : ""} onClick={() => setMetric(m)}>
            {m === "thrust" ? "Thrust" : m === "mass" ? "Mass" : m === "crew" ? "Crew" : "Height"}
          </button>
        ))}
      </div>
      <ul className="bars">
        {ROCKETS.map((r) => {
          const v = value(r.id);
          return (
            <li key={r.id} onClick={() => select(r.id)}>
              <div className="bar-head">
                <span>{r.name}</span>
                <span className="mono">
                  {v.toLocaleString("en-GB")} {unit}
                </span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.max((v / max) * 100, 1.5)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="note mono">{notes[metric]}</p>
    </section>
  );
}

/* ============================= ABOUT PANEL ============================= */
export function AboutPanel() {
  const view = useAtlas((s) => s.view);
  const setView = useAtlas((s) => s.setView);
  const visible = view === "about";
  return (
    <section className={`about panel-left ${visible ? "is-in" : ""}`} aria-hidden={!visible}>
      <p className="eyebrow">
        <span className="rule" /> About the exhibit
      </p>
      <h2>Eight years, three rockets.</h2>
      <p className="lede small">
        Rocket Atlas is an interactive 3D museum of the launch vehicles that carried America&apos;s first astronauts — from
        Alan Shepard&apos;s suborbital flight in 1961 to Apollo 11 in 1969. Each model is built procedurally at true scale,
        so the jump from Redstone to Saturn V is felt, not just read.
      </p>
      <ol className="how">
        <li>
          <span className="mono">01</span>
          <div>
            <strong>Explore the scene</strong>Drag to orbit and scroll to zoom around the platform.
          </div>
        </li>
        <li>
          <span className="mono">02</span>
          <div>
            <strong>Focus a rocket</strong>Click any rocket to bring it forward and read its history.
          </div>
        </li>
        <li>
          <span className="mono">03</span>
          <div>
            <strong>Simulate a launch</strong>A simplified liftoff driven by each rocket&apos;s real thrust and mass.
          </div>
        </li>
        <li>
          <span className="mono">04</span>
          <div>
            <strong>Ask Atlas</strong>An AI guide that knows the exhibit, its history and which rocket you&apos;re viewing.
          </div>
        </li>
      </ol>
      <p className="stack mono">Next.js · Three.js · React Three Fiber · OpenAI</p>
      <button className="cta" onClick={() => setView("collection")}>
        Enter the collection <span aria-hidden>→</span>
      </button>
    </section>
  );
}

/* ============================== RAIL ============================== */
export function RocketRail() {
  const selected = useAtlas((s) => s.selected);
  const hovered = useAtlas((s) => s.hovered);
  const select = useAtlas((s) => s.select);
  const hover = useAtlas((s) => s.hover);
  const launching = useAtlas((s) => s.launch.status !== "idle");
  return (
    <footer className={`rail ${launching ? "is-hidden" : ""}`}>
      {ROCKETS.map((r) => (
        <button
          key={r.id}
          className={`rail-card ${selected === r.id ? "is-active" : ""} ${hovered === r.id ? "is-hot" : ""}`}
          onClick={() => select(selected === r.id ? null : r.id)}
          onMouseEnter={() => hover(r.id)}
          onMouseLeave={() => hover(null)}
        >
          <span className="scale" aria-hidden>
            <i style={{ height: `${(r.heightM / 110.6) * 100}%` }} />
          </span>
          <span className="rail-text">
            <span className="mono">{r.index}</span>
            <strong>{r.name}</strong>
            <small>
              {r.programme} · {r.heightM} m
            </small>
          </span>
        </button>
      ))}
      <div className="rail-legend mono">
        <span>True relative scale</span>
        <span>1961 → 1969</span>
      </div>
    </footer>
  );
}

/* ============================= LAUNCH HUD ============================= */
const fmtT = (t: number) => {
  const sign = t < 0 ? "T−" : "T+";
  const a = Math.abs(t);
  const m = Math.floor(a / 60);
  const s = (a % 60).toFixed(1).padStart(4, "0");
  return `${sign}${String(m).padStart(2, "0")}:${s}`;
};

export function LaunchHUD() {
  const launch = useAtlas((s) => s.launch);
  const tel = useAtlas((s) => s.telemetry);
  const reset = useAtlas((s) => s.resetLaunch);
  if (launch.status === "idle" || !launch.id) return null;
  const r = ROCKET_BY_ID[launch.id];
  const count = launch.status === "countdown" ? Math.ceil(-tel.t) : null;
  const alt = tel.altitude >= 1000 ? `${(tel.altitude / 1000).toFixed(2)} km` : `${tel.altitude.toFixed(0)} m`;

  return (
    <>
      <div className="hud">
        <div className="hud-title">
          <span className="mono">{launch.status === "countdown" ? "Countdown" : launch.status === "flight" ? "Liftoff" : "Flight complete"}</span>
          <strong>{r.name}</strong>
        </div>
        <div className="hud-grid">
          <div>
            <span className="mono">Mission time</span>
            <b>{fmtT(tel.t)}</b>
          </div>
          <div>
            <span className="mono">Altitude</span>
            <b>{alt}</b>
          </div>
          <div>
            <span className="mono">Velocity</span>
            <b>
              {tel.velocity.toFixed(0)} <small>m/s</small>
            </b>
          </div>
          <div>
            <span className="mono">Net accel.</span>
            <b>
              {tel.accelG.toFixed(2)} <small>g</small>
            </b>
          </div>
          <div>
            <span className="mono">Mass</span>
            <b>
              {tel.massT.toLocaleString("en-GB", { maximumFractionDigits: 0 })} <small>t</small>
            </b>
          </div>
          <div>
            <span className="mono">Thrust</span>
            <b>{r.thrustLabel}</b>
          </div>
        </div>
        <p className="hud-note mono">Simplified model · real liftoff thrust &amp; mass · no drag · 2.5× speed</p>
        <button className="cta solid" onClick={reset}>
          {launch.status === "done" ? "Return to pad" : "Abort & return to pad"}
        </button>
      </div>
      {count !== null && count > 0 && (
        <div className="countdown" key={count}>
          {count}
        </div>
      )}
      {launch.status === "flight" && tel.t < 3 && <div className="countdown liftoff">Liftoff</div>}
    </>
  );
}
