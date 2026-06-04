import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const MatchGraphs = ({ wormData, runRateData, teamAColor = '#3b82f6', teamBColor = '#ef4444' }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Worm Graph */}
      <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Worm <span className="text-emerald-600">Trajectory</span></h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Neural Progress Vector</p>
            </div>
            <div className="flex gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Team A</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.5)]"></div>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Team B</span>
                </div>
            </div>
        </div>

        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wormData}>
                    <defs>
                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={teamAColor} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={teamAColor} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={teamBColor} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={teamBColor} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="over" stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="teamA" stroke={teamAColor} strokeWidth={4} fillOpacity={1} fill="url(#colorA)" />
                    <Area type="monotone" dataKey="teamB" stroke={teamBColor} strokeWidth={4} fillOpacity={1} fill="url(#colorB)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Run Rate Graph */}
      <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Run Rate <span className="text-emerald-600">Dynamics</span></h3>
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Velocity Amplitude Log</p>
            </div>
        </div>

        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={runRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="over" stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Line type="stepAfter" dataKey="rr" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, shadow: '0 0 10px rgba(59,130,246,0.5)' }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MatchGraphs;
