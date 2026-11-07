import { supabase } from '../supabase'
import { removeAccountFromVault } from '../../features/auth/accountVault'
import { tr } from '../messages'

type DeleteAccountResponse = {
  deleted?: boolean
  error?: string
}

/**
 * Permanently delete the signed-in account and all owned data.
 * The heavy lifting happens in the `delete-account` Edge Function; the browser
 * never sees the service-role key.
 */
export async function deleteAccount(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  const { data, error } = await supabase.functions.invoke<DeleteAccountResponse>(
    'delete-account',
    { method: 'POST' },
  )

  if (error) {
    let message = error.message || tr('error.deleteAccount')
    const context = (error as { context?: Response }).context
    const status = context?.status

    if (status === 404 || error.name === 'FunctionsFetchError') {
      message = tr('error.edgeNotDeployed')
    }

    if (context && status !== 404) {
      try {
        const body = (await context.clone().json()) as DeleteAccountResponse
        if (body?.error) message = body.error
      } catch {
        // Keep the original error message when the body is not JSON.
      }
    }

    throw new Error(message)
  }

  if (data?.error) throw new Error(data.error)

  if (userId) removeAccountFromVault(userId)
  await supabase.auth.signOut({ scope: 'local' })
}
