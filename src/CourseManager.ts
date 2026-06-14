import * as THREE from "three";
import { BoostPadSystem, GrindRailSystem, TrackSubsystem, PlayerState } from "./TrackSubsystems";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fbm } from "./utils";
import {
  ParallaxMountainsSystem,
  HolographicCitySystem,
  UnderTrackNeonSystem,
  HoveringPolyhedraSystem,
  NeonSpectatorGatesSystem,
  NeonGeyserSystem,
  RoadBarriersLODSystem,
  AmbientCrittersSystem,
  NebulaDebrisSystem,
} from "./RetroVisualSystems";

export interface TrackBuildResult {
  boostSystem: BoostPadSystem;
  railSystem?: GrindRailSystem;
  palmTreeSystem?: TrackSubsystem;
  parallaxMountainsSystem?: TrackSubsystem;
  holographicCitySystem?: TrackSubsystem;
  underTrackNeonSystem?: TrackSubsystem;
  hoveringPolyhedraSystem?: TrackSubsystem;
  neonSpectatorGatesSystem?: TrackSubsystem;
  neonGeyserSystem?: TrackSubsystem;
  roadBarriersLODSystem?: TrackSubsystem;
  tunnelLightsSystem?: TrackSubsystem;
  ambientCrittersSystem?: TrackSubsystem;
  nebulaDebrisSystem?: TrackSubsystem;
  curve: THREE.Curve<THREE.Vector3>;
}

// Shared tunnel capsule coordinates for shader clipping on mountains and terrain
export const globalTunnelClippingUniforms = {
  uTunnelA: { value: Array(48).fill(null).map(() => new THREE.Vector3()) },
  uTunnelB: { value: Array(48).fill(null).map(() => new THREE.Vector3()) },
  uTunnelR: { value: Array(48).fill(0) },
  uTunnelCount: { value: 0 }
};

export function applyTunnelClippingToMaterial(material: THREE.Material) {
  material.onBeforeCompile = (shader) => {
    // Inject Uniforms references
    shader.uniforms.uTunnelA = globalTunnelClippingUniforms.uTunnelA;
    shader.uniforms.uTunnelB = globalTunnelClippingUniforms.uTunnelB;
    shader.uniforms.uTunnelR = globalTunnelClippingUniforms.uTunnelR;
    shader.uniforms.uTunnelCount = globalTunnelClippingUniforms.uTunnelCount;

    // Inject varying and uniform structures in vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'varying vec3 vCustomWorldPosition;\nvoid main() {'
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\nvCustomWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
    );

    // Inject varying and uniforms and clipping logic in fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `uniform vec3 uTunnelA[48];
       uniform vec3 uTunnelB[48];
       uniform float uTunnelR[48];
       uniform int uTunnelCount;
       varying vec3 vCustomWorldPosition;
       void main() {`
    );

    // Inject the clipping loop at the top of fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
       for (int i = 0; i < 48; i++) {
         if (i >= uTunnelCount) break;
         vec3 A = uTunnelA[i];
         vec3 B = uTunnelB[i];
         float R = uTunnelR[i];
         vec3 v = B - A;
         vec3 w = vCustomWorldPosition - A;
         float lenSq = dot(v, v);
         if (lenSq > 0.0001) {
           float t_param = clamp(dot(w, v) / lenSq, 0.0, 1.0);
           vec3 closest = A + t_param * v;
           if (length(vCustomWorldPosition - closest) < R) {
             discard;
           }
         }
       }`
    );
  };
}

// --- Ultra-High-Performance Procedural Neon Palm Trees ---
export function createProceduralPalmTree(): THREE.Group {
  const treeGroup = new THREE.Group();

  // Trunk made of 6 stacked low-poly cylinders with natural curvature
  const segments = 6;
  const segmentHeight = 1.6;
  const baseRadius = 0.55;
  const topRadius = 0.3;
  
  const trunkMat = new THREE.MeshPhongMaterial({
    color: 0x140c24,
    emissive: 0x080311,
    shininess: 12,
    flatShading: true,
  });

  const prevPos = new THREE.Vector3(0, 0, 0);
  let bendAngle = 0;
  const leanDirectionX = (Math.random() - 0.5) * 0.15;
  const leanDirectionZ = (Math.random() - 0.5) * 0.15;

  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const radius = baseRadius - (baseRadius - topRadius) * t;
    
    const cylGeo = new THREE.CylinderGeometry(radius * 0.82, radius, segmentHeight, 6);
    cylGeo.translate(0, segmentHeight / 2, 0);

    const cyl = new THREE.Mesh(cylGeo, trunkMat);
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    cyl.position.copy(prevPos);
    
    cyl.rotation.z = bendAngle * leanDirectionX;
    cyl.rotation.x = bendAngle * leanDirectionZ;
    cyl.rotation.y = i * 0.2;

    treeGroup.add(cyl);

    const dir = new THREE.Vector3(0, 1, 0).applyEuler(cyl.rotation);
    prevPos.add(dir.multiplyScalar(segmentHeight));
    bendAngle += 0.45;
  }

  // Radiant glowing fronds/leaves in retro neon colors
  const leafCount = 8;
  const leafColors = [0xff00bb, 0x00ffff, 0xff007f];
  const chosenColor = leafColors[Math.floor(Math.random() * leafColors.length)];

  const leafMat = new THREE.MeshStandardMaterial({
    color: chosenColor,
    emissive: chosenColor,
    emissiveIntensity: 1.0,
    roughness: 0.1,
    metalness: 0.8,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  for (let l = 0; l < leafCount; l++) {
    const angle = (l / leafCount) * Math.PI * 2;
    const leafGroup = new THREE.Group();
    leafGroup.position.copy(prevPos);
    leafGroup.rotation.y = angle;

    const leafGeo = new THREE.ConeGeometry(0.6, 6.5, 4);
    leafGeo.rotateX(Math.PI / 2);
    leafGeo.translate(0, 0, 3.2);

    const leafMesh = new THREE.Mesh(leafGeo, leafMat);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafMesh.rotation.x = -0.32 - Math.random() * 0.15;

    leafGroup.add(leafMesh);
    treeGroup.add(leafGroup);
  }

  // Glowing core/coconuts
  const coreGeo = new THREE.SphereGeometry(0.7, 5, 5);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffea4a });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.copy(prevPos);
  treeGroup.add(coreMesh);

  return treeGroup;
}

export function createFuturisticFinishMaterial(repeatX: number, repeatY: number = 1): THREE.Material {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // 1. Sleek, high-tech translucent dark glass background
  ctx.fillStyle = "rgba(4, 3, 10, 0.4)";
  ctx.fillRect(0, 0, 128, 128);

  // 2. Beautiful glowing neon cyan panels
  ctx.fillStyle = "rgba(0, 235, 255, 0.18)";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillRect(64, 64, 64, 64);

  // 3. Glowing neon pink panels for high cyber contrast
  ctx.fillStyle = "rgba(255, 0, 160, 0.12)";
  ctx.fillRect(64, 0, 64, 64);
  ctx.fillRect(0, 64, 64, 64);

  // 4. Subtle metal grids and electronic circuit lines inside each panel
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, 120, 120);
  ctx.strokeRect(68, 4, 56, 56);
  ctx.strokeRect(4, 68, 56, 56);

  // 5. Bright sleek laser borders
  ctx.strokeStyle = "rgba(0, 235, 255, 0.7)";
  ctx.lineWidth = 2.0;
  ctx.strokeRect(1, 1, 62, 62);
  ctx.strokeRect(65, 65, 62, 62);

  ctx.strokeStyle = "rgba(255, 0, 160, 0.7)";
  ctx.lineWidth = 2.0;
  ctx.strokeRect(65, 1, 62, 62);
  ctx.strokeRect(1, 65, 62, 62);

  // 6. Cybernetic geometric crosshairs in the corners of each square
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  const drawCrosshairs = (x: number, y: number, size: number) => {
    // Top-left
    ctx.fillRect(x + 8, y + 8, 3, 1);
    ctx.fillRect(x + 8, y + 8, 1, 3);
    // Top-right
    ctx.fillRect(x + size - 11, y + 8, 3, 1);
    ctx.fillRect(x + size - 9, y + 8, 1, 3);
    // Bottom-left
    ctx.fillRect(x + 8, y + size - 9, 3, 1);
    ctx.fillRect(x + 8, y + size - 11, 1, 3);
    // Bottom-right
    ctx.fillRect(x + size - 11, y + size - 9, 3, 1);
    ctx.fillRect(x + size - 9, y + size - 11, 1, 3);
  };
  
  drawCrosshairs(0, 0, 64);
  drawCrosshairs(64, 0, 64);
  drawCrosshairs(0, 64, 64);
  drawCrosshairs(64, 64, 64);

  const checkTex = new THREE.CanvasTexture(canvas);
  checkTex.wrapS = THREE.RepeatWrapping;
  checkTex.wrapT = THREE.RepeatWrapping;
  checkTex.repeat.set(repeatX, repeatY);

  return new THREE.MeshStandardMaterial({
    map: checkTex,
    transparent: true,
    opacity: 0.95,
    metalness: 0.5,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
}

class PalmTreeLODSystem implements TrackSubsystem {
  private treePositions: THREE.Vector3[];
  private treeRotations: number[];
  private treeScales: number[];
  private proceduralTrees: THREE.Group[] = [];

  private instancedMeshes: THREE.InstancedMesh[] = [];
  private activeMatrices: THREE.Matrix4[][] = [];
  private gltfLoaded = false;

  private invisibleMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  private fallbackPlayerPos = new THREE.Vector3(0, 0, 0);

  constructor(
    treePositions: THREE.Vector3[],
    treeRotations: number[],
    treeScales: number[],
    proceduralTrees: THREE.Group[],
    private useGLB: boolean = false
  ) {
    this.treePositions = treePositions;
    this.treeRotations = treeRotations;
    this.treeScales = treeScales;
    this.proceduralTrees = proceduralTrees;
  }

  init(parent: THREE.Object3D) {
    if (!this.useGLB) {
      // Procedural trees are already child elements; ensure they are visible and exit early
      this.proceduralTrees.forEach((t) => {
        if (t) t.visible = true;
      });
      return;
    }

    const sessionToken = Math.random();
    (parent as any)._palmTreeSession = sessionToken;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/Meshy_AI_Starlit_Neon_Palm_Tre_0614142045_texture.glb",
      (gltf) => {
        if ((parent as any)._palmTreeSession !== sessionToken) return;

        const sourceMeshes: THREE.Mesh[] = [];
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            sourceMeshes.push(child as THREE.Mesh);
          }
        });

        if (sourceMeshes.length === 0) return;

        // Create an InstancedMesh for each sub-mesh inside the GLB model
        this.instancedMeshes = sourceMeshes.map((mesh) => {
          // Clone the material to apply neon enhancements safely
          const matClone = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();

          const materials = Array.isArray(matClone) ? matClone : [matClone];
          materials.forEach((mat: any) => {
            if (mat) {
              if (mat.emissive) {
                mat.emissiveIntensity = 1.0; // Higher glowing presence for visual pop
                mat.emissive.setHex(0xff33bb); // Neon pink/magenta glow
              }
            }
          });

          const instMesh = new THREE.InstancedMesh(
            mesh.geometry,
            matClone,
            21 // Total number of palm trees along the course
          );
          instMesh.castShadow = false;
          instMesh.receiveShadow = true;
          instMesh.frustumCulled = true;

          parent.add(instMesh);
          return instMesh;
        });

        const count = this.treePositions.length;
        this.activeMatrices = [];

        for (let i = 0; i < count; i++) {
          const treePos = this.treePositions[i];
          const treeRot = this.treeRotations[i];
          
          // Match the scale representation of the GLB palm trees
          const scaleMultiplier = i < 3 ? 10 : 13;
          const s = this.treeScales[i] * scaleMultiplier;

          const dummyTree = gltf.scene.clone();
          dummyTree.position.copy(treePos);

          // Raise trunk above road level based on the clone's high scale
          if (i >= 3) {
            dummyTree.position.y = (s * 0.455) - 0.55;
          } else if (i === 0) {
            dummyTree.position.y = 5.3;
          } else {
            dummyTree.position.y = 4.0;
          }

          dummyTree.rotation.set(0, treeRot, 0);
          dummyTree.scale.set(s, s, s);
          dummyTree.updateMatrixWorld(true);

          const instanceMeshes: THREE.Mesh[] = [];
          dummyTree.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              instanceMeshes.push(child as THREE.Mesh);
            }
          });

          this.activeMatrices[i] = instanceMeshes.map((m) => m.matrixWorld.clone());

          // Initially render out of bounds until player is nearby
          this.instancedMeshes.forEach((instMesh) => {
            instMesh.setMatrixAt(i, this.invisibleMatrix);
          });
        }

        this.instancedMeshes.forEach((instMesh) => {
          instMesh.instanceMatrix.needsUpdate = true;
          if (instMesh.computeBoundingSphere) {
            instMesh.computeBoundingSphere();
          }
        });

        this.gltfLoaded = true;
      },
      undefined,
      (err) => console.error("Error loading palm tree GLB asset:", err)
    );
  }

  update(dt: number, player: any) {
    const playerPos = player.position || this.fallbackPlayerPos;
    const lodThreshold = 350; // Spacious threshold to keep gorgeous GLTF assets rendering fully within visible distances
    const invisibleMatrix = this.invisibleMatrix;

    const count = this.treePositions.length;
    for (let i = 0; i < count; i++) {
      const treePos = this.treePositions[i];
      const dist = playerPos.distanceTo(treePos);

      if (dist < lodThreshold && this.gltfLoaded && this.instancedMeshes.length > 0) {
        // Active Close LOD range: Show Instanced high-poly meshes, Hide procedural ones
        for (let m = 0; m < this.instancedMeshes.length; m++) {
          const mat = this.activeMatrices[i]?.[m];
          if (mat) {
            this.instancedMeshes[m].setMatrixAt(i, mat);
          }
        }
        if (this.proceduralTrees[i]) {
          this.proceduralTrees[i].visible = false;
        }
      } else {
        // Far LOD range or GLTF still loading: Hide the instanced models, Show the lightweight procedural trees
        if (this.gltfLoaded) {
          for (let m = 0; m < this.instancedMeshes.length; m++) {
            this.instancedMeshes[m].setMatrixAt(i, invisibleMatrix);
          }
        }
        if (this.proceduralTrees[i]) {
          this.proceduralTrees[i].visible = true;
        }
      }
    }

    if (this.gltfLoaded) {
      for (let m = 0; m < this.instancedMeshes.length; m++) {
        this.instancedMeshes[m].instanceMatrix.needsUpdate = true;
        if (this.instancedMeshes[m].computeBoundingSphere) {
          this.instancedMeshes[m].computeBoundingSphere();
        }
      }
    }
  }
}

export function buildOvalTrack(trackGroup: THREE.Group): TrackBuildResult {
  const raceRadius = 55;
  const raceLength = 160;
  const trackWidth = 32;
  const halfWidth = trackWidth / 2;
  const R_mid = raceRadius - halfWidth; // 39

  // AI & Path Curve (centerline of the track)
  const ovalPoints = [
    new THREE.Vector3(-raceLength / 2, 0, R_mid),
    new THREE.Vector3(0, 0, R_mid),
    new THREE.Vector3(raceLength / 2, 0, R_mid),
  ];
  for (let i = 1; i <= 10; i++) {
    const theta = Math.PI / 2 - (Math.PI * i) / 10;
    ovalPoints.push(
      new THREE.Vector3(
        raceLength / 2 + Math.cos(theta) * R_mid,
        0,
        Math.sin(theta) * R_mid,
      ),
    );
  }
  ovalPoints.push(new THREE.Vector3(0, 0, -R_mid));
  ovalPoints.push(new THREE.Vector3(-raceLength / 2, 0, -R_mid));
  for (let i = 1; i < 10; i++) {
    const theta = -Math.PI / 2 - (Math.PI * i) / 10;
    ovalPoints.push(
      new THREE.Vector3(
        -raceLength / 2 + Math.cos(theta) * R_mid,
        0,
        Math.sin(theta) * R_mid,
      ),
    );
  }
  const trackCurve = new THREE.CatmullRomCurve3(ovalPoints, true);

  const segments = 400;
  const spacedPoints = trackCurve.getSpacedPoints(segments);

  // --- Create High-Fidelity Procedural Road Texture ---
  const roadCanvas = document.createElement("canvas");
  roadCanvas.width = 256;
  roadCanvas.height = 256;
  const roadCtx = roadCanvas.getContext("2d")!;

  // 1. Sleek, extremely dark obsidian/black-hole base tarmac
  roadCtx.fillStyle = "#030205";
  roadCtx.fillRect(0, 0, 256, 256);

  // 2. Linear modern metallic seam lines instead of gritty pixel noise
  roadCtx.strokeStyle = "rgba(255, 255, 255, 0.015)";
  roadCtx.lineWidth = 1.0;
  for (let x = 32; x < 256; x += 32) {
    roadCtx.beginPath();
    roadCtx.moveTo(x, 0); roadCtx.lineTo(x, 256);
    roadCtx.stroke();
  }

  // 3. Extra subtle flowing side markers (toned down majorly)
  roadCtx.strokeStyle = "rgba(235, 145, 170, 0.15)";
  roadCtx.lineWidth = 2.0;
  roadCtx.strokeRect(0, 0, 256, 256);

  // 4. Subtle guide lanes subgrid (extra dim cyan)
  roadCtx.strokeStyle = "rgba(51, 170, 255, 0.08)";
  roadCtx.lineWidth = 1.0;
  roadCtx.beginPath();
  roadCtx.moveTo(128, 0); roadCtx.lineTo(128, 256);
  roadCtx.stroke();

  // 5. Dual sleek, thin center dashed lanes
  roadCtx.strokeStyle = "rgba(51, 170, 255, 0.22)";
  roadCtx.lineWidth = 1.5;
  roadCtx.setLineDash([16, 20]);
  roadCtx.beginPath();
  roadCtx.moveTo(64, 0); roadCtx.lineTo(64, 256);
  roadCtx.moveTo(192, 0); roadCtx.lineTo(192, 256);
  roadCtx.stroke();

  const roadTex = new THREE.CanvasTexture(roadCanvas);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 35); // Perfectly wrapped to repeat 35 times along the curves

  // Convert to high-end MeshStandardMaterial for real-time metallic specular and smooth shading reflection
  const trackMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    metalness: 0.6,     // Sleek satin metal response
    roughness: 0.45,    // Satin finish that scatters highlights smoothly along curves and prevents harsh glare hotspots
    flatShading: false, // Ensure perfectly smooth shading over the polygonal segments (no grid grit)
  });

  // Generate Ribbon Road Geometry
  const trackGeo = new THREE.BufferGeometry();
  const roadVertices = new Float32Array((segments + 1) * 2 * 3);
  const roadUvs = new Float32Array((segments + 1) * 2 * 2);
  const roadIndices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = trackCurve.getTangentAt(Math.min(t, 0.9999));
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const vIn = p.clone().add(normal.clone().multiplyScalar(-halfWidth));
    const vOut = p.clone().add(normal.clone().multiplyScalar(halfWidth));

    roadVertices[i * 6] = vIn.x;
    roadVertices[i * 6 + 1] = vIn.y;
    roadVertices[i * 6 + 2] = vIn.z;
    roadVertices[i * 6 + 3] = vOut.x;
    roadVertices[i * 6 + 4] = vOut.y;
    roadVertices[i * 6 + 5] = vOut.z;

    roadUvs[i * 4] = 0;
    roadUvs[i * 4 + 1] = t;
    roadUvs[i * 4 + 2] = 1;
    roadUvs[i * 4 + 3] = t;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      roadIndices.push(a, b, c);
      roadIndices.push(b, d, c);
    }
  }

  trackGeo.setAttribute("position", new THREE.BufferAttribute(roadVertices, 3));
  trackGeo.setAttribute("uv", new THREE.BufferAttribute(roadUvs, 2));
  trackGeo.setIndex(roadIndices);
  trackGeo.computeVertexNormals();

  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.y = -0.5;
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // --- Create High-Fidelity Procedural Wall Texture (Option 2: Deep Translucent Neon Laser Grid) ---
  const wallCanvas = document.createElement("canvas");
  wallCanvas.width = 256;
  wallCanvas.height = 64;
  const wallCtx = wallCanvas.getContext("2d")!;

  // 1. Sleek, deeply translucent cyberpunk purple backdrop
  wallCtx.fillStyle = "rgba(12, 4, 28, 0.65)";
  wallCtx.fillRect(0, 0, 256, 64);

  // 2. Neon digital horizontal scanlines
  wallCtx.strokeStyle = "rgba(255, 51, 187, 0.45)"; // Hot neon pink glowing scanline
  wallCtx.lineWidth = 1.5;
  wallCtx.beginPath();
  wallCtx.moveTo(0, 16); wallCtx.lineTo(256, 16);
  wallCtx.moveTo(0, 32); wallCtx.lineTo(256, 32);
  wallCtx.moveTo(0, 48); wallCtx.lineTo(256, 48);
  wallCtx.stroke();

  // 3. Neon cyan vertical grid lines (recreates digital space cage depth)
  wallCtx.strokeStyle = "rgba(51, 255, 255, 0.35)"; // Electric cyan grid dividers
  wallCtx.lineWidth = 1.0;
  wallCtx.beginPath();
  for (let x = 0; x < 256; x += 32) {
    wallCtx.moveTo(x, 0);
    wallCtx.lineTo(x, 64);
  }
  wallCtx.stroke();

  // 4. Chevron speed indicators pointing forward
  wallCtx.strokeStyle = "rgba(51, 255, 255, 0.85)"; // Bright glowing neon cyan
  wallCtx.lineWidth = 2.0;
  for (let x = 16; x < 256; x += 64) {
    wallCtx.beginPath();
    wallCtx.moveTo(x - 6, 14);
    wallCtx.lineTo(x + 2, 32);
    wallCtx.lineTo(x - 6, 50);
    wallCtx.stroke();
  }

  // 5. Bright high-visibility neon pink top and cyan bottom LED border tubes
  wallCtx.fillStyle = "#ff33bb";
  wallCtx.fillRect(0, 0, 256, 4);
  wallCtx.fillStyle = "#33ffff";
  wallCtx.fillRect(0, 60, 256, 4);

  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(80, 1); // Perfect repeat horizontal count

  const wallMaterial = new THREE.MeshPhongMaterial({
    map: wallTex,
    emissive: 0x4411bb,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  // Generate Ribbon Wall Geometries
  const outerWallGeo = new THREE.BufferGeometry();
  const outerVertices = new Float32Array((segments + 1) * 2 * 3);
  const outerUvs = new Float32Array((segments + 1) * 2 * 2);
  const outerIndices = [];

  const innerWallGeo = new THREE.BufferGeometry();
  const innerVertices = new Float32Array((segments + 1) * 2 * 3);
  const innerUvs = new Float32Array((segments + 1) * 2 * 2);
  const innerIndices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = trackCurve.getTangentAt(Math.min(t, 0.9999));
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const pOut = p.clone().add(normal.clone().multiplyScalar(halfWidth + 0.1));
    const pIn = p.clone().add(normal.clone().multiplyScalar(-(halfWidth + 0.1)));

    // Outer wall vertices standing from -0.5 to 3.0 height
    outerVertices[i * 6] = pOut.x;
    outerVertices[i * 6 + 1] = -0.5;
    outerVertices[i * 6 + 2] = pOut.z;
    outerVertices[i * 6 + 3] = pOut.x;
    outerVertices[i * 6 + 4] = 3.0;
    outerVertices[i * 6 + 5] = pOut.z;

    // Outer UVs
    outerUvs[i * 4] = t;
    outerUvs[i * 4 + 1] = 0;
    outerUvs[i * 4 + 2] = t;
    outerUvs[i * 4 + 3] = 1;

    // Inner wall vertices
    innerVertices[i * 6] = pIn.x;
    innerVertices[i * 6 + 1] = -0.5;
    innerVertices[i * 6 + 2] = pIn.z;
    innerVertices[i * 6 + 3] = pIn.x;
    innerVertices[i * 6 + 4] = 3.0;
    innerVertices[i * 6 + 5] = pIn.z;

    // Inner UVs
    innerUvs[i * 4] = t;
    innerUvs[i * 4 + 1] = 0;
    innerUvs[i * 4 + 2] = t;
    innerUvs[i * 4 + 3] = 1;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      
      outerIndices.push(a, b, c);
      outerIndices.push(b, d, c);

      innerIndices.push(a, b, c);
      innerIndices.push(b, d, c);
    }
  }

  outerWallGeo.setAttribute("position", new THREE.BufferAttribute(outerVertices, 3));
  outerWallGeo.setAttribute("uv", new THREE.BufferAttribute(outerUvs, 2));
  outerWallGeo.setIndex(outerIndices);
  outerWallGeo.computeVertexNormals();

  innerWallGeo.setAttribute("position", new THREE.BufferAttribute(innerVertices, 3));
  innerWallGeo.setAttribute("uv", new THREE.BufferAttribute(innerUvs, 2));
  innerWallGeo.setIndex(innerIndices);
  innerWallGeo.computeVertexNormals();

  const outerWallMesh = new THREE.Mesh(outerWallGeo, wallMaterial);
  outerWallMesh.userData.isWall = true;
  trackGroup.add(outerWallMesh);

  const innerWallMesh = new THREE.Mesh(innerWallGeo, wallMaterial);
  innerWallMesh.userData.isWall = true;
  trackGroup.add(innerWallMesh);

  // --- Create Lit Start/Finish Line Checker ---
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(8, 1);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);
  finishLine.position.set(0, -0.48, R_mid); // Placed slightly above -0.5 to prevent z-fighting
  trackGroup.add(finishLine);

  // --- Retro Synthwave Neon Stage Lighting ---
  const pinkLight = new THREE.DirectionalLight(0xff00bb, 0.8);
  pinkLight.position.set(-50, 40, -100);
  trackGroup.add(pinkLight);

  const cyanLight = new THREE.DirectionalLight(0x00ffff, 0.6);
  cyanLight.position.set(50, 30, 100);
  trackGroup.add(cyanLight);

  // --- Create High-Fidelity Synthwave Ground Grid ---
  const groundGeo = new THREE.PlaneGeometry(1200, 1200);
  groundGeo.rotateX(-Math.PI / 2);
  
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = 128;
  gridCanvas.height = 128;
  const gridCtx = gridCanvas.getContext("2d")!;
  gridCtx.fillStyle = "#010002"; // Sleek, near pitch black space base
  gridCtx.fillRect(0, 0, 128, 128);
  
  // Extra subtle, dark violet grid outlines (visible but sleek)
  gridCtx.strokeStyle = "rgba(160, 45, 255, 0.22)";
  gridCtx.lineWidth = 1.0;
  gridCtx.strokeRect(0, 0, 128, 128);
  
  const gridTex = new THREE.CanvasTexture(gridCanvas);
  gridTex.wrapS = THREE.RepeatWrapping;
  gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.repeat.set(12, 12); // Spaced even more far apart for clean visual field stability
  
  const groundMat = new THREE.MeshStandardMaterial({
    map: gridTex,
    color: 0x030206, // Deep, premium dark midnight black
    metalness: 0.7,  // Rich metallic essence
    roughness: 0.6,  // Sleek, satin-brushed smooth metal; diffuses harsh hemispheric whites
    flatShading: false, // Completely eliminates the tri-faceted gritty polygon seams
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.y = -0.55; // Aligned just under the track
  trackGroup.add(groundMesh);

  // --- Giant Synthwave Dusk/Sunset Sun in the distant horizon ---
  const sunCanvas = document.createElement("canvas");
  sunCanvas.width = 512;
  sunCanvas.height = 512;
  const sunCtx = sunCanvas.getContext("2d")!;
  
  // Create a stunning red-to-yellow gradient
  const grad = sunCtx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#ff007f");  // Hot Magenta
  grad.addColorStop(0.4, "#ff4000"); // Intense Orange
  grad.addColorStop(1, "#ffd700");   // Electric Yellow
  
  // Fill circle
  sunCtx.fillStyle = grad;
  sunCtx.beginPath();
  sunCtx.arc(256, 256, 240, 0, Math.PI * 2);
  sunCtx.fill();
  
  // Render classic synthwave horizontal slice lines (growing thicker downwards)
  sunCtx.globalCompositeOperation = "destination-out";
  sunCtx.fillStyle = "#000000";
  for (let y = 280; y < 490; y += 22) {
    const thickness = Math.floor((y - 250) * 0.08) + 3;
    sunCtx.fillRect(0, y, 512, thickness);
  }
  
  const sunTex = new THREE.CanvasTexture(sunCanvas);
  const sunMat = new THREE.MeshBasicMaterial({
    map: sunTex,
    transparent: true,
    alphaTest: 0.02,
    side: THREE.DoubleSide,
  });
  
  const sunGeo = new THREE.PlaneGeometry(160, 160);
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.name = "synthwaveSun";
  // Position it far away in the background (Z is far behind the curves)
  sunMesh.position.set(0, 45, -350);
  trackGroup.add(sunMesh);

  // --- Distant Low-Poly Pyramids with Glowing Wireframe Edges ---
  const pyrGeo = new THREE.ConeGeometry(40, 80, 4);
  const pyrMat = new THREE.MeshPhongMaterial({
    color: 0x0a0414,
    emissive: 0x22053a,
    flatShading: true,
    shininess: 5,
  });
  const pyrWireMat = new THREE.MeshBasicMaterial({
    color: 0xff33bb,
    wireframe: true,
  });

  const pyramidPositions = [
    new THREE.Vector3(-250, 30, -280),
    new THREE.Vector3(-150, 20, -310),
    new THREE.Vector3(150, 20, -310),
    new THREE.Vector3(250, 30, -280),
  ];

  pyramidPositions.forEach((pos, idx) => {
    const pGroup = new THREE.Group();
    pGroup.position.copy(pos);

    const pyramid = new THREE.Mesh(pyrGeo, pyrMat);
    const wire = new THREE.Mesh(pyrGeo, pyrWireMat);
    wire.scale.setScalar(1.008); // Avoid z-fighting

    pGroup.add(pyramid);
    pGroup.add(wire);
    
    // Scale and rotation variations
    const s = 0.8 + (idx % 3) * 0.25;
    pGroup.scale.set(s, s, s);
    pGroup.rotation.y = Math.PI / 4 + idx * 0.3;

    trackGroup.add(pGroup);
  });

  // Track positions, rotations, scales and groups for instancing and LOD transitions
  const treePositions: THREE.Vector3[] = [];
  const treeRotations: number[] = [];
  const treeScales: number[] = [];
  const proceduralTrees: THREE.Group[] = [];

  // 1. One central tree directly in the center island
  const centerPos = new THREE.Vector3(0, -0.55, 0);
  const centerScale = 1.4;
  const centerRot = 0;
  const centerTree = createProceduralPalmTree();
  centerTree.scale.set(centerScale, centerScale, centerScale);
  centerTree.position.copy(centerPos);
  trackGroup.add(centerTree);

  treePositions.push(centerPos);
  treeRotations.push(centerRot);
  treeScales.push(centerScale);
  proceduralTrees.push(centerTree);

  // Left center island tree
  const leftPos = new THREE.Vector3(-60, -0.55, 0);
  const leftScale = 1.0;
  const leftRot = 0;
  const leftCenterTree = createProceduralPalmTree();
  leftCenterTree.scale.set(leftScale, leftScale, leftScale);
  leftCenterTree.position.copy(leftPos);
  trackGroup.add(leftCenterTree);

  treePositions.push(leftPos);
  treeRotations.push(leftRot);
  treeScales.push(leftScale);
  proceduralTrees.push(leftCenterTree);

  // Right center island tree
  const rightPos = new THREE.Vector3(60, -0.55, 0);
  const rightScale = 1.0;
  const rightRot = 0;
  const rightCenterTree = createProceduralPalmTree();
  rightCenterTree.scale.set(rightScale, rightScale, rightScale);
  rightCenterTree.position.copy(rightPos);
  trackGroup.add(rightCenterTree);

  treePositions.push(rightPos);
  treeRotations.push(rightRot);
  treeScales.push(rightScale);
  proceduralTrees.push(rightCenterTree);

  // 2. Distribute 18 trees perfectly lining the inner & outer track margins!
  const treesCount = 18;
  for (let j = 0; j < treesCount; j++) {
    const tVal = j / treesCount;
    const pt = trackCurve.getPointAt(tVal);
    const tangent = trackCurve.getTangentAt(tVal);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Place on the outer or inner shoulder of the road (alternating to prevent occlusion)
    const side = j % 2 === 0 ? 1 : -1;
    const treeClone = createProceduralPalmTree();
    
    // Offset by half-width + safety margin
    const offsetDist = side * (halfWidth + 4.5);
    const targetPos = pt.clone().add(normal.clone().multiplyScalar(offsetDist));
    targetPos.y = -0.55;
    
    // Random scale variation for natural unique appearance
    const scaleRandom = 0.65 + Math.random() * 0.25;
    treeClone.scale.set(scaleRandom, scaleRandom, scaleRandom);
    treeClone.position.copy(targetPos);
    
    // Face the normal direction (with a little random rotation spread)
    const rotY = Math.atan2(normal.x, normal.z) + (Math.random() - 0.5) * 0.4;
    treeClone.rotation.y = rotY;
    
    trackGroup.add(treeClone);

    treePositions.push(targetPos);
    treeRotations.push(rotY);
    treeScales.push(scaleRandom);
    proceduralTrees.push(treeClone);
  }

  const palmTreeSystem = new PalmTreeLODSystem(
    treePositions,
    treeRotations,
    treeScales,
    proceduralTrees,
    true
  );

  const parallaxMountainsSystem = new ParallaxMountainsSystem();
  const holographicCitySystem = new HolographicCitySystem();
  const underTrackNeonSystem = new UnderTrackNeonSystem(trackCurve, halfWidth);
  const hoveringPolyhedraSystem = new HoveringPolyhedraSystem(trackCurve, halfWidth, true);
  const neonSpectatorGatesSystem = new NeonSpectatorGatesSystem(trackCurve, halfWidth, true);

  return {
    boostSystem: new BoostPadSystem([
      new THREE.Vector3(30, -0.4, 39),
      new THREE.Vector3(-30, -0.4, -39),
      new THREE.Vector3(119, -0.4, 0),
      new THREE.Vector3(-119, -0.4, 0),
    ], trackCurve),
    palmTreeSystem,
    parallaxMountainsSystem,
    holographicCitySystem,
    underTrackNeonSystem,
    hoveringPolyhedraSystem,
    neonSpectatorGatesSystem,
    curve: trackCurve,
  };
}

export function createCyberTrackMaterial(): THREE.Material {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // 1. Core road body: dark graphite cyber polymer
  ctx.fillStyle = "#0c071a";
  ctx.fillRect(0, 0, 128, 512);

  // 2. Micro cyber grid weave
  ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
  for (let x = 0; x < 128; x += 8) {
    for (let y = 0; y < 512; y += 8) {
      if ((x + y) % 16 === 0) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }

  // 3. Glowing neon double center-dashed lines (Cyan)
  ctx.fillStyle = "rgba(0, 255, 255, 0.85)";
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(60, y + 10, 3, 22);
    ctx.fillRect(65, y + 10, 3, 22);
  }

  // 4. Glowing hot pink outer laser lane boundaries
  ctx.fillStyle = "rgba(255, 0, 128, 0.95)";
  ctx.fillRect(0, 0, 5, 512);
  ctx.fillRect(123, 0, 5, 512);

  // 5. Electronic circuit traces flowing inside lanes
  ctx.fillStyle = "rgba(0, 255, 255, 0.15)";
  for (let y = 0; y < 512; y += 128) {
    ctx.fillRect(15, y + 40, 14, 2);
    ctx.fillRect(15, y + 40, 2, 20);
    ctx.fillRect(99, y + 80, 14, 2);
    ctx.fillRect(111, y + 80, 2, 20);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 35);

  return new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 90,
    specular: 0x3366cc,
    flatShading: true,
    side: THREE.DoubleSide,
  });
}

export function createRetroWallMaterial(): THREE.Material {
  const wallCanvas = document.createElement("canvas");
  wallCanvas.width = 256;
  wallCanvas.height = 128;
  const wallCtx = wallCanvas.getContext("2d")!;

  // 1. Sleek deep-purple transparent forcefield background
  wallCtx.fillStyle = "rgba(10, 5, 24, 0.4)";
  wallCtx.fillRect(0, 0, 256, 128);

  // 2. Glowing micro scanline mesh
  wallCtx.fillStyle = "rgba(255, 0, 187, 0.08)";
  for (let y = 0; y < 128; y += 4) {
    wallCtx.fillRect(0, y, 256, 1);
  }

  // 3. Neon cyberpunk diamond wire grid (recreates energy shield vibe)
  wallCtx.strokeStyle = "rgba(0, 255, 255, 0.25)";
  wallCtx.lineWidth = 1.0;
  wallCtx.beginPath();
  for (let x = -128; x < 256 + 128; x += 32) {
    // diagonals going forward/down
    wallCtx.moveTo(x, 0);
    wallCtx.lineTo(x + 128, 128);
    // diagonals going backward/down
    wallCtx.moveTo(x + 128, 0);
    wallCtx.lineTo(x, 128);
  }
  wallCtx.stroke();

  // 4. Chevron speed boosters pointing in reverse direction of scroll (visual forward motion feedback)
  wallCtx.strokeStyle = "rgba(0, 255, 255, 0.8)";
  wallCtx.lineWidth = 2.0;
  for (let x = 32; x < 256; x += 64) {
    wallCtx.beginPath();
    wallCtx.moveTo(x - 8, 32);
    wallCtx.lineTo(x + 2, 64);
    wallCtx.lineTo(x - 8, 96);
    wallCtx.stroke();
  }

  // 5. Bright glowing neon pink top and cyan bottom LED ribbon guides
  wallCtx.fillStyle = "#ff00bb";
  wallCtx.fillRect(0, 0, 256, 6);
  wallCtx.fillStyle = "#00ffff";
  wallCtx.fillRect(0, 122, 256, 6);

  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = THREE.RepeatWrapping;
  wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(50, 1); // Standard horizontal repeat count

  return new THREE.MeshPhongMaterial({
    map: wallTex,
    emissive: 0x220555,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    flatShading: true,
  });
}

export function createCyberMountain(
  height: number,
  radius: number,
  mountainWorldPos: THREE.Vector3,
  preSampledCurvePoints: THREE.Vector3[],
  carverRadius: number,
  pointsCount: number = 7
): THREE.Group {
  const group = new THREE.Group();

  // Highlight-optimized carving: pre-filter curve points within the local reach of this mountain
  // This drastically increases performance and allows much higher core sample counts.
  const nearPoints = preSampledCurvePoints.filter(pt => {
    const dx = pt.x - mountainWorldPos.x;
    const dy = pt.y - mountainWorldPos.y;
    const dz = pt.z - mountainWorldPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const limit = radius + height / 2 + carverRadius + 50.0;
    return distSq < limit * limit;
  });

  const pointsToCheck = nearPoints.length > 0 ? nearPoints : preSampledCurvePoints;

  // Use high-resolution geometry (60 radial, 30 height segments) to enable precise 3D carving.
  // This prevents huge low-poly triangles from stretching across the tunnel clearance zone.
  const coneGeo = new THREE.ConeGeometry(radius, height, 60, 30);
  const ipos = coneGeo.attributes.position;
  const tempV = new THREE.Vector3();
  const worldV = new THREE.Vector3();

  for (let i = 0; i < ipos.count; i++) {
    tempV.fromBufferAttribute(ipos, i);

    // Apply baseline procedural peak distortion (except center peak tip)
    if (tempV.y < height / 2 && tempV.y > -height / 2) {
      const angle = Math.atan2(tempV.z, tempV.x);
      const scale = 1 + Math.sin(angle * 3) * 0.18 + Math.cos(tempV.y * 0.15) * 0.12;
      tempV.x *= scale;
      tempV.z *= scale;
      tempV.y += (Math.sin(angle * 5) * 5);
    }

    // Now convert to world space to check intersection with the track
    worldV.copy(tempV).add(mountainWorldPos);

    // Find closest point on the track
    let minDistSq = Infinity;
    let closestPt = pointsToCheck[0];
    for (let k = 0; k < pointsToCheck.length; k++) {
      const pt = pointsToCheck[k];
      const dx = worldV.x - pt.x;
      let dy = worldV.y - pt.y;
      // Convert vertical offset below the track to 0 for vertical wall/keyhole carving of bases
      if (dy < 0) {
        dy = 0;
      }
      const dz = worldV.z - pt.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestPt = pt;
      }
    }

    const dist = Math.sqrt(minDistSq);
    if (dist < carverRadius) {
      // It's inside the carving tunnel cylinder/column! Push it out.
      if (worldV.y < closestPt.y) {
        // Push horizontally in 2D to create a clean vertical cliff/gorge below the track level
        const dir2D = new THREE.Vector3(worldV.x - closestPt.x, 0, worldV.z - closestPt.z);
        if (dir2D.lengthSq() < 0.0001) {
          dir2D.set(1, 0, 0);
        } else {
          dir2D.normalize();
        }
        const targetWorldV = closestPt.clone().add(dir2D.multiplyScalar(carverRadius));
        targetWorldV.y = worldV.y; // Keep the original height
        
        const localCarved = targetWorldV.clone().sub(mountainWorldPos);
        tempV.copy(localCarved);
      } else {
        // Standard 3D radial push for the beautiful tunnel ceiling arch
        const dir = new THREE.Vector3().subVectors(worldV, closestPt);
        if (dir.lengthSq() < 0.0001) {
          dir.set(1, 1, 0);
        } else {
          dir.normalize();
        }
        const targetWorldV = closestPt.clone().add(dir.multiplyScalar(carverRadius));
        const localCarved = targetWorldV.clone().sub(mountainWorldPos);
        tempV.copy(localCarved);
      }
    }

    ipos.setXYZ(i, tempV.x, tempV.y, tempV.z);
  }
  coneGeo.computeVertexNormals();

   const baseMat = new THREE.MeshPhongMaterial({
    color: 0x070112, // extremely dark purple obsidian
    emissive: 0x110222, // space horizon glow
    specular: 0x00ffff,
    shininess: 95,
    flatShading: true,
    side: THREE.DoubleSide
  });
  applyTunnelClippingToMaterial(baseMat);

  const mountainMesh = new THREE.Mesh(coneGeo, baseMat);
  group.add(mountainMesh);

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.15,
    depthWrite: false
  });
  applyTunnelClippingToMaterial(wireframeMat);
  const wireMesh = new THREE.Mesh(coneGeo, wireframeMat);
  wireMesh.scale.multiplyScalar(1.002);
  group.add(wireMesh);

  // Decorative dual scanning elevation rings
  const ringGeo1 = new THREE.TorusGeometry(radius * 0.7, 0.4, 4, 16);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xff00bb, toneMapped: false });
  applyTunnelClippingToMaterial(ringMat1);
  const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = -height * 0.15;
  group.add(ring1);

  const ringGeo2 = new THREE.TorusGeometry(radius * 0.4, 0.4, 4, 16);
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffff, toneMapped: false });
  applyTunnelClippingToMaterial(ringMat2);
  const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = height * 0.2;
  group.add(ring2);

  return group;
}

export function createCyberTunnelPortal(pos: THREE.Vector3, tangent: THREE.Vector3, portalType: boolean | 'primary' | 'secondary' | 'tertiary', halfWidth: number): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(pos);

  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
  group.quaternion.copy(quat);

  let mappedType: 'primary' | 'secondary' | 'tertiary' = 'primary';
  if (portalType === 'secondary' || portalType === false) {
    mappedType = 'secondary';
  } else if (portalType === 'tertiary') {
    mappedType = 'tertiary';
  }

  let ringColor = 0x00ffff;
  if (mappedType === 'secondary') ringColor = 0xff9900;
  if (mappedType === 'tertiary') ringColor = 0x00ff66;
  
  // A beautiful hexagonal structural portal frame hugging the track nicely
  const rimGeo = new THREE.TorusGeometry(halfWidth + 3.0, 0.7, 6, 6);
  const rimMat = new THREE.MeshBasicMaterial({ color: ringColor, toneMapped: false });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 1.2;
  group.add(rimMesh);

  const rimGeo2 = new THREE.TorusGeometry(halfWidth + 4.0, 0.3, 6, 6);
  const rimMesh2 = new THREE.Mesh(rimGeo2, rimMat);
  rimMesh2.position.set(0, 1.2, -2.5);
  group.add(rimMesh2);

  // Flanking cyber power columns (with custom glowing octahedron caps!)
  const crysGeo = new THREE.OctahedronGeometry(4);
  const leftCrysMat = new THREE.MeshPhongMaterial({
    color: 0xff00bb,
    emissive: 0x5a003c,
    shininess: 90,
    flatShading: true,
    transparent: true,
    opacity: 0.85
  });
  const rightCrysMat = new THREE.MeshPhongMaterial({
    color: ringColor,
    emissive: mappedType === 'primary' ? 0x003d3d : (mappedType === 'secondary' ? 0x3d2000 : 0x003d14),
    shininess: 90,
    flatShading: true,
    transparent: true,
    opacity: 0.85
  });

  const leftCrys = new THREE.Mesh(crysGeo, leftCrysMat);
  leftCrys.position.set(-(halfWidth + 6.0), 3.0, -1.0);
  group.add(leftCrys);

  const rightCrys = new THREE.Mesh(crysGeo, rightCrysMat);
  rightCrys.position.set(halfWidth + 6.0, 3.0, -1.0);
  group.add(rightCrys);

  return group;
}

export function buildCyberMountainsForChromaRidge(
  trackGroup: THREE.Group,
  curve: THREE.Curve<THREE.Vector3>,
  points: THREE.Vector3[],
  findTForPoint: (pt: THREE.Vector3) => number,
  halfWidth: number,
  preSampledCurvePoints: THREE.Vector3[]
) {
  const mountainGroup = new THREE.Group();

  const carverRadius = halfWidth + 5.5;

  // Helper function to shift the mountain centers perpendicular to the track.
  // This places the peak offsets to the side so they form a beautiful interlocking canyon gorge
  // and allows the procedural vertex carver to carve clear, fully open tunnel passes.
  const shiftPosWithNormal = (originalPos: THREE.Vector3, sideDirection: number, shiftAmount: number): THREE.Vector3 => {
    let bestT = 0.5;
    let minDistSq = Infinity;
    const samples = 200;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = curve.getPointAt(t);
      const dSq = p.distanceToSquared(originalPos);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        bestT = t;
      }
    }
    const trackPoint = curve.getPointAt(bestT);
    const tangent = curve.getTangentAt(Math.min(bestT, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    
    const shifted = trackPoint.clone().add(normal.clone().multiplyScalar(sideDirection * shiftAmount));
    shifted.y = originalPos.y; // Lock to the same base depth
    return shifted;
  };

  // Create overlapping massive peaks for primary tunnel (Pt 12 to 15)
  // Mt 1. near Pt 12.5 (climbing) - Shifted left
  const mt1Radius = 105;
  const mt1PosRaw = new THREE.Vector3(17.5, 30.0, -240.0);
  const mt1Pos = shiftPosWithNormal(mt1PosRaw, -1, mt1Radius * 0.35);
  const mt1 = createCyberMountain(200, mt1Radius, mt1Pos, preSampledCurvePoints, carverRadius + 2.0, 7);
  mt1.position.copy(mt1Pos);
  mountainGroup.add(mt1);

  // Mt 2. near Pt 13.5 (deep bend) - Shifted right
  const mt2Radius = 115;
  const mt2PosRaw = new THREE.Vector3(-37.5, 35.0, -235.0);
  const mt2Pos = shiftPosWithNormal(mt2PosRaw, 1, mt2Radius * 0.35);
  const mt2 = createCyberMountain(230, mt2Radius, mt2Pos, preSampledCurvePoints, carverRadius + 2.0, 8);
  mt2.position.copy(mt2Pos);
  mountainGroup.add(mt2);

  // Mt 3. near Pt 14.5 (sweeper exit) - Shifted left
  const mt3Radius = 100;
  const mt3PosRaw = new THREE.Vector3(-85.0, 40.0, -207.5);
  const mt3Pos = shiftPosWithNormal(mt3PosRaw, -1, mt3Radius * 0.35);
  const mt3 = createCyberMountain(210, mt3Radius, mt3Pos, preSampledCurvePoints, carverRadius + 2.0, 6);
  mt3.position.copy(mt3Pos);
  mountainGroup.add(mt3);

  // Create overlapping peaks for secondary high-pass tunnel (Pt 20 to 23)
  // Mt 4. near Pt 20.5 - Shifted left & elevated (to cover new Pt 20 tunnel entrance)
  const mt4Radius = 110;
  const mt4PosRaw = new THREE.Vector3(-95.0, 110.0, 67.5);
  const mt4Pos = shiftPosWithNormal(mt4PosRaw, -1, mt4Radius * 0.35);
  const mt4 = createCyberMountain(230, mt4Radius, mt4Pos, preSampledCurvePoints, carverRadius + 6.0, 7);
  mt4.position.copy(mt4Pos);
  mountainGroup.add(mt4);

  // Mt 5. near Pt 21.5 - Shifted right & elevated to match high-pass track peak
  const mt5Radius = 115;
  const mt5PosRaw = new THREE.Vector3(-57.5, 110.0, 87.5);
  const mt5Pos = shiftPosWithNormal(mt5PosRaw, 1, mt5Radius * 0.35);
  const mt5 = createCyberMountain(230, mt5Radius, mt5Pos, preSampledCurvePoints, carverRadius + 6.0, 8);
  mt5.position.copy(mt5Pos);
  mountainGroup.add(mt5);

  // Mt 6. near Pt 22.5 - Shifted left & elevated to match high-pass track peak
  const mt6Radius = 110;
  const mt6PosRaw = new THREE.Vector3(-25.0, 110.0, 100.0);
  const mt6Pos = shiftPosWithNormal(mt6PosRaw, -1, mt6Radius * 0.35);
  const mt6 = createCyberMountain(230, mt6Radius, mt6Pos, preSampledCurvePoints, carverRadius + 6.0, 6);
  mt6.position.copy(mt6Pos);
  mountainGroup.add(mt6);

  trackGroup.add(mountainGroup);

  // Build gorgeous glowing portal arches at the 6 tunnel mouth endpoints
  const tunnelEndPoints = [
    { pt: points[12], type: 'primary' as const },
    { pt: points[15], type: 'primary' as const },
    { pt: points[20], type: 'secondary' as const },
    { pt: points[23], type: 'secondary' as const },
    { pt: points[35], type: 'tertiary' as const },
    { pt: points[41], type: 'tertiary' as const }
  ];

  tunnelEndPoints.forEach(ep => {
    const t = findTForPoint(ep.pt);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const portal = createCyberTunnelPortal(ep.pt, tangent, ep.type, halfWidth);
    trackGroup.add(portal);
  });
}

export function createProceduralTunnelMesh(
  curve: THREE.Curve<THREE.Vector3>,
  tStart: number,
  tEnd: number,
  halfWidth: number,
  tunnelSegments: number,
  baseColor: number,
  emissiveColor: number,
  opacity: number,
  ribInterval: number,
  ribColors: number[]
): {
  tunnelMesh: THREE.Mesh;
  ribMeshes: THREE.Mesh[];
  lightPositions: THREE.Vector3[];
} {
  const tunnelVertices: number[] = [];
  const tunnelIndices: number[] = [];
  const tunnelUvs: number[] = [];
  const lightPositions: THREE.Vector3[] = [];

  for (let s = 0; s <= tunnelSegments; s++) {
    const t = tStart + (s / tunnelSegments) * (tEnd - tStart);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const numRingPoints = 16;
    for (let r = 0; r < numRingPoints; r++) {
      const angle = -Math.PI / 4 + (r / (numRingPoints - 1)) * Math.PI * 1.5;
      const rx = Math.cos(angle) * (halfWidth + 2.5);
      const ry = Math.sin(angle) * (halfWidth + 2.5);

      const offset = normal.clone().multiplyScalar(rx).add(binormal.clone().multiplyScalar(ry));
      const vertexPos = p.clone().add(offset).add(new THREE.Vector3(0, 1.2, 0));

      tunnelVertices.push(vertexPos.x, vertexPos.y, vertexPos.z);
      tunnelUvs.push(r / (numRingPoints - 1), s / tunnelSegments);
    }

    if (s < tunnelSegments) {
      for (let r = 0; r < numRingPoints - 1; r++) {
        const currRingOffset = s * numRingPoints;
        const nextRingOffset = (s + 1) * numRingPoints;

        const a = currRingOffset + r;
        const b = currRingOffset + r + 1;
        const c = nextRingOffset + r;
        const d = nextRingOffset + r + 1;

        tunnelIndices.push(a, b, c);
        tunnelIndices.push(b, d, c);
      }
    }

    // Capture point light positions periodically
    if (s % ribInterval === 0 && s > 0 && s < tunnelSegments) {
      const pCeiling = p.clone().add(binormal.clone().multiplyScalar(halfWidth + 1.2)).add(new THREE.Vector3(0, 1.2, 0));
      lightPositions.push(pCeiling);
    }
  }

  const tunnelGeo = new THREE.BufferGeometry();
  tunnelGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tunnelVertices), 3));
  tunnelGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(tunnelUvs), 2));
  tunnelGeo.setIndex(tunnelIndices);
  tunnelGeo.computeVertexNormals();

  const tunnelMat = new THREE.MeshPhongMaterial({
    color: baseColor,
    emissive: emissiveColor,
    transparent: true,
    opacity: opacity,
    shininess: 95,
    specular: 0xffffff,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);

  const ribMeshes: THREE.Mesh[] = [];
  const totalRibs = Math.floor(tunnelSegments / (ribInterval / 2));
  for (let i = 0; i <= totalRibs; i++) {
    const fraction = i / totalRibs;
    const t = tStart + fraction * (tEnd - tStart);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const ribGeo = new THREE.TorusGeometry(halfWidth + 2.5, 0.28, 6, 24, Math.PI);
    const ribMat = new THREE.MeshBasicMaterial({
      color: ribColors[i % ribColors.length],
      toneMapped: false,
    });
    const ribMesh = new THREE.Mesh(ribGeo, ribMat);
    ribMesh.position.copy(p).add(new THREE.Vector3(0, 1.2, 0));

    const ribQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    ribMesh.quaternion.copy(ribQuat);
    ribMeshes.push(ribMesh);
  }

  return { tunnelMesh, ribMeshes, lightPositions };
}

export class TunnelLightsSystem implements TrackSubsystem {
  private lights: THREE.PointLight[] = [];
  private fixtures: THREE.Mesh[] = [];
  private baseIntensities: number[] = [];
  private group: THREE.Group = new THREE.Group();

  constructor(lightPositions: THREE.Vector3[], colorHex: number) {
    for (const pos of lightPositions) {
      const light = new THREE.PointLight(colorHex, 1.8, 30.0, 1.2);
      light.position.copy(pos).add(new THREE.Vector3(0, -0.6, 0));
      light.castShadow = false;
      this.group.add(light);
      this.lights.push(light);
      this.baseIntensities.push(1.8);

      const fixtureGeo = new THREE.SphereGeometry(0.7, 8, 8);
      const fixtureMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        toneMapped: false,
      });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.copy(light.position);
      this.group.add(fixture);
      this.fixtures.push(fixture);
    }
  }

  init(parent: THREE.Object3D) {
    parent.add(this.group);
  }

  update(dt: number, player: import("./TrackSubsystems").PlayerState) {
    const bass = (window as any)._bass ?? 0.0;
    const time = performance.now() * 0.005;

    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i];
      const baseIntensity = this.baseIntensities[i];

      const flickerFactor = 0.85 + Math.sin(time * 12.0 + i * 3.3) * 0.1 + (Math.random() > 0.95 ? -0.3 : 0.0);
      const bassBoost = bass * 4.4;

      light.intensity = baseIntensity * flickerFactor + bassBoost;

      const fixture = this.fixtures[i];
      if (fixture) {
        fixture.scale.setScalar(1.0 + bass * 0.75 + Math.sin(time * 15.0 + i) * 0.1);
      }
    }
  }
}

export function buildHeightmapMountainsForStartingZone(
  trackGroup: THREE.Group,
  preSampledCurvePoints: THREE.Vector3[],
  carverRadius: number,
  tunnelIntervals: { start: number; end: number }[] = []
) {
  const mWidth = 700;
  const mDepth = 700;
  const mSegments = 85;

  const geo = new THREE.PlaneGeometry(mWidth, mDepth, mSegments, mSegments);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  const v = new THREE.Vector3();

  const centerX = -50;
  const centerZ = -180;

  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);

    const worldX = v.x + centerX;
    const worldZ = v.z + centerZ;

    const dx = v.x / (mWidth / 2);
    const dz = v.z / (mDepth / 2);
    const r = Math.sqrt(dx * dx + dz * dz);
    const falloff = Math.max(0, 1 - r);

    const noiseCoord = new THREE.Vector3(worldX * 0.012, 0, worldZ * 0.012);
    const ruggedNoise = fbm(noiseCoord, 5);

    const baseElevation = 5.0;
    const amplitude = 135.0;
    
    v.y = baseElevation + (ruggedNoise * amplitude) * falloff;

    // Check distance of the world vertex coordinate to our elevated custom track
    // CRITICAL FIX: We use 2D horizontal distance (X & Z only) to query the closest track point.
    // This allows perfect, deep carving of high-pass channels through the rugged terrain map,
    // avoiding the 3D-dominated distance errors that leave high mountain vertices uncarved.
    let minDistSq = Infinity;
    let closestPt = preSampledCurvePoints[0];
    let closestK = 0;
    const steps = 5; // Step rate to keep scanning ultra-fast with high-resolution preSampledCurvePoints
    for (let k = 0; k < preSampledCurvePoints.length; k += steps) {
      const pt = preSampledCurvePoints[k];
      const tdx = worldX - pt.x;
      const tdz = worldZ - pt.z;
      const dSq = tdx * tdx + tdz * tdz; // 2D horizontal distance only
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestPt = pt;
        closestK = k;
      }
    }

    const tClosest = closestK / (preSampledCurvePoints.length - 1);
    let isInTunnel = false;
    for (let j = 0; j < tunnelIntervals.length; j++) {
      if (tClosest >= tunnelIntervals[j].start && tClosest <= tunnelIntervals[j].end) {
        isInTunnel = true;
        break;
      }
    }

    const dist = Math.sqrt(minDistSq);
    if (dist < carverRadius && !isInTunnel) {
      // Dynamically hollow out a spacious highway canyon pass through the background terrain
      const targetY = closestPt.y - 12.0;
      if (v.y > targetY) {
        v.y = targetY;
      }
    }
    
    posAttr.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();

  const mountainMat = new THREE.MeshPhongMaterial({
    color: 0x070114,
    emissive: 0x0f0224,
    specular: 0x00ffff,
    shininess: 35,
    flatShading: true,
    side: THREE.DoubleSide
  });
  applyTunnelClippingToMaterial(mountainMat);

  const mMesh = new THREE.Mesh(geo, mountainMat);
  mMesh.position.set(centerX, -15.0, centerZ);
  trackGroup.add(mMesh);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xff00bb,
    wireframe: true,
    transparent: true,
    opacity: 0.16,
    depthWrite: false
  });
  applyTunnelClippingToMaterial(wireMat);
  
  const mWire = new THREE.Mesh(geo, wireMat);
  mWire.position.copy(mMesh.position);
  mWire.scale.multiplyScalar(1.002);
  trackGroup.add(mWire);

  // Add robust collision box to prevent clipping into the mountain around Pt 2 to Pt 4 (x ≈ 130, z between 15 and -35).
  // The mountain is on the left (negative X) side, so we build a protective collision box covering that shoulder.
  const mountainColliderGeo = new THREE.BoxGeometry(24, 16, 55);
  const mountainColliderMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const mountainCollider = new THREE.Mesh(mountainColliderGeo, mountainColliderMat);
  mountainCollider.position.set(112, 5, -10);
  mountainCollider.userData.isWall = true;
  trackGroup.add(mountainCollider);
}

export function buildRetroTrack(trackGroup: THREE.Group): TrackBuildResult {
  // Chroma Ridge - Reimagined spectacular 3D cyber-track looping around an elevated metropolis horizon.
  
  // High-altitude Neon Grid Abyss ground helper (floating track aesthetics)
  const size = 650;
  const gridHelper = new THREE.GridHelper(size, 65, 0x00ffff, 0x1f0b3e);
  gridHelper.position.y = -10.0;
  if (Array.isArray(gridHelper.material)) {
    gridHelper.material.forEach(m => {
      m.transparent = true;
      m.opacity = 0.28;
    });
  } else {
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.28;
  }
  trackGroup.add(gridHelper);

  const points = [
    // 1. Landing straight & Start Line zone (Steady, majestic climb begins!)
    new THREE.Vector3(130, 0, 70),   // Pt 0: Flat straight approach
    new THREE.Vector3(130, 0, 35),   // Pt 1: Start line position
    new THREE.Vector3(130, 0, 15),   // Pt 2: Flat straight (New 1st added Pt)
    new THREE.Vector3(130, 0, -10),  // Pt 3: Flat straight (New 2nd added Pt)
    new THREE.Vector3(130, 8, -35),  // Pt 4: Uphill climb starter (Y = 8)
    new THREE.Vector3(130, 16, -65), // Pt 5: High, steady climb (Y = 16)

    // 2. Strong, flowing uphill S-Curve (Smooth drift arcs, no straight-line cuts!)
    new THREE.Vector3(115, 24, -95),  // Pt 6: Soft drift left entry, climbing (Y = 24)
    new THREE.Vector3(95, 32, -125),  // Pt 7: Deep left apex of S-curve, climbing (Y = 32)
    new THREE.Vector3(115, 40, -155), // Pt 8: Fluid transition crossing back right, climbing (Y = 40)
    new THREE.Vector3(135, 48, -185), // Pt 9: Deep right apex of S-curve, climbing (Y = 48)
    new THREE.Vector3(120, 56, -210), // Pt 10: Soft sweep aligning back left, climbing (Y = 56)
    new THREE.Vector3(100, 64, -220), // Pt 11: Aligning perfectly with mountain entry, climbing (Y = 64)

    // 3. Sweeping Left into the Mountain Tunnel (scenic high elevation, steady rise)
    new THREE.Vector3(45, 72, -235),  // Pt 12: Mountain pass entrance portal (Y = 72)
    new THREE.Vector3(-10, 80, -245), // Pt 13: Glowing glass tunnel interior left bend (Y = 80)
    new THREE.Vector3(-65, 88, -225), // Pt 14: Deep tunnel climbing sweeper (Y = 88)
    new THREE.Vector3(-105, 96, -190),// Pt 15: Tunnel exit, sweeping Left Hook (Y = 96)

    // 4. Staying high and continuing the magnificent scenic climb with stunning views (2 Pts requested after tunnel)
    new THREE.Vector3(-135, 104, -130), // Pt 16: Scenic skyway perimeter curve (climbing Y = 104)
    new THREE.Vector3(-145, 112, -70), // Pt 17: High cosmic-view highway overlook (climbing Y = 112)

    // 5. Secondary uphill S-Curve (goes into a mini tunnel)
    new THREE.Vector3(-125, 120, -15), // Pt 18: Second S-curve right bend entry (Y = 120)
    new THREE.Vector3(-135, 128, 25),  // Pt 19: Second S-curve left apex (Y = 128)
    new THREE.Vector3(-115, 136, 55),  // Pt 20: Second S-curve exit line & mini-tunnel alignment (Y = 136)

    // 6. Mini Tunnel (half length of main tunnel) climbing through the pinnacle ridge
    new THREE.Vector3(-75, 144, 80),   // Pt 21: Mini-tunnel entrance (Y = 144)
    new THREE.Vector3(-40, 150, 95),   // Pt 22: Mini-tunnel interior sweep (Y = 150)
    new THREE.Vector3(-10, 155, 105),  // Pt 23: Mini-tunnel exit portal (Y = 155)

    // 7. Pinnacle followed by the epic jump (Redesigned: custom gap with 2 empty pts)
    new THREE.Vector3(15, 140, 110),   // Pt 24: Direct descent approaching launch (Y = 140)
    new THREE.Vector3(35, 142, 110),   // Pt 25: Summit jump launcher ramp! (Y = 142)
    new THREE.Vector3(65, 132, 110),   // Pt 26: Empty jump mid-air peak 1
    new THREE.Vector3(95, 122, 110),   // Pt 27: Empty jump mid-air peak 2
    new THREE.Vector3(125, 112, 110),  // Pt 28: Smooth landing platform after geyser jump (Y = 112)

    // 8. Winding scenic mountain pass descent (Gradual, spacious elevation drop of exactly 10 units per checkpoint!)
    new THREE.Vector3(155, 102, 90),   // Pt 29: Gentle descent, rolling right (Y = 102)
    new THREE.Vector3(175, 92, 60),    // Pt 30: Outer scenic highway sweep, descending (Y = 92)
    new THREE.Vector3(185, 82, 25),    // Pt 31: Soft bank left, descending (Y = 82)
    new THREE.Vector3(165, 72, -5),    // Pt 32: Hairpin 1 Entrance - wide sweep down (Y = 72)
    new THREE.Vector3(130, 62, -15),   // Pt 33: Hairpin 1 Apex - dramatic descending corner loop (Y = 62)
    new THREE.Vector3(90, 52, -20),    // Pt 34: Hairpin 1 Exit - straightaway (Y = 52)
    new THREE.Vector3(50, 42, -5),     // Pt 35: Long floating high-valley bend (Y = 42)
    new THREE.Vector3(20, 32, 20),     // Pt 36: Chicane left corner, descending (Y = 32)
    new THREE.Vector3(-5, 22, 45),     // Pt 37: Chicane right corner, descending (Y = 22)
    new THREE.Vector3(-35, 12, 72),    // Pt 38: Switchback left, descending (Y = 12)
    new THREE.Vector3(-30, 5, 100),    // Pt 39: Mountain-side high banking curve (Y = 5)
    new THREE.Vector3(0, 0, 122),      // Pt 40: Slide-right descent towards neon valley (Y = 0)
    new THREE.Vector3(35, 0, 145),     // Pt 41: Flat run-in to the street district (Y = 0)

    // 9. Technical neon street turns and chicanes (descended to Y = 0!)
    new THREE.Vector3(65, 0, 155),     // Pt 42: Sweep left on the ground (Y = 0)
    new THREE.Vector3(75, 0, 185),     // Pt 43: Chicane right (Y = 0)
    new THREE.Vector3(55, 0, 215),     // Pt 44: Chicane left (Y = 0)
    new THREE.Vector3(75, 0, 230),     // Pt 45: Turn right (Y = 0)
    new THREE.Vector3(110, 0, 200),    // Pt 46: Sweep right to align (Y = 0)
    new THREE.Vector3(130, 0, 135),    // Pt 47: Run-in back to finish straight (Y = 0)
  ];

  const curve = new THREE.CatmullRomCurve3(points, true);

  // Dynamic parameterized position helper to align sub-facilities with exact points regardless of count
  const findTForPoint = (pt: THREE.Vector3): number => {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 1000;
    for (let j = 0; j <= samples; j++) {
      const tVal = j / samples;
      const cp = curve.getPointAt(tVal);
      const d = cp.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = tVal;
      }
    }
    return bestT;
  };

  const trackWidth = 36;
  const halfWidth = trackWidth / 2;
  const segments = 450;
  const spacedPoints = curve.getSpacedPoints(segments);

  // Generate 3D elevated track geometry
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    
    // Perpendicular horizontal normal vector matching 3D elevation
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const v1 = p.clone().add(normal.clone().multiplyScalar(halfWidth));
    const v2 = p.clone().add(normal.clone().multiplyScalar(-halfWidth));

    vertices[i * 6] = v1.x;
    vertices[i * 6 + 1] = v1.y - 0.45;
    vertices[i * 6 + 2] = v1.z;
    vertices[i * 6 + 3] = v2.x;
    vertices[i * 6 + 4] = v2.y - 0.45;
    vertices[i * 6 + 5] = v2.z;

    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = t * 15;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = t * 15;

    if (i < segments) {
      const tCenter = (i + 0.5) / segments;
      const tStartGap = findTForPoint(points[25]);
      const tEndGap = findTForPoint(points[28]);
      const inGap = (tCenter >= tStartGap + 0.003 && tCenter <= tEndGap - 0.003);

      if (!inGap) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const trackMat = createCyberTrackMaterial();
  const trackMesh = new THREE.Mesh(geometry, trackMat);
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // --- Create Physical Forcefield Wall Meshes for Chroma Ridge ---
  const wallHeight = 8.0;
  const wallGeometry = new THREE.BufferGeometry();
  const wallVerts = new Float32Array((segments + 1) * 4 * 3);
  const wallUvs = new Float32Array((segments + 1) * 4 * 2);
  const wallIndices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const v1 = p.clone().add(normal.clone().multiplyScalar(halfWidth));
    const v2 = p.clone().add(normal.clone().multiplyScalar(-halfWidth));

    // Left wall bottom & top
    wallVerts[i * 12] = v1.x;
    wallVerts[i * 12 + 1] = v1.y - 0.45;
    wallVerts[i * 12 + 2] = v1.z;

    wallVerts[i * 12 + 3] = v1.x;
    wallVerts[i * 12 + 4] = v1.y - 0.45 + wallHeight;
    wallVerts[i * 12 + 5] = v1.z;

    // Right wall bottom & top
    wallVerts[i * 12 + 6] = v2.x;
    wallVerts[i * 12 + 7] = v2.y - 0.45;
    wallVerts[i * 12 + 8] = v2.z;

    wallVerts[i * 12 + 9] = v2.x;
    wallVerts[i * 12 + 10] = v2.y - 0.45 + wallHeight;
    wallVerts[i * 12 + 11] = v2.z;

    // Left wall bottom (0, t), top (1, t)
    wallUvs[i * 8] = 0;
    wallUvs[i * 8 + 1] = t * 15;
    wallUvs[i * 8 + 2] = 1;
    wallUvs[i * 8 + 3] = t * 15;

    // Right wall bottom (0, t), top (1, t)
    wallUvs[i * 8 + 4] = 0;
    wallUvs[i * 8 + 5] = t * 15;
    wallUvs[i * 8 + 6] = 1;
    wallUvs[i * 8 + 7] = t * 15;

    if (i < segments) {
      const tCenter = (i + 0.5) / segments;
      const tStartGap = findTForPoint(points[25]);
      const tEndGap = findTForPoint(points[28]);
      const inGap = (tCenter >= tStartGap + 0.003 && tCenter <= tEndGap - 0.003);

      if (!inGap) {
        const a1 = i * 4;
        const b1 = i * 4 + 1;
        const c1 = (i + 1) * 4;
        const d1 = (i + 1) * 4 + 1;

        const a2 = i * 4 + 2;
        const b2 = i * 4 + 3;
        const c2 = (i + 1) * 4 + 2;
        const d2 = (i + 1) * 4 + 3;

        // Left wall
        wallIndices.push(a1, c1, b1);
        wallIndices.push(b1, c1, d1);

        // Right wall
        wallIndices.push(a2, b2, c2);
        wallIndices.push(b2, d2, c2);
      }
    }
  }

  // Post-smooth the wall vertices to completely eliminate foldovers/spikes from sharp curve offset self-intersections!
  const smoothedWallVerts = new Float32Array(wallVerts.length);
  const windowHalf = 4; // Sliding window size of 9 segments (approx 25 units width)
  const totalCount = segments + 1;

  for (let i = 0; i < totalCount; i++) {
    const sumLBot = new THREE.Vector3();
    const sumLTop = new THREE.Vector3();
    const sumRBot = new THREE.Vector3();
    const sumRTop = new THREE.Vector3();
    let weight = 0;

    for (let w = -windowHalf; w <= windowHalf; w++) {
      let idx = i + w;
      // Wrap-around because curve is closed
      while (idx < 0) idx += segments;
      while (idx >= segments) idx -= segments;

      // Accruing vertex positions
      sumLBot.x += wallVerts[idx * 12];
      sumLBot.y += wallVerts[idx * 12 + 1];
      sumLBot.z += wallVerts[idx * 12 + 2];

      sumLTop.x += wallVerts[idx * 12 + 3];
      sumLTop.y += wallVerts[idx * 12 + 4];
      sumLTop.z += wallVerts[idx * 12 + 5];

      sumRBot.x += wallVerts[idx * 12 + 6];
      sumRBot.y += wallVerts[idx * 12 + 7];
      sumRBot.z += wallVerts[idx * 12 + 8];

      sumRTop.x += wallVerts[idx * 12 + 9];
      sumRTop.y += wallVerts[idx * 12 + 10];
      sumRTop.z += wallVerts[idx * 12 + 11];

      weight++;
    }

    smoothedWallVerts[i * 12] = sumLBot.x / weight;
    smoothedWallVerts[i * 12 + 1] = sumLBot.y / weight;
    smoothedWallVerts[i * 12 + 2] = sumLBot.z / weight;

    smoothedWallVerts[i * 12 + 3] = sumLTop.x / weight;
    smoothedWallVerts[i * 12 + 4] = sumLTop.y / weight;
    smoothedWallVerts[i * 12 + 5] = sumLTop.z / weight;

    smoothedWallVerts[i * 12 + 6] = sumRBot.x / weight;
    smoothedWallVerts[i * 12 + 7] = sumRBot.y / weight;
    smoothedWallVerts[i * 12 + 8] = sumRBot.z / weight;

    smoothedWallVerts[i * 12 + 9] = sumRTop.x / weight;
    smoothedWallVerts[i * 12 + 10] = sumRTop.y / weight;
    smoothedWallVerts[i * 12 + 11] = sumRTop.z / weight;
  }

  wallGeometry.setAttribute("position", new THREE.BufferAttribute(smoothedWallVerts, 3));
  wallGeometry.setAttribute("uv", new THREE.BufferAttribute(wallUvs, 2));
  wallGeometry.setIndex(wallIndices);
  wallGeometry.computeVertexNormals();

  const wallMat = createRetroWallMaterial();
  const wallMesh = new THREE.Mesh(wallGeometry, wallMat);
  wallMesh.userData.isWall = true;
  trackGroup.add(wallMesh);

  // --- Create Invisible High Wall Meshes from Part 28 onwards to prevent player flying out of bounds or skipping sections ---
  const t28 = findTForPoint(points[28]);
  const invisibleWallHeight = 120.0;
  const invWallGeometry = new THREE.BufferGeometry();
  
  const invWallVerts: number[] = [];
  const invWallIndices: number[] = [];
  let invVertCounter = 0;
  
  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    
    // We cover from Part 28 onwards (any segment index that maps to t >= t28)
    if (t >= t28 - 0.001) {
      const tangent = curve.getTangentAt(Math.min(t, 0.9999));
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const v1 = p.clone().add(normal.clone().multiplyScalar(halfWidth));
      const v2 = p.clone().add(normal.clone().multiplyScalar(-halfWidth));
      
      // Left wall bottom & top
      invWallVerts.push(v1.x, v1.y - 0.45, v1.z);
      invWallVerts.push(v1.x, v1.y - 0.45 + invisibleWallHeight, v1.z);
      
      // Right wall bottom & top
      invWallVerts.push(v2.x, v2.y - 0.45, v2.z);
      invWallVerts.push(v2.x, v2.y - 0.45 + invisibleWallHeight, v2.z);
      
      if (i < segments) {
        // Only link indices if both current and next are in range
        const nextT = (i + 1) / segments;
        if (nextT >= t28 - 0.001) {
          const a1 = invVertCounter * 4;
          const b1 = invVertCounter * 4 + 1;
          const c1 = (invVertCounter + 1) * 4;
          const d1 = (invVertCounter + 1) * 4 + 1;

          const a2 = invVertCounter * 4 + 2;
          const b2 = invVertCounter * 4 + 3;
          const c2 = (invVertCounter + 1) * 4 + 2;
          const d2 = (invVertCounter + 1) * 4 + 3;

          // Left wall
          invWallIndices.push(a1, c1, b1);
          invWallIndices.push(b1, c1, d1);

          // Right wall
          invWallIndices.push(a2, b2, c2);
          invWallIndices.push(b2, d2, c2);
        }
      }
      invVertCounter++;
    }
  }

  if (invWallVerts.length > 0) {
    const invWallFloatVerts = new Float32Array(invWallVerts);
    const smoothedInvWallVerts = new Float32Array(invWallFloatVerts.length);
    
    // Post-smooth the invisible wall vertices completely to prevent spikes/glitches
    for (let i = 0; i < invVertCounter; i++) {
      const sumLBot = new THREE.Vector3();
      const sumLTop = new THREE.Vector3();
      const sumRBot = new THREE.Vector3();
      const sumRTop = new THREE.Vector3();
      let weight2 = 0;

      for (let w = -windowHalf; w <= windowHalf; w++) {
        let idx = i + w;
        if (idx < 0) idx = 0;
        if (idx >= invVertCounter) idx = invVertCounter - 1;

        sumLBot.x += invWallFloatVerts[idx * 12];
        sumLBot.y += invWallFloatVerts[idx * 12 + 1];
        sumLBot.z += invWallFloatVerts[idx * 12 + 2];

        sumLTop.x += invWallFloatVerts[idx * 12 + 3];
        sumLTop.y += invWallFloatVerts[idx * 12 + 4];
        sumLTop.z += invWallFloatVerts[idx * 12 + 5];

        sumRBot.x += invWallFloatVerts[idx * 12 + 6];
        sumRBot.y += invWallFloatVerts[idx * 12 + 7];
        sumRBot.z += invWallFloatVerts[idx * 12 + 8];

        sumRTop.x += invWallFloatVerts[idx * 12 + 9];
        sumRTop.y += invWallFloatVerts[idx * 12 + 10];
        sumRTop.z += invWallFloatVerts[idx * 12 + 11];

        weight2++;
      }

      smoothedInvWallVerts[i * 12] = sumLBot.x / weight2;
      smoothedInvWallVerts[i * 12 + 1] = sumLBot.y / weight2;
      smoothedInvWallVerts[i * 12 + 2] = sumLBot.z / weight2;

      smoothedInvWallVerts[i * 12 + 3] = sumLTop.x / weight2;
      smoothedInvWallVerts[i * 12 + 4] = sumLTop.y / weight2;
      smoothedInvWallVerts[i * 12 + 5] = sumLTop.z / weight2;

      smoothedInvWallVerts[i * 12 + 6] = sumRBot.x / weight2;
      smoothedInvWallVerts[i * 12 + 7] = sumRBot.y / weight2;
      smoothedInvWallVerts[i * 12 + 8] = sumRBot.z / weight2;

      smoothedInvWallVerts[i * 12 + 9] = sumRTop.x / weight2;
      smoothedInvWallVerts[i * 12 + 10] = sumRTop.y / weight2;
      smoothedInvWallVerts[i * 12 + 11] = sumRTop.z / weight2;
    }

    invWallGeometry.setAttribute("position", new THREE.BufferAttribute(smoothedInvWallVerts, 3));
    invWallGeometry.setIndex(invWallIndices);
    invWallGeometry.computeVertexNormals();

    const invisibleWallMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const invisibleWallMesh = new THREE.Mesh(invWallGeometry, invisibleWallMat);
    invisibleWallMesh.userData.isWall = true;
    trackGroup.add(invisibleWallMesh);
  }

  // Instantiate dynamic side-barriers LOD system replacing the old cylindrical obstacles
  const roadBarriersLODSystem = new RoadBarriersLODSystem(curve, halfWidth, points);

  // Finish line banner
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(trackWidth / 4, 1);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);

  // Places exactly on top of start/finish line region (Pt 1)
  const finishT = findTForPoint(points[1]);
  const finishPoint = curve.getPointAt(finishT);
  finishLine.position.set(finishPoint.x, finishPoint.y - 0.44, finishPoint.z);
  const finishTangent = curve.getTangentAt(Math.min(finishT, 0.9999));
  finishLine.rotation.y = Math.atan2(finishTangent.x, finishTangent.z);
  trackGroup.add(finishLine);

  // Pre-sample the curve once at high resolution so it is shared across all mountain carving sub-functions
  const preSampledCurvePoints: THREE.Vector3[] = [];
  const totalSamples = 2000;
  for (let s = 0; s <= totalSamples; s++) {
    preSampledCurvePoints.push(curve.getPointAt(s / totalSamples));
  }

  const carverRadiusVal = halfWidth + 5.5;

  const tStart1 = findTForPoint(points[12]);
  const tEnd1 = findTForPoint(points[15]);
  const tStart2 = findTForPoint(points[20]);
  const tEnd2 = findTForPoint(points[23]);
  const tStart3 = findTForPoint(points[35]);
  const tEnd3 = findTForPoint(points[41]);

  // Compute and populate global tunnel clipping variables
  const numCapsulesPerTunnel = 12;
  const sampledCapsules: { a: THREE.Vector3; b: THREE.Vector3; r: number }[] = [];

  // Sample Tunnel 1 (Pt 12 to 15) - extended slightly past portals for perfect transition clipping
  const pts1: THREE.Vector3[] = [];
  const tStart1Ext = Math.max(0, tStart1 - 0.015);
  const tEnd1Ext = Math.min(1.0, tEnd1 + 0.015);
  for (let s = 0; s <= numCapsulesPerTunnel; s++) {
    const t = tStart1Ext + (tEnd1Ext - tStart1Ext) * (s / numCapsulesPerTunnel);
    pts1.push(curve.getPointAt(t));
  }
  for (let s = 0; s < numCapsulesPerTunnel; s++) {
    sampledCapsules.push({
      a: pts1[s],
      b: pts1[s + 1],
      r: carverRadiusVal + 3.0
    });
  }

  // Sample Tunnel 2 (Pt 20 to 23) - extended slightly past portals for perfect transition clipping
  const pts2: THREE.Vector3[] = [];
  const tStart2Ext = Math.max(0, tStart2 - 0.015);
  const tEnd2Ext = Math.min(1.0, tEnd2 + 0.015);
  for (let s = 0; s <= numCapsulesPerTunnel; s++) {
    const t = tStart2Ext + (tEnd2Ext - tStart2Ext) * (s / numCapsulesPerTunnel);
    pts2.push(curve.getPointAt(t));
  }
  for (let s = 0; s < numCapsulesPerTunnel; s++) {
    sampledCapsules.push({
      a: pts2[s],
      b: pts2[s + 1],
      r: carverRadiusVal + 3.0
    });
  }

  // Sample Tunnel 3 (Pt 35 to 41) - extended slightly past portals for perfect transition clipping
  const pts3: THREE.Vector3[] = [];
  const tStart3Ext = Math.max(0, tStart3 - 0.015);
  const tEnd3Ext = Math.min(1.0, tEnd3 + 0.015);
  for (let s = 0; s <= numCapsulesPerTunnel; s++) {
    const t = tStart3Ext + (tEnd3Ext - tStart3Ext) * (s / numCapsulesPerTunnel);
    pts3.push(curve.getPointAt(t));
  }
  for (let s = 0; s < numCapsulesPerTunnel; s++) {
    sampledCapsules.push({
      a: pts3[s],
      b: pts3[s + 1],
      r: carverRadiusVal + 3.0
    });
  }

  // Assign to uniforms
  globalTunnelClippingUniforms.uTunnelCount.value = sampledCapsules.length;
  for (let k = 0; k < 48; k++) {
    if (k < sampledCapsules.length) {
      globalTunnelClippingUniforms.uTunnelA.value[k].copy(sampledCapsules[k].a);
      globalTunnelClippingUniforms.uTunnelB.value[k].copy(sampledCapsules[k].b);
      globalTunnelClippingUniforms.uTunnelR.value[k] = sampledCapsules[k].r;
    } else {
      globalTunnelClippingUniforms.uTunnelA.value[k].set(0, 0, 0);
      globalTunnelClippingUniforms.uTunnelB.value[k].set(0, 0, 0);
      globalTunnelClippingUniforms.uTunnelR.value[k] = 0;
    }
  }

  // Build the spectacular procedural physical cyber-mountains enclosing the tunnel sectors
  buildCyberMountainsForChromaRidge(trackGroup, curve, points, findTForPoint, halfWidth, preSampledCurvePoints);

  // --- BUILD THE GLOWING GLASS CYBER-TUNNELS ---

  const tunnel1 = createProceduralTunnelMesh(
    curve,
    tStart1,
    tEnd1,
    halfWidth,
    60,
    0x00ffff,
    0x021a2f,
    0.12,
    6,
    [0x00ffff, 0xff00bb]
  );
  trackGroup.add(tunnel1.tunnelMesh);
  tunnel1.ribMeshes.forEach(m => trackGroup.add(m));

  const tunnel2 = createProceduralTunnelMesh(
    curve,
    tStart2,
    tEnd2,
    halfWidth,
    30,
    0xff9900,
    0x3d1400,
    0.15,
    6,
    [0xff9900, 0xff0055]
  );
  trackGroup.add(tunnel2.tunnelMesh);
  tunnel2.ribMeshes.forEach(m => trackGroup.add(m));

  const tunnel3 = createProceduralTunnelMesh(
    curve,
    tStart3,
    tEnd3,
    halfWidth,
    80,
    0x00ff66,
    0x001f0b,
    0.12,
    6,
    [0x00ff66, 0xff00bb]
  );
  trackGroup.add(tunnel3.tunnelMesh);
  tunnel3.ribMeshes.forEach(m => trackGroup.add(m));

  // Instantiate dynamic reactive flickering tunnel lights system
  const allLightPositions = [...tunnel1.lightPositions, ...tunnel2.lightPositions, ...tunnel3.lightPositions];
  const tunnelLightsSystem = new TunnelLightsSystem(allLightPositions, 0x00ffff);

  const tunnelIntervals = [
    { start: tStart1, end: tEnd1 },
    { start: tStart2, end: tEnd2 },
    { start: tStart3, end: tEnd3 }
  ];

  // Build the spectacular heightmap-based background mountain range for the starting mountain zone
  buildHeightmapMountainsForStartingZone(trackGroup, preSampledCurvePoints, carverRadiusVal, tunnelIntervals);

  // Initialize magnificent cybernetic landscape systems
  const parallaxMountainsSystem = new ParallaxMountainsSystem();
  const holographicCitySystem = new HolographicCitySystem();
  const underTrackNeonSystem = new UnderTrackNeonSystem(curve, halfWidth);
  const hoveringPolyhedraSystem = new HoveringPolyhedraSystem(curve, halfWidth, false, points);
  const neonSpectatorGatesSystem = new NeonSpectatorGatesSystem(curve, halfWidth, true);
  const neonGeyserSystem = new NeonGeyserSystem();

  // Calculate dynamic boost pads located elegantly at center curves
  const boostPositions = [
    curve.getPointAt(findTForPoint(points[6])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[11])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[17])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[23])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[33])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[37])).clone().add(new THREE.Vector3(0, -0.4, 0)),
    curve.getPointAt(findTForPoint(points[43])).clone().add(new THREE.Vector3(0, -0.4, 0)),
  ];

  // Visual Pt markers at each anchor node for layout alignment (toggleable flag to bring back if needed)
  const showPtMarkers = false;
  if (showPtMarkers) {
    points.forEach((pt, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      
      // Elegant dark cyber backdrop with neon cyan border
      ctx.fillStyle = "rgba(12, 7, 26, 0.85)";
      ctx.fillRect(0, 0, 128, 64);
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 124, 60);

      // High fidelity display sans-serif label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Pt " + index, 64, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.raycast = function () {}; // Disable raycasting to prevent interference
      sprite.scale.set(7, 3.5, 1);
      
      sprite.position.copy(pt);
      sprite.position.y += 6.5; // Float nicely above track
      trackGroup.add(sprite);
    });
  }

  const ambientCrittersSystem = new AmbientCrittersSystem();

  return {
    boostSystem: new BoostPadSystem(boostPositions, curve),
    parallaxMountainsSystem,
    holographicCitySystem,
    underTrackNeonSystem,
    hoveringPolyhedraSystem,
    neonSpectatorGatesSystem,
    neonGeyserSystem,
    roadBarriersLODSystem,
    tunnelLightsSystem,
    ambientCrittersSystem,
    curve,
  };
}

export function buildRailTrack(trackGroup: THREE.Group): TrackBuildResult {
  // A solid track shape on the ground with rails acting as shortcuts
  const trackShape = new THREE.Shape();
  const raceRadius = 70;
  const raceLength = 110;

  trackShape.absarc(
    raceLength / 2,
    0,
    raceRadius,
    -Math.PI / 2,
    Math.PI / 2,
    false,
  );
  trackShape.absarc(
    -raceLength / 2,
    0,
    raceRadius,
    Math.PI / 2,
    -Math.PI / 2,
    false,
  );

  const trackHole = new THREE.Path();
  const trackWidth = 38;
  const innerRadius = raceRadius - trackWidth;
  trackHole.absarc(
    raceLength / 2,
    0,
    innerRadius,
    -Math.PI / 2,
    Math.PI / 2,
    false,
  );
  trackHole.absarc(
    -raceLength / 2,
    0,
    innerRadius,
    Math.PI / 2,
    -Math.PI / 2,
    false,
  );
  trackShape.holes.push(trackHole);

  const trackGeo = new THREE.ShapeGeometry(trackShape);
  trackGeo.rotateX(-Math.PI / 2);
  const trackMat = new THREE.MeshPhongMaterial({
    color: 0x44bbff,
    emissive: 0x112233,
    flatShading: true,
  });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.y = -0.5;
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // Border Blocks
  const blockGeo = new THREE.BoxGeometry(2, 2, 2);
  const blockMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
  for (let i = 0; i < 40; i++) {
    const b = new THREE.Mesh(blockGeo, blockMat);
    const angle = (i / 40) * Math.PI * 2;
    b.position.set(
      Math.cos(angle) * (raceRadius + 2),
      -0.5,
      Math.sin(angle) * (raceRadius + 2),
    );
    if (i % 2 === 0)
      (b.material as THREE.MeshPhongMaterial).color.setHex(0xaaaaaa);
    trackGroup.add(b);
  }

  // Finish line
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(trackWidth, 4);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);
  finishLine.position.set(0, -0.49, raceRadius - trackWidth / 2);
  trackGroup.add(finishLine);

  // AI Curve (center of the track)
  const ovalPoints = [
    new THREE.Vector3(-raceLength / 2, 0, raceRadius - trackWidth / 2),
    new THREE.Vector3(0, 0, raceRadius - trackWidth / 2),
    new THREE.Vector3(raceLength / 2, 0, raceRadius - trackWidth / 2),
  ];
  for (let i = 1; i <= 10; i++) {
    const theta = Math.PI / 2 - (Math.PI * i) / 10;
    ovalPoints.push(
      new THREE.Vector3(
        raceLength / 2 + Math.cos(theta) * (raceRadius - trackWidth / 2),
        0,
        Math.sin(theta) * (raceRadius - trackWidth / 2),
      ),
    );
  }
  ovalPoints.push(new THREE.Vector3(0, 0, -(raceRadius - trackWidth / 2)));
  ovalPoints.push(
    new THREE.Vector3(-raceLength / 2, 0, -(raceRadius - trackWidth / 2)),
  );
  for (let i = 1; i < 10; i++) {
    const theta = -Math.PI / 2 - (Math.PI * i) / 10;
    ovalPoints.push(
      new THREE.Vector3(
        -raceLength / 2 + Math.cos(theta) * (raceRadius - trackWidth / 2),
        0,
        Math.sin(theta) * (raceRadius - trackWidth / 2),
      ),
    );
  }
  const trackCurve = new THREE.CatmullRomCurve3(ovalPoints, true);

  // Create Grind Rails (Shortcuts across the gap)
  const rail1Points = [
    new THREE.Vector3(-raceLength / 2 + 10, 0.5, innerRadius + 5),
    new THREE.Vector3(0, 10, 0),
    new THREE.Vector3(-raceLength / 2 + 10, 0.5, -(innerRadius + 5)),
  ];
  const rail1Curve = new THREE.CatmullRomCurve3(rail1Points, false);

  const rail2Points = [
    new THREE.Vector3(raceLength / 2 - 10, 0.5, innerRadius + 5),
    new THREE.Vector3(0, 15, 0),
    new THREE.Vector3(raceLength / 2 - 10, 0.5, -(innerRadius + 5)),
  ];
  const rail2Curve = new THREE.CatmullRomCurve3(rail2Points, false);

  return {
    boostSystem: new BoostPadSystem([
      new THREE.Vector3(40, -0.4, raceRadius - trackWidth / 2),
      new THREE.Vector3(-40, -0.4, -(raceRadius - trackWidth / 2)),
    ], trackCurve),
    railSystem: new GrindRailSystem([rail1Curve, rail2Curve]),
    curve: trackCurve,
  };
}

export function buildNebulaBeltTrack(
  trackGroup: THREE.Group,
): TrackBuildResult {
  // Nebula Belt inspired track
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, -29),
    new THREE.Vector3(0, 1, -50),
    new THREE.Vector3(0, 1, -92),
    new THREE.Vector3(-19, 1, -118),
    new THREE.Vector3(-48, 1, -89),
    new THREE.Vector3(-71, 1, -65),
    new THREE.Vector3(-85, 1, -57),
    new THREE.Vector3(-99, 1, -65),
    new THREE.Vector3(-102, 2, -81),
    new THREE.Vector3(-96, 2, -103),
    new THREE.Vector3(-95, 1, -121),
    new THREE.Vector3(-109, 1, -130),
    new THREE.Vector3(-126, 2, -120),
    new THREE.Vector3(-134, 1, -101),
    new THREE.Vector3(-135, 1, -80),
    new THREE.Vector3(-134, 1, -63),
    new THREE.Vector3(-130, 1, -30),
    new THREE.Vector3(-129, 1, 4),
    new THREE.Vector3(-115, 1, 23),
    new THREE.Vector3(-102, 1, 26),
    new THREE.Vector3(-86, 1, 28),
    new THREE.Vector3(-70, 1, 25),
    new THREE.Vector3(-55, 1, 5),
    new THREE.Vector3(-44, 1, -23),
    new THREE.Vector3(-44, 1, -39),
    new THREE.Vector3(-53, 1, -48),
    new THREE.Vector3(-57, 1, -60),
    new THREE.Vector3(-51, 1, -71),
    new THREE.Vector3(-41, 1, -78),
    new THREE.Vector3(-30, 1, -83),
    new THREE.Vector3(-17, 1, -82),
    new THREE.Vector3(-10, 1, -72),
    new THREE.Vector3(-10, 1, -55),
    new THREE.Vector3(-10, 1, -38),
    new THREE.Vector3(-10, 1, -22),
    new THREE.Vector3(-7, 1, 11),
    new THREE.Vector3(7, 1, 17),
    new THREE.Vector3(20, 1, 8),
    new THREE.Vector3(19, 1, -8),
    new THREE.Vector3(9, 2, -16),
    new THREE.Vector3(3, 2, -32),
    new THREE.Vector3(13, 1, -47),
    new THREE.Vector3(27, 1, -61),
    new THREE.Vector3(41, 1, -72),
    new THREE.Vector3(54, 1, -72),
    new THREE.Vector3(63, 1, -58),
    new THREE.Vector3(59, 1, -46),
    new THREE.Vector3(58, 1, -30),
    new THREE.Vector3(56, 1, -13),
    new THREE.Vector3(46, 1, -6),
    new THREE.Vector3(30, 1, -10),
    new THREE.Vector3(22, 1, -25),
    new THREE.Vector3(15, 1, -40),
    new THREE.Vector3(8, 1, -56),
    new THREE.Vector3(2, 1, -71),
    new THREE.Vector3(-1, 1, -83),
    new THREE.Vector3(-2, 1, -100),
    new THREE.Vector3(-11, 1, -114),
    new THREE.Vector3(-23, 1, -125),
  ];

  const curve = new THREE.CatmullRomCurve3(points, true);
  const segments = 400;
  const trackWidth = 34;
  const halfWidth = trackWidth / 2;
  const spacedPoints = curve.getSpacedPoints(segments);

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));

    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const v1 = new THREE.Vector3()
      .copy(p)
      .add(normal.clone().multiplyScalar(halfWidth));
    const v2 = new THREE.Vector3()
      .copy(p)
      .add(normal.clone().multiplyScalar(-halfWidth));

    vertices[i * 6] = v1.x;
    vertices[i * 6 + 1] = v1.y;
    vertices[i * 6 + 2] = v1.z;
    vertices[i * 6 + 3] = v2.x;
    vertices[i * 6 + 4] = v2.y;
    vertices[i * 6 + 5] = v2.z;

    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = t * 20;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = t * 20;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const trackMat = new THREE.MeshPhongMaterial({
    color: 0x4a3d68,
    emissive: 0x111122,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const trackMesh = new THREE.Mesh(geometry, trackMat);
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // Finish line
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(trackWidth, 4);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);

  const startPt = curve.getPointAt(0);
  const startTan = curve.getTangentAt(0);
  finishLine.position.set(startPt.x, startPt.y + 0.1, startPt.z);
  finishLine.rotation.y = Math.atan2(startTan.x, startTan.z);
  trackGroup.add(finishLine);

  // Knot rail shortcut
  const railPt1 = curve.getPointAt(0.44); // Before knot
  const railPt2 = curve.getPointAt(0.58); // After knot
  const rail1Points = [
    new THREE.Vector3(railPt1.x, railPt1.y + 1, railPt1.z),
    new THREE.Vector3(
      (railPt1.x + railPt2.x) / 2,
      Math.max(railPt1.y, railPt2.y) + 4,
      (railPt1.z + railPt2.z) / 2,
    ),
    new THREE.Vector3(railPt2.x, railPt2.y + 1, railPt2.z),
  ];
  const rail1Curve = new THREE.CatmullRomCurve3(rail1Points, false);

  // Add some boost pads
  const b1 = curve.getPointAt(0.1);
  const b2 = curve.getPointAt(0.3);
  const b3 = curve.getPointAt(0.85);

  const ambientCrittersSystem = new AmbientCrittersSystem();
  const nebulaDebrisSystem = new NebulaDebrisSystem();

  return {
    boostSystem: new BoostPadSystem([
      new THREE.Vector3(b1.x, b1.y + 0.1, b1.z),
      new THREE.Vector3(b2.x, b2.y + 0.1, b2.z),
      new THREE.Vector3(b3.x, b3.y + 0.1, b3.z),
    ], curve),
    railSystem: new GrindRailSystem([rail1Curve]),
    ambientCrittersSystem,
    nebulaDebrisSystem,
    curve,
  };
}

export function buildPlannerTrack(trackGroup: THREE.Group): TrackBuildResult {
  // A grid floor and nothing else, so we can draw our track and get points
  const gridGeo = new THREE.PlaneGeometry(1000, 1000, 50, 50);
  gridGeo.rotateX(-Math.PI / 2);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x111122,
    wireframe: true,
  });
  const gridMesh = new THREE.Mesh(gridGeo, gridMat);
  gridMesh.position.y = -0.5;
  gridMesh.userData.isDriveable = true;
  gridMesh.userData.isPlannerGrid = true;
  trackGroup.add(gridMesh);

  // Add a clear starting point marker
  const startGeo = new THREE.CylinderGeometry(4, 4, 10, 16);
  const startMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
  });
  const startMesh = new THREE.Mesh(startGeo, startMat);
  startMesh.position.set(0, 5, 0);
  trackGroup.add(startMesh);

  // Return a dummy curve so the camera works
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 10),
  ]);

  return {
    boostSystem: new BoostPadSystem([]),
    curve,
  };
}

function isRoadCellType(type: string): boolean {
  return (
    type === "|" ||
    type === "-" ||
    type === "TL" ||
    type === "TR" ||
    type === "BL" ||
    type === "BR" ||
    type === "SF" ||
    type === "BP" ||
    type === "ROAD_BRIDGE" ||
    type === "ROAD_BUMP" ||
    type.endsWith("_P")
  );
}

function getAllowedDirections(type: string): { dr: number; dc: number }[] {
  const diagonals = [
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: 1, dc: 1 }
  ];

  if (type === "|") {
    return [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, ...diagonals];
  }
  if (type === "-") {
    return [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }, ...diagonals];
  }
  if (type === "TL") {
    return [{ dr: 1, dc: 0 }, { dr: 0, dc: 1 }, ...diagonals]; // South, East
  }
  if (type === "TR") {
    return [{ dr: 1, dc: 0 }, { dr: 0, dc: -1 }, ...diagonals]; // South, West
  }
  if (type === "BL") {
    return [{ dr: -1, dc: 0 }, { dr: 0, dc: 1 }, ...diagonals]; // North, East
  }
  if (type === "BR") {
    return [{ dr: -1, dc: 0 }, { dr: 0, dc: -1 }, ...diagonals]; // North, West
  }
  if (type === "SF" || type === "BP" || type === "ROAD_BRIDGE" || type === "ROAD_BUMP") {
    return [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }, ...diagonals];
  }
  if (type.endsWith("_P")) {
    const parts = type.split("_");
    const baseType = parts[0] + "_" + parts[1];
    const dr = parseInt(parts[2], 10);
    const dc = parseInt(parts[3], 10);

    if (baseType === "L2_TL") {
      if (dr === 1 && dc === 0) return [{ dr: 1, dc: 0 }, { dr: -1, dc: 1 }];
      if (dr === 0 && dc === 1) return [{ dr: 0, dc: 1 }, { dr: 1, dc: -1 }];
    }
    if (baseType === "L2_TR") {
      if (dr === 1 && dc === 1) return [{ dr: 1, dc: 0 }, { dr: -1, dc: -1 }];
      if (dr === 0 && dc === 0) return [{ dr: 0, dc: -1 }, { dr: 1, dc: 1 }];
    }
    if (baseType === "L2_BL") {
      if (dr === 0 && dc === 0) return [{ dr: -1, dc: 0 }, { dr: 1, dc: 1 }];
      if (dr === 1 && dc === 1) return [{ dr: 0, dc: 1 }, { dr: -1, dc: -1 }];
    }
    if (baseType === "L2_BR") {
      if (dr === 0 && dc === 1) return [{ dr: -1, dc: 0 }, { dr: 1, dc: -1 }];
      if (dr === 1 && dc === 0) return [{ dr: 0, dc: -1 }, { dr: -1, dc: 1 }];
    }

    if (baseType === "L3_TL") {
      if (dr === 2 && dc === 0) return [{ dr: 1, dc: 0 }, { dr: -1, dc: 1 }];
      if (dr === 1 && dc === 1) return [{ dr: 1, dc: -1 }, { dr: -1, dc: 1 }];
      if (dr === 0 && dc === 2) return [{ dr: 0, dc: 1 }, { dr: 1, dc: -1 }];
    }
    if (baseType === "L3_TR") {
      if (dr === 2 && dc === 2) return [{ dr: 1, dc: 0 }, { dr: -1, dc: -1 }];
      if (dr === 1 && dc === 1) return [{ dr: 1, dc: 1 }, { dr: -1, dc: -1 }];
      if (dr === 0 && dc === 0) return [{ dr: 0, dc: -1 }, { dr: 1, dc: 1 }];
    }
    if (baseType === "L3_BL") {
      if (dr === 0 && dc === 0) return [{ dr: -1, dc: 0 }, { dr: 1, dc: 1 }];
      if (dr === 1 && dc === 1) return [{ dr: -1, dc: -1 }, { dr: 1, dc: 1 }];
      if (dr === 2 && dc === 2) return [{ dr: 0, dc: 1 }, { dr: -1, dc: -1 }];
    }
    if (baseType === "L3_BR") {
      if (dr === 0 && dc === 2) return [{ dr: -1, dc: 0 }, { dr: 1, dc: -1 }];
      if (dr === 1 && dc === 1) return [{ dr: -1, dc: 1 }, { dr: 1, dc: -1 }];
      if (dr === 2 && dc === 0) return [{ dr: 0, dc: -1 }, { dr: -1, dc: 1 }];
    }
  }
  return [];
}

function canConnect(r1: number, c1: number, r2: number, c2: number, grid: string[][]): boolean {
  const type1 = grid[r1]?.[c1];
  const type2 = grid[r2]?.[c2];
  if (!type1 || !type2) return false;

  const dr = r2 - r1;
  const dc = c2 - c1;

  const dir1 = getAllowedDirections(type1);
  const dir2 = getAllowedDirections(type2);

  const hasDir1 = dir1.some(d => d.dr === dr && d.dc === dc);
  const hasDir2 = dir2.some(d => d.dr === -dr && d.dc === -dc);

  return hasDir1 && hasDir2;
}

export function tracePathFromGrid(grid: string[][]): { r: number; c: number }[] {
  const rows = grid.length;
  if (rows === 0) return [];
  const cols = grid[0].length;

  let start: { r: number; c: number } | null = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "SF") {
        start = { r, c };
        break;
      }
    }
    if (start) break;
  }

  if (!start) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isRoadCellType(grid[r][c])) {
          start = { r, c };
          break;
        }
      }
      if (start) break;
    }
  }

  if (!start) return [];

  const path: { r: number; c: number }[] = [start];
  const visited = new Set<string>();
  visited.add(`${start.r},${start.c}`);

  let curr = start;
  let finished = false;

  while (!finished) {
    const neighbors = [
      { r: curr.r - 1, c: curr.c },
      { r: curr.r + 1, c: curr.c },
      { r: curr.r, c: curr.c - 1 },
      { r: curr.r, c: curr.c + 1 },
      { r: curr.r - 1, c: curr.c - 1 },
      { r: curr.r - 1, c: curr.c + 1 },
      { r: curr.r + 1, c: curr.c - 1 },
      { r: curr.r + 1, c: curr.c + 1 },
    ];

    let nextCell: { r: number; c: number } | null = null;

    for (const n of neighbors) {
      if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
        if (canConnect(curr.r, curr.c, n.r, n.c, grid)) {
          if (n.r === start.r && n.c === start.c && path.length > 2) {
            finished = true;
            break;
          }
          if (!visited.has(`${n.r},${n.c}`)) {
            nextCell = n;
            break;
          }
        }
      }
    }

    if (finished) break;

    if (nextCell) {
      path.push(nextCell);
      visited.add(`${nextCell.r},${nextCell.c}`);
      curr = nextCell;
    } else {
      finished = true;
    }
  }

  return path;
}

function createFuturisticGridTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#020205";
  ctx.fillRect(0, 0, 512, 512);

  // Subtle sci-fi radial gradient
  const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
  grad.addColorStop(0, "#0a0712");
  grad.addColorStop(1, "#020205");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Draw grid lines
  ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
  ctx.lineWidth = 2;
  const step = 32;
  for (let x = 0; x <= 512; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, x);
    ctx.lineTo(512, x);
    ctx.stroke();
  }

  // Draw crosshairs at grid intersections for high-tech look
  ctx.fillStyle = "rgba(255, 0, 136, 0.4)";
  for (let x = step; x < 512; x += step * 2) {
    for (let y = step; y < 512; y += step * 2) {
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8); // Tile the grid nicely across the 240x240 plane
  return texture;
}

export function buildCustomTrack(trackGroup: THREE.Group): TrackBuildResult {
  const CELL_SIZE = 15.0;

  // Retrieve user grid from window or localStorage, or fall back to Mario Circuit 1 template
  let grid: string[][] = (window as any)._customGrid;
  if (!grid) {
    const saved = localStorage.getItem("star_riders_custom_grid");
    if (saved) {
      try {
        grid = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved custom grid:", e);
      }
    }
  }
  if (!grid) {
    grid = Array(16).fill(null).map(() => Array(16).fill("."));
    
    // Left boundary
    grid[2][1] = "TL";
    grid[3][1] = "|"; grid[4][1] = "|"; grid[5][1] = "|"; grid[6][1] = "|";
    grid[7][1] = "|"; grid[8][1] = "|"; grid[9][1] = "|"; grid[10][1] = "|";
    grid[11][1] = "|"; grid[12][1] = "|"; grid[13][1] = "|";
    grid[14][1] = "BL";

    // Top staircase
    grid[2][2] = "-"; grid[2][3] = "-"; grid[2][4] = "-";
    grid[3][5] = "-"; grid[3][6] = "-"; grid[3][7] = "-";
    grid[4][8] = "-"; grid[4][9] = "-"; grid[4][10] = "-";
    grid[5][11] = "-"; grid[5][12] = "-"; grid[5][13] = "TR";

    // Right boundary with Start/Finish and Boost Pads
    grid[6][13] = "|"; grid[7][13] = "|";
    grid[8][13] = "BP"; // Boost Pad
    grid[9][13] = "|";
    grid[10][13] = "SF"; // Start/Finish
    grid[11][13] = "|";
    grid[12][13] = "BP"; // Boost Pad
    grid[13][13] = "|"; grid[14][13] = "|";
    grid[15][13] = "BR";

    // Bottom-right U-turn
    grid[15][12] = "-";
    grid[15][11] = "BL";

    // Inner peak right diagonal
    grid[14][11] = "|"; grid[13][11] = "|"; grid[12][11] = "|"; grid[11][11] = "|";
    grid[10][10] = "|";
    grid[9][9] = "|";
    grid[8][9] = "TR";

    // Inner peak left diagonal
    grid[8][8] = "-";
    grid[9][7] = "-";
    grid[10][6] = "-";
    grid[11][5] = "-";
    grid[12][4] = "-";
    grid[13][3] = "-";
    grid[14][2] = "-";

    (window as any)._customGrid = grid;
  }

  const path = tracePathFromGrid(grid);

  // If path is empty, return a simple dummy straight track so we don't crash
  if (path.length < 2) {
    const dummyPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 50)];
    const curve = new THREE.CatmullRomCurve3(dummyPoints, true);
    (window as any)._customStartPos = new THREE.Vector3(0, 0, 0);
    (window as any)._customStartHeading = 0;
    return {
      boostSystem: new BoostPadSystem([]),
      curve,
    };
  }

  const customPoints = path.map(p => {
    const x = (p.c - 7.5) * CELL_SIZE;
    const z = (p.r - 7.5) * CELL_SIZE;
    return new THREE.Vector3(x, 0, z);
  });

  const trackCurve = new THREE.CatmullRomCurve3(customPoints, true);

  const segments = 400;
  const spacedPoints = trackCurve.getSpacedPoints(segments);
  const trackWidth = 15.0; // Matches CELL_SIZE
  const halfWidth = trackWidth / 2;

  // Set start position at the first cell (start of the loop, normally SF)
  const startCell = path[0];
  const startX = (startCell.c - 7.5) * CELL_SIZE;
  const startZ = (startCell.r - 7.5) * CELL_SIZE;
  (window as any)._customStartPos = new THREE.Vector3(startX, 0, startZ);

  // Compute start heading from first path segment
  const nextCell = path[1];
  const dx = nextCell.c - startCell.c;
  const dz = nextCell.r - startCell.r;
  (window as any)._customStartHeading = Math.atan2(dx, dz);

  // Generate invisible backing physics collision ribbon geometry
  const trackGeo = new THREE.BufferGeometry();
  const roadVertices = new Float32Array((segments + 1) * 2 * 3);
  const roadUvs = new Float32Array((segments + 1) * 2 * 2);
  const roadIndices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = trackCurve.getTangentAt(Math.min(t, 0.9999));
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const vIn = p.clone().add(normal.clone().multiplyScalar(-halfWidth));
    const vOut = p.clone().add(normal.clone().multiplyScalar(halfWidth));

    roadVertices[i * 6] = vIn.x;
    roadVertices[i * 6 + 1] = vIn.y;
    roadVertices[i * 6 + 2] = vIn.z;
    roadVertices[i * 6 + 3] = vOut.x;
    roadVertices[i * 6 + 4] = vOut.y;
    roadVertices[i * 6 + 5] = vOut.z;

    roadUvs[i * 4] = 0;
    roadUvs[i * 4 + 1] = t;
    roadUvs[i * 4 + 2] = 1;
    roadUvs[i * 4 + 3] = t;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      roadIndices.push(a, b, c);
      roadIndices.push(b, d, c);
    }
  }

  trackGeo.setAttribute("position", new THREE.BufferAttribute(roadVertices, 3));
  trackGeo.setAttribute("uv", new THREE.BufferAttribute(roadUvs, 2));
  trackGeo.setIndex(roadIndices);
  trackGeo.computeVertexNormals();

  const trackMat = new THREE.MeshBasicMaterial({ visible: false });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.y = -0.5;
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // --- Load and Place Modular 3D Road Tiles ---
  const roadLoader = new GLTFLoader();
  const roadTilesGroup = new THREE.Group();
  trackGroup.add(roadTilesGroup);

  let straightModel: THREE.Object3D | null = null;
  let cornerModel: THREE.Object3D | null = null;
  let startModel: THREE.Object3D | null = null;
  let arrowModel: THREE.Object3D | null = null;
  let bridgeModel: THREE.Object3D | null = null;
  let bumpModel: THREE.Object3D | null = null;
  let largeCornerModel: THREE.Object3D | null = null;
  let largerCornerModel: THREE.Object3D | null = null;
  let treeModel: THREE.Object3D | null = null;
  let billboardModel: THREE.Object3D | null = null;
  let grandstandModel: THREE.Object3D | null = null;
  let lightModel: THREE.Object3D | null = null;
  let pylonModel: THREE.Object3D | null = null;
  let decorBuilt = false;

  const createCenteredModelWrapper = (originalModel: THREE.Object3D, offsetX: number, offsetZ: number) => {
    const parentGroup = new THREE.Group();
    const modelClone = originalModel.clone();
    modelClone.position.set(offsetX, 0, offsetZ);
    parentGroup.add(modelClone);
    return parentGroup;
  };

  const buildGridTiles = () => {
    if (!straightModel || !cornerModel || !startModel || !arrowModel || !bridgeModel || !bumpModel || !largeCornerModel || !largerCornerModel) return;

    const placedMultiTiles = new Set<string>();

    const pathLen = path.length;
    for (let i = 0; i < pathLen; i++) {
      const prev = path[(i - 1 + pathLen) % pathLen];
      const curr = path[i];
      const next = path[(i + 1) % pathLen];

      const dxIn = curr.c - prev.c;
      const dzIn = curr.r - prev.r;
      const dxOut = next.c - curr.c;
      const dzOut = next.r - curr.r;

      let posX = (curr.c - 7.5) * CELL_SIZE;
      let posZ = (curr.r - 7.5) * CELL_SIZE;

      let tileInstance: THREE.Group | null = null;
      let rotY = 0;
      let scaleX = CELL_SIZE;
      let scaleZ = CELL_SIZE;

      const cellType = grid[curr.r] ? grid[curr.r][curr.c] : ".";
      const isMultiTile = cellType.startsWith("L2_") || cellType.startsWith("L3_");
      const isCorner = !isMultiTile && (dxIn * dxOut + dzIn * dzOut === 0) && (dxIn !== 0 || dzIn !== 0) && (dxOut !== 0 || dzOut !== 0);

      if (isCorner) {
        tileInstance = createCenteredModelWrapper(cornerModel, -0.5, 0.5);

        const dx1 = prev.c - curr.c;
        const dz1 = prev.r - curr.r;
        const dx2 = next.c - curr.c;
        const dz2 = next.r - curr.r;

        // TL: connects South (dz=1) and East (dx=1)
        if ((dx1 === 1 || dx2 === 1) && (dz1 === 1 || dz2 === 1)) {
          rotY = 0;
        }
        // TR: connects South (dz=1) and West (dx=-1)
        else if ((dx1 === -1 || dx2 === -1) && (dz1 === 1 || dz2 === 1)) {
          rotY = Math.PI / 2;
        }
        // BR: connects North (dz=-1) and West (dx=-1)
        else if ((dx1 === -1 || dx2 === -1) && (dz1 === -1 || dz2 === -1)) {
          rotY = Math.PI;
        }
        // BL: connects North (dz=-1) and East (dx=1)
        else if ((dx1 === 1 || dx2 === 1) && (dz1 === -1 || dz2 === -1)) {
          rotY = 3 * Math.PI / 2;
        }
      } else if (isMultiTile) {
        const parts = cellType.split("_");
        const orientation = parts[1];
        const rOffset = parseInt(parts[2], 10);
        const cOffset = parseInt(parts[3], 10);
        const anchorR = curr.r - rOffset;
        const anchorC = curr.c - cOffset;
        const anchorId = `${anchorR},${anchorC}`;

        if (placedMultiTiles.has(anchorId)) {
          continue;
        }
        placedMultiTiles.add(anchorId);

        const isL3 = cellType.startsWith("L3_");
        const size = isL3 ? 3 : 2;
        const model = isL3 ? largerCornerModel : largeCornerModel;
        const offsetVal = isL3 ? -1.5 : -1.0;

        tileInstance = createCenteredModelWrapper(model, offsetVal, -offsetVal);
        posX = (anchorC + (size - 1) / 2 - 7.5) * CELL_SIZE;
        posZ = (anchorR + (size - 1) / 2 - 7.5) * CELL_SIZE;

        if (orientation === "TL") rotY = 0;
        else if (orientation === "TR") rotY = Math.PI / 2;
        else if (orientation === "BR") rotY = Math.PI;
        else if (orientation === "BL") rotY = 3 * Math.PI / 2;

        scaleX = CELL_SIZE;
        scaleZ = CELL_SIZE;
      } else {
        if (cellType === "SF") {
          tileInstance = createCenteredModelWrapper(startModel, -0.5, 0.5);
        } else if (cellType === "BP") {
          tileInstance = createCenteredModelWrapper(arrowModel, -0.5, 0.5);
        } else if (cellType === "ROAD_BRIDGE") {
          tileInstance = createCenteredModelWrapper(bridgeModel, -0.5, 0.5);
        } else if (cellType === "ROAD_BUMP") {
          tileInstance = createCenteredModelWrapper(bumpModel, -0.5, 0.5);
        } else {
          tileInstance = createCenteredModelWrapper(straightModel, -0.5, 0.5);
        }

        const dx = next.c - curr.c;
        const dz = next.r - curr.r;
        rotY = Math.atan2(dx, dz);

        const isDiagonal = (dx !== 0 && dz !== 0);
        if (isDiagonal) {
          const lengthScale = Math.sqrt(dx * dx + dz * dz) * CELL_SIZE;
          scaleX = CELL_SIZE;
          scaleZ = lengthScale;
        } else {
          scaleX = CELL_SIZE;
          scaleZ = CELL_SIZE;
        }
      }

      if (tileInstance) {
        tileInstance.position.set(posX, -0.49, posZ);
        tileInstance.rotation.y = rotY;
        tileInstance.scale.set(scaleX, 1.0, scaleZ);

        tileInstance.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.userData.isDriveable = true;
          }
        });
        roadTilesGroup.add(tileInstance);
      }
    }
  };

  const placeGridDecorations = () => {
    if (decorBuilt) return;
    if (!treeModel || !billboardModel || !grandstandModel || !lightModel || !pylonModel) return;
    decorBuilt = true;

    const decorGroup = new THREE.Group();
    trackGroup.add(decorGroup);

    const rows = grid.length;
    const cols = grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellType = grid[r][c];
        // Only place decorations on empty cells (ignore road, SF, BP)
        if (cellType === "." || cellType === "" || cellType === "|" || cellType === "-" || 
            cellType === "TL" || cellType === "TR" || cellType === "BL" || cellType === "BR" || 
            cellType === "SF" || cellType === "BP") {
          continue;
        }

        const posX = (c - 7.5) * CELL_SIZE;
        const posZ = (r - 7.5) * CELL_SIZE;

        let instance: THREE.Object3D;
        let rotY = Math.random() * Math.PI * 2;
        let scale = 8.0;
        let isPylon = false;
        let isLight = false;

        if (cellType === "DECOR_TREE") {
          instance = treeModel.clone();
          scale = 9.0;
        } else if (cellType === "DECOR_BILLBOARD") {
          instance = billboardModel.clone();
          scale = 8.0;
          // Rotate to face track center
          const angleToCenter = Math.atan2(0 - posX, 0 - posZ);
          rotY = angleToCenter + Math.PI;
        } else if (cellType === "DECOR_GRANDSTAND") {
          instance = grandstandModel.clone();
          scale = 7.0;
          // Rotate to face center
          rotY = Math.atan2(0 - posX, 0 - posZ);
        } else if (cellType === "DECOR_LIGHT") {
          instance = lightModel.clone();
          scale = 8.0;
          rotY = Math.atan2(0 - posX, 0 - posZ);
          isLight = true;
        } else if (cellType === "OBSTACLE_PYLON") {
          instance = pylonModel.clone();
          scale = 10.0;
          rotY = 0;
          isPylon = true;
        } else {
          continue;
        }

        instance.position.set(posX, -0.49, posZ);
        instance.rotation.y = rotY;
        instance.scale.set(scale, scale, scale);

        instance.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
            if (isPylon) {
              child.userData.isWall = true;
            }
          }
        });

        if (isLight) {
          const pointLight = new THREE.PointLight(0x00f0ff, 1.2, 25.0);
          pointLight.position.set(0, 8.0, 0);
          instance.add(pointLight);
        }

        decorGroup.add(instance);
      }
    }
  };

  roadLoader.load("/roadStraight.glb", (gltf) => {
    straightModel = gltf.scene;
    straightModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadCornerSmall.glb", (gltf) => {
    cornerModel = gltf.scene;
    cornerModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadStart.glb", (gltf) => {
    startModel = gltf.scene;
    startModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadStraightArrow.glb", (gltf) => {
    arrowModel = gltf.scene;
    arrowModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadStraightBridge.glb", (gltf) => {
    bridgeModel = gltf.scene;
    bridgeModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadBump.glb", (gltf) => {
    bumpModel = gltf.scene;
    bumpModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadCornerLarge.glb", (gltf) => {
    largeCornerModel = gltf.scene;
    largeCornerModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadCornerLarger.glb", (gltf) => {
    largerCornerModel = gltf.scene;
    largerCornerModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/treeLarge.glb", (gltf) => {
    treeModel = gltf.scene;
    placeGridDecorations();
  });

  roadLoader.load("/billboard.glb", (gltf) => {
    billboardModel = gltf.scene;
    placeGridDecorations();
  });

  roadLoader.load("/grandStand.glb", (gltf) => {
    grandstandModel = gltf.scene;
    placeGridDecorations();
  });

  roadLoader.load("/lightPostModern.glb", (gltf) => {
    lightModel = gltf.scene;
    placeGridDecorations();
  });

  roadLoader.load("/pylon.glb", (gltf) => {
    pylonModel = gltf.scene;
    placeGridDecorations();
  });

  // --- Create Reference Map Ground Plane (Futuristic Grid for Custom Track) ---
  const gridTex = createFuturisticGridTexture();
  const groundMat = new THREE.MeshBasicMaterial({
    map: gridTex,
    side: THREE.DoubleSide,
  });
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, -0.52, 0); // slightly below track road
  groundMesh.userData.isDriveable = true; // make ground solid to prevent falling into the void
  trackGroup.add(groundMesh);

  // --- Create Lit Start/Finish Line Checker ---
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(8, 1);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);
  finishLine.position.set(startX, -0.48, startZ); // Placed at start straight line
  trackGroup.add(finishLine);

  // --- Retro Synthwave Stage Lighting ---
  const pinkLight = new THREE.DirectionalLight(0xff0088, 0.7);
  pinkLight.position.set(-60, 40, -100);
  trackGroup.add(pinkLight);

  const orangeLight = new THREE.DirectionalLight(0xffaa00, 0.5);
  orangeLight.position.set(60, 30, 100);
  trackGroup.add(orangeLight);

  // Populate Boost Pad positions (placed along grid BP cells)
  const boostPositions: THREE.Vector3[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "BP") {
        boostPositions.push(new THREE.Vector3((c - 7.5) * CELL_SIZE, -0.4, (r - 7.5) * CELL_SIZE));
      }
    }
  }

  // --- Load and Place Low-Poly Kenney Barriers ---
  const gltfLoader = new GLTFLoader();
  const barriersGroup = new THREE.Group();
  trackGroup.add(barriersGroup);

  let redModel: THREE.Object3D | null = null;
  let whiteModel: THREE.Object3D | null = null;

  const placeBarriers = () => {
    if (!redModel || !whiteModel) return;

    const curveLength = trackCurve.getLength();
    const spacing = 2.8; // space between barriers to close gaps
    const count = Math.floor(curveLength / spacing);

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = trackCurve.getPointAt(u);
      const tangent = trackCurve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const isRed = i % 2 === 0;

      // Left side barrier
      const leftInstance = isRed ? redModel.clone() : whiteModel.clone();
      leftInstance.position.copy(pt).add(normal.clone().multiplyScalar(-halfWidth - 1.2));
      leftInstance.position.y = -0.5;
      leftInstance.lookAt(leftInstance.position.clone().add(tangent));
      leftInstance.rotateY(Math.PI / 2);
      leftInstance.scale.set(9.0, 9.0, 9.0);
      
      leftInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isWall = true;
          child.receiveShadow = false;
          child.castShadow = false;
        }
      });
      barriersGroup.add(leftInstance);

      // Right side barrier (offset pattern)
      const rightInstance = isRed ? whiteModel.clone() : redModel.clone();
      rightInstance.position.copy(pt).add(normal.clone().multiplyScalar(halfWidth + 1.2));
      rightInstance.position.y = -0.5;
      rightInstance.lookAt(rightInstance.position.clone().add(tangent));
      rightInstance.rotateY(Math.PI / 2);
      rightInstance.scale.set(9.0, 9.0, 9.0);

      rightInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isWall = true;
          child.receiveShadow = false;
          child.castShadow = false;
        }
      });
      barriersGroup.add(rightInstance);
    }
  };

  gltfLoader.load("/barrierRed.glb", (gltf) => {
    redModel = gltf.scene;
    placeBarriers();
  });

  gltfLoader.load("/barrierWhite.glb", (gltf) => {
    whiteModel = gltf.scene;
    placeBarriers();
  });

  return {
    boostSystem: new BoostPadSystem(boostPositions, trackCurve),
    curve: trackCurve,
  };
}

class MultiSubsystem implements TrackSubsystem {
  constructor(private list: TrackSubsystem[]) {}
  init(parent: THREE.Object3D) {
    for (const s of this.list) s.init(parent);
  }
  update(dt: number, player: PlayerState) {
    for (const s of this.list) s.update(dt, player);
  }
}

export function createAbyssWallMaterial(): THREE.Material {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // 1. Sleek dark teal/navy transparent background
  ctx.fillStyle = "rgba(1, 15, 30, 0.4)";
  ctx.fillRect(0, 0, 256, 128);

  // 2. Light bubbling scanlines / glowing rows
  ctx.fillStyle = "rgba(0, 255, 170, 0.05)";
  for (let y = 0; y < 128; y += 6) {
    ctx.fillRect(0, y, 256, 2);
  }

  // 3. Glowing oceanic wave ripples
  ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = 16; y < 128; y += 32) {
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) {
      const cy = y + Math.sin((x / 256) * Math.PI * 4) * 8;
      ctx.lineTo(x, cy);
    }
  }
  ctx.stroke();

  // 4. Floating bioluminescent spores/dots
  ctx.fillStyle = "rgba(0, 255, 170, 0.6)";
  for (let i = 0; i < 8; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 128;
    const rSize = 1.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(40, 1);

  return new THREE.MeshPhongMaterial({
    map: tex,
    emissive: 0x00ffaa,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
}

export function createAbyssalLeviathan(): THREE.Group {
  const group = new THREE.Group();

  // Torso / Core shell
  const torsoGeo = new THREE.SphereGeometry(1, 10, 10);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x051d32,
    roughness: 0.15,
    metalness: 0.85,
  });
  const torso = new THREE.Mesh(torsoGeo, coreMat);
  torso.scale.set(13, 2.4, 18);
  group.add(torso);

  // Bioluminescent spots / glowing ridges on the back
  const stripeGeo = new THREE.BoxGeometry(0.2, 0.1, 4);
  const biolumMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.85,
  });
  
  for (let s = -4; s <= 4; s++) {
    const stripe = new THREE.Mesh(stripeGeo, biolumMat);
    stripe.position.set(0, 1.25, s * 1.8);
    stripe.scale.set(6.5 - Math.abs(s) * 1.0, 1, 1);
    group.add(stripe);
  }

  // Large double wings that pivot for flapping
  const leftWingGroup = new THREE.Group();
  leftWingGroup.position.set(-6.5, 0, 0);
  const rightWingGroup = new THREE.Group();
  rightWingGroup.position.set(6.5, 0, 0);

  const wingGeo = new THREE.BoxGeometry(16, 0.3, 14);
  wingGeo.translate(-8, 0, 0); // pivot offset

  const leftWing = new THREE.Mesh(wingGeo, coreMat);
  leftWingGroup.add(leftWing);

  // Wing bioluminescent highlight strips
  const wingTrimGeo = new THREE.BoxGeometry(14, 0.4, 0.25);
  wingTrimGeo.translate(-7, 0.08, 0);
  const leftTrim = new THREE.Mesh(wingTrimGeo, biolumMat);
  leftTrim.position.set(0, 0, 3.5);
  leftWingGroup.add(leftTrim);

  const rightWing = new THREE.Mesh(wingGeo, coreMat);
  rightWing.scale.x = -1; // mirrored
  rightWingGroup.add(rightWing);

  const rightTrim = new THREE.Mesh(wingTrimGeo, biolumMat);
  rightTrim.position.set(0, 0, 3.5);
  rightTrim.scale.x = -1;
  rightWingGroup.add(rightTrim);

  group.add(leftWingGroup);
  group.add(rightWingGroup);

  // Skeletal flowing tails (nested heirarchy)
  const tailSegments: THREE.Mesh[] = [];
  const tailJointCount = 7;
  const tailMat = new THREE.MeshBasicMaterial({
    color: 0xff3b98,
    transparent: true,
    opacity: 0.75,
  });

  const tSegGeo = new THREE.BoxGeometry(0.25, 0.12, 3.8);
  for (let i = 0; i < tailJointCount; i++) {
    const tSeg = new THREE.Mesh(tSegGeo, tailMat);
    if (i === 0) {
      tSeg.position.set(0, -0.4, -9.5);
    } else {
      tSeg.position.set(0, 0, -3.5);
    }
    tailSegments.push(tSeg);
    if (i === 0) {
      group.add(tSeg);
    } else {
      tailSegments[i - 1].add(tSeg);
    }
  }

  group.userData = {
    leftWing: leftWingGroup,
    rightWing: rightWingGroup,
    tailSegments,
    biolumMat,
  };

  return group;
}

export class Phase1AbyssSubsystem implements TrackSubsystem {
  private time = 0;
  private spotlights: THREE.Group[] = [];
  private bubbles: {
    mesh: THREE.Mesh;
    speed: number;
    rangeX: number;
    rangeZ: number;
    baseX: number;
    baseZ: number;
    freq: number;
  }[] = [];
  private chevrons: THREE.Mesh[] = [];
  private startingChevrons: THREE.Group[] = [];
  private leviathan: THREE.Group | null = null;
  private embersGeom: THREE.BufferGeometry | null = null;
  private embersCount = 0;
  private emberSpeeds: number[] = [];
  private emberBaseXs: number[] = [];
  private emberBaseZs: number[] = [];

  constructor(
    spotlights: THREE.Group[],
    bubbles: {
      mesh: THREE.Mesh;
      speed: number;
      rangeX: number;
      rangeZ: number;
      baseX: number;
      baseZ: number;
      freq: number;
    }[],
    chevrons: THREE.Mesh[],
    startingChevrons: THREE.Group[],
    leviathan: THREE.Group | null,
    embersGeom: THREE.BufferGeometry | null,
    emberSpeeds: number[],
    emberBaseXs: number[],
    emberBaseZs: number[]
  ) {
    this.spotlights = spotlights;
    this.bubbles = bubbles;
    this.chevrons = chevrons;
    this.startingChevrons = startingChevrons;
    this.leviathan = leviathan;
    this.embersGeom = embersGeom;
    this.embersCount = emberSpeeds.length;
    this.emberSpeeds = emberSpeeds;
    this.emberBaseXs = emberBaseXs;
    this.emberBaseZs = emberBaseZs;
  }

  init(parent: THREE.Object3D) {}

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // 1. Pan the searchlights slowly
    this.spotlights.forEach((spot, idx) => {
      const sweepFreq = 0.5 + idx * 0.12;
      spot.rotation.z = Math.sin(this.time * sweepFreq) * 0.28;
      spot.rotation.x = Math.cos(this.time * sweepFreq * 0.8) * 0.15;
    });

    // 2. Animate rising deep sea bubbles
    this.bubbles.forEach((b) => {
      b.mesh.position.y += b.speed * dt;
      if (b.mesh.position.y > 170) {
        b.mesh.position.y = -100; // Recycles at seafloor
      }
      b.mesh.position.x = b.baseX + Math.sin(this.time * b.freq) * b.rangeX;
      b.mesh.position.z = b.baseZ + Math.cos(this.time * b.freq * 0.9) * b.rangeZ;
    });

    // 3. Cascade sequentially lighting torus hoops (Directional indicator booster feeling!)
    this.chevrons.forEach((hoop, idx) => {
      const mat = hoop.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(this.time * 8.0 - idx * 0.45) * 0.5 + 0.5;
      mat.opacity = 0.15 + pulse * 0.65;
      // Also pulse the hoop thickness slightly for a high tech organic breathing feel!
      const scaleFactor = 1.0 + pulse * 0.04;
      hoop.scale.set(scaleFactor, scaleFactor, 1.0);
    });

    // 4. Animate high-tech starting deck chevron lane indicators
    this.startingChevrons.forEach((arrow, idx) => {
      const arrowTimeFactor = this.time * 6.0;
      const wave = Math.sin(arrowTimeFactor - idx * 0.7) * 0.5 + 0.5;
      arrow.children.forEach((mesh) => {
        const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.12 + Math.pow(wave, 2) * 0.78;
      });
      const arrowScale = 0.95 + wave * 0.08;
      arrow.scale.set(arrowScale, 1.0, arrowScale);
    });

    // 5. Animate the colossal background Subsea Leviathan
    if (this.leviathan) {
      const lAngle = this.time * 0.04;
      this.leviathan.position.x = -135 + Math.sin(lAngle) * 55;
      this.leviathan.position.z = -110 + Math.cos(lAngle) * 55;
      this.leviathan.rotation.y = -lAngle + Math.PI / 1.5;
      this.leviathan.rotation.x = Math.sin(this.time * 0.2) * 0.05;

      const flap = Math.sin(this.time * 1.2) * 0.25;
      const uData = this.leviathan.userData;
      if (uData.leftWing) uData.leftWing.rotation.z = -flap;
      if (uData.rightWing) uData.rightWing.rotation.z = flap;

      if (uData.tailSegments) {
        uData.tailSegments.forEach((seg: THREE.Mesh, sIdx: number) => {
          seg.rotation.y = Math.sin(this.time * 1.6 - sIdx * 0.4) * 0.15;
          seg.rotation.x = Math.cos(this.time * 1.0 - sIdx * 0.25) * 0.06;
        });
      }

      if (uData.biolumMat) {
        uData.biolumMat.opacity = 0.55 + Math.sin(this.time * 2.5) * 0.35;
      }
    }

    // 6. Animate volcanic thermal embers rising from magma vents
    if (this.embersGeom) {
      const posArr = this.embersGeom.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < this.embersCount; i++) {
        let y = posArr.getY(i) + this.emberSpeeds[i] * dt;
        if (y > 60) {
          y = -100 + Math.random() * 20; // reset back down to crater deep source
        }
        posArr.setY(i, y);
        
        const x = this.emberBaseXs[i] + Math.sin(this.time * 0.7 + i) * 4.0;
        const z = this.emberBaseZs[i] + Math.cos(this.time * 0.6 + i) * 4.0;
        posArr.setX(i, x);
        posArr.setZ(i, z);
      }
      posArr.needsUpdate = true;
    }
  }
}

export class Phase2TrenchPlungeSubsystem implements TrackSubsystem {
  private time = 0;
  private warningRings: { mesh: THREE.Mesh; baseColor: THREE.Color; flashColor: THREE.Color; index: number }[] = [];
  private cyberJellyfish: {
    group: THREE.Group;
    capMesh: THREE.Mesh;
    tentacleLines: THREE.Line[];
    baseY: number;
    pulseSpeed: number;
    pulseOffset: number;
  }[] = [];
  private plasmaCascades: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; speed: number }[] = [];
  private chimneyEmbers: {
    geom: THREE.BufferGeometry;
    count: number;
    speeds: number[];
    radiusRange: number;
    basePos: THREE.Vector3;
    topY: number;
  }[] = [];

  constructor(
    warningRings: { mesh: THREE.Mesh; baseColor: THREE.Color; flashColor: THREE.Color; index: number }[],
    cyberJellyfish: {
      group: THREE.Group;
      capMesh: THREE.Mesh;
      tentacleLines: THREE.Line[];
      baseY: number;
      pulseSpeed: number;
      pulseOffset: number;
    }[],
    plasmaCascades: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; speed: number }[],
    chimneyEmbers: {
      geom: THREE.BufferGeometry;
      count: number;
      speeds: number[];
      radiusRange: number;
      basePos: THREE.Vector3;
      topY: number;
    }[]
  ) {
    this.warningRings = warningRings;
    this.cyberJellyfish = cyberJellyfish;
    this.plasmaCascades = plasmaCascades;
    this.chimneyEmbers = chimneyEmbers;
  }

  init(parent: THREE.Object3D) {}

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // 1. Scrolling warning flashes down the speed rings
    const flashSpeed = 4.5;
    const pulseT = this.time * flashSpeed;
    this.warningRings.forEach((ring) => {
      // Create a traveling wave that scrolls from start to end (index k)
      // Represent of moving down the plunge!
      const distanceOffset = ring.index * 0.9;
      const intensity = Math.max(0.2, Math.sin(pulseT - distanceOffset) * 0.5 + 0.5);
      const ringMat = ring.mesh.material as THREE.MeshBasicMaterial;
      
      // Interpolate between subtle glow and high-brightness flash
      ringMat.color.copy(ring.baseColor).lerp(ring.flashColor, intensity);
      ringMat.opacity = 0.35 + intensity * 0.5;
    });

    // 2. Pulsing cyber-jellyfish floating & swimming mechanics
    this.cyberJellyfish.forEach((jelly) => {
      // Floating altitude oscillation
      const floatOffset = Math.sin(this.time * jelly.pulseSpeed * 0.5 + jelly.pulseOffset) * 3.5;
      jelly.group.position.y = jelly.baseY + floatOffset;

      // Pulse scaling squeeze/stretch
      const pulseFactor = 1.0 + Math.sin(this.time * jelly.pulseSpeed + jelly.pulseOffset) * 0.15;
      jelly.capMesh.scale.set(pulseFactor, pulseFactor * 1.15, pulseFactor);

      // Sway organic cyber-tentacles
      jelly.tentacleLines.forEach((tLine, tentIdx) => {
        const posAttrib = tLine.geometry.getAttribute("position") as THREE.BufferAttribute;
        const pCount = posAttrib.count;
        for (let s = 1; s < pCount; s++) {
          const ratio = s / pCount;
          const swayFactor = ratio * 1.2;
          const swayX = Math.sin(this.time * jelly.pulseSpeed * 1.4 + s * 0.6 + tentIdx * 1.5) * swayFactor;
          const swayZ = Math.cos(this.time * jelly.pulseSpeed * 1.2 + s * 0.5 + tentIdx * 1.1) * swayFactor;
          
          // Get original base offset (element 0 is the root anchored to the cap, keep static)
          const baseOffsetX = posAttrib.getX(0);
          const baseOffsetZ = posAttrib.getZ(0);
          
          posAttrib.setX(s, baseOffsetX + swayX);
          posAttrib.setZ(s, baseOffsetZ + swayZ);
        }
        posAttrib.needsUpdate = true;
      });
    });

    // 3. Scroll vertical liquid plasma cascades
    this.plasmaCascades.forEach((cascade) => {
      cascade.texture.offset.y -= dt * cascade.speed;
    });

    // 4. Hydrothermal erupting vent embers
    this.chimneyEmbers.forEach((system) => {
      const posAttr = system.geom.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < system.count; i++) {
        let y = posAttr.getY(i) + system.speeds[i] * dt;
        if (y > system.topY + 60) {
          y = system.topY + Math.random() * 4.0; // Recycles at vertical chimney apex
        }
        posAttr.setY(i, y);

        // Slow chimney plume draft sway
        const swayFreq = 1.6 + (i % 3) * 0.3;
        const x = system.basePos.x + Math.sin(this.time * swayFreq + i) * (system.radiusRange * 0.6);
        const z = system.basePos.z + Math.cos(this.time * (swayFreq * 0.9) + i) * (system.radiusRange * 0.6);
        posAttr.setX(i, x);
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;
    });
  }
}

export function buildPhase2AbyssEnvironment(
  trackGroup: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  points: THREE.Vector3[],
  trackWidth: number
): TrackSubsystem {
  const halfWidth = trackWidth / 2;
  const seabedY = -100;

  // Exact parameter resolution helper
  const findTForPoint = (pt: THREE.Vector3): number => {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 1000;
    for (let j = 0; j <= samples; j++) {
      const tVal = j / samples;
      const cp = curve.getPointAt(tVal);
      const d = cp.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = tVal;
      }
    }
    return bestT;
  };

  const tPt5 = findTForPoint(points[5]);
  const tPt11 = findTForPoint(points[11]);

  const warningRings: { mesh: THREE.Mesh; baseColor: THREE.Color; flashColor: THREE.Color; index: number }[] = [];
  const cyberJellyfish: {
    group: THREE.Group;
    capMesh: THREE.Mesh;
    tentacleLines: THREE.Line[];
    baseY: number;
    pulseSpeed: number;
    pulseOffset: number;
  }[] = [];
  const plasmaCascades: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; speed: number }[] = [];
  const chimneyEmbers: {
    geom: THREE.BufferGeometry;
    count: number;
    speeds: number[];
    radiusRange: number;
    basePos: THREE.Vector3;
    topY: number;
  }[] = [];

  // --- PART A: BIO-LUMINESCENT SPEED PORTALS / WARNING RINGS (Pt 5 to Pt 11) ---
  const numRings = 9;
  for (let k = 0; k < numRings; k++) {
    const u = k / (numRings - 1);
    const t = tPt5 + u * (tPt11 - tPt5);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    // Octagonal warning rings enclosing track
    const ringRadius = trackWidth * 0.72;
    const ringGeo = new THREE.TorusGeometry(ringRadius, 0.45, 5, 8); // cool aesthetic octagonal ring profile
    const ringColor = (k % 2 === 0) ? 0xff4c00 : 0xff00bb; // neon warning coral colors!
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(p);

    const matrix = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    ringMesh.quaternion.setFromRotationMatrix(matrix);
    trackGroup.add(ringMesh);

    warningRings.push({
      mesh: ringMesh,
      baseColor: new THREE.Color(0x06020c),
      flashColor: new THREE.Color(ringColor),
      index: k,
    });
  }

  // --- PART B: PULSING CYBER-JELLYFISH FLOATING LANTERNS ---
  const jellyPositions = [
    { pos: new THREE.Vector3(50, 80, -220), scale: 1.8, color: 0x00ffcc },
    { pos: new THREE.Vector3(-60, 40, -320), scale: 2.3, color: 0xff00cc },
    { pos: new THREE.Vector3(130, 0, -290), scale: 1.5, color: 0x00ffee },
    { pos: new THREE.Vector3(-45, -45, -410), scale: 2.1, color: 0xff3363 },
    { pos: new THREE.Vector3(200, -75, -340), scale: 1.6, color: 0x00ffaa },
  ];

  jellyPositions.forEach((jp, idx) => {
    const jellyGroup = new THREE.Group();
    jellyGroup.position.copy(jp.pos);

    // Glowing main wireframe dome cap
    const capGeo = new THREE.SphereGeometry(2.5 * jp.scale, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMat = new THREE.MeshBasicMaterial({
      color: jp.color,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    jellyGroup.add(capMesh);

    // High glow energy core inside the cap
    const coreGeo = new THREE.SphereGeometry(1.0 * jp.scale, 6, 6);
    const coreMat = new THREE.MeshBasicMaterial({
      color: jp.color,
      transparent: true,
      opacity: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    jellyGroup.add(coreMesh);

    // Flowing neon organic tentacles
    const tentacleLines: THREE.Line[] = [];
    const numTentacles = 5;
    const tentacleMat = new THREE.LineBasicMaterial({
      color: jp.color,
      transparent: true,
      opacity: 0.5,
    });

    for (let k = 0; k < numTentacles; k++) {
      const angle = (k / numTentacles) * Math.PI * 2;
      const r = 1.8 * jp.scale;
      const startX = Math.cos(angle) * r;
      const startZ = Math.sin(angle) * r;

      const linePoints: THREE.Vector3[] = [];
      const numSegments = 6;
      for (let s = 0; s <= numSegments; s++) {
        // Create initial clean vertical drape
        linePoints.push(new THREE.Vector3(startX, -s * 1.5 * jp.scale, startZ));
      }
      const tGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const tLine = new THREE.Line(tGeo, tentacleMat);
      jellyGroup.add(tLine);
      tentacleLines.push(tLine);
    }

    trackGroup.add(jellyGroup);

    cyberJellyfish.push({
      group: jellyGroup,
      capMesh,
      tentacleLines,
      baseY: jp.pos.y,
      pulseSpeed: 1.8 + idx * 0.3,
      pulseOffset: idx * 1.1,
    });
  });

  // --- PART C: POWERFUL HYDROTHERMAL VENT CHIMNEYS & ERUPTION EMBERS ---
  const chimneyPositions = [
    { pos: new THREE.Vector3(points[6].x - 42, seabedY, points[6].z + 20), h: 145, r: 15, color: 0x141a24, glowColor: 0xff3b00 },
    { pos: new THREE.Vector3(points[8].x + 38, seabedY, points[8].z - 25), h: 90, r: 13, color: 0x111621, glowColor: 0xff00bb },
    { pos: new THREE.Vector3(points[9].x - 45, seabedY, points[9].z + 30), h: 70, r: 12, color: 0x151b27, glowColor: 0x00ffee },
    { pos: new THREE.Vector3(points[10].x + 42, seabedY, points[10].z - 18), h: 50, r: 10, color: 0x121722, glowColor: 0xff0066 },
  ];

  chimneyPositions.forEach((chim) => {
    const chimneyGroup = new THREE.Group();
    // Anchor pivot at base on seabed
    chimneyGroup.position.copy(chim.pos);

    // Staggered cylindrical basalt layers
    const blockCount = 4;
    const rockMat = new THREE.MeshStandardMaterial({
      color: chim.color,
      roughness: 0.9,
      flatShading: true,
    });

    for (let b = 0; b < blockCount; b++) {
      const u = b / blockCount;
      const bH = chim.h / blockCount;
      const rBottom = chim.r * (1.1 - u * 0.8);
      const rTop = chim.r * (1.1 - (u + 0.25) * 0.8);
      const cylGeo = new THREE.CylinderGeometry(rTop, rBottom, bH, 7 + b);
      const blockMesh = new THREE.Mesh(cylGeo, rockMat);
      
      // Offset slightly to look craggy and weathered by pressure/water
      const offsetX = (Math.random() - 0.5) * (chim.r * 0.18);
      const offsetZ = (Math.random() - 0.5) * (chim.r * 0.18);
      blockMesh.position.set(offsetX, (b + 0.5) * bH, offsetZ);
      chimneyGroup.add(blockMesh);
    }

    // Volcanic rim crater on top
    const topY = chim.h;
    const rimGeo = new THREE.TorusGeometry(chim.r * 0.18, 1.4, 5, 10);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshBasicMaterial({
      color: chim.glowColor,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.set(0, topY, 0);
    chimneyGroup.add(rimMesh);

    // Glowing PointLight inside the crater to light up water surrounding it
    const light = new THREE.PointLight(chim.glowColor, 3.5, 80);
    light.position.set(0, topY + 4, 0);
    chimneyGroup.add(light);

    trackGroup.add(chimneyGroup);

    // Dedicated Chimney particle plume!
    const embersCount = 35;
    const embersGeom = new THREE.BufferGeometry();
    const posArr = new Float32Array(embersCount * 3);
    const speeds: number[] = [];

    // Local coordinates offsets, relative to global position
    for (let i = 0; i < embersCount; i++) {
      const baseX = chim.pos.x + (Math.random() - 0.5) * (chim.r * 0.4);
      const baseZ = chim.pos.z + (Math.random() - 0.5) * (chim.r * 0.4);
      const baseY = chim.pos.y + topY + Math.random() * 55;

      posArr[i * 3] = baseX;
      posArr[i * 3 + 1] = baseY;
      posArr[i * 3 + 2] = baseZ;

      speeds.push(15 + Math.random() * 22);
    }

    embersGeom.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const embersMat = new THREE.PointsMaterial({
      size: 2.2,
      color: chim.glowColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const embersPoints = new THREE.Points(embersGeom, embersMat);
    trackGroup.add(embersPoints);

    chimneyEmbers.push({
      geom: embersGeom,
      count: embersCount,
      speeds,
      radiusRange: chim.r * 0.35,
      basePos: chim.pos.clone(),
      topY: chim.pos.y + topY,
    });
  });

  // --- PART D: CYBER-PLASMA CASCADES POURING ON TRENCH WALLS ---
  const cascadesList = [
    { pos: new THREE.Vector3(-80, 20, -320), rotateY: Math.PI / 2, sizeW: 40, sizeH: 140, speed: 1.1 },
    { pos: new THREE.Vector3(260, -30, -390), rotateY: -Math.PI / 2, sizeW: 50, sizeH: 120, speed: 0.95 },
    { pos: new THREE.Vector3(-100, -70, -350), rotateY: Math.PI / 2, sizeW: 45, sizeH: 100, speed: 1.25 },
  ];

  cascadesList.forEach((casc) => {
    const cascGeo = new THREE.PlaneGeometry(casc.sizeW, casc.sizeH);

    // Custom Energy texture matching the reference's neon beams
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#010915";
    ctx.fillRect(0, 0, 64, 256);

    // Glowing neon cyan vertical flow currents
    ctx.fillStyle = "rgba(0, 255, 230, 0.95)";
    ctx.fillRect(4, 0, 4, 256);
    ctx.fillRect(20, 0, 3, 256);
    ctx.fillRect(36, 0, 5, 256);
    ctx.fillRect(52, 0, 4, 256);

    // Laser crossbars running perpendicular
    ctx.fillStyle = "rgba(255, 0, 110, 0.9)";
    for (let y = 16; y < 256; y += 32) {
      ctx.fillRect(0, y, 64, 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);

    const cascMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const cascMesh = new THREE.Mesh(cascGeo, cascMat);
    cascMesh.position.copy(casc.pos);
    cascMesh.rotation.y = casc.rotateY;
    trackGroup.add(cascMesh);

    plasmaCascades.push({
      mesh: cascMesh,
      texture: tex,
      speed: casc.speed,
    });
  });

  return new Phase2TrenchPlungeSubsystem(warningRings, cyberJellyfish, plasmaCascades, chimneyEmbers);
}

export class Phase3SeabedGardenSubsystem implements TrackSubsystem {
  private time = 0;
  private bioAnemones: { mesh: THREE.Mesh; baseScale: THREE.Vector3; pulseSpeed: number; pulseOffset: number }[] = [];
  private runicColumns: { mesh: THREE.Mesh; ringMesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];
  private bioArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];
  private sporeParticles: { geom: THREE.BufferGeometry; count: number; speeds: number[]; basePositions: THREE.Vector3[] } | null = null;

  constructor(
    bioAnemones: { mesh: THREE.Mesh; baseScale: THREE.Vector3; pulseSpeed: number; pulseOffset: number }[],
    runicColumns: { mesh: THREE.Mesh; ringMesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[],
    bioArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[],
    sporeParticles: { geom: THREE.BufferGeometry; count: number; speeds: number[]; basePositions: THREE.Vector3[] } | null
  ) {
    this.bioAnemones = bioAnemones;
    this.runicColumns = runicColumns;
    this.bioArches = bioArches;
    this.sporeParticles = sporeParticles;
  }

  init(parent: THREE.Object3D) {}

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // 1. Animate bio-anemones breathing / swaying
    this.bioAnemones.forEach((ane) => {
      const pulse = 1.0 + Math.sin(this.time * ane.pulseSpeed + ane.pulseOffset) * 0.12;
      const swayY = Math.cos(this.time * (ane.pulseSpeed * 0.6) + ane.pulseOffset) * 0.08;
      const swayX = Math.sin(this.time * (ane.pulseSpeed * 0.5) + ane.pulseOffset) * 0.05;
      ane.mesh.scale.set(ane.baseScale.x * pulse, ane.baseScale.y * (pulse * 1.1), ane.baseScale.z * pulse);
      ane.mesh.rotation.x = swayX;
      ane.mesh.rotation.z = swayY;
    });

    // 2. Pulsate runic column glow & rotate runic rings
    this.runicColumns.forEach((col) => {
      // Slow rotation of ancient ring floating above/around column
      col.ringMesh.rotation.y += dt * 0.4;
      
      const intensity = 0.4 + Math.sin(this.time * col.pulseSpeed + col.pulseOffset) * 0.4;
      const ringMat = col.ringMesh.material as THREE.MeshBasicMaterial;
      ringMat.opacity = 0.3 + intensity * 0.6;
    });

    // 3. Pulsate marine bio plant arches color intensity
    this.bioArches.forEach((arch) => {
      const intensity = 0.5 + Math.sin(this.time * arch.pulseSpeed + arch.pulseOffset) * 0.4;
      const archMat = arch.mesh.material as THREE.MeshBasicMaterial;
      archMat.opacity = 0.35 + intensity * 0.55;
    });

    // 4. Drift bioluminescent spores slowly around the seafloor
    if (this.sporeParticles) {
      const posAttr = this.sporeParticles.geom.getAttribute("position") as THREE.BufferAttribute;
      const count = this.sporeParticles.count;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) + this.sporeParticles.speeds[i] * dt;
        if (y > -20) {
          y = -100 + Math.random() * 15; // wrap back to seabed floor depth
        }
        posAttr.setY(i, y);

        // Drift slide
        const baseX = this.sporeParticles.basePositions[i].x;
        const baseZ = this.sporeParticles.basePositions[i].z;
        const driftX = baseX + Math.sin(this.time * 0.5 + i) * 12.0;
        const driftZ = baseZ + Math.cos(this.time * 0.41 + i) * 12.0;
        posAttr.setX(i, driftX);
        posAttr.setZ(i, driftZ);
      }
      posAttr.needsUpdate = true;
    }
  }
}

export function buildPhase3AbyssEnvironment(
  trackGroup: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  points: THREE.Vector3[],
  trackWidth: number
): TrackSubsystem {
  const seabedY = -100;
  const bioAnemones: { mesh: THREE.Mesh; baseScale: THREE.Vector3; pulseSpeed: number; pulseOffset: number }[] = [];
  const runicColumns: { mesh: THREE.Mesh; ringMesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];
  const bioArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];

  // Exact parameter resolution helper
  const findTForPoint = (pt: THREE.Vector3): number => {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 1000;
    for (let j = 0; j <= samples; j++) {
      const tVal = j / samples;
      const cp = curve.getPointAt(tVal);
      const d = cp.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = tVal;
      }
    }
    return bestT;
  };

  // Phase 3 spans from Pt 11 to Pt 35!
  const tPt11 = findTForPoint(points[11]);
  const tPt35 = findTForPoint(points[35]);

  // --- PART A: BIOLUMINESCENT SEA ANEMONES & LARGE FLOWERING CORALS ---
  const anemoneColors = [0xff0088, 0x00ffee, 0x88ff00, 0xffbb00, 0xee00ff];
  const numAnemones = 18;
  for (let idx = 0; idx < numAnemones; idx++) {
    const ratio = idx / (numAnemones - 1);
    const t = tPt11 + ratio * (tPt35 - tPt11);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    
    // Choose alternating left or right side of track
    const sideSign = (idx % 2 === 0) ? 1 : -1;
    const distanceOff = trackWidth * (0.8 + Math.random() * 0.6);
    const spawnPos = p.clone().addScaledVector(normal, sideSign * distanceOff);
    const baseHeight = Math.max(seabedY, p.y - 10);
    spawnPos.y = baseHeight;

    const aneGroup = new THREE.Group();
    aneGroup.position.copy(spawnPos);

    const baseColor = anemoneColors[idx % anemoneColors.length];
    
    // Anemone base bulb chunk
    const bulbGeo = new THREE.CylinderGeometry(2.5, 4.5, 8, 6);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0x011c3a,
      roughness: 0.8,
      flatShading: true,
    });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    bulbMesh.position.y = 4;
    aneGroup.add(bulbMesh);

    // Crown/Tentacles - simple glow spheres or flower tentacles radiating
    const crownGroup = new THREE.Group();
    crownGroup.position.y = 8;
    
    const glowingCore = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 6, 6),
      new THREE.MeshBasicMaterial({ color: baseColor })
    );
    crownGroup.add(glowingCore);

    // Radiating petals
    const numPetals = 6;
    const petalMat = new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.8,
      wireframe: true,
    });
    for (let k = 0; k < numPetals; k++) {
      const angle = (k / numPetals) * Math.PI * 2;
      const petalGeo = new THREE.ConeGeometry(0.8, 5, 4);
      petalGeo.rotateZ(Math.PI / 2.5); // Tilt outward
      const petalMesh = new THREE.Mesh(petalGeo, petalMat);
      petalMesh.position.set(Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5);
      petalMesh.rotation.y = -angle;
      crownGroup.add(petalMesh);
    }
    aneGroup.add(crownGroup);

    trackGroup.add(aneGroup);

    bioAnemones.push({
      mesh: aneGroup as any,
      baseScale: new THREE.Vector3(1, 1, 1),
      pulseSpeed: 1.5 + Math.random() * 1.2,
      pulseOffset: idx * 0.7,
    });
  }

  // --- PART B: SUNKEN RUIN RUNIC COLUMNS WITH SHINY GLOWING RINGS ---
  const columnPoints = [
    points[14], // Pt 14
    points[15], // Pt 15
    points[17], // Pt 17
    points[21], // Pt 21
    points[25], // Pt 25 - Titanic columns!
    points[26], // Pt 26
  ];

  columnPoints.forEach((anchorPt, idx) => {
    [-1, 1].forEach((side) => {
      const colGroup = new THREE.Group();
      
      const t = findTForPoint(anchorPt);
      const tangent = curve.getTangentAt(Math.min(t, 0.9999));
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const offsetDist = trackWidth * 1.1;
      const colPos = anchorPt.clone().addScaledVector(normal, side * offsetDist);
      colPos.setY(Math.max(seabedY, anchorPt.y - 12));
      colGroup.position.copy(colPos);

      // Main heavy hexagonal stone column
      const colH = 34 + Math.random() * 20;
      const colR = 4.5 + Math.random() * 2;
      const colGeo = new THREE.CylinderGeometry(colR * 0.8, colR, colH, 6);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x0f1420,
        roughness: 0.92,
        flatShading: true,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.y = colH / 2;
      colGroup.add(colMesh);

      // Hollow neon Runic Ring floating around column top apex
      const ringY = colH - 4;
      const ringGeo = new THREE.TorusGeometry(colR * 1.5, 0.35, 4, 8);
      ringGeo.rotateX(Math.PI / 2);
      const ringColor = (idx % 2 === 0) ? 0x00ffcc : 0xff00bb;
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.7,
        wireframe: true,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, ringY, 0);
      colGroup.add(ringMesh);

      const pointLight = new THREE.PointLight(ringColor, 2.5, 45);
      pointLight.position.set(0, ringY + 2, 0);
      colGroup.add(pointLight);

      trackGroup.add(colGroup);

      runicColumns.push({
        mesh: colMesh,
        ringMesh,
        pulseSpeed: 1.0 + Math.random() * 0.6,
        pulseOffset: idx * 1.3,
      });
    });
  });

  // --- PART C: NEON GLOWING ARCHES (E.G. MARINE PLANT ARCHES) ---
  const tPt22 = findTForPoint(points[22]);
  const tPt23 = findTForPoint(points[23]);
  const numArches = 4;

  for (let k = 0; k < numArches; k++) {
    const u = k / (numArches - 1);
    const t = tPt22 + u * (tPt23 - tPt22);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(0.9999, t));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const archRadius = trackWidth * 0.85;
    const archGeo = new THREE.TorusGeometry(archRadius, 0.5, 6, 12, Math.PI);
    const archColor = 0x33ff00;
    const archMat = new THREE.MeshBasicMaterial({
      color: archColor,
      transparent: true,
      opacity: 0.65,
      wireframe: true,
    });
    const archMesh = new THREE.Mesh(archGeo, archMat);
    archMesh.position.copy(p);

    const matrix = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    archMesh.quaternion.setFromRotationMatrix(matrix);
    archMesh.rotateZ(-Math.PI / 2);
    trackGroup.add(archMesh);

    bioArches.push({
      mesh: archMesh,
      pulseSpeed: 2.2,
      pulseOffset: k * 0.8,
    });
  }

  // --- PART D: BIOLUMINESCENT OFF-SEAFLOOR SPORES DRIVER ---
  const count = 40;
  const geom = new THREE.BufferGeometry();
  const rawPos = new Float32Array(count * 3);
  const speeds: number[] = [];
  const basePositions: THREE.Vector3[] = [];

  for (let i = 0; i < count; i++) {
    const ratio = Math.random();
    const t = tPt11 + ratio * (tPt35 - tPt11);
    const centerPt = curve.getPointAt(t);
    
    const rX = centerPt.x + (Math.random() - 0.5) * 140;
    const rZ = centerPt.z + (Math.random() - 0.5) * 140;
    const rY = seabedY + Math.random() * 40;

    rawPos[i * 3] = rX;
    rawPos[i * 3 + 1] = rY;
    rawPos[i * 3 + 2] = rZ;

    basePositions.push(new THREE.Vector3(rX, rY, rZ));
    speeds.push(2.5 + Math.random() * 4.5);
  }

  geom.setAttribute("position", new THREE.BufferAttribute(rawPos, 3));
  const pointsMat = new THREE.PointsMaterial({
    size: 1.8,
    color: 0x88ff00,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sporesMesh = new THREE.Points(geom, pointsMat);
  trackGroup.add(sporesMesh);

  const sporeParticlesObj = {
    geom,
    count,
    speeds,
    basePositions,
  };

  return new Phase3SeabedGardenSubsystem(bioAnemones, runicColumns, bioArches, sporeParticlesObj);
}

export class Phase4ResearchDomeSubsystem implements TrackSubsystem {
  private time = 0;
  private submersibles: { group: THREE.Group; index: number; radius: number; baseY: number }[] = [];
  private domeWire: THREE.Mesh | null = null;
  private spineTubes: THREE.Mesh[] = [];
  private ringElevators: { mesh: THREE.Mesh; speed: number; minY: number; maxY: number; offset: number }[] = [];

  constructor(
    submersibles: { group: THREE.Group; index: number; radius: number; baseY: number }[],
    domeWire: THREE.Mesh | null,
    spineTubes: THREE.Mesh[],
    ringElevators: { mesh: THREE.Mesh; speed: number; minY: number; maxY: number; offset: number }[]
  ) {
    this.submersibles = submersibles;
    this.domeWire = domeWire;
    this.spineTubes = spineTubes;
    this.ringElevators = ringElevators;
  }

  init(parent: THREE.Object3D) {}

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // 1. Dynamic orbital movement of the floating submersibles
    this.submersibles.forEach((sub) => {
      const speed = 0.18 + sub.index * 0.05;
      const angle = (sub.index / 3) * Math.PI * 2 + this.time * speed;
      const x = Math.cos(angle) * sub.radius;
      const z = Math.sin(angle) * sub.radius;
      const y = sub.baseY + Math.sin(this.time * 1.6 + sub.index) * 3.5; // beautiful vertical float sway

      sub.group.position.set(x, y, z);

      // Orientation facing along the tangent of orbit
      const tx = -Math.sin(angle);
      const tz = Math.cos(angle);
      sub.group.lookAt(x + tx * 15, y, z + tz * 15);
    });

    // 2. Rotate structural wireframe dome grid
    if (this.domeWire) {
      this.domeWire.rotation.y += dt * 0.18;
    }

    // 3. Cyber-reactor core vertical power-grid pulses down spine tubes
    this.spineTubes.forEach((tube, index) => {
      const tubeMat = tube.material as THREE.MeshBasicMaterial;
      const pulseVal = 0.5 + Math.sin(this.time * 2.8 + index * Math.PI * 0.5) * 0.5;
      tubeMat.opacity = 0.45 + pulseVal * 0.55;
    });

    // 4. Smoothly slide the high-speed energy ring elevator arrays up and down the giant tower spine
    this.ringElevators.forEach((ring) => {
      const cycle = Math.sin(this.time * ring.speed + ring.offset) * 0.5 + 0.5;
      ring.mesh.position.y = ring.minY + cycle * (ring.maxY - ring.minY);
      ring.mesh.rotation.y -= dt * 0.5;
    });
  }
}

export function buildPhase4AbyssEnvironment(
  trackGroup: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  points: THREE.Vector3[]
): TrackSubsystem {
  const spiralCenter = new THREE.Vector3(115, -100, -210);

  // 9. Majestic Undersea Research Station (Aesthetic biodome in the center of the giant upward spiral!)
  const stationGroup = new THREE.Group();
  stationGroup.position.set(spiralCenter.x, 0, spiralCenter.z); // Center horizontally in the spiral core

  // Core central spine pillar
  const spineGeo = new THREE.CylinderGeometry(15, 20, 320, 16);
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x111e2e,
    roughness: 0.15,
    metalness: 0.9,
    flatShading: true,
  });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.y = 40; // Spanning from bottom depths Y = -120 up to Y = +200
  stationGroup.add(spine);

  // Glowing core neon tubes running along the spine
  const spineTubes: THREE.Mesh[] = [];
  for (let r = 0; r < 4; r++) {
    const angle = (r / 4) * Math.PI * 2;
    const tubeGeo = new THREE.CylinderGeometry(1.2, 1.2, 300, 8);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.85,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.position.set(Math.cos(angle) * 19, 40, Math.sin(angle) * 19);
    stationGroup.add(tube);
    spineTubes.push(tube);
  }

  // Large glass research dome at the upper section of the tower (nested inside the upper spiral loops around Y = 120 to Y = 170)
  const domeRadius = 32;
  const domeGeo = new THREE.SphereGeometry(domeRadius, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.75);
  const domeMat = new THREE.MeshPhysicalMaterial({
    color: 0x33eecf,
    transparent: true,
    opacity: 0.28,
    roughness: 0.05,
    metalness: 0.95,
    transmission: 0.9,
    side: THREE.DoubleSide,
    emissive: 0x004433,
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  dome.position.y = 110;
  stationGroup.add(dome);

  // Dome structural wireframe grid overlay for a high-tech window pattern
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    wireframe: true,
    transparent: true,
    opacity: 0.65,
  });
  const domeWire = new THREE.Mesh(domeGeo, wireMat);
  domeWire.position.y = 110;
  stationGroup.add(domeWire);

  // High-brightness interior core laboratory level
  const labGeo = new THREE.CylinderGeometry(28, 30, 4, 16);
  const labMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x002233,
    roughness: 0.2,
  });
  const lab = new THREE.Mesh(labGeo, labMat);
  lab.position.y = 110;
  stationGroup.add(lab);

  // Floating submersibles/research submarines around the dome! (Like in the reference image)
  const submersiblesList: { group: THREE.Group; index: number; radius: number; baseY: number }[] = [];
  const numSubmersibles = 3;
  for (let s = 0; s < numSubmersibles; s++) {
    const subGroup = new THREE.Group();
    const subAngle = (s / numSubmersibles) * Math.PI * 2;
    const subRadius = 75;
    const subX = Math.cos(subAngle) * subRadius;
    const subZ = Math.sin(subAngle) * subRadius;
    const subY = 80 + s * 30; // Distributed heights

    subGroup.position.set(subX, subY, subZ);

    // Submarine hull
    const hullGeo = new THREE.CylinderGeometry(3, 3, 11, 12);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x142233,
      roughness: 0.3,
      metalness: 0.8,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    subGroup.add(hull);

    // Front viewport glass bubble
    const viewGeo = new THREE.SphereGeometry(2.7, 8, 8);
    const viewMat = new THREE.MeshStandardMaterial({
      color: 0x00ffee,
      emissive: 0x0088aa,
    });
    const viewBubble = new THREE.Mesh(viewGeo, viewMat);
    viewBubble.position.set(0, 0, 5.5);
    subGroup.add(viewBubble);

    // Intense light beam pointing outward from the submarine (just like the high-glow beams in the image!)
    const beamGeo = new THREE.ConeGeometry(7, 40, 12, 1, true);
    beamGeo.rotateX(-Math.PI / 2);
    beamGeo.translate(0, 0, 20);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffcc44,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    subGroup.add(beam);

    // Small stabilizer fins
    const finGeo = new THREE.BoxGeometry(6, 0.4, 1.8);
    const fin = new THREE.Mesh(finGeo, hullMat);
    fin.position.set(0, 0, -3.5);
    subGroup.add(fin);

    // Slowly orient the submersibles facing along their tangent
    subGroup.lookAt(0, subY, 0); // Point at the core
    subGroup.rotateY(Math.PI / 2); // Reposition perpendicular to orbit the center

    stationGroup.add(subGroup);

    submersiblesList.push({
      group: subGroup,
      index: s,
      radius: subRadius,
      baseY: subY,
    });
  }

  // Floating Runic/Energy Ring Elevators going up/down the spire
  const ringElevators: { mesh: THREE.Mesh; speed: number; minY: number; maxY: number; offset: number }[] = [];
  const numRings = 2;
  for (let r = 0; r < numRings; r++) {
    const ringGeo = new THREE.TorusGeometry(21.5, 0.8, 6, 16);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: r === 0 ? 0xff00cc : 0x00ffcc,
      opacity: 0.8,
      transparent: true,
      roughness: 0.2,
      metalness: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -90 + r * 110, 0);
    stationGroup.add(ringMesh);

    ringElevators.push({
      mesh: ringMesh,
      speed: 1.0 + r * 0.4,
      minY: -90,
      maxY: 180,
      offset: r * Math.PI,
    });
  }

  trackGroup.add(stationGroup);

  return new Phase4ResearchDomeSubsystem(submersiblesList, domeWire, spineTubes, ringElevators);
}

export class Phase5MagmaDescentSubsystem implements TrackSubsystem {
  private time = 0;
  private lavaPillars: { mesh: THREE.Mesh; pointLight: THREE.PointLight; baseScaleY: number; pulseSpeed: number; pulseOffset: number }[] = [];
  private laserArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];
  private finishGate: { ring: THREE.Group; panels: THREE.Mesh[]; lights: THREE.SpotLight[] } | null = null;
  private volcanicAsh: { geom: THREE.BufferGeometry; count: number; speeds: number[]; basePositions: THREE.Vector3[] } | null = null;

  constructor(
    lavaPillars: { mesh: THREE.Mesh; pointLight: THREE.PointLight; baseScaleY: number; pulseSpeed: number; pulseOffset: number }[],
    laserArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[],
    finishGate: { ring: THREE.Group; panels: THREE.Mesh[]; lights: THREE.SpotLight[] } | null,
    volcanicAsh: { geom: THREE.BufferGeometry; count: number; speeds: number[]; basePositions: THREE.Vector3[] } | null
  ) {
    this.lavaPillars = lavaPillars;
    this.laserArches = laserArches;
    this.finishGate = finishGate;
    this.volcanicAsh = volcanicAsh;
  }

  init(parent: THREE.Object3D) {}

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // 1. Pulsate Lava Pillars magma glow and heat shimmer scale, and pointlights
    this.lavaPillars.forEach((pil) => {
      const pulse = Math.sin(this.time * pil.pulseSpeed + pil.pulseOffset);
      const intensity = 0.5 + pulse * 0.45; // 0.05 to 0.95
      pil.pointLight.intensity = 2.0 + intensity * 6.0;

      // Pulse scaling slightly on X/Z (expanding with heat)
      const scaleX = 1.0 + pulse * 0.04;
      pil.mesh.scale.set(scaleX, pil.baseScaleY, scaleX);

      // Mutate material emissive color glow brightness
      const mat = pil.mesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.emissive) {
        mat.emissive.setRGB(0.9 * intensity, 0.22 * intensity, 0.02 * intensity);
      }
    });

    // 2. Animate scrolling laser gate arches down the final approach
    this.laserArches.forEach((arch) => {
      const glowT = Math.sin(this.time * arch.pulseSpeed + arch.pulseOffset) * 0.5 + 0.5;
      const archMat = arch.mesh.material as THREE.MeshBasicMaterial;
      archMat.opacity = 0.3 + glowT * 0.7; // laser-flash pulse!
    });

    // 3. Final finish gate grand performance
    if (this.finishGate) {
      // Rotate nested stabilizer outer panels in alternating opposite speeds!
      this.finishGate.panels.forEach((panel, pIdx) => {
        const speed = (pIdx % 2 === 0 ? 1 : -1) * (0.45 + pIdx * 0.15);
        panel.rotation.z += dt * speed;
      });

      // Swing searchlights scanning the finish plane
      this.finishGate.lights.forEach((light, lIdx) => {
        const freq = 1.5 + lIdx * 0.25;
        light.target.position.set(
          this.finishGate!.ring.position.x + Math.sin(this.time * freq) * 22,
          this.finishGate!.ring.position.y - 15 + Math.cos(this.time * freq * 0.8) * 12,
          this.finishGate!.ring.position.z + Math.cos(this.time * freq * 1.1) * 22
        );
      });
    }

    // 4. Rise hot volcanic ash/smoke particulate embers near lava pillars and bed
    if (this.volcanicAsh) {
      const posAttr = this.volcanicAsh.geom.getAttribute("position") as THREE.BufferAttribute;
      const count = this.volcanicAsh.count;
      for (let i = 0; i < count; i++) {
        let y = posAttr.getY(i) + this.volcanicAsh.speeds[i] * dt;
        if (y > 40) {
          y = -100 + Math.random() * 15; // wrap back to deep ocean seabed floor depth
        }
        posAttr.setY(i, y);

        // Drift slide
        const baseX = this.volcanicAsh.basePositions[i].x;
        const baseZ = this.volcanicAsh.basePositions[i].z;
        const driftX = baseX + Math.sin(this.time * 0.82 + i) * 6.0;
        const driftZ = baseZ + Math.cos(this.time * 0.75 + i) * 6.0;
        posAttr.setX(i, driftX);
        posAttr.setZ(i, driftZ);
      }
      posAttr.needsUpdate = true;
    }
  }
}

export function buildPhase5AbyssEnvironment(
  trackGroup: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  points: THREE.Vector3[],
  trackWidth: number
): TrackSubsystem {
  const seabedY = -100;
  const lavaPillars: { mesh: THREE.Mesh; pointLight: THREE.PointLight; baseScaleY: number; pulseSpeed: number; pulseOffset: number }[] = [];
  const laserArches: { mesh: THREE.Mesh; pulseSpeed: number; pulseOffset: number }[] = [];
  let finishGateObj: { ring: THREE.Group; panels: THREE.Mesh[]; lights: THREE.SpotLight[] } | null = null;

  // Find t for point helper
  const findTForPoint = (pt: THREE.Vector3): number => {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 1000;
    for (let j = 0; j <= samples; j++) {
      const tVal = j / samples;
      const cp = curve.getPointAt(tVal);
      const d = cp.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = tVal;
      }
    }
    return bestT;
  };

  // Phase 5 covers BasePoints 35 to 46
  const tPt35 = findTForPoint(points[35]);
  const tPt41 = findTForPoint(points[41]);
  const tPt44 = findTForPoint(points[44]);
  const tPt45 = findTForPoint(points[45]);
  const tPt46 = findTForPoint(points[46]);

  // Pillar positions flanking basePoints 39 and 40
  const pillarPositions = [
    { pos: new THREE.Vector3(points[39].x - 45, seabedY, points[39].z + 20), h: 120, r: 16, pulseSpeed: 1.4, pulseOffset: 0 },
    { pos: new THREE.Vector3(points[40].x + 45, seabedY, points[40].z - 25), h: 100, r: 18, pulseSpeed: 1.8, pulseOffset: 1.3 },
    { pos: new THREE.Vector3(points[40].x - 50, seabedY, points[40].z + 40), h: 80,  r: 15, pulseSpeed: 1.2, pulseOffset: 2.5 },
  ];

  pillarPositions.forEach((pil) => {
    const pilGroup = new THREE.Group();
    pilGroup.position.copy(pil.pos);

    // Sturdy rugged molten cylinder
    const baseGeo = new THREE.CylinderGeometry(pil.r * 0.7, pil.r * 1.1, pil.h, 7, 3);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0x0c0603,
      emissive: 0xff3300,
      emissiveIntensity: 0.8,
      roughness: 0.9,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(baseGeo, lavaMat);
    mesh.position.y = pil.h / 2;
    pilGroup.add(mesh);

    // Glowing point light at the height of the lava pillar to illuminate surrounding water elements
    const pointLight = new THREE.PointLight(0xff3c00, 5, 110);
    pointLight.position.set(0, pil.h, 0);
    pilGroup.add(pointLight);

    trackGroup.add(pilGroup);

    lavaPillars.push({
      mesh,
      pointLight,
      baseScaleY: 1.0,
      pulseSpeed: pil.pulseSpeed,
      pulseOffset: pil.pulseOffset,
    });
  });

  // Laser Gate Arches along the approach loop points 44-45
  const numLaserArches = 3;
  for (let k = 0; k < numLaserArches; k++) {
    const u = k / (numLaserArches - 1);
    const t = tPt44 + u * (tPt45 - tPt44);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    // High tech laser/hologram portals enclosing the track
    const archRadius = trackWidth * 0.78;
    const archGeo = new THREE.TorusGeometry(archRadius, 0.4, 5, 12);
    const xMat = new THREE.MeshBasicMaterial({
      color: 0xff0044, // high visual alert!
      transparent: true,
      opacity: 0.6,
      wireframe: true,
    });
    const archMesh = new THREE.Mesh(archGeo, xMat);
    archMesh.position.copy(p);

    const matrix = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    archMesh.quaternion.setFromRotationMatrix(matrix);
    trackGroup.add(archMesh);

    laserArches.push({
      mesh: archMesh,
      pulseSpeed: 3.5 + k * 0.5,
      pulseOffset: k * 1.5,
    });
  }

  // The Grand finish gate at basePoints 46
  const finishPos = points[46].clone();
  const finishTangent = curve.getTangentAt(Math.min(tPt46, 0.9999));
  const fUp = new THREE.Vector3(0, 1, 0);
  const fNormal = new THREE.Vector3().crossVectors(finishTangent, fUp).normalize();
  const fBinormal = new THREE.Vector3().crossVectors(fNormal, finishTangent).normalize();

  const gateGroup = new THREE.Group();
  gateGroup.position.copy(finishPos);

  const gateBasisMat = new THREE.Matrix4().makeBasis(fNormal, fBinormal, finishTangent);
  gateGroup.quaternion.setFromRotationMatrix(gateBasisMat);

  const ringGroup = new THREE.Group();
  const ringRadius = trackWidth * 1.1;

  // Hexagonal outer ring
  const outerRingGeo = new THREE.TorusGeometry(ringRadius, 1.8, 6, 6);
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x181e26,
    roughness: 0.2,
    metalness: 0.9,
    flatShading: true,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, metalMat);
  ringGroup.add(outerRing);

  // Rotating outer panels!
  const panelsList: THREE.Mesh[] = [];
  const numPanels = 4;
  for (let pIdx = 0; pIdx < numPanels; pIdx++) {
    const angle = (pIdx / numPanels) * Math.PI * 2;
    const pGeo = new THREE.BoxGeometry(10, 4, 1.2);
    const pMesh = new THREE.Mesh(pGeo, metalMat);
    pMesh.position.set(Math.cos(angle) * ringRadius, Math.sin(angle) * ringRadius, 0);
    pMesh.rotation.z = angle;
    ringGroup.add(pMesh);
    panelsList.push(pMesh);

    // Dynamic neon pink neon stripe nested inside panel
    const stripesGeo = new THREE.BoxGeometry(8, 0.6, 1.3);
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0xff00cc,
    });
    const stripeMesh = new THREE.Mesh(stripesGeo, stripeMat);
    stripeMesh.position.set(0, 1.2, 0);
    pMesh.add(stripeMesh);
  }

  // Neon FINISH banner on high
  const bannerCanvas = document.createElement("canvas");
  bannerCanvas.width = 256;
  bannerCanvas.height = 64;
  const bannerCtx = bannerCanvas.getContext("2d")!;
  bannerCtx.fillStyle = "#010a15";
  bannerCtx.fillRect(0, 0, 256, 64);
  bannerCtx.strokeStyle = "#00ffcc";
  bannerCtx.lineWidth = 4;
  bannerCtx.strokeRect(3, 3, 250, 58);
  bannerCtx.fillStyle = "#ffffff";
  bannerCtx.font = "bold 28px sans-serif";
  bannerCtx.textAlign = "center";
  bannerCtx.textBaseline = "middle";
  bannerCtx.shadowColor = "#00ffcc";
  bannerCtx.shadowBlur = 10;
  bannerCtx.fillText("=== FINISH ===", 128, 32);

  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  const bannerGeo = new THREE.PlaneGeometry(24, 6);
  const bannerMat = new THREE.MeshBasicMaterial({
    map: bannerTex,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
  bannerMesh.position.set(0, ringRadius + 4, 1.1);
  ringGroup.add(bannerMesh);

  gateGroup.add(ringGroup);
  trackGroup.add(gateGroup);

  // Spotlights of pure light
  const lightsList: THREE.SpotLight[] = [];
  const slColor = 0x00ffee;

  [-1, 1].forEach((side) => {
    const sLight = new THREE.SpotLight(slColor, 12, 120, Math.PI / 5, 0.4, 0.5);
    sLight.position.set(side * ringRadius, ringRadius * 0.4, 1.5);
    gateGroup.add(sLight);
    lightsList.push(sLight);

    const targetObj = new THREE.Object3D();
    targetObj.position.set(side * (ringRadius * 0.5), -15, 10);
    gateGroup.add(targetObj);
    sLight.target = targetObj;
  });

  finishGateObj = {
    ring: gateGroup,
    panels: panelsList,
    lights: lightsList,
  };

  // Volcanic rising ash
  const volcanicAshCount = 45;
  const ashGeom = new THREE.BufferGeometry();
  const rawAshPos = new Float32Array(volcanicAshCount * 3);
  const ashSpeeds: number[] = [];
  const ashBasePositions: THREE.Vector3[] = [];

  for (let i = 0; i < volcanicAshCount; i++) {
    const ratio = Math.random();
    const t = tPt35 + ratio * (tPt41 - tPt35);
    const centerPt = curve.getPointAt(t);

    const rX = centerPt.x + (Math.random() - 0.5) * 110;
    const rZ = centerPt.z + (Math.random() - 0.5) * 110;
    const rY = seabedY + Math.random() * 80;

    rawAshPos[i * 3] = rX;
    rawAshPos[i * 3 + 1] = rY;
    rawAshPos[i * 3 + 2] = rZ;

    ashBasePositions.push(new THREE.Vector3(rX, rY, rZ));
    ashSpeeds.push(11.0 + Math.random() * 14.5);
  }

  ashGeom.setAttribute("position", new THREE.BufferAttribute(rawAshPos, 3));
  const ashPointsMat = new THREE.PointsMaterial({
    size: 2.1,
    color: 0xff5500,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const ashMesh = new THREE.Points(ashGeom, ashPointsMat);
  trackGroup.add(ashMesh);

  const ashParticles = {
    geom: ashGeom,
    count: volcanicAshCount,
    speeds: ashSpeeds,
    basePositions: ashBasePositions,
  };

  return new Phase5MagmaDescentSubsystem(lavaPillars, laserArches, finishGateObj, ashParticles);
}

export function buildPhase1AbyssEnvironment(
  trackGroup: THREE.Group,
  curve: THREE.CatmullRomCurve3,
  points: THREE.Vector3[],
  trackWidth: number
): TrackSubsystem {
  const halfWidth = trackWidth / 2;
  const totalSplineSegments = points.length - 1;

  // Exact parameter resolution for key alignment nodes
  const findTForPoint = (pt: THREE.Vector3): number => {
    let bestT = 0;
    let minDist = Infinity;
    const samples = 1000;
    for (let j = 0; j <= samples; j++) {
      const tVal = j / samples;
      const cp = curve.getPointAt(tVal);
      const d = cp.distanceTo(pt);
      if (d < minDist) {
        minDist = d;
        bestT = tVal;
      }
    }
    return bestT;
  };

  const tStart0 = findTForPoint(points[0]);
  const tEnd4 = findTForPoint(points[4]);

  const tPt1 = findTForPoint(points[1]);
  const tPt4 = findTForPoint(points[4]);

  const spotlightsList: THREE.Group[] = [];
  const bubblesList: {
    mesh: THREE.Mesh;
    speed: number;
    rangeX: number;
    rangeZ: number;
    baseX: number;
    baseZ: number;
    freq: number;
  }[] = [];
  const chevronsList: THREE.Mesh[] = [];

  // --- PART A: MAJESTIC UNDERWATER SUSPENSION/SUPPORT BRIDGE (Pt 0 to Pt 4) ---
  const numBridgeSegments = 32;

  const bridgePathPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= numBridgeSegments; i++) {
    const t = tStart0 + (i / numBridgeSegments) * (tEnd4 - tStart0);
    bridgePathPoints.push(curve.getPointAt(t));
  }

  const pipeMat = new THREE.MeshPhysicalMaterial({
    color: 0x081628,
    roughness: 0.12,
    metalness: 0.95,
    transparent: true,
    opacity: 0.45,
    transmission: 0.6,
    thickness: 0.4,
  });
  const glowBorderMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    wireframe: true,
  });

  const leftCoreMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
  const rightCoreMat = new THREE.MeshBasicMaterial({ color: 0xff3b98 });

  for (let i = 0; i < numBridgeSegments; i++) {
    const p1 = bridgePathPoints[i];
    const p2 = bridgePathPoints[i + 1];

    const tCurrent = tStart0 + (i / numBridgeSegments) * (tEnd4 - tStart0);
    const tangent = curve.getTangentAt(Math.min(tCurrent, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();

    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const leftMid = midPoint.clone().add(normal.clone().multiplyScalar(halfWidth - 0.5)).add(new THREE.Vector3(0, -1.6, 0));
    const rightMid = midPoint.clone().add(normal.clone().multiplyScalar(-halfWidth + 0.5)).add(new THREE.Vector3(0, -1.6, 0));

    // Elegant Outer Glass Casing
    const pipeGeo = new THREE.CylinderGeometry(0.6, 0.6, len, 8);
    pipeGeo.rotateX(Math.PI / 2);

    const leftPipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    leftPipeMesh.position.copy(leftMid);
    leftPipeMesh.lookAt(p2.clone().add(normal.clone().multiplyScalar(halfWidth - 0.5)).add(new THREE.Vector3(0, -1.6, 0)));
    trackGroup.add(leftPipeMesh);

    // High Tech Inner Neon Cores
    const coreGeo = new THREE.CylinderGeometry(0.2, 0.2, len + 0.1, 6);
    coreGeo.rotateX(Math.PI / 2);

    const leftCore = new THREE.Mesh(coreGeo, leftCoreMat);
    leftCore.position.copy(leftMid);
    leftCore.lookAt(p2.clone().add(normal.clone().multiplyScalar(halfWidth - 0.5)).add(new THREE.Vector3(0, -1.6, 0)));
    trackGroup.add(leftCore);

    const rightPipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    rightPipeMesh.position.copy(rightMid);
    rightPipeMesh.lookAt(p2.clone().add(normal.clone().multiplyScalar(-halfWidth + 0.5)).add(new THREE.Vector3(0, -1.6, 0)));
    trackGroup.add(rightPipeMesh);

    const rightCore = new THREE.Mesh(coreGeo, rightCoreMat);
    rightCore.position.copy(rightMid);
    rightCore.lookAt(p2.clone().add(normal.clone().multiplyScalar(-halfWidth + 0.5)).add(new THREE.Vector3(0, -1.6, 0)));
    trackGroup.add(rightCore);

    if (i % 3 === 0) {
      const beamGeo = new THREE.CylinderGeometry(0.4, 0.4, trackWidth - 1, 8);
      beamGeo.rotateZ(Math.PI / 2);
      const crossBeam = new THREE.Mesh(beamGeo, pipeMat);
      crossBeam.position.copy(midPoint.clone().add(new THREE.Vector3(0, -1.8, 0)));
      crossBeam.lookAt(midPoint.clone().add(tangent));
      trackGroup.add(crossBeam);

      const crossCoreGeo = new THREE.CylinderGeometry(0.12, 0.12, trackWidth - 1, 6);
      crossCoreGeo.rotateZ(Math.PI / 2);
      const crossCore = new THREE.Mesh(crossCoreGeo, leftCoreMat);
      crossCore.position.copy(midPoint.clone().add(new THREE.Vector3(0, -1.8, 0)));
      crossCore.lookAt(midPoint.clone().add(tangent));
      trackGroup.add(crossCore);
    }
  }

  const seabedY = -100;
  const pillarPoints = [0, 1, 2, 3, 4];
  pillarPoints.forEach((ptIdx) => {
    const pTrack = points[ptIdx];
    const tAtPt = findTForPoint(pTrack);
    const tangent = curve.getTangentAt(Math.min(tAtPt, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const deckY = pTrack.y - 2.0;
    const h = deckY - seabedY;
    const midY = seabedY + h / 2;

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x111624,
      roughness: 0.35,
      metalness: 0.8,
    });

    const pillarGroup = new THREE.Group();

    const colGeo = new THREE.CylinderGeometry(3.5, 5.0, h, 12);
    const colLeft = new THREE.Mesh(colGeo, columnMat);
    colLeft.position.set(-halfWidth - 4.5, midY, 0);
    pillarGroup.add(colLeft);

    const colRight = colLeft.clone();
    colRight.position.set(halfWidth + 4.5, midY, 0);
    pillarGroup.add(colRight);

    const bandOffsets = [-h / 3, 0, h / 3];
    bandOffsets.forEach((bo) => {
      const bandGeo = new THREE.CylinderGeometry(4.7, 4.7, 1.2, 12);
      const bandL = new THREE.Mesh(bandGeo, glowBorderMat);
      bandL.position.set(-halfWidth - 4.5, midY + bo, 0);
      pillarGroup.add(bandL);

      const bandR = bandL.clone();
      bandR.position.set(halfWidth + 4.5, midY + bo, 0);
      pillarGroup.add(bandR);
    });

    const connectionBox = new THREE.BoxGeometry(trackWidth + 9.0, 3.5, 4.0);
    const connectBeam = new THREE.Mesh(connectionBox, columnMat);
    connectBeam.position.set(0, deckY - 6.0, 0);
    pillarGroup.add(connectBeam);

    const trussLength = Math.sqrt(Math.pow(trackWidth + 9.0, 2) + Math.pow(h * 0.4, 2));
    const trussAngle = Math.atan2(h * 0.4, trackWidth + 9.0);

    const trussGeo = new THREE.BoxGeometry(trussLength, 1.5, 1.5);
    const tX1 = new THREE.Mesh(trussGeo, columnMat);
    tX1.position.set(0, midY, 0);
    tX1.rotation.z = trussAngle;
    pillarGroup.add(tX1);

    const tX2 = new THREE.Mesh(trussGeo, columnMat);
    tX2.position.set(0, midY, 0);
    tX2.rotation.z = -trussAngle;
    pillarGroup.add(tX2);

    pillarGroup.position.copy(pTrack).setY(0);
    const colMat4 = new THREE.Matrix4().makeBasis(normal, up, tangent);
    pillarGroup.quaternion.setFromRotationMatrix(colMat4);
    trackGroup.add(pillarGroup);

    // --- ENHANCEMENT: SPECTACULAR SPOTLIGHT SEARCHLIGHTS ---
    const spotPivot = new THREE.Group();
    spotPivot.position.copy(pTrack).add(new THREE.Vector3(0, -6.0, 0)); // Anchored below the deck

    const searchConesCount = 2;
    for (let cidx = 0; cidx < searchConesCount; cidx++) {
      const directionOffset = cidx === 0 ? -1.0 : 1.0;
      const searchConeGeo = new THREE.CylinderGeometry(0.5, 14, 180, 16, 1, true);
      searchConeGeo.translate(0, -90, 0); // apex at pivot point

      const searchConeMat = new THREE.MeshBasicMaterial({
        color: cidx === 0 ? 0x00ffee : 0xffaacc,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const coneMesh = new THREE.Mesh(searchConeGeo, searchConeMat);
      coneMesh.position.set((halfWidth + 4.0) * directionOffset, 0, 0);
      coneMesh.rotation.z = 0.15 * directionOffset;
      spotPivot.add(coneMesh);
    }
    trackGroup.add(spotPivot);
    spotlightsList.push(spotPivot);
  });

  // --- PART B: STUNNING GLASS AQUEDUCT TUBE (Pt 1 to Pt 4) ---
  const tubeSteps = 45;

  const tubeVertices: number[] = [];
  const tubeIndices: number[] = [];
  const tubeUvs: number[] = [];

  const tubeRadius = halfWidth + 2.5;
  const numRingPoints = 16;

  for (let s = 0; s <= tubeSteps; s++) {
    const t = tPt1 + (s / tubeSteps) * (tPt4 - tPt1);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    for (let r = 0; r < numRingPoints; r++) {
      const angle = (r / numRingPoints) * Math.PI * 2;
      const rx = Math.cos(angle) * tubeRadius;
      const ry = Math.sin(angle) * (tubeRadius * 0.95);

      const offset = normal.clone().multiplyScalar(rx).add(binormal.clone().multiplyScalar(ry));
      const vertexPos = p.clone().add(offset).add(new THREE.Vector3(0, 0.6, 0));

      tubeVertices.push(vertexPos.x, vertexPos.y, vertexPos.z);
      tubeUvs.push(r / (numRingPoints - 1), (s / tubeSteps) * 8.0);
    }

    if (s < tubeSteps) {
      for (let r = 0; r < numRingPoints; r++) {
        const nextR = (r + 1) % numRingPoints;
        const currOffset = s * numRingPoints;
        const nextOffset = (s + 1) * numRingPoints;

        const a = currOffset + r;
        const b = currOffset + nextR;
        const c = nextOffset + r;
        const d = nextOffset + nextR;

        tubeIndices.push(a, b, c);
        tubeIndices.push(b, d, c);
      }
    }

    if (s % 5 === 0) {
      const ribGeo = new THREE.TorusGeometry(tubeRadius, 0.4, 8, 32);
      const ribMat = new THREE.MeshStandardMaterial({
        color: 0x00ffee,
        emissive: 0x003344,
        roughness: 0.1,
        metalness: 0.9,
      });
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.position.copy(p).add(new THREE.Vector3(0, 0.6, 0));

      const ribBasisMat = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
      rib.quaternion.setFromRotationMatrix(ribBasisMat);
      trackGroup.add(rib);

      const ledGeo = new THREE.TorusGeometry(tubeRadius + 0.1, 0.12, 4, 32);
      const ledMesh = new THREE.Mesh(ledGeo, glowBorderMat);
      ledMesh.position.copy(p).add(new THREE.Vector3(0, 0.6, 0));
      ledMesh.quaternion.copy(rib.quaternion);
      trackGroup.add(ledMesh);
    }
  }

  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tubeVertices), 3));
  glassGeo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(tubeUvs), 2));
  glassGeo.setIndex(tubeIndices);
  glassGeo.computeVertexNormals();

  // PREMIUM GLASS PHYSICAL MATERIAL CONFIGURATION WITH GLOSS & PERFECT SORTING
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x44eeff,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.85,
    thickness: 1.0,
    opacity: 0.35,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const glassTubeMesh = new THREE.Mesh(glassGeo, glassMat);
  glassTubeMesh.renderOrder = 20; // Correct layer render order
  trackGroup.add(glassTubeMesh);

  // Structural glass frames layer
  const glassFrameMat = new THREE.MeshBasicMaterial({
    color: 0x00ffee,
    wireframe: true,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  const glassFrameMesh = new THREE.Mesh(glassGeo, glassFrameMat);
  glassFrameMesh.renderOrder = 21;
  trackGroup.add(glassFrameMesh);

  // --- ENHANCEMENT: STARK DOUBLE HELIX NEON PINSTRIPES ---
  const helixVerticesWave1: THREE.Vector3[] = [];
  const helixVerticesWave2: THREE.Vector3[] = [];
  const helixPointsCount = 240;
  const helixRadius = tubeRadius + 0.08;

  for (let i = 0; i <= helixPointsCount; i++) {
    const u = i / helixPointsCount;
    const t = tPt1 + u * (tPt4 - tPt1);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    // 10 full helical rotations along the tunnel span
    const angle1 = u * Math.PI * 20;
    const rx1 = Math.cos(angle1) * helixRadius;
    const ry1 = Math.sin(angle1) * (helixRadius * 0.95);
    const p1 = p.clone().add(normal.clone().multiplyScalar(rx1).add(binormal.clone().multiplyScalar(ry1))).add(new THREE.Vector3(0, 0.6, 0));
    helixVerticesWave1.push(p1);

    // Opposite spiral hand
    const angle2 = u * Math.PI * 20 + Math.PI;
    const rx2 = Math.cos(angle2) * helixRadius;
    const ry2 = Math.sin(angle2) * (helixRadius * 0.95);
    const p2 = p.clone().add(normal.clone().multiplyScalar(rx2).add(binormal.clone().multiplyScalar(ry2))).add(new THREE.Vector3(0, 0.6, 0));
    helixVerticesWave2.push(p2);
  }

  const h1Geo = new THREE.BufferGeometry().setFromPoints(helixVerticesWave1);
  const h1Mat = new THREE.LineBasicMaterial({ color: 0x00ffee, transparent: true, opacity: 0.65 });
  const h1Line = new THREE.Line(h1Geo, h1Mat);
  trackGroup.add(h1Line);

  const h2Geo = new THREE.BufferGeometry().setFromPoints(helixVerticesWave2);
  const h2Mat = new THREE.LineBasicMaterial({ color: 0xff3b98, transparent: true, opacity: 0.65 });
  const h2Line = new THREE.Line(h2Geo, h2Mat);
  trackGroup.add(h2Line);

  // --- ENHANCEMENT: CASCADING BOOSTER CAGES (HOOPS) ---
  const numHoops = 14;
  for (let sIdx = 0; sIdx < numHoops; sIdx++) {
    const u = sIdx / (numHoops - 1);
    const t = tPt1 + u * (tPt4 - tPt1);
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const hoopGeo = new THREE.TorusGeometry(tubeRadius - 0.25, 0.16, 6, 24);
    const hoopMat = new THREE.MeshBasicMaterial({
      color: 0x00ffee,
      transparent: true,
      opacity: 0.35,
    });
    const hoopMesh = new THREE.Mesh(hoopGeo, hoopMat);
    hoopMesh.position.copy(p).add(new THREE.Vector3(0, 0.6, 0));
    const hoopBasisMat = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    hoopMesh.quaternion.setFromRotationMatrix(hoopBasisMat);
    trackGroup.add(hoopMesh);
    chevronsList.push(hoopMesh);
  }

  const tunnelPortals = [
    { pt: points[1], t: tPt1 },
    { pt: points[4], t: tPt4 }
  ];

  tunnelPortals.forEach((pPortal, index) => {
    const tangent = curve.getTangentAt(pPortal.t);
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const binormal = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const portalGroup = new THREE.Group();
    portalGroup.position.copy(pPortal.pt).add(new THREE.Vector3(0, 0.6, 0));

    const collarGeo1 = new THREE.TorusGeometry(tubeRadius + 0.6, 1.2, 10, 24);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1a2838,
      roughness: 0.2,
      metalness: 0.9,
    });
    const col1 = new THREE.Mesh(collarGeo1, collarMat);
    portalGroup.add(col1);

    const collarLed = new THREE.TorusGeometry(tubeRadius + 1.8, 0.22, 6, 24);
    const ledM = new THREE.Mesh(collarLed, new THREE.MeshBasicMaterial({
      color: index === 0 ? 0x00ffee : 0xff3b98,
      wireframe: true,
    }));
    portalGroup.add(ledM);

    const gateGeo = new THREE.RingGeometry(tubeRadius - 0.4, tubeRadius + 0.2, 24);
    const gateMat = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0x00ffcc : 0xff3b98,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const gateMesh = new THREE.Mesh(gateGeo, gateMat);
    portalGroup.add(gateMesh);

    const basis = new THREE.Matrix4().makeBasis(normal, binormal, tangent);
    portalGroup.quaternion.setFromRotationMatrix(basis);
    trackGroup.add(portalGroup);
  });

  // --- PART C: DEEP BENTHIC MOUNTAIN PEAKS (Overlooking from above around Pt 2) ---
  const peaksConfig = [
    { pos: new THREE.Vector3(-230, seabedY, 70), h: 160, r: 75, color: 0x151c2d, lavaColor: 0x00ffcc },
    { pos: new THREE.Vector3(240, seabedY, -30), h: 145, r: 65, color: 0x121724, lavaColor: 0xff33aa },
    { pos: new THREE.Vector3(-210, seabedY, -150), h: 175, r: 75, color: 0x161e31, lavaColor: 0x00ffee },
  ];

  peaksConfig.forEach((cfg) => {
    const peakGroup = new THREE.Group();
    peakGroup.position.copy(cfg.pos).setY(seabedY + cfg.h / 2);

    const coneGeo = new THREE.CylinderGeometry(cfg.r * 0.15, cfg.r, cfg.h, 10, 5);
    const rockMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.88,
      flatShading: true,
    });
    const activeCone = new THREE.Mesh(coneGeo, rockMat);
    peakGroup.add(activeCone);

    const rRim = cfg.r * 0.2;
    const rimGeo = new THREE.TorusGeometry(rRim, 1.8, 6, 12);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: cfg.lavaColor,
      emissive: cfg.lavaColor,
      emissiveIntensity: 1.5,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.setY(cfg.h / 2);
    peakGroup.add(rim);

    const light = new THREE.PointLight(cfg.lavaColor, 2.5, 90);
    light.position.set(0, cfg.h / 2 + 5.0, 0);
    peakGroup.add(light);

    trackGroup.add(peakGroup);
  });

  // --- ENHANCEMENT: HIGH-TECH STARTING DECK CHEVRONS ---
  const numStartingArrows = 12;
  const startingChevronsList: THREE.Group[] = [];

  for (let i = 0; i < numStartingArrows; i++) {
    const t = tStart0 + (i / numStartingArrows) * (tPt1 - tStart0) * 0.95;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const surfaceUp = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const arrowGrp = new THREE.Group();
    // Position slightly above deck surface
    arrowGrp.position.copy(p).add(surfaceUp.clone().multiplyScalar(0.08));

    // Construct physical chevron lanes
    const armGeo = new THREE.BoxGeometry(0.35, 0.06, 2.4);
    const armColorMat = new THREE.MeshBasicMaterial({
      color: 0x00ffee,
      transparent: true,
      opacity: 0.6,
    });

    const leftArm = new THREE.Mesh(armGeo, armColorMat);
    leftArm.position.set(-1.6, 0, -0.6);
    leftArm.rotation.y = Math.PI / 4;

    const rightArm = new THREE.Mesh(armGeo, armColorMat);
    rightArm.position.set(1.6, 0, -0.6);
    rightArm.rotation.y = -Math.PI / 4;

    const tailEnd = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.06, 0.4), armColorMat);
    tailEnd.position.set(0, 0, -1.5);

    arrowGrp.add(leftArm);
    arrowGrp.add(rightArm);
    arrowGrp.add(tailEnd);

    const basisMat4 = new THREE.Matrix4().makeBasis(normal, surfaceUp, tangent);
    arrowGrp.quaternion.setFromRotationMatrix(basisMat4);

    trackGroup.add(arrowGrp);
    startingChevronsList.push(arrowGrp);
  }

  // --- ENHANCEMENT: MAJESTIC LEVIATHAN SWIMMING IN THE BACKGROUND ---
  const leviathan = createAbyssalLeviathan();
  leviathan.position.set(-135, 40, -110);
  leviathan.scale.setScalar(2.2);
  leviathan.rotation.y = Math.PI / 4;
  trackGroup.add(leviathan);

  // --- ENHANCEMENT: HYDROTHERMAL VOLCANIC MAGMA EMBERS ---
  const embersCount = 140;
  const embersGeom = new THREE.BufferGeometry();
  const embersPos = new Float32Array(embersCount * 3);
  const emberSpeeds: number[] = [];
  const emberBaseXs: number[] = [];
  const emberBaseZs: number[] = [];

  for (let i = 0; i < embersCount; i++) {
    const peak = peaksConfig[i % peaksConfig.length];
    const range = peak.r * 0.35;
    const baseX = peak.pos.x + (Math.random() - 0.5) * range;
    const baseZ = peak.pos.z + (Math.random() - 0.5) * range;
    const baseY = seabedY + peak.h - 5 + Math.random() * 80;

    embersPos[i * 3] = baseX;
    embersPos[i * 3 + 1] = baseY;
    embersPos[i * 3 + 2] = baseZ;

    emberBaseXs.push(baseX);
    emberBaseZs.push(baseZ);
    emberSpeeds.push(16 + Math.random() * 26);
  }

  embersGeom.setAttribute("position", new THREE.BufferAttribute(embersPos, 3));
  const embersMat = new THREE.PointsMaterial({
    size: 2.8,
    color: 0xff4c1a,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const hydrothermalEmbers = new THREE.Points(embersGeom, embersMat);
  trackGroup.add(hydrothermalEmbers);

  // --- ENHANCEMENT: BIOLUMINESCENT VECTOR BUBBLE SYSTEM ---
  const bubbleCount = 45;
  const bGeo = new THREE.SphereGeometry(1.0, 6, 4);
  const bMat = new THREE.MeshBasicMaterial({
    color: 0x00ffee,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
  });

  for (let b = 0; b < bubbleCount; b++) {
    const baseX = (Math.random() - 0.5) * 180;
    const baseZ = (Math.random() - 0.5) * 440;
    const baseY = seabedY + Math.random() * 260;
    const scaleFactor = 0.4 + Math.random() * 1.5;

    const bMesh = new THREE.Mesh(bGeo, bMat);
    bMesh.position.set(baseX, baseY, baseZ);
    bMesh.scale.setScalar(scaleFactor);
    trackGroup.add(bMesh);

    bubblesList.push({
      mesh: bMesh,
      speed: 12 + Math.random() * 22,
      rangeX: 3 + Math.random() * 10,
      rangeZ: 3 + Math.random() * 10,
      baseX,
      baseZ,
      freq: 0.6 + Math.random() * 1.1,
    });
  }

  // Create and return the active Phase 1 environmental subsystem with all enhanced visuals
  return new Phase1AbyssSubsystem(
    spotlightsList,
    bubblesList,
    chevronsList,
    startingChevronsList,
    leviathan,
    embersGeom,
    emberSpeeds,
    emberBaseXs,
    emberBaseZs
  );
}

export function createAbyssTrackMaterial(): THREE.Material {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  // 1. Dark benthic volcanic bedrock base (deep blue-grey/oceanic tone)
  ctx.fillStyle = "#010815";
  ctx.fillRect(0, 0, 128, 512);

  // 2. Micro water bubble grid texture
  ctx.fillStyle = "rgba(0, 255, 170, 0.03)";
  for (let x = 0; x < 128; x += 16) {
    for (let y = 0; y < 512; y += 16) {
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Glowing neon coral warning dashed center dividers (Teal/Aquamarine)
  ctx.fillStyle = "rgba(0, 255, 230, 0.85)";
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(61, y + 12, 6, 20); // Thick centered warning guide
  }

  // 4. Glowing deep-sea bio-lime lane guides on the edges
  ctx.fillStyle = "rgba(0, 255, 150, 0.95)";
  ctx.fillRect(0, 0, 4, 512);
  ctx.fillRect(124, 0, 4, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24); // Tile nicely along the long loop

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.82,
    side: THREE.DoubleSide,
  });
}

export function buildAbyssTrenchTrack(trackGroup: THREE.Group): TrackBuildResult {
  // 1. High-tech underwater seabed grid floor
  const seabedSize = 800;
  const gridHelper = new THREE.GridHelper(seabedSize, 80, 0x00ffcc, 0x001133);
  gridHelper.position.y = -100.0; // Rest far below at the absolute bottom of the trench
  if (Array.isArray(gridHelper.material)) {
    gridHelper.material.forEach(m => {
      m.transparent = true;
      m.opacity = 0.25;
    });
  } else {
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.25;
  }
  trackGroup.add(gridHelper);

  // 2. Define track points for the epic Abyss Trench course
  // Descending into a deep volcanic trench, winding through bio-luminescent fields, climbing out via a spiral cavern
  const basePoints = [
    new THREE.Vector3(0, 150, 200),      // Pt 0: Race starts high on a majestic underwater bridge
    new THREE.Vector3(0, 150, 100),      // Pt 1: High speed straight inside a glass aqueduct tube
    new THREE.Vector3(0, 150, 0),        // Pt 2: Overlooking deep benthic mountain peaks
    new THREE.Vector3(0, 145, -100),     // Pt 3: Starting a gradual, terrifying decline
    new THREE.Vector3(0, 135, -200),     // Pt 4: Exiting the high-altitude glass tube
    new THREE.Vector3(10, 120, -280),    // Pt 5: Commencing a high-speed sweeping turn
    new THREE.Vector3(40, 95, -340),     // Pt 6: Pitching downward sharply, G-force building
    new THREE.Vector3(80, 55, -380),     // Pt 7: Vertiginous dive down a colossal ocean trench cliff
    new THREE.Vector3(125, 15, -410),    // Pt 8: Speed soaring as we plunge into deep twilight darkness
    new THREE.Vector3(160, -30, -415),   // Pt 9: Near volcanic bedrock, entering the abyssal zone
    new THREE.Vector3(185, -70, -380),   // Pt 10: Pulling high Gs, flattening out smoothly
    new THREE.Vector3(190, -95, -310),   // Pt 11: Entering the absolute bottom of the trench with a sweeping left drift
    new THREE.Vector3(155, -100, -250),  // Pt 12: Elegant, wide sweep left on the bedrock seafloor
    new THREE.Vector3(175, -99, -190),   // Pt 13: Beautifully smoothed drift curving back right (no backward wiggle!)
    new THREE.Vector3(115, -98, -130),   // Pt 14: Sweeping S-curve drift back left around towering seafloor flora
    new THREE.Vector3(155, -100, -70),   // Pt 15: Deep canyon chicane right past majestic coral pillars
    new THREE.Vector3(95, -95, -10),     // Pt 16: Fluid, wide-radius sweep left towards volcanic vent fields
    new THREE.Vector3(135, -90, 50),     // Pt 17: Sweeping drift right near ancient basalt formations (begins steady climb)
    new THREE.Vector3(75, -83, 100),     // Pt 18: Beautiful high-velocity curve left lining up for the crossover
    new THREE.Vector3(15, -75, 130),     // Pt 19: Smooth alignment entry, preparing to cross under start bridge
    new THREE.Vector3(-60, -66, 90),     // Pt 20: Entering the West sector, snaking into biological coral corridors
    new THREE.Vector3(-110, -56, 30),    // Pt 21: Wide lateral slide left through deep bedrock valleys
    new THREE.Vector3(-55, -45, -30),    // Pt 22: Responsive flick right through neon glowing marine plant arches
    new THREE.Vector3(-115, -33, -90),   // Pt 23: Elegant sweeping glide left over volcanic silt beds
    new THREE.Vector3(-60, -20, -150),   // Pt 24: Quick transition flick right, maintaining high speed momentum
    new THREE.Vector3(-120, -6, -210),   // Pt 25: Long drift left through titanic sunken column lanes
    new THREE.Vector3(-65,  9, -270),    // Pt 26: Final tight hook right around massive bioluminescent mounds
    new THREE.Vector3(-110, 25, -320),   // Pt 27: Sweeping turnaround entrance heading Southwest (cavern ascension)
    new THREE.Vector3(-175, 42, -300),   // Pt 28: Grand high-speed crescent loop back towards the North
    new THREE.Vector3(-185, 60, -230),   // Pt 29: Straightening out for the ultimate full-throttle dash
    new THREE.Vector3(-185, 80, -130),   // Pt 30: Lighting fast speedway straightaway past final marine bases
    new THREE.Vector3(-185, 100, -10),   // Pt 31: Flying past spectator galleries towards the finish gate
    new THREE.Vector3(-185, 112, 70),    // Pt 32: Climbing further, upwards angle starting to lessen
    new THREE.Vector3(-185, 118, 150),   // Pt 33: Gradual flattening-out, preparing for the drop
    new THREE.Vector3(-185, 118, 230),   // Pt 34: Completely straight horizontal speedway high above the depths
    new THREE.Vector3(-135, 105, 300),   // Pt 35: Initiating a gorgeous, round curved turn drop to the right
    new THREE.Vector3(-65,  80, 290),    // Pt 36: Sweeping right turn, beginning our thrilling descent
    new THREE.Vector3(0,    48, 260),    // Pt 37: Curving back through the descent, G-forces building
    new THREE.Vector3(45,   12, 210),    // Pt 38: Dropping deeper down an elegant spiral loop
    new THREE.Vector3(65,  -25, 150),    // Pt 39: Diving into the sub-oceanic twilight zone
    new THREE.Vector3(65,  -60,  80),    // Pt 40: Plunging deep through towering underwater lava pillars
    new THREE.Vector3(35,  -90,  10),    // Pt 41: Smoothing out near the bedrock seafloor (no overlap with Pt 16!)
    new THREE.Vector3(55,  -95, -50),    // Pt 42: Transitioning into a slightly snaking road, gentle left drift
    new THREE.Vector3(45,  -97, -110),   // Pt 43: Flowing right, high speed with no hard turns
    new THREE.Vector3(65,  -99, -150),   // Pt 44: Snaking gently back left, lining up for the final gate
    new THREE.Vector3(65,  -100, -210),  // Pt 45: Gliding gracefully right, maintaining high speed momentum
    new THREE.Vector3(115, -100, -260),  // Pt 46: Flying towards the majestic final finish gate!
  ];

  // Phase 4: Huge upward spiral track wrapping around center dome station
  const spiralCenter = new THREE.Vector3(115, -100, -210);
  const spiralRadius = 50;
  const numSpiralPoints = 28; // 3.5 loops of 8 points
  const totalAngle = 3.5 * 2 * Math.PI;
  const startY = -100;
  const endY = 190; // Overlooking the entire abyss canyon from a supreme high altitude

  const points = [...basePoints];
  for (let i = 1; i <= numSpiralPoints; i++) {
    const t = i / numSpiralPoints;
    const angle = -Math.PI / 2 + t * totalAngle;
    const x = spiralCenter.x + spiralRadius * Math.cos(angle);
    const z = spiralCenter.z + spiralRadius * Math.sin(angle);
    const y = startY + t * (endY - startY);
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, false);
  const segments = 750;
  const trackWidth = 34;
  const halfWidth = trackWidth / 2;
  const spacedPoints = curve.getSpacedPoints(segments);

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];

  const wallHeight = 2.8;
  const wallVerts = new Float32Array((segments + 1) * 4 * 3);
  const wallIndices = [];

  // Smooth bank angles calculation for extreme G-forces (Double-pass smoothing filters jitter perfectly!)
  const rawBankAngles: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const tNext = Math.min(t + 0.02, 0.9999);
    const tangentNext = curve.getTangentAt(tNext);
    const crossY = tangent.z * tangentNext.x - tangent.x * tangentNext.z;
    rawBankAngles.push(crossY * 2.8); // Bank intensity multiplier
  }

  // Pass 1: Moving average list
  const pass1BankAngles: number[] = [];
  const smoothWindow1 = 25;
  for (let i = 0; i <= segments; i++) {
    let sum = 0;
    for (let j = -smoothWindow1; j <= smoothWindow1; j++) {
      let idx = i + j;
      idx = Math.max(0, Math.min(segments, idx));
      sum += rawBankAngles[idx] || 0;
    }
    pass1BankAngles.push(sum / (smoothWindow1 * 2 + 1));
  }

  // Pass 2: Moving average list
  const smoothedBankAngles: number[] = [];
  const smoothWindow2 = 15;
  const maxBank = Math.PI / 12; // 15 degrees max bank (gentle tilt for visibility)
  for (let i = 0; i <= segments; i++) {
    let sum = 0;
    for (let j = -smoothWindow2; j <= smoothWindow2; j++) {
      let idx = i + j;
      idx = Math.max(0, Math.min(segments, idx));
      sum += pass1BankAngles[idx] || 0;
    }
    let avg = sum / (smoothWindow2 * 2 + 1);

    // Apply deadzone threshold for completely flat straights
    if (Math.abs(avg) < 0.03) {
      avg = 0;
    } else {
      avg = Math.sign(avg) * (Math.abs(avg) - 0.03);
    }
    smoothedBankAngles.push(Math.max(-maxBank, Math.min(maxBank, avg)));
  }

  // Geometry computation
  for (let i = 0; i <= segments; i++) {
    const index = i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));

    const bankAngle = smoothedBankAngles[i];
    const up = new THREE.Vector3(0, 1, 0);
    let unbankedNormal = new THREE.Vector3().crossVectors(tangent, up);
    if (unbankedNormal.lengthSq() < 0.0001) {
      unbankedNormal.set(1, 0, 0); // Gymbal-lock safe fallback
    } else {
      unbankedNormal.normalize();
    }
    const realUp = new THREE.Vector3().crossVectors(unbankedNormal, tangent).normalize();

    // Rotated coordinate frame
    const normal = unbankedNormal.clone().applyAxisAngle(tangent, -bankAngle);
    const surfaceUp = realUp.clone().applyAxisAngle(tangent, -bankAngle);

    const v1 = p.clone().add(normal.clone().multiplyScalar(halfWidth));
    const v2 = p.clone().add(normal.clone().multiplyScalar(-halfWidth));

    vertices[i * 6] = v1.x;
    vertices[i * 6 + 1] = v1.y;
    vertices[i * 6 + 2] = v1.z;
    vertices[i * 6 + 3] = v2.x;
    vertices[i * 6 + 4] = v2.y;
    vertices[i * 6 + 5] = v2.z;

    uvs[i * 4] = 0;
    uvs[i * 4 + 1] = t * 24;
    uvs[i * 4 + 2] = 1;
    uvs[i * 4 + 3] = t * 24;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    // Build the containment laser grid walls
    const w1 = v1.clone().add(surfaceUp.clone().multiplyScalar(wallHeight));
    const w2 = v2.clone().add(surfaceUp.clone().multiplyScalar(wallHeight));

    wallVerts[i * 12] = v1.x;
    wallVerts[i * 12 + 1] = v1.y;
    wallVerts[i * 12 + 2] = v1.z;

    wallVerts[i * 12 + 3] = w1.x;
    wallVerts[i * 12 + 4] = w1.y;
    wallVerts[i * 12 + 5] = w1.z;

    wallVerts[i * 12 + 6] = v2.x;
    wallVerts[i * 12 + 7] = v2.y;
    wallVerts[i * 12 + 8] = v2.z;

    wallVerts[i * 12 + 9] = w2.x;
    wallVerts[i * 12 + 10] = w2.y;
    wallVerts[i * 12 + 11] = w2.z;

    if (i < segments) {
      const a1 = i * 4;
      const b1 = i * 4 + 1;
      const c1 = (i + 1) * 4;
      const d1 = (i + 1) * 4 + 1;

      const a2 = i * 4 + 2;
      const b2 = i * 4 + 3;
      const c2 = (i + 1) * 4 + 2;
      const d2 = (i + 1) * 4 + 3;

      // Right wall
      wallIndices.push(a1, b1, c1);
      wallIndices.push(b1, d1, c1);

      // Left wall
      wallIndices.push(a2, c2, b2);
      wallIndices.push(b2, c2, d2);
    }
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute("position", new THREE.BufferAttribute(wallVerts, 3));
  wallGeometry.setIndex(wallIndices);
  wallGeometry.computeVertexNormals();

  // Create our highly polished, custom-textured aquatic racetrack floor
  const trackMat = createAbyssTrackMaterial();
  const trackMesh = new THREE.Mesh(geometry, trackMat);
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // Bioluminescent grid containment energy field walls
  const wallMat = createAbyssWallMaterial();
  const wallMesh = new THREE.Mesh(wallGeometry, wallMat);
  wallMesh.userData.isWall = true;
  trackGroup.add(wallMesh);

  // 3. Marine Snow / Bubbles Field
  const bubbleGeo = new THREE.BufferGeometry();
  const bubbleCount = 4500;
  const bubblePos = new Float32Array(bubbleCount * 3);
  const bubbleCol = new Float32Array(bubbleCount * 3);

  for (let i = 0; i < bubbleCount; i++) {
    bubblePos[i * 3] = (Math.random() - 0.5) * 600;
    bubblePos[i * 3 + 1] = Math.random() * 150 - 100; // Y from -100 to +50
    bubblePos[i * 3 + 2] = (Math.random() - 0.5) * 600;

    const r = Math.random();
    if (r < 0.4) {
      bubbleCol[i * 3] = 0.0;
      bubbleCol[i * 3 + 1] = 0.9;
      bubbleCol[i * 3 + 2] = 0.8;
    } else if (r < 0.8) {
      bubbleCol[i * 3] = 0.1;
      bubbleCol[i * 3 + 1] = 0.6;
      bubbleCol[i * 3 + 2] = 1.0;
    } else {
      bubbleCol[i * 3] = 0.5;
      bubbleCol[i * 3 + 1] = 1.0;
      bubbleCol[i * 3 + 2] = 0.9;
    }
  }

  function createBubbleTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(8, 8, 2, 8, 8, 8);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.3, "rgba(100,240,255,0.7)");
    gradient.addColorStop(0.6, "rgba(0,180,255,0.15)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(canvas);
  }

  bubbleGeo.setAttribute("position", new THREE.BufferAttribute(bubblePos, 3));
  bubbleGeo.setAttribute("color", new THREE.BufferAttribute(bubbleCol, 3));
  const bubbleMat = new THREE.PointsMaterial({
    size: 3.5,
    vertexColors: true,
    map: createBubbleTexture(),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const bubbleField = new THREE.Points(bubbleGeo, bubbleMat);
  trackGroup.add(bubbleField);

  // 4. Custom Sea Anemones & Bioluminescent Coral Along the Track
  const createSubseaFlora = (): THREE.Group => {
    const flora = new THREE.Group();
    const ht = 4 + Math.random() * 5;
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.45, ht, 5);
    trunkGeo.translate(0, ht / 2, 0);
    const trunkMat = new THREE.MeshPhongMaterial({
      color: 0x050811,
      emissive: 0x000611,
      flatShading: true,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    flora.add(trunk);

    const bulbCount = 3 + Math.floor(Math.random() * 4);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x00ffee : 0xff00bb,
      emissive: Math.random() > 0.5 ? 0x00ccbb : 0xaa0077,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });

    for (let b = 0; b < bulbCount; b++) {
      const bGeo = new THREE.SphereGeometry(0.4 + Math.random() * 0.5, 5, 5);
      const m = new THREE.Mesh(bGeo, bulbMat);
      const yOffset = (b / bulbCount) * ht + 1;
      const angle = (b / bulbCount) * Math.PI * 2.5;
      const rad = 0.8 + Math.random() * 0.9;
      m.position.set(Math.cos(angle) * rad, yOffset, Math.sin(angle) * rad);
      flora.add(m);
    }
    return flora;
  };

  // Place corals on the shoulders of the track: perfectly banked and rotated to make them fit like genuine subsea flora
  for (let s = 10; s < segments - 10; s += 16) {
    const index = s;
    const p = spacedPoints[index];
    const t = s / segments;
    const tangent = curve.getTangentAt(Math.min(t, 0.9999));
    const bankAngle = smoothedBankAngles[index];

    const up = new THREE.Vector3(0, 1, 0);
    let unbankedNormal = new THREE.Vector3().crossVectors(tangent, up);
    if (unbankedNormal.lengthSq() < 0.0001) {
      unbankedNormal.set(1, 0, 0);
    } else {
      unbankedNormal.normalize();
    }
    const realUp = new THREE.Vector3().crossVectors(unbankedNormal, tangent).normalize();

    const normal = unbankedNormal.clone().applyAxisAngle(tangent, -bankAngle);
    const surfaceUp = realUp.clone().applyAxisAngle(tangent, -bankAngle);

    const coralLeft = createSubseaFlora();
    coralLeft.position.copy(p)
      .add(normal.clone().multiplyScalar(halfWidth + 3.0))
      .add(surfaceUp.clone().multiplyScalar(-0.25));

    const coralMat4 = new THREE.Matrix4().makeBasis(normal, surfaceUp, tangent);
    coralLeft.quaternion.setFromRotationMatrix(coralMat4);
    trackGroup.add(coralLeft);

    const coralRight = createSubseaFlora();
    coralRight.position.copy(p)
      .add(normal.clone().multiplyScalar(-(halfWidth + 3.0)))
      .add(surfaceUp.clone().multiplyScalar(-0.25));

    coralRight.quaternion.setFromRotationMatrix(coralMat4);
    trackGroup.add(coralRight);
  }

  // 5. Bio-luminescing trench energy archways
  for (let i = 20; i < segments - 20; i += 36) {
    const p = spacedPoints[i];
    const tangent = curve.getTangentAt(Math.min(i / segments, 0.9999));
    const bankAngle = smoothedBankAngles[i];

    const up = new THREE.Vector3(0, 1, 0);
    let unbankedNormal = new THREE.Vector3().crossVectors(tangent, up);
    if (unbankedNormal.lengthSq() < 0.0001) {
      unbankedNormal.set(1, 0, 0);
    } else {
      unbankedNormal.normalize();
    }
    const realUp = new THREE.Vector3().crossVectors(unbankedNormal, tangent).normalize();

    const normal = unbankedNormal.clone().applyAxisAngle(tangent, -bankAngle);
    const surfaceUp = realUp.clone().applyAxisAngle(tangent, -bankAngle);

    const archGeo = new THREE.TorusGeometry(trackWidth * 0.72, 0.6, 8, 32, Math.PI);
    const archMat = new THREE.MeshBasicMaterial({
      color: i < segments / 2 ? 0x00ffee : 0xff3b98,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.copy(p);

    const matrix = new THREE.Matrix4().makeBasis(normal, surfaceUp, tangent);
    arch.quaternion.setFromRotationMatrix(matrix);
    trackGroup.add(arch);
  }

  // 6. Volcanic Vent Bubble Geysers in the trench bed!
  const geyser1Pt = points[18].clone();
  geyser1Pt.y -= 2.5; // Seat the geyser base ring flatly on the road surface
  const geyser1 = new NeonGeyserSystem(geyser1Pt);
  geyser1.init(trackGroup);

  const geyser2Pt = points[26].clone();
  geyser2Pt.y -= 2.5; // Seat the geyser base ring flatly on the road surface
  const geyser2 = new NeonGeyserSystem(geyser2Pt);
  geyser2.init(trackGroup);

  // 7. Start & Finish lines
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(trackWidth, 4);
  
  // Starting grid deck checker
  const startLine = new THREE.Mesh(finishLineGeo, finishMat);
  const startPt = curve.getPointAt(0);
  const startTan = curve.getTangentAt(0);
  startLine.position.set(startPt.x, startPt.y + 0.12, startPt.z);
  startLine.rotation.y = Math.atan2(startTan.x, startTan.z);
  trackGroup.add(startLine);

  // Ending visual finish deck checker
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat.clone());
  const endPt = curve.getPointAt(1.0);
  const endTan = curve.getTangentAt(1.0);
  finishLine.position.set(endPt.x, endPt.y + 0.12, endPt.z);
  finishLine.rotation.y = Math.atan2(endTan.x, endTan.z);
  trackGroup.add(finishLine);

  // Boost pads positioning (distributed evenly up to the giant spiral!)
  const b1Pt = curve.getPointAt(0.10);
  const b2Pt = curve.getPointAt(0.24);
  const b3Pt = curve.getPointAt(0.38);
  const b4Pt = curve.getPointAt(0.52);
  const b5Pt = curve.getPointAt(0.68);
  const b6Pt = curve.getPointAt(0.84);

  const boostSystem = new BoostPadSystem([
    new THREE.Vector3(b1Pt.x, b1Pt.y + 0.1, b1Pt.z),
    new THREE.Vector3(b2Pt.x, b2Pt.y + 0.1, b2Pt.z),
    new THREE.Vector3(b3Pt.x, b3Pt.y + 0.1, b3Pt.z),
    new THREE.Vector3(b4Pt.x, b4Pt.y + 0.1, b4Pt.z),
    new THREE.Vector3(b5Pt.x, b5Pt.y + 0.1, b5Pt.z),
    new THREE.Vector3(b6Pt.x, b6Pt.y + 0.1, b6Pt.z),
  ], curve);

  // 9. Majestic Undersea Research Station (Aesthetic biodome in the center of the giant upward spiral!)
  const phase4System = buildPhase4AbyssEnvironment(trackGroup, curve, points);

  // Build spectacular structural, glass-canopied, and volcanic environmental elements for Phase 1
  const phase1System = buildPhase1AbyssEnvironment(trackGroup, curve, points, trackWidth);

  // Build the colossal Phase 2 vertical plunge canyon and volcanic hydrothermal environment
  const phase2System = buildPhase2AbyssEnvironment(trackGroup, curve, points, trackWidth);

  // Build the gorgeous Phase 3 seabed bioluminescent garden and ancient sunken column corridors
  const phase3System = buildPhase3AbyssEnvironment(trackGroup, curve, points, trackWidth);

  // Build the spectacular Phase 5 lava hydrothermal descent and grand finish gate portal
  const phase5System = buildPhase5AbyssEnvironment(trackGroup, curve, points, trackWidth);

  // 8. Visual Pt markers at each anchor node for layout alignment and steering guidance
  points.forEach((pt, index) => {
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(pt);

    // Light emitting anchor base sphere with orbit guidelines
    const sphereGeo = new THREE.SphereGeometry(1.2, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xff3b98 : 0x00ffcc,
      wireframe: true,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    markerGroup.add(sphereMesh);

    // Glowing vertical guide line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 9, 0),
    ]);
    const lineMat = new THREE.LineBasicMaterial({
      color: index === 0 ? 0xff3b98 : 0x00ffee,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    markerGroup.add(line);

    // Canvas floating billboard sprite with high-glow index text
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Translucent glassmorphic dark container
    ctx.fillStyle = "rgba(1, 12, 28, 0.85)";
    ctx.fillRect(0, 0, 128, 64);

    // High brightness neon border stroke
    ctx.strokeStyle = index === 0 ? "#ff3b98" : "#00ffcc";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 124, 60);

    // Subtle internal grid matrix (cool sub-grid visual alignment)
    ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
    for (let x = 8; x < 128; x += 16) {
      ctx.fillRect(x, 0, 1, 64);
    }
    for (let y = 8; y < 64; y += 16) {
      ctx.fillRect(0, y, 128, 1);
    }

    // Modern text styling with radial neon glow
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = index === 0 ? "#ff3b98" : "#00ffcc";
    ctx.shadowBlur = 8;
    ctx.fillText("Pt " + index, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      depthTest: true,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.raycast = function () {}; // Disable raycast to prevent camera/physics interference
    sprite.scale.set(10, 5, 1);
    sprite.position.set(0, 9, 0); // Raised floating position for perfect visual framing
    markerGroup.add(sprite);

    trackGroup.add(markerGroup);
  });

  return {
    boostSystem,
    railSystem: new GrindRailSystem([]),
    neonGeyserSystem: new MultiSubsystem([geyser1, geyser2]), // Register composite geyser system
    tunnelLightsSystem: new MultiSubsystem([phase1System, phase2System, phase3System, phase4System, phase5System]), // Register Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 dynamic animation environments
    curve,
  };
}

export function buildMarioTrack(trackGroup: THREE.Group): TrackBuildResult {
  const CELL_SIZE = 15.0;

  // 1. 2D grid path coordinates representing the classic Mario Circuit 1
  const MARIO_PATH = [
    { r: 13, c: 12 },
    { r: 12, c: 12 },
    { r: 11, c: 12 }, // Starting grid area
    { r: 10, c: 12 }, // Start/finish line
    { r: 9, c: 12 },
    { r: 8, c: 12 },
    { r: 7, c: 12 },
    { r: 6, c: 12 },
    { r: 5, c: 12 },
    { r: 4, c: 12 },
    { r: 3, c: 12 }, // Curve West
    
    // Top horizontal straight
    { r: 3, c: 11 },
    { r: 3, c: 10 },
    { r: 3, c: 9 },  // Diagonal transition starts
    
    // Diagonal South-West straight
    { r: 4, c: 8 },
    { r: 5, c: 7 },
    { r: 6, c: 6 },
    { r: 7, c: 5 },
    { r: 8, c: 4 },  // Curve South
    
    // Left vertical straight
    { r: 9, c: 4 },
    { r: 10, c: 4 },
    { r: 11, c: 4 },
    { r: 12, c: 4 }, // Curve East
    
    // Bottom U-turn loop
    { r: 12, c: 5 },
    { r: 12, c: 6 }, // Curve North-East
    
    // Diagonal North-East straight
    { r: 11, c: 7 },
    { r: 10, c: 8 },
    { r: 9, c: 9 },  // U-turn South
    
    // Center hairpin vertical straight
    { r: 8, c: 10 },
    { r: 9, c: 10 },
    { r: 10, c: 10 }, // Diagonal South-West
    
    // Diagonal South-West
    { r: 11, c: 9 },
    { r: 12, c: 8 }, // Curve East
    
    // Bottom-Right bend connecting back to start straight
    { r: 13, c: 9 },
    { r: 13, c: 10 },
    { r: 13, c: 11 },
  ];

  // Map cells to 3D points
  const marioCircuitPoints = MARIO_PATH.map(p => {
    const x = (p.c - 7.5) * CELL_SIZE;
    const z = (p.r - 7.5) * CELL_SIZE;
    return new THREE.Vector3(x, 0, z);
  });

  const trackCurve = new THREE.CatmullRomCurve3(marioCircuitPoints, true);

  const segments = 400;
  const spacedPoints = trackCurve.getSpacedPoints(segments);
  const trackWidth = 15.0; // Matches CELL_SIZE
  const halfWidth = trackWidth / 2;

  // Generate invisible physics collider backing ribbon geometry
  const trackGeo = new THREE.BufferGeometry();
  const roadVertices = new Float32Array((segments + 1) * 2 * 3);
  const roadUvs = new Float32Array((segments + 1) * 2 * 2);
  const roadIndices = [];

  for (let i = 0; i <= segments; i++) {
    const index = i === segments ? 0 : i;
    const p = spacedPoints[index];
    const t = i / segments;
    const tangent = trackCurve.getTangentAt(Math.min(t, 0.9999));
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    const vIn = p.clone().add(normal.clone().multiplyScalar(-halfWidth));
    const vOut = p.clone().add(normal.clone().multiplyScalar(halfWidth));

    roadVertices[i * 6] = vIn.x;
    roadVertices[i * 6 + 1] = vIn.y;
    roadVertices[i * 6 + 2] = vIn.z;
    roadVertices[i * 6 + 3] = vOut.x;
    roadVertices[i * 6 + 4] = vOut.y;
    roadVertices[i * 6 + 5] = vOut.z;

    roadUvs[i * 4] = 0;
    roadUvs[i * 4 + 1] = t;
    roadUvs[i * 4 + 2] = 1;
    roadUvs[i * 4 + 3] = t;

    if (i < segments) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      roadIndices.push(a, b, c);
      roadIndices.push(b, d, c);
    }
  }

  trackGeo.setAttribute("position", new THREE.BufferAttribute(roadVertices, 3));
  trackGeo.setAttribute("uv", new THREE.BufferAttribute(roadUvs, 2));
  trackGeo.setIndex(roadIndices);
  trackGeo.computeVertexNormals();

  const trackMat = new THREE.MeshBasicMaterial({ visible: false });
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.y = -0.5;
  trackMesh.userData.isDriveable = true;
  trackGroup.add(trackMesh);

  // --- Load and Place Modular 3D Road Tiles ---
  const roadLoader = new GLTFLoader();
  const roadTilesGroup = new THREE.Group();
  trackGroup.add(roadTilesGroup);

  let straightModel: THREE.Object3D | null = null;
  let cornerModel: THREE.Object3D | null = null;
  let startModel: THREE.Object3D | null = null;
  let arrowModel: THREE.Object3D | null = null;

  const createCenteredModelWrapper = (originalModel: THREE.Object3D, offsetX: number, offsetZ: number) => {
    const parentGroup = new THREE.Group();
    const modelClone = originalModel.clone();
    modelClone.position.set(offsetX, 0, offsetZ);
    parentGroup.add(modelClone);
    return parentGroup;
  };

  const buildGridTiles = () => {
    if (!straightModel || !cornerModel || !startModel || !arrowModel) return;

    const pathLen = MARIO_PATH.length;
    for (let i = 0; i < pathLen; i++) {
      const prev = MARIO_PATH[(i - 1 + pathLen) % pathLen];
      const curr = MARIO_PATH[i];
      const next = MARIO_PATH[(i + 1) % pathLen];

      const dxIn = curr.c - prev.c;
      const dzIn = curr.r - prev.r;
      const dxOut = next.c - curr.c;
      const dzOut = next.r - curr.r;

      const posX = (curr.c - 7.5) * CELL_SIZE;
      const posZ = (curr.r - 7.5) * CELL_SIZE;

      let tileInstance: THREE.Group;
      let rotY = 0;
      let scaleX = CELL_SIZE;
      let scaleZ = CELL_SIZE;

      const isCorner = (dxIn * dxOut + dzIn * dzOut === 0) && (dxIn !== 0 || dzIn !== 0) && (dxOut !== 0 || dzOut !== 0);

      if (isCorner) {
        tileInstance = createCenteredModelWrapper(cornerModel, -0.5, 0.5);

        const dx1 = prev.c - curr.c;
        const dz1 = prev.r - curr.r;
        const dx2 = next.c - curr.c;
        const dz2 = next.r - curr.r;

        // TL: connects South (dz=1) and East (dx=1)
        if ((dx1 === 1 || dx2 === 1) && (dz1 === 1 || dz2 === 1)) {
          rotY = 0;
        }
        // TR: connects South (dz=1) and West (dx=-1)
        else if ((dx1 === -1 || dx2 === -1) && (dz1 === 1 || dz2 === 1)) {
          rotY = Math.PI / 2;
        }
        // BR: connects North (dz=-1) and West (dx=-1)
        else if ((dx1 === -1 || dx2 === -1) && (dz1 === -1 || dz2 === -1)) {
          rotY = Math.PI;
        }
        // BL: connects North (dz=-1) and East (dx=1)
        else if ((dx1 === 1 || dx2 === 1) && (dz1 === -1 || dz2 === -1)) {
          rotY = 3 * Math.PI / 2;
        }
      } else {
        const isSF = (curr.r === 10 && curr.c === 12);
        const isBP = (curr.r === 9 && curr.c === 12) || 
                     (curr.r === 7 && curr.c === 12) || 
                     (curr.r === 5 && curr.c === 7) || 
                     (curr.r === 6 && curr.c === 6);

        if (isSF) {
          tileInstance = createCenteredModelWrapper(startModel, -0.5, 0.5);
        } else if (isBP) {
          tileInstance = createCenteredModelWrapper(arrowModel, -0.5, 0.5);
        } else {
          tileInstance = createCenteredModelWrapper(straightModel, -0.5, 0.5);
        }

        const dx = next.c - curr.c;
        const dz = next.r - curr.r;
        rotY = Math.atan2(dx, dz);

        const isDiagonal = (dx !== 0 && dz !== 0);
        if (isDiagonal) {
          const lengthScale = Math.sqrt(dx * dx + dz * dz) * CELL_SIZE;
          scaleX = CELL_SIZE;
          scaleZ = lengthScale;
        } else {
          scaleX = CELL_SIZE;
          scaleZ = CELL_SIZE;
        }
      }

      tileInstance.position.set(posX, -0.49, posZ);
      tileInstance.rotation.y = rotY;
      tileInstance.scale.set(scaleX, 1.0, scaleZ);

      tileInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isDriveable = true;
        }
      });

      roadTilesGroup.add(tileInstance);
    }
  };

  roadLoader.load("/roadStraight.glb", (gltf) => {
    straightModel = gltf.scene;
    straightModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadCornerSmall.glb", (gltf) => {
    cornerModel = gltf.scene;
    cornerModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadStart.glb", (gltf) => {
    startModel = gltf.scene;
    startModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  roadLoader.load("/roadStraightArrow.glb", (gltf) => {
    arrowModel = gltf.scene;
    arrowModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          (child.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
    });
    buildGridTiles();
  });

  // --- Create Reference Map Ground Plane ---
  const mapLoader = new THREE.TextureLoader();
  const mapTex = mapLoader.load("mario_map.webp");
  const groundMat = new THREE.MeshBasicMaterial({
    map: mapTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, -0.52, 0); // slightly below track road
  groundMesh.userData.isDriveable = true; // make ground solid to prevent falling into the void
  trackGroup.add(groundMesh);

  // --- Create Lit Start/Finish Line Checker ---
  const finishLineGeo = new THREE.PlaneGeometry(trackWidth, 4);
  finishLineGeo.rotateX(-Math.PI / 2);
  const finishMat = createFuturisticFinishMaterial(8, 1);
  const finishLine = new THREE.Mesh(finishLineGeo, finishMat);
  finishLine.position.set(67.5, -0.48, 37.5); // Row 10, col 12
  trackGroup.add(finishLine);

  // --- Retro Synthwave Stage Lighting ---
  const pinkLight = new THREE.DirectionalLight(0xff0088, 0.7);
  pinkLight.position.set(-60, 40, -100);
  trackGroup.add(pinkLight);

  const orangeLight = new THREE.DirectionalLight(0xffaa00, 0.5);
  orangeLight.position.set(60, 30, 100);
  trackGroup.add(orangeLight);

  // Boost Pad positions (placed along start straight and diagonal straight)
  const boostPositions = [
    new THREE.Vector3(67.5, -0.4, 22.5), // Row 9, col 12
    new THREE.Vector3(67.5, -0.4, -7.5),  // Row 7, col 12
    new THREE.Vector3(-22.5, -0.4, -37.5), // Row 5, col 7
    new THREE.Vector3(-52.5, -0.4, -22.5), // Row 6, col 6
  ];

  // --- Load and Place Low-Poly Kenney Barriers ---
  const gltfLoader = new GLTFLoader();
  const barriersGroup = new THREE.Group();
  trackGroup.add(barriersGroup);

  let redModel: THREE.Object3D | null = null;
  let whiteModel: THREE.Object3D | null = null;

  const placeBarriers = () => {
    if (!redModel || !whiteModel) return;

    const curveLength = trackCurve.getLength();
    const spacing = 2.8; // space between barriers to close gaps
    const count = Math.floor(curveLength / spacing);

    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = trackCurve.getPointAt(u);
      const tangent = trackCurve.getTangentAt(u);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Alternating colors
      const isRed = i % 2 === 0;

      // Left side barrier
      const leftInstance = isRed ? redModel.clone() : whiteModel.clone();
      leftInstance.position.copy(pt).add(normal.clone().multiplyScalar(-halfWidth - 1.2));
      leftInstance.position.y = -0.5;
      leftInstance.lookAt(leftInstance.position.clone().add(tangent));
      leftInstance.rotateY(Math.PI / 2);
      leftInstance.scale.set(9.0, 9.0, 9.0);
      
      leftInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isWall = true;
          child.receiveShadow = false;
          child.castShadow = false;
        }
      });
      barriersGroup.add(leftInstance);

      // Right side barrier (offset pattern)
      const rightInstance = isRed ? whiteModel.clone() : redModel.clone();
      rightInstance.position.copy(pt).add(normal.clone().multiplyScalar(halfWidth + 1.2));
      rightInstance.position.y = -0.5;
      rightInstance.lookAt(rightInstance.position.clone().add(tangent));
      rightInstance.rotateY(Math.PI / 2);
      rightInstance.scale.set(9.0, 9.0, 9.0);

      rightInstance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.isWall = true;
          child.receiveShadow = false;
          child.castShadow = false;
        }
      });
      barriersGroup.add(rightInstance);
    }
  };

  gltfLoader.load("/barrierRed.glb", (gltf) => {
    redModel = gltf.scene;
    placeBarriers();
  });

  gltfLoader.load("/barrierWhite.glb", (gltf) => {
    whiteModel = gltf.scene;
    placeBarriers();
  });

  return {
    boostSystem: new BoostPadSystem(boostPositions, trackCurve),
    curve: trackCurve,
  };
}
