import { useEffect, useState } from 'react'
import { createGroup, getUsers } from '../lib/api'
import { useUser } from '../context/UserContext'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import Button from './Button'
import Modal from './Modal'
import Input from './Input'
import { IoSearch, IoArrowBack, IoArrowForward, IoCheckmarkCircle, IoEllipseOutline } from 'react-icons/io5'

export default function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const { currentUser, TEST_USERS } = useUser()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userLoadError, setUserLoadError] = useState(null)

  // Load all users when modal opens
  useEffect(() => {
    if (isOpen) {
      loadUsers()
      // Reset state
      setStep(1)
      setName('')
      setDescription('')
      setSelectedMembers([])
      setMemberSearch('')
      setUserLoadError(null)
    }
  }, [isOpen])

  const loadUsers = async () => {
    try {
      setLoadingUsers(true)
      setUserLoadError(null)
      const users = await getUsers()
      const contactIds = new Set(Object.values(TEST_USERS).map(user => user.id))
      // Keep only the switchable test contacts and filter out the current user
      setAllUsers(users.filter(u => contactIds.has(u.id) && u.id !== currentUser.id))
    } catch (error) {
      console.error('Error loading users:', error)
      setUserLoadError('Could not load users. Check that the backend and database are running.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const filteredUsers = allUsers.filter(user =>
    user.display_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!name.trim()) return

    try {
      setLoading(true)
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        member_ids: selectedMembers,
      }, currentUser.id)
      onSuccess()
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={step === 1 ? 'Create New Group' : 'Add Members'}>
      {step === 1 ? (
        /* ── STEP 1: Group Name & Description ── */
        <div className="p-5 sm:p-6 space-y-5">
          <p className="text-[15px] text-wa-text-secondary leading-relaxed">
            Give your group a name. You can add members next.
          </p>
          <Input
            label="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Trip, Roommates"
            required
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
          />
          <div className="flex gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={handleClose} fullWidth size="lg" className="!text-[16px] !py-3">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              fullWidth
              size="lg"
              className="!text-[16px] !py-3"
            >
              Next: Add Members
              <IoArrowForward size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        /* ── STEP 2: Select Members ── */
        <div className="flex flex-col min-h-0 max-h-[calc(100vh-120px)] sm:max-h-[70vh]">
          <div className="px-5 pt-4 pb-3 flex-shrink-0">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-wa-accent text-[15px] font-medium mb-3 hover:underline"
            >
              <IoArrowBack size={18} />
              Back to group details
            </button>

            <p className="text-[15px] text-wa-text-secondary leading-relaxed mb-3">
              Tap on people to add them to <span className="text-wa-text font-medium">"{name}"</span>
            </p>

            {/* Selected count badge */}
            {selectedMembers.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedMembers.map(memberId => {
                  const user = allUsers.find(u => u.id === memberId)
                  if (!user) return null
                  return (
                    <button
                      key={memberId}
                      onClick={() => toggleMember(memberId)}
                      className="flex items-center gap-1.5 bg-wa-accent/15 text-wa-accent px-3 py-1.5 rounded-full text-[13px] font-medium hover:bg-wa-accent/25 transition-colors"
                    >
                      {user.display_name?.split(' ')[0]}
                      <span className="text-[11px]">✕</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Search bar */}
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-secondary" size={18} />
              <input
                type="text"
                placeholder="Search people by name or email..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-wa-bg-input text-wa-text rounded-xl pl-10 pr-4 py-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-wa-accent placeholder-wa-text-secondary border-none"
              />
            </div>
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin min-h-0">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : userLoadError ? (
              <div className="text-center py-8 px-4">
                <p className="text-red-400 text-[15px] mb-3">{userLoadError}</p>
                <button onClick={loadUsers} className="text-wa-accent text-[14px] hover:underline">
                  Retry
                </button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-wa-text-secondary text-[15px]">
                  {memberSearch ? 'No people found' : 'No other users available'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map(user => {
                  const isSelected = selectedMembers.includes(user.id)
                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleMember(user.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-wa-accent/10 ring-1 ring-wa-accent/40'
                          : 'hover:bg-wa-bg-hover/70'
                      }`}
                    >
                      <Avatar name={user.display_name || 'User'} src={user.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] text-wa-text font-medium truncate">
                          {user.display_name || 'Unknown'}
                        </p>
                        {user.email && (
                          <p className="text-[13px] text-wa-text-secondary truncate mt-0.5">{user.email}</p>
                        )}
                      </div>
                      {isSelected ? (
                        <IoCheckmarkCircle size={28} className="text-wa-accent flex-shrink-0" />
                      ) : (
                        <IoEllipseOutline size={28} className="text-wa-bg-hover-strong flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="px-5 py-4 border-t border-wa-border flex-shrink-0 bg-wa-bg-panel">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[14px] text-wa-text-secondary">
                  {selectedMembers.length === 0
                    ? 'You can also add members later'
                    : `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`}
                </p>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                size="lg"
                className="!text-[16px] !px-8 !py-3"
              >
                {loading ? 'Creating...' : selectedMembers.length > 0 ? 'Create Group' : 'Skip & Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
