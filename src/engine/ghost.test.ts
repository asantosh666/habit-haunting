import { describe, expect, it } from 'vitest'
import {
  displayFlameHeight,
  flameHeight,
  ghostLevel,
  ghostOpacity,
  ghostRoom,
  ghostSize,
  ghostStage,
  isHaunted,
  roomDarkness,
} from './ghost'

describe('ghost functions', () => {
  it('caps ghost level at 10 and haunts at 3 missed days', () => {
    expect(ghostLevel(0)).toBe(0)
    expect(ghostLevel(10)).toBe(10)
    expect(ghostLevel(50)).toBe(10)
    expect(isHaunted(2)).toBe(false)
    expect(isHaunted(3)).toBe(true)
  })

  it('computes unbounded flame height and clamps the display height', () => {
    expect(flameHeight(0)).toBe(10)
    expect(flameHeight(28)).toBe(122)
    expect(flameHeight(1000)).toBe(4010)
    expect(displayFlameHeight(27)).toBe(118)
    expect(displayFlameHeight(28)).toBe(120)
    expect(displayFlameHeight(1000)).toBe(120)
  })

  it('computes ghost size and opacity', () => {
    expect(ghostSize(0)).toBe(0)
    expect(ghostSize(1)).toBe(32)
    expect(ghostSize(10)).toBe(104)
    expect(ghostOpacity(0)).toBe(0)
    expect(ghostOpacity(1)).toBe(0.19)
    expect(ghostOpacity(10)).toBe(1)
  })

  it('places the ghost by stage', () => {
    expect(ghostStage(0)).toBe('none')
    expect(ghostStage(2)).toBe('home')
    expect(ghostStage(3)).toBe('hallway')
    expect(ghostStage(6)).toBe('attic')
    expect(ghostStage(9)).toBe('cellar')
    expect(ghostRoom(0, 'parlor')).toBeNull()
    expect(ghostRoom(1, 'library')).toBe('library')
    expect(ghostRoom(5, 'library')).toBe('hallway')
    expect(ghostRoom(10, 'library')).toBe('cellar')
  })

  it('saturates room darkness at 100', () => {
    expect(roomDarkness(0)).toBe(0)
    expect(roomDarkness(4)).toBe(40)
    expect(roomDarkness(10)).toBe(100)
    expect(roomDarkness(99)).toBe(100)
  })
})
