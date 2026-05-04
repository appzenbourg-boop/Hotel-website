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
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              New to Zenbourg?{' '}
              <Link href="/admin/register" className="text-primary hover:text-primary-hover font-medium">
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
