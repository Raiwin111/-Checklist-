import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const VAULT_KEY = 'ptrs.auth.vault'

export type VaultAccount = {
  userId: string
  email: string
  refreshToken: string
  lastUsedAt: string
}

function readRaw(): VaultAccount[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as VaultAccount[]) : []
  } catch {
    return []
  }
}

function write(accounts: VaultAccount[]) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(accounts))
}

export function listAccounts(): VaultAccount[] {
  return readRaw().sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
}

export function getAccount(userId: string): VaultAccount | undefined {
  return readRaw().find((account) => account.userId === userId)
}

export function saveSessionToVault(session: Session) {
  const email = session.user.email
  if (!email || !session.refresh_token) return

  const accounts = readRaw().filter((account) => account.userId !== session.user.id)
  accounts.push({
    userId: session.user.id,
    email,
    refreshToken: session.refresh_token,
    lastUsedAt: new Date().toISOString(),
  })
  write(accounts)
}

export function removeAccountFromVault(userId: string) {
  write(readRaw().filter((account) => account.userId !== userId))
}

/**
 * Switch the active Supabase session to another remembered account.
 * Strategy A (approved): refresh tokens are kept in the local vault so the
 * switch is instant. This is convenient but only appropriate on a device the
 * user controls.
 */
export async function switchToAccount(userId: string) {
  const target = getAccount(userId)
  if (!target) throw new Error('ACCOUNT_NOT_FOUND')

  await supabase.auth.signOut({ scope: 'local' })

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: target.refreshToken,
  })

  if (error) throw error
  if (data.session) saveSessionToVault(data.session)
  return data.session
}
