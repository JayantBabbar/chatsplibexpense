import { useState } from 'react'
import { createSettlement, updateExpense } from '../lib/api'
import Modal from './Modal'
import Button from './Button'
import Avatar from './Avatar'
import { IoCheckmarkCircle, IoCash, IoCreateOutline, IoClose, IoLogoWhatsapp, IoOpenOutline, IoWallet } from 'react-icons/io5'

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Settled in Cash', desc: 'Mark as already paid', icon: IoCash, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'whatsapp_upi', label: 'WhatsApp UPI', desc: 'Pay via WhatsApp', icon: IoLogoWhatsapp, color: 'text-whatsapp-primary', bg: 'bg-whatsapp-primary/10' },
  { id: 'upi', label: 'Pay by UPI', desc: 'Open UPI app to pay', icon: IoWallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'other_upi', label: 'Other UPI App', desc: 'Copy UPI ID & pay manually', icon: IoOpenOutline, color: 'text-purple-400', bg: 'bg-purple-500/10' },
]

export default function ExpenseDetailModal({ isOpen, onClose, expense, currentUserId, onSettled, onExpenseUpdated }) {
  const [showPaymentMethods, setShowPaymentMethods] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [showSettleConfirm, setShowSettleConfirm] = useState(false)
  const [settling, setSettling] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [saving, setSaving] = useState(false)

  if (!expense) return null

  // Guard against malformed expense data (e.g., API error objects)
  if (!expense.amount || !expense.description) return null

  const isPayer = expense.paid_by === currentUserId
  const isCreator = expense.paid_by === currentUserId // Creator = payer for now
  const userSplit = expense.expense_splits?.find(s => s.user_id === currentUserId)
  const isUserSettled = userSplit?.is_settled
  const userOwes = userSplit && !isPayer ? userSplit.amount : 0
  const totalSettled = expense.expense_splits?.filter(s => s.is_settled).length || 0
  const totalSplits = expense.expense_splits?.length || 0

  const handleSelectPaymentMethod = (method) => {
    setSelectedMethod(method)
    setShowPaymentMethods(false)

    if (method.id === 'whatsapp_upi') {
      // Open WhatsApp UPI deep link
      const payeeName = expense.paid_by_user?.display_name || 'payee'
      const amt = userOwes.toFixed(2)
      // Attempt WhatsApp payment link — falls back to confirmation
      const waLink = `https://wa.me/?text=${encodeURIComponent(`Payment of ₹${amt} for "${expense.description}" to ${payeeName}`)}`
      window.open(waLink, '_blank')
      setShowSettleConfirm(true)
    } else if (method.id === 'upi') {
      // Open UPI intent link
      const amt = userOwes.toFixed(2)
      const upiLink = `upi://pay?am=${amt}&tn=${encodeURIComponent(expense.description)}&cu=INR`
      window.open(upiLink, '_blank')
      setShowSettleConfirm(true)
    } else if (method.id === 'other_upi') {
      // Copy amount + show confirmation
      if (navigator.clipboard) {
        navigator.clipboard.writeText(userOwes.toFixed(2))
      }
      setShowSettleConfirm(true)
    } else {
      // Cash — go straight to confirmation
      setShowSettleConfirm(true)
    }
  }

  const handleSettle = async () => {
    if (!userSplit || isPayer) return

    try {
      setSettling(true)
      await createSettlement({
        expense_id: expense.id,
        payer_id: currentUserId,
        payee_id: expense.paid_by,
        amount: userSplit.amount,
        payment_method: selectedMethod?.id || 'cash',
        notes: `Settled via ${selectedMethod?.label || 'cash'}`
      }, currentUserId)

      onSettled?.()
      onClose()
    } catch (error) {
      console.error('Error settling expense:', error)
      alert('Failed to settle expense')
    } finally {
      setSettling(false)
      setShowSettleConfirm(false)
      setSelectedMethod(null)
    }
  }

  const startEditing = () => {
    setEditDescription(expense.description)
    setEditAmount(expense.amount.toString())
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!editDescription.trim() || !parseFloat(editAmount)) return

    try {
      setSaving(true)
      await updateExpense(expense.id, {
        description: editDescription.trim(),
        amount: parseFloat(editAmount),
      }, currentUserId)

      setIsEditing(false)
      onExpenseUpdated?.()
    } catch (error) {
      console.error('Error updating expense:', error)
      alert('Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen && !showSettleConfirm} onClose={onClose} title="Expense Details" maxWidth="md">
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-5">
          {/* Edit button - only for creator */}
          {isCreator && !isEditing && (
            <div className="flex justify-end">
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 text-sm text-whatsapp-primary hover:underline"
              >
                <IoCreateOutline size={16} />
                Edit Expense
              </button>
            </div>
          )}

          {/* Amount & Title */}
          {isEditing ? (
            <div className="space-y-3 bg-whatsapp-bg-dark rounded-lg p-4">
              <div>
                <label className="text-xs text-wa-text-secondary mb-1 block">Description</label>
                <input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-wa-bg-hover text-wa-text border border-wa-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-whatsapp-primary"
                />
              </div>
              <div>
                <label className="text-xs text-wa-text-secondary mb-1 block">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-wa-bg-hover text-wa-text border border-wa-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-whatsapp-primary text-xl font-bold"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsEditing(false)} fullWidth>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={saving} fullWidth>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-6 bg-whatsapp-bg-dark rounded-lg">
              <p className="text-base sm:text-lg font-medium text-wa-text-light mb-2">{expense.description}</p>
              <p className="text-3xl sm:text-4xl font-bold text-wa-text">₹{parseFloat(expense.amount).toFixed(2)}</p>
              <p className="text-sm text-wa-text-secondary mt-2">
                {new Date(expense.created_at).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                })}
                {' · '}
                <span className="capitalize">{expense.split_type} split</span>
              </p>
            </div>
          )}

          {/* Paid By */}
          <div>
            <h3 className="text-sm font-medium text-wa-text-secondary mb-2">Paid by</h3>
            <div className="flex items-center gap-3 p-3 bg-whatsapp-bg-dark rounded-lg">
              <Avatar name={expense.paid_by_user?.display_name} size="sm" />
              <span className="text-wa-text font-medium">
                {isPayer ? 'You' : expense.paid_by_user?.display_name}
              </span>
              <span className="ml-auto text-whatsapp-primary font-semibold">
                ₹{parseFloat(expense.amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Split Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-wa-text-secondary">
                Split Breakdown ({totalSettled}/{totalSplits} settled)
              </h3>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-wa-bg-hover rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${totalSplits > 0 ? (totalSettled / totalSplits) * 100 : 0}%` }}
              />
            </div>
            <div className="space-y-2">
              {expense.expense_splits?.map((split) => {
                const isYou = split.user_id === currentUserId
                const isSplitPayer = split.user_id === expense.paid_by
                return (
                  <div
                    key={split.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isYou ? 'border-whatsapp-primary border-opacity-30 bg-whatsapp-primary bg-opacity-5' : 'border-wa-border bg-whatsapp-bg-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={split.user?.display_name} size="sm" />
                      <div>
                        <p className="text-wa-text text-sm font-medium">
                          {isYou ? 'You' : split.user?.display_name}
                        </p>
                        {split.percentage && (
                          <p className="text-xs text-wa-text-secondary">{split.percentage}%</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-wa-text">₹{parseFloat(split.amount).toFixed(2)}</p>
                      {split.is_settled ? (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <IoCheckmarkCircle size={12} />
                          {isSplitPayer ? 'Paid' : 'Settled'}
                        </div>
                      ) : (
                        <p className="text-xs text-orange-400">Owes</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Your Status / Pay Button */}
          {!isPayer && userSplit && (
            <div>
              {isUserSettled ? (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                  <IoCheckmarkCircle size={20} />
                  <span className="font-medium">You&apos;ve settled this expense</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPaymentMethods(true)}
                  className="w-full py-3.5 rounded-xl bg-whatsapp-primary text-white font-semibold text-base hover:bg-whatsapp-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-primary/20"
                >
                  <IoCash size={20} />
                  Pay Now ₹{userOwes.toFixed(2)}
                </button>
              )}
            </div>
          )}

          {isPayer && (
            <div className="p-4 bg-whatsapp-bg-dark rounded-xl border border-wa-border">
              <p className="text-sm text-wa-text-secondary text-center">
                You paid for this expense. Others can settle their shares with you.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Method Picker */}
      <Modal
        isOpen={showPaymentMethods}
        onClose={() => setShowPaymentMethods(false)}
        title="How do you want to pay?"
        maxWidth="sm"
      >
        <div className="p-4 space-y-2">
          {/* Amount header */}
          <div className="text-center pb-3 mb-1 border-b border-wa-border/50">
            <p className="text-3xl font-bold text-wa-text tabular-nums">₹{userOwes.toFixed(2)}</p>
            <p className="text-sm text-wa-text-secondary mt-1">
              to {expense.paid_by_user?.display_name}
            </p>
          </div>

          {/* Payment options */}
          <div className="space-y-1.5">
            {PAYMENT_METHODS.map(method => {
              const Icon = method.icon
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleSelectPaymentMethod(method)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-wa-border hover:border-wa-bg-hover-strong bg-whatsapp-bg-dark hover:bg-wa-bg-hover/50 transition-all active:scale-[0.98] text-left"
                >
                  <div className={`w-10 h-10 rounded-full ${method.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={method.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-wa-text">{method.label}</p>
                    <p className="text-xs text-wa-text-secondary">{method.desc}</p>
                  </div>
                  <IoOpenOutline size={14} className="text-wa-text-muted flex-shrink-0" />
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowPaymentMethods(false)}
            className="w-full py-2.5 text-sm text-wa-text-secondary hover:text-wa-text-light transition-colors mt-2"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Settle Confirmation Modal */}
      <Modal
        isOpen={showSettleConfirm}
        onClose={() => { setShowSettleConfirm(false); setSelectedMethod(null) }}
        title="Confirm Payment"
        maxWidth="sm"
      >
        <div className="p-4 space-y-4">
          <div className="text-center">
            {selectedMethod && (() => {
              const Icon = selectedMethod.icon
              return (
                <div className={`w-16 h-16 rounded-full ${selectedMethod.bg} flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={32} className={selectedMethod.color} />
                </div>
              )
            })()}
            <p className="text-wa-text text-lg font-semibold mb-1">
              Mark ₹{userOwes.toFixed(2)} as paid?
            </p>
            <p className="text-sm text-wa-text-secondary">
              via <span className="text-wa-text-light">{selectedMethod?.label || 'Cash'}</span> to {expense.paid_by_user?.display_name}
            </p>
            {selectedMethod?.id === 'other_upi' && (
              <p className="text-xs text-whatsapp-primary mt-2">Amount copied to clipboard</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowSettleConfirm(false); setSelectedMethod(null) }}
              className="flex-1 py-3 rounded-xl border border-wa-border text-wa-text-light text-sm font-medium hover:bg-wa-bg-hover/50 transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSettle}
              disabled={settling}
              className="flex-1 py-3 rounded-xl bg-whatsapp-primary text-white text-sm font-semibold hover:bg-whatsapp-primary/90 transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              {settling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
