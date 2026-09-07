// Creating a staff account, and issuing or resetting its sign-in details.
//
// This has to run on a server. Making an account, setting somebody else's password and deleting
// one all need the Supabase Admin API, which needs the service role key — a key that bypasses
// every policy in the database and must never reach a browser. The adapter therefore refused
// these outright, with the result that against a real backend an admin could not create a staff
// account at all: the one thing the whole role system exists to support.
//
// Deploy:  npx supabase functions deploy staff-accounts
// Locally: npx supabase functions serve staff-accounts
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to the function by the platform. They
// are not in .env and are not readable by the client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// The same rules the app applies, restated here because this endpoint is reachable directly and
// the app's copy runs on the caller's own machine.
function passwordProblem(password: string): string | null {
  if (!password || password.length < 8) return 'A password must be at least 8 characters.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'A password needs at least one letter and one number.'
  return null
}
function usernameProblem(username: string): string | null {
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    return 'A username must be 3–32 characters: letters, numbers, dots, dashes or underscores.'
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  // Who is asking. The JWT is verified by Supabase Auth rather than trusted as sent, and the
  // role is read from the database rather than from anything in the token — a client that sets
  // its own claims gets nowhere.
  const authHeader = req.headers.get('Authorization') ?? ''
  const asCaller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await asCaller.auth.getUser()
  if (authError || !user) return json({ error: 'Sign in first.' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: caller } = await admin.from('profiles')
    .select('id, role, super_admin, archived, status').eq('id', user.id).maybeSingle()
  if (!caller || caller.role !== 'admin' || caller.archived || caller.status !== 'active') {
    return json({ error: 'Your account does not have access to that.' }, 403)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Malformed request.' }, 400) }
  const action = String(body.action ?? '')

  // Only a super admin may create or alter another admin — the same rule the database enforces
  // on the role column (migration 0005).
  const guardAdminTarget = async (targetId: string) => {
    const { data: target } = await admin.from('profiles').select('role').eq('id', targetId).maybeSingle()
    if (!target) return 'Account not found.'
    if (target.role === 'admin' && targetId !== caller.id && !caller.super_admin) {
      return "Only a super admin can change another admin's sign-in details."
    }
    return null
  }

  try {
    if (action === 'create') {
      const email = String(body.email ?? '').trim().toLowerCase()
      const name = String(body.name ?? '').trim()
      const role = String(body.role ?? 'staff')
      const username = body.username ? String(body.username).trim().toLowerCase() : null
      const password = String(body.password ?? '')

      if (!email || !name) return json({ error: 'A name and an email address are required.' }, 400)
      if (!['staff', 'admin'].includes(role)) return json({ error: 'Accounts created here are staff or admin.' }, 400)
      if (role === 'admin' && !caller.super_admin) return json({ error: 'Only a super admin can create an admin account.' }, 403)
      const pwProblem = passwordProblem(password)
      if (pwProblem) return json({ error: pwProblem }, 400)
      if (username) {
        const unProblem = usernameProblem(username)
        if (unProblem) return json({ error: unProblem }, 400)
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password,
        // No inbox to confirm from, and the account is being handed to somebody in person.
        email_confirm: true,
        user_metadata: { full_name: name },
      })
      if (createError) return json({ error: createError.message }, 400)

      // The trigger in migration 0011 has already made a customer profile for them; this is the
      // part only an admin can do. must_change_password is set because a password an admin typed
      // is a shared secret until its holder replaces it — and the permission to replace it is
      // granted at the same time, or they could not.
      const { error: profileError } = await admin.from('profiles').update({
        full_name: name, role, username,
        branch_id: body.branch ?? null,
        job_title: body.jobTitle ?? null,
        must_change_password: true,
        password_change_allowed: true,
      }).eq('id', created.user.id)
      if (profileError) {
        // Do not leave an auth account with no usable profile behind.
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileError.message }, 400)
      }
      return json({ id: created.user.id, email, username, role, mustChange: true })
    }

    if (action === 'issue-credentials') {
      const userId = String(body.userId ?? '')
      const problem = await guardAdminTarget(userId)
      if (problem) return json({ error: problem }, 403)

      const patch: Record<string, unknown> = {}
      if (body.username !== undefined) {
        const username = body.username ? String(body.username).trim().toLowerCase() : null
        if (username) {
          const unProblem = usernameProblem(username)
          if (unProblem) return json({ error: unProblem }, 400)
        }
        patch.username = username
      }
      if (body.password) {
        const password = String(body.password)
        const pwProblem = passwordProblem(password)
        if (pwProblem) return json({ error: pwProblem }, 400)
        const { error } = await admin.auth.admin.updateUserById(userId, { password })
        if (error) return json({ error: error.message }, 400)
        const mustChange = body.mustChange !== false
        patch.must_change_password = mustChange
        patch.password_change_allowed = mustChange
      }
      if (Object.keys(patch).length) {
        const { error } = await admin.from('profiles').update(patch).eq('id', userId)
        if (error) return json({ error: error.message }, 400)
      }
      const { data: after } = await admin.from('profiles')
        .select('id, username, must_change_password, password_change_allowed').eq('id', userId).single()
      return json({
        userId: after.id, username: after.username, hasPassword: true,
        mustChange: !!after.must_change_password, changeAllowed: !!after.password_change_allowed,
      })
    }

    if (action === 'forget-credentials') {
      const userId = String(body.userId ?? '')
      if (userId === caller.id) return json({ error: 'You cannot delete your own sign-in.' }, 400)
      const problem = await guardAdminTarget(userId)
      if (problem) return json({ error: problem }, 403)
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return json({ error: error.message }, 400)
      return json({ removed: true })
    }

    return json({ error: `Unknown action "${action}".` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Something went wrong.' }, 500)
  }
})
