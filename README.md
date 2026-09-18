# Tibia Dungeons: 3D Idle MMORPG

Um MMORPG 3D isométrico idle inspirado em mecânicas de Tibia e visuais de Minecraft Dungeons, com servidor autoritativo, vocações, hunts, combate automático e progressão offline.

## Funcionalidades

- **Servidor Autoritativo** com WebSocket (FPS 20Hz tick) e persistência em JSON
- **4 Vocções**: Knight, Paladin, Sorcerer, Druid com habilidades e spells únicas
- **Dungeon Procedural**: Masmorras geradas proceduralmente com bosses, afixos e portais
- **Hunts de Mundo Aberto**: Mapas estáticos com respawn contínuo de monstros
- **World Bosses**: Arenas épicas com mecânicas de telegrafo de área
- **Auto-Hunt (Cavebot)**: Caça automática com kiting, cura e uso de runas
- **Progressão Offline**: Ganhe EXP e loot mesmo com o jogo fechado
- **Parties**: Sistema de grupo com loot sharing e exp share via BroadcastChannel + WebSocket
- **3D Engine**: Three.js com renderização isométrica, spells VFX, partículas e efeitos viscerais
- **Marketplace**: Compre e venda itens com outros jogadores
- **Bestiary**: Rastreie kills de monstros para bônus de dano e crit
- **Bounties**: Missões diárias de eliminação de monstros
- **Offline Report**: Veja o progresso ganho enquanto esteve offline

## Rodando Localmente

### Pré-requisitos
- Node.js 18+

### Instalar dependências
```bash
npm install
```

### Iniciar servidor (dev mode)
```bash
npm run dev
```

O servidor vai rodar em `http://localhost:3000`

### Build para produção
```bash
npm run build
```

## Arquitetura

```
src/
├── types/game.ts              # Tipos compartilhados e protocolo WebSocket
├── constants/                 # Vocções, mapas, itens, monstros, spells, etc.
├── game-client/               # Cliente 3D (Three.js)
│   ├── engine/                # GameEngine, Spells3DFXEngine, Models
│   ├── network/               # GameSocket, PartyNetworkManager
│   ├── audio/                 # SoundEffects (Web Audio synth)
│   └── items/                 # ItemLoader
├── game-shared/               # Lógica compartilhada (combate, pathfinding, dungeon)
├── components/                # React components (HUD, modals, windows)
└── constants/uiTheme.ts       # Tema visual e tokens de cor

server/                        # Servidor (após limpeza)
├── persistence.ts             # Persistência de dados (JSON)
└── gameServer.ts              # Lógica principal do servidor
```

## Estrutura do Banco de Dados

O banco de dados fica em `data/game_database.json` e contém:
- `characters` — Todos os personagens criados
- `accounts` — Contas vinculadas a personagens
- `feedbacks` — Feedback dos playtesters (separado em `data/feedbacks.json`)

## Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia servidor em modo dev |
| `npm run build` | Build para produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | Verifica tipos TypeScript |
| `npx tsx server.ts` | Inicia servidor diretamente |

## Tecnologias

- **Frontend**: React 19, Three.js, Tailwind CSS v4, TypeScript
- **Backend**: Express, WebSocket (ws), tsx
- **Armazenamento**: localStorage (cliente), JSON files (servidor)
