'use client'

import { ShieldAlert, RefreshCcw, FileText, CheckCircle, Mail, Scale } from 'lucide-react'

export default function RefundPolicy() {
    const currentDate = 'May 10, 2026'

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-outfit selection:bg-rose-500/30 selection:text-rose-200">
            {/* Grid pattern backdrop */}
            <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
            
            {/* Top gradient glow */}
            <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-6 py-20 sm:px-12 lg:px-16">
                {/* Header Section */}
                <div className="mb-16 border-b border-white/10 pb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-6">
                        <RefreshCcw className="w-3.5 h-3.5" />
                        Transactions
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-gradient-to-br from-white via-white to-white/60 bg-clip-text text-transparent">
                        Cancellation & Refund Policy
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg">
                            <FileText className="w-4 h-4 text-rose-400" />
                            <span>Last Updated: {currentDate}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Stack */}
                <div className="space-y-16 text-gray-300 leading-relaxed">

                    <section className="bg-rose-500/5 border border-rose-500/10 rounded-3xl p-6 md:p-8 flex gap-6 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-rose-600/20 flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-6 h-6 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Our Commitment</h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                StayIn Core believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. We work hard to ensure that your property operations run smoothly and any software subscriptions are handled transparently via Razorpay.
                            </p>
                        </div>
                    </section>

                    {/* Core Definitions */}
                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-lg">
                                <Scale className="w-5 h-5 text-gray-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">1. Subscription Cancellations</h2>
                        </div>
                        <ul className="space-y-4">
                            {[
                                { title: "Cancellation Requests", text: "Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them." },
                                { title: "Software Subscription Cancellations", text: "For StayIn Core subscriptions, you can cancel your subscription at any time. The cancellation will be effective from the next billing cycle." }
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

                    <section>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-lg">
                                <RefreshCcw className="w-5 h-5 text-gray-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">2. Refund Processing</h2>
                        </div>
                        <ul className="space-y-4">
                            {[
                                { title: "Non-refundable software", text: "StayIn Core does not accept cancellation requests for perishable items or digital software services that have already been provisioned and utilized. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good." },
                                { title: "Refund Timeline", text: "In case of any Refunds approved by StayIn Core, it’ll take 9-15 Days for the refund to be processed to the end customer." },
                                { title: "Defective Products", text: "In case of receipt of damaged or defective items, please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 7 days of receipt of the products." }
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

                    {/* Contact Footer */}
                    <section className="relative mt-20 overflow-hidden rounded-[40px] bg-gradient-to-br from-rose-900/20 via-transparent to-transparent border border-rose-500/20 p-8 md:p-12 text-center">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                        
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-4">Refund Support</h2>
                        <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">If you have any questions regarding our refund policy, please contact us immediately.</p>
                        
                        <a 
                            href="mailto:info.zenbourg@gmail.com"
                            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.15)]"
                        >
                            <Mail className="w-4 h-4" />
                            CONTACT SUPPORT
                        </a>
                        
                        <div className="mt-10 pt-8 border-t border-white/10 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">
                            StayIn Core Ecosystem · All Proprietary Rights Secured © 2026
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
