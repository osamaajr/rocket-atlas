import { APP_PURPOSE, ROCKETS, ROCKET_BY_ID, formatDate, type Rocket, type RocketId } from "./rockets";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function rocketDossier(r: Rocket) {
  return [
    `### ${r.name} (${r.programme}, ${r.era})`,
    `Tagline: ${r.tagline}`,
    `Height ${r.heightM} m · diameter ${r.diameterM} m · liftoff mass ≈ ${r.massT.toLocaleString("en-GB")} t · ${r.stages} stage(s) · crew ${r.crew} · liftoff thrust ${r.thrustLabel} · destination: ${r.destination}`,
    `Engines: ${r.engines}`,
    `Propellants: ${r.propellants}`,
    `Flights: ${r.flights}`,
    `Builders: ${r.builders}`,
    `Payload: ${r.payload}`,
    `Story: ${r.story}`,
    `Why it matters: ${r.whyItMatters}`,
    `Milestones:\n${r.milestones.map((m) => `- ${formatDate(m.date)}: ${m.title} — ${m.detail}`).join("\n")}`,
    `Facts: ${r.funFacts.join(" ")}`,
  ].join("\n");
}

export function buildSystemPrompt(selectedId: RocketId | null) {
  const selected = selectedId ? ROCKET_BY_ID[selectedId] : null;
  return `You are Atlas, the museum guide inside "Rocket Atlas", an interactive 3D rocket exhibit.

## What this app is
${APP_PURPOSE}

## Exhibit archive (verified reference data — prefer these figures)
${ROCKETS.map(rocketDossier).join("\n\n")}

## Current visitor context
${
  selected
    ? `The visitor has selected and is looking at the ${selected.name}. Unless they clearly ask about something else, "it", "this rocket" or "this one" means the ${selected.name}.`
    : "No rocket is selected — the visitor is viewing all three rockets side by side."
}
The conversation persists as the visitor changes selection, so earlier messages may refer to a different rocket.

## How to answer
- Be accurate. Use the archive's figures first. You may add well-established spaceflight history beyond it, but never invent numbers, dates or quotes; if you are not sure, say so briefly.
- Be warm, clear and concise, like a great museum guide: usually 2–5 short sentences, or a few bullet points for comparisons. Use **bold** sparingly for key figures.
- Use metric units first (imperial in brackets when helpful) and British English spelling.
- You can explain how to use the exhibit: drag to orbit, scroll to zoom, click a rocket to focus, "Compare" for side-by-side figures, and "Simulate launch" for a simplified liftoff.
- Stay on rockets, spaceflight and this exhibit. Politely steer unrelated questions back.`;
}

/* ---------------------------------------------------------------- *
 * Offline guide: answers from the archive when no API key is set.  *
 * ---------------------------------------------------------------- */

const NAME_PATTERNS: [RocketId, RegExp][] = [
  ["mercury-redstone", /mercury|redstone|shepard|freedom ?7|grissom|liberty bell|\bham\b|chimp|first (one|rocket)|smallest/i],
  ["gemini-titan", /gemini|titan|ed white|spacewalk|rendezvous|dock|agena|second (one|rocket)|middle/i],
  ["saturn-v", /saturn|apollo|moon|lunar|armstrong|aldrin|skylab|f-?1\b|biggest|largest|tallest|third (one|rocket)/i],
];

function mentioned(text: string): RocketId[] {
  return NAME_PATTERNS.filter(([, re]) => re.test(text)).map(([id]) => id);
}

const has = (t: string, re: RegExp) => re.test(t);

function compareTable(field: "height" | "thrust" | "mass" | "crew") {
  const lines = ROCKETS.map((r) => {
    switch (field) {
      case "height":
        return `- **${r.name}** — ${r.heightM} m tall, ${r.diameterM} m wide`;
      case "thrust":
        return `- **${r.name}** — ${r.thrustLabel} at liftoff`;
      case "mass":
        return `- **${r.name}** — about ${r.massT.toLocaleString("en-GB")} t fully fuelled`;
      case "crew":
        return `- **${r.name}** — ${r.crew} astronaut${r.crew > 1 ? "s" : ""}, ${r.destination.toLowerCase()}`;
    }
  });
  return lines.join("\n");
}

export function offlineAnswer(messages: ChatMessage[], selectedId: RocketId | null): string {
  const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const q = last.toLowerCase();
  let targets = mentioned(q);
  const wantsAll = has(q, /all three|each|every|these rockets|compare|comparison|differ|vs\.?|versus|which (one|rocket)|biggest|smallest|tallest|largest|most powerful|first|order/);

  if (has(q, /\b(this|the) (app|site|website|exhibit|page|project)\b|what is this|how (do|does) (i|this) (use|work)|what can (i|you) do|who are you|controls|navigate/)) {
    return `${APP_PURPOSE}\n\n**How to explore:** drag to orbit, scroll to zoom, click a rocket to focus on it, open **Compare** for figures side by side, or press **Simulate launch** on a focused rocket. I'm Atlas — ask me about any of the three.`;
  }

  if (targets.length === 0 && !wantsAll && selectedId) targets = [selectedId];

  // Comparisons across the collection
  if (targets.length !== 1 || wantsAll) {
    if (has(q, /tall|height|size|big|large|small|scale/))
      return `At true relative scale:\n${compareTable("height")}\n\nSaturn V stands more than **four times** taller than Mercury-Redstone — about 18 m taller than the Statue of Liberty on her pedestal.`;
    if (has(q, /thrust|power|strong|engine/))
      return `Liftoff thrust grew roughly a hundredfold in seven years:\n${compareTable("thrust")}\n\nSaturn V's five F-1 engines produced about **100 times** the thrust of Mercury-Redstone's single A-7.`;
    if (has(q, /mass|weigh|heavy/)) return `Fully fuelled at liftoff:\n${compareTable("mass")}`;
    if (has(q, /crew|astronaut|people|seat/)) return `${compareTable("crew")}\n\nOne seat, then two, then three — each programme added a crew member and a harder destination.`;
    if (has(q, /first|order|when|history|timeline/))
      return `In order:\n- **Mercury-Redstone** — Alan Shepard's Freedom 7, ${formatDate("1961-05-05")}: America's first human spaceflight.\n- **Gemini-Titan II** — first crewed flight (Gemini 3) on ${formatDate("1965-03-23")}; spacewalks, rendezvous and docking followed.\n- **Saturn V** — first flight ${formatDate("1967-11-09")}; Apollo 11 launched ${formatDate("1969-07-16")} and landed on the Moon four days later.`;
    if (targets.length === 0)
      return `This exhibit traces eight years of American human spaceflight:\n- **Mercury-Redstone** (1961) — one astronaut, a 15-minute suborbital hop.\n- **Gemini-Titan II** (1965–66) — two astronauts learning to rendezvous, dock and spacewalk in orbit.\n- **Saturn V** (1968–72) — three astronauts at a time, all the way to the Moon.\n\nClick a rocket, or ask me about its height, engines, missions or history.`;
  }

  const r = ROCKET_BY_ID[targets[0]];

  if (has(q, /tall|height|size|big|wide|diameter/))
    return `The **${r.name}** stands **${r.heightM} m** tall and **${r.diameterM} m** wide, weighing about **${r.massT.toLocaleString("en-GB")} t** fully fuelled.`;
  if (has(q, /thrust|power|strong|engine|f-?1|j-?2|a-?7|lr87/))
    return `${r.engines}\n\nThat gave it **${r.thrustLabel}** of thrust at liftoff, burning about ${r.massFlowKgS.toLocaleString("en-GB")} kg of propellant every second.`;
  if (has(q, /fuel|propellant|burn|kerosene|hydrogen|oxygen|hypergolic/)) return `**${r.name} propellants:** ${r.propellants}`;
  if (has(q, /stage/))
    return `The **${r.name}** had **${r.stages} stage${r.stages > 1 ? "s" : ""}**. ${r.engines}`;
  if (has(q, /crew|astronaut|who flew|people|pilot/)) {
    const crewed = r.milestones.filter((m) => /shepard|grissom|white|armstrong|lovell|aldrin|borman|crew|walk/i.test(m.title + m.detail));
    return `The **${r.name}** carried a crew of **${r.crew}**.${crewed.length ? "\n\n" + crewed.map((m) => `- **${m.title}** (${formatDate(m.date)}) — ${m.detail}`).join("\n") : ""}`;
  }
  if (has(q, /who (built|made|designed)|built by|design|manufactur|von braun|company/)) return r.builders;
  if (has(q, /payload|carry|lift|capacity|orbit/)) return `**Payload:** ${r.payload}`;
  if (has(q, /how many|flights|launches|missions|flew|record/))
    return `${r.flights}\n\nKey missions:\n${r.milestones.map((m) => `- **${m.title}** — ${formatDate(m.date)}`).join("\n")}`;
  if (has(q, /when|date|first|last|final|history|timeline|milestone/))
    return r.milestones.map((m) => `- **${formatDate(m.date)} · ${m.title}** — ${m.detail}`).join("\n");
  if (has(q, /why|important|matter|significan|legacy/)) return r.whyItMatters;
  if (has(q, /fun|fact|interesting|surpris|cool/)) return r.funFacts.map((f) => `- ${f}`).join("\n");

  return `**${r.name}** — ${r.tagline}\n\n${r.story}\n\nAsk me about its engines, missions, crew or why it mattered.`;
}
