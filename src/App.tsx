import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Tv, Info, MessageCircle, Settings, HelpCircle, Copy, Check, Trash2, ExternalLink, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI, chatWithAIStream } from './services/geminiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

type View = 'chat' | 'plans' | 'support' | 'settings';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<View>('chat');
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
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <h2 className="text-3xl font-display text-primary tracking-wider">Planos & Preços</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Bronze', price: 'R$ 19,90', features: ['1 Acesso', 'Canais SD/HD', 'VOD Básico'], color: 'border-orange-700' },
                { name: 'Prata', price: 'R$ 24,90', features: ['1 Acesso', 'Canais Full HD', 'VOD Completo'], color: 'border-gray-400' },
                { name: 'Ouro', price: 'R$ 34,90', features: ['2 Acessos', '4K Ultra HD', 'Suporte VIP'], color: 'border-yellow-500' },
                { name: 'Diamante', price: 'R$ 44,90', features: ['3 Acessos', 'Máxima Qualidade', 'Lançamentos'], color: 'border-blue-400' },
              ].map((plan) => (
                <div key={plan.name} className={`bg-surface p-6 rounded-xl border border-border border-t-4 ${plan.color} shadow-lg hover:shadow-2xl hover:scale-105 transition-all`}>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-2xl font-display text-primary mb-4">{plan.price}</p>
                  <ul className="space-y-2 text-sm text-text-muted">
                    {plan.features.map(f => <li key={f}>• {f}</li>)}
                  </ul>
                  <button 
                    onClick={() => handleSend(`Me fale mais sobre o plano ${plan.name}`)}
                    className="w-full mt-6 py-3 bg-primary text-white rounded-md font-bold text-sm hover:bg-red-700 transition-colors active:scale-95"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'support':
        return (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <h2 className="text-3xl font-display text-primary tracking-wider">Suporte Técnico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: 'Configuração DNS', desc: 'Passo a passo para TVs antigas.', icon: Settings },
                { title: 'Problemas de Login', desc: 'Recuperação de acesso e senhas.', icon: User },
                { title: 'Travamentos', desc: 'Dicas para melhorar a estabilidade.', icon: Tv },
                { title: 'Download de Apps', desc: 'Links oficiais e códigos.', icon: HelpCircle },
              ].map((item) => (
                <button 
                  key={item.title}
                  onClick={() => handleSend(`Como resolver: ${item.title}`)}
                  className="flex items-start gap-4 p-6 bg-surface rounded-xl border border-border hover:border-primary/50 transition-all text-left group active:scale-95"
                >
                  <div className="p-3 bg-surface-light rounded-lg group-hover:bg-primary transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{item.title}</h3>
                    <p className="text-sm text-text-muted">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                Links Úteis para Clientes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'App Android (Prata)', url: 'https://5664.in/7gtyap4a', icon: User },
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
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <h2 className="text-3xl font-display text-primary tracking-wider">Configurações</h2>
            <div className="max-w-xl bg-surface p-8 rounded-2xl border border-border">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Limpar Histórico</h3>
                    <p className="text-sm text-text-muted">Apagar todas as mensagens atuais.</p>
                  </div>
                  <button onClick={handleClearChat} className="p-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all active:scale-95">
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Modo de Resposta</h3>
                    <p className="text-sm text-text-muted">Atualmente em modo "Assistente Pessoal".</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold rounded-full">Ativo</span>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-surface p-10 rounded-3xl shadow-2xl border border-border"
                >
                  <h1 className="text-6xl font-display text-primary tracking-tighter mb-4">ONEFLIX</h1>
                  <p className="text-text-muted text-lg font-light leading-relaxed mb-8">
                    Seu assistente pessoal para atendimento IPTV.<br/>
                    Gere respostas profissionais para seus clientes em segundos.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Plano Diamante', icon: Tv },
                      { label: 'Configurar DNS', icon: Settings },
                      { label: 'Canais não funcionam', icon: HelpCircle },
                      { label: 'Não acho o jogo', icon: HelpCircle },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => handleSend(`Cliente quer saber sobre: ${suggestion.label}`)}
                        className="flex items-center gap-3 p-5 bg-surface-light border border-border rounded-xl text-sm font-bold transition-all group active:scale-95"
                      >
                        <suggestion.icon className="w-5 h-5 text-primary group-hover:text-white" />
                        <span className="text-text-main group-hover:text-white">{suggestion.label}</span>
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
                  <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                      message.role === 'user' ? 'bg-primary' : 'bg-surface-light border border-white/10'
                    }`}>
                      {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="relative group">
                      <div className={`p-4 md:p-5 rounded-2xl shadow-xl ${
                        message.role === 'user' 
                          ? 'bg-primary text-white rounded-tr-none ml-4' 
                          : 'bg-surface text-text-main border border-border rounded-tl-none mr-4'
                      }`}>
                        <p className="text-[13px] md:text-base leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      {message.role === 'model' && (
                        <button
                          onClick={() => handleCopy(message.content, index)}
                          className="absolute -right-14 top-0 p-3.5 bg-surface-light border border-white/10 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white active:scale-90"
                          title="Copiar resposta"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-10 h-10 rounded-full bg-surface-light border border-white/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="bg-surface p-5 rounded-2xl border border-border rounded-tl-none shadow-xl flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-text-muted font-medium">Processando resposta...</span>
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
            { id: 'plans', label: 'Planos & Preços', icon: Info },
            { id: 'support', label: 'Suporte Técnico', icon: HelpCircle },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                currentView === item.id 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                  : 'text-text-muted hover:bg-surface-light hover:text-text-main'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              {item.label}
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
      <main className="flex-1 flex flex-col relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-surface border-b border-border p-4 flex items-center justify-between">
          <button onClick={handleGoHome} className="hover:opacity-80 transition-opacity p-2">
            <h1 className="text-2xl font-display text-primary tracking-tighter">ONEFLIX</h1>
          </button>
          <div className="flex gap-2">
            <button onClick={handleClearChat} className="p-3 rounded-lg bg-surface-light text-red-500 active:scale-95">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentView('chat')} className={`p-3 rounded-lg ${currentView === 'chat' ? 'bg-primary text-white' : 'bg-surface-light'} active:scale-95`}>
              <MessageCircle className="w-6 h-6" />
            </button>
            <button onClick={() => setCurrentView('plans')} className={`p-3 rounded-lg ${currentView === 'plans' ? 'bg-primary text-white' : 'bg-surface-light'} active:scale-95`}>
              <Info className="w-6 h-6" />
            </button>
          </div>
        </header>

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
          <div className="p-6 md:p-8 bg-background border-t border-border">
            <div className="max-w-5xl mx-auto relative">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Como posso ajudar?"
                className="w-full bg-surface border border-border rounded-2xl py-4 md:py-5 pl-5 md:pl-6 pr-14 md:pr-16 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none shadow-xl md:shadow-2xl"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 p-3 bg-primary hover:bg-red-700 disabled:bg-surface-light disabled:text-text-muted text-white rounded-xl transition-all shadow-xl active:scale-90"
              >
                {isLoading ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> : <Send className="w-5 h-5 md:w-6 md:h-6" />}
              </button>
            </div>
            <p className="text-center text-[10px] text-text-muted mt-4 uppercase tracking-[0.3em] font-bold opacity-50">
              OneFlix Assistente • Tecnologia de Atendimento Inteligente
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
