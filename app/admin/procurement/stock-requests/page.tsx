'use client'

import React from 'react'
import { ClipboardCheck, Sparkles, User, CheckCircle2 } from 'lucide-react'

export default function StockRequestsPage() {
  const requests = [
    { id: 'SR-0042', item: 'Luxury Bedding Set', qty: '50 cases', requester: 'Housekeeping Supervisor', date: 'Oct 20, 2026', status: 'Approved' },
    { id: 'SR-0041', item: 'Zenbourg Signature Roast', qty: '120 kg', requester: 'F&B Manager', date: 'Oct 19, 2026', status: 'Pending Approval' }
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24 font-sans text-gray-200 -mx-6 md:-mx-8 -my-6 md:-my-8 p-8 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
        <div>

          <h1 className="text-5xl font-black text-white leading-tight">Stock Requests</h1>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 overflow-hidden shadow-xl">
        <h2 className="text-2xl font-black text-white tracking-tight mb-8">Internal Stock Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <th className="py-4 px-2">Request ID</th>
                <th className="py-4 px-4">Item Details</th>
                <th className="py-4 px-4">Quantity Requested</th>
                <th className="py-4 px-4">Requester</th>
                <th className="py-4 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-5 px-2 font-bold text-white">{req.id}</td>
                  <td className="py-5 px-4 font-bold text-white">{req.item}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-gray-400">{req.qty}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-gray-400">{req.requester}</td>
                  <td className="py-5 px-4 text-xs font-semibold text-gray-400">{req.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
