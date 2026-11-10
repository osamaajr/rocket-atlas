# Rocket Atlas

An interactive 3D rocket exhibit built with **Next.js** and **Three.js** (via React Three Fiber).

Three crewed launch vehicles stand side by side at true relative scale on a platform in space —
**Mercury-Redstone**, **Gemini-Titan II** and **Saturn V** — with an AI guide, **Atlas**, that knows
the exhibit, the rockets' history and which rocket you're looking at.

## One-step setup (macOS)

```bash
bash setup.sh
```

Pushes the project to a new `rocket-atlas` repo on your GitHub (signing you in to the GitHub CLI if needed), installs dependencies and opens http://localhost:3000.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Connect the AI guide

Atlas works out of the box in **archive mode** (answers from the exhibit's verified data).
For full conversational answers, add an OpenAI key — either:

- create `.env.local` with `OPENAI_API_KEY=sk-...` (see `.env.local.example`), or
- drop your `openai.txt` (containing the key) into the project root.

Restart `npm run dev` afterwards. The key is read only on the server (`app/api/chat/route.ts`) and is
git-ignored. The header badge switches from **Archive** to **Live** when a key is detected.

## Features

- Procedurally modelled rockets at real scale (110.6 m / 33.2 m / 25.4 m) with painted liveries,
  fins, engine bells and escape towers — no external model files.
- Starfield, Moon, glowing platform, bloom and vignette post-processing.
- Click (or use ← →) to focus a rocket; click empty space or press Esc to return.
- Story, milestones and specs for each rocket; "On this day" when a milestone anniversary matches today.
- Compare view with a 3D height ruler and a person for scale.
- Launch simulator driven by each rocket's real liftoff thrust, mass and propellant flow.
- Atlas chat: context chips (app purpose, rocket history, selected rocket), contextual suggestions,
  streamed answers, and a conversation that persists across selections and reloads.

## Deploy

Push to GitHub and import into Vercel; add `OPENAI_API_KEY` as an environment variable.
