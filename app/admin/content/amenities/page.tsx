'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, X, Save,
  Wifi, Coffee, Dumbbell, Car, Tv, Utensils,
  Bath, Wind, Snowflake, Flame, ShowerHead, Shirt,
  UtensilsCrossed, Wine, Waves, TreePine, Bike, Gamepad2,
  Music, BookOpen, Baby, Dog, Cigarette, Accessibility,
  ParkingCircle, Bus, Plane, ShieldCheck, Bell, Phone,
  Printer, Monitor, Briefcase, Sunset, Camera, Sparkles,
  Heart, Zap, Droplets, Sun, Moon, Star, Clock, MapPin,
  ChefHat, Salad, IceCream, Beer, Soup, Sandwich,
  Bed, BedDouble, Key, Lock, Luggage, Umbrella,
  Smartphone, Rocket, LayoutGrid, Hammer, BellRing, Flower2,
  Coffee as Drink, MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getAdminContext } from '@/lib/admin-context'
import Button from '@/components/ui/Button'

// ─── All available icons with labels ─────────────────────────────────────────
const ICON_OPTIONS: { value: string; label: string; icon: React.ElementType; category: string }[] = [
  // Connectivity
  { value: 'Wifi',         label: 'Free WiFi',          icon: Wifi,          category: 'Connectivity' },
  { value: 'Phone',        label: 'Phone',               icon: Phone,         category: 'Connectivity' },
  { value: 'Printer',      label: 'Printer',             icon: Printer,       category: 'Connectivity' },
  { value: 'Monitor',      label: 'Computer / Monitor',  icon: Monitor,       category: 'Connectivity' },
  { value: 'Tv',           label: 'Smart TV',            icon: Tv,            category: 'Connectivity' },

  // Room Comfort
  { value: 'Snowflake',    label: 'Air Conditioning',    icon: Snowflake,     category: 'Room Comfort' },
  { value: 'Wind',         label: 'Fan / Ventilation',   icon: Wind,          category: 'Room Comfort' },
  { value: 'Flame',        label: 'Heating',             icon: Flame,         category: 'Room Comfort' },
  { value: 'BedDouble',    label: 'King Bed',            icon: BedDouble,     category: 'Room Comfort' },
  { value: 'Bed',          label: 'Twin Beds',           icon: Bed,           category: 'Room Comfort' },
  { value: 'Moon',         label: 'Blackout Curtains',   icon: Moon,          category: 'Room Comfort' },
  { value: 'Sun',          label: 'Natural Light',       icon: Sun,           category: 'Room Comfort' },
  { value: 'Sunset',       label: 'Balcony / View',      icon: Sunset,        category: 'Room Comfort' },

  // Bathroom
  { value: 'Bath',         label: 'Bathtub',             icon: Bath,          category: 'Bathroom' },
  { value: 'ShowerHead',   label: 'Rain Shower',         icon: ShowerHead,    category: 'Bathroom' },
  { value: 'Droplets',     label: 'Hot Water',           icon: Droplets,      category: 'Bathroom' },
  { value: 'Sparkles',     label: 'Toiletries',          icon: Sparkles,      category: 'Bathroom' },
  { value: 'Shirt',        label: 'Bathrobe & Slippers', icon: Shirt,         category: 'Bathroom' },

  // Food & Beverage
  { value: 'Coffee',       label: 'Coffee Maker',        icon: Coffee,        category: 'Food & Beverage' },
  { value: 'UtensilsCrossed', label: 'Restaurant',       icon: UtensilsCrossed, category: 'Food & Beverage' },
  { value: 'Utensils',     label: 'Room Service',        icon: Utensils,      category: 'Food & Beverage' },
  { value: 'Wine',         label: 'Mini Bar',            icon: Wine,          category: 'Food & Beverage' },
  { value: 'ChefHat',      label: 'Private Chef',        icon: ChefHat,       category: 'Food & Beverage' },
  { value: 'Salad',        label: 'Breakfast Included',  icon: Salad,         category: 'Food & Beverage' },
  { value: 'IceCream',     label: 'Snack Bar',           icon: IceCream,      category: 'Food & Beverage' },
  { value: 'Beer',         label: 'Bar / Lounge',        icon: Beer,          category: 'Food & Beverage' },
  { value: 'Soup',         label: 'Buffet',              icon: Soup,          category: 'Food & Beverage' },
  { value: 'Sandwich',     label: 'Café',                icon: Sandwich,      category: 'Food & Beverage' },

  // Wellness & Recreation
  { value: 'Dumbbell',     label: 'Gym / Fitness',       icon: Dumbbell,      category: 'Wellness' },
  { value: 'Waves',        label: 'Swimming Pool',       icon: Waves,         category: 'Wellness' },
  { value: 'Heart',        label: 'Spa & Wellness',      icon: Heart,         category: 'Wellness' },
  { value: 'Bike',         label: 'Bicycle Rental',      icon: Bike,          category: 'Wellness' },
  { value: 'Gamepad2',     label: 'Game Room',           icon: Gamepad2,      category: 'Wellness' },
  { value: 'Music',        label: 'Live Music',          icon: Music,         category: 'Wellness' },
  { value: 'BookOpen',     label: 'Library',             icon: BookOpen,      category: 'Wellness' },
  { value: 'TreePine',     label: 'Garden / Park',       icon: TreePine,      category: 'Wellness' },

  // Transport & Parking
  { value: 'Car',          label: 'Car Rental',          icon: Car,           category: 'Transport' },
  { value: 'ParkingCircle',label: 'Free Parking',        icon: ParkingCircle, category: 'Transport' },
  { value: 'Bus',          label: 'Shuttle Service',     icon: Bus,           category: 'Transport' },
  { value: 'Plane',        label: 'Airport Transfer',    icon: Plane,         category: 'Transport' },

  // Services
  { value: 'Bell',         label: 'Concierge',           icon: Bell,          category: 'Services' },
  { value: 'Luggage',      label: 'Luggage Storage',     icon: Luggage,       category: 'Services' },
  { value: 'Briefcase',    label: 'Business Center',     icon: Briefcase,     category: 'Services' },
  { value: 'Camera',       label: 'Security Cameras',    icon: Camera,        category: 'Services' },
  { value: 'ShieldCheck',  label: '24/7 Security',       icon: ShieldCheck,   category: 'Services' },
  { value: 'Clock',        label: '24hr Front Desk',     icon: Clock,         category: 'Services' },
  { value: 'Key',          label: 'Keycard Access',      icon: Key,           category: 'Services' },
  { value: 'Lock',         label: 'In-room Safe',        icon: Lock,          category: 'Services' },
  { value: 'Umbrella',     label: 'Laundry Service',     icon: Umbrella,      category: 'Services' },
  { value: 'MapPin',       label: 'Tour Desk',           icon: MapPin,        category: 'Services' },
  { value: 'Zap',          label: 'EV Charging',         icon: Zap,           category: 'Services' },

  // Family & Accessibility
  { value: 'Baby',         label: 'Baby Cot / Crib',     icon: Baby,          category: 'Family' },
  { value: 'Dog',          label: 'Pet Friendly',        icon: Dog,           category: 'Family' },
  { value: 'Accessibility',label: 'Accessible Rooms',    icon: Accessibility, category: 'Family' },
  { value: 'Cigarette',    label: 'Smoking Area',        icon: Cigarette,     category: 'Family' },
  { value: 'Star',         label: 'Premium Service',     icon: Star,          category: 'Family' },
]

const ICON_MAP: Record<string, React.ElementType> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.value, o.icon])
)

const CATEGORIES = ['General', 'Connectivity', 'Room Comfort', 'Bathroom', 'Food & Beverage', 'Wellness', 'Transport', 'Services', 'Family']

const CATEGORY_COLORS: Record<string, string> = {
  'General':        'text-slate-400 bg-slate-400/10',
  'Connectivity':   'text-blue-400 bg-blue-400/10',
  'Room Comfort':   'text-amber-400 bg-amber-400/10',
  'Bathroom':       'text-cyan-400 bg-cyan-400/10',
  'Food & Beverage':'text-orange-400 bg-orange-400/10',
  'Wellness':       'text-emerald-400 bg-emerald-400/10',
  'Transport':      'text-purple-400 bg-purple-400/10',
  'Services':       'text-indigo-400 bg-indigo-400/10',
  'Family':         'text-pink-400 bg-pink-400/10',
}

const ICON_BG: Record<string, string> = {
  'General':        'bg-slate-500/15 text-slate-300',
  'Connectivity':   'bg-blue-500/15 text-blue-300',
  'Room Comfort':   'bg-amber-500/15 text-amber-300',
  'Bathroom':       'bg-cyan-500/15 text-cyan-300',
  'Food & Beverage':'bg-orange-500/15 text-orange-300',
  'Wellness':       'bg-emerald-500/15 text-emerald-300',
  'Transport':      'bg-purple-500/15 text-purple-300',
  'Services':       'bg-indigo-500/15 text-indigo-300',
  'Family':         'bg-pink-500/15 text-pink-300',
}

const DASHBOARD_ICON_OPTIONS = [
  { label: 'Open Door', iconName: 'key-outline', route: '/(services)/door', Icon: Key },
  { label: 'House Keeping', iconName: 'sparkles-outline', route: '/(services)/housekeeping', Icon: Sparkles },
  { label: 'Wake-up Call', iconName: 'alarm-outline', route: '/(services)/wakeup', Icon: Clock },
  { label: 'Toiletries', iconName: 'flask-outline', route: '/(services)/toiletries', Icon: Droplets },
  { label: 'Food', iconName: 'fast-food-outline', route: '/(services)/food', Icon: Utensils },
  { label: 'Laundry', iconName: 'shirt-outline', route: '/(services)/laundry', Icon: Shirt },
  { label: 'Maintenance', iconName: 'hammer-outline', route: '/(services)/maintenance', Icon: Hammer },
  { label: 'Spa Service', iconName: 'leaf-outline', route: '/(services)/spa', Icon: Flower2 },
]

const EMPTY_FORM = { name: '', icon: 'Wifi', description: '', category: 'General', options: [] as any[] }
const EMPTY_SERVICE_FORM = { name: '', iconName: 'key-outline', iconUrl: '', route: '', isActive: true, order: 0, options: [] as any[] }

export default function AmenitiesPage() {
  const { data: session } = useSession()
  const [amenities, setAmenities] = useState<any[]>([])
  const [dashboardServices, setDashboardServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [serviceFormData, setServiceFormData] = useState({ ...EMPTY_SERVICE_FORM })
  const [saving, setSaving] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const [iconCategoryFilter, setIconCategoryFilter] = useState('All')

  const getPropertyId = () => {
    if (session?.user?.role !== 'SUPER_ADMIN') return session?.user?.propertyId ?? null
    return getAdminContext().propertyId
  }

  const fetchAmenities = async () => {
    try {
      const pid = getPropertyId()
      const [amenRes, servRes] = await Promise.all([
        fetch(`/api/admin/content/amenities?propertyId=${pid}`),
        fetch(`/api/admin/content/dashboard-services?propertyId=${pid}`)
      ])
      
      if (amenRes.ok) {
        const json = await amenRes.json()
        setAmenities(Array.isArray(json) ? json : (json?.data ?? []))
      }
      if (servRes.ok) {
        const json = await servRes.json()
        setDashboardServices(Array.isArray(json) ? json : (json?.data ?? []))
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { if (session) fetchAmenities() }, [session])

  const openAdd = () => {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM })
    setIconSearch('')
    setIconCategoryFilter('All')
    setShowForm(true)
  }

  const openEdit = (amenity: any) => {
    setEditingId(amenity.id)
    setFormData({
      name: amenity.name,
      icon: amenity.icon || 'Wifi',
      description: amenity.description || '',
      category: amenity.category || 'General',
      options: Array.isArray(amenity.options) ? amenity.options : [],
    })
    setIconSearch('')
    setIconCategoryFilter('All')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return toast.error('Name is required')
    const propertyId = getPropertyId()
    if (!propertyId || propertyId === 'ALL') return toast.error('Select a hotel first')

    setSaving(true)
    try {
      const url = editingId
        ? `/api/admin/content/amenities?id=${editingId}`
        : '/api/admin/content/amenities'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, propertyId }),
      })

      if (res.ok) {
        toast.success(editingId ? 'Amenity updated' : 'Amenity added')
        fetchAmenities()
        setShowForm(false)
        setEditingId(null)
        setFormData({ ...EMPTY_FORM })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? 'Failed to save')
      }
    } catch { toast.error('Connection error') } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this amenity?')) return
    try {
      const res = await fetch(`/api/admin/content/amenities?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Amenity removed')
        setAmenities(prev => prev.filter(a => a.id !== id))
        if (editingId === id) { setShowForm(false); setEditingId(null) }
      } else toast.error('Failed to delete')
    } catch { toast.error('Error deleting') }
  }

  // ── Dashboard Service Handlers ──
  const openAddService = () => {
    setEditingId(null)
    setServiceFormData({ ...EMPTY_SERVICE_FORM })
    setShowServiceForm(true)
  }

  const openEditService = (service: any) => {
    setEditingId(service.id)
    setServiceFormData({
      name: service.name,
      iconName: service.iconName || 'key-outline',
      iconUrl: service.iconUrl || '',
      route: service.route || '',
      isActive: service.isActive ?? true,
      order: service.order ?? 0,
      options: Array.isArray(service.options) ? service.options : [],
    })
    setShowServiceForm(true)
  }

  const handleServiceSubmit = async () => {
    if (!serviceFormData.name.trim()) return toast.error('Name is required')
    const propertyId = getPropertyId()
    if (!propertyId || propertyId === 'ALL') return toast.error('Select a hotel first')

    setSaving(true)
    try {
      const url = editingId
        ? `/api/admin/content/dashboard-services?id=${editingId}`
        : '/api/admin/content/dashboard-services'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...serviceFormData, propertyId }),
      })

      if (res.ok) {
        toast.success(editingId ? 'Service updated' : 'Service added')
        fetchAmenities()
        setShowServiceForm(false)
        setEditingId(null)
      } else {
        toast.error('Failed to save')
      }
    } catch { toast.error('Connection error') } finally { setSaving(false) }
  }

  const handleServiceDelete = async (id: string) => {
    if (!confirm('Delete this service icon?')) return
    try {
      const res = await fetch(`/api/admin/content/dashboard-services?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Service removed')
        setDashboardServices(prev => prev.filter(s => s.id !== id))
      } else toast.error('Failed to delete')
    } catch { toast.error('Error') }
  }

  // Filtered icon options for the picker
  const iconCategories = ['All', ...Array.from(new Set(ICON_OPTIONS.map(o => o.category)))]
  const filteredIcons = ICON_OPTIONS.filter(o => {
    const matchCat = iconCategoryFilter === 'All' || o.category === iconCategoryFilter
    const matchSearch = !iconSearch || o.label.toLowerCase().includes(iconSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const selectedIconOption = ICON_OPTIONS.find(o => o.value === formData.icon)
  const SelectedIcon = ICON_MAP[formData.icon] || Wifi

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Amenities</h1>
          <p className="text-text-secondary mt-0.5 text-sm">Manage hotel features and services</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openAdd}>
          Add Amenity
        </Button>
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              {editingId ? 'Edit Amenity' : 'Add New Amenity'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} className="p-1.5 hover:bg-surface-light rounded-lg transition-colors">
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Amenity Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                placeholder="e.g. Free WiFi, Swimming Pool"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-text-secondary block">Description (optional)</label>
              <input
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                placeholder="Brief description of this amenity"
              />
            </div>
          </div>

          {/* Icon Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">Icon</label>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <SelectedIcon className="w-4 h-4 text-primary" />
                <span className="text-white font-medium">{selectedIconOption?.label ?? formData.icon}</span>
              </div>
            </div>

            {/* Search + category filter */}
            <div className="flex gap-2">
              <input
                value={iconSearch}
                onChange={e => setIconSearch(e.target.value)}
                placeholder="Search icons..."
                className="flex-1 bg-surface-light border border-border rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
              />
              <select
                value={iconCategoryFilter}
                onChange={e => setIconCategoryFilter(e.target.value)}
                className="bg-surface-light border border-border rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
              >
                {iconCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Icon grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
              {filteredIcons.map(opt => {
                const Ic = opt.icon
                const isSelected = formData.icon === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setFormData(p => ({ ...p, icon: opt.value }))}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'bg-surface-light border-border text-text-secondary hover:border-primary/40 hover:text-white'
                    )}
                  >
                    <Ic className="w-4 h-4" />
                    <span className="text-[8px] leading-tight text-center line-clamp-1 w-full">{opt.label.split(' ')[0]}</span>
                  </button>
                )
              })}
              {filteredIcons.length === 0 && (
                <div className="col-span-full text-center py-4 text-xs text-text-tertiary">No icons found</div>
              )}
            </div>
          </div>

          {/* Dynamic Options Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Service Options</h4>
                <p className="text-[10px] text-text-secondary uppercase tracking-widest mt-0.5">Add sub-services or variations (e.g. types of massage or laundry)</p>
              </div>
              <Button 
                type="button"
                variant="secondary" 
                size="sm" 
                leftIcon={<Plus className="w-3 h-3" />}
                onClick={() => setFormData(p => ({ ...p, options: [...p.options, { id: Date.now().toString(), label: '', price: 0 }] }))}
              >
                Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {formData.options.map((opt: any, idx: number) => (
                <div key={opt.id || idx} className="flex gap-3 items-end animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Option Name</label>
                    <input
                      value={opt.label}
                      onChange={e => {
                        const newOpts = [...formData.options]
                        newOpts[idx].label = e.target.value
                        setFormData(p => ({ ...p, options: newOpts }))
                      }}
                      className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                      placeholder="e.g. Full Body Massage"
                    />
                  </div>
                  <div className="w-32 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Price (₹)</label>
                    <input
                      type="number"
                      value={opt.price}
                      onChange={e => {
                        const newOpts = [...formData.options]
                        newOpts[idx].price = Number(e.target.value)
                        setFormData(p => ({ ...p, options: newOpts }))
                      }}
                      className="w-full bg-surface-light border border-border rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, options: p.options.filter((_: any, i: number) => i !== idx) }))}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all mb-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {formData.options.length === 0 && (
                <div className="text-center py-6 bg-surface-light/50 border border-dashed border-border rounded-2xl">
                   <p className="text-[11px] text-text-tertiary uppercase tracking-widest">No custom options added yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSubmit} leftIcon={<Save className="w-4 h-4" />}>
              {editingId ? 'Update Amenity' : 'Save Amenity'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Amenities Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : amenities.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border rounded-2xl">
          <Sparkles className="w-10 h-10 text-text-tertiary mx-auto mb-3 opacity-40" />
          <p className="text-text-secondary text-sm">No amenities yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {amenities.map(amenity => {
            const Icon = ICON_MAP[amenity.icon] || Wifi
            const catColor = CATEGORY_COLORS[amenity.category] ?? CATEGORY_COLORS['General']
            const iconBg = ICON_BG[amenity.category] ?? ICON_BG['General']

            return (
              <div
                key={amenity.id}
                className="group relative bg-surface border border-border rounded-2xl p-4 hover:border-primary/30 transition-all hover:-translate-y-0.5"
              >
                {/* Action buttons — visible on hover */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => openEdit(amenity)}
                    className="p-1.5 bg-surface-light hover:bg-primary/20 hover:text-primary border border-border rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-text-secondary group-hover:text-primary" />
                  </button>
                  <button
                    onClick={() => handleDelete(amenity.id)}
                    className="p-1.5 bg-surface-light hover:bg-red-500/20 hover:text-red-400 border border-border rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-text-secondary" />
                  </button>
                </div>

                {/* Icon */}
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', iconBg)}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Name */}
                <h3 className="font-semibold text-white text-sm leading-tight mb-1 pr-12">{amenity.name}</h3>

                {/* Category badge */}
                <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', catColor)}>
                  {amenity.category}
                </span>

                {/* Description */}
                {amenity.description && (
                  <p className="text-xs text-text-tertiary mt-2 line-clamp-2 leading-relaxed">{amenity.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="h-px bg-white/[0.06] my-8" />

      {/* ── DASHBOARD SERVICES SECTION ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
             <Smartphone className="w-5 h-5 text-blue-400" />
             Dashboard Quick Actions
          </h2>
          <p className="text-text-secondary mt-0.5 text-xs">These icons appear on the mobile guest app home page</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddService}>
          Add Quick Action
        </Button>
      </div>

      {showServiceForm && (
        <div className="bg-[#182433] border border-white/[0.1] rounded-2xl p-6 mb-8 space-y-5 animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {editingId ? 'Edit Quick Action' : 'Add New Quick Action'}
              </h3>
              <button onClick={() => setShowServiceForm(false)} className="p-1.5 hover:bg-white/[0.05] rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
           </div>

           <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Display Name</label>
                      <input 
                        value={serviceFormData.name} 
                        onChange={e => setServiceFormData(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-[#0d141d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                        placeholder="e.g. Open Door"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">App Route</label>
                      <input 
                        value={serviceFormData.route} 
                        onChange={e => setServiceFormData(p => ({ ...p, route: e.target.value }))}
                        className="w-full bg-[#0d141d] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                        placeholder="e.g. /(services)/door"
                      />
                  </div>
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Choose Service Icon</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {DASHBOARD_ICON_OPTIONS.map(opt => (
                        <button
                          key={opt.iconName}
                          type="button"
                          onClick={() => setServiceFormData(p => ({ ...p, name: opt.label, iconName: opt.iconName, route: opt.route }))}
                          className={cn(
                            "flex flex-col items-center justify-center gap-3 px-4 py-5 rounded-2xl border text-sm font-semibold transition-all group",
                            serviceFormData.iconName === opt.iconName 
                              ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                              : "bg-[#0d141d] border-white/[0.06] text-gray-500 hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "p-2.5 rounded-xl transition-all",
                            serviceFormData.iconName === opt.iconName ? "bg-blue-500 text-white" : "bg-white/[0.03] group-hover:bg-white/[0.08]"
                          )}>
                             <opt.Icon className="w-5 h-5" />
                          </div>
                          {opt.label}
                        </button>
                      ))}
                  </div>
              </div>

              {/* Dynamic Options for Dashboard Services */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Service Options</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Add specific items or treatments for this quick action</p>
                  </div>
                  <Button 
                    type="button"
                    variant="secondary" 
                    size="sm" 
                    leftIcon={<Plus className="w-3 h-3" />}
                    onClick={() => setServiceFormData(p => ({ ...p, options: [...p.options, { id: Date.now().toString(), label: '', price: 0 }] }))}
                  >
                    Add Option
                  </Button>
                </div>

                <div className="space-y-3">
                  {serviceFormData.options.map((opt: any, idx: number) => (
                    <div key={opt.id || idx} className="flex gap-3 items-end animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Option Name</label>
                        <input
                          value={opt.label}
                          onChange={e => {
                            const newOpts = [...serviceFormData.options]
                            newOpts[idx].label = e.target.value
                            setServiceFormData(p => ({ ...p, options: newOpts }))
                          }}
                          className="w-full bg-[#0d141d] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                          placeholder="e.g. Full Body Massage"
                        />
                      </div>
                      <div className="w-32 space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Price (₹)</label>
                        <input
                          type="number"
                          value={opt.price}
                          onChange={e => {
                            const newOpts = [...serviceFormData.options]
                            newOpts[idx].price = Number(e.target.value)
                            setServiceFormData(p => ({ ...p, options: newOpts }))
                          }}
                          className="w-full bg-[#0d141d] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                          placeholder="0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setServiceFormData(p => ({ ...p, options: p.options.filter((_: any, i: number) => i !== idx) }))}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all mb-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {serviceFormData.options.length === 0 && (
                    <div className="text-center py-6 bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl">
                       <p className="text-[11px] text-gray-500 uppercase tracking-widest">No custom options added yet</p>
                    </div>
                  )}
                </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowServiceForm(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={handleServiceSubmit} leftIcon={<Rocket className="w-4 h-4" />}>
                {editingId ? 'Update Service' : 'Activate Service'}
              </Button>
           </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-light rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : dashboardServices.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
          <LayoutGrid className="w-10 h-10 text-gray-700 mx-auto mb-3 opacity-40" />
          <p className="text-gray-500 text-sm">No quick actions configured for the mobile app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {dashboardServices.map(service => {
            const IconComponent = DASHBOARD_ICON_OPTIONS.find(o => o.iconName === service.iconName)?.Icon || Smartphone;
            return (
              <div key={service.id} className="group relative bg-[#182433] border border-white/[0.08] rounded-2xl p-5 text-center hover:border-blue-500/40 transition-all hover:-translate-y-1">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => openEditService(service)} className="p-1.5 bg-[#0d141d] rounded-lg text-gray-500 hover:text-white"><Edit2 className="w-3 h-3" /></button>
                     <button onClick={() => handleServiceDelete(service.id)} className="p-1.5 bg-[#0d141d] rounded-lg text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                  </div>

                  <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3 shadow-xl">
                     <IconComponent className="w-7 h-7 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-0.5">{service.name}</h4>
                  <p className="text-[10px] text-gray-500 truncate px-2 mb-1">{service.route}</p>
                  {service.options && Array.isArray(service.options) && service.options.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {service.options.length} Options Set
                      </span>
                    </div>
                  )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
