import * as THREE from 'three';
import { CombatEvent } from '../../types/game';

export interface VfxParticle {
  mesh: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  lifetime: number;
  maxLifetime: number;
  initialScale: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  color?: string;
  updateVfx?: (progress: number, delta: number) => void;
}

export class Spells3DFXEngine {
  private scene: THREE.Scene;
  private particles: VfxParticle[] = [];
  private stardustFieldGroup: THREE.Group | null = null;
  private stardustMotes: { mesh: THREE.Mesh; basePos: THREE.Vector3; phase: number; speed: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(delta: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += delta;
      const progress = Math.min(1.0, p.lifetime / p.maxLifetime);

      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;

      p.mesh.rotation.x += p.rotSpeedX * delta;
      p.mesh.rotation.y += p.rotSpeedY * delta;
      p.mesh.rotation.z += p.rotSpeedZ * delta;

      if (p.updateVfx) {
        p.updateVfx(progress, delta);
      }

      if (progress >= 1.0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Update Stardust Drift Field if active
    if (this.stardustFieldGroup && this.stardustMotes.length > 0) {
      const time = Date.now() * 0.001;
      for (const mote of this.stardustMotes) {
        mote.mesh.position.x = mote.basePos.x + Math.sin(time * mote.speed + mote.phase) * 0.45;
        mote.mesh.position.y = mote.basePos.y + Math.cos(time * (mote.speed * 1.2) + mote.phase) * 0.35;
        mote.mesh.position.z = mote.basePos.z + Math.sin(time * (mote.speed * 0.8) + mote.phase) * 0.45;
      }
    }
  }

  // --- STARDUST DRIFT FIELD (Utevo Lux / Utevo Gran Lux) ---
  public updateStardustField(playerPos: { x: number; y: number; z: number }, active: boolean, isGreat: boolean) {
    if (!active) {
      if (this.stardustFieldGroup) {
        this.scene.remove(this.stardustFieldGroup);
        this.stardustFieldGroup = null;
        this.stardustMotes = [];
      }
      return;
    }

    const radius = isGreat ? 38.0 : 22.0;
    const particleCount = 160;

    if (!this.stardustFieldGroup) {
      this.stardustFieldGroup = new THREE.Group();
      this.stardustMotes = [];

      const geo = new THREE.OctahedronGeometry(0.06, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: isGreat ? 0xfff8db : 0xfffae0,
        transparent: true,
        opacity: 0.85,
      });

      for (let i = 0; i < particleCount; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        const r = Math.random() * radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;

        const basePos = new THREE.Vector3(
          r * Math.cos(phi) * Math.sin(theta),
          Math.random() * 3.5 + 0.2,
          r * Math.cos(phi) * Math.cos(theta)
        );

        mesh.position.copy(basePos);
        this.stardustFieldGroup.add(mesh);
        this.stardustMotes.push({
          mesh,
          basePos,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 1.5 + 0.8,
        });
      }

      this.scene.add(this.stardustFieldGroup);
    }

    if (this.stardustFieldGroup) {
      this.stardustFieldGroup.position.set(playerPos.x, 0, playerPos.z);
    }
  }

  // --- SPELL VFX GENERATORS ---

  public spawnSpellVFX(evt: CombatEvent, triggerScreenShake: (intensity: number, duration: number) => void) {
    const spellId = evt.spellId || '';
    const vfxType = evt.vfxType || 'spell_aoe';

    if (
      vfxType === 'light_spell' ||
      vfxType === 'great_light_spell' ||
      spellId === 'utevo_lux' ||
      spellId === 'utevo_gran_lux'
    ) {
      this.spawnUtevoLuxIgnition(evt, vfxType === 'great_light_spell' || spellId === 'utevo_gran_lux');
    } else if (spellId === 'exori' || spellId === 'exori_gran') {
      this.spawnKnightBerserk(evt, spellId === 'exori_gran', triggerScreenShake);
    } else if (spellId === 'exura_ico') {
      this.spawnExuraIco(evt);
    } else if (spellId === 'exori_san' || spellId === 'exevo_mas_san') {
      this.spawnExoriSan(evt, triggerScreenShake);
    } else if (spellId === 'exori_con') {
      this.spawnExoriCon(evt);
    } else if (spellId === 'exura_san') {
      this.spawnExuraSan(evt);
    } else if (vfxType === 'spectral_dash') {
      this.spawnSpectralDash(evt);
    } else if (spellId === 'exevo_gran_mas_flam') {
      this.spawnHellsCore(evt, triggerScreenShake);
    } else if (spellId === 'exori_flam') {
      this.spawnFlameStrike(evt);
    } else if (spellId === 'exevo_gran_mas_frigo') {
      this.spawnEternalWinter(evt, triggerScreenShake);
    } else if (spellId === 'exori_frigo') {
      this.spawnIceStrike(evt);
    } else if (spellId === 'exura_sio') {
      this.spawnExuraSio(evt);
    } else if (spellId === 'exura' || spellId === 'exura_gran') {
      this.spawnExura(evt);
    } else if (vfxType === 'heal_aura' || evt.isHeal) {
      this.spawnExura(evt);
    } else {
      this.spawnDefaultSpell(evt, triggerScreenShake);
    }
  }

  // 1. UTEVO LUX / UTEVO GRAN LUX IGNITION
  private spawnUtevoLuxIgnition(evt: CombatEvent, isGran: boolean) {
    const scale = isGran ? 1.6 : 1.0;
    const colorHex = isGran ? 0xfff8db : 0xfffae0;

    // Layer 1: Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.3, isGran ? 2.5 : 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(evt.x, 0.05, evt.z);
    this.scene.add(ringMesh);

    this.particles.push({
      mesh: ringMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.5, initialScale: 1.0,
      updateVfx: (progress) => {
        const easeOut = 1 - Math.pow(1 - progress, 3);
        ringMesh.scale.setScalar(1.0 + easeOut * (isGran ? 1.8 : 1.2));
        ringMat.opacity = Math.max(0, 0.9 * (1 - progress));
      },
    });

    // Layer 3: Central Ignition Sphere
    const sphereGeo = new THREE.SphereGeometry(0.4 * scale, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.position.set(evt.x, 1.2, evt.z);
    this.scene.add(sphereMesh);

    this.particles.push({
      mesh: sphereMesh, vx: 0, vy: 0.4, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.45, initialScale: 1.0,
      updateVfx: (progress) => {
        sphereMesh.scale.setScalar(1.0 + progress * 1.5);
        sphereMat.opacity = Math.max(0, 0.95 * (1 - progress));
      },
    });

    // Layer 5: Diamond Sparks
    const count = isGran ? 24 : 12;
    for (let i = 0; i < count; i++) {
      const spark = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07, 0),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      spark.position.set(evt.x, 1.2, evt.z);
      const angle = (i / count) * Math.PI * 2;
      const speed = Math.random() * 3.5 + 2.0;

      this.scene.add(spark);
      this.particles.push({
        mesh: spark,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 4.0 + 2.0,
        vz: Math.sin(angle) * speed,
        rotSpeedX: Math.random() * 10, rotSpeedY: Math.random() * 10, rotSpeedZ: Math.random() * 10,
        lifetime: 0, maxLifetime: 0.55, initialScale: 1.0,
        updateVfx: (progress, delta) => {
          spark.position.y -= 9.8 * delta;
        },
      });
    }

    // Layer 6: Dynamic Light Flash
    const light = new THREE.PointLight(colorHex, isGran ? 14.0 : 8.0, isGran ? 32 : 20);
    light.position.set(evt.x, 2.0, evt.z);
    this.scene.add(light);

    const dummyLightMesh = new THREE.Object3D();
    dummyLightMesh.position.set(evt.x, 2.0, evt.z);
    this.particles.push({
      mesh: dummyLightMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.5, initialScale: 1.0,
      updateVfx: (progress) => {
        light.intensity = Math.max(0, (isGran ? 14.0 : 8.0) * (1 - progress));
        if (progress >= 1.0) this.scene.remove(light);
      },
    });
  }

  // 2. KNIGHT BERSERK (Exori / Exori Gran)
  private spawnKnightBerserk(evt: CombatEvent, isGran: boolean, triggerShake: Function) {
    const radius = isGran ? 5.2 : 3.5;
    const colorHex = isGran ? 0xef4444 : 0x38bdf8;
    const duration = isGran ? 0.75 : 0.52;

    // Layer 1: Shockwave Ring
    const ringGeo = new THREE.RingGeometry(isGran ? 2.0 : 1.4, radius, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(evt.x, 0.02, evt.z);
    this.scene.add(ringMesh);

    this.particles.push({
      mesh: ringMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: duration, initialScale: 1.0,
      updateVfx: (progress) => {
        const easeOut = 1 - Math.pow(1 - progress, 3);
        ringMesh.scale.setScalar(1.0 + easeOut * 0.4);
        ringMat.opacity = Math.max(0, 0.9 * (1 - progress));
      },
    });

    // Layer 3/4: Rotating Crescent Blades Group
    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(evt.x, 0.5, evt.z);
    const bladeCount = isGran ? 8 : 4;

    for (let i = 0; i < bladeCount; i++) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.2, 0, 0),
        new THREE.Vector3(0, 0.4, 1.4),
        new THREE.Vector3(1.2, 0, 0)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 18, isGran ? 0.09 : 0.06, 6, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 3.0,
        roughness: 0.2,
      });
      const blade = new THREE.Mesh(tubeGeo, tubeMat);
      blade.rotation.y = (i / bladeCount) * Math.PI * 2;
      if (isGran) blade.rotation.x = (i % 2 === 0 ? 0.25 : -0.25);
      bladeGroup.add(blade);
    }

    this.scene.add(bladeGroup);
    this.particles.push({
      mesh: bladeGroup, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: isGran ? 26.0 : 20.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: duration, initialScale: 1.0,
      updateVfx: (progress) => {
        bladeGroup.scale.setScalar(1.0 + progress * 0.5);
      },
    });

    // Layer 3 (Exori Gran only): Erupting Rock Stalagmites
    if (isGran) {
      for (let s = 0; s < 6; s++) {
        const angle = (s / 6) * Math.PI * 2;
        const dist = 2.2;
        const sx = evt.x + Math.cos(angle) * dist;
        const sz = evt.z + Math.sin(angle) * dist;

        const spikeGeo = new THREE.ConeGeometry(0.35, Math.random() * 0.8 + 1.6, 5);
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0x475569, emissive: 0xef4444, emissiveIntensity: 1.5, roughness: 0.7 });
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        spike.position.set(sx, -0.8, sz);
        this.scene.add(spike);

        this.particles.push({
          mesh: spike, vx: 0, vy: 0, vz: 0,
          rotSpeedX: 0, rotSpeedY: Math.random() * 4, rotSpeedZ: 0,
          lifetime: 0, maxLifetime: duration, initialScale: 1.0,
          updateVfx: (progress) => {
            if (progress < 0.3) {
              spike.position.y = -0.8 + (progress / 0.3) * 1.6;
            } else {
              spike.position.y = 0.8 - ((progress - 0.3) / 0.7) * 1.6;
            }
          },
        });
      }
    }

    // Layer 5: Ballistic Sparks / Embers
    const sparkCount = isGran ? 32 : 18;
    for (let i = 0; i < sparkCount; i++) {
      const spark = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.07, 0),
        new THREE.MeshBasicMaterial({ color: colorHex })
      );
      spark.position.set(evt.x, 0.4, evt.z);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isGran ? 9.0 : 5.0) + 4.0;

      this.scene.add(spark);
      this.particles.push({
        mesh: spark,
        vx: Math.cos(angle) * speed,
        vy: Math.random() * 5.0 + 2.0,
        vz: Math.sin(angle) * speed,
        rotSpeedX: Math.random() * 12, rotSpeedY: Math.random() * 12, rotSpeedZ: Math.random() * 12,
        lifetime: 0, maxLifetime: duration, initialScale: 1.0,
        updateVfx: (p, delta) => {
          spark.position.y -= 12.0 * delta * delta;
        },
      });
    }

    triggerShake(isGran ? 0.45 : 0.30, 0.22);
  }

  // 3. EXURA ICO (Knight Wound Cleansing)
  private spawnExuraIco(evt: CombatEvent) {
    // Layer 1: Spinning Ground Seal
    const sealGeo = new THREE.RingGeometry(0.4, 1.8, 32);
    const sealMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const sealMesh = new THREE.Mesh(sealGeo, sealMat);
    sealMesh.rotation.x = -Math.PI / 2;
    sealMesh.position.set(evt.x, 0.03, evt.z);
    this.scene.add(sealMesh);

    this.particles.push({
      mesh: sealMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 5.0,
      lifetime: 0, maxLifetime: 0.65, initialScale: 1.0,
      updateVfx: (progress) => {
        sealMat.opacity = Math.max(0, 0.85 * (1 - progress));
      },
    });

    // Layer 2: Double Ascending Helix of Light
    const helixGroup = new THREE.Group();
    helixGroup.position.set(evt.x, 0.1, evt.z);
    const sphereGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let h = 0; h < 20; h++) {
      const angle = (h / 20) * Math.PI * 4;
      const m1 = new THREE.Mesh(sphereGeo, sphereMat);
      m1.position.set(Math.cos(angle) * 0.8, h * 0.1, Math.sin(angle) * 0.8);
      helixGroup.add(m1);

      const m2 = new THREE.Mesh(sphereGeo, sphereMat);
      m2.position.set(Math.cos(angle + Math.PI) * 0.8, h * 0.1, Math.sin(angle + Math.PI) * 0.8);
      helixGroup.add(m2);
    }
    this.scene.add(helixGroup);

    this.particles.push({
      mesh: helixGroup, vx: 0, vy: 2.8, vz: 0,
      rotSpeedX: 0, rotSpeedY: 6.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.65, initialScale: 1.0,
      updateVfx: (progress) => {
        helixGroup.scale.setScalar(1.0 - progress * 0.3);
      },
    });

    // Layer 3: 6 Sacred Crosses
    for (let c = 0; c < 6; c++) {
      const crossGroup = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.04), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      crossGroup.add(b1);
      crossGroup.add(b2);

      const angle = (c / 6) * Math.PI * 2;
      crossGroup.position.set(evt.x + Math.cos(angle) * 0.9, 0.5, evt.z + Math.sin(angle) * 0.9);
      this.scene.add(crossGroup);

      this.particles.push({
        mesh: crossGroup, vx: 0, vy: 2.5, vz: 0,
        rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: Math.random() * 8 + 4,
        lifetime: 0, maxLifetime: 0.65, initialScale: 1.0,
      });
    }
  }

  // 4. PALADIN DIVINE CALDERA (Exori San / Exevo Mas San)
  private spawnExoriSan(evt: CombatEvent, triggerShake: Function) {
    // Layer 1: Solar Mandala
    const mandalaGeo = new THREE.RingGeometry(0.8, 5.0, 48);
    const mandalaMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const mandalaMesh = new THREE.Mesh(mandalaGeo, mandalaMat);
    mandalaMesh.rotation.x = -Math.PI / 2;
    mandalaMesh.position.set(evt.x, 0.03, evt.z);
    this.scene.add(mandalaMesh);

    this.particles.push({
      mesh: mandalaMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 2.0,
      lifetime: 0, maxLifetime: 0.72, initialScale: 1.0,
      updateVfx: (progress) => {
        mandalaMat.opacity = Math.max(0, 0.9 * (1 - progress));
      },
    });

    // Layer 3: Dual Cylinder 15m Celestial Beam
    const beamOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 3.2, 15, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    beamOuter.position.set(evt.x, 7.5, evt.z);
    this.scene.add(beamOuter);

    const beamInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.2, 15, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    beamInner.position.set(evt.x, 7.5, evt.z);
    this.scene.add(beamInner);

    this.particles.push({
      mesh: beamOuter, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 3.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.72, initialScale: 1.0,
      updateVfx: (progress) => {
        (beamOuter.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - progress));
      },
    });

    this.particles.push({
      mesh: beamInner, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: -5.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.72, initialScale: 1.0,
      updateVfx: (progress) => {
        (beamInner.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1 - progress));
      },
    });

    // Layer 5: 28 Ascending Stardust Crystals
    for (let i = 0; i < 28; i++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.08, 0),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 2.8;
      crystal.position.set(evt.x + Math.cos(angle) * r, 0.2, evt.z + Math.sin(angle) * r);
      this.scene.add(crystal);

      this.particles.push({
        mesh: crystal, vx: 0, vy: Math.random() * 5.0 + 4.5, vz: 0,
        rotSpeedX: Math.random() * 8, rotSpeedY: Math.random() * 8, rotSpeedZ: 0,
        lifetime: 0, maxLifetime: 0.72, initialScale: 1.0,
      });
    }

    triggerShake(0.35, 0.2);
  }

  // 5. EXORI CON (Ethereal Spear)
  private spawnExoriCon(evt: CombatEvent) {
    // Holy Nova Burst at impact
    const flashGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(evt.x, 1.0, evt.z);
    this.scene.add(flash);

    this.particles.push({
      mesh: flash, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.3, initialScale: 1.0,
      updateVfx: (progress) => {
        flash.scale.setScalar(1.0 + progress * 2.5);
        flashMat.opacity = Math.max(0, 0.95 * (1 - progress));
      },
    });

    // Shrapnel
    for (let s = 0; s < 16; s++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
      shard.position.set(evt.x, 1.0, evt.z);
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.0 + 3.0;

      this.scene.add(shard);
      this.particles.push({
        mesh: shard,
        vx: Math.cos(angle) * speed, vy: Math.random() * 4.0 + 2.0, vz: Math.sin(angle) * speed,
        rotSpeedX: Math.random() * 10, rotSpeedY: Math.random() * 10, rotSpeedZ: 0,
        lifetime: 0, maxLifetime: 0.4, initialScale: 1.0,
        updateVfx: (p, delta) => { shard.position.y -= 12.0 * delta * delta; },
      });
    }
  }

  // 6. EXURA SAN (Divine Healing Wings)
  private spawnExuraSan(evt: CombatEvent) {
    // Wings Group
    const wingGroup = new THREE.Group();
    wingGroup.position.set(evt.x, 1.2, evt.z - 0.2);

    const wingGeo = new THREE.PlaneGeometry(1.6, 0.9);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.8, 0, 0);
    leftWing.rotation.y = 0.4;
    wingGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.8, 0, 0);
    rightWing.rotation.y = -0.4;
    wingGroup.add(rightWing);

    this.scene.add(wingGroup);

    this.particles.push({
      mesh: wingGroup, vx: 0, vy: 0.8, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.70, initialScale: 1.0,
      updateVfx: (progress) => {
        leftWing.rotation.y = 0.4 + progress * 0.5;
        rightWing.rotation.y = -0.4 - progress * 0.5;
        wingGroup.scale.setScalar(1.0 + progress * 0.6);
        wingMat.opacity = Math.max(0, 0.9 * (1 - progress));
      },
    });
  }

  // 7. HELL'S CORE (Exevo Gran Mas Flam)
  private spawnHellsCore(evt: CombatEvent, triggerShake: Function) {
    // Layer 1: Magma Floor
    const magmaGeo = new THREE.RingGeometry(0.8, 7.5, 48);
    const magmaMat = new THREE.MeshBasicMaterial({ color: 0xff3b00, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const magmaMesh = new THREE.Mesh(magmaGeo, magmaMat);
    magmaMesh.rotation.x = -Math.PI / 2;
    magmaMesh.position.set(evt.x, 0.03, evt.z);
    this.scene.add(magmaMesh);

    this.particles.push({
      mesh: magmaMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 1.05, initialScale: 1.0,
      updateVfx: (progress) => { magmaMat.opacity = Math.max(0, 0.9 * (1 - progress)); },
    });

    // Layer 3: Central Nuclear Burst
    const burstGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const burstMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xff3b00, emissiveIntensity: 4.0 });
    const burst = new THREE.Mesh(burstGeo, burstMat);
    burst.position.set(evt.x, 1.6, evt.z);
    this.scene.add(burst);

    this.particles.push({
      mesh: burst, vx: 0, vy: 4.0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 1.05, initialScale: 1.0,
      updateVfx: (progress) => {
        burst.scale.setScalar(1.0 + progress * 4.5);
      },
    });

    // Layer 3: 12 Conical Lava Geysers
    for (let g = 0; g < 12; g++) {
      const angle = (g / 12) * Math.PI * 2;
      const r = Math.random() * 4.5 + 1.5;
      const gx = evt.x + Math.cos(angle) * r;
      const gz = evt.z + Math.sin(angle) * r;

      const geyser = new THREE.Mesh(
        new THREE.ConeGeometry(0.65, Math.random() * 3.5 + 3.5, 7),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xff3700, emissiveIntensity: 3.2, roughness: 0.2 })
      );
      geyser.position.set(gx, 0, gz);
      this.scene.add(geyser);

      this.particles.push({
        mesh: geyser, vx: 0, vy: 2.0, vz: 0,
        rotSpeedX: 0, rotSpeedY: Math.random() * 6, rotSpeedZ: 0,
        lifetime: 0, maxLifetime: 0.85, initialScale: 1.0,
      });
    }

    triggerShake(0.6, 0.35);
  }

  // 8. FLAME STRIKE (Exori Flam)
  private spawnFlameStrike(evt: CombatEvent) {
    const burst = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3700, transparent: true, opacity: 0.9 })
    );
    burst.position.set(evt.x, 1.0, evt.z);
    this.scene.add(burst);

    this.particles.push({
      mesh: burst, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.35, initialScale: 1.0,
      updateVfx: (p) => {
        burst.scale.setScalar(1.0 + p * 3.0);
        (burst.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - p));
      },
    });
  }

  // 9. ETERNAL WINTER (Exevo Gran Mas Frigo)
  private spawnEternalWinter(evt: CombatEvent, triggerShake: Function) {
    const iceGroup = new THREE.Group();
    iceGroup.position.set(evt.x, 0, evt.z);

    for (let s = 0; s < 14; s++) {
      const angle = (s / 14) * Math.PI * 2;
      const r = Math.random() * 5.0 + 1.0;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, Math.random() * 3.8 + 3.2, 6),
        new THREE.MeshStandardMaterial({ color: 0xa5f3fc, emissive: 0x0284c7, roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.95 })
      );
      spike.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      iceGroup.add(spike);
    }

    this.scene.add(iceGroup);
    this.particles.push({
      mesh: iceGroup, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 2.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 1.05, initialScale: 1.0,
      updateVfx: (p) => {
        iceGroup.scale.setScalar(1.0 + p * 0.3);
      },
    });

    triggerShake(0.5, 0.3);
  }

  // 10. ICE STRIKE (Exori Frigo)
  private spawnIceStrike(evt: CombatEvent) {
    const javelin = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 1.1, 6),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x0284c7, roughness: 0.1 })
    );
    javelin.position.set(evt.x, 2.5, evt.z);
    javelin.rotation.x = Math.PI;
    this.scene.add(javelin);

    this.particles.push({
      mesh: javelin, vx: 0, vy: -12.0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 6.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.25, initialScale: 1.0,
    });
  }

  // 11. EXURA SIO (Druid Heal)
  private spawnExuraSio(evt: CombatEvent) {
    const lotusGroup = new THREE.Group();
    lotusGroup.position.set(evt.x, 0.04, evt.z);

    const petalGeo = new THREE.PlaneGeometry(0.8, 1.4);
    const petalMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });

    for (let i = 0; i < 4; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.rotation.x = -Math.PI / 2;
      petal.rotation.z = (i / 4) * Math.PI * 2;
      lotusGroup.add(petal);
    }

    this.scene.add(lotusGroup);
    this.particles.push({
      mesh: lotusGroup, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 3.0,
      lifetime: 0, maxLifetime: 0.72, initialScale: 1.0,
      updateVfx: (p) => {
        lotusGroup.scale.setScalar(1.0 + p * 1.5);
        petalMat.opacity = Math.max(0, 0.85 * (1 - p));
      },
    });
  }

  // 12. EXURA / EXURA GRAN
  private spawnExura(evt: CombatEvent) {
    const cylMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 2.5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    cylMesh.position.set(evt.x, 1.25, evt.z);
    this.scene.add(cylMesh);

    this.particles.push({
      mesh: cylMesh, vx: 0, vy: 0.8, vz: 0,
      rotSpeedX: 0, rotSpeedY: 2.0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.58, initialScale: 1.0,
      updateVfx: (p) => {
        (cylMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - p));
      },
    });
  }

  private spawnSpectralDash(evt: CombatEvent) {
    const originX = evt.sourceX !== undefined ? evt.sourceX : evt.x;
    const originZ = evt.sourceZ !== undefined ? evt.sourceZ : evt.z;
    
    const dx = evt.x - originX;
    const dz = evt.z - originZ;
    const distance = Math.hypot(dx, dz);
    
    // Spawn a ghost trail
    const segments = Math.max(3, Math.floor(distance * 2));
    
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments;
      const x = originX + dx * progress;
      const z = originZ + dz * progress;
      
      const ghostMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8),
        new THREE.MeshBasicMaterial({ color: 0x9333ea, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
      );
      ghostMesh.position.set(x, 0.6, z);
      this.scene.add(ghostMesh);
      
      this.particles.push({
        mesh: ghostMesh, vx: 0, vy: 0.5, vz: 0,
        rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
        lifetime: 0, maxLifetime: 0.4 + (i * 0.05), initialScale: 1.0,
        updateVfx: (p) => {
          const mat = ghostMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.5 * (1 - p);
          ghostMesh.scale.set(1 - p * 0.5, 1 + p, 1 - p * 0.5);
        },
      });
    }

    // Impact burst at destination
    for (let i = 0; i < 15; i++) {
      const pMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
      );
      pMesh.position.set(evt.x + (Math.random() - 0.5) * 0.5, 0.6, evt.z + (Math.random() - 0.5) * 0.5);
      this.scene.add(pMesh);
      this.particles.push({
        mesh: pMesh,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 1,
        vz: (Math.random() - 0.5) * 4,
        rotSpeedX: Math.random() * 10,
        rotSpeedY: Math.random() * 10,
        rotSpeedZ: Math.random() * 10,
        lifetime: 0, maxLifetime: 0.3 + Math.random() * 0.2, initialScale: 1,
        updateVfx: (p) => {
          (pMesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - p);
        }
      });
    }
  }

  // DEFAULT
  private spawnDefaultSpell(evt: CombatEvent, triggerShake: Function) {
    const colorHex = parseInt((evt.color || '#facc15').replace('#', '0x'), 16);
    const colMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 2.2, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 })
    );
    colMesh.position.set(evt.x, 1.1, evt.z);
    this.scene.add(colMesh);

    this.particles.push({
      mesh: colMesh, vx: 0, vy: 0, vz: 0,
      rotSpeedX: 0, rotSpeedY: 0, rotSpeedZ: 0,
      lifetime: 0, maxLifetime: 0.25, initialScale: 1.0,
      updateVfx: (p) => {
        (colMesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - p));
      },
    });
  }
}
