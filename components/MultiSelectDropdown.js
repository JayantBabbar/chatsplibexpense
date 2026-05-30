import { useState, useRef, useEffect } from 'react'
import Avatar from './Avatar'
import { IoSearch, IoChevronDown, IoCheckmark, IoClose, IoPeople } from 'react-icons/io5'

/**
 * Multi-select dropdown for choosing which members to include in a split.
 * Always shows a dropdown trigger with search, checkboxes, select all / clear.
 * Everyone is selected by default.
 */
export default function MultiSelectDropdown({
  members = [],
  selectedIds = [],
  onToggle,
  onSelectAll,
  onDeselectAll,
  currentUserId,
  label = 'Select members',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  // Close dropdown on outside click
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

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const getDisplayName = (member) => {
    const name = member.display_name || member.user?.display_name || 'Unknown'
    return member.user_id === currentUserId ? 'You' : name
  }

  const getFullName = (member) => {
    return member.display_name || member.user?.display_name || 'Unknown'
  }

  const selectedCount = selectedIds.length
  const totalCount = members.length
  const allSelected = selectedCount === totalCount
  const noneSelected = selectedCount === 0

  const filteredMembers = members.filter(m => {
    if (!search.trim()) return true
    return getFullName(m).toLowerCase().includes(search.toLowerCase())
  })

  // Sort: current user first, then selected, then unselected
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (a.user_id === currentUserId) return -1
    if (b.user_id === currentUserId) return 1
    const aSelected = selectedIds.includes(a.user_id)
    const bSelected = selectedIds.includes(b.user_id)
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    return getFullName(a).localeCompare(getFullName(b))
  })

  // Summary for the trigger button
  const getSummaryText = () => {
    if (allSelected) return 'Everyone included'
    if (noneSelected) return 'No one selected — tap to choose'
    if (selectedCount <= 2) {
      return members
        .filter(m => selectedIds.includes(m.user_id))
        .map(m => getDisplayName(m))
        .join(' & ')
    }
    return `${selectedCount} of ${totalCount} members`
  }

  const excludedMembers = members.filter(m => !selectedIds.includes(m.user_id))

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 transition-all text-left ${
          isOpen
            ? 'border-wa-accent bg-wa-accent/5'
            : noneSelected
            ? 'border-red-500/50 bg-wa-bg-card hover:border-red-400'
            : 'border-wa-border bg-wa-bg-card hover:border-wa-text-secondary'
        }`}
      >
        {/* Count badge */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          allSelected
            ? 'bg-wa-accent text-white'
            : noneSelected
            ? 'bg-red-500/20 text-red-400'
            : 'bg-wa-accent/20 text-wa-accent'
        }`}>
          {allSelected ? (
            <IoPeople size={20} />
          ) : (
            <span className="text-[15px] font-bold">{selectedCount}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-medium truncate ${noneSelected ? 'text-red-400' : 'text-wa-text'}`}>
            {getSummaryText()}
          </p>
          <p className="text-[12px] text-wa-text-secondary">
            {allSelected ? 'Tap to exclude someone' : `${excludedMembers.length} excluded · Tap to change`}
          </p>
        </div>

        <IoChevronDown
          className={`text-wa-text-secondary flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          size={20}
        />
      </button>

      {/* Excluded member chips (below trigger when closed) */}
      {!isOpen && excludedMembers.length > 0 && excludedMembers.length <= 4 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {excludedMembers.map(member => (
            <span
              key={member.user_id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[12px] text-red-400"
            >
              <span className="truncate max-w-[80px]">{getDisplayName(member)}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggle(member.user_id) }}
                className="hover:text-red-300"
                title="Re-include"
              >
                <IoClose size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-wa-bg-card border border-wa-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search + bulk actions */}
          <div className="p-2.5 border-b border-wa-border space-y-2">
            <div className="relative">
              <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-secondary" size={16} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full bg-wa-bg-deep text-wa-text text-[14px] rounded-lg pl-9 pr-3 py-2.5 border border-wa-border focus:outline-none focus:ring-1 focus:ring-wa-accent focus:border-wa-accent placeholder-wa-text-muted"
              />
            </div>

            {/* Bulk action buttons */}
            <div className="flex items-center gap-4 px-1">
              <button
                type="button"
                onClick={onSelectAll}
                disabled={allSelected}
                className={`text-[13px] font-medium transition-colors ${
                  allSelected ? 'text-wa-text-muted cursor-default' : 'text-wa-accent hover:underline'
                }`}
              >
                Select all
              </button>
              <span className="text-wa-border text-xs">|</span>
              <button
                type="button"
                onClick={onDeselectAll}
                disabled={noneSelected}
                className={`text-[13px] font-medium transition-colors ${
                  noneSelected ? 'text-wa-text-muted cursor-default' : 'text-red-400 hover:underline'
                }`}
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Member list with checkboxes */}
          <div className="max-h-60 overflow-y-auto py-1">
            {sortedMembers.length === 0 ? (
              <div className="px-4 py-6 text-center text-wa-text-secondary text-sm">
                No members found
              </div>
            ) : (
              sortedMembers.map(member => {
                const isSelected = selectedIds.includes(member.user_id)
                const isCurrentUser = member.user_id === currentUserId
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => onToggle(member.user_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                      isSelected
                        ? 'hover:bg-wa-overlay/5'
                        : 'opacity-60 hover:opacity-80 hover:bg-wa-overlay/5'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'border-wa-accent bg-wa-accent'
                        : 'border-wa-text-muted bg-transparent'
                    }`}>
                      {isSelected && <IoCheckmark className="text-white" size={14} />}
                    </div>

                    <Avatar name={getFullName(member)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[14px] truncate ${isSelected ? 'text-wa-text' : 'text-wa-text-secondary line-through'}`}>
                        {getDisplayName(member)}
                      </p>
                      {isCurrentUser && (
                        <p className="text-[11px] text-wa-text-secondary">{getFullName(member)}</p>
                      )}
                    </div>

                    {!isSelected && (
                      <span className="text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        excluded
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-wa-border flex items-center justify-between">
            <span className="text-[12px] text-wa-text-secondary">
              {selectedCount} of {totalCount} included
            </span>
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSearch('') }}
              className="text-[13px] text-wa-accent hover:underline font-semibold px-3 py-1"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
