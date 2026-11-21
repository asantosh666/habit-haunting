import type { GhostSnapshot } from '../engine/validate'
import type { CheckIn, Habit, LocalDate, Relic } from '../engine/types'

export type ExportGhost = GhostSnapshot

export interface ExportFile {
  format: 'habit-haunting-export'
  version: 1
  exportedAt: string
  asOfDate: LocalDate
  nextRoomSeq: number
  habits: Habit[]
  checkIns: CheckIn[]
  relics: Relic[]
  ghosts: ExportGhost[]
}
