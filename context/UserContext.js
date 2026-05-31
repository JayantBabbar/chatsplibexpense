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

// Demo users matching seed.sql — all members of the two seeded demo groups
const TEST_USERS = {
  alice: {
    id: '00000000-0000-0000-0000-000000000001',
    display_name: 'Aarav Sharma',
    email: 'aarav@demo.com',
    avatar_url: null,
  },
  bob: {
    id: '00000000-0000-0000-0000-000000000002',
    display_name: 'Priya Singh',
    email: 'priya@demo.com',
    avatar_url: null,
  },
  charlie: {
    id: '00000000-0000-0000-0000-000000000003',
    display_name: 'Rohan Verma',
    email: 'rohan@demo.com',
    avatar_url: null,
  },
  diana: {
    id: '00000000-0000-0000-0000-000000000004',
    display_name: 'Ananya Iyer',
    email: 'ananya@demo.com',
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

