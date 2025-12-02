import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const applyThemeClass = () => {
  if (typeof window === 'undefined') return

  const storedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark

  document.documentElement.classList.toggle('dark', shouldUseDark)
}

applyThemeClass()

const root = createRoot(document.getElementById('root'))
root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(App)
  )
)
