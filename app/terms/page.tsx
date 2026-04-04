import Logo from '@/components/ui/Logo'
import UserMenu from '@/components/ui/UserMenu'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Unpacked',
  description: 'Terms of Service for Unpacked (unpacked.fyi).',
  alternates: { canonical: 'https://unpacked.fyi/terms' },
  openGraph: {
    title: 'Terms of Service — Unpacked',
    description: 'Terms of Service for Unpacked (unpacked.fyi).',
    url: 'https://unpacked.fyi/terms',
    siteName: 'Unpacked',
    type: 'website',
  },
}

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-sm mb-10" style={{ color: '#9E948A' }}>Last updated: April 2026</p>

        <div className="space-y-6" style={{ color: '#3D3D3D', fontSize: '15px', lineHeight: '1.7' }}>
          <p>These terms govern your use of Unpacked (unpacked.fyi), operated by Colin Fitzpatrick. By using Unpacked, you agree to these terms.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>What Unpacked is</h2>
          <p>Unpacked is a research and publishing platform. You ask questions, and our platform produces researched, fact-checked editorial articles. You can publish these articles under your name, share them, and edit them.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Your account</h2>
          <p>You sign in via Google OAuth. You&apos;re responsible for your account activity. One account per person. Don&apos;t share your credentials or let others use your account.</p>
          <p>We may suspend or terminate access at our sole discretion, including for violation of these terms or behaviour that harms the platform, other users, or our reputation.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Content you create</h2>
          <p>You retain rights to the final article you publish. However, you acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Articles are generated using Unpacked&apos;s systems and models</li>
            <li>Similar or identical content may be generated for other users asking similar questions</li>
            <li>You are responsible for reviewing, editing, and validating content before publishing</li>
          </ul>
          <p>You grant Unpacked a perpetual, non-exclusive, worldwide, royalty-free licence to host, display, reproduce, and promote your published content on the platform and in marketing materials. You can set your article to &ldquo;private&rdquo; to hide it from public listings, but this licence survives to cover any prior distribution, caching, or promotional use.</p>
          <p>Articles set to &ldquo;private&rdquo; are only visible to you. Articles set to &ldquo;unlisted&rdquo; are accessible via direct link but not listed publicly. Articles set to &ldquo;published&rdquo; appear in public listings, search, and may be featured by Unpacked.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Content you upload</h2>
          <p>You can upload images to your articles. By uploading an image, you confirm that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You own the image, or</li>
            <li>You have the right to use it (e.g. Creative Commons licence, stock photo licence, your own photograph), or</li>
            <li>The image is in the public domain</li>
          </ul>
          <p>You must not upload images that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Infringe someone else&apos;s copyright or trademark</li>
            <li>Contain offensive, abusive, or illegal content</li>
            <li>Depict people without their consent (where consent is legally required)</li>
            <li>Are misleading or deceptive in the context of the article</li>
          </ul>
          <p>Unpacked is not responsible for user-uploaded content but will remove infringing material promptly upon notification (see our <Link href="/copyright" className="underline" style={{ color: '#BA7517' }}>Copyright Policy</Link>).</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Editorial responsibility</h2>
          <p>Users are responsible for reviewing, editing, and validating content before publishing. Unpacked provides tools to assist in research, writing, and verification, but final editorial responsibility rests with the user.</p>
          <p>Articles are generated through a combination of automated systems and editorial structuring designed to produce clear, opinionated outputs. These outputs do not represent factual certainty or institutional viewpoints.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>AI-generated content disclaimer</h2>
          <p>Unpacked uses automated systems, including artificial intelligence, to generate and verify content. While we take steps to improve accuracy, content may be incomplete, outdated, or incorrect.</p>
          <p>You acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Content may contain errors or omissions</li>
            <li>Information may change over time</li>
            <li>Sources may be incomplete or misinterpreted</li>
            <li>Verification systems, while thorough, are not infallible</li>
          </ul>
          <p>You use all content at your own risk. Unpacked is not responsible for any decisions made based on content on the platform. Do not rely on Unpacked articles for medical, legal, financial, or safety-critical decisions without consulting a qualified professional.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Affiliate and commercial relationships</h2>
          <p>Some articles may contain affiliate links or commercial references. Unpacked or its creators may earn commissions from purchases made through these links.</p>
          <p>This does not constitute endorsement or recommendation. Users should conduct their own research before making purchasing decisions.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the platform to generate spam, misleading content, or content designed to manipulate search engines</li>
            <li>Attempt to circumvent rate limits, tier restrictions, or other platform controls</li>
            <li>Use automated tools to bulk-generate articles without genuine editorial intent</li>
            <li>Harass, impersonate, or harm other users</li>
            <li>Use the platform for any illegal purpose</li>
          </ul>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Prohibited automated use</h2>
          <p>You may not access or use the platform through automated systems (including bots, scripts, or scrapers) without prior written permission. This includes scraping article content, automating article generation outside the platform&apos;s intended interface, or programmatically accessing any part of the service not offered as a public API.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Subscriptions and payments</h2>
          <p>Unpacked offers free and paid tiers. Free accounts include a limited number of articles per month. Paid plans (when available) offer higher limits and additional features.</p>
          <p>Prices, features, and limits may change. We&apos;ll give reasonable notice of any changes that affect paying subscribers. You can cancel anytime and keep access until the end of your billing period. No partial refunds for unused portions of a billing period.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Service availability</h2>
          <p>We may modify, suspend, or discontinue any part of the service at any time without liability. We do not guarantee uninterrupted or error-free operation.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Limitation of liability</h2>
          <p>Unpacked is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to: inaccurate article content, service interruptions, data loss, or third-party claims related to content you publish.</p>
          <p>Our total liability to you for any claim related to the service is limited to the amount you paid us in the 12 months preceding the claim, or &euro;100, whichever is greater.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Changes to these terms</h2>
          <p>We may update these terms. We&apos;ll notify registered users of material changes via the email associated with their Google account. Continued use after changes constitutes acceptance.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Governing law</h2>
          <p>These terms are governed by the laws of Ireland. Disputes will be resolved in the courts of Ireland.</p>

          <h2 className="text-xl font-bold pt-4" style={{ color: '#1A1714' }}>Contact</h2>
          <p>For questions about these terms: <a href="mailto:hello@unpacked.fyi" className="underline" style={{ color: '#BA7517' }}>hello@unpacked.fyi</a></p>
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
