import React, { useState, useEffect } from 'react';
import { X, Trophy, Shield, CheckCircle2, Star, BadgeCheck, MessageCircle } from 'lucide-react';
import apiClient from '../api/client';
import { toast } from 'react-toastify';

const MatchCreationModal = ({ isOpen, onClose, booking, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('QUICK'); // Default to QUICK for instant CricHeroes flow
    const [formats, setFormats] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        team_a: '',
        team_b: '',
        format: 'T10',
        overs: 10,
        teamSize: 10,
        team_a_name: '',
        team_b_name: '',
        team_a_players: [{ name: '', mobile: '', role: 'Batsman', is_captain: true, is_wk: false, is_linked: false, profile: null }],
        team_b_players: [{ name: '', mobile: '', role: 'Batsman', is_captain: true, is_wk: false, is_linked: false, profile: null }]
    });

    useEffect(() => {
        if (isOpen) {
            setMode('QUICK'); // Always open on Quick Match tab
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const [, , formatRes] = await Promise.all([
                apiClient.get('/teams'),
                apiClient.get('/teams'),
                apiClient.get('/formats')
            ]);
            setFormats(formatRes.data.formats || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleMobileLookup = async (team, index, mobile) => {
        if (!/^\d{10}$/.test(mobile)) return;

        try {
            const res = await apiClient.post('/players/lookup-mobile', { mobile });

            if (res.data.found) {
                setFormData(prev => {
                    const listField = team === 'a' ? 'team_a_players' : 'team_b_players';
                    const newList = prev[listField].map((p, i) => i === index ? {
                        ...p,
                        profile: res.data.user,
                        is_linked: true,
                        name: p.name || res.data.user.name
                    } : p);
                    return { ...prev, [listField]: newList };
                });
                toast.info(`Player Identified: ${res.data.user.name}`);
            } else {
                setFormData(prev => {
                    const listField = team === 'a' ? 'team_a_players' : 'team_b_players';
                    const newList = prev[listField].map((p, i) => i === index ? { ...p, is_linked: false, profile: null } : p);
                    return { ...prev, [listField]: newList };
                });
            }
        } catch (error) {
            console.error('Lookup failed:', error);
        }
    };

    const addPlayer = (team) => {
        const listField = team === 'a' ? 'team_a_players' : 'team_b_players';
        setFormData({
            ...formData,
            [listField]: [...formData[listField], { name: '', mobile: '', role: 'Batsman', is_captain: false, is_wk: false, is_linked: false, profile: null }]
        });
    };

    const updatePlayer = (team, index, field, value) => {
        setFormData(prev => {
            const listField = team === 'a' ? 'team_a_players' : 'team_b_players';
            // Deep clone the array elements
            const newList = prev[listField].map(p => ({ ...p }));
            
            if (field === 'is_captain' && value === true) {
                newList.forEach((p, idx) => p.is_captain = idx === index);
            } else if (field === 'is_wk' && value === true) {
                newList.forEach((p, idx) => p.is_wk = idx === index);
            } else {
                newList[index][field] = value;
            }

            return { ...prev, [listField]: newList };
        });

        if (field === 'mobile' && value.length === 10) {
            handleMobileLookup(team, index, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let res;
            if (mode === 'REGISTERED') {
                res = await apiClient.post('/matches/from-booking', {
                    booking_id: booking._id,
                    title: formData.title || `${formData.team_a_name} vs ${formData.team_b_name}`,
                    format: formData.format,
                    team_a: { team_id: formData.team_a },
                    team_b: { team_id: formData.team_b }
                });
            } else {
                res = await apiClient.post('/matches/quick/create', {
                    booking_id: booking._id,
                    format: formData.format,
                    overs: formData.overs,
                    team_a: {
                        name: formData.team_a_name,
                        players: formData.team_a_players.map((p, i) => ({
                            display_name: p.name,
                            input: p.mobile || p.name,
                            input_type: p.mobile ? 'MOBILE' : 'NAME',
                            role: p.role,
                            is_captain: p.is_captain,
                            is_wk: p.is_wk,
                            batting_position: i + 1
                        }))
                    },
                    team_b: {
                        name: formData.team_b_name,
                        players: formData.team_b_players.map((p, i) => ({
                            display_name: p.name,
                            input: p.mobile || p.name,
                            input_type: p.mobile ? 'MOBILE' : 'NAME',
                            role: p.role,
                            is_captain: p.is_captain,
                            is_wk: p.is_wk,
                            batting_position: i + 1
                        }))
                    }
                });
            }

            if (res.data.success || res.status === 201) {
                toast.success('Match Manifested! All Players Notified.');
                onSuccess(res.data.match || { _id: res.data.match_id });
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Manifestation failure.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-4xl max-h-[95vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-gray-950 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-xl shadow-emerald-900/40">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <h2 className="text-white text-lg font-black uppercase tracking-tight leading-none">CricHeroes Deployment</h2>
                            <div className="flex items-center gap-2 mt-1.5">
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1 bg-white/10 rounded-full">THE TURF V2.6 REGISTRY</p>
                                {booking?._id && (
                                    <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">
                                        #{(booking.receiptId || booking._id?.slice(-6))?.toUpperCase()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Selector — QUICK MATCH first */}
                <div className="flex bg-gray-100 p-2 shrink-0">
                    <button onClick={() => setMode('QUICK')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'QUICK' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Quick Match</button>
                    <button onClick={() => setMode('REGISTERED')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'REGISTERED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Registered Teams</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-gray-50/50">
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 block text-center">Squad Configuration / Players Per Side</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {[3, 5, 6, 10, 15, 20].map(o => (
                                <button
                                    key={o}
                                    type="button"
                                    onClick={() => setFormData({...formData, teamSize: o})}
                                    className={`py-6 rounded-2xl border-2 font-black text-base transition-all ${formData.teamSize === o ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-50 text-gray-300 hover:border-emerald-100'}`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'QUICK' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Team A */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-sm font-black">A</div>
                                    <input placeholder="Team A Name..." className="bg-transparent text-lg font-black uppercase text-gray-900 outline-none w-full" value={formData.team_a_name} onChange={(e) => setFormData({...formData, team_a_name: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    {formData.team_a_players.map((p, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:border-blue-200">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[9px] font-black text-gray-300 w-4">{i + 1}</div>
                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Mobile No.</label>
                                                        <input placeholder="88888 88888" value={p.mobile} onChange={(e) => updatePlayer('a', i, 'mobile', e.target.value)} className="w-full bg-transparent text-xs font-black outline-none border-b border-gray-200 focus:border-blue-500 pb-1" maxLength={10} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Player Name</label>
                                                        <input placeholder="Enter Name" value={p.name} onChange={(e) => updatePlayer('a', i, 'name', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none border-b border-gray-200 focus:border-blue-500 pb-1" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => updatePlayer('a', i, 'is_captain', !p.is_captain)} className={`p-2 rounded-xl transition-all ${p.is_captain ? 'bg-orange-100 text-orange-600' : 'bg-white text-gray-300 hover:text-orange-400'}`} title="Captain"><Star size={14} fill={p.is_captain ? 'currentColor' : 'none'} /></button>
                                                    <button type="button" onClick={() => updatePlayer('a', i, 'is_wk', !p.is_wk)} className={`p-2 rounded-xl transition-all ${p.is_wk ? 'bg-sky-100 text-sky-600' : 'bg-white text-gray-300 hover:text-sky-400'}`} title="Wicketkeeper"><Shield size={14} /></button>
                                                </div>
                                            </div>
                                            {p.is_linked && p.profile && (
                                                <div className="flex items-center justify-between pl-7 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <BadgeCheck size={12} className="text-blue-500" />
                                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Linked: {p.profile.username}</span>
                                                    </div>
                                                    <span className="text-[8px] font-bold text-gray-400">Avg: {p.profile.stats?.batting?.average || 0} • SR: {p.profile.stats?.batting?.strike_rate || 0}</span>
                                                </div>
                                            )}
                                            {!p.is_linked && p.mobile.length === 10 && (
                                                <div className="flex items-center gap-1.5 pl-7">
                                                    <MessageCircle size={10} className="text-orange-400" />
                                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic leading-none">Will invite via SMS</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addPlayer('a')} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all">+ Add Player</button>
                                </div>
                            </div>
                        </div>

                        {/* Team B */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center text-white text-sm font-black">B</div>
                                    <input placeholder="Team B Name..." className="bg-transparent text-lg font-black uppercase text-gray-900 outline-none w-full" value={formData.team_b_name} onChange={(e) => setFormData({...formData, team_b_name: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    {formData.team_b_players.map((p, i) => (
                                        <div key={i} className="flex flex-col gap-2 p-5 bg-gray-50 rounded-3xl border border-gray-100 group transition-all hover:bg-white hover:border-red-200">
                                            <div className="flex items-center gap-4">
                                                <div className="text-[9px] font-black text-gray-300 w-4">{i + 1}</div>
                                                <div className="flex-1 grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Mobile No.</label>
                                                        <input placeholder="88888 88888" value={p.mobile} onChange={(e) => updatePlayer('b', i, 'mobile', e.target.value)} className="w-full bg-transparent text-xs font-black outline-none border-b border-gray-200 focus:border-red-500 pb-1" maxLength={10} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Player Name</label>
                                                        <input placeholder="Enter Name" value={p.name} onChange={(e) => updatePlayer('b', i, 'name', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none border-b border-gray-200 focus:border-red-500 pb-1" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button type="button" onClick={() => updatePlayer('b', i, 'is_captain', !p.is_captain)} className={`p-2 rounded-xl transition-all ${p.is_captain ? 'bg-orange-100 text-orange-600' : 'bg-white text-gray-300 hover:text-orange-400'}`} title="Captain"><Star size={14} fill={p.is_captain ? 'currentColor' : 'none'} /></button>
                                                    <button type="button" onClick={() => updatePlayer('b', i, 'is_wk', !p.is_wk)} className={`p-2 rounded-xl transition-all ${p.is_wk ? 'bg-sky-100 text-sky-600' : 'bg-white text-gray-300 hover:text-sky-400'}`} title="Wicketkeeper"><Shield size={14} /></button>
                                                </div>
                                            </div>
                                            {p.is_linked && p.profile && (
                                                <div className="flex items-center justify-between pl-7 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <BadgeCheck size={12} className="text-blue-500" />
                                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Linked: {p.profile.username}</span>
                                                    </div>
                                                    <span className="text-[8px] font-bold text-gray-400">Avg: {p.profile.stats?.batting?.average || 0} • SR: {p.profile.stats?.batting?.strike_rate || 0}</span>
                                                </div>
                                            )}
                                            {!p.is_linked && p.mobile.length === 10 && (
                                                <div className="flex items-center gap-1.5 pl-7">
                                                    <MessageCircle size={10} className="text-orange-400" />
                                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic leading-none">Will invite via SMS</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addPlayer('b')} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:border-red-500 hover:text-red-500 transition-all">+ Add Player</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </form>

                <div className="p-8 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
                    <div className="hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Format</p>
                        <p className="text-xl font-black text-emerald-600 uppercase">{formData.overs} Overs Blitz</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full md:w-80 bg-gray-950 hover:bg-black text-white py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-4 transition-all shadow-2xl disabled:opacity-50"
                    >
                        {loading ? 'Initializing...' : 'CREATE MATCH MATRIX'}
                        <CheckCircle2 size={18} className="text-emerald-400" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchCreationModal;
