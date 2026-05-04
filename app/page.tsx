import dynamic from 'next/dynamic'

// Disable SSR for the landing page entirely — it uses framer-motion,
// scroll listeners, and PWA hooks that are all client-only.
// This eliminates all hydration mismatches.
const LandingPage = dynamic(() => import('@/components/landing/LandingPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#4A9EFF] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export default function Page() {
  return <LandingPage />
}
