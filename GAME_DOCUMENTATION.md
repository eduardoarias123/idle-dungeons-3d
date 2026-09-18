# 🛡️ Tibia 3D ARPG — Documentação do Jogo & Roadmap de Desenvolvimento

---

## 📋 PARTE 1: Funcionalidades Implementadas (O que já está no Jogo)

### 1. 🎭 Vocações e Sistema de Personagem
- **4 Vocações Clássicas**:
  - **Knight (Guerreiro)**: Foco em defesa, HP alto, dano físico corpo a corpo e técnica *Berserk (exori)*.
  - **Paladin (Mago da Distância)**: Foco em dano à distância com lanças/arcos, magia divina (*exori san*) e regeneração de HP/MP equilibrada.
  - **Sorcerer (Mago de Fogo e Energia)**: Foco em alto dano mágico em área (*exori vis*, *exori flam*), alta Mana e escudos mágicos.
  - **Druid (Sacerdote e Curandeiro)**: Foco em magias de cura avançada (*exura gran*, *exura vita*) e suporte.
- **Sistema de Habilidades (Skills)**:
  - Evolução em tempo real de: *Melee (Sword/Axe/Club)*, *Distance*, *Shielding*, *Magic Level* e *Fishing*.
  - Avanços de skill geram notificações no chat e efeitos sonoros com partículas 3D.
- **Reset e Troca de Vocação**:
  - Altar de Transmutação no Templo de Thais para redefinir pontos ou trocar de vocação mantendo o progresso global.

---

### 2. ⚔️ Sistema de Combate e Habilidades
- **Combate Físico e Mágico**:
  - Cálculo de dano dinâmico baseado em atributos do personagem, nível da arma e armadura do alvo.
  - Ataques automáticos baseados na distância da arma (corpo a corpo vs. distância).
  - Alvo automático inteligente (Auto-Targeting) na criatura hostil mais próxima dentro do alcance.
- **Livro de Magias (Spells)**:
  - *Light (utevo lux)*: Iluminação mágica.
  - *Intense Heal (exura gran)* & *Ultimate Heal (exura vita)*: Cura instantânea de HP consumindo Mana.
  - *Energy Strike (exori vis)*, *Flame Strike (exori flam)*, *Divine Missile (exori san)*: Projéteis e magias de elemento.
  - *Ground Shake (exori)*: Dano físico em área ao redor do guerreiro.
  - Barras de tempo de recarga (Cooldown) e custo de Mana dinâmico.

---

### 3. 🗺️ Mapas, Masmorras Procedurais e Ondas
- **Templo de Thais (Safe Zone)**:
  - Altar de Cura para restauração instantânea de HP e Mana.
  - **Bonecos de Treino (Training Dummies)**: Bonecos interativos na asa direita do templo para teste de DPS corpo a corpo, distância e magia sem risco de morte.
  - Portais de acesso para masmorras de caça.
- **Masmorras Procedurais (Dungeons Procedurais)**:
  - **Esgotos de Thais (HUNT_SEWERS)** & **Montanha dos Ciclopes (HUNT_CYCLOPS)**.
  - Geração procedural com *seeds* únicas a cada entrada/descida de andar.
  - Layouts de labirinto com salas, corredores, barris/baús quebráveis, poças de veneno/fogo e arenas de chefe.
- **Sistema de Ondas (Waves) e Aflixões (Affixes)**:
  - Progressão infinita de ondas com aflixões aleatórias (*Vampiric, Frenzied, Armored, Burning, Fortified*).
  - Transições cinematográficas de onda e alertas de chefe com banners compactos no topo da tela.
  - Portal de descida para andares mais profundos ao derrotar o chefe da masmorra.

---

### 4. 👾 Bestiário e Tipos de Monstros
- **Variedade de Criaturas 3D Voxel**:
  - *Rato das Cavernas (Cave Rat)*, *Rotworm*, *Carrion Worm*, *Esqueleto*, *Ciclope*, *Rainha Rotworm (Chefe)*, *Ciclope Ferreiro (Chefe)* e *Boneco de Treino*.
- **IA de Criaturas**:
  - Caminhamento inteligente e perseguidor (*A* Pathfinding*).
  - Ataques corpo a corpo e habilidades com área de impacto antecipada (Telegraphs em vermelho no chão).
- **Sistema de Bestiário**:
  - Registro de eliminações por espécie de monstro com níveis de maestria e bônus passivos de dano.

---

### 5. 🎒 Inventário, Equipamentos e Drops
- **Slots de Equipamento**:
  - Capacete, Armadura, Calça, Botas, Arma Principal, Escudo/Arma Secundária, Amuleto, Anel e Mochila.
- **Raridade e Atributos Procedurais**:
  - Itens Comuns, Raros, Épicos, Lendários e Únicos com atributos aleatórios (+Dano, +Grit, +Velocidade, +Regeneração, +Defesa).
- **Loot & Poções**:
  - Sacos de loot 3D gerados no chão ao derrotar criaturas.
  - Moedas de Ouro com som característico.
  - Poções de Vida e Mana acumuláveis.

---

### 6. 🎮 Automação, HUD e Suporte Mobile
- **Modo Auto-Hunt (Caça Automática)**:
  - Caça automatizada com busca de alvos e uso de poções/magias de emergência.
- **Progresso Offline**:
  - Relatório de ganhos de XP e Ouro acumulados enquanto o jogador estava ausente.
- **Interface e Controles Responsive**:
  - HUD 3D com barra de FPS/Performance, contador de onda, barra de vida do alvo e controles de toque direcionais (D-Pad) para celulares e tablets.

---

## 🚀 PARTE 2: Roadmap de Expansões (O que pode ser Criado e Implementado)

### 1. 🏰 Novos Mapas e Ambientes
- **Cidades Adicionais**:
  - *Venore (Pântano)*, *Carlin (Neve/Gelo)*, *Darashia (Deserto)* e *Edron (Torres de Magia)*.
- **Masmorras Temáticas**:
  - *Tumba de Faraós (Múmias e Vampiros)*.
  - *Vulcão de Dragões (Dragons e Dragon Lords)*.
  - *Masmorra Subaquática (Quaras e Elementais de Água)*.

---

### 2. 🐉 Novas Criaturas e Chefes Lendários
- **Criaturas Médias e Avançadas**:
  - *Minotauros (Guard/Mage)*, *Demônios (Demon)*, *Beholders/Bonelords*, *Behemoths*, *Hydras*.
- **Mecânicas de Chefe Avançadas**:
  - Chefes com múltiplas fases, invocação de lacaios e ataques de raio laser/fogo em área.

---

### 3. 💎 Sistema de Runas, Encantamentos e Sobrevivência
- **Fabricação de Runas (Rune Making)**:
  - Criação de runas mágicas (*Sudden Death - SD*, *Heavy Magic Missile - HMM*, *Ultimate Healing Rune - UH*, *Firebomb*).
- **Encantamento e Forja de Itens**:
  - Ferreiro na cidade para aprimorar armas com pedras elementais (+Fogo, +Gelo, +Raio, +Sagradas).
- **Sistema de Pesca e Culinária**:
  - Pescaria funcional nos rios de Thais para obter peixes que concedem bônus temporários de atributos e regeneração.

---

### 4. 📜 Missões (Quests) e Lore
- **Quests de Baú e Aventura**:
  - Quests clássicas como *Desert Quest*, *Annihilator*, e *Demon Helmet Quest*.
- **NPCs Interativos com Diálogo**:
  - Ferreiros, Vendedores de Poções, Guias de Viagem e Questgivers com janelas de diálogo e opções de conversa.

---

### 5. 👥 Recursos Multijogador (Multiplayer & Social)
- **Sistema de Guildas e Casas**:
  - Criação de Guildas, chats de guilda e compra de casas decoráveis em Thais.
- **Mercado e Comércio entre Jogadores (Market/Trade)**:
  - Quadro de ofertas no mercado central para compra e venda de equipamentos raros por moedas de ouro.
- **Modo Co-op / Group Dungeons**:
  - Caça em grupo (Party System) com divisão de experiência e bônus de vocações combinadas.

---

### 6. 🏆 Sistema de Ranking e Desafios Diários
- **Hall da Fama (Leaderboard)**:
  - Tabela global de líderes organizada por Nível, Skill de Armas e Maior Onda alcançada.
- **Desafios e Recompensas Diárias**:
  - Bônus de login e tarefas diárias de caça (*Bounty Hunting*) com recompensas em moedas e cosméticos.
