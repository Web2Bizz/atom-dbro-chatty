import { useEffect, useState } from 'react'
import { ChatList } from '@features'
import { BurgerContext } from '@contexts'
import {
  Container,
  Header,
  BurgerMenu,
} from '@ui'
import './style.css'
import {
  Outlet,
  useParams,
} from 'react-router-dom'

const ChatView = () => {
  const params = useParams()

  const [isChatOpen, setIsChatOpen] =
    useState<boolean>(false)

  useEffect(() => {
    if (!params) return

    setIsChatOpen(params.id !== undefined)
  }, [params])

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
          <div className='chat-view'>
            <div className='chat-view_list'>
              <ChatList />
            </div>
            <div className='chat-view_messanger'>
              {isChatOpen ? (
                <Outlet />
              ) : (
                <p className='chat-view_messanger-no-message'>
                  Chat not open
                </p>
              )}
            </div>
          </div>
        </Container>
      </BurgerContext.Provider>
    </>
  )
}

export default ChatView
