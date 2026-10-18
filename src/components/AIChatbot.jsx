// FileName: src/components/AIChatbot.jsx
// Floating AI chatbot widget — mobile-friendly
// Calls /api/chat (Vercel serverless function using z-ai-web-dev-sdk)

import React, { useState, useRef, useEffect } from 'react';

const SUGGESTED_QUESTIONS = [
  "What are the pricing plans?",
  "How do I subscribe?",
  "What payment methods do you accept?",
  "How do I download the desktop app?",
  "What is the difference between Ordinary and Premium?",
  "How do I activate my license?"
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I am the Ssewasswa ERP assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const message = (text || input).trim();
    if (!message || loading) return;

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: newMessages.slice(-11)  // Include last 11 messages (5 pairs + system)
        })
      });
      const data = await res.json();

      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      } else {
        setMessages([...newMessages, {
          role: 'assistant',
          content: data.response || "Sorry, I could not respond. Please contact our support team on WhatsApp: +256 752 971 118."
        }]);
      }
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: "I am having trouble connecting. Please contact our support team on WhatsApp: +256 752 971 118."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button — bottom-right corner */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI chat"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: isOpen ? '#0b8043' : '#1a73e8',
          color: '#fff',
          border: '0',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(26, 115, 232, 0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          transition: 'transform 0.2s, background 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: 'calc(100vw - 40px)',
          maxWidth: '380px',
          maxHeight: 'calc(100vh - 120px)',
          height: '500px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #dce7ed',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1a73e8 0%, #0b8043 100%)',
            color: '#fff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#fff', color: '#1a73e8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flex: '0 0 auto',
            }}>🤖</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Ssewasswa Assistant</div>
              <div style={{ fontSize: 11, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f9', display: 'inline-block' }} />
                Online · Ask me anything
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '0', color: '#fff', cursor: 'pointer',
                width: '28px', height: '28px', borderRadius: '50%',
                fontSize: '16px', flex: '0 0 auto',
              }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            background: '#f8fafc',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                marginBottom: 12,
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.role === 'user' ? '#1a73e8' : '#fff',
                  color: m.role === 'user' ? '#fff' : '#102a3c',
                  fontSize: 14,
                  lineHeight: 1.5,
                  border: m.role === 'user' ? '0' : '1px solid #dce7ed',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
                  background: '#fff', border: '1px solid #dce7ed',
                  display: 'flex', gap: 4,
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#1a73e8',
                      animation: `bounce 1.4s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                  <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }`}</style>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (only show when few messages) */}
          {messages.length <= 2 && (
            <div style={{
              padding: '8px 12px',
              background: '#fff',
              borderTop: '1px solid #dce7ed',
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              flexWrap: 'nowrap',
            }}>
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    flex: '0 0 auto',
                    background: '#e8f0fe',
                    border: '1px solid #c7ddff',
                    color: '#174a7c',
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: 12,
            background: '#fff',
            borderTop: '1px solid #dce7ed',
            display: 'flex',
            gap: 8,
            flex: '0 0 auto',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: '1px solid #dadce0',
                borderRadius: 999,
                fontSize: 14,
                outline: 'none',
                background: '#f8fafc',
                color: '#102a3c',
                minWidth: 0,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: loading || !input.trim() ? '#dadce0' : '#1a73e8',
                color: '#fff',
                border: '0', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 18, flex: '0 0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
