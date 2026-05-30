import { useState, useEffect } from 'react'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import { getUsers, addGroupMember, removeGroupMember } from '../lib/api'
import {
  IoArrowBack,
  IoWallet,
  IoChevronForward,
  IoPeople,
  IoShieldCheckmark,
  IoNotificationsOff,
  IoLockClosed,
  IoImageOutline,
  IoStarOutline,
  IoPersonAdd,
  IoSearch,
  IoCheckmarkCircle,
  IoEllipseOutline,
  IoClose,
  IoRemoveCircle,
} from 'react-icons/io5'

export default function GroupInfo({ isOpen, onClose, group, currentUserId, onOpenExpenseHub, onGroupUpdated, isSidebar = false }) {
  const [showAddMembers, setShowAddMembers] = useState(false)

  if (!isOpen || !group) return null

  const members = group.group_members || []
  const memberCount = members.length
  const currentUserIsAdmin = members.some(m => m.user_id === currentUserId && m.role === 'admin')

  return (
    <div className={isSidebar ? "relative w-full h-full flex flex-col bg-wa-bg min-w-0" : "fixed inset-0 z-50 flex flex-col bg-wa-bg min-w-0"}>
      {/* ── Header ── */}
      <div className="bg-wa-bg-panel px-4 py-3.5 flex items-center gap-3 border-b border-wa-border-subtle flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-wa-bg-hover rounded-full transition-colors -ml-1 text-wa-icon"
          title="Close panel"
        >
          <IoClose size={22} />
        </button>
        <h1 className="text-[16px] sm:text-lg font-semibold text-wa-text">Group Info</h1>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        {/* ── Group Avatar + Name ── */}
        <div className="flex flex-col items-center pt-8 pb-5 bg-wa-bg">
          <Avatar name={group.name} src={group.avatar_url} size="xl" />
          <h2 className="text-[20px] font-semibold text-wa-text mt-4">{group.name}</h2>
          <p className="text-[13px] text-wa-text-secondary mt-1">
            Group · <span className="text-wa-accent">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </p>
        </div>

        {/* ── Expense Hub Button ── */}
        <div className="bg-wa-bg px-4 pb-2">
          <button
            onClick={onOpenExpenseHub}
            className="w-full flex items-center gap-4 px-4 py-4 bg-wa-bg-panel rounded-xl border border-wa-border-subtle hover:bg-wa-bg-hover transition-colors active:scale-[0.98]"
          >
            <div className="w-11 h-11 rounded-full bg-wa-accent/15 flex items-center justify-center flex-shrink-0">
              <IoWallet size={22} className="text-wa-accent" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-medium text-wa-text">Expense Hub</p>
              <p className="text-[12px] text-wa-text-secondary mt-0.5">View pending expenses & transaction history</p>
            </div>
            <IoChevronForward size={18} className="text-wa-text-secondary flex-shrink-0" />
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="h-2 bg-wa-bg-deep" />

        {/* ── Group Description ── */}
        <div className="px-4 py-4 bg-wa-bg">
          <p className="text-wa-accent text-[14px]">Add group description</p>
        </div>

        {/* ── Divider ── */}
        <div className="h-2 bg-wa-bg-deep" />

        {/* ── Settings rows ── */}
        <div className="bg-wa-bg">
          <SettingsRow icon={IoImageOutline} label="Media, links and docs" />
          <SettingsRow icon={IoStarOutline} label="Starred messages" />
          <SettingsRow icon={IoNotificationsOff} label="Mute notifications" trailing="No" />
        </div>

        {/* ── Divider ── */}
        <div className="h-2 bg-wa-bg-deep" />

        {/* ── Encryption ── */}
        <div className="bg-wa-bg px-4 py-4">
          <div className="flex items-center gap-4">
            <IoLockClosed size={20} className="text-wa-text-secondary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] text-wa-text">Encryption</p>
              <p className="text-[12px] text-wa-text-secondary mt-0.5">Messages and calls are end-to-end encrypted.</p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-2 bg-wa-bg-deep" />

        {/* ── Members ── */}
        <div className="bg-wa-bg">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IoPeople size={16} className="text-wa-text-secondary" />
              <h3 className="text-[13px] font-medium text-wa-text-secondary">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
              </h3>
            </div>
          </div>

          {/* Add Member Button */}
          <button
            onClick={() => setShowAddMembers(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-wa-bg-hover/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-wa-accent flex items-center justify-center flex-shrink-0">
              <IoPersonAdd size={20} className="text-white" />
            </div>
            <p className="text-[16px] text-wa-accent font-medium">Add Members</p>
          </button>

          <div className="divide-y divide-wa-border-subtle">
            {members.map((member) => {
              const user = member.user
              if (!user) return null
              const isYou = user.id === currentUserId
              const isAdmin = member.role === 'admin'

              return (
                <div
                  key={member.user_id || user.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <Avatar name={user.display_name || 'Unknown'} src={user.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-wa-text truncate">
                      {isYou ? 'You' : (user.display_name || 'Unknown')}
                    </p>
                    {user.email && (
                      <p className="text-[12px] text-wa-text-secondary truncate">{user.email}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <span className="text-[11px] text-wa-accent bg-wa-accent/10 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      Admin
                    </span>
                  )}
                  {/* Remove button for admins (can't remove yourself) */}
                  {currentUserIsAdmin && !isYou && !isAdmin && (
                    <button
                      onClick={async () => {
                        if (!confirm(`Remove ${user.display_name} from this group?`)) return
                        try {
                          await removeGroupMember(group.id, user.id, currentUserId)
                          onGroupUpdated?.()
                        } catch (err) {
                          console.error('Failed to remove member:', err)
                        }
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded-full transition-colors flex-shrink-0"
                      title={`Remove ${user.display_name}`}
                    >
                      <IoRemoveCircle size={20} className="text-red-400/70" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-8 bg-wa-bg-deep" />
      </div>

      {/* Add Members Panel */}
      <AddMembersPanel
        isOpen={showAddMembers}
        onClose={() => setShowAddMembers(false)}
        group={group}
        currentUserId={currentUserId}
        isSidebar={isSidebar}
        onMembersAdded={() => {
          setShowAddMembers(false)
          onGroupUpdated?.()
        }}
      />
    </div>
  )
}

function AddMembersPanel({ isOpen, onClose, group, currentUserId, onMembersAdded, isSidebar = false }) {
  const [allUsers, setAllUsers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  const existingMemberIds = (group?.group_members || []).map(m => m.user_id || m.user?.id)

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([])
      setSearch('')
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const users = await getUsers()
      setAllUsers(users)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  // Only show users NOT already in the group
  const availableUsers = allUsers.filter(
    u => !existingMemberIds.includes(u.id) && u.id !== currentUserId
  )

  const filteredUsers = availableUsers.filter(user =>
    user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleUser = (userId) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleAdd = async () => {
    if (selectedIds.length === 0) return
    try {
      setAdding(true)
      for (const userId of selectedIds) {
        await addGroupMember(group.id, userId, currentUserId)
      }
      onMembersAdded()
    } catch (error) {
      console.error('Error adding members:', error)
      alert('Failed to add some members. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={isSidebar ? "absolute inset-0 z-20 flex flex-col bg-wa-bg" : "fixed inset-0 z-[60] flex flex-col bg-wa-bg"}>
      {/* Header */}
      <div className="bg-wa-bg-panel px-4 py-3.5 flex items-center gap-3 border-b border-wa-border-subtle flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-wa-bg-hover rounded-full transition-colors -ml-1 text-wa-icon"
          title="Back"
        >
          <IoArrowBack size={22} />
        </button>
        <h1 className="text-[16px] sm:text-lg font-semibold text-wa-text">Add Members</h1>
      </div>

      {/* Instructions & Search */}
      <div className="px-4 sm:px-5 pt-4 pb-3 flex-shrink-0">
        <p className="text-[14.5px] text-wa-text-secondary mb-3 leading-relaxed">
          Tap on people to select them, then press <span className="text-wa-accent font-medium">"Add to Group"</span>.
        </p>

        {/* Selected chips */}
        {selectedIds.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const user = allUsers.find(u => u.id === id)
              if (!user) return null
              return (
                <button
                  key={id}
                  onClick={() => toggleUser(id)}
                  className="flex items-center gap-1.5 bg-wa-accent/15 text-wa-accent px-3 py-1.5 rounded-full text-[13.5px] font-medium hover:bg-wa-accent/25 transition-colors"
                >
                  {user.display_name?.split(' ')[0]}
                  <span className="text-[11px]">✕</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-secondary" size={17} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-wa-bg-input text-wa-text rounded-xl pl-10 pr-4 py-2.5 text-[14.5px] focus:outline-none focus:ring-2 focus:ring-wa-accent placeholder-wa-text-secondary border-none"
          />
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-3 scrollbar-thin min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10">
            <IoPeople size={48} className="mx-auto text-wa-text-muted mb-3" />
            <p className="text-[15.5px] text-wa-text-secondary">
              {search ? 'No matching people found' : 'Everyone is already in this group!'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map(user => {
              const isSelected = selectedIds.includes(user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-wa-accent/10 ring-1 ring-wa-accent/40'
                      : 'hover:bg-wa-bg-hover/70'
                  }`}
                >
                  <Avatar name={user.display_name || 'User'} src={user.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15.5px] sm:text-[16px] text-wa-text font-medium truncate">
                      {user.display_name || 'Unknown'}
                    </p>
                    {user.email && (
                      <p className="text-[12.5px] sm:text-[13.5px] text-wa-text-secondary truncate mt-0.5">{user.email}</p>
                    )}
                  </div>
                  {isSelected ? (
                    <IoCheckmarkCircle size={28} className="text-wa-accent flex-shrink-0" />
                  ) : (
                    <IoEllipseOutline size={28} className="text-wa-text-muted flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {availableUsers.length > 0 && (
        <div className="px-4 sm:px-5 py-4 border-t border-wa-border-subtle flex-shrink-0 bg-wa-bg-panel">
          <button
            onClick={handleAdd}
            disabled={adding || selectedIds.length === 0}
            className={`w-full py-3.5 rounded-xl text-[16px] font-semibold transition-all ${
              selectedIds.length > 0
                ? 'bg-wa-accent text-white hover:bg-wa-accent/90 active:scale-[0.98]'
                : 'bg-wa-bg-input text-wa-text-secondary cursor-not-allowed'
            }`}
          >
            {adding
              ? 'Adding...'
              : selectedIds.length > 0
              ? `Add ${selectedIds.length} Member${selectedIds.length > 1 ? 's' : ''} to Group`
              : 'Select people to add'}
          </button>
        </div>
      )}
    </div>
  )
}

function SettingsRow({ icon: Icon, label, trailing }) {
  return (
    <button className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-wa-bg-hover/50 transition-colors text-left">
      <Icon size={20} className="text-wa-text-secondary flex-shrink-0" />
      <span className="flex-1 text-[14px] text-wa-text">{label}</span>
      {trailing && (
        <span className="text-[13px] text-wa-text-secondary">{trailing}</span>
      )}
      <IoChevronForward size={14} className="text-wa-text-secondary flex-shrink-0" />
    </button>
  )
}
