import * as THREE from "three";
import React from "react";

// MANDATORY INTEGRITY WARNING:
// DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

export class CelestialSystem {
  public celestialGroup = new THREE.Group();
  public skyDome!: THREE.Mesh;
  public starsGroup = new THREE.Group();
  public starsList: any[] = [];
  public sunHaloMesh!: THREE.Mesh;
  public sunHaloOuterMesh!: THREE.Mesh;
  public sunMesh!: THREE.Mesh;
  public moonMesh!: THREE.Mesh;

  constructor() {}

  public init(scene: THREE.Scene) {
    this.celestialGroup.name = "CelestialGroup";
    scene.add(this.celestialGroup);

    // Sun Sphere
    const sunGeo = new THREE.SphereGeometry(15, 8, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaed });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 320, 0);

    // Sun Halos
    const sunHaloGeo = new THREE.SphereGeometry(32, 16, 16);
    this.sunHaloMesh = new THREE.Mesh(sunHaloGeo, new THREE.MeshBasicMaterial({
      color: 0xffe8a1,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.sunMesh.add(this.sunHaloMesh);
    (window as any)._sunHaloMesh = this.sunHaloMesh;

    const sunHaloOuterGeo = new THREE.SphereGeometry(65, 16, 16);
    this.sunHaloOuterMesh = new THREE.Mesh(sunHaloOuterGeo, new THREE.MeshBasicMaterial({
      color: 0xff9900,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    this.sunMesh.add(this.sunHaloOuterMesh);
    (window as any)._sunHaloOuterMesh = this.sunHaloOuterMesh;

    this.celestialGroup.add(this.sunMesh);

    // Moon Sphere
    const moonGeo = new THREE.SphereGeometry(11, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0x9be2ff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(0, -320, 0);
    this.celestialGroup.add(this.moonMesh);
    (window as any)._celestialGroup = this.celestialGroup;

    // Sky Dome
    const skyDomeGeo = new THREE.SphereGeometry(390, 16, 12);
    const skyDomeMat = new THREE.MeshBasicMaterial({
      color: 0x0a0516,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
      fog: false,
      depthWrite: false,
    });
    this.skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
    scene.add(this.skyDome);
    (window as any)._skyDome = this.skyDome;

    // Twinkling Star Field
    const starGeo = new THREE.OctahedronGeometry(0.5, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      fog: false,
    });
    const starCount = 150;
    for (let s = 0; s < starCount; s++) {
      const star = new THREE.Mesh(starGeo, starMat.clone());
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      const radius = 370 + Math.random() * 15;
      star.position.setFromSphericalCoords(radius, phi, theta);
      star.scale.setScalar(0.4 + Math.random() * 1.6);
      this.starsGroup.add(star);
      this.starsList.push({
        mesh: star,
        baseScale: 0.4 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 1.8,
      });
    }
    scene.add(this.starsGroup);
    (window as any)._starsGroup = this.starsGroup;
    (window as any)._starsList = this.starsList;
  }

  public update(
    dt: number,
    elapsedTime: number,
    angle: number,
    dirLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    scene: THREE.Scene,
    globeDayNightTextRef: React.RefObject<HTMLSpanElement | null>
  ) {
    dirLight.position.set(
      Math.sin(angle) * 180,
      Math.cos(angle) * 140,
      Math.cos(angle) * 100
    );
    this.celestialGroup.rotation.z = angle;

    const targetSunColor = new THREE.Color();
    const targetHemiSky = new THREE.Color();
    const targetHemiGround = new THREE.Color();
    const targetFogColor = new THREE.Color();
    let targetSunIntensity = 1.25;
    let targetHemiIntensity = 0.8;
    let phaseText = "Afternoon";

    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    if (sinA > 0.45) {
      targetSunColor.setHex(0xfffaed);
      targetHemiSky.setHex(0xd6eaf8);
      targetHemiGround.setHex(0xebf2fa);
      targetFogColor.setHex(0x5dade2);
      targetSunIntensity = 1.35;
      targetHemiIntensity = 0.95;
      phaseText = "☀️ Sunny Midday";
    } else if (sinA < -0.45) {
      targetSunColor.setHex(0x5ca0e6);
      targetHemiSky.setHex(0x140e2b);
      targetHemiGround.setHex(0x0b0818);
      targetFogColor.setHex(0x080614);
      targetSunIntensity = 0.65;
      targetHemiIntensity = 0.55;
      phaseText = "🌌 Cosmic Night";
    } else {
      if (cosA > 0) {
        targetSunColor.setHex(0xfb8c00);
        targetHemiSky.setHex(0xffcc80);
        targetHemiGround.setHex(0x3e1f47);
        targetFogColor.setHex(0x3e1d2b);
        targetSunIntensity = 1.1;
        targetHemiIntensity = 0.75;
        phaseText = "🌅 Golden Dawn";
      } else {
        targetSunColor.setHex(0xe74c3c);
        targetHemiSky.setHex(0x9b59b6);
        targetHemiGround.setHex(0x2a1428);
        targetFogColor.setHex(0x21122a);
        targetSunIntensity = 1.0;
        targetHemiIntensity = 0.7;
        phaseText = "🌇 Cozy Dusk";
      }
    }

    if (this.skyDome && this.skyDome.material) {
      const mat = this.skyDome.material as THREE.MeshBasicMaterial;
      mat.color.lerp(targetFogColor, 3.5 * dt);
      
      let targetSkyOpacity = 1.0;
      if (sinA > 0.45) {
        targetSkyOpacity = 1.0;
      } else if (sinA < -0.45) {
        targetSkyOpacity = 0.02;
      } else {
        const normalized = (sinA + 0.45) / 0.9;
        targetSkyOpacity = THREE.MathUtils.lerp(0.02, 1.0, Math.max(0, Math.min(1, normalized)));
      }
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetSkyOpacity, 3.5 * dt);
    }

    if (this.starsGroup) {
      let targetStarOpacity = 0.0;
      if (sinA < 0.2) {
        const n = (0.2 - sinA) / 0.7;
        targetStarOpacity = Math.max(0.0, Math.min(0.95, n));
      } else {
        targetStarOpacity = 0.0;
      }

      this.starsList.forEach((star: any) => {
        if (star.mesh && star.mesh.material) {
          const twinkle = 0.55 + 0.45 * Math.sin(elapsedTime * star.speed + star.phase);
          star.mesh.material.opacity = THREE.MathUtils.lerp(star.mesh.material.opacity, targetStarOpacity * twinkle, 2.5 * dt);
          const pulse = 1.0 + 0.15 * Math.cos(elapsedTime * star.speed * 0.8 + star.phase);
          star.mesh.scale.setScalar(star.baseScale * pulse);
        }
      });
    }

    const cloudPuffMat = (window as any)._cloudPuffMat;
    const wispyMat = (window as any)._wispyMat;
    if (cloudPuffMat) {
      const targetCloudColor = new THREE.Color();
      if (sinA > 0.45) {
        targetCloudColor.setHex(0xfffefe);
      } else if (sinA < -0.45) {
        targetCloudColor.setHex(0x272140);
      } else {
        if (cosA > 0) {
          targetCloudColor.setHex(0xffcb9a);
        } else {
          targetCloudColor.setHex(0xe098cb);
        }
      }
      cloudPuffMat.color.lerp(targetCloudColor, 3.5 * dt);
    }

    if (wispyMat) {
      const targetWispyColor = new THREE.Color();
      if (sinA > 0.45) {
        targetWispyColor.setHex(0xfaf3ff);
      } else if (sinA < -0.45) {
        targetWispyColor.setHex(0x18142a);
      } else {
        if (cosA > 0) {
          targetWispyColor.setHex(0xffd5cd);
        } else {
          targetWispyColor.setHex(0xfa7d9a);
        }
      }
      wispyMat.color.lerp(targetWispyColor, 3.5 * dt);
    }

    if (scene.fog && scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(targetFogColor, 3.5 * dt);
    }
    dirLight.color.lerp(targetSunColor, 3.5 * dt);
    dirLight.intensity = THREE.MathUtils.lerp(dirLight.intensity, targetSunIntensity, 3.5 * dt);
    hemiLight.color.lerp(targetHemiSky, 3.5 * dt);
    hemiLight.groundColor.lerp(targetHemiGround, 3.5 * dt);
    hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, targetHemiIntensity, 3.5 * dt);

    if (this.sunHaloMesh && this.sunHaloMesh.material) {
      const mat = this.sunHaloMesh.material as THREE.MeshBasicMaterial;
      const sunVisibleFactor = Math.max(0, Math.min(1, sinA / 0.45));
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, sunVisibleFactor * 0.28, 3.5 * dt);
    }
    if (this.sunHaloOuterMesh && this.sunHaloOuterMesh.material) {
      const mat = this.sunHaloOuterMesh.material as THREE.MeshBasicMaterial;
      const sunVisibleFactor = Math.max(0, Math.min(1, sinA / 0.45));
      const outerBase = 0.08 + 0.02 * Math.sin(elapsedTime * 1.5);
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, sunVisibleFactor * outerBase, 3.5 * dt);
    }

    const nightFactor = Math.max(0, Math.min(1, (-sinA + 0.35) / 0.8));
    const biolumPulse = 0.85 + 0.15 * Math.sin(elapsedTime * 2.2);

    const glowingWindows = (window as any)._glowingWindows;
    if (glowingWindows) {
      glowingWindows.forEach((child: any) => {
        if (child.material) {
          child.material.emissiveIntensity = THREE.MathUtils.lerp(child.material.emissiveIntensity, nightFactor * 2.2, 3.5 * dt);
        }
      });
    }

    const bioluminescentMeshes = (window as any)._bioluminescentMeshes;
    if (bioluminescentMeshes) {
      bioluminescentMeshes.forEach((item: any) => {
        if (item.mesh && item.mesh.material) {
          const nightBoost = item.type === "crystal" ? 1.5 : 2.5;
          const targetIntensity = item.baseIntensity * (1.0 + nightFactor * nightBoost) * biolumPulse;
          item.mesh.material.emissiveIntensity = THREE.MathUtils.lerp(item.mesh.material.emissiveIntensity, targetIntensity, 3.5 * dt);
        }
      });
    }

    if (globeDayNightTextRef.current) {
      globeDayNightTextRef.current.innerText = phaseText;
    }
  }
}
