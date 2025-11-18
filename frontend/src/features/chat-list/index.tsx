import { useNavigate } from 'react-router-dom'
import { ChatApi } from '@api'
import './style.css'

const ChatList = () => {
  const navigate = useNavigate()
  const data = ChatApi.getAll()

  return (
    <ul className='chat-list__view'>
      {data.map((item, key: number) => (
        <li
          key={key}
          className='chat-list__item'
          onClick={() =>
            navigate(`/chat/${item.id}`)
          }
        >
          <img
            src=''
            className='chat-list__item-image'
          />
          <div className='chat-list__item-info'>
            <span className='chat-list__item-title'>
              {item.name}
            </span>
            <span className='chat-list__item-isers'>
              {item.users}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ChatList
