import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ShieldAlert, Sparkles, Minus, Maximize2 } from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  channel: 'say' | 'server' | 'loot' | 'party' | 'global';
  color?: string;
  timestamp: number;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'server' | 'say' | 'loot' | 'party' | 'global'>('global');
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean) return;
    onSendMessage(clean);
    setInputText('');
  };

  const filteredMessages = messages.filter((m) => {
    if (activeTab === 'all') return true;
    return m.channel === activeTab;
  });

  return (
    <div
      className={`fixed bottom-24 left-2 sm:bottom-4 sm:left-4 z-20 w-64 sm:w-72 bg-zinc-950/92 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 select-none ${
        isMinimized ? 'h-8' : 'h-36 sm:h-44'
      }`}
    >
      {/* Header with Tabs & Controls */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'global'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Global
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'server'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Log
          </button>
          <button
            onClick={() => setActiveTab('loot')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'loot'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Loot
          </button>
          <button
            onClick={() => setActiveTab('say')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'say'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Say
          </button>
          <button
            onClick={() => setActiveTab('party')}
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'party'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Party
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white cursor-pointer"
            title={isMinimized ? 'Expand Log' : 'Minimize Log'}
          >
            {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white cursor-pointer"
            title="Fechar"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      {!isMinimized && (
        <>
          <div
            ref={scrollRef}
            className="flex-1 p-2.5 overflow-y-auto flex flex-col gap-1 font-mono text-[10px] leading-tight"
          >
            {filteredMessages.length === 0 ? (
              <span className="text-gray-500 italic py-2">Combat log active...</span>
            ) : (
              filteredMessages.map((m, idx) => {
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                let colorClass = 'text-gray-400';
                if (m.channel === 'loot') colorClass = 'text-orange-400';
                else if (m.channel === 'server') colorClass = 'text-blue-300';
                else if (m.sender === 'System') colorClass = 'text-rose-400';
                else if (m.channel === 'say') colorClass = 'text-gray-200';

                const uniqueKey = m.id ? `${m.id}_${idx}_${m.timestamp}` : `msg_${idx}_${m.timestamp}`;

                return (
                  <div key={uniqueKey} className="leading-relaxed break-words flex items-start gap-1">
                    <span className="text-gray-600 shrink-0 select-none">[{timeStr}]</span>
                    {m.sender && (
                      <span className="text-gray-400 font-bold shrink-0">
                        {m.sender}:
                      </span>
                    )}
                    <span className={colorClass} style={{ color: m.color }}>
                      {m.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-1.5 border-t border-white/5 bg-black/40 flex gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cast words or chat (Exura, Hi)..."
              className="flex-1 px-2.5 py-1 rounded bg-black/80 border border-white/10 text-[10px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/60 font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center shadow"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
