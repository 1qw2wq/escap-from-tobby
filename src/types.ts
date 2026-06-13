/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CharacterClass {
  MARCUS = "MARCUS",
  FAIBE = "FAIBE",
  RUNNER = "RUNNER",
}

export enum AIState {
  PATROLLING = "PATROLLING",
  CHASING = "CHASING",
  IDLE = "IDLE",
}

export interface PlayerState {
  classType: CharacterClass;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lives: number;
  maxLives: number;
  speed: number;
  angle: number;
  // Abilities
  abilityCooldown: number; // in milliseconds or seconds
  abilityActiveTime: number; // remaining duration of active ability
  // Marcus special
  isRamming: boolean;
  ramGraceActive: boolean; // to prevent instant re-activation on hit
  // Faibe special
  isPacifying: boolean;
  // DoT (Damage over Time)
  scratchDotDuration: number; // in seconds
  scratchDotTimer: number; // logs timing of 1-sec ticks
}

export interface TobbyState {
  id: number;
  x: number;
  y: number;
  angle: number;
  aiState: AIState;
  patrolTargetX: number;
  patrolTargetY: number;
  speed: number;
  stareTimer: number; // counts consecutive seconds staring
  hp: number;
  maxHp: number;
  playerHitCooldown: number; // cooldown before player can hit this specific Tobby again
  flashTime: number; // duration of damage flash highlight
  
  // Cooldowns (in ms or seconds)
  hitCooldown: number;
  scratchCooldown: number;
  waterSpillCooldown: number;
  stareCooldown: number;
  scarySoundCooldown: number;

  // Visual offsets for creepy wiggling
  wiggleOffset: number;
  isHallwaySpecial?: boolean;
}

export interface PuddleState {
  x: number;
  y: number;
  radius: number;
  timeLeft: number; // in seconds
}

export interface SoundWaveState {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  timeLeft: number; // duration of animation
}

export interface GameObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface GameRoom {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  obstacles: GameObstacle[];
}

export interface Doorway {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MedicineItemState {
  id: number;
  x: number;
  y: number;
  roomId: string;
  healAmount: number;
  pickedUp: boolean;
}
