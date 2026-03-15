import React from 'react';
import { Pill, Search, BarChart3, MessageSquare, SlidersHorizontal, ArrowRight, Shield, Brain, Activity } from 'lucide-react';

interface LandingPageProps {
  drugCount: number;
  onSearchClick: () => void;
}

const CATEGORIES = [
  { label: 'Positive Experience', color: '#10b981', icon: '✅' },
  { label: 'Mixed Feedback', color: '#f59e0b', icon: '🔄' },
  { label: 'Ineffective', color: '#9E9E9E', icon: '🚫' },
  { label: 'Dosage Issues', color: '#3b82f6', icon: '⚖️' },
  { label: 'Severe Side Effects', color: '#ef4444', icon: '⚠️' },
  { label: 'Dependency / Addiction', color: '#8b5cf6', icon: '🧠' },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Classification',
    description: 'BERT-powered sentiment analysis classifies every review into 6 actionable categories.',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Shield,
    title: 'Trust Scores',
    description: 'Composite trust scores weighted by review sentiment give a single reliability metric.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat Assistant',
    description: 'Ask Gemini questions about any drug — it synthesizes insights from real patient reviews.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: SlidersHorizontal,
    title: 'Advanced Filters',
    description: 'Slice reviews by age, gender, and sentiment category to find exactly what matters to you.',
    gradient: 'from-amber-500 to-orange-600',
  },
];

const STEPS = [
  { step: '01', label: 'Search', desc: 'Find a medication in the sidebar', icon: Search },
  { step: '02', label: 'Analyze', desc: 'View trust score & review breakdown', icon: BarChart3 },
  { step: '03', label: 'Chat', desc: 'Ask the AI for deeper insights', icon: MessageSquare },
];

export const LandingPage: React.FC<LandingPageProps> = ({ drugCount, onSearchClick }) => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-16 pb-20">

        {/* ── Hero Section ── */}
        <section className="relative pt-16 pb-12 text-center">
          {/* Background glow */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl" />
          </div>

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 mb-8 animate-[bounce_3s_ease-in-out_infinite]">
            <Pill className="text-white" size={36} />
          </div>

          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Drug<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Insight</span> AI
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            AI-powered drug review analysis — instantly classify patient feedback, 
            compute trust scores, and uncover hidden sentiment patterns.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={onSearchClick}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <Search size={16} />
              Select a medication to begin
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Stat pill */}
          <div className="mt-10 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white border border-slate-200 shadow-sm">
            <Activity size={16} className="text-blue-500" />
            <span className="text-sm font-semibold text-slate-700">
              <span className="text-2xl font-black text-blue-600">{drugCount}</span> medications available for analysis
            </span>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section>
          <h2 className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Platform Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} shadow-sm mb-4`}>
                  <f.icon size={20} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Category Legend ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Review Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-lg mr-1">{cat.icon}</span>
                <span className="text-sm font-medium text-slate-700">{cat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Quick Start Steps ── */}
        <section>
          <h2 className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Get Started in 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-4 shadow-lg">
                  <s.icon size={22} />
                </div>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Step {s.step}</div>
                <h3 className="text-lg font-bold text-slate-900">{s.label}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={18} className="hidden md:block absolute top-7 -right-3 text-slate-300" />
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
