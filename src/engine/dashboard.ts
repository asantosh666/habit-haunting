import { weekDays } from '../dates/localDate'
import { ALL_ROOMS } from './constants'
import { ghostOpacity, ghostSize, roomDarkness } from './ghost'
import { deriveHabitState, validCheckIns } from './streak'
import type { AppData, CandleVM, DashboardViewModel, GhostVM, LocalDate, RoomId } from './types'

/** Pure projection of the data onto what the dashboard shows. Nothing here is stored. */
export function buildDashboardViewModel(data: AppData, today: LocalDate): DashboardViewModel {
  const days = weekDays(today)
  const candles = new Map<RoomId, CandleVM[]>(ALL_ROOMS.map((id) => [id, []]))
  const ghosts = new Map<RoomId, GhostVM[]>(ALL_ROOMS.map((id) => [id, []]))
  const missedByRoom = new Map<RoomId, number>(ALL_ROOMS.map((id) => [id, 0]))
  const todayList: DashboardViewModel['todayList'] = []
  const rows: DashboardViewModel['week']['rows'] = []

  for (const habit of data.habits) {
    const state = deriveHabitState(habit, data.checkIns, today)
    const checked = new Set(validCheckIns(habit, data.checkIns, today))
    const checkedIn = checked.has(today)

    candles.get(habit.homeRoom)?.push({
      habitId: habit.id,
      name: habit.name,
      lit: state.lit,
      flameHeight: state.lit ? state.flameDisplayed : 0,
      streak: state.streak,
      missedDays: state.missedDays,
      checkedInToday: checkedIn,
    })
    missedByRoom.set(habit.homeRoom, (missedByRoom.get(habit.homeRoom) ?? 0) + state.missedDays)
    if (state.ghostRoom !== null) {
      ghosts.get(state.ghostRoom)?.push({
        habitId: habit.id,
        name: habit.name,
        level: state.ghostLevel,
        size: ghostSize(state.ghostLevel),
        opacity: ghostOpacity(state.ghostLevel),
        haunted: state.haunted,
      })
    }
    todayList.push({ habitId: habit.id, name: habit.name, checkedIn })
    rows.push({
      habitId: habit.id,
      cells: days.map((d) => (d > today || d < habit.createdOn ? 'none' : checked.has(d) ? 'checked' : 'missed')),
    })
  }

  return {
    today,
    rooms: ALL_ROOMS.map((id) => ({
      id,
      darkness: roomDarkness(missedByRoom.get(id) ?? 0),
      candles: candles.get(id) ?? [],
      ghosts: ghosts.get(id) ?? [],
    })),
    todayList,
    week: { days, rows },
    isEmpty: data.habits.length === 0,
  }
}
