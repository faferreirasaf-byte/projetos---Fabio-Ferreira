import React from 'react';
import { ArrowUpRight, ArrowDownRight, PiggyBank, CircleDollarSign, HeartPulse, ShieldAlert, Award } from 'lucide-react';
import { MetricSummary } from '../types';

interface MetricCardsProps {
  metrics: MetricSummary;
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  const { totalIncome, totalExpense, totalInvestment, totalDebt, balance, savingsRate, healthScore, healthLabel } = metrics;

  // Determine health color and styling
  const getHealthMeta = (label: string) => {
    switch (label) {
      case 'Excelente':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 rounded-2xl',
          barColor: 'bg-emerald-500',
          icon: <Award className="w-5 h-5 text-emerald-600" />,
          desc: 'Excelente! Suas receitas alimentam firmemente o seu enriquecimento.'
        };
      case 'Ajustado':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 rounded-2xl',
          barColor: 'bg-indigo-600',
          icon: <HeartPulse className="w-5 h-5 text-indigo-600" />,
          desc: 'Ajustado! Relação de despesas sob controle, continue poupando.'
        };
      case 'Moderado':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 rounded-2xl',
          barColor: 'bg-amber-500',
          icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
          desc: 'Atenção. Sua taxa de poupança está baixa e o saldo está apertado.'
        };
      case 'Crítico':
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 rounded-2xl',
          barColor: 'bg-rose-500',
          icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
          desc: 'Alerta! Risco de insolvência ou juros. Você precisa revisar gastos.'
        };
    }
  };

  const healthMeta = getHealthMeta(healthLabel);

  return (
    <div className="space-y-6" id="metrics-cards-grid">
      {/* 4 Cards Grid - Bento Rounded Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Remaining Net Balance - Hero Premium Card inspired by Bento Design */}
        <div className={`col-span-2 lg:col-span-2 rounded-3xl p-6 shadow-md transition-all flex flex-col justify-between min-h-[140px] ${balance >= 0 ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-indigo-100' : 'bg-gradient-to-tr from-rose-600 to-rose-700 text-white shadow-rose-100'}`}>
          <div className="flex justify-between items-start">
            <span className={`text-xs font-semibold uppercase tracking-wider ${balance >= 0 ? 'text-indigo-100' : 'text-rose-100'}`}>Saldo Disponível Total</span>
            <div className={`p-2 rounded-xl backdrop-blur-md ${balance >= 0 ? 'bg-white/10 text-white' : 'bg-white/10 text-white'}`}>
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mt-2">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <p className={`text-xxs mt-1 font-medium ${balance >= 0 ? 'text-indigo-200' : 'text-rose-200'}`}>
              {balance >= 0 ? '✓ Orçamento saudável e livre para novas metas' : '⚠ Atenção ao saldo negativo no mês'}
            </p>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-400">Receitas Totais</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xxs text-slate-400 mt-1">Lançado no mês corrente</div>
          </div>
        </div>

        {/* Expenses / Outflows */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-400">Despesas Consumo</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-800">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xxs text-rose-500 mt-1 font-semibold">
              {totalIncome > 0 ? `${Math.round((totalExpense / totalIncome) * 100)}% das receitas` : 'Sem receita ativa'}
            </div>
          </div>
        </div>

      </div>

      {/* Another Grid Row for holding Savings Rate and Financial Health Meter together */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left segment - Savings Rate Card (moved to a bento grid box) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xxs font-bold uppercase tracking-wider text-slate-400">Taxa de Poupança</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1 font-sans">Investimentos</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-800">
              R$ {totalInvestment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
              <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, savingsRate)}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-xxs text-slate-500 mt-1.5 font-mono">
              <span>Alocado</span>
              <span className="text-indigo-600 font-bold">Poupança: {savingsRate}%</span>
            </div>
          </div>
        </div>

        {/* Right segment - Advanced AI Financial Health Meter */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-sm tracking-tight">Indicador de Saúde Financeira</h3>
                  <p className="text-xxs text-slate-400">Score de risco e proporção de reservas orçamentárias</p>
                </div>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${healthMeta.bg}`}>
                {healthMeta.icon}
                <span>Saúde: {healthLabel}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>Diagnóstico Geral</span>
                <span className="font-extrabold text-indigo-600">Score: {healthScore}/100</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${healthMeta.barColor} transition-all duration-700 ease-out rounded-full`}
                  style={{ width: `${healthScore}%` }}
                />
              </div>

              <div className="grid grid-cols-4 text-[10px] text-slate-400 pt-1 font-mono">
                <span>Crítico</span>
                <span className="text-center">Moderado</span>
                <span className="text-center">Ajustado</span>
                <span className="text-right font-semibold">Excelente</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-2xl text-xs border border-slate-150 flex items-start gap-3">
            <div className="p-1 px-1.5 bg-indigo-600 rounded-lg text-[9px] font-mono font-bold text-white shrink-0">
              DICA IA
            </div>
            <p className="text-slate-600 leading-relaxed font-sans text-xs">
              {healthMeta.desc} O ideal de estabilidade baseia-se na regra 50-30-20. Dívidas com juros altos são o principal risco de rebaixamento.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
