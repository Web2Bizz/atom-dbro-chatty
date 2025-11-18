import {
  useNavigate,
  useParams,
} from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { ChatApi } from '@api'
import style from './style.module.css'

const Header = () => {
  const navigate = useNavigate()
  const params = useParams()

  const [chatData, setChatData] = useState({})

  useEffect(() => {
    if (!params.id) return

    setChatData(
      ChatApi.getById(Number.parseInt(params.id)),
    )
  }, [params.id])

  return (
    <div className={style.header}>
      <button
        onClick={() => navigate('/chat')}
        className={style.buttonPrev}
      >
        <FontAwesomeIcon icon='fa-solid fa-chevron-left' />
      </button>
      <div className={style.chatInfo}>
        <span>{chatData.name}</span>
        <span>
          {chatData.online} members active
        </span>
      </div>
    </div>
  )
}

export default Header
