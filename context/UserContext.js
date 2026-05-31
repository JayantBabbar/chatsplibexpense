import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

// Three test users matching seed.sql — all members of "Weekend Trip" group
const TEST_USERS = {
  alice: {
    id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Aarav Sharma',
    email: 'alice@example.com',
    avatar_url: null,
  },
  bob: {
    id: '22222222-2222-2222-2222-222222222222',
    display_name: 'Priya Singh',
    email: 'bob@example.com',
    avatar_url: null,
  },
  charlie: {
    id: '33333333-3333-3333-3333-333333333333',
    display_name: 'Rohan Verma',
    email: 'charlie@example.com',
    avatar_url: null,
  },
  diana: {
    id: '44444444-4444-4444-4444-444444444444',
    display_name: 'Ananya Iyer',
    email: 'diana@example.com',
    avatar_url: null,
  },
}

export { TEST_USERS }

export const UserProvider = ({ children }) => {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(TEST_USERS.alice)

  // Read ?user=alice|bob|charlie|diana from URL on every route change
  useEffect(() => {
    if (!router.isReady) return
    const userParam = router.query.user
    if (userParam && TEST_USERS[userParam]) {
      setCurrentUser(TEST_USERS[userParam])
    }
  }, [router.isReady, router.query.user])

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, TEST_USERS }}>
      {children}
    </UserContext.Provider>
  )
}

