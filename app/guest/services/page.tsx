'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Send } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'
import Avatar from '@/components/common/Avatar'

function ServiceRequestContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const category = searchParams.get('category') || 'HOUSEKEEPING'

    const [request, setRequest] = useState({
        item: '',
        description: '',
        priority: 'NORMAL'
    })
    const [loading, setLoading] = useState(false)

    // Common requests by category for quick selection
    const quickOptions: any = {
        HOUSEKEEPING: ['Extra Towels', 'Room Cleaning', 'Toiletries Refill', 'Turnquest Service'],
        DINING: ['Breakfast in Bed', 'Dinner Reservation', 'Bucket of Ice', 'Coffee Service'],
        CONCIERGE: ['Taxi Booking', 'Luggage Assistance', 'Wake-up Call', 'City Guide MAP'],
        MAINTENANCE: ['AC Issue', 'TV Not Working', 'Plumbing Issue', 'Light Bulb Check']
    }

    const handleSubmit = async () => {
        if (!request.item) {
            toast.error('Please select or describe a service')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/guest/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...request, category })
            })

            if (res.ok) {
                toast.success('Request received! Staff is on the way.')
                setTimeout(() => router.push('/guest/dashboard'), 1500)
            } else {
                toast.error('Failed to submit request')
            }
        } catch (e) {
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-text-primary pb-20">
            <div className="p-4 flex items-center gap-4 bg-surface sticky top-0 z-20 border-b border-white/5">
                <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5 text-text-primary" />
                </button>
                <h1 className="text-lg font-bold capitalize">{category.toLowerCase()} Request</h1>
            </div>

            <main className="p-6 space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <Avatar name="Guest" className="w-12 h-12" />
                    <div className="bg-surface p-4 rounded-xl rounded-tl-none border border-border max-w-[80%]">
                        <p className="text-sm text-text-secondary">
                            Hello! How can we assist you with <span className="text-primary font-bold lowercase">{category}</span> today?
                        </p>
                    </div>
                </div>

                {/* Quick Options */}
                <div>
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">Popular Requests</p>
                    <div className="flex flex-wrap gap-2">
                        {quickOptions[category]?.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => setRequest({ ...request, item: opt })}
                                className={`px-4 py-2 rounded-full text-sm border transition-all ${request.item === opt
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                                    : 'bg-surface border-white/10 text-text-secondary hover:bg-surface-hover'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Or type your request</label>
                        <input
                            type="text"
                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                            placeholder="e.g. I need..."
                            value={request.item}
                            onChange={e => setRequest({ ...request, item: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Special Instructions (Optional)</label>
                        <textarea
                            className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
                            placeholder="e.g. Leave at door, extra spicy..."
                            value={request.description}
                            onChange={e => setRequest({ ...request, description: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">When do you need this?</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRequest({ ...request, priority: 'URGENT' })}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm ${request.priority === 'URGENT' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-surface border-white/10 text-text-secondary'
                                    }`}
                            >
                                <Clock className="w-4 h-4" /> Now (Urgent)
                            </button>
                            <button
                                onClick={() => setRequest({ ...request, priority: 'NORMAL' })}
                                className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 text-sm ${request.priority === 'NORMAL' ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-white/10 text-text-secondary'
                                    }`}
                            >
                                <Clock className="w-4 h-4" /> Later
                            </button>
                        </div>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full py-4 text-base shadow-xl shadow-primary/20"
                    onClick={handleSubmit}
                    loading={loading}
                    leftIcon={<Send className="w-4 h-4" />}
                >
                    Submit Request
                </Button>
            </main>
        </div>
    )
}

export default function ServiceRequestPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-secondary">Loading services...</div>}>
            <ServiceRequestContent />
        </Suspense>
    )
}
