import { describe, expect, it } from 'vitest'

import { cursorForPage, rememberCursor, type CursorTrail } from './modpacks'

const trail = (): CursorTrail => ({ cursors: [undefined] })

describe('cursor trail', () => {
  it('starts page 0 with no cursor', () => {
    const t = trail()
    expect(cursorForPage(t, 0)).toBe(0)
    expect(t.cursors[0]).toBeUndefined()
  })

  it('replays a page already visited without walking again', () => {
    const t = trail()
    rememberCursor(t, 1, 'pg_2')
    rememberCursor(t, 2, 'pg_3')
    // Page 1 is known: start there, not from 0.
    expect(cursorForPage(t, 1)).toBe(1)
    expect(t.cursors[1]).toBe('pg_2')
  })

  it('walks forward only over the pages in between', () => {
    const t = trail()
    rememberCursor(t, 1, 'pg_2')
    // Page 4 was never opened: resume from the furthest known page.
    expect(cursorForPage(t, 4)).toBe(1)
  })

  it('ignores a null cursor, which marks the end of the catalog', () => {
    const t = trail()
    rememberCursor(t, 1, null)
    expect(t.cursors[1]).toBeUndefined()
    expect(cursorForPage(t, 1)).toBe(0)
  })
})
