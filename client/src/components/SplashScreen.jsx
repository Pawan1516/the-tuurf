import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onComplete) onComplete();
        }, 1500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0d1b0f] flex flex-col items-center justify-center animate-in fade-in duration-300">
            {/* dynamic aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]"></div>
            
            <div className="relative flex flex-col items-center gap-8 animate-in zoom-in-95 duration-700">
                <div className="w-24 h-24 bg-white rounded-[2rem] p-4 shadow-2xl shadow-emerald-500/20 transform rotate-12 flex items-center justify-center overflow-hidden">
                    <img src="/logo.png" alt="The Turf" className="w-20 h-20 object-contain" onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://cdn-icons-png.flaticon.com/512/3233/3233513.png';
                    }} />
                </div>
                
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">The Turf</h1>
                    <div className="flex items-center gap-3">
                         <div className="h-[1px] w-8 bg-emerald-500/30"></div>
                         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">AI Powered Space</p>
                         <div className="h-[1px] w-8 bg-emerald-500/30"></div>
                    </div>
                </div>

                <div className="mt-8 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                </div>
            </div>
            
            <p className="absolute bottom-10 text-[9px] font-bold text-white/20 uppercase tracking-[0.5em]">Initializing Smart Arena</p>
        </div>
    );
};

export default SplashScreen;
