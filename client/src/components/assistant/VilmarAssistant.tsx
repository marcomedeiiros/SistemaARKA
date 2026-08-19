import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';

import { useLiveQuery } from '../../data/useLiveQuery';
import { db } from '../../db/db';
import type { ActiveModule } from '../layout/Sidebar';
import { answerQuestion, type AnswerItem, type AssistantData } from './assistantEngine';

interface VilmarAssistantProps {
  /** Permite ao assistente levar o usuário até o módulo relacionado à resposta. */
  onNavigate: (module: ActiveModule) => void;
}

interface ChatMessage {
  id: number;
  from: 'user' | 'vilmar';
  text: string;
  items?: AnswerItem[];
  module?: ActiveModule;
  moduleLabel?: string;
}

const SUGGESTIONS = [
  'Produtos em falta',
  'Estoque baixo',
  'Vendas de hoje',
  'OS abertas',
  'Contas vencidas'
];

const toneClass: Record<NonNullable<AnswerItem['tone']>, string> = {
  default: 'vilmar-badge-default',
  success: 'vilmar-badge-success',
  warning: 'vilmar-badge-warning',
  danger: 'vilmar-badge-danger'
};

let messageId = 0;
const nextId = () => (messageId += 1);

export function VilmarAssistant({ onNavigate }: VilmarAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      from: 'vilmar',
      text: 'Oi! 👋 Sou o Vilmar, seu assistente. Pergunte sobre estoque, produtos em falta, vendas, OS ou financeiro que eu busco pra você.'
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Espelho reativo dos dados do back-end: atualiza sozinho após cada gravação.
  const data = useLiveQuery<AssistantData>(async () => {
    const [products, categories, suppliers, customers, sales, serviceOrders, accountsReceivable] =
      await Promise.all([
        db.products.toArray(),
        db.categories.toArray(),
        db.suppliers.toArray(),
        db.customers.toArray(),
        db.sales.toArray(),
        db.serviceOrders.toArray(),
        db.accountsReceivable.toArray()
      ]);
    return { products, categories, suppliers, customers, sales, serviceOrders, accountsReceivable };
  }, []);

  const emptyData = useMemo<AssistantData>(
    () => ({
      products: [],
      categories: [],
      suppliers: [],
      customers: [],
      sales: [],
      serviceOrders: [],
      accountsReceivable: []
    }),
    []
  );

  // Rola para a última mensagem sempre que o histórico muda.
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = (raw: string) => {
    const question = raw.trim();
    if (!question) return;

    const userMessage: ChatMessage = { id: nextId(), from: 'user', text: question };
    const answer = answerQuestion(question, data ?? emptyData);
    const vilmarMessage: ChatMessage = {
      id: nextId(),
      from: 'vilmar',
      text: answer.text,
      items: answer.items,
      module: answer.module,
      moduleLabel: answer.moduleLabel
    };

    setMessages((prev) => [...prev, userMessage, vilmarMessage]);
    setInput('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    send(input);
  };

  const handleNavigate = (module: ActiveModule) => {
    onNavigate(module);
    setIsOpen(false);
  };

  return (
    <>
      {/* Bolinha flutuante */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="vilmar-bubble"
        aria-label={isOpen ? 'Fechar assistente Vilmar' : 'Abrir assistente Vilmar'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={22} /> : <Bot size={22} />}
        {!isOpen && <span className="vilmar-bubble-dot" aria-hidden />}
      </button>

      {/* Painel de chat */}
      {isOpen && (
        <div className="vilmar-panel" role="dialog" aria-label="Assistente Vilmar">
          <header className="vilmar-header">
            <div className="vilmar-header-avatar">
              <Bot size={18} />
            </div>
            <div className="vilmar-header-info">
              <p className="vilmar-header-name">
                Vilmar <Sparkles size={12} className="vilmar-header-spark" />
              </p>
              <p className="vilmar-header-status">
                <span className="vilmar-online-dot" aria-hidden /> Assistente do Arka · online
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="vilmar-header-close"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </header>

          <div className="vilmar-messages" ref={scrollRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.from === 'user' ? 'vilmar-row-user' : 'vilmar-row-bot'}
              >
                <div
                  className={
                    message.from === 'user' ? 'vilmar-msg vilmar-msg-user' : 'vilmar-msg vilmar-msg-bot'
                  }
                >
                  <p className="vilmar-msg-text">{message.text}</p>

                  {message.items && message.items.length > 0 && (
                    <div className="vilmar-items">
                      {message.items.map((item, index) => (
                        <div key={index} className="vilmar-item">
                          <div className="vilmar-item-main">
                            <p className="vilmar-item-title">{item.title}</p>
                            {item.subtitle && (
                              <p className="vilmar-item-subtitle">{item.subtitle}</p>
                            )}
                          </div>
                          {item.badge && (
                            <span className={`vilmar-badge ${toneClass[item.tone ?? 'default']}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {message.module && (
                    <button
                      type="button"
                      className="vilmar-goto"
                      onClick={() => handleNavigate(message.module!)}
                    >
                      {message.moduleLabel ?? 'Abrir'} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sugestões rápidas */}
          <div className="vilmar-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="vilmar-chip"
                onClick={() => send(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form className="vilmar-input-bar" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pergunte algo ao Vilmar…"
              className="vilmar-input"
            />
            <button type="submit" className="vilmar-send" aria-label="Enviar" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
