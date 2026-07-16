import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { Toaster } from '@/components/ui/sonner.jsx'
import { queryClient } from '@/lib/queryClient.js'
import { ErrorBoundary } from '@/components/common/ErrorBoundary.jsx'
import AppRoutes from './routes/index.jsx'

export default function App(){
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
