import { z } from 'zod'
import { procedure, router } from '../trpc.js'
import { getUserEmailService } from '../services/emailServiceFactory.js'
import { authService } from '../services/authService.js'

const protectedProcedure = procedure.use(async ({ ctx, next }) => {
    if (!ctx.userId) {
        throw new Error('Not authenticated')
    }
    return next()
})

export const emailRouter = router({
    getProfile: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.userId!
            return { userId }
        }),

    getCredentials: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.userId!
            const creds = await authService.getUserCredentials(userId)
            // Don't return passwords
            const { imapPass, smtpPass, ...safeCreds } = creds
            return safeCreds
        }),

    updateCredentials: protectedProcedure
        .input(
            z.object({
                imapHost: z.string().optional(),
                imapPort: z.number().optional(),
                imapSecure: z.boolean().optional(),
                imapUser: z.string().optional(),
                imapPass: z.string().optional(),
                smtpHost: z.string().optional(),
                smtpPort: z.number().optional(),
                smtpSecure: z.boolean().optional(),
                smtpUser: z.string().optional(),
                smtpPass: z.string().optional(),
                fromEmail: z.string().email().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.userId!
            await authService.updateUserCredentials(userId, input)
            const creds = await authService.getUserCredentials(userId)
            const { imapPass, smtpPass, ...safeCreds } = creds
            return safeCreds
        }),

    getFolders: protectedProcedure
        .query(async ({ ctx }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            return await emailService.getFolders()
        }),

    getMessages: protectedProcedure
        .input(
            z.object({
                folder: z.string().default('INBOX'),
                page: z.number().min(1).default(1),
                limit: z.number().min(1).max(100).default(20),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            return await emailService.getEmails(input.folder, input.page, input.limit)
        }),

    getMessage: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                folder: z.string().default('INBOX'),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            const uid = parseInt(input.id)
            if (isNaN(uid)) {
                throw new Error('Invalid email ID')
            }
            const email = await emailService.getEmail(uid, input.folder)
            if (!email) {
                throw new Error('Email not found')
            }
            return email
        }),

    sendEmail: protectedProcedure
        .input(
            z.object({
                to: z.array(z.string().email()),
                cc: z.array(z.string().email()).optional(),
                bcc: z.array(z.string().email()).optional(),
                subject: z.string().min(1),
                bodyHtml: z.string(),
                bodyText: z.string().optional(),
                attachments: z.array(
                    z.object({
                        filename: z.string(),
                        content: z.any(), // Buffer or base64 encoded content
                        contentType: z.string().optional(),
                    })
                ).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            return await emailService.sendEmail(input)
        }),

    markAsRead: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                folder: z.string().default('INBOX'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            const uid = parseInt(input.id)
            if (isNaN(uid)) {
                throw new Error('Invalid email ID')
            }
            await emailService.markAsRead(uid, input.folder)
            return { success: true }
        }),

    deleteEmail: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                folder: z.string().default('INBOX'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.userId!
            const emailService = await getUserEmailService(userId)
            const uid = parseInt(input.id)
            if (isNaN(uid)) {
                throw new Error('Invalid email ID')
            }
            await emailService.deleteEmail(uid, input.folder)
            return { success: true }
        }),
})

export type EmailRouter = typeof emailRouter
