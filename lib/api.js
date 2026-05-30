const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// For MVP, we'll use a hardcoded user ID. In production, this would come from auth
const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111'

const getHeaders = (userId = DEFAULT_USER_ID) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer mock-token`,
  'x-user-id': userId,
})

// Users
export const getUsers = async () => {
  const res = await fetch(`${API_URL}/api/users`, {
    headers: getHeaders(),
  })
  const data = await res.json()
  if (!Array.isArray(data)) {
    console.error('getUsers returned non-array:', data)
    throw new Error(data.error || 'Failed to fetch users')
  }
  return data
}

export const createUser = async (userData) => {
  const res = await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  })
  return res.json()
}

// Groups
export const getGroups = async (userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

export const getGroupById = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups/${groupId}`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

export const createGroup = async (groupData, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(groupData),
  })
  return res.json()
}

// Expenses
export const getExpensesByGroup = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/group/${groupId}`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

export const getExpenseById = async (expenseId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/${expenseId}`, {
    headers: getHeaders(userId),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error || `Failed to fetch expense (${res.status})`)
  }
  return data
}

export const createExpense = async (expenseData, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(expenseData),
  })
  return res.json()
}

export const updateExpense = async (expenseId, expenseData, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/${expenseId}`, {
    method: 'PUT',
    headers: getHeaders(userId),
    body: JSON.stringify(expenseData),
  })
  return res.json()
}

export const sendExpenseReminder = async (expenseId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/${expenseId}/reminder`, {
    method: 'POST',
    headers: getHeaders(userId),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to send reminder')
  }
  return res.json()
}

export const getGroupBalances = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/group/${groupId}/balances`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

export const getUnsettledExpenses = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/expenses/group/${groupId}/unsettled`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

// Settlements
export const createSettlement = async (settlementData, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/settlements`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(settlementData),
  })
  return res.json()
}

export const bulkSettle = async (data, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/settlements/bulk`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(data),
  })
  return res.json()
}

export const getSettlementsByGroup = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/settlements/group/${groupId}`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

// Messages
export const getMessagesByGroup = async (groupId, userId = DEFAULT_USER_ID, limit = 100) => {
  const res = await fetch(`${API_URL}/api/messages/group/${groupId}?limit=${limit}`, {
    headers: getHeaders(userId),
  })
  return res.json()
}

export const createMessage = async (messageData, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(messageData),
  })
  return res.json()
}

// Get groups with recent messages for chat list view
export const getGroupsWithMessages = async (userId = DEFAULT_USER_ID) => {
  const groups = await getGroups(userId)
  
  // Fetch the most recent message for each group
  const groupsWithMessages = await Promise.all(
    groups.map(async (group) => {
      try {
        const messages = await getMessagesByGroup(group.id, userId, 1)
        return {
          ...group,
          lastMessage: messages[messages.length - 1] || null,
          unreadCount: 0 // TODO: Implement unread count
        }
      } catch (error) {
        return {
          ...group,
          lastMessage: null,
          unreadCount: 0
        }
      }
    })
  )
  
  // Sort by most recent message
  return groupsWithMessages.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.created_at) : new Date(a.created_at)
    const timeB = b.lastMessage ? new Date(b.lastMessage.created_at) : new Date(b.created_at)
    return timeB - timeA
  })
}

// Group Members
export const addGroupMember = async (groupId, memberUserId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify({ user_id: memberUserId }),
  })
  return res.json()
}

export const removeGroupMember = async (groupId, memberUserId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/members/${memberUserId}`, {
    method: 'DELETE',
    headers: getHeaders(userId),
  })
  if (res.status === 204) return { success: true }
  return res.json()
}

export const clearGroupData = async (groupId, userId = DEFAULT_USER_ID) => {
  const res = await fetch(`${API_URL}/api/groups/${groupId}/clear`, {
    method: 'DELETE',
    headers: getHeaders(userId),
  })
  return res.json()
}

export { DEFAULT_USER_ID }
