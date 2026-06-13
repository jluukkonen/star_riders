import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fbm } from "../utils";

export class PlanetGenerator {
  public spinningBlades: THREE.Object3D[] = [];
  public glowingWindows: THREE.Object3D[] = [];
  public bioluminescentMeshes: any[] = [];
  public waterCore!: THREE.Mesh;
  public groundGroup = new THREE.Group();
  public tilesData: any[] = [];

  constructor() {}

  public generate(scene: THREE.Scene, planetRadius: number): Promise<void> {
    this.groundGroup.name = "CozyGlobeGroundGroup";

    // MANDATORY INTEGRITY WARNING:
    // DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

    // Initialize ring gates on window
    (window as any)._ringGates = [];

    // Generate 15 floating ring gates at random spherical coordinates
    const colors = [0xff33bb, 0x00ffff, 0xffff00, 0x00ff88, 0xaa33ff];
    for (let i = 0; i < 15; i++) {
      const phi = Math.acos(-1 + 2 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const altitude = 15.0 + Math.random() * 20.0; // Altitude between 15.0 and 35.0
      const r = planetRadius + altitude;
      const pos = new THREE.Vector3().setFromSphericalCoords(r, phi, theta);

      const colorHex = colors[Math.floor(Math.random() * colors.length)];
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

      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(0, 0, 0);
      group.rotateX(-Math.PI / 2);
      group.rotateY(Math.random() * Math.PI * 2);

      group.add(torusMesh);
      this.groundGroup.add(group);

      (window as any)._ringGates.push({
        mesh: torusMesh,
        group: group,
        collected: false,
        color: colorHex
      });
    }

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
        displacement = -0.4;
        topColor = new THREE.Color(0x2471a3);
        bottomColor = new THREE.Color(0x154360);
      } else if (temperature < 0.28) {
        biome = "mountain";
        displacement = 0.5;
        topColor = new THREE.Color(0xf2f4f4);
        bottomColor = new THREE.Color(0x7f8c8d);
      } else if (temperature > 0.58 && humidity < 0.36) {
        biome = "sand";
        displacement = 0.1;
        topColor = new THREE.Color(0xf5b041);
        bottomColor = new THREE.Color(0xba4a00);
      } else if (temperature > 0.48 && humidity > 0.64) {
        biome = "hill";
        displacement = 0.8;
        topColor = new THREE.Color(0x196f3d);
        bottomColor = new THREE.Color(0x4a235a);
      } else {
        biome = "grass";
        displacement = 0.3;
        topColor = new THREE.Color(0x52be80);
        bottomColor = new THREE.Color(0x5c4033);
      }

      tilesData.push({
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
        isPentagon: tile.isPentagon,
        biome: tile.biome,
        center: tile.center,
        displacement: tile.displacement
      };

      (tileGroup as any)._biome = tile.biome;
      (tileGroup as any)._center = tile.center;

      this.groundGroup.add(tileGroup);
      groundTileHolders.push(tileGroup);
    });

    this.groundGroup.position.y = -(planetRadius + 2.5) - 0.25;
    scene.add(this.groundGroup);

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

    const propHolders: THREE.Group[] = [];
    (window as any)._glowingWindows = this.glowingWindows;
    (window as any)._bioluminescentMeshes = this.bioluminescentMeshes;
    (window as any)._spinningBlades = this.spinningBlades;

    for (let i = 0; i < totalProps; i++) {
      const phi = Math.acos(-1 + (2 * i) / totalProps);
      const theta = Math.sqrt(totalProps * Math.PI) * phi;

      const propBase = new THREE.Group();
      const v_normal = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      let closestTile = tilesData[0];
      let maxDot = -1.0;
      for (let t = 0; t < tilesData.length; t++) {
        const dot = v_normal.dot(tilesData[t].center);
        if (dot > maxDot) {
          maxDot = dot;
          closestTile = tilesData[t];
        }
      }

      const biome = closestTile.biome;
      let selectedType = "none";
      const roll = Math.random();

      if (biome === "water") {
        if (roll < 0.03) selectedType = "fog";
        else if (roll < 0.06) selectedType = "crystal";
        else if (roll < 0.15) selectedType = "waterlily";
        else if (roll < 0.25) selectedType = "waterplant";
        else continue;
      } else if (biome === "mountain") {
        if (roll < 0.6) selectedType = "pine";
        else if (roll < 0.88) selectedType = "rock";
        else selectedType = "crystal";
      } else if (biome === "sand") {
        if (roll < 0.7) selectedType = "rock";
        else if (roll < 0.85) selectedType = "crystal";
        else if (roll < 0.93) selectedType = "fog";
        else continue;
      } else if (biome === "hill") {
        if (roll < 0.55) selectedType = "jungle_tree";
        else if (roll < 0.7) selectedType = "rock";
        else if (roll < 0.82) selectedType = "tent";
        else if (roll < 0.88) selectedType = "cottage";
        else if (roll < 0.92) selectedType = "windmill";
        else if (roll < 0.96) selectedType = "tower";
        else selectedType = "crystal";
      } else {
        if (roll < 0.3) selectedType = "cherry_blossom";
        else if (roll < 0.6) selectedType = "autumn_birch";
        else if (roll < 0.72) selectedType = "cottage";
        else if (roll < 0.78) selectedType = "windmill";
        else if (roll < 0.84) selectedType = "tower";
        else if (roll < 0.88) selectedType = "tent";
        else if (roll < 0.92) selectedType = "well";
        else if (roll < 0.96) selectedType = "rock";
        else selectedType = "crystal";
      }

      let cellScale = 7.5;
      if (closestTile && closestTile.vertices && closestTile.vertices.length > 0) {
        const cornerNorm = closestTile.vertices[0];
        const centerNorm = closestTile.center;
        const centerPt = centerNorm.clone().multiplyScalar(planetRadius);
        const cornerPt = cornerNorm.clone().multiplyScalar(planetRadius);
        cellScale = centerPt.distanceTo(cornerPt);
      }

      let rOffset = -0.05 * cellScale;
      if (selectedType === "cherry_blossom" || selectedType === "autumn_birch" || selectedType === "jungle_tree") rOffset = -0.1 * cellScale;
      else if (selectedType === "pine") rOffset = -0.1 * cellScale;
      else if (selectedType === "rock") rOffset = -0.15 * cellScale;
      else if (selectedType === "cottage" || selectedType === "windmill" || selectedType === "tower" || selectedType === "well") rOffset = -0.02 * cellScale;
      else if (selectedType === "waterlily" || selectedType === "waterplant") rOffset = 0.0;
      else if (selectedType === "crystal") rOffset = -0.15 * cellScale;
      else if (selectedType === "fog") rOffset = 1.3 * cellScale;
      else if (selectedType === "tent") rOffset = -0.05 * cellScale;

      const r = planetRadius + closestTile.displacement + rOffset;
      const finalPos = v_normal.clone().multiplyScalar(r);

      propBase.position.copy(finalPos);
      propBase.lookAt(new THREE.Vector3(0, 0, 0));
      propBase.rotateX(-Math.PI / 2);

      const baseScale = 0.9 + Math.random() * 0.25;
      propBase.scale.setScalar(1.0);

      propBase.userData = {
        selectedType,
        baseScale,
        biome,
        normal: v_normal,
        cellScale,
      };

      if (selectedType === "crystal") {
        const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];
        const curCrystalMat = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 1.8,
          transparent: true,
          opacity: 0.9,
          flatShading: true,
        });

        const cryMesh = new THREE.Mesh(crystalGeo, curCrystalMat);
        cryMesh.position.y = 0.3;
        cryMesh.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
        cryMesh.scale.set(0.8, 1.2 + Math.random() * 0.5, 0.8);
        propBase.add(cryMesh);
        this.bioluminescentMeshes.push({ mesh: cryMesh, baseIntensity: 1.8, type: "crystal" });

        const cryMesh2 = new THREE.Mesh(crystalGeo, curCrystalMat);
        cryMesh2.position.set(0.4, 0.15, -0.3);
        cryMesh2.rotation.set(0.4, Math.random() * Math.PI, -0.4);
        cryMesh2.scale.set(0.4, 0.7, 0.4);
        propBase.add(cryMesh2);
        this.bioluminescentMeshes.push({ mesh: cryMesh2, baseIntensity: 1.8, type: "crystal" });

      } else if (selectedType === "fog") {
        const cloudPuff = new THREE.Mesh(puffGeo, puffMat);
        cloudPuff.position.set(0, 0.4, 0);
        cloudPuff.scale.setScalar(1.0);
        propBase.add(cloudPuff);

        const cloudPuff2 = new THREE.Mesh(puffGeo, puffMat);
        cloudPuff2.position.set(0.5, 0.2, 0.4);
        cloudPuff2.scale.setScalar(0.7);
        propBase.add(cloudPuff2);
      }

      this.groundGroup.add(propBase);
      propHolders.push(propBase);
    }

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
      const numPuffs = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(cloudPuffGeo, cloudPuffMat);
        puff.position.set(
          (Math.random() - 0.5) * 6.0,
          (Math.random() - 0.5) * 3.5,
          (Math.random() - 0.5) * 6.0
        );
        puff.scale.setScalar(0.5 + Math.random() * 0.8);
        puff.castShadow = true;
        cluster.add(puff);
      }

      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const altitude = 24.0 + Math.random() * 12.0;
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
      const numPuffs = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(cloudPuffGeo, wispyMat);
        puff.position.set(
          (Math.random() - 0.5) * 8.0,
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 8.0
        );
        puff.scale.set(1.5 + Math.random(), 0.3 + Math.random() * 0.3, 1.5 + Math.random());
        cluster.add(puff);
      }

      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const altitude = 42.0 + Math.random() * 10.0;
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
      
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const altitude = 18.0 + Math.random() * 22.0;
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

      for (let t = 0; t < 3; t++) {
        const tree = new THREE.Group();
        const tx = (Math.random() - 0.5) * 4.8;
        const tz = (Math.random() - 0.5) * 4.8;
        tree.position.set(tx, 0.7, tz);
        
        const trk = new THREE.Mesh(isldTrunkGeo, trunkMat);
        trk.position.y = 0.4;
        tree.add(trk);

        const lvs = new THREE.Mesh(isldLeavesGeo, pineLeafMat);
        lvs.position.y = 1.25;
        tree.add(lvs);

        island.add(tree);
      }

      const crystalGlow = new THREE.Mesh(crystalGeo, new THREE.MeshPhongMaterial({
        color: 0xfff3a0,
        emissive: 0xffaa00,
        emissiveIntensity: 3.5,
        flatShading: true,
        transparent: true,
        opacity: 0.9,
      }));
      crystalGlow.position.set(0, 2.3, 0);
      island.add(crystalGlow);

      (window as any)._islandCollectibles.push({
        mesh: crystalGlow,
        collected: false,
        name: `Star Fragment #${index + 1}`
      });

      floatingIslandsGroup.add(island);
    }

    // 5. Points of Interest Landmarks
    const POI_DEFINITIONS = [
      { name: "✨ Fountain of Dreams", color: 0xffacd5, icon: "✨", desc: "The legendary fountain containing the mystical Star Rod." },
      { name: "🌳 Whispy Woods", color: 0xff5e7e, icon: "🍎", desc: "The friendly, talkative forest guardian who drops juicy, shiny apples." },
      { name: "🌸 Floralia Sky Gate", color: 0xffc5e3, icon: "🌸", desc: "A cozy gateway to the legendary kingdom of Floralia in the high skies." },
      { name: "🏔️ Rainbow Resort Peak", color: 0x9be2ff, icon: "🌟", desc: "A colorful, glowing base that looks out onto the dreamiest of neon skies." },
      { name: "🏰 Butter Building Tower", color: 0xffdd66, icon: "🏰", desc: "A nostalgic white and yellow tower themed after the classic Dream Land landmark." },
      { name: "🌋 Halcandra Ruins", color: 0xff8800, icon: "👑", desc: "Ancient crumbling towers humming with volcanic energy and the legendary Master Crown." },
      { name: "💎 Great Cave Offensive", color: 0x00ffaa, icon: "💎", desc: "A sparkling cavern filled with legendary pink, green, and gold treasure gems!" },
      { name: "⛵ Warp Star Launchpad", color: 0xffeb3b, icon: "⭐", desc: "A golden pier pointing into the stratosphere with a real parking Warp Star!" },
    ];

    const globePOIs: any[] = [];
    (window as any)._globePOIs = globePOIs;

    const numPOIs = POI_DEFINITIONS.length;
    for (let idx = 0; idx < numPOIs; idx++) {
      const def = POI_DEFINITIONS[idx];
      const poiGroup = new THREE.Group();

      const phi = Math.acos(-1 + (2 * idx) / numPOIs);
      const theta = Math.sqrt(numPOIs * Math.PI) * phi;
      const norm = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      
      let closestTile = tilesData[0];
      let maxDot = -1.0;
      for (let t = 0; t < tilesData.length; t++) {
        const dot = norm.dot(tilesData[t].center);
        if (dot > maxDot) {
          maxDot = dot;
          closestTile = tilesData[t];
        }
      }

      let surfaceRadius = planetRadius + closestTile.displacement;
      if (closestTile.biome === "water") {
        surfaceRadius = planetRadius + 0.5;
      }

      const pos = norm.clone().multiplyScalar(surfaceRadius);

      poiGroup.position.copy(pos);
      poiGroup.lookAt(new THREE.Vector3(0, 0, 0));
      poiGroup.rotateX(-Math.PI / 2);

      if (def.name === "✨ Fountain of Dreams") {
        const cluster = new THREE.Group();
        
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.4, 6), new THREE.MeshPhongMaterial({ color: 0xecf0f1, flatShading: true }));
        b1.position.y = 0.2;
        cluster.add(b1);
        
        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 6), new THREE.MeshPhongMaterial({ color: 0xf1c40f, flatShading: true }));
        b2.position.y = 0.55;
        cluster.add(b2);

        const b3 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, 0.2, 6), new THREE.MeshPhongMaterial({ color: 0xffadc5, flatShading: true }));
        b3.position.y = 0.8;
        cluster.add(b3);

        const waterGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.05, 6);
        const waterMat = new THREE.MeshPhongMaterial({ color: 0x34ecef, emissive: 0x1166aa, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.9;
        cluster.add(water);

        const archMat = new THREE.MeshPhongMaterial({ color: 0xf1c40f, flatShading: true });
        const colL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 4), archMat);
        colL.position.set(-0.6, 1.5, 0);
        colL.rotation.z = -0.15;
        cluster.add(colL);

        const colR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 4), archMat);
        colR.position.set(0.6, 1.5, 0);
        colR.rotation.z = 0.15;
        cluster.add(colR);

        const beamArc = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.35), archMat);
        beamArc.position.set(0, 2.2, 0);
        cluster.add(beamArc);

        const wandGroup = new THREE.Group();
        wandGroup.position.set(0, 1.7, 0);

        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 4), new THREE.MeshPhongMaterial({ color: 0xe91e63, flatShading: true }));
        handle.position.y = -0.2;
        wandGroup.add(handle);

        const starShape = new THREE.Shape();
        const spikes = 5;
        const outerRadius = 0.32;
        const innerRadius = 0.15;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) starShape.moveTo(x, y);
          else starShape.lineTo(x, y);
        }
        starShape.closePath();
        const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 });
        starGeo.center();

        const starMat = new THREE.MeshPhongMaterial({
          color: 0xffeb3b,
          emissive: 0xff8f00,
          emissiveIntensity: 2.5,
          flatShading: true
        });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.position.y = 0.4;
        starMesh.rotation.z = Math.PI / 6;
        wandGroup.add(starMesh);

        cluster.add(wandGroup);
        (window as any)._starRod = wandGroup;

        poiGroup.add(cluster);

      } else if (def.name === "🌳 Whispy Woods") {
        const whisperWood = new THREE.Group();

        const trunkGeoCustom = new THREE.CylinderGeometry(0.6, 0.85, 2.4, 6);
        const trunkMatCustom = new THREE.MeshPhongMaterial({ color: 0x8a5a36, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeoCustom, trunkMatCustom);
        trunk.position.y = 1.2;
        whisperWood.add(trunk);

        const leafMat = new THREE.MeshPhongMaterial({ color: 0x4caf50, flatShading: true });
        const mainCanopy = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 5), leafMat);
        mainCanopy.position.set(0, 2.9, 0);
        mainCanopy.scale.set(1.4, 1.1, 1.4);
        whisperWood.add(mainCanopy);

        const subCanopyL = new THREE.Mesh(new THREE.SphereGeometry(0.9, 5, 4), leafMat);
        subCanopyL.position.set(-0.8, 2.4, 0.4);
        whisperWood.add(subCanopyL);

        const subCanopyR = new THREE.Mesh(new THREE.SphereGeometry(0.9, 5, 4), leafMat);
        subCanopyR.position.set(0.8, 2.4, -0.4);
        whisperWood.add(subCanopyR);

        const facialGroup = new THREE.Group();
        facialGroup.position.set(0, 1.3, 0.75);

        const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 4), trunkMatCustom);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 0, 0.15);
        facialGroup.add(nose);

        const mouthMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
        const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 6), mouthMat);
        mouth.rotation.x = Math.PI / 2;
        mouth.position.set(0, -0.32, 0.05);
        facialGroup.add(mouth);

        const eyeMat = new THREE.MeshPhongMaterial({ color: 0x222222, flatShading: true });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), eyeMat);
        eyeL.position.set(-0.24, 0.18, 0.04);
        facialGroup.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), eyeMat);
        eyeR.position.set(0.24, 0.18, 0.04);
        facialGroup.add(eyeR);

        trunk.add(facialGroup);

        const appleMat = new THREE.MeshPhongMaterial({ color: 0xf44336, flatShading: true, shininess: 100 });
        const appleGeo = new THREE.SphereGeometry(0.25, 5, 4);
        const appleGroup = new THREE.Group();

        const applePositions = [
          new THREE.Vector3(-0.7, 2.0, 0.6),
          new THREE.Vector3(0.7, 1.8, 0.5),
          new THREE.Vector3(0.0, 2.1, -0.8)
        ];

        applePositions.forEach((pos, idx) => {
          const apple = new THREE.Mesh(appleGeo, appleMat);
          apple.position.copy(pos);
          
          const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 3);
          const stem = new THREE.Mesh(stemGeo, trunkMatCustom);
          stem.position.y = 0.22;
          stem.rotation.z = 0.2 * (idx - 1);
          apple.add(stem);

          appleGroup.add(apple);
        });

        whisperWood.add(appleGroup);
        (window as any)._whispyApples = appleGroup;

        poiGroup.add(whisperWood);

      } else if (def.name === "🌸 Floralia Sky Gate") {
        const shrine = new THREE.Group();
        const gateMat = new THREE.MeshPhongMaterial({ color: 0xba68c8, flatShading: true });
        const goldMat = new THREE.MeshPhongMaterial({ color: 0xf1c40f, flatShading: true });
        
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 0.35), gateMat);
        p1.position.set(-1.6, 1.5, 0);
        shrine.add(p1);

        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 0.35), gateMat);
        p2.position.set(1.6, 1.5, 0);
        shrine.add(p2);

        const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 0.5), gateMat);
        beam.position.set(0, 3.0, 0);
        shrine.add(beam);

        const accentBeam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 0.4), goldMat);
        accentBeam.position.set(0, 2.5, 0);
        shrine.add(accentBeam);

        const miniStarShape = new THREE.Shape();
        const miniSpikes = 5;
        const oR = 0.28;
        const iR = 0.13;
        for (let i = 0; i < miniSpikes * 2; i++) {
          const angle = (i * Math.PI) / miniSpikes - Math.PI / 2;
          const radius = i % 2 === 0 ? oR : iR;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) miniStarShape.moveTo(x, y);
          else miniStarShape.lineTo(x, y);
        }
        miniStarShape.closePath();
        const starPlaqueGeo = new THREE.ExtrudeGeometry(miniStarShape, { depth: 0.05, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.01, bevelThickness: 0.01 });
        starPlaqueGeo.center();
        const starPlaque = new THREE.Mesh(starPlaqueGeo, goldMat);
        starPlaque.position.set(0, 3.2, 0.3);
        shrine.add(starPlaque);

        const chTrk = new THREE.Mesh(trunkGeo, trunkMat);
        chTrk.position.set(2.2, 0.5, -2.0);
        shrine.add(chTrk);
        
        const chLvs = new THREE.Mesh(cherryLeafGeo, cherryLeafMat);
        chLvs.position.set(2.2, 1.7, -2.0);
        chLvs.scale.setScalar(1.5);
        shrine.add(chLvs);

        poiGroup.add(shrine);

      } else if (def.name === "🏔️ Rainbow Resort Peak") {
        const obs = new THREE.Group();
        
        const d_baseMat = new THREE.MeshPhongMaterial({ color: 0xe8f8f5, flatShading: true });
        const d_base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.5, 6), d_baseMat);
        d_base.position.y = 0.75;
        obs.add(d_base);

        const d_dome = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 5), new THREE.MeshPhongMaterial({ color: 0x3f51b5, emissive: 0x1a237e, emissiveIntensity: 1.0, flatShading: true }));
        d_dome.position.y = 1.5;
        obs.add(d_dome);

        const goldMat = new THREE.MeshPhongMaterial({ color: 0xf1c40f, flatShading: true });
        const starPlateShape = new THREE.Shape();
        const sSpikes = 5;
        const outerR = 0.22;
        const innerR = 0.1;
        for (let i = 0; i < sSpikes * 2; i++) {
          const angle = (i * Math.PI) / sSpikes - Math.PI / 2;
          const radius = i % 2 === 0 ? outerR : innerR;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) starPlateShape.moveTo(x, y);
          else starPlateShape.lineTo(x, y);
        }
        starPlateShape.closePath();
        const starPlateGeo = new THREE.ExtrudeGeometry(starPlateShape, { depth: 0.04, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 });
        starPlateGeo.center();

        for (let s = 0; s < 4; s++) {
          const plate = new THREE.Mesh(starPlateGeo, goldMat);
          const angle = (s / 4) * Math.PI * 2;
          plate.position.set(Math.cos(angle) * 1.55, 0.7, Math.sin(angle) * 1.55);
          plate.rotation.y = -angle;
          obs.add(plate);
        }

        const telGroup = new THREE.Group();
        telGroup.position.set(0, 1.7, 0);
        telGroup.rotation.z = -Math.PI / 6;
        
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5), new THREE.MeshPhongMaterial({ color: 0xf1c40f, flatShading: true }));
        scope.position.y = 0.5;
        telGroup.add(scope);
        obs.add(telGroup);
        (window as any)._spinningTelescope = telGroup;

        poiGroup.add(obs);

      } else if (def.name === "🏰 Butter Building Tower") {
        const w_ridge = new THREE.Group();
        
        const baseMat = new THREE.MeshPhongMaterial({ color: 0xfff9c4, flatShading: true });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 2.8, 6), baseMat);
        base.position.y = 1.4;
        w_ridge.add(base);

        const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.82, 5, 4), new THREE.MeshPhongMaterial({ color: 0xec407a, flatShading: true }));
        topCap.position.y = 2.8;
        w_ridge.add(topCap);

        const millBlades = new THREE.Group();
        millBlades.position.set(0, 2.7, 0.9);
        const armatureMat = new THREE.MeshPhongMaterial({ color: 0xb71c1c, flatShading: true });
        const clothMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });

        const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.35), armatureMat);
        millBlades.add(core);

        const bladeStarShape = new THREE.Shape();
        const bSpikes = 5;
        const bOut = 0.24;
        const bIn = 0.11;
        for (let i = 0; i < bSpikes * 2; i++) {
          const angle = (i * Math.PI) / bSpikes - Math.PI / 2;
          const radius = i % 2 === 0 ? bOut : bIn;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) bladeStarShape.moveTo(x, y);
          else bladeStarShape.lineTo(x, y);
        }
        bladeStarShape.closePath();
        const bladeStarGeo = new THREE.ExtrudeGeometry(bladeStarShape, { depth: 0.04, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 });
        bladeStarGeo.center();
        const starMat = new THREE.MeshPhongMaterial({ color: 0xffeb3b, flatShading: true });

        for (let b = 0; b < 4; b++) {
          const armRot = new THREE.Group();
          armRot.rotation.z = (b / 4) * Math.PI * 2;
          
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1), armatureMat);
          spoke.position.y = 1.0;
          armRot.add(spoke);

          const canvasPanel = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.4, 0.03), clothMat);
          canvasPanel.position.set(0.22, 1.1, 0.05);
          armRot.add(canvasPanel);

          const tipStar = new THREE.Mesh(bladeStarGeo, starMat);
          tipStar.position.set(0, 2.05, 0.08);
          tipStar.rotation.z = Math.random() * 0.4;
          armRot.add(tipStar);

          millBlades.add(armRot);
        }
        w_ridge.add(millBlades);
        this.spinningBlades.push(millBlades);

        poiGroup.add(w_ridge);

      } else if (def.name === "🌋 Halcandra Ruins") {
        const ruins = new THREE.Group();
        const stoneMat = new THREE.MeshPhongMaterial({ color: 0x2e1a47, flatShading: true });
        for (let m = 0; m < 3; m++) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.0 + m * 0.5, 0.5), stoneMat);
          col.position.set(-1.4 + m * 1.4, (1.0 + m * 0.25), (Math.random() - 0.5) * 1.2);
          col.rotation.set(Math.random() * 0.1, Math.random() * 0.25, Math.random() * 0.1);
          ruins.add(col);
        }

        const crownGroup = new THREE.Group();
        crownGroup.position.set(0, 2.0, 0);

        const goldCrownMat = new THREE.MeshPhongMaterial({
          color: 0xffdd44,
          emissive: 0xff7700,
          emissiveIntensity: 3.5,
          flatShading: true
        });

        const crownRing = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.15, 6), goldCrownMat);
        crownGroup.add(crownRing);

        for (let s = 0; s < 4; s++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), goldCrownMat);
          const sAngle = (s / 4) * Math.PI * 2;
          spike.position.set(Math.cos(sAngle) * 0.3, 0.22, Math.sin(sAngle) * 0.3);
          spike.rotation.x = 0.2;
          spike.rotation.z = -0.2;
          crownGroup.add(spike);
        }

        const crownGemShape = new THREE.Shape();
        const cSpikes = 5;
        const cOn = 0.18;
        const cIn = 0.08;
        for (let i = 0; i < cSpikes * 2; i++) {
          const angle = (i * Math.PI) / cSpikes - Math.PI / 2;
          const radius = i % 2 === 0 ? cOn : cIn;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) crownGemShape.moveTo(x, y);
          else crownGemShape.lineTo(x, y);
        }
        crownGemShape.closePath();
        const crownGemGeo = new THREE.ExtrudeGeometry(crownGemShape, { depth: 0.03, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.002, bevelThickness: 0.002 });
        crownGemGeo.center();

        const crownGemMesh = new THREE.Mesh(crownGemGeo, new THREE.MeshPhongMaterial({ color: 0x00e5ff, emissive: 0x0091ea, emissiveIntensity: 2.0, flatShading: true }));
        crownGemMesh.position.set(0, 0, 0.25);
        crownGroup.add(crownGemMesh);

        ruins.add(crownGroup);
        (window as any)._floatingLantern = crownGroup;

        poiGroup.add(ruins);

      } else if (def.name === "💎 Great Cave Offensive") {
        const ab = new THREE.Group();
        
        const crystalMaterials = [
          new THREE.MeshPhongMaterial({ color: 0xe91e63, emissive: 0x880e4f, emissiveIntensity: 3.0, flatShading: true }),
          new THREE.MeshPhongMaterial({ color: 0x00e676, emissive: 0x1b5e20, emissiveIntensity: 3.0, flatShading: true }),
          new THREE.MeshPhongMaterial({ color: 0xffeb3b, emissive: 0xf57f17, emissiveIntensity: 3.0, flatShading: true }),
          new THREE.MeshPhongMaterial({ color: 0x29b6f6, emissive: 0x01579b, emissiveIntensity: 3.0, flatShading: true })
        ];

        const geoOct = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), crystalMaterials[0]);
        geoOct.position.y = 0.9;
        geoOct.rotation.set(0.3, 0.5, 0.2);
        ab.add(geoOct);

        for (let e = 0; e < 4; e++) {
          const sideGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), crystalMaterials[(e + 1) % crystalMaterials.length]);
          const angle = (e / 4) * Math.PI * 2;
          sideGem.position.set(Math.cos(angle) * 1.8, 0.3, Math.sin(angle) * 1.8);
          sideGem.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
          ab.add(sideGem);
        }
        poiGroup.add(ab);

      } else {
        const pier = new THREE.Group();
        const plankMat = new THREE.MeshPhongMaterial({ color: 0x873a5c, flatShading: true });
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 3.6), plankMat);
        board.position.set(0, 1.0, 1.4);
        board.castShadow = true;
        pier.add(board);

        const supp1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 4), plankMat);
        supp1.position.set(-0.3, 0.5, 1.1);
        pier.add(supp1);

        const supp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 4), plankMat);
        supp2.position.set(0.3, 0.5, 1.1);
        pier.add(supp2);

        const starShape = new THREE.Shape();
        const spikes = 5;
        const outerRadius = 0.8;
        const innerRadius = 0.38;
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (i === 0) starShape.moveTo(x, y);
          else starShape.lineTo(x, y);
        }
        starShape.closePath();
        const starExtrudeSettings = { depth: 0.18, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
        const starGeo = new THREE.ExtrudeGeometry(starShape, starExtrudeSettings);
        starGeo.center();
        starGeo.rotateX(Math.PI / 2);

        const warpStarMat = new THREE.MeshPhongMaterial({
          color: 0xffd700,
          emissive: 0xffaa00,
          emissiveIntensity: 1.5,
          flatShading: true
        });
        const warpStarMesh = new THREE.Mesh(starGeo, warpStarMat);
        warpStarMesh.position.set(0, 1.35, 3.2);
        warpStarMesh.castShadow = true;
        pier.add(warpStarMesh);
        (window as any)._floatingPaperBoat = warpStarMesh;

        pier.add(warpStarMesh);
        poiGroup.add(pier);
      }

      const beaconGeo = new THREE.OctahedronGeometry(0.42, 0);
      const beaconMat = new THREE.MeshPhongMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.85,
        flatShading: true
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 5.2;
      poiGroup.add(beacon);

      this.groundGroup.add(poiGroup);

      globePOIs.push({
        group: poiGroup,
        beacon: beacon,
        name: def.name,
        color: def.color,
        icon: def.icon,
        desc: def.desc,
        discovered: false
      });
    }

    // 6. Asynchronous KayKit asset populator
    const gltfLoader = new GLTFLoader();
    const loadedAssets: { [key: string]: THREE.Group } = {};

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

    return Promise.all([
      loadAsset("pine", "KayKit/decoration/nature/tree_single_A.gltf"),
      loadAsset("deciduous", "KayKit/decoration/nature/tree_single_B.gltf"),
      loadAsset("rockB", "KayKit/decoration/nature/rock_single_B.gltf"),
      loadAsset("rockC", "KayKit/decoration/nature/rock_single_C.gltf"),
      loadAsset("windmill", "KayKit/buildings/blue/building_windmill_blue.gltf"),
      loadAsset("houseA_blue", "KayKit/buildings/blue/building_home_A_blue.gltf"),
      loadAsset("houseA_red", "KayKit/buildings/red/building_home_A_red.gltf"),
      loadAsset("houseA_green", "KayKit/buildings/green/building_home_A_green.gltf"),
      loadAsset("houseA_yellow", "KayKit/buildings/yellow/building_home_A_yellow.gltf"),
      loadAsset("houseB_blue", "KayKit/buildings/blue/building_home_B_blue.gltf"),
      loadAsset("houseB_red", "KayKit/buildings/red/building_home_B_red.gltf"),
      loadAsset("houseB_green", "KayKit/buildings/green/building_home_B_green.gltf"),
      loadAsset("houseB_yellow", "KayKit/buildings/yellow/building_home_B_yellow.gltf"),
      loadAsset("tower_blue", "KayKit/buildings/blue/building_tower_A_blue.gltf"),
      loadAsset("tower_red", "KayKit/buildings/red/building_tower_A_red.gltf"),
      loadAsset("well", "KayKit/buildings/blue/building_well_blue.gltf"),
      loadAsset("waterlily", "KayKit/decoration/nature/waterlily_A.gltf"),
      loadAsset("waterplant", "KayKit/decoration/nature/waterplant_A.gltf"),
      loadAsset("tent", "KayKit/decoration/props/tent.gltf"),
      loadAsset("barrel", "KayKit/decoration/props/barrel.gltf"),
      loadAsset("target", "KayKit/decoration/props/target.gltf"),
      loadAsset("tileGrass", "KayKit/tiles/base/hex_grass.gltf"),
      loadAsset("tileWater", "KayKit/tiles/base/hex_water.gltf"),
      loadAsset("tileSlope", "KayKit/tiles/base/hex_grass_sloped_low.gltf"),
    ]).then(() => {
      groundTileHolders.forEach((tileGroup) => {
        const { isPentagon, biome, uIdx } = tileGroup.userData;
        let model: THREE.Group | null = null;

        const tileInfo = tilesData[uIdx];
        let cellScale = 7.5;
        if (tileInfo && tileInfo.vertices && tileInfo.vertices.length > 0) {
          const cornerNorm = tileInfo.vertices[0];
          const centerNorm = tileInfo.center;
          const centerPt = centerNorm.clone().multiplyScalar(planetRadius);
          const cornerPt = cornerNorm.clone().multiplyScalar(planetRadius);
          cellScale = centerPt.distanceTo(cornerPt) * 1.15;
        }

        if (isPentagon) {
          if (biome === "mountain" && loadedAssets.pine) {
            model = loadedAssets.pine.clone();
            model.scale.setScalar(cellScale * 3.0);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                const color = child.material.color;
                if (color && color.g > color.r) {
                  child.material.color.setHex(0xf2f4f4);
                  child.material.emissive.setHex(0xaaaaaa);
                  child.material.emissiveIntensity = 0.25;
                }
              }
            });
          } else if (biome === "sand" && loadedAssets.rockB) {
            model = loadedAssets.rockB.clone();
            model.scale.setScalar(cellScale * 3.5);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                child.material.color.setHex(0xba4a00);
              }
            });
          } else if (loadedAssets.tower_blue) {
            model = loadedAssets.tower_blue.clone();
            model.scale.setScalar(cellScale * 2.8);
          }
        } else {
          if (biome === "water") {
            // Empty water core
          } else if (biome === "mountain" || biome === "hill") {
            const useSlope = Math.random() < 0.25;
            const tileModel = useSlope ? loadedAssets.tileSlope : loadedAssets.tileGrass;
            if (tileModel) {
              model = tileModel.clone();
              model.scale.setScalar(cellScale);
            }
          } else {
            if (loadedAssets.tileGrass) {
              model = loadedAssets.tileGrass.clone();
              model.scale.setScalar(cellScale);
            }
          }
        }

        if (model) {
          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              child.material = child.material.clone();
              
              const color = child.material.color;
              
              if (biome === "mountain") {
                if (color && (color.g > color.r || color.r > 0.8)) {
                  child.material.color.setHex(0xf2f4f4);
                }
              } else if (biome === "sand") {
                if (color && color.g > color.r) {
                  child.material.color.setHex(0xf5b041);
                } else if (color) {
                  child.material.color.setHex(0xba4a00);
                }
              } else if (biome === "hill") {
                if (color && color.g > color.r) {
                  child.material.color.setHex(0x196f3d);
                } else if (color) {
                  child.material.color.setHex(0x4a235a);
                }
              } else {
                if (color && color.g > color.r) {
                  child.material.color.setHex(0x52be80);
                } else if (color) {
                  child.material.color.setHex(0x5c4033);
                }
              }
            }
          });
          tileGroup.add(model);
        }
      });

      propHolders.forEach((propBase) => {
        const { selectedType, biome, cellScale, baseScale } = propBase.userData;
        let model: THREE.Group | null = null;
        const scaleVal = (cellScale || 7.5) * (baseScale || 1.0);

        if (selectedType === "pine") {
          if (loadedAssets.pine) {
            model = loadedAssets.pine.clone();
            model.scale.setScalar(scaleVal * 2.8);
            if (biome === "mountain") {
              model.traverse((child: any) => {
                if (child.isMesh) {
                  child.material = child.material.clone();
                  const color = child.material.color;
                  if (color && color.g > color.r && color.g > color.b) {
                    child.material.color.setHex(0xf2f4f4);
                    child.material.emissive.setHex(0xaaaaaa);
                    child.material.emissiveIntensity = 0.25;
                    this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.25, type: "snow" });
                  }
                }
              });
            }
          }
        } else if (selectedType === "jungle_tree") {
          if (loadedAssets.deciduous) {
            model = loadedAssets.deciduous.clone();
            model.scale.setScalar(scaleVal * 2.8);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                const color = child.material.color;
                if (color && color.g > color.r) {
                  child.material.color.setHex(0x196f3d);
                  child.material.emissive.setHex(0x0e3a1f);
                  child.material.emissiveIntensity = 0.25;
                  this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.25, type: "jungle" });
                }
              }
            });
          }
        } else if (selectedType === "cherry_blossom") {
          if (loadedAssets.deciduous) {
            model = loadedAssets.deciduous.clone();
            model.scale.setScalar(scaleVal * 2.6);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                const color = child.material.color;
                if (color && color.g > color.r) {
                  child.material.color.setHex(0xff69b4);
                  child.material.emissive.setHex(0x440011);
                  child.material.emissiveIntensity = 0.35;
                  this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.35, type: "cherry" });
                }
              }
            });
          }
        } else if (selectedType === "autumn_birch") {
          if (loadedAssets.deciduous) {
            model = loadedAssets.deciduous.clone();
            model.scale.setScalar(scaleVal * 2.6);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                const color = child.material.color;
                if (color && color.g > color.r) {
                  child.material.color.setHex(0xe67e22);
                  child.material.emissive.setHex(0x3e1804);
                  child.material.emissiveIntensity = 0.2;
                  this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.2, type: "autumn" });
                }
              }
            });
          }
        } else if (selectedType === "rock") {
          const rockModel = Math.random() < 0.5 ? loadedAssets.rockB : loadedAssets.rockC;
          if (rockModel) {
            model = rockModel.clone();
            model.scale.setScalar(scaleVal * 2.4);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                if (biome === "sand") {
                  child.material.color.setHex(0xba4a00);
                } else if (biome === "mountain") {
                  child.material.color.setHex(0xd5dbdb);
                }
              }
            });
          }
        } else if (selectedType === "waterlily") {
          if (loadedAssets.waterlily) {
            model = loadedAssets.waterlily.clone();
            model.scale.setScalar(scaleVal * 1.8);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                child.material.emissive = new THREE.Color(0x00ffcc);
                child.material.emissiveIntensity = 0.25;
                this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.25, type: "waterlily" });
              }
            });
          }
        } else if (selectedType === "waterplant") {
          if (loadedAssets.waterplant) {
            model = loadedAssets.waterplant.clone();
            model.scale.setScalar(scaleVal * 1.8);
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.material = child.material.clone();
                child.material.emissive = new THREE.Color(0x00ccaa);
                child.material.emissiveIntensity = 0.2;
                this.bioluminescentMeshes.push({ mesh: child, baseIntensity: 0.2, type: "waterplant" });
              }
            });
          }
        } else if (selectedType === "windmill") {
          if (loadedAssets.windmill) {
            model = loadedAssets.windmill.clone();
            model.scale.setScalar(scaleVal * 2.8);
            
            let bladesGroup: THREE.Object3D | null = null;
            model.traverse((child) => {
              if (child.name.toLowerCase().includes("propeller") || 
                  child.name.toLowerCase().includes("rotor") || 
                  child.name.toLowerCase().includes("wheel") || 
                  child.name.toLowerCase().includes("blade") || 
                  child.name.toLowerCase().includes("sail")) {
                bladesGroup = child;
              }
            });
            if (!bladesGroup) {
              model.traverse((child) => {
                if (child.name.toLowerCase().includes("windmill") && !child.name.toLowerCase().includes("tower") && !child.name.toLowerCase().includes("base")) {
                  bladesGroup = child;
                }
              });
            }
            if (bladesGroup) {
              this.spinningBlades.push(bladesGroup);
            }

            if (loadedAssets.barrel && Math.random() < 0.5) {
              const barrel = loadedAssets.barrel.clone();
              barrel.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              barrel.position.set(Math.cos(angle) * 1.6 * scaleVal, 0, Math.sin(angle) * 1.6 * scaleVal);
              propBase.add(barrel);
            }
          }
        } else if (selectedType === "cottage") {
          const houses = [
            loadedAssets.houseA_blue, loadedAssets.houseA_red, loadedAssets.houseA_green, loadedAssets.houseA_yellow,
            loadedAssets.houseB_blue, loadedAssets.houseB_red, loadedAssets.houseB_green, loadedAssets.houseB_yellow
          ].filter(Boolean);
          if (houses.length > 0) {
            const houseModel = houses[Math.floor(Math.random() * houses.length)];
            model = houseModel.clone();
            model.scale.setScalar(scaleVal * 2.4);

            if (loadedAssets.barrel && Math.random() < 0.6) {
              const barrel = loadedAssets.barrel.clone();
              barrel.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              const dist = 1.6 + Math.random() * 0.2;
              barrel.position.set(Math.cos(angle) * dist * scaleVal, 0, Math.sin(angle) * dist * scaleVal);
              barrel.rotation.y = Math.random() * Math.PI;
              propBase.add(barrel);
            }
            if (loadedAssets.target && Math.random() < 0.3) {
              const target = loadedAssets.target.clone();
              target.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              const dist = 1.8 + Math.random() * 0.2;
              target.position.set(Math.cos(angle) * dist * scaleVal, 0.05 * scaleVal, Math.sin(angle) * dist * scaleVal);
              target.rotation.y = Math.random() * Math.PI;
              propBase.add(target);
            }
          }
        } else if (selectedType === "tower") {
          const towers = [loadedAssets.tower_blue, loadedAssets.tower_red].filter(Boolean);
          if (towers.length > 0) {
            const towerModel = towers[Math.floor(Math.random() * towers.length)];
            model = towerModel.clone();
            model.scale.setScalar(scaleVal * 2.8);

            if (loadedAssets.barrel && Math.random() < 0.6) {
              const barrel = loadedAssets.barrel.clone();
              barrel.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              barrel.position.set(Math.cos(angle) * 1.6 * scaleVal, 0, Math.sin(angle) * 1.6 * scaleVal);
              propBase.add(barrel);
            }
          }
        } else if (selectedType === "well") {
          if (loadedAssets.well) {
            model = loadedAssets.well.clone();
            model.scale.setScalar(scaleVal * 2.2);

            if (loadedAssets.barrel && Math.random() < 0.5) {
              const barrel = loadedAssets.barrel.clone();
              barrel.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              barrel.position.set(Math.cos(angle) * 1.25 * scaleVal, 0, Math.sin(angle) * 1.25 * scaleVal);
              propBase.add(barrel);
            }
          }
        } else if (selectedType === "tent") {
          if (loadedAssets.tent) {
            model = loadedAssets.tent.clone();
            model.scale.setScalar(scaleVal * 2.4);

            if (loadedAssets.barrel && Math.random() < 0.5) {
              const barrel = loadedAssets.barrel.clone();
              barrel.scale.setScalar(scaleVal * 0.4);
              const angle = Math.random() * Math.PI * 2;
              barrel.position.set(Math.cos(angle) * 1.35 * scaleVal, 0, Math.sin(angle) * 1.35 * scaleVal);
              propBase.add(barrel);
            }
          }
        }

        if (model) {
          if (selectedType === "cottage" || selectedType === "tower" || selectedType === "well" || selectedType === "windmill") {
            model.traverse((child: any) => {
              if (child.isMesh) {
                const name = child.name.toLowerCase();
                const color = child.material?.color;
                if (
                  name.includes("window") || 
                  name.includes("glass") || 
                  name.includes("lantern") || 
                  name.includes("light") ||
                  name.includes("glow") ||
                  (color && color.r > 0.8 && color.g > 0.6 && color.b < 0.4)
                ) {
                  child.material = child.material.clone();
                  child.material.emissive.setHex(0xff9911);
                  child.material.emissiveIntensity = 0.0;
                  this.glowingWindows.push(child);
                }
              }
            });
          }

          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          propBase.add(model);
        }
      });
    });
  }
}
