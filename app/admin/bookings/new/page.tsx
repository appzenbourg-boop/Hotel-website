'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Avatar from '@/components/common/Avatar'
import {
    ArrowLeft, ArrowRight, Save, Calendar, User, UserPlus, Bed, IndianRupee,
    Search, Plus, X, Check, ChevronRight, MapPin,
    Smartphone, Mail, Star, Loader2, Info, Building2,
    CheckCircle2, AlertCircle, Clock, Undo2, Edit2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, validateGSTIN } from '@/lib/utils'
import { buildContextUrl } from '@/lib/admin-context'
import Button from '@/components/ui/Button'

const STEPS = [
    { id: 'guest', label: 'GUEST SELECTION' },
    { id: 'dates', label: 'ROOM & DATES' },
    { id: 'payment', label: 'PAYMENT' },
    { id: 'confirm', label: 'CONFIRMATION' }
]

const toLocalDateStr = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function NewBookingContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetRoomId = searchParams.get('roomId')
    const hasAutoSelected = useRef(false)

    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/admin/login?callbackUrl=/admin/bookings/new')
        },
    })
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)

    // Data Lists
    const [allGuests, setAllGuests] = useState<any[]>([])
    const [allRooms, setAllRooms] = useState<any[]>([])

    // Selection state
    const [selectedGuest, setSelectedGuest] = useState<any>(null)
    const [selectedRooms, setSelectedRooms] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    // State for New Guest Modal
    const [showNewGuestModal, setShowNewGuestModal] = useState(false)
    const [newGuestData, setNewGuestData] = useState({ name: '', email: '', phone: '', address: '', dateOfBirth: '', gstNumber: '' })

    // Booking Details
    const [bookingDetails, setBookingDetails] = useState({
        checkIn: toLocalDateStr(new Date()),
        checkOut: toLocalDateStr(new Date(Date.now() + 86400000)), // Default 1 night
        guests: 2,
        kids: 0,
        source: 'DIRECT',
        status: 'RESERVED',
        notes: '',
        specialRequests: ''
    })

    // Meal plans state
    const [mealPlans, setMealPlans] = useState<any[]>([])
    const [selectedMealPlan, setSelectedMealPlan] = useState<string>('EP')
    const [customMealPlanRates, setCustomMealPlanRates] = useState<Record<string, number>>({})

    // Extra Add-ons state (Extra Bed, Extra Mattress, Custom Add-ons)
    const [extraAddons, setExtraAddons] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([
        { id: 'extra_bed', name: 'Extra Bed', price: 500, qty: 0 },
        { id: 'extra_mattress', name: 'Extra Mattress', price: 300, qty: 0 },
    ])
    const [customAddonName, setCustomAddonName] = useState('')
    const [customAddonPrice, setCustomAddonPrice] = useState('')

    // Filter state
    const [roomTypeFilter, setRoomTypeFilter] = useState('All Rooms')
    const [occupancyFilter, setOccupancyFilter] = useState('2 Adults, 0 Kids')

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const handleDateClick = (date: Date) => {
        const dateStr = toLocalDateStr(date)
        const checkIn = bookingDetails.checkIn
        const checkOut = bookingDetails.checkOut

        // If no check-in or if we already have both, start over with check-in
        if (dateStr < bookingDetails.checkIn || (bookingDetails.checkIn && bookingDetails.checkOut)) {
            setBookingDetails({ ...bookingDetails, checkIn: dateStr, checkOut: '' })
        } else {
            // Setting check-out
            setBookingDetails({ ...bookingDetails, checkOut: dateStr })
        }
    }

    const filteredRooms = useMemo(() => {
        let rooms = allRooms

        if (roomTypeFilter !== 'All Rooms') {
            rooms = rooms.filter(r => r.type === roomTypeFilter)
        }

        // Apply Occupancy Filter
        if (occupancyFilter !== 'All' && occupancyFilter) {
            const adults = parseInt(occupancyFilter.split(' ')[0]) || 0
            rooms = rooms.filter(r => r.maxOccupancy >= adults)
        }

        return rooms
    }, [allRooms, roomTypeFilter, occupancyFilter])

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const renderCalendarMonth = (date: Date, showPrev = false, showNext = false) => {
        const month = date.getMonth()
        const year = date.getFullYear()
        const days = getDaysInMonth(year, month)
        const firstDay = getFirstDayOfMonth(year, month)
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

        const daysArray = []
        for (let i = 0; i < firstDay; i++) daysArray.push(null)
        for (let i = 1; i <= days; i++) daysArray.push(i)

        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between text-white font-bold px-2 text-xl tracking-tight">
                    {showPrev ? (
                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="hover:text-[#4A9EFF] transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                    ) : <div className="w-6 h-6" />}
                    <span>{monthName}</span>
                    {showNext ? (
                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="hover:text-[#4A9EFF] transition-colors"><ArrowRight className="w-6 h-6" /></button>
                    ) : <div className="w-6 h-6" />}
                </div>
                <div className="grid grid-cols-7 text-[10px] font-bold text-gray-600 text-center uppercase tracking-widest">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center font-bold text-sm">
                    {daysArray.map((day, i) => {
                        if (day === null) return <div key={`empty-${i}`} className="h-10" />
                        const currentDayDate = new Date(year, month, day)
                        const dateStr = toLocalDateStr(currentDayDate)
                        const isCheckIn = dateStr === bookingDetails.checkIn
                        const isCheckOut = dateStr === bookingDetails.checkOut
                        const isInRange = dateStr > bookingDetails.checkIn && dateStr < bookingDetails.checkOut

                        return (
                            <div
                                key={day}
                                onClick={() => handleDateClick(currentDayDate)}
                                className={cn(
                                    "h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:bg-white/[0.05] border border-transparent text-sm font-bold",
                                    isCheckIn || isCheckOut ? "bg-[#4A9EFF] text-white shadow-lg" :
                                        isInRange ? "bg-[#4A9EFF]/20 text-[#4A9EFF]" : "text-gray-500"
                                )}
                            >
                                {day}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // --- FETCH RESOURCES ---
    // Fetch Rooms when dates change
    useEffect(() => {
        const loadRooms = async () => {
            if (!bookingDetails.checkIn || !bookingDetails.checkOut) return
            setFetching(true)
            try {
                const queryParams = new URLSearchParams()
                if (bookingDetails.checkIn) queryParams.append('start', bookingDetails.checkIn)
                if (bookingDetails.checkOut) queryParams.append('end', bookingDetails.checkOut)
                if (roomTypeFilter !== 'All Rooms') queryParams.append('type', roomTypeFilter.toUpperCase())
                queryParams.append('status', 'AVAILABLE')

                const rRes = await fetch(buildContextUrl(`/api/admin/rooms?${queryParams.toString()}`))
                let rooms: any[] = []
                if (rRes.ok) {
                    const json = await rRes.json()
                    rooms = Array.isArray(json) ? json : (json?.data ?? [])
                }

                // Filter out duplicates
                let uniqueRooms = rooms.reduce((acc: any[], current: any) => {
                    const x = acc.find((item: any) => item.roomNumber === current.roomNumber)
                    if (!x) return acc.concat([current])
                    return acc
                }, [])

                // Auto-select room if roomId was passed in URL query
                if (targetRoomId && !hasAutoSelected.current) {
                    let targetRoom = uniqueRooms.find((r: any) => r.id === targetRoomId)
                    if (!targetRoom) {
                        try {
                            const trRes = await fetch(buildContextUrl(`/api/admin/rooms/${targetRoomId}`))
                            if (trRes.ok) {
                                const trJson = await trRes.json()
                                const fetchedRoom = trJson?.data ?? trJson
                                if (fetchedRoom && fetchedRoom.id) {
                                    targetRoom = fetchedRoom
                                    uniqueRooms = [fetchedRoom, ...uniqueRooms]
                                }
                            }
                        } catch (e) {
                            console.error('Failed to fetch preselected room:', e)
                        }
                    }

                    if (targetRoom) {
                        setSelectedRooms([targetRoom])
                        hasAutoSelected.current = true
                        if (targetRoom.maxOccupancy && targetRoom.maxOccupancy < 2) {
                            setOccupancyFilter('All')
                        }
                    }
                }

                setAllRooms(uniqueRooms)
            } catch (err) {
                console.error(err)
            } finally {
                setFetching(false)
            }
        }
        loadRooms()
    }, [bookingDetails.checkIn, bookingDetails.checkOut, targetRoomId])

    // Fetch Guests once
    useEffect(() => {
        const loadGuests = async () => {
            try {
                const gRes = await fetch(buildContextUrl('/api/admin/guests'))
                if (gRes.ok) {
                    const json = await gRes.json()
                    setAllGuests(Array.isArray(json) ? json : (json?.data ?? []))
                }
            } catch (err) {
                toast.error("Failed to sync guest registry")
            }
        }
        loadGuests()
    }, [])

    // --- COMPUTED ---
    const filteredGuests = useMemo(() => {
        if (!searchQuery) return allGuests.slice(0, 5)
        return allGuests.filter(g =>
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.phone?.includes(searchQuery)
        )
    }, [allGuests, searchQuery])

    // Pricing state — fetched from property financial settings
    const [pricingSettings, setPricingSettings] = useState({
        gstPercent: 18.0,
        serviceChargePercent: 0.0,
        luxuryTaxPercent: 0.0,
        defaultDiscountPercent: 0.0,
        discountLabel: 'Discount',
    })

    const stayDuration = useMemo(() => {
        if (!bookingDetails.checkIn || !bookingDetails.checkOut) return 1
        const start = new Date(bookingDetails.checkIn)
        const end = new Date(bookingDetails.checkOut)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return days > 0 ? days : 1
    }, [bookingDetails.checkIn, bookingDetails.checkOut])

    const subtotal = useMemo(() => {
        if (selectedRooms.length === 0 || stayDuration <= 0) return 0
        return selectedRooms.reduce((acc, room) => acc + (room.basePrice * stayDuration), 0)
    }, [selectedRooms, stayDuration])

    const activeMealPlanObj = useMemo(() => {
        return mealPlans.find(mp => mp.type === selectedMealPlan)
    }, [mealPlans, selectedMealPlan])

    const activeMealPlanRate = useMemo(() => {
        if (selectedMealPlan === 'EP') return 0
        if (customMealPlanRates[selectedMealPlan] !== undefined) return customMealPlanRates[selectedMealPlan]
        return activeMealPlanObj?.pricePerDay ?? (selectedMealPlan === 'CP' ? 500 : selectedMealPlan === 'MAP' ? 1200 : 1800)
    }, [selectedMealPlan, customMealPlanRates, activeMealPlanObj])

    const mealPlanTotal = useMemo(() => {
        if (selectedMealPlan === 'EP') return 0
        return activeMealPlanRate * stayDuration * (bookingDetails.guests || 1)
    }, [selectedMealPlan, activeMealPlanRate, stayDuration, bookingDetails.guests])

    const extraAddonsTotal = useMemo(() => {
        return extraAddons.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0)
    }, [extraAddons])

    // Real tax calculation from property settings
    const gstAmount = Math.round(subtotal * pricingSettings.gstPercent / 100 * 100) / 100
    const serviceChargeAmount = Math.round(subtotal * pricingSettings.serviceChargePercent / 100 * 100) / 100
    const luxuryTaxAmount = Math.round(subtotal * pricingSettings.luxuryTaxPercent / 100 * 100) / 100
    const totalBeforeDiscount = subtotal + gstAmount + serviceChargeAmount + luxuryTaxAmount
    const discountAmount = Math.round(totalBeforeDiscount * pricingSettings.defaultDiscountPercent / 100 * 100) / 100
    const grandTotal = Math.round((totalBeforeDiscount - discountAmount + mealPlanTotal + extraAddonsTotal) * 100) / 100

    // Fetch pricing & meal plan settings when session is ready
    useEffect(() => {
        const propertyId = session?.user?.propertyId
        if (!propertyId) return
        fetch(`/api/admin/settings/financial?propertyId=${propertyId}`)
            .then(r => r.json())
            .then(j => { if (j.success && j.data) setPricingSettings(j.data) })
            .catch(() => {})

        fetch(`/api/admin/settings/meal-plans?propertyId=${propertyId}`)
            .then(r => r.json())
            .then(j => { if (j.success && j.data) setMealPlans(j.data) })
            .catch(() => {})
    }, [session?.user?.propertyId])

    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGuestData.name) return toast.error("Name is required")
        setLoading(true)
        try {
            const res = await fetch(buildContextUrl('/api/admin/guests'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newGuestData,
                    gstNumber: newGuestData.gstNumber ? newGuestData.gstNumber.trim().toUpperCase() : undefined
                })
            })
            if (!res.ok) throw new Error()
            const json = await res.json()
            // API returns { success, data: guest } — unwrap it
            const guest = json?.data ?? json
            // Normalize to match the GET formatted shape so the list renders correctly
            const normalizedGuest = {
                id: guest.id,
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                address: guest.address ?? null,
                dateOfBirth: guest.dateOfBirth ?? null,
                idType: guest.idType ?? null,
                idNumber: guest.idNumber ?? null,
                gstNumber: guest.gstNumber ?? null,
                checkInStatus: guest.checkInStatus ?? 'PENDING',
                totalStays: 0,
                bookings: [],
                roomNumber: 'N/A',
                source: 'DIRECT',
                status: null,
            }
            setAllGuests([normalizedGuest, ...allGuests])
            setSelectedGuest(normalizedGuest)
            setShowNewGuestModal(false)
            setNewGuestData({ name: '', email: '', phone: '', address: '', dateOfBirth: '', gstNumber: '' })
            toast.success("Guest created successfully")
        } catch (err) {
            toast.error("Failed to create guest")
        } finally {
            setLoading(false)
        }
    }

    const handleFinalSubmit = async () => {
        if (!selectedGuest || selectedRooms.length === 0 || stayDuration <= 0) {
            toast.error("Incomplete reservation data")
            return
        }
        setLoading(true)
        try {
            const results = await Promise.all(selectedRooms.map(room =>
                fetch(buildContextUrl('/api/admin/bookings'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        guestId: selectedGuest.id,
                        roomId: room.id,
                        checkIn: bookingDetails.checkIn,
                        checkOut: bookingDetails.checkOut,
                        numberOfGuests: bookingDetails.guests,
                        totalAmount: room.basePrice * stayDuration, // base; API applies taxes
                        source: bookingDetails.source,
                        notes: bookingDetails.notes,
                        specialRequests: bookingDetails.specialRequests,
                        mealPlan: selectedMealPlan,
                        mealPlanPricePerDay: activeMealPlanRate,
                        extraAddons: extraAddons.filter(a => (a.qty > 0 || a.price > 0) && a.name),
                        extraAddonsAmount: extraAddonsTotal,
                    })
                })
            ))

            if (results.some(r => !r.ok)) throw new Error('One or more bookings failed')
            toast.success("Reservation Secured Successfully!")
            router.push('/admin/bookings')
            router.refresh()
        } catch (err) {
            toast.error("Cloud sync failed")
        } finally {
            setLoading(false)
        }
    }

    // --- RENDERS ---

    const renderGuestStep = () => (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                        <span>Bookings</span>
                        <ChevronRight className="w-3 h-3 text-gray-700" />
                        <span className="text-gray-400">New Reservation</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">Who is this booking for?</h1>
                    <p className="text-gray-400 text-base font-medium leading-relaxed">Search for an existing guest profile or add a new one to start the reservation.</p>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-[#4A9EFF] uppercase tracking-[0.15em]">Step 1: Select Guest</h3>
                            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Next: Select Dates</span>
                        </div>
                        <div className="w-full h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
                            <div className="w-[140px] h-full bg-[#4A9EFF] rounded-full shadow-[0_0_20px_rgba(74,158,255,0.6)]" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search by name, email or phone..."
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-4 pl-14 pr-12 text-white text-base placeholder:text-gray-600 outline-none focus:border-[#4A9EFF]/50 transition-all font-semibold"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowNewGuestModal(true)}
                            className="flex items-center gap-3 px-8 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] text-white font-bold transition-all text-sm"
                        >
                            <UserPlus className="w-5 h-5 text-gray-400" /> Create New Guest
                        </button>
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white tracking-tight">Search Results</h3>
                            <span className="bg-white/[0.05] text-gray-400 text-[10px] font-bold px-3 py-1 rounded-lg border border-white/5 uppercase tracking-widest">{filteredGuests.length} matches</span>
                        </div>

                        <div className="space-y-3">
                            {filteredGuests.map((guest) => (
                                <div
                                    key={guest.id}
                                    onClick={() => setSelectedGuest(guest)}
                                    className={cn(
                                        "group p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between",
                                        selectedGuest?.id === guest.id
                                            ? "bg-[#4A9EFF]/10 border-[#4A9EFF] shadow-[0_4px_30px_rgba(74,158,255,0.15)]"
                                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center gap-5">
                                        <Avatar name={guest.name} size="lg" className="border-2 border-white/10" />
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-base font-bold text-white tracking-tight">{guest.name}</h4>
                                                {guest.isVIP && <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-amber-500/20 tracking-widest">VIP</span>}
                                                {guest.isBlacklisted && <span className="bg-rose-500/10 text-rose-500 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-rose-500/20 tracking-widest">BLACKLISTED</span>}
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                                    <Mail className="w-3.5 h-3.5 text-gray-700" /> {guest.email}
                                                </span>
                                                <span className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                                    <Smartphone className="w-3.5 h-3.5 text-gray-700" /> {guest.phone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Last Visit</p>
                                            <p className="text-gray-300 font-bold text-[15px]">{guest.lastVisit}</p>
                                        </div>
                                        <div className={cn(
                                            "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedGuest?.id === guest.id ? "bg-[#4A9EFF] border-[#4A9EFF] shadow-lg shadow-[#4A9EFF]/40" : "border-white/10 bg-transparent group-hover:border-white/20"
                                        )}>
                                            {selectedGuest?.id === guest.id && <Check className="w-4 h-4 text-white stroke-[3.5px]" />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SIDEBAR PREVIEW - DITTO SAME STYLE */}
            <div className="space-y-8">
                <div className="overflow-hidden bg-white/[0.03] border border-white/10 shadow-2xl relative rounded-[2.5rem]">
                    <div className="h-32 bg-[#4A9EFF]" />
                    <div className="relative -mt-12 px-8 pb-10 text-left">
                        <Avatar name={selectedGuest?.name} size="xl" className="border-[6px] border-[#101922] bg-[#101922] shadow-2xl" />

                        <div className="mt-8 space-y-1">
                            {selectedGuest ? (
                                <>
                                    <h2 className="text-xl font-bold text-white tracking-tight">{selectedGuest.name}</h2>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Guest ID: #{selectedGuest.id?.slice(-6).toUpperCase()}</p>

                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">TOTAL STAYS</p>
                                            <p className="text-xl font-bold text-white">{selectedGuest?.bookings?.length || 0}</p>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">AVG SPEND</p>
                                            <p className="text-xl font-bold text-white tracking-tight">₹{Math.round((selectedGuest?.bookings?.reduce((acc: any, b: any) => acc + b.totalAmount, 0) || 0) / (selectedGuest?.bookings?.length || 1))}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mt-10">
                                        <div className="flex items-center gap-5 text-gray-400 font-bold text-[15px]">
                                            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-md">
                                                <MapPin className="w-5 h-5 text-gray-600" />
                                            </div>
                                            {selectedGuest?.address || 'Address Not Provided'}
                                        </div>
                                        <div className="flex items-center gap-5 text-gray-400 font-bold text-[15px]">
                                            <div className="w-10 h-10 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 shadow-md">
                                                <Calendar className="w-5 h-5 text-gray-600" />
                                            </div>
                                            {selectedGuest?.dateOfBirth ? new Date(selectedGuest.dateOfBirth).toLocaleDateString() : 'DOB Unknown'}
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-10 border-t border-white/5">
                                        {selectedGuest?.notes ? (
                                            <p className="text-[13px] text-gray-500 leading-relaxed font-bold">
                                                &quot;{selectedGuest.notes}&quot;
                                            </p>
                                        ) : (
                                            <p className="text-[12px] text-gray-700 italic">No special notes on file.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="py-24 flex flex-col items-center justify-center opacity-10 grayscale">
                                    <User className="w-20 h-16 mb-6" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting Selection</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <button
                        className="w-full h-16 bg-[#4A9EFF] hover:bg-[#3A8EEF] disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-50 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#4A9EFF]/20 active:scale-95"
                        disabled={!selectedGuest}
                        onClick={() => setCurrentStep(1)}
                    >
                        Continue to Dates <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="w-full text-center text-sm font-bold text-gray-500 hover:text-white transition-colors py-2 uppercase tracking-widest"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>

            {/* NEW GUEST MODAL */}
            {showNewGuestModal && (
                <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-6">
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] w-full max-w-md p-10 space-y-8 animate-in zoom-in-95 duration-300 shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white tracking-tight">Create New Guest</h2>
                            <button onClick={() => setShowNewGuestModal(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateGuest} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">Full Name</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-semibold outline-none focus:border-[#4A9EFF] shadow-inner transition-all"
                                        placeholder="e.g. Jane Smith"
                                        value={newGuestData.name}
                                        onChange={e => setNewGuestData({ ...newGuestData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">Phone Number</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-semibold outline-none focus:border-[#4A9EFF] shadow-inner transition-all"
                                        placeholder="+1 (555) 000-0000"
                                        value={newGuestData.phone}
                                        onChange={e => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">E-mail Address</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-semibold outline-none focus:border-[#4A9EFF] shadow-inner transition-all"
                                        placeholder="jane@example.com"
                                        value={newGuestData.email}
                                        onChange={e => setNewGuestData({ ...newGuestData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5 text-left">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-semibold outline-none focus:border-[#4A9EFF] shadow-inner transition-all"
                                        value={newGuestData.dateOfBirth}
                                        onChange={e => setNewGuestData({ ...newGuestData, dateOfBirth: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">Street Address</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-semibold outline-none focus:border-[#4A9EFF] shadow-inner transition-all"
                                    placeholder="e.g. 123 Luxury Ave, NY"
                                    value={newGuestData.address}
                                    onChange={e => setNewGuestData({ ...newGuestData, address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5 text-left pb-4">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1">GSTIN (Optional for B2B Tax Invoice)</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-mono font-semibold uppercase outline-none focus:border-[#4A9EFF] shadow-inner transition-all placeholder:text-gray-600"
                                    placeholder="e.g. 27ABCDE1234F1ZH"
                                    value={newGuestData.gstNumber}
                                    onChange={e => setNewGuestData({ ...newGuestData, gstNumber: e.target.value.toUpperCase() })}
                                />
                                {(() => {
                                    if (!newGuestData.gstNumber) return null
                                    const v = validateGSTIN(newGuestData.gstNumber)
                                    return (
                                        <div className={cn("text-[11px] font-semibold flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-md border", v.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                                            {v.isValid ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                            <span>{v.message}</span>
                                        </div>
                                    )
                                })()}
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 bg-[#4A9EFF] hover:bg-[#3A8EEF] rounded-2xl text-white font-bold text-sm uppercase tracking-[0.1em] shadow-xl shadow-[#4A9EFF]/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Register Guest Profile <ArrowRight className="w-5 h-5 stroke-[2.5]" /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )

    const renderRoomStep = () => (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 animate-in fade-in slide-in-from-right-8 duration-500 pb-20">
            <div className="space-y-10">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">Select Dates & Room</h1>
                    <p className="text-gray-400 text-base font-medium leading-relaxed">Check availability and select the best room for the guest.</p>
                </div>

                {/* CALENDAR SECTION */}
                <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="grid grid-cols-2 gap-16">
                        {renderCalendarMonth(currentMonth, true, false)}
                        {renderCalendarMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1), false, true)}
                    </div>
                </div>

                {/* FILTERS */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Guests</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <select
                                value={occupancyFilter}
                                onChange={(e) => setOccupancyFilter(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 pl-12 pr-10 text-white font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-white/20"
                            >
                                <option value="All" className="bg-[#101922]">Any Occupancy</option>
                                <option value="1 Adult, 0 Kids" className="bg-[#101922]">1 Adult</option>
                                <option value="2 Adults, 0 Kids" className="bg-[#101922]">2 Adults</option>
                                <option value="3 Adults, 0 Kids" className="bg-[#101922]">3 Adults</option>
                                <option value="4 Adults, 0 Kids" className="bg-[#101922]">4 Adults</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Room Type</label>
                        <div className="relative">
                            <Bed className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <select
                                value={roomTypeFilter}
                                onChange={(e) => setRoomTypeFilter(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 pl-12 pr-10 text-white font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-white/20"
                            >
                                <option value="All Rooms" className="bg-[#101922]">All Types</option>
                                <option value="Deluxe Suite" className="bg-[#101922]">Deluxe Suite</option>
                                <option value="King Royal" className="bg-[#101922]">King Royal</option>
                                <option value="Standard Twin" className="bg-[#101922]">Standard Twin</option>
                                <option value="Junior Suite" className="bg-[#101922]">Junior Suite</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Attributes</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <select className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 pl-12 pr-10 text-white font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-white/20">
                                <option className="bg-[#101922]">Any Attribute</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setRoomTypeFilter('All Rooms')
                                setOccupancyFilter('All')
                                setSelectedRooms([])
                            }}
                            className="w-full h-12 bg-[#4A9EFF]/10 border border-[#4A9EFF]/30 rounded-2xl text-[#4A9EFF] font-bold hover:bg-[#4A9EFF]/20 transition-all uppercase text-[10px] tracking-widest shadow-xl active:scale-95"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>                <div className="space-y-6 pt-6" id="available-rooms-section">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white tracking-tight">Available Rooms ({filteredRooms.length})</h3>
                        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1db954] animate-pulse" />
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Live Availability</span>
                        </div>
                    </div>
                    
                    {fetching ? (
                        <div className="grid grid-cols-2 gap-6 opacity-50 grayscale transition-all duration-500">
                             {[1,2,3,4].map(i => (
                                <div key={i} className="aspect-[16/10] bg-white/[0.03] rounded-2xl animate-pulse border border-white/5" />
                             ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6">
                            {filteredRooms.map((room) => {
                                const isSelected = selectedRooms.some(r => r.id === room.id)
                                return (
                                    <div
                                        key={room.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedRooms(selectedRooms.filter(r => r.id !== room.id))
                                            } else {
                                                setSelectedRooms([...selectedRooms, room])
                                            }
                                        }}
                                        className={cn(
                                            "bg-[#0D151C] rounded-2xl border transition-all overflow-hidden flex flex-col group cursor-pointer relative",
                                            isSelected ? "border-[#4A9EFF] shadow-[0_0_20px_rgba(74,158,255,0.1)] ring-1 ring-[#4A9EFF]/20" : "border-white/5 hover:border-white/10"
                                        )}
                                    >
                                        <div className="aspect-[16/9] relative">
                                            <Image 
                                                src={room.images?.[0] || (room.type?.includes('Suite') 
                                                    ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80" 
                                                    : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                )} 
                                                alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized 
                                            />
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <span className="bg-[#1db954] text-white text-[8px] font-bold uppercase px-3 py-1 rounded-lg shadow-lg border border-white/10 backdrop-blur-md">CLEAN</span>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
                                            <div className="absolute bottom-4 left-6 text-white text-left">
                                                <p className="text-base font-bold tracking-tight">Room {room.roomNumber}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{room.type}</p>
                                            </div>
                                        </div>
                                        <div className="p-5 pb-6 flex flex-col flex-1 backdrop-blur-3xl bg-white/[0.01]">
                                            <div className="flex gap-2 mb-4">
                                                <span className="text-[8px] font-bold text-gray-500 uppercase border border-white/5 bg-white/[0.02] px-2 py-1 rounded-md">Sea View</span>
                                                <span className="text-[8px] font-bold text-gray-500 uppercase border border-white/5 bg-white/[0.02] px-2 py-1 rounded-md">Floor {room.floor || 1}</span>
                                            </div>
                                            <div className="flex gap-4 mt-auto pt-4 border-t border-white/5">
                                                <div className="flex-1 text-left">
                                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest leading-none mb-1">Nightly Rate</p>
                                                    <p className="text-base font-bold text-white tracking-tight">₹{room.basePrice.toLocaleString()}<span className="text-[9px] font-bold text-gray-600 ml-1">/NT</span></p>
                                                </div>
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                                    isSelected ? "bg-[#4A9EFF] shadow-[0_0_15px_rgba(74,158,255,0.3)]" : "bg-white/[0.02] border border-white/10 text-gray-800"
                                                )}>
                                                    <Check className={cn("w-5 h-5 stroke-[4] transition-all", isSelected ? "text-white scale-100" : "opacity-0 scale-50")} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* SIDEBAR PREVIEW */}
            <div className="space-y-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 sticky top-24 max-h-[calc(100vh-7.5rem)] flex flex-col shadow-2xl overflow-hidden">
                    {/* 1. Header (Fixed at top of card) */}
                    <div className="pb-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white tracking-tight">Booking Summary</h3>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID: #BK-9284</span>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-black/30 rounded-2xl border border-white/5 shadow-inner">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 bg-[#101922] shrink-0">
                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGuest?.name || 'guest'}`} alt="" fill unoptimized />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-base leading-tight tracking-tight truncate">{selectedGuest?.name || 'Guest'}</p>
                                {selectedGuest?.isVIP ? (
                                    <p className="text-[10px] text-[#4A9EFF] font-bold uppercase tracking-widest flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> VIP RETURN
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{selectedGuest?.phone || selectedGuest?.email || 'Guest Details'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Scrollable Body Content (Scrolls internally if tall) */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2 custom-scrollbar">
                        {/* STAY DATES */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">STAY DATES</p>
                            <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 text-xs">
                                <div>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Check-in</p>
                                    <p className="text-sm text-white font-bold">{
                                        bookingDetails.checkIn ?
                                        new Date(bookingDetails.checkIn + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                                        'Not Selected'
                                    }</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shrink-0">
                                    <Clock className="w-5 h-5 text-[#4A9EFF]" />
                                </div>
                                <div>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-right">Duration</p>
                                    <p className="text-sm text-white font-bold text-right">{stayDuration} Night{stayDuration > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>

                        {/* SELECTED ROOMS */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">SELECTED ROOMS ({selectedRooms.length})</p>
                                <Plus className="w-3.5 h-3.5 text-[#4A9EFF]" />
                            </div>
                            {selectedRooms.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedRooms.map(room => {
                                        const currentNightlyRate = room.customPrice ?? room.basePrice
                                        const currentRoomTotal = currentNightlyRate * stayDuration
                                        return (
                                            <div key={room.id} className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-2 relative group overflow-hidden shadow-inner">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-10 relative rounded-lg overflow-hidden border border-white/5 shrink-0">
                                                        <Image 
                                                            src={room.images?.[0] || (room.type?.includes('Suite')
                                                                ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"
                                                                : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                            )} 
                                                            alt="" fill className="object-cover" unoptimized 
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold tracking-tight leading-none text-sm mb-1 truncate">Room {room.roomNumber}</p>
                                                        <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">{room.type}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-black text-sm tracking-tight">₹{currentRoomTotal.toLocaleString('en-IN')}</p>
                                                        <button 
                                                            onClick={() => setSelectedRooms(selectedRooms.filter(r => r.id !== room.id))}
                                                            className="text-[8px] text-rose-500 font-bold uppercase hover:underline block ml-auto mt-0.5"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                                                    <span className="text-gray-400 font-bold flex items-center gap-1">
                                                        <Edit2 className="w-3 h-3 text-[#4A9EFF]" /> Nightly Rate:
                                                    </span>
                                                    <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-lg px-2 py-0.5 focus-within:border-[#4A9EFF] transition-all">
                                                        <span className="text-[#4A9EFF] font-bold">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={currentNightlyRate}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                                setSelectedRooms(selectedRooms.map(r => r.id === room.id ? { ...r, customPrice: val } : r))
                                                            }}
                                                            className="w-20 bg-transparent text-right font-mono font-bold text-white outline-none text-xs"
                                                        />
                                                        <span className="text-gray-500 font-bold text-[9px]">/nt</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <button 
                                        onClick={() => {
                                            const el = document.getElementById('available-rooms-section')
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                        }}
                                        className="w-full py-3 border border-dashed border-white/10 hover:border-[#4A9EFF]/50 rounded-xl text-[10px] font-bold text-[#4A9EFF] uppercase tracking-[0.15em] hover:bg-[#4A9EFF]/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Another Room</span>
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => {
                                        const el = document.getElementById('available-rooms-section')
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }}
                                    className="w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-white/5 rounded-2xl text-gray-400 hover:text-white hover:border-[#4A9EFF]/50 transition-all font-bold text-[13px] uppercase tracking-widest bg-white/[0.01]"
                                >
                                    <Plus className="w-5 h-5 text-[#4A9EFF]" /> Select a Room
                                </button>
                            )}
                        </div>

                        {/* MEAL PLAN */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">MEAL PLAN (EP / CP / MAP / AP)</p>
                                {mealPlanTotal > 0 && (
                                    <span className="text-[10px] font-bold text-[#4A9EFF]">+₹{mealPlanTotal.toLocaleString('en-IN')}</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { type: 'EP', label: 'EP', sub: 'Room Only', defaultPrice: 0 },
                                    { type: 'CP', label: 'CP', sub: 'Breakfast Included', defaultPrice: mealPlans.find(m => m.type === 'CP')?.pricePerDay ?? 500 },
                                    { type: 'MAP', label: 'MAP', sub: 'Bfst + Dinner', defaultPrice: mealPlans.find(m => m.type === 'MAP')?.pricePerDay ?? 1200 },
                                    { type: 'AP', label: 'AP', sub: 'All 3 Meals', defaultPrice: mealPlans.find(m => m.type === 'AP')?.pricePerDay ?? 1800 },
                                ].map(plan => {
                                    const isSel = selectedMealPlan === plan.type
                                    const currentRate = customMealPlanRates[plan.type] ?? plan.defaultPrice
                                    return (
                                        <button
                                            key={plan.type}
                                            type="button"
                                            onClick={() => setSelectedMealPlan(plan.type)}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all relative overflow-hidden",
                                                isSel
                                                    ? "bg-[#4A9EFF]/15 border-[#4A9EFF] text-white shadow-lg shadow-[#4A9EFF]/10"
                                                    : "bg-black/30 border-white/5 text-gray-400 hover:border-white/10"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-white">{plan.label}</span>
                                                <span className="text-[10px] font-mono text-[#4A9EFF]">
                                                    {currentRate > 0 ? `+₹${currentRate}/d` : 'Free'}
                                                </span>
                                            </div>
                                            <p className="text-[9px] text-gray-500 font-medium truncate mt-0.5">{plan.sub}</p>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedMealPlan !== 'EP' && (
                                <div className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1.5 mt-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold flex items-center gap-1">
                                            <Edit2 className="w-3 h-3 text-[#4A9EFF]" /> {selectedMealPlan} Rate per guest / day:
                                        </span>
                                        <div className="flex items-center gap-1 bg-black/80 border border-white/15 rounded-lg px-2 py-0.5">
                                            <span className="text-[#4A9EFF] font-bold">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={activeMealPlanRate}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                    setCustomMealPlanRates(prev => ({ ...prev, [selectedMealPlan]: val }))
                                                }}
                                                className="w-16 bg-transparent text-right font-mono font-bold text-white outline-none text-xs"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-500 italic">Total: ₹{activeMealPlanRate} × {stayDuration} night(s) × {bookingDetails.guests || 1} guest(s)</p>
                                </div>
                            )}
                        </div>

                        {/* EXTRA REQUESTS & ADD-ONS (EXTRA BED, MATTRESS, ETC.) */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">EXTRA REQUESTS & ADD-ONS</p>
                                {extraAddonsTotal > 0 && (
                                    <span className="text-[10px] font-bold text-[#4A9EFF]">+₹{extraAddonsTotal.toLocaleString('en-IN')}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {extraAddons.map((item, idx) => (
                                    <div key={item.id || idx} className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                            <div className="flex items-center gap-1 mt-1 text-[10px]">
                                                <span className="text-gray-500">Rate: ₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.price}
                                                    onChange={(e) => {
                                                        const p = Math.max(0, parseFloat(e.target.value) || 0)
                                                        setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, price: p } : a))
                                                    }}
                                                    className="w-14 bg-black/60 border border-white/10 rounded px-1 text-right font-mono text-white text-[10px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-lg p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, qty: Math.max(0, a.qty - 1) } : a))}
                                                    className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center"
                                                >
                                                    -
                                                </button>
                                                <span className="text-xs font-bold text-white w-4 text-center">{item.qty}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, qty: a.qty + 1 } : a))}
                                                    className="w-5 h-5 rounded bg-[#4A9EFF]/20 text-[#4A9EFF] hover:bg-[#4A9EFF]/30 font-bold text-xs flex items-center justify-center"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Add-on Input */}
                                <div className="p-3 bg-black/20 border border-dashed border-white/10 rounded-xl space-y-2">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Add Custom Extra Request</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. Baby Cot, Airport Taxi"
                                            value={customAddonName}
                                            onChange={(e) => setCustomAddonName(e.target.value)}
                                            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="₹ Rate"
                                            value={customAddonPrice}
                                            onChange={(e) => setCustomAddonPrice(e.target.value)}
                                            className="w-16 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!customAddonName) return toast.error("Enter item name")
                                                const p = parseFloat(customAddonPrice) || 0
                                                setExtraAddons(prev => [...prev, { id: `custom_${Date.now()}`, name: customAddonName, price: p, qty: 1 }])
                                                setCustomAddonName('')
                                                setCustomAddonPrice('')
                                            }}
                                            className="px-2.5 py-1 bg-[#4A9EFF] text-white font-bold text-xs rounded-lg hover:bg-[#3A8EEF]"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SPECIAL REQUESTS */}
                        <div className="space-y-3 pt-3 border-t border-white/5">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">SPECIAL REQUESTS / NOTES</p>
                            <textarea
                                value={bookingDetails.specialRequests}
                                onChange={(e) => setBookingDetails({ ...bookingDetails, specialRequests: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-bold text-gray-300 min-h-[80px] resize-none outline-none focus:border-[#4A9EFF] shadow-inner"
                                placeholder="Add guest preferences or allergies..."
                            />
                        </div>

                        {/* FINANCIAL BREAKDOWN */}
                        <div className="space-y-2 pt-3 border-t border-white/5 text-xs font-semibold">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>Room Charges ({stayDuration} nt)</span>
                                <span className="text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            {mealPlanTotal > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Meal Plan ({selectedMealPlan})</span>
                                    <span className="text-[#4A9EFF]">+₹{mealPlanTotal.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {extraAddonsTotal > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Extra Add-ons</span>
                                    <span className="text-[#4A9EFF]">+₹{extraAddonsTotal.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {gstAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>GST ({pricingSettings.gstPercent}%)</span>
                                    <span className="text-white">+₹{gstAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {serviceChargeAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Service Charge ({pricingSettings.serviceChargePercent}%)</span>
                                    <span className="text-white">+₹{serviceChargeAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {luxuryTaxAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Luxury Tax ({pricingSettings.luxuryTaxPercent}%)</span>
                                    <span className="text-white">+₹{luxuryTaxAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {discountAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>{pricingSettings.discountLabel} ({pricingSettings.defaultDiscountPercent}%)</span>
                                    <span className="text-emerald-400">-₹{discountAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Footer Action Section (Pinned to bottom of card, ALWAYS visible on screen) */}
                    <div className="pt-4 border-t border-white/10 shrink-0 bg-[#0d151c]/90 backdrop-blur-md space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-white tracking-tight uppercase">Total</span>
                            <span className="text-2xl font-black text-[#4A9EFF] tracking-tight leading-none">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <button
                            className="w-full h-14 bg-[#4A9EFF] hover:bg-[#3A8EEF] disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-50 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#4A9EFF]/20 active:scale-95 cursor-pointer"
                            onClick={() => setCurrentStep(2)}
                            disabled={selectedRooms.length === 0}
                        >
                            <span>Review & Finalize</span>
                            <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderConfirmStep = () => (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-12 animate-in fade-in slide-in-from-right-12 duration-700 pb-32">
            <div className="space-y-12">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">Review & Confirm</h1>
                    <p className="text-gray-400 text-base font-medium leading-relaxed">Please verify all reservation details before securing the room.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {/* GUEST SECTION */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4A9EFF]/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shadow-lg shadow-[#4A9EFF]/10">
                                <User className="w-6 h-6 text-[#4A9EFF]" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Guest Information</h3>
                            <button onClick={() => setCurrentStep(0)} className="ml-auto text-xs font-bold text-[#4A9EFF] hover:brightness-125 transition-all uppercase tracking-widest flex items-center gap-2 group/btn">Edit <Edit2 className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" /></button>
                        </div>
                        <div className="flex items-center gap-14 relative z-10">
                            <div className="relative w-32 h-32 rounded-[2.5rem] overflow-hidden border-[6px] border-[#101922] ring-2 ring-white/10 shadow-2xl">
                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGuest?.name || 'guest'}`} alt="" fill unoptimized />
                            </div>
                            <div className="grid grid-cols-2 gap-x-24 gap-y-10 flex-1">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">FULL NAME</p>
                                    <p className="text-xl font-bold text-white tracking-tight leading-none">{selectedGuest?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    {selectedGuest?.isVIP ? (
                                        <span className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 text-[10px] font-bold px-4 py-2 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-500/5">
                                            <Star className="w-4 h-4 fill-amber-500" /> VIP MEMBER
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 text-[10px] font-bold px-4 py-2 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
                                            STANDARD GUEST
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">CONTACT EMAIL</p>
                                    <p className="text-gray-400 font-bold text-lg tracking-tight underline decoration-[#4A9EFF]/40 underline-offset-4">{selectedGuest?.email || 'No Email'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">CONTACT PHONE</p>
                                    <p className="text-gray-400 font-bold text-lg tracking-tight">{selectedGuest?.phone || 'No Phone'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STAY SECTION */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 relative shadow-2xl">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shadow-lg shadow-[#4A9EFF]/10">
                                <Calendar className="w-6 h-6 text-[#4A9EFF]" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Stay Details</h3>
                            <button onClick={() => setCurrentStep(1)} className="ml-auto text-xs font-bold text-[#4A9EFF] hover:brightness-125 transition-all uppercase tracking-widest flex items-center gap-2 group/btn">Modify <Edit2 className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" /></button>
                        </div>

                        <div className="grid grid-cols-[340px,1fr] gap-16">
                            <div className="space-y-14 relative py-4 pl-14">
                                <div className="absolute left-4 top-2 bottom-2 w-px border-l-2 border-dashed border-white/10" />
                                <div className="relative">
                                    <div className="absolute -left-[54px] top-1 w-10 h-10 rounded-2xl bg-[#4A9EFF] flex items-center justify-center shadow-2xl shadow-[#4A9EFF]/40 ring-4 ring-[#4A9EFF]/10">
                                        <ArrowRight className="w-5 h-5 text-white stroke-[3.5px]" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">CHECK-IN DATE</p>
                                    <p className="text-xl font-bold text-white tracking-tight">{new Date(bookingDetails.checkIn).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[54px] top-1 w-10 h-10 rounded-2xl bg-[#101922] border-2 border-white/10 flex items-center justify-center shadow-lg">
                                        <ArrowLeft className="w-5 h-5 text-gray-600 stroke-[3.5px] rotate-180" />
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">CHECK-OUT DATE</p>
                                    <p className="text-xl font-bold text-white tracking-tight">{new Date(bookingDetails.checkOut).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="inline-flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full text-xs font-bold text-gray-500 border border-white/5 shadow-inner">
                                    <Clock className="w-5 h-5 text-[#4A9EFF]" /> {stayDuration} NIGHTS STAY
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedRooms.map((room, idx) => (
                                    <div key={room.id} className="bg-black/40 rounded-xl p-5 border border-white/10 flex items-center gap-6 group relative shadow-inner">
                                        <div className="w-32 h-20 relative rounded-lg overflow-hidden border border-white/10 shrink-0">
                                            <Image 
                                                src={room.images?.[0] || (room.type?.includes('Suite')
                                                    ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"
                                                    : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                )} 
                                                alt="" fill className="object-cover group-hover:scale-110 transition-transform duration-1000" unoptimized 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-base font-bold text-white tracking-tight mb-1">Room {room.roomNumber}</h4>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{room.type}</p>
                                        </div>
                                        <div className="text-right pl-6 border-l border-white/5 space-y-1">
                                            <p className="text-white font-black text-base tracking-tight">₹{((room.customPrice ?? room.basePrice) * stayDuration).toLocaleString('en-IN')}</p>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-gray-500 text-[9px] font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.customPrice ?? room.basePrice}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                        setSelectedRooms(selectedRooms.map(r => r.id === room.id ? { ...r, customPrice: val } : r))
                                                    }}
                                                    className="w-20 bg-black/60 border border-white/10 rounded-lg px-2 py-0.5 text-right font-mono font-bold text-white outline-none text-xs focus:border-[#4A9EFF]"
                                                />
                                                <span className="text-gray-500 text-[8px] font-bold uppercase">× {stayDuration} NT</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FINAL ADMIN SETTINGS */}
            <div className="space-y-8">
                <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 space-y-12 sticky top-24 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#4A9EFF]/10 flex items-center justify-center border border-[#4A9EFF]/20 shadow-lg shadow-[#4A9EFF]/10">
                            <Save className="w-6 h-6 text-[#4A9EFF]" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight leading-none">Management</h3>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest ml-2">Booking Source</label>
                            <div className="relative">
                                <select
                                    value={bookingDetails.source}
                                    onChange={e => setBookingDetails({ ...bookingDetails, source: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-[1.5rem] px-6 py-5 text-white font-bold outline-none focus:border-[#4A9EFF] transition-all cursor-pointer text-base shadow-2xl hover:border-white/20"
                                >
                                    <option value="WALK_IN" className="bg-[#101922]">Hotel Walk-in</option>
                                    <option value="DIRECT" className="bg-[#101922]">Direct Call Reservation</option>
                                    <option value="BOOKING_COM" className="bg-[#101922]">Booking.com Official</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest ml-2">Reservation Status</label>
                            <div className="relative">
                                <select
                                    value={bookingDetails.status}
                                    onChange={e => setBookingDetails({ ...bookingDetails, status: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-[1.5rem] px-6 py-5 text-white font-bold outline-none focus:border-[#4A9EFF] transition-all cursor-pointer text-base shadow-2xl hover:border-white/20"
                                >
                                    <option value="RESERVED" className="bg-[#101922]">Confirmed Reservation</option>
                                    <option value="PENDING" className="bg-[#101922]">Draft / Tentative</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest ml-2">Staff Remarks</label>
                            <textarea
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-[13px] font-bold text-gray-300 min-h-[160px] resize-none outline-none focus:border-[#4A9EFF] shadow-inner leading-relaxed"
                                placeholder="E.g., Special breakfast requirements for guests..."
                                value={bookingDetails.notes}
                                onChange={e => setBookingDetails({ ...bookingDetails, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-12 border-t border-white/10 space-y-8">
                        <div className="flex flex-col gap-3">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">TOTAL AMOUNT SECURED</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white tracking-tight leading-none">₹{grandTotal.toLocaleString()}.00</span>
                                <span className="text-sm font-bold text-slate-600">INR</span>
                            </div>
                            <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> All taxes & service fees included</p>
                        </div>

                        <button
                            className="w-full h-16 bg-[#4A9EFF] hover:bg-[#3A8EEF] rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-4 transition-all shadow-xl shadow-[#4A9EFF]/20 active:scale-95 group/submit"
                            onClick={handleFinalSubmit}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Secured Booking <ArrowRight className="w-6 h-6 stroke-[2.5px] group-hover/submit:translate-x-1 transition-transform" /></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (status === 'loading') {
        return (
            <div className="fixed inset-0 bg-[#101922] flex items-center justify-center z-[200]">
                <div className="flex flex-col items-center gap-8">
                    <div className="relative">
                        <div className="w-16 h-16 border-8 border-[#4A9EFF]/10 border-t-[#4A9EFF] rounded-full animate-spin shadow-2xl" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <User className="w-8 h-8 text-[#4A9EFF] animate-pulse" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[1em] text-[#4A9EFF] animate-pulse ml-[1em]">Establishing Session</p>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Zenbourg Intelligence Cloud</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="text-gray-400 font-sans selection:bg-[#4A9EFF]/30 selection:text-white">

            <div className="max-w-[1700px] mx-auto pt-4 pb-32">
                {currentStep === 0 && renderGuestStep()}
                {currentStep === 1 && renderRoomStep()}
                {currentStep === 2 && renderConfirmStep()}
                {(fetching || loading) && (
                    <div className="fixed inset-0 bg-[#101922]/80 flex items-center justify-center z-[200]">
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative">
                                <div className="w-16 h-16 border-8 border-[#4A9EFF]/10 border-t-[#4A9EFF] rounded-full animate-spin shadow-2xl" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Building2 className="w-8 h-8 text-[#4A9EFF] animate-pulse" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-[11px] font-bold uppercase tracking-[1em] text-[#4A9EFF] animate-pulse ml-[1em]">Establishing Sync</p>
                                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Zenbourg Intelligence Cloud</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Sticky Bottom Action Bar so user never has to scroll all the way down to submit/proceed */}
            {currentStep === 1 && selectedRooms.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 bg-[#0d151c]/95 border-t border-white/10 backdrop-blur-xl px-8 py-4 z-[90] flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Rooms ({selectedRooms.length})</p>
                            <p className="text-sm font-bold text-white truncate max-w-xs">
                                {selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ')}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden sm:block" />
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount</p>
                            <p className="text-lg font-black text-[#4A9EFF]">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const el = document.getElementById('available-rooms-section')
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="hidden md:flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10"
                        >
                            <Plus className="w-4 h-4 text-[#4A9EFF]" /> Add Room
                        </button>
                        <button
                            onClick={() => setCurrentStep(2)}
                            className="px-6 py-3.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#4A9EFF]/20 active:scale-95 flex items-center gap-2"
                        >
                            <span>Review & Finalize (₹{grandTotal.toLocaleString('en-IN')})</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    </div>
                </div>
            )}

            {currentStep === 2 && selectedRooms.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 bg-[#0d151c]/95 border-t border-white/10 backdrop-blur-xl px-8 py-4 z-[90] flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Guest & Reservation</p>
                            <p className="text-sm font-bold text-white truncate max-w-xs">{selectedGuest?.name} ({selectedRooms.length} Room{selectedRooms.length > 1 ? 's' : ''})</p>
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden sm:block" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount Secured</p>
                            <p className="text-lg font-black text-white">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleFinalSubmit}
                        disabled={loading}
                        className="px-8 py-3.5 bg-[#4A9EFF] hover:bg-[#3A8EEF] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#4A9EFF]/20 active:scale-95 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Secure Reservation</span> <ArrowRight className="w-4 h-4 stroke-[2.5]" /></>}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function NewBookingPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px] text-gray-500 animate-pulse font-medium">
                Loading booking form...
            </div>
        }>
            <NewBookingContent />
        </Suspense>
    )
}

