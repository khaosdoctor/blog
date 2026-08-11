import assert from 'node:assert/strict'
import test from 'node:test'
import { dueNow } from './index.ts'

/**
 * The window check is the whole scheduler: it is what lets the Worker stay
 * stateless. Get it wrong in one direction and a post publishes late or never;
 * get it wrong in the other and every cron tick rebuilds the site forever.
 */
const NOON = Date.parse('2026-08-11T12:00:00.000Z')
const at = (iso: string) => ({ slug: iso, pubDate: iso })

test('publishes a post whose time fell inside the minute that just passed', () => {
  const due = dueNow([at('2026-08-11T11:59:30.000Z')], NOON)
  assert.deepEqual(
    due.map((post) => post.slug),
    ['2026-08-11T11:59:30.000Z'],
  )
})

test('publishes a post due exactly now', () => {
  assert.equal(dueNow([at('2026-08-11T12:00:00.000Z')], NOON).length, 1)
})

test('does not publish a post that is still in the future', () => {
  assert.equal(dueNow([at('2026-08-11T12:00:30.000Z')], NOON).length, 0)
})

test('does not republish a post older than the window', () => {
  // Without this the Worker would fire a build on every tick, forever.
  assert.equal(dueNow([at('2026-08-11T11:58:00.000Z')], NOON).length, 0)
})

test('ignores an unparseable date instead of throwing', () => {
  assert.equal(dueNow([{ slug: 'broken', pubDate: 'not a date' }], NOON).length, 0)
})

test('handles several posts due in the same minute', () => {
  const due = dueNow([at('2026-08-11T11:59:10.000Z'), at('2026-08-11T11:59:50.000Z')], NOON)
  assert.equal(due.length, 2)
})
