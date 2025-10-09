import ReactDOM from 'react-dom/client'
import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ApiDataProvider } from './contexts/ApiDataContext.tsx'
import { Router } from './Router.tsx'

import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ApiDataProvider>
          <Router />
        </ApiDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
