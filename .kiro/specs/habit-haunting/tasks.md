# Implementation Plan: Habit Haunting

## Overview

Implementation language is TypeScript (Vite, React, SVG, Vitest, fast-check), as fixed by the design. The plan builds bottom-up: project setup, pure dates and engine modules, domain operations, view models, persistence and transfer, clock, store, then UI. Each pure module is followed by its property tests. The final task wires everything into the app. Each correctness property in the design has exactly one property-test sub-task.

## Tasks

- [ ] 1. Set up project structure and test tooling
  - Scaffold a Vite + React + TypeScript project with directories `dates/`, `clock/`, `engine/`, `store/`, `persistence/`, `transfer/`, `ui/`, `test/`
  - Add Vitest and fast-check as dev dependencies
  - Configure Vitest projects that run the suite under `TZ=America/New_York`, `Europe/London`, and `Pacific/Auckland`
  - Add a lint rule forbidding `Date.now`, argument-less `new Date()`, and `Math.random` in `engine/` and `dates/`
  - Create `test/arbitraries.ts` with generators: `localDate`, `habitName`, `appData`, `exportFile`, `corruptedExport`
  - _Requirements: 3.7, 9.3, 9.4, 10.1_

- [ ] 2. Implement the dates module
  - [ ] 2.1 Implement `dates/localDate.ts`
    - `isLocalDate`, `toDayNumber`, `fromDayNumber`, `addDays`, `diffDays`, `weekStartMonday`, `weekDays`
    - Use UTC day numbers so DST never affects results
    - _Requirements: 10.1, 10.3, 5.3_

  - [ ]* 2.2 Write property test for date arithmetic
    - **Property 3: Date arithmetic is exact and time-zone independent**
    - **Validates: Requirements 10.1, 10.3, 5.3**

- [ ] 3. Implement engine types, constants, and pure computations
  - [ ] 3.1 Define data types and constants
    - Create `engine/types.ts` with `Habit`, `CheckIn`, `Relic`, `AppData`, `HabitState`, `DashboardViewModel`, `RoomId`, `Milestone`, `Result`
    - Create `engine/constants.ts` with flame, ghost size, opacity, room, and threshold constants (`MAX_DISPLAY_HEIGHT = 120`)
    - _Requirements: 2.2, 2.7, 3.2, 3.4, 3.5_

  - [ ] 3.2 Implement streak and missed-day computation
    - `validCheckIns`, `streak`, `missedDays`, `hasFlame`, `deriveHabitState`
    - Exclude check-ins before creation date or after today without error
    - _Requirements: 2.5, 3.1, 3.6, 3.7, 9.4, 10.6_

  - [ ] 3.3 Implement ghost, flame, darkness, and haunted functions
    - `ghostLevel`, `isHaunted`, `flameHeight`, `displayFlameHeight`, `ghostSize`, `ghostOpacity`, `ghostStage`, `ghostRoom`, `roomDarkness`
    - _Requirements: 2.2, 2.7, 3.2, 3.3, 3.4, 3.5, 4.1, 4.6, 5.6, 10.4, 10.5_

  - [ ]* 3.4 Write property test for deterministic, well-formed engine output
    - **Property 4: Engine outputs are deterministic and well-formed**
    - **Validates: Requirements 2.5, 3.7, 9.4**

  - [ ]* 3.5 Write property test for out-of-range check-ins
    - **Property 5: Out-of-range check-ins are ignored**
    - **Validates: Requirements 10.6**

  - [ ]* 3.6 Write property test for missing a day
    - **Property 8: Missing a day adds one missed day**
    - **Validates: Requirements 3.1**

  - [ ]* 3.7 Write property test for ghost level mapping
    - **Property 9: Ghost level mapping**
    - **Validates: Requirements 3.2, 10.5**

  - [ ]* 3.8 Write property test for ghost size and opacity
    - **Property 10: Ghost size and opacity**
    - **Validates: Requirements 3.3, 5.6**

  - [ ]* 3.9 Write property test for ghost placement
    - **Property 11: Ghost placement is a single room with non-decreasing stage**
    - **Validates: Requirements 3.4**

  - [ ]* 3.10 Write property test for room darkness
    - **Property 12: Room darkness**
    - **Validates: Requirements 3.5, 5.6**

  - [ ]* 3.11 Write property test for flame height
    - **Property 13: Flame height**
    - **Validates: Requirements 2.2, 2.7, 5.6, 10.4**

  - [ ]* 3.12 Write property test for the haunted threshold
    - **Property 14: Haunted threshold**
    - **Validates: Requirements 4.1, 4.6**

  - [ ]* 3.13 Write example tests for engine boundary tables
    - Missed days 0, 2, 3, 5, 6, 8, 9, 10, 11 for ghost level, stage, and darkness; streaks 0, 27, 28, 29 for flame height
    - DST examples around 2025-03-09 and 2025-11-02 (America/New_York) and 2025-03-30 and 2025-10-26 (Europe/London)
    - _Requirements: 10.3, 3.2, 3.4, 2.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement habit operations, check-in, and relics
  - [ ] 5.1 Implement habit management functions
    - `validateHabitName`, `addHabit` (home room from `nextRoomSeq`), `renameHabit`, `deleteHabit` (removes check-ins and relics)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 5.2 Implement `applyCheckIn`
    - Return `ALREADY_CHECKED_IN`, `UNKNOWN_HABIT`, or `INVALID_DATE` errors with data unchanged
    - _Requirements: 2.1, 2.3, 2.4, 3.6, 4.3, 3.8_

  - [ ] 5.3 Implement relic evaluation and sorting
    - `evaluateRelics` (7 and 30 day milestones, one per habit and milestone, retry when not yet stored) and `sortRelics`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 5.4 Write property test for habit name validation and edit semantics
    - **Property 1: Habit name validation and edit semantics**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6**

  - [ ]* 5.5 Write property test for habit deletion
    - **Property 2: Delete removes all traces of a habit**
    - **Validates: Requirements 1.7**

  - [ ]* 5.6 Write property test for check-in post-conditions
    - **Property 6: Check-in post-conditions**
    - **Validates: Requirements 2.1, 2.3, 3.6, 4.3, 8.6**

  - [ ]* 5.7 Write property test for duplicate check-in
    - **Property 7: Duplicate check-in is a no-op**
    - **Validates: Requirements 2.4**

  - [ ]* 5.8 Write property test for relic award
    - **Property 17: Relic award**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

  - [ ]* 5.9 Write property test for relic ordering
    - **Property 18: Relic list ordering**
    - **Validates: Requirements 6.4**

- [ ] 6. Implement view models, seed habits, and demo house
  - [ ] 6.1 Implement `buildDashboardViewModel`
    - Rooms with darkness, candles, and one ghost each; Today_List; Monday to Sunday week with `checked`/`missed`/`none` cells; `isEmpty`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ] 6.2 Implement `buildSeedHabits` and `buildDemoHouse`
    - Seed habits "Drink water", "Move for 10 minutes", "Read 10 pages"; demo house of five neglected habits, three haunted
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ]* 6.3 Write property test for Today_List and week view
    - **Property 15: Today list and week view**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 6.4 Write property test for graveyard cell marking
    - **Property 16: Graveyard cell marking**
    - **Validates: Requirements 5.4**

  - [ ]* 6.5 Write property test for demo house shape
    - **Property 22: Demo house shape**
    - **Validates: Requirements 8.4**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement persistence and import/export
  - [ ] 8.1 Implement storage adapters and persistence
    - `StorageAdapter`, `LocalStorageAdapter`, `MemoryStorageAdapter`, canonical `serialize`, `parseAppData`, `load` (empty, ok, corrupt), `save` (catches write errors)
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [ ] 8.2 Implement export and import
    - `buildExport`, `serializeExport` (canonical ordering), `parseExport` with `NOT_JSON` and `BAD_STRUCTURE` errors, `importToAppData`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 8.3 Write property test for persistence round trip
    - **Property 21: Persistence round trip**
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 8.4 Write property test for export and import round trip
    - **Property 19: Export and import round trip**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [ ]* 8.5 Write property test for invalid import rejection
    - **Property 20: Invalid import is rejected without side effects**
    - **Validates: Requirements 7.5**

- [ ] 9. Implement the clock
  - [ ] 9.1 Implement `Clock`, `systemClock`, and `DemoClock`
    - `localDateFromSystem` using local date fields; `DemoClock.advanceOneDay` and offset persisted under `habit-haunting:demo-offset`
    - _Requirements: 8.7, 8.8, 10.1_

  - [ ]* 9.2 Write property test for the demo date control
    - **Property 23: Demo date control**
    - **Validates: Requirements 8.7, 8.8**

- [ ] 10. Implement the app store
  - [ ] 10.1 Implement reducer, store, and date watcher
    - `AppStore` with actions `addHabit`, `renameHabit`, `deleteHabit`, `checkIn`, `importData`, `loadDemo`, `completeOnboarding`
    - Roll back on failed save for add/edit/delete, check-in, relic, import, and demo load; keep in-memory state for other storage failures
    - `DateGuard` for invalid dates; midnight timer, `visibilitychange`, and 30-second poll; load timeout with `retryLoad`
    - _Requirements: 1.8, 2.6, 3.8, 4.5, 5.8, 6.6, 7.6, 7.7, 7.8, 8.5, 9.5, 9.6, 10.2_

  - [ ]* 10.2 Write unit tests for store failure handling and date rollover
    - Throwing `StorageAdapter` injection with rollback assertions for R1.8, R2.6, R4.5, R6.6, R7.8, R8.5, R9.5
    - Corrupt stored data starts empty and leaves raw value until first change; import confirm and cancel; midnight rollover with fake timers; load timeout and retry
    - _Requirements: 1.8, 2.6, 4.5, 5.8, 6.6, 7.6, 7.7, 7.8, 8.5, 9.5, 9.6, 10.2_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement the UI
  - [ ] 12.1 Implement `HouseView` and `CandleDetail`
    - SVG rooms, candles, flames (displayed height clamped), ghosts, darkness overlay; CSS transitions of 300 ms or less
    - _Requirements: 1.2, 2.7, 3.3, 3.4, 4.2, 4.4, 5.1, 5.5, 5.6_

  - [ ] 12.2 Implement `TodayList`, `GraveyardCalendar`, and `HabitForm`
    - Check-in button with already-checked-in message, calendar grid, add/edit with inline validation, delete confirmation
    - _Requirements: 1.3, 1.4, 1.6, 1.7, 2.4, 5.2, 5.3, 5.4_

  - [ ] 12.3 Implement `RelicList`, `Onboarding`, `TransferPanel`, `DemoControl`, and `Banner`
    - Relic list with empty state; one-action onboarding with Demo House option; export, import picker, replace confirmation; "Next day" control in demo mode; persistent error banners
    - _Requirements: 6.4, 6.7, 7.1, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.7, 9.5, 9.6_

  - [ ] 12.4 Implement `Dashboard` and wire the app
    - Compose House, Today_List, and Graveyard_Calendar from the view model; empty state; load error with Retry; connect store, clock, persistence, and demo mode (`?demo=1`)
    - _Requirements: 5.1, 5.7, 5.8, 8.6, 8.8, 9.2_

  - [ ]* 12.5 Write component tests for the UI
    - Unlit candle on add, empty dashboard message, haunted ghost shown and removed after revival, candle detail, empty relic list, onboarding flow, DOM updates in the same tick as dispatch
    - _Requirements: 1.2, 4.2, 4.4, 5.5, 5.7, 6.7, 8.1, 8.2, 8.3_

  - [ ]* 12.6 Write smoke and performance tests
    - Network spy asserting no `fetch`, `XMLHttpRequest`, `sendBeacon`, or WebSocket use in a full session
    - Export of 100 habits and 10,000 check-ins under 2 seconds and import under 5 seconds
    - _Requirements: 9.3, 7.1, 7.2_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 23 universal correctness properties from the design
- Unit and component tests validate examples, edge cases, and failure handling

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", "3.12", "3.13"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 6, "tasks": ["5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "6.1", "6.2"] },
    { "id": 7, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["7"] },
    { "id": 9, "tasks": ["8.1", "9.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "9.2"] },
    { "id": 11, "tasks": ["8.4", "8.5", "10.1"] },
    { "id": 12, "tasks": ["10.2"] },
    { "id": 13, "tasks": ["11"] },
    { "id": 14, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 15, "tasks": ["12.4"] },
    { "id": 16, "tasks": ["12.5", "12.6"] },
    { "id": 17, "tasks": ["13"] }
  ]
}
```
