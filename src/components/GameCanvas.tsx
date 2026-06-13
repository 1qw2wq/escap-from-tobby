/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { CharacterClass, PlayerState, TobbyState, AIState, PuddleState, SoundWaveState, MedicineItemState } from "../types";
import { ROOMS, ALL_OBSTACLES, MAP_SVG, TOBBY_SVG, RUNNER_SVG, MARCUS_SVG, FAIBE_SVG } from "../data";
import { isLocationWalkable, getRoomAt, checkLineOfSight, playScreamSound, playRamSound, playPacifySound, playDamageSound, playSoundWaveAttack, playFootstepSound, playActiveAbilityRunner, playMedicinePickupSound } from "../utils";
import { Shield, Sparkles, AlertTriangle, ArrowRight, Home, RefreshCw, Volume2, VolumeX, Eye, Flame, Heart, Zap } from "lucide-react";

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

  // Sound context levels
  const [muted, setMuted] = useState(false);
  const [screenDamageFlash, setScreenDamageFlash] = useState(false);

  // Reactive UI state pulled from requestAnimationFrame tick
  const [playerHp, setPlayerHp] = useState(1);
  const [playerMaxHp, setPlayerMaxHp] = useState(1);
  const [playerLives, setPlayerLives] = useState(3);
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
  });

  const tobbysRef = useRef<TobbyState[]>([]);
  const puddlesRef = useRef<PuddleState[]>([]);
  const soundWavesRef = useRef<SoundWaveState[]>([]);
  const medicinesRef = useRef<MedicineItemState[]>([]);
  const freshGameRef = useRef<boolean>(true);
  const previousFloorRef = useRef<number>(-1);
  const staircaseCooldownRef = useRef<number>(0);
  const floorDataRef = useRef<{
    [floorNum: number]: {
      tobbys: TobbyState[];
      medicines: MedicineItemState[];
      puddles: PuddleState[];
    };
  }>({});
  const footstepTimerRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const invincibilityTimeRef = useRef<number>(0);
  const spawnCoordsRef = useRef<{ x: number; y: number }>({ x: 625, y: 95 });

  // Load vector layout textures inside cache
  const imagesCachedRef = useRef<{
    map: HTMLImageElement;
    tobby: HTMLImageElement;
    runner: HTMLImageElement;
    marcus: HTMLImageElement;
    faibe: HTMLImageElement;
  } | null>(null);

  const initializeLevel = () => {
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
      // Choose 6 distinct random rooms amongst classrooms (C1-C5), Office1, Office2, Toilets, Hallway
      const potentialRooms = ["C1", "C2", "C3", "C4", "C5", "Office1", "Office2", "Toilets", "Hallway"];
      const shuffledRooms = [...potentialRooms].sort(() => Math.random() - 0.5);
      const selectedRooms = shuffledRooms.slice(0, 6);

      const tobbys: TobbyState[] = [];
      let tobbyId = 1;

      for (const roomId of selectedRooms) {
        const room = ROOMS.find((r) => r.id === roomId);
        if (!room) continue;

        let tx = room.minX + room.maxX / 2;
        let ty = room.minY + room.maxY / 2;
        let attempts = 0;
        while (attempts < 100) {
          tx = room.minX + 25 + Math.random() * (room.maxX - room.minX - 50);
          ty = room.minY + 25 + Math.random() * (room.maxY - room.minY - 50);

          if (isLocationWalkable(tx, ty, 10)) {
            // Keep clear of the player starting zone (Dynamic/Randomized coordinates)
            const distToSpawn = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
            if (distToSpawn > 120) {
              break;
            }
          }
          attempts++;
        }

        tobbys.push({
          id: tobbyId++,
          x: tx,
          y: ty,
          angle: Math.random() * Math.PI * 2,
          aiState: AIState.IDLE, // Default still state
          patrolTargetX: tx,
          patrolTargetY: ty,
          speed: 30 + Math.random() * 10,
          stareTimer: 0,
          hp: 6, // 6 health points (needs 3 hits from player contact of 2 damage to die)
          maxHp: 6,
          playerHitCooldown: 0,
          flashTime: 0,
          hitCooldown: 0,
          scratchCooldown: 0,
          waterSpillCooldown: 0,
          stareCooldown: 0,
          scarySoundCooldown: 0,
          wiggleOffset: Math.random() * Math.PI * 2,
        });
      }

      // Add 4 more Tobby enemies walking around randomly in the hallway/corridor
      for (let i = 0; i < 4; i++) {
        let tx = 380 + 15 + Math.random() * (510 - 380 - 30);
        let ty = 80 + Math.random() * (850 - 80);
        let attempts = 0;
        while (attempts < 100) {
          tx = 380 + 15 + Math.random() * (510 - 380 - 30);
          ty = 80 + Math.random() * (850 - 80);
          if (isLocationWalkable(tx, ty, 10)) {
            const distToSpawn = Math.sqrt((tx - p.x) ** 2 + (ty - p.y) ** 2);
            if (distToSpawn > 120) {
              break;
            }
          }
          attempts++;
        }

        tobbys.push({
          id: tobbyId++,
          x: tx,
          y: ty,
          angle: Math.random() * Math.PI * 2,
          aiState: AIState.IDLE,
          patrolTargetX: tx,
          patrolTargetY: ty,
          speed: 33 + Math.random() * 8, // slight swifter speed in hallway
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
          isHallwaySpecial: true,
        });
      }

      tobbysRef.current = tobbys;
      setTobbyCount(tobbys.length);

      // Spawn medicine items in classrooms and other rooms!
      const medicines: MedicineItemState[] = [];
      let medId = 1;

      // Medicine-rich rooms
      const medicineRooms = ["C1", "C2", "C3", "C4", "C5", "Office1", "Office2", "Toilets"];
      medicineRooms.forEach((roomId) => {
        const r = ROOMS.find((room) => room.id === roomId);
        if (r) {
          // Spawn 1 medicine in each room
          let attempts = 0;
          let spawned = false;
          while (attempts < 150 && !spawned) {
            const mx = r.minX + 30 + Math.random() * (r.maxX - r.minX - 60);
            const my = r.minY + 30 + Math.random() * (r.maxY - r.minY - 60);
            if (isLocationWalkable(mx, my, 12)) {
              const distToSpawn = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
              if (distToSpawn > 40) {
                medicines.push({
                  id: medId++,
                  x: mx,
                  y: my,
                  roomId: roomId,
                  healAmount: 8, // heals 8 HP
                  pickedUp: false,
                });
                spawned = true;
              }
            }
            attempts++;
          }
        }
      });

      medicinesRef.current = medicines;
    }

    // Initial React State bindings
    setPlayerHp(p.hp);
    setPlayerMaxHp(p.maxHp);

    previousFloorRef.current = currentFloor;
  };

  // 1. Level Initialization on Mount or Floor Change
  useEffect(() => {
    initializeLevel();
  }, [currentFloor, characterClass]);

  // 2. Pre-cache visual SVG Assets
  useEffect(() => {
    const cache = {
      map: new Image(),
      tobby: new Image(),
      runner: new Image(),
      marcus: new Image(),
      faibe: new Image(),
    };

    const getSvgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    cache.map.src = getSvgDataUrl(MAP_SVG);
    cache.tobby.src = getSvgDataUrl(TOBBY_SVG);
    cache.runner.src = getSvgDataUrl(RUNNER_SVG);
    cache.marcus.src = getSvgDataUrl(MARCUS_SVG);
    cache.faibe.src = getSvgDataUrl(FAIBE_SVG);

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

  // 4. Trigger Melee Hit Active Skill (Punch/Strike)
  const triggerMeleeStrike = () => {
    const p = playerRef.current;
    if (p.hp <= 0) return;
    if (meleeCdRef.current > 0) return;

    meleeCdRef.current = 0.35; // 0.35s rapid cooldown
    setMeleeCd(0.35);

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
      drawGraphics();

      animationFrameIdRef.current = requestAnimationFrame(tick);
    };

    animationFrameIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [muted]);

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

    // --- C. KEY INPUT MOVEMENT PLOT ---
    let dx = 0;
    let dy = 0;

    const keys = keysPressedRef.current;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    // Determine current speed modifier
    let baseSpeed = characterClass === CharacterClass.RUNNER ? 75 : 50;
    if (p.isRamming) {
      baseSpeed = 75; // Marcus builds speed to 1.5x (75 px/s)
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

    // --- MEDICINE PICKUP DETECTION ---
    for (const med of medicinesRef.current) {
      if (!med.pickedUp) {
        const distToMed = Math.sqrt((p.x - med.x) ** 2 + (p.y - med.y) ** 2);
        if (distToMed <= 24) {
          if (p.hp < p.maxHp) {
            med.pickedUp = true;
            p.hp = Math.min(p.maxHp, p.hp + med.healAmount);
            setPlayerHp(p.hp);

            // Emit visual healing ripples
            soundWavesRef.current.push({
              x: med.x,
              y: med.y,
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
      const radius = 14; // Player body physical collision bounding circle (refined)

      if (isLocationWalkable(nextX, nextY, radius)) {
        p.x = nextX;
        p.y = nextY;
      } else {
        // Attempt slide on horizontal axis alone
        if (isLocationWalkable(nextX, p.y, radius)) {
          p.x = nextX;
        }
        // Attempt slide on vertical axis alone
        else if (isLocationWalkable(p.x, nextY, radius)) {
          p.y = nextY;
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
      if (!p.scratchDotTimer || p.scratchDotTimer > 2) p.scratchDotTimer = 0;
      p.scratchDotTimer += dt;
      if (p.scratchDotTimer >= 1.5) {
        p.scratchDotTimer = 0;
        damagePlayer(1, true);
      }
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

      if (isFloorPacified) {
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;
        return;
      }

      const dist = Math.sqrt((p.x - t.x) ** 2 + (p.y - t.y) ** 2);

      // Spotlight search trigger within range and having clear LOS
      const hasLos = dist < 250 && checkLineOfSight(t.x, t.y, p.x, p.y);

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

        // Melee hit
        if (dist <= 20) {
          if (t.hitCooldown <= 0) {
            damagePlayer(2);
            t.hitCooldown = 5.0;
          }
        }

        // Scratch dot
        if (dist <= 21) {
          if (t.scratchCooldown <= 0) {
            p.scratchDotDuration = 3.0;
            p.scratchDotTimer = 0;
            t.scratchCooldown = 3.0;
            if (!muted) playDamageSound();
          }
        }

        // Water spill cone attack
        if (dist <= 35 && t.waterSpillCooldown <= 0) {
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
            if (!muted) playDamageSound(true);
          }
        }

        // Stare cone beam attack
        if (dist <= 60 && t.stareCooldown <= 0) {
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
        // No Line of Sight! Move towards patrol target (patrol/wander randomly)
        t.stareTimer = 0;
        t.aiState = AIState.IDLE;

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
          } else {
            // If they hit a collision block, clear the target to force choosing a new one
            t.patrolTargetX = 0;
            t.patrolTargetY = 0;
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

     // 2.5. Draw Medicine Items (First Aid Kits)
    medicinesRef.current.forEach((med) => {
      if (med.pickedUp) return;

      // Draw pulsating green healing aura under the kit
      const auraPulse = 8 + Math.sin(Date.now() / 150) * 2.5;

      ctx.beginPath();
      ctx.arc(med.x, med.y, auraPulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.strokeStyle = "rgba(34, 197, 94, 0.45)";
      ctx.lineWidth = 1.0;
      ctx.fill();
      ctx.stroke();

      // Draw briefcase white body
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;

      const kw = 12;
      const kh = 9;
      const kx = med.x - kw / 2;
      const ky = med.y - kh / 2;

      ctx.beginPath();
      ctx.rect(kx, ky, kw, kh);
      ctx.fill();
      ctx.stroke();

      // Briefcase handle at top
      ctx.beginPath();
      ctx.rect(med.x - 2, ky - 2.2, 4, 2.2);
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Red/Green cross symbol
      ctx.fillStyle = "#22c55e"; // Emerald healing green
      // Horizontal bar
      ctx.fillRect(med.x - 3.5, med.y - 1.0, 7.0, 2.0);
      // Vertical bar
      ctx.fillRect(med.x - 1.0, med.y - 3.5, 2.0, 7.0);
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
      ctx.drawImage(cache.tobby, -14, -28, 28, 56);
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

    // Draw player asset frame (Scaled up from 24x24 to 38x38)
    const playerImg = characterClass === CharacterClass.RUNNER ? cache.runner : characterClass === CharacterClass.MARCUS ? cache.marcus : cache.faibe;
    const playerAngle = p.angle + Math.PI / 2;

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
          <span className="text-emerald-400 flex items-center gap-1 uppercase">● FLOOR LEVEL {currentFloor} / 5</span>
        </div>

        {/* Viewport scaling wrapper to cleanly resize on mobile or small desktops without breaking canvas dimensions */}
        <div id="game-canvas-wrapper" className="my-2 max-w-full overflow-hidden flex items-center justify-center bg-slate-950 rounded-xl relative shadow-inner">
          <canvas
            ref={canvasRef}
            width={900}
            height={1000}
            id="game-board-canvas"
            className="block max-w-full max-h-[80vh] aspect-[9/10] object-contain cursor-crosshair relative bg-slate-950"
          />
        </div>

        <div className="w-full text-center py-1 text-[10px] text-slate-500 max-w-md uppercase">
          WASD or Arrow Keys for movement • Use Spacebar to deploy ability mechanics.
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
                  style={{ height: `${100 - (meleeCd / 0.35) * 100}%` }}
                />
              </div>

              {/* Skill label and descriptions */}
              <div className="flex-1 text-left">
                <div className="font-bold text-xs text-slate-200 flex items-center justify-between">
                  <span>Melee Punch Strike</span>
                  <span className="px-1.5 py-0.5 text-[9px] bg-cyan-900/60 text-cyan-300 border border-cyan-600/40 rounded uppercase font-bold tracking-wider">Key E / F / Click</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                  Punches Tobby backward dealing <span className="font-bold text-cyan-300">2 damage</span> on contact. Cooldown 0.35s.
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
              className="px-3 py-2.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 text-xs"
              title={muted ? "Unmute creep audio hum" : "Mute audio synthesizer feedback"}
            >
              {muted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} className="text-emerald-400" />}
              <span>{muted ? "Muted" : "Sound"}</span>
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
    </div>
  );
}
