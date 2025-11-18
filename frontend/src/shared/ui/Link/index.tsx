import { useNavigate } from 'react-router-dom'
import './style.css'

export type TLinkProps = {
  label?: string
  to?: string
  type?: 'react' | 'html' | undefined
}

const Link = (props: TLinkProps) => {
  const navigate = useNavigate()
  const { label, to, type } = props

  return type !== 'react' ? (
    <span
      className='link'
      onClick={() => navigate(to)}
    >
      {label}
    </span>
  ) : (
    <a href={to}>{label}</a>
  )
}

export default Link
