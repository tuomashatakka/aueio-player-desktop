import { createRoot } from 'react-dom/client'


const mount = document.querySelector('.shell main')

if (mount)
  createRoot(mount).render(null)
