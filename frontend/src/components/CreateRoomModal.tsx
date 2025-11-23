import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import './CreateRoomModal.css'
import { apiRequestJson } from '../utils/api'
import { Room } from '../types'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onRoomCreated: (room: Room) => void
}

interface FormData {
  name: string
  description?: string
  isPrivate?: boolean
}

function CreateRoomModal({
  isOpen,
  onClose,
  onRoomCreated,
}: CreateRoomModalProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

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
      // Подготавливаем данные для отправки
      const requestBody: Partial<Room> = {
        name: data.name.trim(),
      }

      // Добавляем description только если оно не пустое
      if (data.description && data.description.trim()) {
        requestBody.description = data.description.trim()
      }

      // Добавляем isPrivate только если оно true
      if (data.isPrivate) {
        requestBody.isPrivate = true
      }

      const response = await apiRequestJson<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      setCreatedRoom(response)
      onRoomCreated(response)
      setLoading(false)
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        // Перенаправление уже выполнено в apiRequest
        return
      }
      setError(err instanceof Error ? err.message : 'Не удалось создать чат')
      setLoading(false)
    }
  }

  const getRoomUrl = (): string => {
    if (!createdRoom) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/room/${createdRoom.id}`
  }

  const handleCopyLink = () => {
    if (createdRoom) {
      const roomUrl = getRoomUrl()
      navigator.clipboard
        .writeText(roomUrl)
        .then(() => {
          setLinkCopied(true)
          setTimeout(() => setLinkCopied(false), 2000)
        })
        .catch(() => {
          // Fallback для старых браузеров
          const input = document.createElement('input')
          input.value = roomUrl
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
          setLinkCopied(true)
          setTimeout(() => setLinkCopied(false), 2000)
        })
    }
  }

  const handleClose = () => {
    reset()
    setError('')
    setCreatedRoom(null)
    setLinkCopied(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className='modal-overlay' onClick={handleClose}>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Создать новый чат</h2>
          <button className='modal-close' onClick={handleClose}>
            ×
          </button>
        </div>

        {createdRoom ? (
          <div className='room-created'>
            <div className='success-icon'>✓</div>
            <h3>Чат успешно создан!</h3>
            <p className='room-name'>{createdRoom.name}</p>
            <div className='room-link-section'>
              <label>Ссылка на чат:</label>
              <div className='link-container'>
                <input
                  type='text'
                  readOnly
                  value={getRoomUrl()}
                  className='room-link-input'
                />
                <button
                  onClick={handleCopyLink}
                  className={`copy-button ${linkCopied ? 'copied' : ''}`}
                >
                  {linkCopied ? '✓ Скопировано' : 'Копировать'}
                </button>
              </div>
            </div>
            <div className='room-created-actions'>
              <button onClick={handleClose} className='close-button'>
                Закрыть
              </button>
              <button
                onClick={() => {
                  handleClose()
                  navigate(`/room/${createdRoom.id}`)
                }}
                className='open-room-button'
              >
                Открыть чат
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className='create-room-form'>
            <div className='form-group'>
              <label htmlFor='name'>Название чата *</label>
              <input
                id='name'
                type='text'
                {...register('name', {
                  required: 'Название чата обязательно',
                  minLength: {
                    value: 3,
                    message: 'Название чата должно быть не менее 3 символов',
                  },
                  maxLength: {
                    value: 150,
                    message: 'Название чата должно быть не более 150 символов',
                  },
                  validate: (value) => {
                    const trimmed = value?.trim()
                    if (!trimmed || trimmed.length < 3) {
                      return 'Название чата должно быть не менее 3 символов'
                    }
                    return true
                  },
                })}
                placeholder='Введите название чата'
                className={errors.name ? 'input-error' : ''}
                disabled={loading}
                autoFocus
              />
              {errors.name && (
                <span className='error-message'>{errors.name.message}</span>
              )}
            </div>

            <div className='form-group'>
              <label htmlFor='description'>Описание (необязательно)</label>
              <textarea
                id='description'
                {...register('description', {
                  maxLength: {
                    value: 2000,
                    message: 'Описание должно быть не более 2000 символов',
                  },
                })}
                placeholder='Введите описание чата'
                rows={4}
                className={errors.description ? 'input-error' : ''}
                disabled={loading}
              />
              {errors.description && (
                <span className='error-message'>
                  {errors.description.message}
                </span>
              )}
            </div>

            <div className='form-group checkbox-group'>
              <label className='checkbox-label'>
                <input
                  type='checkbox'
                  {...register('isPrivate')}
                  disabled={loading}
                />
                <span>Приватный чат</span>
              </label>
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
                {loading ? 'Создание...' : 'Создать чат'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CreateRoomModal
