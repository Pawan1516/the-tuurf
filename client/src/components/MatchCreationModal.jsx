import React, { useState, useEffect } from 'react';
import { X, Trophy, Shield, CheckCircle2, Star, BadgeCheck, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const MatchCreationModal = ({ isOpen, onClose, booking, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('REGISTERED'); // 'REGISTERED' or 'QUICK'
    const [formats, setFormats] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        team_a: '',
        team_b: '',
        format: 'T10',
        overs: 10,
        team_a_name: '',
        team_b_name: '',
        team_a_players: [{ name: '', mobile: '', role: 'Batsman', is_captain: true, is_wk: false, is_linked: false, profile: null }],
        team_b_players: [{ name: '', mobile: '', role: 'Batsman', is_captain: true, is_wk: false, is_linked: false, profile: null }]
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [, , formatRes] = await Promise.all([
                axios.get('http://localhost:5001/api/teams', { headers: { Authorization: token } }),
                axios.get('http://localhost:5001/api/teams'),
                axios.get('http://localhost:5001/api/formats')
            ]);
            setFormats(formatRes.data.formats || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleMobileLookup = async (team, index, mobile) => {
        if (!/^\d{10}$/.test(mobile)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5001/api/players/lookup-mobile', { mobile }, {
                headers: { Authorization: token }
            });

            if (res.data.found) {
                updatePlayer(team, index, 'profile', res.data.user);
                updatePlayer(team, index, 'is_linked', true);
                if (!formData[team === 'a' ? 'team_a_players' : 'team_b_players'][index].name) {
                    updatePlayer(team, index, 'name', res.data.user.name);
                }
                toast.info(`Player Identified: ${res.data.user.name}`);
            } else {
                updatePlayer(team, index, 'is_linked', false);
                updatePlayer(team, index, 'profile', null);
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
        const listField = team === 'a' ? 'team_a_players' : 'team_b_players';
        const newList = [...formData[listField]];
        
        if (field === 'is_captain' && value === true) {
            newList.forEach((p, idx) => p.is_captain = idx === index);
        } else if (field === 'is_wk' && value === true) {
            newList.forEach((p, idx) => p.is_wk = idx === index);
        } else {
            newList[index][field] = value;
        }

        setFormData({ ...formData, [listField]: newList });

        if (field === 'mobile' && value.length === 10) {
            handleMobileLookup(team, index, value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setLoading(true);

        try {
            let res;
            if (mode === 'REGISTERED') {
                res = await axios.post('http://localhost:5001/api/matches/from-booking', {
                    booking_id: booking._id,
                    title: formData.title || `${formData.team_a_name} vs ${formData.team_b_name}`,
                    format: formData.format,
                    team_a: { team_id: formData.team_a },
                    team_b: { team_id: formData.team_b }
                }, { headers: { Authorization: token } });
            } else {
                res = await axios.post('http://localhost:5001/api/matches/quick/create', {
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
                }, { headers: { Authorization: token } });
            }

            if (res.data.success) {
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
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-emerald-400/10 rounded-full inline-block">The Turf v2.6 Registry</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex bg-gray-100 p-2 shrink-0">
                    <button onClick={() => setMode('REGISTERED')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'REGISTERED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Registered Teams</button>
                    <button onClick={() => setMode('QUICK')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'QUICK' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Quick Match</button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar bg-gray-50/50">
                    {/* Format / Overs Grid */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Select Over Format</label>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                            {formats.length > 0 ? formats.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setFormData({...formData, overs: f.overs, format: f.id})}
                                    className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${formData.format === f.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-gray-50 text-gray-400 hover:border-emerald-100'}`}
                                >
                                    <span className="text-sm font-black tracking-tighter">{f.overs}</span>
                                    <span className="text-[7px] font-bold uppercase tracking-widest">{f.name.split(' ')[0]}</span>
                                </button>
                            )) : (
                                [3, 5, 6, 10, 15, 20].map(o => (
                                    <button key={o} type="button" onClick={() => setFormData({...formData, overs: o, format: `T${o}`})} className={`py-4 rounded-xl border-2 font-black ${formData.overs === o ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white text-gray-400'}`}>{o}</button>
                                ))
                            )}
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
                                        <div key={i} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:border-blue-200">
                                            <div className="flex items-center gap-3">
                                                <div className="text-[9px] font-black text-gray-300 w-4">{i + 1}</div>
                                                <input placeholder="Mobile No." value={p.mobile} onChange={(e) => updatePlayer('a', i, 'mobile', e.target.value)} className="w-28 bg-transparent text-xs font-black outline-none border-b border-gray-200 focus:border-blue-500" maxLength={10} />
                                                <input placeholder="Player Name" value={p.name} onChange={(e) => updatePlayer('a', i, 'name', e.target.value)} className="flex-1 bg-transparent text-xs font-bold outline-none border-b border-gray-200 focus:border-blue-500" />
                                                <button type="button" onClick={() => updatePlayer('a', i, 'is_captain', !p.is_captain)} className={`p-2 rounded-lg ${p.is_captain ? 'bg-orange-100 text-orange-600' : 'text-gray-300'}`}><Star size={14} fill={p.is_captain ? 'currentColor' : 'none'} /></button>
                                                <button type="button" onClick={() => updatePlayer('a', i, 'is_wk', !p.is_wk)} className={`p-2 rounded-lg ${p.is_wk ? 'bg-sky-100 text-sky-600' : 'text-gray-300'}`}><Shield size={14} /></button>
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
                                        <div key={i} className="flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 group transition-all hover:bg-white hover:border-red-200">
                                            <div className="flex items-center gap-3">
                                                <div className="text-[9px] font-black text-gray-300 w-4">{i + 1}</div>
                                                <input placeholder="Mobile No." value={p.mobile} onChange={(e) => updatePlayer('b', i, 'mobile', e.target.value)} className="w-28 bg-transparent text-xs font-black outline-none border-b border-gray-200 focus:border-red-500" maxLength={10} />
                                                <input placeholder="Player Name" value={p.name} onChange={(e) => updatePlayer('b', i, 'name', e.target.value)} className="flex-1 bg-transparent text-xs font-bold outline-none border-b border-gray-200 focus:border-red-500" />
                                                <button type="button" onClick={() => updatePlayer('b', i, 'is_captain', !p.is_captain)} className={`p-2 rounded-lg ${p.is_captain ? 'bg-orange-100 text-orange-600' : 'text-gray-300'}`}><Star size={14} fill={p.is_captain ? 'currentColor' : 'none'} /></button>
                                                <button type="button" onClick={() => updatePlayer('b', i, 'is_wk', !p.is_wk)} className={`p-2 rounded-lg ${p.is_wk ? 'bg-sky-100 text-sky-600' : 'text-gray-300'}`}><Shield size={14} /></button>
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
