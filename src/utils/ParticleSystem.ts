import * as THREE from "three";

export interface ParticleSlot {
  mesh: THREE.Mesh;
  active: boolean;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
  scaleMultiplier: number;
  stretchFactor?: number;
  drag?: number;
}

export class ParticleSystem {
  public pool: ParticleSlot[] = [];
  public poolGroup = new THREE.Group();
  private nextPoolIndex = 0;
  private maxParticlesCount = 600;

  constructor(scene: THREE.Scene, defaultGeo: THREE.BufferGeometry, defaultMat: THREE.Material) {
    this.poolGroup.name = "ParticlePoolGroup";
    scene.add(this.poolGroup);

    for (let i = 0; i < this.maxParticlesCount; i++) {
      const pm = new THREE.Mesh(defaultGeo, defaultMat);
      pm.visible = false;
      this.poolGroup.add(pm);
      this.pool.push({
        mesh: pm,
        active: false,
        life: 0,
        maxLife: 0,
        vel: new THREE.Vector3(),
        scaleMultiplier: 1.0,
        stretchFactor: 0.0,
        drag: 0.0,
      });
    }
  }

  public addSpawningParticle(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    maxLife: number,
    life: number = maxLife,
    scaleMultiplier: number = 1.0,
    stretchFactor: number = 0.0,
    drag: number = 0.0
  ): THREE.Mesh {
    let slot = this.pool.find((p) => !p.active);
    if (!slot) {
      slot = this.pool[this.nextPoolIndex];
      this.nextPoolIndex = (this.nextPoolIndex + 1) % this.maxParticlesCount;
    }

    slot.active = true;
    slot.life = life !== undefined ? life : maxLife;
    slot.maxLife = maxLife;
    slot.vel.copy(vel);
    slot.scaleMultiplier = scaleMultiplier;
    slot.stretchFactor = stretchFactor;
    slot.drag = drag;

    slot.mesh.geometry = geo;
    slot.mesh.material = mat;
    slot.mesh.position.copy(pos);
    slot.mesh.scale.setScalar(scaleMultiplier);
    slot.mesh.visible = true;

    return slot.mesh;
  }

  public update(dt: number, camera?: THREE.Camera) {
    const clampedDt = Math.min(dt, 0.1);

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= clampedDt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        if (p.drag && p.drag > 0) {
          p.vel.multiplyScalar(Math.max(0, 1.0 - p.drag * clampedDt * 60.0));
        }
        p.mesh.position.addScaledVector(p.vel, clampedDt);
        const scale = Math.max(0, p.life / p.maxLife) * (p.scaleMultiplier || 1.0);
        
        if (camera) {
          if (p.stretchFactor && p.stretchFactor > 0 && p.vel.lengthSq() > 0.001) {
            const lookDir = new THREE.Vector3().subVectors(camera.position, p.mesh.position).normalize();
            const velDir = p.vel.clone().normalize();
            const right = new THREE.Vector3().crossVectors(velDir, lookDir).normalize();
            const up = new THREE.Vector3().crossVectors(lookDir, right).normalize();
            
            const m = new THREE.Matrix4();
            m.makeBasis(right, up, lookDir);
            p.mesh.quaternion.setFromRotationMatrix(m);
            
            const speed = p.vel.length();
            const stretch = 1.0 + speed * p.stretchFactor;
            p.mesh.scale.set(scale, scale * stretch, scale);
          } else {
            // Billboarding: make 2D planes face the camera directly
            p.mesh.quaternion.copy(camera.quaternion);
            // Apply a gentle Z-axis spin for rolling rotation
            p.mesh.rotateZ(p.life * 2.0);
            p.mesh.scale.setScalar(scale);
          }
        } else {
          // Fallback rotation for standard 3D meshes (boxes)
          p.mesh.rotation.x += clampedDt * 4;
          p.mesh.rotation.y += clampedDt * 4;
          p.mesh.scale.setScalar(scale);
        }
      }
    }
  }
}
