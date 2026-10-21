'use client'

import React from 'react'
import { ClipboardCheck, Sparkles, User, CheckCircle2 } from 'lucide-react'

export default function StockRequestsPage() {
  const requests = [
    { id: 'SR-0042', item: 'Luxury Bedding Set', qty: '50 cases', requester: 'Housekeeping Supervisor', date: 'Oct 20, 2026', status: 'Approved' },
    { id: 'SR-0041', item: 'Zenbourg Signature Roast', qty: '120 kg', requester: 'F&B Manager', date: 'Oct 19, 2026', status: 'Pending Approval' }
  ]

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-text-primary -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
        <div>

          <h1 className="text-5xl font-black text-text-primary leading-tight">Stock Requests</h1>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-3xl p-8 overflow-hidden shadow-xl">
        <h2 className="text-2xl font-black text-text-primary tracking-tight mb-8">Internal Stock Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                <th className="py-4 px-2">Request ID</th>
                <th className="py-4 px-4">Item Details</th>
                <th className="py-4 px-4">Quantity Requested</th>
                <th className="py-4 px-4">Requester</th>
                <th className="py-4 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b border-border hover:bg-white/5 transition-colors">
                  <td className="py-5 px-2 font-bold text-text-primary">{req.id}</td>
                  <td className="py-5 px-4 font-bold text-text-primary">{req.item}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-text-secondary">{req.qty}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-text-secondary">{req.requester}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-text-secondary">{req.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
