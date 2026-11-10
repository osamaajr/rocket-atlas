export type RocketId = "mercury-redstone" | "gemini-titan" | "saturn-v";

export interface Milestone {
  date: string; // ISO yyyy-mm-dd
  title: string;
  detail: string;
}

export interface Rocket {
  id: RocketId;
  index: string;
  name: string;
  shortName: string;
  programme: string;
  tagline: string;
  era: string;
  destination: string;
  heightM: number;
  diameterM: number;
  massT: number;
  stages: number;
  crew: number;
  liftoffThrustKN: number;
  thrustLabel: string;
  massFlowKgS: number; // first-stage propellant flow, used by the launch simulator
  engines: string;
  propellants: string;
  flights: string;
  builders: string;
  payload: string;
  story: string;
  whyItMatters: string;
  milestones: Milestone[];
  funFacts: string[];
}

export const ROCKETS: Rocket[] = [
  {
    id: "mercury-redstone",
    index: "01",
    name: "Mercury-Redstone",
    shortName: "Redstone",
    programme: "Project Mercury",
    tagline: "America's first step.",
    era: "1960 – 1961",
    destination: "Suborbital",
    heightM: 25.4,
    diameterM: 1.78,
    massT: 30,
    stages: 1,
    crew: 1,
    liftoffThrustKN: 350,
    thrustLabel: "350 kN",
    massFlowKgS: 166,
    engines: "One Rocketdyne A-7 engine (about 350 kN / 78,000 lbf of thrust).",
    propellants: "Ethyl alcohol (75% ethanol, 25% water) and liquid oxygen.",
    flights:
      "6 launches between November 1960 and July 1961, including two crewed suborbital flights.",
    builders:
      "Derived from the US Army's Redstone missile, developed by Wernher von Braun's team at the Army Ballistic Missile Agency in Huntsville. Boosters built by Chrysler; Mercury capsule built by McDonnell Aircraft.",
    payload:
      "A single Mercury capsule (roughly 1.3 t). It was not powerful enough to reach orbit — orbital Mercury flights used the larger Atlas rocket.",
    story:
      "A modified Army missile given one job: carry an American into space and bring him home. On 5 May 1961 it lofted Alan Shepard in Freedom 7 to an altitude of about 187 km on a 15-minute suborbital arc — America's first human spaceflight, just three weeks after Yuri Gagarin's orbital flight.",
    whyItMatters:
      "It proved that a human could survive launch, weightlessness and re-entry, and that a pilot could control a spacecraft. Twenty days after Shepard's flight, President Kennedy committed the US to landing on the Moon.",
    milestones: [
      {
        date: "1960-11-21",
        title: "MR-1 — the four-inch flight",
        detail:
          "The first uncrewed launch shut down at ignition; the rocket rose about 10 cm and settled back on the pad.",
      },
      {
        date: "1961-01-31",
        title: "MR-2 — Ham the chimpanzee",
        detail: "Ham flew a 16-minute suborbital flight and was recovered safely.",
      },
      {
        date: "1961-05-05",
        title: "MR-3 — Freedom 7",
        detail:
          "Alan Shepard became the first American in space: 15 min 22 s, apogee about 187 km.",
      },
      {
        date: "1961-07-21",
        title: "MR-4 — Liberty Bell 7",
        detail:
          "Gus Grissom's flight succeeded, but the hatch blew after splashdown and the capsule sank. It was recovered from the Atlantic in 1999.",
      },
    ],
    funFacts: [
      "Freedom 7 flew for just 15 minutes and 22 seconds.",
      "The red tower on top is a launch escape system — a small rocket that could pull the capsule away from a failing booster.",
      "Shepard later walked on the Moon as commander of Apollo 14 in 1971.",
    ],
  },
  {
    id: "gemini-titan",
    index: "02",
    name: "Gemini-Titan II",
    shortName: "Titan II",
    programme: "Project Gemini",
    tagline: "The bridge to the Moon.",
    era: "1964 – 1966",
    destination: "Earth orbit",
    heightM: 33.2,
    diameterM: 3.05,
    massT: 154,
    stages: 2,
    crew: 2,
    liftoffThrustKN: 1913,
    thrustLabel: "1,913 kN",
    massFlowKgS: 756,
    engines:
      "First stage: Aerojet LR87 with two combustion chambers (about 1,913 kN / 430,000 lbf). Second stage: Aerojet LR91 (about 445 kN / 100,000 lbf).",
    propellants:
      "Aerozine 50 and nitrogen tetroxide — hypergolic propellants that ignite on contact, with no igniter needed.",
    flights: "12 launches between April 1964 and November 1966; 10 carried two-person crews.",
    builders:
      "Adapted from the Titan II intercontinental ballistic missile by the Martin Company, with Aerojet engines. Gemini spacecraft built by McDonnell Aircraft.",
    payload: "One two-seat Gemini spacecraft (roughly 3.8 t) to low Earth orbit.",
    story:
      "Between Mercury and Apollo sat a gap in knowledge: could astronauts live in space for two weeks, work outside their craft, and find and dock with another vehicle? Gemini answered every question. Its Titan II booster — a converted ICBM, made safer for crews with backup systems and a malfunction detection system — flew twelve times without losing a crew.",
    whyItMatters:
      "Rendezvous, docking and spacewalking were all essential for the Apollo lunar landing plan. Gemini rehearsed every one of them in Earth orbit.",
    milestones: [
      {
        date: "1964-04-08",
        title: "Gemini 1",
        detail: "First uncrewed test flight of the Gemini-Titan II.",
      },
      {
        date: "1965-06-03",
        title: "Gemini 4 — first American spacewalk",
        detail: "Ed White floated outside the spacecraft for about 23 minutes.",
      },
      {
        date: "1965-12-15",
        title: "Gemini 6A & 7 — first crewed rendezvous",
        detail:
          "Two spacecraft flew within about 30 cm of each other. Gemini 7 stayed up for nearly 14 days.",
      },
      {
        date: "1966-03-16",
        title: "Gemini 8 — first docking",
        detail:
          "Neil Armstrong and David Scott docked with an Agena target, then recovered from a dangerous stuck thruster.",
      },
      {
        date: "1966-11-11",
        title: "Gemini 12 — the finale",
        detail: "Jim Lovell and Buzz Aldrin closed the programme; Aldrin's spacewalks perfected EVA techniques.",
      },
    ],
    funFacts: [
      "Gemini had no escape tower — the crew had ejection seats instead.",
      "Its propellants are hypergolic: they ignite the moment they touch.",
      "Gemini 7's crew spent almost 14 days in a cabin about the size of a car's front seat.",
    ],
  },
  {
    id: "saturn-v",
    index: "03",
    name: "Saturn V",
    shortName: "Saturn V",
    programme: "Apollo programme",
    tagline: "Built for another world.",
    era: "1967 – 1973",
    destination: "Earth → Moon",
    heightM: 110.6,
    diameterM: 10.1,
    massT: 2970,
    stages: 3,
    crew: 3,
    liftoffThrustKN: 35100,
    thrustLabel: "35,100 kN",
    massFlowKgS: 13600,
    engines:
      "First stage (S-IC): five Rocketdyne F-1 engines, about 35,100 kN / 7.9 million lbf at liftoff. Second stage (S-II): five J-2 engines. Third stage (S-IVB): one restartable J-2.",
    propellants:
      "First stage: RP-1 (refined kerosene) and liquid oxygen. Second and third stages: liquid hydrogen and liquid oxygen.",
    flights:
      "13 launches between November 1967 and May 1973 — nine crewed lunar missions and the launch of the Skylab space station.",
    builders:
      "Led by NASA's Marshall Space Flight Center under Wernher von Braun. Boeing built the S-IC, North American Aviation the S-II, Douglas Aircraft the S-IVB and IBM the Instrument Unit; Rocketdyne built the F-1 and J-2 engines.",
    payload: "About 140 t to low Earth orbit, or about 43.5 t on a trajectory to the Moon.",
    story:
      "Developed for Apollo, Saturn V combined three powerful stages to send astronauts beyond Earth orbit. Five F-1 engines lifted the fully fuelled vehicle; upper stages burning liquid hydrogen carried the spacecraft onward. Apollo 11 began its journey aboard a Saturn V on 16 July 1969.",
    whyItMatters:
      "It remains the only launch vehicle to carry humans beyond low Earth orbit. Twenty-four people flew to the Moon on Saturn Vs, and twelve of them walked on its surface.",
    milestones: [
      {
        date: "1967-11-09",
        title: "Apollo 4 — first flight",
        detail: "An uncrewed 'all-up' test of all three stages at once. It worked first time.",
      },
      {
        date: "1968-12-21",
        title: "Apollo 8 — leaving Earth",
        detail:
          "Borman, Lovell and Anders became the first humans to leave Earth orbit and circle the Moon.",
      },
      {
        date: "1969-07-16",
        title: "Apollo 11 — to the surface",
        detail:
          "Armstrong, Aldrin and Collins launched; four days later Armstrong and Aldrin landed in the Sea of Tranquility.",
      },
      {
        date: "1972-12-07",
        title: "Apollo 17 — the last Moon mission",
        detail: "The only Saturn V launched at night, carrying the last crew to walk on the Moon.",
      },
      {
        date: "1973-05-14",
        title: "Skylab — final flight",
        detail: "A two-stage Saturn V placed America's first space station in orbit.",
      },
    ],
    funFacts: [
      "At liftoff it burned roughly 13 tonnes of propellant every second.",
      "It is about 18 m taller than the Statue of Liberty including her pedestal.",
      "Every Saturn V delivered its payload; Apollo 6 had engine problems but still reached orbit.",
    ],
  },
];

export const ROCKET_BY_ID: Record<RocketId, Rocket> = Object.fromEntries(
  ROCKETS.map((r) => [r.id, r]),
) as Record<RocketId, Rocket>;

export const APP_PURPOSE = `Rocket Atlas is an interactive 3D museum exhibit built with Next.js and Three.js. It places three historic American crewed launch vehicles side by side at true relative scale on a platform in space: Mercury-Redstone (Project Mercury), Gemini-Titan II (Project Gemini) and Saturn V (Apollo). Together they trace the eight years from America's first 15-minute suborbital hop in 1961 to humans walking on the Moon in 1969. Visitors can orbit the scene, click a rocket to focus on it and read its history, compare the rockets, run a simplified launch simulation, and ask Atlas — the AI guide — questions.`;

export function onThisDay(today = new Date()) {
  const mmdd = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  for (const r of ROCKETS) {
    for (const m of r.milestones) {
      if (m.date.slice(5) === mmdd) return { rocket: r, milestone: m, year: m.date.slice(0, 4) };
    }
  }
  return null;
}

export function formatDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
