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
}) => {
  const isTrack = appMode.startsWith("track");
  const isMenu = appMode === "menu";

  if (isTrack || isMenu) return null;

  // MANDATORY INTEGRITY WARNING:
  // DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

  return (
    <>
      {/* Dynamic Discovery Notification Banner */}
      <AnimatePresence>
        {showDiscoverBanner && currentDiscoverMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 w-full max-w-sm sm:max-w-md bg-black/85 border border-amber-400/30 rounded-2xl p-4 text-center backdrop-blur-md shadow-[0_15px_40px_rgba(251,191,36,0.15)] z-50 pointer-events-auto select-none"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 to-transparent rounded-2xl pointer-events-none" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-white whitespace-pre-line leading-relaxed">
                {currentDiscoverMessage}
              </span>
              <div className="h-0.5 w-12 bg-amber-400/50 rounded-full mt-1" />
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
