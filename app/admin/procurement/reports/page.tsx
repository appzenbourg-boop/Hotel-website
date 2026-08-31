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
    <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
        <div>

          <h1 className="text-5xl font-black text-white leading-tight">Procurement Reports</h1>
          <p className="text-gray-400 text-sm mt-3 max-w-md">Extract, analyze, and review transaction ledgers and partner metrics loaded dynamically from stay databases.</p>
        </div>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Spending Analytics */}
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col justify-between h-64">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-white tracking-tight">Spending Analytics</h2>
                <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Export total transaction sheets detailing order breakdowns, product distributions, and historical expenditures compiled across active purchase orders.
              </p>
            </div>
            
            <button 
              onClick={handleDownloadSpendingReport}
              disabled={isDownloadingSpend}
              className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 w-full mt-4"
            >
              {isDownloadingSpend ? (
                <>
                  <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" /> Compiling Report...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-[#3B82F6]" /> Download Spending Log (CSV)
                </>
              )}
            </button>
          </div>

          {/* Vendor Performance */}
          <div className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col justify-between h-64">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-white tracking-tight">Vendor Performance</h2>
                <PieChart className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Generate reports summarizing active suppliers, total business volumes exchanged, purchase logs count, and average ratings recorded inside the directory.
              </p>
            </div>
            
            <button 
              onClick={handleDownloadPerformanceReport}
              disabled={isDownloadingPerformance}
              className="px-5 py-3.5 bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center gap-2 w-full shadow-lg shadow-blue-500/20 mt-4"
            >
              {isDownloadingPerformance ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" /> Generating Sheet...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" /> Download Performance Log (CSV)
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
