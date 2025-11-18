import { useForm } from 'react-hook-form'
import { Inputfield, Button, Link } from '@ui'
import './style.css'

type TRegistrationForm = {
  login: string
  nickname: string
  password: string
  confirmPassword: string
}

const Registration = () => {
  const { reset, handleSubmit, register } =
    useForm<TRegistrationForm>()

  const onFormSubmit = (
    data: TRegistrationForm,
  ) => {
    console.log(data)

    reset()
  }

  return (
    <>
      <h1>Regist page</h1>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Inputfield
          input={{ ...register('login') }}
          title='Your login'
          message='original login'
        />
        <Inputfield
          input={{ ...register('nickname') }}
          title='Your nickname'
          message='crazy nick here'
        />
        <Inputfield
          input={{ ...register('password') }}
          title='Password'
        />
        <Inputfield
          input={{
            ...register('confirmPassword'),
          }}
          title='Confirm password here'
        />
        <Button label='Regist now!' />
        <Link to='/login' label='Have account' />
      </form>
    </>
  )
}

export default Registration
