import * as THREE from 'three';

export interface NpcDefinition {
  id: string;
  name: string;
  title: string;
  type: 'alchemist' | 'blacksmith' | 'captain' | 'stash';
  x: number;
  z: number;
  rotY: number;
  dialogueGreeting: string;
}

export const THAIS_NPCS: NpcDefinition[] = [
  {
    id: 'npc_alchemist',
    name: 'Alchemist Garan',
    title: 'Potion & Mana Merchant',
    type: 'alchemist',
    x: 18,
    z: 18,
    rotY: Math.PI / 4,
    dialogueGreeting: 'Welcome traveler! Need health or mana potions for your dungeon expedition?',
  },
  {
    id: 'npc_blacksmith',
    name: 'Blacksmith Gunnar',
    title: 'Weapon & Armor Master',
    type: 'blacksmith',
    x: 24,
    z: 18,
    rotY: -Math.PI / 4,
    dialogueGreeting: 'Hah! Looking to upgrade your blade or shield? I forge only the finest steel!',
  },
  {
    id: 'npc_captain',
    name: 'Captain Hornwood',
    title: 'Expedition Master',
    type: 'captain',
    x: 21,
    z: 15,
    rotY: 0,
    dialogueGreeting: 'Ahoy adventurer! Ready to set sail into the uncharted dungeons and catacombs?',
  },
  {
    id: 'npc_stash',
    name: 'Bank Stash Chest',
    title: 'Secure Account Vault',
    type: 'stash',
    x: 21,
    z: 21,
    rotY: Math.PI,
    dialogueGreeting: 'Secure vault storage for your valuable items, gold, and rare gear.',
  },
];

export function createAlchemistModel(): THREE.Group {
  const group = new THREE.Group();
  
  // Body (Robe)
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }); // Deep blue robe
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.25;
  head.castShadow = true;
  group.add(head);

  // Wizard Hat
  const hatBrimGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 12);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x172554 });
  const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
  hatBrim.position.y = 1.38;
  group.add(hatBrim);

  const hatConeGeo = new THREE.ConeGeometry(0.25, 0.5, 12);
  const hatCone = new THREE.Mesh(hatConeGeo, hatMat);
  hatCone.position.y = 1.65;
  group.add(hatCone);

  // Potion Flask on belt / hand
  const flaskGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const flaskMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.5 });
  const flask = new THREE.Mesh(flaskGeo, flaskMat);
  flask.position.set(0.3, 0.6, 0.2);
  group.add(flask);

  return group;
}

export function createBlacksmithModel(): THREE.Group {
  const group = new THREE.Group();

  // Muscular Body
  const bodyGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.9, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.7 }); // Leather / apron
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Apron front
  const apronGeo = new THREE.BoxGeometry(0.4, 0.8, 0.05);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x44403c });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.set(0, 0.45, 0.23);
  group.add(apron);

  // Head
  const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.15;
  head.castShadow = true;
  group.add(head);

  // Smith Hammer in hand
  const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.rotation.z = Math.PI / 3;
  handle.position.set(0.4, 0.6, 0.1);
  group.add(handle);

  const headHammerGeo = new THREE.BoxGeometry(0.25, 0.15, 0.15);
  const headHammerMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
  const hammerHead = new THREE.Mesh(headHammerGeo, headHammerMat);
  hammerHead.position.set(0.6, 0.7, 0.1);
  group.add(hammerHead);

  return group;
}

export function createCaptainModel(): THREE.Group {
  const group = new THREE.Group();

  // Captain Uniform
  const bodyGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.0, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.23, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.25;
  head.castShadow = true;
  group.add(head);

  // Tricorne / Captain Hat
  const hatBaseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12);
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x090d16 });
  const hatBase = new THREE.Mesh(hatBaseGeo, hatMat);
  hatBase.position.y = 1.38;
  group.add(hatBase);

  const hatTopGeo = new THREE.ConeGeometry(0.22, 0.3, 12);
  const hatTop = new THREE.Mesh(hatTopGeo, hatMat);
  hatTop.position.y = 1.55;
  group.add(hatTop);

  return group;
}

export function createStashChestModel(): THREE.Group {
  const group = new THREE.Group();

  // Wooden Chest Base
  const chestGeo = new THREE.BoxGeometry(0.8, 0.60, 0.6);
  const chestMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
  const chest = new THREE.Mesh(chestGeo, chestMat);
  chest.position.y = 0.3;
  chest.castShadow = true;
  group.add(chest);

  // Gold Trim / Lock
  const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
  const lockMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 });
  const lock = new THREE.Mesh(lockGeo, lockMat);
  lock.position.set(0, 0.3, 0.31);
  group.add(lock);

  return group;
}
