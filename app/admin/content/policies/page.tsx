'use client'

import { useState, useEffect } from 'react'
import { Save, Info, ShieldCheck, Clock, FileText } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

export default function PoliciesPage() {
    const [policies, setPolicies] = useState({
        cancellation: '',
        houseRules: '',
        checkInInstructions: '',
        safety: ''
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/admin/content/policies')
            .then(res => res.json())
            .then(data => {
                if (data && Object.keys(data).length > 0) setPolicies(data)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        try {
            const res = await fetch('/api/admin/content/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(policies)
            })
            if (res.ok) toast.success('Policies updated successfully')
            else toast.error('Failed to update')
        } catch {
            toast.error('Error saving policies')
        }
    }

    const sections = [
        { key: 'cancellation', title: 'Cancellation Policy', icon: FileText, placeholder: 'e.g. Free cancellation up to 48 hours before check-in...' },
        { key: 'houseRules', title: 'House Rules', icon: ShieldCheck, placeholder: 'e.g. No smoking, Quiet hours 10PM-7AM...' },
        { key: 'checkInInstructions', title: 'Check-in Instructions', icon: Clock, placeholder: 'e.g. ID required for all guests...' },
        { key: 'safety', title: 'Safety & Conduct', icon: Info, placeholder: 'e.g. Swimming pool rules, Fire safety...' },
    ]

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Hotel Policies</h1>
                    <p className="text-text-secondary mt-1">Define rules and information for your guests</p>
                </div>
                <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
                    Save All Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {sections.map(({ key, title, icon: Icon, placeholder }) => (
                    <Card key={key} className="relative group">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/5 rounded-lg text-primary items-center justify-center flex">
                                <Icon className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-lg text-text-primary">{title}</h3>
                        </div>
                        <textarea
                            className="w-full min-h-[150px] bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-text-primary focus:ring-2 focus:ring-primary/50 outline-none leading-relaxed resize-y"
                            placeholder={placeholder}
                            value={(policies as any)[key]}
                            onChange={e => setPolicies({ ...policies, [key]: e.target.value })}
                        />
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-text-tertiary">Markdown supported</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
