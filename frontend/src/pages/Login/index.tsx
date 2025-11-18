import { useForm } from 'react-hook-form'
import { Inputfield, Button, Link } from '@ui'
import './style.css'

type TLoginForm = {
  login: string
  password: string
}

const Login = () => {
  const {
    handleSubmit,
    register,
    formState,
    reset,
  } = useForm<LoginForm>()

  const onFormSubmit = (data: TLoginForm) => {
    console.log(data)

    reset()
  }

  return (
    <>
      <h1>Login page</h1>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Inputfield
          input={{ ...register('login') }}
          title='Your login'
        />
        <Inputfield
          input={{ ...register('password') }}
          title='Your password'
        />
        <Button label='Login now!' />
      </form>
      <Link to='/reg' label='Regist new' />
    </>
  )
}

export default Login
