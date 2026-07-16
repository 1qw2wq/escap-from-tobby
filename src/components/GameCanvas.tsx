/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { CharacterClass, PlayerState, TobbyState, AIState, PuddleState, SoundWaveState, MedicineItemState, GameItemState, ItemType, DecoyCatnipState } from "../types";
import { ROOMS, ALL_OBSTACLES, MAP_SVG, TOBBY_SVG, RUNNER_SVG, MARCUS_SVG, FAIBE_SVG, RUNNER_WALK1_SVG, RUNNER_WALK2_SVG, MARCUS_WALK1_SVG, MARCUS_WALK2_SVG, FAIBE_WALK1_SVG, FAIBE_WALK2_SVG, TOBBY_WALK1_SVG, TOBBY_WALK2_SVG } from "../data";
import { isLocationWalkable, getRoomAt, checkLineOfSight, playScreamSound, playRamSound, playPacifySound, playDamageSound, playSoundWaveAttack, playFootstepSound, playActiveAbilityRunner, playMedicinePickupSound, setCurrentActiveFloor, getObstaclesForFloor, generateFloor1Maze } from "../utils";
import { Shield, Sparkles, AlertTriangle, ArrowRight, Home, RefreshCw, Volume2, VolumeX, Eye, Flame, Heart, Zap, BookOpen } from "lucide-react";
import { SurvivalGuide } from "./SurvivalGuide";

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
  const obstaclesGroupRef = useRef<THREE.Group | null>(null);
  const tobbysGroupRef = useRef<THREE.Group | null>(null);
  const itemsGroupRef = useRef<THREE.Group | null>(null);
  const puddlesGroupRef = useRef<THREE.Group | null>(null);
  const decoysGroupRef = useRef<THREE.Group | null>(null);
  const soundwavesGroupRef = useRef<THREE.Group | null>(null);

  // Sound context levels
  const [muted, setMuted] = useState(false);
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
  const playerRef = useRef<PlayerState>({
    classType: characterClass,
    x: 625, // Start inside Staircase A
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
  } | null>(null);

  const initializeLevel = () => {
    // Set the global active floor layout in utils
    if (currentFloor === 1) {
      generateFloor1Maze();
    }
    setCurrentActiveFloor(currentFloor);

    // Save outgoing floor's state before switching!
    if (previousFloorRef.current !== -1 && previousFloorRef.current !== currentFloor) {
      floorDataRef.current[previousFloorRef.current] = {
        tobbys: [...tobbysRef.current],
        medicines: [...medicinesRef.current],
        puddles: [...puddlesRef.current],
      };
    }

    // Determine player specs
    const p = playerRef.current;
    
    let px = 625; // Default Staircase A (Top-Right)
    let py = 95;

    // Player spawns inside classrooms on floor 5 at start of game;
    // otherwise based on transition direction.
    if (previousFloorRef.current === -1) {
      if (currentFloor === 5) {
        let attempts = 0;
        let found = false;
        const validRooms = ROOMS.filter(r => ["C1", "C2", "C3", "C4", "C5"].includes(r.id));
        while (attempts < 200 && !found) {
          const room = validRooms[Math.floor(Math.random() * validRooms.length)];
          const rx = room.minX + 25 + Math.random() * (room.maxX - room.minX - 50);
          const ry = room.minY + 25 + Math.random() * (room.maxY - room.minY - 50);
          if (isLocationWalkable(rx, ry, 14)) {
            px = rx;
            py = ry;
            found = true;
          }
          attempts++;
        }
      }
    } else if (currentFloor > previousFloorRef.current) {
      // Transitioned UP! Spawn at Staircase B (Y ~ 650)
      px = 625;
      py = 650;
    } else {
      // Transitioned DOWN! Spawn at Staircase A (Y ~ 95)
      px = 625;
      py = 95;
    }

    p.x = px;
    p.y = py;
    spawnCoordsRef.current = { x: px, y: py };
    const defaultMaxHp = characterClass === CharacterClass.MARCUS ? 30 : characterClass === CharacterClass.RUNNER ? 20 : 15;
    p.maxHp = defaultMaxHp;
    
    // The player's blood points (hp) should not refresh when they go down a level!
    // Initialize to full only on a brand new game, or if current health is 0 or unassigned.
    if (freshGameRef.current || !p.hp || p.hp <= 0) {
      p.hp = defaultMaxHp;
    } else {
      // Keep existing blood points across level transitions
      p.hp = Math.min(p.hp, p.maxHp);
    }
    p.speed = characterClass === CharacterClass.RUNNER ? 75 : 50;
    p.angle = Math.PI / 2; // Facing South
    p.abilityCooldown = 0;
    p.abilityActiveTime = 0;
    p.isRamming = false;
    p.isPacifying = false;
    p.burstEnergy = p.burstEnergy || 100; // persist through floors but start at 100 on first load
    p.isBurstActive = false;
    setPlayerBurstEnergy(p.burstEnergy || 100);
    p.scratchDotDuration = 0;
    invincibilityTimeRef.current = 0;

    // Reset staircase cooldown to prevent immediate staircase loop triggering
    staircaseCooldownRef.current = 4.0;

    // Persist or initialize lives across floors
    if (freshGameRef.current) {
      p.lives = 3;
      p.maxLives = 3;
      setPlayerLives(3);
      freshGameRef.current = false;
      floorDataRef.current = {};
      previousFloorRef.current = -1;
    } else {
      setPlayerLives(p.lives);
    }

    // Reset board effects and restore / generate states
    puddlesRef.current = [];
    soundWavesRef.current = [];

    let hasPersistedData = false;
    if (floorDataRef.current[currentFloor]) {
      hasPersistedData = true;
      const preserved = floorDataRef.current[currentFloor];
      tobbysRef.current = preserved.tobbys;
      setTobbyCount(preserved.tobbys.length);
      medicinesRef.current = preserved.medicines;
      puddlesRef.current = preserved.puddles;
    }

    if (!hasPersistedData) {
      const spawnRooms = ["C1", "C2", "C3", "C4", "C5", "Office1", "Office2", "Toilets", "Hallway"];
      
      // Determine a balanced, localized survival threat level: 5 to 7 Tobbys per floor.
      const totalTobbys = 5 + Math.floor(Math.random() * 3); // random selection of 5, 6 or 7 Tobbys
      const assignedRooms: string[] = [];
      for (let i = 0; i < totalTobbys; i++) {
        // Select random room evenly from potential spawn quadrants
        assignedRooms.push(spawnRooms[Math.floor(Math.random() * spawnRooms.length)]);
      }

      const tobbys: TobbyState[] = [];
      let tobbyId = 1;

      for (let i = 0; i < totalTobbys; i++) {
        const roomId = assignedRooms[i];
        const room = ROOMS.find((r) => r.id === roomId);
        if (!room) continue;

        let tx = room.minX + room.maxX / 2;
        let ty = room.minY + room.maxY / 2;
        let attempts = 0;
        while (attempts < 150) {
          tx = room.minX + 25 + Math.random() * (room.maxX - room.minX - 50);
          ty = room.minY + 25 + Math.random() * (room.maxY - room.minY - 50);

          if (isLocationWalkable(tx, ty, 10)) {
            // Keep clear of the player starting zone
            const distToSpawn = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
            if (distToSpawn > 120) {
              break;
            }
          }
          attempts++;
        }

        const isHallway = roomId === "Hallway";
        const isStationary = !isHallway && (i % 3 === 0); // ~33% of indoor Tobbys remain stationary
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

      tobbysRef.current = tobbys;
      setTobbyCount(tobbys.length);

      // Spawn items (Medicine kits, Catnip decoys, Hyper cans, EMP core items) in rooms
      const items: GameItemState[] = [];
      let itemId = 1;

      const spawnPool = [
        { type: ItemType.MEDICINE, rooms: ["C1", "C2", "C3", "C4", "C5", "Office1", "Office2", "Toilets"] },
        { type: ItemType.CATNIP, rooms: ["C1", "C2", "C3", "C4", "C5", "Office2"] },
        { type: ItemType.ENERGY_CAN, rooms: ["Office1", "Office2", "Toilets", "C3", "C5"] },
        { type: ItemType.EMP, rooms: ["Office1", "Office2", "Toilets", "C2", "C4"] },
      ];

      spawnPool.forEach((itemDef) => {
        itemDef.rooms.forEach((roomId) => {
          // Spawn one of this item in the room with some probability!
          const spawnChance = itemDef.type === ItemType.MEDICINE ? 0.75 : 0.45;
          if (Math.random() < spawnChance) {
            const r = ROOMS.find((room) => room.id === roomId);
            if (r) {
              let attempts = 0;
              let spawned = false;
              while (attempts < 100 && !spawned) {
                const mx = r.minX + 30 + Math.random() * (r.maxX - r.minX - 60);
                const my = r.minY + 30 + Math.random() * (r.maxY - r.minY - 60);
                if (isLocationWalkable(mx, my, 12)) {
                  const distToSpawn = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
                  if (distToSpawn > 50) {
                    items.push({
                      id: itemId++,
                      type: itemDef.type,
                      x: mx,
                      y: my,
                      roomId: roomId,
                      pickedUp: false,
                    });
                    spawned = true;
                  }
                }
                attempts++;
              }
            }
          }
        });
      });

      medicinesRef.current = items;
    }

    // Set default item stocks on brand new game
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

    // Initial React State bindings
    setPlayerHp(p.hp);
    setPlayerMaxHp(p.maxHp);
    setCatnipCharges(p.catnipCharges);
    setEnergyCanCharges(p.energyCanCharges);
    setEmpCharges(p.empCharges);
    setHyperChargeTime(p.hyperChargeTime);
    setEmpActiveTime(empActiveTimeRef.current);

    previousFloorRef.current = currentFloor;

    // Synchronize Three.js scene structures
    setTimeout(() => {
      if (threeSceneRef.current) {
        rebuildObstacles3D();
        buildRealWalls3D();
        addCeilingLights3D();
        if (playerMeshRef.current && threeSceneRef.current) {
          threeSceneRef.current.remove(playerMeshRef.current);
          const playerGroup = createPlayer3DMesh();
          threeSceneRef.current.add(playerGroup);
          playerMeshRef.current = playerGroup;

          const flashlight = new THREE.SpotLight(0xfff6e0, 16.0, 320, Math.PI / 4, 0.4, 0.5);
          flashlight.position.set(0, 15, 0);
          flashlight.castShadow = true;
          playerGroup.add(flashlight);
          playerLightRef.current = flashlight;

          const lightTarget = new THREE.Object3D();
          playerGroup.add(lightTarget);
          flashlight.target = lightTarget;
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

    // Generate 12 keyframes of animation
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

    const cache = {
      map: mapImg,
      tobby: tobbyImg,
      runner: runnerImg,
      marcus: marcusImg,
      faibe: faibeImg,
      tobby_walk: t_walk,
      runner_walk: r_walk,
      marcus_walk: m_walk,
      faibe_walk: f_walk,
    };

    imagesCachedRef.current = cache;
  }, []);

  // 3. Handle Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current[key] = true;
      keysPressedRef.current[e.key] = true; // handle specific case for Space or Arrow Keys

      // Direct Spacebar action to trigger ability
      if (e.key === " ") {
        e.preventDefault();
        triggerSpecialAbility();
      }

      // Numerical utility item usage
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

      // Punch/Hit key binding
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
  }, []);

  // 3b. Mouse and Touch pointer control listeners
  useEffect(() => {
    const canvas = is3DMode ? canvas3DRef.current : canvasRef.current;
    if (!canvas) return;

    const getCanvasCoords = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (is3DMode && threeCameraRef.current) {
        // Normalized device coordinates
        const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

        // Use Raycaster to project mouse coordinates on the ground plane (y = 0)
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), threeCameraRef.current);

        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, targetPoint);

        return { x: targetPoint.x, y: targetPoint.z };
      } else {
        // Translate HTML display coordinates directly into our 900x1000 resolution
        const x = ((clientX - rect.left) / rect.width) * 900;
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

    meleeCdRef.current = 1.0; // 1.0 second cooldown for hitting for all characters
    setMeleeCd(1.0);

    // Set visual state to render a neon slash arc
    setMeleeStrikeActive(true);
    setTimeout(() => {
      setMeleeStrikeActive(false);
    }, 120);

    let hitAny = false;
    tobbysRef.current.forEach((t) => {
      const dist = Math.sqrt((t.x - p.x) ** 2 + (t.y - p.y) ** 2);
      if (dist <= 55) { // short-range active hit radius
        const angleToTobby = Math.atan2(t.y - p.y, t.x - p.x);
        const angleDiff = Math.abs(normalizeAngle(p.angle - angleToTobby));
        
        if (angleDiff <= (85 * Math.PI) / 180) { // Facing hemisphere
          // Deal active damage (2 pts)
          t.hp -= 2;
          t.flashTime = 0.22; // flash red
          t.playerHitCooldown = 0.2; // brief damage immune state
          
          // Knocks back the Tobby student clone slightly!
          const knockback = 28;
          const nextTx = t.x + Math.cos(angleToTobby) * knockback;
          const nextTy = t.y + Math.sin(angleToTobby) * knockback;
          
          if (isLocationWalkable(nextTx, nextTy, 10)) {
            t.x = nextTx;
            t.y = nextTy;
          }

          hitAny = true;

          // Sound wave/strike visual impact dots
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
      if (!muted) playDamageSound(false);
    } else {
      // Create a cute short swish audio tone
      if (!muted) {
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
        timeLeft: 6.0, // active for 6 seconds
        pulseTimer: 0,
      });

      // Emit starting visual sonic wave
      soundWavesRef.current.push({
        x: p.x,
        y: p.y,
        radius: 12,
        maxRadius: 180,
        timeLeft: 0.5,
      });

      if (!muted) {
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

      p.hyperChargeTime = 6.0; // 6s Golden Hyper splayed rush
      p.burstEnergy = 100;
      setPlayerBurstEnergy(100);

      if (!muted) {
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

      empActiveTimeRef.current = 5.0; // Freeze enemies for 5s
      setEmpActiveTime(5.0);

      // Huge radiating signal pulse
      soundWavesRef.current.push({
        x: p.x,
        y: p.y,
        radius: 10,
        maxRadius: 1000,
        timeLeft: 0.8,
      });

      if (!muted) {
         try {
           const c = new (window.AudioContext || (window as any).webkitAudioContext)();
           // Heavy electronic static blast
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

  // Central trigger router for keyboard and click-to-use hud hooks
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
    if (p.abilityCooldown > 0) return; // on cooldown!

    if (characterClass === CharacterClass.MARCUS) {
      // RAM CHARGE: builds momentum instantly
      p.isRamming = true;
      p.abilityActiveTime = 4.0; // Charge active for up to 4s
      p.abilityCooldown = 0.1; // small grace cooldown to block spam, set to 30 on impact
      if (!muted) playRamSound();
    } else if (characterClass === CharacterClass.FAIBE) {
      // PACIFY CHARM: freeze all Tobbys for 15 seconds
      p.isPacifying = true;
      p.abilityActiveTime = 15.0;
      p.abilityCooldown = 45.0; // 45 seconds cooldown

      // Reset all Tobbys' stare/chasing focus immediately
      tobbysRef.current.forEach((t) => {
        t.stareTimer = 0;
        t.aiState = AIState.PATROLLING;
      });

      if (!muted) playPacifySound();
    }
  };

  // 5. Game Engine Tick loop
  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const progress = timestamp - lastTimeRef.current;
      // limit max delta time to prevent physics clipping (e.g. on window blur)
      const dt = Math.min(progress / 1000, 0.1); 
      lastTimeRef.current = timestamp;

      updatePhysics(dt);
      if (is3DMode) {
        renderThree();
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

  // Core physics logic
  const updatePhysics = (dt: number) => {
    const p = playerRef.current;
    if (p.hp <= 0) return; // Player dead

    // --- A. DECREMENT ABILITY TIMERS ---
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

    // Ticking stockpiled utility item triggers
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

    // Decrement active Melee Strike (punch) cooldown
    if (meleeCdRef.current > 0) {
      meleeCdRef.current -= dt;
      if (meleeCdRef.current < 0) meleeCdRef.current = 0;
      setMeleeCd(meleeCdRef.current);
    }

    // --- B. DAMAGE OVER TIME (DoT) SCRATCH ---
    if (p.scratchDotDuration > 0) {
      p.scratchDotDuration -= dt;
      p.scratchDotTimer += dt;
      if (p.scratchDotTimer >= 1.0) {
        p.scratchDotTimer = 0;
        damagePlayer(1); // DoT deals 1 HP / sec
      }
      if (p.scratchDotDuration <= 0) {
        p.scratchDotDuration = 0;
      }
    }

    // --- C. KEY & MOUSE INPUT MOVEMENT PLOT ---
    let dx = 0;
    let dy = 0;

    const keys = keysPressedRef.current;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    // Use mouse/touch coordinates if no keys are currently held down
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

    // --- BURST MODE CALCULATION ---
    const isShiftHeld = !!keys["shift"];
    const playerIsMoving = dx !== 0 || dy !== 0;
    p.isMoving = playerIsMoving;

    if (isShiftHeld && playerIsMoving && (p.burstEnergy ?? 100) > 0) {
      p.isBurstActive = true;
      p.burstEnergy = Math.max(0, (p.burstEnergy ?? 100) - dt * 25); // drains in 4 seconds
    } else {
      p.isBurstActive = false;
      p.burstEnergy = Math.min(100, (p.burstEnergy ?? 100) + dt * 10); // recharges in 10 seconds
    }
    setPlayerBurstEnergy(Math.round(p.burstEnergy));

    // Determine current speed modifier
    let baseSpeed = characterClass === CharacterClass.RUNNER ? 75 : 50;
    if (p.isRamming) {
      baseSpeed = 75; // Marcus builds speed to 1.5x (75 px/s)
    }
    if (p.isBurstActive) {
      baseSpeed *= 1.8; // Active Burst increases velocity speed by 80% (1.8x)
    }

    // Check water puddle debuff (50% speed slow)
    let inPuddle = false;
    for (const puddle of puddlesRef.current) {
      const distToPuddle = Math.sqrt((p.x - puddle.x) ** 2 + (p.y - puddle.y) ** 2);
      if (distToPuddle <= puddle.radius) {
        inPuddle = true;
        break;
      }
    }
    const currentSpeed = inPuddle ? baseSpeed * 0.5 : baseSpeed;

    // --- UTILITY ITEM PICKUP DETECTION ---
    for (const item of medicinesRef.current) {
      if (!item.pickedUp) {
        const distToItem = Math.sqrt((p.x - item.x) ** 2 + (p.y - item.y) ** 2);
        if (distToItem <= 24) {
          let canPickUp = true;

          if (item.type === ItemType.MEDICINE) {
            if (p.hp >= p.maxHp) {
              canPickUp = false; // Don't pick up medicine if HP is already full!
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

            // Emit visual healing ripples
            soundWavesRef.current.push({
              x: item.x,
              y: item.y,
              radius: 6,
              maxRadius: 40,
              timeLeft: 0.35,
            });

            // Play healing arpeggio chime tone
            if (!muted) {
              playMedicinePickupSound();
            }
          }
        }
      }
    }

    if (dx !== 0 || dy !== 0) {
      // Tick footstep walks sound effects
      footstepTimerRef.current -= dt;
      if (footstepTimerRef.current <= 0) {
        const isSprinting = characterClass === CharacterClass.RUNNER || p.isRamming;
        footstepTimerRef.current = isSprinting ? 0.28 : 0.42;
        if (!muted) {
          playFootstepSound(isSprinting);
        }
      }

      // Normalize to prevent diagonal speed boosting
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveX = (dx / dist) * currentSpeed * dt;
      const moveY = (dy / dist) * currentSpeed * dt;

      // Update angle smoothly
      p.angle = Math.atan2(dy, dx);

      // Perform slide collision checking against walls and static obstacles
      const nextX = p.x + moveX;
      const nextY = p.y + moveY;
      const radius = 11.5; // Highly responsive player collision radius to prevent dead-zones

      let canMove = isLocationWalkable(nextX, nextY, radius);
      if (canMove) {
        p.x = nextX;
        p.y = nextY;
      } else {
        // Smooth slide check
        const canMoveX = isLocationWalkable(nextX, p.y, radius);
        const canMoveY = isLocationWalkable(p.x, nextY, radius);

        if (canMoveX && !canMoveY) {
          p.x = nextX;
        } else if (canMoveY && !canMoveX) {
          p.y = nextY;
        } else if (canMoveX && canMoveY) {
          // If both axes are open individually, choose the one matching the major direction of movement
          if (Math.abs(moveX) >= Math.abs(moveY)) {
            p.x = nextX;
          } else {
            p.y = nextY;
          }
        } else {
          // Dynamic Corner Nudge: slide seamlessly around table edges & doorframes
          const nudgeAmt = 5;
          if (Math.abs(moveX) > Math.abs(moveY)) {
            // Moving mostly horizontally: nudge vertically to find gap
            if (isLocationWalkable(nextX, p.y - nudgeAmt, radius)) {
              p.x = nextX;
              p.y -= nudgeAmt * 0.4;
            } else if (isLocationWalkable(nextX, p.y + nudgeAmt, radius)) {
              p.x = nextX;
              p.y += nudgeAmt * 0.4;
            }
          } else {
            // Moving mostly vertically: nudge horizontally to find gap
            if (isLocationWalkable(p.x - nudgeAmt, nextY, radius)) {
              p.x -= nudgeAmt * 0.4;
              p.y = nextY;
            } else if (isLocationWalkable(p.x + nudgeAmt, nextY, radius)) {
              p.x += nudgeAmt * 0.4;
              p.y = nextY;
            }
          }
        }
      }
    }

    // --- D. UPDATE BOARD EFFECTS ---
    // Decrement player invincibility
    if (invincibilityTimeRef.current > 0) {
      invincibilityTimeRef.current -= dt;
      if (invincibilityTimeRef.current < 0) invincibilityTimeRef.current = 0;
    }

    // Puddles cooldown countdown
    puddlesRef.current = puddlesRef.current
      .map((pud) => ({ ...pud, timeLeft: pud.timeLeft - dt }))
      .filter((pud) => pud.timeLeft > 0);

    // Grow in-game sound blast wave circles
    soundWavesRef.current = soundWavesRef.current
      .map((w) => ({
        ...w,
        radius: w.radius + 200 * dt, // Ripple expansion speed
        timeLeft: w.timeLeft - dt,
      }))
      .filter((w) => w.timeLeft > 0);

    // Puddle continuous damage logic (1 HP damage per second standing inside)
    if (inPuddle) {
      puddleDamageTimerRef.current += dt;
      if (puddleDamageTimerRef.current >= 1.0) {
        puddleDamageTimerRef.current = 0;
        damagePlayer(1, true); // continuous custom environmental tick
      }
    } else {
      puddleDamageTimerRef.current = 0;
    }

    // Record player walk cycle phase if they are actively moving
    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      // Speed up ankle swing proportional to velocity
      const animFreq = p.isBurstActive ? 16.5 : 9.5;
      playerWalkTimeRef.current += dt * animFreq;
    } else {
      playerWalkTimeRef.current = 0; // return to idle/reset
    }

    // --- E. UPDATE TOBBY CLONES AI STATE MACHINE ---
    const isFloorPacified = p.isPacifying;
    tobbysRef.current.forEach((t) => {
      // Decrement Tobby cooldowns
      if (t.hitCooldown > 0) t.hitCooldown -= dt;
      if (t.scratchCooldown > 0) t.scratchCooldown -= dt;
      if (t.waterSpillCooldown > 0) t.waterSpillCooldown -= dt;
      if (t.stareCooldown > 0) t.stareCooldown -= dt;
      if (t.scarySoundCooldown > 0) t.scarySoundCooldown -= dt;
      if (t.playerHitCooldown > 0) t.playerHitCooldown -= dt;
      if (t.flashTime > 0) t.flashTime -= dt;

      // Fast creep wiggling timer
      t.wiggleOffset += dt * 10;
      t.isMoving = false;
      t.isChasing = false;

      if (isFloorPacified) {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;
        return;
      }

      // Check if Tobby is frozen by electric EMP discharge
      const isEMPFrozen = empActiveTimeRef.current > 0;
      if (isEMPFrozen) {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;
        return; // Arrests all actions and movement
      }

      // Olfactory distraction from active Catnip Decoy pouches on the ground
      let nearbyDecoy: DecoyCatnipState | null = null;
      let minDecoyDist = 260; // 260px smelling range
      for (const dec of decoysRef.current) {
        const decoyDist = Math.sqrt((dec.x - t.x) ** 2 + (dec.y - t.y) ** 2);
        if (decoyDist < minDecoyDist && checkLineOfSight(t.x, t.y, dec.x, dec.y)) {
          minDecoyDist = decoyDist;
          nearbyDecoy = dec;
        }
      }

      if (nearbyDecoy) {
        t.aiState = AIState.IDLE; // calmed down
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
        return; // Skips chasing player
      }

      const dist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);

      // Spotlight search trigger within range and having clear LOS
      // Sprinters and rammers make high noise, increasing Tobby's detection sensing field to 350px. Normal speed is 220px.
      const detectionRange = (p.isBurstActive || p.isRamming) ? 350 : 220;
      const hasLos = dist < detectionRange && checkLineOfSight(t.x, t.y, p.x, p.y);

      if (hasLos) {
        if (t.aiState !== AIState.CHASING) {
          t.aiState = AIState.CHASING;
          if (!muted) playScreamSound();
        }

        // Move towards player
        const chaseDx = p.x - t.x;
        const chaseDy = p.y - t.y;
        t.angle = Math.atan2(chaseDy, chaseDx);

        const chaseSpeed = 42; 
        t.x += Math.cos(t.angle) * chaseSpeed * dt;
        t.y += Math.sin(t.angle) * chaseSpeed * dt;
        t.isMoving = true;
        t.isChasing = true;

        // Melee hit
        if (dist <= 20) {
          if (t.hitCooldown <= 0) {
            damagePlayer(2);
            t.hitCooldown = 5.0;
          }
        }

        // Scratch dot
        if (dist <= 20) {
          if (t.scratchCooldown <= 0) {
            p.scratchDotDuration = 3.0;
            p.scratchDotTimer = 0;
            t.scratchCooldown = 3.0;
            if (!muted) playDamageSound();
          }
        }

        // Water spill cone attack
        if (dist <= 30 && t.waterSpillCooldown <= 0) {
          const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
          const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
          const fovHalf = (40 * Math.PI) / 180; // 80 deg front cone

          if (angleDiff <= fovHalf) {
            damagePlayer(5);
            t.waterSpillCooldown = 20.0;

            puddlesRef.current.push({
              x: p.x,
              y: p.y,
              radius: 18,
              timeLeft: 10.0,
            });
            if (!muted) playDamageSound(true);
          }
        }

        // Stare cone beam attack
        if (dist <= 50 && t.stareCooldown <= 0) {
          const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
          const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
          const stareFovHalf = (15 * Math.PI) / 180; // 30 deg cone

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

        // AOE Scary sound blast
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
          if (!muted) playSoundWaveAttack();
        }
      } else {
        // No Line of Sight! Move towards patrol target (patrol/wander randomly) or stand still if stationary sentry
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;

        if (t.isStationary) {
          // Stationary Sentries stand completely still scanning. They rotate left and right with a wider sweep arc
          t.angle += Math.sin(t.wiggleOffset * 0.15) * 0.025;
        } else {
          // If we don't have a patrol target or have reached it, pick a new one!
          const distToPatrol = Math.sqrt((t.patrolTargetX - t.x) ** 2 + (t.patrolTargetY - t.y) ** 2);
          if (distToPatrol < 15 || !t.patrolTargetX || !t.patrolTargetY) {
            let foundTarget = false;
            let attempts = 0;
            while (attempts < 50 && !foundTarget) {
              let tx = 0;
              let ty = 0;
              if (t.isHallwaySpecial) {
                // Pick a coordinate inside the Corridor Hallway
                // Hallway limits: minX: 380, maxX: 510, minY: 40, maxY: 895
                tx = 380 + 15 + Math.random() * (510 - 380 - 30);
                ty = 40 + 20 + Math.random() * (895 - 40 - 40);
              } else {
                // Pick a coordinate in a random room
                const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
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

          // Steer towards the patrol target
          if (t.patrolTargetX && t.patrolTargetY) {
            const dx = t.patrolTargetX - t.x;
            const dy = t.patrolTargetY - t.y;
            const targetAngle = Math.atan2(dy, dx);
            
            t.angle = targetAngle;

            // Walk speed during patrol is slower than chasing speed
            const patrolSpeed = t.speed ? t.speed * 0.75 : 24;
            const stepX = Math.cos(t.angle) * patrolSpeed * dt;
            const stepY = Math.sin(t.angle) * patrolSpeed * dt;

            if (isLocationWalkable(t.x + stepX, t.y + stepY, 10)) {
              t.x += stepX;
              t.y += stepY;
              t.isMoving = true;
            } else {
              // If they hit a collision block, clear the target to force choosing a new one
              t.patrolTargetX = 0;
              t.patrolTargetY = 0;
            }
          }
        }
      }
    });

    // --- F. PLAYER HIT TOBBY ON CONTACT MECHANICS ---
    tobbysRef.current.forEach((t) => {
      const contactDist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
      if (contactDist <= 22) {
        if (!t.playerHitCooldown || t.playerHitCooldown <= 0) {
          t.hp -= 2;
          t.playerHitCooldown = 0.8; // 0.8s contact hit rate limiter
          t.flashTime = 0.25; // Flash Red-White feedback

          soundWavesRef.current.push({
            x: t.x,
            y: t.y,
            radius: 5,
            maxRadius: 40,
            timeLeft: 0.2,
          });

          if (!muted) playDamageSound(false);
        }
      }
    });

    // Filter out destroyed Tobbies
    const aliveTobbys = tobbysRef.current.filter((t) => {
      if (t.hp <= 0) {
        soundWavesRef.current.push({
          x: t.x,
          y: t.y,
          radius: 12,
          maxRadius: 85,
          timeLeft: 0.45,
        });
        if (!muted) playScreamSound();
        return false;
      }
      return true;
    });

    if (aliveTobbys.length !== tobbysRef.current.length) {
      tobbysRef.current = aliveTobbys;
      setTobbyCount(aliveTobbys.length);
    }

    // --- G. SPECIAL ACTIVE EFFECT: MARCUS RAM KILL CHECK ---
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

          if (!muted) playDamageSound(false);
          return false; // Destroyed!
        }
        return true;
      });

      if (remainingTobbys.length !== tobbysRef.current.length) {
        tobbysRef.current = remainingTobbys;
        setTobbyCount(remainingTobbys.length);
      }
    }

    // --- H. STAIR TRANSITION TRIGGER (WITH COOLDOWN SANITY) ---
    if (staircaseCooldownRef.current <= 0) {
      // Staircase B (descent hatch): escape point bounds X: 540-710, Y: 600-695
      if (p.x >= 540 && p.x <= 710 && p.y >= 600 && p.y <= 695) {
        onFloorComplete();
      }

      // Staircase A (ascent hatch): return to upper floor, bounds X: 540-710, Y: 40-130 (for Floors 1 to 4)
      if (currentFloor < 5 && p.x >= 540 && p.x <= 710 && p.y >= 40 && p.y <= 130) {
        onFloorAscend();
      }
    }

    // --- I. PUSH CORE DATA OUT TO REACT ---
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

    // Reset floor persistence systems on failure restart
    floorDataRef.current = {};
    previousFloorRef.current = -1;

    if (p.lives > 0) {
      // Return to floor 5 inside a classroom
      if (currentFloor !== 5) {
        onResetFloor5(); // Triggers the currentFloor state change (which then runs useEffect initializeLevel)
      } else {
        initializeLevel(); // Triggers direct re-init on floor 5
      }

      // Reset Tobby aggro on respawn
      tobbysRef.current.forEach((t) => {
        t.aiState = AIState.IDLE;
        t.stareTimer = 0;
      });

      // 3.0s entry invincibility frames
      invincibilityTimeRef.current = 3.0;

      soundWavesRef.current.push({
        x: playerRef.current.x,
        y: playerRef.current.y,
        radius: 10,
        maxRadius: 180,
        timeLeft: 0.8,
      });

      if (!muted) playPacifySound();
    } else {
      onGameOver();
    }
  };

  const damagePlayer = (amount: number, isPuddle: boolean = false) => {
    const p = playerRef.current;
    if (p.hp <= 0) return;
    if (invincibilityTimeRef.current > 0) return; // Invulnerable frame

    p.hp -= amount;
    // Set short mini-invincibility to prevent instant melting from multiple attacks
    invincibilityTimeRef.current = 1.0;

    setScreenDamageFlash(true);
    setTimeout(() => setScreenDamageFlash(false), 120);

    if (!muted) playDamageSound(isPuddle);

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

    let torsoColor = 0x3b82f6; // Blue for student runner
    let headColor = 0xfcd8c4;
    let pantsColor = 0x1e293b;
    let shoeColor = 0x0f172a;
    let hairColor = 0x06b6d4; // Cyan hair for runner
    let isHeavy = false;
    let isMagical = false;

    if (characterClass === CharacterClass.MARCUS) {
      torsoColor = 0x15803d; // Green vest
      hairColor = 0x374151; // Grey-black hair
      pantsColor = 0x334155;
      shoeColor = 0x1e293b;
      isHeavy = true;
    } else if (characterClass === CharacterClass.FAIBE) {
      torsoColor = 0xbe123c; // Crimson blouse
      hairColor = 0xeab308; // Golden locks
      pantsColor = 0x475569;
      shoeColor = 0x3f3f46;
      isMagical = true;
    }

    // --- Propulsion Ring ---
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

    // --- Hips ---
    const hipsGeo = new THREE.BoxGeometry(11, 4, 7);
    const hipsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
    const hipsMesh = new THREE.Mesh(hipsGeo, hipsMat);
    hipsMesh.position.y = 10;
    group.add(hipsMesh);

    // --- Torso ---
    const torsoHeight = isHeavy ? 13 : 11;
    const torsoGeo = isHeavy 
      ? new THREE.BoxGeometry(15, torsoHeight, 10) 
      : new THREE.CylinderGeometry(5.5, 6.5, torsoHeight, 12);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: torsoColor,
      roughness: 0.3,
      metalness: 0.4,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 10 + 2 + torsoHeight / 2; // centered
    group.add(torsoMesh);

    // --- Head ---
    const headGeo = new THREE.SphereGeometry(5.5, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: headColor,
      roughness: 0.4,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    const headY = 10 + 2 + torsoHeight + 5; // e.g., 28.5
    headMesh.position.y = headY;
    group.add(headMesh);

    // --- Visor / Eyes ---
    const eyeGeo = new THREE.BoxGeometry(7, 1.8, 1.8);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: isMagical ? 0xd8b4fe : (isHeavy ? 0xa7f3d0 : 0x93c5fd),
    });
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    eyeMesh.position.set(0, headY + 0.5, 4.8);
    group.add(eyeMesh);

    // --- Hair ---
    // spiky stylish low-poly hair using overlapping box/cones
    const hairGroup = new THREE.Group();
    hairGroup.position.set(0, headY + 2.5, -1);
    
    const hairMainGeo = new THREE.SphereGeometry(5.8, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.6);
    const hairMainMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    const hairMain = new THREE.Mesh(hairMainGeo, hairMainMat);
    hairGroup.add(hairMain);

    // Spikes/bangs
    const spikeGeo = new THREE.ConeGeometry(1.5, 4, 4);
    const spikeMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.8 });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(-3 + i * 1.5, 1, 3);
      spike.rotation.x = Math.PI / 4;
      spike.rotation.z = (i - 2) * 0.15;
      hairGroup.add(spike);
    }
    group.add(hairGroup);

    // --- Legs ---
    // We create pivot groups for legs so they rotate around (0,0,0) local
    const legLength = 10;
    const legRadius = isHeavy ? 2.2 : 1.6;
    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius * 0.8, legLength, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });

    const leftLegGroup = new THREE.Group();
    leftLegGroup.name = "leftLeg";
    leftLegGroup.position.set(-3.5, 10, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, legMat);
    leftLegMesh.position.y = -legLength / 2; // offset so top of cylinder is at pivot origin (0,0,0)
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegGroup.add(leftLegMesh);

    // Shoe
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

    // --- Arms ---
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

    // --- Class Special Accessories ---
    if (isHeavy) {
      const padGeo = new THREE.BoxGeometry(6, 4, 8);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x166534, metalness: 0.7 });
      const leftPad = new THREE.Mesh(padGeo, padMat);
      leftPad.position.set(0, 0.5, 0); // attached to shoulder pivot or torso
      leftArmGroup.add(leftPad);

      const rightPad = leftPad.clone();
      rightArmGroup.add(rightPad);
    } else if (isMagical) {
      const haloGeo = new THREE.TorusGeometry(8, 0.9, 8, 24);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = headY + 5;
      group.add(halo);
    }

    return group;
  };

  const createTobby3DMesh = (): THREE.Group => {
    const group = new THREE.Group();

    const coatColor = 0x2e1065; // deep purple corporate cyber-coat
    const skinColor = 0xe5bfa1;
    const pantsColor = 0x1e1b4b; // dark pants
    const shoeColor = 0x09090b; // shiny black leather shoes
    const hairColor = 0x1c1917;

    // --- Hips ---
    const hipsGeo = new THREE.BoxGeometry(11, 4.5, 7.5);
    const hipsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const hipsMesh = new THREE.Mesh(hipsGeo, hipsMat);
    hipsMesh.position.y = 11;
    group.add(hipsMesh);

    // --- Torso (Tobby's Tall Cyber-Coat) ---
    const torsoHeight = 14;
    const torsoGeo = new THREE.CylinderGeometry(6.5, 8.5, torsoHeight, 16);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: coatColor,
      roughness: 0.15,
      metalness: 0.6,
    });
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.y = 11 + 2.2 + torsoHeight / 2; // y = 20.2
    group.add(torsoMesh);

    // --- Tobby's Signature Red Necktie ---
    const tieGeo = new THREE.ConeGeometry(1.8, 10, 4);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const tieMesh = new THREE.Mesh(tieGeo, tieMat);
    tieMesh.position.set(0, 23.5, 6.8);
    tieMesh.rotation.x = -Math.PI / 12;
    group.add(tieMesh);

    // --- Head ---
    const headGeo = new THREE.SphereGeometry(6, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.4,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    const headY = 11 + 2.2 + torsoHeight + 5; // y = 32.2
    headMesh.position.y = headY;
    group.add(headMesh);

    // --- Spectacles with Red Glowing Threat Lenses ---
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
    glassesGroup.position.set(0, headY + 0.4, 5.2);
    group.add(glassesGroup);

    // --- Hair (Combed corporate look) ---
    const hairGeo = new THREE.SphereGeometry(6.4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 1.8);
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, headY + 1.2, -0.5);
    hairMesh.rotation.x = -Math.PI / 15;
    group.add(hairMesh);

    // Extra lock of hair on front
    const hairSpikeGeo = new THREE.ConeGeometry(1.2, 3, 4);
    const hairSpike = new THREE.Mesh(hairSpikeGeo, hairMat);
    hairSpike.position.set(2, headY + 4, 4);
    hairSpike.rotation.x = Math.PI / 3;
    hairSpike.rotation.z = -Math.PI / 6;
    group.add(hairSpike);

    // --- Legs ---
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

    // Shiny black business shoe
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

    // --- Arms ---
    const armLength = 12;
    const armGeo = new THREE.CylinderGeometry(1.6, 1.3, armLength, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.15, metalness: 0.5 });
    const handGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const handMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.5 });

    const shoulderY = 11 + 2.2 + torsoHeight - 1.8; // y = 25.4

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
    threeRendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x0a1128, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 0.45);
    dirLight.position.set(450, 500, 500);
    scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(900, 1000);
    const cache = imagesCachedRef.current;
    if (cache && cache.map) {
      const texCanvas = document.createElement("canvas");
      texCanvas.width = 1800;
      texCanvas.height = 2000;
      const tCtx = texCanvas.getContext("2d");
      if (tCtx) {
        tCtx.fillStyle = "#020617";
        tCtx.fillRect(0, 0, 1800, 2000);
        tCtx.drawImage(cache.map, 0, 0, 1800, 2000);
      }
      const floorTex = new THREE.CanvasTexture(texCanvas);
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.16, // Glossy polished floor reflecting ambient light
        metalness: 0.45,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(450, 0, 500);
      scene.add(floorMesh);
    }

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

    const flashlight = new THREE.SpotLight(0xfff6e0, 16.0, 320, Math.PI / 4, 0.4, 0.5);
    flashlight.position.set(0, 15, 0);
    flashlight.castShadow = true;
    playerGroup.add(flashlight);
    playerLightRef.current = flashlight;

    const lightTarget = new THREE.Object3D();
    playerGroup.add(lightTarget);
    flashlight.target = lightTarget;
  };

  const buildRealWalls3D = () => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    // Create or clear walls group
    let wallsGroup = scene.getObjectByName("wallsGroup") as THREE.Group | null;
    if (wallsGroup) {
      scene.remove(wallsGroup);
    }
    wallsGroup = new THREE.Group();
    wallsGroup.name = "wallsGroup";
    scene.add(wallsGroup);

    const wallHeight = 42; 
    const wallThickness = 12;

    // Premium high-gloss reflective slate wall material
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c1322,  // Rich deep slate navy
      roughness: 0.08,  // Highly reflective glossy finish
      metalness: 0.85,  // Metallic reflection accents
    });

    // Bright cyan fluorescent neon strip trim running along the top of walls
    const trimMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9, // Electric cyan glowing trim
    });

    const addWallSegment = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
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

      // Neon glowing horizontal visual trim line
      const trimGeo = new THREE.BoxGeometry(length, 1.8, wallThickness + 0.6);
      const trimMesh = new THREE.Mesh(trimGeo, trimMaterial);
      trimMesh.position.set(0, wallHeight / 2 + 0.9, 0);
      wallMesh.add(trimMesh);
    };

    // 1. Map outer perimeter borders
    addWallSegment(40, 40, 40, 895);   // Left outer wall
    addWallSegment(720, 40, 720, 895); // Right outer wall
    addWallSegment(40, 40, 720, 40);   // Top outer wall
    addWallSegment(40, 895, 720, 895); // Bottom outer wall

    // 2. Classrooms vertical divider walls at x = 360 (skipping doors)
    addWallSegment(360, 40, 360, 135);
    addWallSegment(360, 175, 360, 310);
    addWallSegment(360, 350, 360, 485);
    addWallSegment(360, 525, 360, 660);
    addWallSegment(360, 700, 360, 835);
    addWallSegment(360, 875, 360, 895);

    // 3. Right Offices vertical divider walls at x = 530 (skipping doors)
    addWallSegment(530, 40, 530, 95);
    addWallSegment(530, 135, 530, 235);
    addWallSegment(530, 275, 530, 335);
    addWallSegment(530, 375, 530, 605);
    addWallSegment(530, 645, 530, 825);
    addWallSegment(530, 865, 530, 895);

    // 4. Classroom horizontal division walls at y = 205, 380, 555, 730
    // C1 to C2 (Floor 1 has door at x: [100-140])
    if (currentFloor === 1) {
      addWallSegment(40, 205, 100, 205);
      addWallSegment(140, 205, 360, 205);
    } else {
      addWallSegment(40, 205, 360, 205);
    }

    // C2 to C3 (Floor 1 has door at x: [220-260])
    if (currentFloor === 1) {
      addWallSegment(40, 380, 220, 380);
      addWallSegment(260, 380, 360, 380);
    } else {
      addWallSegment(40, 380, 360, 380);
    }

    // C3 to C4 (Floor 1 has door at x: [100-140])
    if (currentFloor === 1) {
      addWallSegment(40, 555, 100, 555);
      addWallSegment(140, 555, 360, 555);
    } else {
      addWallSegment(40, 555, 360, 555);
    }

    // C4 to C5 (Floor 1 has door at x: [220-260])
    if (currentFloor === 1) {
      addWallSegment(40, 730, 220, 730);
      addWallSegment(260, 730, 360, 730);
    } else {
      addWallSegment(40, 730, 360, 730);
    }

    // 5. Right Offices horizontal division walls
    // StairA to Office1 at y = 160
    addWallSegment(530, 160, 720, 160);

    // Office1 to Office2 at y = 300 (Floor 1 has door at x: [600-640])
    if (currentFloor === 1) {
      addWallSegment(530, 300, 600, 300);
      addWallSegment(640, 300, 720, 300);
    } else {
      addWallSegment(530, 300, 720, 300);
    }

    // Office2 to StairB at y = 580 (Floor 1 has door at x: [600-640])
    if (currentFloor === 1) {
      addWallSegment(530, 580, 600, 580);
      addWallSegment(640, 580, 720, 580);
    } else {
      addWallSegment(530, 580, 720, 580);
    }

    // StairB to Toilets at y = 710
    addWallSegment(530, 710, 720, 710);
  };

  const addCeilingLights3D = () => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    // Clear existing ceiling lights
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name && (child.name.startsWith("ceilingLight") || child.name.startsWith("ceilingLightBulb"))) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Positions for soft ceiling lights that generate specular reflections on the waxed tile floors
    const lightPositions = [
      // Corridor Hallway
      { x: 445, z: 150, color: 0xbae6fd, intensity: 3.5 },
      { x: 445, z: 500, color: 0xbae6fd, intensity: 3.5 },
      { x: 445, z: 850, color: 0xbae6fd, intensity: 3.5 },
      // Offices and toilets
      { x: 625, z: 235, color: 0xfef08a, intensity: 4.2 }, // warm office lighting
      { x: 625, z: 440, color: 0xfef08a, intensity: 4.2 },
      { x: 625, z: 810, color: 0xe0f2fe, intensity: 4.2 },
      // Classrooms (centered lights)
      { x: 200, z: 120, color: 0x93c5fd, intensity: 3.2 },
      { x: 200, z: 295, color: 0x93c5fd, intensity: 3.2 },
      { x: 200, z: 470, color: 0x93c5fd, intensity: 3.2 },
      { x: 200, z: 645, color: 0x93c5fd, intensity: 3.2 },
      { x: 200, z: 820, color: 0x93c5fd, intensity: 3.2 },
    ];

    lightPositions.forEach((pos, idx) => {
      const pLight = new THREE.PointLight(pos.color, pos.intensity, 220, 1.2);
      pLight.position.set(pos.x, 36, pos.z); 
      pLight.name = `ceilingLight_${idx}`;
      scene.add(pLight);

      // Visual physical light bulb on ceiling
      const bulbGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.6, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: pos.color });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(pos.x, 37.8, pos.z);
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

  const rebuildObstacles3D = () => {
    const obstaclesGroup = obstaclesGroupRef.current;
    if (!obstaclesGroup) return;

    while (obstaclesGroup.children.length > 0) {
      obstaclesGroup.remove(obstaclesGroup.children[0]);
    }

    const activeObs = getObstaclesForFloor(currentFloor);
    activeObs.forEach((obs) => {
      const width = obs.width;
      const height = obs.height;
      
      const boxGeo = new THREE.BoxGeometry(width, 24, height);
      
      let color = 0x1e293b; 
      let metalness = 0.3;
      let roughness = 0.5;
      let isHazard = false;

      if (
        obs.name?.includes("Barricade") ||
        obs.name?.includes("Blockade") ||
        obs.name?.includes("Debris") ||
        obs.name?.includes("Flipped") ||
        obs.name?.includes("Pile")
      ) {
        color = 0x111827; 
        metalness = 0.8;
        roughness = 0.2;
        isHazard = true;
      } else if (obs.name?.includes("Study")) {
        color = 0x0f172a; 
        metalness = 0.5;
        roughness = 0.1;
      }

      const boxMat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
      });

      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.position.set(obs.x + width / 2, 12, obs.y + height / 2);
      boxMesh.receiveShadow = true;
      boxMesh.castShadow = true;
      obstaclesGroup.add(boxMesh);

      if (isHazard) {
        const barGeo = new THREE.BoxGeometry(width - 4, 2, 2);
        const barMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const warningBar = new THREE.Mesh(barGeo, barMat);
        warningBar.position.set(0, 12.2, 0);
        boxMesh.add(warningBar);
      } else {
        const barGeo = new THREE.BoxGeometry(width - 2, 1, height - 2);
        const barMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 });
        const cyanTop = new THREE.Mesh(barGeo, barMat);
        cyanTop.position.set(0, 12.1, 0);
        boxMesh.add(cyanTop);
      }
    });
  };

  const updateThreeEntities = () => {
    const scene = threeSceneRef.current;
    if (!scene) return;

    const p = playerRef.current;
    const playerMesh = playerMeshRef.current;
    if (playerMesh) {
      playerMesh.position.set(p.x, 0, p.y);
      playerMesh.rotation.y = -p.angle;

      // Dynamic limb swing animations
      const isMoving = p.isMoving;
      const walkCycle = Date.now() / 1000;
      const speedFactor = p.isBurstActive ? 20 : 12;

      const leftLeg = playerMesh.getObjectByName("leftLeg");
      const rightLeg = playerMesh.getObjectByName("rightLeg");
      const leftArm = playerMesh.getObjectByName("leftArm");
      const rightArm = playerMesh.getObjectByName("rightArm");

      if (isMoving) {
        const swingAngle = Math.sin(walkCycle * speedFactor) * 0.45;
        if (leftLeg) leftLeg.rotation.x = swingAngle;
        if (rightLeg) rightLeg.rotation.x = -swingAngle;
        if (leftArm) leftArm.rotation.x = -swingAngle * 0.75;
        if (rightArm) rightArm.rotation.x = swingAngle * 0.75;
      } else {
        // Return smoothly to idle state with breathing effect
        const breath = Math.sin(walkCycle * 2.5) * 0.05;
        if (leftLeg) leftLeg.rotation.x += (0 - leftLeg.rotation.x) * 0.15;
        if (rightLeg) rightLeg.rotation.x += (0 - rightLeg.rotation.x) * 0.15;
        if (leftArm) leftArm.rotation.x += (breath - leftArm.rotation.x) * 0.15;
        if (rightArm) rightArm.rotation.x += (-breath - rightArm.rotation.x) * 0.15;
      }

      const isSpeeding = p.isBurstActive || (p.hyperChargeTime && p.hyperChargeTime > 0);
      const ring = playerMesh.children[0] as THREE.Mesh;
      if (ring && ring.material) {
        (ring.material as THREE.MeshBasicMaterial).color.setHex(isSpeeding ? 0xf59e0b : (characterClass === CharacterClass.RUNNER ? 0x3b82f6 : (characterClass === CharacterClass.MARCUS ? 0x15803d : 0xbe123c)));
      }

      const camera = threeCameraRef.current;
      if (camera) {
        // Dynamic look-ahead offset based on player facing angle (p.angle) to lead the view beautifully
        const lookAheadDist = 65;
        const lookX = Math.cos(p.angle) * lookAheadDist;
        const lookY = Math.sin(p.angle) * lookAheadDist;

        // Soft, responsive cinematic following positions
        const targetCamX = p.x + lookX * 0.7;
        const targetCamZ = p.y + 160 + lookY * 0.7; // Closer, more dramatic angle
        const targetCamY = 275; // Lower height to increase perspective and depth of glossy walls and reflections

        camera.position.x += (targetCamX - camera.position.x) * 0.075; // Smooth camera damping
        camera.position.z += (targetCamZ - camera.position.z) * 0.075;
        camera.position.y += (targetCamY - camera.position.y) * 0.075;

        // Focus camera on the player, slightly leading ahead in their facing direction
        camera.lookAt(p.x + lookX * 0.4, 6, p.y + lookY * 0.4);
      }

      const flashlight = playerLightRef.current;
      if (flashlight) {
        const targetObj = flashlight.target;
        targetObj.position.set(Math.cos(p.angle) * 100, -15, Math.sin(p.angle) * 100);
      }
    }

    const tobbysGroup = tobbysGroupRef.current;
    if (tobbysGroup) {
      const tobbys = tobbysRef.current;
      
      while (tobbysGroup.children.length < tobbys.length) {
        const tMesh = createTobby3DMesh();
        
        const spot = new THREE.SpotLight(0xff1111, 15.0, 240, Math.PI / 4.5, 0.4, 0.5);
        spot.position.set(0, 32, 8);
        spot.castShadow = true;
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
          tMesh.rotation.y = -t.angle;

          // Dynamic limb swing animations
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
            // Idle breathing cycle
            const tBreath = Math.sin(tobbyWalkCycle * 2) * 0.04;
            if (tLeftLeg) tLeftLeg.rotation.x += (0 - tLeftLeg.rotation.x) * 0.2;
            if (tRightLeg) tRightLeg.rotation.x += (0 - tRightLeg.rotation.x) * 0.2;
            if (tLeftArm) tLeftArm.rotation.x += (tBreath - tLeftArm.rotation.x) * 0.2;
            if (tRightArm) tRightArm.rotation.x += (-tBreath - tRightArm.rotation.x) * 0.2;
          }

          const bobSpeed = t.aiState === AIState.CHASING ? 15 : 6;
          tMesh.position.y = Math.abs(Math.sin(Date.now() / 1000 * bobSpeed)) * 1.8;

          const spot = tMesh.children[tMesh.children.length - 2] as THREE.SpotLight;
          if (spot) {
            const targetObj = tMesh.children[tMesh.children.length - 1];
            targetObj.position.set(Math.cos(t.angle) * 120, -32, Math.sin(t.angle) * 120);
            
            if (t.aiState === AIState.CHASING) {
              spot.color.setHex(0xff0000);
              spot.intensity = 25.0;
            } else {
              spot.color.setHex(0xffaa44); 
              spot.intensity = 10.0;
            }

            const isFrozen = (empActiveTimeRef.current > 0) || (characterClass === CharacterClass.FAIBE && playerRef.current.isPacifying);
            if (isFrozen) {
              spot.intensity = 0;
            }
          }
        }
      });
    }

    const itemsGroup = itemsGroupRef.current;
    if (itemsGroup) {
      while (itemsGroup.children.length > 0) {
        itemsGroup.remove(itemsGroup.children[0]);
      }

      medicinesRef.current.forEach((item) => {
        if (item.pickedUp) return;

        const itemMesh = new THREE.Group();
        itemMesh.position.set(item.x, 0, item.y);

        const floatY = 4 + Math.sin(Date.now() / 200) * 1.5;
        const rotateAngle = Date.now() / 1000;

        if (item.type === ItemType.MEDICINE) {
          const caseGeo = new THREE.BoxGeometry(11, 7, 4);
          const caseMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
          const suitcase = new THREE.Mesh(caseGeo, caseMat);
          suitcase.position.y = floatY;
          suitcase.rotation.x = Math.PI / 6;
          suitcase.rotation.y = rotateAngle;
          itemMesh.add(suitcase);

          const crossH = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
          const crossV = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5, 1.2), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
          crossH.position.set(0, floatY + 7, 0);
          crossV.position.set(0, floatY + 7, 0);
          itemMesh.add(crossH);
          itemMesh.add(crossV);
        } else if (item.type === ItemType.CATNIP) {
          const pouchGeo = new THREE.SphereGeometry(4.5, 8, 8);
          const pouchMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.8 });
          const pouch = new THREE.Mesh(pouchGeo, pouchMat);
          pouch.position.y = floatY;
          pouch.rotation.y = rotateAngle;
          itemMesh.add(pouch);
          
          const ringGeo = new THREE.RingGeometry(5, 6, 8);
          const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI/2;
          ring.position.y = floatY + 1.5;
          itemMesh.add(ring);
        } else if (item.type === ItemType.ENERGY_CAN) {
          const canGeo = new THREE.CylinderGeometry(3.2, 3.2, 8, 12);
          const canMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.8, roughness: 0.1 });
          const can = new THREE.Mesh(canGeo, canMat);
          can.position.y = floatY;
          can.rotation.y = rotateAngle;
          can.rotation.x = Math.PI / 8;
          itemMesh.add(can);
        } else if (item.type === ItemType.EMP) {
          const coreGeo = new THREE.OctahedronGeometry(5, 0);
          const coreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
          const core = new THREE.Mesh(coreGeo, coreMat);
          core.position.y = floatY;
          core.rotation.set(rotateAngle, rotateAngle, 0);
          itemMesh.add(core);

          const coreInner = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
          coreInner.position.y = floatY;
          itemMesh.add(coreInner);
        }

        itemsGroup.add(itemMesh);
      });
    }

    const puddlesGroup = puddlesGroupRef.current;
    if (puddlesGroup) {
      while (puddlesGroup.children.length > 0) {
        puddlesGroup.remove(puddlesGroup.children[0]);
      }

      puddlesRef.current.forEach((pud) => {
        const geo = new THREE.CylinderGeometry(pud.radius, pud.radius, 0.4, 16);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x0e7490,
          transparent: true,
          opacity: 0.65,
          roughness: 0.1,
          metalness: 0.8,
        });
        const puddleMesh = new THREE.Mesh(geo, mat);
        puddleMesh.position.set(pud.x, 0.2, pud.y);
        puddlesGroup.add(puddleMesh);

        const ringGeo = new THREE.RingGeometry(pud.radius - 1, pud.radius + 1, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.3;
        puddleMesh.add(ring);
      });
    }

    const decoysGroup = decoysGroupRef.current;
    if (decoysGroup) {
      while (decoysGroup.children.length > 0) {
        decoysGroup.remove(decoysGroup.children[0]);
      }

      decoysRef.current.forEach((dec) => {
        const geo = new THREE.SphereGeometry(6, 12, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.6, metalness: 0.5 });
        const decoyMesh = new THREE.Mesh(geo, mat);
        decoyMesh.position.set(dec.x, 6, dec.y);
        decoyMesh.rotation.y = Date.now() / 250;
        decoysGroup.add(decoyMesh);

        const waveRadius = ((Date.now() / 12) % 180);
        const ringGeo = new THREE.RingGeometry(waveRadius - 2, waveRadius + 2, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xd8b4fe,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: Math.max(0, 1 - waveRadius / 180),
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -5.8;
        decoyMesh.add(ring);
      });
    }

    const soundwavesGroup = soundwavesGroupRef.current;
    if (soundwavesGroup) {
      while (soundwavesGroup.children.length > 0) {
        soundwavesGroup.remove(soundwavesGroup.children[0]);
      }

      soundWavesRef.current.forEach((sw) => {
        const tRatio = 1 - (sw.timeLeft / 0.6); 
        const curRadius = sw.radius + tRatio * (sw.maxRadius - sw.radius);

        const ringGeo = new THREE.RingGeometry(curRadius - 3, curRadius + 1, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xef4444, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: Math.max(0, 1 - tRatio) * 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(sw.x, 0.8, sw.y);
        soundwavesGroup.add(ring);
      });
    }
  };

  const renderThree = () => {
    checkAndInitThree();
    updateThreeEntities();
    if (threeRendererRef.current && threeSceneRef.current && threeCameraRef.current) {
      threeRendererRef.current.render(threeSceneRef.current, threeCameraRef.current);
    }
  };

  // --- RENDERING PIPELINE ---
  const drawGraphics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cache = imagesCachedRef.current;
    if (!cache) return;

    const p = playerRef.current;
    const zoom = 2.3;

    // Calculate translation offsets to focus camera on player center coordinates
    let tx = canvas.width / 2 - p.x * zoom;
    let ty = canvas.height / 2 - p.y * zoom;

    // Clamp camera translation so we do not render beyond map bounds (900x1000)
    const minTx = canvas.width - 900 * zoom;
    const minTy = canvas.height - 1000 * zoom;
    tx = Math.max(minTx, Math.min(0, tx));
    ty = Math.max(minTy, Math.min(0, ty));

    // Clear frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate and Scale to create the zoomed camera viewport
    ctx.translate(tx, ty);
    ctx.scale(zoom, zoom);

    // 1. Draw static Blueprint background
    ctx.drawImage(cache.map, 0, 0, 900, 1000);

    // 1.5. Draw procedurally altered level obstacles for visual indicators
    if (currentFloor !== 5) {
      const activeObs = getObstaclesForFloor(currentFloor);
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
          ctx.fillStyle = "#111827"; // deep hazard slate
          ctx.strokeStyle = "#ef4444"; // red warning line
          ctx.lineWidth = 1.6;
        } else if (obs.name?.includes("Study")) {
          ctx.fillStyle = "#0f172a"; // blue table group
          ctx.strokeStyle = "#38bdf8"; // bright cyan border
        }

        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Draw cross lines for barrier obstacles
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
          // Standard study grid inner desktop detail
          ctx.strokeStyle = "rgba(71, 85, 105, 0.5)";
          ctx.strokeRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);
        }
      });
    }

    // 2. Draw Active Water Puddles
    puddlesRef.current.forEach((pud) => {
      ctx.beginPath();
      ctx.arc(pud.x, pud.y, pud.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14, 116, 144, 0.45)"; // Deep cyan
      ctx.strokeStyle = "rgba(34, 211, 238, 0.55)";
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      
      // small splash ripples inside puddle
      ctx.beginPath();
      ctx.arc(pud.x, pud.y, pud.radius * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
      ctx.stroke();
    });

     // 2.5. Draw Diversified Utility Items
    medicinesRef.current.forEach((item) => {
      if (item.pickedUp) return;

      const auraPulse = 8 + Math.sin(Date.now() / 150) * 2.5;

      if (item.type === ItemType.MEDICINE) {
        // --- 1. MEDICINE BRIEFCASE ---
        // Pulsating green aura
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

        // Cross symbol
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(item.x - 3.5, item.y - 1.0, 7.0, 2.0);
        ctx.fillRect(item.x - 1.0, item.y - 3.5, 2.0, 7.0);

      } else if (item.type === ItemType.CATNIP) {
        // --- 2. CATNIP SMELLY POUCH ---
        // Pulsating purple/magenta aroma aura
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(168, 85, 247, 0.18)";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.45)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        // Drawn herbal pouch (triangle/polygon purse) Styled with rich detail
        ctx.fillStyle = "#a855f7"; // deep lavender purple
        ctx.strokeStyle = "#d8b4fe"; // light violet border
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.moveTo(item.x, item.y - 7);
        ctx.lineTo(item.x - 6, item.y + 5);
        ctx.lineTo(item.x + 6, item.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // draw pouch tie band
        ctx.beginPath();
        ctx.arc(item.x, item.y - 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fb7185"; // pink ribbon tie
        ctx.fill();

      } else if (item.type === ItemType.ENERGY_CAN) {
        // --- 3. HARD REBUFF HYPER SODA CAN ---
        // Golden sparkling aura
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        // Retro Soda Can (Cylinder)
        ctx.fillStyle = "#f59e0b"; // yellow orange
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.rect(item.x - 4.5, item.y - 6.5, 9, 13);
        ctx.fill();
        ctx.stroke();

        // Can metal cap shiny top
        ctx.fillStyle = "#94a3b8"; // slate aluminum top
        ctx.fillRect(item.x - 3.5, item.y - 7.5, 7, 1);

        // Lightning speed bolt symbol inside can
        ctx.fillStyle = "#ef4444"; // fire red bolt
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
        // --- 4. SECURE EMP DISCHARGE CORE ---
        // Electric electric blue aura
        ctx.beginPath();
        ctx.arc(item.x, item.y, auraPulse + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.18)";
        ctx.strokeStyle = "rgba(6, 182, 212, 0.55)";
        ctx.lineWidth = 1.0;
        ctx.fill();
        ctx.stroke();

        // Futuristic electric pulsar core (circle tech node)
        ctx.fillStyle = "#0284c7"; // electric tech cyan sky-blue
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.arc(item.x, item.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4 radiating electric magnetic rods
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

    // 2.6. Draw Active Catnip Decoy Zone Vapor clouds
    decoysRef.current.forEach((dec) => {
      // Draw smooth aromatic purple vapor cloud expanding and shrinking
      const pulseRadius = 24 + Math.sin(dec.pulseTimer * 8) * 8;
      ctx.beginPath();
      ctx.arc(dec.x, dec.y, pulseRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();

      // Inner aromatic green/magenta pile
      ctx.beginPath();
      ctx.arc(dec.x, dec.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#a855f7"; // purple aromatic center
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // floating bubbles representing floating vapors
      for (let i = 0; i < 3; i++) {
        const bubbleX = dec.x + Math.sin(dec.pulseTimer * 3 + i * 2) * 12;
        const bubbleOffset = (dec.pulseTimer * 22 + i * 15) % 35;
        ctx.beginPath();
        ctx.arc(bubbleX, dec.y - bubbleOffset, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(192, 132, 252, 0.75)";
        ctx.fill();
      }
    });

    // 3. Draw sound ripples
    soundWavesRef.current.forEach((wave) => {
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(239, 68, 68, ${wave.timeLeft / 0.6})`; // Red with fade duration
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // 4. Draw Stare searchlight cone beams
    tobbysRef.current.forEach((t) => {
      const isFloorPacified = p.isPacifying;
      if (isFloorPacified) return;

      const dist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);
      if (dist <= 60 && t.stareCooldown <= 0 && t.aiState === AIState.CHASING) {
        const angleToPlayer = Math.atan2(p.y - t.y, p.x - t.x);
        const angleDiff = Math.abs(normalizeAngle(t.angle - angleToPlayer));
        const stareFovHalf = (15 * Math.PI) / 180; // 30 deg cone

        if (angleDiff <= stareFovHalf) {
          // Draw searchlight triangular polygon beam
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          
          const angleLeft = t.angle - stareFovHalf;
          const angleRight = t.angle + stareFovHalf;
          
          ctx.lineTo(t.x + Math.cos(angleLeft) * 65, t.y + Math.sin(angleLeft) * 65);
          ctx.lineTo(t.x + Math.cos(angleRight) * 65, t.y + Math.sin(angleRight) * 65);
          ctx.closePath();
          
          ctx.fillStyle = "rgba(220, 38, 38, 0.18)"; // Red focus flash cone
          ctx.fill();

          // Connect direct visual laser line
          ctx.beginPath();
          ctx.moveTo(t.x, t.y);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    });

    // 5. Draw Tobby Enemies
    tobbysRef.current.forEach((t) => {
      const isFlashActive = t.flashTime > 0;

      // Draw Tobby health bar if damaged
      if (t.hp < t.maxHp) {
        const barWidth = 24;
        const barHeight = 4;
        const barX = t.x - barWidth / 2;
        const barY = t.y - 25;

        // Red background
        ctx.fillStyle = "rgba(220, 38, 38, 0.85)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Cyan foreground
        ctx.fillStyle = "rgba(34, 211, 238, 0.95)";
        ctx.fillRect(barX, barY, barWidth * (t.hp / t.maxHp), barHeight);

        // Border outline
        ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
      }

      // Draw warning circles on Chasing Tobbies
      if (t.aiState === AIState.CHASING) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = isFlashActive ? "rgba(255, 255, 255, 0.9)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = isFlashActive ? "rgba(255, 255, 255, 0.25)" : "rgba(239, 68, 68, 0.1)";
        ctx.fill();
      }

      // Draw EMP frozen electric arcs above Tobby
      const isCurrentlyEMPFrozen = empActiveTimeRef.current > 0;
      if (isCurrentlyEMPFrozen) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6, 182, 212, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3 zigzagging electricity bolts radiating around t.y
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

      // Pacified sparkles
      if (p.isPacifying) {
        ctx.beginPath();
        ctx.arc(t.x, t.y - 15, 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Tobby body vector with walking animation feet underneath
      const angle = t.angle + Math.PI / 2; // SVG default downward coordinate
      
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(angle);

      // Tobby's walking legs animation
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

      // Draw left foot / shoe sliding local walking Y
      ctx.beginPath();
      ctx.arc(-6, 20 + tobbyFootLeft, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw right foot / shoe
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

    // 6. Draw Player State
    // Flicker opacity frames if the player is invincible
    if (invincibilityTimeRef.current > 0) {
      const showPlayer = Math.floor(Date.now() / 80) % 2 === 0;
      if (!showPlayer) {
        ctx.globalAlpha = 0.25;
      }
    }

    // Ram charge windshield bubble
    if (p.isRamming) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.65)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Scratch debuff shield ring
    if (p.scratchDotDuration > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw player feet / walking style anim underneath body
    const keys = keysPressedRef.current;
    const isMoving = !!(keys["w"] || keys["arrowup"] || keys["s"] || keys["arrowdown"] || keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"]);

    // Left and right feet oscillating offsets based on walk motion
    let footOffsetLeft = 0;
    let footOffsetRight = 0;
    if (isMoving) {
      const cycle = Date.now() / 105;
      footOffsetLeft = Math.sin(cycle) * 7.5;
      footOffsetRight = -Math.sin(cycle) * 7.5;
    }

    // Draw feet relative to player's center and heading direction
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle + Math.PI / 2);

    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.0;

    // Left foot
    ctx.beginPath();
    ctx.arc(-8, 12 + footOffsetLeft, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right foot
    ctx.beginPath();
    ctx.arc(8, 12 + footOffsetRight, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw active Melee strike crescent swing sweep arc
    if (meleeStrikeActive) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle); // orientation facing forward
      
      // glowing cyan outer slice
      ctx.beginPath();
      ctx.arc(0, 0, 36, -Math.PI / 3, Math.PI / 3);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.9)";
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // pure white inner edge
      ctx.beginPath();
      ctx.arc(0, 0, 36, -Math.PI / 4, Math.PI / 4);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      
      ctx.restore();
    }

    // Draw Burst Mode high-speed wind aura/glow of spinning cyan and amber particles under the player
    if (p.isBurstActive) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Date.now() / 80);
      
      // Outer bright glowing cyan circle
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(Date.now() / 60) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(14, 165, 233, 0.65)"; // cyan aura
      ctx.lineWidth = 3;
      ctx.stroke();

      // Golden electric flares radiating outward
      ctx.strokeStyle = "rgba(245, 158, 11, 0.85)"; // amber sparks
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

    // Draw player asset frame (Scaled up from 24x24 to 38x38) with rich dynamic walking animations
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

    // Retro motion blur ghost trails for golden burst/hypercharged speed state
    const isPlayerSpeeding = p.isBurstActive || (p.hyperChargeTime && p.hyperChargeTime > 0);
    if (isPlayerSpeeding) {
      for (let s = 1; s <= 3; s++) {
        const trailX = p.x - Math.cos(p.angle) * s * 12;
        const trailY = p.y - Math.sin(p.angle) * s * 12;

        ctx.save();
        ctx.translate(trailX, trailY);
        ctx.rotate(playerAngle);
        ctx.globalAlpha = 0.40 - s * 0.10; // Fades out with distance
        ctx.filter = "brightness(1.5) sepia(1) hue-rotate(5deg) saturate(3)"; // Make golden/yellow
        ctx.drawImage(playerImg, -19, -19, 38, 38);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(playerAngle);
    ctx.drawImage(playerImg, -19, -19, 38, 38);
    ctx.restore();

    // Draw dynamic dark area vignette flashlight/lantern spotlight center focus overlay (covers 900x1000)
    const vignetteGrad = ctx.createRadialGradient(p.x, p.y, 45, p.x, p.y, 230);
    vignetteGrad.addColorStop(0, "rgba(2, 6, 23, 0.0)");      // full light center focus core
    vignetteGrad.addColorStop(0.35, "rgba(2, 6, 23, 0.35)");  // soft focal fade-off begins
    vignetteGrad.addColorStop(0.8, "rgba(2, 6, 23, 0.94)");   // dark shadows
    vignetteGrad.addColorStop(1, "rgba(2, 6, 23, 1.0)");      // pure vignette pitch blackness on edges
    
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, 900, 1000);

    // Restore opacity alpha and zoom matrices
    ctx.globalAlpha = 1.0;
    ctx.restore();
  };

  // Cooldown percentage calculation helper
  const getAbilityPercentage = () => {
    let max = 1;
    if (characterClass === CharacterClass.MARCUS) max = 30;
    if (characterClass === CharacterClass.FAIBE) max = 45;
    return 100 - (abilityCd / max) * 100;
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 max-w-7xl mx-auto items-stretch select-none relative p-2 md:p-6 font-mono bg-slate-900/40 rounded-3xl border border-slate-800/60 shadow-2xl overflow-hidden backdrop-blur-md">
      
      {/* Damage fullscreen flash component overlay */}
      {screenDamageFlash && (
        <div className="absolute inset-0 bg-red-600/20 mix-blend-overlay border-[14px] border-red-600/80 rounded-3xl pointer-events-none z-50 animate-ping duration-100" />
      )}

      {/* LEFT: HTML5 High-performance Game Arena Floor Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-950 p-2 md:p-4 rounded-2xl border border-slate-800/80">
        
        {/* Dynamic header stats dashboard */}
        <div className="w-full flex justify-between items-center px-4 py-2 border-b border-rose-950/40 opacity-90 text-[11px] font-mono tracking-wider text-slate-300">
          <span className="flex items-center gap-1"><Shield size={12} className="text-blue-400" /> SCHOOL AREA MAP</span>
          
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
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

        {/* Viewport scaling wrapper to cleanly resize on mobile or small desktops without breaking canvas dimensions */}
        <div id="game-canvas-wrapper" className="my-2 max-w-full overflow-hidden flex items-center justify-center bg-slate-950 rounded-xl relative shadow-inner">
          <canvas
            ref={canvasRef}
            width={900}
            height={1000}
            id="game-board-canvas"
            className={`${is3DMode ? "hidden" : "block"} max-w-full max-h-[80vh] aspect-[9/10] object-contain cursor-crosshair relative bg-slate-950`}
          />
          <canvas
            ref={canvas3DRef}
            width={900}
            height={1000}
            id="game-board-canvas-3d"
            className={`${is3DMode ? "block" : "hidden"} max-w-full max-h-[80vh] aspect-[9/10] object-contain cursor-crosshair relative bg-slate-950`}
          />
        </div>

        <div className="w-full text-center py-1 text-[10px] text-slate-500 max-w-md uppercase">
          WASD / Arrow Keys or Click & Drag Mouse to move • Spacebar to deploy ability mechanics.
        </div>
      </div>

      {/* RIGHT: Tactical Control Dashboard Panel */}
      <div className="w-full xl:w-96 flex flex-col justify-between p-4 md:p-6 bg-slate-950/80 rounded-2xl border border-slate-800/60">
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
                  <Zap size={14} className="text-amber-400 fill-amber-450/20" /> BURST SPRINT SENSE:
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
              
              {/* Circular meter */}
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
                
                {/* Visual percentage shackle mask */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-rose-500/10 pointer-events-none transition-all"
                  style={{ height: `${getAbilityPercentage()}%` }}
                />
              </div>

              {/* Ability descriptors */}
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

            {/* MELEE HIT ATTACK SKILL */}
            <div className={`p-4 rounded-xl border flex gap-3.5 items-center relative transition-all ${
              meleeCd > 0 ? "bg-slate-900/20 border-slate-900" : "bg-cyan-950/20 border-cyan-900/40 shadow-lg shadow-cyan-950/5"
            }`}>
              
              {/* Circular gauge */}
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
                
                {/* Cooldown slide mask */}
                <span
                  className="absolute bottom-0 left-0 right-0 bg-cyan-500/10 pointer-events-none transition-all"
                  style={{ height: `${100 - (meleeCd / 1.0) * 100}%` }}
                />
              </div>

              {/* Skill label and descriptions */}
              <div className="flex-1 text-left">
                <div className="font-bold text-xs text-slate-200 flex items-center justify-between">
                  <span>Melee Punch Strike</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-cyan-900/60 text-cyan-300 border border-cyan-600/40 rounded uppercase font-bold tracking-wider">Key E / F / Click</span>
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
          
          {/* Sound, Restart and Leave triggers */}
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
              className="px-2.5 py-2.5 rounded-lg border border-red-900 bg-red-950/45 text-red-450 hover:text-white hover:bg-red-900 transition flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
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

      {/* Interactive Survival Guide Modal */}
      <SurvivalGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
