'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
    ChevronLeft, CreditCard, Download,
    FileText, Calendar, Wallet,
    ArrowUpRight, ArrowDownRight,
    Search, Filter, Loader2, Sparkles,
    ShieldCheck, Info, Receipt,
    Building2, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function PayrollPage() {
    const router = useRouter()
    const { data: payRaw, isValidating: loading } = useSWR('/api/staff/payroll', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: true,
        dedupingInterval: 5000
    })

    const { data: meRaw } = useSWR('/api/staff/me', (url) => fetch(url).then(res => res.json()), {
        revalidateOnFocus: false,
        dedupingInterval: 10000
    })

    const payrollData = Array.isArray(payRaw) ? payRaw : []
    const staffInfo = meRaw?.profile || null

    if (!payRaw && loading) return (
        <div className="space-y-8 animate-pulse px-4 pb-10">
            <div className="flex justify-between items-center">
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
                <div className="h-10 w-48 bg-white/5 rounded-xl" />
                <div className="h-10 w-10 bg-white/5 rounded-xl" />
            </div>
            <div className="h-44 w-full bg-white/5 rounded-[40px]" />
            <div className="space-y-4">
                <div className="h-4 w-32 bg-white/5 rounded-full" />
                {[1, 2, 3].map(i => <div key={i} className="h-20 w-full bg-white/5 rounded-3xl" />)}
            </div>
        </div>
    )

    const handleDownload = (payItem: any) => {
        router.push(`/staff/payroll/${payItem.id}`)
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-black text-white tracking-tight ">My Payslips</h1>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Salary History</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <ShieldCheck className="w-5 h-5" />
                </div>
            </div>

            {/* Current Salary Card */}
            <div className="bg-[#161b22] border border-white/[0.05] rounded-[40px] p-8 relative overflow-hidden group shadow-2xl shadow-black/40">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest  leading-none mb-1.5">CTC / Annual Package</p>
                        <h2 className="text-2xl font-black text-white tracking-tight ">₹ {((staffInfo?.baseSalary || 0) * 12).toLocaleString()}</h2>
                    </div>
                </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/[0.03] p-4 rounded-3xl">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Monthly Base</p>
                        <p className="text-sm font-black text-white">₹ {(staffInfo?.baseSalary || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.03] p-4 rounded-3xl">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Last Hike</p>
                        <p className="text-sm font-black text-blue-500">+8.5%</p>
                    </div>
                </div>
            </div>

            {/* Payroll List */}
            <div className="space-y-4 min-h-[300px]">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ">Salary Credits</h3>
                    <Filter className="w-4 h-4 text-gray-700" />
                </div>

                {payrollData.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                        <Receipt className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-600">No payroll history found</p>
                    </div>
                ) : (
                    payrollData.map((item) => (
                        <div key={item.id} className="bg-[#161b22] border border-white/[0.05] p-5 rounded-3xl flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500">
                                    <FileText className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white  tracking-tight">{item.month} {item.year}</h4>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Credited: {format(new Date(item.paymentDate || item.updatedAt), 'MMM dd')}</p>                                </div>
                            </div>
                            <div className="text-right flex items-center gap-6">
                                <div className="hidden sm:block">
                                    <p className="text-xs font-black text-white ">₹ {item.netSalary.toLocaleString()}</p>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Paid</span>
                                </div>
                                <button
                                    onClick={() => handleDownload(item)}
                                    className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Insights */}
            <div className="p-6 bg-[#161b22] border border-white/[0.05] rounded-[40px] relative overflow-hidden">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">Note</h4>
                        <p className="text-[10px] font-medium text-gray-500 leading-relaxed ">Your salary slips are generated by the system. If you notice any discrepancy in your pay, please raise a ticket via the support section or contact HR within 3 working days.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
