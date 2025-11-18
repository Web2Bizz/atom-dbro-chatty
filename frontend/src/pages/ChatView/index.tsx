import { Header } from './ui'
import './style.css'

const ChatView = () => {
  return (
    <>
      <Header />
      <div className='chat-view'>
        <div className='chat-view__messages'></div>
        <div className='chat-view__form'>
          <form>
            <textarea
              className='chat-view__message'
              placeholder='your message here'
            ></textarea>
            <button className='chat-view__submit'>
              send
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default ChatView
