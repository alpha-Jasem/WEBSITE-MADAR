import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Clear any Supabase sessions left in localStorage (migrated to sessionStorage)
const SB_KEY = 'sb-aacnqiuwrpzgxhzdavaq-auth-token'
if (localStorage.getItem(SB_KEY)) {
  localStorage.removeItem(SB_KEY)
  localStorage.removeItem(`${SB_KEY}-code-verifier`)
}

// MSW mock API — backs the dashboard-v3 demo apps (Blog/Notes/Tickets) only.
// Fired without blocking initial render: `onUnhandledRequest: 'bypass'` means every
// real request (Supabase, ElevenLabs, Cal.com, etc.) passes through untouched, and by
// the time a user navigates to a lazy-loaded demo page the worker is already registered.
import('./dashboard-v3/api/mocks/browser').then(({ worker }) =>
  worker.start({ onUnhandledRequest: 'bypass' })
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
