import { useNavigate } from 'react-router-dom'
import { Header, Container } from '@ui'
import './style.css'

const Main = () => {
  const navigate = useNavigate()

  return (
    <>
      <h1>Hello and welcome!</h1>
      <h2>Let's try Chat-X</h2>
      <p>
        developed by{' '}
        <a href='https://github.com/letnull19a'>
          @letnull19a
        </a>
      </p>
      <div>
        <button onClick={() => navigate('/reg')}>
          Registration
        </button>
        <button
          onClick={() => navigate('/login')}
        >
          Login now!
        </button>
      </div>
    </>
  )
}

export default Main
