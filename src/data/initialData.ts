import { Transaction, FinancialGoal } from '../types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    description: 'Salário Clt Mensal',
    amount: 5000,
    type: 'income',
    category: 'Outros',
    date: '2026-05-05',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-2',
    description: 'Rendimento de FIIs',
    amount: 150,
    type: 'income',
    category: 'Investimentos',
    date: '2026-05-15',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-3',
    description: 'Bico Freelance Programação',
    amount: 850,
    type: 'income',
    category: 'Outros',
    date: '2026-05-20',
    recurring: false,
    recurrencyPeriod: 'none'
  },
  {
    id: 'tx-4',
    description: 'Aluguel do Apartamento',
    amount: 1500,
    type: 'expense',
    category: 'Moradia',
    date: '2026-05-10',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-5',
    description: 'Supermercado Zona Sul',
    amount: 900,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-05-12',
    recurring: false,
    recurrencyPeriod: 'none'
  },
  {
    id: 'tx-6',
    description: 'Uber e Metrô semanal',
    amount: 450,
    type: 'expense',
    category: 'Transporte',
    date: '2026-05-18',
    recurring: false,
    recurrencyPeriod: 'none'
  },
  {
    id: 'tx-7',
    description: 'Netflix e Spotify Premium',
    amount: 120,
    type: 'expense',
    category: 'Assinaturas',
    date: '2026-05-08',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-8',
    description: 'Investimento em Renda Fixa Selic',
    amount: 300,
    type: 'investment',
    category: 'Investimentos',
    date: '2026-05-06',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-9',
    description: 'Parcela de Empréstimo Estudantil',
    amount: 250,
    type: 'debt',
    category: 'Dívidas',
    date: '2026-05-10',
    recurring: true,
    recurrencyPeriod: 'monthly'
  },
  {
    id: 'tx-10',
    description: 'Jantar Restaurante Japonês',
    amount: 180,
    type: 'expense',
    category: 'Lazer',
    date: '2026-05-22',
    recurring: false,
    recurrencyPeriod: 'none'
  }
];

export const INITIAL_GOALS: FinancialGoal[] = [
  {
    id: 'goal-1',
    name: 'Reserva de Emergência',
    targetAmount: 10000,
    currentAmount: 4200,
    deadline: '2026-12-31',
    category: 'Investimentos'
  },
  {
    id: 'goal-2',
    name: 'Viagem de Férias',
    targetAmount: 5000,
    currentAmount: 1500,
    deadline: '2026-10-15',
    category: 'Lazer'
  },
  {
    id: 'goal-3',
    name: 'Quitar Empréstimo Estudantil',
    targetAmount: 3000,
    currentAmount: 1200,
    deadline: '2026-08-30',
    category: 'Dívidas'
  }
];
