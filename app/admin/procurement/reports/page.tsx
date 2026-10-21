'use client'

import React, { useState } from 'react'
import useSWR from 'swr'
import { buildContextUrl } from '@/lib/admin-context'
import { BarChart3, Download, PieChart, Loader2, FileSpreadsheet } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ProcurementReportsPage() {
  const [isDownloadingSpend, setIsDownloadingSpend] = useState(false)
  const [isDownloadingPerformance, setIsDownloadingPerformance] = useState(false)

  // Fetch POs
  const { data: poData, isLoading: isPOLoading } = useSWR(
    buildContextUrl('/api/admin/procurement'),
    fetcher
  )

  // Fetch Vendors
  const { data: vendorData, isLoading: isVendorLoading } = useSWR(
    buildContextUrl('/api/admin/procurement/vendors'),
    fetcher
  )

  const purchaseOrders = poData?.data?.purchaseOrders || []
  const vendors = vendorData?.data || []

  // Download Spending Analytics as CSV
  const handleDownloadSpendingReport = () => {
    setIsDownloadingSpend(true)
    try {
      const headers = ['Month Year', 'PO Number', 'Supplier', 'Category', 'Item Description', 'Quantity', 'Unit Price (₹)', 'Total Amount (₹)']
      const activePOs = purchaseOrders.filter((po: any) => po.status !== 'CANCELLED')
      
      const rows = activePOs.flatMap((po: any) => {
        const dateStr = new Date(po.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const vendorName = po.vendor?.name || 'Unknown Vendor'
        const category = po.vendor?.category || 'General'

        return (po.items || []).map((item: any) => [
          dateStr,
          po.poNumber,
          `"${vendorName.replace(/"/g, '""')}"`,
          category,
          `"${(item.description || 'Inventory Restock').replace(/"/g, '""')}"`,
          item.quantity || 0,
          item.unitPrice || 0,
          item.total || 0
        ])
      })

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n')
      
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `zenbourg_spending_analytics_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to export spending CSV:', error)
    } finally {
      setTimeout(() => setIsDownloadingSpend(false), 800)
    }
  }

  // Download Vendor Performance Report as CSV
  const handleDownloadPerformanceReport = () => {
    setIsDownloadingPerformance(true)
    try {
      const headers = ['Vendor Name', 'Category', 'Contact Person', 'Email', 'Phone', 'Orders Placed', 'Total Business Value (₹)', 'Vendor Rating']
      
      const rows = vendors.map((v: any) => {
        const vendorPOs = purchaseOrders.filter((po: any) => po.vendorId === v.id && po.status !== 'CANCELLED')
        const totalSpend = vendorPOs.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0)
        
        return [
          `"${v.name.replace(/"/g, '""')}"`,
          v.category || 'General',
          `"${(v.contactName || 'N/A').replace(/"/g, '""')}"`,
          v.email || 'N/A',
          v.phone || 'N/A',
          vendorPOs.length,
          totalSpend,
          v.rating || 5.0
        ]
      })

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n')
      
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `zenbourg_vendor_performance_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to export performance CSV:', error)
    } finally {
      setTimeout(() => setIsDownloadingPerformance(false), 800)
    }
  }

  const isLoadingData = isPOLoading || isVendorLoading

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Procurement Reports</h1>
        <p className="text-text-secondary text-sm mt-1">Export transaction ledgers and vendor metrics.</p>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          
          {/* Spending Analytics */}
          <div className="bg-surface-light border border-border rounded-xl p-6 flex flex-col justify-between h-52">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-text-primary">Spending Analytics</h2>
                <BarChart3 className="w-5 h-5 text-text-secondary" />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Export transaction sheets detailing order breakdowns and historical expenditures across all active purchase orders.
              </p>
            </div>
            
            <button 
              onClick={handleDownloadSpendingReport}
              disabled={isDownloadingSpend}
              className="py-2.5 bg-white/5 hover:bg-white/10 text-text-primary border border-border rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 w-full mt-4"
            >
              {isDownloadingSpend ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" /> Compiling...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-[#3B82F6]" /> Download CSV
                </>
              )}
            </button>
          </div>

          {/* Vendor Performance */}
          <div className="bg-surface-light border border-border rounded-xl p-6 flex flex-col justify-between h-52">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-text-primary">Vendor Performance</h2>
                <PieChart className="w-5 h-5 text-text-secondary" />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                Generate reports summarizing active suppliers, total business volumes, and average ratings from the directory.
              </p>
            </div>
            
            <button 
              onClick={handleDownloadPerformanceReport}
              disabled={isDownloadingPerformance}
              className="py-2.5 bg-[#3B82F6] hover:bg-blue-600 text-white border border-transparent rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 w-full mt-4 disabled:opacity-50"
            >
              {isDownloadingPerformance ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Download CSV
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
