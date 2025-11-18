import './style.css'

export type TInputProps = {
  placeholder?: string
  value?: string
}

export type TInputfieldProps = {
  message?: string
  title?: string
  input?: InputHTMLAttributes
}

const Inputfield = (props: TInputfieldProps) => {
  const { message, title, input } = props

  return (
    <div className='inputfield'>
      <p className='inputfield__title'>{title}</p>
      <input
        className='inputfield__input'
        {...input}
      />
      <span className='inputfield__message'>
        {message}
      </span>
    </div>
  )
}

export default Inputfield
