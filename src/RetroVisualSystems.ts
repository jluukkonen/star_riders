import * as THREE from "three";
import { TrackSubsystem, PlayerState } from "./TrackSubsystems";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// --- SYSTEM 1: PARALLAX VECTOR MOUNTAINS ---
export class ParallaxMountainsSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private numPeaks = 12;
  private peakData: {
    group: THREE.Group;
    scanRing: THREE.Mesh;
    scanHeight: number;
    scanSpeed: number;
    baseY: number;
    peakHeight: number;
    peakRadius: number;
  }[] = [];

  init(parent: THREE.Object3D) {
    // Clear any previous children in case of reinits
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.peakData = [];

    const peakRadius = 500; // Far on the horizon range
    const pyrGeo = new THREE.ConeGeometry(90, 160, 4); // Low-poly pyramid peaks
    
    // Deep dark obsidian material to render structure and occlude background grid
    const solidMat = new THREE.MeshPhongMaterial({
      color: 0x050209,
      emissive: 0x110222,
      flatShading: true,
      shininess: 1,
    });

    const neonColors = [0x00ffff, 0xff00bb, 0x8800ff, 0x00ffaa];

    for (let i = 0; i < this.numPeaks; i++) {
      const angle = (i / this.numPeaks) * Math.PI * 2;
      // Add minor random scatter to break artificial grid structure
      const spreadAngle = angle + (Math.random() - 0.5) * 0.15;
      const dist = peakRadius + (Math.random() * 80 - 45);

      const px = Math.cos(spreadAngle) * dist;
      const pz = Math.sin(spreadAngle) * dist;
      const py = -10 + Math.random() * 15; // Placed at horizon level

      const peakGroup = new THREE.Group();
      peakGroup.position.set(px, py, pz);

      // Solid body mesh
      const solidMesh = new THREE.Mesh(pyrGeo, solidMat);
      solidMesh.castShadow = false;
      solidMesh.receiveShadow = false;
      peakGroup.add(solidMesh);

      // Neon-glowing wireframe shell
      const edgeColor = neonColors[i % neonColors.length];
      const wireMat = new THREE.MeshBasicMaterial({
        color: edgeColor,
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      });
      const wireMesh = new THREE.Mesh(pyrGeo, wireMat);
      wireMesh.scale.setScalar(1.008); // Avoid initial z-fighting
      peakGroup.add(wireMesh);

      // Procedural scanner topographic height ring sitting on the mountain side
      const ringGeo = new THREE.TorusGeometry(1, 0.15, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const scanRing = new THREE.Mesh(ringGeo, ringMat);
      peakGroup.add(scanRing);

      // Random scale for natural visual organic composition
      const randomScaleY = 0.75 + Math.random() * 0.6;
      const randomScaleXZ = 0.8 + Math.random() * 0.5;
      peakGroup.scale.set(randomScaleXZ, randomScaleY, randomScaleXZ);
      peakGroup.rotation.y = Math.random() * Math.PI;

      this.group.add(peakGroup);

      this.peakData.push({
        group: peakGroup,
        scanRing,
        scanHeight: (Math.random() - 0.5) * 160, // starts at clean random local height [-80, 80]
        scanSpeed: 25 + Math.random() * 20,
        baseY: py,
        peakHeight: 160,
        peakRadius: 90,
      });
    }

    parent.add(this.group);
  }

  update(dt: number, player: PlayerState) {
    if (!player || !player.position) return;
    
    // Smooth 3D parallax displacement effect: Centered with player offsets scaled way down
    // Keeping the mountains appearing millions of units away on the horizon
    const factor = 0.985;
    const px = player.position.x * factor;
    const pz = player.position.z * factor;
    
    // Dampen height tracking as well to avoid mountain dipping during climbs/drops
    const py = player.position.y * factor - 35; // Positioned on horizon

    this.group.position.set(px, py, pz);

    // Update crawling topography scans
    for (const p of this.peakData) {
      p.scanHeight += p.scanSpeed * dt;
      if (p.scanHeight > 80) {
        p.scanHeight = -80;
      }
      const localY = p.scanHeight;
      const r = 90 * ((80 - localY) / 160);
      p.scanRing.position.y = localY;
      p.scanRing.scale.set(Math.max(1.0, r * 1.01), 1, Math.max(1.0, r * 1.01));

      const heightPercent = (localY + 80) / 160;
      if (!Array.isArray(p.scanRing.material)) {
        p.scanRing.material.opacity = 0.95 * Math.sin(heightPercent * Math.PI);
      }
    }
  }
}

// --- SYSTEM 2: DISTANT HOLOGRAPHIC CITY SKYLINES ---
export class HolographicCitySystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private trafficGroup: THREE.Group = new THREE.Group();
  private buildingsCount = 18;
  private searchlights: {
    mesh: THREE.Mesh;
    rotSpeed: number;
    timeOffset: number;
  }[] = [];

  // Track simple structures for traffic simulation
  private trafficCars: {
    mesh: THREE.Mesh;
    startX: number;
    endX: number;
    speed: number;
    progress: number;
    y: number;
    z: number;
    color: number;
  }[] = [];

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.trafficCars = [];
    this.searchlights = [];

    const cityRadius = 350; // Inner backdrop ring, in front of the far mountains
    const solidMat = new THREE.MeshPhongMaterial({
      color: 0x030107,
      emissive: 0x0a0115,
      flatShading: true,
      shininess: 2,
    });

    const holoColors = [0x00ffff, 0xff00bb, 0x3366ff, 0x9900ff];

    // Procedurally assemble skyscrapers
    for (let i = 0; i < this.buildingsCount; i++) {
      const angle = (i / this.buildingsCount) * Math.PI * 2 + 0.15;
      // Scatter angles to bundle buildings in dense downtown blocks
      const clusteredAngle = angle + (Math.sin(i * 3.5) * 0.1);

      // Skip buildings that would block the view of the sunset / Sun in the horizon (straight back along -Z direction)
      let normalizedAngle = clusteredAngle % (Math.PI * 2);
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      const sunAngle = 1.5 * Math.PI;
      const angleDiff = Math.abs(Math.atan2(Math.sin(normalizedAngle - sunAngle), Math.cos(normalizedAngle - sunAngle)));
      if (angleDiff < 0.7) {
        // Clear sky window around the spectacular Synthwave sunset Sun!
        continue;
      }

      const dist = cityRadius + (Math.random() * 60 - 30);

      const px = Math.cos(clusteredAngle) * dist;
      const pz = Math.sin(clusteredAngle) * dist;

      const w = 15 + Math.random() * 20;
      const h = 70 + Math.random() * 110;
      const d = 15 + Math.random() * 20;

      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const bGroup = new THREE.Group();
      bGroup.position.set(px, h / 2 - 20, pz); // Set base on grid floor level

      // Solid tower core mesh
      const core = new THREE.Mesh(boxGeo, solidMat);
      bGroup.add(core);

      // Glowing hologram wireframe grid
      const color = holoColors[i % holoColors.length];
      const wireMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wire = new THREE.Mesh(boxGeo, wireMat);
      wire.scale.setScalar(1.005);
      bGroup.add(wire);

      // Add a couple of decorative neon trim accents
      if (Math.random() > 0.4) {
        const antennaGeo = new THREE.CylinderGeometry(0.2, 0.2, h * 0.2, 4);
        const antennaMat = new THREE.MeshBasicMaterial({
          color: 0xff00bb,
          transparent: true,
          opacity: 0.9,
        });
        const antenna = new THREE.Mesh(antennaGeo, antennaMat);
        antenna.position.set(0, h / 2 + (h * 0.1), 0);
        bGroup.add(antenna);
      }

      // Add incredibly spectacular procedural rotating skyline searchlights
      if (i % 3 === 0) {
        const lightColor = holoColors[(i + 1) % holoColors.length];
        const beamLength = 220 + Math.random() * 80;
        
        const beamGeo = new THREE.CylinderGeometry(0.5, 9.5, beamLength, 8, 1, true);
        beamGeo.translate(0, beamLength / 2, 0); // origin point at spotlight head base
        beamGeo.rotateX(Math.PI / 2);
        
        const beamMat = new THREE.MeshBasicMaterial({
          color: lightColor,
          transparent: true,
          opacity: 0.14,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        
        // Pivot sitting right of top skyscraper roof
        beam.position.set(0, h / 2, 0);
        beam.rotation.x = -Math.PI / 3.2 - Math.random() * 0.15; // Point skyward but tilted
        
        bGroup.add(beam);
        
        this.searchlights.push({
          mesh: beam,
          rotSpeed: 0.7 + Math.random() * 0.8,
          timeOffset: Math.random() * Math.PI * 2,
        });
      }

      this.group.add(bGroup);
    }

    // Spawn cybernetic flying traffic cars
    const carGeo = new THREE.BoxGeometry(1.5, 0.4, 0.4);
    const trafficCount = 14;

    for (let i = 0; i < trafficCount; i++) {
      const col = Math.random() > 0.5 ? 0x00ffff : 0xff33aa;
      const carMat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.9,
      });
      const carMesh = new THREE.Mesh(carGeo, carMat);

      // Direct trajectory parameters
      const sign = Math.random() > 0.5 ? 1 : -1;
      const angle = (i / trafficCount) * Math.PI * 2;
      const dist = cityRadius - 30 + Math.random() * 50;

      const carZ = Math.sin(angle) * dist;
      const startX = Math.cos(angle) * dist - 80;
      const endX = Math.cos(angle) * dist + 80;
      const carY = 15 + Math.random() * 45;

      carMesh.position.set(startX, carY, carZ);
      this.group.add(carMesh);

      this.trafficCars.push({
        mesh: carMesh,
        startX: sign > 0 ? startX : endX,
        endX: sign > 0 ? endX : startX,
        speed: 35 + Math.random() * 35,
        progress: Math.random(),
        y: carY,
        z: carZ,
        color: col,
      });
    }

    parent.add(this.group);
  }

  update(dt: number, player: PlayerState) {
    if (!player || !player.position) return;

    // Maintain stable backdrop displacement
    const factor = 0.95;
    const px = player.position.x * factor;
    const pz = player.position.z * factor;
    const py = player.position.y * factor - 10;

    this.group.position.set(px, py, pz);

    // Update traffic trails animation
    for (const car of this.trafficCars) {
      car.progress += (car.speed * dt) / Math.abs(car.endX - car.startX);
      if (car.progress >= 1.0) {
        car.progress = 0.0;
      }
      
      const currentX = THREE.MathUtils.lerp(car.startX, car.endX, car.progress);
      car.mesh.position.set(currentX, car.y, car.z);
    }

    // Sweep skyscrapers' spotlights cones majestically in the sky!
    const elapsed = Date.now() * 0.001;
    for (const light of this.searchlights) {
      light.mesh.rotation.y = elapsed * light.rotSpeed + light.timeOffset;
    }
  }
}

// --- SYSTEM 3: UNDER-TRACK NEON GRID UNDERGLOW ---
export class UnderTrackNeonSystem implements TrackSubsystem {
  private mesh: THREE.Mesh | null = null;
  private canvasTex: THREE.CanvasTexture | null = null;
  private animOffset = 0;

  constructor(private trackCurve: THREE.Curve<THREE.Vector3>, private halfWidth: number) {}

  init(parent: THREE.Object3D) {
    const segments = 250;
    const spacedPoints = this.trackCurve.getSpacedPoints(segments);

    // Generate custom canvas texture representing flowing laser wavebars
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 1024; // Tall strip for high-definition rolling wave pattern
    const ctx = canvas.getContext("2d")!;

    // Pitch black velvet backing
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 128, 1024);

    // Draw high-intensity glowing retro neon cyan stripes (very scarce layout)
    const barCount = 4; // Only 4 flowing bands per segment block!
    for (let step = 0; step < barCount; step++) {
      const y = (step / barCount) * 1024 + 100;
      
      const grad = ctx.createLinearGradient(0, y, 0, y + 16);
      grad.addColorStop(0, "rgba(0, 160, 255, 0.0)");
      grad.addColorStop(0.5, "rgba(0, 160, 255, 0.48)"); // Soft elegant cyber-light core
      grad.addColorStop(1, "rgba(0, 160, 255, 0.0)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, y, 128, 16);
    }

    this.canvasTex = new THREE.CanvasTexture(canvas);
    this.canvasTex.wrapS = THREE.RepeatWrapping;
    this.canvasTex.wrapT = THREE.RepeatWrapping;
    this.canvasTex.repeat.set(1, 4); // Spreading out the pattern repetition majorly (from 10 to 4) for high-scarcity elegance

    // Ultra glowing ribbon underlay
    const glowGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array((segments + 1) * 2 * 3);
    const uvs = new Float32Array((segments + 1) * 2 * 2);
    const indices = [];

    // Scale slightly narrower than road to peek through center, avoiding edge clipping
    const glowWidth = this.halfWidth * 0.72;

    for (let i = 0; i <= segments; i++) {
      const index = i === segments ? 0 : i;
      const p = spacedPoints[index];
      const t = i / segments;
      const tangent = this.trackCurve.getTangentAt(Math.min(t, 0.9999));
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Lower slightly (y = p.y - 0.32) underneath track bed plane
      const vIn = p.clone().add(normal.clone().multiplyScalar(-glowWidth));
      vIn.y = p.y - 0.32;
      const vOut = p.clone().add(normal.clone().multiplyScalar(glowWidth));
      vOut.y = p.y - 0.32;

      vertices[i * 6] = vIn.x;
      vertices[i * 6 + 1] = vIn.y;
      vertices[i * 6 + 2] = vIn.z;
      vertices[i * 6 + 3] = vOut.x;
      vertices[i * 6 + 4] = vOut.y;
      vertices[i * 6 + 5] = vOut.z;

      uvs[i * 4] = 0;
      uvs[i * 4 + 1] = t;
      uvs[i * 4 + 2] = 1;
      uvs[i * 4 + 3] = t;

      if (i < segments) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = (i + 1) * 2;
        const d = (i + 1) * 2 + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    glowGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    glowGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    glowGeo.setIndex(indices);
    glowGeo.computeVertexNormals();

    const glowMat = new THREE.MeshBasicMaterial({
      map: this.canvasTex,
      transparent: true,
      opacity: 0.18, // Extra dim, acts purely as simple elegant ambient downlight
      blending: THREE.AdditiveBlending, // Create intense neon atmospheric bloom
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(glowGeo, glowMat);
    parent.add(this.mesh);
  }

  update(dt: number, player: PlayerState) {
    if (this.canvasTex) {
      // Advance coordinates to create fluid ongoing forward pulse flow, slowed down majorly
      this.animOffset -= dt * 0.22;
      this.canvasTex.offset.y = this.animOffset;
    }
  }
}

// --- SYSTEM 4: HOVERING POLYHEDRONS WITH VOLUMETRIC LIGHT BEAMS ---
export class HoveringPolyhedraSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private list: {
    mesh: THREE.Group;
    lightBar: THREE.Mesh;
    baseY: number;
    bounceOffset: number;
    rotSpeed: { x: number; y: number; z: number };
  }[] = [];

  private gltfLoader = new GLTFLoader();
  private instancedMeshes: THREE.InstancedMesh[] = [];
  private gltfLoaded = false;
  private invisibleMatrix = new THREE.Matrix4().makeTranslation(0, -9999, 0);

  constructor(
    private trackCurve: THREE.Curve<THREE.Vector3>,
    private halfWidth: number,
    private useGLB: boolean = false,
    private points?: THREE.Vector3[]
  ) {}

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.list = [];
    this.instancedMeshes = [];
    this.gltfLoaded = false;

    // Distribute 12 spectacular floaters around track shoulders
    const count = 12;
    const octGeo = new THREE.OctahedronGeometry(2.2, 0); // Gem/Diamond look

    const colors = [0x00ffff, 0xff00bb, 0xffd700, 0x00ff88];

    const validTs: number[] = [];
    
    if (this.points && this.points.length >= 48) {
      const getT = (idx: number) => {
        let bestT = 0;
        let minDist = Infinity;
        const samples = 1000;
        const pt = this.points![idx];
        if (!pt) return idx / 48;
        for (let j = 0; j <= samples; j++) {
          const tVal = j / samples;
          const cp = this.trackCurve.getPointAt(tVal);
          const d = cp.distanceTo(pt);
          if (d < minDist) {
            minDist = d;
            bestT = tVal;
          }
        }
        return bestT;
      };

      const t12 = getT(12);
      const t15 = getT(15);
      const t20 = getT(20);
      const t23 = getT(23);
      const t25 = getT(25);
      const t28 = getT(28);
      const t35 = getT(35);
      const t41 = getT(41);

      const inExclusion = (t: number) => {
        // Tunnel 1/Mountain 1 (Portals/Mountains enclosing)
        if (t >= t12 - 0.005 && t <= t15 + 0.005) return true;
        // Tunnel 2/Mountain 2
        if (t >= t20 - 0.005 && t <= t23 + 0.005) return true;
        // Geyser jump mid-air gap
        if (t >= t25 - 0.005 && t <= t28 + 0.005) return true;
        // Tunnel 3/Mountain 3
        if (t >= t35 - 0.005 && t <= t41 + 0.005) return true;
        return false;
      };

      // Scan for valid t values
      const searchSteps = 300;
      for (let s = 0; s < searchSteps; s++) {
        const tVal = s / searchSteps;
        if (!inExclusion(tVal)) {
          validTs.push(tVal);
        }
      }
    }

    // Now, gather the 12 coordinates to place polyhedrons
    const placedTs: number[] = [];
    if (validTs.length >= count) {
      for (let i = 0; i < count; i++) {
        const valIdx = Math.floor((i / count) * validTs.length);
        placedTs.push(validTs[valIdx]);
      }
    } else {
      for (let i = 0; i < count; i++) {
        placedTs.push(i / count);
      }
    }

    for (let i = 0; i < count; i++) {
      const t = placedTs[i];
      const pt = this.trackCurve.getPointAt(t);
      const tangent = this.trackCurve.getTangentAt(Math.min(t, 0.9999));
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Alternate outer shoulder to frame the race view cleanly
      const side = (i % 2 === 0) ? 1 : -1;
      const shoulderPos = pt.clone().add(normal.clone().multiplyScalar(side * (this.halfWidth + 5)));
      
      const pGroup = new THREE.Group();
      const hoverHeightAboveTrack = 8.5 + Math.random() * 3.5;
      const hY = shoulderPos.y + hoverHeightAboveTrack; // Hovering nice and high relative to the track elevation!
      pGroup.position.set(shoulderPos.x, hY, shoulderPos.z);

      const themeColor = colors[i % colors.length];

      // Solid shiny gem body (Primitive fallback / low-LOD)
      const crystalMat = new THREE.MeshPhongMaterial({
        color: themeColor,
        emissive: themeColor,
        emissiveIntensity: 0.8,
        shininess: 90,
        flatShading: true,
      });
      const crystal = new THREE.Mesh(octGeo, crystalMat);
      pGroup.add(crystal);

      // Superfine wireframe crown
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
      });
      const wire = new THREE.Mesh(octGeo, wireMat);
      wire.scale.setScalar(1.025);
      pGroup.add(wire);

      // --- Volumetric Downlight Beams Pattern ---
      const beamHeight = hoverHeightAboveTrack + 1.0;
      const beamGeo = new THREE.CylinderGeometry(0.08, 1.2, beamHeight, 12, 1, true);
      beamGeo.translate(0, -beamHeight / 2, 0);

      const beamMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      pGroup.add(beam);

      this.group.add(pGroup);

      this.list.push({
        mesh: pGroup,
        lightBar: beam,
        baseY: hY,
        bounceOffset: Math.random() * Math.PI * 2,
        rotSpeed: {
          x: 0.6 + Math.random() * 0.8,
          y: 0.8 + Math.random() * 1.2,
          z: 0.3 + Math.random() * 0.5,
        },
      });
    }

    parent.add(this.group);

    if (this.useGLB) {
      // Load High-LOD GLB Spiked Spheres
      const sessionToken = Math.random();
      (parent as any)._spikedSpheresSession = sessionToken;
      this.gltfLoader.load(
        "/Meshy_AI_Cosmic_Spiked_Spheres_0607091718_texture.glb",
        (gltf) => {
          if ((parent as any)._spikedSpheresSession !== sessionToken) return;

          const sourceMeshes: THREE.Mesh[] = [];
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              sourceMeshes.push(child as THREE.Mesh);
            }
          });

          if (sourceMeshes.length === 0) return;

          this.instancedMeshes = sourceMeshes.map((mesh) => {
            const matClone = Array.isArray(mesh.material)
              ? mesh.material.map((m) => m.clone())
              : mesh.material.clone();

            const materials = Array.isArray(matClone) ? matClone : [matClone];
            materials.forEach((mat: any) => {
              if (mat) {
                if (mat.emissive) {
                  mat.emissiveIntensity = 1.8;
                  mat.emissive.setHex(0xff33bb); // Electrifying cyber-pink core
                }
              }
            });

            const instMesh = new THREE.InstancedMesh(
              mesh.geometry,
              matClone,
              this.list.length
            );
            instMesh.castShadow = true;
            instMesh.receiveShadow = true;
            instMesh.frustumCulled = false;
            parent.add(instMesh);
            return instMesh;
          });

          this.gltfLoaded = true;
        },
        undefined,
        (err) => console.error("Error loading Spiked Spheres GLB:", err)
      );
    }
  }

  update(dt: number, player: PlayerState) {
    const elapsed = Date.now() * 0.001;
    const playerPos = player.position || new THREE.Vector3(0, 0, 0);
    const lodThreshold = 350;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.list.length; i++) {
      const item = this.list[i];
      // 1. Progress floating wave bounce
      const nextY = item.baseY + Math.sin(elapsed * 2.1 + item.bounceOffset) * 0.65;
      item.mesh.position.y = nextY;

      // 2. Accumulate rotation
      item.mesh.children[0].rotation.x += item.rotSpeed.x * dt;
      item.mesh.children[0].rotation.y += item.rotSpeed.y * dt;
      item.mesh.children[1].rotation.x += item.rotSpeed.x * dt;
      item.mesh.children[1].rotation.y += item.rotSpeed.y * dt;

      // 3. Pulse downlight beam glow
      const pulseOpacity = 0.03 + Math.sin(elapsed * 4.0 + item.bounceOffset) * 0.01;
      if (item.lightBar.material instanceof THREE.Material) {
        item.lightBar.material.opacity = pulseOpacity;
      }

      const dist = playerPos.distanceTo(item.mesh.position);

      // 4. Smooth LOD and Loading Toggle
      if (this.gltfLoaded && dist < lodThreshold && this.instancedMeshes.length > 0) {
        // High LOD: Show beautiful glowing GLB spiked sphere, hide simple procedural crystal
        item.mesh.children[0].visible = false;
        item.mesh.children[1].visible = false;

        dummy.position.copy(item.mesh.position);
        dummy.rotation.copy(item.mesh.children[0].rotation); // align spin
        dummy.scale.setScalar(1.5); // Majestic size presence
        dummy.updateMatrix();

        for (let m = 0; m < this.instancedMeshes.length; m++) {
          this.instancedMeshes[m].setMatrixAt(i, dummy.matrix);
        }
      } else {
        // Low LOD / Placeholder: Show procedural crystal
        item.mesh.children[0].visible = true;
        item.mesh.children[1].visible = true;

        if (this.gltfLoaded) {
          for (let m = 0; m < this.instancedMeshes.length; m++) {
            this.instancedMeshes[m].setMatrixAt(i, this.invisibleMatrix);
          }
        }
      }
    }

    if (this.gltfLoaded) {
      for (const instMesh of this.instancedMeshes) {
        instMesh.instanceMatrix.needsUpdate = true;
        if (instMesh.computeBoundingSphere) {
          instMesh.computeBoundingSphere();
        }
      }
    }
  }
}

// --- SYSTEM 5: NEON SPECTATOR PROGRESS GATES ---
export class NeonSpectatorGatesSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private list: {
    gateGroup: THREE.Group;
    proceduralArch: THREE.Group;
    signMesh: THREE.Mesh;
    lightMaterials: THREE.MeshBasicMaterial[];
    laserCurtain: THREE.Mesh;
    flashTimer: number;
    index: number;
  }[] = [];

  private gateLoader = new GLTFLoader();
  private gateInstMeshes: THREE.InstancedMesh[] = [];
  private gateLoaded = false;
  private invisibleMatrix = new THREE.Matrix4().makeTranslation(0, -9999, 0);

  constructor(
    private trackCurve: THREE.Curve<THREE.Vector3>,
    private halfWidth: number,
    private useGLB: boolean = false
  ) {}

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.list = [];
    this.gateInstMeshes = [];
    this.gateLoaded = false;

    // Distribute 4 milestone progress gates around course loops:
    // Gate 0 (Start Line), Gate 1 (Corner 1), Gate 2 (Middle Strip), Gate 3 (Bend 3)
    const gateOffsets = [0.0, 0.25, 0.5, 0.75];
    const gateNames = ["FINISH", "STAGE 1", "SPEED ZONE", "STAGE 2"];
    const gateColors = [0xff00bb, 0x00ffff, 0xffd700, 0x00ffcc];

    for (let g = 0; g < gateOffsets.length; g++) {
      const t = gateOffsets[g];
      const pt = this.trackCurve.getPointAt(t);
      const tangent = this.trackCurve.getTangentAt(Math.min(t, 0.9999));

      const gatePos = pt.clone();
      
      const gateGroup = new THREE.Group();
      gateGroup.position.copy(gatePos);
      
      // Face progression angle heading
      const angleY = Math.atan2(tangent.x, tangent.z);
      gateGroup.rotation.y = angleY;

      const span = this.halfWidth * 2.2;
      const height = 15;
      const themeColor = gateColors[g];

      const pillarMat = new THREE.MeshPhongMaterial({
        color: 0x110226,
        emissive: 0x0c011e,
        flatShading: true,
      });

      const neonStripMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        toneMapped: false,
      });

      const neonTubeMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        toneMapped: false,
      });

      // Always create the procedural checkpoint arches as a fallback
      const proceduralArch = new THREE.Group();

      // --- Left Pillar: Ladder Truss Design ---
      const pillarGroupLeft = new THREE.Group();
      pillarGroupLeft.position.set(-span / 2, 0, 0);

      const trussCylGeo = new THREE.CylinderGeometry(0.3, 0.3, height, 6);
      const postL1 = new THREE.Mesh(trussCylGeo, pillarMat);
      postL1.position.set(-0.6, height / 2, 0);
      pillarGroupLeft.add(postL1);

      const postL2 = new THREE.Mesh(trussCylGeo, pillarMat);
      postL2.position.set(0.6, height / 2, 0);
      pillarGroupLeft.add(postL2);

      // Horizontal and diagonal truss struts
      const strutGeo = new THREE.BoxGeometry(1.2, 0.15, 0.15);
      for (let sy = 1.5; sy < height - 1; sy += 2.0) {
        const strut = new THREE.Mesh(strutGeo, pillarMat);
        strut.position.set(0, sy, 0);
        pillarGroupLeft.add(strut);

        const diagStrut = new THREE.Mesh(strutGeo, pillarMat);
        diagStrut.position.set(0, sy + 1.0, 0);
        diagStrut.rotation.z = Math.PI / 4;
        pillarGroupLeft.add(diagStrut);
      }
      proceduralArch.add(pillarGroupLeft);

      // --- Right Pillar: Ladder Truss Design ---
      const pillarGroupRight = new THREE.Group();
      pillarGroupRight.position.set(span / 2, 0, 0);

      const postR1 = new THREE.Mesh(trussCylGeo, pillarMat);
      postR1.position.set(-0.6, height / 2, 0);
      pillarGroupRight.add(postR1);

      const postR2 = new THREE.Mesh(trussCylGeo, pillarMat);
      postR2.position.set(0.6, height / 2, 0);
      pillarGroupRight.add(postR2);

      for (let sy = 1.5; sy < height - 1; sy += 2.0) {
        const strut = new THREE.Mesh(strutGeo, pillarMat);
        strut.position.set(0, sy, 0);
        pillarGroupRight.add(strut);

        const diagStrut = new THREE.Mesh(strutGeo, pillarMat);
        diagStrut.position.set(0, sy + 1.0, 0);
        diagStrut.rotation.z = -Math.PI / 4;
        pillarGroupRight.add(diagStrut);
      }
      proceduralArch.add(pillarGroupRight);

      // Neon glowing ribbons wrapping around the entire pillar truss assemblies
      const wrapGeo = new THREE.TorusGeometry(1.4, 0.12, 6, 12);
      
      for (let y = 1.5; y < height; y += 3.5) {
        const leftWrap = new THREE.Mesh(wrapGeo, neonStripMat);
        leftWrap.position.set(-span / 2, y, 0);
        leftWrap.rotation.x = Math.PI / 2;
        proceduralArch.add(leftWrap);

        const rightWrap = new THREE.Mesh(wrapGeo, neonStripMat);
        rightWrap.position.set(span / 2, y, 0);
        rightWrap.rotation.x = Math.PI / 2;
        proceduralArch.add(rightWrap);
      }

      // --- Top Crossbar Overhang ---
      const barGeo = new THREE.BoxGeometry(span + 4.0, 1.4, 1.4);
      const crossbar = new THREE.Mesh(barGeo, pillarMat);
      crossbar.position.set(0, height, 0);
      proceduralArch.add(crossbar);

      // Red flashing safety beacon lights on wing tips
      const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const beaconMatLeft = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
      const beaconMatRight = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
      
      const beaconLeft = new THREE.Mesh(beaconGeo, beaconMatLeft);
      beaconLeft.position.set(-(span + 4.0) / 2 + 0.4, height + 0.8, 0);
      proceduralArch.add(beaconLeft);

      const beaconRight = new THREE.Mesh(beaconGeo, beaconMatRight);
      beaconRight.position.set((span + 4.0) / 2 - 0.4, height + 0.8, 0);
      proceduralArch.add(beaconRight);

      // Dynamic marquee neon tubes under crossbar gantry
      const tubeGeo = new THREE.CylinderGeometry(0.12, 0.12, span - 2.0, 8);
      tubeGeo.rotateZ(Math.PI / 2);
      
      const tubeFront = new THREE.Mesh(tubeGeo, neonTubeMat);
      tubeFront.position.set(0, height - 1.2, 0.8);
      proceduralArch.add(tubeFront);

      const tubeBack = new THREE.Mesh(tubeGeo, neonTubeMat);
      tubeBack.position.set(0, height - 1.2, -0.8);
      proceduralArch.add(tubeBack);

      // --- Dynamic scanning laser sheet curtain ---
      const laserGeo = new THREE.PlaneGeometry(span - 2.0, 0.8);
      laserGeo.rotateX(-Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: themeColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const laserCurtain = new THREE.Mesh(laserGeo, laserMat);
      laserCurtain.position.set(0, height - 2.0, 0);
      proceduralArch.add(laserCurtain);

      gateGroup.add(proceduralArch);

      // Display sign panel centered in top arch (floats beautifully above GLB or procedural gantry)
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 512;
      signCanvas.height = 128;
      const signCtx = signCanvas.getContext("2d")!;

      signCtx.fillStyle = "#0a0418";
      signCtx.fillRect(0, 0, 512, 128);

      // Bright double glowing bounding borders
      signCtx.strokeStyle = g % 2 === 0 ? "#ff00bb" : "#00ffff";
      signCtx.lineWidth = 6;
      signCtx.strokeRect(8, 8, 512 - 16, 128 - 16);

      // Draw text
      signCtx.fillStyle = "#ffffff";
      signCtx.font = "italic bold 44px 'Courier New', monospace";
      signCtx.textAlign = "center";
      signCtx.textBaseline = "middle";
      signCtx.shadowColor = g % 2 === 0 ? "#ff00bb" : "#00ffff";
      signCtx.shadowBlur = 12;
      signCtx.fillText(gateNames[g], 256, 64);

      const signTex = new THREE.CanvasTexture(signCanvas);
      const signMat = new THREE.MeshBasicMaterial({
        map: signTex,
        side: THREE.DoubleSide,
      });

      const signMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 0.4), signMat);
      // Adjust sign mesh location slightly based on active visualization
      signMesh.position.set(0, this.useGLB ? 17.5 : 15.0, 0.4);
      gateGroup.add(signMesh);

      this.group.add(gateGroup);

      this.list.push({
        gateGroup,
        proceduralArch,
        signMesh,
        lightMaterials: [neonStripMat, neonTubeMat],
        laserCurtain,
        flashTimer: 0,
        index: g,
      });
    }

    parent.add(this.group);

    if (this.useGLB) {
      // Initialize the GLB Futuristic Neon Gate
      const sessionToken = Math.random();
      (parent as any)._neonGateSession = sessionToken;
      this.gateLoader.load(
        "/Meshy_AI_Futuristic_Neon_Gate_0610201353_texture.glb",
        (gltf) => {
          if ((parent as any)._neonGateSession !== sessionToken) return;

          const sourceMeshes: THREE.Mesh[] = [];
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              sourceMeshes.push(child as THREE.Mesh);
            }
          });

          if (sourceMeshes.length === 0) return;

          this.gateInstMeshes = sourceMeshes.map((mesh) => {
            const matClone = Array.isArray(mesh.material)
              ? mesh.material.map((m) => m.clone())
              : mesh.material.clone();

            // Setup emissive cyberpunk color tones on the 3D gate!
            const materials = Array.isArray(matClone) ? matClone : [matClone];
            materials.forEach((mat: any) => {
              if (mat) {
                if (mat.emissive) {
                  mat.emissiveIntensity = 2.4;
                  mat.emissive.setHex(0x00ffff); // electric glow
                }
              }
            });

            const instMesh = new THREE.InstancedMesh(
              mesh.geometry,
              matClone,
              this.list.length
            );
            instMesh.castShadow = true;
            instMesh.receiveShadow = true;
            instMesh.frustumCulled = false;
            parent.add(instMesh);
            return instMesh;
          });

          this.gateLoaded = true;
        },
        undefined,
        (err) => {
          // Handle block load errors gracefully to avoid console noise or disruptive UI crashes
          console.warn("Futuristic Neon Gate GLB resource not found or unavailable, falling back to procedural neon checkpoint gates.");
        }
      );
    }
  }

  update(dt: number, player: PlayerState) {
    const playerPos = player.position || new THREE.Vector3(0, 0, 0);
    const lodThreshold = 800; // Generous viewing distance
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.list.length; i++) {
      const item = this.list[i];
      item.flashTimer += dt;
      const isGlowing = Math.floor(item.flashTimer * 6) % 3 !== 0;

      // Rhythmic sequential flashing for retro stage visual feel
      for (const mat of item.lightMaterials) {
        if (isGlowing) {
          mat.color.setHex(item.index % 2 === 0 ? 0xff00bb : 0x00ffff);
        } else {
          mat.color.setHex(0x1a052e);
        }
      }

      // Slide laser scanning curtain up and down!
      if (item.laserCurtain) {
        const heightRange = 13.5;
        const laserY = 0.5 + (Math.sin(item.flashTimer * 2.5) * 0.5 + 0.5) * heightRange;
        item.laserCurtain.position.y = laserY;

        if (!Array.isArray(item.laserCurtain.material)) {
          item.laserCurtain.material.opacity = 0.25 + Math.abs(Math.cos(item.flashTimer * 4.0)) * 0.25;
        }
      }

      // Flash safety wing beacon sphere lights!
      const isBeaconOn = Math.floor(item.flashTimer * 8.0) % 2 === 0;
      const children = item.proceduralArch.children;
      for (const child of children) {
        if ((child as any).geometry instanceof THREE.SphereGeometry) {
          const mat = (child as THREE.Mesh).material;
          if (mat instanceof THREE.MeshBasicMaterial) {
            mat.color.setHex(isBeaconOn ? 0xff0000 : 0x220000);
          }
        }
      }

      // Check distance to center gate to perform premium LOD toggles
      const dist = playerPos.distanceTo(item.gateGroup.position);
      item.gateGroup.updateMatrixWorld(true);

      if (this.gateLoaded && dist < lodThreshold && this.gateInstMeshes.length > 0) {
        // High LOD: Align GLB gate centered perfectly over the gate position
        const span = this.halfWidth * 2.2;
        dummy.position.set(0, 0, 0); // Grounded bottom-center
        dummy.rotation.set(0, 0, 0);
        
        // Scale proportionally to span the track beautiful width
        dummy.scale.set(span * 0.43, span * 0.43, span * 0.43);
        dummy.updateMatrix();

        // Premultiply by parent gateGroup worldmatrix to transform to worldspace coordinate perfectly
        dummy.matrix.premultiply(item.gateGroup.matrixWorld);

        for (let m = 0; m < this.gateInstMeshes.length; m++) {
          this.gateInstMeshes[m].setMatrixAt(i, dummy.matrix);
        }

        // Hide procedural fallback since GLB is loaded and within range
        item.proceduralArch.visible = false;
        // Float the text panel slightly higher for the loaded gate
        item.signMesh.position.y = 17.5;
      } else {
        // Low LOD or fallback: hide GLB mesh and show procedural neon arch instead
        if (this.gateLoaded) {
          for (let m = 0; m < this.gateInstMeshes.length; m++) {
            this.gateInstMeshes[m].setMatrixAt(i, this.invisibleMatrix);
          }
        }
        item.proceduralArch.visible = true;
        item.signMesh.position.y = 15.0;
      }
    }

    if (this.gateLoaded) {
      for (const instMesh of this.gateInstMeshes) {
        instMesh.instanceMatrix.needsUpdate = true;
        if (instMesh.computeBoundingSphere) {
          instMesh.computeBoundingSphere();
        }
      }
    }
  }
}

// --- SYSTEM 6: SPECTACULAR ANIMATED PLASMA NEON-GEYSER ---
export class NeonGeyserSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  constructor(private customPos?: THREE.Vector3) {}
  private plumes: THREE.Mesh[] = [];
  private particles: {
    mesh: THREE.Mesh;
    speedY: number;
    rotationSpeed: THREE.Vector3;
    baseOffset: THREE.Vector3;
    maxY: number;
  }[] = [];
  private resonanceRings: {
    group: THREE.Group;
    torusMesh: THREE.Mesh;
    accents: THREE.Mesh[];
    rotSpeed: number;
    g: number;
  }[] = [];
  private time = 0;

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.plumes = [];
    this.particles = [];
    this.resonanceRings = [];

    // Geyser core placed exactly in the middle of our launcher (Pt 25) and landing platform (Pt 28) gap
    const centerPos = this.customPos || new THREE.Vector3(80, 80, 110);
    this.group.position.copy(centerPos);

    // 1. Central high-intensity plasma core column (Cylinder)
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      wireframe: true,
      toneMapped: false,
    });
    
    const cylinderGeo = new THREE.CylinderGeometry(4.5, 7.5, 48, 8, 12, true);
    // Shift geometry center so cylinder base is centered at Y = 0
    cylinderGeo.translate(0, 24, 0);

    const mainPlume = new THREE.Mesh(cylinderGeo, plumeMat);
    this.group.add(mainPlume);
    this.plumes.push(mainPlume);

    // Secondary inner counter-rotating envelope plume (Magenta)
    const innerPlumeMat = new THREE.MeshBasicMaterial({
      color: 0xff00bb,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
      toneMapped: false,
    });
    const innerCylinderGeo = new THREE.CylinderGeometry(2.5, 4.5, 45, 6, 10, true);
    innerCylinderGeo.translate(0, 22.5, 0);
    const innerPlume = new THREE.Mesh(innerCylinderGeo, innerPlumeMat);
    this.group.add(innerPlume);
    this.plumes.push(innerPlume);

    // 2. Translucent liquid base hub (glowing neon plasma pool ring)
    const ringGeo = new THREE.TorusGeometry(8.5, 0.8, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      toneMapped: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(ring);

    // 3. Dynamic Rising Plasma Sparks / Vent Particles
    const bubbleGeo = new THREE.IcosahedronGeometry(0.75, 0); // Low poly spheres
    const bubbleMat1 = new THREE.MeshBasicMaterial({ color: 0x00ffff, toneMapped: false, transparent: true, opacity: 0.9 });
    const bubbleMat2 = new THREE.MeshBasicMaterial({ color: 0xff00bb, toneMapped: false, transparent: true, opacity: 0.9 });

    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const mat = i % 2 === 0 ? bubbleMat1 : bubbleMat2;
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      
      const speedY = 18.0 + Math.random() * 22.0; // Rapid high-impulse shot velocity
      const maxRangeY = 40.0 + Math.random() * 12.0; // Dissolves above track height
      
      const horizontalSpread = 2.5 + Math.random() * 3.5;
      const tAngle = Math.random() * Math.PI * 2;
      const baseOffset = new THREE.Vector3(
        Math.cos(tAngle) * horizontalSpread,
        Math.random() * 8.0, // Stagger starting heights
        Math.sin(tAngle) * horizontalSpread
      );

      mesh.position.copy(baseOffset);
      
      const scale = 0.5 + Math.random() * 1.5;
      mesh.scale.setScalar(scale);

      this.group.add(mesh);
      this.particles.push({
        mesh,
        speedY,
        rotationSpeed: new THREE.Vector3(
          Math.random() * 4,
          Math.random() * 4,
          Math.random() * 4
        ),
        baseOffset,
        maxY: maxRangeY,
      });
    }

    // 4. Cyber Resonance Accelerator Rings over the climbing canyon gap
    // Space the rings relative to the geyser center (80, 80, 110)
    const ringPositions = [
      new THREE.Vector3(-25, 55, 0),  // Pt 26 approximation local pos
      new THREE.Vector3(0, 47, 0),    // center local pos
      new THREE.Vector3(25, 38, 0),   // Pt 27 approximation local pos
    ];
    const ringColors = [0x00ffff, 0xff00bb, 0x00ffff];

    const ringTorusGeo = new THREE.TorusGeometry(8.0, 0.4, 8, 32);
    // Rotate so they face along the X axis (the direction of jump flight)
    ringTorusGeo.rotateY(Math.PI / 2);

    for (let r = 0; r < ringPositions.length; r++) {
      const ringGroup = new THREE.Group();
      ringGroup.position.copy(ringPositions[r]);

      // Torus basic body
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[r],
        toneMapped: false,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const torusMesh = new THREE.Mesh(ringTorusGeo, ringMat);
      ringGroup.add(torusMesh);

      // Rotating inner neon shards
      const octaGeo = new THREE.IcosahedronGeometry(0.8, 0);
      const accentMat = new THREE.MeshBasicMaterial({
        color: ringColors[r] === 0x00ffff ? 0xff00bb : 0x00ffff,
        toneMapped: false,
      });

      const numAccents = 4;
      const accents: THREE.Mesh[] = [];
      for (let j = 0; j < numAccents; j++) {
        const acc = new THREE.Mesh(octaGeo, accentMat);
        const angle = (j / numAccents) * Math.PI * 2;
        acc.position.set(0, Math.cos(angle) * 8.0, Math.sin(angle) * 8.0);
        ringGroup.add(acc);
        accents.push(acc);
      }

      this.group.add(ringGroup);
      this.resonanceRings.push({
        group: ringGroup,
        torusMesh,
        accents,
        rotSpeed: 1.2 + r * 0.4,
        g: r,
      });
    }

    parent.add(this.group);
  }

  update(dt: number, player: PlayerState) {
    this.time += dt;

    // Counter-rotate the concentric geyser plumes & add pulsating expansion
    if (this.plumes.length >= 2) {
      // Main plume rotate right, pulsating expand
      this.plumes[0].rotation.y = this.time * 0.45;
      const pulse1 = 1.0 + Math.sin(this.time * 4) * 0.08;
      this.plumes[0].scale.set(pulse1, 1, pulse1);

      // Inner plume rotate left, different rate
      this.plumes[1].rotation.y = -this.time * 0.75;
      const pulse2 = 1.0 + Math.cos(this.time * 5.2) * 0.12;
      this.plumes[1].scale.set(pulse2, 1, pulse2);
    }

    // Update floating/surging particles
    for (const p of this.particles) {
      // Rise up rapidly
      p.mesh.position.y += p.speedY * dt;

      // Twist and roll for dynamic organic feel
      p.mesh.rotation.x += p.rotationSpeed.x * dt;
      p.mesh.rotation.y += p.rotationSpeed.y * dt;
      p.mesh.rotation.z += p.rotationSpeed.z * dt;

      // Soft opacity fade-out as it rises high towards peak gravity height
      const progress = p.mesh.position.y / p.maxY;
      if (Array.isArray(p.mesh.material)) {
        // Multi-material fallback
      } else {
        p.mesh.material.opacity = THREE.MathUtils.clamp(1.0 - progress, 0.0, 1.0);
      }

      // Shrink size near peak
      const sizeScale = (1.0 - progress * 0.5);
      p.mesh.scale.setScalar(sizeScale * (0.5 + (p.speedY / 30.0)));

      // Loop recycle back to fountain bottom throat
      if (p.mesh.position.y > p.maxY) {
        p.mesh.position.copy(p.baseOffset);
        p.mesh.position.y = 0; // reset to pool surface height
      }
    }

    // Rotate and throb resonance booster rings
    for (const ring of this.resonanceRings) {
      ring.group.rotation.x = this.time * ring.rotSpeed;

      const pulseScale = 1.0 + Math.sin(this.time * 3.5 + ring.g) * 0.08;
      ring.group.scale.set(pulseScale, pulseScale, pulseScale);

      for (let j = 0; j < ring.accents.length; j++) {
        ring.accents[j].rotation.y += dt * (2.0 + j * 0.5);
        ring.accents[j].rotation.z += dt * (1.5 - j * 0.3);
      }
    }
  }
}

// --- SYSTEM 7: ROAD SIDE BARRIERS LOD SYSTEM ---
export class RoadBarriersLODSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private leftPlaceholderMeshes!: THREE.InstancedMesh;
  private rightPlaceholderMeshes!: THREE.InstancedMesh;

  private leftGLBInstMeshes: THREE.InstancedMesh[] = [];
  private rightGLBInstMeshes: THREE.InstancedMesh[] = [];
  private leftGLBLoaded = false;
  private rightGLBLoaded = false;

  private leftMatrices: THREE.Matrix4[] = [];
  private rightMatrices: THREE.Matrix4[] = [];
  private barrierPositionsLeft: THREE.Vector3[] = [];
  private barrierPositionsRight: THREE.Vector3[] = [];

  private leftLODState: number[] = []; // -1: uninitialized, 0: placeholder, 1: high LOD GLB
  private rightLODState: number[] = [];

  private gltfLoader = new GLTFLoader();
  private invisibleMatrix = new THREE.Matrix4().makeTranslation(0, -9999, 0);
  private updateFrameCounter = 0;

  constructor(
    private trackCurve: THREE.Curve<THREE.Vector3>,
    private halfWidth: number,
    private points: THREE.Vector3[],
    private useGLB: boolean = false
  ) {}

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.leftGLBInstMeshes = [];
    this.rightGLBInstMeshes = [];
    this.leftGLBLoaded = false;
    this.rightGLBLoaded = false;
    this.leftLODState = [];
    this.rightLODState = [];

    const segments = 120;
    const spacedPoints = this.trackCurve.getSpacedPoints(segments);
    const upVector = new THREE.Vector3(0, 1, 0);

    const barrierGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.6, 6);
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, toneMapped: false });
    const magentaMat = new THREE.MeshBasicMaterial({ color: 0xff00bb, toneMapped: false });

    this.leftPlaceholderMeshes = new THREE.InstancedMesh(barrierGeo, cyanMat, segments + 1);
    this.rightPlaceholderMeshes = new THREE.InstancedMesh(barrierGeo, magentaMat, segments + 1);

    const dummy = new THREE.Object3D();

    this.leftMatrices = [];
    this.rightMatrices = [];
    this.barrierPositionsLeft = [];
    this.barrierPositionsRight = [];

    const findTForPoint = (pt: THREE.Vector3): number => {
      let bestT = 0;
      let minDist = Infinity;
      const samples = 1000;
      for (let j = 0; j <= samples; j++) {
        const tVal = j / samples;
        const cp = this.trackCurve.getPointAt(tVal);
        const d = cp.distanceTo(pt);
        if (d < minDist) {
          minDist = d;
          bestT = tVal;
        }
      }
      return bestT;
    };

    const pStartGap = this.points[25];
    const pEndGap = this.points[28];
    const tStartGap = findTForPoint(pStartGap);
    const tEndGap = findTForPoint(pEndGap);

    for (let i = 0; i <= segments; i++) {
      const index = i === segments ? 0 : i;
      const p = spacedPoints[index];
      const t = i / segments;

      const inGap = (t >= tStartGap - 0.001 && t <= tEndGap + 0.001);

      if (inGap) {
        this.leftPlaceholderMeshes.setMatrixAt(i, this.invisibleMatrix);
        this.rightPlaceholderMeshes.setMatrixAt(i, this.invisibleMatrix);
        
        this.leftMatrices.push(this.invisibleMatrix.clone());
        this.rightMatrices.push(this.invisibleMatrix.clone());
        this.barrierPositionsLeft.push(new THREE.Vector3(0, -9999, 0));
        this.barrierPositionsRight.push(new THREE.Vector3(0, -9999, 0));
        continue;
      }

      const tangent = this.trackCurve.getTangentAt(Math.min(t, 0.9999));
      const normal = new THREE.Vector3().crossVectors(tangent, upVector).normalize();
      const barrierQuat = new THREE.Quaternion().setFromUnitVectors(upVector, tangent);

      // Left Barrier Placement
      const posL = p.clone().add(normal.clone().multiplyScalar(this.halfWidth + 0.35));
      dummy.position.copy(posL);
      dummy.quaternion.copy(barrierQuat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      
      this.leftPlaceholderMeshes.setMatrixAt(i, dummy.matrix);
      this.leftMatrices.push(dummy.matrix.clone());
      this.barrierPositionsLeft.push(posL);

      // Right Barrier Placement
      const posR = p.clone().add(normal.clone().multiplyScalar(-this.halfWidth - 0.35));
      dummy.position.copy(posR);
      dummy.quaternion.copy(barrierQuat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      this.rightPlaceholderMeshes.setMatrixAt(i, dummy.matrix);
      this.rightMatrices.push(dummy.matrix.clone());
      this.barrierPositionsRight.push(posR);
    }

    this.leftPlaceholderMeshes.instanceMatrix.needsUpdate = true;
    this.rightPlaceholderMeshes.instanceMatrix.needsUpdate = true;

    this.group.add(this.leftPlaceholderMeshes);
    this.group.add(this.rightPlaceholderMeshes);
    parent.add(this.group);

    const sessionToken = Math.random();
    (parent as any)._barriersSession = sessionToken;

    if (this.useGLB) {
      // Load Left Barriers (Star Riders)
      this.gltfLoader.load(
        "/Meshy_AI_Star_Riders_0610201432_texture.glb",
        (gltf) => {
          if ((parent as any)._barriersSession !== sessionToken) return;

          const sourceMeshes: THREE.Mesh[] = [];
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              sourceMeshes.push(child as THREE.Mesh);
            }
          });

          if (sourceMeshes.length === 0) return;

          this.leftGLBInstMeshes = sourceMeshes.map((mesh) => {
            const matClone = Array.isArray(mesh.material)
              ? mesh.material.map((m) => m.clone())
              : mesh.material.clone();

            const materials = Array.isArray(matClone) ? matClone : [matClone];
            materials.forEach((mat: any) => {
              if (mat) {
                if (mat.emissive) {
                  mat.emissiveIntensity = 2.0;
                  mat.emissive.setHex(0x00ffff); // Electric blue
                }
              }
            });

            const instMesh = new THREE.InstancedMesh(
              mesh.geometry,
              matClone,
              segments + 1
            );
            instMesh.castShadow = true;
            instMesh.receiveShadow = true;
            instMesh.frustumCulled = false;
            parent.add(instMesh);
            return instMesh;
          });

          this.leftGLBLoaded = true;
        },
        undefined,
        (err) => console.error("Error loading Left barrier GLB:", err)
      );

      // Load Right Barriers (Neon Line on Concrete)
      this.gltfLoader.load(
        "/Meshy_AI_Neon_Line_on_Concrete_0610201445_texture.glb",
        (gltf) => {
          if ((parent as any)._barriersSession !== sessionToken) return;

          const sourceMeshes: THREE.Mesh[] = [];
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              sourceMeshes.push(child as THREE.Mesh);
            }
          });

          if (sourceMeshes.length === 0) return;

          this.rightGLBInstMeshes = sourceMeshes.map((mesh) => {
            const matClone = Array.isArray(mesh.material)
              ? mesh.material.map((m) => m.clone())
              : mesh.material.clone();

            const materials = Array.isArray(matClone) ? matClone : [matClone];
            materials.forEach((mat: any) => {
              if (mat) {
                if (mat.emissive) {
                  mat.emissiveIntensity = 2.0;
                  mat.emissive.setHex(0xff00bb); // Hot magenta
                }
              }
            });

            const instMesh = new THREE.InstancedMesh(
              mesh.geometry,
              matClone,
              segments + 1
            );
            instMesh.castShadow = true;
            instMesh.receiveShadow = true;
            instMesh.frustumCulled = false;
            parent.add(instMesh);
            return instMesh;
          });

          this.rightGLBLoaded = true;
        },
        undefined,
        (err) => console.error("Error loading Right barrier GLB:", err)
      );
    }
  }

  update(dt: number, player: PlayerState) {
    this.updateFrameCounter++;
    // Only run expensive LOD distance calculations every 4th frame to reduce CPU calculations substantially during racing. This drastically boosts FPS!
    if (this.updateFrameCounter % 4 !== 0 && this.leftLODState.length > 0) {
      return;
    }

    const playerPos = player.position || new THREE.Vector3(0, 0, 0);
    const lodThreshold = 100; // Efficient distance for barriers to display full GLB asset

    const segments = 120;
    const dummy = new THREE.Object3D();

    const extraRotationLeft = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    const extraRotationRight = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, Math.PI, 0));

    // Initialize arrays if they are empty
    if (this.leftLODState.length === 0) {
      this.leftLODState = new Array(segments + 1).fill(-1);
    }
    if (this.rightLODState.length === 0) {
      this.rightLODState = new Array(segments + 1).fill(-1);
    }

    let leftNeedsUpdate = false;
    let rightNeedsUpdate = false;

    const hasLeftMesh = this.leftGLBLoaded && this.leftGLBInstMeshes.length > 0;
    const hasRightMesh = this.rightGLBLoaded && this.rightGLBInstMeshes.length > 0;

    for (let i = 0; i <= segments; i++) {
      // Left Barrier Placement Handling
      const posL = this.barrierPositionsLeft[i];
      if (posL.y > -9000) { // Gap bypass check
        const distL = playerPos.distanceTo(posL);
        const targetLOD = (hasLeftMesh && distL < lodThreshold) ? 1 : 0;

        if (this.leftLODState[i] !== targetLOD) {
          this.leftLODState[i] = targetLOD;
          leftNeedsUpdate = true;

          if (targetLOD === 1) {
            // Transition to High LOD (GLB Model)
            this.leftPlaceholderMeshes.setMatrixAt(i, this.invisibleMatrix);

            dummy.position.copy(posL);
            dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().extractRotation(this.leftMatrices[i]));
            dummy.quaternion.multiply(extraRotationLeft);
            dummy.scale.set(1.4, 2.5, 1.6);
            dummy.updateMatrix();

            for (let m = 0; m < this.leftGLBInstMeshes.length; m++) {
              this.leftGLBInstMeshes[m].setMatrixAt(i, dummy.matrix);
            }
          } else {
            // Transition to Low LOD (Placeholder Cylinders)
            this.leftPlaceholderMeshes.setMatrixAt(i, this.leftMatrices[i]);

            if (hasLeftMesh) {
              for (let m = 0; m < this.leftGLBInstMeshes.length; m++) {
                this.leftGLBInstMeshes[m].setMatrixAt(i, this.invisibleMatrix);
              }
            }
          }
        }
      }

      // Right Barrier Placement Handling
      const posR = this.barrierPositionsRight[i];
      if (posR.y > -9000) {
        const distR = playerPos.distanceTo(posR);
        const targetLOD = (hasRightMesh && distR < lodThreshold) ? 1 : 0;

        if (this.rightLODState[i] !== targetLOD) {
          this.rightLODState[i] = targetLOD;
          rightNeedsUpdate = true;

          if (targetLOD === 1) {
            // Transition to High LOD (GLB Model)
            this.rightPlaceholderMeshes.setMatrixAt(i, this.invisibleMatrix);

            dummy.position.copy(posR);
            dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().extractRotation(this.rightMatrices[i]));
            dummy.quaternion.multiply(extraRotationRight);
            dummy.scale.set(1.4, 2.5, 1.6);
            dummy.updateMatrix();

            for (let m = 0; m < this.rightGLBInstMeshes.length; m++) {
              this.rightGLBInstMeshes[m].setMatrixAt(i, dummy.matrix);
            }
          } else {
            // Transition to Low LOD (Placeholder Cylinders)
            this.rightPlaceholderMeshes.setMatrixAt(i, this.rightMatrices[i]);

            if (hasRightMesh) {
              for (let m = 0; m < this.rightGLBInstMeshes.length; m++) {
                this.rightGLBInstMeshes[m].setMatrixAt(i, this.invisibleMatrix);
              }
            }
          }
        }
      }
    }

    if (leftNeedsUpdate) {
      this.leftPlaceholderMeshes.instanceMatrix.needsUpdate = true;
      if (hasLeftMesh) {
        for (const instMesh of this.leftGLBInstMeshes) {
          instMesh.instanceMatrix.needsUpdate = true;
          if (instMesh.computeBoundingSphere) {
            instMesh.computeBoundingSphere();
          }
        }
      }
    }

    if (rightNeedsUpdate) {
      this.rightPlaceholderMeshes.instanceMatrix.needsUpdate = true;
      if (hasRightMesh) {
        for (const instMesh of this.rightGLBInstMeshes) {
          instMesh.instanceMatrix.needsUpdate = true;
          if (instMesh.computeBoundingSphere) {
            instMesh.computeBoundingSphere();
          }
        }
      }
    }
  }
}

// --- SYSTEM 10: PROCEDURAL AMBIENT CRITTERS (LOW-POLY BIRDS) ---
export class AmbientCrittersSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private critters: {
    mesh: THREE.Group;
    leftWing: THREE.Group;
    rightWing: THREE.Group;
    velocity: THREE.Vector3;
    speed: number;
    baseY: number;
    wobbleOffset: number;
    flapSpeed: number;
    flapTime: number;
  }[] = [];

  private numCritters = 14;

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.critters = [];

    // Body: simple narrow 4-sided double cone/pyramid pointing forward along Z
    const bodyGeo = new THREE.ConeGeometry(0.2, 1.2, 4);
    bodyGeo.rotateX(Math.PI / 2); // point forward along Z
    
    // Wing geometry - thin flat panel
    const wingGeo = new THREE.BoxGeometry(0.9, 0.03, 0.45);
    // Shift wing vertices to slide origin to its inner edge so root rotation acts as a shoulder pivot
    wingGeo.translate(0.45, 0, 0);

    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x00ffdd, // radiant cyan/teal cyber bird body
      emissive: 0x004433,
      flatShading: true,
      shininess: 50,
    });
    const wingMat = new THREE.MeshPhongMaterial({
      color: 0xff00bb, // majestic vaporwave magenta wings
      emissive: 0x550033,
      flatShading: true,
      shininess: 40,
    });

    for (let i = 0; i < this.numCritters; i++) {
      const critterGroup = new THREE.Group();

      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      critterGroup.add(bodyMesh);

      // Left wing shoulder pivot point container
      const leftWingPivot = new THREE.Group();
      leftWingPivot.position.set(-0.12, 0, 0);
      const leftWingMesh = new THREE.Mesh(wingGeo, wingMat);
      leftWingMesh.scale.set(-1, 1, 1); // mirror wing direction to represent the left wing
      leftWingPivot.add(leftWingMesh);
      critterGroup.add(leftWingPivot);

      // Right wing shoulder pivot point container
      const rightWingPivot = new THREE.Group();
      rightWingPivot.position.set(0.12, 0, 0);
      const rightWingMesh = new THREE.Mesh(wingGeo, wingMat);
      rightWingPivot.add(rightWingMesh);
      critterGroup.add(rightWingPivot);

      // Scatter in a wide circle around the course's origin
      const angle = Math.random() * Math.PI * 2;
      const dist = 140 + Math.random() * 220;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = 80 + Math.random() * 90; // Fly beautifully in mid-air/skyline level

      critterGroup.position.set(x, y, z);

      // Scurry movement direction
      const flightHeading = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 12; // speed in units per second
      const velocity = new THREE.Vector3(
        Math.cos(flightHeading) * speed,
        0,
        Math.sin(flightHeading) * speed
      );

      // Align heading rotation
      critterGroup.rotation.y = -flightHeading + Math.PI;

      // Diversify bird sizes for visual parallax depth
      const sizeScale = 0.6 + Math.random() * 0.8;
      critterGroup.scale.setScalar(sizeScale);

      this.group.add(critterGroup);

      this.critters.push({
        mesh: critterGroup,
        leftWing: leftWingPivot,
        rightWing: rightWingPivot,
        velocity,
        speed,
        baseY: y,
        wobbleOffset: Math.random() * 120,
        flapSpeed: 14 + Math.random() * 8, // fast flapping speeds
        flapTime: Math.random() * Math.PI * 2,
      });
    }

    parent.add(this.group);
  }

  update(dt: number, player: PlayerState) {
    if (!player || !player.position) return;

    const maxDist = 480;

    for (const c of this.critters) {
      c.flapTime += dt * c.flapSpeed;
      
      // Horizontal linear movement
      c.mesh.position.addScaledVector(c.velocity, dt);

      // Vertical sine wobble representing aerodynamic buoyancy
      const altitudeDelta = Math.sin(c.flapTime * 0.12 + c.wobbleOffset) * 6.0;
      c.mesh.position.y = c.baseY + altitudeDelta;

      // Wing flapping animation
      const wingAngle = Math.sin(c.flapTime) * 0.65 - 0.15;
      c.leftWing.rotation.z = -wingAngle;
      c.rightWing.rotation.z = wingAngle;

      // Keep bounding limits - fly back toward the track central arena center (0,0)
      const horizontalDist = Math.sqrt(
        c.mesh.position.x * c.mesh.position.x + 
        c.mesh.position.z * c.mesh.position.z
      );

      if (horizontalDist > maxDist) {
        const toCenterVec = new THREE.Vector3(-c.mesh.position.x, 0, -c.mesh.position.z).normalize();
        c.velocity.lerp(toCenterVec.multiplyScalar(c.speed), dt * 0.7);
        // Slowly update heading to face movement vector direction smoothly
        c.mesh.rotation.y = Math.atan2(c.velocity.x, c.velocity.z);
      }
    }
  }
}

// --- SYSTEM 11: PROCEDURAL NEBULA DEBRIS (GLOWING SPACE DUST) ---
export class NebulaDebrisSystem implements TrackSubsystem {
  private group: THREE.Group = new THREE.Group();
  private debris: {
    mesh: THREE.Mesh;
    angle: number;
    orbitSpeed: number;
    radius: number;
    y: number;
    spinSpeed: THREE.Vector3;
  }[] = [];

  private numDebris = 75;

  init(parent: THREE.Object3D) {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.debris = [];

    // Let's create a few different geometries to make the space debris look satisfyingly varied
    const geometries = [
      new THREE.TetrahedronGeometry(0.5, 0),
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.OctahedronGeometry(0.45, 0),
    ];

    // Gorgeous colorful glowing neon palettes matching the nebula aesthetic!
    const colors = [
      0x00ffff, // bright cyan
      0xff00bb, // vaporwave magenta
      0x8b5cf6, // neon purple
      0x06b6d4, // light teal
      0xec4899, // hot pink
    ];

    for (let i = 0; i < this.numDebris; i++) {
      const geo = geometries[Math.floor(Math.random() * geometries.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.8,
        flatShading: true,
        transparent: true,
        opacity: 0.85,
      });

      const mesh = new THREE.Mesh(geo, mat);

      const angle = Math.random() * Math.PI * 2;
      const radius = 120 + Math.random() * 220; // Orbit outside the central track
      const y = -40 + Math.random() * 110; // Varied heights to surround the space course
      
      mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      
      // Random scale for particle variety
      const scale = 0.5 + Math.random() * 1.5;
      mesh.scale.setScalar(scale);

      // Random starting rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.group.add(mesh);

      // Slow orbital flight direction (some clockwise, some counter-clockwise)
      const orbitSpeed = (0.02 + Math.random() * 0.04) * (Math.random() > 0.5 ? 1 : -1);
      
      const spinSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );

      this.debris.push({
        mesh,
        angle,
        orbitSpeed,
        radius,
        y,
        spinSpeed,
      });
    }

    parent.add(this.group);
  }

  update(dt: number, player: PlayerState) {
    if (!player) return;

    for (const d of this.debris) {
      // Advance orbit angle
      d.angle += d.orbitSpeed * dt;
      
      // Update circular orbital positions
      d.mesh.position.x = Math.cos(d.angle) * d.radius;
      d.mesh.position.z = Math.sin(d.angle) * d.radius;
      
      // Slowly spin the debris in space
      d.mesh.rotation.x += d.spinSpeed.x * dt;
      d.mesh.rotation.y += d.spinSpeed.y * dt;
      d.mesh.rotation.z += d.spinSpeed.z * dt;
    }
  }
}



