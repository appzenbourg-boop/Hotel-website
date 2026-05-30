'use client'

import { Mail, Phone, MapPin, Building2 } from 'lucide-react'

export default function ContactUs() {
    return (
        <div className="min-h-screen bg-[#05070a] text-white font-outfit selection:bg-amber-500/30 selection:text-amber-200">
            {/* Grid pattern backdrop */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
            
            {/* Top gradient glow */}
            <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-amber-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-6 py-20 sm:px-12 lg:px-16">
                {/* Header Section */}
                <div className="mb-16 border-b border-white/10 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Building2 className="w-3.5 h-3.5" />
                        Get in Touch
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                        Contact Us
                    </h1>
                    <p className="text-gray-400 leading-relaxed max-w-2xl">
                        We are here to help you. Reach out to us regarding any queries about the StayIn Core platform, pricing, support, or legal policies.
                    </p>
                </div>

                {/* Main Content Stack */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Contact Details Grid */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-amber-400" />
                                Operational Entity
                            </h3>
                            <div className="space-y-4 text-sm text-gray-400">
                                <p className="font-medium text-white">Harsh (Operating as StayIn Core / Zenbourg)</p>
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-amber-400" />
                                Email Communications
                            </h3>
                            <div className="space-y-4 text-sm text-gray-400">
                                <p>For support, legal compliance, and onboarding inquiries:</p>
                                <a href="mailto:info.zenbourg@gmail.com" className="text-amber-400 font-bold hover:underline">info.zenbourg@gmail.com</a>
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Phone className="w-5 h-5 text-amber-400" />
                                Telephone Support
                            </h3>
                            <div className="space-y-4 text-sm text-gray-400">
                                <p>Available Mon-Fri, 9:00 AM to 6:00 PM IST.</p>
                                <a href="tel:+918433364402" className="text-amber-400 font-bold hover:underline">+91 8433364402</a>
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px] h-full">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-amber-400" />
                                Registered Address
                            </h3>
                            <div className="space-y-4 text-sm text-gray-400">
                                <p className="font-medium text-white">Harsh</p>
                                <p>C - 100 , Ram park ext , Loni</p>
                                <p>Ghaziabad, Uttar Pradesh, PIN: 201102</p>
                                <p>India</p>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-16 pt-8 border-t border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                    StayIn Core Ecosystem · All Proprietary Rights Secured © 2026
                </div>
            </div>
        </div>
    )
}
