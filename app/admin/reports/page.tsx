'use client'

import React, { useState } from 'react'
import { FileSpreadsheet, Filter } from 'lucide-react'
import DynamicBuilder from './DynamicBuilder'
import MISReport from './MISReport'
import { cn } from '@/lib/utils'

import CheckinReport from './CheckinReport'
import POSReport from './POSReport'
import InventoryReport from './InventoryReport'
import StaffReport from './StaffReport'
import BanquetReport from './BanquetReport'

export default function ReportsHubPage() {
    const [selectedReport, setSelectedReport] = useState('dynamic')

    return (
        <div className="flex flex-col min-h-screen bg-background animate-fade-in">
            {/* Unified Filter Header */}
            <div className="bg-surface border-b border-border p-6 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                            <FileSpreadsheet className="w-6 h-6 text-[#4A9EFF]" />
                            Reports Central
                        </h1>
                        <p className="text-sm text-text-secondary mt-1">Select and generate any report from a single dashboard.</p>
                    </div>

                    <div className="flex items-center gap-3 bg-surface-light border border-border p-2 rounded-xl shadow-sm">
                        <Filter className="w-4 h-4 text-text-tertiary ml-2" />
                        <select 
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value)}
                            className="bg-transparent border-none text-text-primary text-sm font-semibold outline-none cursor-pointer pr-4 focus:ring-0 appearance-none dark:bg-surface-light"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '.65rem auto' }}
                        >
                            <option value="dynamic" className="bg-[#1a1f26] text-[#e2e8f0]">Dynamic Report Builder</option>
                            <option value="mis" className="bg-[#1a1f26] text-[#e2e8f0]">MIS Report</option>
                            <option value="checkin" className="bg-[#1a1f26] text-[#e2e8f0]">Check-in / Check-out</option>
                            <option value="pos" className="bg-[#1a1f26] text-[#e2e8f0]">POS Sales</option>
                            <option value="inventory" className="bg-[#1a1f26] text-[#e2e8f0]">Inventory &amp; Stock</option>
                            <option value="staff" className="bg-[#1a1f26] text-[#e2e8f0]">Staff Performance</option>
                            <option value="banquet" className="bg-[#1a1f26] text-[#e2e8f0]">Banquet Report</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-7xl mx-auto w-full">
                {selectedReport === 'dynamic' && <DynamicBuilder />}
                {selectedReport === 'mis' && <MISReport />}
                {selectedReport === 'checkin' && <CheckinReport />}
                {selectedReport === 'pos' && <POSReport />}
                {selectedReport === 'inventory' && <InventoryReport />}
                {selectedReport === 'staff' && <StaffReport />}
                {selectedReport === 'banquet' && <BanquetReport />}
            </div>
        </div>
    )
}
