// Faixa fixa no topo do build de demo: avisa que os dados são fictícios e
// oferece voltar ao estado inicial. Fora do modo demo não renderiza nada.
import { IS_DEMO, resetDemo } from './demoClient.js'

export default function DemoBanner() {
  if (!IS_DEMO) return null
  return (
    <div
      className="condensed sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-[12px] tracking-wide"
      style={{ background: '#FFBE00', color: '#05060E' }}
    >
      <span>MODO DEMONSTRAÇÃO · times, jogadores, partidas e conversas são fictícios. Suas mudanças ficam só neste navegador.</span>
      <button onClick={resetDemo} className="font-bold underline underline-offset-2">RESTAURAR DEMO</button>
    </div>
  )
}
