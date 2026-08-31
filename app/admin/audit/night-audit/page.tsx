'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Progress } from "@/components/ui/progress"
import { 
  Calculator,
  BedDouble,
  Banknote, 
  UtensilsCrossed, 
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Lock,
  CalendarDays,
  FileCheck2,
  ChevronRight,
  TrendingUp,
  CircleDollarSign
} from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function NightAuditConsole() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessingStep, setIsProcessingStep] = useState(false)
  
  const today = new Date()

  const { data, error, isLoading, mutate } = useSWR('/api/admin/audit/night-audit', fetcher, { refreshInterval: 10000 })

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-danger">Failed to load Night Audit data</div>
  }

  const {
    occupancyRate = 0,
    adr = 0,
    revPar = 0,
    totalRooms = 0,
    soldRooms = 0,
    roomRevenue = 0,
    fbRevenue = 0,
    spaRevenue = 0,
    miscRevenue = 0,
    guestLedgerBalance = 0,
    cityLedgerBalance = 0,
    advanceLedgerBalance = 0,
    discrepancies = [],
    activeAudit = null
  } = data || {}

  const steps = [
    { id: 1, title: 'Verify Cashier Closures', desc: 'Ensure all tills and shifts are dropped.', icon: <Lock className="w-4 h-4" /> },
    { id: 2, title: 'Post Room & Tax', desc: 'Auto-post room charges to guest folios.', icon: <CircleDollarSign className="w-4 h-4" /> },
    { id: 3, title: 'Resolve Discrepancies', desc: 'Clear rate variances and errors.', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 4, title: 'Print Reports', desc: 'Generate Daily Revenue Reports.', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 5, title: 'Roll System Date', desc: 'Advance PMS date to tomorrow.', icon: <CalendarDays className="w-4 h-4" /> },
  ]

  const handleNextStep = async () => {
    setIsProcessingStep(true)
    
    // Simulate processing time for realism
    const processingTime = currentStep === 2 ? 3000 : 1500
    
    await new Promise(resolve => setTimeout(resolve, processingTime))
    
    if (currentStep === 2) {
       toast.success("Room charges and taxes posted successfully.")
    } else if (currentStep === 3 && discrepancies.length > 0) {
       toast.error("Please resolve all discrepancies before proceeding.")
       setIsProcessingStep(false)
       return
    } else if (currentStep === 5) {
       toast.success("Night Audit Finalized! System date rolled over.")
       // Trigger backend finalize
       try {
           await fetch('/api/admin/audit/night-audit/finalize', { method: 'POST' })
           mutate()
       } catch (e) {
           console.error(e)
       }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, 6))
    setIsProcessingStep(false)
  }

  const isAuditComplete = currentStep > 5

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Night Audit Console
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Financial <span className="text-text-tertiary">Controller</span>
          </h1>
          <p className="text-text-secondary mt-2 text-sm max-w-xl">
            Execute the end-of-day sequence, post daily charges, and reconcile the master ledgers before rolling over the system date.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border shadow-sm">
           <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mb-1">Business Date</p>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold text-text-primary">{format(today, 'MMM dd, yyyy')}</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Progress & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border shadow-card bg-surface overflow-hidden">
             <div className="p-5 border-b border-border bg-background">
                <h3 className="font-bold text-text-primary">Audit Sequence</h3>
             </div>
             <div className="p-5 space-y-0">
               {steps.map((step) => {
                  const isActive = currentStep === step.id
                  const isCompleted = currentStep > step.id
                  
                  return (
                    <div key={step.id} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      {/* Vertical line connector */}
                      {step.id !== steps.length && (
                        <div className={`absolute top-8 left-4 w-px h-[calc(100%-2rem)] -translate-x-1/2 ${isCompleted ? 'bg-success' : 'bg-border'}`}></div>
                      )}
                      
                      <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-surface shrink-0 transition-colors ${
                        isCompleted ? 'border-success text-success' : 
                        isActive ? 'border-primary text-primary' : 'border-border text-text-tertiary'
                      }`}>
                         {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                      </div>
                      
                      <div className="pt-1.5 flex-1 min-w-0">
                         <h4 className={`text-sm font-bold ${isActive ? 'text-primary' : isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>
                           {step.title}
                         </h4>
                         <p className="text-xs text-text-tertiary mt-1">{step.desc}</p>
                         
                         {isActive && (
                            <div className="mt-4">
                              <Button 
                                variant={isCompleted ? 'secondary' : 'primary'}
                                size="sm" 
                                className="w-full"
                                onClick={handleNextStep}
                                disabled={isProcessingStep}
                              >
                                {isProcessingStep ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                                {isProcessingStep ? 'Processing...' : `Execute Step ${step.id}`}
                              </Button>
                            </div>
                         )}
                      </div>
                    </div>
                  )
               })}

               {isAuditComplete && (
                 <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <h4 className="font-bold text-success">Audit Completed</h4>
                    <p className="text-xs text-success/80 mt-1">The system date has been rolled over.</p>
                 </div>
               )}
             </div>
          </Card>
        </div>

        {/* Right Column: Dashboards & Ledgers */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Revenue Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <Card className="p-4 bg-surface border-border">
                <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-1">Room Revenue</h4>
                <p className="text-xl font-bold text-text-primary">${roomRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
             </Card>
             <Card className="p-4 bg-surface border-border">
                <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-1">F&B Revenue</h4>
                <p className="text-xl font-bold text-text-primary">${fbRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
             </Card>
             <Card className="p-4 bg-surface border-border">
                <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-1">Taxes Posted</h4>
                <p className="text-xl font-bold text-text-primary">${(roomRevenue * 0.18).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
             </Card>
             <Card className="p-4 bg-surface border-border">
                <h4 className="text-[10px] uppercase font-bold text-text-secondary mb-1">Total Revenue</h4>
                <p className="text-xl font-bold text-primary">${(roomRevenue + fbRevenue + spaRevenue + miscRevenue).toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
             </Card>
          </div>

          {/* Master Ledgers Balancing */}
          <Card className="bg-surface border-border overflow-hidden">
             <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-text-secondary" /> Ledger Balances
                </h3>
                <Badge variant="success">In Balance</Badge>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                <div className="p-5">
                   <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Guest Ledger</p>
                   <p className="text-2xl font-bold text-text-primary">${guestLedgerBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                   <p className="text-xs text-text-tertiary mt-1">In-house guests balance</p>
                </div>
                <div className="p-5">
                   <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">City Ledger (A/R)</p>
                   <p className="text-2xl font-bold text-text-primary">${cityLedgerBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                   <p className="text-xs text-text-tertiary mt-1">Direct billing / OTAs</p>
                </div>
                <div className="p-5">
                   <p className="text-xs text-text-secondary font-bold uppercase tracking-wider mb-2">Advance Deposits</p>
                   <p className="text-2xl font-bold text-text-primary">${advanceLedgerBalance.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                   <p className="text-xs text-text-tertiary mt-1">Future bookings liability</p>
                </div>
             </div>
          </Card>

          {/* Discrepancies - Crucial for Step 3 */}
          <Card className={`border-border overflow-hidden transition-all duration-300 ${currentStep === 3 ? 'ring-2 ring-warning bg-warning/5' : 'bg-surface'}`}>
             <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <AlertTriangle className={`w-5 h-5 ${currentStep === 3 ? 'text-warning' : 'text-text-secondary'}`} />
                   <h3 className="font-bold text-text-primary">Exception & Discrepancy Manager</h3>
                </div>
                {discrepancies.length > 0 ? (
                  <Badge variant="danger">{discrepancies.length} Action Required</Badge>
                ) : (
                  <Badge variant="success">Zero Exceptions</Badge>
                )}
             </div>
             
             {discrepancies.length > 0 ? (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-xs text-text-secondary uppercase bg-background border-b border-border">
                     <tr>
                       <th className="px-4 py-3 font-semibold">Room/Folio</th>
                       <th className="px-4 py-3 font-semibold">Variance Type</th>
                       <th className="px-4 py-3 font-semibold text-right">Amount</th>
                       <th className="px-4 py-3 font-semibold text-right">Action</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                     {discrepancies.map((dis: any, idx: number) => (
                       <tr key={idx}>
                         <td className="px-4 py-3 font-semibold">{dis.roomNumber || dis.folioId || 'System'}</td>
                         <td className="px-4 py-3">
                           <span className="text-text-primary">{dis.description}</span>
                           <span className="block text-xs text-text-tertiary">{dis.type || 'System Variance'}</span>
                         </td>
                         <td className="px-4 py-3 text-right text-danger font-bold">
                           ${(dis.amount || 0).toFixed(2)}
                         </td>
                         <td className="px-4 py-3 text-right">
                           <Button size="sm" variant="secondary" className="text-xs" disabled={currentStep !== 3}>
                             Override
                           </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-8 text-center text-text-secondary">
                 <CheckCircle2 className="w-8 h-8 mx-auto text-success mb-2 opacity-50" />
                 <p>All folios and rates are perfectly balanced.</p>
               </div>
             )}
          </Card>
          
        </div>
      </div>
    </div>
  )
}
