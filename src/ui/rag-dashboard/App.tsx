import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Search, 
  Trash2, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  RefreshCcw,
  BookOpen,
  Cpu,
  Terminal,
  Zap,
  Globe,
  Github,
  Award,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare const window: any;

// --- Shared Types ---
interface RagJob {
  id: string;
  source: string;
  type: 'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface RagDoc {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  created_at: string;
}

const RagDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'vault' | 'test' | 'train' | 'auto'>('live');
  const [jobs, setJobs] = useState<RagJob[]>([]);
  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [stats, setStats] = useState<{ total_files: number, total_chunks: number, training_active: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ingestion State
  const [ingestType, setIngestType] = useState<'github' | 'web' | 'pdf' | 'wikipedia' | 'stackoverflow'>('web');
  const [ingestSource, setIngestSource] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  // Neural Mission Control State
  const [sources, setSources] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [missionLogs, setMissionLogs] = useState<Record<string, any[]>>({});
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [autoMissionQuery, setAutoMissionQuery] = useState('');
  const [autoMissionType, setAutoMissionType] = useState<'wikipedia' | 'stackoverflow' | 'github'>('wikipedia');
  const [autoMaxDepth, setAutoMaxDepth] = useState(2);
  const [autoMaxResults, setAutoMaxResults] = useState(50);
  const [autoSources, setAutoSources] = useState<string[]>(['wikipedia', 'stackoverflow']);

  // --- Data Loading ---
  const refreshData = async () => {
    try {
        if (!window.syntra) throw new Error('Objeto window.syntra não encontrado.');
        
        const [statRes, docsRes, jobsRes, sourcesRes, missionsRes] = await Promise.all([
        window.syntra.synapseGetStats().catch((e: any) => { console.error(e); return { total_files: 0, total_chunks: 0, training_active: false }; }),
        window.syntra.synapseGetFiles().catch((e: any) => { console.error(e); return []; }),
        window.syntra.synapseGetJobs().catch((e: any) => { console.error(e); return []; }),
        window.syntra.synapseGetSources().catch((e: any) => { console.error(e); return []; }),
        window.syntra.synapseGetMissions().catch((e: any) => { console.error(e); return []; })
        ]);
        
        setStats(statRes);
        setDocs(docsRes || []);
        setJobs(jobsRes || []);
        setSources(sourcesRes || []);
        setMissions(missionsRes || []);
    } catch (e: any) {
        console.error('[Synapse] Erro ao carregar dados:', e);
        setError(e.message);
    }
  };

  useEffect(() => {
    console.log('[Synapse] App Dashboard Montado.');
    refreshData();
    // Real-time updates
    if (window.syntra && window.syntra.onRagJobUpdate) {
        window.syntra.onRagJobUpdate((updatedJob: RagJob) => {
        setJobs(prev => {
            const index = prev.findIndex(j => j.id === updatedJob.id);
            if (index === -1) return [updatedJob, ...prev];
            const newJobs = [...prev];
            newJobs[index] = updatedJob;
            return newJobs;
        });
        if (updatedJob.status === 'completed') refreshData();
        });
    }

    if (window.syntra && window.syntra.onMissionLog) {
        window.syntra.onMissionLog((data: any) => {
            setMissionLogs(prev => {
                const logs = prev[data.missionId] || [];
                return { ...prev, [data.missionId]: [...logs, data.log] };
            });
        });
    }

    if (window.syntra && window.syntra.onMissionStatus) {
        window.syntra.onMissionStatus((status: any) => {
            setMissions(prev => {
                const index = prev.findIndex(m => m.id === status.id);
                if (index === -1) return [status, ...prev];
                const newMissions = [...prev];
                newMissions[index] = status;
                return newMissions;
            });
            if (status.status === 'completed') refreshData();
        });
    }
  }, []);

  if (error) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-red-500 p-10 space-y-4">
              <AlertCircle size={48} />
              <h1 className="text-xl font-bold italic underline">Falha na Conexão Neural</h1>
              <p className="text-zinc-500 text-sm max-w-md text-center">{error}</p>
              <button onClick={() => { setError(null); refreshData(); }} className="bg-zinc-900 border border-white/10 px-6 py-2 rounded-xl text-zinc-300 hover:text-white transition-all">Tentar Reconectar</button>
          </div>
      );
  }

  if (!stats) {
      return (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-violet-500 p-10 space-y-6">
              <Loader2 size={48} className="animate-spin" />
              <p className="text-zinc-500 text-sm animate-pulse uppercase tracking-[0.3em]">Estabelecendo Conexão Synapse...</p>
          </div>
      );
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await window.syntra.synapseSearch(searchQuery);
      setSearchResults(results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este documento da memória neural?')) {
      await window.syntra.synapseDeleteFile(id);
      refreshData();
    }
  };

  const handleIngest = async () => {
    if (!ingestSource.trim()) return;
    setIsIngesting(true);
    try {
        let options = {};
        if (ingestType === 'github') {
            const parts = ingestSource.replace('https://github.com/', '').split('/');
            if (parts.length < 2) throw new Error('Formato GitHub inválido. Use: owner/repo');
            options = { owner: parts[0], repo: parts[1] };
        }
        
        await window.syntra.synapseIngestSource(ingestType, ingestSource, options);
        if ((window as any).addLog) (window as any).addLog('success', `Tarefa de ingestão iniciada: ${ingestSource}`, 'Synapse');
        setIngestSource('');
        setActiveTab('live');
        refreshData();
    } catch (e: any) {
        console.error(e);
        if ((window as any).addLog) (window as any).addLog('error', `Falha ao iniciar ingestão: ${e.message}`, 'Synapse');
    } finally {
        setIsIngesting(false);
    }
  };

  const handleToggleTraining = async () => {
    if (!stats) return;
    const next = !stats.training_active;
    await window.syntra.synapseToggleTraining(next);
    refreshData();
  };

  const handleStartMission = async (type: string, query: string, name: string, config?: any) => {
    try {
        const missionId = await window.syntra.synapseStartMission(type, query, name, config);
        setSelectedMission(missionId);
        if ((window as any).addLog) (window as any).addLog('info', `Iniciando missão: ${name}`, 'Synapse');
    } catch (e: any) {
        console.error(e);
        setError(e.message);
    }
  };

  const handleStopMission = async (id: string) => {
    try {
        await window.syntra.synapseStopMission(id);
        if ((window as any).addLog) (window as any).addLog('warning', `Missão interrompida.`, 'Synapse');
    } catch (e: any) {
        console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-zinc-100 font-sans select-none">
      {/* Header Overlay */}
      <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/20">
        <div className="flex gap-4">
          <TabButton icon={<Activity size={18} />} label="Live Sync" active={activeTab === 'live'} onClick={() => setActiveTab('live')} />
          <TabButton icon={<Database size={18} />} label="Knowledge Vault" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
          <TabButton icon={<Search size={18} />} label="Semantic Lab" active={activeTab === 'test'} onClick={() => setActiveTab('test')} />
          <TabButton icon={<RefreshCcw size={18} />} label="Neural Training" active={activeTab === 'train'} onClick={() => setActiveTab('train')} />
          <TabButton icon={<Zap size={18} />} label="Aprender Automático" active={activeTab === 'auto'} onClick={() => setActiveTab('auto')} />
        </div>
        <div className="flex gap-4 items-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Neural Memory:</span>
            <button 
                onClick={handleToggleTraining}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                    stats?.training_active 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30 opacity-50'
                }`}
            >
                <div className={`w-1.5 h-1.5 rounded-full ${stats?.training_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 underline decoration-red-900'}`}></div>
                {stats?.training_active ? 'ENABLED' : 'OFFLINE'}
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'live' && (
            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight">Processamento em Tempo Real</h2>
              <div className="grid gap-4">
                {jobs.length === 0 && <p className="text-zinc-500 py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">Nenhuma tarefa ativa no momento.</p>}
                {jobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'train' && (
            <motion.div key="train" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10 max-w-6xl">
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 italic">
                        <Cpu className="text-violet-500 animate-pulse" />
                        Neural Mission Control
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium">Gerencie o aprendizado autônomo e missões de ingestão em larga escala.</p>
                </div>
                <button 
                  onClick={() => window.syntra.synapseSyncAll()}
                  className="bg-zinc-900 border border-white/10 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-violet-500/50 hover:text-violet-400 transition-all flex items-center gap-2 group"
                >
                  <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                  Sync All Brain
                </button>
              </div>

              {/* API Command Center */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-violet-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Zap size={14} /> API Command Center
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MissionButton 
                            icon={<Globe size={18} />} 
                            title="Wikimedia: História" 
                            desc="Aprender conhecimentos históricos" 
                            onClick={() => handleStartMission('wikipedia', 'História_do_Brasil', 'Conhecimento Histórico (PT-BR)')} 
                        />
                        <MissionButton 
                            icon={<Globe size={18} />} 
                            title="Wikimedia: Ciência" 
                            desc="Ingerir dados sobre astronomia" 
                            onClick={() => handleStartMission('wikipedia', 'Astronomia', 'Ciência e Astronomia')} 
                        />
                        <MissionButton 
                            icon={<Github size={18} />} 
                            title="Stack Overflow: TS" 
                            desc="Padrões Avançados de TypeScript" 
                            onClick={() => handleStartMission('stackoverflow', 'typescript patterns', 'Advanced TS Patterns')} 
                        />
                        <MissionButton 
                            icon={<Github size={18} />} 
                            title="Stack Overflow: Node" 
                            desc="Otimização de Performance" 
                            onClick={() => handleStartMission('stackoverflow', 'nodejs performance optimization', 'Node.js Performance')} 
                        />
                    </div>

                    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6">
                        <div className="flex items-center gap-3">
                            <Terminal size={16} className="text-zinc-500" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Extração Manual</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['github', 'web', 'pdf'].map(t => (
                                <button key={t} onClick={() => setIngestType(t as any)} className={`py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${ingestType === t ? 'bg-violet-600/20 border-violet-500 text-violet-400' : 'bg-black/20 border-white/5 text-zinc-600 hover:text-zinc-400'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        <input 
                            value={ingestSource}
                            onChange={e => setIngestSource(e.target.value)}
                            placeholder="Alvo da extração..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-violet-500/50 transition-all font-mono text-xs"
                        />
                        <button 
                            onClick={handleIngest}
                            disabled={isIngesting || !ingestSource}
                            className="w-full bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-violet-600/20 disabled:opacity-50 transition-all"
                        >
                            {isIngesting ? 'Processando...' : 'Launch Manual Extraction'}
                        </button>
                    </div>
                </div>

                {/* Neural Console */}
                <div className="space-y-6 flex flex-col h-full">
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Terminal size={14} /> Neural Console
                    </h3>
                    <div className="flex-1 bg-black border border-white/10 rounded-3xl p-6 font-mono text-[11px] overflow-hidden flex flex-col shadow-inner backdrop-blur-xl">
                        {missions.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-zinc-800 italic uppercase tracking-tighter">
                                Aguardando ordens de missão...
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {missions.map(m => (
                                    <div key={m.id} className="space-y-2 border-b border-white/5 pb-4 last:border-0" onClick={() => setSelectedMission(m.id)}>
                                        <div className="flex justify-between items-center cursor-pointer hover:text-violet-400 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1 h-1 rounded-full ${m.status === 'running' ? 'bg-blue-500 animate-ping' : (m.status === 'completed' ? 'bg-emerald-500' : 'bg-zinc-500')}`} />
                                                <span className="font-bold text-zinc-300">[{m.name}]</span>
                                            </div>
                                            <span className="text-[9px] text-zinc-600 uppercase font-black">{m.status} {m.duration && `| ${m.duration}`}</span>
                                        </div>
                                        <div className="pl-3 space-y-1 opacity-80">
                                            {missionLogs[m.id]?.slice(-5).map((l, idx) => (
                                                <div key={idx} className={`flex gap-3 ${l.type === 'error' ? 'text-red-400' : (l.type === 'success' ? 'text-emerald-400' : 'text-zinc-500')}`}>
                                                    <span className="text-zinc-800 shrink-0">{l.timestamp}</span>
                                                    <span className="truncate">{l.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="pt-4 border-t border-white/5 text-[9px] flex justify-between uppercase tracking-widest font-black text-zinc-700">
                            <span>Status: {missions.some(m => m.status === 'running') ? 'ONLINE_PROCESSING' : 'KERNEL_IDLE'}</span>
                            <span className="animate-pulse text-emerald-500/50">Telemetria Ativa</span>
                        </div>
                    </div>
                </div>
              </div>

              {/* Registered Sources */}
              <div className="space-y-6">
                 <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Database size={14} /> Registered Knowledge Sources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {sources.map(s => (
                        <div key={s.id} className="bg-zinc-900/20 border border-white/5 p-4 rounded-2xl flex justify-between items-start group">
                            <div className="space-y-1">
                                <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{s.type}</div>
                                <div className="text-xs font-bold text-zinc-200 truncate max-w-[150px]">{s.source}</div>
                                <div className="text-[9px] text-zinc-600">Sync: {s.last_sync || 'Nunca'}</div>
                            </div>
                            <button onClick={async () => { await window.syntra.synapseRemoveSource(s.id); refreshData(); }} className="text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all pt-1">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button className="border-2 border-dashed border-white/5 rounded-2xl p-4 flex items-center justify-center text-zinc-700 hover:border-violet-500/30 hover:text-violet-500/50 transition-all text-xs font-bold uppercase tracking-widest">
                        + Registrar Nova API
                    </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'auto' && (
            <motion.div key="auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10 max-w-6xl">
                 <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 italic">
                        <Zap className="text-amber-500 animate-pulse" />
                        Autopilot Learning
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium">Configure uma sonda de aprendizado autônomo para buscar conhecimentos específicos.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-10 space-y-8 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 blur-[120px] rounded-full -mr-20 -mt-20 group-hover:bg-violet-600/20 transition-all duration-700" />
                        
                        <div className="space-y-6 relative">
                            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[.3em] flex items-center gap-2">
                                <Search size={16} className="text-violet-500" /> Parâmetros da Missão
                            </h3>
                            <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest pl-1">Fontes Ativas</label>
                                <div className="flex gap-4">
                                    {['wikipedia', 'stackoverflow', 'github'].map(src => (
                                        <label key={src} className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={autoSources.includes(src)}
                                                onChange={() => {
                                                    setAutoSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
                                                }}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${autoSources.includes(src) ? 'bg-violet-500 border-violet-500' : 'border-white/10 bg-black/40'}`}>
                                                {autoSources.includes(src) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase ${autoSources.includes(src) ? 'text-violet-400' : 'text-zinc-600'}`}>{src}</span>
                                        </label>
                                    ))}
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest pl-1 flex justify-between">
                                        Expansão (Depth) <span>{autoMaxDepth}</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="5" step="1"
                                        value={autoMaxDepth}
                                        onChange={e => setAutoMaxDepth(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest pl-1 flex justify-between">
                                        Max Results <span>{autoMaxResults}</span>
                                    </label>
                                    <input 
                                        type="range" min="10" max="300" step="10"
                                        value={autoMaxResults}
                                        onChange={e => setAutoMaxResults(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>
                             </div>

                             <div className="space-y-4">
                                <label className="text-[10px] uppercase font-black text-zinc-600 tracking-widest pl-1">Objetivo de Conhecimento</label>
                                <input 
                                    value={autoMissionQuery}
                                    onChange={(e) => setAutoMissionQuery(e.target.value)}
                                    placeholder="Ex: Física Quântica, React Hooks, Node.js..."
                                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-violet-500 transition-all font-medium text-zinc-300"
                                />
                             </div>

                             <button 
                                onClick={() => handleStartMission(autoMissionType, autoMissionQuery, `Autopilot: ${autoMissionQuery}`, { 
                                    maxDepth: autoMaxDepth, 
                                    maxResults: autoMaxResults, 
                                    sources: autoSources 
                                })}
                                disabled={!autoMissionQuery || autoSources.length === 0}
                                className="w-full bg-linear-to-br from-violet-600 via-indigo-600 to-blue-600 hover:scale-[1.02] active:scale-[0.98] text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-violet-600/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Zap size={18} className="fill-current" />
                                Iniciar Sonda de Aprendizado
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                         <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[.3em] flex items-center gap-2 px-2">
                             <Terminal size={16} /> Status da Sonda
                         </h3>
                         <div className="bg-black/80 border border-white/5 rounded-[40px] p-8 h-[400px] font-mono text-[11px] flex flex-col shadow-inner backdrop-blur-md">
                            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                                {missions.filter(m => m.name.startsWith('Autopilot')).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-800 space-y-4 grayscale opacity-50">
                                        <Cpu size={48} />
                                        <p className="uppercase tracking-widest font-black text-[9px]">Aguardando Iniciação do Autopilot...</p>
                                    </div>
                                ) : (
                                    missions.filter(m => m.name.startsWith('Autopilot')).map(m => (
                                        <div key={m.id} className="space-y-2 group">
                                            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${m.status === 'running' ? 'bg-amber-500 animate-pulse' : (m.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-500')}`} />
                                                    <div className="flex flex-col">
                                                        <span className="text-zinc-200 font-bold tracking-tighter">{m.name}</span>
                                                        <div className="flex items-center gap-2 text-[8px] text-zinc-500 uppercase font-black">
                                                            <span>Lvl {m.currentDepth}/{m.maxDepth}</span>
                                                            <span>•</span>
                                                            <span>{m.totalIngested}/{m.maxResults} items</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-zinc-500 bg-black/50 px-2 py-1 rounded-md">{m.status.toUpperCase()}</span>
                                                    {m.status === 'running' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleStopMission(m.id); }} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-all">
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pl-4 border-l border-white/10 space-y-1 py-1">
                                                {missionLogs[m.id]?.slice(-4).map((l, i) => (
                                                    <div key={i} className={`flex gap-3 text-[10px] ${l.type === 'error' ? 'text-red-400' : 'text-zinc-500'}`}>
                                                        <span className="shrink-0 opacity-30">{l.timestamp}</span>
                                                        <span className="truncate group-hover:whitespace-normal transition-all">{l.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">Kernel Online</span>
                                </div>
                                <div className="text-[10px] font-black text-zinc-400 italic">v1.2 // Neural-Engine-S01</div>
                            </div>
                         </div>
                    </div>
                </div>
            </motion.div>
          )}

          {activeTab === 'vault' && (
            <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-tight">Cofre de Conhecimento</h2>
                <div className="flex gap-4 text-[11px] text-zinc-400">
                    <span>{stats.total_files} Arquivos</span>
                    <span className="text-zinc-700">|</span>
                    <span>{stats.total_chunks} Chunks Vetorizados</span>
                </div>
              </div>

              {/* Active Jobs in Vault */}
              {jobs.filter(j => j.status === 'processing' || j.status === 'pending').length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <RefreshCcw size={14} className="animate-spin" /> Sincronização em Andamento
                  </h3>
                  <div className="grid gap-3">
                    {jobs.filter(j => j.status === 'processing' || j.status === 'pending').map(job => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/5 bg-zinc-900/10 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-4">Nome do Cluster</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {docs.map(doc => (
                      <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                            <BookOpen size={14} className="text-violet-500" />
                            {doc.name}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 uppercase">{doc.type}</td>
                        <td className="px-6 py-4">
                            {doc.status === 'processing' ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-amber-500 text-[10px] font-bold animate-pulse">PROCESSANDO</span>
                                    {jobs.find(j => j.source.includes(doc.name))?.progress && (
                                        <span className="text-[10px] font-mono text-zinc-500">{jobs.find(j => j.source.includes(doc.name))?.progress}%</span>
                                    )}
                                </div>
                            ) : (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.status === 'processed' ? 'text-emerald-500' : 'text-red-500'}`}>{doc.status.toUpperCase()}</span>
                            )}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                            <button onClick={() => handleDelete(doc.id)} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                <Trash2 size={16} />
                            </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'test' && (
            <motion.div key="test" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight">Laboratório Semântico</h2>
              <div className="flex gap-4">
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Simule uma pergunta para testar a recuperação..."
                  className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-6 py-3 outline-none focus:border-violet-500/50 transition-all text-sm"
                />
                <button onClick={handleSearch} disabled={isSearching} className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-violet-600/20 disabled:opacity-50 transition-all">
                  {isSearching ? <Loader2 className="animate-spin" /> : 'Testar Busca'}
                </button>
              </div>

              <div className="space-y-4">
                {searchResults.map((res, i) => (
                  <div key={i} className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                        <span className="text-violet-400">Match Rank #{i+1}</span>
                        <span className="text-zinc-500">Score: <span className="text-emerald-500">{(res.score * 100).toFixed(1)}%</span></span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed italic">"{res.content}"</p>
                    <div className="text-[10px] text-zinc-600">Fonte: {res.file_name}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Sub-components ---

const TabButton: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
  >
    {icon} {label}
  </button>
);

const JobCard: React.FC<{ job: RagJob }> = ({ job }) => (
  <div className="p-6 bg-zinc-900 border border-white/5 rounded-2xl shadow-xl flex items-center justify-between group">
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${job.status === 'processing' ? 'bg-blue-500 animate-pulse' : (job.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500')}`}></span>
        <h4 className="font-bold text-sm text-zinc-200">{job.source}</h4>
        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">({job.type})</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${job.progress}%` }}
            className={`h-full ${job.status === 'failed' ? 'bg-red-500' : 'bg-linear-to-r from-violet-600 to-blue-500'}`}
          />
        </div>
        <span className="text-xs font-mono text-zinc-500 w-10 text-right">{job.progress}%</span>
      </div>
      {job.error && <p className="text-[10px] text-red-400 font-medium">Erro: {job.error}</p>}
    </div>
    <div className="ml-8 flex items-center gap-2">
        {job.status === 'processing' && <button className="p-2 hover:bg-white/5 text-zinc-500 hover:text-white rounded-lg transition-all"><X size={18} /></button>}
        {job.status === 'completed' && <CheckCircle2 size={18} className="text-emerald-500" />}
        {job.status === 'failed' && <AlertCircle size={18} className="text-red-500" />}
    </div>
  </div>
);

export default RagDashboard;

const MissionButton: React.FC<{ icon: React.ReactNode, title: string, desc: string, onClick: () => void }> = ({ icon, title, desc, onClick }) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-start p-4 bg-zinc-900/40 border border-white/5 rounded-2xl hover:border-violet-500/50 hover:bg-violet-600/5 transition-all text-left space-y-2 group"
    >
        <div className="p-2 bg-violet-600/10 rounded-lg text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
            {icon}
        </div>
        <div>
            <div className="text-xs font-black text-zinc-100 uppercase tracking-widest">{title}</div>
            <div className="text-[10px] text-zinc-500 font-medium leading-tight">{desc}</div>
        </div>
    </button>
);
