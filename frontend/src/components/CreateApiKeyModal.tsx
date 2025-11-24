import { useState } from 'react'
import { useForm } from 'react-hook-form'
import './CreateApiKeyModal.css'
import { apiRequestJson } from '../utils/api'
import { CreateApiKeyResponse } from '../types'

interface CreateApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onApiKeyCreated: () => void
}

interface FormData {
  name?: string
  expiresInDays?: number
}

function CreateApiKeyModal({
  isOpen,
  onClose,
  onApiKeyCreated,
}: CreateApiKeyModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState<CreateApiKeyResponse | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      const requestBody: any = {}
      if (data.name && data.name.trim()) {
        requestBody.name = data.name.trim()
      }
      if (data.expiresInDays && data.expiresInDays > 0) {
        requestBody.expiresInDays = data.expiresInDays
      }

      const response = await apiRequestJson<CreateApiKeyResponse>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      setCreatedApiKey(response)
      onApiKeyCreated()
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        return
      }
      setError(err instanceof Error ? err.message : 'Не удалось создать токен')
      setLoading(false)
    }
  }

  const handleCopyKey = () => {
    if (createdApiKey?.key) {
      navigator.clipboard
        .writeText(createdApiKey.key)
        .then(() => {
          setKeyCopied(true)
          setTimeout(() => setKeyCopied(false), 2000)
        })
        .catch(() => {
          // Fallback для старых браузеров
          const input = document.createElement('input')
          input.value = createdApiKey.key!
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
          setKeyCopied(true)
          setTimeout(() => setKeyCopied(false), 2000)
        })
    }
  }

  const handleClose = () => {
    reset()
    setError('')
    setCreatedApiKey(null)
    setKeyCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='modal-overlay' onClick={handleClose}>
      <div className='modal-content api-key-modal' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Создать новый токен</h2>
          <button className='modal-close' onClick={handleClose}>
            ×
          </button>
        </div>

        {createdApiKey ? (
          <div className='api-key-created'>
            <div className='success-icon'>✓</div>
            <h3>Токен успешно создан!</h3>
            {createdApiKey.name && <p className='api-key-name'>{createdApiKey.name}</p>}
            <div className='api-key-warning'>
              <strong>⚠️ Внимание!</strong>
              <p>
                Сохраните этот токен сейчас. Вы больше не сможете увидеть его после закрытия этого
                окна.
              </p>
            </div>
            <div className='api-key-section'>
              <label>Ваш токен:</label>
              <div className='key-container'>
                <input
                  type='text'
                  readOnly
                  value={createdApiKey.key}
                  className='api-key-input'
                />
                <button
                  onClick={handleCopyKey}
                  className={`copy-button ${keyCopied ? 'copied' : ''}`}
                >
                  {keyCopied ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
            <div className='api-key-info'>
              <p>
                Используйте этот токен в заголовке <code>X-API-Key</code> или{' '}
                <code>Authorization: Bearer</code> для отправки сообщений через API.
              </p>
            </div>
            <div className='api-key-created-actions'>
              <button onClick={handleClose} className='close-button'>
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className='create-api-key-form'>
            <div className='form-group'>
              <label htmlFor='name'>Название токена (необязательно)</label>
              <input
                id='name'
                type='text'
                {...register('name', {
                  maxLength: {
                    value: 255,
                    message: 'Название должно быть не более 255 символов',
                  },
                })}
                placeholder='Например: "Мой бот" или "Интеграция с системой"'
                className={errors.name ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.name && (
                <span className='error-message'>{errors.name.message}</span>
              )}
            </div>

            <div className='form-group'>
              <label htmlFor='expiresInDays'>
                Срок действия (дней, необязательно)
              </label>
              <input
                id='expiresInDays'
                type='number'
                {...register('expiresInDays', {
                  min: {
                    value: 1,
                    message: 'Минимум 1 день',
                  },
                  max: {
                    value: 3650,
                    message: 'Максимум 3650 дней (10 лет)',
                  },
                })}
                placeholder='Оставьте пустым для бессрочного токена'
                className={errors.expiresInDays ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.expiresInDays && (
                <span className='error-message'>{errors.expiresInDays.message}</span>
              )}
              <small className='form-hint'>
                Если не указано, токен будет действовать бессрочно
              </small>
            </div>

            {error && <div className='error-message'>{error}</div>}

            <div className='form-actions'>
              <button
                type='button'
                onClick={handleClose}
                className='cancel-button'
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type='submit'
                className='submit-button'
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать токен'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CreateApiKeyModal

