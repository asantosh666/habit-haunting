// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays } from '../dates/localDate'
import { buildDemoHouse } from '../engine/seed'
import type { AppData } from '../engine/types'
import { save, STORAGE_KEY, load } from '../persistence/persistence'
import { MemoryStorageAdapter } from '../persistence/storage'
import { BASE_DATE } from '../test/fixtures'
import { buildExport, serializeExport } from '../transfer/transfer'
import { App } from './App'
import { createController } from './controller'

const empty: AppData = { schemaVersion: 1, habits: [], checkIns: [], relics: [], nextRoomSeq: 0 }

let counter = 0

function setup(data?: AppData, search = '') {
  const storage = new MemoryStorageAdapter()
  if (data) save(storage, data)
  const controller = createController({ storage, baseClock: { today: () => BASE_DATE }, search, makeId: () => `id-${++counter}` })
  render(<App controller={controller} />)
  return { controller, storage, user: userEvent.setup() }
}

const room = (id: string) => document.querySelector(`[data-room="${id}"]`) as HTMLElement

describe('App: empty states and adding (R1.2, R5.7, R6.7)', () => {
  it('shows the empty message, no candles or ghosts, an empty today list, and the empty relic list', () => {
    setup(empty)
    expect(screen.getByText(/no habits yet/i)).toBeTruthy()
    expect(screen.queryAllByRole('button', { name: /candle/ })).toHaveLength(0)
    expect(screen.queryAllByLabelText(/ghost/)).toHaveLength(0)
    expect(screen.getByText('No habits to check in.')).toBeTruthy()
    expect(screen.getByText('No relics have been earned yet.')).toBeTruthy()
    // All seven rooms are still drawn.
    expect(document.querySelectorAll('[data-room]')).toHaveLength(7)
  })

  it('adds a habit as an unlit candle in a room', async () => {
    const { user } = setup(empty)
    await user.type(screen.getByRole('textbox', { name: 'New habit name' }), '  Stretch  ')
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    const candle = screen.getByRole('button', { name: 'Stretch, unlit candle, streak 0 days' })
    expect(room('parlor').contains(candle)).toBe(true)
    expect(candle.getAttribute('data-flame-height')).toBe('0')
    expect(screen.queryByText(/no habits yet/i)).toBeNull()
  })

  it('shows inline validation for an empty and a too-long name and changes nothing', async () => {
    const { user, storage } = setup(empty)
    const before = storage.get(STORAGE_KEY)
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    expect((await screen.findByRole('alert')).textContent).toBe('A name is required')
    await user.type(screen.getByRole('textbox', { name: 'New habit name' }), 'x'.repeat(101))
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Names can be at most 100 characters')
    expect(storage.get(STORAGE_KEY)).toBe(before)
  })

  it('renames and deletes with a confirmation step', async () => {
    const { user } = setup(empty)
    await user.type(screen.getByRole('textbox', { name: 'New habit name' }), 'Stretch')
    await user.click(screen.getByRole('button', { name: 'Add habit' }))
    await user.click(screen.getByRole('button', { name: 'Rename Stretch' }))
    const input = screen.getByRole('textbox', { name: 'New name for Stretch' })
    await user.clear(input)
    await user.type(input, 'Yoga')
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(screen.getByRole('button', { name: /^Yoga, unlit candle/ })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Delete Yoga' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: /^Yoga, unlit candle/ })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete Yoga' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(screen.queryByRole('button', { name: /^Yoga/ })).toBeNull()
  })
})

describe('App: haunting, detail, and check-in (R4.2, R4.4, R5.5, R2.4)', () => {
  it('shows the haunted ghost in the hallway and removes it after revival', async () => {
    const { user } = setup(buildDemoHouse(BASE_DATE))
    const ghost = screen.getByLabelText('Meditate, haunted ghost, level 5')
    expect(ghost.getAttribute('data-haunted')).toBe('true')
    expect(room('hallway').contains(ghost)).toBe(true)
    // Journal has 2 missed days: a ghost that is not haunted, in its home room.
    expect(screen.getByLabelText('Journal, ghost, level 2').getAttribute('data-haunted')).toBe('false')

    await user.click(screen.getByRole('button', { name: 'Check in Meditate' }))
    expect(screen.queryByLabelText(/^Meditate, .*ghost/)).toBeNull()
    expect(screen.getByRole('button', { name: /^Meditate, lit candle, streak 1 day$/ })).toBeTruthy()
  })

  it('darkens rooms by missed days and keeps the haunt rooms light', () => {
    setup(buildDemoHouse(BASE_DATE))
    // Home rooms follow creation order: parlor has Meditate (5) and Stretch (3), library has Exercise (10).
    const darkness = (id: string) => Number(room(id).getAttribute('data-darkness'))
    expect(darkness('hallway')).toBe(0)
    expect(darkness('attic')).toBe(0)
    expect(darkness('cellar')).toBe(0)
    expect(darkness('parlor')).toBe(80)
    expect(darkness('library')).toBe(100)
    expect(darkness('kitchen')).toBe(20)
    expect(darkness('bedroom')).toBe(0)
  })

  it('shows candle detail with name, streak, and missed days', async () => {
    const { user } = setup(buildDemoHouse(BASE_DATE))
    await user.click(screen.getByRole('button', { name: /^Meditate, lit candle/ }))
    const detail = screen.getByRole('region', { name: 'Candle detail' })
    expect(within(detail).getByText('Meditate')).toBeTruthy()
    expect(detail.textContent).toContain('Streak: 0 days')
    expect(detail.textContent).toContain('Missed days: 5 days')
    await user.click(screen.getByRole('button', { name: /^Drink water, lit candle/ }))
    expect(screen.getByRole('region', { name: 'Candle detail' }).textContent).toContain('Streak: 12 days')
  })

  it('says "Already checked in today" and keeps data on a second check-in', async () => {
    const { user, storage } = setup(buildDemoHouse(BASE_DATE))
    // Drink water is already checked in today in the demo house.
    const before = storage.get(STORAGE_KEY)
    await user.click(screen.getByRole('button', { name: 'Check in Drink water' }))
    expect(screen.getByText('Already checked in today')).toBeTruthy()
    expect(storage.get(STORAGE_KEY)).toBe(before)
  })

  it('shows the graveyard marks for the current week', () => {
    setup(buildDemoHouse(BASE_DATE))
    const row = screen.getByRole('row', { name: /Drink water/ })
    // BASE_DATE is a Sunday, so today is the last cell and is checked in.
    const cells = within(row).getAllByRole('cell')
    expect(cells).toHaveLength(7)
    expect(cells[6].getAttribute('data-cell')).toBe('checked')
    expect(cells[0].getAttribute('data-cell')).toBe('checked')
  })
})

describe('App: onboarding and demo (R8.1 to R8.3, R8.7, R8.8)', () => {
  it('creates the three seed habits with one action, with the demo option on the same screen', async () => {
    const { user, storage } = setup()
    expect(screen.getByRole('button', { name: 'Load Demo House' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    for (const name of ['Drink water', 'Move for 10 minutes', 'Read 10 pages']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${name}, unlit candle`) })).toBeTruthy()
    }
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
    expect(load(storage)).toMatchObject({ kind: 'ok', data: { habits: [{}, {}, {}] } })
  })

  it('loads the demo house and advances one day per press, recalculating the state', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Load Demo House' }))
    expect(screen.getByText(`Demo date: ${BASE_DATE}`, { exact: false })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^Stretch, lit candle/ }))
    expect(screen.getByRole('region', { name: 'Candle detail' }).textContent).toContain('Missed days: 3')

    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(screen.getByText(`Demo date: ${addDays(BASE_DATE, 1)}`, { exact: false })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Candle detail' }).textContent).toContain('Missed days: 4')
    // Drink water was checked in on the real date, and the new day has not ended yet, so it has no missed days.
    await user.click(screen.getByRole('button', { name: /^Drink water, lit candle/ }))
    expect(screen.getByRole('region', { name: 'Candle detail' }).textContent).toContain('Missed days: 0')
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(screen.getByRole('region', { name: 'Candle detail' }).textContent).toContain('Missed days: 1')
  })

  it('shows the demo control when the URL has ?demo=1', () => {
    setup(empty, '?demo=1')
    expect(screen.getByRole('button', { name: 'Next day' })).toBeTruthy()
  })

  it('does not show the demo control otherwise', () => {
    setup(empty)
    expect(screen.queryByRole('button', { name: 'Next day' })).toBeNull()
  })
})

describe('App: timing and errors', () => {
  it('updates the DOM in the same tick as the dispatch', () => {
    const { controller } = setup(buildDemoHouse(BASE_DATE))
    expect(screen.getByLabelText('Meditate, haunted ghost, level 5')).toBeTruthy()
    const id = controller.store.getState().data.habits[0].id
    act(() => {
      void controller.dispatch({ type: 'checkIn', habitId: id })
    })
    // No await between the dispatch and the assertion.
    expect(screen.queryByLabelText(/^Meditate, .*ghost/)).toBeNull()
  })

  it('shows a persistent banner when a save fails and leaves the house unchanged', async () => {
    const { user, storage } = setup(buildDemoHouse(BASE_DATE))
    storage.set = () => {
      throw new Error('quota')
    }
    await user.click(screen.getByRole('button', { name: 'Check in Meditate' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Check-in was not saved')
    expect(screen.getByLabelText('Meditate, haunted ghost, level 5')).toBeTruthy()
  })

  it('shows a banner when storage is unavailable, and the app still works', async () => {
    const controller = createController({ storage: null, baseClock: { today: () => BASE_DATE }, makeId: () => `id-${++counter}` })
    render(<App controller={controller} />)
    expect(screen.getByRole('alert').textContent).toContain('Data could not be saved')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: /^Drink water, unlit candle/ })).toBeTruthy()
  })
})

describe('App: import and export (R7.5 to R7.7)', () => {
  const file = (text: string) => new File([text], 'data.json', { type: 'application/json' })
  const other = (): AppData => ({
    ...empty,
    habits: [{ id: 'x', name: 'Imported habit', frequency: 'daily', createdOn: addDays(BASE_DATE, -3), homeRoom: 'library' }],
    nextRoomSeq: 1,
  })

  it('rejects text that is not JSON and a wrong structure, with different messages', async () => {
    const { user, storage } = setup(buildDemoHouse(BASE_DATE))
    const before = storage.get(STORAGE_KEY)
    const input = screen.getByLabelText('Import file')
    await user.upload(input, file('{oops'))
    expect((await screen.findByText('The file is not valid JSON.')).getAttribute('role')).toBe('alert')
    await user.upload(input, file('{"format":"x"}'))
    expect(await screen.findByText('The file does not match the export structure.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(storage.get(STORAGE_KEY)).toBe(before)
  })

  it('asks for confirmation, keeps data on cancel, and replaces it on confirm', async () => {
    const { user, storage } = setup(buildDemoHouse(BASE_DATE))
    const before = storage.get(STORAGE_KEY)
    const text = serializeExport(buildExport(other(), BASE_DATE, 'stamp'))

    await user.upload(screen.getByLabelText('Import file'), file(text))
    const dialog = await screen.findByRole('dialog', { name: 'Confirm import' })
    expect(dialog.textContent).toContain('replace all existing data')
    expect(storage.get(STORAGE_KEY)).toBe(before)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(storage.get(STORAGE_KEY)).toBe(before)
    expect(screen.queryByRole('button', { name: /^Imported habit/ })).toBeNull()

    await user.upload(screen.getByLabelText('Import file'), file(text))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Replace data' }))
    expect(await screen.findByRole('button', { name: /^Imported habit/ })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Import succeeded')
    expect(screen.queryByRole('button', { name: /^Meditate/ })).toBeNull()
  })

  it('exports every habit and one ghost entry per habit', () => {
    const { controller } = setup(buildDemoHouse(BASE_DATE))
    const text = controller.exportText()
    expect(text).not.toBeNull()
    const parsed = JSON.parse(text as string)
    expect(parsed.format).toBe('habit-haunting-export')
    expect(parsed.habits).toHaveLength(5)
    expect(parsed.ghosts).toHaveLength(5)
  })
})
