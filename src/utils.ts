/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ROOMS, DOORWAYS, ALL_OBSTACLES } from "./data";

/**
 * Checks if a point is walkable for a character of given radius.
 * Handles room constraints, doorways, and solid furniture obstacles.
 */
export function isLocationWalkable(x: number, y: number, r: number = 12): boolean {
  // 1. Check if we are inside any doorway (using expanded horizontal boundaries to permit smooth travel)
  for (const d of DOORWAYS) {
    const isClassroomDoor = d.minX === 360; // connects left to hallway
    const padX = isClassroomDoor ? r : r;
    
    // Expand doorway bounds slightly to overlap room walkable borders smoothly
    const minD_X = d.minX - padX;
    const maxD_X = d.maxX + padX;
    // Walkway vertical frame bounds have 2px safety padding
    const minD_Y = d.minY + 2;
    const maxD_Y = d.maxY - 2;

    if (x >= minD_X && x <= maxD_X && y >= minD_Y && y <= maxD_Y) {
      return true;
    }
  }

  // 2. Check if we are inside any room with the proper safety radius
  let insideAnyRoom = false;
  for (const room of ROOMS) {
    if (
      x >= room.minX + r &&
      x <= room.maxX - r &&
      y >= room.minY + r &&
      y <= room.maxY - r
    ) {
      insideAnyRoom = true;
      break;
    }
  }

  if (!insideAnyRoom) return false;

  // 3. Check if we overlap with any solid desks, tables, sinks, or cubicle obstacles
  for (const obs of ALL_OBSTACLES) {
    const obsMinX = obs.x - r;
    const obsMaxX = obs.x + obs.width + r;
    const obsMinY = obs.y - r;
    const obsMaxY = obs.y + obs.height + r;

    if (x >= obsMinX && x <= obsMaxX && y >= obsMinY && y <= obsMaxY) {
      return false; // Collision with obstacle!
    }
  }

  return true;
}

/**
 * Returns the room ID the coordinate is currently occupying, or "Outside" / "Hallway" etc.
 */
export function getRoomAt(x: number, y: number): string {
  for (const d of DOORWAYS) {
    if (x >= d.minX && x <= d.maxX && y >= d.minY && y <= d.maxY) {
      return "Doorway";
    }
  }
  for (const r of ROOMS) {
    if (x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY) {
      return r.id;
    }
  }
  return "Outside";
}

/**
 * Performs a precise raycast sampling check from (x1, y1) to (x2, y2)
 * to verify if there is an unblocked line of sight.
 */
export function checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist <= 15) return true;

  const stepSize = 12; // smaller than obstacle padding to guarantee detection
  const steps = Math.floor(dist / stepSize);

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sampleX = x1 + dx * t;
    const sampleY = y1 + dy * t;
    
    // We can use a small radius of 4 for the light ray path itself
    if (!isLocationWalkable(sampleX, sampleY, 4)) {
      return false; // Path is blocked by wall or obstacle
    }
  }

  return true;
}

// ==========================================
// AUDIO SYNTH ENGINE (Premium retro effect)
// ==========================================

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Synthesizes a spooky background ambient hum
 */
export function playAmbientHum() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  
  try {
    const rOsc = ctx.createOscillator();
    const rGain = ctx.createGain();
    
    rOsc.type = "sine";
    rOsc.frequency.setValueAtTime(55, ctx.currentTime); // Low bass A chord
    
    rOsc.frequency.linearRampToValueAtTime(58, ctx.currentTime + 4);
    
    rGain.gain.setValueAtTime(0.02, ctx.currentTime);
    
    rOsc.connect(rGain);
    rGain.connect(ctx.destination);
    rOsc.start();
    
    return { osc: rOsc, gain: rGain };
  } catch (e) {
    return null;
  }
}

/**
 * Synthesizes a creepy mechanical "shriek" or alert when Tobby spots standard students
 */
export function playScreamSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.61);
  } catch (e) {
    // Ignore audio failures
  }
}

/**
 * Synthesizes Marcus Ram attack
 */
export function playRamSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.41);
  } catch (e) {}
}

/**
 * Synthesizes Faibe pacify bell chime
 */
export function playPacifySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 Chime
    osc.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.8);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5 Harmony

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc2.start();
    
    osc.stop(ctx.currentTime + 1.21);
    osc2.stop(ctx.currentTime + 1.21);
  } catch (e) {}
}

/**
 * Synthesizes a damage sound effect (hit, puddle, scratch)
 */
export function playDamageSound(isPuddle: boolean = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(isPuddle ? 80 : 150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.21);
  } catch (e) {}
}

/**
 * Synthesizes a low subtle walk tick or heavy breathing step
 */
export function playFootstepSound(isSprinting: boolean = false) {
  const ctx = getAudioContext();
  if (!ctx || ctx.state === "suspended") return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(isSprinting ? 95 : 65, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(5, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(isSprinting ? 0.04 : 0.02, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {}
}

/**
 * Synthesizes descending stairs down a floor level
 */
export function playStaircasePassSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [220, 261.63, 329.63, 392.00, 523.25]; // descending-like arpeggio or ascending
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      gainNode.gain.setValueAtTime(0.05, ctx.currentTime + index * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.25);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.26);
    });
  } catch (e) {}
}

/**
 * Synthesizes a game over (defeat) sound effect
 */
export function playGameOverSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [220, 196, 174.61, 146.83, 110]; // depressing downward notes
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.4);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.15);
      osc.stop(ctx.currentTime + index * 0.15 + 0.41);
    });
  } catch (e) {}
}

/**
 * Synthesizes a level win melody
 */
export function playLevelWinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // upbeat C major arpeggio
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
      gainNode.gain.setValueAtTime(0.06, ctx.currentTime + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.35);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.1);
      osc.stop(ctx.currentTime + index * 0.1 + 0.36);
    });
  } catch (e) {}
}

/**
 * Synthesizes a standard short menu navigation/select tick
 */
export function playMenuClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}

/**
 * Synthesizes runner active speed trail boost sound
 */
export function playActiveAbilityRunner() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.31);
  } catch (e) {}
}

/**
 * Synthesizes medicine pickup chime
 */
export function playMedicinePickupSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch (e) {}
}

/**
 * Synthesizes scary radial shriek sound blast effect
 */
export function playSoundWaveAttack() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.46);
  } catch (e) {}
}
