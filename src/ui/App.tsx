import { useEffect } from 'react'
import type { Controller } from './controller'
import { Dashboard } from './Dashboard'
import { useAppState } from './useAppState'
import './app.css'

export function App({ controller }: { controller: Controller }) {
  const state = useAppState(controller.store)
  useEffect(() => controller.start(), [controller])
  return (
    <main className="app">
      <h1>Habit Haunting</h1>
      <Dashboard state={state} controller={controller} />
    </main>
  )
}
