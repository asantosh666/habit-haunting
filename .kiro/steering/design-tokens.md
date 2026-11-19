---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,css,svg}"
---

# Design Tokens

The house is a photographer's darkroom lit by candles. Use only these colors for UI. Define them once as CSS custom properties (for example in `src/ui/tokens.css`) and reference the variables everywhere else. Do not hard-code hex values in components.

## Palette

| Token | Value | Use |
|---|---|---|
| `--bg-graphite` | `#26221f` | Warm graphite darkroom background, page and house walls |
| `--bg-graphite-raised` | `#322d29` | Panels, cards, Today_List rows |
| `--line-graphite` | `#4a423c` | Borders, dividers |
| `--amber-safelight` | `#ffb347` | Candlelight, flames, primary actions, focus rings |
| `--amber-glow` | `#ff9a1f` | Flame core, glow and hover states |
| `--amber-dim` | `#a8691c` | Unlit or dormant candle wax, secondary accents |
| `--bone-ghost` | `#e9e2d0` | Ghost fill, primary text on dark |
| `--bone-mist` | `#c9c1ac` | Secondary text, faint ghost trails |
| `--shadow-deep` | `#0d0b0a` | Room darkness overlay, haunted rooms |

## Rules

- Background is always `--bg-graphite` or `--bg-graphite-raised`. No white or light backgrounds, no pure black.
- Flames, candle glow and primary buttons use the amber tokens only.
- Ghosts use `--bone-ghost`. Ghost opacity comes from the engine's Ghost_Level mapping (0.1 to 1.0), never from ad hoc values.
- Room darkness is a `--shadow-deep` overlay whose opacity equals the room's darkness percent divided by 100.
- Text on `--bg-graphite*` uses `--bone-ghost` or `--bone-mist` and must keep a contrast ratio of at least 4.5:1.
- No blues, greens or purples. Error and warning banners use `--amber-glow` text on `--shadow-deep`, with an icon or label so meaning does not depend on color.
- Animations are 300 ms or less, and honor `prefers-reduced-motion`.
