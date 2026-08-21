'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Sparkles, Volume2, X, CheckCircle2, AlertCircle } from 'lucide-react'

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
  const [lastFeedback, setLastFeedback] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const isProcessingRef = useRef<boolean>(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Web Speech API Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setErrorMessage('Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Microsoft Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-CO' // Spanish (Colombia / Latin America)

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
      setTranscript(currentText)

      // If speech has a definitive sentence ending, process immediately
      const lastResult = event.results[event.results.length - 1]
      if (lastResult.isFinal) {
        processVoiceCommand(lastResult[0].transcript)
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setErrorMessage('Permiso de micrófono denegado. Permite el acceso al micrófono.')
      }
      setIsListening(false)
      setStatus('error')
    }

    recognition.onend = () => {
      setIsListening(false)
      if (status === 'listening') setStatus('idle')
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // Start / Stop listening when opened or triggered
  useEffect(() => {
    if (isOpen && recognitionRef.current) {
      startListening()
    } else {
      stopListening()
    }
  }, [isOpen])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      setTranscript('')
      setLastFeedback(null)
      recognitionRef.current.start()
    } catch (e) {
      // Already running or starting
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch (e) {}
    setIsListening(false)
    setStatus('idle')
  }, [])

  // Process text through client & API parser
  const processVoiceCommand = async (text: string) => {
    if (!text.trim() || isProcessingRef.current) return
    isProcessingRef.current = true
    setStatus('processing')

    try {
      // Call local API parser
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
          transcript: text,
          products: simplifiedProducts,
          customers: simplifiedCustomers
        })
      })

      if (!res.ok) throw new Error('Error al procesar voz')
      const data = await res.json()

      // Execute extracted actions
      if (data.action === 'clear_cart') {
        onClearCart()
      }

      if (data.itemsToAdd && data.itemsToAdd.length > 0) {
        onAddItems(data.itemsToAdd)
      }

      if (data.selectedCustomer) {
        onSelectCustomer(data.selectedCustomer)
      }

      if (data.paymentMethod) {
        onSetPaymentMethod(data.paymentMethod)
      }

      if (data.receivedAmount) {
        onSetReceivedAmount(data.receivedAmount)
      }

      // Success feedback
      playSuccessChime()
      if ('vibrate' in navigator) {
        try { navigator.vibrate([70, 40, 70]) } catch {}
      }

      setStatus('success')
      setLastFeedback(data.feedbackMessage || '¡Comando ejecutado con éxito!')

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        setLastFeedback(null)
        setStatus(isListening ? 'listening' : 'idle')
      }, 4000)
    } catch (err: any) {
      console.error('Audio-POS processing error:', err)
      setStatus('error')
      setLastFeedback('No entendí el comando. Intenta de nuevo.')
    } finally {
      isProcessingRef.current = false
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: '90%',
      maxWidth: 520,
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div
        className="neu-card"
        style={{
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(16px)',
          border: isListening ? '2px solid rgba(59, 130, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 20,
          padding: '16px 20px',
          color: '#fff',
          boxShadow: isListening
            ? '0 12px 36px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.2)'
            : '0 12px 36px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC' }}>
                Audio-POS por Voz Natural
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                Habla de forma natural (ej: "2 leches, 3 papas y fíale a Pedro")
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className="btn-neu"
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: isListening ? '#EF4444' : '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                cursor: 'pointer'
              }}
            >
              {isListening ? <MicOff size={13} /> : <Mic size={13} />}
              <span>{isListening ? 'Pausar' : 'Escuchar'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#94A3B8',
                padding: '4px',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Audio Waveform & Status */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 12,
          padding: '12px 14px',
          minHeight: 56,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 6
        }}>
          {isListening && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 16 }}>
              {[12, 24, 18, 28, 14, 22, 10, 26, 16, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: `${h}px`,
                    background: '#38BDF8',
                    borderRadius: 2,
                    animation: `pulseWave 0.8s ease-in-out infinite alternate ${i * 0.08}s`
                  }}
                />
              ))}
              <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 600, marginLeft: 8 }}>
                Escuchando en vivo...
              </span>
            </div>
          )}

          {transcript ? (
            <div style={{ fontSize: '0.82rem', color: '#E2E8F0', fontStyle: 'italic' }}>
              "{transcript}"
            </div>
          ) : (
            !isListening && !lastFeedback && (
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Presiona "Escuchar" o la tecla <kbd style={{ background: '#1E293B', padding: '2px 6px', borderRadius: 4, color: '#93C5FD' }}>V</kbd> y dicta tu venta...
              </div>
            )
          )}

          {/* Feedback Result Banner */}
          {lastFeedback && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: status === 'error' ? '#FCA5A5' : '#4ADE80',
              animation: 'fadeIn 0.2s ease'
            }}>
              {status === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              <span>{lastFeedback}</span>
            </div>
          )}

          {errorMessage && (
            <div style={{ fontSize: '0.72rem', color: '#FCA5A5' }}>
              ⚠️ {errorMessage}
            </div>
          )}
        </div>

        {/* Quick Voice Hints */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Ejemplos:</span>
          {['"2 cocacolas y 1 paquete de papas"', '"Fíale a Carlos"', '"Paga con 50 mil"', '"Limpiar carrito"'].map((hint, idx) => (
            <span
              key={idx}
              onClick={() => processVoiceCommand(hint.replace(/"/g, ''))}
              style={{
                fontSize: '0.65rem',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#94A3B8',
                padding: '2px 6px',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
