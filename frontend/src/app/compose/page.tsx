'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { ProtectedRoute } from '@/components/protected-route'
import { trpc } from '@/lib/trpc'

export default function ComposePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const sendEmailMutation = trpc.email.sendEmail.useMutation()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear messages when user starts typing
    if (error) setError('')
    if (success) setSuccess('')
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.to.trim()) {
      setError('Recipient email is required')
      return
    }

    if (!validateEmail(formData.to.trim())) {
      setError('Please enter a valid email address')
      return
    }

    if (!formData.subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!formData.body.trim()) {
      setError('Email body is required')
      return
    }

    setIsLoading(true)

    try {
      await sendEmailMutation.mutateAsync({
        to: [formData.to.trim()],
        subject: formData.subject.trim(),
        bodyHtml: formData.body.trim(),
        bodyText: formData.body.trim(),
      })

      setSuccess('Email sent successfully!')
      setFormData({ to: '', subject: '', body: '' })
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
      console.error('Send email error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="to" className="block text-sm font-medium mb-1">
                  To
                </label>
                <Input
                  id="to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={formData.to}
                  onChange={(e) => handleInputChange('to', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">
                  Subject
                </label>
                <Input
                  id="subject"
                  placeholder="Email subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label htmlFor="body" className="block text-sm font-medium mb-1">
                  Message
                </label>
                <Textarea
                  id="body"
                  placeholder="Write your message here..."
                  value={formData.body}
                  onChange={(e) => handleInputChange('body', e.target.value)}
                  disabled={isLoading}
                  rows={12}
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                  {success}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isLoading ? 'Sending...' : 'Send Email'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
