import { useNavigate } from 'react-router-dom'
import {
  useContext,
  useState,
  useEffect,
} from 'react'
import {
  SocketContext,
  type TSocketContext,
  ConnectionStatus,
  BurgerContext,
  type TBurgerContext,
} from '@contexts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './style.css'

/**
 * TODO: move this in separate component: Statusbar
 * */
const StatusBar = () => {
  const socket = useContext<TSocketContext>(
    SocketContext,
  )

  const [className, setClassName] =
    useState<string>('status-wait')

  useEffect(() => {
    switch (socket.status) {
      case ConnectionStatus.CONNECTED:
        setClassName('status-connected')
        break
      case ConnectionStatus.WAITING:
        setClassName('status-wait')
        break
      case ConnectionStatus.ERROR:
        setClassName('status-error')
        break
    }
  }, [socket.status])

  return <div className={className}></div>
}

const Header = () => {
  const navigate = useNavigate()

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

  return (
    <header>
      <button
        {...menuAttributes}
        className='burger-button'
      >
        <FontAwesomeIcon icon='fa-solid fa-bars' />
      </button>
      <span
        className='logo'
        onClick={() => navigate('/')}
      >
        chat-x
      </span>
      <StatusBar />
    </header>
  )
}

export default Header
