'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Lock, Mail, Loader2, Sparkles, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StaffLoginPage() {
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
                toast.error(result.error === 'CredentialsSignin' ? 'Invalid credentials' : result.error)
            } else {
                toast.success('Welcome to Zenbourg Operations')
                router.refresh()
                setTimeout(() => {
                    router.push('/staff')
                }, 500)
            }
        } catch (error) {
            toast.error('Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2"></div>

            <div className="w-full max-w-sm relative z-10 animate-fade-in">
                {/* Branding */}
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-6 group hover:rotate-6 transition-transform">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter ">ZENBOURG</h1>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <div className="h-[1px] w-4 bg-blue-500/40"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 ">Staff Login</p>
                        <div className="h-[1px] w-4 bg-blue-500/40"></div>
                    </div>
                </div>

                {/* Login Form */}
                <div className="bg-[#161b22]/40 backdrop-blur-2xl border border-white/[0.05] rounded-[40px] p-8 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                    
                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-4">Email or Phone</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com or phone number"
                                    className="w-full bg-[#0d1117] border border-white/[0.05] rounded-2xl px-12 py-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-800"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-4">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#0d1117] border border-white/[0.05] rounded-2xl px-12 py-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-800"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 group hover:shadow-blue-500/40"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <Zap className="w-4 h-4 fill-white" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-10 text-center space-y-4">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed">
                        For hotel staff only.<br/>
                        Contact your manager if you need access.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-gray-800">
                        <div className="w-8 h-[1px] bg-white/5"></div>
                        <Sparkles className="w-3 h-3" />
                        <div className="w-8 h-[1px] bg-white/5"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

