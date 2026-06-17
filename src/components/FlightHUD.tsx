import React from "react";
import { motion, AnimatePresence } from "motion/react";

interface FlightHUDProps {
  appMode: string;
  setAppMode: (mode: any) => void;
  countdownText: string | null;
  showVictoryCard: boolean;
  finalLapTimes: string[];
  bestLapTime: string;
  isNewRecord: boolean;
  handleRestart: () => void;
  formatMsToTime: (ms: number) => string;
  fastestLapIndex: number;
  parseTimeToMs: (timeStr: string) => number;
  lapTextRef: React.RefObject<HTMLDivElement | null>;
  timeTextRef: React.RefObject<HTMLDivElement | null>;
  bestTimeTextRef: React.RefObject<HTMLDivElement | null>;
  playerDotRef: React.RefObject<SVGCircleElement | null>;
  speedTextRef: React.RefObject<HTMLSpanElement | null>;
  boostBarRef: React.RefObject<HTMLDivElement | null>;
  boostIndicatorRef: React.RefObject<HTMLDivElement | null>;
  chargeBarRef: React.RefObject<HTMLDivElement | null>;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  appMode,
  setAppMode,
  countdownText,
  showVictoryCard,
  finalLapTimes,
  bestLapTime,
  isNewRecord,
  handleRestart,
  formatMsToTime,
  fastestLapIndex,
  parseTimeToMs,
  lapTextRef,
  timeTextRef,
  bestTimeTextRef,
  playerDotRef,
  speedTextRef,
  boostBarRef,
  boostIndicatorRef,
  chargeBarRef,
}) => {
  const isTrack = appMode.startsWith("track");

  return (
    <>
      {/* Countdown Overlay */}
      <AnimatePresence mode="popLayout">
        {countdownText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
            <div className="relative flex items-center justify-center">
              <motion.div
                key={`shockwave-${countdownText}`}
                initial={{ scale: 0.4, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`absolute w-64 h-64 rounded-full border-4 pointer-events-none ${
                  countdownText === "GO!"
                    ? "border-yellow-400/60 shadow-[0_0_50px_rgba(250,204,21,0.5)]"
                    : "border-[#eb91aa]/60 shadow-[0_0_40px_rgba(235,145,170,0.4)]"
                }`}
              />

              <motion.div
                key={countdownText}
                initial={{ scale: 0.2, opacity: 0, rotate: -15, filter: "blur(8px)" }}
                animate={{ scale: 1.0, opacity: 1, rotate: 0, filter: "blur(0px)" }}
                exit={{ scale: 1.8, opacity: 0, rotate: 15, filter: "blur(12px)" }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 14,
                  mass: 0.8,
                }}
                className="relative px-12 py-6"
              >
                <span
                  className={`absolute -inset-4 blur-3xl opacity-30 select-none pointer-events-none ${
                    countdownText === "GO!" ? "bg-yellow-400" : "bg-[#eb91aa]"
                  }`}
                />

                <span
                  className={`relative block text-[10rem] sm:text-[14rem] font-black italic tracking-tighter text-transparent bg-clip-text select-none px-8 pb-4 pr-16 ${
                    countdownText === "GO!"
                      ? "bg-gradient-to-br from-yellow-100 via-yellow-400 to-amber-600 drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)]"
                      : "bg-gradient-to-br from-white via-pink-100 to-[#eb91aa] drop-shadow-[0_10px_20px_rgba(235,145,170,0.5)]"
                  }`}
                  style={{
                    WebkitTextStroke: countdownText === "GO!" ? "2px rgba(245,158,11,0.8)" : "2px rgba(235,145,170,0.8)",
                  }}
                >
                  {countdownText}
                </span>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Victory Celebration Screen */}
      <AnimatePresence>
        {showVictoryCard && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-40 bg-black/60 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="bg-black/80 border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(235,145,170,0.15)] select-none relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.04),rgba(0,255,0,0.01),rgba(0,0,255,0.04))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-40" />

              <div className="text-center relative z-10 flex flex-col items-center">
                <motion.div
                  initial={{ rotate: -5, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 250 }}
                  className="bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 text-transparent bg-clip-text font-black tracking-widest text-4xl sm:text-5xl uppercase italic drop-shadow-[0_2px_15px_rgba(234,179,8,0.4)] px-4 leading-none py-1"
                >
                  Victory!
                </motion.div>
                <div className="text-white/40 uppercase tracking-[0.25em] text-[10px] sm:text-xs font-bold font-mono mt-1.5">
                  — Star Flight Concluded —
                </div>

                {isNewRecord && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                    transition={{
                      scale: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
                      opacity: { duration: 0.4 }
                    }}
                    className="mt-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-full px-4 py-1 flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-yellow-400 font-mono shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                  >
                    🏆 NEW TRACK RECORD!
                  </motion.div>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent relative z-10" />

              <div className="grid grid-cols-3 gap-3 relative z-10">
                <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-3 text-center flex flex-col gap-1 backdrop-blur-sm">
                  <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest leading-none">Best Lap</span>
                  <span className="text-[#eb91aa] font-mono text-xs sm:text-sm font-black truncate">{bestLapTime}</span>
                </div>

                <div className="bg-[#eb91aa]/5 border border-[#eb91aa]/10 rounded-xl px-3 py-3 text-center flex flex-col gap-1 backdrop-blur-sm">
                  <span className="text-[9px] text-[#eb91aa] uppercase font-bold tracking-widest leading-none">Total Time</span>
                  <span className="text-white font-mono text-xs sm:text-sm font-black truncate">
                    {finalLapTimes.length > 0
                      ? formatMsToTime(finalLapTimes.reduce((acc, t) => acc + parseTimeToMs(t), 0))
                      : "--:--.---"}
                  </span>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-xl px-3 py-3 text-center flex flex-col gap-1 backdrop-blur-sm">
                  <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest leading-none">Avg Lap</span>
                  <span className="text-[#eb91aa] font-mono text-xs sm:text-sm font-black truncate">
                    {finalLapTimes.length > 0
                      ? formatMsToTime(
                          finalLapTimes.reduce((acc, t) => acc + parseTimeToMs(t), 0) / finalLapTimes.length
                        )
                      : "--:--.---"}
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-[9px] text-white/40 uppercase font-black tracking-wider pb-1.5 mb-1 border-b border-white/5">
                  Lap-by-Lap Breakdown
                </div>
                
                {finalLapTimes.map((timeStr, idx) => {
                  const isFastest = idx === fastestLapIndex;
                  return (
                    <motion.div
                      key={`lap-${idx}-${timeStr}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * idx + 0.3 }}
                      className={`flex justify-between items-center py-2 px-3 rounded-lg border text-xs font-mono transition-all duration-300 ${isFastest ? "bg-gradient-to-r from-[#eb91aa]/15 to-transparent border-[#eb91aa]/30 text-white" : "bg-black/20 border-white/5 text-white/70"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isFastest ? "text-[#eb91aa]" : "text-white/30"}`}>
                          Lap {idx + 1}
                        </span>
                        {isFastest && (
                          <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase flex items-center gap-0.5 shadow-[0_0_8px_rgba(234,179,8,0.25)]">
                            👑 Fastest
                          </span>
                        )}
                      </div>
                      <span className={`font-black text-sm ${isFastest ? "text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]" : "text-white"}`}>
                        {timeStr}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2 relative z-10">
                <button
                  onClick={handleRestart}
                  className="flex-1 py-3 px-4 bg-gradient-to-b from-[#eb91aa] to-[#d66b8b] hover:brightness-110 active:scale-[0.98] transition-all rounded-xl text-black font-black text-xs uppercase tracking-widest font-sans flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(235,145,170,0.35)]"
                >
                  🏎️ Replay Track
                </button>
                <button
                  onClick={() => {
                    const scene = (window as any)._scene;
                    const trackGroup = (window as any)._trackGroup;
                    const trackRegistry = (window as any)._trackRegistry;
                    if (trackRegistry) {
                      const lapSystem = trackRegistry.subsystems?.get("laps");
                      if (lapSystem && trackGroup && trackGroup.parent) {
                        lapSystem.init(trackGroup.parent);
                      }
                    }
                    setAppMode("menu");
                  }}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all border border-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest font-sans flex items-center justify-center gap-2 cursor-pointer"
                >
                  🗺️ Track List
                </button>
                <button
                  onClick={() => {
                    setAppMode("globe");
                    (window as any)._modeSwitch = "globe";
                  }}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all border border-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest font-sans flex items-center justify-center cursor-pointer"
                  title="Relaxing Free Ride in Globe Mode"
                >
                  🌍 Globe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Right Controls & Telemetry HUD */}
      {isTrack && (
        <div className="absolute top-6 right-6 pointer-events-auto z-10 flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 backdrop-blur-md border border-[#eb91aa]/40 bg-black/50 hover:bg-[#eb91aa]/10 rounded-full text-[10px] font-black tracking-widest transition-all text-[#eb91aa] shadow-lg cursor-pointer"
              onClick={() => setAppMode("menu")}
              title="Open Course Selection Menu"
            >
              🏁 Track Select
            </button>
            <button
              className="px-4 py-2 backdrop-blur-md border border-white/10 bg-black/30 hover:bg-white/10 text-white/70 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
              onClick={() => {
                setAppMode("globe");
                (window as any)._modeSwitch = "globe";
              }}
            >
              🌍 Globe Mode
            </button>
          </div>

          <div className="flex flex-col items-end gap-3 z-10 pointer-events-none">
            <div className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 w-52 backdrop-blur-md pointer-events-auto z-10 font-mono shadow-lg select-none flex flex-col gap-1.5 transition-all">
              <div className="flex justify-between items-center border-b border-white/10 pb-1.5 mb-0.5">
                <span className="text-[9px] text-white/50 uppercase font-black tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Telemetry
                </span>
                <span
                  className="text-white font-black italic text-sm tracking-tighter text-right"
                  ref={lapTextRef}
                >
                  Lap 1/3
                </span>
              </div>
              
              <div className="flex flex-col gap-0.5">
                <div className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none">Lap Time</div>
                <div
                  className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-[#eb91aa] leading-none tracking-tight py-0.5 drop-shadow-[0_2px_8px_rgba(235,145,170,0.3)]"
                  ref={timeTextRef}
                >
                  00:00.000
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-1 font-mono text-[10px]">
                <span className="text-white/40 uppercase font-bold">Best Lap</span>
                <span
                  className="text-white/70 font-bold"
                  ref={bestTimeTextRef}
                >
                  --:--.---
                </span>
              </div>
            </div>

            <div
              id="completed-laps-hud"
              style={{ display: "none" }}
              className="bg-black/55 border border-white/15 rounded-xl p-3 w-52 backdrop-blur-md pointer-events-auto z-10 font-mono text-xs text-slate-300 shadow-xl select-none transition-all duration-300"
            >
              <div className="text-white/90 font-black text-[9px] uppercase tracking-wider mb-2 border-b border-white/10 pb-1.5 flex justify-between items-center">
                <span className="flex items-center gap-1">🏁 Laps</span>
                <span className="text-[10px] text-[#eb91aa] font-black italic tracking-wide" id="lap-summary-avg"></span>
              </div>
              <div id="lap-times-list" className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                {/* Dynamically Populated */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Left HUD (Speed + Minimap) */}
      <div className="absolute bottom-32 sm:bottom-6 left-4 sm:left-6 pointer-events-none z-10 flex flex-col gap-3">
        {isTrack && (
          <div className="w-[180px] h-[75px] sm:w-[240px] sm:h-[100px] bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md relative transform origin-bottom-left transition-all">
            {appMode === "track_oval" ? (
              <svg viewBox="0 0 240 100" className="w-full h-full opacity-80" preserveAspectRatio="xMidYMid meet">
                <rect x="30" y="20" width="180" height="60" rx="30" ry="30" fill="none" stroke="#eb91aa" strokeWidth="20" />
                <rect x="118" y="70" width="4" height="20" fill="white" className="opacity-80" />
                <circle ref={playerDotRef} cx="120" cy="50" r="5" fill="white" className="shadow-lg drop-shadow-lg" />
              </svg>
            ) : appMode === "track_abyss" ? (
              <svg viewBox="-250 -250 500 500" className="w-full h-full opacity-90" preserveAspectRatio="xMidYMid meet">
                <path d="M 0 0 C 40 -80, 80 -160, -30 -175 C -100 -175, -200 -120, -115 20 C -35 40, 100 85, 105 30 Z" fill="none" stroke="#00ffee" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
                <circle ref={playerDotRef} cx="0" cy="0" r="12" fill="white" className="shadow-lg drop-shadow-lg" />
              </svg>
            ) : appMode === "track_custom" ? (
              <svg viewBox="-60 -300 288 750" className="w-full h-full opacity-80" preserveAspectRatio="xMidYMid meet">
                <path d="M 0 0 L 0 -24 L 0 -58 L 0 -100 L 0 -148 L 0 -206 L 26 -254 L 64 -254 L 92 -214 L 94 -172 L 92 -148 L 78 -108 L 64 -62 L 50 -22 L 32 24 L 16 70 L 16 96 L 32 112" fill="none" stroke="#88cc88" strokeWidth="32" strokeLinejoin="round" />
                <path d="M 32 112 L 64 108 L 82 82 L 96 52 L 112 36 L 144 40 L 156 62 L 146 92 L 130 122 L 114 152 L 98 180 L 82 210 L 66 238 L 52 268 L 36 298 L 28 338 L 40 376 L 64 400" fill="none" stroke="#cc8888" strokeWidth="32" strokeLinejoin="round" />
                <path d="M 64 400 L 96 410 L 128 408 L 158 392 L 178 366 L 188 334 L 186 302 L 170 272 L 150 246 L 124 214 L 98 182 L 66 154 L 40 134 L 12 114 L -14 94 L -20 62 L 2 40 L 8 20 L 0 0" fill="none" stroke="#8888cc" strokeWidth="32" strokeLinejoin="round" />
                <rect x="-2" y="-10" width="4" height="20" fill="white" className="opacity-80" />
                <circle ref={playerDotRef} cx="0" cy="0" r="12" fill="white" className="shadow-lg drop-shadow-lg" />
              </svg>
            ) : (
              <svg viewBox="-180 -275 390 535" className="w-full h-full opacity-90" preserveAspectRatio="xMidYMid meet">
                <path d="M 130 70 L 130 35 L 130 15 L 130 -10 L 130 -35 L 130 -65 L 115 -95 L 95 -125 L 115 -155 L 135 -185 L 120 -210 L 100 -220 L 45 -235 L -10 -245 L -65 -225 L -105 -190 L -135 -130 L -145 -70 L -125 -15 L -135 25 L -115 55 L -75 80 L -40 95 L -10 105 L 15 110 L 35 110 L 65 110 L 95 110 L 125 110 L 155 90 L 175 60 L 185 25 L 165 -5 L 130 -15 L 90 -20 L 50 -5 L 20 20 L -5 45 L -35 72 L -30 100 L 0 122 L 35 145 L 65 155 L 75 185 L 55 215 L 75 230 L 110 200 L 130 135 Z" fill="none" stroke="#22d3ee" strokeWidth="26" strokeLinejoin="round" />
                <path d="M 130 70 L 130 35 L 130 15 L 130 -10 L 130 -35 L 130 -65 L 115 -95 L 95 -125 L 115 -155 L 135 -185 L 120 -210 L 100 -220 L 45 -235 L -10 -245 L -65 -225 L -105 -190 L -135 -130 L -145 -70 L -125 -15 L -135 25 L -115 55 L -75 80 L -40 95 L -10 105 L 15 110 L 35 110 L 65 110 L 95 110 L 125 110 L 155 90 L 175 60 L 185 25 L 165 -5 L 130 -15 L 90 -20 L 50 -5 L 20 20 L -5 45 L -35 72 L -30 100 L 0 122 L 35 145 L 65 155 L 75 185 L 55 215 L 75 230 L 110 200 L 130 135 Z" fill="none" stroke="#d946ef" strokeWidth="32" strokeDasharray="5,5" strokeLinejoin="round" className="opacity-40" />
                <line x1="117" y1="35" x2="143" y2="35" stroke="white" strokeWidth="4" className="opacity-80" />
                <circle ref={playerDotRef} cx="130" cy="35" r="10" fill="white" className="shadow-lg drop-shadow-lg animate-pulse" />
              </svg>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="text-white/60 font-mono text-xl italic font-black">
            <span ref={speedTextRef}>60</span>
          </div>
          <div className="text-white/30 text-xs font-bold font-mono tracking-widest mt-1">
            MPH
          </div>
        </div>
      </div>

      {/* Dynamic Drift Charge & Speed Boost HUD */}
      {isTrack && (
        <div className="absolute bottom-10 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10 pointer-events-none select-none">
          <div 
            ref={boostIndicatorRef}
            className="bg-black/75 border border-cyan-400/40 rounded-md px-2 py-0.5 text-[9px] font-mono font-black tracking-wider text-cyan-400 uppercase opacity-0 transition-opacity flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>BOOSTING</span>
          </div>
          
          <div className="w-52 h-2.5 bg-black/60 rounded-full border border-white/10 overflow-hidden relative shadow-[0_0_12px_rgba(0,0,0,0.6)]">
            <div className="absolute inset-0 flex justify-between px-1 opacity-20 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-[1px] h-full bg-white" />
              ))}
            </div>
            <div
              ref={boostBarRef}
              className="h-full w-0 bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 transition-all duration-75 relative rounded-full"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          <div className="w-44 h-1.5 bg-black/45 rounded-full overflow-hidden border border-white/5 relative">
            <div
              ref={chargeBarRef}
              className="h-full w-0 bg-white/80 transition-all duration-75"
            />
          </div>
        </div>
      )}

      {/* Touch UI (Mobile Only) */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-between px-6 z-10 pointer-events-none sm:hidden">
        <div className="flex gap-2 pointer-events-auto">
          <button
            className="w-16 h-16 bg-white/5 border border-white/10 rounded-full text-white/30 flex items-center justify-center active:bg-white/20"
            onPointerDown={(e) => {
              e.preventDefault();
              (window as any)._previewLeft = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              (window as any)._previewLeft = false;
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              (window as any)._previewLeft = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            ←
          </button>
          <button
            className="w-16 h-16 bg-white/5 border border-white/10 rounded-full text-white/30 flex items-center justify-center active:bg-white/20"
            onPointerDown={(e) => {
              e.preventDefault();
              (window as any)._previewRight = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              (window as any)._previewRight = false;
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              (window as any)._previewRight = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            →
          </button>
        </div>
        <div className="pointer-events-auto">
          <button
            className="w-20 h-20 bg-white/10 border border-white/20 rounded-full text-white/50 font-bold text-xs uppercase active:bg-white/30 shadow-lg animate-none"
            onPointerDown={(e) => {
              e.preventDefault();
              (window as any)._previewCharging = true;
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              (window as any)._previewCharging = false;
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              (window as any)._previewCharging = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            JUMP
          </button>
        </div>
      </div>
    </>
  );
};
