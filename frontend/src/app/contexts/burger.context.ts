import { createContext } from 'react'

export type TBurgerContext = {
  isOpen: boolean
  setIsOpen: (value: boolean) => null
}

const burgerContext = {
  isOpen: false,
  setIsOpen: (value: boolean) => null,
}

const BurgerContext =
  createContext<TBurgerContext>(burgerContext)

export default BurgerContext
