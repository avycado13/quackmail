'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { PenTool, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { trpc } from '@/lib/trpc'

interface SidebarProps {
  currentFolder: string
  onFolderChange: (folder: string) => void
}

interface Folder {
  name: string
  count: number
}

const folderIcons = {
  inbox: '📥',
  sent: '📤',
  drafts: '📝',
  trash: '🗑️'
}

export function Sidebar({ currentFolder, onFolderChange }: SidebarProps) {
  const router = useRouter()
  const { user, logout } = useAuth()

  const { data: folders = [] } = trpc.email.getFolders.useQuery()

  const logoutMutation = trpc.auth.logout.useMutation()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      logout()
      router.push('/login')
    }
  }
  return (
    <div className="w-64 border-r bg-card">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-primary">🦆 QuackMail</h1>
      </div>

      <div className="p-4">
        <Button
          onClick={() => router.push('/compose')}
          className="w-full mb-4"
        >
          <PenTool className="mr-2 h-4 w-4" />
          Compose
        </Button>

        <h2 className="text-sm font-semibold text-muted-foreground mb-2">FOLDERS</h2>
        <div className="space-y-1">
          {folders.map((folder: Folder) => (
            <Button
              key={folder.name}
              variant={currentFolder === folder.name ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => onFolderChange(folder.name)}
            >
              <span className="mr-2">{folderIcons[folder.name as keyof typeof folderIcons] || '📁'}</span>
              <span className="flex-1 text-left capitalize">{folder.name}</span>
              {folder.count > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                  {folder.count}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t space-y-3 mt-auto">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
          <p className="text-xs text-slate-600 dark:text-slate-400">Logged in as</p>
          <p className="font-medium text-slate-900 dark:text-white truncate">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex-1"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
