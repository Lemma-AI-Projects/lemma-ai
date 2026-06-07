import { AuthProvider } from '@/features/auth/AuthProvider'
import { AppRouter } from '@/pages/AppRouter'

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App
