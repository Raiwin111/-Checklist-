// ============================================================================
// Edge Function: delete-account
// ----------------------------------------------------------------------------
// Permanently deletes the calling user's account and all owned data.
//
// Security:
//   - The caller is identified from the JWT (never from the request body).
//   - Only the service-role key (server-side secret) can delete auth.users rows.
//   - The service-role key is read from the function environment and is never
//     exposed to the browser.
//
// Deploy:
//   supabase functions deploy delete-account
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BUCKET = 'task-images'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type StorageClient = ReturnType<typeof createClient>['storage']

/**
 * Remove every object under `{userId}/...`.
 * Storage `list` returns one level at a time, so walk folders recursively.
 */
async function removeFolder(storage: StorageClient, prefix: string): Promise<void> {
  const { data: entries, error } = await storage.from(BUCKET).list(prefix, {
    limit: 1000,
  })

  if (error) throw error
  if (!entries || entries.length === 0) return

  const filePaths: string[] = []
  const folderPaths: string[] = []

  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`
    // Folder placeholders have no id and no metadata in Supabase Storage.
    if (entry.id === null && !entry.metadata) folderPaths.push(path)
    else filePaths.push(path)
  }

  if (filePaths.length > 0) {
    const { error: removeError } = await storage.from(BUCKET).remove(filePaths)
    if (removeError) throw removeError
  }

  for (const folder of folderPaths) {
    await removeFolder(storage, folder)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'Server is misconfigured' }, 500)
  }

  // 1. Identify the caller from their own JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Invalid or expired session' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  // 2. Delete the user's files first (storage is not covered by DB cascades).
  try {
    await removeFolder(admin.storage, user.id)
  } catch (storageError) {
    console.error('Failed to remove storage files', storageError)
    return json({ error: 'Failed to remove user images' }, 500)
  }

  // 3. Delete the auth user. Profiles, categories, tasks, images, events,
  //    searches, conflicts and devices cascade from auth.users.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('Failed to delete user', deleteError)
    return json({ error: deleteError.message }, 500)
  }

  return json({ deleted: true })
})
