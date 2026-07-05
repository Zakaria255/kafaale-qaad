import { useState, useRef, useEffect } from 'react';
import { ai } from '../api/client';
import { useResponsive } from '../hooks/useResponsive.js';

const C = {
  primary: '#004B96', accent: '#E0AB21', green: '#4B7D19',
  bg: '#F4F7FC', white: '#FFFFFF', text: '#0D1F3C', muted: '#5A6E8A', border: '#D8E4F0',
};

export default function AiAssistant({ caseId = null, context = 'general' }) {
  const [open, setOpen] = useState(false);
  const { isMobile } = useResponsive();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Assalamu Alaykum! I\'m the Kafaale Qaad AI Assistant. I can help you understand our cases, guide you through the verification process, or answer any questions about our humanitarian platform. How can I assist you today? 🌍' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const data = await ai.chat(msg, context, caseId);
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.' }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const QUICK = [
    'How does the 8-step workflow work?',
    'How do I sponsor a case?',
    'How do I report an emergency?',
    'How is victim privacy protected?',
    'What payment methods are accepted?',
    'How long does it take from report to delivery?',
    'What are the user roles?',
    'How does the escrow system work?',
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 60, height: 60, borderRadius: '50%', border: 'none',
          background: `linear-gradient(135deg, ${C.primary}, ${C.green})`,
          color: '#fff', cursor: 'pointer', boxShadow: '0 4px 20px rgba(11,61,145,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, transition: 'transform 0.2s',
          transform: open ? 'rotate(45deg) scale(1.1)' : 'scale(1)',
        }}
        title="AI Assistant"
      >
        {open ? '✕' : ''}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 0 : 96,
          right: isMobile ? 0 : 24,
          left: isMobile ? 0 : 'auto',
          zIndex: 9998,
          width: isMobile ? '100%' : 420,
          maxWidth: isMobile ? '100%' : 'calc(100vw - 48px)',
          height: isMobile ? '85vh' : 580,
          background: C.white, borderRadius: isMobile ? '16px 16px 0 0' : 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: `1px solid ${C.border}`,
        }}>
          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.green})`, color: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Kafaale AI Assistant</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>● Online — Ask me anything</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? C.primary : C.bg,
                  color: m.role === 'user' ? '#fff' : C.text,
                  fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: C.bg, padding: '10px 16px', borderRadius: '18px 18px 18px 4px', color: C.muted, fontSize: 14 }}>
                  <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
                </div>
              </div>
            )}
            {/* Quick prompts (only at start) */}
            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {QUICK.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); }}
                    style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 20, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: C.primary, transition: 'all 0.2s' }}
                    onMouseOver={e => { e.target.style.background = C.primary; e.target.style.color = '#fff'; }}
                    onMouseOut={e => { e.target.style.background = 'none'; e.target.style.color = C.primary; }}
                  >{q}</button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask anything about Kafaale Qaad..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 24, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none', background: C.bg }}
            />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: input.trim() && !loading ? C.primary : C.border,
                color: '#fff', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >➤</button>
          </div>
        </div>
      )}
    </>
  );
}
