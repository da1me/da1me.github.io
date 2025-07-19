import assert from 'assert'
import { jaccard } from '../src/stats.js'

assert.strictEqual(jaccard(new Set(), new Set()), 0)
assert.strictEqual(jaccard(new Set([1, 2]), new Set([2, 3])), 1 / 3)
assert.strictEqual(jaccard(new Set([1, 2]), new Set([3, 4])), 0)

console.log('All tests passed')
