import WordCloud from 'wordcloud'
import { stopWords_ } from './stats.js'
import { showWordDetail } from './ui.js'

export function plotWordcloud (hinario, opts = {}) {
  const { maxWords, includeStopWords = false } = opts

  function getTokens (tokens) {
    if (tokens && 'pt' in tokens) {
      return tokens.pt
    }
    return []
  }

  const tokens = hinario.hinos.reduce((a, h) => [...a, ...getTokens(h.tokens)], [])
  let tokensLower = tokens.map(t => t.toLowerCase())
  if (!includeStopWords) {
    tokensLower = tokensLower.filter(t => !stopWords_.includes(t))
  }

  const freq = {}
  tokensLower.forEach(t => { freq[t] = (freq[t] || 0) + 1 })
  let tokensHist = Object.entries(freq).map(([t, count]) => ({ t, count }))
  tokensHist.sort((a, b) => (a.count > b.count ? -1 : 1))
  const limit = maxWords || tokensHist.length
  tokensHist = tokensHist.slice(0, limit)
  const list = tokensHist.map(i => [i.t, i.count])

  if (!tokensHist.length) {
    WordCloud(document.getElementById('contentCanvas'), { list: [] })
    return
  }

  WordCloud(document.getElementById('contentCanvas'), {
    list,
    weightFactor: 100 / tokensHist[0].count,
    click: showWordDetail
  })
  window.th = { tokensHist, list }
}
