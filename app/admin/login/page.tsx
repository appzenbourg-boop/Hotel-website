'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import Link from 'next/link'
import { Eye, EyeOff, Building2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from 'sonner'

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('Invalid credentials')
      } else if (result?.ok) {
        toast.success('Login successful!')
        
        // Use timeout to let session propagate
        setTimeout(async () => {
          const session = await getSession()
          const user = session?.user
          
          if (user?.department === 'ACCOUNTS') {
            router.push('/admin/payroll')
          } else {
            router.push('/admin/dashboard')
          }
          router.refresh()
        }, 500)
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-hover relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/5 opacity-50" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <Building2 className="w-10 h-10" />
            <span className="text-3xl font-bold">Zenbourg</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Orchestrate excellence.
          </h1>
          <p className="text-lg text-white/90 mb-8">
            The all-in-one platform to manage receptions, staff, and guests seamlessly
            from one centralized command center.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h3 className="font-semibold">Real-time Operations</h3>
                <p className="text-sm text-white/80">Track everything in real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h3 className="font-semibold">Staff Performance</h3>
                <p className="text-sm text-white/80">SLA tracking & incentives</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h3 className="font-semibold">Guest Experience</h3>
                <p className="text-sm text-white/80">Online check-in & services</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <Building2 className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">Zenbourg</span>
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              Log in to Zenbourg
            </h2>
            <p className="text-text-secondary">
              Manage operations, staff, and guests from the admin panel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email or Phone Number"
              type="text"
              placeholder="Enter your ID or email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                  <span className="text-sm text-text-secondary">Remember me</span>
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign In
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-dark text-text-tertiary">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-border text-text-primary hover:bg-white/5"
              onClick={() => signIn('google', { callbackUrl: '/admin/dashboard' })}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Google
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              New to Zenbourg?{' '}
              <Link href="/?register=true" className="text-primary hover:text-primary-hover font-medium">
                Create Hotel Account
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-text-tertiary text-center">
              © 2026 Zenbourg. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
