import { CalendarCheck2, CalendarDays, Eye, Globe, WalletCards } from 'lucide-react'
import type { SVGProps } from 'react'
import { PAYSLIP_EMAIL_SENDER, type PayslipEmailContent } from '@/lib/payroll/payslipEmail'
import { formatDate } from '@/lib/utils/format'

/*
 * The HTML payslip notification email. Emails don't inherit the portal theme, so this uses a fixed
 * brand palette (always light, even when the portal is in dark mode):
 */
const C = {
  green: '#1f5c4d',
  greenSoft: '#e6f0ec',
  ink: '#1b2a26',
  text: '#3f4b47',
  muted: '#7a8783',
  card: '#f3f7f5',
  border: '#e1ebe7',
}

/** The FBS brand mark (docs/favicon.svg, served from /public). Emails need an absolute image URL. */
const LOGO_URL = `${typeof window === 'undefined' ? '' : window.location.origin}/favicon.svg`

function FbsLogo({ size = 36 }: { size?: number }) {
  return <img src={LOGO_URL} alt="FBS Payroll" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />
}

function Brand({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <FbsLogo size={small ? 28 : 38} />
      <div className="leading-tight">
        <p className={small ? 'text-sm font-bold' : 'text-lg font-bold'} style={{ color: C.ink }}>
          {PAYSLIP_EMAIL_SENDER.name}
        </p>
        <p className={small ? 'text-[11px]' : 'text-xs'} style={{ color: C.muted }}>
          {PAYSLIP_EMAIL_SENDER.tagline}
        </p>
      </div>
    </div>
  )
}

/** Rounded envelope + payslip + check-badge illustration for the email hero. */
function EnvelopeIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true" {...props}>
      <circle cx="92" cy="66" r="56" fill={C.greenSoft} />
      <circle cx="30" cy="30" r="5" fill="#cfe3db" />
      <circle cx="148" cy="100" r="4" fill="#cfe3db" />
      <path d="M118 16 l6 -8 M126 22 l10 -4 M112 12 l0 -9" stroke={C.green} strokeWidth="3" strokeLinecap="round" />
      {/* Payslip sheet */}
      <rect x="58" y="16" width="62" height="70" rx="6" fill="#ffffff" stroke={C.border} strokeWidth="2" />
      <rect x="67" y="28" width="30" height="5" rx="2.5" fill="#9cc9b9" />
      <rect x="67" y="40" width="44" height="4" rx="2" fill="#dbe7e2" />
      <rect x="67" y="50" width="44" height="4" rx="2" fill="#dbe7e2" />
      <rect x="67" y="60" width="32" height="4" rx="2" fill="#dbe7e2" />
      {/* Envelope */}
      <path d="M40 62 l49 32 l49 -32 v46 a8 8 0 0 1 -8 8 h-82 a8 8 0 0 1 -8 -8 z" fill="#2f7d67" />
      <path d="M40 62 l49 32 l49 -32" fill="none" stroke="#256a57" strokeWidth="2" />
      <path d="M40 116 l38 -28 M138 116 l-38 -28" stroke="#3c8f77" strokeWidth="2" />
      {/* Check badge */}
      <circle cx="132" cy="106" r="15" fill={C.green} stroke="#ffffff" strokeWidth="4" />
      <path d="M125 106 l5 5 l9 -10" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.77 2.65 4.77 6.1v5.46h-4v-4.84c0-1.16-.02-2.64-1.61-2.64-1.61 0-1.86 1.26-1.86 2.56v4.92h-4v-11Z" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
      <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
    </svg>
  )
}

const SOCIAL_LINKS = [
  { label: 'Website', href: 'https://www.fbspayroll.com', icon: <Globe className="size-3.5" /> },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/fbspayroll', icon: <LinkedInIcon /> },
  { label: 'YouTube', href: 'https://www.youtube.com/@fbspayroll', icon: <YouTubeIcon /> },
]

/** Sender / recipient / timestamp strip, as a mail client shows it above the message. */
export function PayslipEmailMeta({ email, timestamp }: { email: PayslipEmailContent; timestamp: string }) {
  return (
    <div className="flex items-start gap-3 px-1 pb-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-white" style={{ borderColor: C.border }}>
        <FbsLogo size={26} />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="break-words" style={{ color: C.ink }}>
          <span className="font-semibold">{email.senderName}</span> <span style={{ color: C.muted }}>&lt;{email.senderAddress}&gt;</span>
        </p>
        <p className="break-words text-xs" style={{ color: C.muted }}>
          To: {email.to ? <span style={{ color: C.text }}>{email.to}</span> : <span className="font-medium text-[#b83b3b]">No email address on file</span>}
        </p>
      </div>
      <p className="shrink-0 text-right text-xs" style={{ color: C.muted }}>
        {formatDate(timestamp, { hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
  )
}

/** The payslip notification email body — greeting, CTA, portal note, pay period/date card, footer. */
export function PayslipEmailTemplate({ email }: { email: PayslipEmailContent }) {
  return (
    <div className="mx-auto w-full max-w-[600px] overflow-hidden rounded-2xl border bg-white font-sans" style={{ borderColor: C.border, color: C.text }}>
      {/* Hero */}
      <div className="relative px-6 pb-2 pt-6 sm:px-9 sm:pt-8" style={{ background: `linear-gradient(180deg, ${C.card} 0%, #ffffff 100%)` }}>
        <div className="flex items-start justify-between gap-4">
          <Brand />
          <EnvelopeIllustration className="-mr-2 -mt-2 w-28 shrink-0 sm:w-40" />
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
          Hi {email.employeeFirstName},
        </h1>
        <p className="mt-2 text-base font-bold sm:text-lg" style={{ color: C.green }}>
          {email.headline}
        </p>
      </div>

      <div className="space-y-6 px-6 pb-7 pt-4 sm:px-9">
        <p className="text-sm leading-relaxed">{email.summary}</p>

        <div className="text-center">
          <a
            href={email.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2.5 rounded-xl px-12 py-3.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
            style={{ background: C.green }}
          >
            <Eye className="size-4" />
            View Payslip
          </a>
        </div>

        <div className="flex items-start gap-3 rounded-xl border px-4 py-3.5" style={{ background: C.card, borderColor: C.border }}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: C.greenSoft, color: C.green }}>
            <WalletCards className="size-4.5" />
          </div>
          <div className="text-xs leading-relaxed">
            <p style={{ color: C.ink }}>
              Your payslip is also available in your{' '}
              <span className="font-semibold" style={{ color: C.green }}>
                employee portal
              </span>
              .
            </p>
            <p style={{ color: C.muted }}>You can log in anytime to access your payslip and other HR features.</p>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-xl border sm:grid-cols-2" style={{ background: C.card, borderColor: C.border }}>
          {[
            { label: 'Pay Period', value: email.payPeriod, icon: <CalendarDays className="size-5" /> },
            { label: 'Pay Date', value: email.payDate, icon: <CalendarCheck2 className="size-5" /> },
          ].map((item, i) => (
            <div key={item.label} className={i === 1 ? 'flex items-start gap-3 border-t px-5 py-4 sm:border-l sm:border-t-0' : 'flex items-start gap-3 px-5 py-4'} style={{ borderColor: C.border }}>
              <span className="mt-0.5" style={{ color: C.green }}>
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-bold" style={{ color: C.ink }}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm">
          <p>Thank you for being a valued member of the {email.companyName} team!</p>
          <p className="mt-3 font-bold" style={{ color: C.ink }}>
            {PAYSLIP_EMAIL_SENDER.name} Team
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-5 sm:px-9" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Brand small />
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                title={s.label}
                className="flex size-7 items-center justify-center rounded-full border bg-white transition-opacity hover:opacity-80"
                style={{ borderColor: C.border, color: C.green }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[11px]" style={{ color: C.muted }}>
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  )
}
