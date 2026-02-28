import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minus, Maximize2, Zap, User, Bot, Loader2, Paperclip } from 'lucide-react';
import { chatbotAPI } from '../api/client';

const CricBotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'bot', text: '🏏 Welcome to The Turf Stadium! I\'m CricBot, your booking assistant. How can I help you today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isOpen, isMinimized]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const userMsg = message.trim();
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
        setMessage('');
        setLoading(true);

        try {
            const { data } = await chatbotAPI.sendMessage(userMsg);
            if (data.success) {
                const botMsg = {
                    role: 'bot',
                    text: data.reply,
                    type: data.type,
                    paymentData: data.paymentData
                };
                setChatHistory(prev => [...prev, botMsg]);
            } else {
                setChatHistory(prev => [...prev, { role: 'bot', text: `CricBot: ${data.message || 'Something went wrong.'}` }]);
            }
        } catch (error) {
            console.error('Chatbot Widget Error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Connection lost.';
            setChatHistory(prev => [...prev, { role: 'bot', text: `Sorry, I'm having trouble connecting (${errorMsg}). Please try again later.` }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-[1000] group"
            >
                <div className="absolute -top-12 right-0 bg-white text-emerald-900 border border-emerald-100 px-4 py-2 rounded-2xl text-xs font-black shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Quick Booking 🏏
                </div>
                <MessageSquare size={28} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] rounded-[2.5rem] bg-white shadow-2xl transition-all z-[1000] border border-gray-100 overflow-hidden flex flex-col ${isMinimized ? 'h-20' : 'h-[600px] max-h-[calc(100vh-6rem)]'}`}>
            {/* Header */}
            <div className="bg-gray-900 p-6 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-emerald-900/20">
                        <Zap size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">CricBot AI</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest">Online Agent</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    >
                        {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Chat History */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50"
                    >
                        {chatHistory.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-900 text-white'}`}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-emerald-600 text-white rounded-tr-none'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.text.split('\n').map((line, j) => (
                                        <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>
                                    ))}

                                    {msg.paymentData && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-3">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Scan to Pay via UPI</p>
                                            <img
                                                src={msg.paymentData.qrCode}
                                                alt="Payment QR"
                                                className="w-40 h-40 rounded-lg shadow-sm bg-white p-2"
                                            />
                                            <a
                                                href={msg.paymentData.upiLink}
                                                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold text-center hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                                            >
                                                Pay via App 📱
                                            </a>
                                            <p className="text-[8px] text-gray-400 text-center italic">After paying, please share the screenshot here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-3 animate-in fade-in duration-300">
                                <div className="shrink-0 w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                                    <Bot size={16} />
                                </div>
                                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                    <Loader2 size={16} className="text-emerald-600 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form
                        onSubmit={handleSend}
                        className="p-6 bg-white border-t border-gray-50"
                    >
                        <div className="relative group flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Ask about booking a slot..."
                                    className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-5 pr-14 text-sm focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-400 font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !message.trim()}
                                    className="absolute right-2 top-2 bottom-2 aspect-square bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 active:scale-90 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-lg shadow-emerald-600/20"
                                >
                                    <Send size={18} />
                                </button>
                            </div>

                            <label className="shrink-0 cursor-pointer p-3 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-2xl transition-all border border-transparent hover:border-emerald-100 active:scale-95">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            setChatHistory(prev => [...prev, { role: 'user', text: `[Image Attached: ${file.name}]` }]);
                                            setTimeout(() => {
                                                setChatHistory(prev => [...prev, { role: 'bot', text: "✅ Screenshot received! Our team will verify the payment and send your final booking confirmation shortly. 🏏" }]);
                                            }, 1000);
                                        }
                                    }}
                                />
                                <Paperclip size={20} />
                            </label>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-3 text-center uppercase font-black tracking-widest opacity-50">Powered by CricBot Intelligence</p>
                    </form>
                </>
            )}
        </div>
    );
};

export default CricBotWidget;
