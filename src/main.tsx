import './index.css'

import { EventSystem } from '@pixi/events'
import { extensions } from 'pixi.js-legacy'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

extensions.add(EventSystem)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
