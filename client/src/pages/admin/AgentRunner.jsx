import React, { useState, useEffect, useRef, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { aiAPI } from '../../api/client';
import { toast } from 'react-toastify';

export default function AgentRunner() {
    const { user } = useContext(AuthContext);
    const [agentName, setAgentName] = useState('executive');
    const [promptName, setPromptName] = useState('strategy-hub');
    const [input, setInput] = useState('Summarize todays bookings and recommend actions.');
    const [jobId, setJobId] = useState(null);
    const [job, setJob] = useState(null);
    const pollingRef = useRef(null);

    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    const startAgent = async () => {
        try {
            toast.info('Starting agent...');
            const { data } = await aiAPI.executeAgent({ agentName, promptName, input });
            if (data.success && data.jobId) {
                setJobId(data.jobId);
                setJob(null);
                pollStatus(data.jobId);
                toast.success('Agent started: ' + data.jobId);
            } else {
                toast.error('Failed to start agent');
            }
        } catch (e) {
            console.error(e);
            toast.error('Error starting agent');
        }
    };

    const pollStatus = (id) => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const { data } = await aiAPI.getAgentStatus(id);
                if (data.success) setJob(data.job);
                if (data.job && (data.job.status === 'completed' || data.job.status === 'failed')) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                    if (data.job.status === 'completed') toast.success('Agent completed');
                    else toast.error('Agent failed');
                }
            } catch (e) {
                console.error('poll error', e);
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }, 2000);
    };

    return (
        <div className="p-8">
            <h2 className="text-2xl font-black mb-4">AI Agent Runner</h2>
            <p className="text-sm text-slate-500 mb-6">Run background AI agents and monitor status. Admins only.</p>

            <div className="space-y-4 max-w-3xl">
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400">Agent Name</label>
                    <input value={agentName} onChange={e => setAgentName(e.target.value)} className="w-full p-3 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400">Prompt Name</label>
                    <input value={promptName} onChange={e => setPromptName(e.target.value)} className="w-full p-3 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-xs font-black uppercase text-slate-400">Input / Instruction</label>
                    <textarea value={input} onChange={e => setInput(e.target.value)} className="w-full p-3 border rounded-lg h-32" />
                </div>

                <div className="flex gap-3">
                    <button onClick={startAgent} className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-black">Execute Agent</button>
                    <button onClick={() => { if (jobId) pollStatus(jobId); }} className="px-6 py-3 border rounded-lg">Poll Status</button>
                </div>

                {jobId && (
                    <div className="mt-6 p-4 border rounded-lg bg-white/50">
                        <div className="flex items-center justify-between mb-2">
                            <div><strong>Job:</strong> <span className="font-mono">{jobId}</span></div>
                            <div><strong>Status:</strong> <span className="ml-2 font-black">{job?.status || 'pending'}</span></div>
                        </div>
                        <div className="text-sm text-slate-600">
                            <p><strong>Agent:</strong> {job?.agentName}</p>
                            <p><strong>Prompt:</strong> {job?.promptName}</p>
                            <p><strong>Created:</strong> {job?.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}</p>
                            {job?.completedAt && <p><strong>Completed:</strong> {new Date(job.completedAt).toLocaleString()}</p>}
                        </div>

                        <div className="mt-4">
                            <h4 className="font-black mb-2">Result</h4>
                            <pre className="whitespace-pre-wrap bg-black/5 p-4 rounded-lg min-h-[120px]">{job?.result || job?.error || 'Waiting for output...'}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
