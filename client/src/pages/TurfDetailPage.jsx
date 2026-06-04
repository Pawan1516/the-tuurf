import React, { useState, useEffect, useContext } from 'react';
import CalendarButton from '../components/CalendarButton';
import { turfsAPI, bookingsAPI } from '../api/client';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, MapPin, Clock, Users, ChevronRight, Zap, Trophy,
  Shield, Car, Coffee, Dumbbell, Lightbulb, ArrowLeft,
  CheckCircle, TrendingUp, Send, BarChart3, Activity
} from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://the-tuurf-ufkd.onrender.com/api'
  : '/api';

const AMENITY_ICONS = {
  Washroom: Shield, Parking: Car, Cafeteria: Coffee,
  Equipment: Dumbbell, Lighting: Lightbulb, 'Changing Room': Users,
  'First Aid': Shield, WiFi: Zap
};

// Post-Match Team Selection Modal
const PostMatchModal = ({ matchId, onClose }) => {
  const [step, setStep] = useState('choice'); // 'choice' | 'loading' | 'result'
  const [result, setResult] = useState(null);
  const { user } = useContext(AuthContext);

  const handleChoice = async (choice) => {
    setStep('loading');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/matchmaking/post-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, choice })
      });
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch {
      setResult({ success: false, message: 'Could not process request. Try again.' });
      setStep('result');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-green-800 p-8 text-white text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic">Match Completed!</h2>
          <p className="text-emerald-200 text-sm mt-1 font-bold uppercase tracking-widest">Great game! What's next?</p>
        </div>

        <div className="p-8">
          {step === 'choice' && (
            <>
              <p className="text-center text-zinc-600 font-bold uppercase tracking-widest text-[10px] mb-6">
                Do you want to play again with:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleChoice('same')}
                  className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-2 border-emerald-100 hover:border-emerald-600 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-4 group"
                >
                  <div className="bg-emerald-100 group-hover:bg-emerald-500 p-3 rounded-xl transition-colors">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <div>Same Team</div>
                    <div className="text-[10px] font-bold opacity-60 uppercase tracking-tight">Rebook same players automatically</div>
                  </div>
                </button>
                <button
                  onClick={() => handleChoice('different')}
                  className="w-full bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border-2 border-green-100 hover:border-green-600 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-4 group"
                >
                  <div className="bg-green-100 group-hover:bg-green-500 p-3 rounded-xl transition-colors">
                    <Zap size={20} />
                  </div>
                  <div className="text-left">
                    <div>Different Team</div>
                    <div className="text-[10px] font-bold opacity-60 uppercase tracking-tight">AI matches you with new players</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">AI Matchmaking Agent working...</p>
            </div>
          )}

          {step === 'result' && result && (
            <div>
              <div className={`flex items-center gap-3 mb-4 ${result.success ? 'text-emerald-600' : 'text-rose-500'}`}>
                <CheckCircle size={20} />
                <p className="font-black text-sm uppercase tracking-widest italic">{result.message}</p>
              </div>
              {result.suggestedTeam?.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {result.suggestedTeam.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-black rounded-xl border border-zinc-100">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-black text-xs text-white uppercase italic">{p.name}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{p.role} · {p.skillLevel} · {p.compatibilityScore}% match</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.players?.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {result.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black">{i + 1}</div>
                      <p className="font-black text-xs text-white uppercase italic">{p.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.success && (
                <div className="flex items-center gap-4">
                  <Link
                    to="/book/custom"
                    className="mt-4 w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transform hover:scale-105"
                  >
                    Book New Slot <ChevronRight size={14} />
                  </Link>
                  <CalendarButton turfId={null} slotInfo={{ date: null, startTime: null, endTime: null }} />
                </div>
              )}
            </div>
          )}

          <button onClick={onClose} className="mt-6 w-full text-zinc-500 hover:text-zinc-600 text-[10px] font-black uppercase tracking-widest py-2 transition-colors">
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

// Smart Insights Component
const SmartInsights = ({ turf, dynamicAI }) => {
  if (!turf) return null;

  // Merge static DB data with dynamic AI analysis if available
  const aiData = dynamicAI?.aiAnalysis || turf.aiAnalysis;
  const bizData = dynamicAI?.businessAnalysis || turf.businessAnalysis;

  const aiInsights = [
    { label: 'AI Strategy: Best Time', value: aiData?.bestTime || '18:00 - 21:00', desc: 'Optimized for high-tempo play and cooling conditions.', icon: Zap },
    { label: 'Recommended Squad', value: aiData?.idealGroupSize || '5 vs 5 / 6 vs 6', desc: 'Tactical layout designed for maximum touch-points.', icon: Users },
    { label: 'Surface Profile', value: aiData?.surfaceCondition || 'Peak Performance', desc: 'Hybrid synthetic fibers optimized for speed.', icon: Activity }
  ];

  const businessInsights = [
    { label: 'Arena Demand', value: bizData?.revenueStatus || 'Peak Demand', desc: 'High frequency bookings during evening slots.', icon: TrendingUp },
    { label: 'Occupancy Rate', value: `${bizData?.occupancyRate || 85}%`, desc: 'Consistent player engagement across prime hours.', icon: BarChart3 },
    { label: 'Match Intensity', value: bizData?.matchIntensity || 'Competitive', desc: 'Preferred venue for tournament-grade matches.', icon: Trophy }
  ];

  return (
    <div className="space-y-12">
      {/* AI ANALYST SECTION */}
      <div className="bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
          <div className="flex items-center gap-3 bg-emerald-600 text-white px-4 py-2 rounded-xl w-fit shadow-xl shadow-emerald-500/20">
            <Zap size={14} className="fill-white animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Tactical Analyst</span>
          </div>
          {aiData?.summary && (
            <div className="bg-zinc-900/5 border-l-4 border-emerald-500 px-6 py-3 rounded-r-2xl max-w-xl">
               <p className="text-[11px] text-emerald-100/80 font-bold italic uppercase tracking-wide">"{aiData.summary}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
          {aiInsights.map((insight, i) => (
            <div key={i} className="space-y-4">
              <div className="w-14 h-14 bg-zinc-900/5 rounded-2xl flex items-center justify-center text-emerald-500 border border-white/5 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-700 transform group-hover:rotate-[360deg]">
                <insight.icon size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{insight.label}</p>
                <p className="text-xl font-black tracking-tight leading-none mb-3 italic uppercase">{insight.value}</p>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BUSINESS ANALYST SECTION */}
      <div className="bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group border border-zinc-100 shadow-xl shadow-emerald-900/[0.03] hover:shadow-2xl transition-all duration-700">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mb-32" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl w-fit relative z-10">
            <BarChart3 size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Business Arena Insight</span>
          </div>
          {bizData?.summary && (
            <div className="bg-emerald-50 border-l-4 border-emerald-600 px-6 py-3 rounded-r-2xl max-w-xl relative z-10">
               <p className="text-[11px] text-emerald-900/70 font-bold italic uppercase tracking-wide">"{bizData.summary}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
          {businessInsights.map((insight, i) => (
            <div key={i} className="space-y-4">
              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-emerald-600 border border-zinc-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-700 transform group-hover:scale-110">
                <insight.icon size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{insight.label}</p>
                <p className="text-xl font-black tracking-tight leading-none mb-3 italic uppercase">{insight.value}</p>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pricing Chart Component
const PricingChart = ({ slots }) => {
  if (!slots?.length) return null;
  const maxPrice = Math.max(...slots.map(s => s.price));

  return (
    <div className="bg-zinc-900 rounded-[2rem] p-6 md:p-8 border border-white/5">
      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-400" /> Dynamic Pricing Chart
      </h4>
      <div className="flex items-end gap-1 h-28 overflow-x-auto no-scrollbar">
        {slots.map(slot => {
          const heightPct = (slot.price / maxPrice) * 100;
          return (
            <div key={slot.hour} className="flex flex-col items-center gap-1 flex-1 min-w-[32px]">
              <span className="text-[8px] text-zinc-500 font-black">₹{(slot.price/100).toFixed(1)}k</span>
              <div
                className={`w-full rounded-t-lg transition-all hover:opacity-80 ${slot.isPeak ? 'bg-rose-500' : slot.isDay ? 'bg-emerald-400' : 'bg-green-600'}`}
                style={{ height: `${heightPct}%`, minHeight: '8px' }}
                title={`${slot.time} — ₹${slot.price} (${slot.label})`}
              />
              <span className="text-[8px] text-zinc-500 font-black">{slot.hour}h</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-6 flex-wrap">
        {[['bg-emerald-400','Day (Off-Peak)'],['bg-rose-500','Evening (Peak)'],['bg-green-600','Night']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${c}`} />
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DEMO_TURF = {
  _id: 'demo1', name: 'The Turf Miyapur', isFeatured: true,
  location: 'Plot no 491, Madhavapuri Hills, PJR Enclave, Miyapur, Hyderabad',
  sports: ['Football', 'Box Cricket'], groundSize: '90x60 ft', capacity: 22,
  amenities: ['Washroom', 'Parking', 'Cafeteria', 'Equipment', 'Lighting'],
  openingHour: 6, closingHour: 23,
  pricing: { weekdayDay: 1000, weekdayNight: 1200, weekendDay: 1200, weekendNight: 1500, transitionHour: 18 },
  rating: 4.5, reviewCount: 36,
  images: [
    'https://lh3.googleusercontent.com/p/AF1QipNPrYKn27LUcosUUL_CKc_0kJAwvZidmXHu1fQI=w426-h240-k-no',
    'https://lh3.googleusercontent.com/p/AF1QipMsbwyFcmcNneeEsp6NfnXw27Ovyk38W3LqHRk_=w203-h114-k-no',
  ],
  description: 'Premium sports turf in Miyapur offering professional-grade facilities for football and box cricket.',
  aiAnalysis: {
    bestTime: '06:00 PM – 09:00 PM',
    idealGroupSize: '5 vs 5 / 6 vs 6',
    targetAudience: 'Corporate & Friends',
    playStyle: 'High-Tempo Tactical',
    surfaceCondition: 'Premium Hybrid Synthetic'
  },
  businessAnalysis: {
    revenueStatus: 'Peak Demand Phase',
    occupancyRate: 88,
    popularDays: ['Friday', 'Saturday', 'Sunday'],
    averageSessionLength: 90,
    matchIntensity: 'Competitive Semi-Pro'
  },
  reviews: [
    { userName: 'Rahul M.', rating: 5, comment: 'Excellent turf! Perfect lighting and amazing ground.', createdAt: new Date().toISOString() },
    { userName: 'Kiran S.', rating: 4, comment: 'Great experience, parking is easy. Will rebook!', createdAt: new Date().toISOString() }
  ]
};

const TurfDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [turf, setTurf] = useState(null);
  const [dynamicAI, setDynamicAI] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [pricing, setPricing] = useState([]);
  const [showPostMatch, setShowPostMatch] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    const fetchTurf = async () => {
      try {
        const { data } = await turfsAPI.getById(id);
        if (data.success) {
          setTurf(data.turf);
          
          // Fetch Dynamic AI Analysis
          const aiRes = await turfsAPI.getAnalysis(id);
          if (aiRes.data.success) {
            setDynamicAI(aiRes.data.analysis);
          }

          // Fetch pricing chart
          const priceRes = await fetch(`${API_BASE}/turfs/${id}/pricing`);
          const priceData = await priceRes.json();
          if (priceData.success) setPricing(priceData.slots);
        } else {
          setTurf(DEMO_TURF);
        }
      } catch {
        setTurf(DEMO_TURF);
        // Build local pricing
        const slots = [];
        for (let h = 6; h < 23; h++) {
          const isPeak = h >= 17 && h <= 21;
          const isDay = h < 18;
          slots.push({ hour: h, time: `${h}:00`, price: isPeak ? 1200 : isDay ? 1000 : 1100, isPeak, isDay, label: isPeak ? 'Peak' : isDay ? 'Day' : 'Night' });
        }
        setPricing(slots);
      } finally {
        setLoading(false);
      }
    };
    fetchTurf();
  }, [id]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/turfs/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newReview)
      });
      setReviewSuccess(true);
      setNewReview({ rating: 5, comment: '' });
    } catch { /* ignore */ }
    finally { setSubmittingReview(false); }
  };

  const handleBookNow = () => {
    if (!user) return navigate('/login');
    navigate('/book/custom');
  };

  if (loading) return (
    <div className="min-h-screen premium-gradient flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  if (!turf) return <div className="min-h-screen flex items-center justify-center text-zinc-500 font-black uppercase tracking-widest">Turf not found</div>;

  return (
    <div className="min-h-screen premium-gradient pb-20 font-sans selection:bg-emerald-500/30">
      {showPostMatch && <PostMatchModal matchId="latest" onClose={() => setShowPostMatch(false)} />}

      {/* Back Nav - Premium Operations Header */}
      <div className="nav-glass sticky top-0 z-[100] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-4 group p-3 hover:bg-emerald-50/20 rounded-[1.5rem] transition-all">
              <div className="bg-zinc-900 text-white p-3.5 rounded-2xl shadow-xl transition-transform group-hover:-translate-x-1 group-hover:bg-emerald-600"><ArrowLeft size={20} /></div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-1">Arena Network</span>
                <span className="text-xl font-black text-white tracking-tighter uppercase italic">Return</span>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {turf.isFeatured && (
              <div className="hidden md:flex items-center gap-3 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm animate-pulse">
                <Zap size={14} className="fill-emerald-600" /> Featured Arena Hub
              </div>
            )}
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-zinc-900/20 group hover:bg-emerald-600 transition-colors">
               <Shield size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 gpu-layer animate-fade-up">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative rounded-[2.5rem] overflow-hidden h-64 md:h-96 bg-zinc-100 border border-zinc-100 shadow-2xl">
                <img
                  src={turf.images?.[activeImage] || turf.coverImage}
                  alt={turf.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {turf.isFeatured && (
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-xl shadow-emerald-500/30">
                    <Zap size={12} className="fill-white" /> Featured
                  </div>
                )}
              </div>
              {turf.images?.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {turf.images.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-24 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-emerald-500 scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Rating */}
            <div className="glass-card p-8 md:p-12 relative group overflow-hidden border border-zinc-100">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-green-400"></div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none mb-6 group-hover:scale-[1.01] transition-transform duration-500 origin-left italic">
                {turf.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={18} className={i <= Math.round(turf.rating) ? 'fill-emerald-500 text-emerald-500' : 'text-zinc-200'} />
                  ))}
                  <span className="font-black text-white ml-2 text-lg">{turf.rating?.toFixed(1)}</span>
                  <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest ml-1">({turf.reviewCount} reviews)</span>
                </div>
              </div>
              <div className="flex items-start gap-3 text-zinc-500">
                <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-sm font-bold leading-relaxed tracking-tight">{turf.location}</span>
              </div>
              {turf.mapLink && (
                <a href={turf.mapLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] hover:text-emerald-700 transition-colors">
                  Get Directions <ChevronRight size={14} />
                </a>
              )}
              {turf.description && (
                <div className="mt-10 pt-10 border-t border-zinc-100">
                  <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em]">Venue Description</h3>
                   <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-emerald-100 shadow-sm">
                     <Zap size={12} className="fill-emerald-700" /> Premium Arena
                   </div>
                  </div>
                   <p className="text-zinc-600 text-sm md:text-base leading-relaxed font-bold tracking-tight">
                    {turf.description}
                   </p>
                </div>
              )}

              {/* Digital Features Highlights */}
              <div className="mt-10 pt-10 border-t border-zinc-100">
                <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em] mb-8">Match Day Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { title: 'AI Chatbot Support', desc: 'Instant 24/7 assistance for match logistics and slot queries.', icon: Zap },
                    { title: 'Live Bench Stats', desc: 'Broadcast match performance direct to player leaderboards.', icon: Trophy },
                    { title: 'Smart Entry Hub', desc: 'One-tap QR verification for non-interruptive game access.', icon: CheckCircle },
                    { title: 'Arena Alerts', desc: 'Real-time match notifications and rebooking reminders.', icon: Send }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-5 p-6 bg-black rounded-3xl border border-zinc-100 hover:border-emerald-200 hover:bg-zinc-900 transition-all group shadow-sm hover:shadow-xl hover:shadow-emerald-900/[0.03]">
                      <div className="bg-zinc-900 p-4 rounded-2xl shadow-sm group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-300">
                        <feat.icon size={20} className="text-emerald-600 group-hover:text-white" />
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-white uppercase tracking-wider mb-1.5 italic">{feat.title}</h4>
                        <p className="text-[11px] text-zinc-500 font-bold leading-relaxed tracking-tight">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {turf.tags?.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-10">
                  {turf.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                      <Zap size={12} className="fill-emerald-600" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sports & Info */}
            <div className="glass-card p-8 md:p-12 border border-zinc-100">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Venue Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: 'Sports', value: (turf.sports || []).join(', '), icon: Trophy },
                  { label: 'Ground Size', value: turf.groundSize || '90x60 ft', icon: Users },
                  { label: 'Open', value: `${turf.openingHour}:00 – ${turf.closingHour}:00`, icon: Clock },
                  { label: 'Capacity', value: `${turf.capacity || 22} Players`, icon: Users },
                ].map(item => (
                  <div key={item.label} className="bg-black rounded-2xl p-5 border border-zinc-100">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">{item.label}</p>
                    <p className="font-black text-white text-sm uppercase italic">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Amenities */}
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-5">Amenities</h4>
              <div className="flex flex-wrap gap-4">
                {(turf.amenities || []).map(am => {
                  const Icon = AMENITY_ICONS[am] || CheckCircle;
                  return (
                    <div key={am} className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-xl border border-emerald-100 shadow-sm">
                      <Icon size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{am}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Smart Insights */}
            <SmartInsights turf={turf} dynamicAI={dynamicAI} />

            {/* Dynamic Pricing Chart */}
            <PricingChart slots={pricing} />

            {/* Reviews */}
            <div className="glass-card p-8 md:p-12 border border-zinc-100">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Star size={16} className="text-emerald-500 fill-emerald-500" /> Player Reviews
              </h3>
              <div className="space-y-6 mb-10">
                {(turf.reviews || []).slice(0, 5).map((r, i) => (
                  <div key={i} className="bg-black rounded-3xl p-6 border border-zinc-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-black text-sm text-white uppercase italic">{r.userName}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} size={14} className={star <= r.rating ? 'fill-emerald-500 text-emerald-500' : 'text-zinc-200'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-zinc-600 text-sm font-bold tracking-tight">{r.comment}</p>}
                  </div>
                ))}
              </div>

              {/* Add Review Form */}
              {user && !reviewSuccess && (
                <form onSubmit={handleReviewSubmit} className="border-t border-zinc-100 pt-10 space-y-6">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Add Your Review</h4>
                  <div className="flex gap-3">
                    {[1,2,3,4,5].map(r => (
                      <button key={r} type="button" onClick={() => setNewReview(p => ({ ...p, rating: r }))} className="transform active:scale-90 transition-transform">
                        <Star size={28} className={r <= newReview.rating ? 'fill-emerald-500 text-emerald-500' : 'text-zinc-200 hover:text-emerald-300 transition-colors'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newReview.comment}
                    onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))}
                    placeholder="Share your match-day experience..."
                    rows={3}
                    className="w-full bg-black border-2 border-transparent focus:border-emerald-500/30 focus:bg-zinc-900 p-5 rounded-[2rem] outline-none text-sm text-white transition-all resize-none font-bold shadow-inner"
                  />
                  <button type="submit" disabled={submittingReview}
                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
                  >
                    <Send size={16} />
                    {submittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </form>
              )}
              {reviewSuccess && (
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 p-5 rounded-2xl border border-emerald-100 text-sm font-black uppercase tracking-widest italic animate-bounce-subtle">
                  <CheckCircle size={20} /> Review successfully broadcasted!
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Column — Booking & Post-Match */}
          <div className="lg:sticky lg:top-36 space-y-8">
            {/* Booking Card - Operations Terminal Style */}
            <div className="bg-zinc-950 rounded-[3rem] p-10 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group border border-white/5 selection:bg-emerald-600">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-600 to-green-500"></div>
               <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
               
               <div className="flex items-center gap-3 mb-10 relative z-10">
                  <div className="w-2 h-5 bg-emerald-500 rounded-sm shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Booking Protocol</p>
               </div>

               <div className="flex items-baseline gap-2 mb-12 relative z-10">
                 <span className="text-7xl font-black tracking-tighter text-white drop-shadow-2xl italic">₹{turf.pricing?.weekdayDay || 1000}</span>
                 <span className="text-emerald-500/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">/ Hr Base</span>
               </div>

               <div className="space-y-4 mb-10 relative z-10">
                 <h4 className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-5 italic">Dynamic Rate Matrix</h4>
                 {[
                   { label: 'Weekday Prime', price: turf.pricing?.weekdayNight },
                   { label: 'Weekend Morning', price: turf.pricing?.weekendDay },
                   { label: 'Weekend Prime', price: turf.pricing?.weekendNight },
                 ].map(p => (
                   <div key={p.label} className="flex justify-between items-center px-6 py-5 bg-zinc-900/5 rounded-2xl border border-white/5 group-hover:bg-zinc-900/10 transition-all shadow-inner">
                     <span className="text-[10px] text-white/50 font-black uppercase tracking-wider">{p.label}</span>
                     <span className="font-black text-emerald-400 text-lg italic">₹{p.price}</span>
                   </div>
                 ))}
               </div>

               <button
                  onClick={handleBookNow}
                  disabled={bookingSubmitting}
                  className="w-full bg-emerald-600 hover:bg-zinc-900 text-white hover:text-white py-6 rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl shadow-emerald-500/20 group/btn relative z-10 disabled:opacity-50"
                >
                  {bookingSubmitting ? 'Booking...' : 'Initiate Sequence'} <ChevronRight size={18} className="group-hover/btn:translate-x-2 transition-transform duration-500" />
                </button>

               <div className="flex items-center justify-center gap-3 mt-10 opacity-30 relative z-10">
                 <Clock size={16} />
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">
                   Arena Window: {turf.openingHour}:00 – {turf.closingHour}:00
                 </span>
               </div>
            </div>

            {/* Post-Match AI Card */}
            <div className="bg-zinc-900 rounded-[3rem] p-8 border border-zinc-100 shadow-xl shadow-emerald-900/[0.03] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full"></div>
              <div className="flex items-center gap-3 mb-5 relative z-10">
                <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
                  <Zap size={18} className="text-white fill-white" />
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">AI Post-Match</p>
              </div>
              <h4 className="font-black text-white text-lg tracking-tight mb-3 italic uppercase">Just finished a match?</h4>
              <p className="text-zinc-500 text-[11px] font-bold leading-relaxed mb-6 tracking-tight">
                Our AI matchmaking agent finds the perfect team for your next game — same squad or fresh challenge!
              </p>
              
            <div className="flex items-center gap-4 mt-6">
                <button
                    onClick={handleBookNow}
                    disabled={bookingSubmitting}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transform hover:scale-105 disabled:opacity-50"
                  >
                    {bookingSubmitting ? 'Booking...' : 'Book New Slot'} <ChevronRight size={14} />
                  </button>
              </div>

              <button
                onClick={() => user ? setShowPostMatch(true) : navigate('/login')}
                className="w-full bg-zinc-900 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
              >
                <Trophy size={16} /> Play Again
              </button>
            </div>
          </div>

        </div>
      </div>
      
      {/* Mobile Sticky Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[90] md:hidden p-5 bg-zinc-900/90 backdrop-blur-3xl border-t border-zinc-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-safe mb-mobile-nav">
        <div className="max-w-[400px] mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest leading-none mb-1.5">Starts From</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white leading-none italic">₹{turf?.pricing?.weekdayDay || 1000}</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase">/hr</span>
            </div>
          </div>
          <button
            onClick={handleBookNow}
            disabled={bookingSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all outline-none disabled:opacity-50"
          >
            {bookingSubmitting ? 'Booking...' : 'Initiate Sequence'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TurfDetailPage;
