'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  Edit2,
  User,
  CreditCard,
  Banknote,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface ProductItem {
  id: string
  name: string
  sku?: string
  price: number
  stock: number
  unit_type?: string
}

interface CustomerItem {
  id: string
  full_name: string
  phone?: string | null
}

interface AudioPosHUDProps {
  products: any[]
  customers: any[]
  onAddItems: (items: Array<{ product: any; quantity: number }>) => void
  onSelectCustomer: (customer: any) => void
  onSetPaymentMethod: (method: string) => void
  onSetReceivedAmount: (amount: number) => void
  onClearCart: () => void
  isOpen: boolean
  onClose: () => void
}

interface ParsedVoiceProposal {
  rawTranscript: string
  action: string
  items: Array<{ product: ProductItem; quantity: number }>
  customer: CustomerItem | null
  paymentMethod: string | null
  receivedAmount: number | null
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Note 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.12, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.15)

    // Note 2 (A5 - 880 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.frequency.setValueAtTime(880, now + 0.1)
    gain2.gain.setValueAtTime(0.15, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.3)
  } catch {}
}

export default function AudioPosHUD({
  products,
  customers,
  onAddItems,
  onSelectCustomer,
  onSetPaymentMethod,
  onSetReceivedAmount,
  onClearCart,
  isOpen,
  onClose
}: AudioPosHUDProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'review'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // Confirmation / Adjustment Proposal State
  const [proposal, setProposal] = useState<ParsedVoiceProposal | null>(null)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestTranscriptRef = useRef<string>('')

  // Process text through API parser
  const processVoiceCommand = useCallback(async (text: string) => {
    const clean = text.trim()
    if (!clean) return

    setStatus('processing')
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setIsListening(false)

    try {
      const simplifiedProducts = products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stock: p.stock
      }))

      const simplifiedCustomers = customers.map(c => ({
        id: c.id,
        full_name: c.full_name,
        phone: c.phone
      }))

      const res = await fetch('/api/ai/audio-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: clean,
          products: simplifiedProducts,
          customers: simplifiedCustomers
        })
      })

      if (!res.ok) throw new Error('Error al procesar voz')
      const data = await res.json()

      // Set proposal state for user confirmation and adjustment
      setProposal({
        rawTranscript: clean,
        action: data.action || 'mixed',
        items: data.itemsToAdd || [],
        customer: data.selectedCustomer || null,
        paymentMethod: data.paymentMethod || null,
        receivedAmount: data.receivedAmount || null
      })

      setStatus('review')
    } catch (err: any) {
      console.error('Audio-POS error:', err)
      setErrorMessage('No se pudo procesar el audio. Intenta de nuevo.')
      setStatus('idle')
    }
  }, [products, customers])

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMessage('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-CO'

    recognition.onstart = () => {
      setIsListening(true)
      setStatus('listening')
      setErrorMessage(null)
    }

    recognition.onresult = (event: any) => {
      let currentText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentText += event.results[i][0].transcript
      }

      if (currentText.trim()) {
        setTranscript(currentText)
        latestTranscriptRef.current = currentText

        // Reset silence timer: auto-process after 1.5 seconds of silence
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(() => {
          if (latestTranscriptRef.current.trim()) {
            processVoiceCommand(latestTranscriptRef.current)
          }
        }, 1500)
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech error:', event.error)
      if (event.error === 'not-allowed') {
        setErrorMessage('Permiso de micrófono denegado.')
      }
      setIsListening(false)
      if (status !== 'review') setStatus('idle')
    }

    recognition.onend = () => {
      setIsListening(false)
      // If recognition ended with transcript and not reviewing, trigger processing
      if (latestTranscriptRef.current.trim() && status === 'listening') {
        processVoiceCommand(latestTranscriptRef.current)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      try { recognition.stop() } catch {}
    }
  }, [processVoiceCommand, status])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      setTranscript('')
      latestTranscriptRef.current = ''
      setProposal(null)
      setErrorMessage(null)
      recognitionRef.current.start()
    } catch {}
  }, [])

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch {}
    setIsListening(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      startListening()
    } else {
      stopListening()
      setProposal(null)
      setStatus('idle')
    }
  }, [isOpen, startListening, stopListening])

  // Proposal Adjustment Handlers
  function handleUpdateProposalQty(idx: number, delta: number) {
    if (!proposal) return
    const updated = [...proposal.items]
    const nextQty = Math.max(0.25, (updated[idx].quantity || 1) + delta)
    updated[idx] = { ...updated[idx], quantity: nextQty }
    setProposal({ ...proposal, items: updated })
  }

  function handleRemoveProposalItem(idx: number) {
    if (!proposal) return
    const updated = proposal.items.filter((_, i) => i !== idx)
    setProposal({ ...proposal, items: updated })
  }

  function handleChangeProposalProduct(idx: number, newProdId: string) {
    if (!proposal) return
    const found = products.find(p => p.id === newProdId)
    if (!found) return
    const updated = [...proposal.items]
    updated[idx] = { product: found, quantity: updated[idx].quantity }
    setProposal({ ...proposal, items: updated })
  }

  // Confirm and Apply Proposal to POS
  function handleConfirmProposal() {
    if (!proposal) return

    if (proposal.action === 'clear_cart') {
      onClearCart()
    }

    if (proposal.items.length > 0) {
      onAddItems(proposal.items)
    }

    if (proposal.customer) {
      onSelectCustomer(proposal.customer)
    }

    if (proposal.paymentMethod) {
      onSetPaymentMethod(proposal.paymentMethod)
    }

    if (proposal.receivedAmount) {
      onSetReceivedAmount(proposal.receivedAmount)
    }

    playSuccessChime()
    if ('vibrate' in navigator) {
      try { navigator.vibrate([70, 40, 70]) } catch {}
    }

    // Close HUD
    onClose()
  }

  if (!isOpen) return null

  // Calculate estimated total in proposal
  const proposalTotal = proposal?.items.reduce((acc, it) => acc + ((it.quantity || 1) * (it.product.price || 0)), 0) || 0

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div
        className="neu-card animate-scale-in"
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: 20,
          padding: 20,
          color: '#fff',
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(59, 130, 246, 0.25)'
        }}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: isListening ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.6)' : 'none'
            }}>
              <Mic size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Audio-POS por Voz Natural
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                {isListening ? '🎙️ Escuchando... habla de forma natural' : status === 'processing' ? '⚡ Analizando orden...' : 'Confirma o ajusta los productos detectados'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-neu btn-ghost"
            style={{ padding: '4px 8px', color: '#94A3B8' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── STATE 1: LISTENING & LIVE TRANSCRIPT ── */}
        {status !== 'review' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
            
            {/* Live Audio Visualizer Wave */}
            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 36 }}>
                {[30, 75, 45, 95, 60, 85, 40, 70, 50, 90, 35].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      height: `${h}%`,
                      background: 'linear-gradient(to top, #3B82F6, #A855F7)',
                      borderRadius: 4,
                      animation: `pulse 0.6s ease-in-out infinite alternate ${i * 0.08}s`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Transcript Box */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.45)',
              borderRadius: 12,
              padding: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              {transcript ? (
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#E2E8F0', fontStyle: 'italic' }}>
                  "{transcript}"
                </span>
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Di por ejemplo: <em>"2 cocacolas, 1 paquete de papas y fiale a Carlos"</em>
                </span>
              )}
            </div>

            {/* Error notice */}
            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', padding: '8px 12px', borderRadius: 8, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {isListening ? (
                <button
                  onClick={() => {
                    if (latestTranscriptRef.current.trim()) {
                      processVoiceCommand(latestTranscriptRef.current)
                    } else {
                      stopListening()
                    }
                  }}
                  className="btn-neu btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Check size={16} strokeWidth={2.5} />
                  <span>Procesar lo que dije</span>
                </button>
              ) : (
                <button
                  onClick={startListening}
                  className="btn-neu"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 800, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Mic size={16} />
                  <span>Hablar de nuevo</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STATE 2: REVIEW & CONFIRMATION MODAL ── */}
        {status === 'review' && proposal && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 12 }}>
            
            {/* Dictated Text Quote */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.8rem' }}>🗣️</span>
              <span style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{proposal.rawTranscript}"
              </span>
            </div>

            {/* Products List Detected */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Productos Detectados ({proposal.items.length})
              </span>

              {proposal.items.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', background: 'rgba(0,0,0,0.3)', borderRadius: 10, fontSize: '0.8rem' }}>
                  ⚠️ No encontramos ningún producto exacto con ese nombre en tu catálogo.
                </div>
              ) : (
                proposal.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      
                      {/* Product Selector in case user wants to change it */}
                      <select
                        value={item.product.id}
                        onChange={e => handleChangeProposalProduct(idx, e.target.value)}
                        style={{
                          flex: 1,
                          background: 'rgba(15, 23, 42, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '4px 6px',
                          cursor: 'pointer'
                        }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id} style={{ background: '#0F172A', color: '#fff' }}>
                            {p.name} — {formatCurrency(p.price)}
                          </option>
                        ))}
                      </select>

                      {/* Remove item button */}
                      <button
                        onClick={() => handleRemoveProposalItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', padding: 2 }}
                        title="Quitar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Quantity and Subtotal Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button
                          onClick={() => handleUpdateProposalQty(idx, -1)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 4,
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateProposalQty(idx, 1)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 4,
                            background: 'rgba(59, 130, 246, 0.6)',
                            border: 'none',
                            color: '#fff',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#60A5FA' }}>
                        {formatCurrency((item.quantity || 1) * (item.product.price || 0))}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Extra Metadata Badges: Customer & Payment */}
              {(proposal.customer || proposal.paymentMethod || proposal.receivedAmount) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {proposal.customer && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.2)', color: '#D8B4FE', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <User size={12} />
                      <span>Cliente: {proposal.customer.full_name}</span>
                    </span>
                  )}
                  {proposal.paymentMethod && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <CreditCard size={12} />
                      <span>Método: {proposal.paymentMethod === 'fiao' ? 'Fiao (Crédito)' : proposal.paymentMethod === 'cash' ? 'Efectivo' : proposal.paymentMethod}</span>
                    </span>
                  )}
                  {proposal.receivedAmount && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                      <Banknote size={12} />
                      <span>Paga con: {formatCurrency(proposal.receivedAmount)}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Total Bar */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Total Estimado:</span>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#38BDF8' }}>
                {formatCurrency(proposalTotal)}
              </span>
            </div>

            {/* Actions: Confirm, Retry or Cancel */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={startListening}
                className="btn-neu"
                style={{ padding: '9px 12px', fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={14} />
                <span>Repetir</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmProposal}
                disabled={proposal.items.length === 0 && !proposal.customer && !proposal.paymentMethod}
                className="btn-neu btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Check size={16} strokeWidth={2.5} />
                <span>Aceptar y Cargar al Carrito</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
