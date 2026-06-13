/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fbm } from "./utils";
import { GameAvatar } from "./GameAvatar";
import { RetroMusicSynth } from "./RetroMusicSynth";
import { createWarpStar } from "./WarpStarMesh";
import { SpeedLines } from "./SpeedLines";
import { GameFlowManager, GameMode, SystemFlag } from "./GameFlowManager";
import { Orbit, Gamepad2, Zap, Cloud, MapPin, Route, Music, Volume2, VolumeX, Sparkles } from "lucide-react";
import { HangarGallery } from "./components/HangarGallery";
import { MainMenu } from "./components/MainMenu";
import { FlightHUD } from "./components/FlightHUD";
import { GlobeHUD } from "./components/GlobeHUD";
import { ParticleSystem } from "./utils/ParticleSystem";
import { PlanetGenerator } from "./utils/PlanetGenerator";
import { CelestialSystem } from "./utils/CelestialSystem";
import {
  Track,
  BoostPadSystem,
  LapSystem,
  PlayerState,
  AISystem,
} from "./TrackSubsystems";
import {
  buildOvalTrack,
  buildRetroTrack,
  buildRailTrack,
  buildNebulaBeltTrack,
  buildPlannerTrack,
  buildCustomTrack,
  buildAbyssTrenchTrack,
  TrackBuildResult,
} from "./CourseManager";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chargeBarRef = useRef<HTMLDivElement>(null);
  const boostBarRef = useRef<HTMLDivElement>(null);
  const boostIndicatorRef = useRef<HTMLDivElement>(null);
  const speedTextRef = useRef<HTMLSpanElement>(null);
  const lapTextRef = useRef<HTMLDivElement>(null);
  const timeTextRef = useRef<HTMLDivElement>(null);
  const bestTimeTextRef = useRef<HTMLDivElement>(null);
  const playerDotRef = useRef<SVGCircleElement>(null);
  const globeSkyboxRef = useRef<THREE.Texture | null>(null);

  // MANDATORY INTEGRITY WARNING:
  // DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

  // Globe HUD refs for high-performance direct text injection
  const globeAltitudeTextRef = useRef<HTMLDivElement>(null);
  const globeDayNightTextRef = useRef<HTMLSpanElement>(null);
  const globeDiscoveriesRef = useRef<HTMLSpanElement>(null);
  const globeRingsCollectedRef = useRef<HTMLSpanElement>(null);

  // Cozy Globe Exploration Subsystems State
  const [discoveredPOIs, setDiscoveredPOIs] = useState<string[]>([]);
  const [currentDiscoverMessage, setCurrentDiscoverMessage] = useState<string | null>(null);
  const [showDiscoverBanner, setShowDiscoverBanner] = useState<boolean>(false);
  const [curGlimmerShards, setCurGlimmerShards] = useState<number>(0);

  const [isMoving, setIsMoving] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [appMode, setAppMode] = useState<
    | "globe"
    | "menu"
    | "track_oval"
    | "track_retro"
    | "track_rail"
    | "track_nebula"
    | "track_planner"
    | "track_custom"
    | "track_abyss"
  >("globe");
  const [countdownText, setCountdownText] = useState<string | null>(null);
  const [showVictoryCard, setShowVictoryCard] = useState(false);
  const [finalLapTimes, setFinalLapTimes] = useState<string[]>([]);
  const [bestLapTime, setBestLapTime] = useState<string>("--:--.---");
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string>("cat");
  const [showCharacterDropdown, setShowCharacterDropdown] = useState<boolean>(false);
  const [showHangarGallery, setShowHangarGallery] = useState<boolean>(false);

  const avatarsList = [
    { id: "cat", name: "🐱 Pilot Cat", desc: "Procedural Retro Cat Pilot" },
    { id: "beaver", name: "🦫 Astro Beaver", desc: "3D Kenney Cube Beaver Pilot" },
    { id: "bee", name: "🐝 Nebula Bee", desc: "3D Kenney Cube Bee Pilot" },
    { id: "bunny", name: "🐰 Cosmic Bunny", desc: "3D Kenney Cube Bunny Pilot" },
    { id: "caterpillar", name: "🐛 Solar Caterpillar", desc: "3D Kenney Cube Caterpillar Pilot" },
    { id: "chick", name: "🐤 Galaxy Chick", desc: "3D Kenney Cube Chick Pilot" },
    { id: "cow", name: "🐮 Star Cow", desc: "3D Kenney Cube Cow Pilot" },
    { id: "crab", name: "🦀 Crater Crab", desc: "3D Kenney Cube Crab Pilot" },
    { id: "deer", name: "🦌 Comet Deer", desc: "3D Kenney Cube Deer Pilot" },
    { id: "dog", name: "🐶 Solar Dog", desc: "3D Kenney Cube Dog Pilot" },
    { id: "elephant", name: "🐘 Galactic Elephant", desc: "3D Kenney Cube Elephant Pilot" },
    { id: "fish", name: "🐟 Void Fish", desc: "3D Kenney Cube Fish Pilot" },
    { id: "fox", name: "🦊 Aurora Fox", desc: "3D Kenney Cube Fox Pilot" },
    { id: "giraffe", name: "🦒 Orbit Giraffe", desc: "3D Kenney Cube Giraffe Pilot" },
    { id: "hog", name: "🐗 Astro Hog", desc: "3D Kenney Cube Hog Pilot" },
    { id: "koala", name: "🐨 Nebula Koala", desc: "3D Kenney Cube Koala Pilot" },
    { id: "lion", name: "🦁 Solar Lion", desc: "3D Kenney Cube Lion Pilot" },
    { id: "monkey", name: "🐵 Cosmos Monkey", desc: "3D Kenney Cube Monkey Pilot" },
    { id: "panda", name: "🐼 Pulsar Panda", desc: "3D Kenney Cube Panda Pilot" },
    { id: "parrot", name: "🦜 Sky Parrot", desc: "3D Kenney Cube Parrot Pilot" },
    { id: "penguin", name: "🐧 Space Penguin", desc: "3D Kenney Cube Penguin Pilot" },
    { id: "pig", name: "🐷 Astro Pig", desc: "3D Kenney Cube Pig Pilot" },
    { id: "polar", name: "🐻‍❄️ Polar Bear", desc: "3D Kenney Cube Polar Bear Pilot" },
    { id: "tiger", name: "🐯 Eclipse Tiger", desc: "3D Kenney Cube Tiger Pilot" },
  ];

  const parseTimeToMs = (timeStr: string): number => {
    const parts = timeStr.split(":");
    let secPart = parts[1] || "0";
    const secs = parseFloat(secPart);
    const mins = parseInt(parts[0] || "0", 10);
    return (mins * 60 + secs) * 1000;
  };

  const formatMsToTime = (ms: number): string => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const millis = Math.floor(ms % 1000);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
  };

  const fastestLapIndex = finalLapTimes.length > 0 
    ? finalLapTimes.reduce((minIdx, currentVal, currentIdx, arr) => 
        parseTimeToMs(currentVal) < parseTimeToMs(arr[minIdx]) ? currentIdx : minIdx, 0)
    : -1;

  const handleRestart = () => {
    (window as any)._modeSwitch = "track";
    // Clear countdown intervals
    if ((window as any)._countdownInterval) {
      clearInterval((window as any)._countdownInterval);
    }
    setCountdownText(null);
    setShowVictoryCard(false);
    setIsNewRecord(false);
    setFinalLapTimes([]);
    (window as any)._countdownActive = false;
    (window as any)._introActive = true;
    (window as any)._introTime = 0;
    
    // Reset our lap system tracker state explicitly as well
    const lapSystem = (window as any)._trackRegistry?.subsystems?.get("laps");
    if (lapSystem) {
      const trackGroup = (window as any)._trackGroup;
      if (trackGroup && trackGroup.parent) {
        lapSystem.init(trackGroup.parent);
      }
    }
  };

  // Audio System state & refs (Option 2: Audio-reactive pulsing)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const synthRef = useRef<RetroMusicSynth | null>(null);
  const globeAudioRef = useRef<HTMLAudioElement | null>(null);

  const ensureAudioInitialized = () => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // High responsiveness for game beats
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Connect analyzer directly to destination
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray;

        // Expose to window for Three.js render loop
        (window as any)._audioAnalyser = analyser;
        (window as any)._audioDataArray = dataArray;

        // Create the amazing chiptune synth player
        const synth = new RetroMusicSynth(ctx, analyser);
        synthRef.current = synth;

        // Create HTMLAudioElement for Globe music and connect to AudioContext graph
        const audio = new Audio("/music/Glitter Blast.mp3");
        audio.loop = true;
        audio.crossOrigin = "anonymous";
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        globeAudioRef.current = audio;
      } catch (err) {
        console.error("AudioContext initialization failed:", err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  };

  const playMusic = (overrideMode?: string) => {
    ensureAudioInitialized();
    const activeMode = overrideMode || appMode;
    if (activeMode === "globe") {
      if (synthRef.current) {
        synthRef.current.stop();
      }
      if (globeAudioRef.current) {
        globeAudioRef.current.play().catch(err => console.warn("Failed to play Globe audio:", err));
      }
    } else if (activeMode.startsWith("track")) {
      if (globeAudioRef.current) {
        globeAudioRef.current.pause();
      }
      if (synthRef.current) {
        synthRef.current.start();
      }
    }
    setIsMusicPlaying(true);
  };

  const pauseMusic = () => {
    if (synthRef.current) {
      synthRef.current.stop();
    }
    if (globeAudioRef.current) {
      globeAudioRef.current.pause();
    }
    setIsMusicPlaying(false);
  };

  const toggleMusic = () => {
    if (isMusicPlaying) {
      pauseMusic();
    } else {
      playMusic(appMode);
    }
  };

  const playCountdownSound = (isGo: boolean) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const currentTime = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = isGo ? "triangle" : "sine";
      osc.frequency.setValueAtTime(isGo ? 650 : 380, currentTime);
      
      if (isGo) {
        osc.frequency.setValueAtTime(650, currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, currentTime + 0.15);
        osc.frequency.linearRampToValueAtTime(800, currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.15, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(currentTime);
        osc.stop(currentTime + 0.55);
      } else {
        gainNode.gain.setValueAtTime(0.15, currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.18);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(currentTime);
        osc.stop(currentTime + 0.2);
      }
    } catch (err) {
      console.warn("Countdown audio sound failed:", err);
    }
  };

  const playVictoryChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gainNode.gain.setValueAtTime(0.12, now + idx * 0.12);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } catch (err) {
      console.warn("Victory chime play failed:", err);
    }
  };

  const playSound = (type: "whoosh" | "screech" | "chime" | "coin") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = new AudioContextClass();
        audioContextRef.current = ctx;
      }
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const currentTime = ctx.currentTime;
      
      if (type === "whoosh") {
        // Futuristic F-Zero engine/boost WHOOSH
        // 1. White Noise Buffer for air friction hiss
        const bufferSize = ctx.sampleRate * 0.5; // half second whoosh
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        
        // Sweeping Bandpass Filter to emulate sudden airflow rush
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(3.0, currentTime);
        filter.frequency.setValueAtTime(250, currentTime);
        filter.frequency.exponentialRampToValueAtTime(1800, currentTime + 0.15);
        filter.frequency.exponentialRampToValueAtTime(150, currentTime + 0.5);
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, currentTime);
        noiseGain.gain.linearRampToValueAtTime(0.2, currentTime + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
        
        noiseNode.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseNode.start(currentTime);
        noiseNode.stop(currentTime + 0.5);
        
        // 2. Synthesized Engine Power Sweep (Low Sawtooth + Triangle chord)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(60, currentTime);
        osc1.frequency.exponentialRampToValueAtTime(350, currentTime + 0.18);
        osc1.frequency.exponentialRampToValueAtTime(50, currentTime + 0.55);
        
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(90, currentTime);
        osc2.frequency.exponentialRampToValueAtTime(525, currentTime + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(75, currentTime + 0.55);
        
        const oscFilter = ctx.createBiquadFilter();
        oscFilter.type = "lowpass";
        oscFilter.frequency.setValueAtTime(250, currentTime);
        oscFilter.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.18);
        oscFilter.frequency.exponentialRampToValueAtTime(150, currentTime + 0.55);
        
        oscGain.gain.setValueAtTime(0.001, currentTime);
        oscGain.gain.linearRampToValueAtTime(0.18, currentTime + 0.1);
        oscGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.55);
        
        osc1.connect(oscFilter);
        osc2.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(ctx.destination);
        
        osc1.start(currentTime);
        osc2.start(currentTime);
        osc1.stop(currentTime + 0.55);
        osc2.stop(currentTime + 0.55);
        
      } else if (type === "screech") {
        // High-pitched drift tire scrape/screech with micro frequency vibrato
        const duration = 0.45;
        
        // Two oscillators detuned slightly for chorus and high frequency friction
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        
        osc1.type = "triangle";
        osc2.type = "sine";
        
        const baseFreq = 950;
        const offsetFreq = 980;
        
        osc1.frequency.setValueAtTime(baseFreq, currentTime);
        osc2.frequency.setValueAtTime(offsetFreq, currentTime);
        
        // Rapid frequency vibrato (frictional stutter)
        for (let i = 0; i < duration * 25; i++) {
          const t = currentTime + (i / 25);
          const jitter = Math.sin(t * 140) * 120;
          osc1.frequency.setValueAtTime(baseFreq + jitter, t);
          osc2.frequency.setValueAtTime(offsetFreq - jitter, t);
        }
        
        osc1.frequency.setValueAtTime(baseFreq * 0.7, currentTime + duration - 0.08);
        osc2.frequency.setValueAtTime(offsetFreq * 0.7, currentTime + duration - 0.08);
        
        // Bandpass to bring out retro screechiness
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2400, currentTime);
        filter.Q.setValueAtTime(1.8, currentTime);
        
        // Gutter/stutter gain envelope
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.07, currentTime + 0.04);
        
        // Stutter Volume
        for (let i = 1; i < duration * 25; i++) {
          const t = currentTime + (i / 25);
          const rG = 0.03 + Math.random() * 0.04;
          gainNode.gain.setValueAtTime(rG, t);
        }
        gainNode.gain.setValueAtTime(0.04, currentTime + duration - 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
        
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(currentTime);
        osc2.start(currentTime);
        osc1.stop(currentTime + duration);
        osc2.stop(currentTime + duration);
      } else if (type === "chime") {
        // High quality futuristic synth chime for POI discoveries
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(523.25, currentTime); // C5
        osc1.frequency.exponentialRampToValueAtTime(1046.5, currentTime + 0.15); // C6

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(659.25, currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1318.5, currentTime + 0.15); // E6

        gain.gain.setValueAtTime(0.001, currentTime);
        gain.gain.linearRampToValueAtTime(0.12, currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.7);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(currentTime);
        osc2.start(currentTime);
        osc1.stop(currentTime + 0.7);
        osc2.stop(currentTime + 0.7);
      } else if (type === "coin") {
        // Classic uplifting arpeggios coin ping for star fragments
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(987.77, currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, currentTime + 0.08); // E6

        gain.gain.setValueAtTime(0.001, currentTime);
        gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(currentTime);
        osc.stop(currentTime + 0.35);
      }
    } catch (err) {
      console.warn("Sound play failed:", err);
    }
  };

  // Cleanup music on component unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.stop();
      }
      if (globeAudioRef.current) {
        globeAudioRef.current.pause();
        globeAudioRef.current.src = "";
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (appMode === "track_oval" || appMode === "globe") {
      playMusic(appMode);
    } else {
      pauseMusic();
    }

    if (appMode.startsWith("track")) {
      setCountdownText(null);
      setShowVictoryCard(false);
      setIsNewRecord(false);
      setFinalLapTimes([]);
      (window as any)._countdownActive = false;
      (window as any)._introActive = true;
      (window as any)._introTime = 0;
      (window as any)._introBaseHeight = undefined;

      (window as any)._triggerCountdown = () => {
        setCountdownText("3");
        playCountdownSound(false);
        (window as any)._countdownActive = true;
        let count = 3;
        const interval = setInterval(() => {
          count--;
          if (count > 0) {
            setCountdownText(count.toString());
            playCountdownSound(false);
          } else if (count === 0) {
            setCountdownText("GO!");
            playCountdownSound(true);
            (window as any)._countdownActive = false;
          } else {
            setCountdownText(null);
            clearInterval(interval);
          }
        }, 1000);
        (window as any)._countdownInterval = interval;
      };

      return () => {
        if ((window as any)._countdownInterval) {
          clearInterval((window as any)._countdownInterval);
        }
        (window as any)._countdownActive = false;
        (window as any)._introActive = false;
      };
    } else {
      setCountdownText(null);
      setShowVictoryCard(false);
      setIsNewRecord(false);
      setFinalLapTimes([]);
      (window as any)._countdownActive = false;
      (window as any)._introActive = false;
    }
  }, [appMode]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    (window as any)._scene = scene;
    scene.background = new THREE.Color(0x0a0516); // Deep space dark purple
    scene.fog = new THREE.FogExp2(0x0a0516, 0.001);

    // Load globe space background (Nebula 02)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      "assets/Planetguard Nebulas/Nebula 02/Render.png",
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        if ("colorSpace" in texture) {
          (texture as any).colorSpace = (THREE as any).SRGBColorSpace || "srgb";
        } else if ("encoding" in texture) {
          (texture as any).encoding = 3001;
        }
        globeSkyboxRef.current = texture;
        const currentMode = (window as any)._appMode || "globe";
        if (currentMode === "globe" || currentMode === "globe_view") {
          scene.background = texture;
        }
      },
      undefined,
      (err) => {
        console.error("Nebula background failed to load, falling back to dark purple", err);
      }
    );

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 3.5, 8);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped at 1.5 for superb fill-rate performance on high-DPI screens
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Post-processing setup
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), // Run bloom pass at half size to keep rendering ultra-smooth
      0.35, // strength
      1.5, // radius
      0.85, // threshold
    );
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Controls for mouse dragging
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.5, 0);
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Prevent going too far below ground

    // 2. Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xebf2fa, 0.8);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    (window as any)._hemiLight = hemiLight;
    (window as any)._dirLight = dirLight;

    // --- Atmospheric Celestial Skydome, Sun/Moon, & Stars ---
    const celestialSystem = new CelestialSystem();
    celestialSystem.init(scene);

    // --- Environment/Globe Planet (Dual-Geodesic Grid: Hexagons + 12 Pentagons) ---
    const planetRadius = 140;
    const planetGenerator = new PlanetGenerator();
    planetGenerator.generate(scene, planetRadius);
    const ground = planetGenerator.groundGroup;
    const tilesData = planetGenerator.tilesData;
    const globePOIs = (window as any)._globePOIs;
    const cloudsGroup = (window as any)._cloudsGroup;

    // --- Track Mode Environment ---
    const trackGroup = new THREE.Group();
    trackGroup.visible = false;
    (window as any)._trackGroup = trackGroup;
    scene.add(trackGroup);

    const particleGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const particleMat = new THREE.MeshPhongMaterial({
      color: 0xffe833,
      emissive: 0xffaa00,
      emissiveIntensity: 2.0,
      flatShading: true,
    });
    const boostParticleGeo = new THREE.BoxGeometry(0.08, 0.08, 1.2);
    const boostParticleMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xffdd44,
      emissiveIntensity: 4.0,
      flatShading: true,
    });

    const smokeParticleGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const smokeParticleMat = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      emissive: 0x111111,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.45,
      flatShading: true,
    });

    const waterSprayMat = new THREE.MeshPhongMaterial({
      color: 0xe0f7fa,       // Light cyan seafoam
      emissive: 0x11333a,    // Soft cyan glow
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.65,
      flatShading: true,
    });
    (window as any)._waterSprayMat = waterSprayMat;

    // Magical Particle Trail System (Fully pooled and GC-free for peak performance!)
    const particleSystem = new ParticleSystem(scene, particleGeo, particleMat);
    const addSpawningParticle = particleSystem.addSpawningParticle.bind(particleSystem);

    // Projectile System
    const projectiles: {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      life: number;
    }[] = [];

    // Celebration Victory Particles (Confetti)
    interface CelebrationParticle {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      rotSpeed: THREE.Vector3;
      life: number;
      maxLife: number;
    }
    const celebrationParticles: CelebrationParticle[] = [];
    const confettiColors = [0xfa007a, 0xffd700, 0x00f3ff, 0x39ff14, 0xff5722, 0xe040fb];
    const confettiGeo = new THREE.BoxGeometry(0.18, 0.18, 0.02);
    
    const spawnCelebrationConfetti = (centerPos: THREE.Vector3) => {
      const count = Math.floor(Math.random() * 4) + 4;
      for (let i = 0; i < count; i++) {
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const mat = new THREE.MeshBasicMaterial({
          color: color,
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(confettiGeo, mat);
        
        mesh.position.copy(centerPos);
        mesh.position.x += (Math.random() - 0.5) * 5.0;
        mesh.position.y += (Math.random() * 2.5); // Start slightly above star
        mesh.position.z += (Math.random() - 0.5) * 5.0;
        
        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 4.0,
          Math.random() * 5.0 + 3.0, // Shoot upwards!
          (Math.random() - 0.5) * 4.0
        );
        
        const rotSpeed = new THREE.Vector3(
          Math.random() * 10 - 5,
          Math.random() * 10 - 5,
          Math.random() * 10 - 5
        );
        
        scene.add(mesh);
        celebrationParticles.push({
          mesh,
          velocity,
          rotSpeed,
          life: 0,
          maxLife: 2.0 + Math.random() * 1.5
        });
      }
    };

    const spawnCelebrationRing = (centerPos: THREE.Vector3) => {
      const starCount = 14;
      const ringGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      for (let i = 0; i < starCount; i++) {
        const theta = (i / starCount) * Math.PI * 2;
        const color = 0xffd700; // Gold
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(ringGeo, mat);
        
        mesh.position.copy(centerPos);
        mesh.position.y += 0.5;
        
        // Push outward in a circle
        const velocity = new THREE.Vector3(
          Math.sin(theta) * 6.0,
          (Math.random() - 0.2) * 2.0,
          Math.cos(theta) * 6.0
        );
        
        const rotSpeed = new THREE.Vector3(
          Math.random() * 6,
          Math.random() * 6,
          Math.random() * 6
        );
        
        scene.add(mesh);
        celebrationParticles.push({
          mesh,
          velocity,
          rotSpeed,
          life: 0,
          maxLife: 1.2
        });
      }
    };

    // Create mini-star shape
    const projShape = new THREE.Shape();
    const projOuter = 0.22;
    const projInner = 0.12;
    for (let i = 0; i < 5; i++) {
      const thetaOuter = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const thetaInner = ((i + 0.5) / 5) * Math.PI * 2 + Math.PI / 2;
      if (i === 0)
        projShape.moveTo(
          Math.cos(thetaOuter) * projOuter,
          Math.sin(thetaOuter) * projOuter,
        );
      else
        projShape.lineTo(
          Math.cos(thetaOuter) * projOuter,
          Math.sin(thetaOuter) * projOuter,
        );
      projShape.lineTo(
        Math.cos(thetaInner) * projInner,
        Math.sin(thetaInner) * projInner,
      );
    }
    const projExtrudeOpts: THREE.ExtrudeGeometryOptions = {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };
    const projectileGeo = new THREE.ExtrudeGeometry(projShape, projExtrudeOpts);
    projectileGeo.computeVertexNormals();
    projectileGeo.computeBoundingBox();
    projectileGeo.translate(
      0,
      0,
      -0.5 *
        (projectileGeo.boundingBox!.max.z - projectileGeo.boundingBox!.min.z),
    );

    // Sparkle shape for trail
    const projTrailGeo = new THREE.OctahedronGeometry(0.06, 0);
    // Warm magic color
    const projectileMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xffaa33,
      emissiveIntensity: 4.0,
      flatShading: true,
    });
    const projectileTrailMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xffdd44,
      emissiveIntensity: 3.0,
      flatShading: true,
    });

    // Colorful drift spark materials for intense gameplay feedback
    const sparkMatBlue = new THREE.MeshPhongMaterial({
      color: 0x33aaff,
      emissive: 0x0055ff,
      emissiveIntensity: 3.0,
      flatShading: true,
    });
    const sparkMatGold = new THREE.MeshPhongMaterial({
      color: 0xffaa00,
      emissive: 0xff5500,
      emissiveIntensity: 3.0,
      flatShading: true,
    });
    const sparkMatNeon = new THREE.MeshPhongMaterial({
      color: 0xff33bb,
      emissive: 0xff0055,
      emissiveIntensity: 4.0,
      flatShading: true,
    });
    const sparkMatUltra = new THREE.MeshPhongMaterial({
      color: 0x33ffff,
      emissive: 0xffffff,
      emissiveIntensity: 5.0,
      flatShading: true,
    });
    const sparkMatScrape = new THREE.MeshPhongMaterial({
      color: 0xffdd44,
      emissive: 0xff5500,
      emissiveIntensity: 6.0,
      flatShading: true,
    });

    // 4. Instantiation
    const warpStar = createWarpStar();
    warpStar.rotation.order = "YXZ"; // Ensures pitch and roll correctly apply regardless of heading
    scene.add(warpStar);

    // Orange/Cream cat fur color
    const avatar = new GameAvatar(warpStar, 0xffb75e, true);

    // Warp Star lighting fx
    const starLight = new THREE.PointLight(0xfffae6, 1.5, 8.0);
    starLight.position.set(0, 0.5, 0);
    warpStar.add(starLight);

    // Physics/Animation loop state
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let yPos = 0;
    let yVel = 0;
    let ringsCollected = 0;
    let flipAngle = 0;

    // Kirby Air Ride style Boost State
    let chargeLevel = 0; // 0 to 100
    let boostTime = 0;
    let boostMax = 0;
    let currentMaxBoostTime = 1.0;
    let currentSpeed = 6.0; // base speed (120 MPH)
    let heading = 0; // for track mode
    let wasBoosting = false;
    let wasDrifting = false;

    // Skid Marks pool definitions for high-speed drift line trails
    const maxSkidMarks = 250;
    const skidPool: {
      mesh: THREE.Mesh;
      active: boolean;
      life: number;
      maxLife: number;
    }[] = [];
    let nextSkidIndex = 0;

    const skidGeo = new THREE.PlaneGeometry(1, 1);
    skidGeo.rotateX(-Math.PI / 2); // Lie flat horizontally

    for (let i = 0; i < maxSkidMarks; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      });
      const m = new THREE.Mesh(skidGeo, mat);
      m.visible = false;
      scene.add(m);
      skidPool.push({
        mesh: m,
        active: false,
        life: 0,
        maxLife: 4.0,
      });
    }

    const addSkidMark = (pointA: THREE.Vector3, pointB: THREE.Vector3) => {
      const segment = skidPool[nextSkidIndex];
      const m = segment.mesh;

      // Calculate midpoint on road
      const mid = new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5);
      mid.y += 0.02; // Small height offset to avoid z-fighting

      const diff = new THREE.Vector3().subVectors(pointB, pointA);
      const len = diff.length();
      if (len < 0.01) return;

      m.position.copy(mid);
      m.scale.set(0.18, 1, len);
      m.lookAt(pointB);

      m.visible = true;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.45;
      segment.active = true;
      segment.life = segment.maxLife;

      nextSkidIndex = (nextSkidIndex + 1) % maxSkidMarks;
    };

    let prevLeftWheelPos: THREE.Vector3 | null = null;
    let prevRightWheelPos: THREE.Vector3 | null = null;
    let hadSkidLastFrame = false;

    // Keyboard Input Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      (window as any)[`_key_${e.code}`] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      (window as any)[`_key_${e.code}`] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Track Subsystem Initialization
    const trackRegistry = new Track();
    (window as any)._trackRegistry = trackRegistry;

    const lapSystem = new LapSystem(
      3,
      (lap, maxLaps) => {
        if (lapTextRef.current) {
          lapTextRef.current.innerText = `Lap ${lap}/${maxLaps}`;
        }
        if (lap > maxLaps) {
          if (lapTextRef.current) {
            lapTextRef.current.innerText = `FINISH!`;
            lapTextRef.current.classList.add(
              "text-yellow-400",
              "animate-pulse",
            );
          }
          // Capture final lap times and trigger the premium Victory screen!
          setFinalLapTimes([...lapSystem.lapTimes]);
          setShowVictoryCard(true);
          playVictoryChime();
        }
      },
      (timeStr) => {
        if (timeTextRef.current) {
          timeTextRef.current.innerText = timeStr;
        }
      },
      (bestTimeStr) => {
        if (bestTimeTextRef.current) {
          bestTimeTextRef.current.innerText = bestTimeStr;
        }
        setBestLapTime(bestTimeStr);
        // Only count as a new record if we update it during raw race, not on initial track load (intro/countdown active)
        if (!(window as any)._introActive && !(window as any)._countdownActive) {
          setIsNewRecord(true);
        }
      },
      (allLapTimes) => {
        const listEl = document.getElementById("lap-times-list");
        const panelEl = document.getElementById("completed-laps-hud");
        if (allLapTimes.length === 0) {
          if (panelEl) {
            panelEl.style.display = "none";
          }
          if (listEl) {
            listEl.innerHTML = ``;
          }
          const summaryAvgEl = document.getElementById("lap-summary-avg");
          if (summaryAvgEl) summaryAvgEl.innerText = "";
        } else {
          if (panelEl) {
            panelEl.style.display = "block";
          }
          if (listEl) {
            let html = "";
            let totalMs = 0;
            allLapTimes.forEach((timeStr, idx) => {
              const parts = timeStr.split(":");
              let secPart = parts[1] || "0";
              const secs = parseFloat(secPart);
              const mins = parseInt(parts[0] || "0", 10);
              const lapMs = (mins * 60 + secs) * 1000;
              totalMs += lapMs;

              html += `
                <div class="flex justify-between items-center py-1 border-b border-white/5 last:border-0 px-1 rounded text-[11px]">
                  <span class="text-white/40 font-bold text-[9px] tracking-widest">LAP ${idx + 1}</span>
                  <span class="text-[#eb91aa] font-mono font-bold font-black">${timeStr}</span>
                </div>
              `;
            });
            listEl.innerHTML = html;

            const avgMs = totalMs / allLapTimes.length;
            const avgMins = Math.floor(avgMs / 60000);
            const avgSecs = Math.floor((avgMs % 60000) / 1000);
            const avgMillis = Math.floor(avgMs % 1000);
            const avgStr = `${avgMins.toString().padStart(2, "0")}:${avgSecs.toString().padStart(2, "0")}.${avgMillis.toString().padStart(3, "0")}`;
            const summaryAvgEl = document.getElementById("lap-summary-avg");
            if (summaryAvgEl) {
              summaryAvgEl.innerText = `Avg: ${avgStr}`;
            }
          }
        }
      }
    );
    trackRegistry.register("laps", lapSystem);

    trackRegistry.init(trackGroup);

    // Reusable Three.js objects for loop-level performance optimization (garbage-collection free)
    const sharedRaycaster = new THREE.Raycaster();
    const originVec = new THREE.Vector3();
    const upVec = new THREE.Vector3(0, 1, 0);
    const downVec = new THREE.Vector3(0, -1, 0);
    const closestRayDir = new THREE.Vector3();
    const wallNormal = new THREE.Vector3();
    const slideDir = new THREE.Vector3();
    const reflectDir = new THREE.Vector3();
    const sparkVel = new THREE.Vector3();
    const driftVel = new THREE.Vector3();
    const trailVel = new THREE.Vector3();
    const localOffset = new THREE.Vector3();
    const slideOffset = new THREE.Vector3();
    const backVel = new THREE.Vector3();
    const targetCamPos = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3();
    const tempTrailPos = new THREE.Vector3();
    const rollAxis = new THREE.Vector3();
    const preallocatedRayDirs = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3()
    ];

      // 5. Render Loop
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        // Clamp delta time to maximum of 0.1s to prevent extreme physics teleportation and time hops during rendering or GC lag!
        const dt = Math.min(clock.getDelta(), 0.1);

        // Update water shader time uniform for dynamic waves & ripples
        if ((window as any)._waterCore && (window as any)._waterCore.material) {
          const mat = (window as any)._waterCore.material as any;
          if (mat.userData && mat.userData.shader) {
            mat.userData.shader.uniforms.time.value = clock.getElapsedTime();
          }
        }

        // Update slowly spinning sails/blades of windmills on the cozy globe
        if ((window as any)._spinningBlades) {
          for (let s = 0; s < (window as any)._spinningBlades.length; s++) {
            const blade = (window as any)._spinningBlades[s];
            if (blade) {
              blade.rotation.z += 1.2 * dt;
            }
          }
        }

        // Intro cinematic timer update
        if ((window as any)._introActive) {
          (window as any)._introTime = ((window as any)._introTime || 0) + dt;
          if ((window as any)._introTime >= 4.5) {
            (window as any)._introActive = false;
            if (typeof (window as any)._triggerCountdown === "function") {
              (window as any)._triggerCountdown();
            }
          }
        }

        // Real-time Audio Frequency parsing for Audio Reactive animations (Option 2)
        let bass = 0.0;
        let mids = 0.0;
        let highs = 0.0;
        if ((window as any)._audioAnalyser && (window as any)._audioDataArray) {
          const analyser = (window as any)._audioAnalyser;
          const dataArray = (window as any)._audioDataArray;
          analyser.getByteFrequencyData(dataArray);

          let lowSum = 0;
          let midSum = 0;
          let highSum = 0;

          // Split 128 frequency bands (calculated via fftSize 256)
          for (let i = 0; i < 16; i++) lowSum += dataArray[i];      // Low bass frequencies (0 - 15)
          for (let i = 16; i < 64; i++) midSum += dataArray[i];     // Mid vocals & lead synths (16 - 63)
          for (let i = 64; i < 128; i++) highSum += dataArray[i];   // High hi-hats & noise accents (64 - 127)

          bass = lowSum / 16 / 255;
          mids = midSum / 48 / 255;
          highs = highSum / 64 / 255;
        }
        (window as any)._bass = bass;
        (window as any)._mids = mids;
        (window as any)._highs = highs;

      // Check for model switch request
      if ((window as any)._requestedModel && (window as any)._requestedModel !== (window as any)._currentModelName) {
        avatar.switchTo((window as any)._requestedModel);
      }

      if ((window as any)._modeSwitch) {
        const newMode = (window as any)._modeSwitch;
        (window as any)._modeSwitch = null;
        (window as any)._mode = newMode;
        (window as any)._smoothedLookAt = undefined;
        (window as any)._smoothedSlopeY = undefined;

        if (newMode === "globe") {
          ringsCollected = 0;
          if (globeRingsCollectedRef.current) {
            globeRingsCollectedRef.current.innerText = "0";
          }
          if ((window as any)._ringGates) {
            ((window as any)._ringGates as any[]).forEach((r: any) => {
              r.collected = false;
              if (r.mesh) {
                r.mesh.visible = true;
              }
            });
          }
        }

        heading = 0;
        (window as any)._actualTravelDir = undefined;
        warpStar.position.set(0, 0, 0);
        camera.position.set(0, 3.5, 8);
        controls.target.set(0, 1.5, 0);
        currentSpeed = 0; // Reset player velocity for restart transition!

        // Dispose previous celebration particles to keep memory and scene completely pristine!
        if (celebrationParticles.length > 0) {
          celebrationParticles.forEach((p) => {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            if (Array.isArray(p.mesh.material)) {
              p.mesh.material.forEach((m) => m.dispose());
            } else {
              p.mesh.material.dispose();
            }
          });
          celebrationParticles.length = 0;
        }

        if (newMode === "track") {
          const trackType = (window as any)._appMode;
          if (trackType === "track_oval") {
            heading = -Math.PI / 2; // Face +X
            warpStar.position.set(-10, 0, 39); // Start slightly behind finish line (was 30)
            camera.position.set(-18, 3.5, 39);
            controls.target.set(-10, 1.5, 39);
          } else if (trackType === "track_retro") {
            heading = 0; // Face -Z (Up on screen)
            warpStar.position.set(130, 0, 35); // Start slightly behind finish line
            camera.position.set(130, 3.5, 43);
            controls.target.set(130, 1.5, 35);
          } else if (trackType === "track_rail") {
            heading = -Math.PI / 2;
            warpStar.position.set(-10, 0, 51); // Was 45
            camera.position.set(-18, 3.5, 51);
            controls.target.set(-10, 1.5, 51);
          } else if (trackType === "track_nebula") {
            heading = -Math.PI / 2;
            warpStar.position.set(0, 2, 20);
            camera.position.set(-8, 5.5, 20);
            controls.target.set(0, 1.5, 20);
          } else if (trackType === "track_planner") {
            heading = 0;
            warpStar.position.set(0, 0, 0);
            camera.position.set(0, 3.5, 8);
            controls.target.set(0, 1.5, 0);
          } else if (trackType === "track_custom") {
            heading = 0;
            warpStar.position.set(0, 0, 0);
            camera.position.set(0, 3.5, 8);
            controls.target.set(0, 1.5, 0);
          } else if (trackType === "track_abyss") {
            heading = 0;
            warpStar.position.set(0, 150, 200);
            camera.position.set(0, 153.5, 208);
            controls.target.set(0, 151.5, 200);
          }

          // Record start parameters for the intro cinematic
          (window as any)._introStartPos = warpStar.position.clone();
          (window as any)._introStartHeading = heading;
          (window as any)._introActive = true;
          (window as any)._introTime = 0;
          (window as any)._introBaseHeight = undefined;

          if ((window as any)._scene) {
            const s = (window as any)._scene as THREE.Scene;
            let bgColor = 0x101116;
            let fogDensity = 0.0015;

            if (trackType === "track_oval") {
              bgColor = 0x0a0614;
              fogDensity = 0.001;
            } else if (trackType === "track_retro") {
              bgColor = 0x05030e;
              fogDensity = 0.001;
            } else if (trackType === "track_rail") {
              bgColor = 0x020811;
              fogDensity = 0.0015;
            } else if (trackType === "track_nebula") {
              bgColor = 0x010103;
              fogDensity = 0.0005;
            } else if (trackType === "track_custom") {
              bgColor = 0x0a0015;
              fogDensity = 0.0008;
            } else if (trackType === "track_abyss") {
              bgColor = 0x010815;
              fogDensity = 0.0035;
            }

            if ((window as any)._currentBgColorHex !== bgColor) {
              if (s.background && s.background instanceof THREE.Color) {
                s.background.setHex(bgColor);
              } else {
                s.background = new THREE.Color(bgColor);
              }
              if (s.fog && s.fog instanceof THREE.FogExp2) {
                s.fog.color.setHex(bgColor);
              }
              (window as any)._currentBgColorHex = bgColor;
            }
            if (s.fog && s.fog instanceof THREE.FogExp2) {
              s.fog.density = fogDensity;
            }
          }

          ground.visible = false;
          cloudsGroup.visible = false;
          if ((window as any)._trackGroup)
            (window as any)._trackGroup.visible = true;
          trackRegistry.init(trackGroup);
          if (lapTextRef.current) {
            lapTextRef.current.classList.remove(
              "text-yellow-400",
              "animate-pulse",
            );
          }
        } else {
          if ((window as any)._scene) {
            const s = (window as any)._scene as THREE.Scene;
            const skyColor = 0xd4eaff;
            if ((window as any)._currentBgColorHex !== skyColor) {
              if (s.background && s.background instanceof THREE.Color) {
                s.background.setHex(skyColor);
              } else {
                s.background = new THREE.Color(skyColor);
              }
              if (s.fog && s.fog instanceof THREE.FogExp2) {
                s.fog.color.setHex(skyColor);
              }
              (window as any)._currentBgColorHex = skyColor;
            }
            if (s.fog && s.fog instanceof THREE.FogExp2) {
              s.fog.density = 0.003;
            }
          }
          ground.visible = true;
          cloudsGroup.visible = true;
          if ((window as any)._trackGroup)
            (window as any)._trackGroup.visible = false;
        }
      }

      // Read combined inputs (UI touches + Keyboard)
      const isGlobeMode = (window as any)._mode === "globe" || !(window as any)._mode;

      let chargeInput =

        (window as any)._previewCharging ||
        (window as any)["_key_Space"] ||
        (window as any)["_key_ShiftLeft"] ||
        (window as any)["_key_ShiftRight"];
      let leftInput =
        (window as any)._previewLeft ||
        (window as any)["_key_ArrowLeft"] ||
        (window as any)["_key_KeyA"];
      let rightInput =
        (window as any)._previewRight ||
        (window as any)["_key_ArrowRight"] ||
        (window as any)["_key_KeyD"];
      let spinInput =
        (window as any)._previewSpin ||
        (window as any)["_key_KeyE"] ||
        (window as any)["_key_KeyF"];
      
      // Arcady Drift State Machine:
      // Initiate drift if holding Charge button AND steering Left or Right.
      // Persist drifting as long as Charge is held down (even if they let go of left/right temporarily to adjust slide).
      if (chargeInput) {
        if (leftInput || rightInput) {
          (window as any)._isCurrentlyDrifting = true;
        }
      } else {
        (window as any)._isCurrentlyDrifting = false;
      }
      
      const isDriftingMode = !!((window as any)._isCurrentlyDrifting && (window as any)._mode === "track");
      let driftInput = (window as any)._previewDrift || isDriftingMode;

      const crashInput = (window as any)._previewCrash;
      const winInput = (window as any)._previewWin;

      const lapSystem = (window as any)._trackRegistry?.subsystems?.get("laps");
      const isRaceFinished = !!(lapSystem && lapSystem.isFinished);

      if ((window as any)._countdownActive || (window as any)._introActive || isRaceFinished) {
        chargeInput = false;
        leftInput = false;
        rightInput = false;
        spinInput = false;
        driftInput = false;
      }

      if (isGlobeMode) {
        chargeInput = false; // Disable braking/charging in globe mode to avoid action binding conflicts
      }

      if ((window as any)._previewShoot) {
        avatar.triggerShoot();
        (window as any)._previewShoot = false;

        // Spawn star bit projectile
        const p = new THREE.Mesh(projectileGeo, projectileMat);
        p.position.copy(warpStar.position);
        p.position.y += 0.8; // Cat's shoulder height
        p.position.x += 0.6; // Right hand offset
        p.position.z -= 0.5; // Slightly ahead

        scene.add(p);
        projectiles.push({
          mesh: p,
          vel: new THREE.Vector3(0, 0, -40.0), // Fast forward into the screen
          life: 1.5,
        });
      }
      if ((window as any)._previewHit) {
        avatar.triggerHit();
        (window as any)._previewHit = false;
      }

      let avatarState: "normal" | "crashed" | "victory" = "normal";
      if (crashInput) avatarState = "crashed";
      else if (winInput || isRaceFinished) avatarState = "victory";

      // Always moving loosely forward in this runner simulation, but supports stationary state in Globe Mode
      const currentlyMoving = avatarState === "normal" && (!isGlobeMode || Math.abs(currentSpeed) > 0.05);

      // Bank target
      let targetBank = 0;
      if (leftInput) targetBank -= 1;
      if (rightInput) targetBank += 1;
      (window as any)._curBank = THREE.MathUtils.lerp(
        (window as any)._curBank || 0,
        targetBank,
        10 * dt,
      );
      const bankAngle = (window as any)._curBank;

      // Jumping & Charging Physics (Boost Dart)
      const prevCharge = (window as any)._prevCharge;
      if (prevCharge && !chargeInput && yPos === 0) {
        // Scale vertical hop based on how much was charged
        yVel = 4.0 + (chargeLevel / 100) * 1.5; // Dynamic height (softer)

        // Trigger Speed Boost immediately upon release
        if (chargeLevel > 20 && avatarState === "normal") {
          boostTime = 0.4 + (chargeLevel / 100) * 0.6; // Crisper, controlled duration
          boostMax = (chargeLevel / 100) * 5.2; // Distinct satisfying boost speed (was 3.2, original was 12.0)
        }

        // Auto barrel roll / spin if it was a decent boost
        if (chargeLevel > 50) {
          (window as any)._targetBarrelRoll =
            ((window as any)._targetBarrelRoll || 0) +
            Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1);
        }
      }
      (window as any)._prevCharge = chargeInput;

      // Trick Spin Logic
      if ((window as any)._targetSpin === undefined) {
        (window as any)._targetSpin = 0;
        (window as any)._currentSpin = 0;
        (window as any)._targetBarrelRoll = 0;
        (window as any)._currentBarrelRoll = 0;
      }
      if (spinInput && !(window as any)._prevSpin) {
        (window as any)._targetSpin += Math.PI * 4; // 720 degree flat spin
      }
      (window as any)._prevSpin = spinInput;
      (window as any)._currentSpin = THREE.MathUtils.lerp(
        (window as any)._currentSpin,
        (window as any)._targetSpin,
        8 * dt,
      );
      (window as any)._currentBarrelRoll = THREE.MathUtils.lerp(
        (window as any)._currentBarrelRoll,
        (window as any)._targetBarrelRoll,
        10 * dt,
      );

      const throttleInput = isGlobeMode && !!((window as any)._key_ArrowUp || (window as any)._key_KeyW);
      const reverseInput = isGlobeMode && !!((window as any)._key_ArrowDown || (window as any)._key_KeyS);
      const climbInput = isGlobeMode && !!((window as any)._key_Space);
      const descendInput = isGlobeMode && !!((window as any)._key_ShiftLeft || (window as any)._key_ShiftRight);

      if (isGlobeMode) {
        if (climbInput) {
          yPos = Math.min(45.0, yPos + 16.0 * dt);
        } else if (descendInput) {
          yPos = Math.max(0.0, yPos - 18.0 * dt);
        } else {
          // Soft hovering descent: if they are aloft, glide slowly downwards so they don't stay high-up forever without effort, keeping it cozy and relaxing
          if (yPos > 0.05) {
            yPos = Math.max(0.0, yPos - 1.2 * dt);
          }
        }
        yVel = 0;
      } else {
        if (yPos > 0 || yVel !== 0) {
          // Dynamic Gravity: Glide if not charging, fall heavy if charging
          const gravity = chargeInput ? 35.0 : 12.0;
          yVel -= gravity * dt;
          yPos += yVel * dt;
          if (yVel < -12) yVel = -12; // Terminal velocity

          if (yPos < 0) {
            // Landing
            yPos = 0;
            yVel = 0;
            flipAngle = 0;

            // Soft landing visual impact
            camera.position.y -= 0.15 + (chargeLevel / 100) * 0.15;
            (window as any)._targetBarrelRoll =
              Math.round((window as any)._targetBarrelRoll / (Math.PI * 2)) *
              (Math.PI * 2); // Smoothly finish roll
          }
        }
      }

      const isPlannerMode = (window as any)._appMode === "track_planner";
      if ((window as any)._introActive) {
        controls.minDistance = 1;
        controls.maxDistance = 500;
        controls.enabled = false;
        controls.enableDamping = false;
      } else if (isRaceFinished) {
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controls.enabled = false;
        controls.enableDamping = true;
        if (!isGlobeMode) {
          controls.update();
        }
      } else {
        controls.minDistance = 3;
        controls.maxDistance = 15;
        controls.enabled = !isPlannerMode && !isGlobeMode;
        controls.enableDamping = true;
        if (!isGlobeMode) {
          controls.update();
        }
      }

      // Environment animation
      cloudsGroup.rotation.y -= (chargeInput ? 0.02 : 0.08) * dt; // Slow world while charging

      // Warp Star tilts & dynamic spins
      let targetTiltX = 0;
      if (isGlobeMode) {
        if (climbInput) {
          targetTiltX = -Math.PI / 6; // climb nose up
        } else if (descendInput) {
          targetTiltX = Math.PI / 6; // dive nose down
        } else {
          targetTiltX = currentlyMoving ? Math.PI / 18 : 0;
        }
      } else {
        if (chargeInput) {
          targetTiltX = -Math.PI / 10; // Brake / pull up nose (gentler)
        } else if (yPos > 0) {
          // In air dart animation
          targetTiltX = yVel > 0 ? -Math.PI / 8 : Math.PI / 12; // Gentler ascent/descent
        } else if (boostTime > 0) {
          // Boosting on ground
          targetTiltX = Math.PI / 6; // Lean aggressive forward
        } else {
          // Normal cruising
          targetTiltX = currentlyMoving ? Math.PI / 16 : 0;
        }
      }

      let targetTiltZ = currentlyMoving
        ? Math.sin(clock.getElapsedTime() * 12) * 0.1
        : 0;
      targetTiltZ += bankAngle * -0.5; // Star leans into turns
      if (isDriftingMode) {
        targetTiltZ += bankAngle * -0.25; // Lean extra deep into drift corners
      }
      targetTiltZ += (window as any)._currentBarrelRoll; // Add barrel roll twist

      warpStar.rotation.x = THREE.MathUtils.lerp(
        warpStar.rotation.x,
        targetTiltX,
        10 * dt,
      );
      warpStar.rotation.z = THREE.MathUtils.lerp(
        warpStar.rotation.z,
        targetTiltZ,
        10 * dt,
      );
      warpStar.rotation.y = heading + (window as any)._currentSpin;

      // Squash and Stretch "Alive" Logic
      const squashScaleX =
        1.0 +
        (currentlyMoving && yPos === 0
          ? Math.sin(clock.getElapsedTime() * 20) * 0.06
          : Math.sin(clock.getElapsedTime() * 4) * 0.03);
      const squashScaleY =
        1.0 -
        (currentlyMoving && yPos === 0
          ? Math.sin(clock.getElapsedTime() * 20) * 0.06
          : Math.sin(clock.getElapsedTime() * 4) * 0.03); // Volume preservation
      warpStar.scale.set(squashScaleX, squashScaleY, squashScaleX);

      // Bloom / Emissive Pulse for Warp Star
      if (warpStar.userData.mainMaterial && warpStar.userData.detailMaterial) {
        if (chargeInput) {
          const pulse = (Math.sin(clock.getElapsedTime() * 10) + 1) / 2; // 0 to 1 smooth pulse
          warpStar.userData.mainMaterial.emissiveIntensity =
            THREE.MathUtils.lerp(
              warpStar.userData.mainMaterial.emissiveIntensity,
              0.4 + pulse * 0.4,
              10 * dt,
            );
          warpStar.userData.detailMaterial.emissiveIntensity =
            THREE.MathUtils.lerp(
              warpStar.userData.detailMaterial.emissiveIntensity,
              0.7 + pulse * 0.4,
              10 * dt,
            );
          starLight.intensity = THREE.MathUtils.lerp(
            starLight.intensity,
            1.2 + pulse * 1.0,
            10 * dt,
          );
        } else {
          warpStar.userData.mainMaterial.emissiveIntensity =
            THREE.MathUtils.lerp(
              warpStar.userData.mainMaterial.emissiveIntensity,
              0.25,
              5 * dt,
            );
          warpStar.userData.detailMaterial.emissiveIntensity =
            THREE.MathUtils.lerp(
              warpStar.userData.detailMaterial.emissiveIntensity,
              0.45,
              5 * dt,
            );
          starLight.intensity = THREE.MathUtils.lerp(
            starLight.intensity,
            0.8,
            5 * dt,
          );
        }
      }

      // Kirby Air Ride style Boost Logic
      let targetSpeed = 6.0;
      if (isGlobeMode) {
        if (throttleInput) {
          targetSpeed = 3.6; // High speed free roaming
        } else if (reverseInput) {
          targetSpeed = -2.0; // Dynamic reverse!
        } else {
          targetSpeed = 0.0; // Drift/coast to peaceful stop
        }
      }

      if (chargeInput && avatarState === "normal" && yPos === 0) {
        if (isDriftingMode) {
          // Go into a drift mode instead of braking. Scrub off speed (controlled brake-slide) to discourage straight-line drift spamming!
          targetSpeed = isGlobeMode ? 1.2 : 3.2;
          // Build up boost charge at a snappy, balanced rate (about 0.8 seconds to reach 100%)
          chargeLevel = Math.min(100, chargeLevel + 120.0 * dt);
        } else {
          // No right or left movement + drift is pressed = behaves like linear brake charging
          targetSpeed = isGlobeMode ? 0.4 : 1.0;
          chargeLevel = Math.min(100, chargeLevel + 85.0 * dt);
        }
      } else {
        chargeLevel = Math.max(0, chargeLevel - 200 * dt);
      }

      if (boostTime > 0) {
        boostTime -= dt;
        targetSpeed += isGlobeMode ? boostMax * 0.4 : boostMax; // Boost in globe is gentle & cozy
        if (boostTime <= 0) boostMax = 0;
      }

      if (isPlannerMode) {
        targetSpeed *= 0.5;

        let plannerPts = (window as any)._plannerPts;
        if (!plannerPts) {
          plannerPts = [];
          (window as any)._plannerPts = plannerPts;
        }
        const lastPt = plannerPts[plannerPts.length - 1];
        if (!lastPt || lastPt.distanceTo(warpStar.position) > 4) {
          const p = warpStar.position.clone();
          plannerPts.push(p);

          const sphereGeo = new THREE.SphereGeometry(1, 4, 4);
          const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true,
          });
          const mesh = new THREE.Mesh(sphereGeo, sphereMat);
          mesh.position.copy(p);
          scene.add(mesh);

          console.log(
            `new THREE.Vector3(${Math.round(p.x)}, ${Math.round(p.y)}, ${Math.round(p.z)}),`,
          );
        }
      }

      // Dynamic Absolute Speed Limit: normal play stays capped at 8.5 (170 MPH). 
      // Active boost opens the ceiling dynamically up to 15.0 depending on the boost power to maintain pristine controls and thrilling speed!
      let absoluteMax = isGlobeMode ? 3.5 : 8.5;
      if (boostTime > 0) {
        absoluteMax = Math.min(isGlobeMode ? 4.5 : 15.0, Math.max(isGlobeMode ? 3.5 : 12.0, absoluteMax + boostMax));
      }
      if (isGlobeMode) {
        targetSpeed = Math.max(-2.5, Math.min(targetSpeed, absoluteMax));
      } else {
        targetSpeed = Math.min(targetSpeed, absoluteMax);
      }

      if (isRaceFinished) {
        // Steady, graceful victory cruise
        targetSpeed = 2.0;
      }

      if (avatarState === "crashed" || (window as any)._countdownActive || (window as any)._introActive)
        targetSpeed = 0;

      // Slower speed decay when coming out of a high speed boost or drift (2.2 * dt instead of 5 * dt), maintaining satisfying forward inertia
      const lerpSpeed = currentSpeed > targetSpeed ? 2.2 : 5.0;
      currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, lerpSpeed * dt);
      (window as any)._currentSpeed = currentSpeed;

      // Track Subsystems Update
      if ((window as any)._mode === "track") {
        const playerState: PlayerState = {
          position: warpStar.position,
          quaternion: warpStar.quaternion,
          chargeLevel: chargeLevel,
          isFrozen: (window as any)._countdownActive || (window as any)._introActive || isRaceFinished || false,
          heading: heading,
          setHeading: (h) => {
            heading = h;
          },
          triggerBoost: (amount, duration) => {
            boostMax = amount;
            boostTime = duration;
            // Barrel roll trigger visual
            (window as any)._targetBarrelRoll =
              ((window as any)._targetBarrelRoll || 0) + Math.PI * 2;
          },
        };
        (window as any)._playerState = playerState;
        if ((window as any)._mode === "track") {
          trackRegistry.update(dt, playerState);
        }

        if (playerDotRef.current) {
          if ((window as any)._mode === "track") {
            const node = playerDotRef.current.ownerSVGElement;
            if (node && node.getAttribute("viewBox") === "0 0 240 100") {
              playerDotRef.current.setAttribute(
                "cx",
                (warpStar.position.x + 120).toString(),
              );
              playerDotRef.current.setAttribute(
                "cy",
                (warpStar.position.z + 50).toString(),
              );
            } else {
              playerDotRef.current.setAttribute(
                "cx",
                warpStar.position.x.toString(),
              );
              playerDotRef.current.setAttribute(
                "cy",
                warpStar.position.z.toString(),
              );
            }
          }
        }
      }

      // Update UI
      if (chargeBarRef.current) {
        chargeBarRef.current.style.width = `${chargeLevel}%`;
        
        // Multi-tier visual coloring matching our spark stages!
        if (chargeLevel >= 100) {
          // Flashing high-voltage White & Cyan
          chargeBarRef.current.style.backgroundColor =
            Math.floor(clock.getElapsedTime() * 12) % 2 === 0 ? "#ffffff" : "#33ffff";
        } else if (chargeLevel >= 80) {
          // Level 3: Neon Pink
          chargeBarRef.current.style.backgroundColor = "#ff33bb";
        } else if (chargeLevel >= 40) {
          // Level 2: Gold/Orange
          chargeBarRef.current.style.backgroundColor = "#ffaa00";
        } else {
          // Level 1: Cool Blue
          chargeBarRef.current.style.backgroundColor = "#33aaff";
        }
      }

      if (boostBarRef.current && boostIndicatorRef.current) {
        if (boostTime > 0) {
          if (boostTime > currentMaxBoostTime) {
            currentMaxBoostTime = boostTime;
          }
          const boostPct = Math.min(100, Math.max(0, (boostTime / currentMaxBoostTime) * 100));
          boostBarRef.current.style.width = `${boostPct}%`;
          boostIndicatorRef.current.style.opacity = "1";
          
          if (boostPct > 70) {
            boostBarRef.current.style.backgroundColor = "#ff00bb"; // Magenta high performance
          } else if (boostPct > 35) {
            boostBarRef.current.style.backgroundColor = "#00ffee"; // Radiant cyan electric power
          } else {
            boostBarRef.current.style.backgroundColor = "#33aaff"; // Light blue depletion
          }
        } else {
          boostBarRef.current.style.width = "0%";
          boostIndicatorRef.current.style.opacity = "0";
          currentMaxBoostTime = 0.01;
        }
      }

      if (speedTextRef.current) {
        speedTextRef.current.innerText = Math.round(
          currentSpeed * 20,
        ).toString();
      }

      // Steer heading in Globe Mode (always active, supporting stationary yaw turns)
      if (isGlobeMode) {
        const turnRate = 2.4; // Sweet responsive rotation
        heading -= bankAngle * turnRate * dt;
        heading = (heading + Math.PI * 2) % (Math.PI * 2);
      }

      // Movement Logic and Particle Emitters
      if (currentlyMoving) {
        if ((window as any)._mode === "track") {
          // Make normal steering wider/gentler so player actually *needs* to drift in corners!
          // Understeer at high speeds: normal steering turn rate is lower.
          // Drifting provides much stronger rotation torque to pivot the ship around!
          let turnRate = 1.5;
          if (isDriftingMode) {
            // Pivoting speed is much faster, letting you aim the ship nose sharply into the bend
            turnRate = 2.5;
          }
          // Steer heading
          heading -= bankAngle * turnRate * dt;

          const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            heading,
          );

          if ((window as any)._actualTravelDir === undefined) {
            (window as any)._actualTravelDir = dir.clone();
          }

          let actualTravelDir = (window as any)._actualTravelDir as THREE.Vector3;
          
          if (isDriftingMode) {
            // Sweet lateral slide: Actual travel direction lerps slowly (lower grip), causing a nice centrifugal slide.
            // 4.2 provides a perfect balance of sliding feel and control so you don't instantly fly off-track!
            actualTravelDir.lerp(dir, 4.2 * dt);
          } else {
            // High grip snaps to the target direction
            actualTravelDir.lerp(dir, 16.0 * dt);
          }
          actualTravelDir.normalize();
          (window as any)._actualTravelDir = actualTravelDir;

          const totalDist = currentSpeed * 8.0 * dt;

          // Subdivide movement for peak collision precision and absolute zero tunneling!
          // We limit the maximum physical step size to 0.5 units per iteration.
          const maxStepSize = 0.5;
          const numSteps = Math.max(1, Math.ceil(totalDist / maxStepSize));
          const stepDist = totalDist / numSteps;
          const stepDt = dt / numSteps;

          for (let step = 0; step < numSteps; step++) {
            // Wall collision detection based on actual movement direction
            let hitWall = false;
            let closestHit: any = null;

            if (
              (window as any)._mode === "track" &&
              (window as any)._trackGroup
            ) {
              originVec.set(
                warpStar.position.x,
                warpStar.position.y + 0.5,
                warpStar.position.z,
              );

              // Cast 7 rays to cover a wide physical sphere of the vehicle (front, diagonals, sides, and rear diagonals for extreme drifting)
              preallocatedRayDirs[0].copy(actualTravelDir); // front center
              preallocatedRayDirs[1].copy(actualTravelDir).applyAxisAngle(upVec, Math.PI / 4);  // front-left diagonal
              preallocatedRayDirs[2].copy(actualTravelDir).applyAxisAngle(upVec, -Math.PI / 4); // front-right diagonal
              preallocatedRayDirs[3].copy(actualTravelDir).applyAxisAngle(upVec, Math.PI / 2);  // left flank
              preallocatedRayDirs[4].copy(actualTravelDir).applyAxisAngle(upVec, -Math.PI / 2); // right flank
              preallocatedRayDirs[5].copy(actualTravelDir).applyAxisAngle(upVec, (3 * Math.PI) / 4);  // back-left diagonal
              preallocatedRayDirs[6].copy(actualTravelDir).applyAxisAngle(upVec, -(3 * Math.PI) / 4); // back-right diagonal

              const rayDistances = [
                Math.max(stepDist + 1.2, 1.5),         // front center
                Math.max(stepDist * 0.86 + 1.2, 1.4),  // front-left diagonal
                Math.max(stepDist * 0.86 + 1.2, 1.4),  // front-right diagonal
                Math.max(stepDist * 0.70 + 1.2, 1.4),  // left flank
                Math.max(stepDist * 0.70 + 1.2, 1.4),  // right flank
                Math.max(stepDist * 0.50 + 1.2, 1.4),  // back-left diagonal
                Math.max(stepDist * 0.50 + 1.2, 1.4),  // back-right diagonal
              ];

              // Caching wall meshes to avoid intersecting high-polygon GLTF trees or other meshes, preventing lag spikes!
              const currentAppMode = (window as any)._appMode;
              if (!(window as any)._cachedWallMeshes || (window as any)._cachedWallTrackMode !== currentAppMode) {
                const walls: THREE.Object3D[] = [];
                (window as any)._trackGroup.traverse((child: any) => {
                  if (child.isMesh && child.userData.isWall) {
                    walls.push(child);
                  }
                });
                if (walls.length > 0) {
                  (window as any)._cachedWallMeshes = walls;
                  (window as any)._cachedWallTrackMode = currentAppMode;
                }
              }

              const wallTargets = (window as any)._cachedWallMeshes;
              if (wallTargets && wallTargets.length > 0) {
                for (let i = 0; i < preallocatedRayDirs.length; i++) {
                  sharedRaycaster.set(originVec, preallocatedRayDirs[i]);
                  sharedRaycaster.near = 0;
                  sharedRaycaster.far = rayDistances[i];
                  const wallHits = sharedRaycaster.intersectObjects(wallTargets, true);

                  if (wallHits.length > 0 && wallHits[0].face) {
                    const hit = wallHits[0];
                    if (!closestHit || hit.distance < closestHit.distance) {
                      closestHit = hit;
                      closestRayDir.copy(preallocatedRayDirs[i]);
                      hitWall = true;
                    }
                  }
                }
              } else {
                for (let i = 0; i < preallocatedRayDirs.length; i++) {
                  sharedRaycaster.set(originVec, preallocatedRayDirs[i]);
                  sharedRaycaster.near = 0;
                  sharedRaycaster.far = rayDistances[i];
                  const wallHits = sharedRaycaster
                    .intersectObject((window as any)._trackGroup, true)
                    .filter((hit) => hit.object.userData.isWall);

                  if (wallHits.length > 0 && wallHits[0].face) {
                    const hit = wallHits[0];
                    if (!closestHit || hit.distance < closestHit.distance) {
                      closestHit = hit;
                      closestRayDir.copy(preallocatedRayDirs[i]);
                      hitWall = true;
                    }
                  }
                }
              }

              if (closestHit && closestHit.face) {
                wallNormal.copy(closestHit.face.normal).transformDirection(closestHit.object.matrixWorld);
                wallNormal.y = 0;
                wallNormal.normalize();

                // Force the wall normal to always face against the incoming player ray for absolute double-sided solidity
                if (wallNormal.dot(closestRayDir) > 0) {
                  wallNormal.negate();
                }
              }
            }

            if (hitWall && closestHit) {
              const crashSeverity = actualTravelDir.dot(wallNormal); // negative if heading into wall (angle < 90 deg)
              
              // Calculate mathematically correct perpendicular distance to the wall plane
              const perpDistance = closestHit.distance * Math.abs(closestRayDir.dot(wallNormal));
              const vehicleRadius = 1.35;
              const penetration = vehicleRadius - perpDistance;

              if (crashSeverity < -0.01) {
                // Heading into the wall -> Project onto the wall to slide smoothly!
                slideDir.copy(actualTravelDir).projectOnPlane(wallNormal);
                if (slideDir.lengthSq() > 0.01) {
                  slideDir.normalize();
                  
                  // Softly deflect the heading to follow along the wall using shortest-arc interpolation to prevent wrap-around glitches
                  const targetHeading = Math.atan2(-slideDir.x, -slideDir.z);
                  let diff = targetHeading - heading;
                  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
                  heading += diff * Math.min(1.0, 12 * stepDt);

                  // Move forward along the wall slide direction
                  warpStar.position.addScaledVector(slideDir, stepDist * 0.95); // High momentum preservation when sliding!
                  actualTravelDir.copy(slideDir);
                } else {
                  warpStar.position.addScaledVector(actualTravelDir, stepDist);
                }

                // Scrub off speed based on severity of crash (less harsh for shallow angles)
                const absSeverity = Math.abs(crashSeverity); // 1 = direct head-on, 0 = parallel
                const speedFactor = 1.0 - (0.15 * absSeverity * stepDt * 60); 
                currentSpeed = Math.max(1.0, currentSpeed * Math.max(0.7, speedFactor));
              } else {
                // Moving away from or parallel to the wall -> Free movement, no speed reduction or projection needed!
                warpStar.position.addScaledVector(actualTravelDir, stepDist);
              }

              // Proportional Push-Out: prevent clipping without jitter or snapping!
              if (penetration > 0) {
                warpStar.position.addScaledVector(wallNormal, Math.min(2.0, penetration * 1.1));
              }

              // --- Generate Beautiful wall-scraping sparks at the contact point ---
              // Sparks occur if we are heading into the wall or if we are actively scraping (penetration > 0)
              if ((crashSeverity < -0.05 || penetration > 0) && Math.random() > 0.1) {
                // Spray scraping sparks backwards relative to the ship's sliding direction, with a bit of outwards bounce
                reflectDir.copy(actualTravelDir).multiplyScalar(-1).addScaledVector(wallNormal, 0.4).normalize();
                const sprayAngle = Math.atan2(-reflectDir.x, -reflectDir.z) + (Math.random() - 0.5) * 0.8;
                const spraySpeed = 5.0 + Math.random() * 10.0;

                const sparkLife = 0.2 + Math.random() * 0.3;
                sparkVel.set(
                  Math.sin(sprayAngle) * spraySpeed,
                  Math.random() * 2.5 + 1.0, // send sparks flying upwards elegantly!
                  Math.cos(sprayAngle) * spraySpeed
                );
                addSpawningParticle(particleGeo, sparkMatScrape, closestHit.point, sparkVel, 0.5, sparkLife);
              }
            } else {
              // Free movement when not scraping the wall
              warpStar.position.addScaledVector(actualTravelDir, stepDist);
            }
          }

          // Audio-reactive visual systems & Wall texture speed scaling (Option 2)
          if ((window as any)._trackGroup) {
            const trackGroup = (window as any)._trackGroup;

            // Compute a highly punchy, fully procedural bass kick beat (120 BPM)
            // 120 BPM = 2.0 beats per second. Get current phase progress [0.0 to 1.0)
            const beatProgress = (clock.getElapsedTime() * 2.0) % 1.0;
            // High-fidelity analog synthesis envelope model (Immediate sharp kick attack, exponential decay):
            const bassKick = Math.exp(-beatProgress * 5.0);

            // 1. Giant Horizontally Sliced Synthwave Sun: Pulsing scale on the procedural bass beat
            const sun = trackGroup.getObjectByName("synthwaveSun");
            if (sun) {
              // Scale range expands up to 32% larger on each bass hit
              const targetScale = 1.0 + bassKick * 0.32;
              
              // Smoothly interpolate current scale to prevent visual jitter and keep transitions buttery soft
              const currentScaleX = sun.scale.x;
              const nextScale = THREE.MathUtils.lerp(currentScaleX, targetScale, 18 * dt);
              sun.scale.set(nextScale, nextScale, 1);

              // Gentle horizon floating wave effect
              const floatOffset = Math.sin(clock.getElapsedTime() * 1.5) * 0.6;
              sun.position.y = 45 + floatOffset;
            }

            // 2. High-Tech Translucent Laser Grid Walls: Speed-scaling sliding texture & procedural glow pulsars
            const wallTargets = (window as any)._cachedWallMeshes;
            if (wallTargets && wallTargets.length > 0) {
              const scrollSpeed = (currentSpeed * 0.06 + 0.04) * dt; // Perfect relative sliding speed offsets

              for (let i = 0; i < wallTargets.length; i++) {
                const wall = wallTargets[i] as THREE.Mesh;
                if (wall.material) {
                  if (Array.isArray(wall.material)) {
                    wall.material.forEach((mat: any) => {
                      if (mat.map) {
                        mat.map.offset.x -= scrollSpeed;
                      }
                      if (mat.emissiveIntensity !== undefined) {
                        // Flashes bright with procedural bass kick decays
                        mat.emissiveIntensity = 0.45 + bassKick * 2.2;
                      }
                      if (mat.opacity !== undefined) {
                        // Slightly higher opacity on the bass hit
                        mat.opacity = 0.55 + bassKick * 0.35;
                      }
                    });
                  } else {
                    const mat = wall.material as any;
                    if (mat.map) {
                      mat.map.offset.x -= scrollSpeed;
                    }
                    if (mat.emissiveIntensity !== undefined) {
                      mat.emissiveIntensity = 0.45 + bassKick * 2.2;
                    }
                    if (mat.opacity !== undefined) {
                      mat.opacity = 0.55 + bassKick * 0.35;
                    }
                  }
                }
              }
            }
          }
        }
      }

          // Dynamic chase camera
          const mode = (window as any)._appMode;
          if (scene.fog && scene.fog instanceof THREE.FogExp2) {
            if (isPlannerMode) {
              scene.fog.density = 0;
            } else if (mode === "track_oval") {
              scene.fog.density = 0.001;
            } else if (mode === "track_retro") {
              scene.fog.density = 0.001;
            } else if (mode === "track_rail") {
              scene.fog.density = 0.0015;
            } else if (mode === "track_nebula") {
              scene.fog.density = 0.0005;
            } else if (mode === "track_custom") {
              scene.fog.density = 0.0008;
            } else if (mode === "track_abyss") {
              scene.fog.density = 0.0035;
            } else {
              scene.fog.density = 0.0015;
            }
          }

          if (isPlannerMode) {
            targetCamPos.copy(warpStar.position);
            targetCamPos.y = 300; // Super high up
            targetCamPos.z += 0.1; // prevent gimbal lock
            camera.position.lerp(targetCamPos, 8 * dt);

            targetLookAt.copy(warpStar.position);
            controls.target.lerp(targetLookAt, 10 * dt);
          } else if ((window as any)._introActive) {
            // INTRO CAMERA (wide cinematic orbital shot, tracking the descending star and sweeping elegantly behind for race start)
            const introT = (window as any)._introTime || 0;

            const startPos = ((window as any)._introStartPos || warpStar.position).clone();
            
            // Query dynamic road surface height once to align camera perfectly and cache it to avoid frame-by-frame precision raycast jitter
            let introBaseHeight = (window as any)._introBaseHeight;
            if (introBaseHeight === undefined) {
              introBaseHeight = 0;
              if ((window as any)._trackGroup) {
                const testOrigin = new THREE.Vector3(startPos.x, 150.0, startPos.z);
                sharedRaycaster.set(testOrigin, downVec);
                sharedRaycaster.near = 0;
                sharedRaycaster.far = 300;
                const intersects = sharedRaycaster.intersectObject((window as any)._trackGroup, true);
                const driveableIntersects = intersects.filter(hit => hit.object.userData.isDriveable);
                if (driveableIntersects.length > 1) {
                  driveableIntersects.sort((a, b) => Math.abs(a.point.y - startPos.y) - Math.abs(b.point.y - startPos.y));
                }
                if (driveableIntersects.length > 0) {
                  introBaseHeight = driveableIntersects[0].point.y + 0.5;
                }
              }
              (window as any)._introBaseHeight = introBaseHeight;
            }
            startPos.y = introBaseHeight;

            let angle = Math.PI - 0.25; // elegant slight diagonal front-facing angle looking back
            let currentDist = 24.0;     // start at a gorgeous cinematic wider distance so details are fully in frame!
            let currentHeight = 3.5;    // clear and perfect initial camera height above track

            // Calculate the cat's exact real-time global 3D position
            const catWorldPos = new THREE.Vector3(startPos.x, introBaseHeight + 0.15, startPos.z);
            const hoverY = 0.6 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
            const progressDescent = Math.min(1.0, introT / 2.0);
            const easedDescent = 1.0 - Math.pow(1.0 - progressDescent, 3);
            const descHeight = 25.0 * (1.0 - easedDescent);
            const starY = descHeight + hoverY + introBaseHeight;

            if (introT >= 2.0 && introT < 2.7) {
              const hopProgress = (introT - 2.0) / 0.7;
              const hopHeight = Math.sin(hopProgress * Math.PI) * 1.8;
              catWorldPos.y = THREE.MathUtils.lerp(introBaseHeight + 0.15, starY + 0.15, hopProgress) + hopHeight;
            } else if (introT >= 2.7) {
              catWorldPos.y = starY + 0.15;
            }

            // 1. Star descent tracking phase (introT from 0.0 to 2.0 seconds)
            if (introT <= 2.0) {
              const progress = introT / 2.0; // 0 to 1
              // Center the camera slightly above the cat for a majestic cinematic composition, keeping both cat and track in frame while star flies in
              const targetY = THREE.MathUtils.lerp(catWorldPos.y + 4.5, catWorldPos.y + 2.0, progress);
              targetLookAt.copy(catWorldPos);
              targetLookAt.y = targetY;

              // Smooth starting zoom in during the descent to build anticipation (further back!)
              currentDist = THREE.MathUtils.lerp(42.0, 24.0, progress);
              currentHeight = THREE.MathUtils.lerp(5.5, 3.5, progress);  // starts slightly higher, low angles as star lands
            } 
            // 2. Sweeping orbit and cinematic pullback phase (introT from 2.0 to 4.5 seconds)
            else {
              const t_blend = Math.min(1.0, (introT - 2.0) / 2.5); // 0 to 1 over 2.5 seconds
              const easedBlend = t_blend * t_blend * (3 - 2 * t_blend); // Smooth cubic S-curve

              // Angle sweeps beautifully around the character from front-diagonal (Math.PI - 0.25) to straight behind (0.0):
              const startAngle = Math.PI - 0.25;
              angle = startAngle - easedBlend * startAngle;

              // Dramatic cinematic pull-back:
              // Starts at 24.0, pulls back to a wide 35.0 units max at easedBlend = 0.5, then glides back to standard gameplay (8.0)
              currentDist = 24.0 + Math.sin(easedBlend * Math.PI) * 19.0 - easedBlend * 16.0;

              if (introT >= 2.7) {
                // To keep the cat and star beautifully centered and in frame during final sweep and countdown start,
                // we expand the pull-back distance smoothly without sudden jumps at 2.7s or 4.5s.
                const t = introT - 2.7;
                let extraDist = 0;
                if (t < 0.5) {
                  const blendIn = Math.sin((t / 0.5) * Math.PI * 0.5); // smoothly blend up to peak
                  extraDist = blendIn * 16.0;
                } else {
                  const blendOut = Math.cos(((t - 0.5) / 1.3) * Math.PI * 0.5); // smoothly taper down to 0 ready for live gameplay
                  extraDist = blendOut * 16.0;
                }
                currentDist += extraDist;
              }

              // Explicitly lock target point directly on the cat pilot's mesh center!
              targetLookAt.copy(catWorldPos);
              targetLookAt.y += 1.5;

              // Height starts low (3.5), rises to a beautiful high-angle view (6.0), and then settles back to gameplay (3.5)
              currentHeight = 3.5 + Math.sin(easedBlend * Math.PI) * 2.5;
            }

            const blendedOffset = new THREE.Vector3(
              Math.sin(angle) * currentDist,
              currentHeight,
              Math.cos(angle) * currentDist
            );

            const activeHeading = (window as any)._introStartHeading !== undefined ? (window as any)._introStartHeading : heading;
            // Apply axis angle to get the vector rotated by heading
            const tempVector = blendedOffset.clone().applyAxisAngle(upVec, activeHeading);

            targetCamPos.copy(startPos).add(tempVector);

            // Direct mathematical placement - completely bypasses OrbitControls!
            camera.position.copy(targetCamPos);
            camera.lookAt(targetLookAt);
            controls.target.copy(targetLookAt);

          } else if (isRaceFinished) {
            // ENDING CAMERA (spectacular orbits around our celebrating cat piloto)
            const orbitAngle = clock.getElapsedTime() * 0.8;
            const radius = 6.5;
            const xOffset = Math.sin(orbitAngle) * radius;
            const zOffset = Math.cos(orbitAngle) * radius;
            const yOffset = 2.0 + Math.sin(clock.getElapsedTime() * 0.5) * 0.5;

            targetCamPos.copy(warpStar.position).add(new THREE.Vector3(xOffset, yOffset, zOffset));
            camera.position.lerp(targetCamPos, 3 * dt);

            targetLookAt.copy(warpStar.position);
            targetLookAt.y += 1.25;
            controls.target.lerp(targetLookAt, 8 * dt);

          } else {
            // Dynamic Field Of View: increases with speed to create an incredible feeling of speed compression, and opens up slightly when drifting!
            const targetFov = 45 + (currentSpeed * 1.6) + (isDriftingMode ? 4 : 0);
            camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6 * dt);
            camera.updateProjectionMatrix();

            if ((window as any)._smoothedSlopeY === undefined) {
              (window as any)._smoothedSlopeY = 0;
            }
            const rawSlope = (window as any)._lastSlopeY || 0;
            const targetSlope = (window as any)._isAirborneState ? -15 : rawSlope;
            (window as any)._smoothedSlopeY = THREE.MathUtils.lerp((window as any)._smoothedSlopeY, targetSlope, 4.0 * dt);
            const smoothedSlope = (window as any)._smoothedSlopeY;

            let camY = isGlobeMode ? 3.8 : 3.5;
            let camZ = isGlobeMode ? 8.5 : 8.0;

            if (smoothedSlope < 0) {
              // Descending/plunging: lift the camera high and shift it slightly closer to avoid clipping the elevated track behind, providing a nice bird's-eye view of the drop.
              camY += Math.abs(smoothedSlope) * 0.45;
              camZ -= Math.abs(smoothedSlope) * 0.12;
              camZ = Math.max(3.5, camZ);
            } else if (smoothedSlope > 0) {
              // Ascending/climbing: raise the camera slightly to look over the crest of the hill
              camY += smoothedSlope * 0.12;
            }

            localOffset.set(0, camY, camZ);
            localOffset.applyAxisAngle(upVec, heading);
            targetCamPos.copy(warpStar.position).add(localOffset);

            const camLerp = isGlobeMode ? 3.8 : 5.0; // Smooth yet responsive follow camera
            camera.position.lerp(targetCamPos, camLerp * dt);

            // In globe mode, prevent vertical lag by tracking Y position extra tightly
            if (isGlobeMode) {
              camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamPos.y, 1.0 - Math.exp(-16.0 * dt));
            }

            targetLookAt.copy(warpStar.position);
            targetLookAt.y += 1.5;

            // Shift look-at point forward when plunging steeply to bring the upcoming downward slope/track into perfect focus
            if (smoothedSlope < -2) {
              const lookAhead = new THREE.Vector3(0, smoothedSlope * 0.08, -2.5);
              lookAhead.applyAxisAngle(upVec, heading);
              targetLookAt.add(lookAhead);
            }

            let smoothedLookAt = (window as any)._smoothedLookAt;
            if (!smoothedLookAt) {
              smoothedLookAt = targetLookAt.clone();
              (window as any)._smoothedLookAt = smoothedLookAt;
            }
            smoothedLookAt.lerp(targetLookAt, 1.0 - Math.exp(-16.0 * dt));
            if (isGlobeMode) {
              camera.lookAt(smoothedLookAt);
            }
            controls.target.copy(smoothedLookAt);
          }

      if (currentlyMoving && (window as any)._mode !== "track") {
          // --- FREE EXTRA COZY ROAMING GLOBE ROLL ---
          // Rotate the globe based on the player's 360 degree heading and speed
          const moveDir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
          rollAxis.crossVectors(new THREE.Vector3(0, 1, 0), moveDir).normalize();
          
          if (Math.abs(bankAngle) > 0.01) {
            const bankRollAxis = moveDir.clone().normalize();
            rollAxis.addScaledVector(bankRollAxis, bankAngle * 0.15).normalize();
          }

          const rotationalSpeed = -(currentSpeed * 8.0 * dt) / 140; // Scale rotation perfectly relative to our massive globe's radius
          ground.rotateOnWorldAxis(rollAxis, rotationalSpeed);

          // --- COZY GLOBE INTEGRATIONS & SUBSYSTEMS ---
          // 1. Slow Rotating Directional Light Source (Day/Night Cycle)
          const hemiLight = (window as any)._hemiLight;
          const dirLight = (window as any)._dirLight;
          if (dirLight && hemiLight) {
            (window as any)._dayNightAngle = ((window as any)._dayNightAngle || 0) + 0.045 * dt;
            celestialSystem.update(
              dt,
              clock.getElapsedTime(),
              (window as any)._dayNightAngle,
              dirLight,
              hemiLight,
              scene,
              globeDayNightTextRef
            );
          }

          // 2. Multi-layered clouds slow drift rotation (parallax depth!)
          if ((window as any)._cloudLayer1) {
            (window as any)._cloudLayer1.rotation.y += 0.04 * dt;
            (window as any)._cloudLayer1.rotation.z += 0.012 * dt;
          }
          if ((window as any)._cloudLayer2) {
            (window as any)._cloudLayer2.rotation.y -= 0.016 * dt;
            (window as any)._cloudLayer2.rotation.x += 0.006 * dt;
          }

          // Active Cloud Proximity Detection & Interactive Flare-Ups / Flying Puffs
          const tempCloudWorldPos = new THREE.Vector3();
          if ((window as any)._cloudClusters) {
            const shipPos = warpStar.position;
            const clusters = (window as any)._cloudClusters as { group: THREE.Group, radius: number, isHigh: boolean }[];
            clusters.forEach((cluster) => {
              cluster.group.getWorldPosition(tempCloudWorldPos);
              const distToCloud = shipPos.distanceTo(tempCloudWorldPos);
              
              // Target scale with interactive bounce
              let targetScale = 1.0;
              if (distToCloud < 15.5) {
                targetScale = 1.25 + 0.08 * Math.sin(clock.getElapsedTime() * 7.5); // expand & pulsate organic cloud
                
                // Spawn high-fidelity fluffy puff particles from behind/around the ship
                if (currentSpeed > 1.0 && Math.random() < 0.28) {
                  const puffPos = shipPos.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2.0,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 2.0
                  ));
                  
                  const puffVel = new THREE.Vector3(
                    (Math.random() - 0.5) * 1.2,
                    0.2 + Math.random() * 0.8, // Float upwards gently
                    (Math.random() - 0.5) * 1.2
                  );
                  
                  addSpawningParticle(
                    smokeParticleGeo,
                    smokeParticleMat,
                    puffPos,
                    puffVel,
                    0.75, // max life
                    0.75 * (0.5 + Math.random() * 0.5),
                    1.4 + Math.random() * 1.0 // thick fluffy smoke scale
                  );
                }
              }
              
              // Smoothly lerp local scale
              const curScale = cluster.group.scale.x;
              const nextScale = THREE.MathUtils.lerp(curScale, targetScale, 4.5 * dt);
              cluster.group.scale.set(nextScale, nextScale, nextScale);
            });
          }

          // 3. Landmark custom animations
          if ((window as any)._spinningTelescope) {
            (window as any)._spinningTelescope.rotation.y += 0.4 * dt;
          }
          if ((window as any)._floatingLantern) {
            (window as any)._floatingLantern.position.y = 2.0 + Math.sin(clock.getElapsedTime() * 2.4) * 0.15;
            (window as any)._floatingLantern.rotation.y += 0.6 * dt;
          }
          if ((window as any)._floatingPaperBoat) {
            (window as any)._floatingPaperBoat.position.y = 1.35 + Math.sin(clock.getElapsedTime() * 1.6) * 0.06;
            (window as any)._floatingPaperBoat.rotation.y = Math.sin(clock.getElapsedTime() * 1.0) * 0.12;
          }
          if ((window as any)._starRod) {
            (window as any)._starRod.position.y = 1.7 + Math.sin(clock.getElapsedTime() * 3.0) * 0.10;
            (window as any)._starRod.rotation.y += 1.2 * dt;
          }
          if ((window as any)._whispyApples) {
            const childApps = (window as any)._whispyApples.children;
            for (let i = 0; i < childApps.length; i++) {
              childApps[i].scale.setScalar(1.0 + Math.sin(clock.getElapsedTime() * 2.0 + i) * 0.05);
            }
          }

          // 4. Points of Interest Proximity Detection & Discoveries
          const tempWorldPos = new THREE.Vector3();
          if ((window as any)._globePOIs) {
            const currentPOIs = (window as any)._globePOIs as any[];
            currentPOIs.forEach((poi: any) => {
              // Rotate high-altitude neon beacon mesh style
              if (poi.beacon) {
                poi.beacon.rotation.y += 1.3 * dt;
                poi.beacon.rotation.x += 0.4 * dt;
                poi.beacon.position.y = 5.2 + Math.sin(clock.getElapsedTime() * 2.8 + poi.group.position.x) * 0.22;
              }

              // Distance evaluation
              poi.group.getWorldPosition(tempWorldPos);
              const distToPOI = warpStar.position.distanceTo(tempWorldPos);
              
              // Discovered if near
              if (distToPOI < 13.5 && !poi.discovered) {
                poi.discovered = true;
                
                // Sound cue click
                playSound("chime");

                // Update react states seamlessly
                setDiscoveredPOIs(prev => {
                  if (prev.includes(poi.name)) return prev;
                  const next = [...prev, poi.name];
                  
                  // Fire banner notice
                  setCurrentDiscoverMessage(`📍 DISCOVERED: ${poi.name}\n"${poi.desc}" (+100 Glimmer Shards!)`);
                  setShowDiscoverBanner(true);
                  
                  // Auto hide banner after 5.5s
                  const timeoutID = setTimeout(() => {
                    setShowDiscoverBanner(false);
                  }, 5500);
                  
                  return next;
                });

                setCurGlimmerShards(prev => prev + 100);
              }
            });

            // Update HUD text Ref directly with current discovery progress
            if (globeDiscoveriesRef.current) {
              const discCount = currentPOIs.filter(p => p.discovered).length;
              globeDiscoveriesRef.current.innerText = `${discCount} / ${currentPOIs.length}`;
            }
          }

          // 5. Floating Island Collectible Stars Detection
          if ((window as any)._islandCollectibles) {
            const colls = (window as any)._islandCollectibles as any[];
            colls.forEach((item: any) => {
              if (!item.collected && item.mesh) {
                // Spinning animation of floating stars
                item.mesh.rotation.y += 1.8 * dt;
                item.mesh.rotation.z += 0.6 * dt;

                item.mesh.getWorldPosition(tempWorldPos);
                const distToStar = warpStar.position.distanceTo(tempWorldPos);
                
                if (distToStar < 11.5) {
                  item.collected = true;
                  item.mesh.visible = false; // Hide 3D asset

                  playSound("coin");

                  // Sparkle particle burst
                  for (let p = 0; p < 8; p++) {
                    const sparkVel = new THREE.Vector3(
                      (Math.random() - 0.5) * 5.0,
                      (Math.random() - 0.5) * 5.0,
                      (Math.random() - 0.5) * 5.0
                    );
                    addSpawningParticle(
                      particleGeo,
                      particleMat, // standard gold particle
                      tempWorldPos,
                      sparkVel,
                      1.0,
                      1.0,
                      1.4
                    );
                  }

                  // Toast message
                  setCurGlimmerShards(prev => prev + 50);
                  setCurrentDiscoverMessage(`✨ COLLECTED: ${item.name} (+50 Glimmer Shards!)`);
                  setShowDiscoverBanner(true);

                  setTimeout(() => {
                    setShowDiscoverBanner(false);
                  }, 3800);
                }
              }
            });
          }

          // 5.5 Floating Ring Gates Update & Collision Detection
          if ((window as any)._ringGates) {
            const tempPos = new THREE.Vector3();
            const rings = (window as any)._ringGates as any[];
            rings.forEach((ring: any) => {
              if (ring.mesh) {
                // Spin/Rotate ring slowly
                ring.mesh.rotation.y += 0.8 * dt;

                // Pulse emissive intensity
                if (ring.mesh.material) {
                  ring.mesh.material.emissiveIntensity = 2.0 + Math.sin(clock.getElapsedTime() * 4.0) * 1.0;
                }

                if (!ring.collected) {
                  ring.mesh.getWorldPosition(tempPos);
                  const dist = warpStar.position.distanceTo(tempPos);
                  if (dist < 5.0) {
                    ring.collected = true;
                    ring.mesh.visible = false;
                    
                    playSound("chime");
                    
                    // Speed boost
                    boostMax = 3.5;
                    boostTime = 1.2;
                    
                    // Barrel roll
                    (window as any)._targetBarrelRoll = ((window as any)._targetBarrelRoll || 0) + Math.PI * 2;
                    
                    ringsCollected++;
                    
                    // Update HUD
                    if (globeRingsCollectedRef.current) {
                      globeRingsCollectedRef.current.innerText = ringsCollected.toString();
                    }

                    // Particle burst: 12 sparkly particles
                    for (let p = 0; p < 12; p++) {
                      const sparkVel = new THREE.Vector3(
                        (Math.random() - 0.5) * 8.0,
                        (Math.random() - 0.5) * 8.0,
                        (Math.random() - 0.5) * 8.0
                      );
                      addSpawningParticle(
                        particleGeo,
                        ring.mesh.material,
                        tempPos,
                        sparkVel,
                        1.2, // maxLife
                        1.2, // life
                        1.5  // scaleMultiplier
                      );
                    }
                  }
                }
              }
            });
          }

          // 6. Direct HUD injection of active Altitude & speed telemetry
          if (globeAltitudeTextRef.current) {
            globeAltitudeTextRef.current.innerText = `${Math.round(yPos * 30)}m`;
          }
      }

      if (currentlyMoving) {
        const isBoosting = boostTime > 0;

        // Trigger 'whoosh' sound when initiating details of a speed boost
        if (isBoosting && !wasBoosting) {
          playSound("whoosh");
        }
        wasBoosting = isBoosting;

        // Trigger 'tire screech' sound effect when initiating a hard drift at high speed
        if (isDriftingMode && !wasDrifting && currentSpeed > 1.5) {
          playSound("screech");
        }
        wasDrifting = isDriftingMode;

        // Custom high-energy drift spark spray based on chargeLevel tier
        if (isDriftingMode) {
          // Drifting emits particles at huge frequency compared to standard cruise
          if (Math.random() > 0.12) {
            let selectedSparkMat = sparkMatBlue;
            let scaleMultiplier = 1.0;

            if (chargeLevel >= 80) {
              selectedSparkMat = sparkMatNeon; // Neon Pink Epic Sparks
              scaleMultiplier = 1.3;
            } else if (chargeLevel >= 40) {
              selectedSparkMat = sparkMatGold; // Intense Golden Electric Sparks
              scaleMultiplier = 1.15;
            } else {
              selectedSparkMat = sparkMatBlue; // Soft Blue Base Sparks
              scaleMultiplier = 0.9;
            }

            // Flashing Ultra White sparks if fully charged
            if (chargeLevel >= 100 && Math.random() > 0.4) {
              selectedSparkMat = sparkMatUltra;
              scaleMultiplier = 1.6;
            }

            // Spawn sparks specifically from the rear wheels to provide dramatic turning feedback!
            // Left Wheel offset (sideways: -0.75, vertical coordinates: -0.12, behind the ship: 1.05)
            const leftOffset = new THREE.Vector3(-0.75, -0.12, 1.05);
            leftOffset.applyAxisAngle(upVec, heading);
            const sparkPosLeft = warpStar.position.clone().add(leftOffset);

            const sprayAngleLeft = heading + Math.PI + (Math.random() - 0.5) * 1.8;
            const spraySpeedLeft = 4.0 + Math.random() * 8.0;

            const driftLifeLeft = 0.4 + Math.random() * 0.35;
            const driftVelLeft = new THREE.Vector3(
              Math.sin(sprayAngleLeft) * spraySpeedLeft,
              Math.random() * 2.0 + 0.5,
              Math.cos(sprayAngleLeft) * spraySpeedLeft
            );
            addSpawningParticle(particleGeo, selectedSparkMat, sparkPosLeft, driftVelLeft, 0.75, driftLifeLeft, scaleMultiplier);

            // Right Wheel offset (sideways: 0.75, vertical coordinates: -0.12, behind the ship: 1.05)
            const rightOffset = new THREE.Vector3(0.75, -0.12, 1.05);
            rightOffset.applyAxisAngle(upVec, heading);
            const sparkPosRight = warpStar.position.clone().add(rightOffset);

            const sprayAngleRight = heading + Math.PI + (Math.random() - 0.5) * 1.8;
            const spraySpeedRight = 4.0 + Math.random() * 8.0;

            const driftLifeRight = 0.4 + Math.random() * 0.35;
            const driftVelRight = new THREE.Vector3(
              Math.sin(sprayAngleRight) * spraySpeedRight,
              Math.random() * 2.0 + 0.5,
              Math.cos(sprayAngleRight) * spraySpeedRight
            );
            addSpawningParticle(particleGeo, selectedSparkMat, sparkPosRight, driftVelRight, 0.75, driftLifeRight, scaleMultiplier);
          }
        }

        // Spawn greyish-white 'smoke' puff particles from the rear wheels in a high-speed drift state
        if (isDriftingMode && currentSpeed > 2.0) {
          if (Math.random() > 0.15) {
            // Left Wheel offset (sideways: -0.75, vertical coordinates: -0.12, behind the ship: 1.05)
            const leftOffset = new THREE.Vector3(-0.75, -0.12, 1.05);
            leftOffset.applyAxisAngle(upVec, heading);
            const smokePosLeft = warpStar.position.clone().add(leftOffset);

            const smokeVelLeft = new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              Math.random() * 1.4 + 0.3, // slow drift upwards
              1.2 + Math.random() * 2.5  // drift backwards relative to heading
            );
            smokeVelLeft.applyAxisAngle(upVec, heading);
            const smokeLifeLeft = 0.5 + Math.random() * 0.45;
            addSpawningParticle(smokeParticleGeo, smokeParticleMat, smokePosLeft, smokeVelLeft, 0.9, smokeLifeLeft, 1.3 + Math.random() * 0.7);

            // Right Wheel offset (sideways: 0.75, vertical coordinates: -0.12, behind the ship: 1.05)
            const rightOffset = new THREE.Vector3(0.75, -0.12, 1.05);
            rightOffset.applyAxisAngle(upVec, heading);
            const smokePosRight = warpStar.position.clone().add(rightOffset);

            const smokeVelRight = new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              Math.random() * 1.4 + 0.3,
              1.2 + Math.random() * 2.5
            );
            smokeVelRight.applyAxisAngle(upVec, heading);
            const smokeLifeRight = 0.5 + Math.random() * 0.45;
            addSpawningParticle(smokeParticleGeo, smokeParticleMat, smokePosRight, smokeVelRight, 0.9, smokeLifeRight, 1.3 + Math.random() * 0.7);
          }
        }

        // Generate Connected Black Skid Marks on track surface during high-speed drifts
        const isCurrentlySkidding = isDriftingMode && currentSpeed > 2.0;
        if (isCurrentlySkidding) {
          const leftOffset = new THREE.Vector3(-0.75, -0.12, 1.05);
          leftOffset.applyAxisAngle(upVec, heading);
          const currentLeftWheel = warpStar.position.clone().add(leftOffset);

          const rightOffset = new THREE.Vector3(0.75, -0.12, 1.05);
          rightOffset.applyAxisAngle(upVec, heading);
          const currentRightWheel = warpStar.position.clone().add(rightOffset);

          if (hadSkidLastFrame && prevLeftWheelPos && prevRightWheelPos) {
            addSkidMark(prevLeftWheelPos, currentLeftWheel);
            addSkidMark(prevRightWheelPos, currentRightWheel);
          } else {
            prevLeftWheelPos = new THREE.Vector3();
            prevRightWheelPos = new THREE.Vector3();
          }
          prevLeftWheelPos.copy(currentLeftWheel);
          prevRightWheelPos.copy(currentRightWheel);
          hadSkidLastFrame = true;
        } else {
          hadSkidLastFrame = false;
          prevLeftWheelPos = null;
          prevRightWheelPos = null;
        }

        const emitThreshold = isBoosting ? 0.05 : chargeInput ? 0.7 : 0.3;

        // Emit glowing trail particles
        if (Math.random() > emitThreshold) {
          const isBoostParticle = isBoosting && Math.random() > 0.3;
          tempTrailPos.copy(warpStar.position);

          if (isBoostParticle) {
            // Offset position relative to ship heading: behind the ship
            localOffset.set(
              (Math.random() - 0.5) * 1.2,
              (Math.random() - 0.5) * 0.5,
              1.0 + Math.random() * 1.5
            );
            localOffset.applyAxisAngle(upVec, heading);
            tempTrailPos.add(localOffset);

            const particleSpeed = 15.0 + Math.random() * 8.0;
            backVel.set(0, 0, 1)
              .applyAxisAngle(upVec, heading)
              .multiplyScalar(particleSpeed);

            addSpawningParticle(boostParticleGeo, boostParticleMat, tempTrailPos, backVel, 0.6);
          } else {
            // Spawn strictly behind the star (+Z direction locally relative to heading)
            localOffset.set(
              (Math.random() - 0.5) * 0.8,
              0,
              1.0 + Math.random() * 0.5
            );
            localOffset.applyAxisAngle(upVec, heading);
            tempTrailPos.add(localOffset);

            // Eject backwards quickly relative to heading to simulate high forward speed
            trailVel.set(
              (Math.random() - 0.5) * 2.0,
              Math.random() * -1.0 - 0.2,
              5.0 + Math.random() * 3.0
            );
            trailVel.applyAxisAngle(upVec, heading);

            addSpawningParticle(particleGeo, particleMat, tempTrailPos, trailVel, 0.8);
          }
        }
      }

      // Check if player is flying close to the water surface on the cozy globe to generate water spray splashes
      const currentAppModeGlobe = (window as any)._appMode;
      if (currentAppModeGlobe === "globe" || (window as any)._mode === "globe") {
        const shipWorldPos = warpStar.position;
        const globeCenter = ground.position;
        const shipDist = shipWorldPos.distanceTo(globeCenter);
        const heightAboveWater = shipDist - (planetRadius - 0.1);

        // Find closest tile under the player's ship
        const dirToShip = new THREE.Vector3().subVectors(shipWorldPos, globeCenter).normalize();
        const localDir = dirToShip.clone().applyQuaternion(ground.quaternion.clone().invert());
        
        let closestTile = tilesData[0];
        let maxDot = -1.0;
        for (let t = 0; t < tilesData.length; t++) {
          const dot = localDir.dot(tilesData[t].center);
          if (dot > maxDot) {
            maxDot = dot;
            closestTile = tilesData[t];
          }
        }

        // Generate water spray if skimming low over the water biome
        if (closestTile.biome === "water" && heightAboveWater < 4.8 && currentSpeed > 0.5) {
          const waterSurfacePos = globeCenter.clone().addScaledVector(dirToShip, planetRadius - 0.1);
          
          // Spawn 1-2 water spray foam particles per frame
          const numSprayParticles = Math.random() < 0.6 ? 2 : 1;
          for (let k = 0; k < numSprayParticles; k++) {
            const sprayPos = waterSurfacePos.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              (Math.random() - 0.5) * 0.25,
              (Math.random() - 0.5) * 1.5
            ));

            const sprayVel = dirToShip.clone().multiplyScalar(0.8 + Math.random() * 1.5); // splash upwards from surface
            const horizontalSpread = new THREE.Vector3(
              (Math.random() - 0.5) * 3.0,
              0,
              (Math.random() - 0.5) * 3.0
            );
            sprayVel.add(horizontalSpread);

            const sprayLife = 0.45 + Math.random() * 0.4;
            const sprayScale = 1.0 + Math.random() * 0.8;
            addSpawningParticle(
              smokeParticleGeo,
              (window as any)._waterSprayMat || smokeParticleMat,
              sprayPos,
              sprayVel,
              0.85,
              sprayLife,
              sprayScale
            );
          }
        }
      }

      // Update Particle Lifecycles
      particleSystem.update(dt);

      // Update Skid Marks Lifecycles (Pooled & fade-out)
      for (let i = 0; i < skidPool.length; i++) {
        const segment = skidPool[i];
        if (!segment.active) continue;

        segment.life -= dt;
        if (segment.life <= 0) {
          segment.active = false;
          segment.mesh.visible = false;
        } else {
          const ratio = segment.life / segment.maxLife;
          (segment.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.45;
        }
      }

      // Update Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
        } else {
          p.mesh.position.addScaledVector(p.vel, dt);
          p.mesh.rotation.x += dt * 12;
          p.mesh.rotation.y += dt * 15;

          // Emit curly, sparkly tail
          if (Math.random() > 0.2) {
            // Spiral math based on life (creating a corkscrew tail behind it)
            const spiralRadius = 0.15 + (1.5 - p.life) * 0.15; // slightly expands
            const spiralAngle = p.life * 30; // fast spin

            tempTrailPos.copy(p.mesh.position);
            tempTrailPos.x +=
              Math.cos(spiralAngle) * spiralRadius +
              (Math.random() - 0.5) * 0.1;
            tempTrailPos.y +=
              Math.sin(spiralAngle) * spiralRadius +
              (Math.random() - 0.5) * 0.1;
            tempTrailPos.z += (Math.random() - 0.5) * 0.3;

            trailVel.set(
              Math.cos(spiralAngle) * 0.5,
              Math.sin(spiralAngle) * 0.5,
              3.0 + Math.random() * 2.0,
            );
            addSpawningParticle(projTrailGeo, projectileTrailMat, tempTrailPos, trailVel, 0.4);
          }
        }
      }

      // Update Celebration Victory Particles
      if (celebrationParticles.length > 0) {
        for (let i = celebrationParticles.length - 1; i >= 0; i--) {
          const p = celebrationParticles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            if (Array.isArray(p.mesh.material)) {
              p.mesh.material.forEach((m) => m.dispose());
            } else {
              p.mesh.material.dispose();
            }
            celebrationParticles.splice(i, 1);
          } else {
            // Apply gravity
            p.velocity.y -= 9.8 * dt;
            // Add air friction/damping (velocity decays softly over time)
            p.velocity.multiplyScalar(0.995);

            // Swaying flutter effect
            if (p.velocity.y < 0) {
              p.velocity.x += Math.sin(clock.getElapsedTime() * 6.5 + i) * 1.8 * dt;
              p.velocity.z += Math.cos(clock.getElapsedTime() * 5.2 + i) * 1.8 * dt;
            }

            p.mesh.position.addScaledVector(p.velocity, dt);

            p.mesh.rotation.x += p.rotSpeed.x * dt;
            p.mesh.rotation.y += p.rotSpeed.y * dt;
            p.mesh.rotation.z += p.rotSpeed.z * dt;

            // Soft scale and translucent/opacity decay as they expire
            const ratio = Math.max(0, 1 - p.life / p.maxLife);
            if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
              p.mesh.material.opacity = ratio;
              p.mesh.material.transparent = true;
            }
          }
        }
      }

      // Constantly spawn celebration particles during victory to keep the atmosphere extremely festive!
      if (isRaceFinished) {
        if (celebrationParticles.length < 150) {
          // Regular confetti
          if (Math.random() < 0.28) {
            spawnCelebrationConfetti(warpStar.position);
          }
          // Dynamic gold celebration rings
          if (Math.random() < 0.04) {
            spawnCelebrationRing(warpStar.position);
          }
        }
      }

      // Base height
      let baseHeight = 0;

      // trackRegistry.update() ran above and might have populated playerState
      const playerState = (window as any)._playerState;
      if (playerState && playerState.baseHeightOverride !== undefined) {
        baseHeight = playerState.baseHeightOverride;
      } else if (
        (window as any)._mode === "track" &&
        (window as any)._trackGroup
      ) {
        // High raycast from sky to dynamic elevated track surface
        originVec.set(
          warpStar.position.x,
          250.0,
          warpStar.position.z,
        );
        sharedRaycaster.set(originVec, downVec);
        sharedRaycaster.near = 0;
        sharedRaycaster.far = 400;

        // Optimize performance: Cache driveable track meshes once rather than traversing and building full raycast hierarchies on every frame
        const currentAppMode = (window as any)._appMode;
        if (!(window as any)._cachedDriveableMeshes || (window as any)._cachedDriveableTrackMode !== currentAppMode) {
          const driveables: THREE.Object3D[] = [];
          (window as any)._trackGroup.traverse((child: any) => {
            if (child.isMesh && child.userData.isDriveable) {
              driveables.push(child);
            }
          });
          if (driveables.length > 0) {
            (window as any)._cachedDriveableMeshes = driveables;
            (window as any)._cachedDriveableTrackMode = currentAppMode;
          }
        }

        const targetGroup = (window as any)._cachedDriveableMeshes || [(window as any)._trackGroup];
        const intersects = sharedRaycaster.intersectObjects(
          targetGroup,
          true,
        );
        const driveableIntersects = (window as any)._cachedDriveableMeshes ? intersects : intersects.filter(
          (hit) => hit.object.userData.isDriveable,
        );

        if (driveableIntersects.length > 1) {
          const referenceY = warpStar.position.y;
          driveableIntersects.sort((a, b) => {
            return Math.abs(a.point.y - referenceY) - Math.abs(b.point.y - referenceY);
          });
        }

        const onGround = driveableIntersects.length > 0;
        const currentFrameTrackHeight = onGround ? driveableIntersects[0].point.y : 0;

        // Initialize airborne status systems
        if ((window as any)._isAirborneState === undefined) {
          (window as any)._isAirborneState = false;
          (window as any)._currentAirborneHeight = 0;
          (window as any)._airborneYVel = 0;
          (window as any)._lastTrackHeight = 0;
          (window as any)._lastSlopeY = 0;
        }

        const prevTrackHeight = (window as any)._lastTrackHeight;
        (window as any)._lastTrackHeight = onGround ? currentFrameTrackHeight : prevTrackHeight;

        if (onGround) {
          if ((window as any)._trackCurve) {
            let bestT = (window as any)._lastGroundedT || 0.045;
            let minDist = Infinity;
            const searchRange = 0.08;
            const searchStart = Math.max(0.001, bestT - searchRange);
            const searchEnd = Math.min(1.0, bestT + searchRange);
            const steps = 15;
            for (let s = 0; s <= steps; s++) {
              const tempT = searchStart + (s / steps) * (searchEnd - searchStart);
              const pt = (window as any)._trackCurve.getPointAt(tempT);
              const d = warpStar.position.distanceTo(pt);
              if (d < minDist) {
                minDist = d;
                bestT = tempT;
              }
            }
            if (minDist < 60) {
              (window as any)._lastGroundedT = bestT;
            }
          }

          if ((window as any)._isAirborneState) {
            // Check if we plummeted back down to meet the track surface
            if ((window as any)._currentAirborneHeight <= currentFrameTrackHeight + 0.1) {
              // LANDED! Reset status
              (window as any)._isAirborneState = false;
              baseHeight = currentFrameTrackHeight + 0.5;
            } else {
              // Mid-air phase: still flying above a lower track section
              const gravity = chargeInput ? 35.0 : 13.0; // glide nicely if not brake charging
              (window as any)._airborneYVel -= gravity * dt;
              if ((window as any)._airborneYVel < -25) (window as any)._airborneYVel = -25;
              (window as any)._currentAirborneHeight += (window as any)._airborneYVel * dt;
              baseHeight = (window as any)._currentAirborneHeight;
            }
          } else {
            // Ground-riding phase: check if we just stepped off a ledge, cliff or bridge gap
            const verticalDiff = warpStar.position.y - currentFrameTrackHeight;
            const maxSnapDist = (window as any)._appMode === "track_abyss" ? 150.0 : 3.5;
            if (verticalDiff > maxSnapDist) {
              (window as any)._isAirborneState = true;
              (window as any)._currentAirborneHeight = warpStar.position.y;
              
              // Inherit slope velocity for a magnificent launch trajectory!
              const inheritedSlope = (window as any)._lastSlopeY || 0;
              (window as any)._airborneYVel = THREE.MathUtils.clamp(inheritedSlope, -5, 23);

              // Apply mid-air physics
              const gravity = chargeInput ? 35.0 : 13.0;
              (window as any)._airborneYVel -= gravity * dt;
              if ((window as any)._airborneYVel < -25) (window as any)._airborneYVel = -25;
              (window as any)._currentAirborneHeight += (window as any)._airborneYVel * dt;
              baseHeight = (window as any)._currentAirborneHeight;
            } else {
              // Stick smoothly to surface
              baseHeight = currentFrameTrackHeight + 0.5;

              // Track slope velocity. Multiply by current speed factor to get realistic leap momentum
              const slope = (currentFrameTrackHeight - prevTrackHeight) / Math.max(0.001, dt);
              (window as any)._lastSlopeY = THREE.MathUtils.clamp(slope, -30, 30);
            }
          }
        } else {
          // NO track underneath (crossing a deep gorge or falling off ramp)
          if (!(window as any)._isAirborneState) {
            (window as any)._isAirborneState = true;
            (window as any)._currentAirborneHeight = prevTrackHeight + 0.5;
            
            // Inherit slope velocity for a magnificent launch trajectory!
            const inheritedSlope = (window as any)._lastSlopeY || 0;
            // Cap launch velocity so player doesn't fly out of bounds
            (window as any)._airborneYVel = THREE.MathUtils.clamp(inheritedSlope, -5, 23);
          }

          // Mid-air physics flight with gravity
          const gravity = chargeInput ? 35.0 : 13.0;
          (window as any)._airborneYVel -= gravity * dt;
          if ((window as any)._airborneYVel < -25) (window as any)._airborneYVel = -25;
          (window as any)._currentAirborneHeight += (window as any)._airborneYVel * dt;

          // Abyss boundaries protection: respawn if fallen below map limit (deeper for the Abyss Trench)
          const outOfBoundsLimit = (window as any)._appMode === "track_abyss" ? -145.0 : -22.0;
          if ((window as any)._currentAirborneHeight < outOfBoundsLimit) {
            (window as any)._isAirborneState = false;
            if ((window as any)._trackCurve) {
              const targetT = Math.max(0.01, ((window as any)._lastGroundedT || 0.045) - 0.03);
              const safePoint = (window as any)._trackCurve.getPointAt(targetT);
              warpStar.position.copy(safePoint);
              warpStar.position.y += 2.0; // spawn slightly airborne
              currentSpeed = 3.5;
              (window as any)._airborneYVel = 0;
            } else {
              // Fallback to start point coordinates based on current active track
              const currentMode = (window as any)._appMode;
              if (currentMode === "track_abyss") {
                warpStar.position.set(0, 150, 200);
              } else if (currentMode === "track_retro") {
                warpStar.position.set(130, 0, 35);
              } else {
                warpStar.position.set(0, 0, 0);
              }
              currentSpeed = 3.5;
              (window as any)._airborneYVel = 0;
            }
            baseHeight = 0.5;
          } else {
            baseHeight = (window as any)._currentAirborneHeight;
          }
        }
      }

      // Simple hover interpolation for warp star
      const hoverY = 0.6 + Math.sin(clock.getElapsedTime() * 3) * 0.1;

      if ((window as any)._introActive) {
        const introT = (window as any)._introTime || 0;
        const progress = Math.min(1.0, introT / 2.0); // complete descent at 2.0 seconds
        const eased = 1.0 - Math.pow(1.0 - progress, 3); // ease-out cubic
        const descHeight = 25.0 * (1.0 - eased);
        
        warpStar.position.y = descHeight + hoverY + baseHeight;

        // Offset cat avatar to make it look like they are standing on the ground, then hopping onto the descending star
        if (introT < 2.0) {
          // Stay perfectly relative-counterbalanced on the track surface (baseHeight + slight offset)
          avatar.mesh.position.y = -warpStar.position.y + baseHeight + 0.15;
        } else if (introT < 2.7) {
          // Beautiful hop onto the Star (lasts 0.7 seconds)
          const hopProgress = (introT - 2.0) / 0.7;
          const hopHeight = Math.sin(hopProgress * Math.PI) * 1.8;
          const targetGroundedY = -warpStar.position.y + baseHeight + 0.15;
          const normalRideY = 0.15;
          avatar.mesh.position.y = THREE.MathUtils.lerp(targetGroundedY, normalRideY, hopProgress) + hopHeight;
        } else {
          avatar.mesh.position.y = 0.15;
        }
      } else {
        warpStar.position.y =
          (avatarState === "crashed" ? 0.3 : hoverY + yPos) + baseHeight;

        // Update avatar to stick atop the Warp Star
        avatar.mesh.position.y = 0.15;
      }

      // Update advanced Avatar State
      avatar.update(
        dt,
        currentlyMoving && yPos === 0,
        yPos > 0,
        chargeInput,
        bankAngle,
        0, // Spin inherited from parent Warp Star
        yVel,
        avatarState,
        driftInput,
      );

      // Speed FOV effect
      const targetFov = 45 + Math.max(0, currentSpeed - 5.0) * 1.5;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 5);
      camera.updateProjectionMatrix();

      composer.render();
    };

    animate();

    // Responsive Canvas Resizing using ResizeObserver
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      // Preserve lower bloom resolution on resize for persistent high frame rates
      if (bloomPass) {
        bloomPass.setSize(width / 2, height / 2);
      }
    };

    // Initial size calculation
    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      // No need to remove elements since we use a React <canvas> ref now
      avatar.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync React state to window for the animation loop
  useEffect(() => {
    (window as any)._previewMoving = isMoving;
    (window as any)._previewJumping = isJumping;
  }, [isMoving, isJumping]);

  useEffect(() => {
    const trackGroup = (window as any)._trackGroup as THREE.Group;
    const trackRegistry = (window as any)._trackRegistry as Track;
    const scene = (window as any)._scene as THREE.Scene;
    if (!trackGroup || !trackRegistry) return;

    // Dynamically adjust the background sky color and fog to match the track's theme!
    if (scene) {
      let bgColor = 0x101116;
      let fogDensity = 0.0015;

      if (appMode === "globe" || appMode === "globe_view") {
        bgColor = 0x0a0516;
        fogDensity = 0.001;
      } else if (appMode === "track_oval") {
        bgColor = 0x0a0614;
        fogDensity = 0.001;
      } else if (appMode === "track_retro") {
        bgColor = 0x05030e;
        fogDensity = 0.001;
      } else if (appMode === "track_rail") {
        bgColor = 0x020811;
        fogDensity = 0.0015;
      } else if (appMode === "track_nebula") {
        bgColor = 0x010103;
        fogDensity = 0.0005;
      } else if (appMode === "track_custom") {
        bgColor = 0x0a0015;
        fogDensity = 0.0008;
      } else if (appMode === "track_abyss") {
        bgColor = 0x010815;
        fogDensity = 0.0035;
      }

      const isGlobe = (appMode === "globe" || appMode === "globe_view");
      const skyDome = (window as any)._skyDome;
      const celestialGroup = (window as any)._celestialGroup;
      const starsGroup = (window as any)._starsGroup;
      
      if (skyDome) skyDome.visible = isGlobe;
      if (celestialGroup) celestialGroup.visible = isGlobe;
      if (starsGroup) starsGroup.visible = isGlobe;

      if (isGlobe) {
        if (globeSkyboxRef.current) {
          scene.background = globeSkyboxRef.current;
        } else {
          scene.background = new THREE.Color(0x0a0516);
        }
      } else {
        scene.background = new THREE.Color(bgColor);
      }

      if (scene.fog && scene.fog instanceof THREE.FogExp2) {
        if (!isGlobe) {
          scene.fog.color.setHex(bgColor);
        }
        scene.fog.density = fogDensity;
      }
    }

    while (trackGroup.children.length > 0) {
      trackGroup.remove(trackGroup.children[0]);
    }

    if (appMode.startsWith("track")) {
      trackGroup.visible = true;
      let trackResult: TrackBuildResult;
      if (appMode === "track_planner") {
        trackResult = buildPlannerTrack(trackGroup);
      } else if (appMode === "track_custom") {
        trackResult = buildCustomTrack(trackGroup);
      } else if (appMode === "track_abyss") {
        trackResult = buildAbyssTrenchTrack(trackGroup);
      } else if (appMode === "track_oval") {
        trackResult = buildOvalTrack(trackGroup);
      } else if (appMode === "track_rail") {
        trackResult = buildRailTrack(trackGroup);
      } else if (appMode === "track_nebula") {
        trackResult = buildNebulaBeltTrack(trackGroup);
      } else {
        trackResult = buildRetroTrack(trackGroup);
      }
      trackRegistry.register("boosts", trackResult.boostSystem);
      if (trackResult.railSystem) {
        trackRegistry.register("rails", trackResult.railSystem);
      }

      if ((trackResult as any).palmTreeSystem) {
        trackRegistry.register("palmTree", (trackResult as any).palmTreeSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("palmTree");
      }

      if ((trackResult as any).parallaxMountainsSystem) {
        trackRegistry.register("parallaxMountains", (trackResult as any).parallaxMountainsSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("parallaxMountains");
      }

      if ((trackResult as any).holographicCitySystem) {
        trackRegistry.register("holographicCity", (trackResult as any).holographicCitySystem);
      } else {
        (trackRegistry as any).subsystems?.delete("holographicCity");
      }

      if ((trackResult as any).underTrackNeonSystem) {
        trackRegistry.register("underTrackNeon", (trackResult as any).underTrackNeonSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("underTrackNeon");
      }

      if ((trackResult as any).hoveringPolyhedraSystem) {
        trackRegistry.register("hoveringPolyhedra", (trackResult as any).hoveringPolyhedraSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("hoveringPolyhedra");
      }

      if ((trackResult as any).neonSpectatorGatesSystem) {
        trackRegistry.register("neonSpectatorGates", (trackResult as any).neonSpectatorGatesSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("neonSpectatorGates");
      }

      if ((trackResult as any).neonGeyserSystem) {
        trackRegistry.register("neonGeyser", (trackResult as any).neonGeyserSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("neonGeyser");
      }

      if ((trackResult as any).roadBarriersLODSystem) {
        trackRegistry.register("roadBarriers", (trackResult as any).roadBarriersLODSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("roadBarriers");
      }

      if ((trackResult as any).tunnelLightsSystem) {
        trackRegistry.register("tunnelLights", (trackResult as any).tunnelLightsSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("tunnelLights");
      }

      if ((trackResult as any).ambientCrittersSystem) {
        trackRegistry.register("ambientCritters", (trackResult as any).ambientCrittersSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("ambientCritters");
      }

      if ((trackResult as any).nebulaDebrisSystem) {
        trackRegistry.register("nebulaDebris", (trackResult as any).nebulaDebrisSystem);
      } else {
        (trackRegistry as any).subsystems?.delete("nebulaDebris");
      }

      (window as any)._trackCurve = trackResult.curve;
      const aiSystem = new AISystem(trackResult.curve, 3);
      trackRegistry.register("ai", aiSystem);

      const lapSystem = (trackRegistry as any).subsystems?.get("laps"); // Fixed accessing systems
      if (lapSystem && trackGroup.parent) {
        lapSystem.init(trackGroup.parent); // Reset lap state when switching tracks
      }
    } else {
      trackGroup.visible = false;
    }
  }, [appMode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#0A0B0E] text-slate-300 font-sans selection:bg-blue-500/30 flex flex-col"
    >
      <SpeedLines />
      
      {/* 3D Canvas Element */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-0 outline-none touch-none hover:cursor-grab active:cursor-grabbing"
      />

      {/* Main Menu Overlay */}
      <MainMenu
        appMode={appMode}
        setAppMode={setAppMode}
        isMusicPlaying={isMusicPlaying}
        toggleMusic={toggleMusic}
        selectedCharacter={selectedCharacter}
        setSelectedCharacter={setSelectedCharacter}
        avatarsList={avatarsList}
        showCharacterDropdown={showCharacterDropdown}
        setShowCharacterDropdown={setShowCharacterDropdown}
        setShowHangarGallery={setShowHangarGallery}
        curGlimmerShards={curGlimmerShards}
      />

      {/* Flight Telemetry HUD */}
      <FlightHUD
        appMode={appMode}
        setAppMode={setAppMode}
        countdownText={countdownText}
        showVictoryCard={showVictoryCard}
        finalLapTimes={finalLapTimes}
        bestLapTime={bestLapTime}
        isNewRecord={isNewRecord}
        handleRestart={handleRestart}
        formatMsToTime={formatMsToTime}
        fastestLapIndex={fastestLapIndex}
        parseTimeToMs={parseTimeToMs}
        lapTextRef={lapTextRef}
        timeTextRef={timeTextRef}
        bestTimeTextRef={bestTimeTextRef}
        playerDotRef={playerDotRef}
        speedTextRef={speedTextRef}
        boostBarRef={boostBarRef}
        boostIndicatorRef={boostIndicatorRef}
        chargeBarRef={chargeBarRef}
      />

      {/* Cozy Globe HUD overlay */}
      <GlobeHUD
        appMode={appMode}
        curGlimmerShards={curGlimmerShards}
        globeDiscoveriesRef={globeDiscoveriesRef}
        globeAltitudeTextRef={globeAltitudeTextRef}
        globeDayNightTextRef={globeDayNightTextRef}
        showDiscoverBanner={showDiscoverBanner}
        currentDiscoverMessage={currentDiscoverMessage}
        globeRingsCollectedRef={globeRingsCollectedRef}
      />

      {showHangarGallery && (
        <HangarGallery
          onClose={() => setShowHangarGallery(false)}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={(id) => {
            setSelectedCharacter(id);
            (window as any)._requestedModel = id;
          }}
          avatarsList={avatarsList}
        />
      )}
    </div>
  );
}
