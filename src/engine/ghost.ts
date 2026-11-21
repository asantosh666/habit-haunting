import {
  ATTIC_LEVEL,
  CELLAR_LEVEL,
  DARKNESS_MAX,
  DARKNESS_PER_MISSED_DAY,
  FLAME_BASE,
  FLAME_STEP,
  GHOST_LEVEL_MAX,
  GHOST_OPACITY_BASE,
  GHOST_OPACITY_STEP,
  GHOST_SIZE_BASE,
  GHOST_SIZE_STEP,
  HALLWAY_LEVEL,
  HAUNTED_THRESHOLD,
  MAX_DISPLAY_HEIGHT,
} from './constants'
import type { RoomId } from './types'

export type GhostStage = 'none' | 'home' | 'hallway' | 'attic' | 'cellar'

/** Ghost level: min(GHOST_LEVEL_MAX, missed days). */
export function ghostLevel(missed: number): number {
  return Math.min(GHOST_LEVEL_MAX, Math.max(0, missed))
}

/** A habit is haunted once it has missed HAUNTED_THRESHOLD or more days. */
export function isHaunted(missed: number): boolean {
  return missed >= HAUNTED_THRESHOLD
}

/** Computed flame height. Unbounded. */
export function flameHeight(streak: number): number {
  return FLAME_BASE + FLAME_STEP * streak
}

/** Flame height clamped for display. */
export function displayFlameHeight(streak: number): number {
  return Math.min(flameHeight(streak), MAX_DISPLAY_HEIGHT)
}

export function ghostSize(level: number): number {
  return level <= 0 ? 0 : GHOST_SIZE_BASE + GHOST_SIZE_STEP * level
}

export function ghostOpacity(level: number): number {
  if (level <= 0) return 0
  return Math.round((GHOST_OPACITY_BASE + GHOST_OPACITY_STEP * level) * 100) / 100
}

export function ghostStage(level: number): GhostStage {
  if (level <= 0) return 'none'
  if (level < HALLWAY_LEVEL) return 'home'
  if (level < ATTIC_LEVEL) return 'hallway'
  if (level < CELLAR_LEVEL) return 'attic'
  return 'cellar'
}

export function ghostRoom(level: number, homeRoom: RoomId): RoomId | null {
  const stage = ghostStage(level)
  return stage === 'none' ? null : stage === 'home' ? homeRoom : stage
}

/** Room darkness percent from the total missed days of the habits in that room. */
export function roomDarkness(totalMissed: number): number {
  return Math.min(DARKNESS_MAX, DARKNESS_PER_MISSED_DAY * Math.max(0, totalMissed))
}
