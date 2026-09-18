import * as THREE from 'three';

// Material Cache for Ultra-Fast Instantiation & Zero Memory Leaks
const materialCache = new Map<string, THREE.Material>();

function getMat(
  color: number,
  options: {
    emissive?: number;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
    wireframe?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  const key = `${color}_${options.emissive || 0}_${options.roughness ?? 0.5}_${options.metalness ?? 0.1}_${options.opacity ?? 1}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        emissive: options.emissive || 0x000000,
        emissiveIntensity: options.emissiveIntensity || 0,
        roughness: options.roughness ?? 0.55,
        metalness: options.metalness ?? 0.1,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1.0,
        wireframe: options.wireframe ?? false,
      })
    );
  }
  return materialCache.get(key) as THREE.MeshStandardMaterial;
}

// -------------------------------------------------------------
// 1. CAVE RAT (Sculpted organic rodent, scurrying paws, twitching snout)
// -------------------------------------------------------------
export function createCaveRatMesh(): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const furMat = getMat(0x4a2e18, { roughness: 0.8 });
  const underbellyMat = getMat(0x785233, { roughness: 0.7 });
  const skinPinkMat = getMat(0xf472b6, { roughness: 0.6 });
  const eyeMat = getMat(0xef4444, { emissive: 0xdc2626, emissiveIntensity: 0.8 });
  const toothMat = getMat(0xfef08a, { roughness: 0.3 });

  // 1. Teardrop Anatomical Body (Spherical torso + belly)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), furMat);
  body.scale.set(0.9, 0.8, 1.4);
  body.position.set(0, 0.22, 0);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), underbellyMat);
  belly.scale.set(0.85, 0.6, 1.2);
  belly.position.set(0, 0.16, 0.04);
  root.add(body, belly);

  // 2. Head & Snout
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.26, 0.32);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), furMat);
  headMesh.scale.set(0.9, 0.85, 1.1);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 8), furMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.02, 0.18);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), skinPinkMat);
  nose.position.set(0, -0.02, 0.31);

  // Sharp rodent incisors
  const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.015), toothMat);
  tooth1.position.set(-0.018, -0.07, 0.26);
  const tooth2 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.05, 0.015), toothMat);
  tooth2.position.set(0.018, -0.07, 0.26);

  // Glowing red eyes with glints
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
  eyeL.position.set(-0.11, 0.06, 0.12);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
  eyeR.position.set(0.11, 0.06, 0.12);

  // Rounded pink inner ears
  const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8), skinPinkMat);
  earL.rotation.set(0.3, -0.4, 0.4);
  earL.position.set(-0.14, 0.14, -0.02);

  const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8), skinPinkMat);
  earR.rotation.set(0.3, 0.4, -0.4);
  earR.position.set(0.14, 0.14, -0.02);

  headGroup.add(headMesh, snout, nose, tooth1, tooth2, eyeL, eyeR, earL, earR);
  root.add(headGroup);

  // 3. Scurrying Articulated Paws
  const pawFrontL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 6), skinPinkMat);
  pawFrontL.position.set(-0.16, 0.07, 0.2);
  const pawFrontR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 6), skinPinkMat);
  pawFrontR.position.set(0.16, 0.07, 0.2);

  const pawBackL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 6), skinPinkMat);
  pawBackL.position.set(-0.18, 0.08, -0.2);
  const pawBackR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 6), skinPinkMat);
  pawBackR.position.set(0.18, 0.08, -0.2);

  root.add(pawFrontL, pawFrontR, pawBackL, pawBackR);

  // 4. Long Curved Rat Tail (Multi-jointed)
  const tailBase = new THREE.Group();
  tailBase.position.set(0, 0.18, -0.36);

  const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.24, 6), skinPinkMat);
  tailSeg1.rotation.x = -Math.PI / 3;
  tailSeg1.position.set(0, 0.06, -0.08);

  const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.28, 6), skinPinkMat);
  tailSeg2.rotation.x = -Math.PI / 4;
  tailSeg2.position.set(0, 0.16, -0.26);

  tailBase.add(tailSeg1, tailSeg2);
  root.add(tailBase);

  let runCycle = Math.random() * 10;

  return {
    group,
    updateAnimation: (delta: number) => {
      runCycle += delta * 16;
      // Body bounce and tilt
      root.position.y = Math.abs(Math.sin(runCycle)) * 0.05;
      root.rotation.z = Math.sin(runCycle * 0.5) * 0.06;

      // Leg trot
      pawFrontL.position.z = 0.2 + Math.sin(runCycle) * 0.08;
      pawFrontR.position.z = 0.2 - Math.sin(runCycle) * 0.08;
      pawBackL.position.z = -0.2 - Math.sin(runCycle) * 0.09;
      pawBackR.position.z = -0.2 + Math.sin(runCycle) * 0.09;

      // Tail swish
      tailBase.rotation.y = Math.sin(runCycle * 0.6) * 0.45;
      tailBase.rotation.x = Math.sin(runCycle) * 0.15;

      // Snout twitch
      headGroup.rotation.y = Math.sin(runCycle * 0.8) * 0.12;
      nose.scale.setScalar(0.9 + Math.sin(runCycle * 2) * 0.2);
    },
  };
}

// -------------------------------------------------------------
// 2. ROTWORM, CARRION WORM & ROTWORM QUEEN (Broodmother Worms)
// -------------------------------------------------------------
export function createRotwormMesh(
  type: 'rotworm' | 'carrion_worm' | 'rotworm_queen'
): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const isQueen = type === 'rotworm_queen';
  const isCarrion = type === 'carrion_worm';

  const scale = isQueen ? 2.1 : isCarrion ? 1.4 : 1.05;

  // Segment colors
  const skinColor = isQueen ? 0xd97706 : isCarrion ? 0x713f12 : 0xb45309;
  const underColor = isQueen ? 0xfef08a : isCarrion ? 0x451a03 : 0xd97706;
  const toothColor = isQueen ? 0xfef08a : 0xf8fafc;
  const mawColor = isQueen ? 0x991b1b : isCarrion ? 0x14532d : 0x7f1d1d;

  const skinMat = getMat(skinColor, { roughness: 0.6, metalness: 0.1 });
  const ribMat = getMat(underColor, { roughness: 0.5 });
  const mawMat = getMat(mawColor, { roughness: 0.4 });
  const toothMat = getMat(toothColor, { roughness: 0.2, metalness: 0.2 });

  // 1. Segmented Annelid Body with Annulated Rings
  const segCount = isQueen ? 8 : 6;
  const segments: { mesh: THREE.Group; baseZ: number; baseY: number; rad: number }[] = [];

  for (let i = 0; i < segCount; i++) {
    const segGroup = new THREE.Group();
    const t = i / (segCount - 1);
    // Tapered body: largest near the head, tapering down to tail
    const rad = (i === 0 ? 0.38 : 0.44 * (1 - t * 0.55)) * scale;

    // Fleshy segmented sphere
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 10), skinMat);
    sphere.scale.set(1.05, 0.95, 1.15);
    segGroup.add(sphere);

    // Annulated raised rib ring (Torus)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad * 0.98, 0.05 * scale, 6, 16), ribMat);
    ring.rotation.x = Math.PI / 2;
    segGroup.add(ring);

    // Lateral spikes / chitin ridges
    if (i > 0 && i < segCount - 1) {
      const spikeL = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.16 * scale, 6), ribMat);
      spikeL.rotation.z = Math.PI / 2 + 0.2;
      spikeL.position.set(-rad * 0.95, 0.05 * scale, 0);

      const spikeR = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.16 * scale, 6), ribMat);
      spikeR.rotation.z = -Math.PI / 2 - 0.2;
      spikeR.position.set(rad * 0.95, 0.05 * scale, 0);

      segGroup.add(spikeL, spikeR);
    }

    const baseY = (0.28 + (segCount - 1 - i) * 0.08) * scale;
    const baseZ = -i * 0.32 * scale;
    segGroup.position.set(0, baseY, baseZ);

    group.add(segGroup);
    segments.push({ mesh: segGroup, baseZ, baseY, rad });
  }

  // 2. Horrific Concentric Lamprey Maw (Front Head Segment)
  const headSeg = segments[0].mesh;
  const mawGroup = new THREE.Group();
  mawGroup.position.set(0, 0, 0.36 * scale);

  // Round fleshy throat cavity
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.26 * scale, 0.14 * scale, 0.22 * scale, 16), mawMat);
  throat.rotation.x = Math.PI / 2;
  mawGroup.add(throat);

  // Outer ring of razor teeth (10 teeth)
  const outerTeethCount = isQueen ? 12 : 8;
  for (let j = 0; j < outerTeethCount; j++) {
    const angle = (j / outerTeethCount) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035 * scale, 0.12 * scale, 6), toothMat);
    tooth.position.set(Math.cos(angle) * 0.22 * scale, Math.sin(angle) * 0.22 * scale, 0.08 * scale);
    tooth.rotation.z = angle - Math.PI / 2;
    tooth.rotation.x = 0.4;
    mawGroup.add(tooth);
  }

  // Inner ring of needle teeth (6 teeth)
  const innerTeethCount = isQueen ? 8 : 6;
  for (let k = 0; k < innerTeethCount; k++) {
    const angle = (k / innerTeethCount) * Math.PI * 2 + 0.3;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025 * scale, 0.09 * scale, 6), toothMat);
    tooth.position.set(Math.cos(angle) * 0.12 * scale, Math.sin(angle) * 0.12 * scale, 0.04 * scale);
    tooth.rotation.z = angle - Math.PI / 2;
    tooth.rotation.x = 0.5;
    mawGroup.add(tooth);
  }

  // Queen Exclusive: Giant Serrated Mandibles & Venom Glands
  if (isQueen) {
    const mandibleMat = getMat(0x451a03, { roughness: 0.3, metalness: 0.4 });
    const mandL = new THREE.Mesh(new THREE.TorusGeometry(0.28 * scale, 0.06 * scale, 6, 12, Math.PI * 0.8), mandibleMat);
    mandL.rotation.set(0.3, 0.5, 0.2);
    mandL.position.set(-0.35 * scale, 0, 0.15 * scale);

    const mandR = new THREE.Mesh(new THREE.TorusGeometry(0.28 * scale, 0.06 * scale, 6, 12, Math.PI * 0.8), mandibleMat);
    mandR.rotation.set(0.3, -0.5, -0.2);
    mandR.position.set(0.35 * scale, 0, 0.15 * scale);

    mawGroup.add(mandL, mandR);

    // Pulsing acid/venom sacs
    const venomMat = getMat(0x84cc16, { emissive: 0x4d7c0f, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
    const sac1 = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 8, 8), venomMat);
    sac1.position.set(-0.25 * scale, 0.35 * scale, -0.3 * scale);
    const sac2 = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 8, 8), venomMat);
    sac2.position.set(0.25 * scale, 0.35 * scale, -0.3 * scale);
    headSeg.add(sac1, sac2);
  }

  headSeg.add(mawGroup);

  let crawlTime = Math.random() * 10;

  return {
    group,
    updateAnimation: (delta: number) => {
      crawlTime += delta * 7;

      // Peristaltic undulation wave travelling through segments
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const wave = Math.sin(crawlTime - i * 0.65);
        seg.mesh.position.x = wave * (0.12 * scale);
        seg.mesh.position.y = seg.baseY + Math.abs(Math.sin(crawlTime * 1.5 - i * 0.5)) * (0.05 * scale);
        seg.mesh.rotation.y = Math.cos(crawlTime - i * 0.65) * 0.2;
        seg.mesh.rotation.z = -wave * 0.1;
      }

      // Maw pulsation (dilating needle teeth)
      const mawPulse = 1.0 + Math.sin(crawlTime * 2.5) * 0.15;
      mawGroup.scale.set(mawPulse, mawPulse, 1.0);
    },
  };
}

// -------------------------------------------------------------
// 3. SKELETON WARRIOR (Anatomical Bone Rig, Chattering Skull, Broadsword & Targe Shield)
// -------------------------------------------------------------
export function createSkeletonWarriorMesh(): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const boneMat = getMat(0xe2e8f0, { roughness: 0.7, metalness: 0.05 });
  const darkBoneMat = getMat(0x94a3b8, { roughness: 0.8 });
  const eyeFlameMat = getMat(0xef4444, { emissive: 0xff0000, emissiveIntensity: 1.2 });
  const steelMat = getMat(0x64748b, { metalness: 0.8, roughness: 0.3 });
  const woodMat = getMat(0x5c3a21, { roughness: 0.8 });
  const goldMat = getMat(0xf59e0b, { metalness: 0.6, roughness: 0.3 });

  // 1. Pelvis Base
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.14, 8), darkBoneMat);
  pelvis.position.y = 0.75;
  root.add(pelvis);

  // 2. Articulated Spine Column
  const spineGroup = new THREE.Group();
  spineGroup.position.set(0, 0.82, 0);

  for (let v = 0; v < 5; v++) {
    const vert = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 6), darkBoneMat);
    vert.position.y = v * 0.07;
    spineGroup.add(vert);
  }

  // 3. Ribcage & Clavicles
  const ribcage = new THREE.Group();
  ribcage.position.set(0, 0.22, 0);

  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.06), boneMat);
  sternum.position.set(0, 0, 0.14);
  ribcage.add(sternum);

  for (let r = 0; r < 4; r++) {
    const ribW = 0.24 - r * 0.02;
    const ribMesh = new THREE.Mesh(new THREE.TorusGeometry(ribW, 0.024, 6, 14, Math.PI * 1.5), boneMat);
    ribMesh.rotation.x = Math.PI / 2;
    ribMesh.position.set(0, 0.08 - r * 0.06, 0);
    ribcage.add(ribMesh);
  }
  spineGroup.add(ribcage);
  root.add(spineGroup);

  // 4. Cranium & Chattering Jaw
  const skullGroup = new THREE.Group();
  skullGroup.position.set(0, 1.28, 0);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), boneMat);
  cranium.scale.set(0.95, 1.05, 1.15);

  const cheekL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), boneMat);
  cheekL.position.set(-0.12, -0.06, 0.04);
  const cheekR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), boneMat);
  cheekR.position.set(0.12, -0.06, 0.04);

  // Empty eye sockets with glowing red spectral flame spheres inside
  const socketL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 6), getMat(0x0f172a));
  socketL.rotation.x = Math.PI / 2;
  socketL.position.set(-0.065, 0.02, 0.17);
  const flameL = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeFlameMat);
  flameL.position.set(-0.065, 0.02, 0.19);

  const socketR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 6), getMat(0x0f172a));
  socketR.rotation.x = Math.PI / 2;
  socketR.position.set(0.065, 0.02, 0.17);
  const flameR = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeFlameMat);
  flameR.position.set(0.065, 0.02, 0.19);

  // Upper teeth
  const upperTeeth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.04), boneMat);
  upperTeeth.position.set(0, -0.10, 0.15);

  // Hinged lower jaw
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.11, 0.05);
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.12), boneMat);
  jawMesh.position.set(0, -0.02, 0.06);
  jawGroup.add(jawMesh);

  skullGroup.add(cranium, cheekL, cheekR, socketL, socketR, flameL, flameR, upperTeeth, jawGroup);
  root.add(skullGroup);

  // 5. Right Arm (Holding Broadsword)
  const armR = new THREE.Group();
  armR.position.set(0.32, 1.15, 0);

  const humerusR = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), boneMat);
  humerusR.position.set(0, -0.16, 0);

  const forearmR = new THREE.Group();
  forearmR.position.set(0, -0.32, 0);
  const radiusR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), boneMat);
  radiusR.position.set(0, -0.15, 0);

  // Notched Rusted Broadsword
  const sword = new THREE.Group();
  sword.position.set(0, -0.3, 0.15);
  sword.rotation.x = Math.PI / 3;

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.02), steelMat);
  blade.position.y = 0.36;
  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.035), darkBoneMat);
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), goldMat);
  pommel.position.y = -0.08;

  sword.add(blade, crossguard, pommel);
  forearmR.add(radiusR, sword);
  armR.add(humerusR, forearmR);
  root.add(armR);

  // 6. Left Arm (Holding Round Targe Shield)
  const armL = new THREE.Group();
  armL.position.set(-0.32, 1.15, 0);

  const humerusL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), boneMat);
  humerusL.position.set(0, -0.16, 0);

  const forearmL = new THREE.Group();
  forearmL.position.set(0, -0.32, 0);
  const radiusL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), boneMat);
  radiusL.position.set(0, -0.15, 0);

  // Round Studded Targe Shield
  const shield = new THREE.Group();
  shield.position.set(-0.08, -0.15, 0.12);
  shield.rotation.y = -Math.PI / 3;

  const shieldFace = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), woodMat);
  shieldFace.rotation.x = Math.PI / 2;
  const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 6, 20), steelMat);
  const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), steelMat);
  shieldBoss.position.z = 0.04;

  shield.add(shieldFace, shieldRim, shieldBoss);
  forearmL.add(radiusL, shield);
  armL.add(humerusL, forearmL);
  root.add(armL);

  // 7. Bony Legs (Femur + Tibia + Feet)
  const legL = new THREE.Group();
  legL.position.set(-0.14, 0.72, 0);
  const femurL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.38, 6), boneMat);
  femurL.position.y = -0.19;
  const shinL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.38, 6), boneMat);
  shinL.position.set(0, -0.52, 0);
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.15), boneMat);
  footL.position.set(0, -0.72, 0.04);
  legL.add(femurL, shinL, footL);

  const legR = new THREE.Group();
  legR.position.set(0.14, 0.72, 0);
  const femurR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.38, 6), boneMat);
  femurR.position.y = -0.19;
  const shinR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.38, 6), boneMat);
  shinR.position.set(0, -0.52, 0);
  const footR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.15), boneMat);
  footR.position.set(0, -0.72, 0.04);
  legR.add(femurR, shinR, footR);

  root.add(legL, legR);

  let animCycle = Math.random() * 10;

  return {
    group,
    updateAnimation: (delta: number) => {
      animCycle += delta * 11;
      const walkSin = Math.sin(animCycle);

      // Skeletal march stride
      legL.rotation.x = walkSin * 0.55;
      legR.rotation.x = -walkSin * 0.55;

      // Spine & Ribcage twist
      spineGroup.rotation.y = Math.sin(animCycle) * 0.12;
      root.position.y = Math.abs(Math.sin(animCycle * 2)) * 0.04;

      // Arm swing
      armR.rotation.x = -walkSin * 0.45;
      armL.rotation.x = walkSin * 0.35;

      // Chattering jaw & scanning skull
      skullGroup.rotation.y = Math.sin(animCycle * 0.5) * 0.18;
      jawGroup.rotation.x = 0.1 + Math.abs(Math.sin(animCycle * 2)) * 0.2;

      // Pulsing flame in eye sockets
      const flameScale = 0.85 + Math.random() * 0.3;
      flameL.scale.setScalar(flameScale);
      flameR.scale.setScalar(flameScale);
    },
  };
}

// -------------------------------------------------------------
// 4. CYCLOPS & CYCLOPS SMITH (Colossal Muscular Titan, Animated Eye, Forge Warhammer)
// -------------------------------------------------------------
export function createCyclopsMesh(
  type: 'cyclops' | 'cyclops_smith'
): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const isSmith = type === 'cyclops_smith';
  const scale = isSmith ? 1.45 : 1.15;

  const skinColor = isSmith ? 0x991b1b : 0xf87171;
  const loinColor = isSmith ? 0x451a03 : 0x78350f;
  const ironColor = isSmith ? 0x1e293b : 0x334155;
  const eyeColor = isSmith ? 0xf59e0b : 0x38bdf8;

  const skinMat = getMat(skinColor, { roughness: 0.65 });
  const loinMat = getMat(loinColor, { roughness: 0.8 });
  const ironMat = getMat(ironColor, { metalness: 0.7, roughness: 0.3 });
  const eyeScleraMat = getMat(0xffedd5, { roughness: 0.2 });
  const eyeIrisMat = getMat(eyeColor, { emissive: eyeColor, emissiveIntensity: isSmith ? 0.8 : 0.4 });
  const toothMat = getMat(0xfef08a, { roughness: 0.4 });

  // 1. Massive Muscular Torso & Six-Pack Abs
  const torso = new THREE.Group();
  torso.position.y = 1.05 * scale;

  // Chest / Pectorals
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * scale, 0.40 * scale, 0.52 * scale, 12), skinMat);
  chest.scale.set(1.15, 1.0, 0.85);

  const pecL = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 8, 8), skinMat);
  pecL.position.set(-0.20 * scale, 0.12 * scale, 0.24 * scale);
  const pecR = new THREE.Mesh(new THREE.SphereGeometry(0.24 * scale, 8, 8), skinMat);
  pecR.position.set(0.20 * scale, 0.12 * scale, 0.24 * scale);

  torso.add(chest, pecL, pecR);

  // Blacksmith Leather Apron (Smith) or Studded Belt (Normal)
  if (isSmith) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.75 * scale, 0.04 * scale), loinMat);
    apron.position.set(0, -0.15 * scale, 0.38 * scale);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.44 * scale, 0.06 * scale, 6, 16), ironMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.22 * scale;
    torso.add(apron, belt);
  } else {
    const loin = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.46 * scale, 0.35 * scale, 10), loinMat);
    loin.position.y = -0.32 * scale;
    torso.add(loin);
  }
  root.add(torso);

  // 2. Colossal Hulking Head with Massive Monocular Eye & Brow Ridge
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.62 * scale, 0.12 * scale);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.32 * scale, 12, 10), skinMat);
  cranium.scale.set(1.0, 0.95, 1.1);

  // Heavy prominent brow ridge
  const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.42 * scale, 8), skinMat);
  brow.rotation.z = Math.PI / 2;
  brow.position.set(0, 0.12 * scale, 0.30 * scale);

  // Single Giant Central Eye
  const eyeSocket = new THREE.Group();
  eyeSocket.position.set(0, 0.02 * scale, 0.31 * scale);

  const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 10, 8), eyeScleraMat);
  sclera.scale.set(1.1, 0.9, 0.6);

  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 8, 8), eyeIrisMat);
  iris.position.z = 0.08 * scale;

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 6, 6), getMat(0x0f172a));
  pupil.position.z = 0.12 * scale;

  eyeSocket.add(sclera, iris, pupil);

  // Brutal Lower Jaw with Protruding Tusks
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.18 * scale, 0.28 * scale), skinMat);
  jaw.position.set(0, -0.22 * scale, 0.18 * scale);

  const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.045 * scale, 0.18 * scale, 6), toothMat);
  tuskL.position.set(-0.13 * scale, 0.06 * scale, 0.12 * scale);
  tuskL.rotation.x = -0.3;
  tuskL.rotation.z = -0.2;

  const tuskR = new THREE.Mesh(new THREE.ConeGeometry(0.045 * scale, 0.18 * scale, 6), toothMat);
  tuskR.position.set(0.13 * scale, 0.06 * scale, 0.12 * scale);
  tuskR.rotation.x = -0.3;
  tuskR.rotation.z = 0.2;
  jaw.add(tuskL, tuskR);

  // Horned Blacksmith Cap / Goggles for Boss
  if (isSmith) {
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.07 * scale, 0.35 * scale, 6), ironMat);
    hornL.position.set(-0.28 * scale, 0.28 * scale, 0);
    hornL.rotation.z = 0.6;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.07 * scale, 0.35 * scale, 6), ironMat);
    hornR.position.set(0.28 * scale, 0.28 * scale, 0);
    hornR.rotation.z = -0.6;
    headGroup.add(hornL, hornR);
  }

  headGroup.add(cranium, brow, eyeSocket, jaw);
  root.add(headGroup);

  // 3. Massive Muscular Arms & Heavy Weapons
  // Right Arm (Weapon Arm)
  const armR = new THREE.Group();
  armR.position.set(0.62 * scale, 1.35 * scale, 0);

  const bicepR = new THREE.Mesh(new THREE.SphereGeometry(0.19 * scale, 8, 8), skinMat);
  bicepR.position.set(0, -0.18 * scale, 0);
  bicepR.scale.set(0.9, 1.3, 1.0);

  const forearmR = new THREE.Group();
  forearmR.position.set(0, -0.42 * scale, 0);
  const forearmMeshR = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.42 * scale, 8), skinMat);
  forearmMeshR.position.y = -0.20 * scale;
  forearmR.add(forearmMeshR);

  // Weapon: Spiked Tree Club (Cyclops) OR Burning Molten Forge Hammer (Cyclops Smith)
  let weaponGlow: THREE.PointLight | null = null;
  const weapon = new THREE.Group();
  weapon.position.set(0.08 * scale, -0.40 * scale, 0.25 * scale);
  weapon.rotation.x = Math.PI / 3;

  if (isSmith) {
    // Great Dwarven Forge Hammer
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.05 * scale, 1.15 * scale, 8), loinMat);
    handle.position.y = 0.3 * scale;

    const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.38 * scale, 0.26 * scale, 0.62 * scale), ironMat);
    hammerHead.position.y = 0.82 * scale;

    const moltenCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.40 * scale, 0.14 * scale, 0.14 * scale),
      getMat(0xef4444, { emissive: 0xf97316, emissiveIntensity: 1.2 })
    );
    moltenCore.position.y = 0.82 * scale;

    weapon.add(handle, hammerHead, moltenCore);

    weaponGlow = new THREE.PointLight(0xf97316, 1.8, 5.0);
    weaponGlow.position.set(0, 0.85 * scale, 0);
    weapon.add(weaponGlow);
  } else {
    // Spiked Barbarian War Club
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.14 * scale, 1.05 * scale, 8), loinMat);
    handle.position.y = 0.35 * scale;

    for (let s = 0; s < 6; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035 * scale, 0.14 * scale, 6), ironMat);
      const angle = s * 1.1;
      spike.position.set(Math.cos(angle) * 0.14 * scale, (0.55 + (s % 3) * 0.14) * scale, Math.sin(angle) * 0.14 * scale);
      spike.rotation.z = Math.PI / 2;
      weapon.add(spike);
    }
    weapon.add(handle);
  }

  forearmR.add(weapon);
  armR.add(bicepR, forearmR);
  root.add(armR);

  // Left Arm (Fist / Guard)
  const armL = new THREE.Group();
  armL.position.set(-0.62 * scale, 1.35 * scale, 0);

  const bicepL = new THREE.Mesh(new THREE.SphereGeometry(0.19 * scale, 8, 8), skinMat);
  bicepL.position.set(0, -0.18 * scale, 0);
  bicepL.scale.set(0.9, 1.3, 1.0);

  const forearmL = new THREE.Group();
  forearmL.position.set(0, -0.42 * scale, 0);
  const forearmMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.13 * scale, 0.42 * scale, 8), skinMat);
  forearmMeshL.position.y = -0.20 * scale;

  const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 8, 8), skinMat);
  fistL.position.set(0, -0.42 * scale, 0.05 * scale);

  forearmL.add(forearmMeshL, fistL);
  armL.add(bicepL, forearmL);
  root.add(armL);

  // 4. Heavy Tree-Trunk Muscular Legs
  const legL = new THREE.Group();
  legL.position.set(-0.25 * scale, 0.72 * scale, 0);
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.20 * scale, 0.18 * scale, 0.46 * scale, 8), skinMat);
  thighL.position.y = -0.23 * scale;
  const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * scale, 0.19 * scale, 0.46 * scale, 8), skinMat);
  calfL.position.set(0, -0.62 * scale, 0);
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.12 * scale, 0.36 * scale), skinMat);
  footL.position.set(0, -0.85 * scale, 0.08 * scale);
  legL.add(thighL, calfL, footL);

  const legR = new THREE.Group();
  legR.position.set(0.25 * scale, 0.72 * scale, 0);
  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.20 * scale, 0.18 * scale, 0.46 * scale, 8), skinMat);
  thighR.position.y = -0.23 * scale;
  const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * scale, 0.19 * scale, 0.46 * scale, 8), skinMat);
  calfR.position.set(0, -0.62 * scale, 0);
  const footR = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.12 * scale, 0.36 * scale), skinMat);
  footR.position.set(0, -0.85 * scale, 0.08 * scale);
  legR.add(thighR, calfR, footR);

  root.add(legL, legR);

  let titanCycle = Math.random() * 10;

  return {
    group,
    updateAnimation: (delta: number) => {
      titanCycle += delta * 8;
      const walkSin = Math.sin(titanCycle);

      // Heavy Ground Stomp Walk Cycle
      legL.rotation.x = walkSin * 0.6;
      legR.rotation.x = -walkSin * 0.6;

      // Heavy torso weight sway
      torso.rotation.y = Math.sin(titanCycle) * 0.14;
      torso.rotation.z = Math.sin(titanCycle) * 0.06;
      root.position.y = Math.abs(Math.sin(titanCycle * 2)) * (0.06 * scale);

      // Brutal club/hammer ready swing
      armR.rotation.x = -0.3 + Math.sin(titanCycle * 1.2) * 0.4;
      armL.rotation.x = 0.2 - Math.sin(titanCycle * 1.2) * 0.3;

      // Single Cyclops eye scanning looking around
      eyeSocket.rotation.y = Math.sin(titanCycle * 0.5) * 0.25;
      eyeSocket.rotation.x = Math.cos(titanCycle * 0.4) * 0.12;

      // Smith Forge Hammer Pulsing Glow
      if (weaponGlow) {
        weaponGlow.intensity = 1.6 + Math.sin(titanCycle * 3) * 0.4 + (Math.random() - 0.5) * 0.2;
      }
    },
  };
}

// -------------------------------------------------------------
// 5. TRAINING DUMMY (Interactive wooden combat post with straw torso, target arms & bullseye)
// -------------------------------------------------------------
export function createTrainingDummyMesh(): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const woodDarkMat = getMat(0x451a03, { roughness: 0.85 });
  const woodLightMat = getMat(0x78350f, { roughness: 0.8 });
  const strawMat = getMat(0xd97706, { roughness: 0.9 });
  const ropeMat = getMat(0x92400e, { roughness: 0.95 });
  const ironMat = getMat(0x64748b, { metalness: 0.7, roughness: 0.3 });
  const bullseyeRedMat = getMat(0xdc2626, { roughness: 0.5 });
  const bullseyeWhiteMat = getMat(0xf8fafc, { roughness: 0.4 });

  // 1. Stone/Wood Cross Base
  const baseCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.22), woodDarkMat);
  baseCross1.position.y = 0.06;
  const baseCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.8), woodDarkMat);
  baseCross2.position.y = 0.06;
  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.18, 12), ironMat);
  baseRing.position.y = 0.09;
  root.add(baseCross1, baseCross2, baseRing);

  // 2. Central Wooden Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 10), woodLightMat);
  post.position.y = 0.8;
  root.add(post);

  // 3. Straw Stuffed Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.75, 12), strawMat);
  torso.position.y = 0.95;

  // Straw Head / Helmet Pot
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), strawMat);
  head.position.y = 1.45;
  const helmPot = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 8), ironMat);
  helmPot.position.y = 1.58;

  // Rope bindings around torso
  const rope1 = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 16), ropeMat);
  rope1.rotation.x = Math.PI / 2;
  rope1.position.y = 1.15;
  const rope2 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 16), ropeMat);
  rope2.rotation.x = Math.PI / 2;
  rope2.position.y = 0.75;

  // Painted Target Bullseye on Chest
  const bullOuter = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), bullseyeRedMat);
  bullOuter.position.set(0, 0.98, 0.29);
  const bullMid = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), bullseyeWhiteMat);
  bullMid.position.set(0, 0.98, 0.295);
  const bullCenter = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), bullseyeRedMat);
  bullCenter.position.set(0, 0.98, 0.3);

  // Crossbar Arms with Target Shields
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), woodLightMat);
  crossbar.position.set(0, 1.05, 0);

  const leftShield = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), ironMat);
  leftShield.rotation.z = Math.PI / 2;
  leftShield.position.set(-0.65, 1.05, 0);

  const rightShield = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12), ironMat);
  rightShield.rotation.z = Math.PI / 2;
  rightShield.position.set(0.65, 1.05, 0);

  root.add(torso, head, helmPot, rope1, rope2, bullOuter, bullMid, bullCenter, crossbar, leftShield, rightShield);

  let dummyCycle = 0;
  let wobble = 0;

  return {
    group,
    updateAnimation: (delta: number) => {
      dummyCycle += delta * 4;
      // Gentle spring vibration/sway
      wobble = Math.sin(dummyCycle) * 0.02;
      root.rotation.z = wobble;
      root.rotation.x = Math.cos(dummyCycle * 0.7) * 0.015;
    },
  };
}

// -------------------------------------------------------------
// 6. DRAGON & DRAGON LORD (Sculpted winged drake, serpentine neck, flapping wings)
// -------------------------------------------------------------
export function createDragonMesh(isLord: boolean = false): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const scaleMat = getMat(isLord ? 0xdc2626 : 0x16a34a, { roughness: 0.6, metalness: 0.2 });
  const bellyMat = getMat(isLord ? 0xf97316 : 0xca8a04, { roughness: 0.7 });
  const wingMat = getMat(isLord ? 0x991b1b : 0x15803d, { roughness: 0.5, transparent: true, opacity: 0.9 });
  const eyeMat = getMat(isLord ? 0xfacc15 : 0xf97316, { emissive: isLord ? 0xeab308 : 0xea580c, emissiveIntensity: 1.0 });
  const hornMat = getMat(0x18181b, { roughness: 0.3 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), scaleMat);
  body.scale.set(0.9, 0.8, 1.4);
  body.position.set(0, 0.6, 0);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), bellyMat);
  belly.scale.set(0.8, 0.7, 1.25);
  belly.position.set(0, 0.5, 0.05);
  root.add(body, belly);

  // Neck & Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.85, 0.65);

  const headMesh = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 8), scaleMat);
  headMesh.rotation.x = Math.PI / 2.3;
  headMesh.position.set(0, 0.05, 0.2);

  // Horns
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), hornMat);
  hornL.rotation.set(-0.5, -0.3, -0.4);
  hornL.position.set(-0.16, 0.2, -0.05);

  const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), hornMat);
  hornR.rotation.set(-0.5, 0.3, 0.4);
  hornR.position.set(0.16, 0.2, -0.05);

  // Glowing eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  eyeL.position.set(-0.14, 0.1, 0.25);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  eyeR.position.set(0.14, 0.1, 0.25);

  headGroup.add(headMesh, hornL, hornR, eyeL, eyeR);
  root.add(headGroup);

  // Wings (Flapping articulators)
  const wingLeftPivot = new THREE.Group();
  wingLeftPivot.position.set(-0.45, 0.8, 0);
  const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), wingMat);
  wingLeft.position.set(-0.4, 0, 0);
  wingLeftPivot.add(wingLeft);

  const wingRightPivot = new THREE.Group();
  wingRightPivot.position.set(0.45, 0.8, 0);
  const wingRight = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), wingMat);
  wingRight.position.set(0.4, 0, 0);
  wingRightPivot.add(wingRight);

  root.add(wingLeftPivot, wingRightPivot);

  // Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.5, -0.7);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 0.7, 8), scaleMat);
  tail.rotation.x = -Math.PI / 3;
  tail.position.set(0, 0, -0.3);
  tailPivot.add(tail);
  root.add(tailPivot);

  let cycle = 0;
  return {
    group,
    updateAnimation: (delta: number) => {
      cycle += delta * 6;
      wingLeftPivot.rotation.z = Math.sin(cycle) * 0.45;
      wingRightPivot.rotation.z = -Math.sin(cycle) * 0.45;
      tailPivot.rotation.y = Math.sin(cycle * 0.8) * 0.35;
      headGroup.rotation.y = Math.sin(cycle * 0.5) * 0.1;
    },
  };
}

// -------------------------------------------------------------
// 7. DEMON & DEMON OVERLORD (Fiery arched horns, dark obsidian skin, glowing core)
// -------------------------------------------------------------
export function createDemonMesh(isOverlord: boolean = false): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const skinMat = getMat(isOverlord ? 0x991b1b : 0xc2410c, { roughness: 0.5 });
  const hornMat = getMat(0x18181b, { roughness: 0.2 });
  const eyeMat = getMat(0xfef08a, { emissive: 0xfacc15, emissiveIntensity: 1.2 });
  const fireMat = getMat(0xf97316, { emissive: 0xea580c, emissiveIntensity: 0.8 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.24, 0.75, 8), skinMat);
  torso.position.set(0, 0.85, 0);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
  head.position.set(0, 1.35, 0);

  // Massive horns
  const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), hornMat);
  hornL.rotation.set(-0.4, -0.3, -0.6);
  hornL.position.set(-0.18, 1.5, 0);

  const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), hornMat);
  hornR.rotation.set(-0.4, 0.3, 0.6);
  hornR.position.set(0.18, 1.5, 0);

  // Glowing eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  eyeL.position.set(-0.1, 1.38, 0.2);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
  eyeR.position.set(0.1, 1.38, 0.2);

  // Fiery chest rune / core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), fireMat);
  core.position.set(0, 0.95, 0.24);

  // Demonic Wings
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.4), hornMat);
  wingL.rotation.set(0.2, 0.4, 0.3);
  wingL.position.set(-0.45, 1.1, -0.2);

  const wingR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.04, 0.4), hornMat);
  wingR.rotation.set(0.2, -0.4, -0.3);
  wingR.position.set(0.45, 1.1, -0.2);

  root.add(torso, head, hornL, hornR, eyeL, eyeR, core, wingL, wingR);

  let cycle = 0;
  return {
    group,
    updateAnimation: (delta: number) => {
      cycle += delta * 4;
      core.scale.setScalar(1 + Math.sin(cycle * 2) * 0.15);
      root.position.y = Math.sin(cycle) * 0.05;
    },
  };
}

// -------------------------------------------------------------
// 8. PIRATE & PIRATE CAPTAIN (Tricorn hat, cutlass blade, swagger walk)
// -------------------------------------------------------------
export function createPirateMesh(isCaptain: boolean = false): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const coatMat = getMat(isCaptain ? 0x991b1b : 0x0284c7, { roughness: 0.6 });
  const hatMat = getMat(0x18181b, { roughness: 0.4 });
  const skinMat = getMat(0xfbcfe8, { roughness: 0.7 });
  const goldMat = getMat(0xf59e0b, { metalness: 0.7, roughness: 0.3 });
  const steelMat = getMat(0x94a3b8, { metalness: 0.8, roughness: 0.2 });

  // Body & Coat
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.65, 8), coatMat);
  body.position.set(0, 0.7, 0);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skinMat);
  head.position.set(0, 1.15, 0);

  // Tricorn Pirate Hat
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 12), hatMat);
  hatBrim.position.set(0, 1.3, 0);
  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 6), hatMat);
  hatTop.position.set(0, 1.42, 0);

  // Gold Trim on Hat
  const hatTrim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.02, 6, 12), goldMat);
  hatTrim.rotation.x = Math.PI / 2;
  hatTrim.position.set(0, 1.3, 0);

  // Cutlass Blade
  const sword = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), steelMat);
  sword.position.set(0.35, 0.65, 0.2);
  sword.rotation.x = 0.4;

  root.add(body, head, hatBrim, hatTop, hatTrim, sword);

  let cycle = 0;
  return {
    group,
    updateAnimation: (delta: number) => {
      cycle += delta * 5;
      root.rotation.z = Math.sin(cycle) * 0.05;
      sword.rotation.z = Math.sin(cycle * 1.5) * 0.15;
    },
  };
}

// -------------------------------------------------------------
// 9. BEHEMOTH (Hulking primal titan, massive horns, thick fur)
// -------------------------------------------------------------
export function createBehemothMesh(): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const furMat = getMat(0x543310, { roughness: 0.9 });
  const skinMat = getMat(0x785233, { roughness: 0.8 });
  const tuskMat = getMat(0xfef08a, { roughness: 0.3 });
  const eyeMat = getMat(0xef4444, { emissive: 0xdc2626, emissiveIntensity: 0.9 });

  // Hulking massive torso
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 10), furMat);
  torso.scale.set(1.2, 1.0, 1.1);
  torso.position.set(0, 0.9, 0);

  // Head & Tusks
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), skinMat);
  head.position.set(0, 1.25, 0.45);

  const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), tuskMat);
  tuskL.rotation.set(-0.8, -0.4, 0);
  tuskL.position.set(-0.25, 1.15, 0.7);

  const tuskR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 8), tuskMat);
  tuskR.rotation.set(-0.8, 0.4, 0);
  tuskR.position.set(0.25, 1.15, 0.7);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
  eyeL.position.set(-0.15, 1.35, 0.65);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
  eyeR.position.set(0.15, 1.35, 0.65);

  root.add(torso, head, tuskL, tuskR, eyeL, eyeR);

  let cycle = 0;
  return {
    group,
    updateAnimation: (delta: number) => {
      cycle += delta * 3.5;
      root.position.y = Math.sin(cycle) * 0.04;
      head.rotation.y = Math.sin(cycle * 0.7) * 0.1;
    },
  };
}

// -------------------------------------------------------------
// Unified Monster Factory Router
// -------------------------------------------------------------
export function createCraftedMonsterModel(
  modelType: string
): { group: THREE.Group; updateAnimation: (delta: number) => void } {
  if (modelType === 'training_dummy') {
    return createTrainingDummyMesh();
  }
  if (modelType === 'cave_rat') {
    return createCaveRatMesh();
  }
  if (modelType === 'rotworm' || modelType === 'carrion_worm' || modelType === 'rotworm_queen') {
    return createRotwormMesh(modelType);
  }
  if (modelType === 'skeleton') {
    return createSkeletonWarriorMesh();
  }
  if (modelType === 'cyclops' || modelType === 'cyclops_smith') {
    return createCyclopsMesh(modelType);
  }
  if (modelType === 'dragon' || modelType === 'dragon_lord') {
    return createDragonMesh(modelType === 'dragon_lord');
  }
  if (modelType === 'demon' || modelType === 'demon_overlord') {
    return createDemonMesh(modelType === 'demon_overlord');
  }
  if (modelType === 'pirate' || modelType === 'pirate_captain') {
    return createPirateMesh(modelType === 'pirate_captain');
  }
  if (modelType === 'behemoth') {
    return createBehemothMesh();
  }
  if (modelType === 'hero' || modelType === 'hero_champion' || modelType === 'black_knight') {
    return createSkeletonWarriorMesh();
  }

  return createSkeletonWarriorMesh();
}

