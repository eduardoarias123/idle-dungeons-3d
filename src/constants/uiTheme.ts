// Design Tokens & Interface Standards for Tibia Dungeons: Fusion

export const COLORS = {
  surface0: '#090c10', // Slot vazio mais escuro
  surface1: '#0e1218', // Slot de equipamento
  surface2: '#12161c', // Corpo de janela modal
  surface3: '#1a1f26', // Fundo de painéis e HUD
  hover1: '#202731',   // Botões normais
  hover2: '#232a33',   // Header de janela
  hover3: '#252c38',   // Hotbar e botões hover
  hover4: '#2b3442',   // Menu de navegação hover
  borderBase: '#3d4857', // Borda padrão de janela
  borderSoft: '#384352', // Borda leve
  borderDark: '#2d3744', // Borda de slot vazio
  borderHover: '#425063',// Borda de slot em hover
  borderGold: '#5c4a38', // Borda dourada/marrom de janela
  goldAccent: '#facc15', // Ouro de título e destaques
  barTrack: '#0b0e14',   // Trilha de barras (HP/MP/EXP/Boss)
  barBorder: '#333d4c',  // Borda interna das barras
} as const;

export const RARITY_CLASSES = {
  common: 'border-[#3d4857] bg-[#0e1218] text-slate-300',
  rare: 'border-cyan-500 bg-cyan-950/60 text-cyan-300',
  epic: 'border-purple-500 bg-purple-950/60 text-purple-300',
  unique: 'border-amber-500 bg-amber-950/60 text-amber-300',
} as const;

export function getRarityBadge(rarity?: string): string {
  switch (rarity) {
    case 'unique':
      return RARITY_CLASSES.unique;
    case 'epic':
      return RARITY_CLASSES.epic;
    case 'rare':
      return RARITY_CLASSES.rare;
    default:
      return RARITY_CLASSES.common;
  }
}

export function getHpColorClass(hpPercent: number): string {
  if (hpPercent > 60) return 'from-emerald-600 to-green-500';
  if (hpPercent > 30) return 'from-amber-600 to-yellow-500';
  return 'from-rose-700 to-red-500';
}

export const TIBIA_WINDOW_CLASSES = {
  modalOverlay: 'fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs',
  modalWindow: 'relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border-2 border-[#5c4a38] bg-[#12161c]/90 backdrop-blur-xs shadow-2xl text-slate-200 font-mono',
  header: 'flex items-center justify-between border-b border-[#3d4857] bg-[#232a33]/90 px-3 py-1.5',
  title: 'text-xs font-bold uppercase tracking-wider text-[#facc15]',
  closeButton: 'text-slate-400 hover:text-rose-400 transition cursor-pointer',
  body: 'p-4 space-y-4',
} as const;
