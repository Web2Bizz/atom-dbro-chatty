import { JSX, useState } from 'react'
import { BurgerContext } from '@contexts'
import {
  Header,
  Container,
  BurgerMenu,
} from '@ui'
import './style.css'

export type TDefaultProps = {
  children: JSX.Element
}

const Default = (props: TDefaultProps) => {
  const { children } = props
  const [isOpen, setIsOpen] =
    useState<boolean>(false)

  return (
    <>
      <BurgerContext.Provider
        value={{ isOpen, setIsOpen }}
      >
        <Header />
        <BurgerMenu />
        <Container>
          <div className='content'>
            {children}
          </div>
        </Container>
      </BurgerContext.Provider>
    </>
  )
}

export default Default
