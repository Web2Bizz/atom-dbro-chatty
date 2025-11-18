import { JSX } from 'react'
import './style.css'

export type TContainerProps = {
  children?: JSX.Element
}

const Container = (props: TContainerProps) => {
  const { children } = props

  return (
    <div className='container'>{children}</div>
  )
}

export default Container
