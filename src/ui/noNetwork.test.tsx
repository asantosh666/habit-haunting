// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryStorageAdapter } from '../persistence/storage'
import { BASE_DATE } from '../test/fixtures'
import { App } from './App'
import { createController } from './controller'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('no network use (R9.3)', () => {
  it('makes no fetch, XMLHttpRequest, sendBeacon, or WebSocket call in a full session', async () => {
    const fetchSpy = vi.fn()
    const xhrSpy = vi.fn()
    const beaconSpy = vi.fn()
    const socketSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('XMLHttpRequest', xhrSpy)
    vi.stubGlobal('WebSocket', socketSpy)
    vi.stubGlobal('navigator', { ...globalThis.navigator, sendBeacon: beaconSpy })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} }))

    const controller = createController({
      storage: new MemoryStorageAdapter(),
      baseClock: { today: () => BASE_DATE },
    })
    render(<App controller={controller} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.type(screen.getByRole('textbox', { name: 'New habit name' }), 'Stretch')
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    await user.click(screen.getByRole('button', { name: 'Check in Stretch' }))
    await user.click(screen.getByRole('button', { name: 'Rename Stretch' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Export data' }))
    await user.upload(
      screen.getByLabelText('Import file'),
      new File([controller.exportText() as string], 'data.json', { type: 'application/json' }),
    )
    await user.click(screen.getByRole('button', { name: 'Replace data' }))
    // Demo mode path.
    await act(async () => {
      await controller.dispatch({ type: 'loadDemo' })
    })
    await user.click(await screen.findByRole('button', { name: 'Next day' }))

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
    expect(beaconSpy).not.toHaveBeenCalled()
    expect(socketSpy).not.toHaveBeenCalled()
  })
})
