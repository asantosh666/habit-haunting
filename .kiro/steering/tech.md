# Tech
## Stack
- TypeScript (strict), React, Vite. The house is drawn in SVG. No backend; data lives in `localStorage`.
- Tests: Vitest and fast-check. ESLint (flat config, `typescript-eslint`, `react-hooks`).
- Node 20+ and npm.
## Rules
- Prefer a minimal stack with few dependencies. Use idiomatic conventions of the stack.
- Never commit secrets. Use environment variables.
- `src/engine/` and `src/dates/` are pure. Lint forbids `Date.now`, argument-less `new Date()`, and `Math.random` there. Take `today` as a parameter.
- Tests never contain literal dates, `new Date(...)` with literals, `Date.now()`, or epoch literals. Use fast-check arbitraries (`src/test/arbitraries.ts`), an injected Clock, or `src/test/fixtures.ts`, which is the one place literal dates live (DST tables).
- The suite runs three times, under `TZ` America/New_York, Europe/London and Pacific/Auckland (Vitest projects in `vite.config.ts`).
- UI colors come from `.kiro/steering/design-tokens.md`.
- License: see `LICENSE`.
## Common commands
| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint over the repo |
| `npm test` | `vitest run`, once per time zone |
