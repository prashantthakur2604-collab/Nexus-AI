import React, { useState, useEffect, useRef, Component, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  Terminal, 
  Settings as SettingsIcon, 
  ChevronRight, 
  Search, 
  Zap, 
  Database, 
  ShieldCheck, 
  Activity, 
  BarChart3,
  Cpu,
  BrainCircuit as Brain,
  Network,
  History,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  MessageSquare,
  FileText,
  Mail,
  Linkedin,
  Edit2,
  Trash2,
  X,
  Square,
  CheckSquare,
  Layers,
  BarChart2,
  PieChart,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Globe
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc,
  updateDoc,
  deleteDoc,
  query as fsQuery, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocFromServer,
  doc
} from 'firebase/firestore';

// --- Types & Constants ---

type Section = 'overview' | 'roadmap' | 'agents' | 'terminal' | 'settings';
type ModelMode = 'pro' | 'fast' | 'grounded';

interface AgentInfo {
  id: string;
  userId?: string;
  name: string;
  role: string;
  description: string;
  status: 'active' | 'configuring' | 'hibernating' | 'offline';
  capabilities: string[];
  createdAt?: string;
}

const AGENTS: AgentInfo[] = [
  {
    id: 'supervisor',
    name: 'Nexus Supervisor',
    role: 'Central Orchestration',
    description: 'Manages handoffs between specialized agents and maintains global state.',
    status: 'active',
    capabilities: ['Dynamic Routing', 'State Management', 'Policy Enforcement'],
  },
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Discovery & Context',
    description: 'Deep-dives into topics to find relevant information and citations.',
    status: 'active',
    capabilities: ['Web Search', 'Document Q&A', 'Citation Generation'],
  },
  {
    id: 'contact',
    name: 'Contact Agent',
    role: 'Identity Intelligence',
    description: 'Discovers decision-makers and handles enrichment for lead lists.',
    status: 'active',
    capabilities: ['Contact Enrichment', 'LinkedIn Intelligence', 'Email Verification'],
  },
  {
    id: 'engagement',
    name: 'Engagement Agent',
    role: 'Outreach & Drafting',
    description: 'Drafts ultra-personalized communication based on research and identity.',
    status: 'active',
    capabilities: ['Personalized Drafting', 'Tone Matching', 'Multi-channel'],
  },
  {
    id: 'crm',
    name: 'CRM Agent',
    role: 'Intelligence Loop',
    description: 'Syncs data back to Hubspot/Salesforce and handles audit logs.',
    status: 'configuring',
    capabilities: ['Bidirectional Sync', 'Field Mapping', 'Audit Trails'],
  },
];

const ROADMAP = [
  { phase: 1, title: 'Foundation', status: 'completed', details: ['Supervisor Agent', 'Chat Endpoint', 'Storage Layer'] },
  { phase: 2, title: 'Intelligence', status: 'active', details: ['Research Module', 'Knowledge Graph', 'Citations'] },
  { phase: 3, title: 'Workflows', status: 'pending', details: ['Sales Planning', 'Finance Tools', 'CRM Integration'] },
  { phase: 4, title: 'Hardening', status: 'pending', details: ['SSO', 'Audit Trails', 'Monitoring'] },
  { phase: 5, title: 'Pilot & Scale', status: 'pending', details: ['Analytics Dashboard', 'Red-teaming', 'Global Ops'] },
];

// --- Components ---

const Sidebar = ({ active, setActive, user, onLogin, onLogout }: { 
  active: Section, 
  setActive: (s: Section) => void,
  user: User | null,
  onLogin: () => void,
  onLogout: () => void
}) => {
  const links: { id: Section, label: string, icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'terminal', label: 'Sales Terminal', icon: Terminal },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-64 h-full border-r border-white/10 flex flex-col glass-panel">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center neon-glow">
            <Brain className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">NEXUS AI</h1>
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">Multi-Agent System</p>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => setActive(link.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                active === link.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <link.icon className={`w-5 h-5 ${active === link.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="font-medium">{link.label}</span>
              {active === link.id && (
                <motion.div layoutId="sidebar-active" className="ml-auto">
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="text-xs font-mono text-slate-400">{user ? 'System Online' : 'Offline'}</span>
        </div>
        {user ? (
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden relative">
              <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="User" referrerPolicy="no-referrer" />
              <button 
                onClick={onLogout}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Zap className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{user.displayName || 'Nexus Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all neon-glow"
          >
            Authorize Nexus
          </button>
        )}
      </div>
    </div>
  );
};

const Header = ({ title }: { title: string }) => {
  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md sticky top-0 z-10">
      <h2 className="text-xl font-semibold text-slate-200 capitalize">{title.replace('-', ' ')}</h2>
      <div className="flex items-center gap-4">
        <div className="flex bg-slate-900 border border-white/10 rounded-full px-3 py-1 items-center gap-2">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-mono text-slate-400">98.2% Latency Optimized</span>
        </div>
        <button className="p-2 text-slate-400 hover:text-white transition-colors">
          <Zap className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

const SectionOverview = () => {
  return (
    <div className="p-10 space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 glass-panel p-8 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Network className="w-32 h-32" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Your Multi-Agent Vision, <br/><span className="text-blue-500">Accelerated.</span></h1>
          <p className="text-slate-400 max-w-lg mb-8">
            Nexus AI provides a unified platform to host, orchestrate, and refine specialized AI agents. 
            From deep market research to automated CRM synchronization, build a system that thinks ahead.
          </p>
          <div className="flex gap-4">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all neon-glow">
              Launch Agent Studio <ArrowUpRight className="w-4 h-4" />
            </button>
            <button className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg border border-white/10 font-semibold transition-all">
              Read Documentation
            </button>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-300">Live Infrastructure</h3>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono border border-blue-500/20">V0.4.2</span>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Compute Engine', val: 'Operational', status: 'ok' },
              { label: 'Token Pipeline', val: 'Low Latency', status: 'ok' },
              { label: 'Vector Stores', val: '92% Synced', status: 'warn' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-slate-400">{item.label}</span>
                </div>
                <span className="text-xs font-mono text-slate-200">{item.val}</span>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <div className="h-16 w-full flex items-end gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-blue-500/40 rounded-t w-full" 
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-2 text-center uppercase tracking-widest">Agent Utilization (24h)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Research Cycles', value: '1,284', icon: Search, color: 'text-blue-400' },
          { label: 'Outreach Drafts', value: '452', icon: FileText, color: 'text-purple-400' },
          { label: 'Active Memory Nodes', value: '18k', icon: Database, color: 'text-cyan-400' },
          { label: 'Validated Contacts', value: '89.4%', icon: ShieldCheck, color: 'text-green-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-xl group hover:border-blue-500/30 transition-all">
            <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4 group-hover:bg-blue-500/10 transition-colors`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-xs text-slate-500 font-medium mb-1">{stat.label}</p>
            <h4 className="text-2xl font-bold text-slate-100">{stat.value}</h4>
          </div>
        ))}
      </div>
    </div>
  );
};

const SectionRoadmap = () => {
  return (
    <div className="p-10 space-y-12 max-w-4xl mx-auto animate-in slide-in-from-bottom-5 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Nexus AI Roadmap</h2>
        <p className="text-slate-400">Charting the course from intelligence foundation to enterprise scale.</p>
      </div>

      <div className="relative space-y-8">
        {/* Connection Line */}
        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-white/10" />

        {ROADMAP.map((item, idx) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={item.phase} 
            className={`relative flex gap-8 p-6 rounded-2xl border transition-all ${
              item.status === 'active' 
                ? 'bg-blue-600/5 border-blue-500/30' 
                : item.status === 'completed'
                ? 'bg-green-500/5 border-green-500/20 grayscale-0'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center border font-bold text-lg shrink-0 ${
              item.status === 'active' 
                ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]' 
                : item.status === 'completed'
                ? 'bg-green-600 border-green-400 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {item.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : item.phase}
            </div>

            <div className="space-y-3 pt-2 w-full">
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-bold ${item.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                  Phase {item.phase}: {item.title}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-1 rounded uppercase tracking-widest ${
                  item.status === 'active' 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : item.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-800 text-slate-600'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.details.map(detail => (
                  <span key={detail} className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-slate-400">
                    {detail}
                  </span>
                ))}
              </div>
              {item.status === 'active' && (
                <div className="mt-4 p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-blue-400">
                    <span>PROGRESS</span>
                    <span>68%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" 
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AVAILABLE_CAPABILITIES = [
  'Research', 
  'Analysis', 
  'Coding', 
  'Content Gen', 
  'Risk Eval', 
  'Optimization', 
  'Monitoring', 
  'Extraction', 
  'Strategy'
];

const AgentAnalytics = ({ agents }: { agents: AgentInfo[] }) => {
  const [data] = useState(() => {
    // Generate some interesting mock metrics for the past 7 days
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      name: day,
      usage: Math.floor(Math.random() * 500) + 100,
      cost: Number((Math.random() * 12 + 2).toFixed(2)),
      latency: Math.floor(Math.random() * 400) + 200,
    }));
  });

  const costData = agents.map(a => ({
    name: a.name,
    value: Math.floor(Math.random() * 50) + 5
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Operations', value: '42.8k', change: '+12%', icon: Activity, color: 'text-blue-400' },
          { label: 'Cloud Resources', value: '$842.12', change: '+5.4%', icon: DollarSign, color: 'text-green-400' },
          { label: 'Avg Latency', value: '342ms', change: '-18ms', icon: Clock, color: 'text-purple-400' },
          { label: 'Uptime Protocol', value: '99.98%', change: 'Stable', icon: ShieldCheck, color: 'text-cyan-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-5 rounded-xl border border-white/5">
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-mono ${stat.change.startsWith('+') ? 'text-green-400' : stat.change === 'Stable' ? 'text-blue-400' : 'text-blue-400'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Usage Over Time */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Execution Volume</h3>
              <p className="text-xs text-slate-500">Aggregate cross-agent task processing</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-[10px] text-blue-400 border border-blue-500/20">
                <TrendingUp className="w-3 h-3" />
                7D TREND
              </div>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-1">Cost Allocation</h3>
          <p className="text-xs text-slate-500 mb-8">Resource spend per active module</p>
          
          <div className="h-[200px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} width={80} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {costData.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-400">{item.name}</span>
                </div>
                <span className="font-mono text-white">${item.value}.00</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Detail Table */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Agent Performance Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-4 font-normal">Expert Module</th>
                <th className="px-6 py-4 font-normal">Status</th>
                <th className="px-6 py-4 font-normal text-right">Success Rate</th>
                <th className="px-6 py-4 font-normal text-right">C-Tokens</th>
                <th className="px-6 py-4 font-normal text-right">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agents.map((agent, i) => (
                <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{agent.name}</p>
                        <p className="text-[10px] text-slate-500">{agent.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      agent.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-white">{(94 + Math.random() * 5).toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">{(Math.random() * 1000).toFixed(0)}k</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-blue-400">{(200 + Math.random() * 300).toFixed(0)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SectionAgents = ({ user }: { user: User | null }) => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [editingAgent, setEditingAgent] = useState<Partial<AgentInfo> | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics'>('roster');
  const [loading, setLoading] = useState(true);

  // Sync agents from Firestore
  useEffect(() => {
    if (!user) {
      setAgents(AGENTS); // Show defaults if not logged in
      setLoading(false);
      return;
    }

    const q = fsQuery(
      collection(db, 'ai_agents'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgentInfo));
      // Combine with defaults if user has none or just show their custom ones?
      // User request asks to manage agents, so we'll show their collection.
      // We could bootstrap defaults into their collection on first login.
      setAgents(fetched.length > 0 ? fetched : AGENTS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const saveAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !editingAgent) return;

    if (!showSaveConfirm) {
      setShowSaveConfirm(true);
      return;
    }

    try {
      const agentData = {
        ...editingAgent,
        userId: user.uid,
        status: editingAgent.status || 'configuring',
        capabilities: editingAgent.capabilities || ['Research'],
        createdAt: editingAgent.createdAt || new Date().toISOString(),
      };

      if (editingAgent.id && !AGENTS.some(a => a.id === editingAgent.id)) {
        // Update existing custom agent
        const agentRef = doc(db, 'ai_agents', editingAgent.id);
        const { id, ...rest } = agentData;
        await updateDoc(agentRef, rest as any);
      } else {
        // Create new agent (or it was a default one we're "customizing")
        await addDoc(collection(db, 'ai_agents'), {
          ...agentData,
          id: undefined // Let Firestore generate ID
        });
      }
      setEditingAgent(null);
      setShowSaveConfirm(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const deleteAgent = async (id: string) => {
    if (!user || AGENTS.some(a => a.id === id)) return; // Don't delete defaults locally
    try {
      await deleteDoc(doc(db, 'ai_agents', id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const updateAgentStatus = async (agent: AgentInfo, newStatus: AgentInfo['status']) => {
    if (!user || AGENTS.some(a => a.id === agent.id)) return;
    try {
      const agentRef = doc(db, 'ai_agents', agent.id);
      await updateDoc(agentRef, { status: newStatus });
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const toggleSelection = (id: string) => {
    if (AGENTS.some(a => a.id === id)) return; // Can't select defaults
    setSelectedAgentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const bulkUpdateStatus = async (newStatus: AgentInfo['status']) => {
    if (!user || selectedAgentIds.length === 0) return;
    try {
      const promises = selectedAgentIds.map(id => 
        updateDoc(doc(db, 'ai_agents', id), { status: newStatus })
      );
      await Promise.all(promises);
      setSelectedAgentIds([]);
    } catch (err) {
      console.error("Bulk update failed:", err);
    }
  };

  const bulkDelete = async () => {
    if (!user || selectedAgentIds.length === 0) return;
    try {
      const promises = selectedAgentIds.map(id => 
        deleteDoc(doc(db, 'ai_agents', id))
      );
      await Promise.all(promises);
      setSelectedAgentIds([]);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    }
  };

  return (
    <div className="p-10 relative">
      {/* Sub-navigation */}
      <div className="flex items-center gap-6 mb-8 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('roster')}
          className={`pb-4 text-sm font-bold tracking-widest uppercase transition-all relative ${
            activeTab === 'roster' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Expert Roster
          {activeTab === 'roster' && (
            <motion.div layoutId="agent-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 text-sm font-bold tracking-widest uppercase transition-all relative ${
            activeTab === 'analytics' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Performance Analytics
          {activeTab === 'analytics' && (
            <motion.div layoutId="agent-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'roster' ? (
          <motion.div 
            key="roster"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            {/* Bulk Action Bar */}
            <AnimatePresence>
              {selectedAgentIds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                  className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-4 bg-slate-900 border border-blue-500/30 rounded-full shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-sm font-bold text-white whitespace-nowrap">
                      {selectedAgentIds.length} Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => bulkUpdateStatus('active')}
                      className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold rounded-lg transition-all"
                    >
                      Activate All
                    </button>
                    <button 
                      onClick={() => bulkUpdateStatus('offline')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-lg transition-all"
                    >
                      Deactivate All
                    </button>
                    <button 
                      onClick={bulkDelete}
                      className="p-2 ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setSelectedAgentIds([])}
                      className="p-2 bg-white/5 hover:bg-white/10 text-slate-500 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
              {agents.map((agent, i) => (
                <motion.div 
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => !AGENTS.some(a => a.id === agent.id) && toggleSelection(agent.id)}
                  className={`glass-panel p-8 rounded-2xl flex flex-col group transition-all cursor-pointer relative ${
                    selectedAgentIds.includes(agent.id) ? 'border-blue-500 ring-1 ring-blue-500/50' : 'hover:border-blue-500/30'
                  }`}
                >
                  {/* Selection Checkbox */}
                  {!AGENTS.some(a => a.id === agent.id) && (
                    <div className={`absolute top-4 left-4 z-10 transition-all ${
                      selectedAgentIds.includes(agent.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {selectedAgentIds.includes(agent.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-700" />
                      )}
                    </div>
                  )}

                  {/* Action Buttons Overlay */}
                  {!AGENTS.some(a => a.id === agent.id) && user && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }}
                        className="p-1.5 bg-slate-800 rounded-md hover:text-blue-400 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }}
                        className="p-1.5 bg-slate-800 rounded-md hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> 
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      agent.status === 'active' ? 'bg-blue-500/10' : 'bg-slate-800'
                    }`}>
                      {agent.id === 'supervisor' && <Cpu className="w-6 h-6 text-blue-400" />}
                      {agent.id === 'research' && <Search className="w-6 h-6 text-cyan-400" />}
                      {agent.id === 'contact' && <Users className="w-6 h-6 text-purple-400" />}
                      {agent.id === 'engagement' && <MessageSquare className="w-6 h-6 text-orange-400" />}
                      {agent.id === 'crm' && <Database className="w-6 h-6 text-slate-400" />}
                      {!AGENTS.some(a => a.id === agent.id) && <Terminal className="w-6 h-6 text-blue-400" />}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!AGENTS.some(a => a.id === agent.id)) {
                          const statuses: AgentInfo['status'][] = ['active', 'configuring', 'hibernating', 'offline'];
                          const currentIdx = statuses.indexOf(agent.status);
                          const nextIdx = (currentIdx + 1) % statuses.length;
                          updateAgentStatus(agent, statuses[nextIdx]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                        agent.status === 'active' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20' 
                          : agent.status === 'configuring'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                          : agent.status === 'hibernating'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full ${
                        agent.status === 'active' ? 'bg-green-500' : 
                        agent.status === 'configuring' ? 'bg-yellow-500' :
                        agent.status === 'hibernating' ? 'bg-purple-500' :
                        'bg-slate-500'
                      }`} />
                      {agent.status.toUpperCase()}
                    </button>
                  </div>

                  <h3 className="text-xl font-bold mb-1 text-slate-100">{agent.name}</h3>
                  <p className="text-xs font-mono text-blue-500 mb-4">{agent.role}</p>
                  <p className="text-sm text-slate-400 mb-6 flex-grow">{agent.description}</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Core Capabilities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(agent.capabilities || []).map(cap => (
                          <span key={cap} className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300">
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingAgent(agent); }}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-all border ${
                        agent.status === 'active' 
                          ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg group-hover:shadow-blue-500/20' 
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      {agent.status === 'active' ? 'Manage Module' : 'Configure Agent'}
                    </button>
                  </div>
                </motion.div>
              ))}

              <button 
                onClick={() => setEditingAgent({ name: '', role: '', description: '', status: 'configuring' })}
                className="glass-panel p-8 rounded-2xl border-dashed border-2 border-white/10 flex flex-col items-center justify-center text-center group hover:border-blue-500/20 transition-all cursor-pointer min-h-[300px]"
              >
                <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-slate-500 group-hover:text-blue-400" />
                </div>
                <p className="font-bold text-slate-300">Add Agent</p>
                <p className="text-xs text-slate-500 mt-1">Initialize a new custom expert module.</p>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <AgentAnalytics agents={agents} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingAgent(null); setShowSaveConfirm(false); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
              <button 
                onClick={() => { setEditingAgent(null); setShowSaveConfirm(false); }}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <AnimatePresence mode="wait">
                {showSaveConfirm ? (
                  <motion.div 
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="py-10 text-center space-y-6"
                  >
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                      <ShieldCheck className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Save Configuration?</h3>
                      <p className="text-sm text-slate-400">Are you sure you want to save these changes?</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowSaveConfirm(false)}
                        className="flex-grow py-3 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all text-slate-400"
                      >
                        Back to Editor
                      </button>
                      <button 
                        onClick={() => saveAgent()}
                        className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                      >
                        Confirm Mutation
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-blue-400" />
                      {editingAgent.id ? 'Configure Agent' : 'New AI Module'}
                    </h2>

                    <form onSubmit={saveAgent} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Agent Name</label>
                        <input 
                          required
                          value={editingAgent.name || ''}
                          onChange={e => setEditingAgent({...editingAgent, name: e.target.value})}
                          placeholder="e.g. Nexus Auditor"
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Assigned Role</label>
                        <input 
                          required
                          value={editingAgent.role || ''}
                          onChange={e => setEditingAgent({...editingAgent, role: e.target.value})}
                          placeholder="e.g. Risk Optimization Expert"
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500/50 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Operational Protocol (Description)</label>
                        <textarea 
                          value={editingAgent.description || ''}
                          onChange={e => setEditingAgent({...editingAgent, description: e.target.value})}
                          rows={3}
                          placeholder="Define the primary objective..."
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-blue-500/50 outline-none transition-all resize-none"
                        />
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Core Capabilities</label>
                        <div className="flex flex-wrap gap-2">
                          {AVAILABLE_CAPABILITIES.map(cap => {
                            const isSelected = (editingAgent.capabilities || []).includes(cap);
                            return (
                              <button
                                key={cap}
                                type="button"
                                onClick={() => {
                                  const current = editingAgent.capabilities || [];
                                  const next = isSelected 
                                    ? current.filter(c => c !== cap) 
                                    : [...current, cap];
                                  setEditingAgent({...editingAgent, capabilities: next});
                                }}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                                  isSelected 
                                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                                }`}
                              >
                                {cap}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Agent Operational Status</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['active', 'configuring', 'hibernating', 'offline'] as const).map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setEditingAgent({...editingAgent, status: s})}
                              className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-bold transition-all ${
                                editingAgent.status === s
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                s === 'active' ? 'bg-green-500' :
                                s === 'configuring' ? 'bg-yellow-500' :
                                s === 'hibernating' ? 'bg-purple-500' :
                                'bg-slate-500'
                              }`} />
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setEditingAgent(null)}
                          className="flex-grow py-3 rounded-lg border border-white/10 text-xs font-bold hover:bg-white/5 transition-all"
                        >
                          Abort
                        </button>
                        <button 
                          type="submit"
                          className="flex-[2] py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                        >
                          {editingAgent.id ? 'Apply Configuration' : 'Initialize Protocol'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SectionTerminalProps {
  user: User | null;
}

const SectionTerminal: React.FC<SectionTerminalProps> = ({ user }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mode, setMode] = useState<ModelMode>('pro');
  const [history, setHistory] = useState<any[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Error logging for Firestore
  const handleFirestoreError = (error: any, op: string, path: string) => {
    const errInfo = {
      error: error.message,
      operationType: op,
      path,
      authInfo: {
        userId: user?.uid,
        email: user?.email,
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
  };

  useEffect(() => {
    if (!user) return;
    const q = fsQuery(
      collection(db, 'research_logs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, 'LIST', 'research_logs'));
    return () => unsubscribe();
  }, [user]);

  const performResearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setResult(null);

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
    
    // Select model and config based on mode
    let modelName = 'gemini-3-flash-preview';
    let config: any = { responseMimeType: "application/json" };
    
    if (mode === 'pro') {
      modelName = 'gemini-3.1-pro-preview';
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (mode === 'fast') {
      modelName = 'gemini-3.1-flash-lite-preview';
    } else if (mode === 'grounded') {
      config.tools = [{ googleSearch: {} }, { googleMaps: {} }];
      // When combining search, we might need server side invocations
      config.toolConfig = { includeServerSideToolInvocations: true };
    }

    try {
      const prompt = `You are the Nexus Research Agent. Analyze "${query}". 
      Format result as JSON with keys: 
      "summary" (rich analysis), 
      "market_trends" (3 specific insights), 
      "suggested_contacts" (3 specific profiles), 
      "outreach_strategy" (compelling angle),
      "citations" (real sources if grounded).`;

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);

      if (user) {
        await addDoc(collection(db, 'research_logs'), {
          userId: user.uid,
          query,
          result: data,
          timestamp: new Date().toISOString(), // Using ISO string for security rules validation
          mode
        });
      }
    } catch (err) {
      console.error(err);
      setResult({ error: "Intelligence sync failed. Check connectivity or quota." });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [result, isSearching]);

  return (
    <div className="p-10 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      <div className="flex-grow glass-panel rounded-2xl border-white/10 overflow-hidden flex flex-col shadow-2xl relative">
        <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 justify-between">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Nexus.sh — Sales Research</span>
          </div>
          <div className="w-12" />
        </div>

        <div className="flex-grow p-8 font-mono text-sm space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex gap-2 mb-4">
            {(['pro', 'fast', 'grounded'] as ModelMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter border transition-all ${
                  mode === m 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                {m === 'pro' && 'High Intelligence'}
                {m === 'fast' && 'Low Latency'}
                {m === 'grounded' && 'Search Grounded'}
              </button>
            ))}
          </div>

          {!user && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs mb-4">
              Sign in to save research logs and access persistent history.
            </div>
          )}
          <div className="space-y-2">
            <p className="text-blue-400">nexus@supervisor:~$ <span className="text-slate-200">whoami</span></p>
            <p className="text-slate-400">Nexus Research Agent V2.0.1. Mode: Deep Discovery.</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-400">Ready for query input. Specify subject, company, or market segment.</p>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/10 focus-within:border-blue-500/50 transition-all">
              <Search className="w-5 h-5 text-slate-500" />
              <input 
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && performResearch()}
                placeholder="Enter topic (e.g., 'Green Hydrogen in EU', 'NVIDIA Q3 Strategy')..."
                className="bg-transparent border-none outline-none w-full text-slate-100 placeholder:text-slate-600"
              />
              <button 
                onClick={performResearch}
                disabled={isSearching || !query.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? <Clock className="w-4 h-4 animate-spin" /> : 'EXECUTE'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="space-y-2 py-4"
              >
                <div className="flex items-center gap-3 text-blue-400">
                  <span className="animate-spin text-lg">/</span>
                  <p>Infiltrating knowledge graph...</p>
                </div>
                <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: -200 }} 
                    animate={{ x: 200 }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="h-full w-24 bg-blue-500"
                  />
                </div>
              </motion.div>
            )}

            {result && !result.error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8 py-6 border-t border-white/10"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="uppercase text-[10px] tracking-widest font-bold">Research Synchronized</span>
                  </div>
                  <div className="glass-panel p-6 rounded-xl border-blue-500/20">
                    <h5 className="text-blue-400 mb-2 uppercase text-[10px] font-bold tracking-widest">Executive Summary</h5>
                    <p className="text-slate-200 leading-relaxed font-sans text-base">{result.summary}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h5 className="text-slate-500 uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
                       <BarChart3 className="w-3 h-3" /> Market Trends
                    </h5>
                    <ul className="space-y-2">
                      {result.market_trends.map((t: string, i: number) => (
                        <li key={i} className="flex gap-3 text-slate-300 font-sans text-sm">
                          <span className="text-blue-500 font-bold">0{i+1}.</span> {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-slate-500 uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
                      <Network className="w-3 h-3" /> Intelligence Graph (Contacts)
                    </h5>
                    <div className="space-y-2">
                      {result.suggested_contacts.map((c: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-lg flex items-center justify-between group hover:border-blue-500/30 transition-all">
                          <div>
                            <p className="font-bold text-slate-200 font-sans text-sm">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.title}</p>
                          </div>
                          <div className="flex gap-2">
                             <button className="p-1.5 rounded bg-blue-500/10 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Linkedin className="w-3 h-3" />
                             </button>
                             <button className="p-1.5 rounded bg-blue-500/10 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Mail className="w-3 h-3" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                   <h5 className="text-orange-400 mb-2 uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3" /> Outreach Angle
                    </h5>
                    <p className="text-slate-300 font-sans italic text-sm">"{result.outreach_strategy}"</p>
                </div>

                {history.length > 0 && (
                  <div className="pt-8 border-t border-white/10 space-y-4">
                    <h5 className="text-slate-500 uppercase text-[10px] font-bold tracking-widest flex items-center gap-2">
                       <History className="w-3 h-3" /> Persistent Intelligence Hub
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {history.slice(0, 4).map((log, i) => (
                        <div 
                          key={log.id} 
                          onClick={() => {setQuery(log.query); setResult(log.result)}}
                          className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-blue-500/30 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between mb-2">
                            <span className="text-[10px] text-blue-400 font-bold uppercase">{log.mode || 'standard'}</span>
                            <span className="text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-200 font-sans line-clamp-1">{log.query}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-white/5 pt-4">
                  <div className="flex gap-4">
                    <span>SOURCES: {result.citations.join(', ')}</span>
                    <span className="text-blue-500/50">CONFIDENCE: 92%</span>
                  </div>
                  <div className="flex gap-3">
                    <button className="hover:text-slate-300 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Sync to CRM</button>
                    <button className="hover:text-slate-300 flex items-center gap-1"><History className="w-3 h-3" /> Save Log</button>
                  </div>
                </div>
              </motion.div>
            )}

            {result?.error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs">
                {result.error}
              </div>
            )}
          </AnimatePresence>
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

const SectionSettings = () => {
  return (
    <div className="p-10 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="glass-panel p-8 rounded-2xl space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-400" /> Platform Governance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="font-semibold">Enterprise Auth (SSO)</p>
              <p className="text-xs text-slate-500">Enable Okta/Azure AD integration.</p>
            </div>
            <div className="w-12 h-6 bg-slate-800 rounded-full p-1 cursor-pointer">
              <div className="w-4 h-4 bg-slate-600 rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
            <div>
              <p className="font-semibold">Audit Logs</p>
              <p className="text-xs text-slate-500">Record all agent cross-handoff activity.</p>
            </div>
            <div className="w-12 h-6 bg-blue-600 rounded-full p-1 flex justify-end cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <Database className="w-6 h-6 text-purple-400" /> Integration Endpoints
        </h3>
        <div className="space-y-4">
          {[
            { name: 'Hubspot CRM', status: 'Connected', key: '••••••••••••' },
            { name: 'LinkedIn Sales Nav', status: 'Error', key: 'None' },
            { name: 'Apollo.io', status: 'Disconnected', key: 'None' },
          ].map(tool => (
            <div key={tool.name} className="flex items-center gap-4 p-4 border border-white/10 rounded-xl hover:bg-white/5 transition-all">
              <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center font-bold text-xs uppercase text-slate-500">
                {tool.name[0]}
              </div>
              <div className="flex-grow">
                <p className="font-semibold text-sm">{tool.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">API KEY: {tool.key}</p>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                tool.status === 'Connected' ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {tool.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-red-500 font-mono">
          CRITICAL SYSTEM ERROR. REBOOT REQUIRED.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    
    // Test connection
    const testConn = async () => {
      try { await getDocFromServer(doc(db, 'system', 'ping')); } catch (e) {}
    };
    testConn();

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Auth Error:", err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center font-mono text-blue-500">SYNCHRONIZING NEXUS...</div>;

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-[#050505] text-slate-100 overflow-hidden tech-grid">
        <Sidebar 
          active={activeSection} 
          setActive={setActiveSection} 
          user={user}
          onLogin={login}
          onLogout={logout}
        />
        
        <main className="flex-grow flex flex-col overflow-hidden relative">
          <Header title={activeSection} />
          
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeSection === 'overview' && <SectionOverview key="ov" />}
              {activeSection === 'roadmap' && <SectionRoadmap key="rm" />}
              {activeSection === 'agents' && <SectionAgents key="ag" user={user} />}
              {activeSection === 'terminal' && <SectionTerminal key="tm" user={user} />}
              {activeSection === 'settings' && <SectionSettings key="st" />}
            </AnimatePresence>
          </div>

          {/* Decorative elements */}
          <div className="fixed bottom-10 right-10 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="fixed top-20 left-64 w-32 h-32 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />
        </main>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
}
