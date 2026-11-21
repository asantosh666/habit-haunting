import { useSyncExternalStore } from 'react'
import type { AppStore, SessionState } from '../store/store'

export function useAppState(store: AppStore): SessionState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}
