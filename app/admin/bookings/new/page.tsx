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
import { cn, validateGSTIN, getApiErrorMessage } from '@/lib/utils'
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
        } })
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
    const [newGuestData, setNewGuestData] = useState({ name: '', email: '', phone: '', address: '', dateOfBirth: '', gstNumber: '', city: '', state: '', country: '', pinCode: '' })

    const handlePinChange = async (val: string) => {
        setNewGuestData(prev => ({ ...prev, pinCode: val }))
        if (val.length === 6 && /^\d+$/.test(val)) {
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${val}`)
                const data = await res.json()
                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffice = data[0].PostOffice[0]
                    setNewGuestData(prev => ({
                        ...prev,
                        city: postOffice.District || postOffice.Region || prev.city,
                        state: postOffice.State || prev.state,
                        country: postOffice.Country || 'India',
                        pinCode: val
                    }))
                }
            } catch (err) {
                console.error("Failed to fetch pincode details", err)
            }
        }
    }

    // Booking Details
    const [bookingDetails, setBookingDetails] = useState({
        checkIn: toLocalDateStr(new Date()),
        checkOut: toLocalDateStr(new Date(Date.now() + 86400000)), // Default 1 night
        guests: 2,
        kids: 0,
        source: 'DIRECT',
        status: 'RESERVED',
        notes: '',
        specialRequests: '',
        marketSegment: 'LEISURE',
        billTo: 'GUEST',
        taxExempt: false,
        isComplimentary: false,
        discountAmount: 0
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
                <div className="flex items-center justify-between text-text-primary font-bold px-2 text-xl tracking-tight">
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
                                    "h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:bg-surface-light border border-transparent text-sm font-bold",
                                    isCheckIn || isCheckOut ? "bg-[#4A9EFF] text-text-primary shadow-lg" :
                                        isInRange ? "bg-[#4A9EFF]/20 text-[#4A9EFF]" : "text-text-tertiary"
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
        discountLabel: 'Discount' })

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

    const actualSubtotal = bookingDetails.isComplimentary ? 0 : subtotal
    const gstAmount = bookingDetails.taxExempt ? 0 : Math.round(actualSubtotal * pricingSettings.gstPercent / 100 * 100) / 100
    const serviceChargeAmount = Math.round(actualSubtotal * pricingSettings.serviceChargePercent / 100 * 100) / 100
    const luxuryTaxAmount = bookingDetails.taxExempt ? 0 : Math.round(actualSubtotal * pricingSettings.luxuryTaxPercent / 100 * 100) / 100
    const totalBeforeDiscount = actualSubtotal + gstAmount + serviceChargeAmount + luxuryTaxAmount
    
    // Default discount from property settings
    const baseDiscount = Math.round(totalBeforeDiscount * pricingSettings.defaultDiscountPercent / 100 * 100) / 100
    
    // Ad-hoc discount from booking details
    const adHocDiscount = bookingDetails.discountAmount || 0
    
    const finalDiscount = baseDiscount + adHocDiscount
    
    // Meal plans and addons aren't free unless specifically coded, let's keep them added
    const grandTotal = Math.round((totalBeforeDiscount - finalDiscount + mealPlanTotal + extraAddonsTotal) * 100) / 100

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
            if (!res.ok) {
                const msg = await getApiErrorMessage(res, 'Failed to create guest')
                throw new Error(msg)
            }
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
                status: null }
            setAllGuests([normalizedGuest, ...allGuests])
            setSelectedGuest(normalizedGuest)
            setShowNewGuestModal(false)
            setNewGuestData({ name: '', email: '', phone: '', address: '', dateOfBirth: '', gstNumber: '', city: '', state: '', country: '', pinCode: '' })
            toast.success("Guest created successfully")
        } catch (err: any) {
            toast.error(err?.message || "Failed to create guest")
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
                        totalAmount: bookingDetails.isComplimentary ? 0 : room.basePrice * stayDuration, // base; API applies taxes
                        source: bookingDetails.source,
                        marketSegment: bookingDetails.marketSegment,
                        billTo: bookingDetails.billTo,
                        taxExempt: bookingDetails.taxExempt,
                        isComplimentary: bookingDetails.isComplimentary,
                        discountAmount: bookingDetails.discountAmount,
                        notes: bookingDetails.notes,
                        specialRequests: bookingDetails.specialRequests,
                        mealPlan: selectedMealPlan,
                        mealPlanPricePerDay: activeMealPlanRate,
                        extraAddons: extraAddons.filter(a => (a.qty > 0 || a.price > 0) && a.name),
                        extraAddonsAmount: extraAddonsTotal })
                })
            ))

            const failed = results.find(r => !r.ok)
            if (failed) {
                const msg = await getApiErrorMessage(failed, 'One or more bookings failed')
                throw new Error(msg)
            }
            toast.success("Reservation Secured Successfully!")
            router.push('/admin/bookings')
            router.refresh()
        } catch (err: any) {
            toast.error(err?.message || "Cloud sync failed")
        } finally {
            setLoading(false)
        }
    }

    // --- RENDERS ---

    const renderGuestStep = () => (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary font-bold uppercase tracking-widest">
                        <span>Bookings</span>
                        <ChevronRight className="w-3 h-3 text-gray-700" />
                        <span className="text-text-secondary">New Reservation</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">Who is this booking for?</h1>
                    <p className="text-text-secondary text-base font-medium leading-relaxed">Search for an existing guest profile or add a new one to start the reservation.</p>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-bold text-[#4A9EFF] uppercase tracking-[0.15em]">Step 1: Select Guest</h3>
                            <span className="text-[11px] text-text-tertiary font-bold uppercase tracking-widest">Next: Select Dates</span>
                        </div>
                        <div className="w-full h-[6px] bg-surface-light rounded-full overflow-hidden">
                            <div className="w-[140px] h-full bg-[#4A9EFF] rounded-full shadow-[0_0_20px_rgba(74,158,255,0.6)]" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                            <input
                                type="text"
                                placeholder="Search by name, email or phone..."
                                className="w-full bg-surface-light border border-border/50 rounded-xl py-4 pl-14 pr-12 text-text-primary text-base placeholder:text-gray-600 outline-none focus:border-[#4A9EFF]/50 transition-all font-semibold"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowNewGuestModal(true)}
                            className="flex items-center gap-3 px-8 bg-surface-light border border-border/50 rounded-xl hover:bg-white/[0.06] text-text-primary font-bold transition-all text-sm"
                        >
                            <UserPlus className="w-5 h-5 text-text-secondary" /> Create New Guest
                        </button>
                    </div>

                    <div className="space-y-6 pt-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-text-primary tracking-tight">Search Results</h3>
                            <span className="bg-surface-light text-text-secondary text-[10px] font-bold px-3 py-1 rounded-lg border border-border uppercase tracking-widest">{filteredGuests.length} matches</span>
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
                                            : "bg-surface-light border-border hover:bg-surface-light hover:border-border/50"
                                    )}
                                >
                                    <div className="flex items-center gap-5">
                                        <Avatar name={guest.name} size="lg" className="border-2 border-border/50" />
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-base font-bold text-text-primary tracking-tight">{guest.name}</h4>
                                                {guest.isVIP && <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-amber-500/20 tracking-widest">VIP</span>}
                                                {guest.isBlacklisted && <span className="bg-rose-500/10 text-rose-500 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-rose-500/20 tracking-widest">BLACKLISTED</span>}
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="flex items-center gap-2 text-xs text-text-tertiary font-bold">
                                                    <Mail className="w-3.5 h-3.5 text-gray-700" /> {guest.email}
                                                </span>
                                                <span className="flex items-center gap-2 text-xs text-text-tertiary font-bold">
                                                    <Smartphone className="w-3.5 h-3.5 text-gray-700" /> {guest.phone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Last Visit</p>
                                            <p className="text-text-secondary font-bold text-[15px]">{guest.lastVisit}</p>
                                        </div>
                                        <div className={cn(
                                            "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                                            selectedGuest?.id === guest.id ? "bg-[#4A9EFF] border-[#4A9EFF] shadow-lg shadow-[#4A9EFF]/40" : "border-border/50 bg-transparent group-hover:border-border"
                                        )}>
                                            {selectedGuest?.id === guest.id && <Check className="w-4 h-4 text-text-primary stroke-[3.5px]" />}
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
                <div className="overflow-hidden bg-surface-light border border-border/50 shadow-2xl relative rounded-[2.5rem]">
                    <div className="h-32 bg-[#4A9EFF]" />
                    <div className="relative -mt-12 px-8 pb-10 text-left">
                        <Avatar name={selectedGuest?.name} size="xl" className="border-[6px] border-[#101922] bg-surface shadow-2xl" />

                        <div className="mt-8 space-y-1">
                            {selectedGuest ? (
                                <>
                                    <h2 className="text-xl font-bold text-text-primary tracking-tight">{selectedGuest.name}</h2>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Guest ID: #{selectedGuest.id?.slice(-6).toUpperCase()}</p>

                                    <div className="grid grid-cols-2 gap-4 mt-8">
                                        <div className="p-4 bg-black/20 rounded-2xl border border-border">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">TOTAL STAYS</p>
                                            <p className="text-xl font-bold text-text-primary">{selectedGuest?.bookings?.length || 0}</p>
                                        </div>
                                        <div className="p-4 bg-black/20 rounded-2xl border border-border">
                                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">AVG SPEND</p>
                                            <p className="text-xl font-bold text-text-primary tracking-tight">₹{Math.round((selectedGuest?.bookings?.reduce((acc: any, b: any) => acc + b.totalAmount, 0) || 0) / (selectedGuest?.bookings?.length || 1))}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mt-10">
                                        <div className="flex items-center gap-5 text-text-secondary font-bold text-[15px]">
                                            <div className="w-10 h-10 rounded-2xl bg-surface-light flex items-center justify-center border border-border shadow-md">
                                                <MapPin className="w-5 h-5 text-gray-600" />
                                            </div>
                                            {selectedGuest?.address || 'Address Not Provided'}
                                        </div>
                                        <div className="flex items-center gap-5 text-text-secondary font-bold text-[15px]">
                                            <div className="w-10 h-10 rounded-2xl bg-surface-light flex items-center justify-center border border-border shadow-md">
                                                <Calendar className="w-5 h-5 text-gray-600" />
                                            </div>
                                            {selectedGuest?.dateOfBirth ? new Date(selectedGuest.dateOfBirth).toLocaleDateString() : 'DOB Unknown'}
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-10 border-t border-border">
                                        {selectedGuest?.notes ? (
                                            <p className="text-[13px] text-text-tertiary leading-relaxed font-bold">
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
                        className="w-full h-16 bg-[#4A9EFF] hover:bg-surface disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-50 rounded-2xl text-text-primary font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#4A9EFF]/20 active:scale-95"
                        disabled={!selectedGuest}
                        onClick={() => setCurrentStep(1)}
                    >
                        Continue to Dates <ArrowRight className="w-5 h-5 stroke-[2.5px]" />
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="w-full text-center text-sm font-bold text-text-tertiary hover:text-text-primary transition-colors py-2 uppercase tracking-widest"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>

            {/* NEW GUEST MODAL */}
            {showNewGuestModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-surface border border-border/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-surface-light">
                            <div>
                                <h2 className="text-lg font-bold text-text-primary tracking-tight">Create New Guest Profile</h2>
                                <p className="text-xs text-text-tertiary mt-1">Fill out the guest&apos;s details to store in the hotel PMS.</p>
                            </div>
                            <button onClick={() => setShowNewGuestModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-text-tertiary hover:text-text-primary transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        
                        {/* Body (Scrollable) */}
                        <form onSubmit={handleCreateGuest} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-border/50 pb-2">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">Full Name <span className="text-rose-500">*</span></label>
                                            <input
                                                autoFocus
                                                required
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all"
                                                placeholder="e.g. Jane Smith"
                                                value={newGuestData.name}
                                                onChange={e => setNewGuestData({ ...newGuestData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">Phone Number <span className="text-rose-500">*</span></label>
                                            <input
                                                required
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all"
                                                placeholder="+1 (555) 000-0000"
                                                value={newGuestData.phone}
                                                onChange={e => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">E-mail Address</label>
                                            <input
                                                type="email"
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all"
                                                placeholder="jane@example.com"
                                                value={newGuestData.email}
                                                onChange={e => setNewGuestData({ ...newGuestData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">Date of Birth</label>
                                            <input
                                                type="date"
                                                style={{ colorScheme: 'dark' }}
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all"
                                                value={newGuestData.dateOfBirth}
                                                onChange={e => setNewGuestData({ ...newGuestData, dateOfBirth: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Address & Location */}
                                <div className="space-y-4">
                                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-border/50 pb-2">Address & Location</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary">Street Address</label>
                                        <input
                                            className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all"
                                            placeholder="123 Luxury Ave, Apt 4B"
                                            value={newGuestData.address}
                                            onChange={e => setNewGuestData({ ...newGuestData, address: e.target.value })}
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">PIN / Zip Code</label>
                                            <input
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all placeholder:text-gray-600"
                                                placeholder="e.g. 110001"
                                                value={newGuestData.pinCode}
                                                onChange={e => handlePinChange(e.target.value)}
                                                maxLength={10}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">Country</label>
                                            <input
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all placeholder:text-gray-600"
                                                placeholder="Country"
                                                value={newGuestData.country}
                                                onChange={e => setNewGuestData({ ...newGuestData, country: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">City</label>
                                            <input
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all placeholder:text-gray-600"
                                                placeholder="City"
                                                value={newGuestData.city}
                                                onChange={e => setNewGuestData({ ...newGuestData, city: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-text-secondary">State</label>
                                            <input
                                                className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary text-sm font-medium outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all placeholder:text-gray-600"
                                                placeholder="State"
                                                value={newGuestData.state}
                                                onChange={e => setNewGuestData({ ...newGuestData, state: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Billing */}
                                <div className="space-y-4 pb-4">
                                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest border-b border-border/50 pb-2">Billing Details</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-secondary">GSTIN <span className="text-[10px] text-gray-500 font-normal ml-1">(Optional for B2B Tax Invoice)</span></label>
                                        <input
                                            className="w-full bg-black/40 border border-border/50 rounded-lg px-4 py-2.5 text-text-primary font-mono text-sm uppercase outline-none focus:border-[#4A9EFF] focus:ring-1 focus:ring-[#4A9EFF]/50 transition-all placeholder:text-gray-600"
                                            placeholder="e.g. 27ABCDE1234F1ZH"
                                            value={newGuestData.gstNumber}
                                            onChange={e => setNewGuestData({ ...newGuestData, gstNumber: e.target.value.toUpperCase() })}
                                        />
                                        {(() => {
                                            if (!newGuestData.gstNumber) return null
                                            const v = validateGSTIN(newGuestData.gstNumber)
                                            return (
                                                <div className={cn("text-[11px] font-medium flex items-center gap-1.5 mt-2 px-3 py-2 rounded border", v.isValid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")}>
                                                    {v.isValid ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                                    <span>{v.message}</span>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-border/50 bg-surface-light flex items-center justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowNewGuestModal(false)}
                                    className="px-5 py-2.5 rounded-lg border border-border/50 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all text-sm font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-[#4A9EFF] hover:bg-blue-500 rounded-lg text-text-primary font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    <span>Register Guest Profile</span>
                                </button>
                            </div>
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
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-tight">Select Dates & Room</h1>
                    <p className="text-text-secondary text-base font-medium leading-relaxed">Check availability and select the best room for the guest.</p>
                </div>

                {/* CALENDAR SECTION */}
                <div className="bg-surface-light border border-border/50 rounded-[2.5rem] p-10 shadow-2xl">
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
                                className="w-full bg-background border border-border/50 rounded-2xl py-4 pl-12 pr-10 text-text-primary font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-border"
                            >
                                <option value="All" className="bg-surface">Any Occupancy</option>
                                <option value="1 Adult, 0 Kids" className="bg-surface">1 Adult</option>
                                <option value="2 Adults, 0 Kids" className="bg-surface">2 Adults</option>
                                <option value="3 Adults, 0 Kids" className="bg-surface">3 Adults</option>
                                <option value="4 Adults, 0 Kids" className="bg-surface">4 Adults</option>
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
                                className="w-full bg-background border border-border/50 rounded-2xl py-4 pl-12 pr-10 text-text-primary font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-border"
                            >
                                <option value="All Rooms" className="bg-surface">All Types</option>
                                <option value="Deluxe Suite" className="bg-surface">Deluxe Suite</option>
                                <option value="King Royal" className="bg-surface">King Royal</option>
                                <option value="Standard Twin" className="bg-surface">Standard Twin</option>
                                <option value="Junior Suite" className="bg-surface">Junior Suite</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-widest ml-1">Attributes</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <select className="w-full bg-background border border-border/50 rounded-2xl py-4 pl-12 pr-10 text-text-primary font-bold outline-none focus:border-[#4A9EFF] cursor-pointer text-sm shadow-2xl transition-all hover:border-border">
                                <option className="bg-surface">Any Attribute</option>
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
                        <h3 className="text-lg font-bold text-text-primary tracking-tight">Available Rooms ({filteredRooms.length})</h3>
                        <div className="flex items-center gap-2 bg-surface-light border border-border/50 px-3 py-1.5 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
                            <span className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Live Availability</span>
                        </div>
                    </div>
                    
                    {fetching ? (
                        <div className="grid grid-cols-2 gap-6 opacity-50 grayscale transition-all duration-500">
                             {[1,2,3,4].map(i => (
                                <div key={i} className="aspect-[16/10] bg-surface-light rounded-2xl animate-pulse border border-border" />
                             ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                            "rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer relative select-none",
                                            isSelected 
                                                ? "bg-[#131F37] border-[#4A9EFF] shadow-[0_12px_32px_rgba(74,158,255,0.2)] ring-2 ring-[#4A9EFF]/40" 
                                                : "bg-[#0F172A] border-white/10 hover:border-[#4A9EFF]/40 hover:bg-[#152033] shadow-lg"
                                        )}
                                    >
                                        {/* 1. ROOM HERO IMAGE */}
                                        <div className="aspect-[16/10] relative w-full overflow-hidden bg-black/40">
                                            <Image 
                                                src={room.images?.[0] || (room.type?.includes('Suite') 
                                                    ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80" 
                                                    : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                )} 
                                                alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized 
                                            />
                                            
                                            {/* Top Badges */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                                                <span className="bg-black/60 backdrop-blur-md text-emerald-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-xl border border-emerald-500/30 flex items-center gap-1 shadow-lg">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Ready
                                                </span>
                                                <span className="bg-black/60 backdrop-blur-md text-gray-200 text-[10px] font-bold uppercase px-2.5 py-1 rounded-xl border border-white/10 shadow-lg">
                                                    {room.category || 'Standard'}
                                                </span>
                                            </div>

                                            {/* Circular Selection Checkbox (Top-Right) */}
                                            <div className="absolute top-3 right-3 z-10">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-xl",
                                                    isSelected 
                                                        ? "bg-[#4A9EFF] text-white scale-105 ring-2 ring-white/20" 
                                                        : "bg-black/40 backdrop-blur-md border border-white/20 text-transparent group-hover:border-white/50"
                                                )}>
                                                    <Check className={cn("w-4 h-4 stroke-[3]", isSelected ? "text-white" : "opacity-0")} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. ROOM BODY & SPECS (Cleanly structured below image) */}
                                        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                                            <div>
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <h4 className="text-xl font-black text-white tracking-tight">
                                                        Room {room.roomNumber}
                                                    </h4>
                                                    <span className="text-xs font-bold text-gray-400">
                                                        Floor {room.floor || 1}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-0.5 truncate">
                                                    {room.type}
                                                </p>
                                            </div>

                                            {/* Spec tags */}
                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                                    Sea View
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                                    King Bed
                                                </span>
                                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                                    Max {room.maxOccupancy || 2} Pax
                                                </span>
                                            </div>

                                            {/* Rate & Selection Footer */}
                                            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Nightly Rate</span>
                                                    <div className="flex items-baseline gap-1 mt-0.5">
                                                        <span className="text-xl font-black text-[#4A9EFF] tracking-tight">
                                                            ₹{room.basePrice.toLocaleString('en-IN')}
                                                        </span>
                                                        <span className="text-xs font-semibold text-gray-400">/ night</span>
                                                    </div>
                                                </div>

                                                <div className={cn(
                                                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                                    isSelected 
                                                        ? "bg-[#4A9EFF] text-white shadow-md shadow-blue-500/20" 
                                                        : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                                                )}>
                                                    {isSelected ? (
                                                        <>
                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                            <span>Selected</span>
                                                        </>
                                                    ) : (
                                                        <span>Select Room</span>
                                                    )}
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
                <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-5 sticky top-6 h-[calc(100vh-5.5rem)] flex flex-col shadow-2xl overflow-hidden">
                    {/* 1. Header (Fixed at top of card) */}
                    <div className="pb-3 border-b border-white/10 shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-white tracking-tight">Booking Summary</h3>
                            <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full uppercase tracking-wider">RES-9284</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[#131A29] rounded-2xl border border-white/10 shadow-inner">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0">
                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGuest?.name || 'guest'}`} alt="" fill unoptimized />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-sm leading-tight truncate">{selectedGuest?.name || 'Guest'}</p>
                                {selectedGuest?.isVIP ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold tracking-wider mt-0.5">
                                        <Star className="w-3 h-3 fill-amber-400" /> VIP Member
                                    </span>
                                ) : (
                                    <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{selectedGuest?.phone || selectedGuest?.email || 'Registered Guest'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Scrollable Body Content (Scrolls internally if tall) */}
                    <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-4 pr-1.5 custom-scrollbar">
                        {/* STAY DATES */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">STAY DATES</p>
                            <div className="flex items-center justify-between p-3 bg-[#131A29] rounded-2xl border border-white/10 text-xs">
                                <div>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Check-in</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{
                                        bookingDetails.checkIn ?
                                        new Date(bookingDetails.checkIn + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                                        'Not Selected'
                                    }</p>
                                </div>
                                <div className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center gap-1 shrink-0">
                                    <Clock className="w-3 h-3" />
                                    <span>{stayDuration} Night{stayDuration > 1 ? 's' : ''}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Check-out</p>
                                    <p className="text-xs font-bold text-white mt-0.5">{
                                        bookingDetails.checkOut ?
                                        new Date(bookingDetails.checkOut + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                                        'Not Selected'
                                    }</p>
                                </div>
                            </div>
                        </div>

                        {/* SELECTED ROOMS */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">SELECTED ROOMS ({selectedRooms.length})</p>
                                <span className="text-[10px] font-bold text-blue-400 font-mono">
                                    ₹{selectedRooms.reduce((acc, r) => acc + ((r.customPrice ?? r.basePrice) * stayDuration), 0).toLocaleString('en-IN')}
                                </span>
                            </div>
                            {selectedRooms.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedRooms.map(room => {
                                        const currentNightlyRate = room.customPrice ?? room.basePrice
                                        const currentRoomTotal = currentNightlyRate * stayDuration
                                        return (
                                            <div key={room.id} className="p-3 bg-[#131A29] rounded-2xl border border-white/10 space-y-2 shadow-inner">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-10 relative rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                                                        <Image 
                                                            src={room.images?.[0] || (room.type?.includes('Suite')
                                                                ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"
                                                                : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                            )} 
                                                            alt="" fill className="object-cover" unoptimized 
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-xs truncate">Room {room.roomNumber}</p>
                                                        <p className="text-gray-400 text-[10px] uppercase font-semibold truncate">{room.type}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-white font-bold font-mono text-xs">₹{currentRoomTotal.toLocaleString('en-IN')}</p>
                                                        <button 
                                                            onClick={() => setSelectedRooms(selectedRooms.filter(r => r.id !== room.id))}
                                                            className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
                                                    <span className="text-gray-400 font-semibold flex items-center gap-1">
                                                        <Edit2 className="w-2.5 h-2.5 text-blue-400" /> Rate/night:
                                                    </span>
                                                    <div className="flex items-center gap-1 bg-[#0F172A] border border-white/10 rounded-lg px-2 py-0.5 focus-within:border-blue-500 transition-colors">
                                                        <span className="text-blue-400 font-bold">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={currentNightlyRate}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                                setSelectedRooms(selectedRooms.map(r => r.id === room.id ? { ...r, customPrice: val } : r))
                                                            }}
                                                            className="w-16 bg-transparent text-right font-mono font-bold text-white outline-none text-[11px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 text-xs">
                                    No rooms selected yet
                                </div>
                            )}
                        </div>

                        {/* MEAL PLAN */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">MEAL PLAN</p>
                                {mealPlanTotal > 0 && (
                                    <span className="text-[10px] font-bold text-blue-400 font-mono">+₹{mealPlanTotal.toLocaleString('en-IN')}</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { type: 'EP', label: 'EP', sub: 'Room Only', defaultPrice: 0 },
                                    { type: 'CP', label: 'CP', sub: 'Breakfast', defaultPrice: mealPlans.find(m => m.type === 'CP')?.pricePerDay ?? 500 },
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
                                                "p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[56px]",
                                                isSel
                                                    ? "bg-blue-500/15 border-blue-500 text-white shadow-md shadow-blue-500/10"
                                                    : "bg-[#131A29] border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-1 w-full">
                                                <span className="font-bold text-xs text-white">{plan.label}</span>
                                                <span className="text-[10px] font-mono text-blue-400 font-bold shrink-0">
                                                    {currentRate > 0 ? `+₹${currentRate}` : 'Free'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium leading-tight mt-1">{plan.sub}</p>
                                        </button>
                                    )
                                })}
                            </div>

                            {selectedMealPlan !== 'EP' && (
                                <div className="p-3 bg-[#131A29] border border-white/10 rounded-xl space-y-1 mt-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-gray-300 font-semibold flex items-center gap-1">
                                            <Edit2 className="w-2.5 h-2.5 text-blue-400" /> {selectedMealPlan} Rate /guest /day:
                                        </span>
                                        <div className="flex items-center gap-1 bg-[#0F172A] border border-white/10 rounded-lg px-2 py-0.5">
                                            <span className="text-blue-400 font-bold">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={activeMealPlanRate}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                    setCustomMealPlanRates(prev => ({ ...prev, [selectedMealPlan]: val }))
                                                }}
                                                className="w-16 bg-transparent text-right font-mono font-bold text-white outline-none text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-gray-500">₹{activeMealPlanRate} × {stayDuration} night(s) × {bookingDetails.guests || 1} guest(s)</p>
                                </div>
                            )}
                        </div>

                        {/* EXTRA REQUESTS & ADD-ONS (EXTRA BED, MATTRESS, ETC.) */}
                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between ml-1">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">EXTRA REQUESTS & ADD-ONS</p>
                                {extraAddonsTotal > 0 && (
                                    <span className="text-[10px] font-bold text-blue-400 font-mono">+₹{extraAddonsTotal.toLocaleString('en-IN')}</span>
                                )}
                            </div>

                            <div className="space-y-2">
                                {extraAddons.map((item, idx) => (
                                    <div key={item.id || idx} className="p-3 bg-[#131A29] border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-white tracking-tight">{item.name}</p>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-2.5 py-1 focus-within:border-blue-500 transition-colors">
                                                    <span className="text-gray-400 text-xs font-bold mr-1">₹</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.price}
                                                        onChange={(e) => {
                                                            const p = Math.max(0, parseFloat(e.target.value) || 0)
                                                            setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, price: p } : a))
                                                        }}
                                                        className="w-20 bg-transparent text-left font-mono font-bold text-white text-xs outline-none border-0 p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <span className="text-gray-500 text-[10px] font-medium">/ stay</span>
                                            </div>
                                        </div>

                                        {/* Tactile Counter Stepper */}
                                        <div className="flex items-center gap-1 bg-[#0B1120] border border-white/10 rounded-xl p-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, qty: Math.max(0, a.qty - 1) } : a))}
                                                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-xs flex items-center justify-center transition-all active:scale-90"
                                            >
                                                -
                                            </button>
                                            <span className="text-xs font-black text-white w-6 text-center font-mono">{item.qty}</span>
                                            <button
                                                type="button"
                                                onClick={() => setExtraAddons(prev => prev.map((a, i) => i === idx ? { ...a, qty: a.qty + 1 } : a))}
                                                className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-xs flex items-center justify-center transition-all active:scale-90"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Add-on Input */}
                                <div className="p-3.5 bg-[#131A29]/70 border border-dashed border-white/15 rounded-2xl space-y-2.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Add Custom Request</p>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Item name (e.g. Airport Taxi, Baby Cot)"
                                            value={customAddonName}
                                            onChange={(e) => setCustomAddonName(e.target.value)}
                                            className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center bg-[#0B1120] border border-white/10 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
                                                <span className="text-gray-400 text-xs font-bold mr-1.5">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Rate amount"
                                                    value={customAddonPrice}
                                                    onChange={(e) => setCustomAddonPrice(e.target.value)}
                                                    className="w-full bg-transparent text-xs text-white font-mono font-bold outline-none placeholder-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!customAddonName) return toast.error("Enter item name")
                                                    const p = parseFloat(customAddonPrice) || 0
                                                    setExtraAddons(prev => [...prev, { id: `custom_${Date.now()}`, name: customAddonName, price: p, qty: 1 }])
                                                    setCustomAddonName('')
                                                    setCustomAddonPrice('')
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                                            >
                                                + Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SPECIAL REQUESTS */}
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">SPECIAL REQUESTS / NOTES</p>
                            <textarea
                                value={bookingDetails.specialRequests}
                                onChange={(e) => setBookingDetails({ ...bookingDetails, specialRequests: e.target.value })}
                                className="w-full bg-[#131A29] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 min-h-[65px] resize-none outline-none focus:border-blue-500 shadow-inner"
                                placeholder="Add guest preferences or allergies..."
                            />
                        </div>

                        {/* FINANCIAL BREAKDOWN */}
                        <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs font-semibold">
                            <div className="flex items-center justify-between text-gray-400">
                                <span>Room Charges ({stayDuration} nt)</span>
                                <span className="text-white font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            {mealPlanTotal > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Meal Plan ({selectedMealPlan})</span>
                                    <span className="text-blue-400 font-mono">+₹{mealPlanTotal.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {extraAddonsTotal > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Extra Add-ons</span>
                                    <span className="text-blue-400 font-mono">+₹{extraAddonsTotal.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {gstAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>GST ({pricingSettings.gstPercent}%)</span>
                                    <span className="text-white font-mono">+₹{gstAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {serviceChargeAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Service Charge ({pricingSettings.serviceChargePercent}%)</span>
                                    <span className="text-white font-mono">+₹{serviceChargeAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {luxuryTaxAmount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>Luxury Tax ({pricingSettings.luxuryTaxPercent}%)</span>
                                    <span className="text-white font-mono">+₹{luxuryTaxAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {finalDiscount > 0 && (
                                <div className="flex items-center justify-between text-gray-400">
                                    <span>{pricingSettings.discountLabel} ({pricingSettings.defaultDiscountPercent}%)</span>
                                    <span className="text-emerald-400 font-mono">-₹{finalDiscount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Footer Action Section (Pinned to bottom of card, ALWAYS visible on screen) */}
                    <div className="pt-3 border-t border-white/10 shrink-0 bg-[#0F172A] space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Total</span>
                            <span className="text-2xl font-black text-white font-mono tracking-tight leading-none">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <button
                            className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-50 rounded-xl text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer"
                            onClick={() => setCurrentStep(2)}
                            disabled={selectedRooms.length === 0}
                        >
                            <span>Review & Finalize</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderConfirmStep = () => (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 animate-in fade-in slide-in-from-right-12 duration-500 pb-32">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight leading-tight">Review & Confirm Reservation</h1>
                    <p className="text-gray-400 text-xs font-medium mt-1">Please verify guest credentials, room rates, and stay parameters before securing the booking.</p>
                </div>

                <div className="space-y-6">
                    {/* GUEST SECTION */}
                    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-white tracking-tight">Guest Profile</h3>
                            </div>
                            <button 
                                onClick={() => setCurrentStep(0)} 
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Modify
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-[#131A29] shrink-0 shadow-inner">
                                <Image src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedGuest?.name || 'guest'}`} alt="" fill unoptimized />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full text-xs">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Full Name</p>
                                    <p className="font-bold text-white text-base leading-tight truncate">{selectedGuest?.name || 'N/A'}</p>
                                    {selectedGuest?.isVIP ? (
                                        <span className="inline-flex items-center gap-1 mt-1 text-amber-400 font-bold text-[10px]">
                                            <Star className="w-3 h-3 fill-amber-400" /> VIP Member
                                        </span>
                                    ) : (
                                        <span className="inline-block mt-1 text-gray-500 font-semibold text-[10px]">Standard Guest</span>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Contact Email</p>
                                    <p className="font-semibold text-gray-200 truncate">{selectedGuest?.email || 'No email provided'}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Contact Phone</p>
                                    <p className="font-semibold text-gray-200">{selectedGuest?.phone || 'No phone provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STAY & ROOM DETAILS (Completely collision-free & responsive) */}
                    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-white tracking-tight">Stay & Room Schedule</h3>
                            </div>
                            <button 
                                onClick={() => setCurrentStep(1)} 
                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                            >
                                <Edit2 className="w-3.5 h-3.5" /> Modify Dates
                            </button>
                        </div>

                        {/* Top Travel Dates Bar */}
                        <div className="p-4 bg-[#131A29] border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                                    IN
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Check-in</span>
                                    <span className="text-sm font-bold text-white">
                                        {new Date(bookingDetails.checkIn + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{stayDuration} {stayDuration === 1 ? 'Night' : 'Nights'} Stay</span>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
                                    OUT
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Check-out</span>
                                    <span className="text-sm font-bold text-white">
                                        {new Date(bookingDetails.checkOut + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Selected Rooms List */}
                        <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                                Assigned Rooms ({selectedRooms.length})
                            </span>

                            {selectedRooms.map((room) => {
                                const rate = room.customPrice ?? room.basePrice
                                const roomTotal = rate * stayDuration

                                return (
                                    <div 
                                        key={room.id} 
                                        className="bg-[#131A29] rounded-2xl p-4 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-white/20 shadow-inner"
                                    >
                                        {/* Room Identity */}
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-20 h-16 relative rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                                                <Image 
                                                    src={room.images?.[0] || (room.type?.includes('Suite')
                                                        ? "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"
                                                        : "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80"
                                                    )} 
                                                    alt="" fill className="object-cover" unoptimized 
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-base font-black text-white tracking-tight leading-none">
                                                        Room {room.roomNumber}
                                                    </h4>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold uppercase">
                                                        Floor {room.floor || 1}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1 truncate">
                                                    {room.type}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Rate Editor & Subtotal (Separated cleanly without collision) */}
                                        <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-white/10">
                                            <div className="flex items-center gap-1.5 bg-[#0F172A] border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-blue-500 transition-colors">
                                                <span className="text-gray-400 text-xs font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={rate}
                                                    onChange={(e) => {
                                                        const val = Math.max(0, parseFloat(e.target.value) || 0)
                                                        setSelectedRooms(selectedRooms.map(r => r.id === room.id ? { ...r, customPrice: val } : r))
                                                    }}
                                                    className="w-20 bg-transparent text-right font-mono font-bold text-white outline-none text-xs"
                                                />
                                                <span className="text-[10px] text-gray-400 font-semibold">/nt</span>
                                            </div>

                                            <div className="text-right min-w-[90px]">
                                                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Subtotal</span>
                                                <span className="text-base font-black text-blue-400 font-mono tracking-tight">
                                                    ₹{roomTotal.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* FINAL ADMIN SETTINGS (Right Column) */}
            <div className="space-y-6">
                <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 space-y-6 sticky top-24 shadow-2xl text-white">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                            <Save className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight">Reservation Parameters</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Booking Source */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Booking Source</label>
                            <select
                                value={bookingDetails.source}
                                onChange={e => setBookingDetails({ ...bookingDetails, source: e.target.value })}
                                className="w-full bg-[#131A29] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500 cursor-pointer"
                            >
                                <option value="WALK_IN" className="bg-[#0F172A]">Hotel Walk-in</option>
                                <option value="DIRECT" className="bg-[#0F172A]">Direct Call Reservation</option>
                                <option value="BOOKING_COM" className="bg-[#0F172A]">Booking.com</option>
                                <option value="MAKE_MY_TRIP" className="bg-[#0F172A]">MakeMyTrip</option>
                                <option value="AIRBNB" className="bg-[#0F172A]">Airbnb</option>
                            </select>
                        </div>

                        {/* Market Segment & Bill To */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Market Segment</label>
                                <select
                                    value={bookingDetails.marketSegment}
                                    onChange={e => setBookingDetails({ ...bookingDetails, marketSegment: e.target.value })}
                                    className="w-full bg-[#131A29] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="LEISURE" className="bg-[#0F172A]">Leisure</option>
                                    <option value="CORPORATE" className="bg-[#0F172A]">Corporate</option>
                                    <option value="GROUP" className="bg-[#0F172A]">Group</option>
                                    <option value="GOVERNMENT" className="bg-[#0F172A]">Government</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Billing Entity</label>
                                <select
                                    value={bookingDetails.billTo}
                                    onChange={e => setBookingDetails({ ...bookingDetails, billTo: e.target.value })}
                                    className="w-full bg-[#131A29] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="GUEST" className="bg-[#0F172A]">Guest (Direct)</option>
                                    <option value="COMPANY" className="bg-[#0F172A]">Company / Corporate</option>
                                    <option value="TRAVEL_AGENT" className="bg-[#0F172A]">Travel Agent / OTA</option>
                                </select>
                            </div>
                        </div>

                        {/* Reservation Status & Ad-hoc Discount */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Status</label>
                                <select
                                    value={bookingDetails.status}
                                    onChange={e => setBookingDetails({ ...bookingDetails, status: e.target.value })}
                                    className="w-full bg-[#131A29] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500 cursor-pointer"
                                >
                                    <option value="RESERVED" className="bg-[#0F172A]">Confirmed</option>
                                    <option value="CHECKED_IN" className="bg-[#0F172A]">Checked In</option>
                                    <option value="PENDING" className="bg-[#0F172A]">Tentative</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Discount (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0.00"
                                        className="w-full bg-[#131A29] border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-xs text-white font-mono font-bold outline-none focus:border-blue-500"
                                        value={bookingDetails.discountAmount || ''}
                                        onChange={e => setBookingDetails({ ...bookingDetails, discountAmount: Math.max(0, parseFloat(e.target.value) || 0) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Checkbox Options */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <label className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                                bookingDetails.isComplimentary ? "bg-blue-600/10 border-blue-500 text-white" : "bg-[#131A29] border-white/10 text-gray-400 hover:text-white"
                            )}>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={bookingDetails.isComplimentary} 
                                    onChange={e => setBookingDetails({...bookingDetails, isComplimentary: e.target.checked})} 
                                />
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", bookingDetails.isComplimentary ? "bg-blue-600 border-blue-500" : "border-gray-500")}>
                                    {bookingDetails.isComplimentary && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-xs font-bold">Complimentary</span>
                            </label>
                            
                            <label className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all",
                                bookingDetails.taxExempt ? "bg-blue-600/10 border-blue-500 text-white" : "bg-[#131A29] border-white/10 text-gray-400 hover:text-white"
                            )}>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={bookingDetails.taxExempt} 
                                    onChange={e => setBookingDetails({...bookingDetails, taxExempt: e.target.checked})} 
                                />
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", bookingDetails.taxExempt ? "bg-blue-600 border-blue-500" : "border-gray-500")}>
                                    {bookingDetails.taxExempt && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-xs font-bold">Tax Exempt</span>
                            </label>
                        </div>

                        {/* Staff Remarks */}
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Staff Remarks</label>
                            <textarea
                                className="w-full bg-[#131A29] border border-white/10 rounded-xl p-3 text-xs text-white min-h-[75px] resize-none outline-none focus:border-blue-500"
                                placeholder="E.g., Special breakfast requirements for guests..."
                                value={bookingDetails.notes}
                                onChange={e => setBookingDetails({ ...bookingDetails, notes: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Financial Summary & Secure Button */}
                    <div className="pt-4 border-t border-white/10 space-y-4">
                        <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Total Amount Secured</span>
                            <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-2xl font-black text-white tracking-tight font-mono">
                                    ₹{grandTotal.toLocaleString('en-IN')}.00
                                </span>
                                <span className="text-xs font-bold text-gray-400">INR</span>
                            </div>
                            <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> All taxes & service fees included
                            </p>
                        </div>

                        <button
                            className="w-full h-14 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                            onClick={handleFinalSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Secure Reservation</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="text-xs font-medium">Loading booking form...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="text-text-secondary font-sans selection:bg-[#4A9EFF]/30 selection:text-text-primary">

            <div className="max-w-[1700px] mx-auto pt-4 pb-32">
                {currentStep === 0 && renderGuestStep()}
                {currentStep === 1 && renderRoomStep()}
                {currentStep === 2 && renderConfirmStep()}
                {(fetching || loading) && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
                        <div className="bg-[#0F172A] border border-white/10 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-xs font-semibold text-white">Saving reservation...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Mobile/Tablet Action Bar (Appears when sidebar is stacked below on smaller screens) */}
            {currentStep === 1 && selectedRooms.length > 0 && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0F172A]/95 border-t border-white/10 backdrop-blur-xl px-6 py-3.5 z-[90] flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Rooms ({selectedRooms.length})</p>
                            <p className="text-xs font-bold text-white truncate max-w-[140px]">
                                {selectedRooms.map(r => `Room ${r.roomNumber}`).join(', ')}
                            </p>
                        </div>
                        <div className="h-7 w-px bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</p>
                            <p className="text-sm font-black text-blue-400 font-mono">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setCurrentStep(2)}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                    >
                        <span>Review</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>
            )}

            {currentStep === 2 && selectedRooms.length > 0 && (
                <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[#0F172A]/95 border-t border-white/10 backdrop-blur-xl px-6 py-3.5 z-[90] flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Guest</p>
                            <p className="text-xs font-bold text-white truncate max-w-[140px]">{selectedGuest?.name}</p>
                        </div>
                        <div className="h-7 w-px bg-white/10" />
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Secured</p>
                            <p className="text-sm font-black text-white font-mono">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleFinalSubmit}
                        disabled={loading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Secure</span> <ArrowRight className="w-4 h-4 stroke-[2.5]" /></>}
                    </button>
                </div>
            )}
        </div>
    )
}

export default function NewBookingPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px] text-text-tertiary animate-pulse font-medium">
                Loading booking form...
            </div>
        }>
            <NewBookingContent />
        </Suspense>
    )
}

