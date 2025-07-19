const { expect } = require('chai')
const { jaccard, collectTokenSet } = require('../scripts/utils')

describe('utility functions', () => {
  describe('jaccard', () => {
    it('computes intersection over union', () => {
      const a = new Set([1, 2, 3])
      const b = new Set([2, 3, 4])
      expect(jaccard(a, b)).to.equal(0.5)
    })

    it('returns 0 for disjoint sets', () => {
      const a = new Set([1])
      const b = new Set([2])
      expect(jaccard(a, b)).to.equal(0)
    })
  })

  describe('collectTokenSet', () => {
    it('collects unique lowercase tokens excluding stop words', () => {
      const hinario = {
        hinos: [
          { tokens: { pt: ['Ola', 'mundo', 'Ola', 'a'] } },
          { tokens: { pt: ['Testando'] } }
        ]
      }
      const result = collectTokenSet(hinario)
      expect(Array.from(result).sort()).to.deep.equal(['mundo', 'ola', 'testando'])
    })

    it('handles hymns without token data', () => {
      const hinario = { hinos: [{}] }
      const result = collectTokenSet(hinario)
      expect(result.size).to.equal(0)
    })
  })
})
