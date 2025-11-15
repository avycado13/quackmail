import { z } from 'zod'
import { procedure, router } from '../trpc.js'
import { authService } from '../services/authService.js'

const protectedProcedure = procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new Error('Not authenticated')
  }
  return next()
})

export const authRouter = router({
  register: procedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        imapHost: z.string(),
        imapPort: z.number(),
        imapSecure: z.boolean(),
        imapUser: z.string(),
        imapPass: z.string(),
        smtpHost: z.string(),
        smtpPort: z.number(),
        smtpSecure: z.boolean(),
        smtpUser: z.string(),
        smtpPass: z.string(),
        fromEmail: z.string().email(),
      })
    )
    .mutation(async ({ input }) => {
      return await authService.register(input)
    }),

  login: procedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return await authService.login(input.email, input.password)
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      await authService.logout(ctx.token!)
      return { success: true }
    }),
})

export type AuthRouter = typeof authRouter
