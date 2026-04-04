import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Unpacked',
  description: 'Privacy Policy for Unpacked (unpacked.fyi). How we collect, use, and protect your data.',
  alternates: { canonical: 'https://unpacked.fyi/privacy' },
  openGraph: {
    title: 'Privacy Policy — Unpacked',
    description: 'Privacy Policy for Unpacked (unpacked.fyi). How we collect, use, and protect your data.',
    url: 'https://unpacked.fyi/privacy',
    siteName: 'Unpacked',
    type: 'website',
  },
}

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: '#FAFAF8', minHeight: '100vh' }}>
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium no-underline" style={{ color: '#9E948A' }}>Home</Link>
          <UserMenu />
        </div>
      </nav>

      <article className="max-w-[720px] mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-sora)', color: '#1A1714' }}>
          Privacy Policy
        </h1>
        <p className="text-sm mb-10" style={{ color: '#9E948A' }}>Last updated: April 2026</p>

        <div className="space-y-6" style={{ color: '#3D3D3D', fontSize: '15px', lineHeight: '1.7' }}>
          <p>This policy explains what data Unpacked (unpacked.fyi) collects, why, and how we handle it. We comply with the EU General Data Protection Regulation (GDPR) and applicable data protection laws.</p>
          <p>Data controller: Colin Fitzpatrick. Contact: <a href="mailto:hello@unpacked.fyi" className="underline" style={{ color: '#BA7517' }}>hello@unpacked.fyi</a></p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>What we collect</h2>

          <h3 className="text-base font-bold pt-2" style={{ color: '#1A1714' }}>Information you provide</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Google account data:</strong> When you sign in via Google OAuth, we receive your name, email address, and profile photo. We do not receive your Google password.</li>
            <li><strong>Profile information:</strong> Bio, social links (Twitter/X, LinkedIn, Medium) that you add in your settings.</li>
            <li><strong>Articles and content:</strong> Questions you ask, articles generated, refinements you make, images you upload.</li>
            <li><strong>Feedback:</strong> Votes, comments, and feedback you submit on articles.</li>
            <li><strong>Applications:</strong> If you apply to the Founding Creators programme, your application reason.</li>
          </ul>

          <h3 className="text-base font-bold pt-2" style={{ color: '#1A1714' }}>Information collected automatically</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Usage data:</strong> Pages visited, articles viewed, features used, timestamps.</li>
            <li><strong>Device information:</strong> Browser type, operating system, screen size.</li>
            <li><strong>IP address:</strong> Used for rate limiting and basic geographic context. We do not use IP addresses for tracking or advertising.</li>
            <li><strong>Cookies and local storage:</strong> We only use strictly necessary cookies required for authentication and core functionality. These do not require consent under applicable law. We use localStorage for UI preferences (e.g. dismissed prompts, voting state). We do not use tracking cookies or third-party advertising cookies.</li>
          </ul>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Legal basis for processing</h2>
          <p>We process personal data under the following legal bases:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Contract:</strong> to provide the service you signed up for</li>
            <li><strong>Legitimate interests:</strong> to improve and secure the platform</li>
            <li><strong>Legal obligations:</strong> where required by law</li>
            <li><strong>Consent:</strong> where applicable (e.g. optional communications)</li>
          </ul>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>How we use your data</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>To provide the service:</strong> Generate articles, manage your account, enforce rate limits and tier allowances.</li>
            <li><strong>To improve the platform:</strong> Understand which features are used, identify bugs, improve article quality.</li>
            <li><strong>To communicate with you:</strong> Service notifications, responses to your feedback, updates about your account or the platform.</li>
            <li><strong>To display your content:</strong> Show your published articles on the platform, attribute them to your profile.</li>
          </ul>
          <p>We do not sell your data. We do not use your data for advertising. We do not share your data with third parties for their marketing purposes.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Third-party services</h2>
          <p>We use the following third-party services to operate the platform:</p>
          <p><strong>Supabase</strong> — Database, authentication, file storage. Receives account data, articles, uploaded images.</p>
          <p><strong>Vercel</strong> — Hosting. Receives server logs, IP addresses.</p>
          <p><strong>Google OAuth</strong> — Sign-in. Receives authentication tokens. We don&apos;t store your Google password.</p>
          <p><strong>Brave Search</strong> — Article research. Receives search queries, not linked to your identity.</p>
          <p><strong>Google Gemini</strong> — Article writing and fact-checking. Receives article content, not linked to your identity.</p>
          <p><strong>Anthropic (Claude)</strong> — Article planning and editorial review. Receives article content, not linked to your identity.</p>
          <p><strong>OpenAI</strong> — Fact-check arbitration. Receives article content, not linked to your identity.</p>
          <p><strong>Pexels and Unsplash</strong> — Image sourcing. Receives image search queries, not linked to your identity.</p>
          <p><strong>Stripe</strong> — Payment processing (when available). Receives payment details, handled entirely by Stripe. We don&apos;t store card numbers.</p>
          <p>We do not intentionally include personal identifiers (such as your name or email) when sending content to AI providers unless required for service functionality.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>International data transfers</h2>
          <p>Some of our service providers are located outside the European Economic Area (EEA). Where data is transferred internationally, we rely on appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms approved by the European Commission.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Your rights (GDPR)</h2>
          <p>If you are in the EU/EEA, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Access your personal data</strong> — request a copy of what we hold</li>
            <li><strong>Rectify inaccurate data</strong> — update your profile in settings or contact us</li>
            <li><strong>Delete your data</strong> — you can delete your account, which removes your profile data. Articles you&apos;ve published can be set to private or deleted individually.</li>
            <li><strong>Export your data</strong> — request a machine-readable copy of your data</li>
            <li><strong>Restrict processing</strong> — request we limit how we use your data</li>
            <li><strong>Object to processing</strong> — object to specific uses of your data</li>
            <li><strong>Withdraw consent</strong> — where processing is based on consent, you can withdraw it at any time</li>
          </ul>
          <p>To exercise any of these rights, contact us at <a href="mailto:hello@unpacked.fyi" className="underline" style={{ color: '#BA7517' }}>hello@unpacked.fyi</a>. We will respond within 30 days.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Data retention</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of account deletion.</li>
            <li><strong>Articles:</strong> Retained while your account is active. You can delete individual articles at any time. Published articles that have been shared externally may persist in search engine caches after deletion — we cannot control third-party caches.</li>
            <li><strong>Usage logs:</strong> Retained for 12 months, then automatically deleted.</li>
            <li><strong>API usage logs:</strong> Retained for 12 months for cost tracking, then automatically deleted. These contain token counts and costs, not personal data.</li>
          </ul>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Data security</h2>
          <p>We use industry-standard security measures including encrypted connections (HTTPS), secure authentication (OAuth 2.0), server-side API keys, and row-level security on our database. However, no system is perfectly secure, and we cannot guarantee absolute security.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Children</h2>
          <p>Unpacked is not intended for users under 16. We do not knowingly collect data from children under 16. If we learn we have collected data from a child under 16, we will delete it promptly.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Changes to this policy</h2>
          <p>We may update this policy. We&apos;ll notify registered users of material changes via email. The &ldquo;last updated&rdquo; date at the top will always reflect the current version.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Contact</h2>
          <p>For privacy questions or to exercise your rights: <a href="mailto:hello@unpacked.fyi" className="underline" style={{ color: '#BA7517' }}>hello@unpacked.fyi</a></p>
          <p>If you are unsatisfied with our response, you have the right to lodge a complaint with your local data protection authority. In Ireland, this is the Data Protection Commission (<a href="https://www.dataprotection.ie" className="underline" style={{ color: '#BA7517' }} target="_blank" rel="noopener noreferrer">www.dataprotection.ie</a>).</p>
        </div>

        {/* Back to top */}
        <div className="mt-12 pt-6 text-center" style={{ borderTop: '1px solid #E8E2D9' }}>
          <a href="#" className="text-xs no-underline transition-opacity hover:opacity-70" style={{ color: '#9E948A' }}>↑ Back to top</a>
        </div>
      </article>

      {/* Footer */}
      <footer className="py-8 text-center text-xs" style={{ color: '#94918D', borderTop: '1px solid #E8E2D9' }}>
        <div className="flex items-center justify-center gap-3">
          <Link href="/terms" className="no-underline" style={{ color: '#94918D' }}>Terms</Link>
          <span>·</span>
          <Link href="/privacy" className="no-underline" style={{ color: '#94918D' }}>Privacy</Link>
          <span>·</span>
          <Link href="/copyright" className="no-underline" style={{ color: '#94918D' }}>Copyright</Link>
        </div>
      </footer>
    </div>
  )
}
