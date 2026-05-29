import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Lightbulb, BookOpen, AlertCircle, TrendingUp, CheckCircle2, FileText } from 'lucide-react';
import { Transaction, FinancialGoal, FinancialInsight } from '../types';

interface AIAdvisorProps {
  transactions: Transaction[];
  goals: FinancialGoal[];
  onRefreshMetrics: (metrics: any) => void;
}

export default function AIAdvisor({ transactions, goals, onRefreshMetrics }: AIAdvisorProps) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<string>('');
  const [tips, setTips] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, goals })
      });
      if (response.ok) {
        const data = await response.json();
        setOverview(data.overviewString);
        setTips(data.tips || []);
        setSteps(data.suggestedSteps || []);
        setInsights(data.insights || []);
        setIsAiGenerated(data.isAiGenerated);
        if (data.metrics) {
          onRefreshMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.error("Falha ao carregar aconselhamento financeiro.", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [transactions, goals]);

  // Quick feedback icon for danger alerts
  const getBadgeType = (type: string) => {
    switch (type) {
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm" id="ai-advisor-panel">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-2xl shadow-sm">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-1.5 tracking-tight">
              Conselheiro Inteligente
            </h3>
            <p className="text-xxs text-slate-400 font-sans">Recomendações e educação financeira por IA</p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Processando...' : 'Reavaliar Carteira'}
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-indigo-600 absolute top-2.5 left-2.5 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-700">IA analisando faturas e taxas de poupança...</p>
            <p className="text-xxs text-slate-400 mt-1.5 font-mono italic">"Reexaminando saldos vs objetivos..."</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Overview */}
          <div className="bg-indigo-50/60 border border-indigo-100/70 rounded-3xl p-5 relative overflow-hidden">
            <div className="flex gap-3">
              <div className="p-1 px-2 bg-indigo-600 text-white text-[9px] font-mono rounded-lg mt-0.5 uppercase font-extrabold tracking-wider shrink-0 self-start">
                Relatório do Mês
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans font-semibold">
                {overview}
              </p>
            </div>
            {isAiGenerated && (
              <div className="text-[10px] text-indigo-700 font-mono text-right mt-2 flex items-center justify-end gap-1 font-bold">
                <Sparkles className="w-3 h-3" />
                <span>Análise gerada dinamicamente pelo modelo Gemini 2.5</span>
              </div>
            )}
          </div>

          {/* Interactive Custom Insights */}
          <div>
            <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              Sinais e Alertas Gerais
            </h4>
            
            {insights.length === 0 ? (
              <p className="text-xxs text-slate-400 italic font-medium ml-1">Nenhum desvio detectado no momento. Mantenha os lançamentos consistentes!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((insight, idx) => (
                  <div
                    key={insight.id || idx}
                    className={`border rounded-2xl p-4 flex items-start gap-3 transition-all hover:shadow-2xs ${getBadgeType(insight.type)}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono uppercase tracking-wider font-extrabold bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-3xs">
                          {insight.category}
                        </span>
                        <h5 className="text-xs font-bold font-sans tracking-tight">{insight.title}</h5>
                      </div>
                      <p className="text-xxs opacity-90 leading-relaxed font-sans">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Practical tips */}
            <div>
              <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-indigo-600" />
                Educação e Dicas Práticas
              </h4>
              <ul className="space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-slate-600 leading-relaxed font-medium">
                    <BookOpen className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Structured action steps */}
            <div>
              <h4 className="font-sans font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Passos Recomendados
              </h4>
              <ul className="space-y-3">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-slate-600 leading-relaxed font-medium font-sans">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Basic Financial Educational Footer Card - Dark Slate Modern bento block */}
      <div className="mt-6 p-5 bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Metodologia das 3 Carteiras de Investimento
          </h5>
          <p className="text-xxs text-slate-300 max-w-xl leading-relaxed font-sans">
            Profissionais dividem os investimentos em 3 carteiras: Reserva de Emergência (Liquidez total), Acumulação (Foco em rendimentos de longo prazo) e Metas de Curto Przo (Projetos em menos de 1 ano). Planeje seus lançamentos e metas de acordo com esta regra científica!
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="p-1 px-3 bg-indigo-950 text-indigo-300 border border-indigo-900/65 rounded-lg font-mono text-[9px] font-extrabold tracking-wider uppercase">
            EDUCAÇÃO
          </span>
        </div>
      </div>
    </div>
  );
}
