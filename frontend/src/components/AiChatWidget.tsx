import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Bot, User, Send, Loader2 } from 'lucide-react';
import api from '../api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your IndAlpha AI assistant. How can I help you analyze the markets today?' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsGenerating(true);

    try {
      const aiModel = localStorage.getItem('gemini_model') || 'gemini-3.1-flash';
      const apiKey = localStorage.getItem('gemini_api_key');

      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please configure your Gemini API Key in Settings to chat with Alpha AI.' }]);
        setIsGenerating(false);
        return;
      }

      const response = await api.post('/chat', {
        messages: newMessages.map(msg => ({ role: msg.role, content: msg.content }))
      }, {
        headers: {
          'X-Gemini-Model': aiModel,
          'X-Gemini-Api-Key': apiKey
        }
      });
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (error: any) {
      console.error(error);
      
      let errorMsg = 'Sorry, I encountered an error communicating with the server.';
      if (error.response?.status === 401) {
        errorMsg = 'Invalid or missing Gemini API Key. Please update it in Settings.';
      }

      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: errorMsg }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center
          ${isOpen ? 'bg-indalpha-card text-indalpha-text rotate-90 scale-90' : 'bg-indalpha-green text-black hover:scale-110 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 fill-current" />}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-indalpha-card/90 backdrop-blur-xl border border-indalpha-border rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 z-50 flex flex-col
          ${isOpen ? 'opacity-100 translate-y-0 h-[600px] max-h-[calc(100vh-8rem)]' : 'opacity-0 translate-y-10 h-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-indalpha-border bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indalpha-green/20 flex items-center justify-center border border-indalpha-green/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
              <Bot className="w-4 h-4 text-indalpha-green" />
            </div>
            <div>
              <h3 className="text-indalpha-text font-medium text-sm flex items-center gap-2">
                Alpha AI
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-indalpha-green/10 text-indalpha-green border border-indalpha-green/20 uppercase tracking-wider font-bold">Pro</span>
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indalpha-green shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                <span className="text-[10px] text-indalpha-muted">
                  Ready
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center
                ${msg.role === 'user' ? 'bg-indalpha-card' : 'bg-indalpha-green/10 border border-indalpha-green/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]'}`}>
                {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-indalpha-muted" /> : <Bot className="w-3.5 h-3.5 text-indalpha-green" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-indalpha-card text-indalpha-text rounded-tr-none' 
                  : 'bg-black/60 text-indalpha-text border border-indalpha-border/60 rounded-tl-none'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex gap-3 flex-row">
              <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-indalpha-green/10 border border-indalpha-green/20 shadow-[0_0_8px_rgba(34,197,94,0.1)]">
                <Bot className="w-3.5 h-3.5 text-indalpha-green" />
              </div>
              <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm bg-black/60 text-indalpha-text border border-indalpha-border/60 rounded-tl-none">
                <span className="flex space-x-1 mt-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-indalpha-border bg-black/60 backdrop-blur-md">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="Ask Alpha AI..."
              className="w-full bg-indalpha-dark border border-indalpha-border rounded-full pl-4 pr-12 py-2.5 text-sm text-indalpha-text placeholder-gray-500 focus:outline-none focus:border-indalpha-green/50 focus:ring-1 focus:ring-indalpha-green/50 disabled:opacity-50 transition-all shadow-inner"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="absolute right-1.5 p-1.5 bg-indalpha-green text-black rounded-full hover:bg-indalpha-green/90 disabled:opacity-50 disabled:hover:bg-indalpha-green transition-colors"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-center mt-2.5">
            <span className="text-[9px] text-indalpha-muted/80 font-medium tracking-wide">POWERED BY GEMINI • FAST & INTELLIGENT</span>
          </div>
        </div>
      </div>
    </>
  );
};

