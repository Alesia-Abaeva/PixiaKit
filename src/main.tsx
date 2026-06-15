import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { extensions } from 'pixi.js-legacy'
import { EventSystem } from '@pixi/events'

extensions.add(EventSystem)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
