import { Button, Inputfield, Link } from '@ui'

const CreateChat = () => {
  return (
    <>
      <h1>creating chat</h1>
      <form>
        <Inputfield
          title='Chat name'
          message='chat name should be not empty!'
        />
        <Button label='Create new chat!' />
        <Link
          label='Go to chat list'
          to='/chat-list'
        />
      </form>
    </>
  )
}

export default CreateChat
