import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  UploadCloud, 
  DownloadCloud, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Key, 
  FileText, 
  Eye, 
  Sparkles,
  Search,
  Check,
  Calendar,
  Layers,
  Archive,
  HelpCircle
} from 'lucide-react';
import { Transaction, FinancialGoal } from '../types';

interface GoogleDriveSyncProps {
  transactions: Transaction[];
  goals: FinancialGoal[];
  onImportData: (importData: { transactions?: Transaction[]; goals?: FinancialGoal[] }, mergeMode: 'merge' | 'replace') => void;
}

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
  size: string;
  mimeType: string;
}

export default function GoogleDriveSync({ transactions, goals, onImportData }: GoogleDriveSyncProps) {
  const [accessToken, setAccessToken] = useState<string>(() => {
    return sessionStorage.getItem('gdrive_access_token') || '';
  });
  
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem('gdrive_client_id') || '282041780959-dummy.apps.googleusercontent.com'; // Soft-save dummy or custom client id
  });

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionError, setConnectionError] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  
  // File listings
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [searchingFiles, setSearchingFiles] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [importMergeMode, setImportMergeMode] = useState<'merge' | 'replace'>('merge');

  // Operations activity state
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Manual token input visibility
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');

  // Auto connect if access token is already cached in memory or session storage
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const tokenFromUrl = hashParams.get('access_token');
    
    if (tokenFromUrl) {
      // Clear hash in URL to protect the token
      window.location.hash = '';
      setAccessToken(tokenFromUrl);
      sessionStorage.setItem('gdrive_access_token', tokenFromUrl);
      testConnection(tokenFromUrl);
    } else if (accessToken) {
      testConnection(accessToken);
    }
  }, []);

  const testConnection = async (token: string) => {
    setConnectionStatus('connecting');
    setConnectionError('');
    try {
      const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        throw new Error('Token expirado ou inválido.');
      }

      const data = await resp.json();
      setUserProfile({
        name: data.name,
        email: data.email,
        picture: data.picture
      });
      setConnectionStatus('connected');
      sessionStorage.setItem('gdrive_access_token', token);
      
      // Auto list previous backups
      listBackupsOnDrive(token);
    } catch (err: any) {
      console.error(err);
      setConnectionStatus('error');
      setConnectionError(err.message || 'Erro ao conectar à conta Google.');
      sessionStorage.removeItem('gdrive_access_token');
    }
  };

  const listBackupsOnDrive = async (token = accessToken) => {
    if (!token) return;
    setSearchingFiles(true);
    try {
      // List json/csv backup files with 'gestor_financeiro' or reports
      const query = "name contains 'gestor_financeiro' and trashed = false";
      const fields = "files(id, name, createdTime, size, mimeType)";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime desc`;
      
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        throw new Error('Falha ao listar arquivos no Google Drive.');
      }

      const data = await resp.json();
      setBackupFiles(data.files || []);
      if (data.files && data.files.length > 0) {
        setSelectedFileId(data.files[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSearchingFiles(false);
    }
  };

  const handleManualTokenConnect = () => {
    if (!manualToken.trim()) return;
    setAccessToken(manualToken.trim());
    testConnection(manualToken.trim());
    setManualToken('');
    setShowTokenInput(false);
  };

  const handleOAuthLoginRedirect = () => {
    // Save client id 
    localStorage.setItem('gdrive_client_id', clientId);
    
    // Explicit browser redirect to Google Implicit Grant login
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive');
    const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}&prompt=select_account`;
    
    // Trigger redirect 
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    setAccessToken('');
    setUserProfile(null);
    setBackupFiles([]);
    setConnectionStatus('disconnected');
    sessionStorage.removeItem('gdrive_access_token');
    setStatusMessage({
      text: 'Desconectado do Google Drive com sucesso.',
      type: 'info'
    });
  };

  // Google Drive multipart file uploader implementation
  const uploadToGDrive = async (
    filename: string, 
    contentType: string, 
    content: string, 
    existingFileId?: string
  ) => {
    if (!accessToken) throw new Error('Não autenticado.');

    setActionLoading(true);
    setStatusMessage(null);

    try {
      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';
      let headers: HeadersInit = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'multipart/related; boundary=finance_sync_boundary'
      };

      let body = '';
      
      if (existingFileId) {
        // Direct media replacement for specific existing file (smaller footprint)
        url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
        method = 'PATCH';
        headers = {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': contentType
        };
        body = content;
      } else {
        // New multipart creation containing meta + media
        const metadata = {
          name: filename,
          mimeType: contentType
        };

        body = [
          '--finance_sync_boundary',
          'Content-Type: application/json; charset=UTF-8',
          '',
          JSON.stringify(metadata),
          '',
          '--finance_sync_boundary',
          `Content-Type: ${contentType}`,
          '',
          content,
          '',
          '--finance_sync_boundary--'
        ].join('\r\n');
      }

      const resp = await fetch(url, {
        method,
        headers,
        body
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Erro API Google: ${resp.status} - ${errText}`);
      }

      setStatusMessage({
        text: `Exportação concluída com sucesso! Arquivo "${filename}" salvo no Google Drive.`,
        type: 'success'
      });
      
      // Refresh list
      listBackupsOnDrive();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Falha ao salvar no Google Drive: ${err.message}`,
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportJSON = async () => {
    // 1. Mandatory confirmation dialogue 
    const confirmMessage = `Tem certeza que deseja salvar o backup atual no Google Drive? 
Esta ação criará um arquivo .json com suas ${transactions.length} transações e ${goals.length} metas financeiras atuais.`;
    
    if (!window.confirm(confirmMessage)) return;

    const exportObject = {
      app: 'Gestor Financeiro Inteligente',
      exportedAt: new Date().toISOString(),
      transactions,
      goals
    };

    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').substring(0, 16);
    const filename = `gestor_financeiro_backup_${dateStr}.json`;
    const contentStr = JSON.stringify(exportObject, null, 2);
    
    await uploadToGDrive(filename, 'application/json', contentStr);
  };

  const handleExportCSV = async () => {
    // 1. Confirmation gate
    if (!window.confirm('Deseja realmente gerar e sincronizar um relatório CSV com todas as suas transações atuais para o Google Drive?')) return;

    // Build the CSV sheet string manual parser
    const headers = ['Data', 'Descricao', 'Valor (R$)', 'Fluxo', 'Categoria', 'Recorrente'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      `"${t.category}"`,
      t.recurring ? 'Sim' : 'Nao'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const dateStr = new Date().toISOString().substring(0, 10);
    const filename = `gestor_financeiro_excel_relatorio_${dateStr}.csv`;
    
    await uploadToGDrive(filename, 'text/csv', csvContent);
  };

  const handleImportSelected = async () => {
    if (!selectedFileId) {
      alert('Selecione um arquivo de backup para carregar.');
      return;
    }

    const matchedFile = backupFiles.find(f => f.id === selectedFileId);
    if (!matchedFile) return;

    // 1. Mandatory detailed confirmation dialog 
    const confirmText = `Deseja de fato fazer a importação do arquivo "${matchedFile.name}" do Google Drive?
- Modo selecionado: ${importMergeMode === 'replace' ? 'Substituir Totalmente (Exclui dados atuais)' : 'Mesclar Sem Duplicar (Mais Seguro)'}

Esta ação pode alterar o histórico de transações registradas no seu navegador.`;

    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setStatusMessage(null);
    try {
      const url = `https://www.googleapis.com/drive/v3/files/${selectedFileId}?alt=media`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!resp.ok) {
        throw new Error('Falha no download do conteúdo do arquivo.');
      }

      const importedData = await resp.json();
      
      if (!importedData.transactions && !importedData.goals) {
        throw new Error('O formato do arquivo de backup não é compatível com os esquemas da aplicação.');
      }

      onImportData({
        transactions: importedData.transactions || [],
        goals: importedData.goals || []
      }, importMergeMode);

      setStatusMessage({
        text: `Dados importados com sucesso! Recuperadas ${importedData.transactions?.length || 0} transações e ${importedData.goals?.length || 0} metas do Drive.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: `Erro na importação: ${err.message || 'Dados inválidos ou arquivo corrompido.'}`,
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const bytesToSize = (bytes: string) => {
    const num = parseInt(bytes);
    if (isNaN(num)) return 'N/A';
    if (num < 1024) return num + ' B';
    if (num < 1048576) return (num / 1024).toFixed(1) + ' KB';
    return (num / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="gdrive-sync-wrapper">
      
      {/* Left panel: Authenticator and account status */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 lg:col-span-1">
        
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Cloud className="w-5 h-5 animate-pulse text-indigo-500" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-800 text-base tracking-tightHeader">Conta Google</h3>
            <p className="text-[10px] text-slate-500 font-sans leading-tight">Mecanismo seguro de armazenamento na sua conta pessoal</p>
          </div>
        </div>

        {connectionStatus === 'connected' && userProfile ? (
          /* Profile active block */
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-2 right-2 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado
            </div>
            
            {userProfile.picture ? (
              <img 
                src={userProfile.picture} 
                alt="Profile photo" 
                className="w-16 h-16 rounded-full border-2 border-indigo-400 object-cover shadow-sm bg-indigo-50"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xl uppercase shadow-sm">
                {userProfile.name?.[0] || 'U'}
              </div>
            )}

            <div>
              <h4 className="font-sans font-extrabold text-sm text-slate-800">{userProfile.name || 'Usuário do Google'}</h4>
              <p className="text-xxs font-mono text-slate-500">{userProfile.email}</p>
            </div>

            <div className="w-full pt-2 flex flex-col gap-2">
              <button
                onClick={() => listBackupsOnDrive()}
                disabled={searchingFiles}
                className="w-full text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-100/50 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${searchingFiles ? 'animate-spin text-indigo-500' : ''}`} />
                Atualizar Arquivos
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full text-xs font-bold bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 py-2 rounded-xl transition-all cursor-pointer"
              >
                Desconectar Conta
              </button>
            </div>
          </div>
        ) : (
          /* Locked block: sign-in methods */
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-yellow-50/50 border border-yellow-100 text-yellow-800 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-600 mt-0.5" />
              <p className="text-xxs font-sans leading-relaxed text-yellow-800">
                Seus lançamentos atualmente estão salvos <strong>apenas localmente</strong> no navegador. Conecte ao Google Drive para garantir backups protegidos na nuvem ou transferir entre computadores.
              </p>
            </div>

            {/* Google Sign-in config options (Client ID customized) */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-extrabold font-sans text-slate-500 mb-1 uppercase tracking-wide">Google Client ID (Configuração)</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Seu Client ID do Google Cloud Console"
                  className="w-full text-xxs font-mono border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              {/* GSI Material Button styling */}
              <button 
                onClick={handleOAuthLoginRedirect}
                disabled={connectionStatus === 'connecting'}
                className="w-full border border-slate-200 hover:bg-slate-50 hover:shadow-xs rounded-xl py-2.5 font-bold text-xs font-sans flex items-center justify-center gap-2 text-slate-700 bg-white transition-all cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                {connectionStatus === 'connecting' ? 'Conectando...' : 'Fazer login com Google'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="text-[10px] text-slate-500 hover:text-indigo-600 hover:underline font-semibold leading-relaxed"
                >
                  Ambiente Sandbox? Use uma chave temporária (Access Token)
                </button>
              </div>

              {showTokenInput && (
                <div className="p-3 border border-slate-100 bg-slate-50 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 font-sans flex items-center gap-1"><Key className="w-3 h-3 text-indigo-500" /> Insira Google Token:</span>
                  <input
                    type="password"
                    placeholder="ya29.a0Acv..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="w-full text-xxs font-mono border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleManualTokenConnect}
                      className="flex-1 bg-indigo-600 text-white font-bold text-xxs py-1.5 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Autenticar Token
                    </button>
                    <a 
                      href="https://developers.google.com/oauthplayground/"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-2 border border-slate-200 bg-white flex items-center text-slate-500 hover:text-indigo-600 rounded-lg text-xxs font-semibold"
                      title="Obter token temporário no Google Playgound"
                    >
                      Playground
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {connectionStatus === 'error' && connectionError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xxs rounded-xl leading-relaxed font-sans">
            <strong>Falha de Conexão:</strong> {connectionError}
          </div>
        )}
      </div>

      {/* Center panel: Cloud backups manager and file exporter */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 lg:col-span-2 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-sans font-bold text-sm text-slate-800 tracking-tightHeader">Controle de Sincronia e Nuvem</h4>
              <p className="text-xxs text-slate-500">Módulos de gravação, exportação de planilhas e leitura de backups no Google Drive</p>
            </div>
            {connectionStatus === 'connected' && (
              <span className="p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-[10px] font-extrabold uppercase font-mono animate-pulse">
                Pronto
              </span>
            )}
          </div>

          {/* Status logs messages */}
          {statusMessage && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : statusMessage.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-slate-50 border-slate-150 text-slate-800'}`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div className="text-xxs font-semibold font-sans leading-normal">{statusMessage.text}</div>
            </div>
          )}

          {connectionStatus !== 'connected' ? (
            /* Placeholder message when not connected */
            <div className="py-12 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <UploadCloud className="w-10 h-10 text-slate-300" />
              <div className="space-y-1">
                <h5 className="font-sans font-bold text-xs text-slate-700">Conexão Necessária</h5>
                <p className="text-xxs text-slate-400 font-sans max-w-sm">
                  Faça login com sua Conta Google no menu lateral para visualizar e recuperar backups salvos no seu Drive ou exportar relatórios.
                </p>
              </div>
            </div>
          ) : (
            /* Active panels */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Backups Panel (EXPORTING TO DRIVE) */}
              <div className="p-4.5 border border-slate-100 bg-slate-50/40 rounded-2xl space-y-3.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-indigo-50 font-extrabold text-indigo-700 tracking-wide uppercase">Exportação</span>
                  <h5 className="text-xs font-bold font-sans text-slate-800">Criar Novo Backup na Nuvem</h5>
                  <p className="text-xxs text-slate-500 leading-relaxed font-sans">
                    Transforma todos os dados locais (atualmente {transactions.length} lançamentos e {goals.length} metas de vida) em um arquivo criptografado portátil salvo em seu Google Drive pessoal.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={handleExportJSON}
                    disabled={actionLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    Salvar Backup Financeiro (.json)
                  </button>

                  <button
                    onClick={handleExportCSV}
                    disabled={actionLoading}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 text-emerald-600" />
                    )}
                    Gerar Boletim Orçamentário (.csv)
                  </button>
                </div>
              </div>

              {/* Backups Import Panel (IMPORTING TO APP) */}
              <div className="p-4.5 border border-slate-100 bg-slate-50/40 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-sky-50 font-extrabold text-sky-700 tracking-wide uppercase">Importação</span>
                  <h5 className="text-xs font-bold font-sans text-slate-800">Recuperar do Google Drive</h5>
                  <p className="text-xxs text-slate-500 leading-relaxed font-sans">
                    Varre seu Drive buscando arquivos de sincronia anteriores para realimentar o seu painel central.
                  </p>
                </div>

                <div className="space-y-2">
                  {/* File dropdown selector */}
                  {searchingFiles ? (
                    <div className="py-2.5 text-center text-xxs font-mono text-slate-400 italic flex items-center justify-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" /> Procurando arquivos de backup...
                    </div>
                  ) : backupFiles.length === 0 ? (
                    <div className="text-center font-sans tracking-wide border border-dashed border-slate-200 py-3 rounded-xl text-[10px] text-slate-400 font-medium">
                      Nenhum backup encontrado no Drive.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase font-mono tracking-widest mb-1">Selecionar arquivo</label>
                        <select
                          value={selectedFileId}
                          onChange={(e) => setSelectedFileId(e.target.value)}
                          className="w-full text-xxs border border-slate-250 bg-white rounded-xl py-2 px-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {backupFiles.map(file => (
                            <option key={file.id} value={file.id}>
                              {file.name} ({bytesToSize(file.size)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Import action setting modes */}
                      <div className="grid grid-cols-2 gap-2 pb-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setImportMergeMode('merge')}
                          className={`py-1 rounded-lg text-[9px] font-bold font-sans transition-all text-center cursor-pointer ${importMergeMode === 'merge' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Mesclar Dados
                        </button>
                        <button
                          type="button"
                          onClick={() => setImportMergeMode('replace')}
                          className={`py-1 rounded-lg text-[9px] font-bold font-sans transition-all text-center cursor-pointer ${importMergeMode === 'replace' ? 'bg-rose-50 text-rose-700 border border-rose-100 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Substituir Tudo
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleImportSelected}
                    disabled={actionLoading || backupFiles.length === 0}
                    className="w-full bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <DownloadCloud className="w-4 h-4" />
                    )}
                    Importar Backup Selecionado
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Quick Help card info */}
        <div className="border-t border-slate-100 pt-3 flex items-start gap-2 text-[10px] text-slate-500 font-sans leading-relaxed">
          <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Os arquivos gerados são gravados na pasta raiz do seu Google Drive. Mantenha os nomes no padrão <strong>"gestor_financeiro_backup"</strong> para que o aplicativo consiga listá-los e recuperá-los de forma automática.
          </span>
        </div>

      </div>
    </div>
  );
}
