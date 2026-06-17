import * as THREE from "three";
import { createWarpStar } from "./WarpStarMesh";

// A generic "GameEntity" proxy so subsystems don't need to depend on the whole App logic
export interface PlayerState {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  chargeLevel: number;
  isFrozen: boolean;
  heading: number;
  setHeading: (h: number) => void;
  triggerBoost: (amount: number, duration: number) => void;
  baseHeightOverride?: number;
}

export interface TrackSubsystem {
  init(parent: THREE.Object3D): void;
  update(dt: number, player: PlayerState): void;
}

// Subsystem 1: Boost Pads using KAR's radius check pattern
export class BoostPadSystem implements TrackSubsystem {
  private boostPads: {
    position: THREE.Vector3;
    radius: number;
    group: THREE.Group;
    ringMesh: THREE.Mesh;
    ringMat: THREE.MeshBasicMaterial;
    activationTimer: number;
  }[] = [];
  private boostLocations: THREE.Vector3[];
  private curve?: THREE.Curve<THREE.Vector3>;
  private boostTexture: THREE.CanvasTexture | null = null;
  private elapsedTime = 0;

  constructor(locations: THREE.Vector3[], curve?: THREE.Curve<THREE.Vector3>) {
    this.boostLocations = locations;
    this.curve = curve;
  }

  init(parent: THREE.Object3D) {
    // 1. Create a beautiful animated canvas texture with glowing chevrons
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    
    // Transparent sleek carbon look with neon side borders
    ctx.fillStyle = "rgba(10, 20, 30, 0.4)";
    ctx.fillRect(0, 0, 128, 128);

    // Glowing cyan chevron paths
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    ctx.shadowColor = "#00ffff";
    ctx.shadowBlur = 12;

    // Draw three elegant high-tech speed arrows pointing upwards (forward in UV space)
    for (let i = 0; i < 3; i++) {
      const y = i * 40 + 24;
      ctx.beginPath();
      ctx.moveTo(20, y + 20);
      ctx.lineTo(64, y);
      ctx.lineTo(108, y + 20);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.boostTexture = tex;

    // 2. Reusable geometries and materials
    const baseGeo = new THREE.CylinderGeometry(1.6, 1.7, 0.25, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.21,
      metalness: 0.95,
    });

    const borderGeo = new THREE.CylinderGeometry(1.75, 1.75, 0.1, 8);
    const borderMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });

    // Use a slightly elongated projection rectangle flat on top of the base
    const overlayGeo = new THREE.PlaneGeometry(2.4, 3.4);
    overlayGeo.rotateX(-Math.PI / 2); // lie horizontal flat

    const ringGeo = new THREE.TorusGeometry(1.4, 0.06, 8, 24);
    ringGeo.rotateX(Math.PI / 2); // lie horizontal flat

    for (const pos of this.boostLocations) {
      const group = new THREE.Group();
      group.position.copy(pos);
      group.position.y += 0.13; // raise slightly to clear track pavement mesh

      // 3. Align group orientation along the track's local curvature tangent
      if (this.curve) {
        let bestT = 0;
        let minDist = Infinity;
        const numSamples = 100;
        for (let i = 0; i <= numSamples; i++) {
          const t = i / numSamples;
          const pt = this.curve.getPointAt(t);
          const d = pt.distanceTo(pos);
          if (d < minDist) {
            minDist = d;
            bestT = t;
          }
        }
        const tangent = this.curve.getTangentAt(bestT);
        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const surfaceNormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

        const basisMatrix = new THREE.Matrix4().makeBasis(normal, surfaceNormal, tangent);
        group.quaternion.setFromRotationMatrix(basisMatrix);
      }

      // Add base plate
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.scale.set(1.1, 1.0, 1.3); // elongated to convey high speed forward direction
      group.add(baseMesh);

      // Add outer wireframe neon border
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      borderMesh.scale.set(1.1, 1.0, 1.3);
      group.add(borderMesh);

      // Add scrolling neon chevron flat overlay mesh
      const overlayMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
      overlayMesh.position.y += 0.13; // offset vertically above plate to avoid any clipping/Z-fighting
      group.add(overlayMesh);

      // Add floating gorgeous halo ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y += 0.45;
      group.add(ringMesh);

      parent.add(group);

      this.boostPads.push({
        position: pos.clone(),
        radius: 3.5, // slightly more forgiving play boundary
        group,
        ringMesh,
        ringMat,
        activationTimer: 0,
      });
    }
  }

  update(dt: number, player: PlayerState) {
    if (this.boostTexture) {
      // Scroll the chevrons downwards/upwards continuously along the pad track
      this.boostTexture.offset.y -= dt * 2.5;
    }

    this.elapsedTime += dt;

    for (const pad of this.boostPads) {
      // Gentle floating animation of halo ring (slow rotation + bobbing)
      pad.ringMesh.rotation.y += dt * 1.6;
      pad.ringMesh.position.y = 0.4 + Math.sin(this.elapsedTime * 4.2) * 0.12;

      // Interaction check
      const dist = player.position.distanceTo(pad.position);
      if (dist < pad.radius && pad.activationTimer <= 0) {
        // Boost pad collision triggers! Provide thrilling speed boost!
        player.triggerBoost(12.0, 1.25);
        pad.activationTimer = 0.6; // trigger a flashing active state
      }

      // Smooth visual state transitions based on flash response
      if (pad.activationTimer > 0) {
        pad.activationTimer -= dt;
        const ratio = pad.activationTimer / 0.6;
        
        // High fidelity flashing animation: scales up and turns brilliant hot pink
        pad.ringMesh.scale.setScalar(1.0 + ratio * 0.9);
        pad.ringMat.opacity = 0.4 + ratio * 0.6;
        pad.ringMat.color.setRGB(
          1.0, 
          0.1 * (1.0 - ratio), 
          0.8 * ratio + 0.2 * (1.0 - ratio)
        );
      } else {
        pad.ringMesh.scale.setScalar(1.0);
        pad.ringMat.opacity = 0.6;
        pad.ringMat.color.setHex(0x00ffcc);
      }
    }
  }
}

interface GhostFrame {
  t: number;
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

export class LapSystem implements TrackSubsystem {
  private currentLap = 1;
  public maxLaps = 3;
  private hasHitHalfway = false;
  private lastX = 0;
  private lastZ = 0;
  private onLapUpdate: (lap: number, maxLaps: number) => void;
  private onTimeUpdate?: (timeStr: string) => void;
  private onBestTimeUpdate?: (timeStr: string) => void;
  private onLapCompleted?: (lapTimes: string[]) => void;
  private initialized = false;
  private elapsedTime = 0;
  public isFinished = false;

  private bestGhostData: GhostFrame[] = [];
  private currentGhostData: GhostFrame[] = [];
  private ghostMesh: THREE.Group | null = null;
  private currentGhostIndex: number = 0;
  private lastRecordTime: number = 0;
  public lapTimes: string[] = [];

  constructor(
    maxLaps: number,
    onLapUpdate: (lap: number, maxLaps: number) => void,
    onTimeUpdate?: (timeStr: string) => void,
    onBestTimeUpdate?: (timeStr: string) => void,
    onLapCompleted?: (lapTimes: string[]) => void,
  ) {
    this.maxLaps = maxLaps;
    this.onLapUpdate = onLapUpdate;
    this.onTimeUpdate = onTimeUpdate;
    this.onBestTimeUpdate = onBestTimeUpdate;
    this.onLapCompleted = onLapCompleted;
  }

  private formatTime(elapsed: number): string {
    const elapsedMs = elapsed * 1000;
    const minutes = Math.floor(elapsedMs / 60000);
    const seconds = Math.floor((elapsedMs % 60000) / 1000);
    const milliseconds = Math.floor(elapsedMs % 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  }

  init(parent: THREE.Object3D) {
    const appMode = (window as any)._appMode;
    if (appMode === "track_oval") {
      this.maxLaps = 5;
    } else if (appMode === "track_abyss") {
      this.maxLaps = 1;
    } else {
      this.maxLaps = 3;
    }
    this.currentLap = 1;
    this.hasHitHalfway = false;
    this.initialized = false;
    this.isFinished = false;
    this.elapsedTime = 0;
    this.lapTimes = [];
    this.onLapUpdate(this.currentLap, this.maxLaps);
    if (this.onTimeUpdate) this.onTimeUpdate("00:00.000");
    if (this.onLapCompleted) this.onLapCompleted(this.lapTimes);

    const bestTime = localStorage.getItem("bestLapTime" + appMode);
    if (bestTime && this.onBestTimeUpdate) {
      this.onBestTimeUpdate(this.formatTime(parseFloat(bestTime)));
    } else if (this.onBestTimeUpdate) {
      this.onBestTimeUpdate("--:--.---");
    }

    if (!this.ghostMesh) {
      this.ghostMesh = createWarpStar();
      this.ghostMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.3;
          child.material.depthWrite = false;
          if (child.material.color) {
            child.material.color.setHex(0x00ffff);
            child.material.emissive.setHex(0x005555);
          }
        }
      });
      parent.add(this.ghostMesh);
    }

    const savedGhost = localStorage.getItem("bestLapGhost" + appMode);
    if (savedGhost) {
      try {
        this.bestGhostData = JSON.parse(savedGhost);
      } catch (e) {
        this.bestGhostData = [];
      }
    } else {
      this.bestGhostData = [];
    }

    this.ghostMesh.visible = false;
    this.currentGhostIndex = 0;
    this.currentGhostData = [];
    this.lastRecordTime = 0;
  }

  update(dt: number, player: PlayerState) {
    const x = player.position.x;
    const z = player.position.z;

    if (!this.initialized) {
      this.lastX = x;
      this.elapsedTime = 0;
      this.initialized = true;
    }

    if (!this.isFinished) {
      if (!player.isFrozen) {
        this.elapsedTime += dt;
        if (this.onTimeUpdate) {
          this.onTimeUpdate(this.formatTime(this.elapsedTime));
        }
      } else {
        this.elapsedTime = 0;
      }

      if (this.bestGhostData.length > 0 && !player.isFrozen) {
        this.ghostMesh!.visible = true;

        let idx = this.currentGhostIndex;
        while (
          idx < this.bestGhostData.length - 1 &&
          this.bestGhostData[idx + 1].t < this.elapsedTime
        ) {
          idx++;
        }
        this.currentGhostIndex = idx;

        const frame1 = this.bestGhostData[idx];
        const frame2 =
          this.bestGhostData[Math.min(idx + 1, this.bestGhostData.length - 1)];

        if (frame1 && frame2) {
          if (frame1 === frame2) {
            this.ghostMesh!.position.set(frame1.px, frame1.py, frame1.pz);
            this.ghostMesh!.quaternion.set(
              frame1.qx,
              frame1.qy,
              frame1.qz,
              frame1.qw,
            );
          } else {
            const tDiff = frame2.t - frame1.t;
            const progress =
              tDiff > 0 ? (this.elapsedTime - frame1.t) / tDiff : 0;

            this.ghostMesh!.position.set(frame1.px, frame1.py, frame1.pz).lerp(
              new THREE.Vector3(frame2.px, frame2.py, frame2.pz),
              Math.max(0, Math.min(1, progress)),
            );

            const q1 = new THREE.Quaternion(
              frame1.qx,
              frame1.qy,
              frame1.qz,
              frame1.qw,
            );
            const q2 = new THREE.Quaternion(
              frame2.qx,
              frame2.qy,
              frame2.qz,
              frame2.qw,
            );
            this.ghostMesh!.quaternion.copy(q1).slerp(
              q2,
              Math.max(0, Math.min(1, progress)),
            );
          }
        }
      } else {
        this.ghostMesh!.visible = false;
      }

      if (
        this.elapsedTime - this.lastRecordTime >= 0.1 ||
        this.currentGhostData.length === 0
      ) {
        this.currentGhostData.push({
          t: this.elapsedTime,
          px: player.position.x,
          py: player.position.y,
          pz: player.position.z,
          qx: player.quaternion.x,
          qy: player.quaternion.y,
          qz: player.quaternion.z,
          qw: player.quaternion.w,
        });
        this.lastRecordTime = this.elapsedTime;
      }
    }

    const appMode = (window as any)._appMode;
    let crossedFinish = false;
    let crossedHalfway = false;

    if (appMode === "track_oval") {
      if ((this.lastX < 0 && x >= 0) || (this.lastX > 0 && x <= 0)) {
        if (z > 0) crossedFinish = true;
        else crossedHalfway = true;
      }
    } else if (appMode === "track_retro") {
      // Start/Finish line is horizontally near z=20, on the right straight (x approx 130), on the ground (y < 15)
      // This prevents false positives when driving on the overhead highway bridge (y ~ 80, x ~ 175)
      if ((this.lastZ < 20 && z >= 20) || (this.lastZ > 20 && z <= 20)) {
        if (x > 100 && x < 155 && player.position.y < 15) {
          crossedFinish = true;
        }
      }
      // Halfway is on the left high straight (x approx -130) roughly across z=20 (y > 100)
      if ((this.lastZ < 20 && z >= 20) || (this.lastZ > 20 && z <= 20)) {
        if (x < -100 && x > -155 && player.position.y > 100) {
          crossedHalfway = true;
        }
      }
    } else if (appMode === "track_abyss") {
      const curve = (window as any)._trackCurve;
      if (curve) {
        const posHalf = curve.getPointAt(0.5);
        if (player.position.distanceTo(posHalf) < 45.0) {
          crossedHalfway = true;
        }
        const posEnd = curve.getPointAt(1.0);
        if (player.position.distanceTo(posEnd) < 35.0) {
          crossedFinish = true;
        }
      }
    }

    if (crossedFinish) {
      if (this.hasHitHalfway) {
        this.hasHitHalfway = false;
        if (this.currentLap <= this.maxLaps) {
          const bestTimeStr = localStorage.getItem("bestLapTime" + appMode);
          const bestTimeMs = bestTimeStr ? parseFloat(bestTimeStr) : Infinity;
          if (this.elapsedTime > 0 && this.elapsedTime < bestTimeMs) {
            localStorage.setItem(
              "bestLapTime" + appMode,
              this.elapsedTime.toString(),
            );
            try {
              localStorage.setItem(
                "bestLapGhost" + appMode,
                JSON.stringify(this.currentGhostData),
              );
            } catch (e) {
              console.error("Failed to save ghost data", e);
            }
            this.bestGhostData = [...this.currentGhostData];
            if (this.onBestTimeUpdate) {
              this.onBestTimeUpdate(this.formatTime(this.elapsedTime));
            }
            this.currentGhostIndex = 0;
          }

          const completedLapTimeStr = this.formatTime(this.elapsedTime);
          this.lapTimes.push(completedLapTimeStr);
          if (this.onLapCompleted) {
            this.onLapCompleted(this.lapTimes);
          }

          this.currentLap++;
          this.elapsedTime = 0;
          this.lastRecordTime = 0;
          this.currentGhostData = [];
          this.currentGhostIndex = 0;
          this.onLapUpdate(this.currentLap, this.maxLaps);
          if (this.currentLap > this.maxLaps) {
            this.isFinished = true;
          }
        }
      }
    } else if (crossedHalfway) {
      this.hasHitHalfway = true;
    }

    this.lastX = x;
    this.lastZ = z;
  }
}

export class GrindRailSystem implements TrackSubsystem {
  private rails: {
    curve: THREE.Curve<THREE.Vector3>;
    radius: number;
    mesh?: THREE.Group;
  }[] = [];

  constructor(railCurves: THREE.Curve<THREE.Vector3>[]) {
    this.rails = railCurves.map((curve) => ({ curve, radius: 4.0 }));
  }

  init(parent: THREE.Object3D) {
    // We could optionally generate visual meshes for the rails here
    // but typically they might be part of the static track geometry.
    // For this prototype, we'll draw simple tubes.
    for (const rail of this.rails) {
      const tubeGeo = new THREE.TubeGeometry(rail.curve, 64, 0.4, 8, false);
      const tubeMat = new THREE.MeshPhongMaterial({
        color: 0xff00ff,
        emissive: 0xaa00aa,
        opacity: 0.8,
        transparent: true,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);

      // Add glowing ring effect
      const group = new THREE.Group();
      group.add(tubeMesh);

      rail.mesh = group;
      parent.add(group);
    }
  }

  update(dt: number, player: PlayerState) {
    // Basic implementation: find nearest rail and snap if close enough.
    // Real implementation would need state tracking (isGrinding).
    for (const rail of this.rails) {
      // Sample points to find nearest
      const numSamples = 100;
      let minDistance = Infinity;
      let bestT = 0;
      let bestPoint = new THREE.Vector3();

      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const p = rail.curve.getPointAt(t);
        const dist = player.position.distanceTo(p);
        if (dist < minDistance) {
          minDistance = dist;
          bestT = t;
          bestPoint = p;
        }
      }

      // Snap to rail if close enough and player isn't already frozen
      if (minDistance < rail.radius && !player.isFrozen) {
        // Give a boost if just starting to grind?
        player.triggerBoost(20.0, 0.5); // Provide constant forward speed on the rail

        // Set baseHeightOverride
        player.baseHeightOverride = bestPoint.y + 0.5;

        // Snap position (just XZ)
        player.position.lerp(
          new THREE.Vector3(bestPoint.x, player.position.y, bestPoint.z),
          dt * 10,
        );

        // Align orientation (approximate)
        if (bestT < 1.0) {
          const tangent = rail.curve.getTangentAt(Math.min(bestT + 0.05, 1.0));

          // Set target heading based on path tangent
          const targetHeading = Math.atan2(-tangent.x, -tangent.z);

          // Lerp shortest angle distance
          let diff = targetHeading - player.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          player.setHeading(player.heading + diff * dt * 10);
        }
      }
    }
  }
}

// Subsystem Registry - City Trial Pattern
export class Track {
  private subsystems: Map<string, TrackSubsystem> = new Map();

  register(name: string, system: TrackSubsystem) {
    this.subsystems.set(name, system);
  }

  init(parent: THREE.Object3D) {
    for (const [name, system] of this.subsystems.entries()) {
      system.init(parent);
    }
  }

  update(dt: number, player: PlayerState) {
    for (const [name, system] of this.subsystems.entries()) {
      system.update(dt, player);
    }
  }
}

export class AISystem implements TrackSubsystem {
  private curve: THREE.Curve<THREE.Vector3>;
  private bots: {
    t: number;
    speed: number;
    mesh: THREE.Group;
    offset: number;
  }[] = [];

  constructor(curve: THREE.Curve<THREE.Vector3>, numBots: number) {
    this.curve = curve;
    const trackLength = curve.getLength();
    for (let i = 0; i < numBots; i++) {
      // desired speed in world units per second: ~30 to ~45
      const unitsPerSec = 30 + Math.random() * 15;
      this.bots.push({
        t: 0.05 + Math.random() * 0.05,
        speed: unitsPerSec / trackLength,
        mesh: createWarpStar(),
        offset: (Math.random() - 0.5) * 12,
      });
    }
  }

  init(parent: THREE.Object3D) {
    for (const bot of this.bots) {
      bot.t = 0.05 + Math.random() * 0.05; // Reset bots to start
      parent.add(bot.mesh);

      // random bot colors
      const botColor = Math.random() * 0xffffff;
      bot.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = child.material.clone();
          if (child.material.color) {
            child.material.color.setHex(botColor);
            if (child.material.emissive) {
              child.material.emissive.setHex(botColor);
              child.material.emissiveIntensity = 0.5;
            }
          }
        }
      });
    }
  }

  update(dt: number, player: PlayerState) {
    if (player.isFrozen) return;

    for (const bot of this.bots) {
      bot.t += bot.speed * dt;
      bot.t = bot.t % 1;

      // Calculate position with lateral offset
      const p = this.curve.getPointAt(bot.t);
      const tangent = this.curve.getTangentAt(bot.t);
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      p.add(right.multiplyScalar(bot.offset));
      p.y += 1.0;

      bot.mesh.position.copy(p);

      bot.mesh.rotation.y = Math.atan2(tangent.x, tangent.z);

      // rotate internal star logic
      bot.mesh.children.forEach((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.geometry instanceof THREE.CylinderGeometry
        ) {
          child.rotation.y += dt * 5;
        }
      });
    }
  }
}
