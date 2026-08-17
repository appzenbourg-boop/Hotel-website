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
  BedDouble, 
  Banknote, 
  UtensilsCrossed, 
  ShoppingBag, 
  MoreVertical, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function NightAuditPage() {
  // Derived audit progress state
  const [isSyncingTally, setIsSyncingTally] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isExportingSAP, setIsExportingSAP] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const today = new Date()

  const { data, error, isLoading, mutate } = useSWR('/api/admin/audit/night-audit', fetcher, { refreshInterval: 5000 })

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
    discrepancies = [],
    activeAudit = null
  } = data || {}

  let auditProgress = 0
  if (activeAudit) {
      if (activeAudit.status === 'COMPLETED') auditProgress = 100
      else if (activeAudit.status === 'IN_PROGRESS') auditProgress = 50 // simplistic
  }

  const handleSyncTally = async () => {
    setIsSyncingTally(true)
    try {
      const res = await fetch('/api/admin/audit/export/tally')
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Tally_NightAudit_${new Date().toISOString().split('T')[0]}.xml`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Successfully downloaded Tally Prime voucher XML")
    } catch (e: any) {
      toast.error(e.message || "Failed to sync to Tally Prime")
    }
    setIsSyncingTally(false)
  }

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text("Night Audit Report", 14, 22)
      doc.setFontSize(11)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
          ['Occupancy Rate', `${occupancyRate.toFixed(1)}%`],
          ['ADR', `$${adr.toFixed(2)}`],
          ['RevPAR', `$${revPar.toFixed(2)}`],
          ['Total Rooms', totalRooms],
          ['Sold Rooms', soldRooms],
          ['Room Revenue', `$${roomRevenue.toFixed(2)}`],
          ['F&B Revenue', `$${fbRevenue.toFixed(2)}`],
          ['Spa & Wellness Revenue', `$${spaRevenue.toFixed(2)}`],
          ['Misc & Retail Revenue', `$${miscRevenue.toFixed(2)}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [74, 158, 255] }
      })

      if (discrepancies.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [['Ref ID', 'Description', 'Amount', 'Status']],
          body: discrepancies.map((d: any) => [
            `DIS-${d.id.slice(-4).toUpperCase()}`,
            d.description,
            `$${d.amount.toFixed(2)}`,
            d.status
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] }
        })
      }

      doc.save(`Night-Audit-Report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("Night Audit PDF Report generated and downloaded")
    } catch (e: any) {
      toast.error("Failed to generate PDF report")
    }
    setIsGeneratingPDF(false)
  }

  const handleExportSAP = async () => {
    setIsExportingSAP(true)
    try {
      const res = await fetch('/api/admin/audit/export/sap')
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SAP_Ledger_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Data exported to SAP ERP CSV successfully")
    } catch (e: any) {
      toast.error(e.message || "Failed to export to SAP ERP")
    }
    setIsExportingSAP(false)
  }

  const handleEmailStakeholders = async () => {
    setIsEmailing(true)
    try {
      const res = await fetch('/api/admin/audit/email', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to send email')
      const data = await res.json()
      toast.success(`Audit report emailed to ${data.sentTo}`)
    } catch (e: any) {
      toast.error(e.message || "Failed to send email")
    }
    setIsEmailing(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">Audit Cycle: {format(today, 'MMM dd, yyyy')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Night Audit <span className="text-text-tertiary">Report</span></h1>
          <p className="text-text-secondary mt-2 text-sm max-w-xl">
            Daily financial reconciliation and system rollover for the luxury property portfolio. All figures are post-adjustment.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              {auditProgress < 100 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${auditProgress === 100 ? 'bg-success' : 'bg-primary'}`}></span>
            </div>
            <div>
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">Current Status</p>
              <p className={`font-bold leading-none ${auditProgress === 100 ? 'text-success' : 'text-primary'}`}>
                {auditProgress === 100 ? 'Completed' : 'Processing'} ({auditProgress}%)
              </p>
            </div>
          </div>
          <div className="w-px h-10 bg-border mx-2"></div>
          <Button 
            variant="primary" 
            onClick={async () => {
              if (auditProgress === 100) return
              
              if (!activeAudit) {
                // START AUDIT
                toast.loading("Initiating Night Audit run...", { id: "audit" })
                try {
                  const res = await fetch('/api/admin/audit/night-audit/run', { method: 'POST' })
                  if(!res.ok) throw new Error("Failed to run audit")
                  toast.success("Audit engine running, checking discrepancies...", { id: "audit" })
                  await mutate()
                } catch (e) {
                  toast.error("Error starting audit", { id: "audit" })
                }
              } else if (activeAudit.status === 'IN_PROGRESS') {
                // FINALIZE AUDIT
                toast.loading("Finalizing audit...", { id: "audit" })
                try {
                  const res = await fetch('/api/admin/audit/night-audit/finalize', { method: 'POST' })
                  if(!res.ok) {
                    const d = await res.json()
                    throw new Error(d.error || "Failed to finalize")
                  }
                  toast.success("Night Audit successfully finalized and system rolled over to next day!", { id: "audit" })
                  await mutate()
                } catch (e: any) {
                  toast.error(e.message || "Error finalizing audit", { id: "audit" })
                }
              }
            }}
            disabled={auditProgress === 100}
            className={auditProgress === 100 ? 'bg-success hover:bg-success/90' : ''}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {auditProgress === 100 ? 'Finalized' : (!activeAudit ? 'Run Night Audit' : 'Finalize Audit')}
          </Button>

          <div className="relative">
            <Button 
              variant="ghost" 
              className="px-3"
              onClick={() => {
                const menu = document.getElementById('audit-dropdown')
                if(menu) menu.classList.toggle('hidden')
              }}
            >
              <MoreVertical className="w-4 h-4 text-text-secondary" />
            </Button>
            
            <div id="audit-dropdown" className="hidden absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 border border-border z-50">
              <div className="py-1" role="menu">
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light flex items-center" 
                  onClick={async () => {
                    document.getElementById('audit-dropdown')?.classList.add('hidden')
                    toast.loading("Recalculating all ledgers...", { id: "recalc" })
                    try {
                      const res = await fetch('/api/admin/audit/night-audit/recalculate', { method: 'POST' })
                      if (!res.ok) throw new Error('Recalculation failed')
                      await mutate()
                      toast.success("Ledgers recalculated and up to date", { id: "recalc" })
                    } catch (e: any) {
                      toast.error(e.message, { id: "recalc" })
                    }
                  }}
                >
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Force Recalculate
                </button>
                <button 
                  className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light flex items-center"
                  onClick={() => {
                    document.getElementById('audit-dropdown')?.classList.add('hidden')
                    handleExportSAP()
                  }}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-success" />
                  Download Raw Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Occupancy Card */}
        <Card className="col-span-1 border-border shadow-card bg-surface h-full">
          <div className="p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Occupancy Overview</h3>
                <BedDouble className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-extrabold tracking-tight text-text-primary">{occupancyRate.toFixed(1)}<span className="text-primary">%</span></span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">ADR (Average Daily Rate)</p>
                  <p className="text-xl font-bold text-text-primary">${adr.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">RevPAR</p>
                  <p className="text-xl font-bold text-text-primary">${revPar.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <Progress value={occupancyRate} className="h-2 mb-2 bg-background" indicatorColor="bg-primary" />
              <div className="flex justify-between text-xs font-medium text-text-secondary">
                <span>{soldRooms} Rooms Sold</span>
                <span>{totalRooms} Total Keys</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Revenue Breakdown */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <Card className="bg-primary text-white border-none shadow-card">
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">Room Revenue</h3>
                <Banknote className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight mt-4">${roomRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <div className="flex items-center gap-1 mt-2 text-white/80 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  <span>Active Bookings Only</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border shadow-card bg-surface">
            <div className="p-6 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-warning uppercase tracking-wider">F&B Outlets</h3>
                <UtensilsCrossed className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-3xl lg:text-4xl font-extrabold tracking-tight mt-4 text-text-primary">${fbRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <div className="flex items-center gap-1 mt-2 text-text-secondary text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                  <span>Includes Room Service</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border shadow-card bg-surface">
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Spa & Wellness</h3>
                
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-text-primary">${spaRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <p className="text-xs text-text-secondary font-medium mt-1">Today&apos;s Revenue</p>
              </div>
            </div>
          </Card>

          <Card className="border-border shadow-card bg-surface">
            <div className="p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-bold text-success uppercase tracking-wider">Misc & Retail</h3>
                <ShoppingBag className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-text-primary">${miscRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</p>
                <p className="text-xs text-text-secondary font-medium mt-1">Today&apos;s Revenue</p>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Discrepancies */}
      <Card className="border-border shadow-card overflow-hidden bg-surface">
        <div className="p-4 border-b border-border bg-danger/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-text-primary">Audit Discrepancies</h3>
          </div>
          <Badge variant="danger">{discrepancies.length} Critical Issues</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary uppercase bg-background">
              <tr>
                <th className="px-6 py-3 font-semibold">Ref ID</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Department</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discrepancies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">No discrepancies found for tonight.</td>
                </tr>
              ) : (
                discrepancies.map((dis: any, idx: number) => (
                  <tr key={idx} className="hover:bg-surface-light transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary">DIS-{dis.id.slice(-4).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-primary">{dis.description}</p>
                      <p className="text-xs text-text-secondary">{dis.subtext}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-text-primary">${dis.amount.toFixed(2)}</td>
                    <td className="px-6 py-4"><Badge variant="primary">{dis.department}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-danger text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-danger"></span> {dis.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary font-semibold"
                        onClick={async () => {
                          const notes = prompt("Enter resolution notes:")
                          if (notes === null) return // cancelled
                          
                          toast.loading("Resolving discrepancy...", { id: `resolve-${dis.id}` })
                          try {
                            const res = await fetch('/api/admin/audit/night-audit/discrepancies', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ exceptionId: dis.id, resolutionNotes: notes })
                            })
                            if (!res.ok) throw new Error('Failed to resolve')
                            await mutate()
                            toast.success("Discrepancy resolved successfully", { id: `resolve-${dis.id}` })
                          } catch (e: any) {
                            toast.error(e.message, { id: `resolve-${dis.id}` })
                          }
                        }}
                      >
                        Fix
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Post Audit Actions */}
      <div>
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Post-Audit Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Button 
            variant="secondary" 
            className="h-12 justify-start font-semibold border-border bg-surface"
            onClick={handleSyncTally}
            disabled={isSyncingTally}
          >
            {isSyncingTally ? <Loader2 className="w-5 h-5 mr-2 animate-spin text-text-secondary" /> : <FileSpreadsheet className="w-5 h-5 text-success mr-2" />}
            {isSyncingTally ? 'Syncing...' : 'Sync to Tally Prime'}
          </Button>
          <Button 
            variant="secondary" 
            className="h-12 justify-start font-semibold border-border bg-surface"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? <Loader2 className="w-5 h-5 mr-2 animate-spin text-text-secondary" /> : <svg className="w-5 h-5 mr-2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
            {isGeneratingPDF ? 'Generating...' : 'Generate PDF Report'}
          </Button>
          <Button 
            variant="secondary" 
            className="h-12 justify-start font-semibold border-border bg-surface"
            onClick={handleExportSAP}
            disabled={isExportingSAP}
          >
            {isExportingSAP ? <Loader2 className="w-5 h-5 mr-2 animate-spin text-text-secondary" /> : <svg className="w-5 h-5 mr-2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
            {isExportingSAP ? 'Exporting...' : 'Export to SAP ERP'}
          </Button>
          <Button 
            variant="secondary" 
            className="h-12 justify-start font-semibold border-border bg-surface"
            onClick={handleEmailStakeholders}
            disabled={isEmailing}
          >
            {isEmailing ? <Loader2 className="w-5 h-5 mr-2 animate-spin text-text-secondary" /> : <svg className="w-5 h-5 mr-2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            {isEmailing ? 'Sending...' : 'Email Stakeholders'}
          </Button>
        </div>
      </div>
    </div>
  )
}
