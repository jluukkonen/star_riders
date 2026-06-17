import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CatPilotAvatar } from "./CatPilotAvatar";

export class GameAvatar {
  public mesh: THREE.Group;
  private parent: THREE.Object3D;
  private isPlayer: boolean;

  // Modality States
  private currentType: string = "cat";
  private proceduralAvatar: CatPilotAvatar | null = null;
  private gltfLoader: GLTFLoader;

  // GLB Model properties
  private activeGLBMesh: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private activeAction: THREE.AnimationAction | null = null;
  private animations: THREE.AnimationClip[] = [];
  private eyeMeshes: THREE.Mesh[] = [];
  private eyelidLeft: THREE.Group | null = null;
  private eyelidRight: THREE.Group | null = null;
  
  // Animation / Interactive States
  private time: number = 0;
  private blinkTimer: number = 2;
  
  // Shoot/Hit timer triggers for GLB models
  private shootTimer: number = 0;
  private hitTimer: number = 0;

  constructor(parent: THREE.Object3D, furColor: number = 0xffb75e, isPlayer: boolean = false) {
    this.parent = parent;
    this.isPlayer = isPlayer;
    this.mesh = new THREE.Group();
    this.parent.add(this.mesh);

    this.gltfLoader = new GLTFLoader();

    // Default to procedural CatPilotAvatar
    this.proceduralAvatar = new CatPilotAvatar(this.mesh, furColor);
    
    // Register global current model trigger
    if (this.isPlayer) {
      (window as any)._currentModelName = "cat";
      if (!(window as any)._requestedModel) {
        (window as any)._requestedModel = "cat";
      }
    }
  }

  public setPosition(x: number, z: number) {
    this.mesh.position.set(x, this.mesh.position.y, z);
  }

  public triggerShoot() {
    if (this.proceduralAvatar) {
      this.proceduralAvatar.triggerShoot();
    } else {
      this.shootTimer = 0.4;
      // Play brief scale or attack/action animation if present
      this.playGLBAnimation("victory", 0.08); // blend quickly
    }
  }

  public triggerHit() {
    if (this.proceduralAvatar) {
      this.proceduralAvatar.triggerHit();
    } else {
      this.hitTimer = 0.6;
      this.playGLBAnimation("crash", 0.05);
    }
  }

  public switchTo(modelName: string) {
    const sanitized = modelName.trim().toLowerCase();
    if (this.currentType === sanitized) return;

    this.currentType = sanitized;
    if (this.isPlayer) {
      (window as any)._currentModelName = sanitized;
    }

    // Reset timers
    this.shootTimer = 0;
    this.hitTimer = 0;

    // Remove active GLB mesh if any
    this.clearGLB();

    // Clean up old procedural avatar
    if (this.proceduralAvatar) {
      this.proceduralAvatar.dispose();
      this.proceduralAvatar = null;
    }

    if (sanitized === "cat" || sanitized === "procedural_cat") {
      this.proceduralAvatar = new CatPilotAvatar(this.mesh, 0xffb75e);
    } else {
      this.loadGLBModel(sanitized);
    }
  }

  private clearGLB() {
    if (this.activeGLBMesh) {
      this.mesh.remove(this.activeGLBMesh);
      // Traverse and dispose geometries and materials
      this.activeGLBMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.activeGLBMesh = null;
    }
    if (this.eyelidLeft) {
      if (this.eyelidLeft.parent) this.eyelidLeft.parent.remove(this.eyelidLeft);
      this.eyelidLeft = null;
    }
    if (this.eyelidRight) {
      if (this.eyelidRight.parent) this.eyelidRight.parent.remove(this.eyelidRight);
      this.eyelidRight = null;
    }
    this.mixer = null;
    this.activeAction = null;
    this.animations = [];
    this.eyeMeshes = [];
    this.blinkTimer = 2; // reset blink interval
  }

  private loadGLBModel(animalName: string) {
    // Standard kenney file pattern: assets/kenney_cube-pets_1.0/Models/GLB format/animal-{name}.glb
    const url = `assets/kenney_cube-pets_1.0/Models/GLB%20format/animal-${animalName}.glb`;
    
    this.gltfLoader.load(
      url,
      (gltf) => {
        // Enforce that we didn't switch models while loading!
        if (this.currentType !== animalName) {
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
              if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
              else child.material.dispose();
            }
          });
          return;
        }

        this.clearGLB();

        const model = gltf.scene;
        
        // Scale and orient model
        // Cube pets are rotated facing -Z, which is the direction of travel.
        // We set rotation.y to 0 so they face forward.
        model.rotation.y = 0;
        
        // Let's scale up slightly to look robust on top of the warp star.
        // A scale of 1.4 is usually excellent.
        model.scale.setScalar(1.4);
        
        // Adjust vertically so their feet stand perfectly on the warp star surface.
        // The procedural cat stands nicely at y = 0 inside this.mesh.
        // Let's place the model.position.y at 0.1 so it looks perfect.
        model.position.set(0, 0, 0);

        // Standard shadows and materials
        this.eyeMeshes = [];
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Inject subtle material shininess for neon/retro vibe alignment
            if (child.material) {
              child.material.roughness = 0.4;
              child.material.metalness = 0.1;
            }

            // Find eye meshes
            const nameLower = child.name.toLowerCase();
            if (nameLower.includes("eye") || nameLower.includes("pupil")) {
              this.eyeMeshes.push(child);
              // Store their original vertical scale to compute relative blink values
              child.userData.originalScaleY = child.scale.y;
            }
          }
        });

        this.activeGLBMesh = model;
        this.mesh.add(model);

        // --- Cute Virtual Eyelid Systems ---
        const animalColors: Record<string, number> = {
          cow: 0xffffff,
          bee: 0xffd54f,
          penguin: 0x303030,
          crab: 0xe53935,
          panda: 0xffffff,
          tiger: 0xf57c00,
          caterpillar: 0x4caf50,
          beaver: 0x8d6e63,
          bunny: 0xe0e0e0,
          chick: 0xfff176,
          dog: 0xa1887f,
          elephant: 0xb0bec5,
          fox: 0xff7043,
          giraffe: 0xffb74d,
          koala: 0x90a4ae,
          lion: 0xffb74d,
          pig: 0xf8bbd0,
          polar: 0xffffff,
        };

        const bodyNode = model.getObjectByName("body");
        if (bodyNode) {
          const createEyelid = () => {
            const eyelidGroup = new THREE.Group();
            
            // Background block mesh to cover the painted eye
            const blockGeo = new THREE.PlaneGeometry(0.24, 0.24);
            const blockMat = new THREE.MeshBasicMaterial({
              color: animalColors[animalName] || 0xffffff,
              side: THREE.DoubleSide
            });
            const block = new THREE.Mesh(blockGeo, blockMat);
            eyelidGroup.add(block);
            
            // Stylized, super-cute curved/horizontal closed emoji line
            const lineGeo = new THREE.PlaneGeometry(0.18, 0.035);
            const lineMat = new THREE.MeshBasicMaterial({
              color: 0x222222,
              side: THREE.DoubleSide
            });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.z = 0.002; // placed slightly in front to avoid overlap
            eyelidGroup.add(line);
            
            return eyelidGroup;
          };

          // Positions match the cube pet geometry perfectly:
          // Local body node: eyes are on the positive Z side (face side, aligned with the snout at Z = 0.62)
          const leftLid = createEyelid();
          leftLid.position.set(0.23, 0.76, 0.505);
          leftLid.rotation.y = 0; // Face forward
          bodyNode.add(leftLid);

          const rightLid = createEyelid();
          rightLid.position.set(-0.23, 0.76, 0.505);
          rightLid.rotation.y = 0; // Face forward
          bodyNode.add(rightLid);

          this.eyelidLeft = leftLid;
          this.eyelidRight = rightLid;

          // Start fully open (scale y = 0)
          leftLid.scale.set(1, 0, 1);
          rightLid.scale.set(1, 0, 1);
        }

        // Set up animations
        this.animations = gltf.animations;
        if (this.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(model);
          // Start with Idle
          this.playGLBAnimation("idle");
        }
      },
      undefined,
      (err) => {
        console.error(`Failed to load animal model ${animalName}:`, err);
        // Fallback to cat if load fails
        this.switchTo("cat");
      }
    );
  }

  private getGLBAction(type: "idle" | "walk" | "jump" | "crash" | "victory"): THREE.AnimationAction | null {
    if (!this.mixer || this.animations.length === 0) return null;

    let clip: THREE.AnimationClip | undefined;
    const lowerType = type.toLowerCase();

    if (lowerType === "idle") {
      clip = this.animations.find((a) => a.name.toLowerCase().includes("idle"));
    } else if (lowerType === "walk") {
      clip = this.animations.find((a) => {
        const n = a.name.toLowerCase();
        return n.includes("walk") || n.includes("run") || n.includes("fly") || n.includes("swim") || n.includes("move");
      });
    } else if (lowerType === "jump") {
      clip = this.animations.find((a) => a.name.toLowerCase().includes("jump") || a.name.toLowerCase().includes("bounce"));
    } else if (lowerType === "crash") {
      clip = this.animations.find((a) => {
        const n = a.name.toLowerCase();
        return n.includes("death") || n.includes("hit") || n.includes("fall") || n.includes("fear");
      });
    } else if (lowerType === "victory") {
      clip = this.animations.find((a) => {
        const n = a.name.toLowerCase();
        return n.includes("victory") || n.includes("wave") || n.includes("cheer") || n.includes("dance") || n.includes("spin");
      });
    }

    // Comprehensive Fallbacks
    if (!clip) {
      if (lowerType === "idle") {
        clip = this.animations[0];
      } else if (lowerType === "walk") {
        clip = this.animations.find((a) => a.name.toLowerCase().includes("run")) || this.animations[1] || this.animations[0];
      } else if (lowerType === "jump") {
        clip = this.animations.find((a) => a.name.toLowerCase().includes("hop")) || this.animations[2] || this.animations[0];
      } else if (lowerType === "crash") {
        clip = this.animations.find((a) => a.name.toLowerCase().includes("hit")) || this.animations[3] || this.animations[0];
      } else if (lowerType === "victory") {
        clip = this.animations.find((a) => a.name.toLowerCase().includes("jump")) || this.animations[4] || this.animations[0];
      }
    }

    return clip ? this.mixer.clipAction(clip) : null;
  }

  private playGLBAnimation(type: "idle" | "walk" | "jump" | "crash" | "victory", fadeDuration: number = 0.15) {
    if (!this.mixer) return;
    const action = this.getGLBAction(type);
    if (!action) return;

    if (this.activeAction === action) {
      if (!this.activeAction.isRunning()) {
        this.activeAction.play();
      }
      return;
    }

    if (this.activeAction) {
      const prev = this.activeAction;
      prev.fadeOut(fadeDuration);
      action.reset().fadeIn(fadeDuration).play();
    } else {
      action.play();
    }
    this.activeAction = action;
  }

  public update(
    deltaTime: number,
    isMoving: boolean,
    isAirborne: boolean,
    isCharging: boolean = false,
    bankAngle: number = 0,
    spinAngle: number = 0,
    yVelocity: number = 0,
    state: "normal" | "crashed" | "victory" = "normal",
    isDrifting: boolean = false,
    isClimbingAir: boolean = false,
    isDescendingAir: boolean = false,
    isSustainedAirCruise: boolean = false
  ) {
    if (this.proceduralAvatar) {
      this.proceduralAvatar.update(
        deltaTime,
        isMoving,
        isAirborne,
        isCharging,
        bankAngle,
        spinAngle,
        yVelocity,
        state,
        isDrifting,
        isClimbingAir,
        isDescendingAir,
        isSustainedAirCruise
      );
      return;
    }

    this.time += deltaTime;

    // Active GLB Model Animation & Rig Logic
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Decaying Shoot/Hit Timers
    if (this.shootTimer > 0) {
      this.shootTimer -= deltaTime;
    }
    if (this.hitTimer > 0) {
      this.hitTimer -= deltaTime;
    }

    // --- Blinking Logic for GLB Models ---
    this.blinkTimer -= deltaTime;
    let eyeScaleMultY = 1.0;
    
    if (this.blinkTimer <= 0) {
      eyeScaleMultY = 0.1; // Eyes closed
      if (this.blinkTimer < -0.12) { // Hold blink for 120ms
        this.blinkTimer = Math.random() * 3.5 + 2.0; // Next blink in 2 to 5.5s
      }
    } else if (this.blinkTimer < 0.15) {
      // Smoothly transition open
      eyeScaleMultY = THREE.MathUtils.mapLinear(this.blinkTimer, 0, 0.15, 0.1, 1.0);
    }

    // Force eyes closed/cringed when hit or crashed
    if (state === "crashed" || this.hitTimer > 0) {
      eyeScaleMultY = 0.1;
    }

    // Apply eye scales to detected eye meshes
    for (const eye of this.eyeMeshes) {
      const originalY = eye.userData.originalScaleY !== undefined ? eye.userData.originalScaleY : 1.0;
      eye.scale.y = originalY * eyeScaleMultY;
    }

    // Apply interactive scaling to physical eyelids
    const lidScaleY = 1.0 - eyeScaleMultY;
    if (this.eyelidLeft) {
      this.eyelidLeft.scale.y = lidScaleY;
    }
    if (this.eyelidRight) {
      this.eyelidRight.scale.y = lidScaleY;
    }

    // Determine Animation State for GLB
    if (state === "crashed" || this.hitTimer > 0) {
      this.playGLBAnimation("crash");
    } else if (state === "victory") {
      this.playGLBAnimation("victory");
    } else if (this.shootTimer > 0) {
      this.playGLBAnimation("victory"); // wave or jump on shoot
    } else if (isAirborne) {
      this.playGLBAnimation("jump");
    } else if (isMoving) {
      this.playGLBAnimation("walk");
    } else {
      this.playGLBAnimation("idle");
    }

    // --- Dynamic Physical Squish / Stretch Scale Multipliers ---
    let scaleMultX = 1.0;
    let scaleMultY = 1.0;
    let scaleMultZ = 1.0;

    if (state === "crashed" || this.hitTimer > 0) {
      // Impact compression
      scaleMultX = 1.15;
      scaleMultY = 0.75;
      scaleMultZ = 1.15;
    } else if (state === "victory") {
      // Joyous elastic vertical stretch
      scaleMultX = 0.9;
      scaleMultY = 1.15;
      scaleMultZ = 0.9;
    } else if (isDrifting) {
      // Extreme drift slide squish (lower center of gravity)
      scaleMultX = 1.18;
      scaleMultY = 0.76;
      scaleMultZ = 1.18;
    } else if (isCharging && !isAirborne) {
      // Compression squish when storing boost energy
      scaleMultX = 1.25;
      scaleMultY = 0.68;
      scaleMultZ = 1.25;
    } else if (isAirborne) {
      if (isClimbingAir || yVelocity > 1.5) {
        // Active climbing / ascending sustained flight
        scaleMultX = 0.94;
        scaleMultY = 1.16;
        scaleMultZ = 0.94;
      } else if (isDescendingAir || yVelocity < -1.5) {
        // Active descending / diving tuck
        scaleMultX = 1.04;
        scaleMultY = 0.86;
        scaleMultZ = 1.04;
      } else if (isSustainedAirCruise) {
        // Sustained level air cruise (relaxed forward flight)
        const cruiseBob = Math.sin(this.time * 5.5) * 0.03;
        scaleMultX = 0.97;
        scaleMultY = 1.03 + cruiseBob * 0.8;
        scaleMultZ = 0.97;
      } else if (yVelocity < -2.0) {
        // Broad air-resistance gliding pose (transient fast fall)
        scaleMultX = 1.08;
        scaleMultY = 0.92;
        scaleMultZ = 1.08;
      } else {
        // High elastic vertical stretch proportional to velocity (transient jump)
        const velocityStretch = Math.min(Math.abs(yVelocity) * 0.05, 0.2);
        scaleMultX = 0.88 - velocityStretch;
        scaleMultY = 1.12 + velocityStretch;
        scaleMultZ = 0.88 - velocityStretch;
      }
    } else if (isMoving) {
      // Rhythmic step compression to give physical heft to walk/swim/crawl cycles
      const walkPhase = this.time * 15;
      const bounceFactor = Math.abs(Math.sin(walkPhase)) * 0.04;
      scaleMultX = 1.0 + bounceFactor;
      scaleMultY = 1.0 - bounceFactor;
      scaleMultZ = 1.0 + bounceFactor;
    } else {
      // Calm ambient deep breathing bob
      const breathPhase = this.time * 2.5;
      const breathPulse = Math.sin(breathPhase) * 0.02;
      scaleMultX = 1.0 + breathPulse;
      scaleMultY = 1.0 + breathPulse;
      scaleMultZ = 1.0 + breathPulse;
    }

    // Apply interactive physics adjustments to the GLB model
    if (this.activeGLBMesh) {
      // Direct Y alignment (cat rides at y=0.15, GLB should do the same)
      this.activeGLBMesh.position.y = 0.05;

      // Tilting & Bank roll feedback (Leaning into turns)
      // Cube pets also lean smoothly!
      const targetRoll = bankAngle * -0.3; // subtle roll

      // Enhanced pitch for air movement (climb / cruise / descend)
      let targetPitch = 0;
      if (isClimbingAir || yVelocity > 1.5) {
        targetPitch = -0.22; // nose up effort when climbing
      } else if (isDescendingAir || yVelocity < -1.5) {
        targetPitch = 0.18; // nose down tuck when descending
      } else if (isSustainedAirCruise) {
        targetPitch = -0.08; // gentle nose-up attitude for level air cruise
      } else if (isAirborne) {
        targetPitch = yVelocity > 0 ? -0.15 : 0.1;
      }

      const targetYaw = 0 + (isDrifting ? -bankAngle * 0.4 : 0); // yaw offset when sliding

      this.activeGLBMesh.rotation.z = THREE.MathUtils.lerp(this.activeGLBMesh.rotation.z, targetRoll, 10 * deltaTime);
      this.activeGLBMesh.rotation.x = THREE.MathUtils.lerp(this.activeGLBMesh.rotation.x, targetPitch, 10 * deltaTime);
      this.activeGLBMesh.rotation.y = THREE.MathUtils.lerp(this.activeGLBMesh.rotation.y, targetYaw, 10 * deltaTime);

      // Smoothly blend the physical scale adjustments
      const baseScale = 1.4;
      this.activeGLBMesh.scale.set(
        THREE.MathUtils.lerp(this.activeGLBMesh.scale.x, baseScale * scaleMultX, 15 * deltaTime),
        THREE.MathUtils.lerp(this.activeGLBMesh.scale.y, baseScale * scaleMultY, 15 * deltaTime),
        THREE.MathUtils.lerp(this.activeGLBMesh.scale.z, baseScale * scaleMultZ, 15 * deltaTime)
      );

      // Add neat idle micro-bobbing physically in addition to bone animations
      if (!isMoving && !isAirborne && state === "normal") {
        const bounce = Math.sin(this.time * 3) * 0.02;
        this.activeGLBMesh.position.y += bounce;
      }
    }

    // Apply absolute spin trick + 180 degrees rotation so avatar faces the same direction as the ship's nose
    this.mesh.rotation.y = spinAngle + Math.PI;
  }

  public dispose() {
    this.clearGLB();
    if (this.proceduralAvatar) {
      this.proceduralAvatar.dispose();
      this.proceduralAvatar = null;
    }
    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
