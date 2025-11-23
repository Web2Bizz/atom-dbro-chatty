import { useNavigate } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import { User } from '../types'

function LoginPage() {
  const navigate = useNavigate()

  const handleLogin = (user: User) => {
    // После успешного входа перенаправляем на главную страницу
    navigate('/')
  }

  return <LoginForm onLogin={handleLogin} />
}

export default LoginPage
