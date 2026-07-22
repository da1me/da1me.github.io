import $ from 'jquery'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyD_ahGYl5u9cWHVKRFtKRggyCgwHJ2xZiI',
  authDomain: 'da1me-15fcd.firebaseapp.com',
  projectId: 'da1me-15fcd',
  storageBucket: 'da1me-15fcd.firebasestorage.app',
  messagingSenderId: '87456203245',
  appId: '1:87456203245:web:c4e308a3452964c94e67e4',
  measurementId: 'G-37Z7KKPGQT'
}

let app
let auth

/** The initialised Firebase app, or undefined if setup failed. */
export function firebaseApp () {
  return app
}

// Firebase error codes are not user-facing; map the ones people actually hit.
const MESSAGES = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/weak-password': 'Passwords need to be at least 6 characters.',
  'auth/email-already-in-use': 'That email already has an account. Try signing in instead.',
  // Projects with email-enumeration protection return one generic code for a
  // wrong password, an unknown account, and a malformed credential alike.
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/user-disabled': 'That account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network problem — check your connection.',
  'auth/popup-closed-by-user': 'Sign-in window closed before finishing.',
  'auth/unauthorized-domain': 'This domain is not authorised in the Firebase console.',
  'auth/operation-not-allowed': 'That sign-in method is disabled in the Firebase console.'
}

const messageFor = err =>
  MESSAGES[err && err.code] || 'Something went wrong. Please try again.'

function renderSignedOut () {
  $('#userChip').attr('hidden', true)
  $('#googleSignIn').removeAttr('hidden').text('Sign in')
}

function renderSignedIn (user) {
  $('#googleSignIn').attr('hidden', true)
  $('#userName').text(user.displayName || user.email || 'Signed in')
  const avatar = $('#userAvatar')
  if (user.photoURL) avatar.attr('src', user.photoURL).removeAttr('hidden')
  else avatar.attr('hidden', true)
  $('#userChip').removeAttr('hidden')
}

function setBusy (busy) {
  $('#authSubmit, #googleAuthBtn, #authReset').prop('disabled', busy)
  $('#authSubmit').text(busy ? 'Working…' : $('#authSubmit').data('label'))
}

function showError (message) {
  $('#authNotice').attr('hidden', true)
  $('#authError').text(message).removeAttr('hidden')
}

function showNotice (message) {
  $('#authError').attr('hidden', true)
  $('#authNotice').text(message).removeAttr('hidden')
}

function clearMessages () {
  $('#authError, #authNotice').attr('hidden', true).text('')
}

export function openAuthModal () {
  clearMessages()
  $('#authModal').removeAttr('hidden')
  $('#authEmail').trigger('focus')
}

export function closeAuthModal () {
  $('#authModal').attr('hidden', true)
}

function setMode (mode) {
  const signup = mode === 'signup'
  $('.auth-tab').removeClass('is-active').filter(`[data-mode="${mode}"]`).addClass('is-active')
  $('#authTitle').text(signup ? 'Create account' : 'Sign in')
  $('#authSubmit').data('label', signup ? 'Create account' : 'Sign in').text(
    signup ? 'Create account' : 'Sign in'
  )
  $('#authPassword').attr('autocomplete', signup ? 'new-password' : 'current-password')
  $('#authReset').toggle(!signup)
  $('#authForm').data('mode', mode)
  clearMessages()
}

/**
 * Wire up all sign-in controls. `onUserChange(user | null)` fires whenever the
 * signed-in user changes, including once on startup.
 *
 * Sign-in is a convenience, never a gate: the corpus is public, so any failure
 * here leaves the site fully usable and only the account controls degrade.
 */
export function setupAuth (onUserChange = () => {}) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (err) {
    console.warn('Auth unavailable:', err)
    $('#googleSignIn, #notesSignIn').attr('hidden', true)
    onUserChange(null)
    return
  }

  const provider = new GoogleAuthProvider()

  const googleSignIn = () => {
    clearMessages()
    setBusy(true)
    signInWithPopup(auth, provider)
      .then(closeAuthModal)
      .catch(err => {
        // Some browsers block the popup outright; a redirect always works.
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
          return signInWithRedirect(auth, provider)
        }
        console.warn('Sign-in failed:', err)
        showError(messageFor(err))
      })
      .finally(() => setBusy(false))
  }

  // Completes a redirect sign-in started on a previous page load.
  getRedirectResult(auth).catch(err => console.warn('Redirect sign-in failed:', err))

  $('#googleSignIn, #notesSignIn').on('click', openAuthModal)
  $('#googleAuthBtn').on('click', googleSignIn)

  $('#authModal .close').on('click', closeAuthModal)
  $('#authModal').on('click', e => {
    if (e.target.id === 'authModal') closeAuthModal()
  })
  $(document).on('keydown', e => {
    if (e.key === 'Escape') closeAuthModal()
  })

  $('.auth-tab').on('click', e => setMode($(e.currentTarget).data('mode')))
  setMode('signin')

  $('#authForm').on('submit', e => {
    e.preventDefault()
    const email = $('#authEmail').val().trim()
    const password = $('#authPassword').val()
    if (!email) return showError('Please enter your email address.')
    if (!password) return showError('Please enter your password.')

    const signup = $('#authForm').data('mode') === 'signup'
    const action = signup
      ? createUserWithEmailAndPassword(auth, email, password)
      : signInWithEmailAndPassword(auth, email, password)

    setBusy(true)
    action
      .then(() => {
        $('#authForm')[0].reset()
        closeAuthModal()
      })
      .catch(err => {
        console.warn('Email sign-in failed:', err)
        showError(messageFor(err))
      })
      .finally(() => setBusy(false))
  })

  $('#authReset').on('click', () => {
    const email = $('#authEmail').val().trim()
    if (!email) return showError('Enter your email above, then tap reset.')
    setBusy(true)
    sendPasswordResetEmail(auth, email)
      .then(() => showNotice(`Password reset link sent to ${email}.`))
      .catch(err => {
        console.warn('Password reset failed:', err)
        showError(messageFor(err))
      })
      .finally(() => setBusy(false))
  })

  $('#signOut').on('click', () => {
    signOut(auth).catch(err => console.warn('Sign-out failed:', err))
  })

  onAuthStateChanged(
    auth,
    user => {
      if (user) renderSignedIn(user)
      else renderSignedOut()
      onUserChange(user || null)
    },
    err => {
      console.warn('Auth state error:', err)
      renderSignedOut()
      onUserChange(null)
    }
  )
}
