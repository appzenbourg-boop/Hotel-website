import React from 'react'
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { redirect } from 'next/navigation'

export default async function AnalyticsDashboard() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/login')

    const propertyId = (session.user as any)?.propertyId
    if (!propertyId) {
        return (
            <div className="p-8 text-center text-text-tertiary">
                Please select a property to view analytics.
            </div>
        )
    }

    // 1. Total Revenue (Sum of paidAmount from completed/checked-out bookings)
    const bookings = await prisma.booking.findMany({
        where: { propertyId }
    })
    
    let totalRevenue = 0
    let totalNewBookings = 0
    
    // Let's say "New Bookings" is bookings made in the current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    bookings.forEach(b => {
        totalRevenue += (b.paidAmount || 0)
        if (new Date(b.createdAt) >= startOfMonth) {
            totalNewBookings++
        }
    })

    // POS Revenue
    const posOrders = await prisma.pOSOrder.findMany({
        where: { propertyId, status: 'SERVED' }
    })
    posOrders.forEach(o => {
        totalRevenue += (o.total || 0)
    })

    // 2. Occupancy Rate
    const totalRooms = await prisma.room.count({ where: { propertyId } })
    const occupiedRooms = await prisma.room.count({ where: { propertyId, status: 'OCCUPIED' } })
    
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

    // 3. RevPAR (Revenue Per Available Room)
    const revPar = totalRooms > 0 ? Math.round(totalRevenue / totalRooms) : 0

    return (
        <div className="p-8 font-sans bg-background min-h-screen text-text-primary animate-fade-in">
            <div className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-[#4A9EFF]" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">High-level insights and performance metrics for your property.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Metric Cards */}
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-[#4A9EFF]/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-[#4A9EFF]/10 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-[#4A9EFF]" />
                        </div>
                    </div>
                    <h3 className="text-text-tertiary text-sm font-semibold uppercase tracking-wider mb-1">Total Revenue</h3>
                    <p className="text-2xl font-bold text-text-primary">₹{totalRevenue.toLocaleString()}</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-[#4A9EFF]/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                    </div>
                    <h3 className="text-text-tertiary text-sm font-semibold uppercase tracking-wider mb-1">Occupancy Rate</h3>
                    <p className="text-2xl font-bold text-text-primary">{occupancyRate}%</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-[#4A9EFF]/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-500" />
                        </div>
                    </div>
                    <h3 className="text-text-tertiary text-sm font-semibold uppercase tracking-wider mb-1">New Bookings (This Month)</h3>
                    <p className="text-2xl font-bold text-text-primary">{totalNewBookings}</p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-[#4A9EFF]/50 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-rose-500" />
                        </div>
                    </div>
                    <h3 className="text-text-tertiary text-sm font-semibold uppercase tracking-wider mb-1">RevPAR</h3>
                    <p className="text-2xl font-bold text-text-primary">₹{revPar.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <BarChart3 className="w-16 h-16 text-[#4A9EFF] opacity-20 mb-4" />
                    <p className="text-text-tertiary font-medium">Revenue Trends Chart</p>
                    <p className="text-xs text-text-secondary mt-1">Sufficient historical data required to generate trend graph.</p>
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <Activity className="w-16 h-16 text-[#4A9EFF] opacity-20 mb-4" />
                    <p className="text-text-tertiary font-medium">Occupancy Analysis</p>
                    <p className="text-xs text-text-secondary mt-1">Sufficient historical data required to generate occupancy graph.</p>
                </div>
            </div>
        </div>
    )
}
