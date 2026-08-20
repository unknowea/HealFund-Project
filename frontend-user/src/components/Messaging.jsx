import React, { useState, useEffect, useRef } from 'react';
import { getConversations, sendChatMessage, markConversationRead } from '../api.js';

export default function Messaging({ currentLang, currentUser }) {
  const [conversation, setConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const isAm = currentLang === 'am';

  const patientId = currentUser?._id || currentUser?.patientId;
  const convId = `CONV-${patientId}-ADMIN`;

  useEffect(() => {
    if (currentUser) {
      fetchConversation();
      const interval = setInterval(fetchConversation, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const fetchConversation = async () => {
    try {
      const data = await getConversations();
      const convs = data.conversations || [];
      const mine = convs.find((c) => c.conversationId === convId) || null;
      setConversation(mine);
      if (mine?.unreadByPatient > 0) {
        await markConversationRead(convId).catch(() => {});
      }
    } catch (err) {
      console.warn('Chat fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;
    setSending(true);

    // Optimistic UI update
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      sender: 'patient',
      senderName: currentUser?.name || 'Patient',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setConversation((prev) => prev
      ? { ...prev, messages: [...prev.messages, optimisticMsg] }
      : { conversationId: convId, messages: [optimisticMsg], patientId, patientName: currentUser?.name }
    );
    const sentText = messageInput.trim();
    setMessageInput('');

    try {
      await sendChatMessage(convId, sentText, patientId, currentUser?.name || 'Patient');
      fetchConversation();
    } catch (err) {
      console.warn('Send error:', err.message);
    } finally {
      setSending(false);
    }
  };

  const messages = conversation?.messages || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: 'calc(100vh - 180px)', minHeight: '500px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f3b5e, #078930)', padding: '16px 20px', borderRadius: '16px 16px 0 0', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}><i className="fas fa-comments"></i> {isAm ? 'ቀጥታ ድጋፍ' : 'Live Support Chat'}</h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8 }}>{isAm ? 'ከሂልፈንድ ቡድን ጋር ቀጥታ ይነጋገሩ' : 'Chat with HealFund hospital support team'}</p>
        </div>
        <button onClick={fetchConversation} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '14px' }}>
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7a8a9e' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
            {isAm ? 'ቀጥታ ውይይት በመጫን ላይ...' : 'Loading chat...'}
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', color: '#7a8a9e' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#0f3b5e' }}>{isAm ? 'ቀጥታ ውይይት ይጀምሩ' : 'Start a conversation'}</p>
            <p style={{ fontSize: '13px', margin: 0 }}>{isAm ? 'ከዚህ በታች ያለውን ሳጥን ይጠቀሙ።' : 'Type a message below to connect with our support team.'}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender === 'patient';
            return (
              <div key={msg._id || i} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                {!isMine && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#078930', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                    H
                  </div>
                )}
                <div style={{ maxWidth: '72%' }}>
                  {!isMine && <div style={{ fontSize: '11px', color: '#7a8a9e', marginBottom: '3px', marginLeft: '4px' }}>HealFund Support</div>}
                  <div style={{ background: isMine ? '#078930' : '#fff', color: isMine ? '#fff' : '#0f3b5e', padding: '10px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', wordWrap: 'break-word', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', fontSize: '14px', lineHeight: '1.5' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '10px', color: '#aaa', marginTop: '3px', textAlign: isMine ? 'right' : 'left', marginRight: isMine ? '4px' : 0, marginLeft: isMine ? 0 : '4px' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {isMine && (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0f3b5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                    {(currentUser?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: '14px 16px', background: '#fff', borderTop: '1px solid #e5e5e5', borderRadius: '0 0 16px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={isAm ? 'መልዕክትዎን ይጻፉ...' : 'Type your message...'}
          disabled={sending}
          style={{ flex: 1, padding: '10px 16px', border: '1.5px solid #d0dbe8', borderRadius: '24px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', transition: '0.2s' }}
          onFocus={(e) => e.target.style.borderColor = '#078930'}
          onBlur={(e) => e.target.style.borderColor = '#d0dbe8'}
        />
        <button type="submit" disabled={!messageInput.trim() || sending}
          style={{ background: '#078930', color: '#fff', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!messageInput.trim() || sending) ? 'not-allowed' : 'pointer', opacity: (!messageInput.trim() || sending) ? 0.5 : 1, fontSize: '16px', transition: '0.2s', flexShrink: 0 }}>
          {sending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
        </button>
      </form>
    </div>
  );
}
