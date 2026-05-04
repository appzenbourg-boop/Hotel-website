'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
    Search, MessageSquare, Clock, CheckCircle2, AlertCircle,
    Send, User, Building, ArrowLeft, Users, Loader2,
    RefreshCw, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

const ROLE_LABEL: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    HOTEL_ADMIN: 'Hotel Admin',
    MANAGER: 'Manager',
    RECEPTIONIST: 'Receptionist',
    STAFF: 'Staff',
}
const ROLE_COLOR: Record<string, string> = {
    SUPER_ADMIN: 'text-purple-400 bg-purple-400/10',
    HOTEL_ADMIN: 'text-blue-400 bg-blue-400/10',
    MANAGER: 'text-amber-400 bg-amber-400/10',
    RECEPTIONIST: 'text-emerald-400 bg-emerald-400/10',
    STAFF: 'text-slate-400 bg-slate-400/10',
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-text-secondary animate-pulse">Loading...</div>}>
            <SupportPageInner />
        </Suspense>
    )
}

function SupportPageInner() {
    const { data: session } = useSession()
    const searchParams = useSearchParams()
    const [tab, setTab] = useState<'TICKETS' | 'MESSAGES'>('TICKETS')

    // ── Guest Tickets ──────────────────────────────────────────────────────────
    const [tickets, setTickets] = useState<any[]>([])
    const [selectedTicket, setSelectedTicket] = useState<any>(null)
    const [ticketMsg, setTicketMsg] = useState('')
    const [ticketsLoading, setTicketsLoading] = useState(true)
    const [sendingTicket, setSendingTicket] = useState(false)
    const [ticketSearch, setTicketSearch] = useState('')

    const fetchTickets = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/support')
            if (res.ok) {
                const data = await res.json()
                if (data.success) {
                    setTickets(data.tickets)
                    if (selectedTicket) {
                        const updated = data.tickets.find((t: any) => t.id === selectedTicket.id)
                        if (updated) setSelectedTicket(updated)
                    }
                }
            }
        } catch { /* silent */ } finally { setTicketsLoading(false) }
    }, [selectedTicket])

    const sendTicketReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ticketMsg.trim() || !selectedTicket || sendingTicket) return
        setSendingTicket(true)
        try {
            const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: ticketMsg }),
            })
            if (res.ok) { setTicketMsg(''); fetchTickets() }
            else toast.error('Failed to send')
        } catch { toast.error('Error') } finally { setSendingTicket(false) }
    }

    const updateTicketStatus = async (status: string) => {
        if (!selectedTicket) return
        try {
            const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            })
            if (res.ok) { toast.success(`Ticket ${status.toLowerCase()}`); fetchTickets() }
        } catch { toast.error('Failed') }
    }

    // ── Internal Messages ──────────────────────────────────────────────────────
    const [contacts, setContacts] = useState<any[]>([])
    const [selectedContact, setSelectedContact] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [msgText, setMsgText] = useState('')
    const [contactsLoading, setContactsLoading] = useState(true)
    const [sendingMsg, setSendingMsg] = useState(false)
    const [contactSearch, setContactSearch] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const fetchContacts = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/messages')
            if (res.ok) {
                const data = await res.json()
                if (data.success) setContacts(data.contacts)
            }
        } catch { /* silent */ } finally { setContactsLoading(false) }
    }, [])

    const fetchMessages = useCallback(async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/messages?withUserId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                if (data.success) {
                    setMessages(data.messages)
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
                }
            }
        } catch { /* silent */ }
    }, [])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!msgText.trim() || !selectedContact || sendingMsg) return
        setSendingMsg(true)
        try {
            const res = await fetch('/api/admin/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId: selectedContact.id, content: msgText }),
            })
            if (res.ok) {
                setMsgText('')
                fetchMessages(selectedContact.id)
                fetchContacts()
            } else toast.error('Failed to send')
        } catch { toast.error('Error') } finally { setSendingMsg(false) }
    }

    // Initial load + polling
    useEffect(() => {
        fetchTickets()
        fetchContacts()
        const t1 = setInterval(fetchTickets, 15000)
        return () => clearInterval(t1)
    }, [])

    // Handle ?tab=messages&withUserId= from dashboard message button
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        const withUserId = searchParams.get('withUserId')

        if (tabParam === 'messages') {
            setTab('MESSAGES')
        }

        if (withUserId && contacts.length > 0) {
            const contact = contacts.find((c: any) => c.id === withUserId)
            if (contact) {
                setSelectedContact(contact)
            }
        }
    }, [searchParams, contacts])

    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.id)
            const t = setInterval(() => fetchMessages(selectedContact.id), 5000)
            return () => clearInterval(t)
        }
    }, [selectedContact, fetchMessages])

    const filteredTickets = tickets.filter(t =>
        t.subject?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.guest?.name?.toLowerCase().includes(ticketSearch.toLowerCase())
    )
    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
        ROLE_LABEL[c.role]?.toLowerCase().includes(contactSearch.toLowerCase())
    )

    const getStatusIcon = (status: string) => {
        if (status === 'OPEN') return <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        if (status === 'IN_PROGRESS') return <Clock className="w-3.5 h-3.5 text-amber-400" />
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    }

    return (
        <div className="flex flex-col h-[calc(100vh-7rem)] animate-fade-in">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 mb-4 bg-surface-light border border-border rounded-xl p-1 w-fit">
                <button
                    onClick={() => setTab('TICKETS')}
                    className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        tab === 'TICKETS' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-white'
                    )}
                >
                    <MessageSquare className="w-4 h-4" /> Guest Tickets
                    {tickets.filter(t => t.status === 'OPEN').length > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {tickets.filter(t => t.status === 'OPEN').length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('MESSAGES')}
                    className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        tab === 'MESSAGES' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-white'
                    )}
                >
                    <Users className="w-4 h-4" /> Team Messages
                    {contacts.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0) > 0 && (
                        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {contacts.reduce((s: number, c: any) => s + (c.unreadCount || 0), 0)}
                        </span>
                    )}
                </button>
            </div>

            {/* ── GUEST TICKETS TAB ── */}
            {tab === 'TICKETS' && (
                <div className="flex flex-1 bg-surface border border-border rounded-2xl overflow-hidden min-h-0">
                    {/* Sidebar */}
                    <div className={cn('w-full md:w-[320px] border-r border-border flex flex-col shrink-0', selectedTicket && 'hidden md:flex')}>
                        <div className="p-4 border-b border-border space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-white">Guest Tickets</h2>
                                <button onClick={fetchTickets} className="p-1.5 hover:bg-surface-light rounded-lg transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5 text-text-tertiary" />
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                                <input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)}
                                    placeholder="Search tickets..."
                                    className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-border">
                            {ticketsLoading ? (
                                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="py-12 text-center text-text-tertiary text-sm">No tickets found</div>
                            ) : filteredTickets.map(ticket => (
                                <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                                    className={cn('w-full p-4 text-left transition-colors relative',
                                        selectedTicket?.id === ticket.id ? 'bg-primary/5' : 'hover:bg-surface-light'
                                    )}>
                                    {selectedTicket?.id === ticket.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold text-primary uppercase">{ticket.type}</span>
                                        <span className="text-[10px] text-text-tertiary">{format(new Date(ticket.createdAt), 'MMM d')}</span>
                                    </div>
                                    <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {getStatusIcon(ticket.status)}
                                        <span className="text-xs text-text-secondary">{ticket.guest?.name || 'Guest'}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ticket Chat */}
                    <div className={cn('flex-1 flex flex-col min-w-0', !selectedTicket && 'hidden md:flex items-center justify-center')}>
                        {!selectedTicket ? (
                            <div className="text-center p-8">
                                <div className="w-14 h-14 bg-surface-light rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                                    <MessageSquare className="w-7 h-7 text-text-tertiary" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-1">Select a ticket</h3>
                                <p className="text-text-secondary text-sm">Choose a guest query to respond</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-border flex items-center justify-between bg-surface-light/50">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setSelectedTicket(null)} className="md:hidden p-1.5 text-text-secondary">
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{selectedTicket.subject}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-text-secondary flex items-center gap-1">
                                                    <User className="w-3 h-3" />{selectedTicket.guest?.name}
                                                </span>
                                                {selectedTicket.property && (
                                                    <span className="text-[10px] text-primary flex items-center gap-1">
                                                        <Building className="w-3 h-3" />{selectedTicket.property.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <select value={selectedTicket.status} onChange={e => updateTicketStatus(e.target.value)}
                                        className="bg-surface border border-border text-xs text-text-secondary rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary">
                                        <option value="OPEN">Open</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="RESOLVED">Resolved</option>
                                        <option value="CLOSED">Closed</option>
                                    </select>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {selectedTicket.messages?.map((msg: any) => {
                                        const isGuest = msg.senderRole === 'GUEST'
                                        return (
                                            <div key={msg.id} className={cn('flex flex-col max-w-[75%]', isGuest ? 'items-start' : 'items-end ml-auto')}>
                                                <div className={cn('px-4 py-2.5 rounded-2xl text-sm',
                                                    isGuest ? 'bg-surface-light border border-border rounded-tl-none text-white' : 'bg-primary text-white rounded-tr-none'
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-text-tertiary mt-1 px-1">
                                                    {isGuest ? selectedTicket.guest?.name : 'You'} · {format(new Date(msg.createdAt), 'p')}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="p-4 border-t border-border">
                                    <form onSubmit={sendTicketReply} className="flex gap-2">
                                        <input value={ticketMsg} onChange={e => setTicketMsg(e.target.value)}
                                            placeholder="Type your reply..."
                                            className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none" />
                                        <button type="submit" disabled={!ticketMsg.trim() || sendingTicket}
                                            className="p-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all">
                                            {sendingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── TEAM MESSAGES TAB ── */}
            {tab === 'MESSAGES' && (
                <div className="flex flex-1 bg-surface border border-border rounded-2xl overflow-hidden min-h-0">
                    {/* Contacts sidebar */}
                    <div className={cn('w-full md:w-[280px] border-r border-border flex flex-col shrink-0', selectedContact && 'hidden md:flex')}>
                        <div className="p-4 border-b border-border space-y-3">
                            <h2 className="text-sm font-semibold text-white">Team</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                    placeholder="Search staff..."
                                    className="w-full pl-9 pr-4 py-2 bg-surface-light border border-border rounded-xl text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-border">
                            {contactsLoading ? (
                                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                            ) : filteredContacts.length === 0 ? (
                                <div className="py-12 text-center text-text-tertiary text-sm">No team members found</div>
                            ) : filteredContacts.map(contact => (
                                <button key={contact.id}
                                    onClick={() => { setSelectedContact(contact); fetchMessages(contact.id) }}
                                    className={cn('w-full p-4 text-left transition-colors flex items-center gap-3 relative',
                                        selectedContact?.id === contact.id ? 'bg-primary/5' : 'hover:bg-surface-light'
                                    )}>
                                    {selectedContact?.id === contact.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                                    <div className="w-9 h-9 rounded-full bg-surface-light border border-border flex items-center justify-center shrink-0 text-sm font-bold text-text-secondary">
                                        {contact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold text-white truncate">{contact.name}</p>
                                            {contact.unreadCount > 0 && (
                                                <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                                                    {contact.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_COLOR[contact.role] ?? 'text-slate-400 bg-slate-400/10')}>
                                                {ROLE_LABEL[contact.role] ?? contact.role}
                                            </span>
                                        </div>
                                        {contact.lastMessage && (
                                            <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                                                {contact.lastMessage.senderId === session?.user?.id ? 'You: ' : ''}{contact.lastMessage.content}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message thread */}
                    <div className={cn('flex-1 flex flex-col min-w-0', !selectedContact && 'hidden md:flex items-center justify-center')}>
                        {!selectedContact ? (
                            <div className="text-center p-8">
                                <div className="w-14 h-14 bg-surface-light rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                                    <Users className="w-7 h-7 text-text-tertiary" />
                                </div>
                                <h3 className="text-base font-semibold text-white mb-1">Message your team</h3>
                                <p className="text-text-secondary text-sm">Select a staff member or admin to start a conversation</p>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="p-4 border-b border-border flex items-center gap-3 bg-surface-light/50">
                                    <button onClick={() => setSelectedContact(null)} className="md:hidden p-1.5 text-text-secondary">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="w-9 h-9 rounded-full bg-surface-light border border-border flex items-center justify-center text-sm font-bold text-text-secondary shrink-0">
                                        {selectedContact.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{selectedContact.name}</p>
                                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', ROLE_COLOR[selectedContact.role] ?? 'text-slate-400 bg-slate-400/10')}>
                                            {ROLE_LABEL[selectedContact.role] ?? selectedContact.role}
                                        </span>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {messages.length === 0 ? (
                                        <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                                            No messages yet. Say hello!
                                        </div>
                                    ) : messages.map((msg: any) => {
                                        const isMe = msg.senderId === session?.user?.id
                                        return (
                                            <div key={msg.id} className={cn('flex flex-col max-w-[75%]', isMe ? 'items-end ml-auto' : 'items-start')}>
                                                <div className={cn('px-4 py-2.5 rounded-2xl text-sm',
                                                    isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-surface-light border border-border text-white rounded-tl-none'
                                                )}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] text-text-tertiary mt-1 px-1">
                                                    {isMe ? 'You' : selectedContact.name} · {format(new Date(msg.createdAt), 'p')}
                                                </span>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-border">
                                    <form onSubmit={sendMessage} className="flex gap-2">
                                        <input value={msgText} onChange={e => setMsgText(e.target.value)}
                                            placeholder={`Message ${selectedContact.name}...`}
                                            className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-text-tertiary focus:ring-1 focus:ring-primary outline-none" />
                                        <button type="submit" disabled={!msgText.trim() || sendingMsg}
                                            className="p-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all">
                                            {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
