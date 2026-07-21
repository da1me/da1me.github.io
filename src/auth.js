import $ from 'jquery'
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

function renderSignedOut () {
  $('#userChip').attr('hidden', true)
  $('#googleSignIn').removeAttr('hidden').text('Sign in')
}

function renderSignedIn (user) {
  $('#googleSignIn').attr('hidden', true)
  $('#userName').text(user.displayName || user.email || 'Signed in')
  const avatar = $('#userAvatar')
  if (user.photoURL) {
    avatar.attr('src', user.photoURL).removeAttr('hidden')
  } else {
    avatar.attr('hidden', true)
  }
  $('#userChip').removeAttr('hidden')
}

// Sign-in is a convenience, never a gate: the corpus is public, so any failure
// here leaves the site fully usable and only the header control degrades.
export function setupAuth () {
  let auth
  try {
    const app = initializeApp(firebaseConfig)
    auth = getAuth(app)
  } catch (err) {
    console.warn('Auth unavailable:', err)
    $('#googleSignIn').attr('hidden', true)
    return
  }

  const provider = new GoogleAuthProvider()

  $('#googleSignIn').on('click', () => {
    signInWithPopup(auth, provider).catch(err => {
      console.warn('Sign-in failed:', err)
      renderSignedOut()
    })
  })

  $('#signOut').on('click', () => {
    signOut(auth).catch(err => console.warn('Sign-out failed:', err))
  })

  onAuthStateChanged(
    auth,
    user => (user ? renderSignedIn(user) : renderSignedOut()),
    err => {
      console.warn('Auth state error:', err)
      renderSignedOut()
    }
  )
}
