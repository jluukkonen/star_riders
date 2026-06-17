import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Orbit, Gamepad2, Zap, Cloud, MapPin, Route, Music, Volume2, VolumeX, Sparkles, Wrench } from "lucide-react";

const SHOW_EXPERIMENTAL = false;

interface MainMenuProps {
  appMode: string;
  setAppMode: (mode: any) => void;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  selectedCharacter: string;
  setSelectedCharacter: (character: string) => void;
  avatarsList: Array<{ id: string; name: string; desc: string }>;
  showCharacterDropdown: boolean;
  setShowCharacterDropdown: (show: boolean) => void;
  setShowHangarGallery: (show: boolean) => void;
  curGlimmerShards: number;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  appMode,
  setAppMode,
  isMusicPlaying,
  toggleMusic,
  selectedCharacter,
  setSelectedCharacter,
  avatarsList,
  showCharacterDropdown,
  setShowCharacterDropdown,
  setShowHangarGallery,
}) => {
  const currentPilot = avatarsList.find((a) => a.id === selectedCharacter) || avatarsList[0];

  return (
    <>
      {/* Top Right Avatar Selector & Navigation HUD */}
      {(!appMode.startsWith("track") && appMode !== "menu") && (
        <div className="absolute top-6 right-6 pointer-events-auto z-20 flex flex-col items-end gap-2 text-right select-none">
          <div className="flex items-center gap-3 bg-black/45 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl">
            <div className="flex flex-col font-mono leading-none pl-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#eb91aa] mb-1">
                Active Pilot
              </span>
              <span className="text-xs font-bold text-white max-w-[150px] truncate mb-0.5">
                {currentPilot.name}
              </span>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                {currentPilot.desc}
              </span>
            </div>
            <button
              onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
              className={`px-3 py-2 flex items-center justify-center rounded-xl border text-xs font-bold cursor-pointer transition-all active:scale-95 font-mono ${
                showCharacterDropdown
                  ? "bg-[#eb91aa]/20 border-[#eb91aa] text-[#eb91aa] shadow-[0_0_15px_rgba(235,145,170,0.3)]"
                  : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              Change ▾
            </button>
            
            <div className="w-px h-6 bg-white/10 mx-1" />

            <button
              onClick={() => {
                setAppMode("menu");
              }}
              className="px-3.5 py-2 flex items-center justify-center rounded-xl border border-[#eb91aa]/45 bg-[#eb91aa]/15 hover:bg-[#eb91aa]/25 text-[#eb91aa] text-xs font-black cursor-pointer transition-all active:scale-95 font-mono gap-1.5 shadow-[0_0_15px_rgba(235,145,170,0.2)] animate-pulse"
              title="Select Racetrack/Course"
            >
              🏁 Tracks
            </button>
          </div>

          {/* Floating Animated Dropdown Shelf */}
          <AnimatePresence>
            {showCharacterDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="w-56 bg-black/85 border border-white/10 rounded-2xl p-2 backdrop-blur-md shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex flex-col gap-1.5 z-30 max-h-[300px] overflow-y-auto"
              >
                <div className="text-[9px] text-white/45 uppercase tracking-widest px-2 pb-1 border-b border-white/5 mb-1 font-bold text-left font-mono">
                  Select Character Pilot:
                </div>
                {avatarsList.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => {
                      setSelectedCharacter(av.id);
                      (window as any)._requestedModel = av.id;
                      setShowCharacterDropdown(false);
                    }}
                    className={`w-full flex flex-col text-left px-3 py-2 rounded-xl transition-all cursor-pointer font-mono ${
                      selectedCharacter === av.id
                        ? "bg-[#eb91aa]/15 border border-[#eb91aa]/35 text-[#eb91aa] font-bold"
                        : "border border-transparent hover:bg-white/5 hover:text-white text-slate-300"
                    }`}
                  >
                    <span className="text-xs">{av.name}</span>
                    <span className="text-[9px] opacity-40 uppercase tracking-wider font-semibold mt-0.5">
                      {av.desc}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Top Left Controls HUD & Retro Music Controller */}
      {(!appMode.startsWith("track") && appMode !== "menu") && (
        <div className="absolute top-6 left-6 pointer-events-auto z-10 flex flex-col gap-3 max-w-sm font-mono">
          <div className="flex items-center gap-3 bg-black/45 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl select-none">
            <button
              onClick={toggleMusic}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${
                isMusicPlaying
                  ? "bg-[#eb91aa]/20 border-[#eb91aa]/50 text-[#eb91aa] shadow-[0_0_15px_rgba(235,145,170,0.3)] animate-pulse"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
              title="Toggle Retro Music Track"
            >
              {isMusicPlaying ? <Volume2 className="w-5 h-5 font-bold" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="flex flex-col font-mono leading-none pr-1">
              <span className="text-[9px] uppercase font-black tracking-widest text-[#eb91aa] mb-1">
                {isMusicPlaying ? "🎵 Playing Track" : "🔈 Music Off"}
              </span>
              <span className="text-xs font-bold text-white max-w-[150px] truncate mb-0.5">
                Modern Island Jam
              </span>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                Kevin MacLeod
              </span>
            </div>
          </div>
          <p className="text-[9px] text-white/20 font-mono uppercase tracking-widest pl-1 hidden sm:block">
            Arrows: Steer <span className="opacity-50 mx-2">|</span> Space/Shift: Jump/Boost
          </p>
        </div>
      )}

      {/* Course Menu Overlay */}
      {appMode === "menu" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto select-none">
          <div className="text-4xl font-black italic text-white mb-10 tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            SELECT COURSE
          </div>
          
          <div className={SHOW_EXPERIMENTAL ? "flex flex-wrap items-center justify-center gap-4 max-w-4xl px-4" : "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl px-6 w-full"}>
            <button
              className={SHOW_EXPERIMENTAL 
                ? "flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#eb91aa] transition-all hover:scale-105 active:scale-95"
                : "flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/20 p-8 rounded-2xl hover:bg-white/10 hover:border-[#eb91aa] transition-all hover:scale-105 active:scale-95 w-full text-center"
              }
              onClick={() => {
                setAppMode("track_oval");
                (window as any)._appMode = "track_oval";
                (window as any)._modeSwitch = "track";
              }}
            >
              <Orbit className={SHOW_EXPERIMENTAL ? "w-10 h-10 text-[#eb91aa]" : "w-14 h-14 text-[#eb91aa] drop-shadow-[0_0_10px_rgba(235,145,170,0.4)]"} />
              {SHOW_EXPERIMENTAL ? (
                <div className="text-xs font-bold text-white tracking-widest uppercase">
                  Oval
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-black text-white tracking-widest uppercase">
                    Oval
                  </div>
                  <div className="text-[10px] text-white/50 tracking-wider">
                    Traditional High-Speed Circuit
                  </div>
                </div>
              )}
            </button>

            <button
              className={SHOW_EXPERIMENTAL 
                ? "flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#00ffff] transition-all hover:scale-105 active:scale-95"
                : "flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/20 p-8 rounded-2xl hover:bg-white/10 hover:border-[#00ffff] transition-all hover:scale-105 active:scale-95 w-full text-center"
              }
              onClick={() => {
                setAppMode("track_retro");
                (window as any)._appMode = "track_retro";
                (window as any)._modeSwitch = "track";
              }}
            >
              <Gamepad2 className={SHOW_EXPERIMENTAL ? "w-10 h-10 text-[#00ffff]" : "w-14 h-14 text-[#00ffff] drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]"} />
              {SHOW_EXPERIMENTAL ? (
                <div className="text-xs font-bold text-white tracking-widest uppercase">
                  Chroma Ridge
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-black text-white tracking-widest uppercase">
                    Chroma Ridge
                  </div>
                  <div className="text-[10px] text-white/50 tracking-wider">
                    Retro Cyberpunk Ridge
                  </div>
                </div>
              )}
            </button>

            {SHOW_EXPERIMENTAL && (
              <>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#44bbff] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_rail");
                    (window as any)._appMode = "track_rail";
                    (window as any)._modeSwitch = "track";
                  }}
                >
                  <Zap className="w-10 h-10 text-[#44bbff]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Rails
                  </div>
                </button>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#ff00ff] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_nebula");
                    (window as any)._appMode = "track_nebula";
                    (window as any)._modeSwitch = "track";
                  }}
                >
                  <Cloud className="w-10 h-10 text-[#ff00ff]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Nebula
                  </div>
                </button>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#ffff00] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_planner");
                    (window as any)._appMode = "track_planner";
                    (window as any)._modeSwitch = "track";
                  }}
                >
                  <MapPin className="w-10 h-10 text-[#ffff00]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Planner
                  </div>
                </button>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#88cc88] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_custom");
                    (window as any)._appMode = "track_custom";
                    (window as any)._modeSwitch = "track";
                  }}
                >
                  <Route className="w-10 h-10 text-[#88cc88]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Custom
                  </div>
                </button>
              </>
            )}

            <button
              className={SHOW_EXPERIMENTAL 
                ? "flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#00ffcc] transition-all hover:scale-105 active:scale-95"
                : "flex flex-col items-center justify-center gap-4 bg-white/5 border border-white/20 p-8 rounded-2xl hover:bg-white/10 hover:border-[#00ffcc] transition-all hover:scale-105 active:scale-95 w-full text-center"
              }
              onClick={() => {
                setAppMode("track_abyss");
                (window as any)._appMode = "track_abyss";
                (window as any)._modeSwitch = "track";
              }}
            >
              <Zap className={SHOW_EXPERIMENTAL ? "w-10 h-10 text-[#00ffcc]" : "w-14 h-14 text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.4)]"} />
              {SHOW_EXPERIMENTAL ? (
                <div className="text-xs font-bold text-white tracking-widest uppercase">
                  Abyss Trench
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-black text-white tracking-widest uppercase">
                    Abyss Trench
                  </div>
                  <div className="text-[10px] text-white/50 tracking-wider">
                    Deep Space Obstacle Run
                  </div>
                </div>
              )}
            </button>

            {SHOW_EXPERIMENTAL && (
              <>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#ffcc00] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_mario");
                    (window as any)._appMode = "track_mario";
                    (window as any)._modeSwitch = "track";
                  }}
                >
                  <Sparkles className="w-10 h-10 text-[#ffcc00]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Mario Circuit
                  </div>
                </button>
                <button
                  className="flex flex-col items-center gap-3 bg-white/5 border border-white/20 p-5 rounded-xl hover:bg-white/10 hover:border-[#00ffcc] transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setAppMode("track_builder");
                  }}
                >
                  <Wrench className="w-10 h-10 text-[#00ffcc]" />
                  <div className="text-xs font-bold text-white tracking-widest uppercase">
                    Course Builder
                  </div>
                </button>
              </>
            )}
          </div>
          <button
            className="mt-12 text-white/50 uppercase tracking-widest text-sm hover:text-white transition-colors cursor-pointer"
            onClick={() => setAppMode("globe")}
          >
            [ Cancel & Return to Globe ]
          </button>
        </div>
      )}
      
      {/* Character Dropdown logic was here, assuming remaining logic matches existing codebase components */}
    </>
  );
};
