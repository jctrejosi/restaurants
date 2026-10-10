import React from 'react'
import ReactDOM from 'react-dom/client'
import ClientApp from './ClientApp'
import './booking/styles.css'
import './orders/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClientApp />
  </React.StrictMode>,
)
