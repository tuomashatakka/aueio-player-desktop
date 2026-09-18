import { describe, expect, test } from 'bun:test'
import { formatTime, isoDuration } from '../../../../src/app/domain'


describe('formatTime', () => {
  test('formats whole minutes and seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(3661)).toBe('61:01')
  })

  test('truncates fractional seconds', () => {
    expect(formatTime(59.9)).toBe('0:59')
  })

  test('falls back to 0:00 for missing or non-finite input', () => {
    expect(formatTime(Number.NaN)).toBe('0:00')
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('0:00')
    expect(formatTime(-0)).toBe('0:00')
  })
})

describe('isoDuration', () => {
  test('formats as PT<m>M<s>S', () => {
    expect(isoDuration(0)).toBe('PT0S')
    expect(isoDuration(225)).toBe('PT3M45S')
  })

  test('falls back to PT0S for non-finite input', () => {
    expect(isoDuration(Number.NaN)).toBe('PT0S')
  })
})
