import { IoNotifications, IoCash, IoCheckmarkCircle } from 'react-icons/io5'

export default function ReminderMessageCard({ message, currentUserId, onPayNow, onSeeDetail, isOwnMessage }) {
  const expense = message.expense
  if (!expense) return null

  const isPayer = expense.paid_by === currentUserId
  const userSplit = expense.expense_splits?.find(s => s.user_id === currentUserId)
  const userOwes = userSplit && !isPayer ? parseFloat(userSplit.amount) : 0
  const isSettled = userSplit?.is_settled || isPayer
  const paidByName = expense.paid_by_user?.display_name || 'Someone'

  // Only show the reminder details to the user who owes
  const isOwingUser = !isPayer && userSplit && !userSplit.is_settled

  // Adaptive colors
  const mutedText = isOwnMessage ? 'text-wa-overlay/50' : 'text-wa-text-secondary'
  const bodyText = isOwnMessage ? 'text-wa-overlay/[0.87]' : 'text-wa-text'
  const headingText = isOwnMessage ? 'text-wa-overlay' : 'text-wa-text'
  const divider = isOwnMessage ? 'border-wa-overlay/10' : 'border-wa-overlay/[0.05]'
  const subtleBg = isOwnMessage ? 'bg-wa-overlay/[0.06]' : 'bg-wa-overlay/[0.04]'
  const btnBg = isOwnMessage
    ? 'bg-wa-overlay/[0.08] hover:bg-wa-overlay/[0.13] active:bg-wa-overlay/[0.16]'
    : 'bg-wa-overlay/[0.05] hover:bg-wa-overlay/[0.09] active:bg-wa-overlay/[0.13]'

  return (
    <div className="w-[240px] sm:w-[272px]">
      {/* ─── Header: Bell icon + reminder title ─── */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#f59e0b14] flex items-center justify-center flex-shrink-0`}>
          <IoNotifications className="text-[#f59e0b]" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] sm:text-[13px] ${mutedText} flex items-center gap-1`}>
            <IoNotifications size={10} />
            Payment Reminder
          </p>
          <h4 className={`font-semibold text-[14px] sm:text-[15px] leading-snug ${headingText} truncate`}>
            {expense.description}
          </h4>
        </div>
      </div>

      {/* ─── Divider ─── */}
      <div className={`border-t ${divider} my-2.5`} />

      {/* ─── Reminder Content ─── */}
      {isOwingUser ? (
        // Current user owes money - show their specific amount
        <div>
          <div className={`rounded-lg px-3 py-3 bg-[#f59e0b0d] border border-[#f59e0b20]`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-medium text-[#f59e0b]">You owe {paidByName}</span>
            </div>
            <p className="text-[22px] font-bold text-[#f59e0b] tabular-nums">
              ₹{userOwes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-[11px] ${mutedText} mt-1`}>
              for "{expense.description}"
            </p>
          </div>

          {/* ─── Divider ─── */}
          <div className={`border-t ${divider} my-2.5`} />

          {/* Pay Now Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onPayNow?.(expense) }}
            className="w-full flex items-center justify-center gap-1.5 py-[8px] rounded-lg text-[13px] font-medium text-white bg-wa-accent hover:bg-wa-accent-dark active:bg-wa-accent-dark transition-colors"
          >
            <IoCash size={15} />
            Pay ₹{userOwes.toFixed(0)} Now
          </button>
        </div>
      ) : isPayer ? (
        // Payer sent the reminder - show summary of who owes
        <div>
          <div className={`rounded-lg px-3 py-2 ${subtleBg}`}>
            <p className={`text-[12px] ${mutedText} mb-2`}>Reminder sent to:</p>
            <div className="space-y-1.5">
              {expense.expense_splits
                ?.filter(s => s.user_id !== expense.paid_by && !s.is_settled)
                .map(split => (
                  <div key={split.id} className="flex items-center justify-between">
                    <span className={`text-[13px] ${bodyText}`}>
                      {split.user?.display_name?.split(' ')[0] || 'Someone'}
                    </span>
                    <span className="text-[13px] font-semibold text-[#f59e0b] tabular-nums">
                      ₹{parseFloat(split.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* ─── Divider ─── */}
          <div className={`border-t ${divider} my-2.5`} />

          <button
            onClick={(e) => { e.stopPropagation(); onSeeDetail?.(expense) }}
            className={`w-full flex items-center justify-center gap-1 py-[7px] rounded-lg text-[13px] font-medium ${bodyText} ${btnBg} transition-colors`}
          >
            See Details
          </button>
        </div>
      ) : (
        // User already settled or not part of this expense - don't show reminder card
        null
      )}
    </div>
  )
}
