import * as THREE from "three";

export interface ParticleSlot {
  mesh: THREE.Mesh;
  active: boolean;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
  scaleMultiplier: number;
}

export class ParticleSystem {
  public pool: ParticleSlot[] = [];
  public poolGroup = new THREE.Group();
  private nextPoolIndex = 0;
  private maxParticlesCount = 270;

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
    scaleMultiplier: number = 1.0
  ) {
    let slot = this.pool.find((p) => !p.active);
    if (!slot) {
      slot = this.pool[this.nextPoolIndex];
      this.nextPoolIndex = (this.nextPoolIndex + 1) % this.maxParticlesCount;
    }

    slot.active = true;
    slot.life = life;
    slot.maxLife = maxLife;
    slot.vel.copy(vel);
    slot.scaleMultiplier = scaleMultiplier;

    slot.mesh.geometry = geo;
    slot.mesh.material = mat;
    slot.mesh.position.copy(pos);
    slot.mesh.scale.setScalar(scaleMultiplier);
    slot.mesh.visible = true;
  }

  public update(dt: number) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
        const scale = Math.max(0, p.life / p.maxLife) * (p.scaleMultiplier || 1.0);
        p.mesh.scale.setScalar(scale);
        p.mesh.rotation.x += dt * 4;
        p.mesh.rotation.y += dt * 4;
      }
    }
  }
}
