import React, { useState, useEffect, useContext } from 'react';
import { turfsAPI } from '../api/client';
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
      <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 text-white text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-2xl font-black tracking-tighter uppercase">Match Completed!</h2>
          <p className="text-emerald-200 text-sm mt-1">Great game! What's next?</p>
        </div>

        <div className="p-8">
          {step === 'choice' && (
            <>
              <p className="text-center text-slate-600 font-medium mb-6">
                Do you want to play again with:
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleChoice('same')}
                  className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-2 border-emerald-200 hover:border-emerald-600 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-4 group"
                >
                  <div className="bg-emerald-100 group-hover:bg-emerald-500 p-3 rounded-xl transition-colors">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <div>Same Team</div>
                    <div className="text-[10px] font-medium opacity-60 normal-case tracking-normal">Rebook same players automatically</div>
                  </div>
                </button>
                <button
                  onClick={() => handleChoice('different')}
                  className="w-full bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border-2 border-blue-200 hover:border-blue-600 p-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-4 group"
                >
                  <div className="bg-blue-100 group-hover:bg-blue-500 p-3 rounded-xl transition-colors">
                    <Zap size={20} />
                  </div>
                  <div className="text-left">
                    <div>Different Team</div>
                    <div className="text-[10px] font-medium opacity-60 normal-case tracking-normal">AI matches you with new players</div>
                  </div>
                </button>
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 font-medium text-sm">AI Matchmaking Agent working...</p>
            </div>
          )}

          {step === 'result' && result && (
            <div>
              <div className={`flex items-center gap-3 mb-4 ${result.success ? 'text-emerald-600' : 'text-red-500'}`}>
                <CheckCircle size={20} />
                <p className="font-black text-sm uppercase tracking-widest">{result.message}</p>
              </div>
              {result.suggestedTeam?.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.suggestedTeam.slice(0, 6).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-black">{i + 1}</div>
                      <div className="flex-1">
                        <p className="font-black text-xs text-slate-900">{p.name}</p>
                        <p className="text-[10px] text-slate-400">{p.role} · {p.skillLevel} · {p.compatibilityScore}% match</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.players?.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {result.players.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-black">{i + 1}</div>
                      <p className="font-black text-xs text-slate-900">{p.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.success && (
                <Link
                  to="/book/custom"
                  className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  Book New Slot <ChevronRight size={14} />
                </Link>
              )}
            </div>
          )}

          <button onClick={onClose} className="mt-4 w-full text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 transition-colors">
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
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl w-fit relative z-10">
            <Zap size={14} className="text-emerald-400 fill-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">AI Tactical Analyst</span>
          </div>
          {aiData?.summary && (
            <div className="bg-white/5 border-l-4 border-emerald-500 px-6 py-3 rounded-r-2xl max-w-xl relative z-10">
               <p className="text-[11px] text-emerald-100/80 font-medium italic">"{aiData.summary}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
          {aiInsights.map((insight, i) => (
            <div key={i} className="space-y-4">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-500 border border-white/5 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-700 transform group-hover:rotate-[360deg]">
                <insight.icon size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{insight.label}</p>
                <p className="text-xl font-black tracking-tight leading-none mb-3">{insight.value}</p>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BUSINESS ANALYST SECTION */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 text-slate-900 relative overflow-hidden group border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all duration-700">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] -mr-32 -mb-32" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl w-fit relative z-10">
            <BarChart3 size={14} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Business Arena Insight</span>
          </div>
          {bizData?.summary && (
            <div className="bg-blue-50 border-l-4 border-blue-600 px-6 py-3 rounded-r-2xl max-w-xl relative z-10">
               <p className="text-[11px] text-blue-900/70 font-medium italic">"{bizData.summary}"</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
          {businessInsights.map((insight, i) => (
            <div key={i} className="space-y-4">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-700 transform group-hover:scale-110">
                <insight.icon size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{insight.label}</p>
                <p className="text-xl font-black tracking-tight leading-none mb-3">{insight.value}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{insight.desc}</p>
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
    <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
        <TrendingUp size={14} className="text-emerald-400" /> Dynamic Pricing Chart
      </h4>
      <div className="flex items-end gap-1 h-28 overflow-x-auto">
        {slots.map(slot => {
          const heightPct = (slot.price / maxPrice) * 100;
          return (
            <div key={slot.hour} className="flex flex-col items-center gap-1 flex-1 min-w-[32px]">
              <span className="text-[8px] text-slate-400 font-bold">₹{(slot.price/100).toFixed(1)}k</span>
              <div
                className={`w-full rounded-t-lg transition-all hover:opacity-80 ${slot.isPeak ? 'bg-rose-500' : slot.isDay ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ height: `${heightPct}%`, minHeight: '8px' }}
                title={`${slot.time} — ₹${slot.price} (${slot.label})`}
              />
              <span className="text-[8px] text-slate-500 font-bold">{slot.hour}h</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 flex-wrap">
        {[['bg-emerald-500','Day (Off-Peak)'],['bg-rose-500','Evening (Peak)'],['bg-blue-500','Night']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${c}`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{l}</span>
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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );

  if (!turf) return <div className="min-h-screen flex items-center justify-center text-slate-400">Turf not found</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {showPostMatch && <PostMatchModal matchId="latest" onClose={() => setShowPostMatch(false)} />}

      {/* Back Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition-colors group">
            <div className="bg-gray-50 group-hover:bg-emerald-50 p-2 rounded-xl transition-colors"><ArrowLeft size={16} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">All Turfs</span>
          </button>
          {turf.isFeatured && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-100">
              <Zap size={10} className="fill-emerald-600" /> Featured Venue
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">

            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative rounded-[2rem] overflow-hidden h-64 md:h-96 bg-gray-100">
                <img
                  src={turf.images?.[activeImage] || turf.coverImage}
                  alt={turf.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {turf.isFeatured && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                    <Zap size={10} className="fill-white" /> Featured
                  </div>
                )}
              </div>
              {turf.images?.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {turf.images.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveImage(idx)}
                      className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${activeImage === idx ? 'border-emerald-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Rating */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-xl shadow-emerald-900/5">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-3">
                {turf.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} size={16} className={i <= Math.round(turf.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                  ))}
                  <span className="font-black text-slate-900 ml-1">{turf.rating?.toFixed(1)}</span>
                  <span className="text-slate-400 text-sm">({turf.reviewCount} reviews)</span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-500">
                <MapPin size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{turf.location}</span>
              </div>
              {turf.mapLink && (
                <a href={turf.mapLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-emerald-600 text-xs font-black uppercase tracking-widest hover:text-emerald-700 transition-colors">
                  Get Directions <ChevronRight size={12} />
                </a>
              )}
              {turf.description && (
                <div className="mt-8 pt-8 border-t border-slate-50">
                  <div className="flex items-center justify-between mb-4">
                   <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Venue Description</h3>
                   <div className="flex items-center gap-1.5 bg-emerald-100/50 text-emerald-700 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-emerald-200">
                     <Zap size={10} className="fill-emerald-700" /> Premium Arena
                   </div>
                  </div>
                   <p className="text-slate-600 text-[13px] md:text-sm leading-relaxed font-medium">
                    {turf.description}
                   </p>
                </div>
              )}

              {/* Digital Features Highlights */}
              <div className="mt-8 pt-8 border-t border-slate-50">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-6">Match Day Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'AI Chatbot Support', desc: 'Instant 24/7 assistance for match logistics and slot queries.', icon: Zap },
                    { title: 'Live Bench Stats', desc: 'Broadcast match performance direct to player leaderboards.', icon: Trophy },
                    { title: 'Smart Entry Hub', desc: 'One-tap QR verification for non-interruptive game access.', icon: CheckCircle },
                    { title: 'Arena Alerts', desc: 'Real-time match notifications and rebooking reminders.', icon: Send }
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-white transition-all group">
                      <div className="bg-white p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <feat.icon size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1">{feat.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {turf.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-8">
                  {turf.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                      <Zap size={10} className="fill-emerald-600" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sports & Info */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-xl shadow-emerald-900/5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5">Venue Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Sports', value: (turf.sports || []).join(', '), icon: Trophy },
                  { label: 'Ground Size', value: turf.groundSize || '90x60 ft', icon: Users },
                  { label: 'Open', value: `${turf.openingHour}:00 – ${turf.closingHour}:00`, icon: Clock },
                  { label: 'Capacity', value: `${turf.capacity || 22} Players`, icon: Users },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="font-black text-slate-900 text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Amenities */}
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Amenities</h4>
              <div className="flex flex-wrap gap-3">
                {(turf.amenities || []).map(am => {
                  const Icon = AMENITY_ICONS[am] || CheckCircle;
                  return (
                    <div key={am} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100">
                      <Icon size={14} />
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
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-xl shadow-emerald-900/5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Player Reviews</h3>
              <div className="space-y-4 mb-8">
                {(turf.reviews || []).slice(0, 5).map((r, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm text-slate-900">{r.userName}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} size={12} className={star <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-slate-500 text-sm">{r.comment}</p>}
                  </div>
                ))}
              </div>

              {/* Add Review Form */}
              {user && !reviewSuccess && (
                <form onSubmit={handleReviewSubmit} className="border-t border-gray-100 pt-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Your Review</h4>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(r => (
                      <button key={r} type="button" onClick={() => setNewReview(p => ({ ...p, rating: r }))}>
                        <Star size={24} className={r <= newReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 hover:text-yellow-300 transition-colors'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newReview.comment}
                    onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))}
                    placeholder="Share your experience..."
                    rows={3}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white p-4 rounded-2xl outline-none text-sm text-slate-900 transition-all resize-none"
                  />
                  <button type="submit" disabled={submittingReview}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                    <Send size={14} />
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              )}
              {reviewSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-black">
                  <CheckCircle size={16} /> Review submitted! Thank you.
                </div>
              )}
            </div>
          </div>

          {/* Right Sticky Column — Booking & Post-Match */}
          <div className="space-y-6">
            {/* Booking Card */}
            <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white sticky top-24 shadow-2xl shadow-slate-900/20">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">Starting From</p>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-5xl font-black tracking-tighter text-white">₹{turf.pricing?.weekdayDay || 1000}</span>
                <span className="text-slate-400 text-sm mb-1">/hour</span>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: 'Weekday Day', price: turf.pricing?.weekdayDay },
                  { label: 'Weekday Night', price: turf.pricing?.weekdayNight },
                  { label: 'Weekend Day', price: turf.pricing?.weekendDay },
                  { label: 'Weekend Night', price: turf.pricing?.weekendNight },
                ].map(p => (
                  <div key={p.label} className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">{p.label}</span>
                    <span className="font-black text-white">₹{p.price}/hr</span>
                  </div>
                ))}
              </div>

              <Link
                to="/book/custom"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20 hover:shadow-emerald-500/30"
              >
                Book This Turf <ChevronRight size={16} />
              </Link>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Clock size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Open {turf.openingHour}:00 – {turf.closingHour}:00
                </span>
              </div>
            </div>

            {/* Post-Match AI Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-6 border border-emerald-100 shadow-xl shadow-emerald-900/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-emerald-600 p-2 rounded-xl">
                  <Zap size={16} className="text-white fill-white" />
                </div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em]">AI Post-Match</p>
              </div>
              <h4 className="font-black text-slate-900 text-base tracking-tight mb-2">Just finished a match?</h4>
              <p className="text-slate-500 text-xs leading-relaxed mb-4">
                Our AI matchmaking agent finds the perfect team for your next game — same squad or fresh challenge!
              </p>
              <button
                onClick={() => user ? setShowPostMatch(true) : navigate('/login')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Trophy size={14} /> Play Again
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TurfDetailPage;
