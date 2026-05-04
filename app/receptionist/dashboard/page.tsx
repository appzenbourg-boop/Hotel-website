'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, ClipboardList, Calendar, Bell, Search, LayoutDashboard, LogOut } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

export default function ReceptionistDashboard() {
    const { data: session } = useSession()
    const router = useRouter()

    const handleLogout = async () => {
        await signOut({ redirect: false })
        router.push('/admin/login')
        toast.success('Logged out successfully')
    }

    const stats = [
        { label: 'Check-ins today', value: '12', icon: <Calendar className="w-5 h-5" />, color: 'bg-purple-500/10 text-purple-500' },
        { label: 'Active Staff', value: '8', icon: <Users className="w-5 h-5" />, color: 'bg-emerald-500/10 text-emerald-500' },
        { label: 'Pending Requests', value: '5', icon: <ClipboardList className="w-5 h-5" />, color: 'bg-blue-500/10 text-blue-500' },
        { label: 'Alerts', value: '3', icon: <Bell className="w-5 h-5" />, color: 'bg-amber-500/10 text-amber-500' }
    ]

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#141824] border-r border-white/5 hidden lg:flex flex-col p-6">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-xl">Zenbourg</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-600/10 text-purple-400 font-medium">
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                    </button>
                    <button onClick={() => router.push('/receptionist/staff')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all">
                        <Users className="w-5 h-5" /> Manage Staff
                    </button>
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all mt-auto"
                >
                    <LogOut className="w-5 h-5" /> Logout
                </button>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 p-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-bold">Receptionist Desk</h1>
                        <p className="text-gray-400 mt-1">Welcome back, {session?.user?.name || 'Receptionist'}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                placeholder="Search guests, rooms..."
                                className="pl-10 pr-4 py-2.5 bg-[#141824] border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/50 w-64"
                            />
                        </div>
                        <Button
                            variant="primary"
                            className="bg-purple-600 hover:bg-purple-700"
                            leftIcon={<UserPlus className="w-4 h-4" />}
                            onClick={() => router.push('/receptionist/staff')}
                        >
                            Manage Staff
                        </Button>
                        <Avatar name={session?.user?.name || 'R'} className="border-2 border-purple-600/20" />
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {stats.map((stat, i) => (
                        <Card key={i} className="p-6 bg-[#141824] border-white/5 hover:border-purple-600/30 transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400 text-sm font-medium">{stat.label}</span>
                                <div className={`p-2 rounded-lg ${stat.color}`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <span className="text-3xl font-bold">{stat.value}</span>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <section>
                    <h2 className="text-xl font-bold mb-6">Quick Operations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="p-6 bg-gradient-to-br from-purple-600/20 to-transparent border-purple-600/20 hover:border-purple-600/40 cursor-pointer group transition-all">
                            <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors">Staff Onboarding</h3>
                            <p className="text-sm text-gray-400 mb-6">Create new staff profiles and assign shifts directly from your desk.</p>
                            <Button
                                variant="ghost"
                                className="p-0 text-purple-400 hover:text-purple-300 hover:bg-transparent"
                                onClick={() => router.push('/receptionist/staff')}
                            >
                                Get Started &rarr;
                            </Button>
                        </Card>
                    </div>
                </section>
            </main>
        </div>
    )
}
