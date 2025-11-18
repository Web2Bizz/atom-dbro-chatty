import { JSX, useState } from 'react'
import { ThemeContext } from '@contexts'

type TThemeWrapper = {
  children?: JSX.Element
}

const ThemeWrapper = (props: TThemeWrapper) => {
  const { children } = props

  const [theme, setTheme] =
    useState<TThemeContext>('default')

  const themeValues = {
    theme: theme,
    setTheme: setTheme,
  }

  return (
    <ThemeContext.Provider value={themeValues}>
      <div className={`theme-${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export default ThemeWrapper
