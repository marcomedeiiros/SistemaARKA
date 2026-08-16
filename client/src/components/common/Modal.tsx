import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título do diálogo. Aceita texto ou markup. */
  title?: React.ReactNode;
  /** Linha de apoio abaixo do título. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Ações fixas no pé do diálogo, sempre visíveis mesmo com conteúdo rolando. */
  footer?: React.ReactNode;
  maxWidth?: ModalWidth;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  /** Esconde o botão X do cabeçalho (para fluxos que exigem uma decisão). */
  hideCloseButton?: boolean;
}

const widthClass: Record<ModalWidth, string> = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
  '2xl': 'modal-2xl',
  '4xl': 'modal-4xl',
  full: 'modal-full'
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * Contador de diálogos abertos. Com modais empilhados, o scroll do body só é
 * liberado quando o último deles fecha.
 */
let openModals = 0;

function lockBodyScroll(): () => void {
  openModals += 1;

  if (openModals === 1) {
    // Compensa a largura da barra de rolagem para o conteúdo não "saltar".
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.dataset.arkaScrollLock = 'true';
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  }

  return () => {
    openModals = Math.max(0, openModals - 1);
    if (openModals === 0) {
      delete document.body.dataset.arkaScrollLock;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  };
}

/**
 * Diálogo modal da aplicação.
 *
 * Pontos que estavam quebrados e foram corrigidos:
 * - renderiza em portal no `body`, então o overlay `position: fixed` não é mais
 *   ancorado nem cortado pelo container da página (que tem `transform` por
 *   causa da animação de entrada) nem pelo `overflow: auto` da área principal;
 * - fecha com ESC e devolve o foco ao elemento que abriu o diálogo;
 * - trava o scroll do fundo enquanto está aberto;
 * - expõe semântica de diálogo (`role`, `aria-modal`, `aria-labelledby`) e
 *   mantém o foco preso dentro do painel.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideCloseButton = false
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();

  const focusables = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return [];
    return Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );
  }, []);

  // Trava o scroll do fundo enquanto o diálogo está aberto.
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Guarda o foco anterior, foca o diálogo e restaura ao fechar.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      const [first] = focusables();
      (first ?? panelRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, focusables]);

  // ESC fecha; Tab circula apenas entre os elementos do diálogo.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusables();
      if (elements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, closeOnEsc, onClose, focusables]);

  if (!isOpen) return null;

  const handleBackdrop = (event: React.MouseEvent<HTMLDivElement>) => {
    // Só fecha em clique direto no fundo, nunca em arraste iniciado no painel.
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={handleBackdrop}>
      <div className="modal-overlay-inner" onMouseDown={handleBackdrop}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? headingId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={`modal-panel ${widthClass[maxWidth]}`}
        >
          {(title || !hideCloseButton) && (
            <div className="modal-header no-print">
              <div className="modal-header-text">
                {title && (
                  <h2 id={headingId} className="modal-title">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id={descriptionId} className="modal-description">
                    {description}
                  </p>
                )}
              </div>

              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="modal-close"
                  aria-label="Fechar"
                  title="Fechar (Esc)"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          <div className="modal-body">{children}</div>

          {footer && <div className="modal-footer no-print">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
};
