import { createContext } from 'react'

export type TThemeContext = {
  theme: string
  setTheme: (value: string) => null
}

const themeContext = {
  theme: 'default',
  setTheme: (value: string) => null,
}

const ThemeContext =
  createContext<TThemeContext>(themeContext)

export default ThemeContext
