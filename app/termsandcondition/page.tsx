'use client'

import { FileText, AlertTriangle, CheckCircle, Scale, Mail, ShieldAlert } from 'lucide-react'

export default function TermsAndConditions() {
    const currentDate = 'May 10, 2026'

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-outfit selection:bg-purple-500/30 selection:text-purple-200">
            {/* Grid pattern backdrop */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
            
            {/* Top gradient glow - purple theme for terms */}
            <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-6 py-20 sm:px-12 lg:px-16">
                {/* Header Section */}
                <div className="mb-16 border-b border-white/10 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Scale className="w-3.5 h-3.5" />
                        Service Agreement
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                        Terms & Conditions
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span>Operational Framework: {currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Stack */}
                <div className="space-y-16 text-gray-300 leading-relaxed">

                    {/* Summary Warning */}
                    <section className="bg-purple-500/5 border border-purple-500/10 rounded-3xl p-6 md:p-8 flex gap-6 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Binding Relational Contract</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                By downloading, accessing, or activating your workspace within the <span className="text-white font-bold">Entry Club</span> application, you explicitly assent to be legally bound by the systemic covenants explicitly articulated hereafter. Non-concurrence mandates immediate cessation of platform interaction.
                            </p>
                        </div>
                    </section>

                    {/* Core Definitions */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-lg">
                                <Scale className="w-5 h-5 text-gray-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">1. Logical Domain & Parties</h2>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">
                            These Standard Service Terms orchestrate the operational usage criteria of the digital ecosystems proprietary to <span className="text-white font-bold">Entry Club</span>, governing relations between Entry Club Operators (&quot;Company&quot;) and the utilizing entity (&quot;User,&quot; &quot;Host,&quot; or &quot;Guest&quot;).
                        </p>
                        <ul className="space-y-4">
                            {[
                                { title: "Platform Utility", text: "Entry Club functions strictly as a logistical aggregation vector connecting validated users with participating leisure and venue infrastructures." },
                                { title: "Eligibility Constraints", text: "Access parameters strictly mandate full cognitive maturity and a chronological age minimum of 18 calendar years." }
                            ].map((item, i) => (
                                <li key={i} className="flex gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block text-white text-sm mb-1">{item.title}</strong>
                                        <span className="text-xs text-gray-500">{item.text}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* User Duties and Payments */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <section className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px]">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-purple-400" />
                                2. Account Integrity
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Safeguarding algorithmic authentication artifacts (OTPs, system tokens) represents a strictly absolute non-transferable user mandate. The Company asserts zero responsibility for downstream unauthorized ecosystem exploitation leveraging compromised local user device states.
                            </p>
                        </section>
                        
                        <section className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-[28px]">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Scale className="w-5 h-5 text-blue-400" />
                                3. Fiscal Transactions
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                All ecosystem debits facilitate via certified partner gateways (Razorpay). All finalize states remain non-retractable, subject strictly to explicit standalone documented cancellation policy overrides native to concrete individual venue operators.
                            </p>
                        </section>
                    </div>

                    {/* Booking Policy */}
                    <section>
                        <h3 className="text-xl font-bold text-white mb-6 tracking-tight">4. Dynamic Bookings & Fulfilment</h3>
                        <div className="space-y-4 text-sm text-gray-400">
                            <p>
                                Users explicitly recognize that while Entry Club facilitates the logistical bridge between parties, physical service provisioning (F&B consistency, venue access mechanics, safety protocols) remains standard non-transferable liabilities exclusively bound to the physical venue management hierarchy.
                            </p>
                            <p>
                                Verified Hosts represent that all documentary artifacts submitted during onboarding vectors maintain literal and dynamic accuracy. Falsification triggers instant dynamic asset foreclosure and permanent ban protocols.
                            </p>
                        </div>
                    </section>

                    {/* Liability Cap */}
                    <section className="p-8 border border-red-500/10 bg-red-900/5 rounded-[32px]">
                        <h3 className="text-xl font-bold text-red-400 mb-4 tracking-tight">5. Absolute Limitation of Liability</h3>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium italic uppercase tracking-tight">
                            TO THE MAXIMUM LATITUDE CONCEDED BY STATUTE, ENTRY CLUB EXPLICITLY RENOUNCES ANY DIRECT, SECONDARY, OR RELATIONAL DAMAGES STEMMING FROM REAL-WORLD VENUE INCIDENTS, TECHNOLOGICAL LATENCY VECTORS, DATA LAGS, OR UNAPPROVED ACTS ORIGINATING FROM THIRD-PARTY NODES BEYOND DIRECT CODEBASE AUTHORITY.
                        </p>
                    </section>

                    {/* Modifications */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4">6. Frame Evolution</h3>
                        <p className="text-sm text-gray-500">
                            Entry Club preserves the autonomous right to modify active programmatic frameworks or contractual covenants arbitrarily. Sustained application interaction post-mutation constitutes algorithmic verification of continued implicit acceptance.
                        </p>
                    </section>

                    {/* Account Deletion */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4">7. Dissolution & Termination</h3>
                        <p className="text-sm text-gray-500">
                            To delete your Entry Club account, email <span className="text-white font-bold">info.zenbourg@gmail.com</span> with your registered phone number. We will delete your account and data within 7 business days.
                        </p>
                    </section>

                    {/* Final Contact Footer */}
                    <section className="relative mt-20 overflow-hidden rounded-[40px] bg-gradient-to-br from-purple-900/20 via-transparent to-transparent border border-purple-500/20 p-8 md:p-12 text-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                        
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Regulatory Directives</h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">For official legal interpretations, governance escalations, or statutory queries, forward communications to our authorized clearing channel.</p>
                        
                        <a 
                            href="mailto:info.zenbourg@gmail.com"
                            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.15)]"
                        >
                            <Mail className="w-4 h-4" />
                            CONTACT CLEARANCE
                        </a>
                        
                        <div className="mt-10 pt-8 border-t border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                            Entry Club Ecosystem · All Proprietary Rights Secured © 2026
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
