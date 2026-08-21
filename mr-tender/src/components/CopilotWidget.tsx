'use client'
import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { generateInvoicePdf, generatePnlPdf } from '@/lib/pdf-generator'
import {
  Sparkles,
  Bot,
  X,
  Send,
  Mic,
  MicOff,
  FileText,
  Download,
  RotateCcw,
  User,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  generatedPdf?: any
}

const QUICK_SUGGESTIONS = [
  '📊 ¿Cuánto vendimos hoy y por qué medios de pago?',
  '📦 ¿Qué productos tienen stock bajo o crítico?',
  '👥 ¿Cuáles clientes tienen deuda de fiao pendiente?',
  '📄 Generar PDF del estado de resultados de hoy',
  '💡 ¿Cómo hago un arqueo y cierre de caja?'
]

export default function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const { roleName, color, isAdmin, permissions } = usePermissions()
  const [userMetadata, setUserMetadata] = useState<{ id: string; tenant_id: string; full_name: string } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()

  // Load user data
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserMetadata({
          id: data.user.id,
          tenant_id: data.user.user_metadata?.tenant_id || '',
          full_name: data.user.user_metadata?.full_name || 'Usuario'
        })
      }
    })
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Initialize Speech Recognition for Copilot Voice input
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'es-CO'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      if (transcript) {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript)
      }
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
  }, [])

  function toggleVoiceInput() {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta dictado por voz. Usa Chrome o Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch {}
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || input).trim()
    if (!text || loading || !userMetadata) return

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          tenant_id: userMetadata.tenant_id,
          user_role: isAdmin ? 'admin' : 'employee',
          user_name: userMetadata.full_name,
          permissions
        })
      })

      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: 'msg-ai-' + Date.now(),
        role: 'assistant',
        content: data.reply || 'Lo siento, no pude procesar la respuesta.',
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        generatedPdf: data.generatedPdf
      }

      setMessages(prev => [...prev, aiMsg])

      // Auto trigger PDF download if generated
      if (data.generatedPdf) {
        if (data.generatedPdf.type === 'invoice') {
          generateInvoicePdf(data.generatedPdf.data)
        } else if (data.generatedPdf.type === 'pnl') {
          generatePnlPdf(data.generatedPdf.data)
        }
      }
    } catch (err) {
      console.error('Copilot error:', err)
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: '⚠️ Ocurrió un error al consultar con el asistente. Intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadPdf(pdf: any) {
    if (!pdf) return
    if (pdf.type === 'invoice') {
      generateInvoicePdf(pdf.data)
    } else if (pdf.type === 'pnl') {
      generatePnlPdf(pdf.data)
    }
  }

  return (
    <>
      {/* ── OMNIPRESENT FLOATING TRIGGER BUTTON ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title="Tender Copilot AI - Asistente Inteligente"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9998,
          background: 'linear-gradient(135deg, #2563EB, #7C3AED, #EC4899)',
          color: '#fff',
          border: 'none',
          borderRadius: 30,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 800,
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45), 0 0 16px rgba(37, 99, 235, 0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <Sparkles size={16} strokeWidth={2.5} className="animate-pulse" />
        <span>Copilot AI</span>
      </button>

      {/* ── EXPANDABLE CHAT DRAWER ── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 84,
            right: 24,
            width: '92%',
            maxWidth: 440,
            height: '75vh',
            maxHeight: 680,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(124, 58, 237, 0.35)',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 32px rgba(124, 58, 237, 0.25)',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'rgba(30, 41, 59, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)'
              }}>
                <Bot size={17} color="#fff" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
                    Tender Copilot AI
                  </h4>
                  <span style={{ fontSize: '0.62rem', background: 'rgba(59, 130, 246, 0.25)', color: '#93C5FD', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                    Gemini Ultra
                  </span>
                </div>

                <div style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <span>●</span>
                  <span>{userMetadata?.full_name} ({roleName})</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => setMessages([])}
                className="btn-neu btn-ghost"
                title="Limpiar conversación"
                style={{ padding: '4px 8px', color: '#94A3B8' }}
              >
                <RotateCcw size={14} />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="btn-neu btn-ghost"
                style={{ padding: '4px 8px', color: '#94A3B8' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            
            {/* Initial Welcome Message */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 14,
                  padding: '14px',
                  color: '#E2E8F0'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 4 }}>
                    👋 ¡Hola, {userMetadata?.full_name}!
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                    Soy tu asistente inteligente de Mr. Tender. Puedo consultar tus ventas, verificar existencias de inventario, revisar deudas de clientes, generar facturas o reportes en PDF y resolver cualquier duda del sistema.
                  </p>
                </div>

                {/* Suggestions Chips */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Preguntas Rápidas:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {QUICK_SUGGESTIONS.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug)}
                        style={{
                          textAlign: 'left',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          padding: '7px 10px',
                          color: '#CBD5E1',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>{sug}</span>
                        <ChevronRight size={13} color="#64748B" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Render Messages */}
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 3
                }}
              >
                <div
                  style={{
                    maxWidth: '86%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                      : 'rgba(30, 41, 59, 0.85)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                  }}
                >
                  {msg.content}

                  {/* Download PDF Card if returned by tool */}
                  {msg.generatedPdf && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
                      <button
                        onClick={() => handleDownloadPdf(msg.generatedPdf)}
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '7px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          width: '100%',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <Download size={14} />
                        <span>
                          {msg.generatedPdf.type === 'invoice' ? 'Descargar Factura en PDF' : 'Descargar Estado de Resultados en PDF'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.62rem', color: '#64748B', padding: '0 4px' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(30, 41, 59, 0.7)', borderRadius: 12, alignSelf: 'flex-start' }}>
                <Sparkles size={13} color="#8B5CF6" className="animate-spin" />
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontStyle: 'italic' }}>
                  Consultando y procesando...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(15, 23, 42, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0
          }}>
            <button
              onClick={toggleVoiceInput}
              className="btn-neu"
              title={isListening ? 'Detener dictado' : 'Hablar por micrófono'}
              style={{
                padding: '8px',
                borderRadius: '50%',
                background: isListening ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.6)' : 'none',
                flexShrink: 0
              }}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <input
              type="text"
              className="input-neu"
              placeholder={isListening ? 'Escuchando tu voz...' : 'Pregunta o pide algo a la IA...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              style={{
                flex: 1,
                fontSize: '0.8rem',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#fff',
                border: isListening ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="btn-neu btn-primary"
              style={{ padding: '8px 12px', flexShrink: 0 }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
