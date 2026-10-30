import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'
import ConfigError from './components/others/ConfigError.jsx'
import { ApiContext } from './api/ApiContext'
import { ApiConfigError, createApi } from './api'

let api = null
let configError = null
try {
  api = createApi()
} catch (error) {
  if (!(error instanceof ApiConfigError)) throw error
  configError = error.message
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {configError ? <ConfigError message={configError} /> : (
      <ApiContext.Provider value={api}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ApiContext.Provider>
    )}
  </StrictMode>,
)
