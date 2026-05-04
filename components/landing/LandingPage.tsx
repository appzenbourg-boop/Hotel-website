'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
  Building2, 
  ShieldCheck, 
  UserCog, 
  ChevronRight, 
  Download, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  Globe, 
  Lock,
  Menu,
  X,
  Smartphone,
  ArrowRight,
  Sparkles,
  Fingerprint,
  Activity,
  Layers,
  Cpu,
  Monitor,
  Share2
} from 'lucide-react'
import { usePwaInstall } from '@/lib/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  const { isInstallable, installPwa } = usePwaInstall()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const FADE_UP: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 1.2, ease: [0.19, 1, 0.22, 1] }
    }
  }

  const STAGGER: Variants = {
    visible: { transition: { staggerChildren: 0.15 } }
  }

  const connectionNodes = [
    { top: '35%', left: '25%', city: 'New York' },
    { top: '30%', left: '48%', city: 'London' },
    { top: '45%', left: '65%', city: 'Dubai' },
    { top: '55%', left: '80%', city: 'Singapore' },
    { top: '65%', left: '30%', city: 'S├úo Paulo' }
  ]

  return (
    <div className="min-h-screen bg-[#050505] text-[#D1D1D1] selection:bg-[#4A9EFF]/30 font-sans tracking-tight overflow-x-hidden">
      
      {/* ΓöÇΓöÇ HEADER ΓöÇΓöÇ */}
      <nav className={cn(
        "fixed top-0 inset-x-0 z-[100] transition-all duration-1000",
        scrolled 
          ? "bg-[#050505]/80 backdrop-blur-3xl border-b border-white/[0.03] py-5" 
          : "bg-transparent py-10"
      )}>
        <div className="max-w-[1400px] mx-auto px-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#4A9EFF] transition-colors duration-500">
               <div className="w-1 h-1 bg-white rounded-full group-hover:bg-[#4A9EFF] transition-all duration-500 shrink-0" />
            </div>
            <span className="text-xl font-bold tracking-[0.2em] uppercase text-white font-outfit">Zenbourg</span>
          </Link>

          <div className="hidden lg:flex items-center gap-14 text-[9px] font-bold uppercase tracking-[0.4em] text-white/30">
            {['Ecosystem', 'Intelligence', 'Security', 'Network'].map((item) => (
              <motion.div key={item} whileHover={{ y: -1 }}>
                <Link 
                  href={`#${item.toLowerCase()}`}
                  className="hover:text-white transition-colors duration-500"
                >
                  {item}
                </Link>
              </motion.div>
            ))}
            <Link 
              href="/admin/login"
              className="px-6 py-2 border border-white/5 rounded-full hover:bg-white hover:text-black transition-all duration-700 hover:border-white text-[8px]"
            >
              Executive Portal
            </Link>
          </div>

          <button 
            className="lg:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </div>
      </nav>

      <main>
        {/* ΓöÇΓöÇ HERO ΓöÇΓöÇ */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden border-b border-white/[0.03]">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-y-0 left-0 w-full md:w-[70%] bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent z-10" />
             <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050505] to-transparent z-10" />
             <div className="absolute inset-0 bg-[#050505]/10 z-[11]" />
             <motion.div 
               initial={{ scale: 1.1, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ duration: 2.5, ease: "easeOut" }}
               className="w-full h-full"
             >
                <img 
                  src="/images/hero.png" 
                  alt="Luxury Lobby" 
                  className="w-full h-full object-cover grayscale-[20%] brightness-95"
                />
             </motion.div>
          </div>

          <div className="relative z-20 max-w-[1400px] w-full px-10 pt-20">
            <motion.div 
              variants={STAGGER}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="max-w-3xl"
            >
              <motion.div 
                variants={FADE_UP}
                className="flex items-center gap-4 mb-8"
              >
                <div className="h-px w-8 bg-[#4A9EFF]/60" />
                <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#4A9EFF]">ESTATE ORCHESTRATION</span>
              </motion.div>
              
              <motion.h1 
                variants={FADE_UP}
                className="text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-8 tracking-tighter font-outfit"
              >
                Executive <br/>
                Orchestration <br/>
                <span className="text-2xl md:text-3xl font-normal tracking-tight text-white/40">Scale your hospitality vision.</span>
              </motion.h1>

              <motion.p 
                variants={FADE_UP}
                className="text-md md:text-lg text-white/40 font-light max-w-md mb-16 leading-relaxed"
              >
                Zenbourg is the operational layer where administrative vision meets operational precision, designed for the worldΓÇÖs most discerning properties.
              </motion.p>

              <motion.div 
                variants={FADE_UP}
                className="flex flex-wrap gap-10"
              >
                <Link href="/admin/login" className="group flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-700 group-hover:scale-110 shadow-2xl">
                        <ArrowRight size={22} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">STRATEGIC ACCESS</div>
                        <div className="text-sm font-bold text-white group-hover:text-[#4A9EFF] transition-colors">Command Center</div>
                    </div>
                </Link>
                <Link href="/staff/login" className="group flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full border border-white/20 text-white flex items-center justify-center transition-all duration-700 group-hover:border-white group-hover:bg-white/5">
                        <UserCog size={22} strokeWidth={1} />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">OPERATIONAL</div>
                        <div className="text-sm font-bold text-white group-hover:text-[#4A9EFF] transition-colors">Staff Dashboard</div>
                    </div>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ΓöÇΓöÇ INTELLIGENCE ΓöÇΓöÇ */}
        <section id="intelligence" className="py-40 bg-[#050505]">
           <div className="max-w-[1400px] mx-auto px-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                 <motion.div 
                   initial={{ opacity: 0, x: -50 }}
                   whileInView={{ opacity: 1, x: 0 }}
                   transition={{ duration: 1.5 }}
                   viewport={{ once: true }}
                   className="relative order-2 lg:order-1"
                 >
                    <div className="absolute inset-0 bg-[#4A9EFF]/5 rounded-[3rem] blur-3xl -z-10" />
                    <div className="border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                       <img src="/images/concierge.png" alt="Command Interface" className="w-full h-auto" />
                    </div>
                 </motion.div>

                 <div className="space-y-16 order-1 lg:order-2 lg:pl-20 relative">
                    <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-[#4A9EFF]/5 blur-[120px] -z-10" />

                    <div className="space-y-10">
                       <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         transition={{ duration: 1 }}
                         viewport={{ once: true }}
                         className="flex items-center gap-4"
                       >
                          <div className="h-px w-10 bg-[#4A9EFF]/40" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#4A9EFF]">DATA COMMAND</span>
                       </motion.div>
                       
                       <motion.h2 
                         initial={{ opacity: 0, y: 20 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         transition={{ duration: 1, delay: 0.2 }}
                         viewport={{ once: true }}
                         className="text-4xl md:text-6xl font-bold text-white leading-tight font-outfit uppercase tracking-tight"
                       >
                         Anticipatory <br/> 
                         <span className="text-[#4A9EFF]">Intelligence Layer.</span>
                       </motion.h2>

                       <motion.p 
                         initial={{ opacity: 0, y: 20 }}
                         whileInView={{ opacity: 1, y: 0 }}
                         transition={{ duration: 1, delay: 0.4 }}
                         viewport={{ once: true }}
                         className="text-lg text-white/50 font-light leading-relaxed max-w-lg"
                       >
                         Precision analytics at every touchpoint. ZenbourgΓÇÖs intelligence engine predicts property needs before they arise, ensuring absolute operational fluidity.
                       </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                       {[
                         { title: "Predictive Yield", icon: <BarChart3 strokeWidth={1} />, desc: "Automated ADR and RevPAR optimization through historical guest behavior." },
                         { title: "Guest Persona", icon: <Fingerprint strokeWidth={1} />, desc: "Behavioral mapping that enables impeccable, six-star personalized concierge services." }
                       ].map((f, i) => (
                         <div key={i} className="space-y-4 group">
                            <div className="text-[#4A9EFF] group-hover:scale-110 transition-transform duration-500">{f.icon}</div>
                            <h4 className="text-sm font-bold text-white uppercase tracking-widest">{f.title}</h4>
                            <p className="text-xs text-white/30 font-light leading-relaxed">{f.desc}</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* ΓöÇΓöÇ NETWORK ΓöÇΓöÇ */}
        <section id="network" className="py-40 bg-[#0A0A0A] border-y border-white/[0.03]">
           <div className="max-w-[1400px] mx-auto px-10">
              <div className="text-center max-w-2xl mx-auto mb-32 space-y-8">
                 <motion.div 
                   initial={{ opacity: 0 }}
                   whileInView={{ opacity: 1 }}
                   className="text-[9px] font-bold uppercase tracking-[0.5em] text-[#4A9EFF]"
                 >
                   Global Enterprise Sync
                 </motion.div>
                 <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight font-outfit uppercase tracking-tight">Unified Sync. <br/> Total Control.</h2>
                 <p className="text-white/40 font-light text-xl">Manage every node in your global portfolio through a singular, high-performance network synchronized in real-time.</p>
              </div>

              <div className="relative aspect-[21/9] w-full bg-[#050505] rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] group">
                 <img src="/images/map.png" alt="Global Map" className="w-full h-full object-cover opacity-30 grayscale brightness-125 transition-all duration-1000 group-hover:opacity-40" />
                 
                 <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    <motion.path 
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.2 }}
                      transition={{ duration: 4, ease: "easeInOut", delay: 1 }}
                      d="M 350,320 C 450,250 550,250 670,405" 
                      stroke="#4A9EFF" 
                      strokeWidth="1" 
                      fill="transparent"
                      className="hidden md:block"
                    />
                    <motion.path 
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.2 }}
                      transition={{ duration: 4, ease: "easeInOut", delay: 1.5 }}
                      d="M 670,405 C 800,450 950,550 1120,500" 
                      stroke="#4A9EFF" 
                      strokeWidth="1" 
                      fill="transparent"
                      className="hidden md:block"
                    />
                 </svg>

                 {connectionNodes.map((node, i) => (
                   <div 
                     key={i} 
                     className="absolute z-20" 
                     style={{ top: node.top, left: node.left }}
                   >
                      <motion.div 
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ delay: i * 0.2, type: "spring" }}
                        className="relative flex items-center justify-center"
                      >
                         <motion.div 
                           animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
                           transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                           className="absolute w-8 h-8 rounded-full bg-[#4A9EFF]/40"
                         />
                         <div className="w-2 h-2 bg-[#4A9EFF] rounded-full shadow-[0_0_15px_rgba(74,158,255,0.8)]" />
                         <div className="absolute top-4 left-4 text-[8px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap bg-[#050505]/60 backdrop-blur pb-1 px-2 rounded">
                            {node.city}
                         </div>
                      </motion.div>
                   </div>
                 ))}

                 <div className="absolute bottom-10 inset-x-10 z-30 flex items-center justify-between border-t border-white/5 pt-10">
                    {[
                      { l: "Time", v: "15:44 UTC", c: "London" },
                      { l: "Nodes", v: "1,204", c: "Active" },
                      { l: "Sync", v: "< 2ms", c: "Global" }
                    ].map((stat, i) => (
                      <div key={i} className="space-y-1">
                          <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/20">{stat.l}</div>
                          <div className="text-sm font-bold text-white font-outfit">{stat.v}</div>
                          <div className="text-[7px] text-[#4A9EFF] font-bold tracking-widest">{stat.c}</div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* ΓöÇΓöÇ SECURITY ΓöÇΓöÇ */}
        <section id="security" className="py-40 bg-[#050505]">
          <div className="max-w-[1400px] mx-auto px-10 border-b border-white/[0.03] pb-40">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
                <div className="space-y-12">
                   <div className="space-y-8">
                      <div className="flex items-center gap-3">
                         <Lock size={14} className="text-[#4A9EFF]" />
                         <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#4A9EFF]">VAULT PRIVACY</span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight font-outfit uppercase tracking-tight">Architecture <br/> of Trust.</h2>
                      <p className="text-xl text-white/40 font-light leading-relaxed max-w-lg">
                        Privacy is not a feature; it is our foundation. Zenbourg houses administrative authority and guest personas within a multi-layered encryption vault.
                      </p>
                   </div>

                   <div className="flex flex-col gap-8 pt-10 border-t border-white/5">
                      {[
                        { l: "Encryption", v: "AES-256 Command Level" },
                        { l: "Compliance", v: "GDPR Architectural Standard" },
                        { l: "Auth", v: "Biometric & Key Enforcement" }
                      ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                           <span className="text-[10px] uppercase tracking-widest text-white/20">{s.l}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest text-[#4A9EFF] border border-[#4A9EFF]/30 px-3 py-1 rounded-full">{s.v}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="relative">
                   <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 1.5 }}
                      className="bg-[#0A0A0A] border border-white/5 p-1 rounded-[3rem] shadow-2xl relative"
                   >
                      <img src="/images/intelligence.png" className="w-full h-auto rounded-[3rem] grayscale brightness-50" alt="Vault" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-24 h-24 rounded-full border border-[#4A9EFF]/20 flex items-center justify-center animate-pulse">
                            <ShieldCheck size={40} className="text-[#4A9EFF]" strokeWidth={0.5} />
                         </div>
                      </div>
                   </motion.div>
                </div>
             </div>
          </div>
        </section>

        {/* ΓöÇΓöÇ PWA ΓöÇΓöÇ */}
        <section className="py-40 bg-[#050505]">
           <div className="max-w-[1400px] mx-auto px-10">
              <div className="bg-[#111111] border border-white/5 rounded-[4rem] p-20 flex flex-col md:flex-row items-center justify-between gap-20 overflow-hidden relative group">
                 <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
                   <Smartphone size={300} strokeWidth={0.5} />
                 </div>
                 
                 <div className="max-w-xl space-y-12 relative z-10">
                    <div className="space-y-6">
                       <h2 className="text-4xl font-bold text-white leading-tight font-outfit uppercase tracking-tight">Command Everywhere.</h2>
                       <p className="text-white/40 font-light leading-relaxed text-lg">
                          The Zenbourg PWA bridges the gap between the executive desk and the property floor. Instant deployment. Unified sync.
                       </p>
                    </div>

                    <div className="flex items-center gap-10">
                       {isInstallable && (
                         <motion.button 
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           onClick={installPwa}
                           className="px-10 py-5 bg-white text-black rounded-full text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-3 shadow-2xl"
                         >
                            <Download size={18} /> Deploy Application
                         </motion.button>
                       )}
                       <div className="h-6 w-px bg-white/10" />
                       <div className="text-[10px] text-white/30 font-bold tracking-[0.2em] uppercase">Fleet Status: SECURE</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-px bg-white/5 rounded-3xl overflow-hidden shadow-2xl shrink-0">
                    <div className="p-12 bg-[#0A0A0A] space-y-6">
                       <LayoutDashboard className="text-[#4A9EFF]" size={28} strokeWidth={1} />
                       <h3 className="text-sm font-bold text-white uppercase tracking-widest">Executive</h3>
                    </div>
                    <div className="p-12 bg-[#0A0A0A] space-y-6">
                       <UserCog className="text-[#4A9EFF]" size={28} strokeWidth={1} />
                       <h3 className="text-sm font-bold text-white uppercase tracking-widest">Staff</h3>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </main>

      {/* ΓöÇΓöÇ FOOTER ΓöÇΓöÇ */}
      <footer className="py-40 bg-[#050505] border-t border-white/[0.03]">
        <div className="max-w-[1400px] mx-auto px-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-40">
            <div className="space-y-10 max-w-sm">
              <div className="flex items-center gap-3">
                 <div className="w-5 h-5 rounded-full border-2 border-[#4A9EFF]" />
                 <span className="text-lg font-bold tracking-[0.1em] text-white uppercase font-outfit">Zenbourg</span>
              </div>
              <p className="text-sm text-white/30 font-light leading-relaxed">
                 &quot;Designed for the world&rsquo;s most breathtaking estates, delivering operational silence and administrative clarity at scale.&quot;
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-24">
               {[
                 { title: "PORTFOLIO", links: ["Estates", "Hospitality", "Asset Yield"] },
                 { title: "EXECUTIVE", links: ["Command", "Analytics", "Intelligence"] },
                 { title: "RESOURCES", links: ["Architecture", "Vault Security", "Deployment"] },
                 { title: "CONTACT", links: ["Inquiry", "Advisory", "Support"] },
               ].map((cat) => (
                 <div key={cat.title} className="space-y-8">
                    <h5 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">{cat.title}</h5>
                    <div className="flex flex-col gap-4">
                       {cat.links.map(link => (
                         <Link key={link} href="#" className="text-sm text-white/30 hover:text-white transition-colors font-light">
                           {link}
                         </Link>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="mt-40 pt-10 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-10">
             <div className="text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase">&copy; 2026 ZENBOURG SYSTEMS. ALL RIGHTS RESERVED.</div>
             <div className="flex gap-10 text-[10px] font-bold tracking-[0.3em] text-white/20 uppercase">
                <Link href="#" className="hover:text-[#4A9EFF]">Architecture</Link>
                <Link href="#" className="hover:text-[#4A9EFF]">Security</Link>
                <Link href="#" className="hover:text-[#4A9EFF]">Compliance</Link>
             </div>
          </div>
        </div>
      </footer>

      {/* ΓöÇΓöÇ MOBILE OVERLAY ΓöÇΓöÇ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[200] bg-[#050505] p-10 flex flex-col items-center justify-center gap-16 text-center"
          >
            <button 
              className="absolute top-10 right-10 p-2 text-white/40"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={32} strokeWidth={1} />
            </button>
            <div className="flex flex-col items-center gap-12">
               {['Ecosystem', 'Intelligence', 'Security', 'Network'].map((link) => (
                 <Link 
                   key={link} 
                   href={`#${link.toLowerCase()}`}
                   onClick={() => setMobileMenuOpen(false)}
                   className="text-5xl font-bold text-white uppercase tracking-tighter font-outfit"
                 >
                   {link}
                 </Link>
               ))}
            </div>
            <Link 
              href="/admin/login"
              className="w-full py-6 bg-white text-black text-center rounded-full text-[11px] font-bold uppercase tracking-[0.4em]"
            >
              Executive Access
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

