"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@core/types'
import * as authApi from '@core/lib/api/auth'
import { clearToken } from '@core/lib/api-client'
import { disconnectRealtime } from '@core/lib/realtime'

interface AuthContextType {
  user: User | null
  isLoading: boolean       // true only during the login API call
  isInitializing: boolean  // true while the app checks for a saved session on startup
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User; mfaRequired?: boolean; preAuthToken?: string }>
  verifyMfa: (preAuthToken: string, code: string) => Promise<{ success: boolean; error?: string; user?: User }>
  acceptInvite: (token: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  logout: () => void
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>
  updateAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null)
  const [isLoading, setIsLoading]         = useState(false)    // login action only
  const [isInitializing, setIsInitializing] = useState(true)  // startup session check

  useEffect(() => {
    // On mount: try to restore session from stored token
    const restoreSession = async () => {
      // Demo sessions restore normally now, same as the real app — a
      // refresh mid-testing (e.g. after importing a real patient/
      // appointment Excel file) shouldn't log you back out. This used to
      // unconditionally clear the token here instead, to stop an
      // already-logged-in visit to /hyrje from silently skipping the
      // quick-login screen — that specific behavior is now handled at its
      // actual source, the auto-redirect in app/(auth)/layout.tsx, which
      // skips itself in demo mode instead of session restoration being
      // disabled globally to work around it.
      const token = localStorage.getItem('hypocrates_token')
      const saved = localStorage.getItem('hypocrates_user')
      if (!token || !saved) {
        setIsInitializing(false)
        return
      }
      try {
        // Validate token with backend
        const { user: fresh } = await authApi.getMe()
        setUser(fresh)
        localStorage.setItem('hypocrates_user', JSON.stringify(fresh))
      } catch {
        // Token expired or invalid — clear it so login page is shown
        clearToken()
      } finally {
        setIsInitializing(false)
      }
    }
    restoreSession()
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User; mfaRequired?: boolean; preAuthToken?: string }> => {
    setIsLoading(true)
    try {
      const result = await authApi.login(email, password)
      if ('mfaRequired' in result) {
        return { success: false, mfaRequired: true, preAuthToken: result.preAuthToken }
      }
      localStorage.setItem('hypocrates_token', result.token)
      localStorage.setItem('hypocrates_user', JSON.stringify(result.user))
      setUser(result.user)
      return { success: true, user: result.user }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gabim gjatë hyrjes'
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyMfa = async (
    preAuthToken: string,
    code: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true)
    try {
      const { token, user: loggedIn } = await authApi.verifyMfaLogin(preAuthToken, code)
      localStorage.setItem('hypocrates_token', token)
      localStorage.setItem('hypocrates_user', JSON.stringify(loggedIn))
      setUser(loggedIn)
      return { success: true, user: loggedIn }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kodi i verifikimit është i gabuar'
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const acceptInvite = async (
    token: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    setIsLoading(true)
    try {
      const { token: sessionToken, user: activated } = await authApi.acceptInvite(token, password)
      localStorage.setItem('hypocrates_token', sessionToken)
      localStorage.setItem('hypocrates_user', JSON.stringify(activated))
      setUser(activated)
      return { success: true, user: activated }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ftesa është e pavlefshme ose ka skaduar'
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authApi.logout()
    disconnectRealtime()
    setUser(null)
  }

  const updateProfile = async (data: { name?: string; email?: string }) => {
    const { user: updated } = await authApi.updateProfile(data)
    setUser(updated)
    localStorage.setItem('hypocrates_user', JSON.stringify(updated))
  }

  const updateAvatar = async (file: File) => {
    const { user: updated } = await authApi.uploadAvatar(file)
    setUser(updated)
    localStorage.setItem('hypocrates_user', JSON.stringify(updated))
  }

  const removeAvatar = async () => {
    const { user: updated } = await authApi.removeAvatar()
    setUser(updated)
    localStorage.setItem('hypocrates_user', JSON.stringify(updated))
  }

  const refreshUser = async () => {
    const { user: fresh } = await authApi.getMe()
    setUser(fresh)
    localStorage.setItem('hypocrates_user', JSON.stringify(fresh))
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isInitializing, login, verifyMfa, acceptInvite, logout, updateProfile, updateAvatar, removeAvatar, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
