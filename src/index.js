import $ from 'jquery'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth'
import { setupUI, getWordcloudOptions } from './ui.js'
import { plotWordcloud } from './wordcloud.js'
import {
  collectTokenSet,
  computeCorpusStats,
  updateCorpusStats,
  updateStats,
  updateSimilarHinarios
} from './stats.js'
import { computeAuthorSets, drawAuthorNetwork } from './network.js'

window.jQuery = $

// TODO: replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  appId: 'YOUR_APP_ID'
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

function updateAuthUI (user) {
  if (user) {
    $('#loginContainer').hide()
    $('#app').show()
  } else {
    $('#app').hide()
    $('#loginContainer').show()
  }
}

$('#googleSignIn').on('click', () => {
  signInWithPopup(auth, provider).catch(err => console.error(err))
})

onAuthStateChanged(auth, user => updateAuthUI(user))

let currentHinario
function updateWordcloud () {
  if (!currentHinario) return
  plotWordcloud(currentHinario, getWordcloudOptions())
}

setupUI(updateWordcloud)

let hinarioSets = []
let corpusStats
let authorSets

$.getJSON('hinos/td.json', function (data) {
  // drop hymnals that lack tokens or have the unwanted title
  data.hinarios = data.hinarios.filter(h => {
    if (h.title === 'O Mestre Diz') return false
    return h.hinos.some(hi => hi.tokens && hi.tokens.pt && hi.tokens.pt.length)
  })
  $('<label/>', { for: 'mselect' }).html('select hymnal: ').appendTo('#selectDiv')
  const s = $('<select/>', { id: 'mselect' }).appendTo('#selectDiv')
    .attr('title', 'Select hymn to analyze.')
    .on('change', aself => {
      const ii = aself.currentTarget.value
      if (ii === '-1') return
      currentHinario = data.hinarios[ii]
      updateWordcloud()
      updateSimilarHinarios(Number(ii), hinarioSets, data.hinarios)
      updateStats(currentHinario)
    })

  window.adata = data
  hinarioSets = data.hinarios.map(h => collectTokenSet(h))
  corpusStats = computeCorpusStats(data.hinarios)
  authorSets = computeAuthorSets(data.hinarios)
  updateCorpusStats(corpusStats)
  const redrawNetwork = () => drawAuthorNetwork(authorSets)
  document.addEventListener('fullscreenchange', redrawNetwork)
  window.addEventListener('resize', redrawNetwork)
  $('#thresholdValue').text($('#jaccardThreshold').val())
  $('#jaccardThreshold').on('input change', () => {
    $('#thresholdValue').text($('#jaccardThreshold').val())
    redrawNetwork()
  })
  redrawNetwork()
  data.hinarios.forEach((i, count) => {
    const aname = `${i.title} - ${i.person}`
    s.append($('<option/>', { class: 'pres' }).val(count).html(aname))
    $('#loading').hide()
  })
  currentHinario = data.hinarios[0]
  updateWordcloud()
  updateSimilarHinarios(0, hinarioSets, data.hinarios)
  updateStats(currentHinario)
})
