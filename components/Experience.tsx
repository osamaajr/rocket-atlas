"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ROCKETS } from "@/lib/rockets";
import { useAtlas } from "@/lib/store";
import AtlasChat from "./ui/AtlasChat";
import { AboutPanel, ComparePanel, DetailPanel, Header, Hero, LaunchHUD, RocketRail } from "./ui/Overlay";

const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

export default function Experience() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1400);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("textarea, input")) return;
      const st = useAtlas.getState();
      if (e.key === "Escape") {
        if (st.chatOpen) st.setChatOpen(false);
        else if (st.launch.status !== "idle") st.resetLaunch();
        else st.select(null);
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = ROCKETS.findIndex((r) => r.id === st.selected);
        const d = e.key === "ArrowRight" ? 1 : -1;
        const next = i < 0 ? (d > 0 ? 0 : ROCKETS.length - 1) : (i + d + ROCKETS.length) % ROCKETS.length;
        st.select(ROCKETS[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main>
      <Scene />
      <Header />
      <Hero />
      <DetailPanel />
      <ComparePanel />
      <AboutPanel />
      <RocketRail />
      <LaunchHUD />
      <AtlasChat />
      <div className={`loader ${ready ? "is-done" : ""}`} aria-hidden={ready}>
        <div>
          <span className="mono">Rocket Atlas</span>
          <span className="bar">
            <i />
          </span>
        </div>
      </div>
    </main>
  );
}
