import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ApiKeysPage.css'
import { User, ApiKey } from '../types'
import { apiRequestJson, apiRequest } from '../utils/api'
import CreateApiKeyModal from '../components/CreateApiKeyModal'

function ApiKeysPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        navigate('/login')
      }
    }
    fetchApiKeys()
  }, [navigate])

  const fetchApiKeys = async () => {
    try {
      const data = await apiRequestJson<ApiKey[]>('/auth/api-keys')
      setApiKeys(data)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        return
      }
      setError('Не удалось загрузить список токенов')
      setLoading(false)
    }
  }

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот токен? Это действие нельзя отменить.')) {
      return
    }

    try {
      await apiRequest(`/auth/api-keys/${id}/delete`, {
        method: 'DELETE',
      })
      setApiKeys(apiKeys.filter((key) => key.id !== id))
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        return
      }
      alert('Не удалось удалить токен')
    }
  }

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Вы уверены, что хотите отозвать этот токен? После отзыва токен перестанет работать.')) {
      return
    }

    try {
      await apiRequest(`/auth/api-keys/${id}`, {
        method: 'DELETE',
      })
      setApiKeys(apiKeys.map((key) => (key.id === id ? { ...key, isActive: false } : key)))
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        return
      }
      alert('Не удалось отозвать токен')
    }
  }

  const handleApiKeyCreated = () => {
    fetchApiKeys()
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/login')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не ограничен'
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU')
  }

  if (!user) {
    return null
  }

  return (
    <div className='api-keys-page'>
      <div className='api-keys-container'>
        <div className='api-keys-header'>
          <div className='header-left'>
            <button onClick={() => navigate('/')} className='back-button'>
              ← Назад
            </button>
            <h1>API Токены</h1>
          </div>
          <div className='header-right'>
            <span className='username'>{user.username}</span>
            <button onClick={handleLogout} className='logout-button'>
              Выйти
            </button>
          </div>
        </div>

        <div className='api-keys-content'>
          <div className='api-keys-info'>
            <p>
              API токены позволяют отправлять сообщения в чаты через REST API без использования
              веб-интерфейса. Создайте токен и используйте его в заголовке <code>X-API-Key</code> или{' '}
              <code>Authorization: Bearer</code>.
            </p>
          </div>

          <div className='create-token-section'>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className='create-token-button'
            >
              + Создать новый токен
            </button>
          </div>

          {loading ? (
            <div className='loading'>Загрузка...</div>
          ) : error ? (
            <div className='error'>{error}</div>
          ) : (
            <div className='api-keys-list'>
              {apiKeys.length === 0 ? (
                <div className='no-keys'>
                  <p>У вас пока нет токенов</p>
                  <p className='hint'>Создайте первый токен, чтобы начать использовать API</p>
                </div>
              ) : (
                apiKeys.map((key) => (
                  <div key={key.id} className='api-key-item'>
                    <div className='api-key-header'>
                      <div className='api-key-name'>
                        <h3>{key.name || 'Без названия'}</h3>
                        <span className={`status-badge ${key.isActive ? 'active' : 'revoked'}`}>
                          {key.isActive ? 'Активен' : 'Отозван'}
                        </span>
                      </div>
                      <div className='api-key-actions'>
                        {key.isActive && (
                          <button
                            onClick={() => handleRevokeApiKey(key.id)}
                            className='revoke-button'
                          >
                            Отозвать
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteApiKey(key.id)}
                          className='delete-button'
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    <div className='api-key-details'>
                      <div className='detail-row'>
                        <span className='detail-label'>ID:</span>
                        <span className='detail-value'>{key.id}</span>
                      </div>
                      <div className='detail-row'>
                        <span className='detail-label'>Создан:</span>
                        <span className='detail-value'>{formatDate(key.createdAt)}</span>
                      </div>
                      {key.expiresAt && (
                        <div className='detail-row'>
                          <span className='detail-label'>Истекает:</span>
                          <span className='detail-value'>{formatDate(key.expiresAt)}</span>
                        </div>
                      )}
                      {key.lastUsedAt && (
                        <div className='detail-row'>
                          <span className='detail-label'>Последнее использование:</span>
                          <span className='detail-value'>{formatDate(key.lastUsedAt)}</span>
                        </div>
                      )}
                      {key.scopes && key.scopes.length > 0 && (
                        <div className='detail-row'>
                          <span className='detail-label'>Разрешения:</span>
                          <span className='detail-value'>{key.scopes.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onApiKeyCreated={handleApiKeyCreated}
      />
    </div>
  )
}

export default ApiKeysPage

