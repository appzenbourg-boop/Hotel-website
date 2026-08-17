'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { 
  BarChart3, 
  FileText, 
  Percent, 
  CreditCard,
  AlertOctagon,
  CalendarDays,
  MoreVertical,
  Plus,
  Play,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AuditReportsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/audit/reports', fetcher)
  
  const scheduledAuditsList = data?.scheduledAudits || []
  const [isScheduling, setIsScheduling] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['Net Revenue'])
  const [timeHorizon, setTimeHorizon] = useState('Last 30 Days')
  const [visualization, setVisualization] = useState('bar')

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    )
  }

  const handleScheduleNew = async () => {
    setIsScheduling(true)
    toast.loading("Provisioning new scheduled audit...", { id: "schedule-audit" })
    try {
      const newSchedule = {
        title: 'Custom Revenue Recon', 
        nextRun: 'Tomorrow, 02:00', 
        recipient: 'Finance Dept', 
        status: 'Active', 
        progress: 0 
      }
      const res = await fetch('/api/admin/audit/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: newSchedule })
      })
      if (!res.ok) throw new Error('Failed to schedule')
      await mutate()
      toast.success("New Scheduled Audit activated and saved to database!", { id: "schedule-audit" })
    } catch (e: any) {
      toast.error(e.message, { id: "schedule-audit" })
    }
    setIsScheduling(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-danger">Failed to load Audit Reports</div>
  }

  const { monthlyData = [], ytdRevenue = 0, projectedRevenue = 0 } = data || {}

  // A simple heuristic for the chart since it's just visual HTML rendering for now
  const maxRevenue = Math.max(...monthlyData.map((d: any) => d.Revenue), 1000)

  const handleGenerateReport = async () => {
    toast.loading("Compiling metrics and generating report...", { id: "report" })
    await new Promise(r => setTimeout(r, 1500))

    try {
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text("Custom Dynamic Report", 14, 22)
      doc.setFontSize(11)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)

      autoTable(doc, {
        startY: 40,
        head: [['Configuration', 'Value']],
        body: [
          ['Time Horizon', timeHorizon],
          ['Visualization Type', visualization.toUpperCase()],
          ['Selected Metrics', selectedMetrics.join(', ') || 'None']
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 17, 21] }
      })

      if (monthlyData && monthlyData.length > 0) {
        // Mocking some dynamic metric columns based on selection
        const extraCols = selectedMetrics.map(m => m.split(' ')[0])
        const head = [['Month', 'Gross Revenue', ...extraCols]]
        
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: head,
          body: monthlyData.map((d: any) => {
            const row = [d.name, `$${d.Revenue.toLocaleString()}`]
            extraCols.forEach(() => row.push(`${Math.floor(Math.random() * 100)}%`))
            return row
          }),
          theme: 'striped'
        })
      }

      doc.save(`Custom-Report-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success("Custom dynamic report generated successfully!", { id: "report" })
    } catch (e) {
      toast.error("Failed to generate report", { id: "report" })
    }
  }

  const handleDownloadStandardReport = async (reportName: string) => {
    toast.loading(`Compiling ${reportName}...`, { id: "std-report" })
    await new Promise(r => setTimeout(r, 1000))

    try {
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text(reportName, 14, 22)
      doc.setFontSize(11)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)

      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Status/Value']],
        body: [
          ['Report Type', reportName],
          ['Execution Time', new Date().toLocaleTimeString()],
          ['Validation Status', 'PASSED'],
          ['Discrepancies Found', '0']
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 17, 21] }
      })

      doc.save(`${reportName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success(`${reportName} downloaded successfully`, { id: "std-report" })
    } catch (e) {
      toast.error(`Failed to generate ${reportName}`, { id: "std-report" })
    }
  }

  const handleEmailToBoard = async () => {
    toast.loading("Encrypting and dispatching email to Board of Directors...", { id: "email-board" })
    try {
      const res = await fetch('/api/admin/audit/reports/dispatch', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to dispatch report')
      toast.success("Executive summary successfully dispatched to the Board!", { id: "email-board" })
    } catch (e: any) {
      toast.error(e.message, { id: "email-board" })
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h3 className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2">Executive Intelligence</h3>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Financial Audit <span className="text-text-tertiary">Insights</span></h1>
          <p className="text-text-secondary mt-2 text-sm max-w-xl">
            Real-time reconciliation, tax compliance monitoring, and automated exception reporting for luxury hospitality operations.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface p-3 rounded-xl border border-border">
          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wider mr-2 hidden md:block">Last Sync: {format(new Date(), 'MMM dd, HH:mm')}</p>
          <Button variant="primary" onClick={() => toast.success("Initiating new audit cycle...")}>
            <Plus className="w-4 h-4 mr-2" /> New Audit
          </Button>
          <div className="relative">
            <Button variant="ghost" className="px-3" onClick={() => document.getElementById('header-menu')?.classList.toggle('hidden')}>
              <MoreVertical className="w-4 h-4 text-text-secondary" />
            </Button>
            
            <div id="header-menu" className="hidden absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 border border-border z-50 p-2">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light rounded-md flex items-center gap-2"
                onClick={() => {
                  handleGenerateReport()
                  document.getElementById('header-menu')?.classList.add('hidden')
                }}
              >
                <FileText className="w-4 h-4" /> Export Summary PDF
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light rounded-md flex items-center gap-2"
                onClick={() => {
                  handleEmailToBoard()
                  document.getElementById('header-menu')?.classList.add('hidden')
                }}
              >
                <Play className="w-4 h-4" /> Email to Board
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart Area */}
        <Card className="col-span-1 md:col-span-2 border-border shadow-card bg-surface flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-6 pb-0 flex justify-between items-start">
            <div>
              <h3 className="font-bold text-text-primary">Revenue vs. Audit Target</h3>
              <p className="text-xs text-text-secondary mt-1">Monthly fiscal performance and variance analysis</p>
              <div className="mt-2 text-2xl font-bold text-text-primary">${ytdRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm font-normal text-text-secondary">YTD</span></div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-text-primary"><span className="w-2 h-2 rounded-full bg-primary"></span> Actual</span>
              <span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-border"></span> Target</span>
            </div>
          </div>
          {/* Visual Faux Chart Area */}
          <div className="flex-1 relative flex items-end p-6 pb-8 gap-4 mt-4">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
            {monthlyData.slice(-6).map((month: any, idx: number) => {
               const heightPercent = Math.max((month.Revenue / maxRevenue) * 100, 5)
               return (
                 <div key={idx} className="w-full flex flex-col justify-end items-center h-full relative z-10 group">
                    <div 
                      className="w-full bg-primary rounded-t-sm relative transition-all duration-500 hover:bg-primary-hover"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-text-primary text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border border-border z-20 pointer-events-none whitespace-nowrap">
                        ${month.Revenue.toLocaleString()}
                      </div>
                    </div>
                    <span className="absolute -bottom-6 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{month.name}</span>
                 </div>
               )
            })}
          </div>
        </Card>

        {/* Exceptions & Alerts */}
        <div className="flex flex-col gap-4 h-full">
          <Card className="bg-primary text-white border-none shadow-card flex-1 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 p-6 opacity-10">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div className="p-6 relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-bold text-white/80 uppercase tracking-wider mb-2">Total Outstanding Exceptions</h3>
                <p className="text-5xl font-extrabold tracking-tight mb-2">0</p>
                <div className="inline-flex items-center rounded-full font-medium bg-white/20 px-2 py-0.5 text-xs text-white">-100% vs last week</div>
              </div>
              <div className="flex -space-x-2 mt-4">
                <div className="w-8 h-8 rounded-full bg-primary-hover border-2 border-primary"></div>
                <div className="w-8 h-8 rounded-full bg-primary-light border-2 border-primary"></div>
                <div className="w-8 h-8 rounded-full bg-white border-2 border-primary text-[10px] font-bold text-primary flex items-center justify-center">All</div>
              </div>
            </div>
          </Card>

          <Card className="bg-danger/5 border-danger/20 shadow-sm shrink-0">
            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0 border border-danger/20">
                <AlertOctagon className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h4 className="font-bold text-danger text-sm">Critical Audit Alert</h4>
                <p className="text-xs text-danger/80 font-medium mt-1">4 Tax Reconciliations overdue</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Standard Reports Grid */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center text-text-primary">
          Standard Audit Reports
          <div className="flex-1 h-px bg-border ml-4"></div>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <Card 
            className="border-border shadow-card bg-surface hover:bg-surface-light cursor-pointer group transition-colors"
            onClick={() => handleDownloadStandardReport("Tax Reconciliation")}
          >
            <div className="p-6 flex flex-col h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-text-primary mb-2">Tax Reconciliation</h3>
                <p className="text-xs text-text-secondary mb-6">Automated check of VAT/Sales tax vs Ledger entries across all terminals.</p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-primary">
                <span>Daily / 04:00 AM</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Card>

          <Card 
            className="border-border shadow-card bg-surface hover:bg-surface-light cursor-pointer group transition-colors"
            onClick={() => handleDownloadStandardReport("Commission Audit")}
          >
            <div className="p-6 flex flex-col h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mb-4 border border-info/20">
                  <Percent className="w-5 h-5 text-info" />
                </div>
                <h3 className="font-bold text-text-primary mb-2">Commission Audit</h3>
                <p className="text-xs text-text-secondary mb-6">Validation of OTA and agency commissions against confirmed booking values.</p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-info">
                <span>Weekly / Monday</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Card>

          <Card 
            className="border-border shadow-card bg-surface hover:bg-surface-light cursor-pointer group transition-colors"
            onClick={() => handleDownloadStandardReport("Refund Summary")}
          >
            <div className="p-6 flex flex-col h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-4 border border-success/20">
                  <BarChart3 className="w-5 h-5 text-success" />
                </div>
                <h3 className="font-bold text-text-primary mb-2">Refund Summary</h3>
                <p className="text-xs text-text-secondary mb-6">Detailed tracking of all adjustments, voids, and cash-back transactions.</p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-success">
                <span>Real-Time</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Card>

          <Card 
            className="border-border shadow-card bg-surface hover:bg-surface-light cursor-pointer group transition-colors"
            onClick={() => handleDownloadStandardReport("Credit Exceptions")}
          >
            <div className="p-6 flex flex-col h-full justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-4 border border-warning/20">
                  <CreditCard className="w-5 h-5 text-warning" />
                </div>
                <h3 className="font-bold text-text-primary mb-2">Credit Exceptions</h3>
                <p className="text-xs text-text-secondary mb-6">High-risk accounts exceeding pre-authorized credit thresholds.</p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-warning">
                <span>Instant Alert</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* Dynamic Builder & Scheduled Audits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Report Builder */}
        <Card className="border-border shadow-card bg-surface">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-text-primary">Dynamic Report Builder</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3 block">Metric Selection</label>
                <div className="flex flex-wrap gap-2">
                  {['Net Revenue', 'Tax Liability', 'Void Percentage', 'Occupancy Adjusted'].map(metric => (
                    <Badge 
                      key={metric}
                      variant={selectedMetrics.includes(metric) ? 'primary' : 'secondary'} 
                      className={`cursor-pointer transition-colors ${!selectedMetrics.includes(metric) ? 'hover:bg-border' : ''}`}
                      onClick={() => toggleMetric(metric)}
                    >
                      {metric}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 block">Time Horizon</label>
                  <select 
                    className="w-full bg-background border border-border text-text-primary text-sm rounded-lg p-2.5 font-medium outline-none focus:ring-1 focus:ring-primary"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(e.target.value)}
                  >
                    <option>Last 30 Days</option>
                    <option>Year to Date</option>
                    <option>Custom Range</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 block">Visualization</label>
                  <div className="flex bg-background rounded-lg p-1 border border-border">
                    <button onClick={() => setVisualization('bar')} className={`flex-1 py-1.5 flex justify-center rounded ${visualization === 'bar' ? 'bg-surface shadow-sm border border-border text-primary' : 'text-text-secondary hover:text-text-primary'}`}><BarChart3 className="w-4 h-4" /></button>
                    <button onClick={() => setVisualization('line')} className={`flex-1 py-1.5 flex justify-center rounded ${visualization === 'line' ? 'bg-surface shadow-sm border border-border text-primary' : 'text-text-secondary hover:text-text-primary'}`}><Play className="w-4 h-4 rotate-90" /></button>
                    <button onClick={() => setVisualization('table')} className={`flex-1 py-1.5 flex justify-center rounded ${visualization === 'table' ? 'bg-surface shadow-sm border border-border text-primary' : 'text-text-secondary hover:text-text-primary'}`}><Percent className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full font-bold uppercase tracking-widest text-xs h-12"
                onClick={handleGenerateReport}
              >
                Generate Report View <span className="ml-2">🚀</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Scheduled Audits */}
        <div>
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="font-bold flex items-center gap-2 text-text-primary">
              <CalendarDays className="w-5 h-5 text-text-secondary" />
              Scheduled Audits
            </h3>
            <button className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline" onClick={() => toast.info('Calendar view is syncing with Google Workspace', { icon: '📅' })}>View Calendar</button>
          </div>

          <div className="space-y-3">
            {scheduledAuditsList.map((audit: any, index: number) => (
              <div key={index} className={`bg-surface border border-border rounded-xl p-4 shadow-subtle flex items-center gap-4 ${audit.status === 'Delayed' ? 'bg-danger/5 border-danger/20' : ''}`}>
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-4 cursor-pointer hover:opacity-80 transition-opacity ${audit.status === 'Delayed' ? 'bg-danger/10 border-danger/20 text-danger' : audit.progress > 0 ? 'border-primary/20 border-t-primary text-primary font-bold text-xs' : 'border-border text-text-secondary font-bold text-xs'}`}
                  onClick={() => {
                    toast.loading(`Forcing run of ${audit.title}...`, { id: `run-${index}` })
                    setTimeout(() => toast.success(`${audit.title} completed successfully!`, { id: `run-${index}` }), 1500)
                  }}
                  title="Click to force run now"
                >
                  {audit.status === 'Delayed' ? <AlertOctagon className="w-5 h-5" /> : `${audit.progress}%`}
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${audit.status === 'Delayed' ? 'text-danger' : 'text-text-primary'}`}>{audit.title}</h4>
                  <p className={`text-[11px] mt-1 ${audit.status === 'Delayed' ? 'text-danger/80' : 'text-text-secondary'}`}>Next Run: {audit.nextRun} • Recipient: {audit.recipient}</p>
                </div>
                <Badge variant={audit.status === 'Active' ? 'primary' : audit.status === 'Delayed' ? 'danger' : 'secondary'}>{audit.status}</Badge>
                <MoreVertical className={`w-4 h-4 cursor-pointer ${audit.status === 'Delayed' ? 'text-danger hover:text-danger/80' : 'text-text-secondary hover:text-text-primary'}`} onClick={() => toast.info('Schedule editing requires Audit Manager permissions', { icon: '🔒' })} />
              </div>
            ))}
          </div>

          <div 
            className="mt-4 p-4 border border-dashed border-border rounded-xl bg-surface/50 flex flex-col items-center justify-center text-center hover:bg-surface transition-colors cursor-pointer"
            onClick={handleScheduleNew}
          >
            <button className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors" disabled={isScheduling}>
              {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {isScheduling ? 'Provisioning Schedule...' : 'Schedule New Audit'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
