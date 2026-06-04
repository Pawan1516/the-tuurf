import React, { memo, useState } from 'react';
import { User, Shield, CheckCircle2, Swords, Zap, Users, Target, UserPlus, ChevronRight } from 'lucide-react';

const PlayerSelectionNode = memo(({ teamName, players, selectedIds, onToggle, max = 11, title }) => {
  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{teamName}</h3>
            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedIds.length === max ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/40'}`}>
                {selectedIds.length}/{max} Nodes
            </span>
        </div>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">{title}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {players.map((p, i) => {
          const isSelected = selectedIds.includes(p.user_id || p.phone);
          return (
            <button
              key={i}
              onClick={() => onToggle(p.user_id || p.phone)}
              className={`w-full p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group ${isSelected ? 'bg-emerald-600 border-emerald-400 shadow-xl shadow-emerald-600/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20' : 'bg-white/5'}`}>
                  <User size={18} className={isSelected ? 'text-white' : 'text-white/20'} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black uppercase ${isSelected ? 'text-white' : 'text-white/60'}`}>{p.display_name}</p>
                  <p className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-white/20'}`}>{p.role || 'Operative'}</p>
                </div>
              </div>
              {isSelected ? (
                <CheckCircle2 size={18} className="text-white animate-in zoom-in-50" />
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-white/10 group-hover:border-white/30 transition-colors" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

const PlayingXISelection = ({ match, onComplete }) => {
  const [teamASelected, setTeamASelected] = useState(match.quick_teams.team_a.players.slice(0, 11).map(p => p.user_id || p.phone));
  const [teamBSelected, setTeamBSelected] = useState(match.quick_teams.team_b.players.slice(0, 11).map(p => p.user_id || p.phone));

  const togglePlayer = (team, id) => {
    if (team === 'a') {
      setTeamASelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 11 ? [...prev, id] : prev));
    } else {
      setTeamBSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : (prev.length < 11 ? [...prev, id] : prev));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-8 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Step 15: Select <br /> <span className="text-emerald-600">Playing 11</span></h2>
        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Initialize Final Node Manifest</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        <PlayerSelectionNode 
            teamName={match.quick_teams.team_a.name} 
            players={match.quick_teams.team_a.players}
            selectedIds={teamASelected}
            onToggle={(id) => togglePlayer('a', id)}
            title="PRIMARY BATTALION REGISTRY"
        />
        <PlayerSelectionNode 
            teamName={match.quick_teams.team_b.name} 
            players={match.quick_teams.team_b.players}
            selectedIds={teamBSelected}
            onToggle={(id) => togglePlayer('b', id)}
            title="OPPOSING BATTALION REGISTRY"
        />
      </div>

      <div className="pt-4">
        <button 
          onClick={() => onComplete(teamASelected, teamBSelected)}
          className="w-full py-6 bg-emerald-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Lock Final Node Manifest <Shield size={18} />
        </button>
      </div>
    </div>
  );
};

export default PlayingXISelection;
