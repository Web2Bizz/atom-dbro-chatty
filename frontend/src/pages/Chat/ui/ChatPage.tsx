import {
  useState,
  useEffect,
  useRef,
} from 'react'
import {
  useParams,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { useSocket } from '../../../shared/lib/hooks/useSocket'
import { RoomList } from '../../../widgets/RoomList'
import { roomsApi } from '../../../shared/api/rooms'
import type {
  Room,
  Message,
  RoomMember,
} from '../../../shared/types'
import styles from './ChatPage.module.css'

interface MessagesListProps {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
}

const MessagesList = ({
  messages,
  messagesEndRef,
}: MessagesListProps) => {
  return (
    <div className={styles.messagesContainer}>
      {messages.map((msg: Message, index) => (
        <div
          key={index}
          className={styles.message}
        >
          <div className={styles.messageHeader}>
            <span className={styles.messageFrom}>
              {msg.data?.username ||
                `User ${msg.from.slice(0, 8)}`}
            </span>
            <span className={styles.messageTime}>
              {new Date(
                msg.timestamp,
              ).toLocaleTimeString()}
            </span>
          </div>
          <div className={styles.messageText}>
            {msg.data?.text ||
              JSON.stringify(msg.data)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

export const ChatPage = () => {
  const { roomId } = useParams<{
    roomId?: string
  }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const token =
    localStorage.getItem('access_token') ||
    undefined
  const {
    isConnected,
    messages,
    sendMessage,
    joinRoom,
    leaveRoom,
    joinRoomMember,
    clearMessages,
  } = useSocket(token)
  const [selectedRoom, setSelectedRoom] =
    useState<Room | null>(null)
  const [messageText, setMessageText] =
    useState('')
  const [isLoadingRoom, setIsLoadingRoom] =
    useState(false)
  const [members, setMembers] = useState<
    RoomMember[]
  >([])
  const [isMember, setIsMember] = useState(false)
  const [memberStatus, setMemberStatus] =
    useState<'ACTIVE' | 'BAN' | null>(null)
  const messagesEndRef =
    useRef<HTMLDivElement>(null)
  const lastLoadedRoomIdRef = useRef<
    string | null
  >(null)

  useEffect(() => {
    const loadRoomFromUrl = async () => {
      if (!roomId) {
        setSelectedRoom(null)
        lastLoadedRoomIdRef.current = null
        return
      }

      if (
        lastLoadedRoomIdRef.current === roomId
      ) {
        return
      }

      try {
        setIsLoadingRoom(true)
        const room =
          await roomsApi.getById(roomId)
        setSelectedRoom(room)

        // Check if user is a member
        if (user) {
          const member = room.members?.find(
            (m) => m.user_id === user.id,
          )
          setIsMember(!!member)
          setMemberStatus(member?.status || null)

          // Fetch members if user is member or owner
          if (
            member ||
            room.ownerId === user.id
          ) {
            // Members should be available in room data, but we can also fetch separately if needed
            setMembers(room.members || [])
          }
        }

        lastLoadedRoomIdRef.current = roomId
      } catch (error) {
        console.error(
          'Error loading room:',
          error,
        )
        lastLoadedRoomIdRef.current = null
        navigate('/chat', { replace: true })
      } finally {
        setIsLoadingRoom(false)
      }
    }

    loadRoomFromUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const handleSelectRoom = (room: Room) => {
    navigate(`/chat/${room.id}`, {
      replace: true,
    })
  }

  useEffect(() => {
    if (selectedRoom && isConnected) {
      clearMessages()
      // Join socket room for real-time updates
      joinRoom(selectedRoom.id)

      // If user is a member, also join as member
      if (isMember && memberStatus === 'ACTIVE') {
        joinRoomMember(selectedRoom.id)
      }

      return () => {
        leaveRoom(selectedRoom.id)
      }
    }
  }, [
    selectedRoom,
    isConnected,
    isMember,
    memberStatus,
    clearMessages,
    joinRoom,
    leaveRoom,
    joinRoomMember,
  ])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  const handleSendMessage = (
    e: React.FormEvent,
  ) => {
    e.preventDefault()
    if (
      messageText.trim() &&
      isConnected &&
      selectedRoom &&
      memberStatus === 'ACTIVE'
    ) {
      sendMessage({
        roomId: selectedRoom.id,
        content: messageText,
        text: messageText,
        userId: user?.id,
        username: user?.username,
      })
      setMessageText('')
    }
  }

  const handleJoinRoom = async () => {
    if (!selectedRoom || !user) return
    try {
      await roomsApi.joinRoom(selectedRoom.id)
      setIsMember(true)
      setMemberStatus('ACTIVE')
      joinRoomMember(selectedRoom.id)
      // Refresh members list
      const room = await roomsApi.getById(
        selectedRoom.id,
      )
      setMembers(room.members || [])
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }

  const handleLeaveRoom = async () => {
    if (!selectedRoom || !user) return
    try {
      await roomsApi.leaveRoom(selectedRoom.id)
      setIsMember(false)
      setMemberStatus(null)
      setMembers([])
    } catch (error) {
      console.error('Error leaving room:', error)
    }
  }

  const handleBanUser = async (
    userId: string,
  ) => {
    if (!selectedRoom) return
    try {
      await roomsApi.banUser(
        selectedRoom.id,
        userId,
      )
      // Refresh members list
      const room = await roomsApi.getById(
        selectedRoom.id,
      )
      setMembers(room.members || [])
    } catch (error) {
      console.error('Error banning user:', error)
    }
  }

  const handleUnbanUser = async (
    userId: string,
  ) => {
    if (!selectedRoom) return
    try {
      await roomsApi.unbanUser(
        selectedRoom.id,
        userId,
      )
      // Refresh members list
      const room = await roomsApi.getById(
        selectedRoom.id,
      )
      setMembers(room.members || [])
    } catch (error) {
      console.error(
        'Error unbanning user:',
        error,
      )
    }
  }

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.headerTitle}>
            Chatty
          </h2>
          <div className={styles.status}>
            <span
              className={
                isConnected
                  ? styles.statusDotConnected
                  : styles.statusDotDisconnected
              }
            />
            {isConnected
              ? 'Подключено'
              : 'Не подключено'}
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.username}>
            {user?.username}
          </span>
          <button
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Выйти
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <RoomList
          onSelectRoom={handleSelectRoom}
          selectedRoomId={selectedRoom?.id}
        />

        <div className={styles.chatArea}>
          {isLoadingRoom ? (
            <div className={styles.emptyChat}>
              <p>Загрузка комнаты...</p>
            </div>
          ) : selectedRoom ? (
            <>
              <div className={styles.chatHeader}>
                <div
                  className={styles.chatHeaderTop}
                >
                  <div>
                    <h3
                      className={styles.roomTitle}
                    >
                      {selectedRoom.name}
                    </h3>
                    {selectedRoom.description && (
                      <p
                        className={
                          styles.roomDescription
                        }
                      >
                        {selectedRoom.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={styles.roomActions}
                  >
                    {!isMember && (
                      <button
                        onClick={handleJoinRoom}
                        className={
                          styles.joinButton
                        }
                      >
                        Присоединиться
                      </button>
                    )}
                    {isMember &&
                      selectedRoom.ownerId !==
                        user?.id && (
                        <button
                          onClick={
                            handleLeaveRoom
                          }
                          className={
                            styles.leaveButton
                          }
                        >
                          Покинуть
                        </button>
                      )}
                    {memberStatus === 'BAN' && (
                      <span
                        className={
                          styles.bannedLabel
                        }
                      >
                        Забанен
                      </span>
                    )}
                  </div>
                </div>
                {isMember && (
                  <div
                    className={
                      styles.membersSection
                    }
                  >
                    <h4
                      className={
                        styles.membersTitle
                      }
                    >
                      Участники ({members.length})
                    </h4>
                    <div
                      className={
                        styles.membersList
                      }
                    >
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className={
                            styles.memberItem
                          }
                        >
                          <span
                            className={
                              styles.memberUserId
                            }
                          >
                            {member.user_id ===
                            user?.id
                              ? 'Вы'
                              : member.user_id.slice(
                                  0,
                                  8,
                                )}
                          </span>
                          <span
                            className={
                              member.status ===
                              'ACTIVE'
                                ? styles.memberStatusActive
                                : styles.memberStatusBan
                            }
                          >
                            {member.status}
                          </span>
                          {selectedRoom.ownerId ===
                            user?.id &&
                            member.user_id !==
                              user.id &&
                            member.status ===
                              'BAN' && (
                              <button
                                onClick={() =>
                                  handleUnbanUser(
                                    member.user_id,
                                  )
                                }
                                className={
                                  styles.unbanButton
                                }
                              >
                                Разбанить
                              </button>
                            )}
                          {selectedRoom.ownerId ===
                            user?.id &&
                            member.user_id !==
                              user.id &&
                            member.status ===
                              'ACTIVE' && (
                              <button
                                onClick={() =>
                                  handleBanUser(
                                    member.user_id,
                                  )
                                }
                                className={
                                  styles.banButton
                                }
                              >
                                Забанить
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <MessagesList
                messages={messages}
                messagesEndRef={messagesEndRef}
              />

              {memberStatus === 'ACTIVE' && (
                <form
                  onSubmit={handleSendMessage}
                  className={styles.inputForm}
                >
                  <input
                    type='text'
                    value={messageText}
                    onChange={(e) =>
                      setMessageText(
                        e.target.value,
                      )
                    }
                    placeholder='Введите сообщение...'
                    disabled={!isConnected}
                    className={
                      styles.messageInput
                    }
                  />
                  <button
                    type='submit'
                    disabled={
                      !isConnected ||
                      !messageText.trim()
                    }
                    className={styles.sendButton}
                  >
                    Отправить
                  </button>
                </form>
              )}
              {memberStatus === 'BAN' && (
                <div className={styles.inputForm}>
                  <p
                    className={
                      styles.bannedMessage
                    }
                  >
                    Вы забанены в этой комнате и
                    не можете отправлять сообщения
                  </p>
                </div>
              )}
              {!isMember && (
                <div className={styles.inputForm}>
                  <p
                    className={
                      styles.notMemberMessage
                    }
                  >
                    Присоединитесь к комнате,
                    чтобы отправлять сообщения
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyChat}>
              <p>
                Выберите комнату, чтобы начать
                общение
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
