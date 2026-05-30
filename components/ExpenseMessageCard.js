import { IoReceiptOutline, IoChevronForward, IoCash, IoCheckmarkCircle, IoNotificationsOutline } from 'react-icons/io5'

export default function ExpenseMessageCard({ expense, currentUserId, onSeeDetail, onPayNow, onSendReminder, isOwnMessage }) {
  if (!expense) return null

  const isPayer = expense.paid_by === currentUserId
  const userSplit = expense.expense_splits?.find(s => s.user_id === currentUserId)
  const userShare = userSplit ? parseFloat(userSplit.amount) : 0
  const isSettled = userSplit?.is_settled || isPayer
  const paidByName = expense.paid_by_user?.display_name || 'Someone'
  const splitCount = expense.expense_splits?.length || 0
  const settledCount = expense.expense_splits?.filter(s => s.is_settled).length || 0

  const youLent = isPayer
    ? expense.expense_splits
        ?.filter(s => s.user_id !== currentUserId && !s.is_settled)
        .reduce((sum, s) => sum + parseFloat(s.amount), 0) || 0
    : 0

  // Adaptive colors that match parent bubble bg (WhatsApp style)
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
      {/* ─── Header: Receipt icon + title + amount ─── */}
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${subtleBg} flex items-center justify-center flex-shrink-0`}>
          <IoReceiptOutline className={isOwnMessage ? 'text-wa-accent-msg' : 'text-wa-accent'} size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] sm:text-[13px] ${mutedText} flex items-center gap-1`}>
            <IoReceiptOutline size={10} />
            Expense Added
          </p>
          <h4 className={`font-semibold text-[14px] sm:text-[15px] leading-snug ${headingText} truncate`}>
            {expense.description}
          </h4>
        </div>
        <p className={`text-[18px] sm:text-[22px] font-bold tabular-nums leading-none ${headingText} flex-shrink-0 mt-1`}>
          ₹{parseFloat(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* ─── Divider ─── */}
      <div className={`border-t ${divider} my-2.5`} />

      {/* ─── Detail Rows (like poll options) ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[13px] ${mutedText}`}>Paid by</span>
          <span className={`text-[13px] font-medium ${bodyText}`}>
            {isPayer ? 'You' : paidByName}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-[13px] ${mutedText}`}>Split</span>
          <span className={`text-[13px] ${bodyText}`}>
            <span className="capitalize">{expense.split_type || 'Equal'}</span>
            <span className={`mx-1.5 ${mutedText}`}>·</span>
            {splitCount} people
          </span>
        </div>

        {!isPayer && (
          <div className="flex items-center justify-between">
            <span className={`text-[13px] ${mutedText}`}>Your share</span>
            <span className={`text-[13px] font-medium ${bodyText} tabular-nums`}>
              ₹{userShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Settlement bar */}
        <div className="flex items-center justify-between">
          <span className={`text-[13px] ${mutedText}`}>Settled</span>
          <div className="flex items-center gap-2">
            <div className="w-[60px] h-[3px] rounded-full bg-wa-overlay/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-wa-accent transition-all duration-500"
                style={{ width: `${splitCount > 0 ? (settledCount / splitCount) * 100 : 0}%` }}
              />
            </div>
            <span className={`text-[12px] tabular-nums ${mutedText}`}>{settledCount}/{splitCount}</span>
          </div>
        </div>
      </div>

      {/* ─── Divider ─── */}
      <div className={`border-t ${divider} my-2.5`} />

      {/* ─── Status Row (like poll result summary) ─── */}
      <div className={`rounded-lg px-3 py-2 ${subtleBg}`}>
        {isPayer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <IoCheckmarkCircle className="text-wa-accent" size={15} />
              <span className={`text-[13px] font-medium ${bodyText}`}>You paid this</span>
            </div>
            {youLent > 0 && (
              <span className="text-[12px] font-semibold text-wa-accent tabular-nums">
                +₹{youLent.toFixed(0)} lent
              </span>
            )}
          </div>
        ) : isSettled ? (
          <div className="flex items-center gap-1.5">
            <IoCheckmarkCircle className="text-wa-accent" size={15} />
            <span className={`text-[13px] font-medium ${bodyText}`}>Settled</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#f59e0b]">You owe</span>
            <span className="text-[14px] font-bold text-[#f59e0b] tabular-nums">
              ₹{userShare.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* ─── Divider ─── */}
      <div className={`border-t ${divider} mt-2.5`} />

      {/* ─── Action Buttons (like "View votes" in polls) ─── */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onSeeDetail?.(expense) }}
          className={`flex-1 flex items-center justify-center gap-1 py-[7px] rounded-lg text-[13px] font-medium ${bodyText} ${btnBg} transition-colors`}
        >
          See Details
          <IoChevronForward size={14} />
        </button>

        {!isPayer && !isSettled && (
          <button
            onClick={(e) => { e.stopPropagation(); onPayNow?.(expense) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[13px] font-medium text-white bg-wa-accent hover:bg-wa-accent-dark active:bg-wa-accent-dark transition-colors"
          >
            <IoCash size={15} />
            Pay ₹{userShare.toFixed(0)}
          </button>
        )}

        {isPayer && youLent > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onSendReminder?.(expense) }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[13px] font-medium text-[#f59e0b] bg-[#f59e0b14] hover:bg-[#f59e0b22] active:bg-[#f59e0b2a] transition-colors`}
          >
            <IoNotificationsOutline size={15} />
            Remind
          </button>
        )}
      </div>
    </div>
  )
}
