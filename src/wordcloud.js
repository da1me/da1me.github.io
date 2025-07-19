import WordCloud from 'wordcloud'
import { stopWords_ } from './stats.js'
import { showWordDetail } from './ui.js'

export function plotWordcloud (hinario) {
  function getTokens (tokens) {
    if (tokens && 'pt' in tokens) {
      return tokens.pt
    }
    return []
  }
  const tokens = hinario.hinos.reduce((a, h) => [...a, ...getTokens(h.tokens)], [])
  const tokensLower = tokens.map(t => t.toLowerCase())
  const tokensSet = [...new Set(tokensLower)].filter(t => !stopWords_.includes(t))
  const tokensHist = tokensSet.map(t => {
    const count = tokensLower.filter(tt => t === tt).length
    return { t, count }
  })
  tokensHist.sort((a, b) => a.count > b.count ? -1 : 1)
  const list = tokensHist.map(i => [i.t, i.count])
  WordCloud(document.getElementById('contentCanvas'), {
    list,
    weightFactor: 100 / tokensHist[0].count,
    click: showWordDetail
  })
  window.th = { tokensHist, list }
}
