import React, { useState, useEffect, useRef, useContext } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, Zap, TrendingUp, User, Globe } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import apiClient from '../api/client';

export default function CricBotWidget({ matchId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', text: "Namaste! I'm CricBot, your data-driven cricket analyst. Ask me about match stats, win probabilities, or pitch conditions!", timestamp: new Date() }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsgText = input.trim();
        const userMsg = { role: 'user', text: userMsgText, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await apiClient.post('/ag-chat/chat', { message: userMsgText, context: matchId });
            if (res.data?.success) {
                setMessages(prev => [...prev, { role: 'bot', text: res.data.reply, intent: res.data.intent, timestamp: new Date() }]);
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error connecting to the intelligence core.", timestamp: new Date() }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Network error while connecting to AI brain.", timestamp: new Date() }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed bottom-24 right-6 z-[999]">
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all group relative border-4 border-white"
                >
                    <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                    <Bot size={28} className="relative z-10" />
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest border-2 border-white shadow-sm">LIVE DATA</div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-[calc(100vw-48px)] max-w-[380px] h-[500px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                    {/* Header */}
                    <div className="bg-slate-900 p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                                <Sparkles className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-black text-sm uppercase tracking-widest">CricBot <span className="text-emerald-400">Analyst</span></h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Analyzing Local Telemetry</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div 
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scroll-smooth no-scrollbar"
                    >
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                                <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-sm ${msg.role === 'user' ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-100'}`}>
                                        {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-emerald-500" />}
                                    </div>
                                    <div className={`p-4 rounded-[1.5rem] text-[13px] font-bold shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start animate-in fade-in">
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-blue-100 flex items-center justify-center">
                                        <Bot size={14} className="text-emerald-500" />
                                    </div>
                                    <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-slate-100 flex gap-1">
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-5 bg-white border-t border-slate-100">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask CricBot anything..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                            />
                            <button
                                type="submit"
                                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                            {['Today Earnings?', 'Book a Slot', 'Win Probability?'].map((tag, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setInput(tag)}
                                    className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-[9px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap hover:bg-blue-100 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}



