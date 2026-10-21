'use client'

import { useState, useEffect } from 'react'
import { Building2, Plus, Edit3, Trash2, Save, X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildContextUrl, getAdminContext } from '@/lib/admin-context'

export default function BanquetHallsPage() {
  const [halls, setHalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [rentPerDay, setRentPerDay] = useState('')
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState('')

  const fetchHalls = async () => {
    setLoading(true)
    const res = await fetch(buildContextUrl('/api/admin/banquet/halls'))
    const data = await res.json()
    setHalls(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchHalls() }, [])

  const resetForm = () => { setName(''); setCapacity(''); setRentPerDay(''); setDescription(''); setAmenities(''); setEditingId(null); setShowForm(false) }

  const handleEdit = (hall: any) => {
    setName(hall.name); setCapacity(String(hall.capacity || '')); setRentPerDay(String(hall.rentPerDay || ''))
    setDescription(hall.description || ''); setAmenities(hall.amenities?.join(', ') || '')
    setEditingId(hall.id); setShowForm(true)
  }

  const handleSave = async () => {
    if (!name) return toast.error('Hall name is required')
    setSaving(true)
    try {
      const { propertyId } = getAdminContext()
      const payload = {
        name,
        capacity: parseInt(capacity) || 100,
        rentPerDay: parseFloat(rentPerDay) || 0,
        description,
        amenities: amenities.split(',').map(a => a.trim()).filter(Boolean),
        propertyId: propertyId !== 'ALL' ? propertyId : undefined
      }
      const res = await fetch('/api/admin/banquet/halls', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload)
      })
      if (res.ok) { toast.success(editingId ? 'Hall updated!' : 'Hall created!'); resetForm(); fetchHalls() }
      else toast.error('Failed to save hall')
    } catch { toast.error('Error saving hall') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch('/api/admin/banquet/halls', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isActive: false }) })
    if (res.ok) { toast.success('Hall deactivated'); fetchHalls() }
    else toast.error('Failed')
  }

  const inputCls = "w-full bg-slate-50 dark:bg-black/30 border border-border/50 rounded-xl px-3 py-2.5 text-xs text-text-primary outline-none focus:border-[#4A9EFF]"
  const labelCls = "text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-1"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#4A9EFF]" /> Banquet Halls
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage your banquet halls and venues</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#4A9EFF]/20">
          <Plus className="w-4 h-4" /> Add Hall
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-surface border border-[#4A9EFF]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-text-primary">{editingId ? 'Edit Hall' : 'Add New Hall'}</h2>
            <button onClick={resetForm} className="p-1.5 hover:bg-white/10 rounded-full text-text-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2"><label className={labelCls}>Hall Name *</label><input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Royale Castle" /></div>
            <div><label className={labelCls}>Capacity (Pax)</label><input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className={inputCls} placeholder="100" /></div>
            <div><label className={labelCls}>Rent Per Day (₹)</label><input type="number" value={rentPerDay} onChange={e => setRentPerDay(e.target.value)} className={inputCls} placeholder="0" /></div>
            <div className="md:col-span-2"><label className={labelCls}>Description</label><input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="Hall description..." /></div>
            <div className="md:col-span-2"><label className={labelCls}>Amenities (comma-separated)</label><input value={amenities} onChange={e => setAmenities(e.target.value)} className={inputCls} placeholder="AC, Sound System, Projector, Dance Floor..." /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4A9EFF] hover:bg-[#4A9EFF]/80 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? 'Update' : 'Create Hall'}
            </button>
            <button onClick={resetForm} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-text-secondary text-sm font-bold rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      {/* Halls Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#4A9EFF]" /></div>
      ) : halls.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border/50 rounded-2xl">
          <Building2 className="w-12 h-12 text-text-tertiary mx-auto mb-3 opacity-50" />
          <p className="text-text-tertiary text-sm">No halls added yet. Add your first hall above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {halls.map(hall => (
            <div key={hall.id} className="bg-surface border border-border/50 rounded-2xl p-5 hover:border-[#4A9EFF]/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-black text-text-primary">{hall.name}</h3>
                  {hall.description && <p className="text-xs text-text-tertiary mt-0.5">{hall.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(hall)} className="p-1.5 hover:bg-white/10 rounded-lg text-text-secondary hover:text-amber-400"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(hall.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-text-secondary hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-100/70 dark:bg-black/20 border border-border rounded-xl p-2.5 text-center">
                  <p className="text-text-tertiary text-[9px] uppercase font-black">Capacity</p>
                  <p className="text-[#4A9EFF] font-black text-base mt-0.5">{hall.capacity}</p>
                  <p className="text-text-tertiary text-[9px]">Pax</p>
                </div>
                <div className="bg-slate-100/70 dark:bg-black/20 border border-border rounded-xl p-2.5 text-center">
                  <p className="text-text-tertiary text-[9px] uppercase font-black">Hall Rent</p>
                  <p className="text-emerald-400 font-black text-base mt-0.5">₹{(hall.rentPerDay || 0).toLocaleString()}</p>
                  <p className="text-text-tertiary text-[9px]">Per Day</p>
                </div>
              </div>
              {hall.amenities?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {hall.amenities.map((a: string) => (
                    <span key={a} className="px-2 py-0.5 bg-[#4A9EFF]/10 border border-[#4A9EFF]/20 text-[#4A9EFF] text-[9px] font-bold rounded-full">{a}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
