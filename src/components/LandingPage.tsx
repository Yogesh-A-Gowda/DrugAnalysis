import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, MessageSquare } from 'lucide-react';
import { type ChatMessage, type DrugAnalysis } from '../types';
import { getGeminiResponse } from '../services/geminiService';

interface ChatBotProps {
  drugData: DrugAnalysis;
}

export const ChatBot: React.FC<ChatBotProps> = ({ drugData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getGeminiResponse(userMsg, messages, drugData);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not get a response.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-3 z-50 flex flex-col items-end md:bottom-6 md:right-6">
      {isOpen ? (
        <div className="bg-white w-[calc(100vw-1.5rem)] max-w-md h-[70vh] max-h-[500px] shadow-2xl rounded-2xl flex flex-col border border-slate-200 overflow-hidden mb-2 md:w-96 md:h-[500px] md:mb-4 transition-all duration-300">
          <div className="bg-blue-600 p-3 md:p-4 text-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <div>
                <h3 className="font-semibold text-sm">Drug Analysis AI</h3>
                <p className="text-xs text-blue-100">Analyzing {drugData.drug_name}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 p-1 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <Bot className="mx-auto text-blue-200" size={40} />
                <p className="text-sm">Ask me anything about {drugData.drug_name}!</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {['Side effects?', 'Is it effective?', 'Common patient concerns?'].map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full hover:border-blue-400 hover:text-blue-600 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1 opacity-70">
                    {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    <span className="text-[10px] uppercase font-bold tracking-wider">{m.role}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 md:p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              AI can make mistakes. Consult a doctor.
            </p>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center md:p-4"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};
