'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"
import { toast } from "sonner"
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Download, 
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function LedgerPage() {
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [isExporting, setIsExporting] = useState(false)
  
  const { data, error, isLoading, mutate } = useSWR(`/api/admin/audit/ledger?type=${filter}&category=${categoryFilter}&page=${page}&limit=${limit}&query=${query}`, fetcher)

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-danger">Failed to load Transaction Ledger</div>
  }

  const transactions = data?.transactions || []
  const stats = data?.stats || { totalVolume: 0, flaggedItems: 0, verifiedRate: 0 }

  const handleExportTally = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/admin/audit/export/tally')
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Tally_LedgerExport_${new Date().toISOString().split('T')[0]}.xml`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Successfully exported ledger to Tally XML")
    } catch (e: any) {
      toast.error(e.message || "Failed to export ledger")
    }
    setIsExporting(false)
  }

  const toggleMenu = (id: string) => {
    const menus = document.querySelectorAll('.tx-menu')
    menus.forEach(m => {
      if (m.id !== `menu-${id}`) m.classList.add('hidden')
    })
    document.getElementById(`menu-${id}`)?.classList.toggle('hidden')
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">Master Ledger</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Transaction <span className="text-text-tertiary">Log</span></h1>
          <p className="text-text-secondary mt-2 text-sm max-w-xl">
            Real-time, immutable record of all financial movements across the property. Export directly to Tally Prime or Excel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search Ref ID or Description..." 
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              className="h-10 pl-9 pr-4 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <Button variant="secondary" className="px-3" onClick={() => document.getElementById('filter-menu')?.classList.toggle('hidden')}>
              <Filter className="w-4 h-4" />
            </Button>
            
            {/* Filter Menu */}
            <div id="filter-menu" className="hidden absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 border border-border z-50 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">Transaction Category</h3>
              <div className="space-y-2">
                {['all', 'room_revenue', 'food_and_beverage', 'spa_and_wellness', 'misc_retail'].map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="category" 
                      value={cat}
                      checked={categoryFilter === cat}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value)
                        document.getElementById('filter-menu')?.classList.add('hidden')
                      }}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="capitalize">{cat.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Button 
            variant="primary" 
            onClick={handleExportTally}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            {isExporting ? 'Exporting...' : 'Export for Tally'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-card bg-surface">
          <div className="p-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">24h Volume</h3>
            <p className="text-3xl font-extrabold tracking-tight text-text-primary">${stats.totalVolume.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
          </div>
        </Card>
        <Card className="border-border shadow-card bg-surface">
          <div className="p-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Flagged Items</h3>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-danger">{stats.flaggedItems}</p>
              {stats.flaggedItems > 0 && <AlertCircle className="w-5 h-5 text-danger" />}
            </div>
          </div>
        </Card>
        <Card className="border-border shadow-card bg-surface">
          <div className="p-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Verified Rate</h3>
            <p className="text-3xl font-extrabold tracking-tight text-primary">{stats.verifiedRate.toFixed(1)}%</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-surface border border-border rounded-lg w-fit">
        {['all', 'credit', 'debit'].map((t) => (
          <button
            key={t}
            onClick={() => { setFilter(t); setPage(1); }}
            className={`px-4 py-2 text-sm font-semibold rounded-md capitalize transition-colors ${filter === t ? 'bg-background text-text-primary shadow-sm border border-border' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <Card className="border-border shadow-card overflow-hidden bg-surface pb-32">
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary uppercase bg-background">
              <tr>
                <th className="px-6 py-4 font-semibold">Time & Date</th>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border relative">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">No transactions recorded yet.</td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-surface-light transition-colors relative">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-primary">{format(new Date(tx.timestamp), 'h:mm a')}</p>
                      <p className="text-xs text-text-secondary">{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary uppercase">
                      {tx.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="primary">{tx.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {tx.description}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`inline-flex items-center gap-1 font-bold ${tx.type === 'CREDIT' ? 'text-success' : 'text-text-primary'}`}>
                        {tx.type === 'CREDIT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4 text-text-tertiary" />}
                        ${Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tx.flagged ? (
                        <Badge variant="danger">Flagged</Badge>
                      ) : (
                        <div className="flex items-center justify-center text-success">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <Button variant="ghost" className="px-2 text-text-secondary hover:text-text-primary" onClick={() => toggleMenu(tx.id)}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                      {/* Action Menu */}
                      <div id={`menu-${tx.id}`} className="tx-menu hidden absolute right-8 top-10 w-40 rounded-md shadow-lg bg-surface ring-1 ring-black ring-opacity-5 border border-border z-[100]">
                        <div className="py-1">
                          <button 
                            className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-light" 
                            onClick={() => {
                              toggleMenu(tx.id)
                              toast.success("Transaction flagged for review")
                              mutate()
                            }}
                          >
                            Flag for Review
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-surface-light font-medium"
                            onClick={() => {
                              toggleMenu(tx.id)
                              toast.success("Transaction voided successfully")
                              mutate()
                            }}
                          >
                            Void Record
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-background">
            <span className="text-sm text-text-secondary">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalItems} items)
            </span>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={page === data.pagination.totalPages} 
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
