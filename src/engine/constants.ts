import type { HomeRoomId, RoomId } from './types'

/** Flame height in SVG viewBox units: FLAME_BASE + FLAME_STEP * streak. */
export const FLAME_BASE = 10
export const FLAME_STEP = 4
export const MAX_DISPLAY_HEIGHT = 120

/** Ghost level is min(GHOST_LEVEL_MAX, missed days). */
export const GHOST_LEVEL_MAX = 10
/** Ghost size in px: GHOST_SIZE_BASE + GHOST_SIZE_STEP * level (level 1..10). */
export const GHOST_SIZE_BASE = 24
export const GHOST_SIZE_STEP = 8
/** Ghost opacity: GHOST_OPACITY_BASE + GHOST_OPACITY_STEP * level, rounded to 2 decimals. */
export const GHOST_OPACITY_BASE = 0.1
export const GHOST_OPACITY_STEP = 0.09

/** Missed days at which a habit is Haunted (ghost leaves its home room). */
export const HAUNTED_THRESHOLD = 3
/** Ghost levels at which the ghost moves to the hallway, attic, and cellar. */
export const HALLWAY_LEVEL = 3
export const ATTIC_LEVEL = 6
export const CELLAR_LEVEL = 9

/** Room darkness percent: min(DARKNESS_MAX, DARKNESS_PER_MISSED_DAY * total missed days). */
export const DARKNESS_PER_MISSED_DAY = 10
export const DARKNESS_MAX = 100

/** Streak lengths that award a relic. */
export const MILESTONES = [7, 30] as const

export const HOME_ROOMS: readonly HomeRoomId[] = ['parlor', 'library', 'kitchen', 'bedroom']
export const HAUNT_ROOMS: readonly RoomId[] = ['hallway', 'attic', 'cellar']
export const ALL_ROOMS: readonly RoomId[] = [...HOME_ROOMS, ...HAUNT_ROOMS]

export const MAX_HABIT_NAME_LENGTH = 100
