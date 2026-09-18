import { describe, expect, test } from 'bun:test'
import { parseRange } from '../../../../src/main/media/range'


const SIZE = 1000

describe('parseRange', () => {
  test('no header → none', () => {
    expect(parseRange(null, SIZE)).toEqual({ kind: 'none' })
    expect(parseRange(undefined, SIZE)).toEqual({ kind: 'none' })
    expect(parseRange('', SIZE)).toEqual({ kind: 'none' })
  })

  test('a header that is not a bytes range → none', () => {
    expect(parseRange('not a range', SIZE)).toEqual({ kind: 'none' })
    expect(parseRange('items=0-10', SIZE)).toEqual({ kind: 'none' })
  })

  test('bytes=a-b is satisfiable and inclusive', () => {
    expect(parseRange('bytes=0-99', SIZE)).toEqual({ kind: 'satisfiable', start: 0, end: 99 })
    expect(parseRange('bytes=100-199', SIZE)).toEqual({ kind: 'satisfiable', start: 100, end: 199 })
  })

  test('bytes=a- runs to the end', () => {
    expect(parseRange('bytes=900-', SIZE)).toEqual({ kind: 'satisfiable', start: 900, end: 999 })
  })

  test('bytes=a-b clamps end to size - 1', () => {
    expect(parseRange('bytes=0-9999', SIZE)).toEqual({ kind: 'satisfiable', start: 0, end: 999 })
  })

  test('bytes=-n takes the last n bytes', () => {
    expect(parseRange('bytes=-100', SIZE)).toEqual({ kind: 'satisfiable', start: 900, end: 999 })
  })

  test('bytes=-n larger than size clamps start to 0', () => {
    expect(parseRange('bytes=-5000', SIZE)).toEqual({ kind: 'satisfiable', start: 0, end: 999 })
  })

  test('bytes=-0 is unsatisfiable', () => {
    expect(parseRange('bytes=-0', SIZE)).toEqual({ kind: 'unsatisfiable' })
  })

  test('bytes=- (both empty) is unsatisfiable', () => {
    expect(parseRange('bytes=-', SIZE)).toEqual({ kind: 'unsatisfiable' })
  })

  test('start at or past size is unsatisfiable', () => {
    expect(parseRange('bytes=1000-', SIZE)).toEqual({ kind: 'unsatisfiable' })
    expect(parseRange('bytes=5000-6000', SIZE)).toEqual({ kind: 'unsatisfiable' })
  })

  test('end before start is unsatisfiable', () => {
    expect(parseRange('bytes=500-100', SIZE)).toEqual({ kind: 'unsatisfiable' })
  })

  test('a zero-length resource is always unsatisfiable', () => {
    expect(parseRange('bytes=0-10', 0)).toEqual({ kind: 'unsatisfiable' })
    expect(parseRange('bytes=-10', 0)).toEqual({ kind: 'unsatisfiable' })
  })

  test('whitespace around the header is tolerated', () => {
    expect(parseRange('  bytes=0-9  ', SIZE)).toEqual({ kind: 'satisfiable', start: 0, end: 9 })
  })
})
