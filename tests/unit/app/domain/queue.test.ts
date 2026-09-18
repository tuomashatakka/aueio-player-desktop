import { describe, expect, test } from 'bun:test'
import { Queue } from '../../../../src/app/domain'
import type { RepeatMode } from '../../../../src/app/domain'


const ITEMS                               = [ 'a', 'b', 'c', 'd' ]
const REPEAT_MODES: readonly RepeatMode[] = [ 'none', 'one', 'all' ]

describe('Queue', () => {
  test('empty() has no current id', () => {
    expect(Queue.empty().currentId).toBeNull()
  })

  test('withItems starts at the clamped startIndex and records history', () => {
    const queue = Queue.empty().withItems(ITEMS, 2)
    expect(queue.currentId).toBe('c')
    expect(queue.history).toEqual([ 'c' ])

    expect(Queue.empty().withItems(ITEMS, 99).index).toBe(3)
    expect(Queue.empty().withItems(ITEMS, -5).index).toBe(0)
  })

  test('withItems on an empty list clears the queue but keeps history', () => {
    const queue = Queue.empty().withItems(ITEMS, 0)
      .withItems([])
    expect(queue.currentId).toBeNull()
    expect(queue.history).toEqual([ 'a' ])
  })

  test('enqueue appends without moving the current position', () => {
    const queue = Queue.empty().withItems(ITEMS, 1)
      .enqueue([ 'e', 'f' ])
    expect(queue.items).toEqual([ ...ITEMS, 'e', 'f' ])
    expect(queue.currentId).toBe('b')
  })

  describe('previous() — direction-agnostic, ignores shuffle/repeat', () => {
    test('steps back through the queue order', () => {
      const queue = Queue.empty().withItems(ITEMS, 2)
        .previous()
      expect(queue.currentId).toBe('b')
    })

    test('stays put at the first item', () => {
      const queue = Queue.empty().withItems(ITEMS, 0)
      expect(queue.previous()).toBe(queue)
    })
  })

  describe('next() across every shuffle × repeat combination', () => {
    for (const repeat of REPEAT_MODES) {
      test(`shuffle=false, repeat=${repeat}: steps forward mid-queue`, () => {
        const queue = Queue.empty().withItems(ITEMS, 0)
          .next(false, repeat)
        expect(queue.currentId).toBe('b')
        expect(queue.index).toBe(1)
      })

      test(`shuffle=false, repeat=${repeat}: at the end`, () => {
        const queue = Queue.empty().withItems(ITEMS, ITEMS.length - 1)
          .next(false, repeat)

        if (repeat === 'all') {
          expect(queue.index).toBe(0)
          expect(queue.currentId).toBe('a')
        }
        else {
          // 'none' and 'one' both stop — advancing past the end is the
          // effects layer's call (re-seek for 'one', stop for 'none').
          expect(queue.index).toBe(ITEMS.length - 1)
          expect(queue.currentId).toBe('d')
        }
      })

      test(`shuffle=true, repeat=${repeat}: never re-draws the track that just played`, () => {
        let queue = Queue.empty().withItems(ITEMS, 0)

        for (let i = 0; i < 25; i++) {
          const before = queue.currentId
          queue        = queue.next(true, repeat)
          expect(queue.currentId).not.toBeNull()
          expect(queue.currentId).not.toBe(before)
          expect(ITEMS).toContain(queue.currentId!)
        }
      })

      test(`shuffle=true, repeat=${repeat}: a single-item queue has nowhere else to go`, () => {
        const queue = Queue.empty().withItems([ 'solo' ], 0)
          .next(true, repeat)
        expect(queue.currentId).toBe('solo')
      })
    }

    test('next() on an empty queue is a no-op', () => {
      const queue = Queue.empty()
      expect(queue.next(false, 'all')).toBe(queue)
      expect(queue.next(true, 'all')).toBe(queue)
    })
  })
})
