// Modal — janela sobreposta reutilizável (usada em vários lugares do app).
// Detalhes importantes:
//   • Renderiza via createPortal direto no <body>, para ficar por cima de tudo.
//   • Fecha com a tecla Esc e trava o scroll do fundo enquanto aberto.
//   • `size` controla a largura; `footer`/`headerRight` são áreas customizáveis.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx } from '../../lib/utils.js'

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', headerRight }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      {/* Overlay — vidro fosco (aero) */}
      <div
        className="fixed inset-0 backdrop-blur-md animate-fade-in"
        style={{ background: 'rgba(0,0,12,0.7)' }}
        onClick={onClose}
      />

      {/* Painel — entra com mola (modal-in) */}
      <div
        role="dialog"
        aria-modal="true"
        className={cx('clip-notch-tl modal-in relative z-10 my-auto w-full', widths[size])}
        style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px rgba(41,206,249,0.25), 0 30px 60px -20px rgba(0,0,0,0.8)' }}
      >
        {/* Faixa superior de acento */}
        <span className="absolute left-0 top-0 h-1 w-full bg-sky" />
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: 'var(--divider)' }}>
            <div className="relative pl-3">
              <span className="absolute left-0 top-1 h-full w-1 bg-sky" style={{ transform: 'skewX(-14deg)' }} />
              {title    && <h2 className="display text-2xl" style={{ color: 'var(--text)' }}>{title}</h2>}
              {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {headerRight}
              <button
                onClick={onClose}
                className="clip-notch p-2 transition hover:text-loss"
                style={{ color: 'var(--text-muted)', boxShadow: 'inset 0 0 0 1px var(--card-border)' }}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t px-6 py-4" style={{ borderColor: 'var(--divider)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
