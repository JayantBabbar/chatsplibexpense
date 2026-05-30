import { useState, useRef, useEffect } from 'react'
import Avatar from './Avatar'
import { IoSearch, IoChevronDown, IoCheckmark, IoWallet } from 'react-icons/io5'

/**
 * A searchable dropdown for selecting a single member from a list.
 * Always renders a clear dropdown trigger showing who is selected,
 * with a searchable list inside.
 */
export default function SearchableSelect({
  members = [],
  selectedId,
  onSelect,
  currentUserId,
  label = 'Select member',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const getDisplayName = (member) => {
    return member.user_id === currentUserId ? 'You' : (member.display_name || member.user?.display_name || 'Unknown')
  }

  const getFullName = (member) => {
    return member.display_name || member.user?.display_name || 'Unknown'
  }

  const selectedMember = members.find(m => m.user_id === selectedId)

  const filteredMembers = members.filter(m => {
    if (!search.trim()) return true
    const name = getFullName(m).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  // Sort: current user ("You") first, then selected, then alphabetical
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    if (a.user_id === selectedId) return -1
    if (b.user_id === selectedId) return 1
    return getFullName(a).localeCompare(getFullName(b))
  })

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all text-left ${
          isOpen
            ? 'border-wa-accent bg-wa-accent/5'
            : 'border-wa-border bg-wa-bg-card hover:border-wa-text-secondary'
        }`}
      >
        {selectedMember ? (
          <>
            <div className="relative">
              <Avatar name={getFullName(selectedMember)} size="md" />
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-wa-accent rounded-full flex items-center justify-center">
                <IoWallet size={10} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-wa-text truncate">
                {getDisplayName(selectedMember)}
              </p>
              <p className="text-[12px] text-wa-accent">
                Tap to change payer
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-wa-bg-hover flex items-center justify-center">
              <IoWallet size={18} className="text-wa-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-wa-text-secondary">{label}</p>
              <p className="text-[12px] text-wa-text-muted">Tap to select</p>
            </div>
          </>
        )}
        <IoChevronDown
          className={`text-wa-text-secondary flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          size={20}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-wa-bg-card border border-wa-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search input */}
          <div className="p-2.5 border-b border-wa-border">
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-secondary" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-full bg-wa-bg-deep text-wa-text text-[14px] rounded-lg pl-9 pr-3 py-2.5 border border-wa-border focus:outline-none focus:ring-1 focus:ring-wa-accent focus:border-wa-accent placeholder-wa-text-muted"
              />
            </div>
          </div>

          {/* Member list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {sortedMembers.length === 0 ? (
              <div className="px-4 py-6 text-center text-wa-text-secondary text-sm">
                No members found
              </div>
            ) : (
              sortedMembers.map(member => {
                const isSelected = member.user_id === selectedId
                const isCurrentUser = member.user_id === currentUserId
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => {
                      onSelect(member.user_id)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      isSelected
                        ? 'bg-wa-accent/10'
                        : 'hover:bg-wa-overlay/5'
                    }`}
                  >
                    <Avatar name={getFullName(member)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] truncate ${isSelected ? 'text-wa-accent font-semibold' : 'text-wa-text'}`}>
                        {getDisplayName(member)}
                      </p>
                      {isCurrentUser && (
                        <p className="text-[11px] text-wa-text-secondary">{getFullName(member)}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-wa-accent flex items-center justify-center flex-shrink-0">
                        <IoCheckmark className="text-white" size={16} />
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
