'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { LayoutDashboard, Lock, Mail } from 'lucide-react'

export default function ReceptionistLoginPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await signIn('credentials', {
                redirect: false,
                email,
                password,
            })

            if (result?.error) {
                toast.error('Invalid credentials')
            } else {
                router.push('/receptionist/dashboard')
                toast.success('Access Granted. Welcome to the Front Desk.')
            }
        } catch (error) {
            toast.error('Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

            <div className="w-full max-w-md bg-[#141824]/80 backdrop-blur-xl rounded-[32px] shadow-2xl p-10 border border-white/5 relative z-10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-600/20">
                        <LayoutDashboard className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Zenbourg</h1>
                    <p className="text-purple-400 font-medium mt-2">Receptionist Desk</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <Input
                        label="Work Email or Phone"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="receptionist@zenbourg.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                        className="bg-[#0A0E1A] border-white/10 text-white"
                        required
                    />

                    <Input
                        label="Access Code"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-4 h-4" />}
                        className="bg-[#0A0E1A] border-white/10 text-white"
                        required
                    />

                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full h-14 text-lg bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20"
                        loading={loading}
                        type="submit"
                    >
                        Enter Desk
                    </Button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-8">
                    Confidential. Restricted Access.
                </p>
            </div>

            <p className="mt-8 text-gray-500 text-sm">
                &copy; 2026 Zenbourg Hotel Operations
            </p>
        </div>
    )
}
