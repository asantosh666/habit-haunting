# Structure
## Layout
```
.kiro/                 specs, steering, hooks
src/
  main.tsx             React entry
  dates/               LocalDate arithmetic (pure)
  clock/               Clock, systemClock, DemoClock
  engine/              Haunting_Engine: types, constants, pure computations (pure)
  store/               Reducer, AppStore, date watcher
  persistence/         StorageAdapter, serialize, load, save
  transfer/            Export and import
  ui/                  React components, design tokens CSS
  test/                Shared test support
    arbitraries.ts     fast-check generators: localDate, habitName, appData, exportFile, corruptedExport
    fixtures.ts        Literal DST dates and BASE_DATE (only place literal dates are allowed)
index.html, vite.config.ts (Vite + Vitest projects), eslint.config.js, tsconfig.json
LICENSE, README.md
```
## Conventions
- Tests sit next to the code as `*.test.ts(x)`. Shared helpers go in `src/test/`.
- Layering: `engine/` and `dates/` import no React, DOM, storage, or clock. `ui/` renders view models and holds no game rules.
- `src/test/arbitraries.ts` has temporary local copies of the data types. Task 3.1 creates `src/engine/types.ts`; switch the imports then and delete the copies.
- Group code by responsibility and keep names consistent with the haunted theme.
