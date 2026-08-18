import React, { useState, useEffect, useRef } from 'react';

export default function WhatsAppMessaging({ currentLang, currentUser, isAdmin = false }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  const isAm = currentLang === 'am';

  useEffect(() => {
    loadConversations();
    // Auto-refresh conversations every 3 seconds
    const interval = setInterval(loadConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      let storageKey = isAdmin ? 'healfund_admin_conversations' : `healfund_patient_conversations_${currentUser?.id}`;
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setConversations(stored);
      
      if (!selectedConversation && stored.length > 0) {
        setSelectedConversation(stored[0]);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage = {
      id: `MSG-${Date.now()}`,
      sender: isAdmin ? 'admin' : currentUser?.id || 'patient',
      senderName: isAdmin ? 'Admin' : currentUser?.name || 'Patient',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent', // pending, sent, delivered, read
    };

    // Update local conversation
    const updatedConversations = conversations.map((conv) => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          messages: [...(conv.messages || []), newMessage],
          lastMessage: messageInput.trim(),
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    setSelectedConversation({
      ...selectedConversation,
      messages: [...(selectedConversation.messages || []), newMessage],
    });
    setMessageInput('');

    // Save to localStorage
    let storageKey = isAdmin ? 'healfund_admin_conversations' : `healfund_patient_conversations_${currentUser?.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedConversations));

    // Try to sync with backend
    try {
      await fetch('/api/conversations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: newMessage,
        }),
      });
    } catch (err) {
      console.warn('Backend offline, message saved locally:', err);
    }
  };

  const startNewConversation = (userId, userName) => {
    const convId = isAdmin ? `CONV-ADMIN-${userId}` : `CONV-PATIENT-${currentUser?.id}-ADMIN`;
    const existingConv = conversations.find((c) => c.id === convId);

    if (existingConv) {
      setSelectedConversation(existingConv);
      return;
    }

    const newConv = {
      id: convId,
      participantId: userId,
      participantName: userName,
      participantRole: isAdmin ? 'patient' : 'admin',
      messages: [],
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };

    const updated = [newConv, ...conversations];
    setConversations(updated);
    setSelectedConversation(newConv);

    let storageKey = isAdmin ? 'healfund_admin_conversations' : `healfund_patient_conversations_${currentUser?.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 200px)', gap: '0', borderRadius: '12px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      {/* Conversations List */}
      <div style={{ width: '320px', background: '#f5f5f5', borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5', background: '#fff' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#0f3b5e' }}>
            <i className="fas fa-comments"></i> {isAm ? 'ዝግጅት' : 'Messages'}
          </h3>
          <input
            type="text"
            placeholder={isAm ? 'ፈልግ...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e5e5',
              borderRadius: '20px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              {isAm ? 'መልዕክቶች የሉም' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e5e5',
                  background: selectedConversation?.id === conv.id ? '#e8f5e9' : '#fff',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = selectedConversation?.id === conv.id ? '#e8f5e9' : '#f9f9f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = selectedConversation?.id === conv.id ? '#e8f5e9' : '#fff'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px' }}>{conv.participantName}</strong>
                  {conv.unreadCount > 0 && (
                    <span style={{
                      background: '#078930',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: '#999', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {conv.lastMessage || isAm ? 'ምንም መልዕክት የለም' : 'No messages'}
                </p>
                <span style={{ fontSize: '11px', color: '#bbb' }}>
                  {new Date(conv.lastMessageTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5', background: '#078930', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedConversation.participantName}</h3>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>{selectedConversation.participantRole}</span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(selectedConversation.messages || []).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', marginTop: 'auto', marginBottom: 'auto' }}>
                  <p style={{ fontSize: '13px' }}>{isAm ? 'ምንም መልዕክት ገና' : 'No messages yet. Start the conversation!'}</p>
                </div>
              ) : (
                (selectedConversation.messages || []).map((msg) => {
                  const isSent = isAdmin ? msg.sender === 'admin' : msg.sender === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isSent ? 'flex-end' : 'flex-start',
                        marginBottom: '8px',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          background: isSent ? '#078930' : '#fff',
                          color: isSent ? '#fff' : '#0f3b5e',
                          padding: '10px 14px',
                          borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          wordWrap: 'break-word',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                      >
                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', lineHeight: '1.4' }}>
                          {msg.content}
                        </p>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #e5e5e5', background: '#fff', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={isAm ? 'መልዕክት ይጻፉ...' : 'Type a message...'}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid #e5e5e5',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                style={{
                  background: '#078930',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: !messageInput.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '18px',
                  opacity: !messageInput.trim() ? 0.5 : 1,
                }}
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            <p>{isAm ? 'ለመምረጥ ንግግር ይምረጡ' : 'Select a conversation to start messaging'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
