import { create } from "zustand";
import type { RocketId } from "./rockets";

export type View = "collection" | "compare" | "about";
export type LaunchStatus = "idle" | "countdown" | "flight" | "done";

export interface Telemetry {
  t: number; // mission elapsed time (s), negative during countdown
  altitude: number; // m
  velocity: number; // m/s
  accelG: number; // g
  massT: number; // t
}

interface AtlasState {
  selected: RocketId | null;
  hovered: RocketId | null;
  view: View;
  chatOpen: boolean;
  launch: { status: LaunchStatus; id: RocketId | null; startedAt: number };
  telemetry: Telemetry;
  pendingQuestion: string | null;
  select: (id: RocketId | null) => void;
  hover: (id: RocketId | null) => void;
  setView: (v: View) => void;
  setChatOpen: (open: boolean) => void;
  askAtlas: (q: string) => void;
  clearPending: () => void;
  startLaunch: (id: RocketId) => void;
  setLaunchStatus: (s: LaunchStatus) => void;
  resetLaunch: () => void;
  setTelemetry: (t: Telemetry) => void;
}

export const useAtlas = create<AtlasState>((set, get) => ({
  selected: null,
  hovered: null,
  view: "collection",
  chatOpen: false,
  launch: { status: "idle", id: null, startedAt: 0 },
  telemetry: { t: 0, altitude: 0, velocity: 0, accelG: 0, massT: 0 },
  pendingQuestion: null,
  select: (id) => {
    if (get().launch.status !== "idle") return;
    set({ selected: id, view: id ? "collection" : get().view });
  },
  hover: (id) => set({ hovered: id }),
  setView: (v) => {
    if (get().launch.status !== "idle") return;
    set({ view: v, selected: v === "collection" ? get().selected : null });
  },
  setChatOpen: (open) => set({ chatOpen: open }),
  askAtlas: (q) => set({ chatOpen: true, pendingQuestion: q }),
  clearPending: () => set({ pendingQuestion: null }),
  startLaunch: (id) =>
    set({ selected: id, view: "collection", launch: { status: "countdown", id, startedAt: performance.now() } }),
  setLaunchStatus: (s) => set((st) => ({ launch: { ...st.launch, status: s } })),
  resetLaunch: () => set({ launch: { status: "idle", id: null, startedAt: 0 } }),
  setTelemetry: (telemetry) => set({ telemetry }),
}));
