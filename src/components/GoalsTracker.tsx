import React, { useState } from 'react';
import { Target, Plus, PiggyBank, Calendar, Trash2 } from 'lucide-react';
import { FinancialGoal, CATEGORIES } from '../types';

interface GoalsTrackerProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: Omit<FinancialGoal, 'id'>) => void;
  onContribute: (goalId: string, amount: number) => void;
  onRemoveGoal: (goalId: string) => void;
}

export default function GoalsTracker({ goals, onAddGoal, onContribute, onRemoveGoal }: GoalsTrackerProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState('Investimentos');
  const [deadline, setDeadline] = useState('');
  
  const [contributionInputs, setContributionInputs] = useState<{[key: string]: string}>({});

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    onAddGoal({
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: currentAmount ? parseFloat(currentAmount) : 0,
      category,
      deadline: deadline || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0] // default 1yr out
    });

    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setCategory('Investimentos');
    setDeadline('');
  };

  const handleSubContribution = (goalId: string) => {
    const amountStr = contributionInputs[goalId];
    if (!amountStr || parseFloat(amountStr) <= 0) return;

    const amt = parseFloat(amountStr);
    onContribute(goalId, amt);

    setContributionInputs(prev => ({ ...prev, [goalId]: '' }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="goals-wrapper">
      {/* Create Goal Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-1">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Target className="w-5 h-5 animate-pulse" />
          </div>
          <h3 className="font-sans font-bold text-slate-800 text-base tracking-tight">Nova Meta</h3>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Objetivo</label>
            <input
              type="text"
              placeholder="Ex: Compra de Computador, Viagem..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Alvo total (R$)</label>
              <input
                type="number"
                placeholder="R$ 5.000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Já poupado R$</label>
              <input
                type="number"
                placeholder="R$ 1.000"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Prazo Final</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl py-3 transition-colors shadow-sm shadow-indigo-100"
          >
            Adicionar Meta
          </button>
        </form>
      </div>

      {/* Active Goals List Tracker */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
        <h4 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-1.5 leading-none tracking-tight">
          🎯 Seus Objetivos e Projetos de Vida
        </h4>
        <p className="text-xxs text-slate-500">
          Aportar dinheiro na sua meta adiciona automaticamente um aporte na carteira do mês como Investimento.
        </p>

        {goals.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">
            Nenhuma meta cadastrada ainda. Crie sua meta no formulário de lado!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const isFinished = percentage >= 100;

              return (
                <div key={goal.id} className="border border-slate-100 bg-slate-50/40 rounded-2xl p-4.5 flex flex-col justify-between hover:border-slate-200 hover:bg-slate-50 hover:shadow-2xs transition-all relative group duration-200">
                  <button
                    onClick={() => onRemoveGoal(goal.id)}
                    title="Remover Meta"
                    className="absolute right-3.5 top-3.5 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-1 text-slate-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap pr-4">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-indigo-100 font-extrabold text-indigo-700 tracking-wide">
                        {goal.category}
                      </span>
                      <h5 className="text-xs font-bold font-sans text-slate-800 limit-lines-1 tracking-tight">{goal.name}</h5>
                    </div>

                    <div className="flex justify-between text-xxs text-slate-500 font-mono py-1">
                      <span>Prazo: {goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
                      <span className={`${isFinished ? 'text-indigo-600 font-extrabold' : 'text-slate-700 font-bold'}`}>
                        {percentage}% ({isFinished ? 'Concluído!' : 'Andamento'})
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isFinished ? 'bg-indigo-400' : 'bg-indigo-600'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xxs font-mono pt-1 text-slate-800">
                      <span className="font-bold">R$ {goal.currentAmount.toLocaleString('pt-BR')}</span>
                      <span className="text-slate-500">Alvo: R$ {goal.targetAmount.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Contributions Block */}
                  {!isFinished && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="R$ Aporte"
                        value={contributionInputs[goal.id] || ''}
                        onChange={(e) => setContributionInputs(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                      <button
                        onClick={() => handleSubContribution(goal.id)}
                        className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xxs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <PiggyBank className="w-3.5 h-3.5" />
                        Aportar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
