'use client'

import { Button } from '@/components/ui/button'
import { Email } from '@/app/page'
import { trpc } from '@/lib/trpc'

interface EmailViewProps {
  email: Email | null
}

export function EmailView({ email }: EmailViewProps) {
  const { data: fullEmail, isLoading } = trpc.email.getMessage.useQuery(
    {
      id: email?.id || '',
      folder: email?.folder || 'INBOX',
    },
    {
      enabled: !!email?.id,
    }
  )

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-lg font-medium mb-2">Select an email to read</h3>
          <p className="text-sm">Choose an email from the list to view its contents</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-muted-foreground">Loading email...</div>
      </div>
    )
  }

  const displayEmail = fullEmail || email

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <div className="flex-1 bg-card overflow-y-auto">
      <div className="border-b p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold mb-2 break-words">
              {displayEmail.subject}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-medium">From:</span>
              <span>{displayEmail.from}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="font-medium">To:</span>
              <span>{displayEmail.to.join(', ')}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(displayEmail.date)}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm">
              Reply
            </Button>
            <Button variant="outline" size="sm">
              Forward
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: displayEmail.bodyHtml }}
        />
      </div>
    </div>
  )
}
