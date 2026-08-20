'use client'
import { useState, useRef, useEffect } from 'react'
import { useToast } from '@/components/shared/Toast'

function ZyraAvatar({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.45, color: '#fff', fontWeight: 700,
      letterSpacing: -0.5
    }}>R</div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Active:   { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    Pending:  { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
    Expired:  { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
    Granted:  { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
    Published:{ bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  }
  const s = map[status] || map.Expired
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 4, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color, whiteSpace: 'nowrap'
    }}>{status}</span>
  )
}

function PatentRow({ patent, index, onClick, selected }) {
  return (
    <div
      onClick={() => onClick(patent)}
      style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--color-border-tertiary)',
        cursor: 'pointer',
        background: selected
          ? 'var(--color-background-info)'
          : 'var(--color-background-primary)',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--color-background-secondary)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'var(--color-background-primary)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          fontSize: 13, color: 'var(--color-text-tertiary)',
          minWidth: 24, paddingTop: 2, fontVariantNumeric: 'tabular-nums'
        }}>{index}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              fontSize: 15, fontWeight: 600,
              color: 'var(--color-text-primary)', lineHeight: 1.3, flex: 1
            }}>
              {patent.title}
            </span>
            <span style={{
              fontSize: 11, color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap', paddingTop: 2, fontFamily: 'monospace'
            }}>
              {patent.patent_number}
            </span>
            <StatusBadge status={patent.status || 'Published'} />
          </div>

          <p style={{
            fontSize: 13, color: 'var(--color-text-secondary)',
            lineHeight: 1.6, margin: '0 0 8px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {patent.abstract}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {patent.filing_date || patent.publication_date || '—'}
            </span>
            {patent.assignee && (
              <span style={{
                fontSize: 12, color: 'var(--color-text-tertiary)',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                {patent.assignee}
              </span>
            )}
            {patent.ai_match_score && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: patent.ai_match_score > 85 ? '#166534' : '#854d0e'
              }}>
                Match: {patent.ai_match_score}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PatentDetail({ patent, onClose }) {
  if (!patent) return null
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: '100%', maxWidth: 520,
      background: 'var(--color-background-primary)',
      borderLeft: '1px solid var(--color-border-tertiary)',
      display: 'flex', flexDirection: 'column',
      zIndex: 10, overflowY: 'auto'
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid var(--color-border-tertiary)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 12, position: 'sticky', top: 0,
        background: 'var(--color-background-primary)', zIndex: 1
      }}>
        <div>
          <div style={{
            display: 'inline-block', padding: '4px 12px',
            background: '#7c3aed', color: '#fff',
            borderRadius: 6, fontSize: 13, fontWeight: 600,
            marginBottom: 10, fontFamily: 'monospace'
          }}>
            {patent.patent_number}
          </div>
          <h2 style={{
            fontSize: 17, fontWeight: 700, lineHeight: 1.4,
            margin: 0, color: 'var(--color-text-primary)'
          }}>
            {patent.title}
          </h2>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 20, color: 'var(--color-text-secondary)',
          padding: 4, flexShrink: 0
        }}>×</button>
      </div>

      <div style={{ padding: '20px 24px', flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatusBadge status={patent.status || 'Published'} />
          {patent.jurisdiction && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'var(--color-background-secondary)',
              border: '1px solid var(--color-border-tertiary)',
              color: 'var(--color-text-secondary)', fontWeight: 500
            }}>{patent.jurisdiction}</span>
          )}
        </div>

        <div style={{
          background: 'var(--color-background-secondary)',
          borderRadius: 8, padding: '14px 16px', marginBottom: 20
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Timeline</p>
          {[
            { label: 'Application Filed', date: patent.filing_date },
            { label: 'Publication', date: patent.publication_date },
            { label: 'Grant Date', date: patent.grant_date },
          ].filter(t => t.date).map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{t.label}</span>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{t.date}</span>
            </div>
          ))}
        </div>

        {patent.inventors?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Inventor{patent.inventors.length > 1 ? 's' : ''}</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: 0 }}>{patent.inventors.join(', ')}</p>
          </div>
        )}
        {patent.assignee && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Assignee</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: 0 }}>{patent.assignee}</p>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Abstract</p>
          <p style={{ fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.7, margin: 0 }}>{patent.abstract}</p>
        </div>

        {patent.ipc_codes?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>IPC Codes</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {patent.ipc_codes.map(code => (
                <span key={code} style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 4,
                  background: '#ede9fe', color: '#5b21b6',
                  border: '1px solid #c4b5fd', fontFamily: 'monospace'
                }}>{code}</span>
              ))}
            </div>
          </div>
        )}

        {patent.citations > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Citations</p>
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: 0, fontWeight: 600 }}>{patent.citations} forward citations</p>
          </div>
        )}

        {patent.relevance_reason && (
          <div style={{
            background: '#f5f3ff', border: '1px solid #ede9fe',
            borderRadius: 8, padding: '12px 14px'
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#5b21b6', margin: '0 0 6px' }}> Why Rith matched this</p>
            <p style={{ fontSize: 13, color: '#4c1d95', margin: 0, lineHeight: 1.6 }}>{patent.relevance_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SuggestedQuestion({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      style={{
        width: '100%', textAlign: 'left', padding: '10px 14px',
        background: 'var(--color-background-primary)',
        border: '1px solid var(--color-border-tertiary)',
        borderRadius: 8, cursor: 'pointer', fontSize: 13,
        color: 'var(--color-text-primary)', lineHeight: 1.4,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 8, transition: 'border-color 0.15s, background 0.15s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#7c3aed'
        e.currentTarget.style.background = '#faf5ff'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'
        e.currentTarget.style.background = 'var(--color-background-primary)'
      }}
    >
      <span>{text}</span>
      <span style={{ color: '#7c3aed', fontSize: 16, flexShrink: 0 }}>→</span>
    </button>
  )
}

function ZyraMessage({ message, onSuggestion }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <ZyraAvatar size={28} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rith</span>
      </div>

      {message.bullets?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {message.bullets.map((b, i) => (
            <div key={i} style={{
              fontSize: 13, lineHeight: 1.6, padding: '4px 0',
              color: 'var(--color-text-primary)'
            }}>
              • <strong>{b.label}</strong>{b.label ? ' ' : ''}{b.text}
            </div>
          ))}
        </div>
      )}

      {message.sourceCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#7c3aed', fontWeight: 500,
            background: '#faf5ff', border: '1px solid #ede9fe',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer'
          }}>
            {message.sourceCount} sources &gt;
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>👍</button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>👎</button>
          </div>
        </div>
      )}

      {message.suggestions?.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '0 0 8px', fontWeight: 500 }}>You may ask:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {message.suggestions.map((s, i) => (
              <SuggestedQuestion key={i} text={s} onClick={onSuggestion} />
            ))}
          </div>
        </div>
      )}

      {message.quickResearch && (
        <div style={{
          marginTop: 10, padding: '10px 14px',
          background: 'var(--color-background-secondary)',
          borderRadius: 8, border: '1px solid var(--color-border-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer'
        }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 0 2px', fontWeight: 600 }}>
              Quick Research
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-primary)', margin: 0 }}>
              {message.quickResearch}
            </p>
          </div>
          <span style={{ color: '#7c3aed', fontSize: 18 }}>↗</span>
        </div>
      )}
    </div>
  )
}

function UserMessage({ text }) {
  return (
    <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '85%', padding: '10px 14px',
        background: '#7c3aed', color: '#fff',
        borderRadius: '16px 16px 4px 16px',
        fontSize: 13, lineHeight: 1.6
      }}>
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <ZyraAvatar size={28} />
      <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'var(--color-background-secondary)', borderRadius: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#7c3aed',
            animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`
          }} />
        ))}
      </div>
      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
    </div>
  )
}

export default function ZyraPage() {
  const { show } = useToast()
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [patents, setPatents] = useState([])
  const [patentCount, setPatentCount] = useState(0)
  const [selectedPatent, setSelectedPatent] = useState(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileView, setMobileView] = useState('chat')
  const chatBottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (overrideText) => {
    const text = (overrideText || inputValue).trim()
    if (!text || loading) return
    setInputValue('')

    setMessages(prev => [...prev, { type: 'user', text }])
    setLoading(true)
    setSelectedPatent(null)

    try {
      const res = await fetch('/api/zyra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages })
      })
      if (!res.ok) throw new Error('Rith failed to respond')
      const data = await res.json()

      setMessages(prev => [...prev, {
        type: 'zyra',
        bullets: data.bullets || [],
        sourceCount: data.patents?.length || 0,
        suggestions: data.suggestions || [],
        quickResearch: data.quick_research
      }])

      if (data.patents?.length) {
        setPatents(data.patents)
        setPatentCount(data.patents.length)
      }
    } catch (err) {
      show(err.message || 'Rith encountered an error', 'error')
      setMessages(prev => [...prev, {
        type: 'zyra',
        bullets: [{ label: '', text: 'Sorry, I encountered an error. Please try again.' }],
        sourceCount: 0, suggestions: [], quickResearch: null
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showChat = !isMobile || mobileView === 'chat'
  const showResults = !isMobile || mobileView === 'results'

  return (
    <div data-zyra-form style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--color-background-tertiary)',
      position: 'relative'
    }}>
      {/* Mobile toggle bar */}
      {isMobile && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 20,
          display: 'flex', borderTop: '1px solid var(--color-border-tertiary)',
          background: 'var(--color-background-primary)', flexShrink: 0
        }}>
          <button
            onClick={() => setMobileView('chat')}
            style={{
              flex: 1, padding: '10px', textAlign: 'center', fontSize: 12,
              fontWeight: mobileView === 'chat' ? 700 : 500,
              color: mobileView === 'chat' ? '#7c3aed' : 'var(--color-text-secondary)',
              background: mobileView === 'chat' ? '#faf5ff' : 'transparent',
              border: 'none', cursor: 'pointer', borderRight: '1px solid var(--color-border-tertiary)'
            }}
          >💬 Chat</button>
          <button
            onClick={() => setMobileView('results')}
            style={{
              flex: 1, padding: '10px', textAlign: 'center', fontSize: 12,
              fontWeight: mobileView === 'results' ? 700 : 500,
              color: mobileView === 'results' ? '#7c3aed' : 'var(--color-text-secondary)',
              background: mobileView === 'results' ? '#faf5ff' : 'transparent',
              border: 'none', cursor: 'pointer'
            }}
          > Patents ({patentCount})</button>
        </div>
      )}

      {/* LEFT — CHAT PANEL */}
      <div style={{
        width: isMobile ? '100%' : 420,
        minWidth: isMobile ? '100%' : 380,
        maxWidth: isMobile ? '100%' : 480,
        display: showChat ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'var(--color-background-primary)',
        borderRight: isMobile ? 'none' : '1px solid var(--color-border-tertiary)',
        overflow: 'hidden',
        ...(isMobile ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 } : {})
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border-tertiary)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
        }}>
          {isMobile && (
            <button
              onClick={() => setMobileView('results')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--color-text-secondary)',
                padding: '0 4px', marginRight: 4
              }}
            >←</button>
          )}
          <ZyraAvatar size={36} />
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>Rith</p>
            <p style={{ margin: 0, fontSize: 11, color: '#7c3aed', fontWeight: 500 }}>● Patent Intelligence AI</p>
          </div>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 20px 0',
        }}>
          {messages.length === 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ZyraAvatar size={28} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Rith</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, margin: '0 0 16px' }}>
                Hi! I'm Rith, your patent intelligence assistant. I can help you with:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {[
                  { label: 'Patent landscape / trend analysis', sub: '(filing trends by year, top applicants, IPC distribution)' },
                  { label: 'Competitive intelligence', sub: 'on specific companies (e.g., Google, Samsung, Apple)' },
                  { label: 'Specific technologies', sub: '(AI, biotech, semiconductors, clean energy)' },
                  { label: 'FTO / infringement risk', sub: 'for a specific technical solution' },
                  { label: 'Full text', sub: 'of any specific patent number' },
                ].map((item, i) => (
                  <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                    <strong>{item.label}</strong>{' '}
                    <span style={{ color: 'var(--color-text-secondary)' }}>{item.sub}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                One place for every question — try asking me about a patent landscape, competitor, or technology area
              </p>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.type === 'user'
              ? <UserMessage key={i} text={msg.text} />
              : <ZyraMessage key={i} message={msg} onSuggestion={handleSend} />
          )}

          {loading && <TypingIndicator />}
          <div id="chat-bottom" ref={chatBottomRef} style={{ height: 20 }} />
        </div>

        <div style={{
          padding: '12px 16px',
          paddingBottom: isMobile ? 60 : 12,
          borderTop: '1px solid var(--color-border-tertiary)',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            border: '1.5px solid var(--color-border-secondary)',
            borderRadius: 12, padding: '10px 12px',
            background: 'var(--color-background-primary)',
            transition: 'border-color 0.15s'
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = '#7c3aed'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--color-border-secondary)'}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Rith about patents, companies, or technologies..."
              rows={2}
              data-zyra-input
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none',
                fontSize: 13, color: 'var(--color-text-primary)',
                background: 'transparent', lineHeight: 1.5,
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-tertiary)',
                cursor: 'pointer', fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>+</button>
              <button
                data-zyra-send
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: inputValue.trim() && !loading ? '#7c3aed' : 'var(--color-background-secondary)',
                  border: 'none', cursor: inputValue.trim() ? 'pointer' : 'default',
                  color: inputValue.trim() && !loading ? '#fff' : 'var(--color-text-tertiary)',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
              >▲</button>
            </div>
          </div>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '8px 0 0' }}>
            Rith may make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* RIGHT — RESULTS PANEL */}
      <div style={{
        flex: 1,
        display: showResults ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
        background: 'var(--color-background-primary)',
        ...(isMobile ? { width: '100%' } : {})
      }}>
        {patents.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-secondary)', gap: 12
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ede9fe, #dbeafe)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, marginBottom: 4
            }}>🔬</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
              Ask Rith to find patents
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, textAlign: 'center', maxWidth: 320 }}>
              Describe a technology, company, or patent number in the chat and Rith will surface relevant results here
            </p>
          </div>
        ) : (
          <>
            <div style={{
              padding: '14px 24px',
              paddingBottom: isMobile ? 60 : 14,
              borderBottom: '1px solid var(--color-border-tertiary)',
              display: 'flex', alignItems: 'center', gap: 12,
              flexShrink: 0, background: 'var(--color-background-primary)'
            }}>
              {isMobile && (
                <button
                  onClick={() => setMobileView('chat')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 18, color: 'var(--color-text-secondary)',
                    padding: '0 4px', marginRight: 4
                  }}
                >←</button>
              )}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--color-background-secondary)',
                border: '1px solid var(--color-border-tertiary)',
                borderRadius: 8, padding: '6px 14px'
              }}>
                <span style={{ fontSize: 16 }}></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Patents ({patentCount})
                </span>
              </div>
              {selectedPatent && (
                <button
                  onClick={() => setSelectedPatent(null)}
                  style={{
                    marginLeft: 'auto', background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: 20,
                    color: 'var(--color-text-secondary)', padding: 4
                  }}
                >×</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {patents.map((patent, i) => (
                <PatentRow
                  key={patent.patent_number || i}
                  patent={patent}
                  index={i + 1}
                  onClick={setSelectedPatent}
                  selected={selectedPatent?.patent_number === patent.patent_number}
                />
              ))}
            </div>
          </>
        )}

        {selectedPatent && (
          <PatentDetail
            patent={selectedPatent}
            onClose={() => setSelectedPatent(null)}
          />
        )}
      </div>
    </div>
  )
}
