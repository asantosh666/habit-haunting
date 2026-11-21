import { useMemo, useState } from 'react'
import { buildDashboardViewModel } from '../engine/dashboard'
import type { SessionState } from '../store/store'
import { Banners } from './Banner'
import { CandleDetail } from './CandleDetail'
import type { Controller } from './controller'
import { DemoControl } from './DemoControl'
import { GraveyardCalendar } from './GraveyardCalendar'
import { HabitManager } from './HabitManager'
import { HouseView } from './HouseView'
import { Onboarding } from './Onboarding'
import { RelicList } from './RelicList'
import { TodayList } from './TodayList'
import { TransferPanel } from './TransferPanel'

interface Props {
  state: SessionState
  controller: Controller
}

/** Lays out the house, today list, and calendar from the view model. It holds no game rules. */
export function Dashboard({ state, controller }: Props) {
  const { dispatch, store } = controller
  const [selected, setSelected] = useState<string | null>(null)
  const { data, today } = state

  const vm = useMemo(() => (today === null ? null : buildDashboardViewModel(data, today)), [data, today])
  const names = useMemo(() => Object.fromEntries(data.habits.map((h) => [h.id, h.name])), [data.habits])
  const candle = vm?.rooms.flatMap((r) => r.candles).find((c) => c.habitId === selected) ?? null

  const banners = <Banners banners={state.banners} onDismiss={(id) => store.dismissBanner(id)} />

  if (state.status === 'loading' && state.data.habits.length === 0) {
    return (
      <>
        {banners}
        <p role="status">Loading…</p>
      </>
    )
  }

  return (
    <>
      {banners}
      {state.status === 'error' && (
        <div className="banner" role="alert">
          <span>
            <strong>⚠ Error:</strong> {state.loadError}
          </span>
          <button type="button" onClick={() => store.retryLoad()}>
            Retry
          </button>
        </div>
      )}
      {state.demoMode && <DemoControl today={today} onAdvance={() => controller.advanceDay()} />}
      {state.onboardingPending && (
        <Onboarding
          onStart={() => dispatch({ type: 'completeOnboarding' })}
          onLoadDemo={() => dispatch({ type: 'loadDemo' })}
        />
      )}
      {vm === null ? (
        <p className="muted">The date is invalid, so the house cannot be shown.</p>
      ) : (
        !state.onboardingPending && (
          <>
            {vm.isEmpty && <p className="panel">You have no habits yet. Add one to light your first candle.</p>}
            <HouseView rooms={vm.rooms} selectedHabitId={selected} onSelect={setSelected} />
            {candle && <CandleDetail candle={candle} />}
            <TodayList items={vm.todayList} onCheckIn={(habitId) => dispatch({ type: 'checkIn', habitId })} />
            <HabitManager
              habits={vm.todayList}
              onAdd={(name) => dispatch({ type: 'addHabit', name })}
              onRename={(habitId, name) => dispatch({ type: 'renameHabit', habitId, name })}
              onDelete={(habitId) => dispatch({ type: 'deleteHabit', habitId })}
            />
            <GraveyardCalendar week={vm.week} names={names} />
            <RelicList relics={data.relics} names={names} />
            <TransferPanel
              exportText={() => controller.exportText()}
              onImport={(imported) => dispatch({ type: 'importData', data: imported })}
            />
          </>
        )
      )}
    </>
  )
}
