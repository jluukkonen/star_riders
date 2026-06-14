import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface GlobeHUDProps {
  appMode: string;
  curGlimmerShards: number;
  globeDiscoveriesRef: React.RefObject<HTMLSpanElement | null>;
  globeAltitudeTextRef: React.RefObject<HTMLDivElement | null>;
  globeDayNightTextRef: React.RefObject<HTMLSpanElement | null>;
  showDiscoverBanner: boolean;
  currentDiscoverMessage: string | null;
  globeRingsCollectedRef: React.RefObject<HTMLSpanElement | null>;
  timeAttackActive?: boolean;
  timeAttackTimeLeft?: number;
  timeAttackGatesCleared?: number;
  timeAttackTotalGates?: number;
  timeAttackMultiplier?: number;
}

export const GlobeHUD: React.FC<GlobeHUDProps> = ({
  appMode,
  curGlimmerShards,
  globeDiscoveriesRef,
  globeAltitudeTextRef,
  globeDayNightTextRef,
  showDiscoverBanner,
  currentDiscoverMessage,
  globeRingsCollectedRef,
  timeAttackActive = false,
  timeAttackTimeLeft = 0,
  timeAttackGatesCleared = 0,
  timeAttackTotalGates = 0,
  timeAttackMultiplier = 1.0,
}) => {
  const isTrack = appMode.startsWith("track");
  const isMenu = appMode === "menu";
  const isPlanetView = appMode === "globe_view";

  if (isTrack || isMenu || isPlanetView) return null;

  // MANDATORY INTEGRITY WARNING:
  // DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

  return (
    <>
      {/* Dynamic Discovery Notification Banner (Sleek slide-in toast in the top-right) */}
      <AnimatePresence>
        {showDiscoverBanner && currentDiscoverMessage && (
          <motion.div
            initial={{ opacity: 0, x: 120, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 140, damping: 16 }}
            className="absolute top-24 right-6 w-full max-w-[280px] bg-black/80 border border-amber-400/25 rounded-xl p-3 text-left backdrop-blur-md shadow-[0_12px_30px_rgba(251,191,36,0.12)] z-50 pointer-events-auto select-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/5 to-transparent rounded-xl pointer-events-none" />
            <div className="flex items-start gap-2.5">
              <span className="text-lg">✨</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase text-amber-400/70 tracking-widest">Notification</span>
                <span className="text-xs font-semibold text-white/90 whitespace-pre-line leading-relaxed">
                  {currentDiscoverMessage}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time-Attack Arcade Challenge Heads-Up overlay (Ultra-minimalist, sleek, horizontal pill) */}
      <AnimatePresence>
        {timeAttackActive && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 150, damping: 15 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/75 border border-[#00f3ff]/40 rounded-full py-2 px-5 flex items-center justify-between gap-5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,243,255,0.15)] z-40 pointer-events-auto select-none font-mono text-[11px] text-white tracking-wide min-w-[340px] sm:min-w-[420px]"
            id="time-attack-arcade-hud"
          >
            {/* Left Brand Badge */}
            <div className="flex items-center gap-1.5 border-r border-white/10 pr-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f3ff] animate-pulse" />
              <span className="font-extrabold text-[#00f3ff] uppercase tracking-wider text-[10px]">
                ⚡ CHALLENGE
              </span>
            </div>

            {/* Progress Fraction */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/40 uppercase text-[9px] font-bold">GATES:</span>
              <span className="font-black text-white text-xs">
                <span className="text-[#00f3ff]">{timeAttackGatesCleared}</span>
                <span className="text-white/30">/</span>
                <span>{timeAttackTotalGates}</span>
              </span>
            </div>

            {/* Middle Countdown Timer */}
            <div className="flex items-center gap-1.5 border-l border-r border-white/10 px-4 py-0.5">
              <span className="text-white/40 uppercase text-[9px] font-bold">TIME:</span>
              <span
                className={`font-black tracking-tight tabular-nums text-xs min-w-[50px] text-center ${
                  timeAttackTimeLeft <= 5.0
                    ? "text-rose-500 animate-pulse scale-110"
                    : "text-amber-400"
                }`}
              >
                {Math.max(0, timeAttackTimeLeft).toFixed(2)}s
              </span>
            </div>

            {/* Right Multiplier Indicator */}
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-white/40 uppercase text-[9px] font-bold">MULT:</span>
              <span className="font-black text-[#ff33aa] text-xs">
                {timeAttackMultiplier.toFixed(1)}x
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cozy Globe Explorer Mode HUD overlay */}
      <div className="absolute bottom-6 left-6 right-6 pointer-events-none z-10 flex flex-col sm:flex-row justify-between items-end gap-4 font-mono">
        {/* Left panel: Discoveries & Glimmer Shards */}
        <div className="flex flex-col gap-2.5 bg-black/45 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-2xl pointer-events-auto text-left select-none max-w-xs w-full">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#eb91aa]">
              🌍 Landmark Progress
            </span>
            <span className="text-xs font-bold text-white" ref={globeDiscoveriesRef}>
              0 / 8
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#50e3c2]">
              ⭕ Rings Passed
            </span>
            <span className="text-xs font-bold text-white" ref={globeRingsCollectedRef}>
              0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-lg shadow-[0_0_10px_rgba(251,191,36,0.1)]">
              ✨
            </div>
            <div className="flex flex-col select-none">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
                Glimmer Shards
              </span>
              <span className="text-sm font-black text-amber-400 tracking-wide">
                {curGlimmerShards} Shards
              </span>
            </div>
          </div>

          <div className="text-[9px] text-white/40 leading-relaxed font-sans border-t border-white/5 pt-2 mt-0.5">
            💡 Fly up and search the skies for floating low-poly islands, or discover landmarks on the surface!
          </div>
        </div>

        {/* Center panel: Flight instructions & Controls indicators */}
        <div className="hidden md:flex flex-col items-center gap-1.5 bg-black/45 border border-white/10 rounded-2xl px-6 py-3.5 backdrop-blur-md shadow-2xl text-center select-none max-w-sm pointer-events-auto">
          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
            ✈️ Flying Controls
          </span>
          <span className="text-[11px] text-white/80 leading-relaxed max-w-[280px]">
            Keyboard: <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">W</kbd>/<kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">↑</kbd> to Fly. <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">S</kbd>/<kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">↓</kbd> to Rev. <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">Space</kbd> to Climb. <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white font-bold mx-0.5">Shift</kbd> to Dive!
          </span>
        </div>

        {/* Right panel: Active Day/Night Phase and Altitude state */}
        <div className="flex flex-col gap-2.5 bg-black/45 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-2xl pointer-events-auto text-left select-none max-w-xs w-full sm:w-[220px]">
          <div className="flex flex-col border-b border-white/5 pb-2">
            <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
              Altitude
            </span>
            <span className="text-lg font-black text-white italic" ref={globeAltitudeTextRef}>
              0m
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-[8px] text-indigo-300">
              ⭐
            </div>
            <div className="flex flex-col select-none leading-none">
              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider mb-0.5">
                Local Phase
              </span>
              <span className="text-xs font-bold text-slate-200" ref={globeDayNightTextRef}>
                ☀️ Sunny Midday
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
