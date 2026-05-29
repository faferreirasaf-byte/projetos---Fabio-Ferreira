import React, { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, AlertCircle, FileSpreadsheet, Keyboard, Mic, MicOff } from 'lucide-react';
import { Transaction, TransactionType, CATEGORIES } from '../types';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onImportBulk: (text: string) => void;
}

export default function TransactionForm({ onAddTransaction, onImportBulk }: TransactionFormProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>('Outros');
  const [recurring, setRecurring] = useState(false);
  const [recurrencyPeriod, setRecurrencyPeriod] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  
  const [nlpInput, setNlpInput] = useState('');
  const [nlpError, setNlpError] = useState('');

  const [predicting, setPredicting] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const [isListeningManual, setIsListeningManual] = useState(false);
  const [isListeningNlp, setIsListeningNlp] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Stop recording on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListeningManual = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setAiNote("Este navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListeningManual) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningManual(false);
      return;
    }

    // Ensure we are not listening to NLP
    if (isListeningNlp && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningNlp(false);
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let silenceTimeout: any = null;

      const resetSilenceTimeout = () => {
        if (silenceTimeout) clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          if (recognitionRef.current === recognition) {
            recognition.stop();
          }
        }, 2200); // Natural silence pause to auto-stop mic (2.2s)
      };

      recognition.onstart = () => {
        setIsListeningManual(true);
        setAiNote("🎙️ Ouvindo a descrição... Fale agora!");
        resetSilenceTimeout();
      };

      recognition.onerror = (event: any) => {
        console.error(event);
        if (event.error !== 'no-speech') {
          setAiNote(`Erro de voz: ${event.error}`);
        }
        setIsListeningManual(false);
        if (silenceTimeout) clearTimeout(silenceTimeout);
      };

      recognition.onend = () => {
        setIsListeningManual(false);
        if (silenceTimeout) clearTimeout(silenceTimeout);
        
        // Auto-classify using Gemini API proxy when voice capture ends
        const txt = finalTranscript.trim();
        if (txt.length > 2) {
          setPredicting(true);
          setAiNote("🤖 Classificando descrição coletada por voz...");
          fetch('/api/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: txt })
          })
          .then(res => res.json())
          .then(data => {
            setCategory(data.category || 'Outros');
            setType(data.type || 'expense');
            setAiNote(`✨ IA previu: ${data.category} (${data.reason})`);
          })
          .catch(err => {
            console.error(err);
            setAiNote(`🎙️ Capturado por voz: "${txt}"`);
          })
          .finally(() => {
            setPredicting(false);
          });
        }
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimeout();
        let builtFinal = '';
        let builtInterim = '';
        for (let i = 0; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            builtFinal += (builtFinal ? ' ' : '') + trans;
          } else {
            builtInterim += (builtInterim ? ' ' : '') + trans;
          }
        }
        
        const visibleText = (builtFinal + (builtInterim ? ' ' + builtInterim : '')).trim();
        finalTranscript = builtFinal;
        if (visibleText) {
          setDescription(visibleText);
          setAiNote(`🎙️ Transcrevendo: "${visibleText}"`);
        }
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setAiNote("Não foi possível iniciar o microfone.");
      setIsListeningManual(false);
    }
  };

  const toggleListeningNlp = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setNlpError("Este navegador não suporta reconhecimento de voz.");
      return;
    }

    if (isListeningNlp) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningNlp(false);
      return;
    }

    // Ensure we are not listening to Manual
    if (isListeningManual && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningManual(false);
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let silenceTimeout: any = null;

      const resetSilenceTimeout = () => {
        if (silenceTimeout) clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          if (recognitionRef.current === recognition) {
            recognition.stop();
          }
        }, 2200); // Natural silence pause (2.2s)
      };

      recognition.onstart = () => {
        setIsListeningNlp(true);
        setNlpError('');
        setAiNote("🎙️ Ouvindo... fale o lançamento (ex: 'Almoço trinta reais' ou 'Recebi quinhentos reais de bônus')");
        resetSilenceTimeout();
      };

      recognition.onerror = (event: any) => {
        console.error(event);
        if (event.error !== 'no-speech') {
          setNlpError(`Erro de voz: ${event.error}`);
        }
        setIsListeningNlp(false);
        if (silenceTimeout) clearTimeout(silenceTimeout);
      };

      recognition.onend = () => {
        setIsListeningNlp(false);
        if (silenceTimeout) clearTimeout(silenceTimeout);
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimeout();
        let builtFinal = '';
        let builtInterim = '';
        for (let i = 0; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            builtFinal += (builtFinal ? ' ' : '') + trans;
          } else {
            builtInterim += (builtInterim ? ' ' : '') + trans;
          }
        }
        
        const visibleText = (builtFinal + (builtInterim ? ' ' + builtInterim : '')).trim();
        finalTranscript = builtFinal;
        if (visibleText) {
          setNlpInput(visibleText);
          setAiNote(`🎙️ Capturado: "${visibleText}". Clique em "Inserir" para adicionar.`);
        }
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setNlpError("Não foi possível iniciar o microfone.");
      setIsListeningNlp(false);
    }
  };

  // Auto classify via server-side proxy
  const handleAutoClassify = async () => {
    if (!description.trim()) {
      setAiNote("Insira uma descrição primeiro.");
      return;
    }
    setPredicting(true);
    setAiNote("");
    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      if (response.ok) {
        const data = await response.json();
        setCategory(data.category);
        setType(data.type);
        setAiNote(data.isAiGenerated 
          ? `✨ IA previu: ${data.category} (${data.reason})` 
          : `🔍 Correspondência por Regra: ${data.category}`
        );
      } else {
        setAiNote("Erro na classificação pela IA.");
      }
    } catch (err) {
      console.error(err);
      setAiNote("Falha ao comunicar com o servidor.");
    } finally {
      setPredicting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) return;

    onAddTransaction({
      description,
      amount: parseFloat(amount),
      type,
      category,
      recurring,
      recurrencyPeriod,
      date: new Date().toISOString().split('T')[0] // today
    });

    // Reset Form
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('Outros');
    setRecurring(false);
    setRecurrencyPeriod('none');
    setAiNote('');
  };

  const handleNlpParse = () => {
    setNlpError('');
    if (!nlpInput.trim()) return;

    // A simple clever regex parser to extract amounts and keywords
    // Matches e.g. "comida R$ 45", "salario 5000", "Spotify 15.90", "R$120 de luz"
    const amountRegex = /(?:R\$?\s*)?(\d+(?:[.,]\d{1,2})?)/i;
    const match = nlpInput.match(amountRegex);

    if (!match) {
      setNlpError("Não foi possível identificar o valor numérico. Exemplo: 'Mercado R$ 150'");
      return;
    }

    const valueStr = match[1].replace(',', '.');
    const parsedAmount = parseFloat(valueStr);
    
    // Remove the Parsed amount to get the clean description
    let parsedDesc = nlpInput.replace(match[0], '').replace(/R\$/g, '').trim();
    if (!parsedDesc) {
      parsedDesc = 'Compra manual rápida';
    }

    // Try to autoclassify this new parsed description immediately
    setPredicting(true);
    fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: parsedDesc })
    })
    .then(res => res.json())
    .then(data => {
      onAddTransaction({
        description: parsedDesc,
        amount: parsedAmount,
        type: data.type || 'expense',
        category: data.category || 'Outros',
        recurring: false,
        recurrencyPeriod: 'none',
        date: new Date().toISOString().split('T')[0]
      });
      setNlpInput('');
      setAiNote(`✅ Adicionado com sucesso: "${parsedDesc}" como R$ ${parsedAmount}`);
    })
    .catch(err => {
      console.error(err);
      // Fallback direct insert
      onAddTransaction({
        description: parsedDesc,
        amount: parsedAmount,
        type: 'expense',
        category: 'Outros',
        recurring: false,
        recurrencyPeriod: 'none',
        date: new Date().toISOString().split('T')[0]
      });
      setNlpInput('');
    })
    .finally(() => {
      setPredicting(false);
    });
  };

  return (
    <div className="space-y-6" id="tx-form-container" style={{ contentVisibility: 'auto' }}>
      {/* Manual Entry */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Plus className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-bold text-slate-800 text-base tracking-tight">Novo Lançamento</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isListeningManual ? "...Ouvindo descrição por voz..." : "Ex. Supermercado Extra, Uber Trip..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description.trim().length > 3 && (!category || category === 'Outros')) {
                    handleAutoClassify();
                  }
                }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 max-h-11 transition-all"
                required
              />
              <button
                type="button"
                onClick={toggleListeningManual}
                title={isListeningManual ? "Parar reconhecimento" : "Falar Descrição (Microfone)"}
                className={`px-3 flex items-center justify-center transition-all border rounded-xl shrink-0 ${isListeningManual ? 'bg-rose-650 border-rose-500 text-white animate-pulse' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'}`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleAutoClassify}
                disabled={predicting || !description.trim()}
                title="Classificar com Inteligência Artificial"
                className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl flex items-center gap-1 transition-colors border border-indigo-200"
              >
                <Sparkles className={`w-4 h-4 ${predicting ? 'animate-spin' : ''}`} />
                <span className="text-xs font-bold hidden md:inline">IA</span>
              </button>
            </div>
            {aiNote && (
              <span className="text-xxs text-indigo-600 mt-1.5 block font-mono font-medium">{aiNote}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Fluxo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="expense">Despesa (Gasto)</option>
                <option value="income">Receita (Entrada)</option>
                <option value="investment">Investimento</option>
                <option value="debt">Dívida / Parcela</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={(e) => {
                    setRecurring(e.target.checked);
                    if (!e.target.checked) setRecurrencyPeriod('none');
                    else setRecurrencyPeriod('monthly');
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="recurring" className="text-xs font-semibold text-slate-600 cursor-pointer">Lançamento Recorrente</label>
              </div>
            </div>
          </div>

          {recurring && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Período de Recorrência</label>
              <select
                value={recurrencyPeriod}
                onChange={(e) => setRecurrencyPeriod(e.target.value as any)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="none">Nenhum</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl py-3 transition-colors shadow-sm shadow-indigo-100"
          >
            Adicionar Lançamento
          </button>
        </form>
      </div>

      {/* Intelligent NLP Text Input Section - Styled like high-quality Dark Bento Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-3 -translate-y-3">
          <Keyboard className="w-32 h-32 text-slate-100" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1 px-2.5 bg-indigo-900 text-indigo-200 rounded-lg text-xxs font-mono uppercase tracking-wider font-semibold">
            IA Rápido
          </div>
          <h4 className="font-sans font-bold text-sm text-white">Lançamento Inteligente</h4>
        </div>
        <p className="text-xxs text-slate-300 mb-4 font-sans leading-relaxed">
          Digite um lançamento livre. Nossa IA inferirá o valor, tipo e categoria automaticamente (Ex: <span className="underline italic text-indigo-300">"paguei R$245 de supermercado hoje"</span>).
        </p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={isListeningNlp ? "...Ouvindo fala (ex: 'uber trinta reais')..." : "Digite aqui e pressione Enter ou fale no microfone..."}
              value={nlpInput}
              onChange={(e) => setNlpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNlpParse();
                }
              }}
              className="w-full text-xs text-white placeholder-slate-500 bg-slate-950 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded-xl px-3 py-2.5"
            />
            <button
              type="button"
              onClick={toggleListeningNlp}
              title={isListeningNlp ? "Parar Gravação" : "Falar Entrada (Microfone)"}
              className={`px-3.5 flex items-center justify-center transition-all border rounded-xl shrink-0 ${isListeningNlp ? 'bg-rose-600 border-rose-500 text-white animate-pulse' : 'bg-slate-800 border-slate-750 text-slate-300 hover:text-white hover:bg-slate-750'}`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNlpParse}
              className="px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center shrink-0"
            >
              Inserir
            </button>
          </div>
          {nlpError && (
            <div className="text-xxs text-rose-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>{nlpError}</span>
            </div>
          )}
        </div>
      </div>

      {/* CSV / Import / Export area */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-slate-700 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          <h4 className="font-sans font-bold text-slate-800 text-sm">Importação Avançada</h4>
        </div>
        <p className="text-xxs text-slate-500 mb-4 leading-relaxed">
          Cole linhas de lançamentos para processamento em lote. Cada linha deve conter uma descrição e o valor correspondente.
        </p>
        <textarea
          placeholder="Exemplo:&#10;Supermercado Extra R$ 245.50&#10;Uber Trip R$ 42.90&#10;Netflix R$ 55.90"
          rows={3}
          id="bulk-import-area"
          className="w-full text-xs text-slate-700 placeholder-slate-400 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 font-mono"
        />
        <button
          onClick={() => {
            const el = document.getElementById('bulk-import-area') as HTMLTextAreaElement;
            if (el && el.value.trim()) {
              onImportBulk(el.value);
              el.value = '';
              setAiNote("📋 Dados importados com sucesso!");
            }
          }}
          className="mt-3 w-full text-center bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl py-2.5 transition-colors border border-slate-200 shadow-xs"
        >
          Importar Dados do Campo
        </button>
      </div>
    </div>
  );
}
