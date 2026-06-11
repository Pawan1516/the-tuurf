import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Award, Trophy, Star, ChevronLeft, Calendar, Shield, Users } from 'lucide-react';
import apiClient from '../../api/client';
import { toast } from 'react-toastify';

export default function TournamentAwards() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get(`/tournaments/${id}`)
      .then(r => {
        if (r.data.success) {
          setTournament(r.data.tournament);
        } else {
          toast.error('Tournament not found');
        }
      })
      .catch(() => toast.error('Failed to load tournament awards'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="text-center">
          <Award size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-wide">Tournament not found</p>
          <button onClick={() => navigate('/tournaments')} className="mt-4 bg-emerald-500 text-black font-black px-6 py-2 rounded-xl">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  const { awards } = tournament;
  const hasAwards = awards && (awards.orangeCap || awards.purpleCap || awards.mvp || awards.winnerTeam || awards.runnerUpTeam);

  return (
    <div className="min-h-screen bg-[#060b13] text-white py-12 px-6 relative overflow-hidden font-sans">
      {/* Sparkles background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(`/tournaments/${id}`)}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 mb-8 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Tournament
        </button>

        {/* Title */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-4">
            🏆 Awards & Honors
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-2 leading-none">
            {tournament.name}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
            Award Ceremony & Honors Board
          </p>
        </div>

        {!hasAwards ? (
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-12 text-center">
            <Trophy size={48} className="text-slate-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-300">Awards Pending</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              The tournament awards will be announced and distributed once the final matches are completed and finalized by the organizer.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* Winner & Runner Up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Winner */}
              {awards.winnerTeam && (
                <div className="bg-gradient-to-br from-yellow-500/10 via-amber-600/5 to-transparent border border-yellow-500/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                  <Trophy size={48} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  <span className="text-[9px] font-black text-yellow-400 uppercase tracking-[0.3em]">Champions</span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2 mb-4">
                    {awards.winnerTeam.name}
                  </h3>
                  {awards.winnerTeam.logo ? (
                    <img src={awards.winnerTeam.logo} alt="winner" className="w-24 h-24 mx-auto object-cover rounded-2xl border-2 border-yellow-500/30 shadow-2xl" />
                  ) : (
                    <div className="w-24 h-24 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 flex items-center justify-center mx-auto text-yellow-500 font-black text-3xl">
                      🏆
                    </div>
                  )}
                </div>
              )}

              {/* Runner Up */}
              {awards.runnerUpTeam && (
                <div className="bg-gradient-to-br from-slate-500/10 via-slate-600/5 to-transparent border border-slate-500/20 rounded-[2.5rem] p-8 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                  <Award size={48} className="text-slate-300 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(203,213,225,0.4)]" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Runner Up</span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white mt-2 mb-4">
                    {awards.runnerUpTeam.name}
                  </h3>
                  {awards.runnerUpTeam.logo ? (
                    <img src={awards.runnerUpTeam.logo} alt="runner up" className="w-24 h-24 mx-auto object-cover rounded-2xl border-2 border-slate-500/30 shadow-2xl" />
                  ) : (
                    <div className="w-24 h-24 bg-slate-500/10 rounded-2xl border border-slate-500/20 flex items-center justify-center mx-auto text-slate-300 font-black text-3xl">
                      🥈
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Individual Caps (Orange, Purple, MVP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Orange Cap */}
              {awards.orangeCap && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-orange-500/10 rounded-full blur-xl" />
                  <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black">
                    🟠
                  </div>
                  <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Orange Cap</span>
                  <h4 className="text-base font-black text-white mt-1 leading-tight">{awards.orangeCap.name}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Leading Run Scorer</p>
                </div>
              )}

              {/* Purple Cap */}
              {awards.purpleCap && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl" />
                  <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black">
                    🟣
                  </div>
                  <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Purple Cap</span>
                  <h4 className="text-base font-black text-white mt-1 leading-tight">{awards.purpleCap.name}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Leading Wicket Taker</p>
                </div>
              )}

              {/* MVP */}
              {awards.mvp && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 text-center relative overflow-hidden group">
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-yellow-500/10 rounded-full blur-xl" />
                  <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black">
                    ⭐
                  </div>
                  <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">Tournament MVP</span>
                  <h4 className="text-base font-black text-white mt-1 leading-tight">{awards.mvp.name}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Most Valuable Player</p>
                </div>
              )}

            </div>

          </div>
        )}
      </div>
    </div>
  );
}
