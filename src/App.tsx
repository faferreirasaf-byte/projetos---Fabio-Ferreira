import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  BookOpen, 
  Target, 
  FileSpreadsheet, 
  User, 
  CircleDollarSign,
  Info
} from 'lucide-react';

import { Transaction, FinancialGoal, MetricSummary, CATEGORIES } from './types';
import { INITIAL_TRANSACTIONS, INITIAL_GOALS } from './data/initialData';
import TransactionForm from './components/TransactionForm';
import MetricCards from './components/MetricCards';
import AIAdvisor from './components/AIAdvisor';
import FinancialCharts from './components/FinancialCharts';
import GoalsTracker from './components/GoalsTracker';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('smart_finance_txs');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    const saved = localStorage.getItem('smart_finance_goals');
    return saved ? JSON.parse(saved) : INITIAL_GOALS;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'ai' | 'goals' | 'education'>('dashboard');

  // Interactive filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // State to hold analyzed metrics
  const [metrics, setMetrics] = useState<MetricSummary>({
    totalIncome: 0,
    totalExpense: 0,
    totalInvestment: 0,
    totalDebt: 0,
    balance: 0,
    savingsRate: 0,
    healthScore: 65,
    healthLabel: 'Moderado'
  });

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem('smart_finance_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('smart_finance_goals', JSON.stringify(goals));
  }, [goals]);

  // Client-side quick summary calculator to prevent zeroed interfaces before server responds
  useEffect(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalInvestment = transactions.filter(t => t.type === 'investment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalDebt = transactions.filter(t => t.type === 'debt').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = totalIncome - (totalExpense + totalInvestment + totalDebt);
    
    // Savings rate
    const savingsRate = totalIncome > 0 ? Math.round((totalInvestment / totalIncome) * 100) : 0;
    
    // Quick local intelligence health label estimation
    let score = 50;
    if (totalIncome > 0) {
      const expenseRatio = totalExpense / totalIncome;
      if (expenseRatio <= 0.5) score += 20;
      else if (expenseRatio > 0.8) score -= 20;
      if (savingsRate >= 15) score += 15;
      if (totalDebt === 0) score += 15;
    }
    score = Math.max(10, Math.min(100, score));

    let label: 'Crítico' | 'Moderado' | 'Ajustado' | 'Excelente' = 'Moderado';
    if (score >= 85) label = 'Excelente';
    else if (score >= 65) label = 'Ajustado';
    else if (score >= 40) label = 'Moderado';
    else label = 'Crítico';

    setMetrics({
      totalIncome,
      totalExpense,
      totalInvestment,
      totalDebt,
      balance,
      savingsRate,
      healthScore: score,
      healthLabel: label
    });
  }, [transactions]);

  // Metric updates callback from AI component (giving actual server metrics)
  const handleServerMetricsRefresh = (serverMetrics: MetricSummary) => {
    setMetrics(serverMetrics);
  };

  // Add manually or predicted transactions
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
    };
    setTransactions(prev => [tx, ...prev]);
  };

  const handleManualAddWithParams = (desc: string, amt: number, type: 'income' | 'expense' | 'investment' | 'debt', cat: string) => {
    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      description: desc,
      amount: amt,
      type,
      category: cat,
      recurring: false,
      date: new Date().toISOString().split('T')[0]
    };
    setTransactions(prev => [tx, ...prev]);
  };

  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Import bulk copy-paste lines
  const handleImportBulk = (rawText: string) => {
    const lines = rawText.split('\n');
    const newItems: Transaction[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract amount
      const amountRegex = /(?:R\$?\s*)?(\d+(?:[.,]\d{1,2})?)/i;
      const match = trimmed.match(amountRegex);
      if (!match) return;

      const numVal = parseFloat(match[1].replace(',', '.'));
      let desc = trimmed.replace(match[0], '').replace(/R\$/g, '').trim();
      if (!desc) desc = "Aporte rápido importado";

      // Detect type
      let type: 'income' | 'expense' | 'investment' | 'debt' = 'expense';
      const cleanDesc = desc.toLowerCase();
      if (cleanDesc.includes('salario') || cleanDesc.includes('salário') || cleanDesc.includes('recebi') || cleanDesc.includes('rendimento')) {
        type = 'income';
      } else if (cleanDesc.includes('investimento') || cleanDesc.includes('poupança') || cleanDesc.includes('cdi') || cleanDesc.includes('fundo')) {
        type = 'investment';
      } else if (cleanDesc.includes('fatura') || cleanDesc.includes('emprestimo') || cleanDesc.includes('empréstimo') || cleanDesc.includes('juros')) {
        type = 'debt';
      }

      newItems.push({
        id: `tx-${Date.now()}-${Math.random()}`,
        description: desc,
        amount: numVal,
        type,
        category: 'Outros',
        recurring: false,
        date: new Date().toISOString().split('T')[0]
      });
    });

    if (newItems.length > 0) {
      setTransactions(prev => [...newItems, ...prev]);
    }
  };

  // Add new savings goal
  const handleAddGoal = (newGoal: Omit<FinancialGoal, 'id'>) => {
    const goal: FinancialGoal = {
      ...newGoal,
      id: `goal-${Date.now()}`
    };
    setGoals(prev => [...prev, goal]);
  };

  // Contribute money to Goal (triggers direct expense recording matched as investment)
  const handleContributeGoal = (goalId: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          currentAmount: g.currentAmount + amount
        };
      }
      return g;
    }));

    const matchedGoal = goals.find(g => g.id === goalId);
    if (matchedGoal) {
      // Record a transaction of type investment linked to this goal contribution
      handleManualAddWithParams(
        `Aporte na meta: ${matchedGoal.name}`, 
        amount, 
        'investment', 
        matchedGoal.category
      );
    }
  };

  const handleRemoveGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Clear All for demonstration reset state
  const handleResetData = () => {
    if (confirm("Deseja realmente redefinir o simulador para os dados originais? Suas inserções manuais serão perdidas.")) {
      setTransactions(INITIAL_TRANSACTIONS);
      setGoals(INITIAL_GOALS);
    }
  };

  // Apply filters on the transactions ledger
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesType = selectedType === 'all' || t.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between" id="applet-master">
      
      {/* Top Banner & Title Bar */}
      <header className="bg-emerald-950 text-white border-b border-emerald-800 shadow-sm relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 left-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(0,0,0,0))]" />
        
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-sans font-bold text-lg text-emerald-950 shadow-md">
              F$
            </div>
            <div>
              <h1 className="font-sans font-bold text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                Gestor Financeiro Inteligente
                <span className="p-1 px-2.5 bg-emerald-800 text-emerald-300 rounded text-xxs font-semibold uppercase tracking-wide font-mono scale-90">
                  IA Ativa
                </span>
              </h1>
              <p className="text-xxs text-emerald-200">Arquiteto de Orçamento e Análise de Crédito com Gemini 3.5-flash</p>
            </div>
          </div>

          {/* Core Desktop Navigation Tab Buttons */}
          <div className="flex items-center gap-1 bg-emerald-900/60 p-1 rounded-xl border border-emerald-800/80 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:bg-emerald-800/30'}`}
            >
              Painel Geral
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'transactions' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:bg-emerald-800/30'}`}
            >
              Lançamentos
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'ai' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:bg-emerald-800/30'}`}
            >
              Consultoria IA
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'goals' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:bg-emerald-800/30'}`}
            >
              Metas
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'education' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-200 hover:bg-emerald-800/30'}`}
            >
              Metodologias
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* PANEL 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Metrics Cards Layer */}
                <MetricCards metrics={metrics} />

                {/* Mid Section Charts layer */}
                <FinancialCharts transactions={transactions} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left and Middle columns: recent records list */}
                  <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                      <h3 className="font-sans font-bold text-gray-800 text-sm">Extrato Recente</h3>
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                      >
                        Ver todos
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-600">
                        <thead>
                          <tr className="border-b border-gray-100 font-mono text-gray-400">
                            <th className="py-2.5">Descrição</th>
                            <th className="py-2.5">Categoria</th>
                            <th className="py-2.5">Fluxo</th>
                            <th className="py-2.5 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {transactions.slice(0, 5).map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50/50">
                              <td className="py-3 font-medium text-gray-800">{t.description}</td>
                              <td className="py-3">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xxs font-mono text-gray-500 font-medium">
                                  {t.category}
                                </span>
                              </td>
                              <td className="py-3 capitalize">
                                <span className={`p-0.5 px-2 rounded-full text-xxs font-semibold ${t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : t.type === 'investment' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                                  {t.type === 'income' ? 'entrada' : t.type === 'investment' ? 'investimento' : t.type === 'debt' ? 'dívida' : 'despesa'}
                                </span>
                              </td>
                              <td className={`py-3 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right side form block for quick adds */}
                  <div className="lg:col-span-1">
                    <TransactionForm 
                      onAddTransaction={handleAddTransaction} 
                      onImportBulk={handleImportBulk} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PANEL 2: TRANSACTIONS CENTRAL LEDGER */}
            {activeTab === 'transactions' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold font-sans text-gray-800">Livro de Lançamentos Financeiros</h2>
                    <p className="text-xs text-gray-500">Mapeamento completo de todas as receitas, investimentos e despesas adicionadas</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetData}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold border border-gray-300 transition-colors"
                    >
                      Redefinir Simulador
                    </button>
                  </div>
                </div>

                {/* Filtration Toolbar */}
                <div className="bg-white border border-gray-150 rounded-xl p-4 shadow-3xs grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-9"
                    />
                  </div>

                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 h-9"
                    >
                      <option value="all">Todas as Categoria</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 h-9"
                    >
                      <option value="all">Todos os tipos de Fluxo</option>
                      <option value="expense">Despesa Ordinária</option>
                      <option value="income">Receita (Entrada)</option>
                      <option value="investment">Investimento Recorrente</option>
                      <option value="debt">Dívida / Parcela</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end">
                    <span className="text-xxs font-mono text-gray-400">
                      Mostrando {filteredTransactions.length} de {transactions.length} registros
                    </span>
                  </div>
                </div>

                {/* Transaction list table complete */}
                <div className="bg-white border border-gray-150 rounded-xl shadow-xs overflow-hidden">
                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400 italic">
                      Nenhuma transação se encaixa nestes critérios de filtro.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50 border-b border-gray-150 font-mono text-gray-500">
                        <tr>
                          <th className="p-4">Data</th>
                          <th className="p-4">Descrição</th>
                          <th className="p-4">Categoria</th>
                          <th className="p-4">Fluxo</th>
                          <th className="p-4 text-right">Valor</th>
                          <th className="p-4 text-center">Recorrência</th>
                          <th className="p-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="p-4 font-mono text-gray-500">{t.date}</td>
                            <td className="p-4 font-semibold text-gray-800">{t.description}</td>
                            <td className="p-4">
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-xxs font-semibold">
                                {t.category}
                              </span>
                            </td>
                            <td className="p-4 font-semibold">
                              <span className={`px-2 py-0.5 rounded-full text-xxs ${t.type === 'income' ? 'bg-emerald-50 text-emerald-700' : t.type === 'investment' ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                                {t.type === 'income' ? 'Entrada' : t.type === 'investment' ? 'Investimento' : t.type === 'debt' ? 'Dívida' : 'Despesa'}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-mono font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                              {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center text-xxs font-mono text-gray-400">
                              {t.recurring ? `Sim (${t.recurrencyPeriod})` : 'Não'}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title="Excluir Transação"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* PANEL 3: AI ADVISORY OFFICE */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-sans text-gray-800">Centro de Assessoria Inteligente</h2>
                  <p className="text-xs text-gray-500">Módulo responsável por cruzar seus desvios orçamentários com recomendações baseadas no Gemini</p>
                </div>

                <AIAdvisor 
                  transactions={transactions} 
                  goals={goals} 
                  onRefreshMetrics={handleServerMetricsRefresh} 
                />
              </div>
            )}

            {/* PANEL 4: METAS */}
            {activeTab === 'goals' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-sans text-gray-800">Projetos de Vida & Cofrinho</h2>
                  <p className="text-xs text-gray-500">Trace metas concretas e realize aportes que integram automaticamente seu livro diário de transações</p>
                </div>

                <GoalsTracker 
                  goals={goals} 
                  onAddGoal={handleAddGoal} 
                  onContribute={handleContributeGoal} 
                  onRemoveGoal={handleRemoveGoal} 
                />
              </div>
            )}

            {/* PANEL 5: METODOLOGIAS */}
            {activeTab === 'education' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-sans text-gray-800">Metodologias e Finanças Educativas</h2>
                  <p className="text-xs text-gray-500">Artigos rápidos para potencializar seu score de saúde financeira</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Article 1 */}
                  <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <span className="text-xxs font-mono text-emerald-600 font-bold tracking-wide uppercase">Regra 50 - 30 - 20</span>
                    <h4 className="font-sans font-bold text-sm text-gray-800 leading-tight">Como dividir suas finanças sem sacrifícios insustentáveis</h4>
                    <p className="text-xxs text-gray-500 leading-relaxed font-sans">
                      A metodologia mais consagrada do mundo orçamentário dita que: 50% de sua renda deve cobrir gastos de sobrevivência pura (Aluguel, luz, condomínio, mercado essencial). 30% deve ser alocado em lazer e desejos pessoais (Restaurante caro, cinema, assinaturas). E os 20% restantes devem ser direcionados para o seu futuro, amortizando dívidas estruturadas ou acumulando investimentos geradores de dividendos.
                    </p>
                  </div>

                  {/* Article 2 */}
                  <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-10 h-10 flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-xxs font-mono text-emerald-600 font-bold tracking-wide uppercase">A Reserva de Emergência</span>
                    <h4 className="font-sans font-bold text-sm text-gray-800 leading-tight">Por que criar liquidez de 6 meses é seu primeiro dever</h4>
                    <p className="text-xxs text-gray-500 leading-relaxed font-sans">
                      Antes de adentrar em investimentos voláteis como fundos de ações ou ativos criptográficos, você deve blindar sua tranquilidade contra acidentes, perda inesperada de emprego ou quebra de aparelhos essenciais de trabalho. Calcule sua média de saída mensal e acumule em renda fixa conservadora com liquidez diária o valor aproximado para cobrir 3 a 6 meses destas despesas. Isso impede a captação de dívidas e empréstimos bancários abusivos.
                    </p>
                  </div>

                  {/* Article 3 */}
                  <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl w-10 h-10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-xxs font-mono text-emerald-600 font-bold tracking-wide uppercase">Custo de Oportunidade</span>
                    <h4 className="font-sans font-bold text-sm text-gray-800 leading-tight">Como juros compostos agem a seu favor</h4>
                    <p className="text-xxs text-gray-500 leading-relaxed font-sans">
                      Muitos subestimam pequenos cortes cotidianos. Eliminar uma assinatura não utilizada de R$35 por mês e poupar essa quantia em um título isento rendendo CDI composto durante 10 anos pode resultar em economias que superam R$ 6.000 ao final. Eduque-se para medir seus gastos em termos de "horas de esforço de trabalho requeridas" para arcar com o valor.
                    </p>
                  </div>
                </div>

                {/* Simulated Persona Bio Frame */}
                <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-gray-100 rounded-full border border-gray-200">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <h4 className="font-sans font-bold text-sm text-gray-800">Seu Perfil Financeiro Estimado</h4>
                    <p className="text-xxs text-gray-500 max-w-2xl leading-relaxed">
                      Lançamento da persona especialista de investimento integrada: Análises de carteira estruturadas, categorização de notas com IA, e monitoria continuada. Este é o seu espaço privado no IA Studio — todos os dados são armazenados localmente e processados de forma sigilosa na nuvem.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      <footer className="bg-gray-150 text-gray-500 text-xxs font-mono py-4 border-t border-gray-200 text-center shrink-0">
        <div>Gestor Financeiro Inteligente © 2026 — Workspace de Simulação Financeira Educativa</div>
      </footer>
    </div>
  );
}
