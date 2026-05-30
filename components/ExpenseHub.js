import { useState, useEffect } from 'react'
import { getExpensesByGroup, getExpenseById, bulkSettle } from '../lib/api'
import Avatar from './Avatar'
import LoadingSpinner from './LoadingSpinner'
import {
  IoArrowBack,
  IoWallet,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoChevronForward,
  IoChevronDown,
  IoChevronUp,
  IoCash,
  IoReceipt,
  IoTrendingUp,
  IoTrendingDown,
  IoSwapHorizontal,
  IoNotificationsOutline,
  IoPeople,
  IoList,
  IoClose,
} from 'react-icons/io5'

const TABS = [
  { id: 'balances', label: 'Net Balances', icon: IoPeople },
  { id: 'expenses', label: 'All Expenses', icon: IoList },
]

export default function ExpenseHub({ isOpen, onClose, group, currentUserId, onViewExpense, onSendReminder, isSidebar = false }) {
  const [activeTab, setActiveTab] = useState('balances')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ youOwe: 0, owedToYou: 0 })
  const [userBalances, setUserBalances] = useState([])
  const [settlingUser, setSettlingUser] = useState(null)

  useEffect(() => {
    if (isOpen && group?.id) {
      loadExpenses()
    }
  }, [isOpen, group?.id])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const data = await getExpensesByGroup(group.id, currentUserId)
      const list = Array.isArray(data) ? data : []
      setExpenses(list)
      computeUserBalances(list)
    } catch (err) {
      console.error('Error loading expense hub data:', err)
      setExpenses([])
      setUserBalances([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Compute per-user net balances using a bidirectional netting model.
   */
  const computeUserBalances = (allExpenses) => {
    const ledger = {} // userId -> { user, iOwe, theyOwe, expenses[] }

    for (const exp of allExpenses) {
      const isPayer = exp.paid_by === currentUserId

      for (const split of (exp.expense_splits || [])) {
        if (split.user_id === exp.paid_by) continue // payer doesn't owe themselves

        if (isPayer) {
          // I paid -> others owe me
          const uid = split.user_id
          if (!ledger[uid]) {
            ledger[uid] = {
              user: split.user || { id: uid, display_name: 'Unknown' },
              iOwe: 0, theyOwe: 0,
              expensesIOwe: [], expensesTheyOwe: [],
            }
          }
          const amt = parseFloat(split.amount)
          if (!split.is_settled) {
            ledger[uid].theyOwe += amt
          }
          ledger[uid].expensesTheyOwe.push({ ...exp, _splitAmount: amt, _settled: !!split.is_settled })
        } else if (split.user_id === currentUserId) {
          // Someone else paid, I owe them
          const uid = exp.paid_by
          if (!ledger[uid]) {
            ledger[uid] = {
              user: exp.paid_by_user || { id: uid, display_name: 'Unknown' },
              iOwe: 0, theyOwe: 0,
              expensesIOwe: [], expensesTheyOwe: [],
            }
          }
          const amt = parseFloat(split.amount)
          if (!split.is_settled) {
            ledger[uid].iOwe += amt
          }
          ledger[uid].expensesIOwe.push({ ...exp, _splitAmount: amt, _settled: !!split.is_settled })
        }
      }
    }

    // Build sorted list
    let totalYouOwe = 0
    let totalOwedToYou = 0
    const balances = Object.entries(ledger).map(([userId, data]) => {
      const net = Math.round((data.theyOwe - data.iOwe) * 100) / 100
      if (net < 0) totalYouOwe += Math.abs(net)
      if (net > 0) totalOwedToYou += net
      return {
        userId, user: data.user,
        iOwe: Math.round(data.iOwe * 100) / 100,
        theyOwe: Math.round(data.theyOwe * 100) / 100,
        net,
        expensesIOwe: data.expensesIOwe.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        expensesTheyOwe: data.expensesTheyOwe.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      }
    })

    // Sort: unsettled first (by abs net descending), settled at bottom
    balances.sort((a, b) => {
      if (Math.abs(a.net) === 0 && Math.abs(b.net) !== 0) return 1
      if (Math.abs(a.net) !== 0 && Math.abs(b.net) === 0) return -1
      return Math.abs(b.net) - Math.abs(a.net)
    })

    setSummary({
      youOwe: Math.round(totalYouOwe * 100) / 100,
      owedToYou: Math.round(totalOwedToYou * 100) / 100,
    })
    setUserBalances(balances)
  }

  const handleViewExpense = async (expense) => {
    try {
      const fresh = await getExpenseById(expense.id, currentUserId)
      onViewExpense?.(fresh)
    } catch {
      onViewExpense?.(expense)
    }
  }

  const handleBulkSettle = async (otherUserId, direction) => {
    if (direction === 'they_owe') return
    try {
      setSettlingUser(otherUserId)
      await bulkSettle({ group_id: group.id, payer_id: currentUserId, payee_id: otherUserId }, currentUserId)
      await loadExpenses()
    } catch (err) {
      console.error('Bulk settle error:', err)
      alert('Failed to settle. Please try again.')
    } finally {
      setSettlingUser(null)
    }
  }

  const handleSendReminderForUser = (userBalance) => {
    const unsettledExp = userBalance.expensesTheyOwe.find(e => !e._settled)
    if (unsettledExp && onSendReminder) {
      onSendReminder(unsettledExp)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  if (!isOpen) return null

  const pendingCount = userBalances.filter(b => Math.abs(b.net) > 0.01).length

  return (
    <div className={isSidebar ? "relative w-full h-full flex flex-col bg-wa-bg min-w-0" : "fixed inset-0 z-50 flex flex-col bg-wa-bg min-w-0"}>
      {/* ── Header ── */}
      <div className="bg-wa-bg-panel px-4 py-3.5 flex items-center gap-3 border-b border-wa-border-subtle flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-wa-bg-hover rounded-full transition-colors -ml-1 text-wa-icon"
          title="Close panel"
        >
          {isSidebar ? <IoClose size={22} /> : <IoArrowBack size={22} />}
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IoWallet size={20} className="text-wa-accent flex-shrink-0" />
          <h1 className="text-[16px] sm:text-lg font-semibold text-wa-text truncate">
            Expense Hub
          </h1>
        </div>
        <span className="text-xs text-wa-text-secondary flex-shrink-0 truncate max-w-[80px] sm:max-w-[120px]">{group?.name}</span>
      </div>

      {/* ── Summary Cards ── */}
      {!loading && (
        <div className="px-3 sm:px-4 py-3 flex gap-3 flex-shrink-0 bg-wa-bg">
          <div className="flex-1 bg-wa-bg-card-alt rounded-xl p-3 border border-wa-border-subtle">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                <IoTrendingDown size={14} className="text-red-400" />
              </div>
              <span className="text-[11px] text-wa-text-secondary uppercase tracking-wider font-medium">You Owe</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${summary.youOwe > 0 ? 'text-red-400' : 'text-wa-text-secondary'}`}>
              ₹{summary.youOwe.toFixed(2)}
            </p>
          </div>
          <div className="flex-1 bg-wa-bg-card-alt rounded-xl p-3 border border-wa-border-subtle">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                <IoTrendingUp size={14} className="text-green-400" />
              </div>
              <span className="text-[11px] text-wa-text-secondary uppercase tracking-wider font-medium">Owed to You</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${summary.owedToYou > 0 ? 'text-green-400' : 'text-wa-text-secondary'}`}>
              ₹{summary.owedToYou.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* ── Net Balance Badge ── */}
      {!loading && (summary.youOwe > 0 || summary.owedToYou > 0) && (
        <div className="px-3 sm:px-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-wa-bg-card-alt rounded-lg border border-wa-border-subtle">
            <IoSwapHorizontal size={14} className="text-wa-text-secondary" />
            <span className="text-xs text-wa-text-secondary">Net:</span>
            {(() => {
              const net = summary.owedToYou - summary.youOwe
              const abs = Math.abs(net).toFixed(2)
              if (Math.abs(net) < 0.01) return <span className="text-sm font-semibold text-wa-text-secondary">All settled up!</span>
              return net > 0
                ? <span className="text-sm font-semibold text-green-400">You get back ₹{abs}</span>
                : <span className="text-sm font-semibold text-red-400">You owe ₹{abs} net</span>
            })()}
          </div>
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div className="flex border-b border-wa-border-subtle flex-shrink-0 bg-wa-bg">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const count = tab.id === 'balances' ? pendingCount : expenses.length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors relative ${
                isActive ? 'text-wa-accent' : 'text-wa-text-secondary hover:text-wa-icon'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {count > 0 && (
                <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold rounded-full ${
                  isActive
                    ? 'bg-wa-accent text-white'
                    : 'bg-wa-bg-input text-wa-text-secondary'
                }`}>
                  {count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-wa-accent rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTab === 'balances' ? (
          <NetBalancesTab
            userBalances={userBalances}
            currentUserId={currentUserId}
            onViewExpense={handleViewExpense}
            onBulkSettle={handleBulkSettle}
            onSendReminder={handleSendReminderForUser}
            settlingUser={settlingUser}
            formatDate={formatDate}
          />
        ) : (
          <AllExpensesTab
            expenses={expenses}
            currentUserId={currentUserId}
            onViewExpense={handleViewExpense}
            formatDate={formatDate}
          />
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────
   Net Balances Tab
   ──────────────────────────────────────────────── */
function NetBalancesTab({ userBalances, currentUserId, onViewExpense, onBulkSettle, onSendReminder, settlingUser, formatDate }) {
  const [expandedUser, setExpandedUser] = useState(null)

  if (userBalances.length === 0) {
    return (
      <EmptyState
        icon={IoCheckmarkCircle}
        iconColor="text-green-400"
        title="All settled up!"
        subtitle="No balances in this group yet"
      />
    )
  }

  const unsettled = userBalances.filter(b => Math.abs(b.net) > 0.01)
  const settled = userBalances.filter(b => Math.abs(b.net) <= 0.01)

  return (
    <div className="pb-6">
      {/* Unsettled Balances */}
      {unsettled.length > 0 && (
        <div>
          <div className="sticky top-0 bg-wa-bg/95 backdrop-blur-sm px-4 py-2.5 border-b border-wa-border-subtle/50 z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-wa-accent/15 flex items-center justify-center">
                <IoPeople size={12} className="text-wa-accent" />
              </div>
              <h3 className="text-xs font-semibold text-wa-accent uppercase tracking-wider">Pending Balances</h3>
              <span className="text-[10px] text-wa-text-secondary ml-auto">{unsettled.length} {unsettled.length === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
          <div className="divide-y divide-wa-border-subtle/30">
            {unsettled.map(bal => (
              <UserBalanceCard
                key={bal.userId}
                balance={bal}
                isExpanded={expandedUser === bal.userId}
                onToggle={() => setExpandedUser(expandedUser === bal.userId ? null : bal.userId)}
                onViewExpense={onViewExpense}
                onBulkSettle={onBulkSettle}
                onSendReminder={onSendReminder}
                settlingUser={settlingUser}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settled Balances */}
      {settled.length > 0 && (
        <div>
          <div className="sticky top-0 bg-wa-bg/95 backdrop-blur-sm px-4 py-2.5 border-b border-wa-border-subtle/50 z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-wa-text-secondary/15 flex items-center justify-center">
                <IoCheckmarkCircle size={12} className="text-wa-text-secondary" />
              </div>
              <h3 className="text-xs font-semibold text-wa-text-secondary uppercase tracking-wider">Settled</h3>
              <span className="text-[10px] text-wa-text-secondary ml-auto">{settled.length} {settled.length === 1 ? 'person' : 'people'}</span>
            </div>
          </div>
          <div className="divide-y divide-wa-border-subtle/30">
            {settled.map(bal => (
              <UserBalanceCard
                key={bal.userId}
                balance={bal}
                isExpanded={expandedUser === bal.userId}
                onToggle={() => setExpandedUser(expandedUser === bal.userId ? null : bal.userId)}
                onViewExpense={onViewExpense}
                onBulkSettle={onBulkSettle}
                onSendReminder={onSendReminder}
                settlingUser={settlingUser}
                formatDate={formatDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────
   User Balance Card
   ──────────────────────────────────────────────── */
function UserBalanceCard({ balance, isExpanded, onToggle, onViewExpense, onBulkSettle, onSendReminder, settlingUser, formatDate }) {
  const { userId, user, net, iOwe, theyOwe, expensesIOwe, expensesTheyOwe } = balance
  const isSettled = Math.abs(net) <= 0.01
  const youOwe = net < 0
  const absNet = Math.abs(net).toFixed(2)
  const isSettling = settlingUser === userId

  // Merge all expenses for this user for the expanded view
  const allExpenses = [
    ...expensesIOwe.map(e => ({ ...e, _direction: 'you_owe' })),
    ...expensesTheyOwe.map(e => ({ ...e, _direction: 'they_owe' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // De-duplicate expenses (same expense can appear in both lists)
  const seen = new Set()
  const uniqueExpenses = allExpenses.filter(e => {
    const key = `${e.id}-${e._direction}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <div className="bg-wa-bg">
      {/* Main Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-wa-bg-card-alt transition-colors text-left active:bg-wa-bg-panel"
      >
        <Avatar name={user?.display_name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-wa-text font-medium truncate">
            {user?.display_name || 'Unknown'}
          </p>
          {isSettled ? (
            <div className="flex items-center gap-1 mt-0.5">
              <IoCheckmarkCircle size={12} className="text-wa-text-secondary" />
              <span className="text-[12px] text-wa-text-secondary">Settled up</span>
            </div>
          ) : youOwe ? (
            <p className="text-[12px] text-red-400 mt-0.5">
              You owe · {expensesIOwe.filter(e => !e._settled).length} expense{expensesIOwe.filter(e => !e._settled).length !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-[12px] text-green-400 mt-0.5">
              Owes you · {expensesTheyOwe.filter(e => !e._settled).length} expense{expensesTheyOwe.filter(e => !e._settled).length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0 flex items-center gap-2">
          {!isSettled && (
            <div>
              <p className={`text-[15px] font-bold tabular-nums ${youOwe ? 'text-red-400' : 'text-green-400'}`}>
                {youOwe ? '-' : '+'}₹{absNet}
              </p>
              <p className="text-[10px] text-wa-text-secondary text-right">
                {youOwe ? 'you owe' : 'owes you'}
              </p>
            </div>
          )}
          {isExpanded
            ? <IoChevronUp size={16} className="text-wa-text-secondary" />
            : <IoChevronDown size={16} className="text-wa-text-secondary" />
          }
        </div>
      </button>

      {/* Expanded Expense Breakdown */}
      {isExpanded && (
        <div className="bg-wa-bg-deep border-t border-wa-border-subtle/30">
          {/* Bidirectional summary if both directions exist */}
          {iOwe > 0 && theyOwe > 0 && (
            <div className="mx-4 mt-3 mb-2 p-2.5 rounded-lg bg-wa-bg-card-alt border border-wa-border-subtle/50">
              <div className="flex items-center gap-2 mb-1">
                <IoSwapHorizontal size={13} className="text-wa-text-secondary" />
                <span className="text-[11px] text-wa-text-secondary font-medium uppercase tracking-wider">Netting Breakdown</span>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1">
                <span className="text-red-400">You owe them</span>
                <span className="text-red-400 font-semibold tabular-nums">₹{iOwe.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-0.5">
                <span className="text-green-400">They owe you</span>
                <span className="text-green-400 font-semibold tabular-nums">₹{theyOwe.toFixed(2)}</span>
              </div>
              <div className="border-t border-wa-border-subtle/50 mt-1.5 pt-1.5 flex items-center justify-between text-[13px]">
                <span className={`font-semibold ${net < 0 ? 'text-red-400' : net > 0 ? 'text-green-400' : 'text-wa-text-secondary'}`}>
                  Net
                </span>
                <span className={`font-bold tabular-nums ${net < 0 ? 'text-red-400' : net > 0 ? 'text-green-400' : 'text-wa-text-secondary'}`}>
                  {net < 0 ? `-₹${Math.abs(net).toFixed(2)}` : net > 0 ? `+₹${net.toFixed(2)}` : '₹0.00'}
                </span>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="px-4 py-2">
            <p className="text-[11px] text-wa-text-secondary uppercase tracking-wider font-medium mb-2">
              Expense Details ({uniqueExpenses.length})
            </p>
            <div className="space-y-1">
              {uniqueExpenses.map((exp, idx) => {
                const isYouOweDir = exp._direction === 'you_owe'
                return (
                  <button
                    key={`${exp.id}-${exp._direction}-${idx}`}
                    onClick={() => onViewExpense(exp)}
                    className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-lg hover:bg-wa-bg-card-alt transition-colors text-left active:bg-wa-bg-panel"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      exp._settled
                        ? 'bg-wa-bg-input'
                        : isYouOweDir
                          ? 'bg-red-500/10'
                          : 'bg-green-500/10'
                    }`}>
                      {exp._settled
                        ? <IoCheckmarkCircle size={14} className="text-wa-text-secondary" />
                        : <IoReceipt size={14} className={isYouOweDir ? 'text-red-400' : 'text-green-400'} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate ${exp._settled ? 'text-wa-text-secondary' : 'text-wa-text'}`}>
                        {exp.description}
                      </p>
                      <p className="text-[11px] text-wa-text-secondary">
                        {isYouOweDir ? `${user?.display_name?.split(' ')[0]} paid` : 'You paid'}
                        {' · '}
                        {formatDate(exp.created_at)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                      <span className={`text-[13px] font-semibold tabular-nums ${
                        exp._settled
                          ? 'text-wa-text-secondary line-through'
                          : isYouOweDir
                            ? 'text-red-400'
                            : 'text-green-400'
                      }`}>
                        {isYouOweDir ? '-' : '+'}₹{exp._splitAmount.toFixed(2)}
                      </span>
                      <IoChevronForward size={12} className="text-wa-text-secondary" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {!isSettled && (
            <div className="px-4 pb-3 pt-1 flex gap-2">
              {youOwe ? (
                <button
                  onClick={() => onBulkSettle(userId, 'i_owe')}
                  disabled={isSettling}
                  className="flex-1 py-2.5 rounded-xl bg-wa-accent text-white text-[13px] font-semibold hover:bg-wa-accent/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSettling ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Settling...
                    </>
                  ) : (
                    <>
                      <IoCash size={16} />
                      Settle Up ₹{absNet}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => onSendReminder(balance)}
                  className="flex-1 py-2.5 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] text-[13px] font-semibold hover:bg-[#f59e0b]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-[#f59e0b]/20"
                >
                  <IoNotificationsOutline size={16} />
                  Send Reminder
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────
   All Expenses Tab
   ──────────────────────────────────────────────── */
function AllExpensesTab({ expenses, currentUserId, onViewExpense, formatDate }) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={IoReceipt}
        iconColor="text-wa-text-secondary"
        title="No expenses yet"
        subtitle="Add expenses to start tracking"
      />
    )
  }

  // Group by month
  const grouped = {}
  for (const exp of expenses) {
    const d = new Date(exp.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!grouped[key]) grouped[key] = { label, items: [] }
    grouped[key].items.push(exp)
  }

  return (
    <div className="pb-6">
      {Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, { label, items }]) => (
          <div key={key}>
            <div className="sticky top-0 bg-wa-bg/95 backdrop-blur-sm px-4 py-2 border-b border-wa-border-subtle/50 z-10">
              <h3 className="text-xs font-semibold text-wa-text-secondary uppercase tracking-wider">{label}</h3>
            </div>
            <div className="divide-y divide-wa-border-subtle/30">
              {items.map(exp => {
                const isPayer = exp.paid_by === currentUserId
                const userSplit = exp.expense_splits?.find(s => s.user_id === currentUserId)
                const allSettled = exp.expense_splits?.every(s => s.is_settled || s.user_id === exp.paid_by)
                const settledCount = exp.expense_splits?.filter(s => s.is_settled || s.user_id === exp.paid_by).length || 0
                const totalSplits = exp.expense_splits?.length || 0

                let statusLabel, statusColor, StatusIcon
                if (allSettled) {
                  statusLabel = 'Settled'
                  statusColor = 'text-green-400'
                  StatusIcon = IoCheckmarkCircle
                } else if (isPayer) {
                  statusLabel = `${settledCount}/${totalSplits} settled`
                  statusColor = 'text-yellow-400'
                  StatusIcon = IoAlertCircle
                } else if (userSplit?.is_settled) {
                  statusLabel = 'You settled'
                  statusColor = 'text-green-400'
                  StatusIcon = IoCheckmarkCircle
                } else {
                  statusLabel = 'Pending'
                  statusColor = 'text-orange-400'
                  StatusIcon = IoAlertCircle
                }

                return (
                  <button
                    key={exp.id}
                    onClick={() => onViewExpense(exp)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-wa-bg-card-alt transition-colors text-left active:bg-wa-bg-panel"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      allSettled ? 'bg-wa-bg-input' : isPayer ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {isPayer
                        ? <IoCash size={18} className={allSettled ? 'text-wa-text-secondary' : 'text-wa-accent'} />
                        : <IoReceipt size={18} className={allSettled ? 'text-wa-text-secondary' : 'text-red-400'} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-wa-text font-medium truncate">{exp.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusIcon size={12} className={statusColor} />
                        <span className={`text-[11px] ${statusColor}`}>{statusLabel}</span>
                        <span className="text-[11px] text-wa-text-secondary">· {formatDate(exp.created_at)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-[14px] font-semibold text-wa-text tabular-nums">
                          ₹{parseFloat(exp.amount).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-wa-text-secondary font-normal">
                          {isPayer ? 'You paid' : `Paid by ${exp.paid_by_user?.display_name?.split(' ')[0] || 'Someone'}`}
                        </p>
                      </div>
                      <IoChevronForward size={14} className="text-wa-text-secondary" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
}

/* ────────────────────────────────────────────────
   Empty State
   ──────────────────────────────────────────────── */
function EmptyState({ icon: Icon, iconColor, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-full bg-wa-bg-card-alt flex items-center justify-center mb-4 border border-wa-border-subtle">
        <Icon size={28} className={iconColor} />
      </div>
      <p className="text-[15px] font-medium text-wa-text mb-1">{title}</p>
      <p className="text-[13px] text-wa-text-secondary text-center">{subtitle}</p>
    </div>
  )
}
