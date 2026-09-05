import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner.jsx'
import { queryClient } from '@/lib/queryClient.js'
import { ErrorBoundary } from '@/components/common/ErrorBoundary.jsx'
import AppRoutes from './routes/index.jsx'
import { unlockAudio } from '@/lib/notificationSound.js'

export default function App(){
  // Browsers refuse to start audio outside a user gesture, so the notification chime is armed
  // on the first click or key press anywhere in the app. Without this the first notification of
  // a session would be silent — the one most worth hearing. Once is enough, hence { once: true }.
  useEffect(() => {
    const arm = () => unlockAudio()
    window.addEventListener('pointerdown', arm, { once: true })
    window.addEventListener('keydown', arm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <AppRoutes />
          <Toaster />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
