import type { CandleVM, DashboardViewModel, GhostVM } from '../engine/types'
import { ROOM_LABELS } from './rooms'

type RoomVM = DashboardViewModel['rooms'][number]

// All drawing is in SVG viewBox units. Sizes and heights come from the view model.
const WIDTH = 240
const HEIGHT = 220
const FLOOR_Y = 210
const WAX_HEIGHT = 40
const WAX_WIDTH = 16

interface Props {
  rooms: RoomVM[]
  selectedHabitId: string | null
  onSelect(habitId: string): void
}

function Candle({
  candle,
  x,
  selected,
  onSelect,
}: {
  candle: CandleVM
  x: number
  selected: boolean
  onSelect(habitId: string): void
}) {
  const waxTop = FLOOR_Y - WAX_HEIGHT
  const flame = candle.flameHeight
  const label = `${candle.name}, ${candle.lit ? 'lit candle' : 'unlit candle'}, streak ${candle.streak} ${candle.streak === 1 ? 'day' : 'days'}`
  return (
    <g
      className={`candle ${candle.lit ? 'lit' : 'unlit'}${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      data-habit-id={candle.habitId}
      data-flame-height={flame}
      onClick={() => onSelect(candle.habitId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(candle.habitId)
        }
      }}
    >
      <rect className="wax" x={x - WAX_WIDTH / 2} y={waxTop} width={WAX_WIDTH} height={WAX_HEIGHT} rx={2} />
      {candle.lit && (
        <>
          <line className="wick" x1={x} x2={x} y1={waxTop} y2={waxTop - 4} />
          <ellipse className="flame" cx={x} cy={waxTop - 4 - flame / 2} rx={6} ry={flame / 2} />
        </>
      )}
    </g>
  )
}

function Ghost({ ghost, index }: { ghost: GhostVM; index: number }) {
  const x = 8 + index * 56
  const y = 10
  const scale = ghost.size / 100
  return (
    <g
      className="ghost"
      role="img"
      aria-label={`${ghost.name}, ${ghost.haunted ? 'haunted ghost' : 'ghost'}, level ${ghost.level}`}
      data-habit-id={ghost.habitId}
      data-haunted={ghost.haunted}
      data-level={ghost.level}
      data-size={ghost.size}
      opacity={ghost.opacity}
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <path d="M10 100 V45 a40 40 0 0 1 80 0 V100 l-13 -10 -14 10 -13 -10 -13 10 -14 -10 -13 10 Z" />
      <circle className="ghost-eye" cx={38} cy={45} r={5} />
      <circle className="ghost-eye" cx={62} cy={45} r={5} />
    </g>
  )
}

function Room({ room, selectedHabitId, onSelect }: { room: RoomVM; selectedHabitId: string | null; onSelect(id: string): void }) {
  const spacing = Math.min(44, (WIDTH - 40) / Math.max(room.candles.length, 1))
  return (
    <figure className="room" data-room={room.id} data-darkness={room.darkness} aria-label={ROOM_LABELS[room.id]}>
      <figcaption>{ROOM_LABELS[room.id]}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label={`${ROOM_LABELS[room.id]} room`}>
        <rect className="room-wall" x={0} y={0} width={WIDTH} height={HEIGHT} />
        <rect className="room-floor" x={0} y={FLOOR_Y} width={WIDTH} height={HEIGHT - FLOOR_Y} />
        {room.candles.map((c, i) => (
          <Candle
            key={c.habitId}
            candle={c}
            x={24 + i * spacing}
            selected={c.habitId === selectedHabitId}
            onSelect={onSelect}
          />
        ))}
        {room.ghosts.map((g, i) => (
          <Ghost key={g.habitId} ghost={g} index={i} />
        ))}
        <rect
          className="room-dark"
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fillOpacity={room.darkness / 100}
          data-testid={`darkness-${room.id}`}
        />
      </svg>
    </figure>
  )
}

/** All seven rooms with their candles, ghosts, and darkness overlay (R5.1). */
export function HouseView({ rooms, selectedHabitId, onSelect }: Props) {
  return (
    <div className="house" aria-label="House">
      {rooms.map((room) => (
        <Room key={room.id} room={room} selectedHabitId={selectedHabitId} onSelect={onSelect} />
      ))}
    </div>
  )
}
