/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY25xaXV3cnB6Z3hoemRhdmFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA5NjY0NCwiZXhwIjoyMDkwNjcyNjQ0fQ.f4vB370svyMzRBY44WlAFngwhY8x3IoUyfqr2SR-DpU: string
  readonly eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY25xaXV3cnB6Z3hoemRhdmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTY2NDQsImV4cCI6MjA5MDY3MjY0NH0.m1pphSqrLPWAWs6Ivqe_gSZ5rJmr74A7OycijHIG3B4: string
  readonly BASE_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
