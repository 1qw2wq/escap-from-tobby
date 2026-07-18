
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { CharacterClass, PlayerState, TobbyState, AIState, PuddleState, SoundWaveState, MedicineItemState, GameItemState, ItemType, DecoyCatnipState, GameObstacle } from "../types";
import { ROOMS, ALL_OBSTACLES, MAP_SVG, TOBBY_SVG, RUNNER_SVG, MARCUS_SVG, FAIBE_SVG, RUNNER_WALK1_SVG, RUNNER_WALK2_SVG, MARCUS_WALK1_SVG, MARCUS_WALK2_SVG, FAIBE_WALK1_SVG, FAIBE_WALK2_SVG, TOBBY_WALK1_SVG, TOBBY_WALK2_SVG } from "../data";
import { isLocationWalkable, getRoomAt, checkLineOfSight, playScreamSound, playRamSound, playPacifySound, playDamageSound, playSoundWaveAttack, playFootstepSound, playActiveAbilityRunner, playMedicinePickupSound, setCurrentActiveFloor, getObstaclesForFloor, generateFloor1Maze, currentFloorObstacles, setCurrentFloorObstacles, resetInitializedObstacles, setDynamicLayout, dynamicRooms } from "../utils";
import { Shield, Sparkles, AlertTriangle, ArrowRight, Home, RefreshCw, Volume2, VolumeX, Eye, Flame, Heart, Zap, BookOpen } from "lucide-react";
import { SurvivalGuide } from "./SurvivalGuide";
import { getOrGenerateCampaign, drawCampaignMapToCanvas, MAP_WIDTH, MAP_HEIGHT, NUM_WINGS } from "../mapGenerator";

interface ExtendedPlayerState extends PlayerState {
  catnipCharges?: number;
  energyCanCharges?: number;
  empCharges?: number;
  hyperChargeTime?: number;
  isMoving?: boolean;
}

const jointAnchors = {
  RUNNER: { ll: "175 420", rl: "225 420", la: "150 260", ra: "250 260", t: "200 340", h: "200 195" },
  MARCUS: { ll: "145 430", rl: "255 430", la: "110 270", ra: "290 270", t: "200 340", h: "200 195" },
  FAIBE:  { ll: "170 420", rl: "230 420", la: "145 260", ra: "255 260", t: "200 340", h: "200 195" },
  TOBBY:  { ll: "168 440", rl: "232 440", la: "150 247", ra: "250 247", t: "200 340", h: "200 195" },
};

function getSvgWalkFrame(type: "RUNNER" | "MARCUS" | "FAIBE" | "TOBBY", baseSvg: string, phase: number): string {
  const anchors = jointAnchors[type];
  
  // Clean continuous sine oscillations
  const legAngle = Math.sin(phase) * 23; // 23 degree legs swing range
  const rightLegAngle = Math.sin(phase + Math.PI) * 23;
  const armAngle = Math.cos(phase) * 30; // 30 degree arms swing
  const rightArmAngle = Math.cos(phase + Math.PI) * 30;
  const bobY = Math.abs(Math.sin(phase * 2)) * 6.0; // hip bobbing
  
  // Slight torso tilting & head rotating logic
  const torsoTilt = Math.sin(phase) * 2.0; 
  const headBobAngle = Math.sin(phase) * 2.5;

  let svg = baseSvg
    .replace('<g id="left-leg">', `<g id="left-leg" transform="rotate(${legAngle} ${anchors.ll})">`)
    .replace('<g id="right-leg">', `<g id="right-leg" transform="rotate(${rightLegAngle} ${anchors.rl})">`)
    .replace('<g id="left-arm">', `<g id="left-arm" transform="rotate(${armAngle} ${anchors.la})">`)
    .replace('<g id="right-arm">', `<g id="right-arm" transform="rotate(${rightArmAngle} ${anchors.ra})">`);

  // Translate and rotate body sections
  if (type === "RUNNER") {
    svg = svg.replace('<g id="torso">', `<g id="torso" transform="translate(0, ${bobY}) rotate(${torsoTilt} ${anchors.t})">`);
    svg = svg.replace('<g id="head">', `<g id="head" transform="translate(0, ${bobY * 1.3}) rotate(${headBobAngle} ${anchors.h})">`);
  } else if (type === "MARCUS") {
    svg = svg.replace('<g id="torso-heavy">', `<g id="torso-heavy" transform="translate(0, ${bobY}) rotate(${torsoTilt} ${anchors.t})">`);
    svg = svg.replace('<g id="head-heavy">', `<g id="head-heavy" transform="translate(0, ${bobY * 1.3}) rotate(${headBobAngle} ${anchors.h})">`);
  } else if (type === "FAIBE") {
    svg = svg.replace('<g id="tunic">', `<g id="tunic" transform="translate(0, ${bobY}) rotate(${torsoTilt} ${anchors.t})">`);
    svg = svg.replace('<g id="head-faibe">', `<g id="head-faibe" transform="translate(0, ${bobY * 1.2}) rotate(${headBobAngle} ${anchors.h})">`);
  } else if (type === "TOBBY") {
    svg = svg.replace('<g id="torso">', `<g id="torso" transform="translate(0, ${bobY}) rotate(${torsoTilt} ${anchors.t})">`);
    svg = svg.replace('<g id="tobby-head" transform="translate(104, 25) scale(0.48)">', `<g id="tobby-head" transform="translate(104, ${25 + bobY * 1.1}) rotate(${headBobAngle}) scale(0.48)">`);
  }

  return svg;
}

const textureCache: Record<string, THREE.CanvasTexture> = {};

/**
 * Generates a high-quality procedural texture using HTML5 Canvas
 */
export function createProceduralTexture(
  baseColor: string, 
  noiseStrength = 0.04, 
  patternType: "noise" | "grid" | "stripe" | "brushed" | "carbon" | "concrete" = "noise", 
  patternColor: string | null = null,
  tileSize = 256
): THREE.CanvasTexture {
  if (typeof document === "undefined") {
    return null as unknown as THREE.CanvasTexture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = tileSize;
  canvas.height = tileSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Fill base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, tileSize, tileSize);

  if (patternType === "grid" && patternColor) {
    ctx.strokeStyle = patternColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    // Draw horizontal and vertical division to make it a tile
    ctx.beginPath();
    ctx.moveTo(tileSize / 2, 0);
    ctx.lineTo(tileSize / 2, tileSize);
    ctx.moveTo(0, tileSize / 2);
    ctx.lineTo(tileSize, tileSize / 2);
    ctx.stroke();

    // Subtle bevel shading
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(2, 2, tileSize / 2 - 4, tileSize / 2 - 4);
    ctx.fillRect(tileSize / 2 + 2, 2, tileSize / 2 - 4, tileSize / 2 - 4);
    ctx.fillRect(2, tileSize / 2 + 2, tileSize / 2 - 4, tileSize / 2 - 4);
    ctx.fillRect(tileSize / 2 + 2, tileSize / 2 + 2, tileSize / 2 - 4, tileSize / 2 - 4);
  } else if (patternType === "concrete") {
    // Concrete blocks/panels
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, tileSize, tileSize);
    
    // Draw some subtle concrete circular stamp divots near corners
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    const r = 4;
    ctx.beginPath();
    ctx.arc(15, 15, r, 0, Math.PI * 2);
    ctx.arc(tileSize - 15, 15, r, 0, Math.PI * 2);
    ctx.arc(15, tileSize - 15, r, 0, Math.PI * 2);
    ctx.arc(tileSize - 15, tileSize - 15, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(16, 16, r * 0.7, 0, Math.PI * 2);
    ctx.arc(tileSize - 14, 16, r * 0.7, 0, Math.PI * 2);
    ctx.arc(16, tileSize - 14, r * 0.7, 0, Math.PI * 2);
    ctx.arc(tileSize - 14, tileSize - 14, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (patternType === "stripe" && patternColor) {
    ctx.strokeStyle = patternColor;
    ctx.lineWidth = 12;
    for (let i = -tileSize; i < tileSize * 2; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + tileSize, tileSize);
      ctx.stroke();
    }
  } else if (patternType === "brushed") {
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < tileSize; i += 3) {
      if (Math.random() > 0.3) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(tileSize, i);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    for (let i = 0; i < tileSize; i += 4) {
      if (Math.random() > 0.4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(tileSize, i);
        ctx.stroke();
      }
    }
  } else if (patternType === "carbon") {
    // Futuristic carbon fiber weave pattern
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x < tileSize; x += 8) {
      for (let y = 0; y < tileSize; y += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 4, 4);
          ctx.fillRect(x + 4, y + 4, 4, 4);
        }
      }
    }
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < tileSize; x += 8) {
      for (let y = 0; y < tileSize; y += 8) {
        if ((x + y) % 16 !== 0) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }
  }

  // Add noise
  if (noiseStrength > 0) {
    const imgData = ctx.getImageData(0, 0, tileSize, tileSize);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseStrength * 255;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

export function getProceduralTexture(
  baseColor: string, 
  noiseStrength = 0.04, 
  patternType: "noise" | "grid" | "stripe" | "brushed" | "carbon" | "concrete" = "noise", 
  patternColor: string | null = null,
  tileSize = 256
): THREE.CanvasTexture {
  const key = `${baseColor}_${noiseStrength}_${patternType}_${patternColor}_${tileSize}`;
  if (!textureCache[key]) {
    textureCache[key] = createProceduralTexture(baseColor, noiseStrength, patternType, patternColor, tileSize);
  }
  return textureCache[key];
}

interface GameCanvasProps {
  characterClass: CharacterClass;
  currentFloor: number;
  onFloorComplete: () => void;
  onFloorAscend: () => void;
  onGameOver: () => void;
  onQuit: () => void;
  onResetFloor5: () => void;
}

export function GameCanvas({
  characterClass,
  currentFloor,
  onFloorComplete,
  onFloorAscend,
  onGameOver,
  onQuit,
  onResetFloor5,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);

  const [is3DMode, setIs3DMode] = useState(true);

  // Three.js Engine WebGL Refs
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerMeshRef = useRef<THREE.Group | null>(null);
  const playerLightRef = useRef<THREE.SpotLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const obstaclesGroupRef = useRef<THREE.Group | null>(null);
  const tobbysGroupRef = useRef<THREE.Group | null>(null);
  const itemsGroupRef = useRef<THREE.Group | null>(null);
  const puddlesGroupRef = useRef<THREE.Group | null>(null);
  const decoysGroupRef = useRef<THREE.Group | null>(null);
  const soundwavesGroupRef = useRef<THREE.Group | null>(null);

  const threeParticlesRef = useRef<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number; type: 'dust' | 'spark' | 'splash' | 'slash' }[]>([]);
  const lastActiveItemCountRef = useRef<number>(-1);
  const lastActivePuddleCountRef = useRef<number>(-1);
  const lastActiveDecoyCountRef = useRef<number>(-1);

  // Sound context levels
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef<boolean>(muted);
  
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const [screenDamageFlash, setScreenDamageFlash] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Reactive UI state pulled from requestAnimationFrame tick
  const [playerHp, setPlayerHp] = useState(1);
  const [playerMaxHp, setPlayerMaxHp] = useState(1);
  const [playerLives, setPlayerLives] = useState(3);
  const [playerBurstEnergy, setPlayerBurstEnergy] = useState(100);
  const [tobbyCount, setTobbyCount] = useState(6);
  const [abilityCd, setAbilityCd] = useState(0);
  const [abilityActive, setAbilityActive] = useState(0);
  const [isRamActive, setIsRamActive] = useState(false);
  const [isDoTActive, setIsDoTActive] = useState(false);

  // Active melee Strike state
  const [meleeCd, setMeleeCd] = useState(0);
  const [meleeStrikeActive, setMeleeStrikeActive] = useState(false);
  const meleeCdRef = useRef<number>(0);

  // Keep keyboard state
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Game Engine mutable values (in ref to guarantee 60fps independent of React renders)
  const playerRef = useRef<ExtendedPlayerState>({
    classType: characterClass,
    x: 625,
    y: 95,
    hp: characterClass === CharacterClass.MARCUS ? 30 : characterClass === CharacterClass.RUNNER ? 20 : 15,
    maxHp: characterClass === CharacterClass.MARCUS ? 30 : characterClass === CharacterClass.RUNNER ? 20 : 15,
    lives: 3,
    maxLives: 3,
    speed: characterClass === CharacterClass.RUNNER ? 75 : 50,
    angle: Math.PI / 2, // Facing South
    abilityCooldown: 0,
    abilityActiveTime: 0,
    isRamming: false,
    ramGraceActive: false,
    isPacifying: false,
    scratchDotDuration: 0,
    scratchDotTimer: 0,
    burstEnergy: 100,
    isBurstActive: false,
    catnipCharges: 2,
    energyCanCharges: 1,
    empCharges: 1,
    hyperChargeTime: 0,
  });

  const tobbysRef = useRef<TobbyState[]>([]);
  const puddlesRef = useRef<PuddleState[]>([]);
  const soundWavesRef = useRef<SoundWaveState[]>([]);
  const medicinesRef = useRef<GameItemState[]>([]);
  const freshGameRef = useRef<boolean>(true);
  const previousFloorRef = useRef<number>(-1);
  const staircaseCooldownRef = useRef<number>(0);
  const floorDataRef = useRef<{
    [floorNum: number]: {
      tobbys: TobbyState[];
      medicines: GameItemState[];
      puddles: PuddleState[];
      obstacles?: GameObstacle[];
    };
  }>({});

  // Custom stockpiled inventory quantities
  const [catnipCharges, setCatnipCharges] = useState(2);
  const [energyCanCharges, setEnergyCanCharges] = useState(1);
  const [empCharges, setEmpCharges] = useState(1);
  const [hyperChargeTimeState, setHyperChargeTime] = useState(0);
  const [empActiveTime, setEmpActiveTime] = useState(0);

  // Decoy ref tracking, EMP stun time tracking, and smooth keyframe walkway timer
  const decoysRef = useRef<DecoyCatnipState[]>([]);
  const empActiveTimeRef = useRef<number>(0);
  const playerWalkTimeRef = useRef<number>(0);
  const footstepTimerRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const invincibilityTimeRef = useRef<number>(0);
  const spawnCoordsRef = useRef<{ x: number; y: number }>({ x: 625, y: 95 });
  const mouseTargetRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const puddleDamageTimerRef = useRef<number>(0);

  // Keep track of breakable obstacle HP state
  const obstacleHpRef = useRef<Record<string, number>>({});

  // Load vector layout textures inside cache
  const imagesCachedRef = useRef<{
    map: HTMLImageElement;
    tobby: HTMLImageElement;
    runner: HTMLImageElement;
    marcus: HTMLImageElement;
    faibe: HTMLImageElement;
    tobby_walk: HTMLImageElement[];
    runner_walk: HTMLImageElement[];
    marcus_walk: HTMLImageElement[];
    faibe_walk: HTMLImageElement[];
  }>({
    map: (typeof document !== "undefined" ? (() => {
      const c = document.createElement("canvas");
      c.width = 4500;
      c.height = 1000;
      return c;
    })() : null) as unknown as HTMLImageElement,
    tobby: (typeof Image !== "undefined" ? new Image() : null) as unknown as HTMLImageElement,
    runner: (typeof Image !== "undefined" ? new Image() : null) as unknown as HTMLImageElement,
    marcus: (typeof Image !== "undefined" ? new Image() : null) as unknown as HTMLImageElement,
    faibe: (typeof Image !== "undefined" ? new Image() : null) as unknown as HTMLImageElement,
    tobby_walk: [],
    runner_walk: [],
    marcus_walk: [],
    faibe_walk: [],
  });

  // --- HOISTED HELPER FUNCTIONS FOR BOUNDARY CHECKS & PARTICLES ---
  function xBoundaryCheck(nextX: number, obs: GameObstacle): boolean {
    const radius = 11.5;
    return nextX <= obs.x + obs.width + radius;
  }

  function yBoundaryCheck(nextY: number, obs: GameObstacle): boolean {
    const radius = 11.5;
    return nextY <= obs.y + obs.height + radius;
  }

  function spawnThreeParticle(x: number, y: number, z: number, vx: number, vy: number, vz: number, type: 'dust' | 'spark' | 'splash' | 'slash', color: number) {
    const scene = threeSceneRef.current;
    if (!scene) return;

    let pObj = threeParticlesRef.current.find(p => p.life <= 0);
    if (!pObj) {
      if (threeParticlesRef.current.length < 150) {
        const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        pObj = { mesh, vx, vy, vz, life: 0, maxLife: 0, type };
        threeParticlesRef.current.push(pObj);
      } else {
        pObj = threeParticlesRef.current.reduce((oldest, current) => current.life < oldest.life ? current : oldest);
      }
    }

    if (pObj) {
      pObj.mesh.position.set(x, y, z);
      pObj.vx = vx;
      pObj.vy = vy;
      pObj.vz = vz;
      pObj.life = type === 'dust' ? 0.4 : (type === 'spark' ? 0.5 : 0.3);
      pObj.maxLife = pObj.life;
      pObj.type = type;
      (pObj.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      pObj.mesh.visible = true;
    }
  }

  function updateThreeParticles(dt: number) {
    threeParticlesRef.current.forEach(p => {
      if (p.life > 0) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;

          if (p.type === 'splash' || p.type === 'slash') {
            p.vy -= 9.8 * 8 * dt; // gravity
          }

          const ratio = p.life / p.maxLife;
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
          p.mesh.scale.setScalar(ratio);
        }
      }
    });
  }

  function checkObstacleBreaking(nextX: number, nextY: number, radius: number): boolean {
    const p = playerRef.current;
    if (!p.isMoving) return false;

    let brokenAny = false;
    const remainingObs: GameObstacle[] = [];

    let baseDamage = 2;
    if (characterClass === CharacterClass.MARCUS) {
      baseDamage = p.isRamming ? 35 : 12;
    } else if (characterClass === CharacterClass.RUNNER) {
      baseDamage = 5;
    } else if (characterClass === CharacterClass.FAIBE) {
      baseDamage = 4;
    }

    let speedMult = 1.0;
    if (p.isRamming) {
      speedMult = 4.0;
    } else if (p.isBurstActive) {
      speedMult = 2.5;
    }

    let inPuddle = false;
    for (const puddle of puddlesRef.current) {
      const distToPuddle = Math.sqrt((p.x - puddle.x) ** 2 + (p.y - puddle.y) ** 2);
      if (distToPuddle <= puddle.radius) {
        inPuddle = true;
        break;
      }
    }
    if (inPuddle) {
      speedMult *= 0.5;
    }

    const damageDealt = baseDamage * speedMult;

    for (const obs of currentFloorObstacles) {
      const obsMinX = obs.x - radius;
      const obsMaxX = obs.x + obs.width + radius;
      const obsMinY = obs.y - radius;
      const obsMaxY = obs.y + obs.height + radius;

      if (nextX >= obsMinX && xBoundaryCheck(nextX, obs) && nextY >= obsMinY && yBoundaryCheck(nextY, obs)) {
        const obsKey = `${obs.x},${obs.y}`;
        const name = obs.name || "";

        if (obstacleHpRef.current[obsKey] === undefined) {
          let initialHp = 10;
          if (
            name.includes("Conference Table") ||
            name.includes("Washing Sinks") ||
            name.includes("Toilet Partition") ||
            name.includes("Barricade") ||
            name.includes("Blockade")
          ) {
            initialHp = 30;
          } else if (
            name.includes("Teacher Table") ||
            name.includes("Storage Box") ||
            name.includes("Cabinet") ||
            name.includes("Locker") ||
            name.includes("Sofa") ||
            name.includes("Couch") ||
            name.includes("Vending")
          ) {
            initialHp = 20;
          }
          obstacleHpRef.current[obsKey] = initialHp;
        }

        obstacleHpRef.current[obsKey] -= damageDealt;

        if (Math.random() < 0.2) {
          const obsCenterX = obs.x + obs.width / 2;
          const obsCenterZ = obs.y + obs.height / 2;
          spawnThreeParticle(
            obsCenterX + (Math.random() - 0.5) * obs.width,
            Math.random() * 8 + 1,
            obsCenterZ + (Math.random() - 0.5) * obs.height,
            (Math.random() - 0.5) * 15,
            Math.random() * 10 + 5,
            (Math.random() - 0.5) * 15,
            "spark",
            0xd97706
          );
        }

        if (obstacleHpRef.current[obsKey] <= 0) {
          brokenAny = true;
          const obsCenterX = obs.x + obs.width / 2;
          const obsCenterZ = obs.y + obs.height / 2;
          
          let particleColor = 0x854d0e;
          if (name.includes("Locker") || name.includes("Metal") || name.includes("Cabinet")) {
            particleColor = 0x94a3b8;
          } else if (name.includes("Debris") || name.includes("Blockade") || name.includes("Barricade")) {
            particleColor = 0x475569;
          }

          if (characterClass === CharacterClass.FAIBE) {
            for (let i = 0; i < 20; i++) {
              spawnThreeParticle(
                obsCenterX + (Math.random() - 0.5) * obs.width,
                Math.random() * 15 + 2,
                obsCenterZ + (Math.random() - 0.5) * obs.height,
                (Math.random() - 0.5) * 45,
                Math.random() * 25 + 10,
                (Math.random() - 0.5) * 45,
                'spark',
                0xa855f7
              );
            }
          } else if (characterClass === CharacterClass.MARCUS) {
            for (let i = 0; i < 25; i++) {
              spawnThreeParticle(
                obsCenterX + (Math.random() - 0.5) * obs.width,
                Math.random() * 12 + 2,
                obsCenterZ + (Math.random() - 0.5) * obs.height,
                (Math.random() - 0.5) * 60,
                Math.random() * 30 + 15,
                (Math.random() - 0.5) * 60,
                'dust',
                particleColor
              );
            }
          } else {
            for (let i = 0; i < 15; i++) {
              spawnThreeParticle(
                obsCenterX + (Math.random() - 0.5) * obs.width,
                Math.random() * 10 + 2,
                obsCenterZ + (Math.random() - 0.5) * obs.height,
                (Math.random() - 0.5) * 50,
                Math.random() * 20 + 8,
                (Math.random() - 0.5) * 50,
                'spark',
                particleColor
              );
            }
          }

          if (!mutedRef.current) {
            try {
              const c = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = c.createOscillator();
              const gain = c.createGain();
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(180, c.currentTime);
              osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.25);
              gain.gain.setValueAtTime(0.12, c.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.26);
              osc.connect(gain);
              gain.connect(c.destination);
              osc.start();
              osc.stop(c.currentTime + 0.27);
            } catch (e) {}
          }

          soundWavesRef.current.push({
            x: obsCenterX,
            y: obsCenterZ,
            radius: 8,
            maxRadius: 60,
            timeLeft: 0.3,
          });

          if (p.isRamming && characterClass === CharacterClass.MARCUS) {
            soundWavesRef.current.push({
              x: obsCenterX,
              y: obsCenterZ,
              radius: 12,
              maxRadius: 180,
              timeLeft: 0.5,
            });
          }

          continue;
        }
      }

      remainingObs.push(obs);
    }

    if (brokenAny) {
      setCurrentFloorObstacles(remainingObs);
      if (floorDataRef.current[currentFloor]) {
        floorDataRef.current[currentFloor].obstacles = remainingObs;
      }
      rebuildObstacles3D();
      return true;
    }

    return false;
  }

  // --- INITIALIZATION ---
  const initializeLevel = () => {
    const campaign = getOrGenerateCampaign();
    const floorMap = campaign.floors[currentFloor];

    setDynamicLayout(floorMap.rooms, floorMap.doorways);
    setCurrentActiveFloor(currentFloor);

    if (previousFloorRef.current !== -1 && previousFloorRef.current !== currentFloor) {
      floorDataRef.current[previousFloorRef.current] = {
        tobbys: [...tobbysRef.current],
        medicines: [...medicinesRef.current],
        puddles: [...puddlesRef.current],
        obstacles: [...currentFloorObstacles],
      };
      obstacleHpRef.current = {};
    }

    const p = playerRef.current;
    let px = floorMap.spawnX;
    let py = floorMap.spawnY;

    if (previousFloorRef.current === -1) {
      if (currentFloor === 5) {
        let attempts = 0;
        let found = false;
        const validRooms = floorMap.rooms.filter(r => r.id.startsWith("C_W0_"));
        while (attempts < 200 && !found) {
          const room = validRooms[Math.floor(Math.random() * validRooms.length)];

          if (room) {
            const rx = room.minX + 25 + Math.random() * (room.maxX - room.minX - 50);
            const ry = room.minY + 25 + Math.random() * (room.maxY - room.minY - 50);
            if (isLocationWalkable(rx, ry, 14)) {
              px = rx;
              py = ry;
              found = true;
            }
          } else {
            px = floorMap.spawnX;
            py = floorMap.spawnY;
            found = true;
          }
          attempts++;
        }
      }
    } else if (currentFloor > previousFloorRef.current) {
      px = floorMap.exitX;
      py = floorMap.exitY;
    } else {
      px = floorMap.spawnX;
      py = floorMap.spawnY;
    }

    p.x = px;
    p.y = py;
    spawnCoordsRef.current = { x: px, y: py };
    const defaultMaxHp = characterClass === CharacterClass.MARCUS ? 30 : characterClass === CharacterClass.RUNNER ? 20 : 15;
    p.maxHp = defaultMaxHp;
    
    if (freshGameRef.current || !p.hp || p.hp <= 0) {
      p.hp = defaultMaxHp;
    } else {
      p.hp = Math.min(p.hp, p.maxHp);
    }
    p.speed = characterClass === CharacterClass.RUNNER ? 75 : 50;
    p.angle = Math.PI / 2;
    p.abilityCooldown = 0;
    p.abilityActiveTime = 0;
    p.isRamming = false;
    p.isPacifying = false;
    p.burstEnergy = p.burstEnergy || 100;
    p.isBurstActive = false;
    setPlayerBurstEnergy(p.burstEnergy || 100);
    p.scratchDotDuration = 0;
    invincibilityTimeRef.current = 0;
    staircaseCooldownRef.current = 4.0;

    lastActiveItemCountRef.current = -1;
    lastActivePuddleCountRef.current = -1;
    lastActiveDecoyCountRef.current = -1;
    threeParticlesRef.current.forEach((pObj) => {
      pObj.life = 0;
      if (pObj.mesh) pObj.mesh.visible = false;
    });

    if (freshGameRef.current) {
      p.lives = 3;
      p.maxLives = 3;
      setPlayerLives(3);
      freshGameRef.current = false;
      floorDataRef.current = {};
      previousFloorRef.current = -1;
      resetInitializedObstacles();
    } else {
      setPlayerLives(p.lives);
    }

    puddlesRef.current = [];
    soundWavesRef.current = [];

    const cache = imagesCachedRef.current;
    if (cache) {
      let mapCanvas = cache.map as unknown as HTMLCanvasElement;
      if (!mapCanvas || !(mapCanvas instanceof HTMLCanvasElement)) {
        mapCanvas = document.createElement("canvas");
        mapCanvas.width = 4500;
        mapCanvas.height = 1000;
        cache.map = mapCanvas as unknown as HTMLImageElement;
      }
      drawCampaignMapToCanvas(mapCanvas, floorMap, currentFloor);
    }

    let hasPersistedData = false;
    if (floorDataRef.current[currentFloor]) {
      hasPersistedData = true;
      const preserved = floorDataRef.current[currentFloor];
      tobbysRef.current = preserved.tobbys;
      setTobbyCount(preserved.tobbys.length);
      medicinesRef.current = preserved.medicines;
      puddlesRef.current = preserved.puddles;
      
      const activeObs = preserved.obstacles || floorMap.obstacles;
      setCurrentFloorObstacles(activeObs);
    }

    if (!hasPersistedData) {
      const activeObs = floorMap.obstacles;
      setCurrentFloorObstacles(activeObs);

      const tobbys: TobbyState[] = [];
      let tobbyId = 1;

      for (let w = 0; w < NUM_WINGS; w++) {
        const wingRooms = floorMap.rooms.filter(r => r.id.includes(`W${w}`));
        const wingTobbysCount = 5 + Math.floor(Math.random() * 3);

        for (let i = 0; i < wingTobbysCount; i++) {
          const room = wingRooms[Math.floor(Math.random() * wingRooms.length)];
          if (!room) continue;

          let tx = (room.minX + room.maxX) / 2;
          let ty = (room.minY + room.maxY) / 2;
          let attempts = 0;
          while (attempts < 150) {
            tx = room.minX + 25 + Math.random() * (room.maxX - room.minX - 50);
            ty = room.minY + 25 + Math.random() * (room.maxY - room.minY - 50);

            if (isLocationWalkable(tx, ty, 10)) {
              const distToSpawn = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
              if (distToSpawn > 120) {
                break;
              }
            }
            attempts++;
          }

          const isHallway = room.id.startsWith("H_W");
          const isStationary = !isHallway && (i % 3 === 0);
          tobbys.push({
            id: tobbyId++,
            x: tx,
            y: ty,
            angle: Math.random() * Math.PI * 2,
            aiState: AIState.IDLE,
            patrolTargetX: tx,
            patrolTargetY: ty,
            speed: isHallway ? 33 + Math.random() * 8 : 30 + Math.random() * 10,
            stareTimer: 0,
            hp: 6,
            maxHp: 6,
            playerHitCooldown: 0,
            flashTime: 0,
            hitCooldown: 0,
            scratchCooldown: 0,
            waterSpillCooldown: 0,
            stareCooldown: 0,
            scarySoundCooldown: 0,
            wiggleOffset: Math.random() * Math.PI * 2,
            isHallwaySpecial: isHallway,
            isStationary,
          });
        }
      }
      tobbysRef.current = tobbys;
      setTobbyCount(tobbys.length);

      const items: GameItemState[] = [];
      let itemId = 1;

      const itemTypes = [ItemType.MEDICINE, ItemType.CATNIP, ItemType.ENERGY_CAN, ItemType.EMP];
      
      floorMap.rooms.forEach((room) => {
        if (room.id.startsWith("Stair") || room.id.startsWith("Passage")) return;

        itemTypes.forEach((itemType) => {
          let spawnChance = 0.08;
          if (itemType === ItemType.MEDICINE) {
            spawnChance = room.id.startsWith("C_W") ? 0.35 : 0.45;
          } else if (itemType === ItemType.CATNIP) {
            spawnChance = 0.15;
          } else if (itemType === ItemType.ENERGY_CAN) {
            spawnChance = 0.15;
          } else if (itemType === ItemType.EMP) {
            spawnChance = 0.12;
          }

          if (Math.random() < spawnChance) {
            let attempts = 0;
            let spawned = false;
            while (attempts < 100 && !spawned) {
              const mx = room.minX + 30 + Math.random() * (room.maxX - room.minX - 60);
              const my = room.minY + 30 + Math.random() * (room.maxY - room.minY - 60);
              if (isLocationWalkable(mx, my, 12)) {
                const distToSpawn = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
                if (distToSpawn > 50) {
                  items.push({
                    id: itemId++,
                    type: itemType,
                    x: mx,
                    y: my,
                    roomId: room.id,
                    pickedUp: false,
                  });
                  spawned = true;
                }
              }
              attempts++;
            }
          }
        });
      });
      medicinesRef.current = items;
    }

    if (freshGameRef.current) {
      p.catnipCharges = p.catnipCharges !== undefined ? p.catnipCharges : 2;
      p.energyCanCharges = p.energyCanCharges !== undefined ? p.energyCanCharges : 1;
      p.empCharges = p.empCharges !== undefined ? p.empCharges : 1;
      p.hyperChargeTime = 0;
    } else {
      p.catnipCharges = p.catnipCharges || 0;
      p.energyCanCharges = p.energyCanCharges || 0;
      p.empCharges = p.empCharges || 0;
      p.hyperChargeTime = p.hyperChargeTime || 0;
    }

    setPlayerHp(p.hp);
    setPlayerMaxHp(p.maxHp);
    setCatnipCharges(p.catnipCharges);
    setEnergyCanCharges(p.energyCanCharges);
    setEmpCharges(p.empCharges);
    setHyperChargeTime(p.hyperChargeTime);
    setEmpActiveTime(empActiveTimeRef.current);

    previousFloorRef.current = currentFloor;

    setTimeout(() => {
      if (threeSceneRef.current) {
        let roomFloorsGroup = threeSceneRef.current.getObjectByName("roomFloorsGroup") as THREE.Group | null;
        if (roomFloorsGroup) {
          threeSceneRef.current.remove(roomFloorsGroup);
        }
        roomFloorsGroup = new THREE.Group();
        roomFloorsGroup.name = "roomFloorsGroup";
        threeSceneRef.current.add(roomFloorsGroup);

        const campaign = getOrGenerateCampaign();
        const floorMap = campaign.floors[currentFloor];
        floorMap.rooms.forEach((room) => {
          const rw = room.maxX - room.minX;
          const rh = room.maxY - room.minY;
          const rx = room.minX + rw / 2;
          const rz = room.minY + rh / 2;

          let baseColor = "#0f172a";
          let pattern: "noise" | "grid" | "stripe" | "brushed" | "carbon" | "concrete" = "grid";
          let patternColor = "rgba(71,85,105,0.15)";

          if (room.id.startsWith("C_W")) {
            baseColor = "#0b0f19";
            patternColor = "rgba(56, 189, 248, 0.12)";
          } else if (room.id.startsWith("Office") || room.id.includes("Storage") || room.id.includes("Breakroom")) {
            baseColor = "#091424";
            patternColor = "rgba(129, 140, 248, 0.12)";
          } else if (room.id.startsWith("Stair")) {
            baseColor = "#1f140d";
            pattern = "stripe";
            patternColor = "rgba(245, 158, 11, 0.12)";
          } else if (room.id.startsWith("Toilets")) {
            baseColor = "#180f24";
            patternColor = "rgba(168, 85, 247, 0.12)";
          } else if (room.id.startsWith("Passage")) {
            baseColor = "#050a14";
            patternColor = "rgba(56, 189, 248, 0.08)";
          }

          const roomTex = getProceduralTexture(baseColor, 0.03, pattern, patternColor);
          const clonedTex = roomTex.clone();
          clonedTex.repeat.set(rw / 128, rh / 128);
          clonedTex.needsUpdate = true;

          const roomMat = new THREE.MeshStandardMaterial({
            map: clonedTex,
            roughness: 0.25,
            metalness: 0.1,
          });

          const roomGeo = new THREE.PlaneGeometry(rw, rh);
          const roomMesh = new THREE.Mesh(roomGeo, roomMat);
          roomMesh.rotation.x = -Math.PI / 2;
          roomMesh.position.set(rx, 0.15, rz);
          roomMesh.receiveShadow = true;
          roomFloorsGroup!.add(roomMesh);
        });

        rebuildObstacles3D();
        buildRealWalls3D();
        addCeilingLights3D();

        if (playerMeshRef.current && threeSceneRef.current) {
          threeSceneRef.current.remove(playerMeshRef.current);
          const playerGroup = createPlayer3DMesh();
          threeSceneRef.current.add(playerGroup);
          playerMeshRef.current = playerGroup;

          const headGroup = playerGroup.getObjectByName("headGroup");
          if (headGroup) {
            // Mounted headlight spotlight inside headGroup so it naturally pivots where the player stands and looks!
            const flashlight = new THREE.SpotLight(0xfff6e0, 22.0, 320, Math.PI / 4, 0.4, 0.5);
            flashlight.position.set(0, 1.8, 5.8);
            flashlight.castShadow = true;
            flashlight.shadow.mapSize.width = 1024;
            flashlight.shadow.mapSize.height = 1024;
            headGroup.add(flashlight);
            playerLightRef.current = flashlight;

            const lightTarget = new THREE.Object3D();
            lightTarget.position.set(0, 1.8, 150);
            headGroup.add(lightTarget);
            flashlight.target = lightTarget;
          }
        }
      }
    }, 50);
  };

  // 1. Level Initialization on Mount or Floor Change
  useEffect(() => {
    initializeLevel();
  }, [currentFloor, characterClass]);

  // 2. Pre-cache visual SVG Assets
  useEffect(() => {
    const getSvgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const r_walk: HTMLImageElement[] = [];
    const m_walk: HTMLImageElement[] = [];
    const f_walk: HTMLImageElement[] = [];
    const t_walk: HTMLImageElement[] = [];

    for (let i = 0; i < 12; i++) {
      const phase = (i / 12) * Math.PI * 2;

      const rImg = new Image();
      rImg.src = getSvgDataUrl(getSvgWalkFrame("RUNNER", RUNNER_SVG, phase));
      r_walk.push(rImg);

      const mImg = new Image();
      mImg.src = getSvgDataUrl(getSvgWalkFrame("MARCUS", MARCUS_SVG, phase));
      m_walk.push(mImg);

      const fImg = new Image();
      fImg.src = getSvgDataUrl(getSvgWalkFrame("FAIBE", FAIBE_SVG, phase));
      f_walk.push(fImg);

      const tImg = new Image();
      tImg.src = getSvgDataUrl(getSvgWalkFrame("TOBBY", TOBBY_SVG, phase));
      t_walk.push(tImg);
    }

    const mapImg = new Image();
    mapImg.src = getSvgDataUrl(MAP_SVG);

    const tobbyImg = new Image();
    tobbyImg.src = getSvgDataUrl(TOBBY_SVG);

    const runnerImg = new Image();
    runnerImg.src = getSvgDataUrl(RUNNER_SVG);

    const marcusImg = new Image();
    marcusImg.src = getSvgDataUrl(MARCUS_SVG);

    const faibeImg = new Image();
    faibeImg.src = getSvgDataUrl(FAIBE_SVG);

    const cache = imagesCachedRef.current;
    if (cache) {
      cache.tobby = tobbyImg;
      cache.runner = runnerImg;
      cache.marcus = marcusImg;
      cache.faibe = faibeImg;
      cache.tobby_walk = t_walk;
      cache.runner_walk = r_walk;
      cache.marcus_walk = m_walk;
      cache.faibe_walk = f_walk;
    }
  }, []);

  // 3. Handle Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGuideOpen) return;

      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;
      keysPressedRef.current[e.key] = true;

      if (e.key === " ") {
        e.preventDefault();
        triggerSpecialAbility();
      }

      if (key === "1") {
        e.preventDefault();
        triggerItemUse(1);
      } else if (key === "2") {
        e.preventDefault();
        triggerItemUse(2);
      } else if (key === "3") {
        e.preventDefault();
        triggerItemUse(3);
      }

      if (key === "e" || key === "f") {
        e.preventDefault();
        triggerMeleeStrike();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
      keysPressedRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [characterClass, isGuideOpen]);

  // 3b. Mouse and Touch pointer control listeners
  useEffect(() => {
    const canvas = is3DMode ? canvas3DRef.current : canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (is3DMode && threeCameraRef.current) {
        const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), threeCameraRef.current);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPoint = new THREE.Vector3();
        const intersect = raycaster.ray.intersectPlane(plane, targetPoint);
        if (!intersect) return { x: 625, y: 95 };

        return { x: targetPoint.x, y: targetPoint.z };
      } else {
        const x = ((clientX - rect.left) / rect.width) * 4500;
        const y = ((clientY - rect.top) / rect.height) * 1000;
        return { x, y };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      mouseTargetRef.current = getCanvasCoords(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDownRef.current) {
        mouseTargetRef.current = getCanvasCoords(e.clientX, e.clientY);
      }
    };

    const handleMouseUpOrLeave = () => {
      isMouseDownRef.current = false;
      mouseTargetRef.current = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isMouseDownRef.current = true;
        const touch = e.touches[0];
        mouseTargetRef.current = getCanvasCoords(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMouseDownRef.current && e.touches.length > 0) {
        const touch = e.touches[0];
        mouseTargetRef.current = getCanvasCoords(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      isMouseDownRef.current = false;
      mouseTargetRef.current = null;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUpOrLeave);
    canvas.addEventListener("mouseleave", handleMouseUpOrLeave);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUpOrLeave);
      canvas.removeEventListener("mouseleave", handleMouseUpOrLeave);

      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [is3DMode]);

  // 4. Trigger Melee Hit Active Skill (Punch/Strike)
  const triggerMeleeStrike = () => {
    const p = playerRef.current;
    if (p.hp <= 0) return;
    if (meleeCdRef.current > 0) return;

    meleeCdRef.current = 1.0;
    setMeleeCd(1.0);

    setMeleeStrikeActive(true);
    setTimeout(() => {
      setMeleeStrikeActive(false);
    }, 120);

    let hitAny = false;
    tobbysRef.current.forEach((t) => {
      const dist = Math.sqrt((t.x - p.x) ** 2 + (t.y - p.y) ** 2);
      if (dist <= 55) {
        const angleToTobby = Math.atan2(t.y - p.y, t.x - p.x);
        const angleDiff = Math.abs(normalizeAngle(p.angle - angleToTobby));
        
        if (angleDiff <= (85 * Math.PI) / 180) {
          t.hp -= 2;
          t.flashTime = 0.22;
          t.playerHitCooldown = 0.2;
          
          const knockback = 28;
          const nextTx = t.x + Math.cos(angleToTobby) * knockback;
          const nextTy = t.y + Math.sin(angleToTobby) * knockback;
          
          if (isLocationWalkable(nextTx, nextTy, 10)) {
            t.x = nextTx;
            t.y = nextTy;
          }

          hitAny = true;

          soundWavesRef.current.push({
            x: t.x,
            y: t.y,
            radius: 4,
            maxRadius: 28,
            timeLeft: 0.15,
          });
        }
      }
    });

    if (hitAny) {
      if (!mutedRef.current) playDamageSound(false);
    } else {
      if (!mutedRef.current) {
        try {
          const c = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(680, c.currentTime + 0.1);
          g.gain.setValueAtTime(0.04, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.11);
          osc.connect(g);
          g.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + 0.12);
        } catch(e) {}
      }
    }
  };

  // --- UTILITY ITEM COMMAND ACTIONS ---
  const useCatnipDecoy = () => {
    const p = playerRef.current;
    if ((p.catnipCharges || 0) > 0) {
      p.catnipCharges--;
      setCatnipCharges(p.catnipCharges);

      decoysRef.current.push({
        id: Date.now() + Math.random(),
        x: p.x,
        y: p.y,
        timeLeft: 6.0,
        pulseTimer: 0,
      });

      soundWavesRef.current.push({
        x: p.x,
        y: p.y,
        radius: 12,
        maxRadius: 180,
        timeLeft: 0.5,
      });

      if (!mutedRef.current) {
         try {
           const c = new (window.AudioContext || (window as any).webkitAudioContext)();
           const osc = c.createOscillator();
           const g = c.createGain();
           osc.type = "triangle";
           osc.frequency.setValueAtTime(440, c.currentTime);
           osc.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.15);
           g.gain.setValueAtTime(0.04, c.currentTime);
           g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.16);
           osc.connect(g);
           g.connect(c.destination);
           osc.start();
           osc.stop(c.currentTime + 0.17);
         } catch(e) {}
      }
    }
  };

  const useEnergyCan = () => {
    const p = playerRef.current;
    if ((p.energyCanCharges || 0) > 0) {
      p.energyCanCharges--;
      setEnergyCanCharges(p.energyCanCharges);

      p.hyperChargeTime = 6.0;
      setHyperChargeTime(6.0);
      p.burstEnergy = 100;
      setPlayerBurstEnergy(100);

      if (!mutedRef.current) {
         try {
           const c = new (window.AudioContext || (window as any).webkitAudioContext)();
           const osc = c.createOscillator();
           const g = c.createGain();
           osc.type = "sawtooth";
           osc.frequency.setValueAtTime(600, c.currentTime);
           osc.frequency.linearRampToValueAtTime(1400, c.currentTime + 0.25);
           g.gain.setValueAtTime(0.05, c.currentTime);
           g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.26);
           osc.connect(g);
           g.connect(c.destination);
           osc.start();
           osc.stop(c.currentTime + 0.27);
         } catch(e) {}
      }
    }
  };

  const useEMPPulsar = () => {
    const p = playerRef.current;
    if ((p.empCharges || 0) > 0) {
      p.empCharges--;
      setEmpCharges(p.empCharges);

      empActiveTimeRef.current = 5.0;
      setEmpActiveTime(5.0);

      soundWavesRef.current.push({
        x: p.x,
        y: p.y,
        radius: 10,
        maxRadius: 1000,
        timeLeft: 0.8,
      });

      if (!mutedRef.current) {
         try {
           const c = new (window.AudioContext || (window as any).webkitAudioContext)();
           const osc = c.createOscillator();
           const g = c.createGain();
           osc.type = "square";
           osc.frequency.setValueAtTime(120, c.currentTime);
           osc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.35);
           g.gain.setValueAtTime(0.08, c.currentTime);
           g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.36);
           osc.connect(g);
           g.connect(c.destination);
           osc.start();
           osc.stop(c.currentTime + 0.37);
         } catch(e) {}
      }
    }
  };

  const triggerItemUse = (itemSlot: number) => {
    if (playerRef.current.hp <= 0) return;
    if (itemSlot === 1) {
      useCatnipDecoy();
    } else if (itemSlot === 2) {
      useEnergyCan();
    } else if (itemSlot === 3) {
      useEMPPulsar();
    }
  };

  // 4b. Trigger Unique Active Abilities
  const triggerSpecialAbility = () => {
    const p = playerRef.current;
    if (p.abilityCooldown > 0) return;

    if (characterClass === CharacterClass.MARCUS) {
      p.isRamming = true;
      p.abilityActiveTime = 4.0;
      p.abilityCooldown = 0.1;
      if (!mutedRef.current) playRamSound();
    } else if (characterClass === CharacterClass.FAIBE) {
      p.isPacifying = true;
      p.abilityActiveTime = 15.0;
      p.abilityCooldown = 45.0;

      tobbysRef.current.forEach((t) => {
        t.stareTimer = 0;
        t.aiState = AIState.PATROLLING;
      });

      if (!mutedRef.current) playPacifySound();
    }
  };

  // 5. Game Engine Tick loop
  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const progress = timestamp - lastTimeRef.current;
      const dt = Math.min(progress / 1000, 0.1); 
      lastTimeRef.current = timestamp;

      updatePhysics(dt);
      if (is3DMode) {
        renderThree(dt);
      } else {
        drawGraphics();
      }

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [muted, is3DMode]);

  const updatePhysics = (dt: number) => {
    const p = playerRef.current;
    if (p.hp <= 0) return;

    const campaign = getOrGenerateCampaign();
    const floorMap = campaign.floors[currentFloor];

    if (p.abilityActiveTime > 0) {
      p.abilityActiveTime -= dt;
      if (p.abilityActiveTime <= 0) {
        p.abilityActiveTime = 0;
        p.isRamming = false;
        p.isPacifying = false;
      }
    }
    if (p.abilityCooldown > 0) {
      p.abilityCooldown -= dt;
      if (p.abilityCooldown < 0) p.abilityCooldown = 0;
    }

    if (p.hyperChargeTime && p.hyperChargeTime > 0) {
      p.hyperChargeTime -= dt;
      if (p.hyperChargeTime < 0) p.hyperChargeTime = 0;
      setHyperChargeTime(p.hyperChargeTime);
    }

    decoysRef.current.forEach((dec) => {
      dec.timeLeft -= dt;
      dec.pulseTimer += dt;
    });
    decoysRef.current = decoysRef.current.filter((dec) => dec.timeLeft > 0);

    if (empActiveTimeRef.current > 0) {
      empActiveTimeRef.current -= dt;
      if (empActiveTimeRef.current < 0) empActiveTimeRef.current = 0;
      setEmpActiveTime(empActiveTimeRef.current);
    }

    if (staircaseCooldownRef.current > 0) {
      staircaseCooldownRef.current -= dt;
      if (staircaseCooldownRef.current < 0) staircaseCooldownRef.current = 0;
    }

    if (meleeCdRef.current > 0) {
      meleeCdRef.current -= dt;
      if (meleeCdRef.current < 0) meleeCdRef.current = 0;
      setMeleeCd(meleeCdRef.current);
    }

    if (p.scratchDotDuration > 0) {
      p.scratchDotDuration -= dt;
      p.scratchDotTimer += dt;
      if (p.scratchDotTimer >= 1.0) {
        p.scratchDotTimer = 0;
        damagePlayer(1);
      }
      if (p.scratchDotDuration <= 0) {
        p.scratchDotDuration = 0;
      }
    }

    let dx = 0;
    let dy = 0;

    const keys = keysPressedRef.current;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    if (dx === 0 && dy === 0 && mouseTargetRef.current) {
      const mTarget = mouseTargetRef.current;
      const tDx = mTarget.x - p.x;
      const tDy = mTarget.y - p.y;
      const dist = Math.sqrt(tDx * tDx + tDy * tDy);
      if (dist > 8) {
        dx = tDx;
        dy = tDy;
      }
    }

    const isShiftHeld = !!keys["shift"];
    const playerIsMoving = dx !== 0 || dy !== 0;
    p.isMoving = playerIsMoving;

    if (isShiftHeld && playerIsMoving && (p.burstEnergy ?? 100) > 0) {
      p.isBurstActive = true;
      p.burstEnergy = Math.max(0, (p.burstEnergy ?? 100) - dt * 25);
    } else {
      p.isBurstActive = false;
      p.burstEnergy = Math.min(100, (p.burstEnergy ?? 100) + dt * 10);
    }
    setPlayerBurstEnergy(Math.round(p.burstEnergy));

    let baseSpeed = characterClass === CharacterClass.RUNNER ? 75 : 50;
    if (p.isRamming) {
      baseSpeed = 75;
    }
    if (p.isBurstActive) {
      baseSpeed *= 1.8;
    }

    let inPuddle = false;
    for (const puddle of puddlesRef.current) {
      const distToPuddle = Math.sqrt((p.x - puddle.x) ** 2 + (p.y - puddle.y) ** 2);
      if (distToPuddle <= puddle.radius) {
        inPuddle = true;
        break;
      }
    }
    const currentSpeed = inPuddle ? baseSpeed * 0.5 : baseSpeed;

    for (const item of medicinesRef.current) {
      if (!item.pickedUp) {
        const distToItem = Math.sqrt((p.x - item.x) ** 2 + (p.y - item.y) ** 2);
        if (distToItem <= 24) {
          let canPickUp = true;

          if (item.type === ItemType.MEDICINE) {
            if (p.hp >= p.maxHp) {
              canPickUp = false;
            } else {
              p.hp = Math.min(p.maxHp, p.hp + 8);
              setPlayerHp(p.hp);
            }
          } else if (item.type === ItemType.CATNIP) {
            p.catnipCharges = (p.catnipCharges || 0) + 1;
            setCatnipCharges(p.catnipCharges);
          } else if (item.type === ItemType.ENERGY_CAN) {
            p.energyCanCharges = (p.energyCanCharges || 0) + 1;
            setEnergyCanCharges(p.energyCanCharges);
          } else if (item.type === ItemType.EMP) {
            p.empCharges = (p.empCharges || 0) + 1;
            setEmpCharges(p.empCharges);
          }

          if (canPickUp) {
            item.pickedUp = true;
            soundWavesRef.current.push({
              x: item.x,
              y: item.y,
              radius: 6,
              maxRadius: 40,
              timeLeft: 0.35,
            });
            if (!mutedRef.current) {
              playMedicinePickupSound();
            }
          }
        }
      }
    }

    if (dx !== 0 || dy !== 0) {
      footstepTimerRef.current -= dt;
      if (footstepTimerRef.current <= 0) {
        const isSprinting = characterClass === CharacterClass.RUNNER || p.isRamming;
        footstepTimerRef.current = isSprinting ? 0.28 : 0.42;
        if (!mutedRef.current) {
          playFootstepSound(isSprinting);
        }
      }

      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveX = (dx / dist) * currentSpeed * dt;
      const moveY = (dy / dist) * currentSpeed * dt;

      p.angle = Math.atan2(dy, dx);

      const nextX = p.x + moveX;
      const nextY = p.y + moveY;
      const radius = 11.5;

      let canMove = isLocationWalkable(nextX, nextY, radius);
      if (!canMove) {
        const broke = checkObstacleBreaking(nextX, nextY, radius);
        if (broke) {
          canMove = isLocationWalkable(nextX, nextY, radius);
        }
      }

      if (canMove) {
        p.x = nextX;
        p.y = nextY;
      } else {
        let canMoveX = isLocationWalkable(nextX, p.y, radius);
        if (!canMoveX) {
          const broke = checkObstacleBreaking(nextX, p.y, radius);
          if (broke) {
            canMoveX = isLocationWalkable(nextX, p.y, radius);
          }
        }

        let canMoveY = isLocationWalkable(p.x, nextY, radius);
        if (!canMoveY) {
          const broke = checkObstacleBreaking(p.x, nextY, radius);
          if (broke) {
            canMoveY = isLocationWalkable(p.x, nextY, radius);
          }
        }

        if (canMoveX && !canMoveY) {
          p.x = nextX;
        } else if (canMoveY && !canMoveX) {
          p.y = nextY;
        } else if (canMoveX && canMoveY) {
          if (Math.abs(moveX) >= Math.abs(moveY)) {
            p.x = nextX;
          } else {
            p.y = nextY;
          }
        } else {
          const nudgeAmt = 5;
          if (Math.abs(moveX) > Math.abs(moveY)) {
            let nUp = isLocationWalkable(nextX, p.y - nudgeAmt, radius);
            if (!nUp) {
              const broke = checkObstacleBreaking(nextX, p.y - nudgeAmt, radius);
              if (broke) {
                nUp = isLocationWalkable(nextX, p.y - nudgeAmt, radius);
              }
            }
            let nDown = isLocationWalkable(nextX, p.y + nudgeAmt, radius);
            if (!nDown) {
              const broke = checkObstacleBreaking(nextX, p.y + nudgeAmt, radius);
              if (broke) {
                nDown = isLocationWalkable(nextX, p.y + nudgeAmt, radius);
              }
            }

            if (nUp) {
              p.x = nextX;
              p.y -= nudgeAmt * 0.4;
            } else if (nDown) {
              p.x = nextX;
              p.y += nudgeAmt * 0.4;
            }
          } else {
            let nLeft = isLocationWalkable(p.x - nudgeAmt, nextY, radius);
            if (!nLeft) {
              const broke = checkObstacleBreaking(p.x - nudgeAmt, nextY, radius);
              if (broke) {
                nLeft = isLocationWalkable(p.x - nudgeAmt, nextY, radius);
              }
            }
            let nRight = isLocationWalkable(p.x + nudgeAmt, nextY, radius);
            if (!nRight) {
              const broke = checkObstacleBreaking(p.x + nudgeAmt, nextY, radius);
              if (broke) {
                nRight = isLocationWalkable(p.x + nudgeAmt, nextY, radius);
              }
            }

            if (nLeft) {
              p.x -= nudgeAmt * 0.4;
              p.y = nextY;
            } else if (nRight) {
              p.x += nudgeAmt * 0.4;
              p.y = nextY;
            }
          }
        }
      }
    }

    if (invincibilityTimeRef.current > 0) {
      invincibilityTimeRef.current -= dt;
      if (invincibilityTimeRef.current < 0) invincibilityTimeRef.current = 0;
    }

    puddlesRef.current = puddlesRef.current
      .map((pud) => ({ ...pud, timeLeft: pud.timeLeft - dt }))
      .filter((pud) => pud.timeLeft > 0);

    soundWavesRef.current = soundWavesRef.current
      .map((w) => ({
        ...w,
        radius: w.radius + 200 * dt,
        timeLeft: w.timeLeft - dt,
      }))
      .filter((w) => w.timeLeft > 0);

    if (inPuddle) {
      puddleDamageTimerRef.current += dt;
      if (puddleDamageTimerRef.current >= 1.0) {
        puddleDamageTimerRef.current = 0;
        damagePlayer(1, true);
      }
    } else {
      puddleDamageTimerRef.current = 0;
    }

    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      const animFreq = p.isBurstActive ? 16.5 : 9.5;
      playerWalkTimeRef.current += dt * animFreq;
    } else {
      playerWalkTimeRef.current = 0;
    }

    const isFloorPacified = p.isPacifying;
    tobbysRef.current.forEach((t) => {
      if (t.hitCooldown > 0) t.hitCooldown -= dt;
      if (t.scratchCooldown > 0) t.scratchCooldown -= dt;
      if (t.waterSpillCooldown > 0) t.waterSpillCooldown -= dt;
      if (t.stareCooldown > 0) t.stareCooldown -= dt;
      if (t.scarySoundCooldown > 0) t.scarySoundCooldown -= dt;
      if (t.playerHitCooldown > 0) t.playerHitCooldown -= dt;
      if (t.flashTime > 0) t.flashTime -= dt;

      t.wiggleOffset += dt * 10;
      t.isMoving = false;
      t.isChasing = false;

      if (isFloorPacified) {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;
        return;
      }

      const isEMPFrozen = empActiveTimeRef.current > 0;
      if (isEMPFrozen) {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;
        return;
      }

      let nearbyDecoy: DecoyCatnipState | null = null;
      let minDecoyDist = 260;
      for (const dec of decoysRef.current) {
        const decoyDist = Math.sqrt((dec.x - t.x) ** 2 + (dec.y - t.y) ** 2);
        if (decoyDist < minDecoyDist && checkLineOfSight(t.x, t.y, dec.x, dec.y)) {
          minDecoyDist = decoyDist;
          nearbyDecoy = dec;
        }
      }

      if (nearbyDecoy) {
        t.aiState = AIState.IDLE;
        const decoyDx = nearbyDecoy.x - t.x;
        const decoyDy = nearbyDecoy.y - t.y;
        t.angle = Math.atan2(decoyDy, decoyDx);

        const decoyDist = Math.sqrt(decoyDx ** 2 + decoyDy ** 2);
        if (decoyDist > 8) {
          const moveSpeed = t.speed ? t.speed * 0.70 : 25;
          const stepX = Math.cos(t.angle) * moveSpeed * dt;
          const stepY = Math.sin(t.angle) * moveSpeed * dt;
          if (isLocationWalkable(t.x + stepX, t.y + stepY, 10)) {
            t.x += stepX;
            t.y += stepY;
            t.isMoving = true;
          }
        }
        return;
      }

      const dist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
      const detectionRange = (p.isBurstActive || p.isRamming) ? 350 : 220;
      const hasLos = dist < detectionRange && checkLineOfSight(t.x, t.y, p.x, p.y);

      if (hasLos) {
        if (t.aiState !== AIState.CHASING) {
          t.aiState = AIState.CHASING;
          if (!mutedRef.current) playScreamSound();
        }

        const chaseDx = p.x - t.x;
        const chaseDy = p.y - t.y;
        t.angle = Math.atan2(chaseDy, chaseDx);

        const chaseSpeed = 42; 
        t.x += Math.cos(t.angle) * chaseSpeed * dt;
        t.y += Math.sin(t.angle) * chaseSpeed * dt;
        t.isMoving = true;
        t.isChasing = true;

        if (dist <= 20) {
          if (t.hitCooldown <= 0) {
            damagePlayer(2);
            t.hitCooldown = 5.0;
          }
        }

        if (dist <= 20) {
          if (t.scratchCooldown <= 0) {
            p.scratchDotDuration = 3.0;
            p.scratchDotTimer = 0;
            t.scratchCooldown = 3.0;
            if (!mutedRef.current) playDamageSound();
          }
        }

        if (dist <= 30 && t.waterSpillCooldown <= 0) {
          const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
          const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
          const fovHalf = (40 * Math.PI) / 180;

          if (angleDiff <= fovHalf) {
            damagePlayer(5);
            t.waterSpillCooldown = 20.0;

            puddlesRef.current.push({
              x: p.x,
              y: p.y,
              radius: 18,
              timeLeft: 10.0,
            });
            if (!mutedRef.current) playDamageSound(true);
          }
        }

        if (dist <= 50 && t.stareCooldown <= 0) {
          const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
          const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
          const stareFovHalf = (15 * Math.PI) / 180;

          if (angleDiff <= stareFovHalf) {
            t.stareTimer += dt;
            if (t.stareTimer >= 5.0) {
              damagePlayer(1);
              t.stareCooldown = 10.0;
              t.stareTimer = 0;
            }
          } else {
            t.stareTimer = 0;
          }
        } else {
          t.stareTimer = 0;
        }

        if (dist <= 150 && t.scarySoundCooldown <= 0) {
          damagePlayer(2);
          t.scarySoundCooldown = 15.0;

          soundWavesRef.current.push({
            x: t.x,
            y: t.y,
            radius: 10,
            maxRadius: 150,
            timeLeft: 0.6,
          });
          if (!mutedRef.current) playSoundWaveAttack();
        }
      } else {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;

        if (t.isStationary) {
          t.angle += Math.sin(t.wiggleOffset * 0.15) * 0.025;
        } else {
          const distToPatrol = Math.sqrt((t.patrolTargetX - t.x) ** 2 + (t.patrolTargetY - t.y) ** 2);
          if (distToPatrol < 15 || !t.patrolTargetX || !t.patrolTargetY) {
            let foundTarget = false;
            let attempts = 0;
            while (attempts < 50 && !foundTarget) {
              let tx = 0;
              let ty = 0;
              if (t.isHallwaySpecial) {
                const hallways = dynamicRooms.filter(r => r.id.startsWith("H_W"));
                const hRoom = hallways[Math.floor(Math.random() * hallways.length)] || dynamicRooms[0];
                tx = hRoom.minX + 15 + Math.random() * (hRoom.maxX - hRoom.minX - 30);
                ty = hRoom.minY + 20 + Math.random() * (hRoom.maxY - hRoom.minY - 40);
              } else {
                const room = dynamicRooms[Math.floor(Math.random() * dynamicRooms.length)];
                tx = room.minX + 15 + Math.random() * (room.maxX - room.minX - 30);
                ty = room.minY + 15 + Math.random() * (room.maxY - room.minY - 30);
              }
              if (isLocationWalkable(tx, ty, 10)) {
                t.patrolTargetX = tx;
                t.patrolTargetY = ty;
                foundTarget = true;
              }
              attempts++;
            }
          }

          if (t.patrolTargetX && t.patrolTargetY) {
            const dx = t.patrolTargetX - t.x;
            const dy = t.patrolTargetY - t.y;
            const targetAngle = Math.atan2(dy, dx);
            
            t.angle = targetAngle;

            const patrolSpeed = t.speed ? t.speed * 0.75 : 24;
            const stepX = Math.cos(t.angle) * patrolSpeed * dt;
            const stepY = Math.sin(t.angle) * patrolSpeed * dt;

            if (isLocationWalkable(t.x + stepX, t.y + stepY, 10)) {
              t.x += stepX;
              t.y += stepY;
              t.isMoving = true;
            } else {
              t.patrolTargetX = 0;
              t.patrolTargetY = 0;
            }
          }
        }
      }
    });

    tobbysRef.current.forEach((t) => {
      const contactDist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
      if (contactDist <= 22) {
        if (!t.playerHitCooldown || t.playerHitCooldown <= 0) {
          t.hp -= 2;
          t.playerHitCooldown = 0.8;
          t.flashTime = 0.25;

          soundWavesRef.current.push({
            x: t.x,
            y: t.y,
            radius: 5,
            maxRadius: 40,
            timeLeft: 0.2,
          });

          if (!mutedRef.current) playDamageSound(false);
        }
      }
    });

    const aliveTobbys = tobbysRef.current.filter((t) => {
      if (t.hp <= 0) {
        soundWavesRef.current.push({
          x: t.x,
          y: t.y,
          radius: 12,
          maxRadius: 85,
          timeLeft: 0.45,
        });
        if (!mutedRef.current) playScreamSound();
        return false;
      }
      return true;
    });

    if (aliveTobbys.length !== tobbysRef.current.length) {
      tobbysRef.current = aliveTobbys;
      setTobbyCount(aliveTobbys.length);
    }

    if (p.isRamming) {
      const remainingTobbys = tobbysRef.current.filter((t) => {
        const contactDist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
        if (contactDist <= 24) {
          p.isRamming = false;
          p.abilityActiveTime = 0;
          p.abilityCooldown = 30.0;

          soundWavesRef.current.push({
            x: t.x,
            y: t.y,
            radius: 10,
            maxRadius: 90,
            timeLeft: 0.4,
          });

          if (!mutedRef.current) playDamageSound(false);
          return false;
        }
        return true;
      });

      if (remainingTobbys.length !== tobbysRef.current.length) {
        tobbysRef.current = remainingTobbys;
        setTobbyCount(remainingTobbys.length);
      }
    }

    if (staircaseCooldownRef.current <= 0) {
      const distToExit = Math.sqrt((p.x - floorMap.exitX) ** 2 + (p.y - floorMap.exitY) ** 2);
      if (distToExit < 40) {
        onFloorComplete();
      }

      if (currentFloor < 5) {
        const distToSpawn = Math.sqrt((p.x - floorMap.spawnX) ** 2 + (p.y - floorMap.spawnY) ** 2);
        if (distToSpawn < 40) {
          onFloorAscend();
        }
      }
    }

    setPlayerHp(Math.ceil(p.hp));
    setAbilityCd(p.abilityCooldown);
    setAbilityActive(p.abilityActiveTime);
    setIsRamActive(p.isRamming);
    setIsDoTActive(p.scratchDotDuration > 0);
  };

  const handlePlayerDefeat = () => {
    const p = playerRef.current;
    p.lives -= 1;
    setPlayerLives(p.lives);

    floorDataRef.current = {};
    previousFloorRef.current = -1;

    if (p.lives > 0) {
      if (currentFloor !== 5) {
        onResetFloor5();
      } else {
        initializeLevel();
      }

      tobbysRef.current.forEach((t) => {
        t.aiState = AIState.IDLE;
        t.stareTimer = 0;
      });

      invincibilityTimeRef.current = 3.0;

      soundWavesRef.current.push({
        x: playerRef.current.x,
        y: playerRef.current.y,
        radius: 10,
        maxRadius: 180,
        timeLeft: 0.8,
      });

      if (!mutedRef.current) playPacifySound();
    } else {
      onGameOver();
    }
  };

  const damagePlayer = (amount: number, isPuddle: boolean = false) => {
    const p = playerRef.current;
    if (p.hp <= 0) return;
    if (invincibilityTimeRef.current > 0) return;

    p.hp -= amount;
    invincibilityTimeRef.current = 1.0;

    setScreenDamageFlash(true);
    setTimeout(() => setScreenDamageFlash(false), 120);

    if (!mutedRef.current) playDamageSound(isPuddle);

    if (p.hp <= 0) {
      p.hp = 0;
      handlePlayerDefeat();
    }
  };

  const normalizeAngle = (angle: number) => {
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;
    return angle;
  };

  // --- THREE.JS 3D VIEWPORT RENDERING ENGINE ---
  const createPlayer3DMesh = (): THREE.Group => {
    const group = new THREE.Group();

    let torsoColor = 0x3b82f6;
    let headColor = 0xfcd8c4;
    let pantsColor = 0x1e293b;
    let shoeColor = 0x0f172a;
    let hairColor = 0x06b6d4;
    let isHeavy = false;
    let isMagical = false;

    if (characterClass === CharacterClass.MARCUS) {
      torsoColor = 0x15803d;
      hairColor = 0x374151;
      pantsColor = 0x334155;
      shoeColor = 0x1e293b;
      isHeavy = true;
    } else if (characterClass === CharacterClass.FAIBE) {
      torsoColor = 0xbe123c;
      hairColor = 0xeab308;
      pantsColor = 0x475569;
      shoeColor = 0x3f3f46;
      isMagical = true;
    }

    const ringGeo = new THREE.RingGeometry(11, 13, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: torsoColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 1;
    group.add(ringMesh);

    const hipsGeo = new THREE.BoxGeometry(11, 4, 7);
    const hipsMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture(characterClass === CharacterClass.MARCUS ? "#334155" : (characterClass === CharacterClass.FAIBE ? "#475569" : "#1e293b"), 0.04, "noise"), roughness: 0.7 });
    const hipsMesh = new THREE.Mesh(hipsGeo, hipsMat);
    hipsMesh.position.y = 10;
    group.add(hipsMesh);

    const torsoHeight = isHeavy ? 13 : 11;
    const torsoGeo = isHeavy 
      ? new THREE.BoxGeometry(15, torsoHeight, 10) 
      : new THREE.CylinderGeometry(5.5, 6.5, torsoHeight, 12);
    
    const torsoColorStr = torsoColor === 0x3b82f6 ? "#3b82f6" : (torsoColor === 0x15803d ? "#15803d" : "#be123c");
    const torsoTex = getProceduralTexture(torsoColorStr, 0.04, "carbon");
    const torsoMat = new THREE.MeshStandardMaterial({
      map: torsoTex,
      roughness: 0.3,
      metalness: 0.4,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 10 + 2 + torsoHeight / 2;
    group.add(torsoMesh);

    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    const headY = 10 + 2 + torsoHeight + 5;
    headGroup.position.set(0, headY, 0);

    const headGeo = new THREE.SphereGeometry(5.5, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: headColor,
      roughness: 0.4,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 0, 0);
    headGroup.add(headMesh);

    // --- Glowing Headlight Visor Mesh ---
    const lampGeo = new THREE.CylinderGeometry(1.2, 1.4, 2.2, 8);
    lampGeo.rotateX(Math.PI / 2);
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const lampMesh = new THREE.Mesh(lampGeo, lampMat);
    lampMesh.position.set(0, 1.8, 4.8);
    headGroup.add(lampMesh);

    const lensGeo = new THREE.SphereGeometry(1.0, 8, 8);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(0, 1.8, 5.8);
    headGroup.add(lensMesh);

    const eyeGeo = new THREE.BoxGeometry(7, 1.8, 1.8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: isMagical ? 0xd8b4fe : (isHeavy ? 0xa7f3d0 : 0x93c5fd),
    });
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    eyeMesh.position.set(0, 0.5, 4.8);
    headGroup.add(eyeMesh);

    const hairGroup = new THREE.Group();
    hairGroup.position.set(0, 2.5, -1);
    
    const hairMainGeo = new THREE.SphereGeometry(5.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.6);
    const hairMainMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    const hairMain = new THREE.Mesh(hairMainGeo, hairMainMat);
    hairGroup.add(hairMain);

    const spikeGeo = new THREE.ConeGeometry(1.5, 4, 4);
    const spikeMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(-3 + i * 1.5, 1, 3);
      spike.rotation.x = Math.PI / 4;
      spike.rotation.z = (i - 2) * 0.15;
      hairGroup.add(spike);
    }
    headGroup.add(hairGroup);
    group.add(headGroup);

    const legLength = 10;
    const legRadius = isHeavy ? 2.2 : 1.6;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.8, legLength, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });

    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = "leftLeg";
    leftLegGroup.position.set(-3.5, 10, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, legMat);
    leftLegMesh.position.y = -legLength / 2;
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegGroup.add(leftLegMesh);

    const shoeGeo = new THREE.BoxGeometry(2.5, 2, 4.5);
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.8 });
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -legLength, 1);
    leftLegGroup.add(leftShoe);

    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.name = "rightLeg";
    rightLegGroup.position.set(3.5, 10, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, legMat);
    rightLegMesh.position.y = -legLength / 2;
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegGroup.add(rightLegMesh);

    const rightShoe = leftShoe.clone();
    rightLegGroup.add(rightShoe);

    group.add(rightLegGroup);

    const armLength = isHeavy ? 11 : 10;
    const armRadius = isHeavy ? 2.0 : 1.4;
    const armGeo = new THREE.CylinderGeometry(armRadius, armRadius * 0.9, armLength, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: torsoColor, roughness: 0.4 });
    const handGeo = new THREE.SphereGeometry(1.8, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.5 });

    const shoulderY = 10 + 2 + torsoHeight - 1.5;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = "leftArm";
    leftArmGroup.position.set(isHeavy ? -9 : -7.5, shoulderY, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.y = -armLength / 2;
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmGroup.add(leftArmMesh);

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(0, -armLength, 0);
    leftArmGroup.add(leftHand);

    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = "rightArm";
    rightArmGroup.position.set(isHeavy ? 9 : 7.5, shoulderY, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, armMat);
    rightArmMesh.position.y = -armLength / 2;
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmGroup.add(rightArmMesh);

    const rightHand = leftHand.clone();
    rightArmGroup.add(rightHand);

    group.add(rightArmGroup);

    if (isHeavy) {
      const padGeo = new THREE.BoxGeometry(6, 4, 8);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x166534, metalness: 0.7 });
      const leftPad = new THREE.Mesh(padGeo, padMat);
      leftPad.position.set(0, 0.5, 0);
      leftArmGroup.add(leftPad);

      const rightPad = leftPad.clone();
      rightArmGroup.add(rightPad);
    } else if (isMagical) {
      const haloGeo = new THREE.TorusGeometry(8, 0.9, 8, 24);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(0, 5, 0);
      headGroup.add(halo);
    }

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!(child.material instanceof THREE.MeshBasicMaterial)) {
          child.castShadow = true;
        }
        child.receiveShadow = true;
      }
    });

    return group;
  };

  const createTobby3DMesh = (): THREE.Group => {
    const group = new THREE.Group();

    const coatColor = 0x2e1065;
    const skinColor = 0xe5bfa1;
    const pantsColor = 0x1e1b4b;
    const shoeColor = 0x09090b;
    const hairColor = 0x1c1917;

    const hipsGeo = new THREE.BoxGeometry(11, 4.5, 7.5);
    const hipsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const hipsMesh = new THREE.Mesh(hipsGeo, hipsMat);
    hipsMesh.position.y = 11;
    group.add(hipsMesh);

    const torsoHeight = 14;
    const torsoGeo = new THREE.CylinderGeometry(6.5, 8.5, torsoHeight, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.15,
      metalness: 0.6,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 11 + 2.2 + torsoHeight / 2;
    group.add(torsoMesh);

    const tieGeo = new THREE.ConeGeometry(1.8, 10, 4);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const tieMesh = new THREE.Mesh(tieGeo, tieMat);
    tieMesh.position.set(0, 23.5, 6.8);
    tieMesh.rotation.x = -Math.PI / 12;
    group.add(tieMesh);

    const headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    const headY = 11 + 2.2 + torsoHeight + 5;
    headGroup.position.set(0, headY, 0);

    const headGeo = new THREE.SphereGeometry(6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.4,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.set(0, 0, 0);
    headGroup.add(headMesh);

    const glassesGroup = new THREE.Group();
    const frameGeo = new THREE.TorusGeometry(2.6, 0.6, 6, 16);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    
    const leftGlass = new THREE.Mesh(frameGeo, frameMat);
    leftGlass.position.set(-3.2, 0, 0);
    
    const rightGlass = new THREE.Mesh(frameGeo, frameMat);
    rightGlass.position.set(3.2, 0, 0);

    const lensGeo = new THREE.SphereGeometry(2.2, 8, 8);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-3.2, 0, 0.8);
    const rightLens = leftLens.clone();
    rightLens.position.x = 3.2;

    glassesGroup.add(leftGlass);
    glassesGroup.add(rightGlass);
    glassesGroup.add(leftLens);
    glassesGroup.add(rightLens);
    glassesGroup.position.set(0, 0.4, 5.2);
    headGroup.add(glassesGroup);

    const hairGeo = new THREE.SphereGeometry(6.4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.8);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 1.2, -0.5);
    hairMesh.rotation.x = -Math.PI / 15;
    headGroup.add(hairMesh);

    const hairSpikeGeo = new THREE.ConeGeometry(1.2, 3, 4);
    const hairSpike = new THREE.Mesh(hairSpikeGeo, hairMat);
    hairSpike.position.set(2, 4, 4);
    hairSpike.rotation.x = Math.PI / 3;
    hairSpike.rotation.z = -Math.PI / 6;
    headGroup.add(hairSpike);

    group.add(headGroup);

    const legLength = 11;
    const legGeo = new THREE.CylinderGeometry(1.8, 1.4, legLength, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });

    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = "leftLeg";
    leftLegGroup.position.set(-3.2, 11, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, legMat);
    leftLegMesh.position.y = -legLength / 2;
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegGroup.add(leftLegMesh);

    const shoeGeo = new THREE.BoxGeometry(2.4, 1.8, 4.2);
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.1, metalness: 0.8 });
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -legLength, 0.8);
    leftLegGroup.add(leftShoe);

    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.name = "rightLeg";
    rightLegGroup.position.set(3.2, 11, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, legMat);
    rightLegMesh.position.y = -legLength / 2;
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegGroup.add(rightLegMesh);

    const rightShoe = leftShoe.clone();
    rightLegGroup.add(rightShoe);

    group.add(rightLegGroup);

    const armLength = 12;
    const armGeo = new THREE.CylinderGeometry(1.6, 1.3, armLength, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.15, metalness: 0.5 });
    const handGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });

    const shoulderY = 11 + 2.2 + torsoHeight - 1.8;

    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = "leftArm";
    leftArmGroup.position.set(-8.2, shoulderY, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armMat);
    leftArmMesh.position.y = -armLength / 2;
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmGroup.add(leftArmMesh);

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(0, -armLength, 0);
    leftArmGroup.add(leftHand);

    group.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = "rightArm";
    rightArmGroup.position.set(8.2, shoulderY, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, armMat);
    rightArmMesh.position.y = -armLength / 2;
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmGroup.add(rightArmMesh);

    const rightHand = leftHand.clone();
    rightArmGroup.add(rightHand);

    group.add(rightArmGroup);

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!(child.material instanceof THREE.MeshBasicMaterial)) {
          child.castShadow = true;
        }
        child.receiveShadow = true;
      }
    });

    return group;
  };

  const initThree = () => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.0016);
    threeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 1, 3000);
    camera.position.set(450, 320, 645);
    threeCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeRendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x0a1128, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    dirLight.position.set(450, 500, 500);
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const floorGeo = new THREE.PlaneGeometry(4500, 1000);
    const corridorTex = getProceduralTexture("#0f172a", 0.03, "grid", "rgba(71,85,105,0.15)");
    const clonedCorridorTex = corridorTex.clone();
    clonedCorridorTex.repeat.set(45, 10);
    clonedCorridorTex.needsUpdate = true;
    
    const floorMat = new THREE.MeshStandardMaterial({
      map: clonedCorridorTex,
      roughness: 0.22,
      metalness: 0.1,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.name = "floorMesh";
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(2250, 0, 500);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    let roomFloorsGroup = new THREE.Group();
    roomFloorsGroup.name = "roomFloorsGroup";
    scene.add(roomFloorsGroup);

    const campaign = getOrGenerateCampaign();
    const floorMap = campaign.floors[currentFloor];
    floorMap.rooms.forEach((room) => {
      const rw = room.maxX - room.minX;
      const rh = room.maxY - room.minY;
      const rx = room.minX + rw / 2;
      const rz = room.minY + rh / 2;

      let baseColor = "#0f172a";
      let pattern: "noise" | "grid" | "stripe" | "brushed" | "carbon" | "concrete" = "grid";
      let patternColor = "rgba(71,85,105,0.15)";

      if (room.id.startsWith("C_W")) {
        baseColor = "#0b0f19";
        patternColor = "rgba(56, 189, 248, 0.12)";
      } else if (room.id.startsWith("Office") || room.id.includes("Storage") || room.id.includes("Breakroom")) {
        baseColor = "#091424";
        patternColor = "rgba(129, 140, 248, 0.12)";
      } else if (room.id.startsWith("Stair")) {
        baseColor = "#1f140d";
        pattern = "stripe";
        patternColor = "rgba(245, 158, 11, 0.12)";
      } else if (room.id.startsWith("Toilets")) {
        baseColor = "#180f24";
        patternColor = "rgba(168, 85, 247, 0.12)";
      } else if (room.id.startsWith("Passage")) {
        baseColor = "#050a14";
        patternColor = "rgba(56, 189, 248, 0.08)";
      }

      const roomTex = getProceduralTexture(baseColor, 0.03, pattern, patternColor);
      const clonedTex = roomTex.clone();
      clonedTex.repeat.set(rw / 128, rh / 128);
      clonedTex.needsUpdate = true;

      const roomMat = new THREE.MeshStandardMaterial({
        map: clonedTex,
        roughness: 0.25,
        metalness: 0.1,
      });

      const roomGeo = new THREE.PlaneGeometry(rw, rh);
      const roomMesh = new THREE.Mesh(roomGeo, roomMat);
      roomMesh.rotation.x = -Math.PI / 2;
      roomMesh.position.set(rx, 0.15, rz);
      roomMesh.receiveShadow = true;
      roomFloorsGroup.add(roomMesh);
    });

    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);
    obstaclesGroupRef.current = obstaclesGroup;

    const tobbysGroup = new THREE.Group();
    scene.add(tobbysGroup);
    tobbysGroupRef.current = tobbysGroup;

    const itemsGroup = new THREE.Group();
    scene.add(itemsGroup);
    itemsGroupRef.current = itemsGroup;

    const puddlesGroup = new THREE.Group();
    scene.add(puddlesGroup);
    puddlesGroupRef.current = puddlesGroup;

    const decoysGroup = new THREE.Group();
    scene.add(decoysGroup);
    decoysGroupRef.current = decoysGroup;

    const soundwavesGroup = new THREE.Group();
    scene.add(soundwavesGroup);
    soundwavesGroupRef.current = soundwavesGroup;

    const playerGroup = createPlayer3DMesh();
    scene.add(playerGroup);
    playerMeshRef.current = playerGroup;

    const headGroup = playerGroup.getObjectByName("headGroup");
    if (headGroup) {
      // Mounted physical headlight configuration with aligned rotational Three.js spotlight inside headGroup!
      const flashlight = new THREE.SpotLight(0xfff6e0, 22.0, 320, Math.PI / 4, 0.4, 0.5);
      flashlight.position.set(0, 1.8, 5.8);
      flashlight.castShadow = true;
      flashlight.shadow.mapSize.width = 1024;
      flashlight.shadow.mapSize.height = 1024;
      headGroup.add(flashlight);
      playerLightRef.current = flashlight;

      const lightTarget = new THREE.Object3D();
      lightTarget.position.set(0, 1.8, 150);
      headGroup.add(lightTarget);
      flashlight.target = lightTarget;
    }
  };

  const buildRealWalls3D = () => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    let wallsGroup = scene.getObjectByName("wallsGroup") as THREE.Group | null;
    if (wallsGroup) {
      scene.remove(wallsGroup);
    }
    wallsGroup = new THREE.Group();
    wallsGroup.name = "wallsGroup";
    scene.add(wallsGroup);

    const wallHeight = 42; 
    const wallThickness = 12;

    const wallTex = getProceduralTexture("#111827", 0.05, "concrete", "rgba(56,189,248,0.1)");
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.45,
      metalness: 0.1,   
    });

    const trimMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
    });

    const addWallSegment = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 2) return;

      const angle = Math.atan2(dy, dx);

      const wallGeo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
      
      const midX = x1 + dx / 2;
      const midY = y1 + dy / 2;
      wallMesh.position.set(midX, wallHeight / 2, midY);
      wallMesh.rotation.y = -angle;
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallsGroup!.add(wallMesh);

      const trimGeo = new THREE.BoxGeometry(length, 1.2, 1.8);
      const trimMesh = new THREE.Mesh(trimGeo, trimMaterial);
      trimMesh.position.set(0, wallHeight / 2 + 0.6, 0);
      wallMesh.add(trimMesh);
    };

    const campaign = getOrGenerateCampaign();
    const floorMap = campaign.floors[currentFloor];
    const rooms = floorMap.rooms;
    const doorways = floorMap.doorways;

    const splitAndAddWall = (x1: number, y1: number, x2: number, y2: number) => {
      let segments = [{ x1, y1, x2, y2 }];

      doorways.forEach((door) => {
        const nextSegs: typeof segments = [];
        segments.forEach((seg) => {
          const isHoriz = Math.abs(seg.y1 - seg.y2) < 0.1;

          if (isHoriz) {
            const doorIntersectsY = seg.y1 >= door.minY - 2 && seg.y1 <= door.maxY + 2;
            if (doorIntersectsY) {
              const minSegX = Math.min(seg.x1, seg.x2);
              const maxSegX = Math.max(seg.x1, seg.x2);
              const minDoorX = door.minX;
              const maxDoorX = door.maxX;

              if (maxDoorX > minSegX && minDoorX < maxSegX) {
                if (minDoorX > minSegX) {
                  nextSegs.push({ x1: seg.x1, y1: seg.y1, x2: minDoorX, y2: seg.y1 });
                }
                if (maxDoorX < maxSegX) {
                  nextSegs.push({ x1: maxDoorX, y1: seg.y1, x2: seg.x2, y2: seg.y1 });
                }
                return;
              }
            }
          } else {
            const doorIntersectsX = seg.x1 >= door.minX - 2 && seg.x1 <= door.maxX + 2;
            if (doorIntersectsX) {
              const minSegY = Math.min(seg.y1, seg.y2);
              const maxSegY = Math.max(seg.y1, seg.y2);
              const minDoorY = door.minY;
              const maxDoorY = door.maxY;

              if (maxDoorY > minSegY && minDoorY < maxSegY) {
                if (minDoorY > minSegY) {
                  nextSegs.push({ x1: seg.x1, y1: seg.y1, x2: seg.x1, y2: minDoorY });
                }
                if (maxDoorY < maxSegY) {
                  nextSegs.push({ x1: seg.x1, y1: maxDoorY, x2: seg.x1, y2: seg.y2 });
                }
                return;
              }
            }
          }
          nextSegs.push(seg);
        });
        segments = nextSegs;
      });

      segments.forEach((seg) => {
        addWallSegment(seg.x1, seg.y1, seg.x2, seg.y2);
      });
    };

    rooms.forEach((r) => {
      splitAndAddWall(r.minX, r.minY, r.maxX, r.minY);
      splitAndAddWall(r.minX, r.maxY, r.maxX, r.maxY);
      splitAndAddWall(r.minX, r.minY, r.minX, r.maxY);
      splitAndAddWall(r.maxX, r.minY, r.maxX, r.maxY);
    });
  };

  const addCeilingLights3D = () => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    const toRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name && (child.name.startsWith("ceilingLight") || child.name.startsWith("ceilingLightBulb"))) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    const campaign = getOrGenerateCampaign();
    const floorMap = campaign.floors[currentFloor];
    const rooms = floorMap.rooms;

    rooms.forEach((room, idx) => {
      const cx = (room.minX + room.maxX) / 2;
      const cz = (room.minY + room.maxY) / 2;

      let color = 0x93c5fd;
      let intensity = 3.2;

      if (room.id.startsWith("H_W")) {
        color = 0xbae6fd;
        intensity = 3.5;
      } else if (room.id.startsWith("Stair") || room.id.startsWith("Passage")) {
        color = 0xfef08a;
        intensity = 4.2;
      }

      const pLight = new THREE.PointLight(color, intensity, 220, 1.2);
      pLight.position.set(cx, 36, cz); 
      pLight.name = `ceilingLight_${idx}`;
      scene.add(pLight);

      const bulbGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.6, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: color });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(cx, 37.8, cz);
      bulb.name = `ceilingLightBulb_${idx}`;
      scene.add(bulb);
    });
  };

  const checkAndInitThree = () => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;

    if (threeRendererRef.current) {
      return;
    }

    try {
      initThree();
      rebuildObstacles3D();
      buildRealWalls3D();
      addCeilingLights3D();
    } catch (e) {
      console.error("Three.js initialization failed:", e);
    }
  };

  const createModelForObstacle = (obs: GameObstacle): THREE.Group => {
    const group = new THREE.Group();
    const name = obs.name || "";
    const w = obs.width;
    const h = obs.height;

    // --- 1. CHAIR / STOOL MODEL ---
    if (name.includes("Chair") || name.includes("Stool")) {
      const seatGeo = new THREE.BoxGeometry(w, 1.2, h);
      const seatTex = getProceduralTexture("#1e3a8a", 0.05, "noise");
      const seatMat = new THREE.MeshStandardMaterial({ map: seatTex, roughness: 0.8 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 7;
      group.add(seat);

      if (!name.includes("Stool")) {
        const backGeo = new THREE.BoxGeometry(w, 8, 1.2);
        const back = new THREE.Mesh(backGeo, seatMat);
        back.position.set(0, 11.6, -h / 2 + 0.6);
        group.add(back);
      }

      const legGeo = new THREE.CylinderGeometry(0.5, 0.5, 6.4, 6);
      const legTex = getProceduralTexture("#94a3b8", 0.02, "brushed");
      const legMat = new THREE.MeshStandardMaterial({ map: legTex, metalness: 0.9, roughness: 0.1 });
      const offsets = [
        [-w / 2 + 1, -h / 2 + 1],
        [w / 2 - 1, -h / 2 + 1],
        [-w / 2 + 1, h / 2 - 1],
        [w / 2 - 1, h / 2 - 1],
      ];
      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 3.2, oz);
        group.add(leg);
      });
    }

    // --- 2. POTTED PLANT MODEL ---
    else if (name.includes("Plant") || name.includes("Pot")) {
      const potGeo = new THREE.CylinderGeometry(w / 2.2, w / 2.8, 6, 8);
      const potTex = getProceduralTexture("#ca8a04", 0.05, "noise");
      const potMat = new THREE.MeshStandardMaterial({ map: potTex, roughness: 0.9 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = 3;
      group.add(pot);

      const stemGeo = new THREE.CylinderGeometry(0.6, 0.6, 8, 6);
      const stemTex = getProceduralTexture("#78350f", 0.05, "noise");
      const stemMat = new THREE.MeshStandardMaterial({ map: stemTex, roughness: 0.9 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 10;
      group.add(stem);

      const leafTex = getProceduralTexture("#15803d", 0.06, "noise");
      const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.9 });
      
      const fol1 = new THREE.Mesh(new THREE.SphereGeometry(w / 1.8, 8, 8), leafMat);
      fol1.position.y = 13;
      group.add(fol1);

      const fol2 = new THREE.Mesh(new THREE.SphereGeometry(w / 2.2, 8, 8), leafMat);
      fol2.position.set(1.5, 16.5, -0.5);
      group.add(fol2);

      const fol3 = new THREE.Mesh(new THREE.SphereGeometry(w / 2.8, 8, 8), leafMat);
      fol3.position.set(-1, 19.5, 1);
      group.add(fol3);
    }

    // --- 3. LOCKERS MODEL ---
    else if (name.includes("Locker")) {
      const lockerHeight = 26;
      const lockerGeo = new THREE.BoxGeometry(w, lockerHeight, h);
      const lockerTex = getProceduralTexture("#475569", 0.04, "brushed");
      const lockerMat = new THREE.MeshStandardMaterial({ map: lockerTex, metalness: 0.8, roughness: 0.3 });
      const locker = new THREE.Mesh(lockerGeo, lockerMat);
      locker.position.y = lockerHeight / 2;
      group.add(locker);

      const numDoors = Math.max(1, Math.round(w / 10));
      for (let i = 0; i < numDoors; i++) {
        const offsetPct = (i + 0.5) / numDoors - 0.5;
        const dx = w * offsetPct;

        const handleGeo = new THREE.BoxGeometry(0.8, 4, 0.6);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(dx + (w / numDoors) * 0.25, 13, h / 2 + 0.2);
        group.add(handle);

        for (let v = 0; v < 3; v++) {
          const ventGeo = new THREE.BoxGeometry((w / numDoors) * 0.6, 0.3, 0.2);
          const ventMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
          const vent = new THREE.Mesh(ventGeo, ventMat);
          vent.position.set(dx, 21 + v * 1.2, h / 2 + 0.1);
          group.add(vent);
        }
      }
    }

    // --- 4. VENDING MACHINE MODEL ---
    else if (name.includes("Vending")) {
      const vendHeight = 28;
      const frameGeo = new THREE.BoxGeometry(w, vendHeight, h);
      const frameTex = getProceduralTexture("#dc2626", 0.04, "brushed");
      const frameMat = new THREE.MeshStandardMaterial({ map: frameTex, roughness: 0.3 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.y = vendHeight / 2;
      group.add(frame);

      const glassGeo = new THREE.BoxGeometry(w - 6, 12, 1.5);
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.05 });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, 18, h / 2 + 0.2);
      group.add(glass);

      const prodColors = [0xef4444, 0x10b981, 0xf59e0b, 0x3b82f6];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const col = prodColors[(r + c) % prodColors.length];
          const prodGeo = new THREE.BoxGeometry(1.5, 2, 0.8);
          const prodMat = new THREE.MeshStandardMaterial({ color: col });
          const prod = new THREE.Mesh(prodGeo, prodMat);
          prod.position.set(-w / 2 + 6 + c * (w / 4), 14 + r * 3, h / 2 + 0.1);
          group.add(prod);
        }
      }

      const glowGeo = new THREE.BoxGeometry(w - 6, 3, 1);
      const glowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.5 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0, 8, h / 2 + 0.2);
      group.add(glow);

      const dispGeo = new THREE.BoxGeometry(w - 6, 3, 1.5);
      const dispMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
      const disp = new THREE.Mesh(dispGeo, dispMat);
      disp.position.set(0, 3, h / 2 + 0.1);
      group.add(disp);
    }

    // --- 5. COUCH / SOFA MODEL ---
    else if (name.includes("Sofa") || name.includes("Couch") || name.includes("Cushion")) {
      const baseGeo = new THREE.BoxGeometry(w, 4, h);
      const baseTex = getProceduralTexture("#1e293b", 0.05, "noise");
      const baseMat = new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.9 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 2;
      group.add(base);

      const plushGeo = new THREE.BoxGeometry(w - 2, 3, h - 2);
      const plushTex = getProceduralTexture("#b91c1c", 0.06, "noise");
      const plushMat = new THREE.MeshStandardMaterial({ map: plushTex, roughness: 0.7 });
      const plush = new THREE.Mesh(plushGeo, plushMat);
      plush.position.set(0, 5, 0.5);
      group.add(plush);

      const backGeo = new THREE.BoxGeometry(w, 10, 3);
      const back = new THREE.Mesh(backGeo, plushMat);
      back.position.set(0, 8.5, -h / 2 + 1.5);
      group.add(back);

      const armGeo = new THREE.BoxGeometry(3, 8, h);
      const armMat = baseMat;
      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-w / 2 + 1.5, 5.5, 0);
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(w / 2 - 1.5, 5.5, 0);
      group.add(rightArm);
    }

    // --- 6. CABINET / CUPBOARD / SHELF ---
    else if (name.includes("Cabinet") || name.includes("Shelf") || name.includes("Cupboard") || name.includes("Drawer")) {
      const cabHeight = 24;
      const cabGeo = new THREE.BoxGeometry(w, cabHeight, h);
      const cabTex = getProceduralTexture("#78350f", 0.05, "stripe");
      const cabMat = new THREE.MeshStandardMaterial({ map: cabTex, roughness: 0.8 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.y = cabHeight / 2;
      group.add(cab);

      const numDrawers = 3;
      for (let i = 0; i < numDrawers; i++) {
        const dy = 4 + i * 7.5;
        const grooveGeo = new THREE.BoxGeometry(w - 2, 0.4, 0.4);
        const grooveMat = new THREE.MeshBasicMaterial({ color: 0x27272a });
        const groove = new THREE.Mesh(grooveGeo, grooveMat);
        groove.position.set(0, dy + 3.5, h / 2 + 0.1);
        group.add(groove);

        const handleGeo = new THREE.BoxGeometry(w * 0.4, 0.6, 0.6);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, dy + 1.8, h / 2 + 0.2);
        group.add(handle);
      }
    }

    // --- 7. CUBICLE DESK MODEL ---
    else if (name.includes("Cubicle")) {
      const wallHeight = 16;
      const wallTex = getProceduralTexture("#475569", 0.04, "concrete");
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.7 });
      const woodTex = getProceduralTexture("#d97706", 0.05, "stripe");
      const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, wallHeight, h), wallMat);
      leftWall.position.set(-w / 2 + 0.8, wallHeight / 2, 0);
      group.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1.6, wallHeight, h), wallMat);
      rightWall.position.set(w / 2 - 1.6, wallHeight / 2, 0);
      group.add(rightWall);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, 1.6), wallMat);
      backWall.position.set(0, wallHeight / 2, -h / 2 + 0.8);
      group.add(backWall);

      const deskGeo = new THREE.BoxGeometry(w - 4, 1.2, h - 3);
      const desk = new THREE.Mesh(deskGeo, woodMat);
      desk.position.set(0, 10, 1);
      group.add(desk);

      const pcBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 3), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      pcBase.position.set(0, 10.8, -h / 2 + 4);
      group.add(pcBase);

      const pcScreen = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.6), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      pcScreen.position.set(0, 13.5, -h / 2 + 4);
      group.add(pcScreen);

      const pcGlow = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0284c7, emissiveIntensity: 0.4 }));
      pcGlow.position.set(0, 13.5, -h / 2 + 4.4);
      group.add(pcGlow);

      const kb = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      kb.position.set(0, 10.7, 1.5);
      group.add(kb);
    }

    // --- 8. WASHING SINKS MODEL ---
    else if (name.includes("Sink") || name.includes("Washing")) {
      const sinkHeight = 12;
      const counterGeo = new THREE.BoxGeometry(w, sinkHeight, h);
      const counterMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#e2e8f0", 0.03, "noise"), roughness: 0.4 });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.y = sinkHeight / 2;
      group.add(counter);

      const numBasins = w > 30 ? 2 : 1;
      const steelMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#cbd5e1", 0.02, "brushed"), metalness: 0.9, roughness: 0.2 });
      for (let i = 0; i < numBasins; i++) {
        const offsetPct = numBasins === 2 ? (i === 0 ? -0.25 : 0.25) : 0;
        const dx = w * offsetPct;

        const basin = new THREE.Mesh(new THREE.BoxGeometry(w / (numBasins + 0.8), 0.2, h - 6), steelMat);
        basin.position.set(dx, sinkHeight + 0.1, 0);
        group.add(basin);

        const faucetGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 6);
        const faucetMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });
        const faucet = new THREE.Mesh(faucetGeo, faucetMat);
        faucet.position.set(dx, sinkHeight + 1.6, -h / 2 + 2);
        group.add(faucet);

        const tapGeo = new THREE.BoxGeometry(1.5, 0.3, 0.3);
        const tap = new THREE.Mesh(tapGeo, faucetMat);
        tap.position.set(dx, sinkHeight + 3.1, -h / 2 + 2.6);
        group.add(tap);
      }
    }

    // --- 9. STALL / TOILET PARTITION MODEL ---
    else if (name.includes("Partition") || name.includes("Stall")) {
      const panelHeight = 20;
      const panelGeo = new THREE.BoxGeometry(w, panelHeight, h);
      const panelMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#475569", 0.04, "brushed"), roughness: 0.6 });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.y = 14;
      group.add(panel);

      const legGeo = new THREE.CylinderGeometry(0.5, 0.5, 4, 6);
      const legMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.1 });
      const offsets = [-w / 2 + 2, w / 2 - 2];
      offsets.forEach((ox) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 2, 0);
        group.add(leg);
      });
    }

    // --- 10. BENCH MODEL ---
    else if (name.includes("Bench")) {
      const seatGeo = new THREE.BoxGeometry(w, 1.2, h);
      const seatMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#7c2d12", 0.05, "stripe"), roughness: 0.7 });
      const seat = new THREE.Mesh(seatGeo, seatMat);
      seat.position.y = 6;
      group.add(seat);

      const legGeo = new THREE.BoxGeometry(1.8, 6, h - 2);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
      const offsets = [-w / 2 + 3, w / 2 - 3];
      offsets.forEach((ox) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 3, 0);
        group.add(leg);
      });
    }

    // --- 11. BARRICADE / BARRICADES / DEBRIS / PLANK BLOCKS ---
    else if (
      name.includes("Barricade") ||
      name.includes("Blockade") ||
      name.includes("Debris") ||
      name.includes("Flipped") ||
      name.includes("Pile")
    ) {
      const crate1Geo = new THREE.BoxGeometry(10, 10, 10);
      const crate1Mat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#b45309", 0.05, "stripe"), roughness: 0.9 });
      const crate1 = new THREE.Mesh(crate1Geo, crate1Mat);
      crate1.position.set(-w / 4, 5, 0);
      crate1.rotation.set(0.1, 0.25, -0.05);
      group.add(crate1);

      if (w > 15) {
        const crate2Geo = new THREE.BoxGeometry(8, 8, 8);
        const crate2Mat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#d97706", 0.05, "stripe"), roughness: 0.95 });
        const crate2 = new THREE.Mesh(crate2Geo, crate2Mat);
        crate2.position.set(w / 4, 4, 1);
        crate2.rotation.set(-0.15, -0.3, 0.1);
        group.add(crate2);
      }

      const boardGeo = new THREE.BoxGeometry(w + 2, 2.5, 1);
      const boardMat = new THREE.MeshStandardMaterial({ map: getProceduralTexture("#78350f", 0.06, "stripe"), roughness: 0.9 });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(0, 8.5, 4.5);
      board.rotation.z = -0.12;
      group.add(board);

      const stripeGeo = new THREE.BoxGeometry(w - 2, 1.2, 1.1);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xea580c });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(0, 8.5, 4.52);
      stripe.rotation.z = -0.12;
      group.add(stripe);
    }

    // --- 12. DESK / TABLE MODEL ---
    else if (name.includes("Desk") || name.includes("Table") || name.includes("Study")) {
      const topGeo = new THREE.BoxGeometry(w, 1.6, h);
      const topTex = getProceduralTexture("#d97706", 0.05, "stripe");
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.75 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 13;
      group.add(top);

      const legGeo = new THREE.BoxGeometry(1.2, 12.2, 1.2);
      const legTex = getProceduralTexture("#475569", 0.03, "brushed");
      const legMat = new THREE.MeshStandardMaterial({ map: legTex, metalness: 0.8, roughness: 0.3 });
      const offsets = [
        [-w / 2 + 1, -h / 2 + 1],
        [w / 2 - 1, -h / 2 + 1],
        [-w / 2 + 1, h / 2 - 1],
        [w / 2 - 1, h / 2 - 1],
      ];
      offsets.forEach(([ox, oz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(ox, 6.1, oz);
        group.add(leg);
      });

      if (w > 22) {
        const backBoardGeo = new THREE.BoxGeometry(w - 4, 8, 0.8);
        const backBoard = new THREE.Mesh(backBoardGeo, legMat);
        backBoard.position.set(0, 9, -h / 2 + 1.2);
        group.add(backBoard);
      }
    }

    // --- 13. CHEST / STORAGE BOX MODEL ---
    else if (name.includes("Box") || name.includes("Chest") || name.includes("Trunk")) {
      const boxGeo = new THREE.BoxGeometry(w, 12, h);
      const boxTex = getProceduralTexture("#7c2d12", 0.05, "stripe");
      const boxMat = new THREE.MeshStandardMaterial({ map: boxTex, roughness: 0.95 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.y = 6;
      group.add(box);

      const lidGeo = new THREE.BoxGeometry(w + 1, 2, h + 1);
      const lid = new THREE.Mesh(lidGeo, boxMat);
      lid.position.y = 13;
      group.add(lid);

      const cornerGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.9, roughness: 0.1 });
      const cornerOffs = [
        [-w / 2, 0, -h / 2],
        [w / 2, 0, -h / 2],
        [-w / 2, 0, h / 2],
        [w / 2, 0, h / 2],
        [-w / 2, 12, -h / 2],
        [w / 2, 12, -h / 2],
        [-w / 2, 12, h / 2],
        [w / 2, 12, h / 2],
      ];
      cornerOffs.forEach(([ox, oy, oz]) => {
        const corner = new THREE.Mesh(cornerGeo, brassMat);
        corner.position.set(ox, oy, oz);
        group.add(corner);
      });
    }

    // --- 14. DEFAULT GENERIC MODEL ---
    else {
      const boxGeo = new THREE.BoxGeometry(w, 24, h);
      const boxTex = getProceduralTexture("#1e293b", 0.05, "concrete");
      const boxMat = new THREE.MeshStandardMaterial({
        map: boxTex,
        metalness: 0.1,
        roughness: 0.6,
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.y = 12;
      group.add(boxMesh);

      const barGeo = new THREE.BoxGeometry(w - 2, 0.4, h - 2);
      const barMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 });
      const cyanTop = new THREE.Mesh(barGeo, barMat);
      cyanTop.position.set(0, 12.1, 0);
      boxMesh.add(cyanTop);
    }

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  };

  const rebuildObstacles3D = () => {
    const obstaclesGroup = obstaclesGroupRef.current;
    if (!obstaclesGroup) return;

    while (obstaclesGroup.children.length > 0) {
      obstaclesGroup.remove(obstaclesGroup.children[0]);
    }

    const activeObs = currentFloorObstacles;
    activeObs.forEach((obs) => {
      const width = obs.width;
      const height = obs.height;
      
      const modelGroup = createModelForObstacle(obs);
      modelGroup.position.set(obs.x + width / 2, 0, obs.y + height / 2);
      obstaclesGroup.add(modelGroup);
    });
  };

  const create3DItemMesh = (type: ItemType): THREE.Group => {
    const group = new THREE.Group();
    const animGroup = new THREE.Group();
    animGroup.name = "animatedGroup";
    
    if (type === ItemType.MEDICINE) {
      const caseGeo = new THREE.BoxGeometry(11, 7, 4);
      const caseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
      const suitcase = new THREE.Mesh(caseGeo, caseMat);
      suitcase.rotation.x = Math.PI / 6;
      animGroup.add(suitcase);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      crossH.position.set(0, 5, 0);
      crossV.position.set(0, 5, 0);
      animGroup.add(crossH);
      animGroup.add(crossV);
    } else if (type === ItemType.CATNIP) {
      const pouchGeo = new THREE.SphereGeometry(4.5, 8, 8);
      const pouchMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.8 });
      const pouch = new THREE.Mesh(pouchGeo, pouchMat);
      animGroup.add(pouch);
      
      const ringGeo = new THREE.RingGeometry(5, 6, 8);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.5;
      animGroup.add(ring);
    } else if (type === ItemType.ENERGY_CAN) {
      const canGeo = new THREE.CylinderGeometry(3.2, 3.2, 8, 12);
      const canMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.8, roughness: 0.1 });
      const can = new THREE.Mesh(canGeo, canMat);
      can.rotation.x = Math.PI / 8;
      animGroup.add(can);
    } else if (type === ItemType.EMP) {
      const coreGeo = new THREE.OctahedronGeometry(5, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
      const core = new THREE.Mesh(coreGeo, coreMat);
      animGroup.add(core);

      const coreInner = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      animGroup.add(coreInner);
    }
    
    group.add(animGroup);
    return group;
  };

  const create3DPuddleMesh = (radius: number): THREE.Group => {
    const group = new THREE.Group();
    
    const geo = new THREE.CylinderGeometry(radius, radius, 0.4, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.8,
    });
    const puddleMesh = new THREE.Mesh(geo, mat);
    group.add(puddleMesh);

    const ringGeo = new THREE.RingGeometry(radius - 1, radius + 1, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    group.add(ring);
    
    return group;
  };

  const create3DDecoyMesh = (): THREE.Group => {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(6, 12, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.6, metalness: 0.5 });
    const decoyMesh = new THREE.Mesh(geo, mat);
    decoyMesh.name = "decoyBody";
    group.add(decoyMesh);

    const ringGeo = new THREE.RingGeometry(1, 15, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd8b4fe,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = "pulseRing";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -5.8;
    group.add(ring);
    
    return group;
  };

  const renderThree = (dt: number = 0.016) => {
    checkAndInitThree();
    updateThreeEntities(dt);
    if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current) {
      threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current);
    }
  };

  // --- THREE ENGINE CORE GRAPHICS UPDATER ---
  const updateThreeEntities = (dt = 0.016) => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    const p = playerRef.current;
    const playerMesh = playerMeshRef.current;
    if (playerMesh) {
      playerMesh.position.set(p.x, 0, p.y);
      playerMesh.rotation.y = -p.angle + Math.PI / 2;

      if (invincibilityTimeRef.current > 0) {
        playerMesh.visible = (Math.floor(Date.now() / 80) % 2) === 0;
      } else {
        playerMesh.visible = true;
      }

      const isMoving = p.isMoving;
      const walkCycle = Date.now() / 1000;
      const speedFactor = p.isBurstActive ? 20 : 12;

      const leftLeg = playerMesh.getObjectByName("leftLeg");
      const rightLeg = playerMesh.getObjectByName("rightLeg");
      const leftArm = playerMesh.getObjectByName("leftArm");
      const rightArm = playerMesh.getObjectByName("rightArm");

      if (meleeStrikeActive) {
        if (rightArm) rightArm.rotation.x = -Math.PI / 1.6;
        if (leftArm) leftArm.rotation.x = Math.PI / 3;

        if (Math.random() < 0.4) {
          const punchAngle = p.angle;
          const px = p.x + Math.cos(punchAngle) * 16 + (Math.random() - 0.5) * 5;
          const pz = p.y + Math.sin(punchAngle) * 16 + (Math.random() - 0.5) * 5;
          spawnThreeParticle(px, 12, pz, (Math.random() - 0.5) * 30, Math.random() * 20 + 10, (Math.random() - 0.5) * 30, 'slash', 0x06b6d4);
        }
      } else {
        if (isMoving) {
          const swingAngle = Math.sin(walkCycle * speedFactor) * 0.45;
          if (leftLeg) leftLeg.rotation.x = swingAngle;
          if (rightLeg) rightLeg.rotation.x = -swingAngle;
          if (leftArm) leftArm.rotation.x = -swingAngle * 0.75;
          if (rightArm) rightArm.rotation.x = swingAngle * 0.75;
        } else {
          const breath = Math.sin(walkCycle * 2.5) * 0.05;
          if (leftLeg) leftLeg.rotation.x += (0 - leftLeg.rotation.x) * 0.15;
          if (rightLeg) rightLeg.rotation.x += (0 - rightLeg.rotation.x) * 0.15;
          if (leftArm) leftArm.rotation.x += (breath - leftArm.rotation.x) * 0.15;
          if (rightArm) rightArm.rotation.x += (-breath - rightArm.rotation.x) * 0.15;
        }
      }

      const headGroup = playerMesh.getObjectByName("headGroup");
      if (headGroup) {
        if (isMoving) {
          const targetRotX = p.isBurstActive ? 0.28 : 0.15;
          const targetRotY = Math.sin(walkCycle * (p.isBurstActive ? 20 : 12)) * 0.05;
          headGroup.rotation.x += (targetRotX - headGroup.rotation.x) * 0.15;
          headGroup.rotation.y += (targetRotY - headGroup.rotation.y) * 0.15;
          headGroup.rotation.z += (0 - headGroup.rotation.z) * 0.15;
        } else {
          let targetRotY = 0;
          let targetRotX = 0;
          if (mouseTargetRef.current) {
            const dx = mouseTargetRef.current.x - p.x;
            const dy = mouseTargetRef.current.y - p.y;
            const mouseAngle = Math.atan2(dy, dx);
            const diffAngle = normalizeAngle(mouseAngle - p.angle);
            targetRotY = Math.max(-1.2, Math.min(1.2, diffAngle));
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            targetRotX = Math.max(-0.4, Math.min(0.4, (120 - dist) * 0.003));
          } else {
            targetRotY = Math.sin(walkCycle * 1.5) * 0.04;
            targetRotX = Math.sin(walkCycle * 2.2) * 0.02;
          }

          headGroup.rotation.y += (targetRotY - headGroup.rotation.y) * 0.15;
          headGroup.rotation.x += (targetRotX - headGroup.rotation.x) * 0.15;
          headGroup.rotation.z += (Math.sin(walkCycle * 1.2) * 0.03 - headGroup.rotation.z) * 0.15;
        }
      }

      if (isMoving) {
        if (!footstepTimerRef.current) footstepTimerRef.current = 0;
        footstepTimerRef.current += dt;
        if (footstepTimerRef.current >= 0.08) {
          footstepTimerRef.current = 0;
          const backAngle = p.angle + Math.PI;
          const px = p.x + Math.cos(backAngle) * 4 + (Math.random() - 0.5) * 3;
          const pz = p.y + Math.sin(backAngle) * 4 + (Math.random() - 0.5) * 3;
          spawnThreeParticle(px, 1.2, pz, (Math.random() - 0.5) * 10, Math.random() * 8 + 4, (Math.random() - 0.5) * 10, 'dust', 0x94a3b8);
        }
      }

      const isSpeeding = p.isBurstActive || (p.hyperChargeTime && p.hyperChargeTime > 0);
      if (p.hyperChargeTime && p.hyperChargeTime > 0) {
        const px = p.x + (Math.random() - 0.5) * 12;
        const pz = p.y + (Math.random() - 0.5) * 12;
        spawnThreeParticle(px, Math.random() * 20 + 2, pz, (Math.random() - 0.5) * 6, Math.random() * 18 + 12, (Math.random() - 0.5) * 6, 'spark', 0xf59e0b);
      } else if (p.isBurstActive) {
        const px = p.x + (Math.random() - 0.5) * 8;
        const pz = p.y + (Math.random() - 0.5) * 8;
        spawnThreeParticle(px, Math.random() * 16 + 2, pz, (Math.random() - 0.5) * 4, Math.random() * 12 + 6, (Math.random() - 0.5) * 4, 'spark', 0x38bdf8);
      }

      let playerInPuddle = false;
      for (const puddle of puddlesRef.current) {
        const distToPuddle = Math.sqrt((p.x - puddle.x) ** 2 + (p.y - puddle.y) ** 2);
        if (distToPuddle <= puddle.radius) {
          playerInPuddle = true;
          break;
        }
      }
      if (playerInPuddle && isMoving && Math.random() < 0.3) {
        const px = p.x + (Math.random() - 0.5) * 6;
        const pz = p.y + (Math.random() - 0.5) * 6;
        spawnThreeParticle(px, 1.5, pz, (Math.random() - 0.5) * 24, Math.random() * 18 + 8, (Math.random() - 0.5) * 24, 'splash', 0x22d3ee);
      }

      updateThreeParticles(dt);

      const ring = playerMesh.children[0] as THREE.Mesh;
      if (ring && ring.material) {
        (ring.material as THREE.MeshBasicMaterial).color.setHex(isSpeeding ? 0xf59e0b : (characterClass === CharacterClass.RUNNER ? 0x3b82f6 : (characterClass === CharacterClass.MARCUS ? 0x15803d : 0xbe123c)));
      }
      
      const camera = threeCameraRef.current;
      if (camera) {
        const lookAheadDist = 65;
        const lookX = Math.cos(p.angle) * lookAheadDist;
        const lookY = Math.sin(p.angle) * lookAheadDist;

        const targetCamX = p.x + lookX * 0.7;
        const targetCamZ = p.y + 160 + lookY * 0.7;
        const targetCamY = 275;

        camera.position.x += (targetCamX - camera.position.x) * 0.075;
        camera.position.z += (targetCamZ - camera.position.z) * 0.075;
        camera.position.y += (targetCamY - camera.position.y) * 0.075;

        camera.lookAt(p.x + lookX * 0.4, 6, p.y + lookY * 0.4);
      }

      if (dirLightRef.current) {
        dirLightRef.current.position.set(p.x, 500, p.y);
      }
    }

    const tobbysGroup = tobbysGroupRef.current;
    if (tobbysGroup) {
      const tobbys = tobbysRef.current;
      
      while (tobbysGroup.children.length < tobbys.length) {
        const tMesh = createTobby3DMesh();
        
        const spot = new THREE.SpotLight(0xff1111, 15.0, 240, Math.PI / 4.5, 0.4, 0.5);
        spot.position.set(0, 32, 8);
        spot.castShadow = false;
        tMesh.add(spot);

        const targetObj = new THREE.Object3D();
        tMesh.add(targetObj);
        spot.target = targetObj;

        tobbysGroup.add(tMesh);
      }
      while (tobbysGroup.children.length > tobbys.length) {
        tobbysGroup.remove(tobbysGroup.children[tobbysGroup.children.length - 1]);
      }

      tobbys.forEach((t, idx) => {
        const tMesh = tobbysGroup.children[idx] as THREE.Group;
        if (tMesh) {
          tMesh.position.set(t.x, 0, t.y);
          tMesh.rotation.y = -t.angle + Math.PI / 2;

          const isTobbyMoving = t.isMoving;
          const tobbyWalkCycle = (Date.now() + idx * 400) / 1000;
          const tobbySpeedFactor = t.aiState === AIState.CHASING ? 18 : 10;

          const tLeftLeg = tMesh.getObjectByName("leftLeg");
          const tRightLeg = tMesh.getObjectByName("rightLeg");
          const tLeftArm = tMesh.getObjectByName("leftArm");
          const tRightArm = tMesh.getObjectByName("rightArm");

          if (isTobbyMoving) {
            const swingAngle = Math.sin(tobbyWalkCycle * tobbySpeedFactor) * 0.5;
            if (tLeftLeg) tLeftLeg.rotation.x = swingAngle;
            if (tRightLeg) tRightLeg.rotation.x = -swingAngle;
            if (tLeftArm) tLeftArm.rotation.x = -swingAngle * 0.8;
            if (tRightArm) tRightArm.rotation.x = swingAngle * 0.8;
          } else {
            const tBreath = Math.sin(tobbyWalkCycle * 2) * 0.04;
            if (tLeftLeg) tLeftLeg.rotation.x += (0 - tLeftLeg.rotation.x) * 0.2;
            if (tRightLeg) tRightLeg.rotation.x += (0 - tRightLeg.rotation.x) * 0.2;
            if (tLeftArm) tLeftArm.rotation.x += (tBreath - tLeftArm.rotation.x) * 0.2;
            if (tRightArm) tRightArm.rotation.x += (-tBreath - tRightArm.rotation.x) * 0.2;
          }

          const tHeadGroup = tMesh.getObjectByName("headGroup");
          if (tHeadGroup) {
            if (t.aiState === AIState.CHASING) {
              const dx = p.x - t.x;
              const dy = p.y - t.y;
              const playerAngle = Math.atan2(dy, dx);
              const diffAngle = normalizeAngle(playerAngle - t.angle);
              
              const targetRotY = Math.max(-1.4, Math.min(1.4, diffAngle));
              const targetRotX = 0.2 + Math.sin(tobbyWalkCycle * 20) * 0.05;
              
              tHeadGroup.rotation.y += (targetRotY - tHeadGroup.rotation.y) * 0.25;
              tHeadGroup.rotation.x += (targetRotX - tHeadGroup.rotation.x) * 0.25;
              tHeadGroup.rotation.z += (Math.sin(tobbyWalkCycle * 25) * 0.06 - tHeadGroup.rotation.z) * 0.25;
            } else if (isTobbyMoving) {
              const scanAngle = Math.sin(tobbyWalkCycle * 3.5) * 0.35;
              tHeadGroup.rotation.y += (scanAngle - tHeadGroup.rotation.y) * 0.15;
              tHeadGroup.rotation.x += (0.05 - tHeadGroup.rotation.x) * 0.15;
              tHeadGroup.rotation.z += (0 - tHeadGroup.rotation.z) * 0.15;
            } else {
              const slowTiltZ = Math.sin(tobbyWalkCycle * 1.0) * 0.18;
              const scanAngle = Math.sin(tobbyWalkCycle * 0.6) * 0.2;
              tHeadGroup.rotation.z += (slowTiltZ - tHeadGroup.rotation.z) * 0.1;
              tHeadGroup.rotation.y += (scanAngle - tHeadGroup.rotation.y) * 0.1;
              tHeadGroup.rotation.x += (Math.sin(tobbyWalkCycle * 0.8) * 0.04 - tHeadGroup.rotation.x) * 0.1;
            }
          }

          const bobSpeed = t.aiState === AIState.CHASING ? 15 : 6;
          tMesh.position.y = Math.abs(Math.sin(Date.now() / 1000 * bobSpeed)) * 1.8;

          const spot = tMesh.children[tMesh.children.length - 2] as THREE.SpotLight;
          if (spot) {
            const targetObj = tMesh.children[tMesh.children.length - 1];
            targetObj.position.set(0, -20, 180);
            
            if (t.aiState === AIState.CHASING) {
              spot.color.setHex(0xff0000);
              spot.intensity = 25.0;
            } else {
              spot.color.setHex(0xffaa44); 
              spot.intensity = 10.0;
            }

            const isFrozen = (empActiveTimeRef.current > 0) || (characterClass === CharacterClass.FAIBE && playerRef.current.isPacifying);
            
            const distToPlayer = Math.sqrt((t.x - p.x) ** 2 + (t.y - p.y) ** 2);
            spot.visible = distToPlayer < 280 && !isFrozen;
          }
        }
      });
    }

    const itemsGroup = itemsGroupRef.current;
    if (itemsGroup) {
      const activeItems = medicinesRef.current.filter((item) => !item.pickedUp);
      
      if (lastActiveItemCountRef.current !== activeItems.length) {
        lastActiveItemCountRef.current = activeItems.length;
        while (itemsGroup.children.length > 0) {
          itemsGroup.remove(itemsGroup.children[0]);
        }
        activeItems.forEach((item) => {
          const itemMesh = create3DItemMesh(item.type);
          itemMesh.position.set(item.x, 0, item.y);
          itemsGroup.add(itemMesh);
        });
      }

      const floatY = 4 + Math.sin(Date.now() / 200) * 1.5;
      const rotateAngle = Date.now() / 1000;

      activeItems.forEach((item, idx) => {
        const itemMesh = itemsGroup.children[idx] as THREE.Group;
        if (itemMesh) {
          itemMesh.position.set(item.x, 0, item.y);
          const animGroup = itemMesh.getObjectByName("animatedGroup");
          if (animGroup) {
            animGroup.position.y = floatY;
            animGroup.rotation.y = rotateAngle;
            if (item.type === ItemType.EMP) {
              animGroup.rotation.x = rotateAngle;
            }
          }
        }
      });
    }

    const puddlesGroup = puddlesGroupRef.current;
    if (puddlesGroup) {
      const puddles = puddlesRef.current;
      if (lastActivePuddleCountRef.current !== puddles.length) {
        lastActivePuddleCountRef.current = puddles.length;
        while (puddlesGroup.children.length > 0) {
          puddlesGroup.remove(puddlesGroup.children[0]);
        }
        puddles.forEach((pud) => {
          const puddleMesh = create3DPuddleMesh(pud.radius);
          puddleMesh.position.set(pud.x, 0.2, pud.y);
          puddlesGroup.add(puddleMesh);
        });
      }

      puddles.forEach((pud, idx) => {
        const puddleMesh = puddlesGroup.children[idx] as THREE.Group;
        if (puddleMesh) {
          puddleMesh.position.set(pud.x, 0.2, pud.y);
        }
      });
    }

    const decoysGroup = decoysGroupRef.current;
    if (decoysGroup) {
      const decoys = decoysRef.current;
      if (lastActiveDecoyCountRef.current !== decoys.length) {
        lastActiveDecoyCountRef.current = decoys.length;
        while (decoysGroup.children.length > 0) {
          decoysGroup.remove(decoysGroup.children[0]);
        }
        decoys.forEach((dec) => {
          const decoyMesh = create3DDecoyMesh();
          decoyMesh.position.set(dec.x, 6, dec.y);
          decoysGroup.add(decoyMesh);
        });
      }

      decoys.forEach((dec, idx) => {
        const decoyMesh = decoysGroup.children[idx] as THREE.Group;
        if (decoyMesh) {
          decoyMesh.position.set(dec.x, 6, dec.y);
          decoyMesh.rotation.y = Date.now() / 250;

          const pulseRing = decoyMesh.getObjectByName("pulseRing") as THREE.Mesh;
          if (pulseRing) {
            const waveRadius = ((Date.now() / 12) % 180);
            pulseRing.scale.setScalar(waveRadius / 15);
            if (pulseRing.material) {
              (pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - waveRadius / 180) * 0.5;
            }
          }
        }
      });
    }

    const soundwavesGroup = soundwavesGroupRef.current;
    if (soundwavesGroup) {
      const soundWaves = soundWavesRef.current;
      
      while (soundwavesGroup.children.length < soundWaves.length) {
        const ringGeo = new THREE.RingGeometry(0.85, 1.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        soundwavesGroup.add(ring);
      }
      while (soundwavesGroup.children.length > soundWaves.length) {
        soundwavesGroup.remove(soundwavesGroup.children[soundwavesGroup.children.length - 1]);
      }

      soundWaves.forEach((sw, idx) => {
        const ring = soundwavesGroup.children[idx] as THREE.Mesh;
        if (ring) {
          const tRatio = 1 - (sw.timeLeft / 0.6);
          const curRadius = sw.radius + tRatio * (sw.maxRadius - sw.radius);
          ring.position.set(sw.x, 0.8, sw.y);
          ring.scale.setScalar(curRadius);
          if (ring.material) {
            (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - tRatio) * 0.9;
          }
        }
      });
    }
  };

  const drawGraphics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cache = imagesCachedRef.current;
    if (!cache) return;

    const p = playerRef.current;
    const zoom = 2.3;

    let tx = canvas.width / 2 - p.x * zoom;
    let ty = canvas.height / 2 - p.y * zoom;

    const minTx = canvas.width - 4500 * zoom;
    const minTy = canvas.height - 1000 * zoom;
    tx = Math.max(minTx, Math.min(0, tx));
    ty = Math.max(minTy, Math.min(0, ty));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);

    ctx.drawImage(cache.map, 0, 0, 4500, 1000);

    if (currentFloor !== 5) {
      const activeObs = currentFloorObstacles;
      activeObs.forEach((obs) => {
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;

        if (
          obs.name?.includes("Barricade") ||
          obs.name?.includes("Blockade") ||
          obs.name?.includes("Debris") ||
          obs.name?.includes("Flipped") ||
          obs.name?.includes("Pile")
        ) {
          ctx.fillStyle = "#111827";
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1.6;
        } else if (obs.name?.includes("Study")) {
          ctx.fillStyle = "#0f172a";
          ctx.strokeStyle = "#38bdf8";
        }

        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        if (
          obs.name?.includes("Barricade") ||
          obs.name?.includes("Blockade") ||
          obs.name?.includes("Debris") ||
          obs.name?.includes("Flipped")
        ) {
          ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.moveTo(obs.x + obs.width, obs.y);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(71, 85, 105, 0.5)";
          ctx.strokeRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);
        }
      });
    }

    puddlesRef.current.forEach((pud) => {
      ctx.beginPath();
      ctx.arc(pud.x, pud.y, pud.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14, 116, 144, 0.45)";
      ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(pud.x, pud.y, pud.radius * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
      ctx.stroke();
    });

    medicinesRef.current.forEach((item) => {
      if (item.pickedUp) return;

      const auraPulse = 8 + Math.sin(Date.now() / 150) * 2.5;

      if (item.type === ItemType.MEDICINE) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
        ctx.strokeStyle = "rgba(34, 197, 94, 0.45)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.2;

        const kw = 12;
        const kh = 9;
        const kx = item.x - kw / 2;
        const ky = item.y - kh / 2;

        ctx.beginPath();
        ctx.rect(kx, ky, kw, kh);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.rect(item.x - 2, ky - 2.2, 4, 2.2);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = "#22c55e";
        ctx.fillRect(item.x - 3.5, item.y - 1.0, 7.0, 2.0);
        ctx.fillRect(item.x - 1.0, item.y - 3.5, 2.0, 7.0);

      } else if (item.type === ItemType.CATNIP) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(168, 85, 247, 0.18)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#a855f7";
        ctx.strokeStyle = "#d8b4fe";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 7);
        ctx.lineTo(item.x - 6, item.y + 5);
        ctx.lineTo(item.x + 6, item.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(item.x, item.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fb7185";
        ctx.fill();

      } else if (item.type === ItemType.ENERGY_CAN) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f59e0b";
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.rect(item.x - 4.5, item.y - 6.5, 9, 13);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(item.x - 3.5, item.y - 7.5, 7, 1);

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(item.x + 1, item.y - 4);
        ctx.lineTo(item.x - 2, item.y + 0.5);
        ctx.lineTo(item.x + 0.5, item.y + 0.5);
        ctx.lineTo(item.x - 1, item.y + 4.5);
        ctx.lineTo(item.x + 2, item.y - 0.2);
        ctx.lineTo(item.x - 0.5, item.y - 0.2);
        ctx.closePath();
        ctx.fill();

      } else if (item.type === ItemType.EMP) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.18)";
        ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.arc(item.x, item.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.0;
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(item.x + Math.cos(angle) * 3, item.y + Math.sin(angle) * 3);
          ctx.lineTo(item.x + Math.cos(angle) * 8, item.y + Math.sin(angle) * 8);
          ctx.stroke();
        }
      }
    });

    decoysRef.current.forEach((dec) => {
      const pulseRadius = 24 + Math.sin(dec.pulseTimer * 8) * 8;
      ctx.beginPath();
      ctx.arc(dec.x, dec.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(dec.x, dec.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#a855f7";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const bubbleX = dec.x + Math.sin(dec.pulseTimer * 3 + i * 2) * 12;
        const bubbleOffset = (dec.pulseTimer * 22 + i * 15) % 35;
        ctx.beginPath();
        ctx.arc(bubbleX, dec.y - bubbleOffset, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(192, 132, 252, 0.75)";
        ctx.fill();
      }
    });

    soundWavesRef.current.forEach((wave) => {
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${wave.timeLeft / 0.6})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    tobbysRef.current.forEach((t) => {
      const isFloorPacified = p.isPacifying;
      if (isFloorPacified) return;

      const dist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
      if (dist <= 60 && t.stareCooldown <= 0 && t.aiState === AIState.CHASING) {
        const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
        const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
        const stareFovHalf = (15 * Math.PI) / 180;

        if (angleDiff <= stareFovHalf) {
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          
          const angleLeft = t.angle - stareFovHalf;
          const angleRight = t.angle + stareFovHalf;
          
          ctx.lineTo(t.x + Math.cos(angleLeft) * 65, t.y + Math.sin(angleLeft) * 65);
          ctx.lineTo(t.x + Math.cos(angleRight) * 65, t.y + Math.sin(angleRight) * 65);
          ctx.closePath();
          
          ctx.fillStyle = "rgba(220, 38, 38, 0.18)";
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    });

    tobbysRef.current.forEach((t) => {
      const isFlashActive = t.flashTime > 0;

      if (t.hp < t.maxHp) {
        const barWidth = 24;
        const barHeight = 4;
        const barX = t.x - barWidth / 2;
        const barY = t.y - 25;

        ctx.fillStyle = "rgba(220, 38, 38, 0.85)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
        ctx.fillRect(barX, barY, barWidth * (t.hp / t.maxHp), barHeight);

        ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }

      if (t.aiState === AIState.CHASING) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = isFlashActive ? "rgba(255, 255, 255, 0.9)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = isFlashActive ? "rgba(255, 255, 255, 0.25)" : "rgba(239, 68, 68, 0.1)";
        ctx.fill();
      }

      const isCurrentlyEMPFrozen = empActiveTimeRef.current > 0;
      if (isCurrentlyEMPFrozen) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1.2;
        for (let j = 0; j < 3; j++) {
          const boltAngle = (j * Math.PI * 2) / 3 + Date.now() * 0.05;
          ctx.beginPath();
          ctx.moveTo(t.x + Math.cos(boltAngle) * 8, t.y - 10 + Math.sin(boltAngle) * 8);
          ctx.lineTo(t.x + Math.cos(boltAngle + 0.3) * 14, t.y - 18 + Math.sin(boltAngle + 0.3) * 14);
          ctx.lineTo(t.x + Math.cos(boltAngle) * 18, t.y - 25 + Math.sin(boltAngle) * 18);
          ctx.stroke();
        }
      }

      if (p.isPacifying) {
        ctx.beginPath();
        ctx.arc(t.x, t.y - 15, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const angle = t.angle + Math.PI / 2;
      
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(angle);

      let tobbyFootLeft = 0;
      let tobbyFootRight = 0;
      if (t.aiState === AIState.CHASING) {
        const cycle = Date.now() / 95;
        tobbyFootLeft = Math.sin(cycle) * 7;
        tobbyFootRight = -Math.sin(cycle) * 7;
      } else {
        const cycle = Date.now() / 320;
        tobbyFootLeft = Math.sin(cycle) * 1.5;
        tobbyFootRight = -Math.sin(cycle) * 1.5;
      }

      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.0;

      ctx.beginPath();
      ctx.arc(-6, 20 + tobbyFootLeft, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(6, 20 + tobbyFootRight, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      if (isFlashActive) {
        ctx.filter = "brightness(2) sepia(1) hue-rotate(-50deg) saturate(3)";
      }
      
      let activeTobbyImg = cache.tobby;
      if (t.aiState === AIState.CHASING) {
        const frameIdx = Math.floor(t.wiggleOffset * 1.5) % 12;
        activeTobbyImg = cache.tobby_walk[frameIdx] || cache.tobby;
      } else if (!t.isStationary) {
        const frameIdx = Math.floor(t.wiggleOffset * 1.0) % 12;
        activeTobbyImg = cache.tobby_walk[frameIdx] || cache.tobby;
      }

      ctx.drawImage(activeTobbyImg, -14, -28, 28, 56);
      if (isFlashActive) {
        ctx.filter = "none";
      }
      ctx.restore();
    });

    if (invincibilityTimeRef.current > 0) {
      const showPlayer = Math.floor(Date.now() / 80) % 2 === 0;
      if (!showPlayer) {
        ctx.globalAlpha = 0.25;
      }
    }

    if (p.isRamming) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (p.scratchDotDuration > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const keys = keysPressedRef.current;
    const isMoving = !!(keys["w"] || keys["arrowup"] || keys["s"] || keys["arrowdown"] || keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"]);

    let footOffsetLeft = 0;
    let footOffsetRight = 0;
    if (isMoving) {
      const cycle = Date.now() / 105;
      footOffsetLeft = Math.sin(cycle) * 7.5;
      footOffsetRight = -Math.sin(cycle) * 7.5;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    ctx.arc(-8, 12 + footOffsetLeft, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(8, 12 + footOffsetRight, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (meleeStrikeActive) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      ctx.beginPath();
      ctx.arc(0, 0, 36, -Math.PI / 3, Math.PI / 3);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
      ctx.lineWidth = 4.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 36, -Math.PI / 4, Math.PI / 4);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      
      ctx.restore();
    }

    if (p.isBurstActive) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Date.now() / 80);
      
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(Date.now() / 60) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(14, 165, 233, 0.65)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-4, -24);
        ctx.lineTo(4, -24);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    let playerImg = cache.runner;
    if (isMoving) {
      const idx = Math.floor(playerWalkTimeRef.current) % 12;
      if (characterClass === CharacterClass.RUNNER) {
        playerImg = cache.runner_walk[idx] || cache.runner;
      } else if (characterClass === CharacterClass.MARCUS) {
        playerImg = cache.marcus_walk[idx] || cache.marcus;
      } else if (characterClass === CharacterClass.FAIBE) {
        playerImg = cache.faibe_walk[idx] || cache.faibe;
      }
    } else {
      if (characterClass === CharacterClass.RUNNER) playerImg = cache.runner;
      else if (characterClass === CharacterClass.MARCUS) playerImg = cache.marcus;
      else if (characterClass === CharacterClass.FAIBE) playerImg = cache.faibe;
    }

    const playerAngle = p.angle + Math.PI / 2;

    const isPlayerSpeeding = p.isBurstActive || (p.hyperChargeTime && p.hyperChargeTime > 0);
    if (isPlayerSpeeding) {
      for (let s = 1; s <= 3; s++) {
        const trailX = p.x - Math.cos(p.angle) * s * 12;
        const trailY = p.y - Math.sin(p.angle) * s * 12;

        ctx.save();
        ctx.translate(trailX, trailY);
        ctx.rotate(playerAngle);
        ctx.globalAlpha = 0.40 - s * 0.10;
        ctx.filter = "brightness(1.5) sepia(1) hue-rotate(5deg) saturate(3)";
        ctx.drawImage(playerImg, -19, -19, 38, 38);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(playerAngle);
    ctx.drawImage(playerImg, -19, -19, 38, 38);
    ctx.restore();

    const vignetteGrad = ctx.createRadialGradient(p.x, p.y, 45, p.x, p.y, 230);
    vignetteGrad.addColorStop(0, "rgba(2, 6, 23, 0.0)");
    vignetteGrad.addColorStop(0.35, "rgba(2, 6, 23, 0.35)");
    vignetteGrad.addColorStop(0.8, "rgba(2, 6, 23, 0.94)");
    vignetteGrad.addColorStop(1, "rgba(2, 6, 23, 1.0)");
    
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, 4500, 1000);

    ctx.globalAlpha = 1.0;
    ctx.restore();
  };

  const getAbilityPercentage = () => {
    let max = 1;
    if (characterClass === CharacterClass.MARCUS) max = 30;
    if (characterClass === CharacterClass.FAIBE) max = 45;
    return 100 - (abilityCd / max) * 100;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto items-stretch select-none relative p-2 md:p-6 font-mono bg-slate-900/40 rounded-3xl border border-slate-800/60 shadow-2xl overflow-hidden backdrop-blur-md">
      
      {screenDamageFlash && (
        <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay border-[14px] border-red-600/80 rounded-3xl pointer-events-none z-50 animate-ping duration-100" />
      )}

      {/* LEFT: HTML5 High-performance Game Arena Floor Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-950 p-2 md:p-4 rounded-2xl border border-slate-800/80">
        
        <div className="w-full flex justify-between items-center px-4 py-2 border-b border-rose-950/40 opacity-90 text-[11px] font-mono tracking-wider text-slate-300">
          <span className="flex items-center gap-1"><Shield size={12} className="text-blue-400" /> SCHOOL AREA MAP</span>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
              <button
                onClick={() => setIs3DMode(false)}
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider transition-all ${!is3DMode ? "bg-cyan-950/50 text-cyan-400 border border-cyan-800/40" : "text-slate-500 hover:text-slate-300"}`}
              >
                2D BLUEPRINT
              </button>
              <button
                onClick={() => setIs3DMode(true)}
                className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider transition-all ${is3DMode ? "bg-rose-950/50 text-rose-400 border border-rose-800/40" : "text-slate-500 hover:text-slate-300"}`}
              >
                3D REALISM
              </button>
            </div>
            
            <span className="text-emerald-400 flex items-center gap-1 uppercase">● FLOOR LEVEL {currentFloor} / 5</span>
          </div>
        </div>

        <div id="game-canvas-wrapper" className="my-2 max-w-full overflow-hidden flex items-center justify-center bg-slate-950 rounded-xl relative shadow-inner">
          <canvas
            ref={canvasRef}
            width={4500}
            height={1000}
            id="game-board-canvas"
            className={`${is3DMode ? "hidden" : "block"} w-full max-h-[80vh] aspect-[9/2] object-contain cursor-crosshair relative bg-slate-950`}
          />
          <canvas
            ref={canvas3DRef}
            width={1600}
            height={1000}
            id="game-board-canvas-3d"
            className={`${is3DMode ? "block" : "hidden"} w-full max-h-[80vh] aspect-[16/10] object-contain cursor-crosshair relative bg-slate-950`}
          />
        </div>

        <div className="w-full text-center py-1 text-[10px] text-slate-500 max-w-md uppercase">
          WASD / Arrow Keys or Click & Drag Mouse to move • Spacebar to deploy ability mechanics.
        </div>
      </div>

      {/* RIGHT: Tactical Control Dashboard Panel */}
      <div className="w-full xl:w-96 flex flex-col justify-between p-4 md:p-6 bg-slate-950/80 rounded-2xl border border-slate-800/60 max-h-[90vh] overflow-y-auto">
        <div>
          {/* Header Character Identity */}
          <div className="border-b border-slate-800/70 pb-4 mb-5 text-left">
            <div className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
              STATUS REPORT • LEVEL {currentFloor}
            </div>
            
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white uppercase flex items-center gap-1.5">
              {characterClass === CharacterClass.MARCUS && "Marcus (Tank)"}
              {characterClass === CharacterClass.FAIBE && "Faibe (Controller)"}
              {characterClass === CharacterClass.RUNNER && "Student (Runner)"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {characterClass === CharacterClass.MARCUS && "Heavier mass build. Capable of ramming threats."}
              {characterClass === CharacterClass.FAIBE && "Tranquil master. Can freeze Tobbys across floors."}
              {characterClass === CharacterClass.RUNNER && "High agility student. Swift evasion specializes speed."}
            </p>
          </div>

          {/* VITAL LIFESPAN METERS */}
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between items-baseline mb-1 text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Flame size={14} className="text-red-500" /> HP CORE STAMINA:
                </span>
                <span className="font-extrabold text-slate-100 text-sm">
                  {playerHp} <span className="text-slate-500">/ {playerMaxHp}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-150"
                  style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                />
              </div>
            </div>

            {/* Survivor Lives Tracker */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5 text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Heart size={14} className="text-rose-500" /> SURVIVOR LIVES:
                </span>
                <span className="font-extrabold text-slate-100 text-sm">
                  {playerLives} <span className="text-slate-500">/ 3</span>
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((heartIndex) => (
                  <Heart
                    key={heartIndex}
                    size={20}
                    className={`transition-all duration-300 ${
                      heartIndex <= playerLives
                        ? "text-rose-500 fill-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)] animate-pulse"
                        : "text-slate-800 fill-slate-900"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Burst Sprint Energy Meter */}
            <div>
              <div className="flex justify-between items-baseline mb-1 text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400 fill-amber-400/20" /> BURST SPRINT SENSE:
                </span>
                <span className="font-extrabold text-amber-400 text-sm">
                  {playerBurstEnergy}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-100"
                  style={{ width: `${playerBurstEnergy}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase">Hold [Left Shift] to trigger Burst Mode (80% Speed Spikes)</p>
            </div>

            {/* Bleeding Indicator */}
            {isDoTActive && (
              <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/60 text-xs text-red-300 flex items-center gap-2 animate-pulse">
                <AlertTriangle size={14} className="text-red-400" />
                <span>SCRATCH DAMAGE: -1 HP/sec</span>
              </div>
            )}
          </div>

          {/* UTILITY ITEM STOCKPILES */}
          <div className="mb-6 space-y-2 text-left">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">UTILITY INVENTORY</span>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Slot 1: Catnip Decoy */}
              <button
                onClick={() => triggerItemUse(1)}
                disabled={catnipCharges === 0}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  catnipCharges > 0 
                    ? "bg-purple-950/20 border-purple-900/40 text-purple-300 hover:bg-purple-900/30 hover:border-purple-600 cursor-pointer" 
                    : "bg-slate-950 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                }`}
                title="Deploy Catnip Decoy (Key 1)"
              >
                <span className="text-[9px] font-bold text-purple-400 bg-purple-900/40 px-1 py-0.5 rounded leading-none mb-1">Slot 1</span>
                <Sparkles size={16} className={catnipCharges > 0 ? "animate-pulse" : ""} />
                <span className="text-[10px] font-bold leading-none mt-1">Catnip</span>
                <span className="text-xs font-extrabold mt-0.5">{catnipCharges} left</span>
              </button>

              {/* Slot 2: Hyper Energy Can */}
              <button
                onClick={() => triggerItemUse(2)}
                disabled={energyCanCharges === 0}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  energyCanCharges > 0 
                    ? "bg-amber-950/20 border-amber-900/40 text-amber-300 hover:bg-amber-900/30 hover:border-amber-600 cursor-pointer" 
                    : "bg-slate-950 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                }`}
                title="Consume Hyper Energy Can (Key 2)"
              >
                <span className="text-[9px] font-bold text-amber-400 bg-amber-900/40 px-1 py-0.5 rounded leading-none mb-1">Slot 2</span>
                <Zap size={16} className={energyCanCharges > 0 ? "animate-bounce" : ""} />
                <span className="text-[10px] font-bold leading-none mt-1">Energy Can</span>
                <span className="text-xs font-extrabold mt-0.5">{energyCanCharges} left</span>
              </button>

              {/* Slot 3: EMP Pulsar Core */}
              <button
                onClick={() => triggerItemUse(3)}
                disabled={empCharges === 0}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  empCharges > 0 
                    ? "bg-cyan-950/20 border-cyan-900/40 text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-600 cursor-pointer" 
                    : "bg-slate-950 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                }`}
                title="Discharge EMP Pulsar (Key 3)"
              >
                <span className="text-[9px] font-bold text-cyan-400 bg-cyan-900/40 px-1 py-0.5 rounded leading-none mb-1">Slot 3</span>
                <Eye size={16} className={empCharges > 0 ? "animate-pulse" : ""} />
                <span className="text-[10px] font-bold leading-none mt-1">EMP Core</span>
                <span className="text-xs font-extrabold mt-0.5">{empCharges} left</span>
              </button>
            </div>

            {/* Active Utility Effects Indicators */}
            {(hyperChargeTimeState > 0 || empActiveTime > 0) && (
              <div className="mt-3.5 space-y-1.5">
                {hyperChargeTimeState > 0 && (
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Zap size={12} className="text-amber-400" />
                      <span>HYPER SPEED ACTIVE</span>
                    </div>
                    <span className="font-extrabold">{hyperChargeTimeState.toFixed(1)}s</span>
                  </div>
                )}
                {empActiveTime > 0 && (
                  <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-900/50 text-[11px] text-cyan-300 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Eye size={12} className="text-cyan-400" />
                      <span>threats EMP STUNNED</span>
                    </div>
                    <span className="font-extrabold">{empActiveTime.toFixed(1)}s</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SATELLITE RADAR READOUT (REMAINING ENEMIES) */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 mb-6 font-mono text-xs text-slate-300 space-y-2.5">
            <div className="text-slate-500 font-bold uppercase border-b border-slate-800/50 pb-1.5 flex items-center justify-between">
              <span>SATELLITE INTEL COUNT</span>
              <span className="text-red-500 animate-pulse font-extrabold text-[10px]">● RADAR SCAN LIVE</span>
            </div>
            
            <div className="flex justify-between items-center py-0.5">
              <span>Patrolling Tobby Clones:</span>
              <span className="text-red-400 font-bold text-sm">{tobbyCount} <span className="text-slate-500">/ 30</span></span>
            </div>

            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-red-600" style={{ width: `${(tobbyCount / 30) * 100}%` }} />
            </div>

            <p className="text-[10px] text-slate-500 leading-normal pt-1 border-t border-slate-800/40 italic">
              *Tobby spawns are concentrated inside restrooms and classroom units. Move silently to escape detection bounds.
            </p>
          </div>

          {/* ACTIVE SKILLS HUD */}
          <div className="mb-6 space-y-2">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">TACTICAL ABILITY CORE</span>
            
            <div className={`p-4 rounded-xl border flex gap-3.5 items-center relative ${
              abilityCd > 0 ? "bg-slate-900/20 border-slate-900" : "bg-rose-950/20 border-rose-900/40 shadow-lg shadow-rose-950/5"
            }`}>
              
              <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-950">
                {abilityCd > 0 ? (
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    {Math.ceil(abilityCd)}s
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold text-xs flex flex-col items-center gap-0.5 leading-none">
                    <Sparkles size={14} />
                    <span>RDY</span>
                  </span>
                )}
                
                <div
                  className="absolute bottom-0 left-0 right-0 bg-rose-500/10 pointer-events-none transition-all"
                  style={{ height: `${getAbilityPercentage()}%` }}
                />
              </div>

              <div className="flex-1 text-left">
                <div className="font-bold text-xs text-slate-200">
                  {characterClass === CharacterClass.MARCUS && "Ram Charge (Momentum Slam)"}
                  {characterClass === CharacterClass.FAIBE && "Pacify Charm (Peace Pulse)"}
                  {characterClass === CharacterClass.RUNNER && "Athletic Sprint Boost"}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 leading-normal">
                  {characterClass === CharacterClass.MARCUS && "Obliterates Tobby on impact. Reset cooldown on collisions."}
                  {characterClass === CharacterClass.FAIBE && "Tranquil peace freezes all floor threats for 15s."}
                  {characterClass === CharacterClass.RUNNER && "Constantly runs 1.5x speed. Perfect for swift escapes."}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex gap-3.5 items-center relative transition-all ${
              meleeCd > 0 ? "bg-slate-900/20 border-slate-900" : "bg-cyan-950/20 border-cyan-900/40 shadow-lg shadow-cyan-950/5"
            }`}>
              
              <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-950">
                {meleeCd > 0 ? (
                  <span className="text-[11px] font-bold text-cyan-400 font-mono">
                    {Math.ceil(meleeCd * 10) / 10}s
                  </span>
                ) : (
                  <span className="text-cyan-400 font-bold text-xs flex flex-col items-center gap-0.5 leading-none animate-pulse">
                    <Zap size={14} />
                    <span>RDY</span>
                  </span>
                )}
                
                <span
                  className="absolute bottom-0 left-0 right-0 bg-cyan-500/10 pointer-events-none transition-all"
                  style={{ height: `${100 - (meleeCd / 1.0) * 100}%` }}
                />
              </div>

              <div className="flex-1 text-left">
                <div className="font-bold text-xs text-slate-200 flex items-center justify-between">
                  <span>Melee Punch Strike</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-cyan-900/60 text-cyan-300 border border-cyan-600/40 rounded uppercase font-bold tracking-wider">E / F / Click</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  Punches Tobby backward dealing <span className="font-bold text-cyan-300">2 damage</span> on contact. Cooldown 1.0 seconds.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* HUD Bottom Controls */}
        <div className="space-y-4 pt-4 border-t border-slate-800/50">
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              id="game-mute-btn"
              className="px-2.5 py-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 text-xs"
              title={muted ? "Unmute creep audio hum" : "Mute audio synthesizer feedback"}
            >
              {muted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-emerald-400" />}
              <span>{muted ? "Muted" : "Sound"}</span>
            </button>

            <button
              onClick={() => setIsGuideOpen(true)}
              id="game-guide-btn"
              className="px-2.5 py-2.5 rounded-lg border border-red-900 bg-red-950/45 text-red-400 hover:text-white hover:bg-red-900 transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              title="Open Survival Handbook Guide"
            >
              <BookOpen size={14} />
              <span>GUIDE</span>
            </button>

            <button
              onClick={onQuit}
              id="game-quit-btn"
              className="flex-1 py-2.5 rounded-lg border border-slate-800/80 bg-slate-900 hover:bg-slate-900/60 text-slate-300 hover:text-slate-100 transition flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Home size={14} />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>

      <SurvivalGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}