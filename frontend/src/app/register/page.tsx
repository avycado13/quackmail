'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { trpc } from '@/lib/trpc'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'credentials' | 'email-setup'>('credentials')

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [emailSetup, setEmailSetup] = useState({
    imapPass: '',
    smtpPass: '',
    fromEmail: '',
  })
  
  const registerMutation = trpc.auth.register.useMutation()

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (credentials.password !== credentials.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (credentials.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setStep('email-setup')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await registerMutation.mutateAsync({
        email: credentials.email,
        password: credentials.password,
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapSecure: true,
        imapUser: credentials.email,
        imapPass: emailSetup.imapPass,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: credentials.email,
        smtpPass: emailSetup.smtpPass,
        fromEmail: emailSetup.fromEmail,
      })

      login(result.user, result.token)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">QuackMail</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {step === 'credentials' ? 'Create your account' : 'Set up your email'}
            </p>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={credentials.confirmPassword}
                  onChange={(e) => setCredentials({ ...credentials, confirmPassword: e.target.value })}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="imap-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Password (for both IMAP & SMTP)
                </label>
                <Input
                  id="imap-password"
                  type="password"
                  placeholder="••••••••"
                  value={emailSetup.imapPass}
                  onChange={(e) => setEmailSetup({ ...emailSetup, imapPass: e.target.value, smtpPass: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This will be used for both reading and sending emails
                </p>
              </div>

              <div>
                <label htmlFor="from-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Display From Address
                </label>
                <Input
                  id="from-email"
                  type="email"
                  placeholder="Your Display Name your.name@example.com"
                  value={emailSetup.fromEmail}
                  onChange={(e) => setEmailSetup({ ...emailSetup, fromEmail: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  How your emails will appear to others
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('credentials')}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>
          )}

          {step === 'credentials' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
