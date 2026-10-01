import { DEMO_ACCOUNTS } from '@/lib/auth/mockSession'

/**
 * Mock password-reset flow. In production the reset link is emailed; here the token is kept in
 * memory (resets on reload) and handed back to the Forgot Password page so the demo can open the
 * link directly. A successful reset updates the demo account's password for this session.
 */

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000
export const RESET_TOKEN_TTL_MINUTES = RESET_TOKEN_TTL_MS / 60_000

interface ResetToken {
  email: string
  expiresAt: number
  used: boolean
}

const resetTokens = new Map<string, ResetToken>()

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function findAccount(email: string) {
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
}

/**
 * Starts a reset. Always resolves the same way whether or not the email is registered, so the UI
 * never reveals which addresses have accounts. `demoToken` is only returned for known accounts —
 * it stands in for the emailed link.
 */
export async function requestPasswordReset(email: string): Promise<{ demoToken?: string }> {
  await delay(700)
  const account = findAccount(email)
  if (!account) return {}
  // A new request invalidates any earlier links for the same account.
  for (const record of resetTokens.values()) if (record.email === account.email) record.used = true
  const token = crypto.randomUUID().replace(/-/g, '')
  resetTokens.set(token, { email: account.email, expiresAt: Date.now() + RESET_TOKEN_TTL_MS, used: false })
  return { demoToken: token }
}

export type ResetTokenStatus = { state: 'valid'; email: string } | { state: 'expired' | 'used' | 'invalid' }

export async function verifyResetToken(token: string | null): Promise<ResetTokenStatus> {
  await delay(400)
  const record = token ? resetTokens.get(token) : undefined
  if (!record) return { state: 'invalid' }
  if (record.used) return { state: 'used' }
  if (record.expiresAt < Date.now()) return { state: 'expired' }
  return { state: 'valid', email: record.email }
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await delay(700)
  const status = await verifyResetToken(token)
  if (status.state !== 'valid') return { ok: false, error: 'This reset link is no longer valid. Please request a new one.' }
  const account = findAccount(status.email)
  if (!account) return { ok: false, error: 'Account not found.' }
  if (account.password === newPassword) return { ok: false, error: 'Your new password must be different from your current password.' }
  account.password = newPassword
  resetTokens.get(token)!.used = true
  return { ok: true }
}

/** "an••••@fbs.com" — confirms the address without fully echoing it. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return email
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 2))}@${domain}`
}

export interface PasswordRule {
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Upper and lowercase letters', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
  { label: 'At least one special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

/** 0–4: how many password rules are met. */
export function passwordStrength(password: string): number {
  return PASSWORD_RULES.filter((r) => r.test(password)).length
}
