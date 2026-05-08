'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import {
    IndianRupee,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Download,
    CheckCircle2,
    CreditCard,
    FileText,
    ExternalLink,
    AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { buildContextUrl } from '@/lib/admin-context'

export default function PayrollPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [month, setMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
    const [payrollData, setPayrollData] = useState<any[]>([])
    const [stats, setStats] = useState({
        totalPayroll: 0,
        paidCount: 0,
        pendingCount: 0,
        avgSalary: 0
    })
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')

    // Modal state
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
    const [showSlipModal, setShowSlipModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [payingPayroll, setPayingPayroll] = useState<any>(null)
    const [manualTxId, setManualTxId] = useState('')

    const fetchPayroll = useCallback(async () => {
        setLoading(true)
        try {
            const [year, m] = month.split('-')
            const res = await fetch(buildContextUrl('/api/payroll', { month: m, year }))
            if (res.ok) {
                const json = await res.json()
                // Handle both { payroll, stats } and { success, data: { payrolls, summary } }
                const payrolls = json?.data?.payrolls ?? json?.payroll ?? []
                const summary = json?.data?.summary ?? json?.stats ?? {}
                setPayrollData(payrolls)
                setStats({
                    totalPayroll: summary.totalPayout ?? summary.totalPayroll ?? 0,
                    paidCount: summary.paidCount ?? 0,
                    pendingCount: summary.pendingCount ?? 0,
                    avgSalary: payrolls.length > 0 ? (summary.totalPayout ?? summary.totalPayroll ?? 0) / payrolls.length : 0
                })
            }
        } catch (error) {
            toast.error('Failed to load payroll data')
        } finally {
            setLoading(false)
        }
    }, [month])

    useEffect(() => {
        fetchPayroll()
    }, [fetchPayroll])

    const filteredPayroll = useMemo(() => {
        return payrollData.filter(p => {
            const matchesSearch = (p.staff?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.staff?.department || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [payrollData, searchQuery, statusFilter]);

    const handleRunPayroll = async () => {
        if (stats.paidCount > 0) {
            toast.error('Payroll Disbursed', {
                description: 'You cannot re-run payroll calculation once payments have been initiated or completed for this month. The current cycle is locked.'
            })
            return
        }

        const confirmRun = confirm(`Are you sure you want to generate payroll for ${month}? This will recalculate all net salaries based on current attendance and base pay.`)
        if (!confirmRun) return

        toast.loading('Generating payroll records...')
        try {
            const [year, m] = month.split('-')
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: parseInt(m), year: parseInt(year) })
            })

            const json = await res.json()

            if (res.ok) {
                toast.dismiss()
                toast.success('Payroll generated successfully')
                fetchPayroll()
            } else {
                toast.dismiss()
                toast.error(json.error || 'Payroll already generated or error occurred')
            }
        } catch (error) {
            toast.dismiss()
            toast.error('Something went wrong')
        }
    }

    const handleMarkAsPaid = async (payroll: any, txIdInput?: string) => {
        const uId = txIdInput || manualTxId
        if (!uId) {
            toast.error('Transaction reference ID is required for manual payments')
            return
        }

        try {
            const res = await fetch(`/api/payroll/${payroll.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'PAID',
                    transactionId: uId,
                    bankDetails: {
                        accountNumber: payroll.staff?.accountNumber || 'N/A',
                        ifscCode: payroll.staff?.ifscCode || 'N/A',
                        bankName: payroll.staff?.bankName || 'N/A'
                    }
                })
            })

            if (res.ok) {
                toast.success('Payment recorded successfully')
                setShowPaymentModal(false)
                setPayingPayroll(null)
                setManualTxId('')
                fetchPayroll()
            } else {
                toast.error('Failed to record payment')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
    }

    const handleRazorpayPayment = async (payroll: any) => {
        try {
            // 0. Guard: Check Razorpay SDK is loaded in window
            if (typeof (window as any).Razorpay === 'undefined') {
                toast.error('Razorpay SDK not loaded', {
                    description: 'Please refresh the page and try again. Ensure you have internet access.',
                })
                return
            }

            // 0b. Guard: Razorpay rejects zero-amount orders
            const netSalary = payroll.netSalary || 0
            if (netSalary <= 0) {
                toast.error('Cannot process payment', {
                    description: `Net salary is ₹0. Please run payroll calculation first (click "Run Payroll" for this month) to compute actual salary amounts.`,
                    duration: 7000,
                })
                return
            }

            toast.loading('Creating payment order...')

            // 1. Create Razorpay Order via backend
            const orderRes = await fetch('/api/payroll/razorpay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    payrollId: payroll.id
                })
            })

            toast.dismiss()

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}))
                throw new Error(errData.error || `Order creation failed (${orderRes.status})`)
            }

            const order = await orderRes.json()

            if (!order.orderId) {
                throw new Error('Invalid order response from server')
            }

            // 2. Open Razorpay Checkout modal
            const options = {
                key: order.key,
                amount: order.amount,
                currency: order.currency || 'INR',
                name: 'Zenbourg Group',
                description: `Salary Payment — ${payroll.staff?.name || 'Employee'}`,
                order_id: order.orderId,
                handler: async function (response: any) {
                    // 3. Payment successful — verify and mark as paid
                    toast.loading('Verifying payment...')
                    try {
                        const verifyRes = await fetch('/api/payroll/razorpay/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...response,
                                payrollId: payroll.id
                            })
                        })

                        const verifyResult = await verifyRes.json()
                        toast.dismiss()

                        if (verifyResult.success) {
                            toast.success('Payment verified and recorded successfully!')
                            fetchPayroll()
                        } else {
                            toast.error(verifyResult.error || 'Payment verification failed')
                        }
                    } catch (err) {
                        toast.dismiss()
                        toast.error('Error verifying payment')
                    }
                },
                modal: {
                    ondismiss: () => {
                        toast.info('Payment cancelled')
                    }
                },
                prefill: {
                    name: payroll.staff?.name || '',
                    email: payroll.staff?.email || '',
                    contact: payroll.staff?.phone || ''
                },
                theme: { color: '#6366f1' }
            }

            const rzp = new (window as any).Razorpay(options)

            // Handle payment failures from within Razorpay modal
            rzp.on('payment.failed', function (response: any) {
                toast.error('Payment failed', {
                    description: response.error?.description || 'The payment was declined. Please try again.',
                })
            })

            rzp.open()

        } catch (error: any) {
            toast.dismiss()
            console.error('[RAZORPAY_PAYMENT_ERROR]', error)
            toast.error('Payment initialization failed', {
                description: error.message || 'Please check your connection and try again.',
            })
        }
    }

    const handleExport = () => {
        if (filteredPayroll.length === 0) {
            toast.error('No data to export');
            return;
        }
        downloadCSV(filteredPayroll.map(p => ({
            Employee: p.staff?.name || 'N/A',
            Department: p.staff?.department || 'N/A',
            BaseSalary: p.baseSalary,
            Incentives: p.incentives,
            Bonuses: p.bonuses,
            Deductions: p.deductions,
            NetSalary: p.netSalary,
            Status: p.status,
            PaidDate: p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'N/A'
        })), `Payroll_Report_${month}`);
        toast.success('Payroll report exported to CSV');
    };

    const previewSlip = (payroll: any) => {
        setSelectedPayroll(payroll);
        setShowSlipModal(true);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Financials & Payroll</h1>
                    <p className="text-text-secondary mt-1">Manage employee compensation and payment disbursements</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-surface border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                    <Button variant="primary" onClick={handleRunPayroll} leftIcon={<IndianRupee className="w-4 h-4" />}>
                        Run Payroll
                    </Button>
                </div>
            </div>

            {/* ⚠️ Zero-salary warning banner */}
            {!loading && payrollData.length > 0 && payrollData.every(p => (p.netSalary || 0) === 0) && (
                <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-300">All salaries are ₹0 — Razorpay payments will fail</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                            Staff members were created without a base salary set. Go to <strong>Staff &rarr; Edit Staff</strong> and set each person&apos;s base salary, then click <strong>&quot;Run Payroll&quot;</strong> again to recalculate.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.href = '/admin/staff'}
                        className="shrink-0 text-xs font-bold text-amber-300 border border-amber-400/40 px-3 py-1.5 rounded-lg hover:bg-amber-400/10 transition-colors"
                    >
                        Go to Staff →
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-5 border-primary/20 bg-surface relative overflow-hidden group">
                    <IndianRupee className="absolute -right-2 -bottom-2 w-20 h-20 text-primary/10 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Total Disbursement</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(stats.totalPayroll)}</p>
                    <div className="flex items-center gap-1 text-[10px] text-text-tertiary mt-1 font-medium">
                        Computed for this cycle
                    </div>
                </Card>
                <Card className="p-5 border-white/[0.05]">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Payments Made</p>
                    <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.paidCount}</p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium ">Total disbursements</p>
                </Card>
                <Card className="p-5 border-white/[0.05]">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Pending Payments</p>
                    <p className="text-2xl font-bold text-warning mt-1">{stats.pendingCount}</p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium ">Requires action</p>
                </Card>
                <Card className="p-5 border-white/[0.05]">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider">Avg. Salary</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(stats.avgSalary)}</p>
                    <p className="text-[10px] text-text-tertiary mt-1 font-medium ">Median monthly scale</p>
                </Card>
            </div>

            {/* Main Payroll List */}
            <Card className="bg-surface border-white/[0.08]">
                <div className="p-4 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                        <input
                            placeholder="Search employee or position..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'ALL', label: 'All Payments' },
                                { value: 'PAID', label: 'Paid' },
                                { value: 'PENDING', label: 'Pending' }
                            ]}
                            className="w-36 h-9"
                        />
                        <Button
                            variant="secondary"
                            className="bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.1] h-9"
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={handleExport}
                        >
                            Export
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Employee</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Base Salary</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Adjustments</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-center">Net Payable</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary animate-pulse">
                                        Calculating payroll disbursements...
                                    </td>
                                </tr>
                            ) : filteredPayroll.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-text-tertiary">
                                        No payroll records found for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayroll.map(p => (
                                    <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={p.staff?.name || '?'} size="sm" />
                                                <div>
                                                    <p className="font-semibold text-text-primary text-sm">{p.staff?.name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-text-tertiary font-medium uppercase mt-0.5">{p.staff?.department || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className="text-sm font-mono text-text-secondary">{formatCurrency(p.baseSalary)}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] text-emerald-400 font-medium">+{formatCurrency((p.incentives || 0) + (p.bonuses || 0))}</span>
                                                <span className="text-[10px] text-rose-400 font-medium">-{formatCurrency(p.deductions || 0)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <p className="text-lg font-bold text-text-primary font-mono">{formatCurrency(p.netSalary)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={p.status === 'PAID' ? 'success' : 'warning'}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 hover:bg-white/10 text-text-secondary"
                                                    title="View & Download Salary Slip"
                                                    onClick={() => router.push(`/admin/payroll/salary-slip/${p.id}`)}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>

                                                {p.status === 'PENDING' && (
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="sm"
                                                            variant="primary"
                                                            className="text-[10px] font-semibold uppercase h-8 px-3"
                                                            onClick={() => { setPayingPayroll(p); setShowPaymentModal(true); }}
                                                            leftIcon={<CreditCard className="w-3 h-3" />}
                                                        >
                                                            Disburse
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Salary Slip Modal */}
            <Modal
                isOpen={showSlipModal}
                onClose={() => setShowSlipModal(false)}
                title="Salary Slip Preview"
                description={`Payroll details for ${selectedPayroll?.staff.name} - ${month}`}
                size="md"
            >
                {selectedPayroll && (
                    <div className="space-y-6 pt-4">
                        <div className="p-6 border border-border rounded-3xl bg-surface-light relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-5">
                                <FileText className="w-32 h-32" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="text-2xl font-bold text-text-primary">ZENBOURG</h3>
                                        <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Grand Hotel & Resorts</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-text-primary">Slip #{selectedPayroll.id.slice(-6).toUpperCase()}</p>
                                        <p className="text-[10px] text-text-tertiary font-medium">{month}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-sm text-text-secondary">Employee Name</span>
                                        <span className="text-sm font-bold text-text-primary">{selectedPayroll.staff.name}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-sm text-text-secondary">Basic Salary</span>
                                        <span className="text-sm font-mono text-text-primary">{formatCurrency(selectedPayroll.baseSalary)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-sm text-text-secondary">Performance Bonus</span>
                                        <span className="text-sm font-mono text-emerald-400">+{formatCurrency(selectedPayroll.incentives || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/5">
                                        <span className="text-sm text-text-secondary">Deductions (Taxes/Leaves)</span>
                                        <span className="text-sm font-mono text-rose-400">-{formatCurrency(selectedPayroll.deductions || 0)}</span>
                                    </div>
                                    <div className="flex justify-between py-4 mt-2">
                                        <span className="text-lg font-bold text-text-primary uppercase tracking-tighter">Net Payable Amount</span>
                                        <span className="text-2xl font-bold text-primary font-mono">{formatCurrency(selectedPayroll.netSalary)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="primary"
                                className="w-full"
                                leftIcon={<ExternalLink className="w-4 h-4" />}
                                onClick={() => {
                                    setShowSlipModal(false);
                                    router.push(`/admin/payroll/salary-slip/${selectedPayroll.id}`);
                                }}
                            >
                                Open Full Slip &amp; Download PDF
                            </Button>
                             {selectedPayroll.status === 'PENDING' && (
                                <div className="grid grid-cols-1">
                                    <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setPayingPayroll(selectedPayroll); setShowPaymentModal(true); setShowSlipModal(false); }}>
                                        Proceed to Disburse
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-surface border border-warning/20 rounded-xl flex gap-3">
                            <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                            <p className="text-[10px] text-warning/80 font-medium">
                                This is a digital preview. The official salary slip includes the property seal and authorized signatures.
                            </p>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Unified Disbursement Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => { setShowPaymentModal(false); setPayingPayroll(null); setManualTxId(''); }}
                title="Employee Salary Disbursement"
                description={`Disburse monthly salary to ${payingPayroll?.staff?.name || 'Employee'}`}
                size="md"
            >
                {payingPayroll && (
                    <div className="space-y-6 pt-4 text-left">
                        <div className="bg-surface-light border border-border rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Employee Information</h4>
                                    <p className="text-xs text-text-secondary mt-0.5">ID: {payingPayroll.staff?.employeeId || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-semibold text-text-secondary uppercase">{payingPayroll.staff?.department || 'N/A'}</p>
                                    <p className="text-[10px] text-text-tertiary font-bold">{payingPayroll.month} {payingPayroll.year}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-text-secondary block font-medium">Bank Name</span>
                                    <span className="text-white font-bold block mt-1">{payingPayroll.staff?.bankName || 'Not Provided'}</span>
                                </div>
                                <div>
                                    <span className="text-text-secondary block font-medium">IFSC Code</span>
                                    <span className="text-white font-bold block mt-1 font-mono">{payingPayroll.staff?.ifscCode || 'Not Provided'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-text-secondary block font-medium">Account Number</span>
                                    <span className="text-white font-bold block mt-1 font-mono tracking-wider">{payingPayroll.staff?.accountNumber || 'Not Provided'}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                <span className="text-sm text-text-secondary font-medium">Net Salary Payable</span>
                                <span className="text-xl font-bold text-primary font-mono">{formatCurrency(payingPayroll.netSalary)}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-text-secondary block">Transaction Reference ID / UTR (Required for Manual)</label>
                            <input
                                value={manualTxId}
                                onChange={e => setManualTxId(e.target.value)}
                                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary font-mono"
                                placeholder="e.g. TXN98721648123"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={() => handleMarkAsPaid(payingPayroll)}
                                variant="secondary"
                                className="flex-1 text-sm py-2 font-bold uppercase"
                            >
                                Mark Manual Paid
                            </Button>
                            <Button
                                onClick={() => handleRazorpayPayment(payingPayroll)}
                                variant="primary"
                                className="flex-1 text-sm py-2 bg-emerald-600 hover:bg-emerald-500 font-bold uppercase"
                                leftIcon={<CreditCard className="w-4 h-4" />}
                            >
                                Pay via Razorpay
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
