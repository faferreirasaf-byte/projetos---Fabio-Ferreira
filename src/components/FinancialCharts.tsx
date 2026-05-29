import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Transaction } from '../types';
import { BarChart3, PieChartIcon, Calendar } from 'lucide-react';

interface FinancialChartsProps {
  transactions: Transaction[];
}

const COLORS = [
  '#4f46e5', // indigo
  '#3b82f6', // blue
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#10b981', // emerald
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b'  // slate
];

export default function FinancialCharts({ transactions }: FinancialChartsProps) {
  // Sort transactions chronologically
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate Cumulative Balance Over Time
  let currentBalance = 0;
  const balanceTimeline = sortedTransactions.map(tx => {
    const netChange = tx.type === 'income' ? tx.amount : -tx.amount;
    currentBalance += netChange;
    return {
      date: new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      Saldo: currentBalance,
      Lancamento: tx.description
    };
  });

  // Calculate Spendings by Category (Only expenses, debts or investments)
  const categoryTotals: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'expense' || t.type === 'debt' || t.type === 'investment')
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount || 0);
    });

  const categoryData = Object.keys(categoryTotals).map((cat, index) => ({
    name: cat,
    value: categoryTotals[cat],
    color: COLORS[index % COLORS.length]
  })).sort((a, b) => b.value - a.value);

  // Group transactions for Bar Chart (Incomes vs Outflows by category)
  const categoryInOutMap: { [key: string]: { income: number; outflow: number } } = {};
  transactions.forEach(t => {
    if (!categoryInOutMap[t.category]) {
      categoryInOutMap[t.category] = { income: 0, outflow: 0 };
    }
    if (t.type === 'income') {
      categoryInOutMap[t.category].income += Number(t.amount || 0);
    } else {
      categoryInOutMap[t.category].outflow += Number(t.amount || 0);
    }
  });

  const comparisonData = Object.keys(categoryInOutMap).map(cat => ({
    category: cat,
    Receitas: categoryInOutMap[cat].income,
    Saidas: categoryInOutMap[cat].outflow
  })).filter(d => d.Receitas > 0 || d.Saidas > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-wrapper-container">
      {/* Chart 1: Balance Evolution */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5 justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="font-sans font-bold text-sm text-slate-800">Evolução Líquida do Saldo</h4>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 rounded px-2.5 py-1 font-semibold">Histórico Contínuo</span>
        </div>

        <div className="h-64">
          {balanceTimeline.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
              Adicione lançamentos para decolar o gráfico de evolução.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                     <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                   </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const val = payload[0].value;
                      return (
                        <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl text-xxs font-sans shadow-lg space-y-1">
                          <p className="font-bold">{data.date}</p>
                          <p className="text-slate-300">Lançamento: {data.Lancamento}</p>
                          <p className="text-indigo-300 font-bold">Saldo: R$ {Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="Saldo" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#balanceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2: Category distribution Pie & Bar Chart Toggle */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5 justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <h4 className="font-sans font-bold text-sm text-slate-800">Distribuição por Categoria</h4>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 rounded px-2.5 py-1 font-semibold">Saídas Gerais</span>
        </div>

        <div className="h-64 flex flex-col md:flex-row items-center justify-between gap-4">
          {categoryData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
              Nenhuma despesa ou investimento para mapear.
            </div>
          ) : (
            <>
              {/* Graphic */}
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor total']}
                      contentStyle={{ fontFamily: 'monospace', fontSize: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with value details */}
              <div className="w-full md:w-1/2 overflow-y-auto max-h-56 pr-2 space-y-2">
                {categoryData.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-xxs border-b border-slate-50 pb-1.5 hover:bg-slate-50/50 px-1 py-0.5 rounded transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-sans font-semibold text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-800 font-extrabold">R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Comparison Chart: Incomes vs Outflows per active Category */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h4 className="font-sans font-bold text-sm text-slate-800 tracking-tight">Comparativo Entrada vs Saída por Categoria</h4>
        </div>

        <div className="h-56">
          {comparisonData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 italic">
              Seus dados financeiros agrupados aparecerão aqui de forma clara.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ fontFamily: 'monospace', fontSize: '10px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Receitas" fill="#4f46e5" radius={[5, 5, 0, 0]} />
                <Bar dataKey="Saidas" fill="#f43f5e" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
