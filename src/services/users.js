import { supabase } from '../lib/supabase'

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateUserProfile(id, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Staff accounts should be created via Supabase Dashboard Invite
 * or the create_staff_user RPC (service role / admin SQL).
 * This helper updates role/active after the auth user exists.
 */
export async function inviteStaffNote() {
  return 'Buat akun via Supabase Auth (Invite user), lalu set role di halaman ini atau jalankan SQL bootstrap admin.'
}
