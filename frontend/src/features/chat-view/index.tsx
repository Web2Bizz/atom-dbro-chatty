import { useParams } from 'react-router-dom'
import { ChatApi } from '@api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import './style.css'

const ChatViewFeature = () => {
  const params = useParams()

  const [chatData, setChatData] = useState({})

  useEffect(() => {
    if (!params.id) return

    setChatData(
      ChatApi.getById(Number.parseInt(params.id)),
    )
  }, [params.id])

  return (
    <div className='chat-view-feature'>
      <div className='chat-view-feature__header'>
        {chatData?.name}
      </div>
      <div className='chat-view-feature__main'></div>
      <div className='chat-view-feature__form'>
        <form>
          <textarea placeholder='type message here'></textarea>
          <button>
            <FontAwesomeIcon icon='fa-solid fa-arrow-up' />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatViewFeature
