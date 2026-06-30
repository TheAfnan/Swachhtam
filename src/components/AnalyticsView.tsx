import React from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Activity,
  Cpu
} from 'lucide-react';
import { CivicReport, DigitalTwinZone } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  LineChart, 
  Line 
} from 'recharts';

interface AnalyticsViewProps {
  reports: CivicReport[];
  zones: DigitalTwinZone[];
}

export default function AnalyticsView({ reports, zones }: AnalyticsViewProps) {
  // Listen to the global theme dynamically to update chart colors accordingly
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof document !== 'undefined') {
      return document.querySelector('.dark') !== null;
    }
    return true;
  });

  React.useEffect(() => {
    setIsDark(document.querySelector('.dark') !== null);

    const observer = new MutationObserver(() => {
      setIsDark(document.querySelector('.dark') !== null);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);
  
  // High quality calculation aggregates
  const totalReports = reports.filter(r => !r.isDuplicateMerged).length;
  const resolved = reports.filter(r => r.status === 'resolved' && !r.isDuplicateMerged).length;
  const inProgress = reports.filter(r => r.status === 'in_progress' && !r.isDuplicateMerged).length;
  const reportedOnly = reports.filter(r => r.status === 'reported' && !r.isDuplicateMerged).length;

  const resolutionRate = totalReports > 0 ? Math.round((resolved / totalReports) * 100) : 0;

  // Monthly aggregated values representation
  const weeklyVelocityData = [
    { label: 'Wk 1', reported: 12, resolved: 8 },
    { label: 'Wk 2', reported: 18, resolved: 14 },
    { label: 'Wk 3', reported: 25, resolved: 19 },
    { label: 'Wk 4', reported: 35, resolved: 28 },
    { label: 'Wk 5', reported: 48, resolved: 39 },
    { label: 'Wk 6', reported: 68, resolved: 52 },
  ];

  // Areas metrics list
  const districtPerformanceData = zones.map(z => {
    const active = reports.filter(r => r.location.areaName === z.name && r.status !== 'resolved' && !r.isDuplicateMerged).length;
    const completed = reports.filter(r => r.location.areaName === z.name && r.status === 'resolved' && !r.isDuplicateMerged).length;
    return {
      name: z.name.replace('District', '').replace('Center', '').replace('Ward', ''),
      HealthIndex: z.healthScore,
      ActiveThreats: active,
      ResolvedThreats: completed
    };
  });

  const chartColors = ['#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

  return (
    <div className="space-y-6 text-slate-100 w-full">
      
      {/* Visual Header */}
      <div className="space-y-1 text-left">
        <h1 className="text-2xl font-extrabold tracking-tight text-white" id="analytics-heading">District Cleanliness & Resolution Analytics</h1>
        <p className="text-sm text-slate-400">
          Inspect municipal repair status, resolution times, and community contributions across Lucknow wards.
        </p>
      </div>

      {/* Analytics stats numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div id="analytics-card-resolution" className="p-4 rounded-xl bg-[#0c1017] border border-slate-800 space-y-1 shadow-xl text-left animate-fade-in">
          <span className="text-[10px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider block">Resolution Performance Index</span>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-2xl font-black text-indigo-400">{resolutionRate}%</span>
            <span className="text-[10px] text-slate-500 font-mono">+{isFinite(resolutionRate) ? 4.8 : 0}% vs standard</span>
          </div>
        </div>

        <div id="analytics-card-velocity" className="p-4 rounded-xl bg-[#0c1017] border border-slate-800 space-y-1 shadow-xl text-left animate-fade-in">
          <span className="text-[10px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider block">Average Ticket Closure Velocity</span>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-2xl font-black text-indigo-400 font-mono">3.4 hrs</span>
            <span className="text-[10px] text-indigo-455 text-indigo-400 font-bold">-22 min decrease</span>
          </div>
        </div>

        <div id="analytics-card-triage" className="p-4 rounded-xl bg-[#0c1017] border border-slate-800 space-y-1 shadow-xl text-left animate-fade-in">
          <span className="text-[10px] text-slate-505 text-slate-500 font-bold uppercase tracking-wider block">Automated AI Triage accuracy</span>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-2xl font-black text-indigo-400">96.8%</span>
            <span className="text-[10px] text-slate-500 font-mono">Gemini 3.5 model precision</span>
          </div>
        </div>

        <div id="analytics-card-citizens" className="p-4 rounded-xl bg-[#0c1017] border border-slate-800 space-y-1 shadow-xl text-left animate-fade-in">
          <span className="text-[10px] text-slate-550 text-slate-500 font-bold uppercase tracking-wider block">Peer Verification Trust Quotient</span>
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-2xl font-black text-indigo-400">89.4%</span>
            <span className="text-[10px] text-slate-500 font-mono">True-positive verification index</span>
          </div>
        </div>

      </div>

      {/* Advanced charts grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Weekly submission rate curves */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0c1017] border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono text-left">MUNICIPAL DESIGNS INCIDENCE COMPLIANCE VELOCITY</h3>
          <div className="h-64 w-full" id="chart-velocity-container text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyVelocityData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportedA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="resolvedA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#cbd5e1"} className="stroke-slate-800" />
                <XAxis dataKey="label" stroke={isDark ? "#475569" : "#334155"} fontSize={11} tickLine={false} />
                <YAxis stroke={isDark ? "#475569" : "#334155"} fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#0c1017' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                  wrapperClassName="text-xs shadow-2xl" 
                />
                <Area type="monotone" dataKey="reported" name="Submitted Tickets" stroke="#4f46e5" fillOpacity={1} fill="url(#reportedA)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Completed Tickets" stroke="#818cf8" fillOpacity={1} fill="url(#resolvedA)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* District health levels bar overlays */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0c1017] border border-slate-800 space-y-4 font-mono">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase font-mono text-left">DISTRICT URBAN DECAY & HEALTH COMPARISON</h3>
          <div className="h-64 w-full" id="chart-decay-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtPerformanceData} margin={{ top: 10, right: 5, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#cbd5e1"} className="stroke-slate-800" />
                <XAxis dataKey="name" stroke={isDark ? "#475569" : "#334155"} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? "#475569" : "#334155"} fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: isDark ? '#0c1017' : '#ffffff',
                    borderColor: isDark ? '#1e293b' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                  wrapperClassName="text-xs shadow-2xl" 
                />
                <Bar dataKey="HealthIndex" name="Health Score (%)" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {districtPerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
                <Bar dataKey="ActiveThreats" name="Active Tickets" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Area: Government Compliance Summary Table */}
      <div className="p-5 rounded-2xl bg-[#0c1017] border border-slate-800 space-y-4 w-full">
        <h3 className="text-sm font-bold tracking-tight text-white text-left pb-1 border-b border-slate-850">Live District Performance Audit Ledger</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left" id="performance-audit-table">
            <thead className="bg-[#05070a] uppercase text-[10px] font-bold text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-3">District Name</th>
                <th className="p-3">Health Score</th>
                <th className="p-3 text-center">Active Complaints</th>
                <th className="p-3 text-center">Resolved Checklist Items</th>
                <th className="p-3">Compliance Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {zones.map((z, idx) => (
                <tr key={z.id} className="hover:bg-[#111621]/30">
                  <td className="p-3 font-semibold text-slate-200">{z.name}</td>
                  <td className="p-3 font-mono font-bold text-indigo-400">{z.healthScore}%</td>
                  <td className="p-3 text-center font-mono text-rose-455 text-rose-400">{districtPerformanceData[idx]?.ActiveThreats || 0}</td>
                  <td className="p-3 text-center font-mono text-emerald-400">{districtPerformanceData[idx]?.ResolvedThreats || 0}</td>
                  <td className="p-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                      z.healthScore >= 80 ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                      z.healthScore >= 60 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                    }`}>
                      {z.healthScore >= 80 ? 'Tier I (Nominal)' : z.healthScore >= 60 ? 'Tier II (Vulnerable)' : 'Tier III (Critical Decay)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
