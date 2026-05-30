import { useState, useEffect } from 'react'
import Modal from './Modal'
import Avatar from './Avatar'
import { createExpense } from '../lib/api'
import { useUser } from '../context/UserContext'
import {
  IoCheckmark,
  IoSearch,
  IoClose,
  IoReceipt,
  IoWallet,
} from 'react-icons/io5'
import SearchableSelect from './SearchableSelect'

const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal', icon: '=' },
  { value: 'exact', label: 'Exact', icon: '₹' },
  { value: 'percentage', label: '%', icon: '%' },
  { value: 'shares', label: 'Shares', icon: '#' },
]

export default function ExpenseModal({ isOpen, onClose, group, onSuccess }) {
  const { currentUser } = useUser()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [splitType, setSplitType] = useState('equal')
  const [paidBy, setPaidBy] = useState(currentUser?.id)
  const [loading, setLoading] = useState(false)
  const [memberSplits, setMemberSplits] = useState([])
  const [memberSearch, setMemberSearch] = useState('')

  // Initialize
  useEffect(() => {
    if (group?.group_members) {
      setMemberSplits(
        group.group_members.map(m => ({
          user_id: m.user_id || m.user?.id,
          display_name: m.user?.display_name || m.display_name || 'Unknown',
          avatar_url: m.user?.avatar_url || m.avatar_url,
          included: true,
          customAmount: '',
          percentage: '',
          shares: 1,
        }))
      )
    }
  }, [group])

  useEffect(() => {
    if (currentUser) setPaidBy(currentUser.id)
  }, [currentUser])

  const includedMembers = memberSplits.filter(m => m.included)
  const totalAmount = parseFloat(amount) || 0

  // ── Helpers ──
  const getName = (m) => m.display_name || 'Unknown'
  const getShortName = (m) => {
    if (m.user_id === currentUser?.id) return 'You'
    return getName(m).split(' ')[0]
  }

  // ── Calculations ──
  const calculateSplits = () => {
    if (!totalAmount || includedMembers.length === 0) return []
    switch (splitType) {
      case 'equal': {
        const per = Math.floor((totalAmount / includedMembers.length) * 100) / 100
        const rem = Math.round((totalAmount - per * includedMembers.length) * 100) / 100
        return includedMembers.map((m, i) => ({
          user_id: m.user_id,
          amount: i === includedMembers.length - 1 ? per + rem : per,
          percentage: Math.round((100 / includedMembers.length) * 100) / 100,
        }))
      }
      case 'exact':
        return includedMembers.map(m => ({
          user_id: m.user_id,
          amount: parseFloat(m.customAmount) || 0,
          percentage: null,
        }))
      case 'percentage':
        return includedMembers.map(m => {
          const pct = parseFloat(m.percentage) || 0
          return { user_id: m.user_id, amount: Math.round((totalAmount * pct / 100) * 100) / 100, percentage: pct }
        })
      case 'shares': {
        const totalShares = includedMembers.reduce((s, m) => s + (parseInt(m.shares) || 0), 0)
        if (!totalShares) return includedMembers.map(m => ({ user_id: m.user_id, amount: 0, percentage: null }))
        let running = 0
        return includedMembers.map((m, i) => {
          const sh = parseInt(m.shares) || 0
          const amt = i === includedMembers.length - 1
            ? Math.round((totalAmount - running) * 100) / 100
            : Math.round((totalAmount * sh / totalShares) * 100) / 100
          if (i < includedMembers.length - 1) running += amt
          return { user_id: m.user_id, amount: amt, percentage: Math.round((sh / totalShares * 100) * 100) / 100 }
        })
      }
      default: return []
    }
  }

  const splits = calculateSplits()
  const splitTotal = splits.reduce((s, x) => s + x.amount, 0)
  const pctTotal = splitType === 'percentage'
    ? includedMembers.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0) : null

  // ── Validation ──
  const getError = () => {
    if (!description.trim()) return 'Enter a description'
    if (!totalAmount || totalAmount <= 0) return 'Enter a valid amount'
    if (includedMembers.length === 0) return 'Select at least one member'
    if (splitType === 'exact' && Math.abs(splitTotal - totalAmount) > 0.01)
      return `Split total ₹${splitTotal.toFixed(2)} ≠ ₹${totalAmount.toFixed(2)}`
    if (splitType === 'percentage' && Math.abs(pctTotal - 100) > 0.01)
      return `Percentages total ${pctTotal.toFixed(1)}%, need 100%`
    return null
  }
  const error = getError()

  // ── Actions ──
  const toggleMember = (id) => setMemberSplits(p => p.map(m => m.user_id === id ? { ...m, included: !m.included } : m))
  const selectAll = () => setMemberSplits(p => p.map(m => ({ ...m, included: true })))
  const clearAll = () => setMemberSplits(p => p.map(m => ({ ...m, included: false })))
  const updateField = (id, field, val) => setMemberSplits(p => p.map(m => m.user_id === id ? { ...m, [field]: val } : m))

  const distributeRemaining = () => {
    const filled = includedMembers.filter(m => parseFloat(m.customAmount) > 0)
    const filledTotal = filled.reduce((s, m) => s + parseFloat(m.customAmount), 0)
    const remaining = totalAmount - filledTotal
    const unfilled = includedMembers.filter(m => !parseFloat(m.customAmount))
    if (unfilled.length > 0) {
      const each = Math.round((remaining / unfilled.length) * 100) / 100
      setMemberSplits(p => p.map(m => {
        if (!m.included || parseFloat(m.customAmount) > 0) return m
        return { ...m, customAmount: each.toString() }
      }))
    }
  }

  const distributeEqualPct = () => {
    const each = Math.round((100 / includedMembers.length) * 100) / 100
    setMemberSplits(p => p.map(m => m.included ? { ...m, percentage: each.toString() } : m))
  }

  const distributeEqualShares = () => {
    setMemberSplits(p => p.map(m => m.included ? { ...m, shares: 1 } : m))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (error) return
    try {
      setLoading(true)
      const result = await createExpense({
        group_id: group.id,
        description: description.trim(),
        amount: totalAmount,
        split_type: splitType,
        paid_by: paidBy,
        splits,
      }, currentUser.id)
      resetForm()
      onSuccess(result)
    } catch (err) {
      console.error('Error creating expense:', err)
      alert('Failed to create expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setSplitType('equal')
    setPaidBy(currentUser?.id)
    setMemberSearch('')
    if (group?.group_members) {
      setMemberSplits(group.group_members.map(m => ({
        user_id: m.user_id || m.user?.id,
        display_name: m.user?.display_name || m.display_name || 'Unknown',
        avatar_url: m.user?.avatar_url || m.avatar_url,
        included: true, customAmount: '', percentage: '', shares: 1,
      })))
    }
  }

  const handleClose = () => { resetForm(); onClose() }

  const paidByUser = memberSplits.find(m => m.user_id === paidBy)
  const filteredSplitMembers = memberSplits.filter(m =>
    !memberSearch.trim() || getName(m).toLowerCase().includes(memberSearch.toLowerCase())
  )

  const remaining = splitType === 'exact' ? totalAmount - splitTotal : 0
  const pctRemaining = splitType === 'percentage' ? 100 - (pctTotal || 0) : 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Expense" maxWidth="lg">
      <form onSubmit={handleSubmit} className="flex flex-col">

        {/* ─── TOP: Description + Amount ─── */}
        <div className="p-3 sm:p-4 pb-3 space-y-3 border-b border-wa-border/50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-wa-bg-hover/50 flex items-center justify-center flex-shrink-0">
              <IoReceipt className="text-wa-text-secondary" size={18} />
            </div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              className="flex-1 bg-transparent text-wa-text text-[15px] sm:text-base border-b border-wa-border pb-1 focus:outline-none focus:border-whatsapp-primary placeholder-wa-text-muted transition-colors min-w-0"
              required
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-wa-bg-hover/50 flex items-center justify-center flex-shrink-0">
              <IoWallet className="text-wa-text-secondary" size={18} />
            </div>
            <div className="flex-1 flex items-baseline gap-1 border-b border-wa-border pb-1 focus-within:border-whatsapp-primary transition-colors min-w-0">
              <span className="text-wa-text-secondary text-lg sm:text-xl font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-wa-text text-xl sm:text-2xl font-bold focus:outline-none placeholder-wa-text-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                required
              />
            </div>
          </div>
        </div>

        {/* ─── PAID BY ─── */}
        <div className="px-3 sm:px-4 py-3 border-b border-wa-border/50">
          <label className="text-xs font-medium text-wa-text-secondary uppercase tracking-wide mb-2 block">
            Who paid?
          </label>
          <SearchableSelect
            members={memberSplits.map(m => ({
              user_id: m.user_id,
              display_name: m.display_name,
            }))}
            selectedId={paidBy}
            onSelect={setPaidBy}
            currentUserId={currentUser?.id}
            label="Select who paid"
          />
        </div>

        {/* ─── SPLIT TYPE TABS ─── */}
        <div className="px-3 sm:px-4 pt-3">
          <div className="flex bg-wa-bg-input/50 rounded-xl p-1 gap-0.5">
            {SPLIT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSplitType(type.value)}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                  splitType === type.value
                    ? 'bg-whatsapp-primary text-white shadow-sm'
                    : 'text-wa-text-secondary hover:text-wa-text'
                }`}
              >
                <span className="block text-base leading-none mb-0.5">{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── MEMBER LIST ─── */}
        <div className="px-3 sm:px-4 pt-3 pb-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-wa-text-secondary uppercase tracking-wide">Members</span>
              <span className="text-xs text-wa-text-muted">{includedMembers.length}/{memberSplits.length}</span>
            </div>
            <div className="flex items-center gap-3">
              {splitType === 'exact' && totalAmount > 0 && (
                <button type="button" onClick={distributeRemaining} className="text-xs text-whatsapp-primary hover:underline">Auto-fill</button>
              )}
              {splitType === 'percentage' && (
                <button type="button" onClick={distributeEqualPct} className="text-xs text-whatsapp-primary hover:underline">Equal %</button>
              )}
              {splitType === 'shares' && (
                <button type="button" onClick={distributeEqualShares} className="text-xs text-whatsapp-primary hover:underline">Reset</button>
              )}
              <button
                type="button"
                onClick={selectAll}
                disabled={includedMembers.length === memberSplits.length}
                className="text-xs text-whatsapp-primary hover:underline disabled:text-wa-text-muted disabled:no-underline"
              >All</button>
              <button
                type="button"
                onClick={clearAll}
                disabled={includedMembers.length === 0}
                className="text-xs text-red-400 hover:underline disabled:text-wa-text-muted disabled:no-underline"
              >Clear</button>
            </div>
          </div>

          {/* Search members */}
          <div className="relative mb-2">
            <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-text-muted" size={14} />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full bg-wa-bg-input/50 text-wa-text text-sm rounded-lg pl-8 pr-8 py-2 border border-wa-border focus:outline-none focus:border-whatsapp-primary placeholder-wa-text-muted"
            />
            {memberSearch && (
              <button type="button" onClick={() => setMemberSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-wa-text-muted hover:text-wa-text-light">
                <IoClose size={16} />
              </button>
            )}
          </div>

          {/* Rows */}
          <div className="space-y-1 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto -mx-1 px-1 scrollbar-thin">
            {filteredSplitMembers.map(member => {
              const isIncluded = member.included
              const split = splits.find(s => s.user_id === member.user_id)
              const isPayer = member.user_id === paidBy

              return (
                <div
                  key={member.user_id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all ${
                    isIncluded ? 'bg-wa-bg-input/30' : 'bg-transparent opacity-40'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleMember(member.user_id)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      isIncluded ? 'bg-whatsapp-primary border-whatsapp-primary' : 'border-wa-text-muted hover:border-wa-text-secondary'
                    }`}
                  >
                    {isIncluded && <IoCheckmark className="text-white" size={13} />}
                  </button>

                  {/* Avatar + Name */}
                  <Avatar name={getName(member)} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isIncluded ? 'text-wa-text' : 'text-wa-text-muted line-through'}`}>
                      {getShortName(member)}
                      {isPayer && (
                        <span className="text-[10px] ml-1 text-whatsapp-primary bg-whatsapp-primary/10 px-1.5 py-0.5 rounded-full">paid</span>
                      )}
                    </p>
                  </div>

                  {/* Split value */}
                  {isIncluded && totalAmount > 0 && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {splitType === 'equal' && (
                        <span className="text-sm font-semibold text-whatsapp-primary tabular-nums">
                          ₹{split?.amount?.toFixed(2)}
                        </span>
                      )}

                      {splitType === 'exact' && (
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-wa-text-muted text-xs">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={member.customAmount}
                            onChange={(e) => updateField(member.user_id, 'customAmount', e.target.value)}
                            className="w-20 sm:w-24 bg-wa-bg-input text-wa-text border border-wa-border rounded-lg pl-5 pr-2 py-1.5 text-sm text-right focus:outline-none focus:border-whatsapp-primary tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {splitType === 'percentage' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={member.percentage}
                            onChange={(e) => updateField(member.user_id, 'percentage', e.target.value)}
                            className="w-14 sm:w-16 bg-wa-bg-input text-wa-text border border-wa-border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-whatsapp-primary tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            placeholder="0"
                          />
                          <span className="text-wa-text-muted text-xs">%</span>
                          {split?.amount > 0 && (
                <span className="text-[11px] text-wa-text-muted tabular-nums">₹{split.amount.toFixed(0)}</span>
                          )}
                        </div>
                      )}

                      {splitType === 'shares' && (
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => updateField(member.user_id, 'shares', Math.max(0, (parseInt(member.shares) || 1) - 1))}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-wa-bg-input border border-wa-border text-wa-text-light hover:bg-wa-bg-hover hover:text-wa-text flex items-center justify-center text-base transition-colors active:scale-95"
                          >−</button>
                          <span className="text-sm font-medium text-wa-text w-6 sm:w-7 text-center tabular-nums">{member.shares}</span>
                          <button
                            type="button"
                            onClick={() => updateField(member.user_id, 'shares', (parseInt(member.shares) || 1) + 1)}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-wa-bg-input border border-wa-border text-wa-text-light hover:bg-wa-bg-hover hover:text-wa-text flex items-center justify-center text-base transition-colors active:scale-95"
                          >+</button>
                          {split?.amount > 0 && (
                            <span className="text-[11px] text-wa-text-muted ml-1 tabular-nums">₹{split.amount.toFixed(0)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── STATUS BAR (non-equal splits) ─── */}
        {totalAmount > 0 && includedMembers.length > 0 && splitType !== 'equal' && (
          <div className="mx-3 sm:mx-4 mb-2">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
              (splitType === 'exact' && Math.abs(remaining) < 0.01) ||
              (splitType === 'percentage' && Math.abs(pctRemaining) < 0.01) ||
              splitType === 'shares'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}>
              {splitType === 'exact' && (
                <>
                  <span>₹{splitTotal.toFixed(2)} of ₹{totalAmount.toFixed(2)}</span>
                  <span>{Math.abs(remaining) < 0.01 ? '✓ Balanced' : remaining > 0 ? `₹${remaining.toFixed(2)} left` : `₹${Math.abs(remaining).toFixed(2)} over`}</span>
                </>
              )}
              {splitType === 'percentage' && (
                <>
                  <span>{(pctTotal || 0).toFixed(1)}% of 100%</span>
                  <span>{Math.abs(pctRemaining) < 0.01 ? '✓ Balanced' : pctRemaining > 0 ? `${pctRemaining.toFixed(1)}% left` : `${Math.abs(pctRemaining).toFixed(1)}% over`}</span>
                </>
              )}
              {splitType === 'shares' && (
                <>
                  <span>{includedMembers.reduce((s, m) => s + (parseInt(m.shares) || 0), 0)} total shares</span>
                  <span>✓ Auto-calculated</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── SUMMARY / ERROR ─── */}
        <div className="mx-3 sm:mx-4 mb-3">
          <div className={`rounded-xl border px-3 py-2.5 ${error ? 'border-red-500/40 bg-red-500/5' : 'border-wa-border bg-wa-bg-input/30'}`}>
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-wa-text-secondary">Your share</span>
                <span className="text-lg font-bold text-whatsapp-primary tabular-nums">
                  ₹{(splits.find(s => s.user_id === currentUser?.id)?.amount || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ─── BUTTONS ─── */}
        <div className="px-3 sm:px-4 pb-4 safe-bottom flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl border border-wa-border text-wa-text-light text-sm font-medium hover:bg-wa-bg-hover/50 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !!error}
            className="flex-1 py-3 rounded-xl bg-whatsapp-primary text-white text-sm font-semibold hover:bg-whatsapp-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </span>
            ) : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
