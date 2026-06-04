import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';

/**
 * ChatBot component – lightweight AI chat widget using the full AI stack (e.g., OpenAI/Gemini).
 * It maintains a conversation state, sends user messages to a backend AI endpoint,
 * and displays both user and assistant replies.
 *
 * Expected backend endpoint: `/api/chat` (POST) with JSON body `{ messages: [{role, content}] }`
 * Returns `{ reply: string }`.
 */
const ChatBot = () => {
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant', content: string}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Auto‑scroll to bottom on new message
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });
      if (!resp.ok) throw new Error('Chat API error');
      const data = await resp.json();
      const assistantMsg = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
      const errMsg = { role: 'assistant', content: 'Sorry, I encountered an error.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 w-80 max-w-full bg-white rounded-xl shadow-2xl border border-emerald-500/10 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-emerald-500 text-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Bot size={20} className="fill-white" />
          <span className="font-black uppercase tracking-widest text-sm">AI Assistant</span>
        </div>
        <button onClick={() => setMessages([])} className="text-white/70 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Message list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="animate-pulse text-gray-400 text-sm">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-center border-t border-gray-200 p-2 bg-white">
        <textarea
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Message..."
          className="flex-1 resize-none border-none focus:ring-0 text-sm px-2 py-1"
        />
        <button onClick={handleSend} disabled={loading} className="p-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
