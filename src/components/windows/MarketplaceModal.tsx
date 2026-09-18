import React, { useState } from 'react';
import { CharacterData, MarketListing, InventoryItem } from '../../types/game';
import { ITEMS_DATABASE } from '../../constants/items';
import { ShoppingBag, Search, Tag, Coins, Plus, Trash2, X, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import { gameSocket } from '../../game-client/network/GameSocket';

interface MarketplaceModalProps {
  character: CharacterData;
  listings: MarketListing[];
  isOpen: boolean;
  onClose: () => void;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
  character,
  listings,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'sell' | 'my_listings'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sell form state
  const [selectedSellItemInstanceId, setSelectedSellItemInstanceId] = useState<string>('');
  const [sellPriceInput, setSellPriceInput] = useState<number>(500);

  if (!isOpen) return null;

  // Filter listings
  const filteredListings = listings.filter((list) => {
    const itemDef = ITEMS_DATABASE[list.item.defId];
    if (!itemDef) return false;

    const matchesSearch = itemDef.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          list.sellerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'ENCHANTED') return Boolean(list.item.enchantment);
    if (filterCategory === 'WEAPON') return itemDef.slot === 'weapon';
    if (filterCategory === 'ARMOR') return ['armor', 'helmet', 'legs', 'boots', 'shield'].includes(itemDef.slot || '');
    if (filterCategory === 'CONSUMABLE') {
      return (
        itemDef.type === 'potion' ||
        itemDef.id.startsWith('rune_') ||
        ['potion_health', 'potion_mana', 'potion_strong_health'].includes(itemDef.id)
      );
    }

    return true;
  });

  const myListings = listings.filter((l) => l.sellerName === character.name);

  const handleBuy = (listingId: string, price: number) => {
    setErrorMessage(null);
    if (character.gold < price) {
      setErrorMessage('Você não tem ouro suficiente para comprar este item!');
      return;
    }
    gameSocket.marketBuy(listingId);
  };

  const handleListItem = () => {
    if (!selectedSellItemInstanceId || sellPriceInput <= 0) return;
    gameSocket.marketListItem(selectedSellItemInstanceId, sellPriceInput);
    setSelectedSellItemInstanceId('');
  };

  const handleCancelListing = (listingId: string) => {
    gameSocket.marketCancelListing(listingId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-[#121212] border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-200 flex items-center gap-2">
                Mercado & Casa de Leilões de Thais
              </h2>
              <p className="text-xs text-zinc-400">
                Compre e venda equipamentos rúnicos, poções e relíquias com outros aventureiros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'browse'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Explorar Mercado ({listings.length})
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sell'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Anunciar Item
            </button>
            <button
              onClick={() => setActiveTab('my_listings')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my_listings'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Meus Anúncios ({myListings.length})
            </button>
          </div>

          <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-800">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span>{character.gold.toLocaleString()} Gold</span>
          </div>
        </div>

        {/* In-Modal Alert/Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-3 px-4 py-2 bg-red-950/80 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-center justify-between animate-in fade-in">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: BROWSE MARKETPLACE */}
        {activeTab === 'browse' && (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar item ou vendedor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-[11px]">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'ENCHANTED', label: '✨ Encantados' },
                  { id: 'WEAPON', label: 'Armas' },
                  { id: 'ARMOR', label: 'Armaduras' },
                  { id: 'CONSUMABLE', label: 'Poções & Runas' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filterCategory === cat.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Nenhum item encontrado no mercado com estes filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredListings.map((listing) => {
                  const itemDef = ITEMS_DATABASE[listing.item.defId];
                  if (!itemDef) return null;
                  const canAfford = character.gold >= listing.priceGold;
                  const isMine = listing.sellerName === character.name;

                  return (
                    <div
                      key={listing.id}
                      className="bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 p-3.5 rounded-2xl transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner relative">
                          🗡️
                          {listing.item.enchantment && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                            <span>{itemDef.name}</span>
                            {listing.item.count > 1 && (
                              <span className="text-[10px] text-zinc-400">x{listing.item.count}</span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-zinc-400">
                            Vendedor: <span className="text-zinc-300 font-semibold">{listing.sellerName}</span>
                          </div>
                          {listing.item.enchantment && (
                            <div className="text-[9.5px] font-bold mt-0.5" style={{ color: listing.item.enchantment.color }}>
                              ✨ {listing.item.enchantment.name} ({listing.item.enchantment.bonusText})
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1.5">
                        <div className="text-xs font-bold font-mono text-yellow-400 flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-yellow-400" />
                          {listing.priceGold.toLocaleString()}
                        </div>

                        {isMine ? (
                          <span className="text-[10px] text-zinc-500 italic">Seu Anúncio</span>
                        ) : (
                          <button
                            onClick={() => handleBuy(listing.id, listing.priceGold)}
                            disabled={!canAfford}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 shadow-md'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                            }`}
                          >
                            Comprar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: SELL ITEM */}
        {activeTab === 'sell' && (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div>
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
                1. Selecione um Item da Mochila para Anunciar
              </label>
              {character.inventory.length === 0 ? (
                <div className="text-xs text-zinc-500 italic py-4">Sua mochila está vazia.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  {character.inventory.map((invItem) => {
                    const itemDef = ITEMS_DATABASE[invItem.defId];
                    if (!itemDef) return null;
                    const isSelected = selectedSellItemInstanceId === invItem.instanceId;

                    return (
                      <button
                        key={invItem.instanceId}
                        onClick={() => setSelectedSellItemInstanceId(invItem.instanceId)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{itemDef.name}</div>
                          {invItem.enchantment && (
                            <div className="text-[9px] font-bold truncate" style={{ color: invItem.enchantment.color }}>
                              ✨ {invItem.enchantment.name}
                            </div>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
                2. Defina o Preço em Ouro (Gold)
              </label>
              <div className="flex items-center gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 w-full sm:w-72">
                <Coins className="w-5 h-5 text-yellow-400" />
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={sellPriceInput}
                  onChange={(e) => setSellPriceInput(Math.max(1, parseInt(e.target.value) || 0))}
                  className="bg-transparent font-mono font-bold text-amber-300 text-sm focus:outline-none w-full"
                />
                <span className="text-xs font-mono text-zinc-400">Gold</span>
              </div>
            </div>

            <button
              onClick={handleListItem}
              disabled={!selectedSellItemInstanceId || sellPriceInput <= 0}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                selectedSellItemInstanceId && sellPriceInput > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95 shadow-lg'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
              }`}
            >
              Publicar Anúncio no Mercado
            </button>
          </div>
        )}

        {/* Tab 3: MY LISTINGS */}
        {activeTab === 'my_listings' && (
          <div className="p-6 overflow-y-auto space-y-3 flex-1">
            {myListings.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Você não possui nenhum anúncio ativo no mercado no momento.
              </div>
            ) : (
              myListings.map((listing) => {
                const itemDef = ITEMS_DATABASE[listing.item.defId];
                if (!itemDef) return null;

                return (
                  <div
                    key={listing.id}
                    className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-center text-xl">
                        🗡️
                      </div>
                      <div>
                        <div className="text-xs font-bold text-amber-200">{itemDef.name}</div>
                        <div className="text-[10px] text-yellow-400 font-mono font-bold">
                          Preço: {listing.priceGold.toLocaleString()} Gold
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancelListing(listing.id)}
                      className="px-3 py-1.5 bg-red-950/40 border border-red-500/40 hover:bg-red-900/40 text-red-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancelar Anúncio
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
