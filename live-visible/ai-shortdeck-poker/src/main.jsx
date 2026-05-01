import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Danmu from './danmuka.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Danmu />
  </StrictMode>,
)
