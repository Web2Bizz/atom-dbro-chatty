import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BurgerContext,
  type TBurgerContext,
} from '@contexts'
import data from './menu-items.json'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './style.css'

type TBurgerMenuItemProps = {
  title: string
  path: string
}

const BurgerMenuItem = (
  props: TBurgerMenuItemProps,
) => {
  const navigate = useNavigate()
  const { title, path } = props
  const burgerMenuContext =
    useContext<TBurgerContext>(BurgerContext)

  const onHandleClick = () => {
    navigate(path)
    burgerMenuContext.setIsOpen(false)
  }

  return (
    <li
      className='burger-menu__item'
      onClick={onHandleClick}
    >
      {title}
    </li>
  )
}

const BurgerMenu = () => {
  const menuItems =
    data as Array<TBurgerMenuItemProps>
  const burgerContext =
    useContext<TBurgerContext>(BurgerContext)

  const menuAttributes = {
    onClick: () => {
      if (!burgerContext) return

      burgerContext.setIsOpen(
        !burgerContext.isOpen,
      )
    },
    className: 'burger-button',
  }

  return burgerContext.isOpen ? (
    <div className='burger-menu'>
      <button
        {...menuAttributes}
        className='burger-button_close'
      >
        <FontAwesomeIcon icon='fa-solid fa-xmark' />
      </button>
      <ul className='burger-menu__container'>
        {menuItems.map((item, id) => (
          <BurgerMenuItem {...item} key={id} />
        ))}
      </ul>
    </div>
  ) : null
}

export default BurgerMenu
