import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PhysicalBoardsProvider } from './hooks/PhysicalBoardsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhysicalBoardsProvider>
      <App />
    </PhysicalBoardsProvider>
  </StrictMode>,
)
