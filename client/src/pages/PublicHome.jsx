import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { slotsAPI } from '../api/client';
import { Calendar, Clock, ChevronRight, Info, Zap, MapPin, Plus } from 'lucide-react';

const PublicHome = () => {
    const [slots, setSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const heroImages = [
        'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
        'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
        'https://lh3.googleusercontent.com/gps-cs-s/AHVAwepkoP29RPlPNGboLneeOgvbhpHEwA99AxCpM55ViIdwNpOmphYvagNoffmNoh8g6xJ52bLQCmpLWMh1MxvnOZixgrwC8qCtHVvW5STmUmO_pWnP3Tem2-ceTSUzPnUxUazvfe1NBw=w203-h152-k-no',
        'https://lh3.googleusercontent.com/p/AF1QipOn7CkSrcWUs8IeOSKZFX0MT1NMp37Evqr1sSPZ=w203-h152-k-no'
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await slotsAPI.getAll(selectedDate);
                if (Array.isArray(res.data)) setSlots(res.data);
                else setSlots([]);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching slots:', err);
                setError('Terminal synchronization failure');
                setLoading(false);
            }
        };
        fetchSlots();
    }, [selectedDate]);

    const formatTime12h = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const dates = [0, 1, 2, 3, 4, 5, 6].map(days => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const localDateStr = d.toLocaleDateString('en-CA');
        return {
            dateStr: localDateStr,
            display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            label: days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : "AVAILABLE",
            days
        };
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* HERO SECTION WITH BACKGROUND IMAGE SLIDER */}
            <section className="relative h-[480px] w-full flex flex-col items-center justify-center overflow-hidden">
                {heroImages.map((img, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 bg-cover bg-center brightness-[0.4] transition-all duration-1000 ease-in-out transform ${idx === currentImageIndex
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-105 select-none pointer-events-none'
                            }`}
                        style={{ backgroundImage: `url('${img}')` }}
                    ></div>
                ))}

                <div className="relative z-10 text-center space-y-4 px-4">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-2xl">
                        Feel Free <span className="text-emerald-400"> Play Better</span>
                    </h1>
                    <p className="text-xs md:text-sm font-black text-white/80 uppercase tracking-[0.6em] md:tracking-[1em] mb-12 drop-shadow-lg">
                        Select your squad. Lock your slot
                    </p>

                    {/* SLIDER DOTS */}
                    <div className="flex justify-center gap-3">
                        {heroImages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'w-8 bg-emerald-400' : 'w-2 bg-white/30'
                                    }`}
                            ></button>
                        ))}
                    </div>
                </div>
            </section>

            {/* MAIN INTERFACE OVERLAPPING HERO */}
            <div className="max-w-7xl mx-auto w-full px-6 -mt-32 relative z-20 mb-32">
                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* DATE SIDEBAR - MATCHES SCREENSHOT */}
                    <div className="lg:col-span-3 bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 min-h-[500px]">
                        {dates.map((d) => {
                            const isActive = selectedDate === d.dateStr;
                            return (
                                <button
                                    key={d.dateStr}
                                    onClick={() => setSelectedDate(d.dateStr)}
                                    className={`w-full text-left p-8 rounded-[1.8rem] transition-all duration-300 flex flex-col gap-1.5 relative border-2 ${isActive
                                        ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-500/10'
                                        : 'bg-transparent border-transparent hover:bg-slate-50'
                                        }`}
                                >
                                    <div className={`font-black text-xl tracking-tight leading-none ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {d.display}
                                    </div>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 ${isActive ? 'text-emerald-500' : 'text-slate-300'}`}>
                                        {d.days === 0 && <Zap size={10} className="fill-emerald-500" />} {d.label}
                                    </div>
                                    {isActive && (
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-10 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* DEPLOYMENT LOGS - MATCHES SCREENSHOT HEADER & TABLE */}
                    <div className="lg:col-span-9 bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden min-h-[600px]">

                        {/* THE NAVY HEADER */}
                        <div className="bg-[#1e293b] p-12 flex flex-col md:flex-row justify-between items-center text-white relative gap-8">
                            <div className="space-y-1.5 flex-1">
                                <h2 className="text-2xl font-black uppercase tracking-[0.1em] text-emerald-400 leading-none">Book Your Slot Now</h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">
                                    {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/book/custom"
                                    className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center gap-2"
                                >
                                    <Plus size={14} /> Custom Time
                                </Link>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">Pricing</p>
                                    <p className="text-2xl font-black text-white leading-none tracking-tighter">₹500 / HR</p>
                                </div>
                                <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                                    <Zap size={24} className="fill-emerald-400" />
                                </div>
                            </div>
                        </div>

                        {/* TABLE CONTENT */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#1e293b] text-white/40 text-[11px] font-black uppercase tracking-[0.3em] border-t border-white/5">
                                        <th className="px-12 py-7 text-emerald-400">Time Segment</th>
                                        <th className="px-12 py-7">Slot Type</th>
                                        <th className="px-12 py-7">Status</th>
                                        <th className="px-12 py-7">Price</th>
                                        <th className="px-12 py-7 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Arena Data...</td></tr>
                                    ) : slots.length === 0 ? (
                                        <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No slots available for this timeline</td></tr>
                                    ) : slots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => {
                                        const isFree = slot.status === 'free';
                                        const isBooked = slot.status === 'booked';
                                        return (
                                            <tr key={slot._id} className="transition-all hover:bg-teal-50/30 group">
                                                <td className="px-12 py-10">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-2xl font-black tracking-tight text-slate-900">
                                                            {formatTime12h(slot.startTime)}
                                                        </span>
                                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                                            Until {formatTime12h(slot.endTime)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <span className="text-[10px] font-black px-5 py-2 rounded-xl uppercase tracking-widest bg-slate-900 text-teal-400 border border-teal-500/20">
                                                        Standard Hour
                                                    </span>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${isFree ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : isBooked ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-500'}`}></div>
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isFree ? 'text-emerald-600' : isBooked ? 'text-rose-500' : 'text-amber-600'}`}>
                                                            {isFree ? 'Available' : isBooked ? 'Booked Out' : 'On Hold'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-10">
                                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{slot.price || 500}</span>
                                                </td>
                                                <td className="px-12 py-10 text-center">
                                                    {isFree ? (
                                                        <Link
                                                            to={`/book/${slot._id}`}
                                                            className="inline-flex items-center gap-3 bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/30 transform hover:-translate-y-1 active:scale-95 text-[11px] uppercase tracking-widest leading-none"
                                                        >
                                                            Book <ChevronRight size={16} />
                                                        </Link>
                                                    ) : (
                                                        <div className={`inline-flex px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest border-2 leading-none ${isBooked ? 'border-rose-100 text-rose-200' : 'border-amber-100 text-amber-200'}`}>
                                                            SECURED
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* NAVIGATION ARROWS AT BOTTOM */}
                <div className="mt-12 flex items-center justify-center gap-4">
                    <button className="w-14 h-14 bg-slate-200/50 text-slate-400 rounded-full flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-lg active:scale-90">
                        <ChevronRight className="rotate-180" size={24} />
                    </button>
                    <button className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all shadow-xl active:scale-90">
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            {/* LOCATION INTEL SECTION */}
            <div className="max-w-7xl mx-auto w-full px-6 mb-32">
                <div className="bg-white border border-slate-100 rounded-[3rem] p-12 flex flex-col md:flex-row items-center gap-12 shadow-[0_20px_60px_rgba(0,0,0,0.05)]">
                    <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-600/30">
                        <MapPin size={48} />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h4 className="font-black text-slate-900 text-3xl tracking-tighter uppercase leading-none">Location Intelligence</h4>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[11px]">
                            Plot no 491, Madhavapuri Hills, PJR Layout, Miyapur, Hyderabad
                        </p>
                    </div>
                    <a
                        href="https://www.google.com/maps/dir/?api=1&destination=Plot+no+491,+The+Turf,+Madhavapuri+Hills,+PJR+Layout,+Miyapur,+Hyderabad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-2xl active:scale-95 whitespace-nowrap"
                    >
                        Get Directions
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PublicHome;
