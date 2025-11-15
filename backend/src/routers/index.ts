import { router } from '../trpc'
import { authRouter } from './auth'
import { emailRouter } from './email'

export const appRouter = router({
  auth: authRouter,
  email: emailRouter,
})

export type AppRouter = typeof appRouter
