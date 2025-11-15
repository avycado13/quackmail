'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { EmailList } from '@/components/email-list'
import { EmailView } from '@/components/email-view'
import { ProtectedRoute } from '@/components/protected-route'

export interface Email {
  id: string
  subject: string
  from: string
  to: string[]
  date: string
  bodyHtml: string
  folder: string
  unread: boolean
}

export default function Home() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [currentFolder, setCurrentFolder] = useState('inbox')

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          onFolderChange={setCurrentFolder}
        />

        {/* Email List */}
        <EmailList
          folder={currentFolder}
          selectedEmail={selectedEmail}
          onEmailSelect={setSelectedEmail}
        />

        {/* Email View */}
        <EmailView email={selectedEmail} />
      </div>
    </ProtectedRoute>
  )
}
