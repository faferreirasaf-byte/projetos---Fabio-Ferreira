import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to lazy-initialize Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      aiInstance = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiInstance;
}

// Predefined categories for fallback classification
const KEYWORD_MAP: { [key: string]: { category: string; type: 'income' | 'expense' | 'investment' | 'debt' } } = {
  'salario': { category: 'Outros', type: 'income' },
  'salário': { category: 'Outros', type: 'income' },
  'provento': { category: 'Outros', type: 'income' },
  'venda': { category: 'Outros', type: 'income' },
  'receita': { category: 'Outros', type: 'income' },
  'freelance': { category: 'Outros', type: 'income' },
  
  'mercado': { category: 'Alimentação', type: 'expense' },
  'restaurante': { category: 'Alimentação', type: 'expense' },
  'ifood': { category: 'Alimentação', type: 'expense' },
  'comida': { category: 'Alimentação', type: 'expense' },
  'supermercado': { category: 'Alimentação', type: 'expense' },
  'padaria': { category: 'Alimentação', type: 'expense' },
  'almoço': { category: 'Alimentação', type: 'expense' },
  'cafe': { category: 'Alimentação', type: 'expense' },

  'uber': { category: 'Transporte', type: 'expense' },
  'taxi': { category: 'Transporte', type: 'expense' },
  'táxi': { category: 'Transporte', type: 'expense' },
  'gasolina': { category: 'Transporte', type: 'expense' },
  'combustivel': { category: 'Transporte', type: 'expense' },
  'combustível': { category: 'Transporte', type: 'expense' },
  'metrô': { category: 'Transporte', type: 'expense' },
  'metro': { category: 'Transporte', type: 'expense' },
  'ônibus': { category: 'Transporte', type: 'expense' },
  'onibus': { category: 'Transporte', type: 'expense' },
  'pedagio': { category: 'Transporte', type: 'expense' },

  'aluguel': { category: 'Moradia', type: 'expense' },
  'condominio': { category: 'Moradia', type: 'expense' },
  'condomínio': { category: 'Moradia', type: 'expense' },
  'luz': { category: 'Moradia', type: 'expense' },
  'agua': { category: 'Moradia', type: 'expense' },
  'água': { category: 'Moradia', type: 'expense' },
  'energia': { category: 'Moradia', type: 'expense' },
  'internet': { category: 'Moradia', type: 'expense' },
  'reforma': { category: 'Moradia', type: 'expense' },

  'farmacia': { category: 'Saúde', type: 'expense' },
  'farmácia': { category: 'Saúde', type: 'expense' },
  'medico': { category: 'Saúde', type: 'expense' },
  'médico': { category: 'Saúde', type: 'expense' },
  'hospital': { category: 'Saúde', type: 'expense' },
  'plano de saude': { category: 'Saúde', type: 'expense' },
  'dentista': { category: 'Saúde', type: 'expense' },

  'escola': { category: 'Educação', type: 'expense' },
  'faculdade': { category: 'Educação', type: 'expense' },
  'curso': { category: 'Educação', type: 'expense' },
  'livro': { category: 'Educação', type: 'expense' },
  'mensalidade escolar': { category: 'Educação', type: 'expense' },

  'cinema': { category: 'Lazer', type: 'expense' },
  'show': { category: 'Lazer', type: 'expense' },
  'viagem': { category: 'Lazer', type: 'expense' },
  'futebol': { category: 'Lazer', type: 'expense' },
  'bar': { category: 'Lazer', type: 'expense' },
  'balada': { category: 'Lazer', type: 'expense' },
  'restaurante caro': { category: 'Lazer', type: 'expense' },
  
  'spotify': { category: 'Assinaturas', type: 'expense' },
  'netflix': { category: 'Assinaturas', type: 'expense' },
  'prime': { category: 'Assinaturas', type: 'expense' },
  'disney': { category: 'Assinaturas', type: 'expense' },
  'streaming': { category: 'Assinaturas', type: 'expense' },
  'cloud': { category: 'Assinaturas', type: 'expense' },
  'gympass': { category: 'Assinaturas', type: 'expense' },

  'acoes': { category: 'Investimentos', type: 'investment' },
  'ações': { category: 'Investimentos', type: 'investment' },
  'cdi': { category: 'Investimentos', type: 'investment' },
  'tesouro': { category: 'Investimentos', type: 'investment' },
  'poupanca': { category: 'Investimentos', type: 'investment' },
  'poupança': { category: 'Investimentos', type: 'investment' },
  'barsi': { category: 'Investimentos', type: 'investment' },
  'fundo': { category: 'Investimentos', type: 'investment' },
  'cripto': { category: 'Investimentos', type: 'investment' },

  'fatura': { category: 'Dívidas', type: 'debt' },
  'emprestimo': { category: 'Dívidas', type: 'debt' },
  'empréstimo': { category: 'Dívidas', type: 'debt' },
  'parcela': { category: 'Dívidas', type: 'debt' },
  'juros': { category: 'Dívidas', type: 'debt' },
};

// Auto-classify using Gemini or Fallback keyword map
app.post("/api/classify", async (req, res) => {
  const { description } = req.body;
  if (!description || typeof description !== "string") {
    return res.status(400).json({ error: "Descrição é obrigatória" });
  }

  const cleanDesc = description.toLowerCase().trim();

  // 1. Try Gemini first
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Classifique a seguinte transação financeira: "${description}".
      Determine a categoria mais apropriada entre estas:
      - Alimentação
      - Transporte
      - Moradia
      - Saúde
      - Educação
      - Lazer
      - Investimentos
      - Dívidas
      - Assinaturas
      - Outros

      Determine também o tipo da transação ('income' para receitas, 'expense' para despesas de consumo comum, 'investment' para investimentos, 'debt' para pagamentos de dívidas/empréstimos/faturas).
      
      Responda apenas com um JSON válido contendo exatamente as chaves:
      {
        "category": "nome_categoria",
        "type": "income|expense|investment|debt",
        "reason": "breve justificativa em português"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              type: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["category", "type"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text.trim());
        // Clean categories list to guarantee matching config
        const validCategories = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Investimentos', 'Dívidas', 'Assinaturas', 'Outros'];
        if (!validCategories.includes(result.category)) {
          result.category = 'Outros';
        }
        return res.json({
          category: result.category,
          type: result.type,
          isAiGenerated: true,
          reason: result.reason || "Classificado pela IA"
        });
      }
    } catch (e: any) {
      console.error("Gemini classification failed, using keyword fallback:", e.message);
    }
  }

  // 2. Rule base/Keyword Fallback
  let matchedCategory = 'Outros';
  let matchedType: 'income' | 'expense' | 'investment' | 'debt' = 'expense';

  for (const [key, val] of Object.entries(KEYWORD_MAP)) {
    if (cleanDesc.includes(key)) {
      matchedCategory = val.category;
      matchedType = val.type;
      break;
    }
  }

  // Extra check for obvious income keywords
  if (cleanDesc.includes("salário") || cleanDesc.includes("salario") || cleanDesc.includes("pix recebido") || cleanDesc.includes("recebi") || cleanDesc.includes("rendimento")) {
    matchedType = 'income';
  }

  return res.json({
    category: matchedCategory,
    type: matchedType,
    isAiGenerated: false,
    reason: "Classificação por regras inteligentes (sem chave de IA ativa ou em fallback)"
  });
});

// Generate custom insights using state of transactions
app.post("/api/insights", async (req, res) => {
  const { transactions, goals } = req.body;
  
  // Basic analytical metrics calculated directly to provide reliable data
  const txs: any[] = Array.isArray(transactions) ? transactions : [];
  const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInvestment = txs.filter(t => t.type === 'investment').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDebt = txs.filter(t => t.type === 'debt').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalOutflows = totalExpense + totalInvestment + totalDebt;
  const balance = totalIncome - totalOutflows;

  // Savings rate
  const savingsRate = totalIncome > 0 ? Math.round((totalInvestment / totalIncome) * 100) : 0;
  
  // Calculate basic Health score
  let score = 50; // Starting neutral
  if (totalIncome > 0) {
    const expenseRatio = totalExpense / totalIncome;
    const debtRatio = totalDebt / totalIncome;

    if (expenseRatio <= 0.5) score += 20;
    else if (expenseRatio > 0.8) score -= 20;

    if (debtRatio === 0) score += 15;
    else if (debtRatio > 0.3) score -= 15;

    if (savingsRate >= 20) score += 15;
    else if (savingsRate >= 10) score += 5;
  }
  score = Math.max(10, Math.min(100, score));

  let healthLabel: 'Crítico' | 'Moderado' | 'Ajustado' | 'Excelente' = 'Moderado';
  if (score >= 85) healthLabel = 'Excelente';
  else if (score >= 65) healthLabel = 'Ajustado';
  else if (score >= 40) healthLabel = 'Moderado';
  else healthLabel = 'Crítico';

  // 1. Try Gemini dynamic response
  const ai = getGeminiClient();
  if (ai && txs.length > 0) {
    try {
      const summaryData = {
        totalIncome,
        totalExpense,
        totalInvestment,
        totalDebt,
        balance,
        savingsRate,
        score,
        healthLabel,
        transactionsCount: txs.length
      };

      const prompt = `Aja como um Arquiteto e Consultor Financeiro de elite. Analise os seguintes dados do usuário:
      Resumo Financeiro: ${JSON.stringify(summaryData)}
      Transações Recentes: ${JSON.stringify(txs.slice(0, 20))}
      Metas Atuais: ${JSON.stringify(goals || [])}

      Forneça uma análise detalhada em Português do Brasil de forma estruturada. Retorne EXCLUSIVAMENTE um JSON com este formato:
      {
        "overviewString": "Um resumo amigável de 3-4 frases da saúde financeira do usuário no tom de um mentor amigável, destacando os números e o progresso.",
        "tips": [
          "Dica prática 1 baseada no balanço e transações em português",
          "Dica prática 2 focada em investimentos ou redução de despesas comuns",
          "Dica de educação financeira de acordo com o padrão de gastos"
        ],
        "suggestedSteps": [
          "Passo específico 1 (ex: criar reserva de emergência, reduzir assinaturas em 10%, etc.)",
          "Passo específico 2",
          "Passo específico 3"
        ],
        "insights": [
          {
            "type": "warning|success|info|danger",
            "title": "Título curto do alerta/insights",
            "description": "Explicação detalhada contendo valores relevantes",
            "category": "Alimentação|Transporte|Investimentos|Assinaturas|Geral"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overviewString: { type: Type.STRING },
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              suggestedSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    category: { type: Type.STRING }
                  },
                  required: ["type", "title", "description", "category"]
                }
              }
            },
            required: ["overviewString", "tips", "suggestedSteps", "insights"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text.trim());
        return res.json({
          ...result,
          metrics: {
            totalIncome,
            totalExpense,
            totalInvestment,
            totalDebt,
            balance,
            savingsRate,
            score,
            healthLabel
          },
          isAiGenerated: true
        });
      }
    } catch (e: any) {
      console.error("Gemini insights generation failed:", e.message);
    }
  }

  // 2. Sophisticated Rule-based Fallback Insights
  const tips = [
    "Monitore gastos fixos como Moradia que idealmente não devem passar de 50% da sua receita líquida.",
    "Tente separar pelo menos 10% de toda sua receita líquida no início do mês diretamente para investimentos antes de começar a gastar.",
    "Evite acumular múltiplas assinaturas recorrentes pequenas de streaming ou aplicativos que você raramente usa."
  ];

  const suggestedSteps = [
    "Defina um limite de gastos específico para Alimentação e Lazer nesta semana.",
    "Forme uma reserva de emergências que cubra pelo menos 3 a 6 meses de suas despesas fixas.",
    "Use a regra clássica 50-30-20 (50% Essenciais, 30% Desejos Pessoais, 20% Poupança/Investimentos) para reequilibrar seu saldo."
  ];

  const fallbackInsights = [];

  if (balance < 0) {
    fallbackInsights.push({
      type: "danger",
      title: "Despesas superaram Receitas",
      description: `Seu saldo este mês está negativo em R$ ${Math.abs(balance).toLocaleString('pt-BR')}. Evite financiamentos caros ou cheque especial.`,
      category: "Geral"
    });
  } else if (balance > 0 && totalIncome > 0) {
    const margin = Math.round((balance / totalIncome) * 100);
    fallbackInsights.push({
      type: "success",
      title: "Saldo Mensal Positivo",
      description: `Você economizou R$ ${balance.toLocaleString('pt-BR')} (${margin}% da sua renda líquida). Excelente! Considere enviar mais fundos para investimentos.`,
      category: "Investimentos"
    });
  }

  // Detect and analyze subscription spendings
  const subTotal = txs.filter(t => t.category === 'Assinaturas').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  if (subTotal > 150) {
    fallbackInsights.push({
      type: "warning",
      title: "Cuidado com Assinaturas",
      description: `Você está gastando R$ ${subTotal.toLocaleString('pt-BR')} em serviços recorrentes. Revise seus streamings ativos.`,
      category: "Assinaturas"
    });
  }

  // High Food spending check
  const foodTotal = txs.filter(t => t.category === 'Alimentação').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  if (totalIncome > 0 && (foodTotal / totalIncome) > 0.25) {
    fallbackInsights.push({
      type: "warning",
      title: "Gasto elevado com Alimentação",
      description: `Seus custos com mercado e alimentação representam ${Math.round((foodTotal / totalIncome) * 100)}% da sua receita. Tente diminuir pedidos de delivery.`,
      category: "Alimentação"
    });
  }

  // Emergency savings suggestions
  if (totalInvestment === 0) {
    fallbackInsights.push({
      type: "info",
      title: "Comece a Investir",
      description: "Você ainda não registrou nenhum investimento este mês. Comece guardando pequenas quantias em renda fixa.",
      category: "Investimentos"
    });
  }

  const overviewString = totalIncome > 0 
    ? `Análise Financeira: Sua saúde financeira é considerada '${healthLabel}' com pontuação de ${score}/100. Você gerou R$ ${totalIncome.toLocaleString('pt-BR')} em receitas, despendeu R$ ${totalExpense.toLocaleString('pt-BR')} em consumo e reservou R$ ${totalInvestment.toLocaleString('pt-BR')} em investimentos. Seu balanço livre é R$ ${balance.toLocaleString('pt-BR')}.`
    : "Sua folha financeira está limpa. Adicione transações para receber uma assessoria personalizada com inteligência artificial, detectando desvios e analisando sua taxa de poupança.";

  return res.json({
    overviewString,
    tips,
    suggestedSteps,
    insights: fallbackInsights,
    metrics: {
      totalIncome,
      totalExpense,
      totalInvestment,
      totalDebt,
      balance,
      savingsRate,
      score,
      healthLabel
    },
    isAiGenerated: false
  });
});

// Vite middleware development setup and static setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
