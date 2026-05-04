'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

export default function RazorpayCheckout({ params }: { params: { orderId: string } }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [orderDetails, setOrderDetails] = useState<any>(null)

    useEffect(() => {
        // In a real app, you might want to fetch order details from an API using the orderId
        // but for now we expect the app to pass details via query params or we just use orderId
        const searchParams = new URLSearchParams(window.location.search)
        const key = searchParams.get('key')
        const amount = searchParams.get('amount')
        const name = searchParams.get('name') || 'Zenbourg Guest'
        const email = searchParams.get('email') || ''
        const contact = searchParams.get('contact') || ''

        if (!key || !amount) {
            setError('Missing payment details')
            setLoading(false)
            return
        }

        setOrderDetails({ key, amount, name, email, contact })
        setLoading(false)
    }, [params.orderId])

    useEffect(() => {
        if (!loading && orderDetails && (window as any).Razorpay) {
            handlePayment();
        }
    }, [loading, orderDetails]);

    const handlePayment = () => {
        if (!(window as any).Razorpay || !orderDetails) return

        const options = {
            key: orderDetails.key,
            amount: orderDetails.amount,
            currency: 'INR',
            name: 'Zenbourg Hospitality',
            description: 'Payment for Services',
            order_id: params.orderId,
            handler: function (response: any) {
                // Success! Redirect back to app with success status
                window.location.href = `hotel://payment-result?razorpay_payment_id=${response.razorpay_payment_id}&razorpay_order_id=${response.razorpay_order_id}&razorpay_signature=${response.razorpay_signature}`
            },
            prefill: {
                name: orderDetails.name,
                email: orderDetails.email,
                contact: orderDetails.contact,
            },
            theme: {
                color: '#2F2E2E',
            },
            modal: {
                ondismiss: function() {
                    window.location.href = 'hotel://payment-cancelled'
                }
            }
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
    }

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8">
            <div className="p-6 bg-red-50 rounded-2xl text-center">
                <p className="text-red-500 font-medium">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-4 text-sm font-semibold text-red-600 underline">Try again</button>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <Script
                src="https://checkout.razorpay.com/v1/checkout.js"
                onLoad={() => setLoading(false)}
            />
            
            <div className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-gray-100 rounded-full border-t-[#2F2E2E] animate-spin mx-auto mb-6"></div>
                <h1 className="mb-2 text-2xl font-bold text-[#2F2E2E]">Securing Session</h1>
                <p className="text-gray-500 max-w-xs mx-auto">Redirecting you to our secure payment partner...</p>
                
                {!loading && orderDetails && (
                    <button
                        onClick={handlePayment}
                        className="mt-8 px-8 py-3 font-semibold text-white bg-[#2F2E2E] rounded-full hover:bg-black transition-colors"
                    >
                        Click if not redirected
                    </button>
                )}
            </div>
        </div>
    )
}
