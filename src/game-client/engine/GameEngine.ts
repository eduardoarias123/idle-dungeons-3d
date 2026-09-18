import * as THREE from 'three';
import { EntityState, DropItemEntity, CombatEvent, HazardField, BreakableObject, DungeonFloorInfo } from '../../types/game';
import { generateMapGrid, MapGrid } from '../../game-shared/mapLayout';
import { CharacterMeshHandle, createBlockyCharacter, createBlockyMonster, createLootMesh } from './BlockyModels';
import { buildMapEnvironmentProps, EnvironmentAnimatedProp } from './DungeonProps';
import { Spells3DFXEngine } from './Spells3DFXEngine';
import { EFFECT_CATALOG, getAtmosphereTheme } from './EffectCatalog';
import {
  THAIS_NPCS,
  NpcDefinition,
  createAlchemistModel,
  createBlacksmithModel,
  createCaptainModel,
  createStashChestModel,
} from './NpcModels';
import { logger } from '../../utils/logger';

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  z: number;
  opacity: number;
  scale: number;
  lifetime: number;
  maxLifetime: number;
  isCrit?: boolean;
}

export interface CombatParticle {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  opacity: number;
  lifetime: number;
  maxLifetime: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  dpr: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  entitiesCount: number;
  performanceMode: boolean;
  isPixelated: boolean;
}

function lerpAngle(current: number, target: number, step: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return current + diff * step;
}

interface ThreeDParticle {
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
  isShockwave?: boolean;
  isProjectile?: boolean;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  isCrit?: boolean;
  isBoss?: boolean;
  color?: string;
  updateVfx?: (progress: number, delta: number) => void;
}

function createProceduralPixelTexture(type: 'floor' | 'wall', mapId: string): THREE.CanvasTexture {
  const isTemple = mapId === 'HUB_THAIS';
  const isSewers = mapId === 'HUNT_SEWERS' || mapId.includes('CATACOMBS');
  const isDragonOrInfernal =
    mapId === 'HUNT_DRAGON_LAIR' ||
    mapId === 'HUNT_DEMON_HELL' ||
    mapId.includes('DRAGON') ||
    mapId.includes('INFERNAL');
  const isHeroOrAbyssal =
    mapId === 'HUNT_HERO_CAVE' || mapId.includes('HERO') || mapId.includes('ABYSSAL');
  const isPirate = mapId === 'HUNT_PIRATE_COVE' || mapId.includes('PIRATE');

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (type === 'floor') {
      let gridMortar = '#2e1f13';
      let gridBevel = '#c4ae97';
      let gridShadow = '#4d3927';

      if (isTemple) {
        // Authentic Warm Medieval Town Square Cobblestone & Flagstone Paving (Praça de Thais)
        gridMortar = '#382618';
        gridBevel = '#baa289';
        gridShadow = '#4a3523';

        // 1. Rich warm earthen stone base (sandstone & weathered cobblestone)
        ctx.fillStyle = '#947e68';
        ctx.fillRect(0, 0, 64, 64);

        // 2. Interlocking Flagstones & Cobblestone Paver Blocks (Warm Ochre, Sandstone, Warm Slate)
        const pavers = [
          { x: 2, y: 2, w: 28, h: 28, col: '#a89279', shade: '#85715a', hi: '#c7b29a' },
          { x: 32, y: 2, w: 30, h: 28, col: '#9c866f', shade: '#7b6853', hi: '#bba48d' },
          { x: 2, y: 32, w: 30, h: 30, col: '#b39c83', shade: '#8e7963', hi: '#d0ba9f' },
          { x: 34, y: 32, w: 28, h: 30, col: '#a18a72', shade: '#7f6b55', hi: '#beaa92' },
        ];

        // Dark earthy grout mortar background
        ctx.fillStyle = '#423325';
        ctx.fillRect(0, 0, 64, 64);

        for (const p of pavers) {
          // Main stone body
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x, p.y, p.w, p.h);

          // Sunlight bevel highlights (Top & Left)
          ctx.fillStyle = p.hi;
          ctx.fillRect(p.x, p.y, p.w, 2);
          ctx.fillRect(p.x, p.y, 2, p.h);

          // Shadow depth (Bottom & Right)
          ctx.fillStyle = p.shade;
          ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
          ctx.fillRect(p.x + p.w - 2, p.y, 2, p.h);

          // Subtle natural stone stippling / texture
          ctx.fillStyle = 'rgba(66, 51, 37, 0.18)';
          ctx.fillRect(p.x + 5, p.y + 6, 4, 3);
          ctx.fillRect(p.x + p.w - 9, p.y + 11, 5, 3);
          ctx.fillRect(p.x + 7, p.y + p.h - 8, 6, 2);

          ctx.fillStyle = 'rgba(255, 245, 230, 0.15)';
          ctx.fillRect(p.x + 11, p.y + 4, 7, 4);
        }

        // Cobblestone border trim around center
        ctx.fillStyle = '#b45309'; // Warm terracotta accent dots
        ctx.fillRect(30, 0, 3, 64);
        ctx.fillRect(0, 30, 64, 3);

        // Center Plaza Rosette Medallion (Warm Terracotta & Sun Bronze)
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(32, 32, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#c2410c'; // Terracotta star inlay
        ctx.beginPath();
        ctx.arc(32, 32, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b'; // Amber center stud
        ctx.beginPath();
        ctx.arc(32, 32, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Charming green moss / grass tufts in grout corners
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(29, 3, 3, 3);
        ctx.fillRect(3, 29, 3, 3);
        ctx.fillRect(58, 29, 3, 3);
        ctx.fillRect(29, 58, 3, 3);
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(30, 4, 1, 1);
        ctx.fillRect(4, 30, 1, 1);
      } else if (isSewers) {
        // Dark Catacomb Slate with Mossy Green Mortar
        gridMortar = '#09111c';
        gridBevel = '#166534';
        gridShadow = '#0f172a';

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#15803d'; // Moss mortar
        ctx.fillRect(0, 0, 64, 2);
        ctx.fillRect(0, 31, 64, 2);
        ctx.fillRect(0, 0, 2, 64);
        ctx.fillRect(31, 0, 2, 64);
        ctx.fillStyle = '#334155';
        ctx.fillRect(3, 3, 27, 27);
        ctx.fillRect(34, 3, 27, 27);
        ctx.fillRect(3, 34, 27, 27);
        ctx.fillRect(34, 34, 27, 27);
        // Slime specks
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(12, 14, 4, 4);
        ctx.fillRect(44, 48, 5, 3);
      } else if (isDragonOrInfernal) {
        // Scorched Volcanic Basalt with Molten Magma Seams
        gridMortar = '#170501';
        gridBevel = '#c2410c';
        gridShadow = '#2a0902';

        ctx.fillStyle = '#230a03';
        ctx.fillRect(0, 0, 64, 64);

        // Dark obsidian slabs
        ctx.fillStyle = '#3f170a';
        ctx.fillRect(3, 3, 27, 27);
        ctx.fillRect(34, 3, 27, 27);
        ctx.fillRect(3, 34, 27, 27);
        ctx.fillRect(34, 34, 27, 27);

        // Glowing magma veins
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(0, 31, 64, 2);
        ctx.fillRect(31, 0, 2, 64);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(10, 31, 14, 2);
        ctx.fillRect(31, 12, 2, 12);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(16, 31, 4, 2);
        ctx.fillRect(31, 16, 2, 4);
      } else if (isHeroOrAbyssal) {
        // Ancient Runic Granite & Lapis Lazuli Tiles
        gridMortar = '#090d1a';
        gridBevel = '#38bdf8';
        gridShadow = '#111827';

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 64, 64);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(3, 3, 27, 27);
        ctx.fillRect(34, 3, 27, 27);
        ctx.fillRect(3, 34, 27, 27);
        ctx.fillRect(34, 34, 27, 27);

        // Runic azure highlight
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(0, 31, 64, 2);
        ctx.fillRect(31, 0, 2, 64);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(12, 12, 6, 6);
        ctx.fillRect(44, 44, 6, 6);
      } else if (isPirate) {
        // Weathered Galleon Wooden Deck Planks
        gridMortar = '#1c1917';
        gridBevel = '#78716c';
        gridShadow = '#292524';

        ctx.fillStyle = '#442211';
        ctx.fillRect(0, 0, 64, 64);

        // Wood planks
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(2, 2, 60, 18);
        ctx.fillRect(2, 22, 60, 19);
        ctx.fillRect(2, 43, 60, 19);

        // Nails / studs
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(6, 10, 2, 2);
        ctx.fillRect(56, 10, 2, 2);
        ctx.fillRect(6, 31, 2, 2);
        ctx.fillRect(56, 31, 2, 2);
      } else {
        // Mount Sternum Terracotta Cavern Stone with Magma Crack
        gridMortar = '#261104';
        gridBevel = '#9a3412';
        gridShadow = '#381604';

        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(3, 3, 27, 27);
        ctx.fillRect(34, 3, 27, 27);
        ctx.fillRect(3, 34, 27, 27);
        ctx.fillRect(34, 34, 27, 27);
        ctx.fillStyle = '#f97316'; // Lava fissure
        ctx.fillRect(14, 20, 16, 2);
        ctx.fillRect(26, 22, 2, 8);
      }

      // === SQM TILE GRID / GRADES OVERLAY ===
      // Outer 1x1 SQM perimeter border frame tinted to match terrain colors
      ctx.strokeStyle = gridMortar;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 62, 62);

      // Top & Left subtle sunlight bevel for crisp isometric tile boundaries
      ctx.strokeStyle = gridBevel;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 62);
      ctx.lineTo(2, 2);
      ctx.lineTo(62, 2);
      ctx.stroke();

      // Bottom & Right depth shadow
      ctx.strokeStyle = gridShadow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 62);
      ctx.lineTo(62, 62);
      ctx.lineTo(62, 2);
      ctx.stroke();
    } else {
      // Walls
      if (isTemple) {
        // Classical Fluted Marble Balustrade / Parapet with Golden Trim & Ivy
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, 64, 64);

        // Top Handrail Molding
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 64, 4);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 4, 64, 4);
        ctx.fillStyle = '#d97706'; // Golden rim trim
        ctx.fillRect(0, 8, 64, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, 9, 64, 1);

        // Vertical Fluted Balusters Relief
        for (let bx = 6; bx < 60; bx += 14) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx, 13, 8, 42);
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
          ctx.fillRect(bx + 6, 13, 2, 42);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(bx, 13, 2, 42);
        }

        // Bottom Plinth Base
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(0, 56, 64, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 56, 64, 1.5);

        // Climbing Ivy accents
        ctx.fillStyle = '#15803d';
        ctx.fillRect(10, 38, 5, 5);
        ctx.fillRect(13, 34, 4, 4);
        ctx.fillRect(36, 42, 6, 5);
        ctx.fillRect(40, 37, 5, 4);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(11, 39, 2, 2);
        ctx.fillRect(37, 43, 2, 2);
      } else if (isSewers) {
        // Sewer Damp Brick Wall
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, 0, 64, 2);
        ctx.fillRect(0, 31, 64, 2);
        ctx.fillRect(0, 0, 2, 31);
        ctx.fillRect(31, 31, 2, 33);
        ctx.fillStyle = '#16a34a'; // Dripping moss
        ctx.fillRect(12, 4, 6, 12);
        ctx.fillRect(42, 35, 5, 10);
      } else {
        // Mount Sternum Granite Cavern Wall
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, 2, 60, 28);
        ctx.fillRect(2, 33, 60, 29);
        ctx.fillStyle = '#d97706'; // Gold/Iron ore specks
        ctx.fillRect(18, 10, 6, 6);
        ctx.fillRect(42, 44, 5, 5);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  // Contador para evitar spam de log quando o render falha repetidamente
  private renderErrorCount = 0;

  // Ultra-Lightweight Performance Configuration
  private performanceMode = true;
  private dprLimit = 0.75;
  private currentFps = 60;
  private currentFrameTimeMs = 16.6;
  private frameCount = 0;
  private lastFpsCalcTime = performance.now();

  private tileFloorTexture: THREE.CanvasTexture | null = null;
  private tileWallTexture: THREE.CanvasTexture | null = null;

  // Overlay 2D Canvas for High-Performance Text & Sparks
  private textCanvas: HTMLCanvasElement;
  private textCtx: CanvasRenderingContext2D | null;

  // Lights for dynamic dungeon illumination
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private playerTorchLight: THREE.PointLight;
  private lightSpellActiveUntil: number = 0;
  private lightSpellIsGreat: boolean = false;
  private persistentLightGroup: THREE.Group | null = null;
  private spellsFXEngine!: Spells3DFXEngine;

  // Map & Instanced Meshes
  private currentMapId = '';
  private currentFloorNumber = 1;
  private currentSeed: number | undefined = undefined;
  private mapGrid: MapGrid | null = null;
  private mapMeshes: THREE.Object3D[] = [];
  private environmentAnimatedProps: EnvironmentAnimatedProp[] = [];

  // Entities Meshes Cache
  private playerMeshHandles = new Map<string, CharacterMeshHandle>();
  private monsterMeshHandles = new Map<string, { group: THREE.Group; updateAnimation: (delta: number) => void }>();
  private dropMeshHandles = new Map<string, { group: THREE.Group; updateAnimation: (delta: number) => void }>();
  private hazardMeshHandles = new Map<string, { group: THREE.Group; mesh: THREE.Mesh; light?: THREE.PointLight }>();
  private monsterInfoMap = new Map<string, {
    name: string;
    hp: number;
    maxHp: number;
    displayHp: number;
    isBoss: boolean;
    level: number;
    modelType: string;
  }>();
  private selectedTargetId: string | null = null;
  private entityTargets = new Map<string, {
    targetX: number;
    targetZ: number;
    isMoving: boolean;
    isAttacking: boolean;
    rotation?: number;
  }>();
  private localPlayerTargetPos = new THREE.Vector3(12, 0, 12);

  // Ambient Environment Particles
  private ambientParticles: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    size: number;
    maxAlpha: number;
    color: string;
    phase: number;
  }[] = [];

  // Telegraph Mesh & Target Ring
  private telegraphMesh: THREE.Mesh | null = null;
  private targetRing: THREE.Mesh | null = null;

  // Combat Numbers & Particles
  public floatingTexts: FloatingText[] = [];
  public combatParticles: CombatParticle[] = [];
  public threeDParticles: ThreeDParticle[] = [];

  // Screen Shake system
  private screenShakeIntensity = 0;
  private screenShakeDuration = 0;
  private screenShakeTimer = 0;

  // Camera - Isometric ARPG Perspective (56° Pitch & Wide View)
  private cameraTarget = new THREE.Vector3(12, 0, 12);
  // Default: Classic Diagonal Isometric view (Pitch ~55-56°, wide viewing distance)
  private isometricOffset = new THREE.Vector3(14.0, 32.0, 18.0);
  private frontalOffset = new THREE.Vector3(0.0, 32.0, 22.0);
  private cameraOffset = new THREE.Vector3(14.0, 32.0, 18.0);

  // Smooth Zoom system (Mouse wheel & pinch support)
  public currentZoom = 1.0;
  public targetZoom = 1.0;
  public isLunia25D = true; // true = Diagonal Isometric, false = Frontal Isometric

  public setLunia25D(enabled: boolean): void {
    this.isLunia25D = enabled;
    if (this.isLunia25D) {
      // Diagonal Isometric
      this.cameraOffset.copy(this.isometricOffset);
    } else {
      // Frontal Isometric (Aligned South-North)
      this.cameraOffset.copy(this.frontalOffset);
    }
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
  }

  public toggleLunia25D(): boolean {
    this.setLunia25D(!this.isLunia25D);
    return this.isLunia25D;
  }

  public setZoom(zoom: number): void {
    this.targetZoom = Math.max(0.65, Math.min(1.4, zoom));
  }

  // Camera Feel: Hit-Stop, FOV Punch & Dynamic Battle Zoom
  private hitStopTimer = 0;
  private fovPunch = 0;
  private isInCombat = false;

  public triggerHitStop(durationSeconds: number = 0.05) {
    this.hitStopTimer = Math.max(this.hitStopTimer, durationSeconds);
  }

  public triggerFovPunch(amount: number = 3.5) {
    this.fovPunch = Math.min(10.0, this.fovPunch + amount);
  }

  // Raycasting
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // ResizeObserver
  private resizeObserver: ResizeObserver | null = null;

  // Breakables and Descent Portal
  private breakableMeshHandles = new Map<string, THREE.Group>();
  private descentPortalMesh: THREE.Group | null = null;
  private isPortalOpen = false;

  // Town Square NPCs
  private npcMeshHandles = new Map<string, { group: THREE.Group; def: NpcDefinition }>();
  private localPlayerId: string | null = null;
  private isPointerDraggingGround = false;

  // 360° Smart Aim & Ground Telegraphy Reticle
  private smartAimReticleGroup: THREE.Group | null = null;
  private smartAimOuterRing: THREE.Mesh | null = null;
  private smartAimTicks: THREE.Group | null = null;
  private smartAimCenterDot: THREE.Mesh | null = null;
  private smartAimArrowBeam: THREE.Mesh | null = null;
  private aimGroundPos = new THREE.Vector3(12, 0.04, 12);
  private aimAngle = 0;
  private isAimingActive = true;

  // Visceral Hit Feedback: Hit Stagger & Hit Flash
  private staggerMap = new Map<string, {
    dx: number;
    dz: number;
    timer: number;
    duration: number;
    intensity: number;
    hitFlashTimer: number;
  }>();

  // Callbacks
  public onGroundClick: (x: number, z: number) => void = () => {};
  public onAimMove: (x: number, z: number, angle: number) => void = () => {};
  public onEntityClick: (entityId: string) => void = () => {};
  public onBreakableClick: (breakableId: string) => void = () => {};
  public onPortalClick: () => void = () => {};
  public onNpcClick: (npcId: string) => void = () => {};

  public getAimTarget(): { x: number; z: number; angle: number } {
    return {
      x: this.aimGroundPos.x,
      z: this.aimGroundPos.z,
      angle: this.aimAngle,
    };
  }

  constructor(container: HTMLElement) {
    this.container = container;

      const width = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 800);
      const height = container.clientHeight > 0 ? container.clientHeight : (window.innerHeight || 600);

      // 1. Scene: Clean fantasy background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0f172a);

      // 2. Diablo 3 Isometric ARPG Perspective Camera
      const aspect = width / Math.max(1, height);
      this.camera = new THREE.PerspectiveCamera(38, aspect, 0.5, 200);
      this.camera.position.copy(this.cameraTarget).add(this.cameraOffset);
      this.camera.lookAt(this.cameraTarget);

      // 3. WebGL Renderer with Crisp Native High-DPI Resolution
      this.renderer = new THREE.WebGLRenderer({
        powerPreference: 'high-performance',
        antialias: true,
        stencil: false,
        depth: true,
        precision: 'highp',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      // Explicitly enforce ZERO shadows
      this.renderer.shadowMap.enabled = false;
      this.renderer.shadowMap.autoUpdate = false;
      container.appendChild(this.renderer.domElement);

      // 4. Overlay 2D Canvas for Text & Particle Rendering
      this.textCanvas = document.createElement('canvas');
      this.textCanvas.style.position = 'absolute';
      this.textCanvas.style.top = '0';
      this.textCanvas.style.left = '0';
      this.textCanvas.style.width = '100%';
      this.textCanvas.style.height = '100%';
      this.textCanvas.style.pointerEvents = 'none';
      this.textCanvas.style.zIndex = '15';
      this.textCtx = this.textCanvas.getContext('2d');
      container.appendChild(this.textCanvas);
      this.resizeTextCanvas();

      // 5. Bright Dungeon Lighting (1 Ambient + 1 Key Directional + 1 Rim Light + 1 Player Torch Light)
      this.ambientLight = new THREE.AmbientLight(0xfff7ed, 1.55);
      this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.6);
      this.dirLight.position.set(24, 38, 18);
      this.dirLight.castShadow = false;

      this.rimLight = new THREE.DirectionalLight(0x67e8f9, 0.9);
      this.rimLight.position.set(-20, 24, -20);
      this.rimLight.castShadow = false;

      // Player crystal lantern light for cave illumination
      this.playerTorchLight = new THREE.PointLight(0xffedd5, 1.3, 16, 1.0);
      this.playerTorchLight.position.set(12, 2.2, 12);
      this.playerTorchLight.castShadow = false;

      this.scene.add(this.ambientLight);
      this.scene.add(this.dirLight);
      this.scene.add(this.rimLight);
      this.scene.add(this.playerTorchLight);

      // Instantiate Spells 3D FX Engine
      this.spellsFXEngine = new Spells3DFXEngine(this.scene);

      // Create Target Ring Selector
      this.createTargetRing();

      // Create 360° Smart Aim & Ground Telegraph Reticle
      this.createSmartAimReticle();

      // Create Boss Telegraph Ground Disc
      this.createTelegraphMesh();

      // Initial Map Setup
      this.setMap('HUB_THAIS');

      // Events
      this.bindEvents();

      // Start 60 FPS Render Loop
      this.startLoop();
  }

  public triggerScreenShake(intensity = 0.25, duration = 0.2) {
    this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
    this.screenShakeDuration = duration;
    this.screenShakeTimer = duration;
  }

  public setPerformanceMode(enabled: boolean) {
    this.performanceMode = enabled;
    const targetDpr = enabled ? this.dprLimit : Math.min(window.devicePixelRatio, 1.0);
    this.renderer.setPixelRatio(targetDpr);
    this.setTextureFilteringPixelated(enabled);
  }

  public isPerformanceMode(): boolean {
    return this.performanceMode;
  }

  public getDprLimit(): number {
    return this.dprLimit;
  }

  public isPixelatedFiltering(): boolean {
    return this.performanceMode;
  }

  public setPixelatedFiltering(pixelated: boolean) {
    this.setTextureFilteringPixelated(pixelated);
  }

  public setDprLimit(dpr: number) {
    this.dprLimit = Math.max(0.5, Math.min(1.0, dpr));
    if (this.performanceMode) {
      this.renderer.setPixelRatio(this.dprLimit);
    }
  }

  public setTextureFilteringPixelated(pixelated: boolean) {
    const filter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
    if (this.tileFloorTexture) {
      this.tileFloorTexture.magFilter = filter;
      this.tileFloorTexture.minFilter = filter;
      this.tileFloorTexture.needsUpdate = true;
    }
    if (this.tileWallTexture) {
      this.tileWallTexture.magFilter = filter;
      this.tileWallTexture.minFilter = filter;
      this.tileWallTexture.needsUpdate = true;
    }
    if (this.renderer.domElement) {
      this.renderer.domElement.style.imageRendering = pixelated ? 'pixelated' : 'auto';
    }
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    const info = this.renderer.info;
    const totalEntities =
      this.playerMeshHandles.size + this.monsterMeshHandles.size + this.dropMeshHandles.size;

    return {
      fps: this.currentFps,
      frameTimeMs: this.currentFrameTimeMs,
      dpr: this.renderer.getPixelRatio(),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      entitiesCount: totalEntities,
      performanceMode: this.performanceMode,
      isPixelated: this.performanceMode,
    };
  }

  private resizeTextCanvas() {
    if (!this.textCanvas || !this.container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.textCanvas.width = this.container.clientWidth * dpr;
    this.textCanvas.height = this.container.clientHeight * dpr;
    if (this.textCtx) {
      this.textCtx.scale(dpr, dpr);
    }
  }

  private createTargetRing() {
    const geo = new THREE.RingGeometry(0.7, 0.85, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.targetRing = new THREE.Mesh(geo, mat);
    this.targetRing.rotation.x = -Math.PI / 2;
    this.targetRing.position.y = 0.05;
    this.targetRing.visible = false;
    this.scene.add(this.targetRing);
  }

  private createTelegraphMesh() {
    const geo = new THREE.CircleGeometry(2.4, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.telegraphMesh = new THREE.Mesh(geo, mat);
    this.telegraphMesh.rotation.x = -Math.PI / 2;
    this.telegraphMesh.position.y = 0.04;
    this.telegraphMesh.visible = false;
    this.scene.add(this.telegraphMesh);
  }

  private createSmartAimReticle() {
    this.smartAimReticleGroup = new THREE.Group();
    this.smartAimReticleGroup.position.set(12, 0.04, 12);

    // 1. Outer Glowing Runic Aim Ring
    const ringGeo = new THREE.RingGeometry(0.72, 0.84, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    this.smartAimOuterRing = new THREE.Mesh(ringGeo, ringMat);
    this.smartAimOuterRing.rotation.x = -Math.PI / 2;
    this.smartAimReticleGroup.add(this.smartAimOuterRing);

    // 2. Cardinal Crosshair Ticks
    this.smartAimTicks = new THREE.Group();
    const tickMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.18), tickMat);
      tick.position.set(Math.cos(angle) * 0.78, 0.005, Math.sin(angle) * 0.78);
      tick.rotation.y = -angle;
      this.smartAimTicks.add(tick);
    }
    this.smartAimReticleGroup.add(this.smartAimTicks);

    // 3. Center Target Dot
    const dotGeo = new THREE.CircleGeometry(0.12, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.smartAimCenterDot = new THREE.Mesh(dotGeo, dotMat);
    this.smartAimCenterDot.rotation.x = -Math.PI / 2;
    this.smartAimReticleGroup.add(this.smartAimCenterDot);

    // 4. Directional Aim Vector Line / Ground Beam (Disabled per user request)
    this.smartAimArrowBeam = null;

    this.smartAimReticleGroup.visible = true;
    this.scene.add(this.smartAimReticleGroup);
  }

  public updateSmartAimReticle(x: number, z: number) {
    this.aimGroundPos.set(x, 0.04, z);
    const dx = x - this.localPlayerTargetPos.x;
    const dz = z - this.localPlayerTargetPos.z;
    this.aimAngle = Math.atan2(dx, dz);
    this.isAimingActive = true;
    this.onAimMove(x, z, this.aimAngle);
  }

  public setMap(mapId: string, floorNumber: number = 1, seed?: number) {
    const isSameMap = this.currentMapId === mapId && this.currentFloorNumber === floorNumber;
    const isSeedMatch = seed === undefined || this.currentSeed === seed || (this.currentSeed !== undefined && seed === undefined);

    if (isSameMap && isSeedMatch && this.mapMeshes.length > 0) {
      if (seed !== undefined && this.currentSeed === undefined) {
        this.currentSeed = seed;
      }
      return;
    }

    this.currentMapId = mapId;
    this.currentFloorNumber = floorNumber;
    this.currentSeed = seed;

    // Cleanly dispose previous procedural textures
    if (this.tileFloorTexture) {
      this.tileFloorTexture.dispose();
      this.tileFloorTexture = null;
    }
    if (this.tileWallTexture) {
      this.tileWallTexture.dispose();
      this.tileWallTexture = null;
    }

    // Remove old map meshes and dispose geometries (do NOT dispose shared static MATS materials!)
    for (const mesh of this.mapMeshes) {
      this.scene.remove(mesh);
      mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      });
    }
    this.mapMeshes = [];
    this.environmentAnimatedProps = [];

    // Clear active 3D particles when changing maps
    for (const p of this.threeDParticles) {
      this.scene.remove(p.mesh);
      p.mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
    this.threeDParticles = [];

    // Clear hazards when changing maps
    for (const [, h] of this.hazardMeshHandles.entries()) {
      this.scene.remove(h.group);
      h.group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
    this.hazardMeshHandles.clear();

    // Clear NPCs when changing maps
    for (const [, handle] of this.npcMeshHandles.entries()) {
      this.scene.remove(handle.group);
      handle.group.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      });
    }
    this.npcMeshHandles.clear();

    // Generate Layout
    this.mapGrid = generateMapGrid(mapId, floorNumber, seed);
    const grid = this.mapGrid;
    const isTemple = mapId === 'HUB_THAIS';
    const isSewers = mapId === 'HUNT_SEWERS';
    const isRuins = mapId === 'HUNT_RUINS';

    // Set clear, vibrant, well-lit floor and wall colors customized per hunt
    const floorColor = isTemple ? 0xffffff : isSewers ? 0x94a3b8 : 0xca8a04; // Golden-brown for Mount Sternum, Slate for Sewers
    const wallColor = isTemple ? 0xf1f5f9 : isSewers ? 0x475569 : 0x334155; // Dark granite for Mount Sternum

    // Adjust dynamic lighting per area so dungeons are bright and fully illuminated
    if (isTemple) {
      // Warm outdoor town square daylight & soft horizon haze
      this.scene.background = new THREE.Color(0x60a5fa); // Rich clear sky blue
      this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.009); // Soft atmospheric horizon haze
      this.ambientLight.color.setHex(0xfef3c7); // Warm amber ambient sunlight
      this.ambientLight.intensity = 1.35;
      this.dirLight.color.setHex(0xffedd5); // Warm golden direct sun
      this.dirLight.intensity = 1.45;
      this.dirLight.position.set(16, 28, 14);
      this.rimLight.color.setHex(0xfde68a); // Golden sun rim
      this.rimLight.intensity = 0.8;
      this.playerTorchLight.intensity = 1.2; // Daylight aura
      this.playerTorchLight.distance = 24;
    } else if (isSewers) {
      // Atmospheric Sewers (Clean illumination)
      this.scene.background = new THREE.Color(0x020617);
      this.scene.fog = new THREE.FogExp2(0x021627, 0.012);
      this.ambientLight.color.setHex(0x334155); // Slate sewer shadow
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0x64748b);
      this.dirLight.intensity = 0.85;
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 0.7;
      this.playerTorchLight.intensity = 6.5; // Base torch light
      this.playerTorchLight.distance = 28;
    } else {
      // Atmospheric Cyclops Cavern / Ruins (Clean illumination)
      this.scene.background = new THREE.Color(0x0f0502); // Cavern background
      this.scene.fog = new THREE.FogExp2(0x1c0a03, 0.012);
      this.ambientLight.color.setHex(0x451a03); // Warm amber shadow
      this.ambientLight.intensity = 0.70;
      this.dirLight.color.setHex(0x78350f);
      this.dirLight.intensity = 0.80;
      this.rimLight.color.setHex(0x9a3412);
      this.rimLight.intensity = 0.7;
      this.playerTorchLight.intensity = 6.5; // Base torch light
      this.playerTorchLight.distance = 28;
    }

    this.tileFloorTexture = createProceduralPixelTexture('floor', mapId);
    this.tileWallTexture = createProceduralPixelTexture('wall', mapId);
    this.setTextureFilteringPixelated(this.performanceMode);

    // Initialize atmospheric environment particles for the current zone
    this.initAmbientParticles();

    // Fast MeshLambertMaterial for Instanced Floor & Walls (10x faster than Standard PBR)
    const floorGeo = new THREE.BoxGeometry(1, 0.2, 1);
    const floorMat = new THREE.MeshLambertMaterial({
      color: floorColor,
      map: this.tileFloorTexture,
      flatShading: true,
    });
    const floorMesh = new THREE.InstancedMesh(floorGeo, floorMat, grid.width * grid.height);

    const wallGeo = new THREE.BoxGeometry(1, 1.8, 1);
    const wallMat = new THREE.MeshLambertMaterial({
      color: wallColor,
      map: this.tileWallTexture,
      flatShading: true,
    });
    const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, grid.width * grid.height);

    let floorCount = 0;
    let wallCount = 0;
    const dummy = new THREE.Object3D();

    for (let z = 0; z < grid.height; z++) {
      for (let x = 0; x < grid.width; x++) {
        const type = grid.tiles[z][x];
        dummy.position.set(x + 0.5, -0.1, z + 0.5);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        floorMesh.setMatrixAt(floorCount++, dummy.matrix);

        if (type === 'wall') {
          if (!isTemple) {
            dummy.position.set(x + 0.5, 0.9, z + 0.5);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            wallMesh.setMatrixAt(wallCount++, dummy.matrix);
          }
        }
      }
    }

    floorMesh.count = floorCount;
    wallMesh.count = wallCount;
    floorMesh.instanceMatrix.needsUpdate = true;
    wallMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(floorMesh);
    this.scene.add(wallMesh);
    this.mapMeshes.push(floorMesh, wallMesh);

    // Build handcrafted 3D architectural & atmospheric environment props
    const env = buildMapEnvironmentProps(this.mapGrid);
    this.scene.add(env.group);
    this.mapMeshes.push(env.group);
    this.environmentAnimatedProps = env.animatedProps;

    // Instantiate Town Square Interactive NPCs in HUB_THAIS
    if (mapId === 'HUB_THAIS') {
      for (const npcDef of THAIS_NPCS) {
        let model: THREE.Group;
        if (npcDef.type === 'alchemist') {
          model = createAlchemistModel();
        } else if (npcDef.type === 'blacksmith') {
          model = createBlacksmithModel();
        } else if (npcDef.type === 'captain') {
          model = createCaptainModel();
        } else {
          model = createStashChestModel();
        }
        model.position.set(npcDef.x, 0, npcDef.z);
        model.rotation.y = npcDef.rotY;
        this.scene.add(model);
        this.npcMeshHandles.set(npcDef.id, { group: model, def: npcDef });
      }
    }
  }

  // Spawn Temporary 3D Particles at Target Entity's 3D World Position
  public spawnHitParticles3D(x: number, y: number, z: number, isCrit: boolean, isBoss: boolean, colorStr: string) {
    const particleCount = isCrit ? 10 : 5;
    const colorHex = isCrit ? 0xff2a2a : (colorStr.startsWith('#') ? parseInt(colorStr.replace('#', '0x'), 16) : 0xfef08a);

    // 1. 3D Geometric Shards (Dodecahedron & Cubes)
    for (let i = 0; i < particleCount; i++) {
      const isCube = i % 2 === 0;
      const shardGeo = isCube ? new THREE.BoxGeometry(0.12, 0.12, 0.12) : new THREE.DodecahedronGeometry(0.09, 0);
      const shardMat = new THREE.MeshBasicMaterial({
        color: isCrit && i % 2 === 0 ? 0xffaa00 : colorHex,
        wireframe: false,
      });
      const shardMesh = new THREE.Mesh(shardGeo, shardMat);
      shardMesh.position.set(
        x + (Math.random() * 0.4 - 0.2),
        y + 0.5 + (Math.random() * 0.4 - 0.2),
        z + (Math.random() * 0.4 - 0.2)
      );

      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = (isCrit ? 3.5 : 2.0) + Math.random() * 1.5;
      const upSpeed = (isCrit ? 4.5 : 2.5) + Math.random() * 2.0;

      this.scene.add(shardMesh);
      this.threeDParticles.push({
        mesh: shardMesh,
        vx: Math.cos(angle) * horizontalSpeed,
        vy: upSpeed,
        vz: Math.sin(angle) * horizontalSpeed,
        rotSpeedX: (Math.random() - 0.5) * 16,
        rotSpeedY: (Math.random() - 0.5) * 16,
        rotSpeedZ: (Math.random() - 0.5) * 16,
        lifetime: 0,
        maxLifetime: isCrit ? 0.55 : 0.4,
        initialScale: 1.0,
      });
    }

    // 2. 3D Shockwave Ring for Critical and Boss Hits
    if (isCrit || isBoss) {
      const ringGeo = new THREE.RingGeometry(0.2, 0.35, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isCrit ? 0xff3b30 : 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, 0.08, z);

      this.scene.add(ringMesh);
      this.threeDParticles.push({
        mesh: ringMesh,
        vx: 0,
        vy: 0.2,
        vz: 0,
        rotSpeedX: 0,
        rotSpeedY: 0,
        rotSpeedZ: 0,
        lifetime: 0,
        maxLifetime: 0.35,
        initialScale: 1.0,
        isShockwave: true,
      });
    }

    // Also spawn 2D sparks on text overlay for extra particle density
    this.spawnHitSparks(x, y, z, isCrit, colorStr);
  }

  private spawnHitSparks(x: number, y: number, z: number, isCrit: boolean, color: string) {
    const count = isCrit ? 8 : 4;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isCrit ? 3.2 : 2.0) + Math.random() * 1.5;
      this.combatParticles.push({
        id: 'p_' + Math.random(),
        x,
        y: y + 0.4,
        z,
        vx: Math.cos(angle) * speed,
        vy: 2.5 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        color: isCrit ? (Math.random() > 0.5 ? '#ff3b30' : '#fbbf24') : color,
        size: isCrit ? 4.5 : 3.0,
        opacity: 1.0,
        lifetime: 0,
        maxLifetime: 0.4 + Math.random() * 0.2,
      });
    }
  }

  private createProjectileMesh(vfxType: string, colorStr: string): THREE.Group {
    const group = new THREE.Group();
    const colorHex = parseInt((colorStr || '#facc15').replace('#', '0x'), 16);

    if (vfxType === 'arrow') {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.65, 6),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 })
      );
      shaft.rotation.x = Math.PI / 2;
      group.add(shaft);

      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.18, 6),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 })
      );
      tip.rotation.x = Math.PI / 2;
      tip.position.z = 0.35;
      group.add(tip);
    } else if (vfxType === 'magic_energy') {
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshBasicMaterial({ color: colorHex || 0xc084fc })
      );
      group.add(orb);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.03, 8, 16),
        new THREE.MeshBasicMaterial({ color: 0xf0abfc, transparent: true, opacity: 0.8 })
      );
      ring.rotation.x = Math.PI / 3;
      group.add(ring);
    } else if (vfxType === 'magic_ice') {
      const ice = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.9 })
      );
      ice.scale.set(0.8, 1.5, 0.8);
      group.add(ice);
    } else {
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.2, 0),
        new THREE.MeshBasicMaterial({ color: colorHex || 0xfacc15 })
      );
      group.add(orb);
    }

    return group;
  }

  private spawnFlyingProjectile(evt: CombatEvent) {
    if (evt.sourceX === undefined || evt.sourceZ === undefined) return;
    const vfxType = evt.vfxType || 'arrow';
    const projGroup = this.createProjectileMesh(vfxType, evt.color || '#facc15');
    projGroup.position.set(evt.sourceX, evt.sourceY || 0.9, evt.sourceZ);
    this.scene.add(projGroup);

    const dx = evt.x - evt.sourceX;
    const dz = evt.z - evt.sourceZ;
    projGroup.rotation.y = Math.atan2(dx, dz);

    const dist = Math.hypot(dx, dz);
    const duration = Math.min(0.35, Math.max(0.12, dist * 0.06));

    this.threeDParticles.push({
      mesh: projGroup,
      vx: dx / duration,
      vy: 0,
      vz: dz / duration,
      rotSpeedX: 0,
      rotSpeedY: 0,
      rotSpeedZ: 0,
      lifetime: 0,
      maxLifetime: duration,
      initialScale: 1.0,
      isProjectile: true,
      targetX: evt.x,
      targetY: evt.y || 0.8,
      targetZ: evt.z,
      isCrit: evt.isCrit,
      isBoss: evt.isBossHit,
      color: evt.color || '#facc15',
    });
  }

  private spawnSpellVFX(evt: CombatEvent) {
    const vfxType = evt.vfxType || 'spell_aoe';

    if (
      vfxType === 'light_spell' ||
      vfxType === 'great_light_spell' ||
      evt.spellId === 'utevo_lux' ||
      evt.spellId === 'utevo_gran_lux'
    ) {
      const isGran = vfxType === 'great_light_spell' || evt.spellId === 'utevo_gran_lux';
      this.lightSpellActiveUntil = Date.now() + 695000;
      this.lightSpellIsGreat = isGran;
    }

    if (this.spellsFXEngine) {
      this.spellsFXEngine.spawnSpellVFX(evt, (intensity, duration) => this.triggerScreenShake(intensity, duration));
    }
  }

  private initAmbientParticles() {
    this.ambientParticles = [];
    const theme = getAtmosphereTheme(this.currentMapId);
    const colors = theme.particleColors;

    for (let i = 0; i < theme.particleCount; i++) {
      this.ambientParticles.push({
        x: (Math.random() - 0.5) * 28,
        y: Math.random() * 3.8 + 0.2,
        z: (Math.random() - 0.5) * 28,
        vx: (Math.random() - 0.5) * 0.35 + theme.driftX,
        vy: theme.baseSpeedY + (Math.random() - 0.5) * 0.08,
        vz: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2.2 + 1.2,
        maxAlpha: Math.random() * 0.55 + 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public updateState(
    currentMapId: string,
    entities: EntityState[],
    drops: DropItemEntity[],
    combatEvents: CombatEvent[],
    localPlayerId: string,
    selectedTargetId: string | null,
    hazards?: HazardField[],
    breakables?: BreakableObject[],
    floorInfo?: DungeonFloorInfo
  ) {
    this.updateWorldState(currentMapId, entities, drops, combatEvents, localPlayerId, selectedTargetId, hazards, breakables, floorInfo);
  }

  public updateWorldState(
    currentMapId: string,
    entities: EntityState[],
    drops: DropItemEntity[],
    combatEvents: CombatEvent[],
    localPlayerId: string,
    selectedTargetId: string | null,
    hazards?: HazardField[],
    breakables?: BreakableObject[],
    floorInfo?: DungeonFloorInfo
  ) {
    this.setMap(currentMapId, floorInfo?.floorNumber || 1, floorInfo?.seed);
    this.selectedTargetId = selectedTargetId || null;

    // Process Combat Events
    for (const evt of combatEvents) {
      let displayText = `${evt.damage}`;
      let textColor = evt.color || (evt.isCrit ? '#ff3b30' : '#fef08a');

      if (evt.isHeal) {
        displayText = `+${evt.damage} HP`;
        textColor = '#22c55e';
      } else if (evt.isMana) {
        displayText = `+${evt.damage} MP`;
        textColor = '#38bdf8';
      }

      if (evt.isBossHit || (evt.isCrit && evt.damage > 0)) {
        this.triggerScreenShake(evt.isCrit ? 0.35 : 0.2, 0.2);
      }

      if (evt.spellWords) {
        this.floatingTexts.push({
          id: 'txt_' + Math.random(),
          text: `"${evt.spellWords}"`,
          color: evt.color || '#facc15',
          x: evt.x,
          y: 2.2,
          z: evt.z,
          opacity: 1.0,
          scale: 1.2,
          lifetime: 0,
          maxLifetime: 1.3,
        });
      }

      if (evt.isBlocked) {
        this.floatingTexts.push({
          id: 'txt_' + Math.random(),
          text: '🛡️ BLOCKED!',
          color: '#38bdf8',
          x: evt.x + (Math.random() * 0.3 - 0.15),
          y: 1.6,
          z: evt.z + (Math.random() * 0.3 - 0.15),
          opacity: 1.0,
          scale: 1.25,
          lifetime: 0,
          maxLifetime: 1.1,
        });
        this.triggerHitStop(0.04);
        this.triggerFovPunch(1.5);
      }

      if (evt.damage > 0 || evt.isHeal || evt.isMana) {
        const textStr = evt.isCrit ? `💥 CRIT! ${displayText}` : displayText;
        this.floatingTexts.push({
          id: 'txt_' + Math.random(),
          text: textStr,
          color: evt.isCrit ? '#ff2e2e' : textColor,
          x: evt.x + (Math.random() * 0.3 - 0.15),
          y: 1.6,
          z: evt.z + (Math.random() * 0.3 - 0.15),
          opacity: 1.0,
          scale: evt.isCrit ? 1.6 : 1.0,
          lifetime: 0,
          maxLifetime: evt.isCrit ? 1.4 : 1.1,
          isCrit: evt.isCrit,
        });

        if (evt.vfxType && EFFECT_CATALOG[evt.vfxType]) {
          const profile = EFFECT_CATALOG[evt.vfxType];
          if (profile.shakeIntensity && profile.shakeDuration) {
            this.triggerScreenShake(profile.shakeIntensity, profile.shakeDuration);
          }
          if (profile.hitStopDuration) {
            this.triggerHitStop(profile.hitStopDuration);
          }
          if (profile.fovPunchAmount) {
            this.triggerFovPunch(profile.fovPunchAmount);
          }
        } else if (evt.isCrit) {
          this.triggerHitStop(0.08);
          this.triggerFovPunch(4.2);
          this.triggerScreenShake(0.48, 0.28);
        } else if (evt.vfxType === 'boss_smash' || evt.isBossHit) {
          this.triggerHitStop(0.10);
          this.triggerFovPunch(6.0);
          this.triggerScreenShake(0.65, 0.38);
        } else if (evt.damage > 30) {
          // Heavy blow visceral feedback
          this.triggerHitStop(0.04);
          this.triggerFovPunch(2.0);
          this.triggerScreenShake(0.24, 0.18);
        }

        // Hit Stagger & Directional Recoil feedback
        if (evt.targetId) {
          const srcX = evt.sourceX ?? this.localPlayerTargetPos.x;
          const srcZ = evt.sourceZ ?? this.localPlayerTargetPos.z;
          let rdx = evt.x - srcX;
          let rdz = evt.z - srcZ;
          let rlen = Math.hypot(rdx, rdz);
          if (rlen < 0.001) {
            rdx = 0;
            rdz = 1;
            rlen = 1;
          }
          rdx /= rlen;
          rdz /= rlen;

          const staggerDuration = evt.isCrit ? 0.22 : 0.15;
          const staggerIntensity = evt.isCrit ? 0.40 : (evt.isBossHit ? 0.18 : 0.25);

          this.staggerMap.set(evt.targetId, {
            dx: rdx,
            dz: rdz,
            timer: staggerDuration,
            duration: staggerDuration,
            intensity: staggerIntensity,
            hitFlashTimer: 0.12,
          });
        }

        // Spawn 3D Particles at target entity's position
        this.spawnHitParticles3D(evt.x, evt.y || 0, evt.z, Boolean(evt.isCrit), Boolean(evt.isBossHit), textColor);

        // Spawn Projectile or Spell VFX
        if (evt.sourceX !== undefined && evt.sourceZ !== undefined && evt.vfxType && evt.vfxType !== 'melee_slash') {
          const dist = Math.hypot(evt.x - evt.sourceX, evt.z - evt.sourceZ);
          if (dist > 0.4) {
            this.spawnFlyingProjectile(evt);
          }
        }
      }

      // Always process spell VFX for any spell/VFX event (including non-damage utility spells like utevo_lux)
      if (
        evt.spellId ||
        evt.vfxType === 'heal_aura' ||
        evt.vfxType === 'light_spell' ||
        evt.vfxType === 'great_light_spell' ||
        evt.vfxType === 'spectral_dash' ||
        evt.spellWords
      ) {
        this.spawnSpellVFX(evt);
      }
    }

    this.localPlayerId = localPlayerId || null;
    const activePlayerIds = new Set<string>();
    const activeMonsterIds = new Set<string>();
    const activeDropIds = new Set<string>();

    let bossTelegraphData = null;

    for (const entity of entities) {
      if (entity.type === 'player') {
        activePlayerIds.add(entity.id);
        const entityVoc = entity.vocation || 'KNIGHT';
        let handle = this.playerMeshHandles.get(entity.id);
        if (handle && handle.vocation !== entityVoc) {
          this.scene.remove(handle.group);
          this.playerMeshHandles.delete(entity.id);
          handle = undefined;
        }

        if (!handle) {
          handle = createBlockyCharacter(entityVoc);
          handle.group.position.set(entity.x, 0, entity.z);
          this.scene.add(handle.group);
          this.playerMeshHandles.set(entity.id, handle);
        }

        this.entityTargets.set(entity.id, {
          targetX: entity.targetX ?? entity.x,
          targetZ: entity.targetZ ?? entity.z,
          isMoving: Boolean(entity.isMoving),
          isAttacking: Boolean(entity.isAttacking),
          rotation: entity.rotation,
        });

        if (entity.id === localPlayerId) {
          this.localPlayerTargetPos.set(entity.x, 0, entity.z);
        }
      } else if (entity.type === 'monster') {
        activeMonsterIds.add(entity.id);
        let handle = this.monsterMeshHandles.get(entity.id);
        if (!handle) {
          handle = createBlockyMonster(entity.modelType || 'rotworm');
          handle.group.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              const prepareMat = (m: THREE.Material) => {
                const cloned = m.clone();
                if ('emissive' in cloned) {
                  const stdMat = cloned as THREE.MeshStandardMaterial;
                  cloned.userData = {
                    origEmissiveHex: stdMat.emissive.getHex(),
                    origEmissiveIntensity: stdMat.emissiveIntensity ?? 1.0,
                  };
                }
                return cloned;
              };
              if (Array.isArray(child.material)) {
                child.material = child.material.map(prepareMat);
              } else {
                child.material = prepareMat(child.material);
              }
            }
          });
          handle.group.position.set(entity.x, 0, entity.z);
          this.scene.add(handle.group);
          this.monsterMeshHandles.set(entity.id, handle);
        }

        const prevInfo = this.monsterInfoMap.get(entity.id);
        const curHp = entity.hp ?? 100;
        const maxHp = entity.maxHp ?? 100;
        this.monsterInfoMap.set(entity.id, {
          name: entity.name,
          hp: curHp,
          maxHp: maxHp,
          displayHp: prevInfo ? prevInfo.displayHp : curHp,
          isBoss: Boolean(entity.isBoss),
          level: entity.level || (entity.isBoss ? 15 : 4),
          modelType: entity.modelType || 'rotworm',
        });

        this.entityTargets.set(entity.id, {
          targetX: entity.targetX ?? entity.x,
          targetZ: entity.targetZ ?? entity.z,
          isMoving: Boolean(entity.isMoving),
          isAttacking: false,
          rotation: entity.rotation,
        });

        if (entity.telegraph) {
          bossTelegraphData = entity.telegraph;
        }
      }
    }

    if (this.telegraphMesh) {
      if (bossTelegraphData) {
        this.telegraphMesh.visible = true;
        this.telegraphMesh.position.set(bossTelegraphData.x, 0.04, bossTelegraphData.z);
        const s = bossTelegraphData.progress;
        this.telegraphMesh.scale.set(s, s, s);
      } else {
        this.telegraphMesh.visible = false;
      }
    }

    if (this.targetRing) {
      if (selectedTargetId && this.monsterMeshHandles.has(selectedTargetId)) {
        const m = this.monsterMeshHandles.get(selectedTargetId)!;
        this.targetRing.visible = true;
        this.targetRing.position.set(m.group.position.x, 0.05, m.group.position.z);
      } else {
        this.targetRing.visible = false;
      }
    }

    // Clean up dead player meshes
    for (const [id, handle] of this.playerMeshHandles.entries()) {
      if (!activePlayerIds.has(id)) {
        this.scene.remove(handle.group);
        this.playerMeshHandles.delete(id);
        this.entityTargets.delete(id);
      }
    }

    // Clean up dead monster meshes
    for (const [id, handle] of this.monsterMeshHandles.entries()) {
      if (!activeMonsterIds.has(id)) {
        this.scene.remove(handle.group);
        this.monsterMeshHandles.delete(id);
        this.entityTargets.delete(id);
        this.monsterInfoMap.delete(id);
      }
    }

    // Update Drops
    for (const drop of drops) {
      activeDropIds.add(drop.id);
      let handle = this.dropMeshHandles.get(drop.id);
      if (!handle) {
        handle = createLootMesh();
        handle.group.position.set(drop.x, 0, drop.z);
        this.scene.add(handle.group);
        this.dropMeshHandles.set(drop.id, handle);
      }
      handle.updateAnimation(0.016);
    }

    for (const [id, handle] of this.dropMeshHandles.entries()) {
      if (!activeDropIds.has(id)) {
        this.scene.remove(handle.group);
        this.dropMeshHandles.delete(id);
      }
    }

    // Update Environmental Hazard Fields (Ground Fire, Poison, Energy Pools)
    const activeHazardIds = new Set<string>();
    if (hazards && hazards.length > 0) {
      for (const h of hazards) {
        activeHazardIds.add(h.id);
        let hHandle = this.hazardMeshHandles.get(h.id);
        if (!hHandle) {
          const group = new THREE.Group();
          group.position.set(h.x, 0.04, h.z);

          let color = 0x38bdf8;
          let emissive = 0x0369a1;
          
          if (h.type === 'poison') { color = 0x22c55e; emissive = 0x15803d; }
          else if (h.type === 'fire') { color = 0xf97316; emissive = 0xc2410c; }
          else if (h.type === 'energy') { color = 0x38bdf8; emissive = 0x0369a1; }
          else if (h.type === 'boss_telegraph_meteor') { color = 0xf97316; emissive = 0xc2410c; }
          else if (h.type === 'boss_telegraph_slam') { color = 0xef4444; emissive = 0xb91c1c; }
          else if (h.type === 'boss_telegraph_deathwave') { color = 0xa855f7; emissive = 0x7e22ce; }

          // Hazard disk geometry
          const geom = new THREE.CylinderGeometry(h.radius, h.radius, 0.04, 20);
          const mat = new THREE.MeshStandardMaterial({
            color,
            emissive,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.45,
            roughness: 0.3,
          });
          const mesh = new THREE.Mesh(geom, mat);
          group.add(mesh);

          // Glowing border ring
          const ringGeom = new THREE.RingGeometry(h.radius * 0.9, h.radius, 20);
          ringGeom.rotateX(-Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
          });
          const ringMesh = new THREE.Mesh(ringGeom, ringMat);
          ringMesh.position.y = 0.025;
          group.add(ringMesh);

          let light: THREE.PointLight | undefined;
          if (!this.performanceMode) {
            light = new THREE.PointLight(color, 0.8, h.radius * 2.5, 2);
            light.position.y = 0.3;
            group.add(light);
          }

          this.scene.add(group);
          hHandle = { group, mesh, light };
          this.hazardMeshHandles.set(h.id, hHandle);
        }

        // Slight breathing animation for hazard pool
        const elapsed = (Date.now() - h.createdAt) / 1000;
        if (h.isTelegraph) {
           const progress = Math.min(1, elapsed / ((h.detonatesInMs || 1600) / 1000));
           const pulse = 1 - Math.sin(progress * Math.PI) * 0.1;
           hHandle.mesh.scale.set(pulse, 1, pulse);
           (hHandle.mesh.material as THREE.MeshStandardMaterial).opacity = 0.2 + progress * 0.6;
        } else {
           const pulse = 1 + Math.sin(elapsed * 4) * 0.05;
           hHandle.mesh.scale.set(pulse, 1, pulse);
        }
      }
    }

    for (const [hId, hHandle] of this.hazardMeshHandles.entries()) {
      if (!activeHazardIds.has(hId)) {
        this.scene.remove(hHandle.group);
        this.hazardMeshHandles.delete(hId);
      }
    }

    // Process Breakables (Chests, Barrels, Urns)
    const activeBreakableIds = new Set<string>();
    if (breakables && breakables.length > 0) {
      for (const b of breakables) {
        if (b.broken) continue; // Skip already smashed breakables
        activeBreakableIds.add(b.id);
        let bGroup = this.breakableMeshHandles.get(b.id);
        if (!bGroup) {
          bGroup = this.createBreakableModel(b);
          bGroup.position.set(b.x, b.y || 0, b.z);
          this.scene.add(bGroup);
          this.breakableMeshHandles.set(b.id, bGroup);
        }
      }
    }

    // Clean up broken/removed breakables with smash particle burst
    for (const [bId, bGroup] of this.breakableMeshHandles.entries()) {
      if (!activeBreakableIds.has(bId)) {
        this.spawnHitParticles3D(bGroup.position.x, bGroup.position.y + 0.3, bGroup.position.z, true, false, '#f59e0b');
        this.scene.remove(bGroup);
        this.breakableMeshHandles.delete(bId);
      }
    }

    // Process Descent Portal when boss is defeated
    this.isPortalOpen = Boolean(floorInfo?.portalOpen);
    if (this.isPortalOpen && floorInfo?.portalX !== undefined && floorInfo?.portalZ !== undefined) {
      if (!this.descentPortalMesh) {
        this.descentPortalMesh = this.createDescentPortalModel();
        this.scene.add(this.descentPortalMesh);
      }
      this.descentPortalMesh.position.set(floorInfo.portalX, 0.05, floorInfo.portalZ);
      this.descentPortalMesh.visible = true;
    } else if (this.descentPortalMesh) {
      this.descentPortalMesh.visible = false;
    }
  }

  private createBreakableModel(b: BreakableObject): THREE.Group {
    const group = new THREE.Group();
    group.name = `breakable_${b.id}`;

    if (b.type === 'chest') {
      // Golden trimmed Treasure Chest
      const boxMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

      const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.38), boxMat);
      baseMesh.position.y = 0.175;
      group.add(baseMesh);

      const lidMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.55, 12, 1, false, 0, Math.PI), boxMat);
      lidMesh.rotation.z = Math.PI / 2;
      lidMesh.position.y = 0.35;
      group.add(lidMesh);

      // Gold Lock & Trim
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), goldMat);
      lock.position.set(0, 0.25, 0.2);
      group.add(lock);
    } else if (b.type === 'urn') {
      // Ancient Terracotta / Stone Urn
      const urnMat = new THREE.MeshLambertMaterial({ color: 0x9a3412 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.55, 10), urnMat);
      body.position.y = 0.28;
      group.add(body);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 10), urnMat);
      neck.position.y = 0.58;
      group.add(neck);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12), urnMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.64;
      group.add(rim);
    } else {
      // Wooden banded Barrel
      const woodMat = new THREE.MeshLambertMaterial({ color: 0x92400e });
      const ironMat = new THREE.MeshLambertMaterial({ color: 0x334155 });

      const barrelBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.65, 12), woodMat);
      barrelBody.position.y = 0.33;
      group.add(barrelBody);

      const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 12), ironMat);
      bandTop.rotation.x = Math.PI / 2;
      bandTop.position.y = 0.52;
      group.add(bandTop);

      const bandBot = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 6, 12), ironMat);
      bandBot.rotation.x = Math.PI / 2;
      bandBot.position.y = 0.15;
      group.add(bandBot);
    }

    return group;
  }

  private createDescentPortalModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'descent_portal';

    // Stone Pedestal Ring
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
    const ringBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.2, 16), stoneMat);
    ringBase.position.y = 0.1;
    group.add(ringBase);

    // Glowing Swirling Cyan Portal Disc
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const portalDisc = new THREE.Mesh(new THREE.RingGeometry(0.1, 1.05, 24), portalMat);
    portalDisc.rotation.x = -Math.PI / 2;
    portalDisc.position.y = 0.22;
    group.add(portalDisc);

    // Floating Rune Ring
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
    });
    const runeRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 8, 24), runeMat);
    runeRing.rotation.x = Math.PI / 2;
    runeRing.position.y = 0.35;
    group.add(runeRing);

    // Glowing Light
    const light = new THREE.PointLight(0x06b6d4, 1.8, 8, 1.5);
    light.position.y = 0.6;
    group.add(light);

    return group;
  }

  private startLoop() {
    let lastTime = performance.now();

    const loopInner = (time: number) => {
      this.animFrameId = requestAnimationFrame(loop);

      // Pause when tab is in background to consume 0% hardware
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      let delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Rolling FPS calculation
      this.frameCount++;
      if (time - this.lastFpsCalcTime >= 400) {
        this.currentFps = Math.max(1, Math.round((this.frameCount * 1000) / (time - this.lastFpsCalcTime)));
        this.currentFrameTimeMs = Math.round(delta * 10000) / 10;
        this.frameCount = 0;
        this.lastFpsCalcTime = time;
      }

      // Handle Hit-Stop Micro-pause
      if (this.hitStopTimer > 0) {
        this.hitStopTimer -= delta;
        delta = delta * 0.15; // Micro-freeze delta for visceral impact
      }

      // Handle FOV Punch
      if (this.fovPunch > 0) {
        this.fovPunch = Math.max(0, this.fovPunch - delta * 25.0);
        this.camera.fov = 38 + this.fovPunch;
        this.camera.updateProjectionMatrix();
      } else if (this.camera.fov !== 38) {
        this.camera.fov = 38;
        this.camera.updateProjectionMatrix();
      }

      // 1. Entity Position Interpolation, Pivot Rotations & Banking (Fluid 60FPS gliding)
      const factor = Math.min(1.0, delta * 28.0);
      const rotFactor = Math.min(1.0, delta * 24.0);

      for (const [id, handle] of this.playerMeshHandles.entries()) {
        const target = this.entityTargets.get(id);
        if (target) {
          const prevX = handle.group.position.x;
          const prevZ = handle.group.position.z;
          const distToTarget = Math.hypot(target.targetX - prevX, target.targetZ - prevZ);

          if (id === this.localPlayerId && distToTarget > 1.8) {
            handle.group.position.x = target.targetX;
            handle.group.position.z = target.targetZ;
          } else {
            handle.group.position.x += (target.targetX - handle.group.position.x) * factor;
            handle.group.position.z += (target.targetZ - handle.group.position.z) * factor;
          }

          const moveDx = handle.group.position.x - prevX;
          const moveDz = handle.group.position.z - prevZ;
          const isActuallyMoving = Math.hypot(moveDx, moveDz) > 0.001 || target.isMoving;

          let targetAngle = handle.group.rotation.y;
          if (target.rotation !== undefined) {
            targetAngle = target.rotation;
          } else if (isActuallyMoving && Math.hypot(moveDx, moveDz) > 0.002) {
            targetAngle = Math.atan2(moveDx, moveDz);
          }

          const currentY = handle.group.rotation.y;
          const nextY = lerpAngle(currentY, targetAngle, rotFactor);
          handle.group.rotation.y = nextY;

          // Dynamic Body Pivot Banking (Roll into turns & pitch forward when moving)
          let angleDiff = (targetAngle - currentY) % (Math.PI * 2);
          if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          const targetRoll = isActuallyMoving ? -Math.max(-0.16, Math.min(0.16, angleDiff * 0.35)) : 0;
          handle.group.rotation.z += (targetRoll - handle.group.rotation.z) * Math.min(1.0, delta * 12);

          const targetPitch = isActuallyMoving ? 0.08 : 0;
          handle.group.rotation.x += (targetPitch - handle.group.rotation.x) * Math.min(1.0, delta * 12);

          handle.updateAnimation(isActuallyMoving, target.isAttacking, delta);
        }
      }

      for (const [id, handle] of this.monsterMeshHandles.entries()) {
        const target = this.entityTargets.get(id);
        if (target) {
          const prevX = handle.group.position.x;
          const prevZ = handle.group.position.z;
          handle.group.position.x += (target.targetX - handle.group.position.x) * factor;
          handle.group.position.z += (target.targetZ - handle.group.position.z) * factor;

          const moveDx = handle.group.position.x - prevX;
          const moveDz = handle.group.position.z - prevZ;
          const isActuallyMoving = Math.hypot(moveDx, moveDz) > 0.001 || target.isMoving;

          let targetAngle = handle.group.rotation.y;
          if (target.rotation !== undefined) {
            targetAngle = target.rotation;
          } else if (isActuallyMoving && Math.hypot(moveDx, moveDz) > 0.002) {
            targetAngle = Math.atan2(moveDx, moveDz);
          }

          // Hit Stagger Recoil & Oscillation feedback
          if (this.staggerMap.has(id)) {
            const st = this.staggerMap.get(id)!;
            st.timer -= delta;
            st.hitFlashTimer -= delta;

            const progress = Math.max(0, st.timer / st.duration);
            // Damped spring recoil oscillation
            const wobble = Math.sin(progress * Math.PI) * Math.sin(progress * 22.0) * st.intensity;
            handle.group.position.x += st.dx * wobble;
            handle.group.position.z += st.dz * wobble;

            // Hit Flash on material
            const isFlashing = st.hitFlashTimer > 0;
            handle.group.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material && 'emissive' in child.material) {
                const mat = child.material as THREE.MeshStandardMaterial;
                if (isFlashing) {
                  mat.emissive.set(0xffffff);
                  mat.emissiveIntensity = 0.85;
                } else {
                  const origHex = mat.userData?.origEmissiveHex ?? 0x000000;
                  const origIntensity = mat.userData?.origEmissiveIntensity ?? 0.0;
                  mat.emissive.setHex(origHex);
                  mat.emissiveIntensity = origIntensity;
                }
              }
            });

            if (st.timer <= 0 && st.hitFlashTimer <= 0) {
              this.staggerMap.delete(id);
            }
          }

          handle.group.rotation.y = lerpAngle(handle.group.rotation.y, targetAngle, rotFactor);
          handle.updateAnimation(delta);
        }
      }

      // 2. Smooth Camera & Dynamic Torchlight Flickering
      const camFactor = Math.min(1.0, delta * 11.0);
      this.cameraTarget.x += (this.localPlayerTargetPos.x - this.cameraTarget.x) * camFactor;
      this.cameraTarget.z += (this.localPlayerTargetPos.z - this.cameraTarget.z) * camFactor;

      // Smooth battle zoom interpolation (zooms in slightly to 0.92x during active combat)
      const battleZoomMult = this.monsterMeshHandles.size > 0 ? 0.93 : 1.0;
      const effectiveTargetZoom = this.targetZoom * battleZoomMult;
      this.currentZoom += (effectiveTargetZoom - this.currentZoom) * Math.min(1.0, delta * 8.0);
      const scaledOffset = this.cameraOffset.clone().multiplyScalar(this.currentZoom);

      this.camera.position.copy(this.cameraTarget).add(scaledOffset);

      // Follow player with flickering dungeon lantern light or active Utevo Lux / Great Lux
      const nowTime = Date.now();
      const hasLuxActive = nowTime < this.lightSpellActiveUntil;
      const isGreatLux = this.lightSpellIsGreat;
      const isTemple = this.currentMapId === 'HUB_THAIS';
      const isSewers = this.currentMapId === 'HUNT_SEWERS';

      let baseTorchIntensity = isTemple ? 1.2 : 6.5;
      let targetTorchDist = isTemple ? 24 : 28;

      if (hasLuxActive) {
        baseTorchIntensity = isGreatLux ? 45.0 : 28.0;
        targetTorchDist = isGreatLux ? 220.0 : 130.0;
        this.playerTorchLight.color.set(isGreatLux ? 0xfff8db : 0xfffae0);

        if (isTemple) {
          this.ambientLight.intensity = isGreatLux ? 2.4 : 1.95;
          this.dirLight.intensity = isGreatLux ? 2.6 : 2.10;
        } else {
          this.ambientLight.intensity = isGreatLux ? 2.20 : 1.70;
          this.dirLight.intensity = isGreatLux ? 2.40 : 1.85;
        }

        if (this.scene.fog && 'density' in this.scene.fog) {
          (this.scene.fog as THREE.FogExp2).density = 0.002;
        }

        if (!this.persistentLightGroup) {
          const group = new THREE.Group();
          const scale = isGreatLux ? 1.45 : 1.0;

          // Starlight Flare Core
          const coreGeo = new THREE.SphereGeometry(0.18 * scale, 16, 16);
          const coreMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
          const core = new THREE.Mesh(coreGeo, coreMat);
          group.add(core);

          // Anamorphic Lens Flare Spikes
          const spikeGeo = new THREE.PlaneGeometry(1.2 * scale, 0.05);
          const spikeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
          const spike1 = new THREE.Mesh(spikeGeo, spikeMat);
          const spike2 = new THREE.Mesh(spikeGeo, spikeMat);
          spike2.rotation.z = Math.PI / 2;
          group.add(spike1);
          group.add(spike2);

          // Diffraction Ring
          const ringGeo = new THREE.RingGeometry(0.2 * scale, 0.26 * scale, 32);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff8db, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          group.add(ring);

          this.scene.add(group);
          this.persistentLightGroup = group;
        }

        // Orbiting elevated light orb
        const orbitAngle = time * 0.0028;
        const orbRadius = isGreatLux ? 1.2 : 0.85;
        const orbX = this.localPlayerTargetPos.x + Math.cos(orbitAngle) * orbRadius;
        const orbZ = this.localPlayerTargetPos.z + Math.sin(orbitAngle) * orbRadius;
        const orbY = 3.6 + Math.sin(time * 0.004) * 0.25;

        this.persistentLightGroup.position.set(orbX, orbY, orbZ);
        this.persistentLightGroup.rotation.y += delta * 4.0;
        this.persistentLightGroup.rotation.z += delta * 2.0;
        this.playerTorchLight.position.set(orbX, orbY, orbZ);
      } else {
        this.playerTorchLight.color.set(0xffedd5);

        if (isTemple) {
          this.ambientLight.intensity = 1.35;
          this.dirLight.intensity = 1.45;
          if (this.scene.fog && 'density' in this.scene.fog) {
            (this.scene.fog as THREE.FogExp2).density = 0.008;
          }
        } else if (isSewers) {
          this.ambientLight.intensity = 0.75;
          this.dirLight.intensity = 0.85;
          if (this.scene.fog && 'density' in this.scene.fog) {
            (this.scene.fog as THREE.FogExp2).density = 0.012;
          }
        } else {
          this.ambientLight.intensity = 0.70;
          this.dirLight.intensity = 0.80;
          if (this.scene.fog && 'density' in this.scene.fog) {
            (this.scene.fog as THREE.FogExp2).density = 0.012;
          }
        }

        if (this.persistentLightGroup) {
          this.scene.remove(this.persistentLightGroup);
          this.persistentLightGroup = null;
        }

        this.playerTorchLight.position.set(this.localPlayerTargetPos.x, 2.2, this.localPlayerTargetPos.z);
      }

      const torchFlicker = Math.sin(time * 0.007) * (hasLuxActive ? 1.8 : 0.14) + Math.sin(time * 0.019) * (hasLuxActive ? 0.9 : 0.08);
      this.playerTorchLight.intensity = Math.max(0.1, baseTorchIntensity + torchFlicker);
      this.playerTorchLight.distance = targetTorchDist;

      // Update Spells 3D FX Engine & Stardust Field
      if (this.spellsFXEngine) {
        this.spellsFXEngine.update(delta);
        this.spellsFXEngine.updateStardustField(this.localPlayerTargetPos, hasLuxActive, isGreatLux);
      }

      // 360° Smart Aim & Reticle Beam Rendering
      if (this.smartAimReticleGroup) {
        if (this.isAimingActive) {
          this.smartAimReticleGroup.visible = true;
          this.smartAimReticleGroup.position.x = this.aimGroundPos.x;
          this.smartAimReticleGroup.position.z = this.aimGroundPos.z;

          // Rotate rune crosshair ticks
          if (this.smartAimTicks) {
            this.smartAimTicks.rotation.y += delta * 1.8;
          }

          // Check if cursor is hovering an enemy for smart target styling
          let isHoveringEnemy = false;
          for (const mHandle of this.monsterMeshHandles.values()) {
            const dist = Math.hypot(mHandle.group.position.x - this.aimGroundPos.x, mHandle.group.position.z - this.aimGroundPos.z);
            if (dist < 1.15) {
              isHoveringEnemy = true;
              break;
            }
          }

          if (this.smartAimOuterRing) {
            const ringMat = this.smartAimOuterRing.material as THREE.MeshBasicMaterial;
            if (isHoveringEnemy) {
              ringMat.color.set(0xef4444);
              ringMat.opacity = 0.95;
            } else {
              ringMat.color.set(0x38bdf8);
              ringMat.opacity = 0.65;
            }
          }

          // Directional beam removed per user request
        } else {
          this.smartAimReticleGroup.visible = false;
        }
      }

      // Screen Shake with quadratic trauma curve and rotational roll micro-shake
      if (this.screenShakeTimer > 0) {
        this.screenShakeTimer -= delta;
        const decay = Math.max(0, this.screenShakeTimer / (this.screenShakeDuration || 0.2));
        const trauma = decay * decay;
        const shakeMag = this.screenShakeIntensity * trauma;
        this.camera.position.x += (Math.random() - 0.5) * 1.8 * shakeMag;
        this.camera.position.y += (Math.random() - 0.5) * 1.2 * shakeMag;
        this.camera.position.z += (Math.random() - 0.5) * 1.8 * shakeMag;
        this.camera.rotation.z += (Math.random() - 0.5) * 0.03 * shakeMag;
      }

      this.camera.lookAt(this.cameraTarget);

      // Update 3D Environment Animated Props (Fountains, Altars, Torches, Portals, Braziers)
      const now = Date.now();
      for (let i = 0; i < this.environmentAnimatedProps.length; i++) {
        this.environmentAnimatedProps[i].update(delta, now);
      }

      // 3. Update Temporary 3D Scene Particles
      for (let i = this.threeDParticles.length - 1; i >= 0; i--) {
        const p = this.threeDParticles[i];
        p.lifetime += delta;
        const progress = Math.min(1.0, p.lifetime / p.maxLifetime);

        if (p.updateVfx) {
          p.updateVfx(progress, delta);
        } else if (p.isProjectile) {
          p.mesh.position.x += p.vx * delta;
          p.mesh.position.y += p.vy * delta;
          p.mesh.position.z += p.vz * delta;
          if (p.lifetime + delta >= p.maxLifetime && p.targetX !== undefined) {
            this.spawnHitParticles3D(p.targetX, p.targetY || 0.8, p.targetZ!, Boolean(p.isCrit), Boolean(p.isBoss), p.color || '#facc15');
          }
        } else if (p.isShockwave) {
          // Shockwave expands outwards while fading
          const scale = 1.0 + progress * 4.2;
          p.mesh.scale.set(scale, scale, 1.0);
          if (p.mesh instanceof THREE.Mesh && p.mesh.material instanceof THREE.Material) {
            p.mesh.material.opacity = Math.max(0, 0.85 * (1 - progress));
          }
        } else {
          // 3D Physical Shard Particles
          p.mesh.position.x += p.vx * delta;
          p.mesh.position.y += p.vy * delta;
          p.mesh.position.z += p.vz * delta;
          p.vy -= 14.0 * delta; // Gravity

          p.mesh.rotation.x += p.rotSpeedX * delta;
          p.mesh.rotation.y += p.rotSpeedY * delta;
          p.mesh.rotation.z += p.rotSpeedZ * delta;

          const scale = p.initialScale * Math.max(0, 1.0 - progress);
          p.mesh.scale.set(scale, scale, scale);
        }

        if (p.lifetime >= p.maxLifetime) {
          this.scene.remove(p.mesh);
          if (p.mesh instanceof THREE.Mesh) {
            p.mesh.geometry?.dispose();
            if (Array.isArray(p.mesh.material)) {
              p.mesh.material.forEach((m) => m.dispose());
            } else {
              p.mesh.material?.dispose();
            }
          }
          this.threeDParticles.splice(i, 1);
        }
      }

      // 4. Render Floating Lifebars, Names, Texts, and Ambient Spores on Overlay Canvas
      if (this.textCtx) {
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.textCtx.clearRect(0, 0, w, h);

        // A. Atmospheric Ambient Spores & Embers Particles
        const playerX = this.localPlayerTargetPos.x;
        const playerZ = this.localPlayerTargetPos.z;

        for (const ap of this.ambientParticles) {
          ap.phase += delta * 1.5;
          ap.y += ap.vy * delta;
          ap.x += ap.vx * delta + Math.sin(ap.phase) * 0.01;
          ap.z += ap.vz * delta + Math.cos(ap.phase) * 0.01;

          // Wrap around player position
          if (ap.y > 4.2) ap.y = 0.3;
          if (ap.y < 0.2) ap.y = 4.2;
          if (Math.abs(ap.x - playerX) > 16) ap.x = playerX - Math.sign(ap.x - playerX) * 15;
          if (Math.abs(ap.z - playerZ) > 16) ap.z = playerZ - Math.sign(ap.z - playerZ) * 15;

          const sp = this.projectToScreen(ap.x, ap.y, ap.z);
          if (sp.visible && sp.left >= -20 && sp.left <= w + 20 && sp.top >= -20 && sp.top <= h + 20) {
            const pulseAlpha = ap.maxAlpha * (0.6 + 0.4 * Math.sin(ap.phase));
            this.textCtx.save();
            this.textCtx.globalAlpha = Math.max(0, pulseAlpha);
            this.textCtx.fillStyle = ap.color;
            this.textCtx.beginPath();
            this.textCtx.arc(sp.left, sp.top, ap.size, 0, Math.PI * 2);
            this.textCtx.fill();
            this.textCtx.restore();
          }
        }

        // B. Monster Lifebars & Level Nameplates
        for (const [mId, mInfo] of this.monsterInfoMap.entries()) {
          const handle = this.monsterMeshHandles.get(mId);
          if (!handle) continue;

          // Smoothly animate display HP
          mInfo.displayHp += (mInfo.hp - mInfo.displayHp) * Math.min(1.0, delta * 9.0);

          const isBoss = mInfo.isBoss;
          const heightOffset = isBoss ? 2.15 : (mInfo.modelType === 'cyclops' ? 2.0 : mInfo.modelType === 'rat' ? 0.9 : 1.45);
          const mPos = handle.group.position;
          const sp = this.projectToScreen(mPos.x, heightOffset, mPos.z);

          if (sp.visible && sp.left >= -80 && sp.left <= w + 80 && sp.top >= -60 && sp.top <= h + 60) {
            const isTargeted = this.selectedTargetId === mId;
            const barW = isBoss ? 76 : 48;
            const barH = isBoss ? 6.5 : 4.5;
            const x = sp.left - barW / 2;
            const y = sp.top;

            this.textCtx.save();

            // Monster Name & Level Badge
            this.textCtx.font = isBoss ? 'bold 11px system-ui, sans-serif' : 'bold 10px system-ui, sans-serif';
            this.textCtx.textAlign = 'center';
            this.textCtx.textBaseline = 'bottom';

            const nameText = isBoss ? `👑 ${mInfo.name}` : `${mInfo.name} Lv.${mInfo.level}`;

            this.textCtx.lineWidth = 3;
            this.textCtx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            this.textCtx.strokeText(nameText, sp.left, y - 3);

            this.textCtx.fillStyle = isBoss ? '#fde047' : isTargeted ? '#fbbf24' : '#f8fafc';
            this.textCtx.fillText(nameText, sp.left, y - 3);

            // Bar Container Border & Background
            this.textCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            this.textCtx.fillRect(x - 1, y - 1, barW + 2, barH + 2);

            this.textCtx.fillStyle = '#334155';
            this.textCtx.fillRect(x, y, barW, barH);

            // Red damage lag/ghost bar
            const ghostPct = Math.max(0, Math.min(1, mInfo.displayHp / mInfo.maxHp));
            if (ghostPct > 0) {
              this.textCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';
              this.textCtx.fillRect(x, y, barW * ghostPct, barH);
            }

            // Actual HP bar fill
            const hpPct = Math.max(0, Math.min(1, mInfo.hp / mInfo.maxHp));
            if (hpPct > 0) {
              const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.22 ? '#eab308' : '#ef4444';
              this.textCtx.fillStyle = hpColor;
              this.textCtx.fillRect(x, y, barW * hpPct, barH);
            }

            // Targeted Indicator Glow / Border
            if (isTargeted) {
              this.textCtx.strokeStyle = '#facc15';
              this.textCtx.lineWidth = 1.5;
              this.textCtx.strokeRect(x - 1.5, y - 1.5, barW + 3, barH + 3);
            } else {
              this.textCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
              this.textCtx.lineWidth = 0.8;
              this.textCtx.strokeRect(x - 1, y - 1, barW + 2, barH + 2);
            }

            this.textCtx.restore();
          }
        }

        // C. Sparks
        for (let i = this.combatParticles.length - 1; i >= 0; i--) {
          const p = this.combatParticles[i];
          p.lifetime += delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.z += p.vz * delta;
          p.vy -= 9.8 * delta;
          p.opacity = Math.max(0, 1 - p.lifetime / p.maxLifetime);

          if (p.lifetime >= p.maxLifetime) {
            this.combatParticles.splice(i, 1);
            continue;
          }

          const screenPos = this.projectToScreen(p.x, p.y, p.z);
          if (screenPos.visible && screenPos.left >= -20 && screenPos.left <= w + 20) {
            this.textCtx.save();
            this.textCtx.globalAlpha = p.opacity;
            this.textCtx.fillStyle = p.color;
            this.textCtx.beginPath();
            this.textCtx.arc(screenPos.left, screenPos.top, p.size, 0, Math.PI * 2);
            this.textCtx.fill();
            this.textCtx.restore();
          }
        }

        // D. Damage Numbers
        this.textCtx.textAlign = 'center';
        this.textCtx.textBaseline = 'middle';

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
          const ft = this.floatingTexts[i];
          ft.lifetime += delta;
          ft.y += delta * (ft.isCrit ? 1.4 : 1.1);
          ft.opacity = Math.max(0, 1 - ft.lifetime / ft.maxLifetime);

          if (ft.lifetime >= ft.maxLifetime) {
            this.floatingTexts.splice(i, 1);
            continue;
          }

          const screenPos = this.projectToScreen(ft.x, ft.y, ft.z);
          if (
            screenPos.visible &&
            screenPos.left >= -80 &&
            screenPos.left <= w + 80 &&
            screenPos.top >= -80 &&
            screenPos.top <= h + 80
          ) {
            this.textCtx.save();
            this.textCtx.globalAlpha = ft.opacity;
            const fontSize = Math.round((ft.isCrit ? 18 : 14) * ft.scale);
            this.textCtx.font = `900 ${fontSize}px monospace, ui-monospace, sans-serif`;

            this.textCtx.lineWidth = ft.isCrit ? 4.5 : 3.0;
            this.textCtx.strokeStyle = '#000000';
            this.textCtx.strokeText(ft.text, screenPos.left, screenPos.top);

            this.textCtx.fillStyle = ft.color;
            this.textCtx.fillText(ft.text, screenPos.left, screenPos.top);
            this.textCtx.restore();
          }
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    // try/catch: um erro em um frame não pode matar o loop de render (nem a página)
    const loop = (time: number) => {
      try {
        loopInner(time);
      } catch (e) {
        this.renderErrorCount += 1;
        if (this.renderErrorCount <= 5 || this.renderErrorCount % 300 === 0) {
          logger.exception(
            'GameEngine.loop',
            `Exceção no loop de render 3D (ocorrência #${this.renderErrorCount})`,
            e,
            { sceneChildren: this.scene?.children?.length }
          );
        }
        // Garante que o próximo frame continue agendado mesmo após o erro
        if (!this.animFrameId) {
          this.animFrameId = requestAnimationFrame(loop);
        }
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public projectToScreen(x: number, y: number, z: number): { left: number; top: number; visible: boolean } {
    const vector = new THREE.Vector3(x, y, z);
    vector.project(this.camera);

    const halfW = this.container.clientWidth / 2;
    const halfH = this.container.clientHeight / 2;

    return {
      left: Math.round(vector.x * halfW + halfW),
      top: Math.round(-vector.y * halfH + halfH),
      visible: vector.z < 1,
    };
  }

  private bindEvents() {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const rect = this.container.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 0. Check if clicked a Town NPC in HUB_THAIS
      if (this.npcMeshHandles.size > 0) {
        const npcMeshes: THREE.Object3D[] = [];
        const npcMeshToId = new Map<THREE.Object3D, string>();
        for (const [npcId, handle] of this.npcMeshHandles.entries()) {
          handle.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              npcMeshes.push(child);
              npcMeshToId.set(child, npcId);
            }
          });
        }
        const npcIntersects = this.raycaster.intersectObjects(npcMeshes, false);
        if (npcIntersects.length > 0) {
          const clickedNpcId = npcMeshToId.get(npcIntersects[0].object);
          if (clickedNpcId) {
            this.onNpcClick(clickedNpcId);
            return;
          }
        }
      }

      // 1. Check if clicked a monster
      const monsterMeshes: THREE.Object3D[] = [];
      const meshToId = new Map<THREE.Object3D, string>();
      for (const [id, m] of this.monsterMeshHandles.entries()) {
        m.group.traverse(child => {
          if (child instanceof THREE.Mesh) {
            monsterMeshes.push(child);
            meshToId.set(child, id);
          }
        });
      }

      const monsterIntersects = this.raycaster.intersectObjects(monsterMeshes, false);
      if (monsterIntersects.length > 0) {
        const targetId = meshToId.get(monsterIntersects[0].object);
        if (targetId) {
          this.onEntityClick(targetId);
          return;
        }
      }

      // 2. Check if clicked a Breakable object (Chest, Barrel, Urn)
      const breakableMeshes: THREE.Object3D[] = [];
      const breakableMeshToId = new Map<THREE.Object3D, string>();
      for (const [bId, bGroup] of this.breakableMeshHandles.entries()) {
        bGroup.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            breakableMeshes.push(child);
            breakableMeshToId.set(child, bId);
          }
        });
      }
      const breakableIntersects = this.raycaster.intersectObjects(breakableMeshes, false);
      if (breakableIntersects.length > 0) {
        const bId = breakableMeshToId.get(breakableIntersects[0].object);
        if (bId) {
          this.onBreakableClick(bId);
          return;
        }
      }

      // 3. Check if clicked open Descent Portal
      if (this.isPortalOpen && this.descentPortalMesh && this.descentPortalMesh.visible) {
        const portalMeshes: THREE.Object3D[] = [];
        this.descentPortalMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) portalMeshes.push(child);
        });
        const portalIntersects = this.raycaster.intersectObjects(portalMeshes, false);
        if (portalIntersects.length > 0) {
          this.onPortalClick();
          return;
        }
      }

      // 4. Clicked ground to walk
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
        this.isPointerDraggingGround = true;
        this.onGroundClick(intersectPoint.x, intersectPoint.z);
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = this.container.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        if (!e.touches || !e.touches[0]) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
        this.updateSmartAimReticle(intersectPoint.x, intersectPoint.z);
        if (this.isPointerDraggingGround) {
          this.onGroundClick(intersectPoint.x, intersectPoint.z);
        }
      }
    };

    const handlePointerUp = () => {
      this.isPointerDraggingGround = false;
    };

    this.container.addEventListener('mousedown', handlePointerDown);
    this.container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomStep = e.deltaY > 0 ? 0.08 : -0.08;
      this.targetZoom = Math.max(0.65, Math.min(1.4, this.targetZoom + zoomStep));
    };

    this.container.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth > 0 ? this.container.clientWidth : (window.innerWidth || 800);
      const h = this.container.clientHeight > 0 ? this.container.clientHeight : (window.innerHeight || 600);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.resizeTextCanvas();
    };

    window.addEventListener('resize', handleResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      this.resizeObserver.observe(this.container);
    }
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    if (this.textCanvas && this.textCanvas.parentElement) {
      this.textCanvas.parentElement.removeChild(this.textCanvas);
    }
  }
}
