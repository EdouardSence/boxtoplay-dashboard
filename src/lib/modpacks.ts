/**
 * The catalog API paginates by opaque cursor, the UI by page number. A trail
 * remembers which cursor opens which page, so a page already visited is one
 * request away and a jump forward only walks the pages in between.
 */
export interface CursorTrail {
  cursors: Array<string | undefined>
}

/** Index of the first page that still has to be fetched to reach `pageId`. */
export function cursorForPage(trail: CursorTrail, pageId: number): number {
  const known = trail.cursors.length - 1
  return Math.min(pageId, Math.max(0, known))
}

export function rememberCursor(trail: CursorTrail, pageId: number, cursor: string | null): void {
  if (!cursor) {
    return
  }
  trail.cursors[pageId] = cursor
}
