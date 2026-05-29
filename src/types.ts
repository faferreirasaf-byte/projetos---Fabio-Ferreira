export type TransactionType = 'income' | 'expense' | 'investment' | 'debt';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  recurring: boolean;
  recurrencyPeriod?: 'none' | 'weekly' | 'monthly' | 'yearly';
}

export interface MetricSummary {
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  totalDebt: number;
  balance: number;
  savingsRate: number; // Percentage
  healthScore: number; // 0-100
  healthLabel: 'Ajustado' | 'Moderado' | 'Crítico' | 'Excelente';
}

export interface FinancialInsight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'danger';
  title: string;
  description: string;
  category: string; // e.g. "Alimentação", "Assinaturas", "Geral"
}

export interface AIRecommendation {
  overviewString: string;
  tips: string[];
  suggestedSteps: string[];
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
}

export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Investimentos',
  'Dívidas',
  'Assinaturas',
  'Outros'
] as const;

export type CategoryType = typeof CATEGORIES[number];
