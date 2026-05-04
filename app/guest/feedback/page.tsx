'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, MessageSquare } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

const StarRating = ({ value, onChange, size = 'md' }: any) => {
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                >
                    <Star
                        className={`${size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
                            } ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
                            }`}
                    />
                </button>
            ))}
        </div>
    )
}

export default function FeedbackPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [ratings, setRatings] = useState({
        overall: 0,
        cleanliness: 0,
        service: 0,
        amenities: 0,
        comment: ''
    })

    const handleSubmit = async () => {
        if (ratings.overall === 0) {
            toast.error('Please provide an overall rating')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/guest/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ratings)
            })

            if (res.ok) {
                toast.success('Thank you for your feedback!')
                setTimeout(() => router.push('/guest/dashboard'), 2000)
            } else {
                toast.error('Submission failed')
            }
        } catch {
            toast.error('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-text-primary p-6 flex flex-col items-center justify-center">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">Rate Your Stay</h1>
                    <p className="text-text-secondary mt-2">We hope you enjoyed your time at Zenbourg.</p>
                </div>

                <Card className="p-8 space-y-8 border-primary/20 bg-surface/50 backdrop-blur-md">
                    <div className="text-center space-y-4">
                        <p className="text-lg font-medium text-text-primary">Overall Experience</p>
                        <div className="flex justify-center">
                            <StarRating value={ratings.overall} onChange={(v: number) => setRatings({ ...ratings, overall: v })} size="lg" />
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-text-secondary">Cleanliness</span>
                            <StarRating value={ratings.cleanliness} onChange={(v: number) => setRatings({ ...ratings, cleanliness: v })} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-text-secondary">Staff Service</span>
                            <StarRating value={ratings.service} onChange={(v: number) => setRatings({ ...ratings, service: v })} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-text-secondary">Amenities</span>
                            <StarRating value={ratings.amenities} onChange={(v: number) => setRatings({ ...ratings, amenities: v })} />
                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm font-medium text-text-secondary mb-2">Any additional comments?</label>
                        <div className="relative">
                            <MessageSquare className="absolute top-3 left-3 w-4 h-4 text-text-tertiary" />
                            <textarea
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px]"
                                placeholder="Tell us what you loved or how we can improve..."
                                value={ratings.comment}
                                onChange={e => setRatings({ ...ratings, comment: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        className="w-full py-3 shadow-lg shadow-purple-500/20"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        Submit Review
                    </Button>
                </Card>

                <button
                    onClick={() => router.back()}
                    className="w-full text-center text-sm text-text-secondary hover:text-white transition-colors"
                >
                    Skip for now
                </button>
            </div>
        </div>
    )
}
