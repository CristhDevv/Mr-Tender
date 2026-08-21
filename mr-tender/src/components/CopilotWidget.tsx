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
  FileText,
  Download,
  RotateCcw,
  User,
  ChevronRight
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

// ── RICH MARKDOWN PARSER FOR CRISP ELEGANT COPILOT MESSAGES ──
function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    const codeMatch = remaining.match(/`(.+?)`/)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)

    let earliestType: 'bold' | 'code' | 'italic' | null = null
    let earliestIndex = remaining.length

    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliestIndex) {
      earliestIndex = boldMatch.index
      earliestType = 'bold'
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < earliestIndex) {
      earliestIndex = codeMatch.index
      earliestType = 'code'
    }
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < earliestIndex) {
      earliestIndex = italicMatch.index
      earliestType = 'italic'
    }

    if (!earliestType) {
      parts.push(remaining)
      break
    }

    if (earliestIndex > 0) {
      parts.push(remaining.substring(0, earliestIndex))
    }

    if (earliestType === 'bold' && boldMatch) {
      parts.push(
        <strong key={key++} style={{ fontWeight: 800, color: '#F1F5F9' }}>
          {boldMatch[1]}
        </strong>
      )
      remaining = remaining.substring(earliestIndex + boldMatch[0].length)
    } else if (earliestType === 'code' && codeMatch) {
      parts.push(
        <code
          key={key++}
          style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '2px 5px',
            borderRadius: 4,
            fontSize: '0.74rem',
            fontFamily: 'monospace',
            color: '#93C5FD'
          }}
        >
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.substring(earliestIndex + codeMatch[0].length)
    } else if (earliestType === 'italic' && italicMatch) {
      parts.push(
        <em key={key++} style={{ fontStyle: 'italic', color: '#CBD5E1' }}>
          {italicMatch[1]}
        </em>
      )
      remaining = remaining.substring(earliestIndex + italicMatch[0].length)
    }
  }

  return parts
}

function FormattedMessage({ text, role }: { text: string; role: 'user' | 'assistant' }) {
  if (role === 'user') return <div>{text}</div>

  const lines = text.split('\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {lines.map((line, idx) => {
        let trimmed = line.trim()
        if (!trimmed) return <div key={idx} style={{ height: 2 }} />

        // Headings: ###, ##, #
        if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const headerText = trimmed.replace(/^#+\s*/, '')
          return (
            <div key={idx} style={{ fontWeight: 800, fontSize: '0.86rem', color: '#93C5FD', marginTop: 4, marginBottom: 2 }}>
              {renderInlineFormatting(headerText)}
            </div>
          )
        }

        // Bullet point: * or -
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletContent = trimmed.substring(2)
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingLeft: 2 }}>
              <span style={{ color: '#60A5FA', fontSize: '0.85rem', lineHeight: '1.2' }}>•</span>
              <div style={{ flex: 1, lineHeight: 1.45 }}>{renderInlineFormatting(bulletContent)}</div>
            </div>
          )
        }

        // Numbered list: 1. 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, paddingLeft: 2 }}>
              <span style={{ color: '#93C5FD', fontWeight: 700, fontSize: '0.75rem' }}>{numMatch[1]}.</span>
              <div style={{ flex: 1, lineHeight: 1.45 }}>{renderInlineFormatting(numMatch[2])}</div>
            </div>
          )
        }

        // Standard Paragraph line
        return (
          <div key={idx} style={{ lineHeight: 1.45 }}>
            {renderInlineFormatting(trimmed)}
          </div>
        )
      })}
    </div>
  )
}

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

      const assistantMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-reply',
        role: 'assistant',
        content: data.reply || 'Hecho.',
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        generatedPdf: data.generatedPdf
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg-' + Date.now() + '-err',
          role: 'assistant',
          content: '⚠️ Ocurrió un error al conectar con el asistente. Verifica tu conexión e intenta de nuevo.',
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadPdf(pdfMeta: any) {
    if (!pdfMeta) return
    if (pdfMeta.type === 'invoice') {
      generateInvoicePdf(pdfMeta.data)
    } else if (pdfMeta.type === 'pnl') {
      generatePnlPdf(pdfMeta.data)
    }
  }

  return (
    <>
      {/* ── FLOATING TRIGGER PILL ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="copilot-trigger-btn animate-scale-in"
        title="Abrir Asistente Copilot AI"
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

          {/* Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            
            {/* Welcome message if empty */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                <div style={{
                  padding: 14,
                  borderRadius: 14,
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  fontSize: '0.8rem',
                  lineHeight: 1.45
                }}>
                  <div style={{ fontWeight: 800, color: '#fff', marginBottom: 4, fontSize: '0.88rem' }}>
                    👋 ¡Hola, {userMetadata?.full_name || 'Comerciante'}!
                  </div>
                  Soy tu copiloto inteligente de <strong>Mr. Tender</strong>. Puedo ayudarte a consultar ventas en vivo, buscar stock, revisar fiaos, generar PDFs y guiarte en cualquier proceso de tu negocio.
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

            {/* Render Formatted Messages */}
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
                    maxWidth: '88%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2563EB, #1D4ED8)'
                      : 'rgba(30, 41, 59, 0.85)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    lineHeight: 1.45,
                    boxShadow: msg.role === 'user' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                  }}
                >
                  <FormattedMessage text={msg.content} role={msg.role} />

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

                <div style={{ fontSize: '0.62rem', color: '#64748B', padding: '0 4px' }}>
                  {msg.timestamp}
                </div>
              </div>
            ))}

            {/* Loading typing bubble */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(30, 41, 59, 0.85)', borderRadius: '14px 14px 14px 2px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Sparkles size={14} color="#8B5CF6" className="animate-spin" />
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Consultando información del negocio...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input & Voice Controls */}
          <div style={{
            padding: '10px 14px',
            background: 'rgba(30, 41, 59, 0.7)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0
          }}>
            <button
              onClick={toggleVoiceInput}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 'none',
                background: isListening ? '#EF4444' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              title={isListening ? 'Escuchando... haz clic para detener' : 'Dictar por voz'}
            >
              <Mic size={16} />
            </button>

            <input
              type="text"
              placeholder="Pregunta o pide algo a la IA..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                opacity: input.trim() && !loading ? 1 : 0.4,
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={15} />
            </button>
          </div>

        </div>
      )}
    </>
  )
}
