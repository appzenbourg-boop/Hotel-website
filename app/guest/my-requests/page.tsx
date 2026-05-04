'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Avatar from '@/components/common/Avatar'

interface ServiceRequest {
    id: string
    title: string
    description: string
    status: string
    createdAt: string
    type: string
}

export default function MyRequestsPage() {
    const router = useRouter()
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/guest/services/my-requests')
            if (res.ok) {
                const data = await res.json()
                setRequests(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'OVERDUE': return 'bg-red-500/10 text-red-500 border-red-500/20'
            default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 className="w-4 h-4" />
            case 'IN_PROGRESS': return <Clock className="w-4 h-4" />
            case 'OVERDUE': return <AlertCircle className="w-4 h-4" />
            default: return <Clock className="w-4 h-4" />
        }
    }

    return (
        <div className="min-h-screen bg-background text-text-primary pb-20">
            <div className="p-4 flex items-center gap-4 bg-surface/50 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
                <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-5 h-5 text-text-primary" />
                </button>
                <h1 className="text-lg font-bold">My Requests</h1>
            </div>

            <main className="p-6 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-text-secondary">Updating status...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto border border-white/5">
                            <Clock className="w-10 h-10 text-text-tertiary" />
                        </div>
                        <h2 className="text-xl font-bold">No active requests</h2>
                        <p className="text-text-secondary max-w-xs mx-auto">
                            You haven&apos;t made any service requests yet.
                        </p>
                        <Button variant="primary" onClick={() => router.push('/guest/services')}>
                            Create New Request
                        </Button>
                    </div>
                ) : (
                    requests.map(req => (
                        <Card key={req.id} className="p-4 bg-surface/60 border-white/5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {req.type[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-text-primary">{req.title}</h3>
                                        <p className="text-[10px] text-text-tertiary uppercase tracking-wider">#{req.id.slice(-6)}</p>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(req.status)}`}>
                                    {getStatusIcon(req.status)}
                                    {req.status.replace('_', ' ')}
                                </div>
                            </div>

                            {req.description && (
                                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                                    {req.description}
                                </p>
                            )}

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Avatar name="Zenbourg Staff" className="w-6 h-6" />
                                    <span className="text-xs text-text-tertiary">Assigned to Room Service</span>
                                </div>
                                <span className="text-xs text-text-tertiary">
                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </Card>
                    ))
                )}
            </main>
        </div>
    )
}
