import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getGroupById, getMessagesByGroup, createMessage, getExpenseById, sendExpenseReminder } from '../../lib/api'
import { useUser } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { getSocket } from '../../lib/socket'
import Avatar from '../../components/Avatar'
import LoadingSpinner from '../../components/LoadingSpinner'
import ChatMessage from '../../components/ChatMessage'
import ChatInput from '../../components/ChatInput'
import ExpenseModal from '../../components/ExpenseModal'
import ExpenseDetailModal from '../../components/ExpenseDetailModal'
import ExpenseHub from '../../components/ExpenseHub'
import GroupInfo from '../../components/GroupInfo'
import Sidebar from '../../components/Sidebar'
import { IoArrowBack, IoEllipsisVertical, IoVideocam, IoCall, IoWallet, IoInformationCircle, IoSunny, IoMoon } from 'react-icons/io5'

export default function GroupPage() {
  const router = useRouter()
  const { id } = router.query
  const { currentUser } = useUser()
  const { theme, toggleTheme } = useTheme()
  const [group, setGroup] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [showExpenseDetail, setShowExpenseDetail] = useState(false)
  const [showExpenseHub, setShowExpenseHub] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showKebabMenu, setShowKebabMenu] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const socketRef = useRef(null)
  const kebabRef = useRef(null)

  useEffect(() => {
    if (id && currentUser) {
      loadGroupData()
    }
  }, [id, currentUser])

  useEffect(() => {
    if (id && currentUser) {
      const socket = getSocket()
      socketRef.current = socket

      // Join the group room
      socket.emit('join-group', id)
      console.log('🔌 Joining group room:', id)

      // Listen for new messages
      const handleNewMessage = (message) => {
        console.log('📨 New message received via Socket.IO:', message)
        // Don't add our own messages (already added via optimistic update)
        if (message.user_id === currentUser.id) {
          // Replace the temp message with the real one
          setMessages(prev => prev.map(msg =>
            msg.id?.toString().startsWith('temp-') ? message : msg
          ))
          return
        }
        // Add other users' messages
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
      }

      socket.on('new-message', handleNewMessage)

      // Listen for expense updates (e.g. someone edited or settled)
      const handleExpenseUpdated = (updatedExpense) => {
        console.log('💰 Expense updated via Socket.IO:', updatedExpense)
        // Update the expense data in any messages that reference it (expense or reminder)
        setMessages(prev => prev.map(msg => {
          if ((msg.message_type === 'expense' || msg.message_type === 'reminder') && msg.expense?.id === updatedExpense.id) {
            return { ...msg, expense: updatedExpense }
          }
          return msg
        }))
        // Also update selected expense if it's open
        setSelectedExpense(prev => prev?.id === updatedExpense.id ? updatedExpense : prev)
      }

      socket.on('expense-updated', handleExpenseUpdated)

      return () => {
        socket.off('new-message', handleNewMessage)
        socket.off('expense-updated', handleExpenseUpdated)
        socket.emit('leave-group', id)
        console.log('🔌 Leaving group room:', id)
      }
    }
  }, [id, currentUser])

  // Close kebab menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setShowKebabMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadGroupData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadGroup(),
        loadMessages()
      ])
    } catch (error) {
      console.error('Error loading group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGroup = async () => {
    const data = await getGroupById(id, currentUser.id)
    setGroup(data)
  }

  const loadMessages = async () => {
    try {
      console.log('Loading messages for group:', id)
      const data = await getMessagesByGroup(id, currentUser.id, 100)
      console.log('Loaded messages:', data)
      const msgList = Array.isArray(data) ? data : []

      // For expense messages, fetch the full expense data
      const enriched = await Promise.all(
        msgList.map(async (msg) => {
          if ((msg.message_type === 'expense' || msg.message_type === 'reminder') && msg.reference_id && !msg.expense) {
            try {
              const expense = await getExpenseById(msg.reference_id, currentUser.id)
              return { ...msg, expense }
            } catch (e) {
              console.error('Failed to load expense for message:', msg.id, e)
              return { ...msg, expense: null }
            }
          }
          return msg
        })
      )

      setMessages(enriched)
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([])
    }
  }

  const handleSendMessage = async (content) => {
    if (!content.trim()) return

    try {
      console.log('Sending message:', { group_id: id, content })

      // Optimistically add message to UI immediately
      const tempMessage = {
        id: 'temp-' + Date.now(),
        group_id: id,
        user_id: currentUser.id,
        content: content.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
        user: {
          id: currentUser.id,
          display_name: currentUser.display_name,
          avatar_url: currentUser.avatar_url
        }
      }

      setMessages(prev => [...prev, tempMessage])
      scrollToBottom()

      const response = await createMessage({
        group_id: id,
        content: content.trim(),
        message_type: 'text'
      }, currentUser.id)

      console.log('Message sent successfully:', response)

      // Replace temp message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id ? response : msg
      ))
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
      alert('Failed to send message. Please try again.')
    }
  }

  const handleExpenseSuccess = (expenseResult) => {
    setShowExpenseModal(false)
    if (expenseResult) {
      loadMessages()
    }
  }

  const handleSeeExpenseDetail = async (expense) => {
    try {
      const fresh = await getExpenseById(expense.id, currentUser.id)
      setSelectedExpense(fresh)
      setShowExpenseDetail(true)
    } catch (e) {
      console.error('Failed to load expense details:', e)
      if (expense && expense.description && expense.amount) {
        setSelectedExpense(expense)
        setShowExpenseDetail(true)
      } else {
        alert('Failed to load expense details. Please try again.')
      }
    }
  }

  const handlePayNow = async (expense) => {
    try {
      const fresh = await getExpenseById(expense.id, currentUser.id)
      setSelectedExpense(fresh)
      setShowExpenseDetail(true)
    } catch (e) {
      console.error('Failed to load expense for payment:', e)
      if (expense && expense.description && expense.amount) {
        setSelectedExpense(expense)
        setShowExpenseDetail(true)
      } else {
        alert('Failed to load expense details. Please try again.')
      }
    }
  }

  const handleExpenseSettled = () => {
    loadMessages()
  }

  const handleExpenseUpdated = () => {
    loadMessages()
    setShowExpenseDetail(false)
  }

  const handleSendReminder = async (expense) => {
    try {
      await sendExpenseReminder(expense.id, currentUser.id)
      loadMessages()
    } catch (error) {
      console.error('Error sending reminder:', error)
      alert(error.message || 'Failed to send reminder')
    }
  }

  const toggleGroupInfo = () => {
    setShowExpenseHub(false)
    setShowGroupInfo(!showGroupInfo)
  }

  const toggleExpenseHub = () => {
    setShowGroupInfo(false)
    setShowExpenseHub(!showExpenseHub)
  }

  if (loading && !group) {
    return (
      <div className="flex-1 bg-wa-bg flex items-center justify-center min-h-0">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex-1 bg-wa-bg flex items-center justify-center min-h-0">
        <p className="text-wa-text-secondary">Chat not found</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{group.name} | Chats</title>
      </Head>

      <div className="flex-1 bg-wa-bg flex h-full w-full overflow-hidden min-h-0 relative select-none">
        
        {/* ── Left Sidebar (Desktop Only) ── */}
        <div className="hidden md:flex md:w-[30%] md:min-w-[340px] md:max-w-[400px] flex-shrink-0 flex flex-col h-full border-r border-wa-border-subtle">
          <Sidebar activeGroupId={group.id} />
        </div>

        {/* ── Chat Window Pane (Flex-1) ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative bg-wa-bg-deep">
          
          {/* Header */}
          <div className="bg-wa-bg-panel px-3 py-[8px] flex-shrink-0 border-b border-wa-border-subtle">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back Button (Only visible on Mobile) */}
              <button
                onClick={() => {
                  const userParam = router.query.user
                  router.push(userParam ? `/?user=${userParam}` : '/')
                }}
                className="p-1.5 hover:bg-wa-bg-hover rounded-full transition-colors -ml-1 flex-shrink-0 md:hidden animate-fade-in"
              >
                <IoArrowBack size={22} className="text-wa-icon" />
              </button>
              
              <button
                onClick={toggleGroupInfo}
                className="flex-shrink-0"
              >
                <Avatar name={group.name} src={group.avatar_url} size="md" />
              </button>
              
              <button
                onClick={toggleGroupInfo}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <h1 className="font-semibold text-wa-text text-[15.5px] truncate">{group.name}</h1>
                <p className="text-[12px] text-wa-text-secondary truncate mt-0.5">
                  {group.group_members?.map(m => m.user?.display_name?.split(' ')[0] || 'Unknown').join(', ')}
                </p>
              </button>
              
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Wallet (Direct Shortcut on all screen sizes) */}
                <button
                  onClick={toggleExpenseHub}
                  className={`p-2 hover:bg-wa-bg-hover rounded-full transition-colors ${showExpenseHub ? 'bg-wa-bg-hover' : ''}`}
                  title="Expense Hub"
                >
                  <IoWallet size={20} className="text-wa-accent" />
                </button>
                <button className="p-2 hover:bg-wa-bg-hover rounded-full transition-colors text-wa-icon">
                  <IoVideocam size={20} />
                </button>
                <button className="p-2 hover:bg-wa-bg-hover rounded-full transition-colors text-wa-icon">
                  <IoCall size={20} />
                </button>
                
                {/* Three-dot Kebab Menu */}
                <div className="relative" ref={kebabRef}>
                  <button
                    onClick={() => setShowKebabMenu(!showKebabMenu)}
                    className="p-2 hover:bg-wa-bg-hover rounded-full transition-colors text-wa-icon"
                  >
                    <IoEllipsisVertical size={20} />
                  </button>
                  {showKebabMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-wa-bg-dropdown rounded-lg shadow-xl border border-wa-border-subtle py-1.5 z-50 animate-slideUp">
                      <button
                        onClick={() => { setShowKebabMenu(false); toggleExpenseHub() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-bg-hover transition-colors"
                      >
                        <IoWallet size={17} className="text-wa-accent" />
                        <span className="text-[14.5px] text-wa-text">Expense Hub</span>
                      </button>
                      <button
                        onClick={() => { setShowKebabMenu(false); toggleGroupInfo() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-bg-hover transition-colors"
                      >
                        <IoInformationCircle size={17} className="text-wa-text-secondary" />
                        <span className="text-[14.5px] text-wa-text">Group Info</span>
                      </button>
                      {/* Integrated Theme Toggle */}
                      <button
                        onClick={() => { setShowKebabMenu(false); toggleTheme() }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-wa-bg-hover transition-colors border-t border-wa-border-subtle/50 mt-1 pt-1"
                      >
                        {theme === 'dark' ? <IoSunny size={17} className="text-wa-accent" /> : <IoMoon size={17} className="text-wa-accent" />}
                        <span className="text-[14.5px] text-wa-text">
                          {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-wa-bg-deep relative"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill:%23ffffff;opacity:0.015%7D%3C/style%3E%3C/defs%3E%3Cpath class='a' d='M20 20h8v8h-8zM60 40h6v6h-6zM120 20h10v10h-10zM160 60h8v8h-8zM40 100h6v6h-6zM100 80h8v8h-8zM140 120h6v6h-6zM20 140h8v8h-8zM80 160h10v10h-10zM160 140h8v8h-8zM60 180h6v6h-6zM120 170h8v8h-8z'/%3E%3Ccircle class='a' cx='180' cy='30' r='4'/%3E%3Ccircle class='a' cx='30' cy='70' r='3'/%3E%3Ccircle class='a' cx='90' cy='120' r='4'/%3E%3Ccircle class='a' cx='170' cy='100' r='3'/%3E%3Ccircle class='a' cx='50' cy='150' r='3'/%3E%3Ccircle class='a' cx='140' cy='180' r='4'/%3E%3C/svg%3E")`
            }}
          >
            <div className="max-w-4xl mx-auto px-3 sm:px-5 py-3 sm:py-5">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-wa-bg-card-alt rounded-lg px-5 py-3 inline-block border border-wa-border-subtle shadow-sm">
                    <p className="text-wa-text-secondary text-[13.5px]">
                      🎉 No messages yet. Start the conversation!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.user_id === currentUser.id
                    const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id

                    return (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        isOwnMessage={isOwnMessage}
                        showAvatar={showAvatar}
                        currentUserId={currentUser.id}
                        onSeeExpenseDetail={handleSeeExpenseDetail}
                        onPayNow={handlePayNow}
                        onSendReminder={handleSendReminder}
                      />
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <ChatInput
            onSendMessage={handleSendMessage}
            onOpenExpense={() => setShowExpenseModal(true)}
          />
        </div>

        {/* ── Right Sidebar Widget (Desktop Only) ── */}
        {showGroupInfo && (
          <div className="hidden md:block w-[380px] h-full flex-shrink-0 border-l border-wa-border-subtle z-10 animate-slideUp">
            <GroupInfo
              isOpen={showGroupInfo}
              onClose={() => setShowGroupInfo(false)}
              group={group}
              currentUserId={currentUser.id}
              onOpenExpenseHub={() => {
                setShowGroupInfo(false)
                setShowExpenseHub(true)
              }}
              onGroupUpdated={() => loadGroupData()}
              isSidebar={true}
            />
          </div>
        )}
        {showExpenseHub && (
          <div className="hidden md:block w-[380px] h-full flex-shrink-0 border-l border-wa-border-subtle z-10 animate-slideUp">
            <ExpenseHub
              isOpen={showExpenseHub}
              onClose={() => setShowExpenseHub(false)}
              group={group}
              currentUserId={currentUser.id}
              onViewExpense={(expense) => {
                setSelectedExpense(expense)
                setShowExpenseDetail(true)
              }}
              onSendReminder={handleSendReminder}
              isSidebar={true}
            />
          </div>
        )}

        {/* ── Mobile-Only Overlays (Fixed Full-Screen) ── */}
        <div className="md:hidden">
          {showGroupInfo && (
            <GroupInfo
              isOpen={showGroupInfo}
              onClose={() => setShowGroupInfo(false)}
              group={group}
              currentUserId={currentUser.id}
              onOpenExpenseHub={() => {
                setShowGroupInfo(false)
                setShowExpenseHub(true)
              }}
              onGroupUpdated={() => loadGroupData()}
            />
          )}
          {showExpenseHub && (
            <ExpenseHub
              isOpen={showExpenseHub}
              onClose={() => setShowExpenseHub(false)}
              group={group}
              currentUserId={currentUser.id}
              onViewExpense={(expense) => {
                setSelectedExpense(expense)
                setShowExpenseDetail(true)
              }}
              onSendReminder={handleSendReminder}
            />
          )}
        </div>

        {/* ── Popups/Modals (Shared Desktop + Mobile) ── */}
        <ExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          group={group}
          onSuccess={handleExpenseSuccess}
        />

        <ExpenseDetailModal
          isOpen={showExpenseDetail}
          onClose={() => { setShowExpenseDetail(false); setSelectedExpense(null) }}
          expense={selectedExpense}
          currentUserId={currentUser.id}
          onSettled={handleExpenseSettled}
          onExpenseUpdated={handleExpenseUpdated}
        />

      </div>
    </>
  )
}
