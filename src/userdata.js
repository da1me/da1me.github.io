import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteField,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { firebaseApp } from './auth.js'

// One document per user: users/{uid} = { favorites: [key], notes: { key: text } }.
// The corpus is only 64 hymnals, so a single document keeps reads to one per
// sign-in and avoids a per-hymnal subcollection for no benefit.
let db
let uid
let cache = { favorites: [], notes: {} }

/** Stable key for a hymnal; title and author together are unique. */
export function hymnalKey (hinario) {
  return `${hinario.title}__${hinario.person}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function userRef () {
  return doc(db, 'users', uid)
}

/**
 * Point the store at a signed-in user and load their data, or clear it on
 * sign-out. Resolves with the loaded snapshot.
 */
export function loadUserData (user) {
  cache = { favorites: [], notes: {} }
  uid = user && user.uid

  if (!uid) return Promise.resolve(cache)

  const app = firebaseApp()
  if (!app) return Promise.resolve(cache)
  if (!db) db = getFirestore(app)

  return getDoc(userRef())
    .then(snap => {
      const data = snap.exists() ? snap.data() : {}
      cache = {
        favorites: Array.isArray(data.favorites) ? data.favorites : [],
        notes: data.notes && typeof data.notes === 'object' ? data.notes : {}
      }
      return cache
    })
    .catch(err => {
      console.warn('Could not load your saved data:', err)
      return cache
    })
}

export function isSignedIn () {
  return Boolean(uid)
}

export function isFavorite (key) {
  return cache.favorites.includes(key)
}

export function favoriteKeys () {
  return [...cache.favorites]
}

export function getNote (key) {
  return cache.notes[key] || ''
}

/** Toggle a favourite. Resolves with the new state; rolls back on failure. */
export function toggleFavorite (key) {
  if (!uid) return Promise.reject(new Error('not signed in'))

  const nowFavorite = !isFavorite(key)
  // Update the cache first so the UI responds immediately.
  cache.favorites = nowFavorite
    ? [...cache.favorites, key]
    : cache.favorites.filter(k => k !== key)

  return setDoc(
    userRef(),
    { favorites: nowFavorite ? arrayUnion(key) : arrayRemove(key) },
    { merge: true }
  )
    .then(() => nowFavorite)
    .catch(err => {
      cache.favorites = nowFavorite
        ? cache.favorites.filter(k => k !== key)
        : [...cache.favorites, key]
      throw err
    })
}

/** Persist a note. An empty note removes the key rather than storing "". */
export function saveNote (key, text) {
  if (!uid) return Promise.reject(new Error('not signed in'))

  const trimmed = text.trim()
  const previous = cache.notes[key]
  if (trimmed) cache.notes[key] = trimmed
  else delete cache.notes[key]

  // merge:true deep-merges maps, so this only touches the one note key, and
  // deleteField() drops an emptied note instead of leaving "" behind.
  return setDoc(
    userRef(),
    { notes: { [key]: trimmed || deleteField() } },
    { merge: true }
  )
    .catch(err => {
      if (previous === undefined) delete cache.notes[key]
      else cache.notes[key] = previous
      throw err
    })
}
