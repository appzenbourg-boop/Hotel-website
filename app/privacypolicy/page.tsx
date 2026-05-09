'use client'

import { Shield, Lock, Eye, UserCheck, Database, Scale, Mail } from 'lucide-react'

export default function PrivacyPolicy() {
    const currentDate = 'May 10, 2026'

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-outfit Selection:bg-blue-500/30 selection:text-blue-200">
            {/* Grid pattern backdrop */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
            
            {/* Top gradient glow */}
            <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-6 py-20 sm:px-12 lg:px-16">
                {/* Header Section */}
                <div className="mb-16 border-b border-white/10 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <Shield className="w-3.5 h-3.5" />
                        Legal Center
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                        Privacy Policy for Entry Club
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                            <Lock className="w-4 h-4 text-emerald-500" />
                            <span>Last Updated: {currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Stack */}
                <div className="space-y-16 text-gray-300 leading-relaxed">

                    {/* Intro Section */}
                    <section>
                        <div className="prose prose-invert max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-white prose-strong:font-semibold">
                            <p className="text-lg text-gray-300 font-medium leading-relaxed">
                                <span className="text-white font-bold">Entry Club</span> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Entry Club mobile application (the &quot;App&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.
                            </p>
                            <p className="mt-4">
                                By using the App, you agree to the collection and use of information in accordance with this policy. We prioritize transparency and only request data necessary for fundamental operational functionality.
                            </p>
                        </div>
                    </section>

                    {/* Data Collection Grid */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <Eye className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Information We Collect</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {[
                                { title: "Phone Number", desc: "Used explicitly for account registration and ultra-secure OTP-based login via standard Firebase Authentication channels." },
                                { title: "Name & Profile Information", desc: "Voluntarily provided by you within the secure container to personalize and verify your holistic user experience." },
                                { title: "Location Data", desc: "Strictly utilized to discover nearby luxury venues, localized events, and logistics services. Only active upon explicit granular permissions." },
                                { title: "Photos and Media", desc: "Accessed exclusively when you purposefully upload identity vectors, profile artifacts, or host verification payloads (PAN/Aadhaar)." },
                                { title: "Payment Information", desc: "Seamlessly processed end-to-end through our certified partner, Razorpay. We maintain zero data footprint of payment artifacts on local buffers." },
                                { title: "Device Vectors", desc: "Encrypted system and device telemetry explicitly used for active push synchronization frameworks and performance monitoring." }
                            ].map((item, i) => (
                                <div key={i} className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:bg-white/[0.04] transition-all hover:border-white/10 group">
                                    <h3 className="text-white font-bold text-sm mb-1.5 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                    <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl">
                            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                <Database className="w-4 h-4 text-purple-400" />
                                Automatically Staged Telemetry
                            </h4>
                            <ul className="space-y-2 list-disc pl-5 text-xs text-gray-400 leading-relaxed">
                                <li>Active push notification tokens enforced strictly for delivering real-time mission-critical updates relative to ongoing bookings and operational orders.</li>
                                <li>Localized usage baseline statistics applied automatically for iterative product and speed optimization workflows.</li>
                            </ul>
                        </div>
                    </section>

                    {/* How We Use Data */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shadow-lg shadow-indigo-900/20">
                                <UserCheck className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Operational Execution Strategy</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            {[
                                "Establishment and validation of secure user registries",
                                "High-velocity processing of luxury venue reservation states",
                                "End-to-end orchestration of F&B delivery modules",
                                "Mission-critical push relay architecture for transactional states",
                                "Facilitation of high-grade financial routing via Razorpay node",
                                "Vetting of host legitimacy via integrated documentation matrix",
                                "Proximity-driven spatial filtering for active localized inventories",
                                "Algorithmic refinement of native ecosystem speed and stability"
                            ].map((point, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                    <span className="text-sm text-gray-400">{point}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Subprocessors */}
                    <section className="p-8 bg-gradient-to-b from-white/[0.03] to-transparent rounded-[32px] border border-white/[0.06]">
                        <h3 className="text-xl font-bold text-white mb-6 tracking-tight">Validated Third-Party Nodes</h3>
                        <p className="text-sm text-gray-400 mb-6">To deliver high-tier system reliability, Entry Club relies strictly on standardized industrial pipelines that maintain independent governance structures:</p>
                        
                        <div className="space-y-3">
                            {[
                                { name: "Firebase by Google", role: "Active identity provider, cloud telemetry, unified relational cloud messaging." },
                                { name: "Razorpay Inc.", role: "Exclusive certified gateway handler for all incoming/outgoing transaction frames." },
                                { name: "Expo Systems", role: "Management node for seamless Over-The-Air differential updates and visual notification relay." }
                            ].map((sub, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/[0.03]">
                                    <div className="font-bold text-sm text-gray-200">{sub.name}</div>
                                    <div className="text-xs text-gray-500 font-medium">{sub.role}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Final Sections Stack */}
                    <div className="space-y-12 border-t border-white/10 pt-12">
                        <div className="grid md:grid-cols-2 gap-12">
                            <div>
                                <h4 className="font-bold text-white text-lg mb-3">Data Lifecycle Protection</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">All transactional conduits operate via rigid SSL/TLS asymmetric encryption layers. While absolute security is mathematically impossible over distributed protocols, our active posture meets maximum modern security benchmarks.</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg mb-3">Retention & Erasure</h4>
                                <p className="text-sm text-gray-400 leading-relaxed">Your logical profile is maintained strictly through the active duration of your relationship. To delete your Entry Club account, email <span className="text-white font-bold">info.zenbourg@gmail.com</span> with your registered phone number. We will delete your account and data within 7 business days.</p>
                            </div>
                        </div>
                        
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                            <h4 className="font-bold text-white text-lg mb-3">Age Eligibility Vectors</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">Operating platforms are strictly gated to individuals satisfying standard majority thresholds (18+). Systems explicitly purge verified minority registrations immediately upon automatic algorithmic detection.</p>
                        </div>
                    </div>

                    {/* Contact Footer */}
                    <section className="relative mt-20 overflow-hidden rounded-[40px] bg-gradient-to-br from-blue-900/20 via-transparent to-transparent border border-blue-500/20 p-8 md:p-12 text-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                        <Scale className="w-12 h-12 text-blue-500 mx-auto mb-6 opacity-50" />
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Still have inquiries?</h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">Reach out to our active legal compliance and operations mailbox for direct escalation relative to policy queries.</p>
                        
                        <a 
                            href="mailto:info.zenbourg@gmail.com"
                            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.15)]"
                        >
                            <Mail className="w-4 h-4" />
                            CONTACT COMPLIANCE
                        </a>
                        
                        <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-3 gap-4 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <div>
                                <span className="block text-gray-600 mb-1 font-medium normal-case">Application</span>
                                Entry Club
                            </div>
                            <div>
                                <span className="block text-gray-600 mb-1 font-medium normal-case">Handler</span>
                                info.zenbourg@gmail.com
                            </div>
                            <div>
                                <span className="block text-gray-600 mb-1 font-medium normal-case">Package Registry</span>
                                com.entryclub.app
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
