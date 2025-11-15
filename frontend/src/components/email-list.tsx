'use client'

import { Card } from '@/components/ui/card'
import { Email } from '@/app/page'
import { trpc } from '@/lib/trpc'

interface EmailListProps {
  folder: string
  selectedEmail: Email | null
  onEmailSelect: (email: Email) => void
}

export function EmailList({ folder, selectedEmail, onEmailSelect }: EmailListProps) {
  const { data: emails = [], isLoading, error } = trpc.email.getMessages.useQuery({
    folder: folder || 'INBOX',
    page: 1,
    limit: 50,
  })

  if (isLoading) {
    return (
      <div className="w-96 border-r bg-card flex items-center justify-center">
        <div className="text-muted-foreground">Loading emails...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-96 border-r bg-card flex items-center justify-center">
        <div className="text-destructive">Error loading emails</div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  return (
    <div className="w-96 border-r bg-card overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold capitalize">{folder}</h2>
        <p className="text-sm text-muted-foreground">{emails.length} messages</p>
      </div>

      <div className="divide-y">
        {emails.map((email: Email) => (
          <Card
            key={email.id}
            className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
              selectedEmail?.id === email.id ? 'bg-accent' : ''
            }`}
            onClick={() => onEmailSelect(email)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  email.unread ? 'font-semibold' : ''
                }`}>
                  {email.from}
                </p>
                <p className={`text-sm truncate ${
                  email.unread ? 'font-semibold' : 'text-muted-foreground'
                }`}>
                  {email.subject}
                </p>
              </div>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {formatDate(email.date)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {email.bodyHtml.replace(/<[^>]*>/g, '')}
            </p>
            {email.unread && (
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
