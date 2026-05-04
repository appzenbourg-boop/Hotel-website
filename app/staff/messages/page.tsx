'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    ChevronLeft, Search, Send, CheckCheck,
    Loader2, MessageCircle, Zap, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

export default function MessagesPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [messages, setMessages] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState('All')
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const myUserId = session?.user?.id

    // ── Fetch messages ────────────────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const res = await fetch('/api/staff/messages')
            if (res.ok) {
                const json = await res.json()
                setMessages(Array.isArray(json) ? json : [])
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, 10000)
        return () => clearInterval(interval)
    }, [fetchMessages])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, selectedConversation])

    // ── Group messages into conversations ─────────────────────────────────────
    const conversations = useMemo(() => {
        const groups: Record<string, any[]> = {}
        messages.forEach(msg => {
            const key = msg.serviceRequestId || msg.category || 'DIRECT'
            if (!groups[key]) groups[key] = []
            groups[key].push(msg)
        })

        return Object.entries(groups).map(([id, msgs]) => {
            const sorted = [...msgs].sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            const lastMsg = sorted[sorted.length - 1]
            const serviceRequest = lastMsg.serviceRequest

            let title = 'Direct Message'
            if (serviceRequest) {
                title = `Room ${serviceRequest.room?.roomNumber || '?'} — ${serviceRequest.title}`
            } else if (id === 'TEAM') {
                title = 'Team'
            } else if (id === 'ADMIN') {
                title = 'Admin'
            } else if (id === 'CHAT') {
                title = 'Chat'
            }

            return {
                id,
                title,
                category: lastMsg.category || 'CHAT',
                messages: sorted,
                lastMessage: lastMsg,
                unreadCount: msgs.filter(m => !m.isRead && m.senderId !== myUserId).length,
                isService: !!serviceRequest,
            }
        }).sort((a, b) =>
            new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        )
    }, [messages, myUserId])

    const filteredConversations = conversations.filter(conv => {
        const matchesSearch =
            conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab =
            activeTab === 'All' ||
            (activeTab === 'Team' && (conv.category === 'TEAM' || conv.category === 'ADMIN')) ||
            (activeTab === 'Tasks' && conv.isService)
        return matchesSearch && matchesTab
    })

    // ── Mark conversation as read ─────────────────────────────────────────────
    const markConversationRead = useCallback(async (conv: any) => {
        const unreadFromOthers = conv.messages.filter(
            (m: any) => !m.isRead && m.senderId !== myUserId
        )
        if (unreadFromOthers.length === 0) return

        // Optimistically clear badge immediately
        setMessages(prev =>
            prev.map(m => {
                if (!m.isRead && m.senderId !== myUserId) {
                    const matchesService = conv.isService && m.serviceRequestId === conv.id
                    const matchesDirect = !conv.isService && m.category === conv.category
                    if (matchesService || matchesDirect) return { ...m, isRead: true }
                }
                return m
            })
        )

        try {
            const body: any = {}
            if (conv.isService) {
                body.serviceRequestId = conv.id
            } else {
                const senderId = unreadFromOthers[0]?.senderId
                if (senderId) body.senderId = senderId
                body.category = conv.category
            }
            await fetch('/api/staff/messages', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
        } catch { /* non-critical */ }
    }, [myUserId])

    // ── Send reply ────────────────────────────────────────────────────────────
    const handleSendReply = async () => {
        if (!replyContent.trim() || !selectedConversation || sending) return
        setSending(true)

        const conv = conversations.find(c => c.id === selectedConversation)
        const otherMsg = conv?.messages.find((m: any) => m.senderId !== myUserId)
        const receiverId = otherMsg?.senderId || null

        try {
            const res = await fetch('/api/staff/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId,
                    category: conv?.category || 'CHAT',
                    serviceRequestId: conv?.isService ? selectedConversation : undefined,
                    content: replyContent,
                    type: 'TEXT',
                }),
            })
            if (res.ok) {
                setReplyContent('')
                fetchMessages()
            } else {
                toast.error('Failed to send message')
            }
        } catch {
            toast.error('Connection error')
        } finally {
            setSending(false)
        }
    }

    // ── Open conversation ─────────────────────────────────────────────────────
    const openConversation = useCallback((conv: any) => {
        setSelectedConversation(conv.id)
        markConversationRead(conv)
    }, [markConversationRead])

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-xs text-gray-500">Loading messages...</p>
        </div>
    )

    // ── Conversation view ─────────────────────────────────────────────────────
    if (selectedConversation) {
        const conversation = conversations.find(c => c.id === selectedConversation)

        return (
            // Fixed full-screen overlay — sits above the bottom nav
            <div className="fixed top-16 bottom-[104px] left-0 right-0 bg-[#0d1117] z-[60] flex flex-col animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="px-4 py-3 bg-[#161b22] border-b border-white/[0.05] flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => setSelectedConversation(null)}
                        className="p-2 bg-white/[0.04] rounded-xl text-gray-400 hover:text-white transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{conversation?.title}</h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                            {conversation?.isService ? 'Service request thread' : 'Direct message'}
                        </p>
                    </div>
                </div>

                {/* Messages — scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth custom-scrollbar bg-[#0d1117] relative">
                    {/* Background Glows */}
                    <div className="absolute top-1/4 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none rounded-full" />
                    <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] pointer-events-none rounded-full" />

                    {!conversation?.messages.length ? (
                        <div className="text-center py-12 text-gray-600 text-sm">No messages yet</div>
                    ) : conversation.messages.map((msg: any) => {
                        const isMine = msg.senderId === myUserId
                        return (
                            <div key={msg.id} className={cn('flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300', isMine ? 'items-end' : 'items-start')}>
                                {!isMine && (
                                    <p className="text-[10px] text-gray-600 mb-1 ml-1 font-medium">
                                        {msg.senderName || 'Admin'}
                                    </p>
                                )}
                                <div className={cn(
                                    'max-w-[85%] px-4 py-3 rounded-[22px] text-sm leading-relaxed shadow-lg',
                                    isMine
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-blue-500/10'
                                        : 'bg-[#161b22] text-white border border-white/[0.08] rounded-tl-none shadow-black/20'
                                )}>
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                    <span className="text-[10px] text-gray-700">
                                        {format(new Date(msg.createdAt), 'HH:mm')}
                                    </span>
                                    {isMine && <CheckCheck className="w-3 h-3 text-blue-400 opacity-60" />}
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input bar — fixed to bottom, above bottom nav */}
                <div className="shrink-0 px-4 py-4 bg-[#0d1117]/80 backdrop-blur-xl border-t border-white/[0.05] z-10">
                    <div className="flex gap-3 items-center bg-[#161b22] border border-white/[0.08] rounded-2xl px-4 py-2 shadow-2xl shadow-black/50 focus-within:border-blue-500/50 transition-all">
                        <input
                            type="text"
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-gray-700 py-2.5"
                        />
                        <button
                            onClick={handleSendReply}
                            disabled={sending || !replyContent.trim()}
                            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all active:scale-95 shrink-0"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Conversation list ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-gray-500 hover:text-white transition-all"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-white">Messages</h1>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                    <MessageCircle className="w-4 h-4" />
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#161b22] border border-white/[0.05] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/40 transition-all placeholder:text-gray-700"
                />
            </div>

            {/* Tabs */}
            <div className="flex bg-[#161b22] p-1 rounded-2xl border border-white/[0.05]">
                {['All', 'Team', 'Tasks'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all',
                            activeTab === tab
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredConversations.length === 0 ? (
                    <div className="py-16 text-center">
                        <MessageCircle className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">No messages yet</p>
                    </div>
                ) : filteredConversations.map(conv => (
                    <div
                        key={conv.id}
                        onClick={() => openConversation(conv)}
                        className="group bg-[#161b22] border border-white/[0.04] p-4 rounded-[28px] flex items-center gap-4 cursor-pointer hover:bg-white/[0.03] hover:border-white/[0.08] transition-all active:scale-[0.98] shadow-sm hover:shadow-xl hover:shadow-black/20"
                    >
                        <div className="relative shrink-0">
                            <div className={cn(
                                'w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black border transition-transform group-hover:scale-105',
                                conv.category === 'ADMIN' || conv.category === 'TEAM'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5'
                                    : conv.isService
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5'
                                    : 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-lg shadow-blue-500/5'
                            )}>
                                {conv.isService ? <Zap className="w-6 h-6 fill-current opacity-80" /> : conv.title.charAt(0).toUpperCase()}
                            </div>
                            {conv.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center border-[3px] border-[#0d1117] shadow-lg shadow-blue-600/40">
                                    {conv.unreadCount}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-semibold text-white truncate pr-2">{conv.title}</h4>
                                <span className="text-[10px] text-gray-600 shrink-0">
                                    {format(new Date(conv.lastMessage.createdAt), 'HH:mm')}
                                </span>
                            </div>
                            <p className={cn(
                                'text-xs truncate',
                                conv.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-600'
                            )}>
                                {conv.lastMessage.senderId === myUserId ? 'You: ' : ''}
                                {conv.lastMessage.content}
                            </p>
                        </div>

                        <ArrowRight className="w-4 h-4 text-gray-700 shrink-0" />
                    </div>
                ))}
            </div>

            {/* Reminder */}
            <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 text-center">
                <p className="text-xs text-blue-400/60 font-medium">
                    Respond to guest requests within 3 mins · Team messages within 15 mins
                </p>
            </div>
        </div>
    )
}
