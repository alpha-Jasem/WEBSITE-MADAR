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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
