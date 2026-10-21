'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, Save, ArrowLeft, CheckCircle2, Loader2, Building2, CalendarDays, Clock, Users, Sparkles, Printer, Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'
import { printBanquetQuotation, downloadBanquetQuotationPDF, HotelInfo } from '@/lib/banquet-quotation-printer'

const EVENT_TYPES = ['Wedding', 'Reception', 'Corporate', 'Conference', 'Birthday', 'Anniversary', 'Exhibition', 'Seminar', 'Other']
const RATE_TYPES = ['Season', 'Weekday', 'Weekend', 'Festival', 'Special']
const MENU_CARDS = ['Wedding Menu', 'Corporate Menu', 'Veg Menu', 'Non-Veg Menu', 'Premium Menu', 'Budget Menu', 'Custom']

const DEFAULT_FALLBACK_HALLS = [
  { id: 'hall-ballroom', name: 'Grand Ballroom', capacity: 500, rentPerDay: 35000 },
  { id: 'hall-crystal', name: 'Crystal Hall', capacity: 250, rentPerDay: 22000 },
  { id: 'hall-royal', name: 'Royal Pavilion', capacity: 150, rentPerDay: 15000 },
  { id: 'hall-poolside', name: 'Poolside Lawn', capacity: 300, rentPerDay: 28000 },
  { id: 'hall-boardroom', name: 'Executive Boardroom', capacity: 50, rentPerDay: 8000 },
]

const MENU_CARD_RATES: Record<string, number> = {
  'Wedding Menu': 1200,
  'Premium Menu': 1500,
  'Corporate Menu': 850,
  'Non-Veg Menu': 950,
  'Veg Menu': 650,
  'Budget Menu': 450,
}

const STATUS_OPTIONS = [
  { value: 'ENQUIRY', label: 'Enquiry', color: 'border-blue-400 bg-blue-400/10 text-blue-400' },
  { value: 'LEAD_GENERATION', label: 'Lead Generation', color: 'border-amber-400 bg-amber-400/10 text-amber-400' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'border-emerald-400 bg-emerald-400/10 text-emerald-400' },
  { value: 'WAITLIST', label: 'Waitlist', color: 'border-purple-400 bg-purple-400/10 text-purple-400' },
]

const emptyEvent = () => ({
  hallName: '',
  hallId: '',
  eventType: 'Wedding',
  eventDate: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '17:00',
  menuCard: '',
  guaranteedPax: '100',
  childPax: '0',
  hallOnRent: true,
  rateType: 'Season',
  hallRent: '0',
  perPlateRate: '0',
  inclusive: false,
  amount: '0',
  fpNumber: '',
})

function BanquetNewPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = !!editId

  const [halls, setHalls] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<any>(null)
  const [propertyInfo, setPropertyInfo] = useState<HotelInfo>({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: ''
  })

  // Form state
  const [status, setStatus] = useState('ENQUIRY')
  const [salutation, setSalutation] = useState('Mr.')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [address2, setAddress2] = useState('')
  const [country, setCountry] = useState('India')
  const [nationality, setNationality] = useState('Indian')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [guestGstin, setGuestGstin] = useState('')
  const [aadhaarNo, setAadhaarNo] = useState('')
  const [panNo, setPanNo] = useState('')
  const [reference, setReference] = useState('')
  const [partyName1, setPartyName1] = useState('')
  const [contactNo1, setContactNo1] = useState('')
  const [partyName2, setPartyName2] = useState('')
  const [contactNo2, setContactNo2] = useState('')
  const [eventName, setEventName] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Payment details
  const [payMode, setPayMode] = useState('Cash')
  const [currency, setCurrency] = useState('INR')
  const [billingInstruction, setBillingInstruction] = useState('Direct')
  const [marketSegment, setMarketSegment] = useState('Walk In')
  const [businessSource, setBusinessSource] = useState('Walk-in')
  const [reservationMode, setReservationMode] = useState('Phone Call')
  const [corporate, setCorporate] = useState('')
  const [gstin, setGstin] = useState('')

  // Events
  const [events, setEvents] = useState([emptyEvent()])

  useEffect(() => {
    const { propertyId } = getAdminContext()
    const propUrl = propertyId && propertyId !== 'ALL'
      ? `/api/admin/settings/property?propertyId=${propertyId}`
      : '/api/admin/settings/property'

    fetch(propUrl)
      .then(r => r.json())
      .then(d => {
        if (d.property) {
          setPropertyInfo(prev => ({
            ...prev,
            name: d.property.name || prev.name,
            address: d.property.address || prev.address,
            phone: d.property.phone || prev.phone,
            email: d.property.email || prev.email,
            gstNumber: d.property.gstNumber || prev.gstNumber,
          }))
        }
      })
      .catch(() => {})

    const finUrl = propertyId && propertyId !== 'ALL'
      ? `/api/admin/settings/financial?propertyId=${propertyId}`
      : '/api/admin/settings/financial'

    fetch(finUrl)
      .then(r => r.json())
      .then(d => {
        if (d.data?.gstNumber) {
          setPropertyInfo(prev => ({ ...prev, gstNumber: d.data.gstNumber }))
        }
      })
      .catch(() => {})

    fetch(buildContextUrl('/api/admin/banquet/halls'))
      .then(r => r.json())
      .then(d => {
        const loadedHalls = Array.isArray(d) && d.length > 0 ? d : DEFAULT_FALLBACK_HALLS
        setHalls(loadedHalls)
      })
      .catch(() => setHalls(DEFAULT_FALLBACK_HALLS))

    if (editId) {
      setLoading(true)
      fetch(buildContextUrl('/api/admin/banquet/bookings', { id: editId })).then(r => r.json()).then(b => {
        if (!b) return
        if (b.property) {
          setPropertyInfo(prev => ({
            ...prev,
            name: b.property.name || prev.name,
            address: b.property.address || prev.address,
            phone: b.property.phone || prev.phone,
            email: b.property.email || prev.email,
            gstNumber: b.property.gstNumber || prev.gstNumber
          }))
        }
        setStatus(b.status || 'ENQUIRY')
        setSalutation(b.salutation || 'Mr.')
        setFirstName(b.firstName || '')
        setLastName(b.lastName || '')
        setMobile(b.mobile || '')
        setEmail(b.email || '')
        setAddress(b.address || '')
        setAddress2(b.address2 || '')
        setCountry(b.country || 'India')
        setNationality(b.nationality || 'Indian')
        setState(b.state || '')
        setCity(b.city || '')
        setZipCode(b.zipCode || '')
        setGuestGstin(b.guestGstin || '')
        setAadhaarNo(b.aadhaarNo || '')
        setPanNo(b.panNo || '')
        setReference(b.reference || '')
        setPartyName1(b.partyName1 || '')
        setContactNo1(b.contactNo1 || '')
        setPartyName2(b.partyName2 || '')
        setContactNo2(b.contactNo2 || '')
        setEventName(b.eventName || '')
        setSpecialInstructions(b.specialInstructions || '')
        setPayMode(b.payMode || 'Cash')
        setCurrency(b.currency || 'INR')
        setBillingInstruction(b.billingInstruction || 'Direct')
        setMarketSegment(b.marketSegment || 'Walk In')
        setBusinessSource(b.businessSource || 'Walk-in')
        setReservationMode(b.reservationMode || 'Phone Call')
        setCorporate(b.corporate || '')
        setGstin(b.gstin || '')
        if (b.events?.length) {
          setEvents(b.events.map((e: any) => ({
            ...emptyEvent(),
            hallName: e.hallName || '',
            hallId: e.hallId || '',
            eventType: e.eventType || 'Wedding',
            eventDate: e.eventDate ? format(parseISO(e.eventDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            startTime: e.startTime || '09:00',
            endTime: e.endTime || '17:00',
            menuCard: e.menuCard || '',
            guaranteedPax: String(e.guaranteedPax || '100'),
            childPax: String(e.childPax || '0'),
            hallOnRent: e.hallOnRent !== false,
            rateType: e.rateType || 'Season',
            hallRent: String(e.hallRent || '0'),
            perPlateRate: String(e.perPlateRate || '0'),
            inclusive: e.inclusive || false,
            amount: String(e.amount || '0'),
            fpNumber: e.fpNumber || '',
          })))
        }
        setLoading(false)
      })
    }
  }, [editId])

  const calcAmount = (ev: {
    guaranteedPax?: string | number
    perPlateRate?: string | number
    hallRent?: string | number
    hallOnRent?: boolean
    inclusive?: boolean
  }) => {
    const pax = Math.max(0, parseInt(String(ev.guaranteedPax || 0)) || 0)
    const ppr = Math.max(0, parseFloat(String(ev.perPlateRate || 0)) || 0)
    const isRentActive = ev.hallOnRent !== false
    const rent = isRentActive ? Math.max(0, parseFloat(String(ev.hallRent || 0)) || 0) : 0
    const foodCost = pax * ppr

    let total = 0
    if (ev.inclusive && foodCost > 0) {
      // Inclusive package: per-plate rate covers the venue rental
      total = foodCost
    } else {
      // Standard: Catering + Hall Rental (or Hall Rental alone if no catering)
      total = foodCost + rent
    }
    return String(Math.round(total))
  }

  const updateEvent = (idx: number, fieldOrUpdates: string | Record<string, any>, value?: any) => {
    setEvents(prev => prev.map((e, i) => {
      if (i !== idx) return e
      const updates = typeof fieldOrUpdates === 'string' ? { [fieldOrUpdates]: value } : fieldOrUpdates
      const merged = { ...e, ...updates }

      // Auto-recalculate amount unless amount was explicitly hand-typed
      if (!('amount' in updates)) {
        merged.amount = calcAmount(merged)
      }
      return merged
    }))
  }

  const handleHallChange = (idx: number, val: string) => {
    const h = halls.find(item => item.name === val || item.id === val)
    if (h) {
      const baseRent = h.rentPerDay ?? h.basePrice ?? h.price ?? 0
      updateEvent(idx, {
        hallName: h.name,
        hallId: h.id,
        hallRent: String(baseRent),
        hallOnRent: true,
        guaranteedPax: events[idx]?.guaranteedPax && events[idx]?.guaranteedPax !== '0' ? events[idx].guaranteedPax : String(h.capacity || 100),
      })
    } else if (val === 'Custom') {
      updateEvent(idx, {
        hallName: 'Custom',
        hallId: '',
        hallRent: '0',
        hallOnRent: true,
      })
    } else {
      updateEvent(idx, {
        hallName: '',
        hallId: '',
        hallRent: '0',
        hallOnRent: false,
      })
    }
  }

  const handleMenuChange = (idx: number, val: string) => {
    const suggested = MENU_CARD_RATES[val]
    const currentPpr = parseFloat(events[idx]?.perPlateRate || '0')
    const updates: Record<string, any> = { menuCard: val }
    if (suggested && (!currentPpr || currentPpr === 0)) {
      updates.perPlateRate = String(suggested)
    }
    updateEvent(idx, updates)
  }

  const totalAmount = events.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  const handleSave = async () => {
    if (!firstName || !mobile) return toast.error('First name and mobile are required')
    if (events.some(e => !e.hallName || !e.eventType)) return toast.error('All events need a hall and event type')

    setSaving(true)
    try {
      const payload = {
        status, salutation, firstName, lastName, mobile, email,
        address, address2, country, nationality, state, city, zipCode,
        guestGstin, aadhaarNo, panNo, reference,
        partyName1, contactNo1, partyName2, contactNo2,
        eventName, specialInstructions,
        payMode, currency, billingInstruction, marketSegment,
        businessSource, reservationMode, corporate, gstin,
        events: events.map(e => ({
          ...e,
          guaranteedPax: parseInt(e.guaranteedPax) || 0,
          childPax: parseInt(e.childPax) || 0,
          hallRent: parseFloat(e.hallRent) || 0,
          perPlateRate: parseFloat(e.perPlateRate) || 0,
          amount: parseFloat(e.amount) || 0,
        }))
      }

      const { propertyId } = getAdminContext()
      const url = '/api/admin/banquet/bookings'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit ? { id: editId, ...payload } : { ...payload, propertyId: propertyId !== 'ALL' ? propertyId : undefined }

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (json.success) {
        setCreatedBooking(json.data)
        if (json.data?.property) {
          setPropertyInfo(prev => ({
            ...prev,
            name: json.data.property.name || prev.name,
            address: json.data.property.address || prev.address,
            phone: json.data.property.phone || prev.phone,
            email: json.data.property.email || prev.email,
            gstNumber: json.data.property.gstNumber || prev.gstNumber
          }))
        }
        toast.success(isEdit ? 'Booking updated!' : 'Booking created!')
      } else {
        toast.error(json.error || 'Failed to save')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#4A9EFF] to-blue-600 shadow-[0_0_12px_rgba(74,158,255,0.4)]" />
      <div>
        <h3 className="text-sm font-black text-white tracking-wider uppercase">{title}</h3>
        {subtitle && <p className="text-[10px] text-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )

  const inputCls = "w-full bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:hover:bg-black/60 border border-border/60 hover:border-border rounded-xl px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF] focus:ring-2 focus:ring-[#4A9EFF]/20 placeholder:text-text-tertiary transition-all"
  const selectCls = "w-full bg-slate-50 dark:bg-black/40 hover:bg-slate-100 dark:hover:bg-black/60 border border-border/60 hover:border-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-text-primary outline-none focus:border-[#4A9EFF] focus:ring-2 focus:ring-[#4A9EFF]/20 cursor-pointer transition-all "
  const labelCls = "text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-1"

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-[#4A9EFF]" />
    </div>
  )

  // Booking Created Confirmation Modal
  if (createdBooking) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
        <div className="bg-[#0B0F17] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#121824] via-[#161F2E] to-[#121824] border-b border-white/10 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Booking Saved Successfully</h2>
                <p className="text-xs text-text-tertiary">Official banquet reservation record created</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-text-tertiary uppercase font-black tracking-wider block">Booking Ref</span>
              <span className="font-mono font-black text-[#4A9EFF] text-base">{createdBooking.bookingNumber}</span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Host & Event Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-xs">
              <div>
                <span className="text-text-tertiary text-[10px] uppercase font-bold block">Client / Host</span>
                <span className="font-bold text-white text-xs mt-0.5 block truncate">{createdBooking.firstName} {createdBooking.lastName}</span>
              </div>
              <div>
                <span className="text-text-tertiary text-[10px] uppercase font-bold block">Company</span>
                <span className="font-medium text-text-secondary text-xs mt-0.5 block truncate">{createdBooking.corporate || 'Individual'}</span>
              </div>
              <div>
                <span className="text-text-tertiary text-[10px] uppercase font-bold block">Billing Mode</span>
                <span className="font-medium text-text-secondary text-xs mt-0.5 block">{createdBooking.billingInstruction || 'Direct'}</span>
              </div>
              <div>
                <span className="text-text-tertiary text-[10px] uppercase font-bold block">Payment Mode</span>
                <span className="font-medium text-text-secondary text-xs mt-0.5 block">{createdBooking.payMode || 'Cash'}</span>
              </div>
            </div>

            {/* Events Summary Table */}
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-slate-100/70 dark:bg-black/20">
              <table className="w-full text-xs">
                <thead className="bg-[#121824] border-b border-white/10 text-text-secondary">
                  <tr>
                    {['Hall / Venue', 'Date', 'Event', 'Timings', 'Pax', 'Total'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {createdBooking.events?.map((ev: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-white font-semibold">{ev.hallName}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{format(parseISO(ev.eventDate), 'dd-MMM-yyyy')}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.eventType}</td>
                      <td className="px-3 py-2.5 text-text-tertiary font-mono text-[11px]">{ev.startTime} - {ev.endTime}</td>
                      <td className="px-3 py-2.5 text-text-secondary">{ev.guaranteedPax} {ev.childPax > 0 && `(+${ev.childPax})`}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-[#4A9EFF]">₹{(ev.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-white/10 bg-[#121824]/60">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-right font-black text-white text-xs uppercase tracking-wider">Estimated Grand Total</td>
                    <td className="px-3 py-3 font-black text-[#4A9EFF] font-mono text-sm">
                      ₹{(createdBooking.totalAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Print Note */}
            <div className="flex items-center gap-2.5 text-[11px] text-text-tertiary bg-[#4A9EFF]/5 border border-[#4A9EFF]/15 rounded-xl px-3.5 py-2.5">
              <Sparkles className="w-4 h-4 text-[#4A9EFF] shrink-0" />
              <span>Official A4 quotation formats include hotel letterhead, customer billing info, terms, and authorized signature blocks.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => router.push('/admin/banquet')}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to List
              </button>
              
              <button
                onClick={() => downloadBanquetQuotationPDF(createdBooking, propertyInfo)}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-white/10 hover:border-white/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Download PDF
              </button>

              <button
                onClick={() => printBanquetQuotation(createdBooking, propertyInfo)}
                className="flex-1 py-3 px-4 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#4A9EFF]/20 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Quotation
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/banquet')}
            className="p-2 hover:bg-white/10 rounded-xl text-text-secondary transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-text-primary">
              {isEdit ? 'Edit Banquet Booking' : 'New Banquet Booking'}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">Booking Calendar</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Update Booking' : 'Save Booking'}
        </button>
      </div>

      {/* Booking Status */}
      <div className="bg-surface border border-border/50 rounded-2xl p-5">
        <p className={labelCls}>Booking Status <span className="text-red-400">*</span></p>
        <div className="flex flex-wrap gap-3 mt-1">
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-sm font-bold transition-all',
                status === s.value ? s.color : 'border-border/50 text-text-secondary bg-slate-100/70 dark:bg-black/20')}>
              <div className={cn('w-3 h-3 rounded-full border-2',
                status === s.value ? 'bg-current border-current' : 'border-border')} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guest Details */}
      <div className="bg-surface border border-border/50 rounded-2xl p-5 space-y-4">
        <SectionHeader title="Guest Details" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <label className={labelCls}>Salutation</label>
            <select value={salutation} onChange={e => setSalutation(e.target.value)} className={selectCls}>
              {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'].map(s => <option key={s} value={s} className="bg-[#141824] text-white py-2">{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className={labelCls}>First Name <span className="text-red-400">*</span></label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="First Name" />
          </div>
          <div className="md:col-span-1">
            <label className={labelCls}>Last Name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Last Name" />
          </div>
          <div>
            <label className={labelCls}>Mobile No. <span className="text-red-400">*</span></label>
            <input value={mobile} onChange={e => setMobile(e.target.value)} className={inputCls} placeholder="Mobile" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className={labelCls}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="Email" />
          </div>
          <div>
            <label className={labelCls}>Guest GSTIN</label>
            <input value={guestGstin} onChange={e => setGuestGstin(e.target.value)} className={inputCls} placeholder="GSTIN" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Address <span className="text-red-400">*</span></label><input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Address" /></div>
          <div><label className={labelCls}>Address 2</label><input value={address2} onChange={e => setAddress2(e.target.value)} className={inputCls} placeholder="Address 2" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className={labelCls}>Country <span className="text-red-400">*</span></label><input value={country} onChange={e => setCountry(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Nationality</label><input value={nationality} onChange={e => setNationality(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>State <span className="text-red-400">*</span></label><input value={state} onChange={e => setState(e.target.value)} className={inputCls} placeholder="State" /></div>
          <div><label className={labelCls}>City <span className="text-red-400">*</span></label><input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="City" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className={labelCls}>ZIP Code</label><input value={zipCode} onChange={e => setZipCode(e.target.value)} className={inputCls} placeholder="ZIP" /></div>
          <div><label className={labelCls}>Aadhaar No.</label><input value={aadhaarNo} onChange={e => setAadhaarNo(e.target.value)} className={inputCls} placeholder="Aadhaar" /></div>
          <div><label className={labelCls}>PAN</label><input value={panNo} onChange={e => setPanNo(e.target.value)} className={inputCls} placeholder="PAN" /></div>
          <div><label className={labelCls}>Reference</label><input value={reference} onChange={e => setReference(e.target.value)} className={inputCls} placeholder="Reference" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className={labelCls}>Party Name 1</label><input value={partyName1} onChange={e => setPartyName1(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Contact Number 1</label><input value={contactNo1} onChange={e => setContactNo1(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Party Name 2</label><input value={partyName2} onChange={e => setPartyName2(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Contact Number 2</label><input value={contactNo2} onChange={e => setContactNo2(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className={labelCls}>Event Name</label><input value={eventName} onChange={e => setEventName(e.target.value)} className={inputCls} placeholder="Event Name" /></div>
          <div><label className={labelCls}>Special Instructions</label><input value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className={inputCls} placeholder="Special Instructions" /></div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-surface border border-border/50 rounded-2xl p-5 space-y-4">
        <SectionHeader title="Guest Payment Details" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Pay Mode <span className="text-red-400">*</span></label>
            <select value={payMode} onChange={e => setPayMode(e.target.value)} className={selectCls}>
              {['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Mixed'].map(m => <option key={m} value={m} className="bg-[#141824] text-white py-2">{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map(c => <option key={c} value={c} className="bg-[#141824] text-white py-2">{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Billing Instruction <span className="text-red-400">*</span></label>
            <select value={billingInstruction} onChange={e => setBillingInstruction(e.target.value)} className={selectCls}>
              {['Direct', 'Company', 'Travel Agent', 'Online'].map(b => <option key={b} value={b} className="bg-[#141824] text-white py-2">{b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Market Segment <span className="text-red-400">*</span></label>
            <select value={marketSegment} onChange={e => setMarketSegment(e.target.value)} className={selectCls}>
              {['Walk In', 'Corporate', 'Travel Agent', 'Social', 'Government', 'Other'].map(m => <option key={m} value={m} className="bg-[#141824] text-white py-2">{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Business Source <span className="text-red-400">*</span></label>
            <select value={businessSource} onChange={e => setBusinessSource(e.target.value)} className={selectCls}>
              {['Walk-in', 'Phone Call', 'Email', 'Online', 'Referral', 'Travel Agent'].map(b => <option key={b} value={b} className="bg-[#141824] text-white py-2">{b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reservation Mode <span className="text-red-400">*</span></label>
            <select value={reservationMode} onChange={e => setReservationMode(e.target.value)} className={selectCls}>
              {['Phone Call', 'Email', 'Walk-in', 'WhatsApp', 'Online Portal'].map(r => <option key={r} value={r} className="bg-[#141824] text-white py-2">{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Corporate</label>
            <input value={corporate} onChange={e => setCorporate(e.target.value)} className={inputCls} placeholder="Company Name" />
          </div>
          <div>
            <label className={labelCls}>GSTIN</label>
            <input value={gstin} onChange={e => setGstin(e.target.value)} className={inputCls} placeholder="Company GSTIN" />
          </div>
        </div>
      </div>

      {/* Events Details */}
      <div className="bg-surface border border-border/50 rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHeader
            title="Events Details & Hall Allocation"
            subtitle="Configure venue, guests, meal plans, and automated pricing"
          />
          <button
            type="button"
            onClick={() => setEvents(prev => [...prev, emptyEvent()])}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF]/10 hover:bg-[#4A9EFF]/20 text-[#4A9EFF] hover:text-white border border-[#4A9EFF]/30 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Another Event
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0B0F17]/90 backdrop-blur-md shadow-inner">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="bg-[#121824] border-b border-white/10">
              <tr>
                <th className="px-3 py-3 text-center text-[10px] font-black text-text-tertiary uppercase w-10">#</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[160px]">Hall / Venue</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[130px]">Event Type</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[130px]">Event Date</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[180px]">Schedule (Start - End)</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[140px]">Menu Card</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase w-24">Pax</th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-text-secondary uppercase w-20">Rent?</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[110px]">Rate Type</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[110px]">Hall Rent (₹)</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase min-w-[110px]">Per Plate (₹)</th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-text-secondary uppercase w-20" title="Check if plate rate absorbs hall rent">Inclusive?</th>
                <th className="px-3 py-3 text-right text-[10px] font-black text-[#4A9EFF] uppercase min-w-[120px]">Event Amount (₹)</th>
                <th className="px-3 py-3 text-left text-[10px] font-black text-text-secondary uppercase w-24">FP No.</th>
                <th className="px-2 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((ev, idx) => {
                const currentAmount = parseFloat(ev.amount || '0')
                return (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    {/* Index */}
                    <td className="px-3 py-3 text-center font-mono text-text-tertiary font-bold">{idx + 1}</td>

                    {/* Hall */}
                    <td className="px-3 py-3">
                      <select
                        value={ev.hallName}
                        onChange={e => handleHallChange(idx, e.target.value)}
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#4A9EFF] cursor-pointer transition-all "
                      >
                        <option value="" className="bg-[#141824] text-gray-400">Select Venue Hall</option>
                        {halls.map(h => (
                          <option key={h.id} value={h.name} className="bg-[#141824] text-white">
                            {h.name} {h.rentPerDay ? `(₹${Number(h.rentPerDay).toLocaleString()})` : ''}
                          </option>
                        ))}
                        <option value="Custom" className="bg-[#141824] text-white">Custom Hall</option>
                      </select>
                      {ev.hallName === 'Custom' && (
                        <input
                          placeholder="Enter custom hall name..."
                          value={ev.hallName === 'Custom' ? '' : ev.hallName}
                          className="mt-1.5 w-full bg-[#141A23] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#4A9EFF]"
                          onChange={e => updateEvent(idx, 'hallName', e.target.value)}
                        />
                      )}
                    </td>

                    {/* Event Type */}
                    <td className="px-3 py-3">
                      <select
                        value={ev.eventType}
                        onChange={e => updateEvent(idx, 'eventType', e.target.value)}
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#4A9EFF] cursor-pointer transition-all "
                      >
                        {EVENT_TYPES.map(t => (
                          <option key={t} value={t} className="bg-[#141824] text-white">{t}</option>
                        ))}
                      </select>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={ev.eventDate}
                        onChange={e => updateEvent(idx, 'eventDate', e.target.value)}
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 hover:border-white/20 rounded-xl px-2.5 py-2 text-xs font-medium text-white outline-none focus:border-[#4A9EFF]  transition-all"
                      />
                    </td>

                    {/* Schedule Time (Start - End) */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={ev.startTime}
                          onChange={e => updateEvent(idx, 'startTime', e.target.value)}
                          className="w-20 bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none focus:border-[#4A9EFF]  text-center"
                        />
                        <span className="text-text-tertiary text-xs">to</span>
                        <input
                          type="time"
                          value={ev.endTime}
                          onChange={e => updateEvent(idx, 'endTime', e.target.value)}
                          className="w-20 bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl px-2 py-2 text-xs text-white outline-none focus:border-[#4A9EFF]  text-center"
                        />
                      </div>
                    </td>

                    {/* Menu Card */}
                    <td className="px-3 py-3">
                      <select
                        value={ev.menuCard}
                        onChange={e => handleMenuChange(idx, e.target.value)}
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#4A9EFF] cursor-pointer transition-all "
                      >
                        <option value="" className="bg-[#141824] text-gray-400">Select Menu</option>
                        {MENU_CARDS.map(m => (
                          <option key={m} value={m} className="bg-[#141824] text-white">
                            {m} {MENU_CARD_RATES[m] ? `(₹${MENU_CARD_RATES[m]}/pax)` : ''}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Guaranteed Pax */}
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        value={ev.guaranteedPax}
                        onChange={e => updateEvent(idx, 'guaranteedPax', e.target.value)}
                        placeholder="Pax"
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-white text-center outline-none focus:border-[#4A9EFF]"
                      />
                    </td>

                    {/* Hall On Rent? */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={ev.hallOnRent}
                        onChange={e => updateEvent(idx, 'hallOnRent', e.target.checked)}
                        className="w-4 h-4 accent-[#4A9EFF] cursor-pointer rounded"
                        title="Include hall venue rent in calculation"
                      />
                    </td>

                    {/* Rate Type */}
                    <td className="px-3 py-3">
                      <select
                        value={ev.rateType}
                        onChange={e => updateEvent(idx, 'rateType', e.target.value)}
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl px-2.5 py-2 text-xs font-semibold text-white outline-none focus:border-[#4A9EFF] cursor-pointer "
                      >
                        {RATE_TYPES.map(r => (
                          <option key={r} value={r} className="bg-[#141824] text-white">{r}</option>
                        ))}
                      </select>
                    </td>

                    {/* Hall Rent */}
                    <td className="px-3 py-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={ev.hallRent}
                          disabled={!ev.hallOnRent}
                          onChange={e => updateEvent(idx, 'hallRent', e.target.value)}
                          placeholder="0"
                          className={cn(
                            "w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl pl-6 pr-2 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[#4A9EFF]",
                            !ev.hallOnRent && "opacity-40 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </td>

                    {/* Per Plate Rate */}
                    <td className="px-3 py-3">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={ev.perPlateRate}
                          onChange={e => updateEvent(idx, 'perPlateRate', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl pl-6 pr-2 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[#4A9EFF]"
                        />
                      </div>
                    </td>

                    {/* Inclusive? */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={ev.inclusive}
                        onChange={e => updateEvent(idx, 'inclusive', e.target.checked)}
                        className="w-4 h-4 accent-[#4A9EFF] cursor-pointer rounded"
                        title="Per-plate rate covers venue rental"
                      />
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-3 text-right">
                      <div className="px-3 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-[#4A9EFF]/30 rounded-xl font-mono font-black text-xs text-[#4A9EFF] text-right shadow-sm">
                        ₹{currentAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* FP No. */}
                    <td className="px-3 py-3">
                      <input
                        value={ev.fpNumber}
                        onChange={e => updateEvent(idx, 'fpNumber', e.target.value)}
                        placeholder="FP#"
                        className="w-full bg-[#141A23] hover:bg-[#1A2230] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white text-center outline-none focus:border-[#4A9EFF]"
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="px-2 py-3 text-center">
                      {events.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEvents(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Events Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/40 border border-white/10 rounded-2xl p-4">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Total Events</span>
            <p className="text-base font-black text-white">{events.length} Allocated</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Total Pax</span>
            <p className="text-base font-black text-white">{events.reduce((s, e) => s + (parseInt(e.guaranteedPax) || 0), 0)} Guests</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Venue Rental Sum</span>
            <p className="text-base font-black text-emerald-400 font-mono">
              ₹{events.reduce((s, e) => s + (e.hallOnRent ? (parseFloat(e.hallRent) || 0) : 0), 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A9EFF]">Grand Total Amount</span>
            <p className="text-2xl font-black text-[#4A9EFF] font-mono tracking-tight">
              ₹{totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Save / Reset Buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white font-black rounded-2xl text-sm uppercase tracking-wider transition-all shadow-lg shadow-[#4A9EFF]/20 disabled:opacity-50 cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Booking
          </button>
          <button onClick={() => { setEvents([emptyEvent()]) }}
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-text-secondary font-bold rounded-2xl text-sm transition-all cursor-pointer">
            Reset Events
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BanquetNewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-[#4A9EFF]" /></div>}>
      <BanquetNewPageInner />
    </Suspense>
  )
}
