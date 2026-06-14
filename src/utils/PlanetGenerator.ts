import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fbm } from "../utils";

// Seeded PRNG (mulberry32) for reproducible planet generation
function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let seededRandom: () => number = Math.random;

export class PlanetGenerator {
  public spinningBlades: THREE.Object3D[] = [];
  public glowingWindows: THREE.Object3D[] = [];
  public bioluminescentMeshes: any[] = [];
  public waterCore!: THREE.Mesh;
  public groundGroup = new THREE.Group();
  public tilesData: any[] = [];
  public regions: any[] = [];
  public tileGroups: any[] = [];

  constructor() {}

  public generate(scene: THREE.Scene, planetRadius: number, worldSeed?: number): Promise<void> {
    // Initialize seeded RNG — same seed = same planet
    const seed = worldSeed ?? Math.floor(Math.random() * 2147483647);
    seededRandom = mulberry32(seed);
    console.log(`[PlanetGenerator] World seed: ${seed}`);
    (window as any)._worldSeed = seed;

    this.groundGroup.name = "CozyGlobeGroundGroup";

    // MANDATORY INTEGRITY WARNING:
    // DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

    // Initialize ring gates on window
    (window as any)._ringGates = [];

    // Generate 15 floating ring gates at random spherical coordinates
    const colors = [0xff33bb, 0x00ffff, 0xffff00, 0x00ff88, 0xaa33ff];
    for (let i = 0; i < 15; i++) {
      const phi = Math.acos(-1 + 2 * seededRandom());
      const theta = seededRandom() * Math.PI * 2;
      const altitude = 15.0 + seededRandom() * 20.0; // Altitude between 15.0 and 35.0
      const r = planetRadius + altitude;
      const pos = new THREE.Vector3().setFromSphericalCoords(r, phi, theta);

      const colorHex = colors[Math.floor(seededRandom() * colors.length)];
      const torusGeo = new THREE.TorusGeometry(3.2, 0.4, 8, 24);
      const torusMat = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const torusMesh = new THREE.Mesh(torusGeo, torusMat);
      torusMesh.castShadow = true;
      torusMesh.visible = false; // Hidden initially until a Golden Ring starts the slalom trial!

      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(0, 0, 0);
      group.rotateX(-Math.PI / 2);
      group.rotateY(seededRandom() * Math.PI * 2);

      group.add(torusMesh);
      this.groundGroup.add(group);

      (window as any)._ringGates.push({
        mesh: torusMesh,
        group: group,
        collected: false,
        color: colorHex
      });
    }

    // Generate 3 grand Golden Ring Gates (Time-Attack Event Starters)
    const goldPhiTheta = [
      { phi: Math.PI / 2.2, theta: 0.1 },             // Near equator, positive X
      { phi: Math.PI / 3.4, theta: Math.PI * 0.75 },   // Hemisphere high, mid-west
      { phi: Math.PI / 1.6, theta: Math.PI * 1.5 }     // Low altitude slope, south-east
    ];
    for (let i = 0; i < goldPhiTheta.length; i++) {
      const { phi, theta } = goldPhiTheta[i];
      const altitude = 22.0; // Perfect accessible altitude
      const r = planetRadius + altitude;
      const pos = new THREE.Vector3().setFromSphericalCoords(r, phi, theta);

      const colorHex = 0xffd700; // Brilliant Pure Gold
      const torusGeo = new THREE.TorusGeometry(4.6, 0.55, 12, 32);
      const torusMat = new THREE.MeshPhongMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      const torusMesh = new THREE.Mesh(torusGeo, torusMat);
      torusMesh.castShadow = true;

      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(0, 0, 0);
      group.rotateX(-Math.PI / 2);
      group.rotateY(seededRandom() * Math.PI * 2);

      group.add(torusMesh);

      // Add a rotating orbital star/crystal group
      const gemGeo = new THREE.OctahedronGeometry(0.75, 0);
      const gemMat = new THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0xff5500,
        emissiveIntensity: 2.2,
        flatShading: true
      });
      const orbitalGroup = new THREE.Group();
      const numGems = 5;
      for (let gIdx = 0; gIdx < numGems; gIdx++) {
        const gem = new THREE.Mesh(gemGeo, gemMat);
        const lAngle = (gIdx / numGems) * Math.PI * 2;
        gem.position.set(Math.cos(lAngle) * 6.2, Math.sin(lAngle) * 6.2, 0);
        orbitalGroup.add(gem);
      }
      group.add(orbitalGroup);
      this.groundGroup.add(group);

      (window as any)._ringGates.push({
        mesh: torusMesh,
        group: group,
        gemGroup: orbitalGroup,
        collected: false,
        color: colorHex,
        isGoldenTrigger: true
      });
    }

    console.log(`[PlanetGenerator] Generated ring gates. Total gates created: ${(window as any)._ringGates.length}`);

    // 1. Tile Geometry Helper
    function createTileGeometry(
      center: THREE.Vector3,
      boundaryVertices: THREE.Vector3[],
      planetRadius: number,
      displacement: number,
      insetRatio: number,
      topColor: THREE.Color,
      bottomColor: THREE.Color
    ) {
      const k = boundaryVertices.length;
      const geometry = new THREE.BufferGeometry();
      
      const positions: number[] = [];
      const colors: number[] = [];
      
      const T_c = center.clone().multiplyScalar(planetRadius + displacement);
      const topPoints: THREE.Vector3[] = [];
      const bottomPoints: THREE.Vector3[] = [];
      
      for (let j = 0; j < k; j++) {
        const P = boundaryVertices[j];
        const I = P.clone().lerp(center, insetRatio);
        
        const T_j = I.clone().multiplyScalar(planetRadius + displacement);
        topPoints.push(T_j);
        
        const B_j = I.clone().multiplyScalar(planetRadius - 2.0);
        bottomPoints.push(B_j);
      }
      
      positions.push(T_c.x, T_c.y, T_c.z);
      colors.push(topColor.r, topColor.g, topColor.b);
      
      for (let j = 0; j < k; j++) {
        positions.push(topPoints[j].x, topPoints[j].y, topPoints[j].z);
        colors.push(topColor.r * 0.85, topColor.g * 0.85, topColor.b * 0.85);
      }
      
      for (let j = 0; j < k; j++) {
        positions.push(bottomPoints[j].x, bottomPoints[j].y, bottomPoints[j].z);
        colors.push(bottomColor.r * 0.55, bottomColor.g * 0.55, bottomColor.b * 0.55);
      }
      
      const indices: number[] = [];
      
      for (let j = 0; j < k; j++) {
        const next = (j + 1) % k;
        indices.push(0, j + 1, next + 1);
      }
      
      for (let j = 0; j < k; j++) {
        const next = (j + 1) % k;
        
        const Tj_idx = 1 + j;
        const Tnext_idx = 1 + next;
        const Bj_idx = 1 + k + j;
        const Bnext_idx = 1 + k + next;
        
        indices.push(Tj_idx, Bj_idx, Bnext_idx);
        indices.push(Tj_idx, Bnext_idx, Tnext_idx);
      }
      
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      
      return geometry;
    }

    // 2. Geodesic Subdivision (level 12)
    const tempIcosa = new THREE.IcosahedronGeometry(planetRadius, 12);
    const posAttr = tempIcosa.attributes.position;
    const indexAttr = tempIcosa.index;

    const uniqueVertices: THREE.Vector3[] = [];
    const vertexMap: { [key: string]: number } = {};

    function getUniqueVertexIndex(x: number, y: number, z: number): number {
      const precision = 3;
      const key = `${x.toFixed(precision)},${y.toFixed(precision)},${z.toFixed(precision)}`;
      if (vertexMap[key] !== undefined) {
        return vertexMap[key];
      }
      const v = new THREE.Vector3(x, y, z);
      uniqueVertices.push(v);
      const idx = uniqueVertices.length - 1;
      vertexMap[key] = idx;
      return idx;
    }

    const triangles: number[][] = [];
    if (indexAttr) {
      for (let i = 0; i < indexAttr.count; i += 3) {
        const idx0 = indexAttr.getX(i);
        const idx1 = indexAttr.getX(i + 1);
        const idx2 = indexAttr.getX(i + 2);

        const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, idx0);
        const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, idx1);
        const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, idx2);

        triangles.push([
          getUniqueVertexIndex(v0.x, v0.y, v0.z),
          getUniqueVertexIndex(v1.x, v1.y, v1.z),
          getUniqueVertexIndex(v2.x, v2.y, v2.z)
        ]);
      }
    } else {
      for (let i = 0; i < posAttr.count; i += 3) {
        const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
        const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);

        triangles.push([
          getUniqueVertexIndex(v0.x, v0.y, v0.z),
          getUniqueVertexIndex(v1.x, v1.y, v1.z),
          getUniqueVertexIndex(v2.x, v2.y, v2.z)
        ]);
      }
    }

    const vertexTriangles: number[][] = Array.from({ length: uniqueVertices.length }, () => []);
    triangles.forEach((tri, triIdx) => {
      tri.forEach((uIdx) => {
        vertexTriangles[uIdx].push(triIdx);
      });
    });

    const triangleCentroids: THREE.Vector3[] = triangles.map((tri) => {
      const v0 = uniqueVertices[tri[0]];
      const v1 = uniqueVertices[tri[1]];
      const v2 = uniqueVertices[tri[2]];
      const centroid = new THREE.Vector3()
        .add(v0)
        .add(v1)
        .add(v2)
        .divideScalar(3)
        .normalize();
      return centroid;
    });

    this.tilesData = [];
    const tilesData = this.tilesData;
    for (let uIdx = 0; uIdx < uniqueVertices.length; uIdx++) {
      const centerNode = uniqueVertices[uIdx];
      const normal = centerNode.clone().normalize();

      const triIndices = vertexTriangles[uIdx];
      if (triIndices.length < 5 || triIndices.length > 6) {
        continue;
      }

      const centroids = triIndices.map((tIdx) => triangleCentroids[tIdx]);
      
      const tempVec = Math.abs(normal.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const U = new THREE.Vector3().crossVectors(normal, tempVec).normalize();
      const V = new THREE.Vector3().crossVectors(normal, U).normalize();

      const list = centroids.map((c) => {
        const offset = c.clone().sub(normal);
        const x = offset.dot(U);
        const y = offset.dot(V);
        const angle = Math.atan2(y, x);
        return { c, angle };
      });

      list.sort((a, b) => a.angle - b.angle);
      const orderedCentroids = list.map((item) => item.c.clone());
      const isPentagon = orderedCentroids.length === 5;

      const latTemp = 1.0 - Math.abs(normal.y);
      const tempNoise = fbm(normal.clone().multiplyScalar(1.5), 3) * 0.12;
      const temperature = THREE.MathUtils.clamp(latTemp + tempNoise, 0.0, 1.0);
      
      const humidityNoise = fbm(normal.clone().addScalar(15.0).multiplyScalar(2.0), 3) * 0.5 + 0.5;
      const humidity = THREE.MathUtils.clamp(humidityNoise, 0.0, 1.0);

      const elevation = fbm(normal, 4) * 5.0;

      let biome = "grass";
      let displacement = 0.3;
      let insetRatio = 0.0;
      let topColor = new THREE.Color(0x81c784);
      let bottomColor = new THREE.Color(0x5d4037);

      if (elevation < -1.1) {
        biome = "water";
        displacement = -0.5;
        topColor = new THREE.Color(0x2471a3);
        bottomColor = new THREE.Color(0x154360);
      } else if (temperature < 0.28) {
        biome = "mountain";
        displacement = 1.8;
        topColor = new THREE.Color(0xd5d8dc);
        bottomColor = new THREE.Color(0x7f8c8d);
      } else if (temperature > 0.58 && humidity < 0.36) {
        biome = "sand";
        displacement = 0.15;
        topColor = new THREE.Color(0xf5b041);
        bottomColor = new THREE.Color(0xba4a00);
      } else if (temperature > 0.48 && humidity > 0.64) {
        biome = "hill";
        displacement = 1.2;
        topColor = new THREE.Color(0x196f3d);
        bottomColor = new THREE.Color(0x4a235a);
      } else {
        biome = "grass";
        displacement = 0.4;
        topColor = new THREE.Color(0x52be80);
        bottomColor = new THREE.Color(0x5c4033);
      }

      tilesData.push({
        origIdx: uIdx,
        center: normal,
        vertices: orderedCentroids,
        isPentagon,
        biome,
        displacement,
        insetRatio,
        topColor,
        bottomColor,
      });
    }

    tempIcosa.dispose();

    const groundTileHolders: THREE.Group[] = [];

    // Water Core Mesh
    const waterCoreMat = new THREE.MeshStandardMaterial({
      color: 0x113454,
      emissive: 0x051329,
      roughness: 0.15,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85,
    });

    waterCoreMat.onBeforeCompile = (shader) => {
      shader.uniforms.time = { value: 0 };
      
      shader.vertexShader = `
        uniform float time;
        varying vec3 vCustomWorldPosition;
      ` + shader.vertexShader;
      
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vCustomWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        float wave = sin(vCustomWorldPosition.x * 0.15 + time * 1.2) * cos(vCustomWorldPosition.z * 0.15 + time * 1.2) * 0.22;
        transformed += normal * wave;
        `
      );

      shader.fragmentShader = `
        uniform float time;
        varying vec3 vCustomWorldPosition;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        vec3 wp = vCustomWorldPosition;
        float ripple1 = sin(wp.x * 1.8 + time * 2.0) * cos(wp.z * 1.8 + time * 2.0);
        float ripple2 = sin(wp.y * 3.5 - time * 2.8) * cos(wp.x * 3.5 + time * 1.8);
        float ripple3 = sin(wp.z * 7.0 + time * 4.0) * sin(wp.y * 7.0 - time * 3.5);
        
        float finalRipple = (ripple1 * 0.55 + ripple2 * 0.3 + ripple3 * 0.15) * 0.12;
        normal = normalize(normal + vec3(finalRipple, finalRipple * 0.6, finalRipple));
        `
      );

      waterCoreMat.userData.shader = shader;
    };

    this.waterCore = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius - 0.1, 48, 48),
      waterCoreMat
    );
    this.waterCore.receiveShadow = true;
    (window as any)._waterCore = this.waterCore;
    this.groundGroup.add(this.waterCore);

    tilesData.forEach((tile, uIdx) => {
      const tileGroup = new THREE.Group();
      tileGroup.name = `TileHolder_${uIdx}_${tile.isPentagon ? "Pentagon" : "Hexagon"}_${tile.biome}`;
      
      tileGroup.position.copy(tile.center.clone().multiplyScalar(planetRadius + tile.displacement));
      tileGroup.lookAt(new THREE.Vector3(0, 0, 0));
      tileGroup.rotateX(-Math.PI / 2);

      tileGroup.userData = {
        uIdx,
        origIdx: tile.origIdx,
        isPentagon: tile.isPentagon,
        biome: tile.biome,
        center: tile.center,
        displacement: tile.displacement,
        vertices: tile.vertices || [], // boundary points for exact hex edge markings in space view
        logicalRegion: null
      };

      (tileGroup as any)._biome = tile.biome;
      (tileGroup as any)._center = tile.center;

      this.groundGroup.add(tileGroup);
      groundTileHolders.push(tileGroup);
    });

    this.groundGroup.position.y = -(planetRadius + 2.5) - 0.25;
    scene.add(this.groundGroup);

    // Assign logical regions early using spherical Voronoi (evenly distributed seeds)
    const NUM_REGIONS = 9;
    const seeds = [];
    const goldenAngle = 2.399963229728653; // radians
    for (let i = 0; i < NUM_REGIONS; i++) {
      const y = 1 - (i / (NUM_REGIONS - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * goldenAngle;
      seeds.push(new THREE.Vector3(
        Math.cos(theta) * radius,
        y,
        Math.sin(theta) * radius
      ));
    }

    groundTileHolders.forEach((group, idx) => {
      const n = (group.userData.center as THREE.Vector3) || (tilesData[idx]?.center as THREE.Vector3);
      if (!n) return;
      let bestIdx = 0;
      let bestDot = -2;
      for (let s = 0; s < seeds.length; s++) {
        const d = n.dot(seeds[s]);
        if (d > bestDot) {
          bestDot = d;
          bestIdx = s;
        }
      }
      const logId = `region_${bestIdx}`;
      group.userData.logicalRegion = logId;
      group.userData.regionId = logId; // compatibility for space view picking and markings
      if (tilesData[idx]) tilesData[idx].logicalRegion = logId;
    });

    // Group into logical regions (by assigned region id)
    const regionMap = new Map();
    groundTileHolders.forEach((group, idx) => {
      const lid = group.userData.logicalRegion;
      if (!lid) return;
      if (!regionMap.has(lid)) {
        regionMap.set(lid, { id: lid, tiles: [] });
      }
      regionMap.get(lid).tiles.push({
        group,
        idx,
        biome: group.userData.biome,
        center: (group.userData.center as THREE.Vector3) || (tilesData[idx]?.center as THREE.Vector3),
        position: group.position.clone(),
        vertices: group.userData.vertices || tilesData[idx]?.vertices || [],
      });
    });

    const computedRegions = Array.from(regionMap.values());
    this.regions = computedRegions;
    (window as any)._planetRegions = computedRegions;
    (window as any)._tileGroups = groundTileHolders;

    // Build Adjacency Cache (neighbor lookup map)
    const rawNeighbors = Array.from({ length: uniqueVertices.length }, () => new Set<number>());
    triangles.forEach((tri) => {
      const [v0, v1, v2] = tri;
      rawNeighbors[v0].add(v1);
      rawNeighbors[v0].add(v2);
      rawNeighbors[v1].add(v0);
      rawNeighbors[v1].add(v2);
      rawNeighbors[v2].add(v0);
      rawNeighbors[v2].add(v1);
    });

    const origToSeq = new Map<number, number>();
    tilesData.forEach((tile, idx) => {
      if (tile.origIdx !== undefined) {
        origToSeq.set(tile.origIdx, idx);
      }
    });

    groundTileHolders.forEach((group, idx) => {
      const origIdx = group.userData.origIdx;
      if (origIdx === undefined) return;
      const rawN = rawNeighbors[origIdx];
      const seqN: number[] = [];
      rawN.forEach((nOrigIdx) => {
        const nSeqIdx = origToSeq.get(nOrigIdx);
        if (nSeqIdx !== undefined) {
          seqN.push(nSeqIdx);
        }
      });
      group.userData.neighbors = seqN;
    });

    // Elevation Smoothing Pass — average each tile's displacement with neighbors
    // to create gradual transitions instead of abrupt cliffs that cause overlap
    const smoothPasses = 2;
    for (let pass = 0; pass < smoothPasses; pass++) {
      const smoothed = tilesData.map((tile, idx) => {
        const neighbors = groundTileHolders[idx]?.userData.neighbors || [];
        if (neighbors.length === 0) return tile.displacement;

        let sum = tile.displacement;
        let count = 1;
        for (const nIdx of neighbors) {
          if (tilesData[nIdx]) {
            sum += tilesData[nIdx].displacement;
            count++;
          }
        }
        // Blend: 60% own value + 40% neighbor average (preserves biome identity)
        const neighborAvg = sum / count;
        return tile.displacement * 0.6 + neighborAvg * 0.4;
      });

      // Apply smoothed values
      smoothed.forEach((d, idx) => {
        tilesData[idx].displacement = d;
      });
    }

    // Update tile group positions with smoothed displacements
    groundTileHolders.forEach((group, idx) => {
      const tile = tilesData[idx];
      if (!tile) return;
      group.position.copy(tile.center.clone().multiplyScalar(planetRadius + tile.displacement));
      group.userData.displacement = tile.displacement;
    });

    // === Procedural Base Surface ===
    // Generate perfectly-tessellating hex/pentagon geometry from actual dual cell vertices.
    // This replaces GLTF hex models as the base surface — zero gaps, zero overlap.
    const allPositions: number[] = [];
    const allColors: number[] = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    tilesData.forEach((tile) => {
      const k = tile.vertices.length;
      if (k < 3) return;
      // Water tiles skipped — the animated water core sphere handles the ocean
      if (tile.biome === 'water') return;
      const disp = tile.displacement;
      const center = tile.center;
      const topCol = tile.topColor;
      const botCol = tile.bottomColor;

      // Center vertex (top face)
      const T_c = center.clone().multiplyScalar(planetRadius + disp);
      allPositions.push(T_c.x, T_c.y, T_c.z);
      allColors.push(topCol.r, topCol.g, topCol.b);

      // Boundary vertices — top and bottom
      for (let j = 0; j < k; j++) {
        const P = tile.vertices[j];
        // 2% inset creates subtle hex border gaps
        const I = P.clone().lerp(center, 0.03);
        const T_j = I.clone().multiplyScalar(planetRadius + disp);
        allPositions.push(T_j.x, T_j.y, T_j.z);
        allColors.push(topCol.r * 0.88, topCol.g * 0.88, topCol.b * 0.88);
      }
      for (let j = 0; j < k; j++) {
        const P = tile.vertices[j];
        const I = P.clone().lerp(center, 0.03);
        const B_j = I.clone().multiplyScalar(planetRadius - 1.2);
        allPositions.push(B_j.x, B_j.y, B_j.z);
        allColors.push(botCol.r * 0.45, botCol.g * 0.45, botCol.b * 0.45);
      }

      // Top face fan
      for (let j = 0; j < k; j++) {
        const next = (j + 1) % k;
        allIndices.push(vertexOffset, vertexOffset + 1 + j, vertexOffset + 1 + next);
      }

      // Side walls (quads as 2 triangles each)
      for (let j = 0; j < k; j++) {
        const next = (j + 1) % k;
        const Tj = vertexOffset + 1 + j;
        const Tnext = vertexOffset + 1 + next;
        const Bj = vertexOffset + 1 + k + j;
        const Bnext = vertexOffset + 1 + k + next;
        allIndices.push(Tj, Bj, Bnext);
        allIndices.push(Tj, Bnext, Tnext);
      }

      vertexOffset += 1 + 2 * k;
    });

    const baseGeo = new THREE.BufferGeometry();
    baseGeo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    baseGeo.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
    baseGeo.setIndex(allIndices);
    baseGeo.computeVertexNormals();

    const baseMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      flatShading: true,
      shininess: 5,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.name = 'ProceduralPlanetSurface';
    this.groundGroup.add(baseMesh);

    // Cozy World Props distribution
    const totalProps = 600;
    const pineLeafGeo = new THREE.ConeGeometry(0.8, 2.4, 5);
    const pineLeafMat = new THREE.MeshPhongMaterial({
      color: 0x196f3d,
      flatShading: true,
      shininess: 0,
    });

    const cherryLeafGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const cherryLeafMat = new THREE.MeshPhongMaterial({
      color: 0xffa0c5,
      emissive: 0x22050e,
      flatShading: true,
      shininess: 0,
    });

    const autumnLeafGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 1.0, 4);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true });

    const roofGeo = new THREE.ConeGeometry(1.3, 1.1, 4);
    const windowGeo = new THREE.BoxGeometry(0.32, 0.32, 0.08);
    const crystalGeo = new THREE.OctahedronGeometry(0.7, 0);
    const crystalColors = [0x9b59b6, 0x00ffcc, 0xf1c40f, 0xe74c3c];

    const puffGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const puffMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      opacity: 0.7,
      transparent: true,
      flatShading: true,
    });

    // Props and scattered assets removed to focus on terrain regions + water.
    // Only the base geodesic tiles (with biome colors/displacement) + variant hex models will provide the ground look.
    // Floating islands and rings kept as the only non-terrain assets for now.

    // 3. Clouds & Parallax Layers
    const cloudsGroup = new THREE.Group();
    (window as any)._cloudsGroup = cloudsGroup;
    const cloudLayer1 = new THREE.Group();
    const cloudLayer2 = new THREE.Group();
    cloudsGroup.add(cloudLayer1);
    cloudsGroup.add(cloudLayer2);
    (window as any)._cloudLayer1 = cloudLayer1;
    (window as any)._cloudLayer2 = cloudLayer2;

    const cloudPuffGeo = new THREE.IcosahedronGeometry(3.5, 1);
    const cloudPuffMat = new THREE.MeshPhongMaterial({
      color: 0xfdfefe,
      flatShading: true,
      transparent: true,
      opacity: 0.55,
      shininess: 0,
    });
    (window as any)._cloudPuffMat = cloudPuffMat;

    const cloudClustersList: any[] = [];

    for (let c = 0; c < 35; c++) {
      const cluster = new THREE.Group();
      const numPuffs = 4 + Math.floor(seededRandom() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(cloudPuffGeo, cloudPuffMat);
        puff.position.set(
          (seededRandom() - 0.5) * 6.0,
          (seededRandom() - 0.5) * 3.5,
          (seededRandom() - 0.5) * 6.0
        );
        puff.scale.setScalar(0.5 + seededRandom() * 0.8);
        puff.castShadow = true;
        cluster.add(puff);
      }

      const phi = seededRandom() * Math.PI;
      const theta = seededRandom() * Math.PI * 2;
      const altitude = 24.0 + seededRandom() * 12.0;
      const clRadius = planetRadius + altitude;

      const norm = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      cluster.position.copy(norm).multiplyScalar(clRadius);
      cluster.lookAt(new THREE.Vector3(0, 0, 0));
      cloudLayer1.add(cluster);
      cloudClustersList.push({
        group: cluster,
        radius: clRadius,
        initialScale: 1.0,
        isHigh: false,
      });
    }

    const wispyMat = new THREE.MeshPhongMaterial({
      color: 0xf4ecf7,
      flatShading: true,
      transparent: true,
      opacity: 0.4,
      shininess: 0,
    });
    (window as any)._wispyMat = wispyMat;

    for (let c = 0; c < 20; c++) {
      const cluster = new THREE.Group();
      const numPuffs = 2 + Math.floor(seededRandom() * 3);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(cloudPuffGeo, wispyMat);
        puff.position.set(
          (seededRandom() - 0.5) * 8.0,
          (seededRandom() - 0.5) * 2.0,
          (seededRandom() - 0.5) * 8.0
        );
        puff.scale.set(1.5 + seededRandom(), 0.3 + seededRandom() * 0.3, 1.5 + seededRandom());
        cluster.add(puff);
      }

      const phi = seededRandom() * Math.PI;
      const theta = seededRandom() * Math.PI * 2;
      const altitude = 42.0 + seededRandom() * 10.0;
      const clRadius = planetRadius + altitude;

      const norm = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      cluster.position.copy(norm).multiplyScalar(clRadius);
      cluster.lookAt(new THREE.Vector3(0, 0, 0));
      cloudLayer2.add(cluster);
      cloudClustersList.push({
        group: cluster,
        radius: clRadius,
        initialScale: 1.0,
        isHigh: true,
      });
    }

    (window as any)._cloudClusters = cloudClustersList;
    scene.add(cloudsGroup);

    // 4. Floating Islands
    const floatingIslandsGroup = new THREE.Group();
    this.groundGroup.add(floatingIslandsGroup);

    const islandTopGeo = new THREE.CylinderGeometry(4.2, 5.0, 1.4, 7);
    const islandTopMat = new THREE.MeshPhongMaterial({
      color: 0x82c875,
      flatShading: true,
      shininess: 0,
    });
    const islandBottomGeo = new THREE.ConeGeometry(5.2, 5.5, 6);
    islandBottomGeo.rotateX(Math.PI);
    const islandBottomMat = new THREE.MeshPhongMaterial({
      color: 0x6e5c53,
      flatShading: true,
      shininess: 0,
    });

    const isldTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.8, 4);
    const isldLeavesGeo = new THREE.ConeGeometry(0.7, 1.8, 4);

    const numIslands = 12;
    (window as any)._islandCollectibles = [];

    for (let index = 0; index < numIslands; index++) {
      const island = new THREE.Group();
      
      const phi = seededRandom() * Math.PI;
      const theta = seededRandom() * Math.PI * 2;
      const altitude = 18.0 + seededRandom() * 22.0;
      const rad = planetRadius + altitude;

      const norm = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      const isldNoise = fbm(norm, 4) * 5.0;
      const pos = norm.clone().multiplyScalar(rad + isldNoise);

      island.position.copy(pos);
      island.lookAt(new THREE.Vector3(0, 0, 0));
      island.rotateX(-Math.PI / 2);

      const topMesh = new THREE.Mesh(islandTopGeo, islandTopMat);
      topMesh.castShadow = true;
      topMesh.receiveShadow = true;
      island.add(topMesh);

      const bottomMesh = new THREE.Mesh(islandBottomGeo, islandBottomMat);
      bottomMesh.position.y = -2.85;
      bottomMesh.castShadow = true;
      island.add(bottomMesh);

      // Trees and crystals removed (assets stripped for now).
      // Platforms kept as simple floating islands.

      floatingIslandsGroup.add(island);
    }

    // Slimmed load for tile models only (props and POIs stripped).
    const loadedAssets: { [key: string]: THREE.Group } = {};
    const gltfLoader = new GLTFLoader();
    const loadAsset = (name: string, path: string): Promise<void> => {
      return new Promise((resolve) => {
        gltfLoader.load(
          path,
          (gltf) => {
            loadedAssets[name] = gltf.scene;
            resolve();
          },
          undefined,
          (err) => {
            console.warn(`Failed to load asset ${name} at ${path}:`, err);
            resolve();
          }
        );
      });
    };

    const tileLoadPromises = [
      loadAsset("tileGrass", "KayKit/tiles/base/hex_grass.gltf"),
      loadAsset("tileWater", "KayKit/tiles/base/hex_water.gltf"),
      loadAsset("tileSlopeLow", "KayKit/tiles/base/hex_grass_sloped_low.gltf"),
      loadAsset("tileSlopeHigh", "KayKit/tiles/base/hex_grass_sloped_high.gltf"),
      loadAsset("tileBottom", "KayKit/tiles/base/hex_grass_bottom.gltf"),
      loadAsset("roadStraight", "KayKit/tiles/roads/hex_road_A.gltf"),
      loadAsset("roadCurve", "KayKit/tiles/roads/hex_road_B.gltf"),
      loadAsset("roadJunction", "KayKit/tiles/roads/hex_road_D.gltf"),
      loadAsset("coastA", "KayKit/tiles/coast/waterless/hex_coast_A_waterless.gltf"),
      loadAsset("coastB", "KayKit/tiles/coast/waterless/hex_coast_B_waterless.gltf"),
      loadAsset("coastC", "KayKit/tiles/coast/waterless/hex_coast_C_waterless.gltf"),
      loadAsset("coastD", "KayKit/tiles/coast/waterless/hex_coast_D_waterless.gltf"),
      loadAsset("coastE", "KayKit/tiles/coast/waterless/hex_coast_E_waterless.gltf"),
      loadAsset("riverStraight", "KayKit/tiles/rivers/hex_river_A.gltf"),
      loadAsset("riverCurve", "KayKit/tiles/rivers/hex_river_A_curvy.gltf"),
    ];

    const textureLoader = new THREE.TextureLoader();
    const variantTextures: { [key: string]: THREE.Texture } = {};
    const texturePromises = [
      new Promise<void>((resolve) => { textureLoader.load("/KayKit/tiles/textures/variants/hexagons_medieval_Summer.png", (tex) => { variantTextures.summer = tex; resolve(); }); }),
      new Promise<void>((resolve) => { textureLoader.load("/KayKit/tiles/textures/variants/hexagons_medieval_Fall.png", (tex) => { variantTextures.fall = tex; resolve(); }); }),
      new Promise<void>((resolve) => { textureLoader.load("/KayKit/tiles/textures/variants/hexagons_medieval_Winter.png", (tex) => { variantTextures.winter = tex; resolve(); }); }),
      new Promise<void>((resolve) => { textureLoader.load("/KayKit/tiles/textures/variants/hexagons_medieval.png", (tex) => { variantTextures.base = tex; resolve(); }); }),
    ];

    // Nature decoration assets — loaded globally for all biomes/regions
    const natureLoadPromises = [
      // Mountains (pre-assembled peak props)
      loadAsset("mountainA", "KayKit/decoration/nature/mountain_A.gltf"),
      loadAsset("mountainB", "KayKit/decoration/nature/mountain_B.gltf"),
      loadAsset("mountainC", "KayKit/decoration/nature/mountain_C.gltf"),
      loadAsset("mountainAGrass", "KayKit/decoration/nature/mountain_A_grass.gltf"),
      loadAsset("mountainBGrass", "KayKit/decoration/nature/mountain_B_grass.gltf"),
      // Hills (rounded terrain bumps)
      loadAsset("hillsA", "KayKit/decoration/nature/hills_A.gltf"),
      loadAsset("hillsATrees", "KayKit/decoration/nature/hills_A_trees.gltf"),
      loadAsset("hillsB", "KayKit/decoration/nature/hills_B.gltf"),
      loadAsset("hillsBTrees", "KayKit/decoration/nature/hills_B_trees.gltf"),
      loadAsset("hillsC", "KayKit/decoration/nature/hills_C.gltf"),
      loadAsset("hillsCTrees", "KayKit/decoration/nature/hills_C_trees.gltf"),
      loadAsset("hillSingleA", "KayKit/decoration/nature/hill_single_A.gltf"),
      loadAsset("hillSingleB", "KayKit/decoration/nature/hill_single_B.gltf"),
      // Rocks
      loadAsset("rockA", "KayKit/decoration/nature/rock_single_A.gltf"),
      loadAsset("rockB", "KayKit/decoration/nature/rock_single_B.gltf"),
      loadAsset("rockC", "KayKit/decoration/nature/rock_single_C.gltf"),
      loadAsset("rockD", "KayKit/decoration/nature/rock_single_D.gltf"),
      loadAsset("rockE", "KayKit/decoration/nature/rock_single_E.gltf"),
      // Trees — singles and groups
      loadAsset("treeSmall", "KayKit/decoration/nature/tree_single_A.gltf"),
      loadAsset("treeMedium", "KayKit/decoration/nature/tree_single_B.gltf"),
      loadAsset("treesASmall", "KayKit/decoration/nature/trees_A_small.gltf"),
      loadAsset("treesAMedium", "KayKit/decoration/nature/trees_A_medium.gltf"),
      loadAsset("treesALarge", "KayKit/decoration/nature/trees_A_large.gltf"),
      loadAsset("treesBSmall", "KayKit/decoration/nature/trees_B_small.gltf"),
      loadAsset("treesBMedium", "KayKit/decoration/nature/trees_B_medium.gltf"),
      // Water decorations
      loadAsset("waterlilyA", "KayKit/decoration/nature/waterlily_A.gltf"),
      loadAsset("waterplantA", "KayKit/decoration/nature/waterplant_A.gltf"),
      // Additional nature — previously missing
      loadAsset("hillSingleC", "KayKit/decoration/nature/hill_single_C.gltf"),
      loadAsset("mountainCGrass", "KayKit/decoration/nature/mountain_C_grass.gltf"),
      loadAsset("mountainAGrassTrees", "KayKit/decoration/nature/mountain_A_grass_trees.gltf"),
      loadAsset("mountainBGrassTrees", "KayKit/decoration/nature/mountain_B_grass_trees.gltf"),
      loadAsset("mountainCGrassTrees", "KayKit/decoration/nature/mountain_C_grass_trees.gltf"),
      loadAsset("treesBLarge", "KayKit/decoration/nature/trees_B_large.gltf"),
      loadAsset("waterlilyB", "KayKit/decoration/nature/waterlily_B.gltf"),
      loadAsset("waterplantB", "KayKit/decoration/nature/waterplant_B.gltf"),
      loadAsset("waterplantC", "KayKit/decoration/nature/waterplant_C.gltf"),
      // Buildings — Green faction
      loadAsset("home_A_green", "KayKit/buildings/green/building_home_A_green.gltf"),
      loadAsset("home_B_green", "KayKit/buildings/green/building_home_B_green.gltf"),
      loadAsset("windmill_green", "KayKit/buildings/green/building_windmill_green.gltf"),
      loadAsset("market_green", "KayKit/buildings/green/building_market_green.gltf"),
      loadAsset("church_green", "KayKit/buildings/green/building_church_green.gltf"),
      loadAsset("well_green", "KayKit/buildings/green/building_well_green.gltf"),
      loadAsset("lumbermill_green", "KayKit/buildings/green/building_lumbermill_green.gltf"),
      loadAsset("watermill_green", "KayKit/buildings/green/building_watermill_green.gltf"),
      loadAsset("tavern_green", "KayKit/buildings/green/building_tavern_green.gltf"),
      loadAsset("blacksmith_green", "KayKit/buildings/green/building_blacksmith_green.gltf"),
      loadAsset("tower_A_green", "KayKit/buildings/green/building_tower_A_green.gltf"),
      loadAsset("castle_green", "KayKit/buildings/green/building_castle_green.gltf"),
      loadAsset("mine_green", "KayKit/buildings/green/building_mine_green.gltf"),
      loadAsset("barracks_green", "KayKit/buildings/green/building_barracks_green.gltf"),
      loadAsset("archeryrange_green", "KayKit/buildings/green/building_archeryrange_green.gltf"),
      // Buildings — Blue faction
      loadAsset("home_A_blue", "KayKit/buildings/blue/building_home_A_blue.gltf"),
      loadAsset("home_B_blue", "KayKit/buildings/blue/building_home_B_blue.gltf"),
      loadAsset("windmill_blue", "KayKit/buildings/blue/building_windmill_blue.gltf"),
      loadAsset("market_blue", "KayKit/buildings/blue/building_market_blue.gltf"),
      loadAsset("church_blue", "KayKit/buildings/blue/building_church_blue.gltf"),
      loadAsset("well_blue", "KayKit/buildings/blue/building_well_blue.gltf"),
      loadAsset("lumbermill_blue", "KayKit/buildings/blue/building_lumbermill_blue.gltf"),
      loadAsset("watermill_blue", "KayKit/buildings/blue/building_watermill_blue.gltf"),
      loadAsset("tavern_blue", "KayKit/buildings/blue/building_tavern_blue.gltf"),
      loadAsset("blacksmith_blue", "KayKit/buildings/blue/building_blacksmith_blue.gltf"),
      loadAsset("tower_A_blue", "KayKit/buildings/blue/building_tower_A_blue.gltf"),
      loadAsset("castle_blue", "KayKit/buildings/blue/building_castle_blue.gltf"),
      loadAsset("mine_blue", "KayKit/buildings/blue/building_mine_blue.gltf"),
      loadAsset("barracks_blue", "KayKit/buildings/blue/building_barracks_blue.gltf"),
      loadAsset("archeryrange_blue", "KayKit/buildings/blue/building_archeryrange_blue.gltf"),
      // Buildings — Red faction
      loadAsset("home_A_red", "KayKit/buildings/red/building_home_A_red.gltf"),
      loadAsset("home_B_red", "KayKit/buildings/red/building_home_B_red.gltf"),
      loadAsset("windmill_red", "KayKit/buildings/red/building_windmill_red.gltf"),
      loadAsset("market_red", "KayKit/buildings/red/building_market_red.gltf"),
      loadAsset("church_red", "KayKit/buildings/red/building_church_red.gltf"),
      loadAsset("well_red", "KayKit/buildings/red/building_well_red.gltf"),
      loadAsset("lumbermill_red", "KayKit/buildings/red/building_lumbermill_red.gltf"),
      loadAsset("watermill_red", "KayKit/buildings/red/building_watermill_red.gltf"),
      loadAsset("tavern_red", "KayKit/buildings/red/building_tavern_red.gltf"),
      loadAsset("blacksmith_red", "KayKit/buildings/red/building_blacksmith_red.gltf"),
      loadAsset("tower_A_red", "KayKit/buildings/red/building_tower_A_red.gltf"),
      loadAsset("castle_red", "KayKit/buildings/red/building_castle_red.gltf"),
      loadAsset("mine_red", "KayKit/buildings/red/building_mine_red.gltf"),
      loadAsset("barracks_red", "KayKit/buildings/red/building_barracks_red.gltf"),
      loadAsset("archeryrange_red", "KayKit/buildings/red/building_archeryrange_red.gltf"),
      // Buildings — Yellow faction
      loadAsset("home_A_yellow", "KayKit/buildings/yellow/building_home_A_yellow.gltf"),
      loadAsset("home_B_yellow", "KayKit/buildings/yellow/building_home_B_yellow.gltf"),
      loadAsset("windmill_yellow", "KayKit/buildings/yellow/building_windmill_yellow.gltf"),
      loadAsset("market_yellow", "KayKit/buildings/yellow/building_market_yellow.gltf"),
      loadAsset("church_yellow", "KayKit/buildings/yellow/building_church_yellow.gltf"),
      loadAsset("well_yellow", "KayKit/buildings/yellow/building_well_yellow.gltf"),
      loadAsset("lumbermill_yellow", "KayKit/buildings/yellow/building_lumbermill_yellow.gltf"),
      loadAsset("watermill_yellow", "KayKit/buildings/yellow/building_watermill_yellow.gltf"),
      loadAsset("tavern_yellow", "KayKit/buildings/yellow/building_tavern_yellow.gltf"),
      loadAsset("blacksmith_yellow", "KayKit/buildings/yellow/building_blacksmith_yellow.gltf"),
      loadAsset("tower_A_yellow", "KayKit/buildings/yellow/building_tower_A_yellow.gltf"),
      loadAsset("castle_yellow", "KayKit/buildings/yellow/building_castle_yellow.gltf"),
      loadAsset("mine_yellow", "KayKit/buildings/yellow/building_mine_yellow.gltf"),
      loadAsset("barracks_yellow", "KayKit/buildings/yellow/building_barracks_yellow.gltf"),
      loadAsset("archeryrange_yellow", "KayKit/buildings/yellow/building_archeryrange_yellow.gltf"),
      // Buildings — Neutral (shared across regions)
      loadAsset("building_grain", "KayKit/buildings/neutral/building_grain.gltf"),
      loadAsset("building_dirt", "KayKit/buildings/neutral/building_dirt.gltf"),
      loadAsset("fence_wood", "KayKit/buildings/neutral/fence_wood_straight.gltf"),
      loadAsset("fence_stone", "KayKit/buildings/neutral/fence_stone_straight.gltf"),
      // Props — scattered around settlements
      loadAsset("barrel", "KayKit/decoration/props/barrel.gltf"),
      loadAsset("crate_A_big", "KayKit/decoration/props/crate_A_big.gltf"),
      loadAsset("crate_B_small", "KayKit/decoration/props/crate_B_small.gltf"),
      loadAsset("crate_open", "KayKit/decoration/props/crate_open.gltf"),
      loadAsset("sack", "KayKit/decoration/props/sack.gltf"),
      loadAsset("resource_lumber", "KayKit/decoration/props/resource_lumber.gltf"),
      loadAsset("resource_stone", "KayKit/decoration/props/resource_stone.gltf"),
      loadAsset("bucket_water", "KayKit/decoration/props/bucket_water.gltf"),
      loadAsset("wheelbarrow", "KayKit/decoration/props/wheelbarrow.gltf"),
      loadAsset("tent", "KayKit/decoration/props/tent.gltf"),
      loadAsset("target", "KayKit/decoration/props/target.gltf"),
      loadAsset("weaponrack", "KayKit/decoration/props/weaponrack.gltf"),
      loadAsset("flag_green", "KayKit/decoration/props/flag_green.gltf"),
      loadAsset("flag_blue", "KayKit/decoration/props/flag_blue.gltf"),
      loadAsset("flag_red", "KayKit/decoration/props/flag_red.gltf"),
      loadAsset("flag_yellow", "KayKit/decoration/props/flag_yellow.gltf"),
    ];

    return Promise.all([...tileLoadPromises, ...texturePromises, ...natureLoadPromises]).then(() => {
      // Define pathfinding inside the then scope
      const findPath = (startIdx: number, endIdx: number, allowedTiles: Set<number>): number[] | null => {
        const queue: number[] = [startIdx];
        const visited = new Set<number>([startIdx]);
        const parent = new Map<number, number>();

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr === endIdx) {
            const path: number[] = [];
            let temp = curr;
            while (temp !== startIdx) {
              path.push(temp);
              temp = parent.get(temp)!;
            }
            path.push(startIdx);
            return path.reverse();
          }

          const neighbors = groundTileHolders[curr].userData.neighbors || [];
          for (const n of neighbors) {
            if (!visited.has(n) && (allowedTiles.has(n) || n === endIdx)) {
              visited.add(n);
              parent.set(n, curr);
              queue.push(n);
            }
          }
        }
        return null;
      };

      // 1. Identify all tiles in Region 0 for roads
      const region0Indices: number[] = [];
      groundTileHolders.forEach((group, idx) => {
        if (group.userData.logicalRegion === 'region_0') {
          const biome = group.userData.biome;
          if (biome === 'grass' || biome === 'hill') {
            region0Indices.push(idx);
          }
        }
      });

      const region0Set = new Set(region0Indices);
      const roadTiles = new Set<number>();

      // Select 3-4 hubs in Region 0
      const hubs: number[] = [];
      if (region0Indices.length >= 3) {
        hubs.push(region0Indices[0]);
        hubs.push(region0Indices[Math.floor(region0Indices.length / 2)]);
        hubs.push(region0Indices[region0Indices.length - 1]);
        if (region0Indices.length >= 5) {
          hubs.push(region0Indices[Math.floor(region0Indices.length * 0.75)]);
        }
      }

      // Run BFS to connect them in sequence
      for (let i = 0; i < hubs.length - 1; i++) {
        const path = findPath(hubs[i], hubs[i + 1], region0Set);
        if (path) {
          path.forEach(idx => roadTiles.add(idx));
        }
      }

      // 1b. Generate rivers in ALL regions — find mountain/hill sources flowing toward water
      const riverTiles = new Set<number>();
      
      // Scan all tiles globally for mountain/hill sources near water
      const allSources: number[] = [];
      groundTileHolders.forEach((group, idx) => {
        const b = group.userData.biome;
        if (b === 'mountain' || b === 'hill') {
          allSources.push(idx);
        }
      });

      // Shuffle sources deterministically and pick up to 15 river starts across the planet
      for (let i = allSources.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [allSources[i], allSources[j]] = [allSources[j], allSources[i]];
      }
      
      // Flow downhill from each source to water
      allSources.slice(0, 15).forEach((srcIdx) => {
        let curr = srcIdx;
        const visited = new Set<number>([curr]);
        
        for (let step = 0; step < 12; step++) {
          riverTiles.add(curr);
          
          const neighbors = groundTileHolders[curr].userData.neighbors || [];
          let bestNext = -1;
          let lowestDisp = groundTileHolders[curr].userData.displacement || 0;
          
          for (const n of neighbors) {
            if (visited.has(n)) continue;
            const nBiome = groundTileHolders[n].userData.biome;
            if (nBiome === 'water') {
              bestNext = n;
              break;
            }
            const nDisp = groundTileHolders[n].userData.displacement || 0;
            if (nDisp < lowestDisp) {
              lowestDisp = nDisp;
              bestNext = n;
            }
          }
          
          if (bestNext === -1 || groundTileHolders[bestNext].userData.biome === 'water') {
            if (bestNext !== -1) {
              riverTiles.add(bestNext);
            }
            break;
          }
          curr = bestNext;
          visited.add(curr);
        }
      });

      // 2. Tile surface is handled by the merged procedural base mesh (above).
      // No GLTF hex models are placed as base tiles — only decoration props below.
      this.tileGroups = groundTileHolders;

      // === Global Biome Decoration: Place nature props on ALL tiles ===
      const placePropOnTile = (tileGroup: THREE.Group, assetKey: string, scaleBase: number, tangentScale = 4.0) => {
        if (!loadedAssets[assetKey]) return;
        const prop = loadedAssets[assetKey].clone();
        prop.scale.setScalar(scaleBase * (2.5 + seededRandom() * 1.5));

        const localX = (seededRandom() - 0.5) * tangentScale;
        const localZ = (seededRandom() - 0.5) * tangentScale;
        prop.position.set(localX, 0.05, localZ);
        prop.rotation.y = seededRandom() * Math.PI * 2;

        prop.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        tileGroup.add(prop);
      };

      const mountainModels = ["mountainA", "mountainB", "mountainC", "mountainAGrass", "mountainBGrass", "mountainCGrass", "mountainAGrassTrees", "mountainBGrassTrees", "mountainCGrassTrees"];
      const hillModels = ["hillsATrees", "hillsBTrees", "hillsCTrees", "hillsA", "hillsB", "hillsC"];
      const hillSingleModels = ["hillSingleA", "hillSingleB", "hillSingleC"];
      const rockModels = ["rockA", "rockB", "rockC", "rockD", "rockE"];
      const treeSmallModels = ["treeSmall", "treeMedium"];
      const treeGroupModels = ["treesASmall", "treesAMedium", "treesALarge", "treesBSmall", "treesBMedium", "treesBLarge"];
      const genericProps = ["barrel", "crate_A_big", "crate_B_small", "crate_open", "sack", "resource_lumber", "resource_stone", "bucket_water", "wheelbarrow"];

      groundTileHolders.forEach((tileGroup, uIdx) => {
        const biome = tileGroup.userData.biome;
        if (!biome) return;

        // Skip road and river tiles — keep them clear
        const isRoad = roadTiles.has(uIdx);
        const isRiver = riverTiles.has(uIdx);
        if (isRoad || isRiver) return;

        const pick = (arr: string[]) => arr[Math.floor(seededRandom() * arr.length)];

        if (biome === "mountain") {
          // Mountain peaks: 70% chance of a peak prop (the hero assets!)
          if (seededRandom() < 0.70) {
            placePropOnTile(tileGroup, pick(mountainModels), 1.8, 2.0);
          }
          // Occasional rocks scattered around the peak
          if (seededRandom() < 0.3) {
            placePropOnTile(tileGroup, pick(rockModels), 1.5, 3.5);
          }
        } else if (biome === "hill") {
          // Hill decorations: bumpy terrain with trees
          if (seededRandom() < 0.55) {
            placePropOnTile(tileGroup, pick(hillModels), 1.6, 2.5);
          } else if (seededRandom() < 0.35) {
            placePropOnTile(tileGroup, pick(hillSingleModels), 1.8, 3.0);
          }
          // Scattered trees on hills
          if (seededRandom() < 0.4) {
            placePropOnTile(tileGroup, pick(treeSmallModels), 1.3, 5.0);
          }
        } else if (biome === "grass") {
          // Grass: trees and tree groups — varying density for organic feel
          if (seededRandom() < 0.45) {
            placePropOnTile(tileGroup, pick(treeGroupModels), 1.4, 3.5);
          }
          if (seededRandom() < 0.35) {
            placePropOnTile(tileGroup, pick(treeSmallModels), 1.2, 5.0);
          }
          // Occasional rocks
          if (seededRandom() < 0.08) {
            placePropOnTile(tileGroup, pick(rockModels), 1.0, 4.0);
          }
        } else if (biome === "sand") {
          // Desert: sparse rocks, occasional cacti-like rock clusters
          if (seededRandom() < 0.35) {
            placePropOnTile(tileGroup, pick(rockModels), 1.3, 4.0);
          }
          if (seededRandom() < 0.15) {
            placePropOnTile(tileGroup, pick(rockModels), 0.8, 5.0);
          }
        } else if (biome === "water") {
          // Shallow water: occasional waterlilies and waterplants
          const waterDecoLilies = ["waterlilyA", "waterlilyB"];
          const waterDecoPlants = ["waterplantA", "waterplantB", "waterplantC"];
          if (seededRandom() < 0.08) {
            placePropOnTile(tileGroup, pick(waterDecoLilies), 2.0, 3.0);
          }
          if (seededRandom() < 0.05) {
            placePropOnTile(tileGroup, pick(waterDecoPlants), 1.8, 3.0);
          }
        }

        // Coast-adjacent land tiles: add rocks along the shore
        if (biome !== "water") {
          const neighbors = tileGroup.userData.neighbors || [];
          const waterNeighborCount = neighbors.filter((n: number) => groundTileHolders[n]?.userData.biome === "water").length;
          if (waterNeighborCount > 0 && seededRandom() < 0.3) {
            placePropOnTile(tileGroup, pick(rockModels), 1.0, 3.0);
          }
        }
      });

      // === Region Config: faction colors, building mixes, and placement densities ===
      const REGION_CONFIG: Record<string, {
        color: string;
        buildings: string[];   // building type basenames (suffixed with _color at placement)
        bigBuildings: string[]; // rarer landmark buildings
        buildingChance: number;
        flagColor: string;
      }> = {
        region_0: {
          color: 'green',
          buildings: ['home_A', 'home_B', 'windmill', 'market', 'church', 'well', 'lumbermill', 'watermill'],
          bigBuildings: ['castle', 'tavern'],
          buildingChance: 0.30,
          flagColor: 'green',
        },
        region_1: {
          color: 'blue',
          buildings: ['home_A', 'home_B', 'market', 'tavern', 'church', 'well', 'watermill'],
          bigBuildings: ['castle', 'tower_A'],
          buildingChance: 0.25,
          flagColor: 'blue',
        },
        region_2: {
          color: 'red',
          buildings: ['home_A', 'home_B', 'barracks', 'blacksmith', 'tower_A', 'archeryrange', 'well'],
          bigBuildings: ['castle'],
          buildingChance: 0.28,
          flagColor: 'red',
        },
        region_3: {
          color: 'yellow',
          buildings: ['home_A', 'home_B', 'market', 'tavern', 'windmill', 'well', 'lumbermill'],
          bigBuildings: ['castle', 'church'],
          buildingChance: 0.25,
          flagColor: 'yellow',
        },
        region_4: {
          color: 'blue',
          buildings: ['home_A', 'home_B', 'barracks', 'tower_A', 'blacksmith', 'mine', 'well'],
          bigBuildings: ['castle'],
          buildingChance: 0.22,
          flagColor: 'blue',
        },
        region_5: {
          color: 'red',
          buildings: ['home_A', 'home_B', 'mine', 'blacksmith', 'barracks', 'archeryrange', 'well'],
          bigBuildings: ['castle', 'tower_A'],
          buildingChance: 0.20,
          flagColor: 'red',
        },
        region_6: {
          color: 'green',
          buildings: ['home_A', 'home_B', 'lumbermill', 'windmill', 'watermill', 'well', 'church'],
          bigBuildings: ['tavern'],
          buildingChance: 0.28,
          flagColor: 'green',
        },
        region_7: {
          color: 'yellow',
          buildings: ['home_A', 'home_B', 'market', 'tavern', 'well', 'windmill'],
          bigBuildings: ['castle', 'church'],
          buildingChance: 0.22,
          flagColor: 'yellow',
        },
        region_8: {
          color: 'green',
          buildings: ['home_A', 'home_B', 'windmill', 'lumbermill', 'well', 'watermill'],
          bigBuildings: ['church'],
          buildingChance: 0.25,
          flagColor: 'green',
        },
      };

      // === Per-Region Building & Prop Placement ===
      groundTileHolders.forEach((tileGroup, uIdx) => {
        const regionId = tileGroup.userData.logicalRegion;
        const config = REGION_CONFIG[regionId];
        if (!config) return;

        const biome = tileGroup.userData.biome;
        if (biome !== 'grass' && biome !== 'hill') return;
        if (roadTiles.has(uIdx) || riverTiles.has(uIdx)) return;

        const pick = (arr: string[]) => arr[Math.floor(seededRandom() * arr.length)];

        // Place buildings at configured density
        if (seededRandom() < config.buildingChance) {
          // 10% chance of a landmark (castle, tower, etc.), 90% normal building
          const isLandmark = seededRandom() < 0.10 && config.bigBuildings.length > 0;
          const buildingType = isLandmark ? pick(config.bigBuildings) : pick(config.buildings);
          const assetKey = `${buildingType}_${config.color}`;

          if (loadedAssets[assetKey]) {
            const scale = isLandmark ? 2.2 : 1.8;
            placePropOnTile(tileGroup, assetKey, scale, 3.5);

            // Scatter 1-2 props around the building for life
            if (seededRandom() < 0.50) {
              placePropOnTile(tileGroup, pick(genericProps), 0.8, 4.5);
            }
            if (seededRandom() < 0.25) {
              placePropOnTile(tileGroup, pick(genericProps), 0.7, 5.0);
            }
            // Faction flag near buildings (20% chance)
            if (seededRandom() < 0.20) {
              placePropOnTile(tileGroup, `flag_${config.flagColor}`, 1.0, 4.0);
            }
          }
        }

        // Biome-specific prop scatter (even on tiles without buildings)
        if (biome === 'grass' && seededRandom() < 0.06) {
          placePropOnTile(tileGroup, pick(["barrel", "sack", "crate_B_small"]), 0.7, 5.0);
        }
        if (biome === 'hill' && seededRandom() < 0.05) {
          placePropOnTile(tileGroup, pick(["resource_lumber", "resource_stone", "bucket_water"]), 0.8, 4.5);
        }
      });

      // Mountain-specific props: tents and resource piles near mines
      groundTileHolders.forEach((tileGroup, uIdx) => {
        const biome = tileGroup.userData.biome;
        if (biome !== 'mountain' && biome !== 'sand') return;
        if (roadTiles.has(uIdx) || riverTiles.has(uIdx)) return;

        if (biome === 'mountain' && seededRandom() < 0.06) {
          placePropOnTile(tileGroup, "resource_stone", 0.9, 4.0);
        }
        if (biome === 'sand' && seededRandom() < 0.04) {
          const pick = (arr: string[]) => arr[Math.floor(seededRandom() * arr.length)];
          placePropOnTile(tileGroup, pick(["tent", "target", "weaponrack"]), 1.0, 4.0);
        }
      });
    });
  }
}

