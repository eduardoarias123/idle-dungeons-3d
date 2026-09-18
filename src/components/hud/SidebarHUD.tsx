import React from 'react';
import { CharacterData, EquipmentSlot } from '../../types/game';
import { ITEMS_DATABASE } from '../../constants/items';
import { useItemIcon } from '../../game-client/items/ItemLoader';
import { ChevronRight, ChevronLeft, Shield, Sparkles, Wand2, Swords, Target } from 'lucide-react';
import { getRarityBadge, COLORS } from '../../constants/uiTheme';

interface SidebarHUDProps {
  character: CharacterData;
  isOpen: boolean;
  onToggle: () => void;
  onOpenInventory: () => void;
  onOpenSkills: () => void;
  onUnequip: (slot: EquipmentSlot) => void;
  onUseItem: (defId: string) => void;
  isConnected: boolean;
}

const ItemIcon: React.FC<{ defId: string; className?: string }> = ({ defId, className = 'h-6 w-6 object-contain' }) => {
  const [icon, setIcon] = React.useState<{ img: HTMLImageElement | null; icon: string } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setIcon(null);
    useItemIcon(defId).then((loaded) => {
      if (!cancelled) setIcon(loaded);
    });
    return () => { cancelled = true; };
  }, [defId]);

  if (!icon) return null;
  if (icon.img) return <img src={icon.img.src} alt="" className={className} draggable={false} />;
  return null;
};

export const SidebarHUD: React.FC<SidebarHUDProps> = ({
  character,
  isOpen,
  onToggle,
  onOpenInventory,
  onOpenSkills,
  onUnequip,
  onUseItem,
  isConnected,
}) => {
  const renderEquipSlot = (slot: EquipmentSlot, label: string, colRowClass: string) => {
    const item = character.equipment[slot];
    const def = item ? ITEMS_DATABASE[item.defId] : null;

    const badgeClass = def ? getRarityBadge(def.rarity) : 'border-[#3d4857] bg-[#0e1218] text-slate-300';

return (
        <button
          onClick={() => {
            if (item) {
              onUnequip(slot);
            } else {
              onOpenInventory();
            }
          }}
          title={def ? `${def.name} (Click to unequip)` : `${label} (Click to view inventory)`}
          className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded border shadow-inner transition hover:border-[#facc15] ${badgeClass} ${colRowClass}`}
        >
          {def ? (
            <ItemIcon defId={def.id} />
          ) : (
            <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold text-slate-500 group-hover:text-amber-400 uppercase">
              {label}
            </span>
          )}
        </button>
      );
  };

  return (
    <>
      {/* Toggle button on side */}
      <button
        onClick={onToggle}
        className="fixed top-20 right-0 z-25 bg-[#12161c]/90 backdrop-blur-xs hover:bg-[#232a33] border-l-2 border-y-2 border-[#5c4a38] text-[#facc15] p-1.5 rounded-l shadow-2xl transition-transform cursor-pointer"
        title={isOpen ? 'Recolher Painel' : 'Expandir Painel do Personagem'}
        style={{ transform: isOpen ? 'translateX(-288px)' : 'translateX(0)' }}
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Docked Sidebar Box */}
      <aside
        className={`fixed top-[60px] right-2 bottom-[60px] w-[280px] bg-[#12161c]/90 backdrop-blur-xs border-2 border-[#5c4a38] rounded flex flex-col z-20 transition-transform duration-300 select-none shadow-2xl font-mono text-slate-200 overflow-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-[300px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3d4857] bg-[#232a33] px-3 py-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#facc15]">
              EQUIPAMENTO & SKILLS
            </h2>
          </div>
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-amber-300 transition cursor-pointer"
            title="Recolher Painel"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Equipment Section */}
        <div className="p-3 border-b border-[#3d4857] bg-[#1a1f26]/60 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={onOpenInventory}
              className="text-[10px] font-bold uppercase tracking-widest text-[#facc15] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Paperdoll</span>
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full opacity-60 animate-pulse" title="Vitals Normal" />
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full opacity-60" title="Equipment Synced" />
            </div>
          </div>

          {/* 3x3 Paperdoll Grid */}
          <div className="grid grid-cols-3 gap-1 place-items-center my-1">
            {renderEquipSlot('amulet', 'Neck', 'col-start-1 row-start-1')}
            {renderEquipSlot('helmet', 'Head', 'col-start-2 row-start-1')}
            {renderEquipSlot('backpack', 'Pack', 'col-start-3 row-start-1')}

            {renderEquipSlot('weapon', 'Sword', 'col-start-1 row-start-2')}
            {renderEquipSlot('armor', 'Armor', 'col-start-2 row-start-2')}
            {renderEquipSlot('shield', 'Shield', 'col-start-3 row-start-2')}

            {renderEquipSlot('ring', 'Ring', 'col-start-1 row-start-3')}
            {renderEquipSlot('legs', 'Legs', 'col-start-2 row-start-3')}
            {renderEquipSlot('boots', 'Boots', 'col-start-3 row-start-3')}
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
            <span>Cap: <strong className="text-slate-200">{character.capacity} oz</strong></span>
            <span>Gold: <strong className="text-[#facc15]">{character.gold}</strong></span>
          </div>
        </div>

        {/* Middle: Skill Progress & Inventory Preview */}
        <div className="p-3 flex-1 overflow-y-auto space-y-3">
          {/* Skill Progress */}
          <div className="bg-[#1a1f26]/70 border border-[#3d4857] p-2.5 rounded">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#facc15]">
                Skill Progress
              </h2>
              <button
                onClick={onOpenSkills}
                className="text-[9px] text-amber-400 hover:text-white uppercase font-bold cursor-pointer"
              >
                View Stats
              </button>
            </div>

            <div className="space-y-2 text-[10px]">
              {/* Sword Fighting */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-300">Sword Fighting</span>
                  <span className="text-amber-400 font-bold">{character.skills.sword}</span>
                </div>
                <div className="h-1 bg-[#0e1218] border border-[#3d4857] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((character.skills.swordTries % 50) / 50) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Axe Fighting */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-300">Axe Fighting</span>
                  <span className="text-amber-400 font-bold">{character.skills.axe}</span>
                </div>
                <div className="h-1 bg-[#0e1218] border border-[#3d4857] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((character.skills.axeTries % 50) / 50) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Distance Fighting */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-300">Distance Fighting</span>
                  <span className="text-emerald-400 font-bold">{character.skills.distance}</span>
                </div>
                <div className="h-1 bg-[#0e1218] border border-[#3d4857] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((character.skills.distanceTries % 50) / 50) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Shielding */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-300">Shielding</span>
                  <span className="text-amber-400 font-bold">{character.skills.shielding}</span>
                </div>
                <div className="h-1 bg-[#0e1218] border border-[#3d4857] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((character.skills.shieldingTries % 40) / 40) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Magic Level */}
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-300">Magic Level</span>
                  <span className="text-cyan-400 font-bold">{character.skills.magic}</span>
                </div>
                <div className="h-1 bg-[#0e1218] border border-[#3d4857] rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, ((character.skills.manaSpent % 300) / 300) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Preview Grid */}
          <div className="bg-[#1a1f26] border border-[#3d4857] p-2.5 rounded">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#facc15]">
                Backpack ({character.inventory.length}/20)
              </h2>
              <button
                onClick={onOpenInventory}
                className="text-[9px] text-amber-400 hover:text-white uppercase font-bold cursor-pointer"
              >
                Abrir
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => {
                const item = character.inventory[i];
                const def = item ? ITEMS_DATABASE[item.defId] : null;

                const badgeClass = def ? getRarityBadge(def.rarity) : 'border-[#3d4857] bg-[#0e1218]';

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (item) {
                        if (def?.type === 'potion') onUseItem(item.defId);
                        else onOpenInventory();
                      }
                    }}
                    className={`aspect-square border rounded flex items-center justify-center relative transition-all hover:border-[#facc15] ${badgeClass}`}
                    title={def ? `${def.name} x${item.count}` : 'Slot Vazio'}
                  >
                    {item && def ? (
                      <>
                        <ItemIcon defId={def.id} className="h-7 w-7 object-contain" />
                        {item.count > 1 && (
                          <span className="absolute bottom-0.5 right-1 text-[8px] text-[#facc15] font-bold">
                            {item.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="w-1.5 h-1.5 bg-[#3d4857] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Server Status Footer */}
        <div className="mt-auto p-3.5 bg-orange-500/10 border-t border-orange-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
              Server Status
            </span>
            <span className={`text-[10px] font-mono ${isConnected ? 'text-green-400' : 'text-rose-400 animate-pulse'}`}>
              {isConnected ? '15ms (Live)' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
