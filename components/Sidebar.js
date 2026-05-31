import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { getGroupsWithMessages } from '../lib/api'
import { useUser } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import CreateGroupModal from './CreateGroupModal'
import { IoAdd, IoChatbubbles, IoSearch, IoSunny, IoMoon, IoChevronDown } from 'react-icons/io5'
import { getSocket } from '../lib/socket'

export default function Sidebar({ activeGroupId }) {
  const router = useRouter()
  const { currentUser, TEST_USERS, setCurrentUser } = useUser()
  const { theme, toggleTheme } = useTheme()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userMenuRef = useRef(null)

  // Switch user utility
  const switchUser = (key) => {
    setCurrentUser(key)
  }

  // Close user dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  useEffect(() => {
    if (currentUser) {
      loadGroups()
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      const socket = getSocket()

      // Listen for new messages across all groups to refresh the chat list
      const handleNewMessage = (message) => {
        console.log('Sidebar: New message in some group, refreshing chat list...')
        loadGroups()
      }

      socket.on('new-message', handleNewMessage)

      return () => {
        socket.off('new-message', handleNewMessage)
      }
    }
  }, [currentUser])

  // Join all group rooms so we receive new-message events on the chat list
  useEffect(() => {
    if (groups.length > 0) {
      const socket = getSocket()
      groups.forEach(group => {
        socket.emit('join-group', group.id)
      })
      return () => {
        groups.forEach(group => {
          socket.emit('leave-group', group.id)
        })
      }
    }
  }, [groups])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await getGroupsWithMessages(currentUser.id)
      setGroups(data)
    } catch (error) {
      console.error('Sidebar: Error loading groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGroupClick = (groupId) => {
    const userParam = router.query.user
    const query = userParam ? `?user=${userParam}` : ''
    router.push(`/groups/${groupId}${query}`)
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 bg-wa-bg flex flex-col min-h-0 h-full overflow-hidden select-none">
      {/* ── Header (Profile & Utils) ── */}
      <div className="bg-wa-bg-panel px-3.5 py-3 flex-shrink-0 flex items-center justify-between border-b border-wa-border-subtle relative">
        <div ref={userMenuRef} className="relative min-w-0">
          <div 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:bg-wa-bg-hover px-2 py-1 rounded-lg transition-all"
            title="Switch Account"
          >
            <Avatar name={currentUser.display_name} src={currentUser.avatar_url} size="sm" />
            <span className="text-[14.2px] font-semibold text-wa-text truncate hidden sm:inline">
              {currentUser.display_name}
            </span>
            <IoChevronDown size={12} className="text-wa-text-secondary mt-0.5" />
          </div>

          {/* ── Switch Account Dropdown ── */}
          {showUserDropdown && TEST_USERS && (
            <div className="absolute left-0 top-full mt-1.5 w-56 bg-wa-bg-dropdown rounded-lg shadow-xl border border-wa-border-subtle py-1.5 z-50 animate-slideUp">
              <div className="px-3.5 py-1.5 border-b border-wa-border-subtle/50 mb-1 select-none">
                <p className="text-[10px] text-wa-text-secondary uppercase tracking-wider font-bold">Switch Account</p>
              </div>
              {Object.entries(TEST_USERS).map(([key, user]) => {
                const isSelected = currentUser.id === user.id
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setShowUserDropdown(false)
                      switchUser(key)
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-wa-bg-hover transition-colors text-[13.5px] ${
                      isSelected ? 'text-wa-accent font-semibold bg-wa-accent/5' : 'text-wa-text'
                    }`}
                  >
                    <Avatar name={user.display_name} size="sm" />
                    <span className="truncate flex-1">{user.display_name}</span>
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-wa-accent" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-wa-icon hover:text-wa-text hover:bg-wa-bg-hover transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <IoSunny size={18} /> : <IoMoon size={18} />}
          </button>
          {/* New Group Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-2 rounded-full text-wa-icon hover:text-wa-text hover:bg-wa-bg-hover transition-colors"
            title="Create New Group"
          >
            <IoAdd size={22} />
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-3.5 py-2.5 flex-shrink-0 bg-wa-bg border-b border-wa-border-subtle">
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-secondary" size={17} />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-wa-bg-panel border border-wa-border-subtle text-wa-text rounded-lg pl-10 pr-4 py-[7px] text-[14px] focus:outline-none focus:border-wa-accent placeholder-wa-text-secondary transition-colors"
          />
        </div>
      </div>

      {/* ── Group List ── */}
      <div className="flex-1 overflow-y-auto w-full scrollbar-thin divide-y divide-wa-border-subtle">
        {loading && groups.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 px-4">
            <IoChatbubbles size={48} className="mx-auto text-wa-text-muted opacity-40 mb-3" />
            <p className="text-wa-text text-[15px] mb-1 font-medium">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="text-wa-text-secondary text-xs">
              {searchQuery ? 'Try a different search term' : 'Start a split expense conversation!'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isActive = group.id === activeGroupId
            return (
              <SidebarListItem
                key={group.id}
                group={group}
                isActive={isActive}
                onClick={() => handleGroupClick(group.id)}
                currentUserId={currentUser.id}
              />
            )
          })
        )}
      </div>

      {/* ── Create Group Modal ── */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          loadGroups()
        }}
      />
    </div>
  )
}

function SidebarListItem({ group, isActive, onClick, currentUserId }) {
  const lastMessage = group.lastMessage

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    // Less than 24 hours - show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    // Less than 7 days - show day name
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    // Otherwise show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getMessagePreview = () => {
    if (!lastMessage) return 'No messages yet'

    // Expense message styling preview
    if (lastMessage.message_type === 'expense') {
      const payer = lastMessage.user_id === currentUserId ? 'You' : (lastMessage.user?.display_name?.split(' ')[0] || 'Someone')
      return `📊 ${payer} added: "${lastMessage.content}"`
    }

    if (lastMessage.message_type === 'reminder') {
      const sender = lastMessage.user_id === currentUserId ? 'You' : (lastMessage.user?.display_name?.split(' ')[0] || 'Someone')
      return `🔔 ${sender} sent payment reminder`
    }

    const isOwnMessage = lastMessage.user_id === currentUserId
    const prefix = isOwnMessage ? 'You: ' : `${lastMessage.user?.display_name?.split(' ')[0] || 'Someone'}: `

    return prefix + lastMessage.content
  }

  return (
    <div
      onClick={onClick}
      className={`relative px-4 py-3.5 cursor-pointer transition-colors flex items-center gap-3 select-none ${
        isActive ? 'bg-wa-bg-hover' : 'hover:bg-wa-bg-hover'
      }`}
    >
      {/* WhatsApp Accent highlight on the left for active item */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-wa-accent" />
      )}

      {/* Avatar */}
      <div className="flex-shrink-0">
        <Avatar name={group.name} src={group.avatar_url} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-0.5">
          <h3 className="font-normal text-[15.5px] text-wa-text truncate">
            {group.name}
          </h3>
          {lastMessage && (
            <span className={`text-[11.5px] ml-2 flex-shrink-0 ${
              group.unreadCount > 0 && !isActive ? 'text-wa-accent font-medium' : 'text-wa-text-secondary'
            }`}>
              {formatTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-[13.5px] truncate flex-1 ${
            group.unreadCount > 0 && !isActive ? 'text-wa-text font-medium' : 'text-wa-text-secondary'
          }`}>
            {getMessagePreview()}
          </p>
          {group.unreadCount > 0 && !isActive && (
            <span className="bg-wa-accent text-wa-bg text-[10.5px] font-bold rounded-full min-w-[19px] h-[19px] flex items-center justify-center px-1">
              {group.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
