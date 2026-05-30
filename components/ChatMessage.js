import { useState } from 'react'
import Avatar from './Avatar'
import ExpenseMessageCard from './ExpenseMessageCard'
import ReminderMessageCard from './ReminderMessageCard'

// WhatsApp-style sender name colors for group chats
const SENDER_COLORS = [
  '#00a884', // teal
  '#53bdeb', // blue
  '#e9a740', // amber
  '#7f66ff', // purple
  '#fc8686', // coral
  '#d187ee', // lavender
  '#20b2aa', // light teal
  '#ff7eb3', // pink
  '#e06c75', // red
  '#61afef', // sky
]

function getSenderColor(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length]
}

export default function ChatMessage({ message, isOwnMessage, showAvatar = true, currentUserId, onSeeExpenseDetail, onPayNow, onSendReminder }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const isExpense = message.message_type === 'expense' && message.expense
  // Only show reminder to payer or users who still owe — hide entirely for everyone else
  const isReminderMessage = message.message_type === 'reminder'
  const isReminderRelevant = (() => {
    if (!isReminderMessage || !message.expense) return false
    const exp = message.expense
    if (exp.paid_by === currentUserId) return true // payer always sees
    const split = exp.expense_splits?.find(s => s.user_id === currentUserId)
    return split && !split.is_settled // only if user owes
  })()
  const isReminder = isReminderRelevant

  // Hide reminder entirely for users who already paid or aren't part of the split
  if (isReminderMessage && !isReminderRelevant) return null

  const senderName = message.user?.display_name || 'Unknown'
  const senderColor = getSenderColor(senderName)

  return (
    <div className={`flex gap-2 mb-0.5 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {showAvatar && !isOwnMessage && (
        <div className="flex-shrink-0 self-end">
          <Avatar 
            name={senderName} 
            avatarUrl={message.user?.avatar_url}
            size="sm"
          />
        </div>
      )}
      {!showAvatar && !isOwnMessage && <div className="w-8" />}

      {/* Message Bubble */}
      <div className={`flex flex-col ${(isExpense || isReminder) ? 'max-w-[90%] sm:max-w-[85%]' : 'max-w-[80%] sm:max-w-[70%]'} ${isOwnMessage ? 'items-end' : 'items-start'}`}>
        {/* Message content */}
        <div
          className={`relative rounded-lg shadow-sm ${
            isOwnMessage
              ? 'bg-wa-bg-msg-out text-wa-text rounded-tr-none'
              : 'bg-wa-bg-msg-in text-wa-text rounded-tl-none'
          } ${(isExpense || isReminder) ? 'px-3 py-2.5' : 'px-3 py-1.5'}`}
        >
          {/* Sender name (for received group messages) */}
          {!isOwnMessage && showAvatar && (
            <p className="text-[13px] font-medium mb-0.5 leading-snug" style={{ color: senderColor }}>
              {senderName}
            </p>
          )}

          {isExpense ? (
            <ExpenseMessageCard
              expense={message.expense}
              currentUserId={currentUserId}
              onSeeDetail={onSeeExpenseDetail}
              onPayNow={onPayNow}
              onSendReminder={onSendReminder}
              isOwnMessage={isOwnMessage}
            />
          ) : isReminder ? (
            <ReminderMessageCard
              message={message}
              currentUserId={currentUserId}
              onPayNow={onPayNow}
              onSeeDetail={onSeeExpenseDetail}
              isOwnMessage={isOwnMessage}
            />
          ) : (
            <p className="text-[14.2px] break-words whitespace-pre-wrap leading-[19px]">{message.content}</p>
          )}
          
          {/* Timestamp and read receipts — inside bubble, bottom-right */}
          <div className="flex items-center gap-1 mt-1 justify-end -mb-0.5">
            <span className="text-[11px]" style={{ color: 'rgb(var(--wa-timestamp) / 0.8)' }}>
              {formatTime(message.created_at)}
            </span>
            {isOwnMessage && (
              <svg className="w-[16px] h-[11px] text-[#53bdeb] ml-0.5" viewBox="0 0 16 11" fill="none">
                <path d="M11.071 0.929l-5.5 5.5a.4.4 0 01-.566 0L2.929 4.354" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.071 0.929l-5.5 5.5a.4.4 0 01-.566 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
