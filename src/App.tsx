import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Tv, Info, MessageCircle, Settings, HelpCircle, Copy, Check, Trash2, ExternalLink, Sun, Moon, Smartphone, Menu, X, Key, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, chatWithAIStream } from './services/geminiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

type View = 'chat' | 'gestor_v3' | 'plans' | 'support' | 'settings';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'promo' | '1' | '3' | '6' | '12'>('promo');
  const [currentView, setCurrentView] = useState<View>('chat');
  const [gestorLogin, setGestorLogin] = useState('');
  const [gestorSenha, setGestorSenha] = useState('');
  const [copiedGestor, setCopiedGestor] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput('');
    setIsLoading(false);
    setCurrentView('chat');
  };

  const buildGestorV3Message = (login: string, senha: string) => {
    return `Olá! Vou te enviar o nosso aplicativo exclusivo para clientes mensais. Por ele, você poderá acessar suas informações e realizar o pagamento das próximas faturas de forma rápida e prática.

Qualquer dúvida que tiver, é só me chamar. Estou à disposição!

🔰 PASSO 1 — BAIXE O APLICATIVO

📱 Android: https://play.google.com/store/apps/details?id=com.gestorv3.cliente  

🍎 iOS: https://apps.apple.com/app/gestorv3-cliente/id6793566886 

🔰 PASSO 2 — PRIMEIRO ACESSO

Ao abrir o app pela primeira vez, o app vai pedir estes dados:

🖥️ Servidor: 9
🔑 Código: WKM6AT

🔰 PASSO 3 — FAÇA SEU LOGIN

Você pode entrar de duas formas:

1️⃣ Pelo seu número de WhatsApp
2️⃣ Ou com o login e senha abaixo:

🕵️‍♂️ Login: ${login.trim() || '[INSERIR_LOGIN]'}
🔐 Senha: ${senha.trim() || '[INSERIR_SENHA]'}`;
  };

  const handleCopyGestor = () => {
    const msg = buildGestorV3Message(gestorLogin, gestorSenha);
    navigator.clipboard.writeText(msg);
    setCopiedGestor(true);
    setTimeout(() => setCopiedGestor(false), 2000);
  };

  const handleSendGestorToChat = () => {
    const msg = buildGestorV3Message(gestorLogin, gestorSenha);
    handleSend(`Mensagem do Gestor V3 gerada:\n\n${msg}`);
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    if (!textOverride) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setCurrentView('chat');

    try {
      const history = messages.map(m => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      // Inicia a mensagem da IA como vazia
      setMessages(prev => [...prev, { role: 'model', content: '' }]);
      
      let fullResponse = '';
      try {
        const stream = chatWithAIStream(userMessage, history);
        
        for await (const chunk of stream) {
          fullResponse += chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'model') {
              newMessages[lastIndex] = { ...newMessages[lastIndex], content: fullResponse };
            }
            return newMessages;
          });
        }
      } catch (streamError: any) {
        console.warn('Falha na stream do Gemini, ativando fallback tradicional...', streamError);
        if (streamError?.message === 'CONFIG_ERROR') {
          throw streamError;
        }
        
        // Se a stream falhou sem retornar nada, ativa o fallback com POST único normal
        if (!fullResponse) {
          const fallbackText = await chatWithAI(userMessage, history);
          fullResponse = fallbackText || '';
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'model') {
              newMessages[lastIndex] = { ...newMessages[lastIndex], content: fullResponse };
            }
            return newMessages;
          });
        }
      }

      if (!fullResponse) {
        throw new Error('No response from AI');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Erro de conexão. Por favor, tente novamente.';
      
      if (error?.message === 'CONFIG_ERROR') {
        errorMessage = '⚠️ Chave API não encontrada! No Netlify:\n1. Use o nome VITE_GEMINI_API_KEY\n2. Vá em Deploys > Trigger Deploy > Clear cache and deploy site.';
      } else if (error?.message?.includes('API key') || error?.message?.includes('Chave API')) {
        errorMessage = 'Sua chave API parece inválida ou não tem permissão.';
      }
        
      setMessages(prev => {
        const lastIndex = prev.length - 1;
        if (prev[lastIndex].role === 'model' && prev[lastIndex].content === '') {
          const newMessages = [...prev];
          newMessages[lastIndex] = { role: 'model', content: errorMessage };
          return newMessages;
        }
        return [...prev, { role: 'model', content: errorMessage }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'plans':
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-display text-primary tracking-wider mb-2">Planos & Preços</h2>
              <p className="text-xs md:text-sm text-text-muted">Consulte os valores mensais e as opções de teste rápido para atendimento.</p>
            </div>

            {/* Seletor de Períodos com Desconto */}
            <div className="bg-surface p-1.5 rounded-2xl border border-border inline-flex flex-wrap gap-1 max-w-full">
              {[
                { id: 'promo', label: '1º Mês Promo', discount: '50% OFF' },
                { id: '1', label: 'Mensal', discount: 'Regular' },
                { id: '3', label: '3 Meses', discount: '10% OFF' },
                { id: '6', label: '6 Meses', discount: '20% OFF' },
                { id: '12', label: '12 Meses', discount: '30% OFF' },
              ].map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id as any)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                    selectedPeriod === period.id
                      ? 'bg-primary text-white shadow-lg'
                      : 'hover:bg-surface-light text-text-muted hover:text-text-main'
                  }`}
                >
                  <span>{period.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase ${
                    selectedPeriod === period.id
                      ? 'bg-white/20 text-white'
                      : period.id === '1' ? 'bg-border text-text-muted' : 'bg-primary/10 text-primary'
                  }`}>
                    {period.discount}
                  </span>
                </button>
              ))}
            </div>

            {/* Grid de Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                const planPricing: Record<string, Record<'promo' | '1' | '3' | '6' | '12', { total: string; original: string; monthly: string; discountText: string }>> = {
                  Bronze: {
                    'promo': { total: 'R$ 9,95', original: 'R$ 19,90', monthly: 'R$ 9,95', discountText: '50% OFF' },
                    '1': { total: 'R$ 19,90', original: '', monthly: 'R$ 19,90', discountText: '' },
                    '3': { total: 'R$ 53,23', original: 'R$ 59,70', monthly: 'R$ 17,74', discountText: '10% OFF' },
                    '6': { total: 'R$ 95,52', original: 'R$ 119,40', monthly: 'R$ 15,92', discountText: '20% OFF' },
                    '12': { total: 'R$ 167,16', original: 'R$ 238,80', monthly: 'R$ 13,93', discountText: '30% OFF' },
                  },
                  Prata: {
                    'promo': { total: 'R$ 12,45', original: 'R$ 24,90', monthly: 'R$ 12,45', discountText: '50% OFF' },
                    '1': { total: 'R$ 24,90', original: '', monthly: 'R$ 24,90', discountText: '' },
                    '3': { total: 'R$ 67,23', original: 'R$ 74,70', monthly: 'R$ 22,41', discountText: '10% OFF' },
                    '6': { total: 'R$ 119,52', original: 'R$ 149,40', monthly: 'R$ 19,92', discountText: '20% OFF' },
                    '12': { total: 'R$ 209,16', original: 'R$ 298,80', monthly: 'R$ 17,43', discountText: '30% OFF' },
                  },
                  Ouro: {
                    'promo': { total: 'R$ 17,45', original: 'R$ 34,90', monthly: 'R$ 17,45', discountText: '50% OFF' },
                    '1': { total: 'R$ 34,90', original: '', monthly: 'R$ 34,90', discountText: '' },
                    '3': { total: 'R$ 94,23', original: 'R$ 104,70', monthly: 'R$ 31,41', discountText: '10% OFF' },
                    '6': { total: 'R$ 167,52', original: 'R$ 209,40', monthly: 'R$ 27,92', discountText: '20% OFF' },
                    '12': { total: 'R$ 293,16', original: 'R$ 418,80', monthly: 'R$ 24,43', discountText: '30% OFF' },
                  },
                  Diamante: {
                    'promo': { total: 'R$ 22,45', original: 'R$ 44,90', monthly: 'R$ 22,45', discountText: '50% OFF' },
                    '1': { total: 'R$ 44,90', original: '', monthly: 'R$ 44,90', discountText: '' },
                    '3': { total: 'R$ 121,23', original: 'R$ 134,70', monthly: 'R$ 40,41', discountText: '10% OFF' },
                    '6': { total: 'R$ 215,52', original: 'R$ 269,40', monthly: 'R$ 35,92', discountText: '20% OFF' },
                    '12': { total: 'R$ 377,16', original: 'R$ 538,80', monthly: 'R$ 31,43', discountText: '30% OFF' },
                  },
                };

                return [
                  { 
                    name: 'Bronze', 
                    color: 'border-orange-700', 
                    features: ['1 Conexão simultânea', 'Atualização Semanal', 'Todos os Canais Liberados', 'Catálogo familiar (+10 Mil Filmes & Séries)', 'Muito Entretenimento (+100 Animes & Novelas)'] 
                  },
                  { 
                    name: 'Prata', 
                    color: 'border-gray-400', 
                    features: ['1 Conexão simultânea', 'Atualização Diária', 'Todos os Canais Liberados', 'Catálogo familiar (+15 Mil Filmes & Séries)', 'Muito Entretenimento (+1 Mil Animes & Novelas)'] 
                  },
                  { 
                    name: 'Ouro', 
                    color: 'border-yellow-500', 
                    features: ['2 Conexões simultâneas', 'Atualização Diária', 'Todos os Canais Liberados', 'Catálogo familiar (+30 Mil Filmes & Séries)', 'Muito Entretenimento (+3 Mil Animes & Novelas)'] 
                  },
                  { 
                    name: 'Diamante', 
                    color: 'border-blue-400', 
                    features: ['3 Conexões (2 IPTV + 1 P2P)', 'Atualização Diária & Lançamentos', 'Todos os Canais Liberados', 'Catálogo familiar (+30 Mil Filmes & Séries)', 'Muito Entretenimento (+3 Mil Animes & Novelas)'] 
                  },
                ].map((plan) => {
                  const priceInfo = planPricing[plan.name][selectedPeriod];
                  const periodText = selectedPeriod === 'promo' ? 'Primeiro Mês' : selectedPeriod === '1' ? '1 mês' : `${selectedPeriod} meses`;
                  return (
                    <div key={plan.name} className={`bg-surface p-6 rounded-2xl border border-border border-t-4 ${plan.color} shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex flex-col justify-between relative overflow-hidden`}>
                      {priceInfo.discountText && (
                        <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase px-2 py-1 rounded-bl-xl">
                          {priceInfo.discountText}
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                        
                        <div className="my-4">
                          {priceInfo.original ? (
                            <span className="text-xs text-text-muted line-through block mb-0.5">
                              {priceInfo.original}
                            </span>
                          ) : (
                            <span className="text-xs text-transparent block mb-0.5 select-none">
                              Placeholder
                            </span>
                          )}
                          <span className="text-3xl font-display text-primary font-black block">
                            {priceInfo.total}
                          </span>
                          {selectedPeriod === 'promo' ? (
                            <span className="text-[11px] text-primary font-bold mt-1 block">
                              Assinatura Direta Promo
                            </span>
                          ) : selectedPeriod !== '1' ? (
                            <span className="text-[11px] text-text-muted font-medium mt-1 block">
                              Equivale a <strong className="text-text-main">{priceInfo.monthly}/mês</strong>
                            </span>
                          ) : (
                            <span className="text-[11px] text-text-muted font-medium mt-1 block">
                              Pagamento mensal
                            </span>
                          )}
                        </div>

                        <ul className="space-y-2 text-xs text-text-muted border-t border-border/10 pt-4 mt-2">
                          {plan.features.map(f => (
                            <li key={f} className="flex items-start gap-1.5">
                              <span className="text-primary font-bold">✓</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button 
                        onClick={() => handleSend(`Como funciona a promoção do plano ${plan.name} de ${periodText} por ${priceInfo.total}?`)}
                        className="w-full mt-6 py-2.5 bg-primary hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md"
                      >
                        Ver Detalhes do {plan.name}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border mt-8">
              <h3 className="text-xl font-bold mb-2 text-primary flex items-center gap-2">
                ⚡ Valores para Realizar Testes
              </h3>
              <p className="text-sm text-text-muted mb-6">
                Opções rápidas para novos clientes conhecerem a qualidade dos servidores.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
                {[
                  { days: '3 Dias', price: 'R$ 4,90', highlight: false, features: ['Acesso completo aos canais', 'Sem compromisso', 'Suporte total no período'] },
                  { days: '7 Dias', price: 'R$ 9,90', highlight: true, features: ['Acesso completo aos canais', 'Ideal para avaliação completa', 'Suporte total no período'] },
                ].map((test) => (
                  <div key={test.days} className={`bg-surface-light p-6 rounded-xl border ${test.highlight ? 'border-primary' : 'border-border'} relative overflow-hidden flex flex-col justify-between shadow-md`}>
                    {test.highlight && (
                      <span className="absolute top-2 right-2 bg-primary text-white text-[9px] font-black uppercase px-2 py-0.5 rounded">
                        Recomendado
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-base">{test.days} de Experiência</h4>
                      <p className="text-2xl font-display text-primary mt-2 mb-4">{test.price}</p>
                      <ul className="space-y-1.5 text-xs text-text-muted">
                        {test.features.map(f => <li key={f} className="flex items-center gap-1.5"><span>•</span> {f}</li>)}
                      </ul>
                    </div>
                    <button
                      onClick={() => handleSend(`Como funciona o teste de ${test.days} por ${test.price}?`)}
                      className="w-full mt-6 py-2 bg-background border border-border text-text-main rounded-lg font-bold text-xs hover:bg-primary hover:text-white transition-colors active:scale-95"
                    >
                      Ver Detalhes do Teste
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pix Payment Card */}
            <div className="bg-surface p-6 rounded-2xl border border-border mt-8 max-w-2xl">
              <h3 className="text-xl font-bold mb-2 text-primary flex items-center gap-2">
                🔑 Dados para Pagamento Pix
              </h3>
              <p className="text-sm text-text-muted mb-6">
                Utilize os dados abaixo para pagamentos de planos ou taxas de teste. Copie a chave CNPJ para facilitar.
              </p>
              
              <div className="bg-surface-light p-6 rounded-xl border border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/10">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Chave CNPJ (Copia e Cola)</span>
                    <span className="text-base font-mono font-bold text-text-main">56.173.325.0001-20</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('56.173.325/0001-20');
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-colors self-start sm:self-center shadow-lg active:scale-95"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Chave CNPJ
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Titular</span>
                    <span className="font-bold text-text-main">VISUAL E DIGITAL TECNOLOGIA LTDA</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Banco</span>
                    <span className="font-bold text-text-main">CLOUDWALK IP LTDA</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/10 text-xs text-text-muted flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">✅</span>
                  <span>Após efetuar o pagamento, <strong>envie o comprovante</strong> no chat ou para seu atendente e aguarde sua liberação! 📄</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'gestor_v3':
        const gestorMessageText = buildGestorV3Message(gestorLogin, gestorSenha);
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Gerador Rápido
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display text-primary tracking-wider mb-2">Gerador Gestor V3</h2>
              <p className="text-xs md:text-sm text-text-muted">Preencha o login e a senha do cliente para gerar automaticamente a mensagem formatada de acesso ao aplicativo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input */}
              <div className="lg:col-span-5 bg-surface p-5 md:p-6 rounded-2xl border border-border space-y-5 shadow-lg">
                <h3 className="font-bold text-base md:text-lg text-text-main flex items-center gap-2 border-b border-border/20 pb-3">
                  <Key className="w-5 h-5 text-primary" />
                  Dados do Cliente
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Usuário / Login do Cliente
                    </label>
                    <input
                      type="text"
                      value={gestorLogin}
                      onChange={(e) => setGestorLogin(e.target.value)}
                      placeholder="Ex: cliente123"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Senha do Cliente
                    </label>
                    <input
                      type="text"
                      value={gestorSenha}
                      onChange={(e) => setGestorSenha(e.target.value)}
                      placeholder="Ex: 88421"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => { setGestorLogin(''); setGestorSenha(''); }}
                    className="px-3 py-2 text-xs font-bold text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-1.5"
                    title="Limpar campos"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Limpar Campos
                  </button>
                </div>
              </div>

              {/* Message Preview */}
              <div className="lg:col-span-7 bg-surface p-5 md:p-6 rounded-2xl border border-border space-y-5 shadow-lg flex flex-col">
                <div className="flex items-center justify-between border-b border-border/20 pb-3">
                  <h3 className="font-bold text-base md:text-lg text-text-main flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Mensagem Pronta
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    Formato Oficial
                  </span>
                </div>

                <div className="bg-background/80 border border-border rounded-xl p-4 font-mono text-xs md:text-sm leading-relaxed text-text-main whitespace-pre-wrap select-all max-h-[380px] overflow-y-auto shadow-inner">
                  {gestorMessageText}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleCopyGestor}
                    className={`flex-1 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                      copiedGestor
                        ? 'bg-emerald-500 text-white'
                        : 'bg-primary hover:bg-red-700 text-white shadow-primary/20'
                    }`}
                  >
                    {copiedGestor ? (
                      <>
                        <Check className="w-5 h-5" />
                        Copiado com Sucesso!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar Mensagem do Gestor V3
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSendGestorToChat}
                    className="w-full sm:w-auto py-3 px-4 bg-surface-light border border-border hover:border-primary/50 text-text-main rounded-xl font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Send className="w-4 h-4 text-primary" />
                    Enviar para Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
            <h2 className="text-2xl md:text-3xl font-display text-primary tracking-wider">Suporte Técnico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[
                { title: 'Configuração DNS', desc: 'Passo a passo para TVs antigas.', icon: Settings },
                { title: 'Problemas de Login', desc: 'Recuperação de acesso e senhas.', icon: User },
                { title: 'Travamentos', desc: 'Dicas para melhorar a estabilidade.', icon: Tv },
                { title: 'Download de Apps', desc: 'Links oficiais e códigos.', icon: HelpCircle },
              ].map((item) => (
                <button 
                  key={item.title}
                  onClick={() => handleSend(`Como resolver: ${item.title}`)}
                  className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-surface rounded-xl border border-border hover:border-primary/50 transition-all text-left group active:scale-95"
                >
                  <div className="p-2.5 md:p-3 bg-surface-light rounded-lg group-hover:bg-primary transition-colors">
                    <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base mb-1">{item.title}</h3>
                    <p className="text-xs md:text-sm text-text-muted">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-surface p-4 md:p-6 rounded-2xl border border-border">
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                Links Úteis para Clientes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'App Android Prata (Sem P2P)', url: 'https://5664.in/7gtyap4a', icon: User },
                  { name: 'App Android (Diamante)', url: 'https://tinyurl.com/wfy4tsuj', icon: Tv },
                  { name: 'Smarters Lite (iOS)', url: 'https://apps.apple.com/br/app/iptv-smarters-player-lite/id1628995509', icon: HelpCircle },
                ].map((link) => (
                  <a 
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-surface-light rounded-xl hover:bg-primary hover:text-white transition-all group"
                  >
                    <span className="text-sm font-bold">{link.name}</span>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8">
            <h2 className="text-2xl md:text-3xl font-display text-primary tracking-wider">Configurações</h2>
            <div className="max-w-xl bg-surface p-5 md:p-8 rounded-2xl border border-border">
              <div className="space-y-6">
                {/* Theme Selector directly in settings */}
                <div className="flex items-center justify-between border-b border-border/10 pb-4">
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Tema do Aplicativo</h3>
                    <p className="text-xs md:text-sm text-text-muted">Alternar entre claro e escuro.</p>
                  </div>
                  <div className="bg-surface-light p-1 rounded-xl flex items-center border border-border">
                    <button
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        theme === 'light' 
                          ? 'bg-background text-primary shadow-sm' 
                          : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        theme === 'dark' 
                          ? 'bg-background text-primary shadow-sm' 
                          : 'text-text-muted hover:text-text-main'
                      }`}
                    >
                      Escuro
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-border/10 pb-4">
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Limpar Conversa</h3>
                    <p className="text-xs md:text-sm text-text-muted">Apagar todas as mensagens salvas.</p>
                  </div>
                  <button onClick={handleClearChat} className="p-2.5 md:p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all active:scale-95">
                    <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Status da IA</h3>
                    <p className="text-xs md:text-sm text-text-muted">Atualmente em modo "Atendimento Inteligente".</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full">Ativo</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 scrollbar-hide pb-24 md:pb-8">
            {messages.length === 0 && (
              <div className="min-h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-4 md:py-8 space-y-6 md:space-y-8">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-surface p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl border border-border w-full"
                >
                  <h1 className="text-4xl md:text-6xl font-display text-primary tracking-tighter mb-2 md:mb-4">ONEFLIX</h1>
                  <p className="text-text-muted text-sm md:text-lg font-light leading-relaxed mb-6 md:mb-8">
                    Seu assistente pessoal para atendimento IPTV.<br/>
                    Gere respostas profissionais para seus clientes em segundos.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {[
                      { label: 'Plano Diamante', icon: Tv },
                      { label: 'Configurar DNS', icon: Settings },
                      { label: 'Canais não funcionam', icon: HelpCircle },
                      { label: 'Não acho o jogo', icon: HelpCircle },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => handleSend(`Cliente quer saber sobre: ${suggestion.label}`)}
                        className="flex items-center gap-2.5 md:gap-3 p-4 md:p-5 bg-surface-light border border-border rounded-xl text-xs md:text-sm font-bold transition-all group active:scale-95"
                      >
                        <suggestion.icon className="w-4 h-4 md:w-5 md:h-5 text-primary group-hover:text-white flex-shrink-0" />
                        <span className="text-text-main group-hover:text-white truncate">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 md:gap-3 max-w-[95%] md:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                      message.role === 'user' ? 'bg-primary' : 'bg-surface-light border border-white/10'
                    }`}>
                      {message.role === 'user' ? <User className="w-4.5 h-4.5 text-white" /> : <Bot className="w-4.5 h-4.5 text-primary" />}
                    </div>
                    <div className="relative group flex flex-col items-start">
                      <div className={`p-3.5 md:p-5 rounded-2xl shadow-md ${
                        message.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none ml-2 md:ml-4' 
                          : 'bg-surface text-text-main border border-border rounded-tl-none mr-2 md:mr-4'
                      }`}>
                        <p className="text-xs md:text-base leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      {message.role === 'model' && (
                        <div className="flex items-center gap-2 mt-1.5 ml-0">
                          <button
                            onClick={() => handleCopy(message.content, index)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border hover:border-primary/50 text-[11px] font-bold text-text-muted hover:text-primary rounded-lg transition-all active:scale-95 shadow-sm"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-primary" />
                                <span>Copiar Resposta</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2.5 md:gap-3 max-w-[85%]">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface-light border border-white/10 flex items-center justify-center">
                    <Bot className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="bg-surface p-4 md:p-5 rounded-2xl border border-border rounded-tl-none shadow-md flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-primary animate-spin" />
                    <span className="text-xs md:text-sm text-text-muted font-medium">Processando resposta...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        );
    }
  };

  const handleGoHome = () => {
    handleClearChat();
  };

  return (
    <div className="flex h-screen bg-background font-sans text-text-main overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-surface border-r border-border flex-col shadow-2xl relative z-20">
        <button 
          onClick={handleGoHome}
          className="p-8 border-b border-border text-left hover:bg-white/5 transition-colors group relative"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display text-primary tracking-tight leading-none">ONEFLIX</h1>
              <p className="text-[8px] text-text-muted font-black tracking-[0.2em] uppercase">Assistente Pro</p>
            </div>
          </div>
        </button>
        
        <nav className="flex-1 p-4 space-y-1 mt-4">
          <p className="px-4 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50">Menu Principal</p>
          {[
            { id: 'chat', label: 'Atendimento', icon: MessageCircle },
            { id: 'gestor_v3', label: 'Gerador Gestor V3', icon: Smartphone, badge: 'Novo' },
            { id: 'plans', label: 'Planos & Preços', icon: Info },
            { id: 'support', label: 'Suporte Técnico', icon: HelpCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                currentView === item.id 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                  : 'text-text-muted hover:bg-surface-light hover:text-text-main'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                  currentView === item.id ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="bg-surface-light p-1 rounded-xl flex items-center mb-4 border border-border">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                theme === 'light' 
                  ? 'bg-background text-primary shadow-sm' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                theme === 'dark' 
                  ? 'bg-background text-primary shadow-sm' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Escuro
            </button>
          </div>

          <button
            onClick={handleClearChat}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
            Limpar Chat
          </button>
          <button
            onClick={() => setCurrentView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
              currentView === 'settings' 
                ? 'bg-primary text-white shadow-lg shadow-primary/10' 
                : 'text-text-muted hover:bg-surface-light hover:text-text-main'
            }`}
          >
            <Settings className="w-5 h-5" />
            Configurações
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-surface-light text-text-muted hover:text-text-main active:scale-95"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={handleGoHome} className="hover:opacity-80 transition-opacity flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shadow shadow-primary/30">
                <Tv className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-display text-primary tracking-tighter">ONEFLIX</h1>
            </button>
          </div>
          <div className="flex gap-2">
            {/* Smooth Theme Toggle inside Mobile Header */}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="p-2 md:p-3 rounded-lg bg-surface-light text-text-muted hover:text-text-main active:scale-95"
              title="Mudar Tema"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-yellow-500" /> : <Moon className="w-4.5 h-4.5 text-indigo-500" />}
            </button>
            {currentView === 'chat' && (
              <button onClick={handleClearChat} className="p-2 md:p-3 rounded-lg bg-surface-light text-red-500 active:scale-95">
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </header>

        {/* Mobile Slide-over Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="md:hidden fixed top-0 left-0 bottom-0 w-80 bg-surface border-r border-border z-50 flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                      <Tv className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-display text-primary tracking-tight leading-none">ONEFLIX</h1>
                      <p className="text-[8px] text-text-muted font-black tracking-[0.2em] uppercase">Assistente Pro</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg bg-surface-light text-text-muted hover:text-text-main active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  <p className="px-4 mb-2 text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-50">Menu Lateral</p>
                  {[
                    { id: 'chat', label: 'Atendimento', icon: MessageCircle },
                    { id: 'gestor_v3', label: 'Gerador Gestor V3', icon: Smartphone, badge: 'Novo' },
                    { id: 'plans', label: 'Planos & Preços', icon: Info },
                    { id: 'support', label: 'Suporte Técnico', icon: HelpCircle },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as View);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                        currentView === item.id 
                          ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                          : 'text-text-muted hover:bg-surface-light hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                          currentView === item.id ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                      currentView === 'settings' 
                        ? 'bg-primary text-white' 
                        : 'text-text-muted hover:bg-surface-light hover:text-text-main'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    Configurações
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Header (Chat Only) */}
        {currentView === 'chat' && (
          <header className="hidden md:flex bg-background/50 backdrop-blur-xl border-b border-border p-6 items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
              <div>
                <h2 className="font-bold text-lg">Central de Atendimento</h2>
                <p className="text-xs text-text-muted font-medium uppercase tracking-widest">IA Especializada OneFlix</p>
              </div>
            </div>
            <button 
              onClick={handleClearChat}
              className="p-3.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95"
              title="Limpar Conversa"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </header>
        )}

        {/* Content */}
        {renderContent()}

        {/* Input Area (Chat Only) */}
        {currentView === 'chat' && (
          <div className="p-4 md:p-8 bg-background border-t border-border pb-24 md:pb-8">
            <div className="max-w-5xl mx-auto relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Como posso ajudar?"
                className="w-full bg-surface border border-border rounded-xl py-3.5 md:py-5 pl-4 md:pl-6 pr-12 md:pr-16 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-lg md:shadow-2xl"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-red-700 disabled:bg-surface-light disabled:text-text-muted text-white rounded-lg transition-all shadow-md active:scale-90"
              >
                {isLoading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>
            <p className="text-center text-[9px] text-text-muted mt-3 uppercase tracking-[0.3em] font-bold opacity-50 hidden sm:block">
              OneFlix Assistente • Tecnologia de Atendimento Inteligente
            </p>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-lg border-t border-border flex items-center justify-around px-2 z-30 shadow-lg">
          {[
            { id: 'chat', label: 'Conversa', icon: MessageCircle },
            { id: 'gestor_v3', label: 'Gestor V3', icon: Smartphone },
            { id: 'plans', label: 'Planos', icon: Info },
            { id: 'support', label: 'Suporte', icon: HelpCircle },
            { id: 'settings', label: 'Ajustes', icon: Settings },
          ].map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 px-2 rounded-xl transition-all ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-primary' : 'text-text-muted'}`} />
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
