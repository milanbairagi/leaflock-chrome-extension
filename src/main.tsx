import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthCredentialProvider } from './contexts/useAuthCredential.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthCredentialProvider>
      <App />
    </AuthCredentialProvider>
  </StrictMode>,
)
