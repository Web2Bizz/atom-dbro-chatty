import { useEffect, useState, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const user = localStorage.getItem('user')
    const token = localStorage.getItem('accessToken')

    if (user && token) {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  if (isAuthenticated === null) {
    // Пока проверяем, показываем загрузку
    return <div>Загрузка...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to='/login' replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
