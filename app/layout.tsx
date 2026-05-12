import type { Metadata } from 'next'
import { Inter, Outfit, Cormorant_Garamond } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from 'sonner'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif'
})

export const metadata: Metadata = {
  title: 'Zenbourg - Hotel Management System',
  description: 'All-in-one hotel operations platform for admins and staff',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Zenbourg',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  themeColor: '#4A9EFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { Providers } from './providers'
import dynamic from 'next/dynamic'

// ... imports

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.variable, outfit.variable, cormorant.variable, inter.className)}>
        {/* Razorpay Checkout SDK — must be loaded globally before any payment */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
        <Providers>
          {children}
          <Toaster 
            position="bottom-center" 
            richColors 
            expand={true}
            toastOptions={{
              className: 'rounded-3xl border-white/10 bg-[#161b22] text-white font-outfit shadow-2xl',
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
