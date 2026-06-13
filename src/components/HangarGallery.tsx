import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GameAvatar } from "../GameAvatar";
import { X, Sparkles, Move, Eye, RotateCcw, ShieldCheck, Zap, Activity } from "lucide-react";
import { motion } from "motion/react";

interface HangarGalleryProps {
  onClose: () => void;
  selectedCharacter: string;
  onSelectCharacter: (id: string) => void;
  avatarsList: Array<{ id: string; name: string; desc: string }>;
}

export const HangarGallery: React.FC<HangarGalleryProps> = ({
  onClose,
  selectedCharacter,
  onSelectCharacter,
  avatarsList,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Character active state
  const [activeId, setActiveId] = useState<string>(selectedCharacter);
  
  // Showcase interactive states
  const [isWaddling, setIsWaddling] = useState(true);
  const [isCelebrated, setIsCelebrated] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2.2);

  // Sync state parameters to Refs so the animation loop can read them with 100% real-time and zero-rebuild overhead
  const isWaddlingRef = useRef(isWaddling);
  const isCelebratedRef = useRef(isCelebrated);
  const zoomLevelRef = useRef(zoomLevel);

  useEffect(() => {
    isWaddlingRef.current = isWaddling;
  }, [isWaddling]);

  useEffect(() => {
    isCelebratedRef.current = isCelebrated;
  }, [isCelebrated]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // References for Three.js instance
  const stateRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    avatarInstance?: GameAvatar;
    avatarContainer?: THREE.Group;
    baseDisk?: THREE.Mesh;
    reqId?: number;
    rotationY: number;
    rotationX: number;
    isDragging: boolean;
    prevMouseX: number;
    prevMouseY: number;
  }>({
    rotationY: 0,
    rotationX: 0,
    isDragging: false,
    prevMouseX: 0,
    prevMouseY: 0,
  });

  // Keyboard Escape key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // THREE.JS PRIMARY ENGINE BOOT (Runs exactly once on mount, has zero rebuilds)
  useEffect(() => {
    if (!mountRef.current) return;

    // Prevent duplicate canvases in strict mode
    mountRef.current.innerHTML = "";

    // Calculate dimensions
    const width = mountRef.current.clientWidth || 600;
    const height = mountRef.current.clientHeight || 500;

    // 1. Create Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.08);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 5);
    camera.lookAt(0, 0.7, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight1.position.set(5, 8, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xaaddff, 0.7);
    dirLight2.position.set(-5, 4, -5);
    scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.6);
    scene.add(hemiLight);

    const spotLight = new THREE.SpotLight(0xeb91aa, 3.5, 10, Math.PI / 5, 0.5, 1);
    spotLight.position.set(0, 4, 0);
    scene.add(spotLight);

    // 5. Scenic Platform & helpers
    const platformGroup = new THREE.Group();
    scene.add(platformGroup);

    const diskGeo = new THREE.CylinderGeometry(1.2, 1.25, 0.15, 32);
    const diskMat = new THREE.MeshPhongMaterial({
      color: 0x161622,
      emissive: 0xeb91aa,
      emissiveIntensity: 0.25,
      shininess: 80,
    });
    const baseDisk = new THREE.Mesh(diskGeo, diskMat);
    baseDisk.receiveShadow = true;
    baseDisk.castShadow = true;
    platformGroup.add(baseDisk);

    const ringGeo = new THREE.RingGeometry(1.22, 1.25, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xeb91aa,
      side: THREE.DoubleSide,
    });
    const neonRing = new THREE.Mesh(ringGeo, ringMat);
    neonRing.position.y = 0.081;
    platformGroup.add(neonRing);

    const gridHelper = new THREE.GridHelper(10, 20, 0x442233, 0x1c1c2a);
    gridHelper.position.y = -0.07;
    scene.add(gridHelper);

    // Group to hold our character (rotatable independently via dragging)
    const avatarContainer = new THREE.Group();
    avatarContainer.position.y = 0.08;
    scene.add(avatarContainer);

    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.avatarContainer = avatarContainer;
    stateRef.current.baseDisk = baseDisk;

    // Continuous Animation / Physics Cycle Loop
    const clock = new THREE.Clock();
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.1);

      // Rotate disk slowly in background if user is not actively dragging the pilot mesh
      if (!stateRef.current.isDragging) {
        stateRef.current.rotationY += dt * 0.28;
      }

      // Smooth interpolation for dragging rotation
      avatarContainer.rotation.y = THREE.MathUtils.lerp(
        avatarContainer.rotation.y,
        stateRef.current.rotationY,
        0.12
      );
      avatarContainer.rotation.x = THREE.MathUtils.lerp(
        avatarContainer.rotation.x,
        stateRef.current.rotationX,
        0.12
      );

      // Flashing/pulsing platform
      diskMat.emissiveIntensity = 0.22 + Math.sin(Date.now() * 0.003) * 0.12;

      // Update character skeletal transitions dynamically from Refs
      if (stateRef.current.avatarInstance) {
        const isWalk = isWaddlingRef.current;
        const isCeleb = isCelebratedRef.current;
        const motionState = isCeleb ? "victory" : "normal";

        stateRef.current.avatarInstance.update(
          dt,
          isWalk,      // walk cycle toggle
          false,       // airborne
          false,       // charging boost
          0,           // banking
          0,           // spinning
          0,           // relative velocity
          motionState, // behavior
          false        // drifting state
        );
      }

      // Smooth camera interpolation for Zoom
      const activeZoomZ = zoomLevelRef.current;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, activeZoomZ, 0.1);

      renderer.render(scene, camera);
      stateRef.current.reqId = requestAnimationFrame(tick);
    };

    tick();

    // 6. Interaction Listeners - Clicks/Touches and Drag to Rotate
    const viewportContainerInstance = mountRef.current;

    const handleMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.prevMouseX = e.clientX;
      stateRef.current.prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return;
      const deltaX = e.clientX - stateRef.current.prevMouseX;
      const deltaY = e.clientY - stateRef.current.prevMouseY;

      stateRef.current.rotationY += deltaX * 0.007;
      stateRef.current.rotationX = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 4, stateRef.current.rotationX + deltaY * 0.007)
      );

      stateRef.current.prevMouseX = e.clientX;
      stateRef.current.prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        stateRef.current.isDragging = true;
        stateRef.current.prevMouseX = e.touches[0].clientX;
        stateRef.current.prevMouseY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!stateRef.current.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - stateRef.current.prevMouseX;
      const deltaY = e.touches[0].clientY - stateRef.current.prevMouseY;

      stateRef.current.rotationY += deltaX * 0.009;
      stateRef.current.rotationX = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 4, stateRef.current.rotationX + deltaY * 0.009)
      );

      stateRef.current.prevMouseX = e.touches[0].clientX;
      stateRef.current.prevMouseY = e.touches[0].clientY;
    };

    // Wheel zoom triggers setZoomLevel React state directly
    const handleWheelZoom = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.0015;
      setZoomLevel((prev) => Math.max(1.4, Math.min(3.5, prev + zoomDelta)));
    };

    // Attach dragging to mount container region so it blocks no other controls
    viewportContainerInstance.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    viewportContainerInstance.addEventListener("touchstart", handleTouchStart, { passive: true });
    viewportContainerInstance.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleMouseUp);
    
    viewportContainerInstance.addEventListener("wheel", handleWheelZoom, { passive: false });

    // Handle real-time layout queries
    const handleResize = () => {
      if (!viewportContainerInstance) return;
      const w = viewportContainerInstance.clientWidth;
      const h = viewportContainerInstance.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    // Use a small timeout to let CSS layouts resolve fully
    const resizeTimeout = setTimeout(handleResize, 150);
    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(viewportContainerInstance);

    // Full Engine cleanups
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();

      if (stateRef.current.reqId) {
        cancelAnimationFrame(stateRef.current.reqId);
      }

      viewportContainerInstance.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      viewportContainerInstance.removeEventListener("touchstart", handleTouchStart);
      viewportContainerInstance.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      viewportContainerInstance.removeEventListener("wheel", handleWheelZoom);

      if (stateRef.current.avatarInstance) {
        stateRef.current.avatarInstance.dispose();
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });

      if (viewportContainerInstance && renderer.domElement.parentNode === viewportContainerInstance) {
        viewportContainerInstance.removeChild(renderer.domElement);
      }
    };
  }, []);

  // SEPARATED CHARACTER LOADER EFFECT (Triggers instantly ONLY when changing active character)
  useEffect(() => {
    const parentContainer = stateRef.current.avatarContainer;
    if (!parentContainer) return;

    // 1. Dispose previous loaded avatar
    if (stateRef.current.avatarInstance) {
      stateRef.current.avatarInstance.dispose();
      stateRef.current.avatarInstance = undefined;
    }

    // 2. Instantiate new character selection
    const newAvatar = new GameAvatar(parentContainer);
    newAvatar.switchTo(activeId);

    // 3. Keep global reference for loops
    stateRef.current.avatarInstance = newAvatar;
  }, [activeId]);

  // Handle triggered actions
  const handleTriggerAction = (action: "shoot" | "hit") => {
    const avatar = stateRef.current.avatarInstance;
    if (avatar) {
      if (action === "shoot") {
        avatar.triggerShoot();
      } else if (action === "hit") {
        avatar.triggerHit();
      }
    }
  };

  const handleResetRotation = () => {
    stateRef.current.rotationY = 0;
    stateRef.current.rotationX = 0;
  };

  const currentSelectionDetails = avatarsList.find((av) => av.id === activeId);

  return (
    <div className="fixed inset-0 bg-[#0a0a14]/95 backdrop-blur-xl z-[100] flex flex-col md:flex-row pointer-events-auto font-mono text-white select-none">
      
      {/* 1. Left Sidebar: Selection & Info */}
      <div className="w-full md:w-[380px] bg-black/60 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between h-auto md:h-full overflow-y-auto max-h-[45vh] md:max-h-full">
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#eb91aa]" />
              <h2 className="text-lg font-black tracking-widest text-[#eb91aa]">PILOT HANGAR</h2>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-1 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[10px] text-white/50 uppercase leading-relaxed tracking-wider">
            Explore 100% real-time procedurally modeled retro cartoon spacecraft crew pilots. Choose your flight companion.
          </p>

          {/* List of Pilots */}
          <div className="flex flex-col gap-2 max-h-[220px] md:max-h-none overflow-y-auto pr-1">
            {avatarsList.map((av) => {
              const isActiveLocal = av.id === activeId;
              const isSavedActive = av.id === selectedCharacter;
              return (
                <button
                  key={av.id}
                  onClick={() => {
                    setActiveId(av.id);
                    setIsCelebrated(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isActiveLocal
                      ? "bg-[#eb91aa]/10 border-[#eb91aa] text-white"
                      : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:border-white/10"
                  }`}
                >
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-bold tracking-wide flex items-center gap-2">
                      {av.name}
                      {isSavedActive && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest leading-none">
                          Active Flight
                        </span>
                      )}
                    </span>
                    <span className="text-[9px] text-white/40 uppercase tracking-widest font-black mt-1">
                      {av.id === "cat" ? "Pilot Engine v1.0" : "Skel Engine v2.0"}
                    </span>
                  </div>
                  {isActiveLocal && (
                    <motion.div
                      layoutId="gallery-active-dot"
                      className="w-1.5 h-1.5 rounded-full bg-[#eb91aa]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Pilot Blueprint Details */}
        <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-white/5">
          <div className="bg-[#eb91aa]/5 border border-[#eb91aa]/25 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-[9.5px] uppercase font-black tracking-widest text-[#eb91aa]">
              Pilot Specifications
            </span>
            <div className="text-sm font-black tracking-tight text-white mb-0.5 flex items-center gap-2">
              <span>{currentSelectionDetails?.name}</span>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed font-sans normal-case">
              {currentSelectionDetails?.desc || "A custom procedural visual crafted down to the pixel."}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <div className="bg-black/40 rounded-lg p-2 border border-white/5 leading-none">
                <div className="text-[8px] text-white/40 uppercase font-bold tracking-wider mb-1">
                  Type Class
                </div>
                <div className="text-[10px] text-white/80 uppercase font-black tracking-tight">
                  {activeId === "cat" ? "Core Feline" : "Organic Bio"}
                </div>
              </div>
              <div className="bg-black/40 rounded-lg p-2 border border-white/5 leading-none">
                <div className="text-[8px] text-white/40 uppercase font-bold tracking-wider mb-1">
                  Renderer
                </div>
                <div className="text-[10px] text-white/80 uppercase font-black tracking-tight text-[#eb91aa]">
                  Three.js Standard
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onSelectCharacter(activeId);
            }}
            disabled={selectedCharacter === activeId}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedCharacter === activeId
                ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 cursor-not-allowed"
                : "bg-[#eb91aa] text-black hover:brightness-110 hover:shadow-[0_4px_15px_rgba(235,145,170,0.3)] hover:scale-[1.01] active:scale-[0.98]"
            }`}
          >
            {selectedCharacter === activeId ? (
              <>
                <ShieldCheck className="w-4 h-4" /> Selected Pilot
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" /> Lock Pilot Flight Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Interactive Viewport */}
      <div className="flex-1 relative flex flex-col items-center justify-between p-6">
        
        {/* Top Control HUD */}
        <div className="w-full flex items-center justify-between relative z-10 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="bg-black/50 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-white/70 shadow-md">
              <Move className="w-3.5 h-3.5 text-[#eb91aa]" />
              <span>Left-Click & Drag to Rotate</span>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-white/70 shadow-md">
              <Eye className="w-3.5 h-3.5 text-[#eb91aa]" />
              <span>Scroll / Adjust Zoom</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hidden md:flex py-2 px-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-xs font-bold items-center gap-2 transition-all cursor-pointer pointer-events-auto select-none active:scale-95"
          >
            <X className="w-4 h-4 text-[#eb91aa]" /> Close [Esc]
          </button>
        </div>

        {/* Render Canvas Hook mount */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-auto">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto" />
        </div>

        {/* Bottom Orbit Showcase Interactive Deck */}
        <div className="w-full max-w-xl bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex flex-col gap-3 relative z-10 shadow-[0_15px_45px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#eb91aa]/85 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse text-[#eb91aa]" /> Simulation Physics & Animation Testing
            </span>
            <button
              onClick={handleResetRotation}
              className="text-[9px] uppercase font-bold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset View
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsWaddling(!isWaddling)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95 cursor-pointer ${
                isWaddling
                  ? "bg-[#eb91aa]/25 border-[#eb91aa]/50 text-[#eb91aa] shadow-[0_0_10px_rgba(235,145,170,0.2)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              {isWaddling ? "🏃 Walk Cycle: ON" : "🚶 Walk Cycle: OFF"}
            </button>

            <button
              onClick={() => setIsCelebrated(!isCelebrated)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95 cursor-pointer ${
                isCelebrated
                  ? "bg-[#eb91aa]/25 border-[#eb91aa]/50 text-[#eb91aa] shadow-[0_0_10px_rgba(235,145,170,0.2)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              }`}
            >
              {isCelebrated ? "🎉 Celebrate: ON" : "✨ Celebrate: OFF"}
            </button>

            <button
              onClick={() => handleTriggerAction("shoot")}
              disabled={isCelebrated}
              className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white/80 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🚀 Shoot Jump
            </button>

            <button
              onClick={() => handleTriggerAction("hit")}
              disabled={isCelebrated}
              className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-white/80 transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⚡ Hit Reaction
            </button>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-4 mt-1 border-t border-white/5 pt-2.5">
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-black">Showcase Zoom</span>
            <input
              type="range"
              min="1.4"
              max="3.5"
              step="0.05"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="flex-1 accent-[#eb91aa] h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-white/60 font-black tracking-widest w-8 text-right">
              {Math.round((3.5 - zoomLevel) * 45 + 100)}%
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
