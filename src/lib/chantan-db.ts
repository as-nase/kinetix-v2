// AUTO-GENERATED — DO NOT MODIFY
// ChanTan Database Client (Local browser-storage mode)
// Data is stored in THIS browser only (localStorage). No account, no server.

const PROJECT_ID = "4f7cb80a-c353-4e9b-92a5-e838b4bf92f9"
const NS = 'chantan_local_' + PROJECT_ID + '_'
const USERS_KEY = NS + '__users'
const SESSION_KEY = NS + '__session'

interface AuthUser {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
  last_login: string | null
  metadata: Record<string, any>
}
interface AuthResponse { user: AuthUser | null; token: string | null; error: string | null }

function uid(): string {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID() } catch {}
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}
function readArr(table: string): any[] {
  try { const raw = localStorage.getItem(NS + table); return raw ? JSON.parse(raw) : [] } catch { return [] }
}
function writeArr(table: string, rows: any[]): void {
  try { localStorage.setItem(NS + table, JSON.stringify(rows)) }
  catch (e) { throw new Error('This browser ran out of local storage space. Local mode keeps data on the device — switch to a database (Chantan or your own Supabase) for larger apps.') }
}
function matches(row: any, filter: Record<string, any>): boolean {
  for (const k in filter) { if (k === 'user_id' && (filter as any)[k] == null) continue; if (row[k] !== (filter as any)[k]) return false }
  return true
}
function currentUser(): AuthUser | null {
  try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

export const chantanDB = {
  async insert(table: string, data: Record<string, any>) {
    const rows = readArr(table)
    const user = currentUser()
    const row = { id: uid(), ...data, ...(user ? { user_id: user.id } : {}), created_at: new Date().toISOString() }
    rows.push(row)
    writeArr(table, rows)
    return row
  },

  async select(table: string, filter: Record<string, any> = {}, options: { orderBy?: string; desc?: boolean; limit?: number } = {}) {
    const user = currentUser()
    const scoped = { ...filter }
    if (user && !('user_id' in scoped)) (scoped as any).user_id = user.id
    let rows = readArr(table).filter(r => matches(r, scoped))
    if (options.orderBy) {
      const key = options.orderBy
      rows = rows.slice().sort((a, b) => {
        const av = a[key], bv = b[key]
        if (av === bv) return 0
        return (av > bv ? 1 : -1) * (options.desc ? -1 : 1)
      })
    }
    if (options.limit) rows = rows.slice(0, options.limit)
    return rows
  },

  async update(table: string, filter: Record<string, any>, data: Record<string, any>) {
    const user = currentUser()
    const scoped = { ...filter }
    if (user && !('user_id' in scoped)) (scoped as any).user_id = user.id
    const rows = readArr(table)
    let updated = 0
    for (let i = 0; i < rows.length; i++) {
      if (matches(rows[i], scoped)) { rows[i] = { ...rows[i], ...data, updated_at: new Date().toISOString() }; updated++ }
    }
    writeArr(table, rows)
    return { updated }
  },

  async delete(table: string, filter: Record<string, any>) {
    const user = currentUser()
    const scoped = { ...filter }
    if (user && !('user_id' in scoped)) (scoped as any).user_id = user.id
    const rows = readArr(table)
    const kept = rows.filter(r => !matches(r, scoped))
    writeArr(table, kept)
    return { deleted: rows.length - kept.length }
  },

  async count(table: string, filter: Record<string, any> = {}) {
    const user = currentUser()
    const scoped = { ...filter }
    if (user && !('user_id' in scoped)) (scoped as any).user_id = user.id
    return readArr(table).filter(r => matches(r, scoped)).length
  },

  auth: {
    async signUp(email: string, password: string, metadata: Record<string, any> = {}): Promise<AuthResponse> {
      try {
        const users = readArr('__users')
        if (users.some((u: any) => u.email === email)) return { user: null, token: null, error: 'An account with this email already exists.' }
        const isFirst = users.length === 0
        const user: AuthUser = { id: uid(), email, display_name: (metadata as any).display_name || null, role: isFirst ? 'owner' : 'user', created_at: new Date().toISOString(), last_login: new Date().toISOString(), metadata }
        users.push({ ...user, password })
        writeArr('__users', users)
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)) } catch {}
        return { user, token: 'local-' + user.id, error: null }
      } catch (e: any) { return { user: null, token: null, error: e.message } }
    },
    async signIn(email: string, password: string): Promise<AuthResponse> {
      try {
        const users = readArr('__users')
        const match = users.find((u: any) => u.email === email && u.password === password)
        if (!match) return { user: null, token: null, error: 'Wrong email or password.' }
        const { password: _pw, ...user } = match
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)) } catch {}
        return { user, token: 'local-' + user.id, error: null }
      } catch (e: any) { return { user: null, token: null, error: e.message } }
    },
    signOut() { try { localStorage.removeItem(SESSION_KEY) } catch {} },
    async getUser(): Promise<AuthUser | null> { return currentUser() },
    async user(): Promise<AuthUser | null> { return currentUser() },
    async isAuthenticated(): Promise<boolean> { return !!currentUser() },
  },

  storage: {
    async upload(file: File | Blob, options: { private?: boolean; fileName?: string } = {}): Promise<{ url: string; path: string; size: number }> {
      const size = (file as any).size || 0
      if (size > 2_000_000) throw new Error('Local mode can only keep small files (under ~2MB) in the browser. For bigger files, switch to a database (Chantan or your own Supabase).')
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Could not read the file.'))
        reader.readAsDataURL(file)
      })
      const fileName = options.fileName || (file instanceof File ? file.name : 'upload-' + Date.now() + '.bin')
      return { url: dataUrl, path: fileName, size }
    },
    async delete(_path: string): Promise<void> { /* data URLs are inline; nothing to delete */ },
    async list(): Promise<Array<{ name: string; size: number; mime: string; url: string | null; created_at: string }>> { return [] },
  },

  users: {
    async list(): Promise<AuthUser[]> { return readArr('__users').map((u: any) => { const { password: _p, ...rest } = u; return rest }) },
    async update(userId: string, data: { role?: string; display_name?: string; metadata?: Record<string, any> }) {
      const users = readArr('__users')
      const i = users.findIndex((u: any) => u.id === userId)
      if (i >= 0) { users[i] = { ...users[i], ...data }; writeArr('__users', users) }
      return { updated: i >= 0 ? 1 : 0 }
    },
    async delete(userId: string) {
      const users = readArr('__users')
      const kept = users.filter((u: any) => u.id !== userId)
      writeArr('__users', kept)
      return { deleted: users.length - kept.length }
    },
  },

  functions: {
    async invoke<T = unknown>(_slug: string, _opts?: { body?: any }): Promise<{ data: T | null; error: string | null }> {
      throw new Error('This feature needs a server, which Local mode does not have. Switch to "My own Supabase" in the database panel to enable server-side features.')
    },
  },
}

export default chantanDB
