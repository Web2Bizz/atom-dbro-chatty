import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './global/style.css'
import eruda from 'eruda'

if (import.meta.env.MODE === 'development') {
  eruda.init()
}

createRoot(
  document.getElementById('root')!,
).render(<App />)
