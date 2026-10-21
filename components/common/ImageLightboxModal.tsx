'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
    X, ZoomIn, ZoomOut, RotateCw, Download,
    ExternalLink, ChevronLeft, ChevronRight, Maximize2, Minimize2
} from 'lucide-react'

export interface LightboxImage {
    url: string
    label: string
    type?: string
}

interface ImageLightboxModalProps {
    isOpen: boolean
    onClose: () => void
    images: LightboxImage[]
    initialIndex?: number
    title?: string
    subtitle?: string
    onReplace?: (index: number) => void
}

export default function ImageLightboxModal({
    isOpen,
    onClose,
    images,
    initialIndex = 0,
    title = 'Document Viewer',
    subtitle,
    onReplace
}: ImageLightboxModalProps) {
    const validImages = images.filter(img => Boolean(img.url))
    const [currentIndex, setCurrentIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)

    // Sync initialIndex when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(Math.min(initialIndex, Math.max(0, validImages.length - 1)))
            setZoom(1)
            setRotation(0)
        }
    }, [isOpen, initialIndex, validImages.length])

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return
        if (e.key === 'Escape') onClose()
        else if (e.key === 'ArrowRight' && validImages.length > 1) {
            setCurrentIndex(prev => (prev + 1) % validImages.length)
            setZoom(1)
            setRotation(0)
        } else if (e.key === 'ArrowLeft' && validImages.length > 1) {
            setCurrentIndex(prev => (prev - 1 + validImages.length) % validImages.length)
            setZoom(1)
            setRotation(0)
        } else if (e.key === '+' || e.key === '=') {
            setZoom(z => Math.min(3.5, z + 0.25))
        } else if (e.key === '-') {
            setZoom(z => Math.max(0.5, z - 0.25))
        } else if (e.key.toLowerCase() === 'r') {
            setRotation(r => (r + 90) % 360)
        }
    }, [isOpen, onClose, validImages.length])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Prevent background scroll while open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = originalOverflow
            }
        }
    }, [isOpen])

    if (!isOpen || validImages.length === 0) return null

    const currentImg = validImages[currentIndex] || validImages[0]

    const handleZoomIn = () => setZoom(z => Math.min(3.5, Number((z + 0.25).toFixed(2))))
    const handleZoomOut = () => setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))
    const handleResetZoom = () => {
        setZoom(1)
        setRotation(0)
    }
    const handleRotate = () => setRotation(r => (r + 90) % 360)

    const handleDownload = () => {
        if (!currentImg?.url) return
        const link = document.createElement('a')
        link.href = currentImg.url
        link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-${currentImg.label.toLowerCase().replace(/\s+/g, '-')}.jpg`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col bg-black/95 backdrop-blur-2xl text-white animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div
                className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-white/10 shrink-0 z-10 gap-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Left: Title & Subtitle */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white tracking-tight truncate">
                            {title}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-[#4A9EFF] uppercase tracking-wider">
                            {currentImg.label}
                        </span>
                    </div>
                    {subtitle && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Center: Multi-image Side Tabs (if multiple images) */}
                {validImages.length > 1 && (
                    <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
                        {validImages.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setCurrentIndex(idx)
                                    setZoom(1)
                                    setRotation(0)
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentIndex === idx
                                        ? 'bg-[#4A9EFF] text-white shadow-md'
                                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {img.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Right: Controls & Close */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Zoom & Rotate Controls */}
                    <div className="flex items-center bg-white/10 rounded-xl border border-white/10 p-1">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            title="Zoom Out (-)"
                            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            title="Reset Zoom"
                            className="px-2 py-1 text-xs font-mono font-bold text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        >
                            {Math.round(zoom * 100)}%
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            title="Zoom In (+)"
                            className="p-1.5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleRotate}
                        title="Rotate 90° (R)"
                        className="p-2 bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors"
                    >
                        <RotateCw className="w-4 h-4" />
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        title="Download / Open Full"
                        className="p-2 bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-colors hidden sm:flex"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {onReplace && (
                        <button
                            type="button"
                            onClick={() => onReplace(currentIndex)}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 hover:text-white rounded-xl border border-white/10 transition-colors"
                        >
                            Replace
                        </button>
                    )}

                    <div className="w-[1px] h-6 bg-white/10 mx-1" />

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close (Esc)"
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-100 rounded-xl border border-red-500/30 transition-colors"
                    >
                        <X className="w-4 h-4 stroke-[2.5]" />
                    </button>
                </div>
            </div>

            {/* Main Stage */}
            <div
                className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden"
                onClick={onClose}
            >
                {/* Previous Image Arrow */}
                {validImages.length > 1 && (
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation()
                            setCurrentIndex(prev => (prev - 1 + validImages.length) % validImages.length)
                            setZoom(1)
                            setRotation(0)
                        }}
                        className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-xl"
                        title="Previous Side"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Displayed Image */}
                <div
                    className="max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ease-out cursor-default"
                    onClick={e => e.stopPropagation()}
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`
                    }}
                >
                    <img
                        src={currentImg.url}
                        alt={currentImg.label}
                        className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] border border-white/15"
                        draggable={false}
                    />
                </div>

                {/* Next Image Arrow */}
                {validImages.length > 1 && (
                    <button
                        type="button"
                        onClick={e => {
                            e.stopPropagation()
                            setCurrentIndex(prev => (prev + 1) % validImages.length)
                            setZoom(1)
                            setRotation(0)
                        }}
                        className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-95 shadow-xl"
                        title="Next Side"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* Bottom Status & Mobile Tabs Bar */}
            <div
                className="px-6 py-3 bg-black/60 border-t border-white/10 shrink-0 flex items-center justify-between text-xs text-gray-400 gap-4"
                onClick={e => e.stopPropagation()}
            >
                {/* Mobile Tabs */}
                {validImages.length > 1 && (
                    <div className="flex sm:hidden items-center gap-1 bg-white/10 p-1 rounded-xl">
                        {validImages.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setCurrentIndex(idx)
                                    setZoom(1)
                                    setRotation(0)
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentIndex === idx
                                        ? 'bg-[#4A9EFF] text-white'
                                        : 'text-gray-300'
                                }`}
                            >
                                {img.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="hidden sm:flex items-center gap-4 text-[11px] text-gray-400">
                    <span>💡 Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">Esc</kbd> to exit</span>
                    <span>•</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">+</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">-</kbd> to zoom</span>
                    <span>•</span>
                    <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">R</kbd> to rotate</span>
                    {validImages.length > 1 && (
                        <>
                            <span>•</span>
                            <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-white font-mono text-[10px]">→</kbd> to switch side</span>
                        </>
                    )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <a
                        href={currentImg.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#4A9EFF] hover:underline font-medium"
                    >
                        <span>Open original</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    )
}
