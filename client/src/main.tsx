import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Poppins auto-hospedada (subconjunto latino), sem depender do Google Fonts:
// a aplicação carrega a fonte mesmo offline e não expõe requisições a terceiros.
import '@fontsource/poppins/latin-300.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'

import './styles/index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
