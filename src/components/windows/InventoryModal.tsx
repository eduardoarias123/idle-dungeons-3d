import React, { useEffect, useState } from 'react';
import { CharacterData, EquipmentSlot, InventoryItem } from '../../types/game';
import { ITEMS_DATABASE } from '../../constants/items';
import { useItemIcon } from '../../game-client/items/ItemLoader';
import { X, Backpack, Shield, Sword, Coins } from 'lucide-react';
import { sounds } from '../../game-client/audio/SoundEffects';
import { TIBIA_WINDOW_CLASSES, getRarityBadge, COLORS } from '../../constants/uiTheme';

interface InventoryModalProps {
  character: CharacterData;
  isOpen: boolean;
  onClose: () => void;
  onEquip: (instanceId: string, slot: EquipmentSlot) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  onUseItem: (defId: string) => void;
  onSellItem: (instanceId: string) => void;
}

interface ItemIconProps {
  defId: string;
  className?: string;
}

const ItemIcon: React.FC<ItemIconProps> = ({ defId, className = 'h-8 w-8 object-contain' }) => {
  const [icon, setIcon] = useState<{ img: HTMLImageElement | null; icon: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIcon(null);
    useItemIcon(defId).then((loaded) => {
      if (!cancelled) setIcon(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [defId]);

  if (!icon) {
    return <span className="text-[7px] font-bold text-slate-500">...</span>;
  }

  if (icon.img) {
    return (
      <img
        src={icon.img.src}
        alt=""
        className={className}
        draggable={false}
      />
    );
  }

  return <span className="text-[7px] font-bold text-slate-500">?</span>;
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  character,
  isOpen,
  onClose,
  onEquip,
  onUnequip,
  onUseItem,
  onSellItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  if (!isOpen) return null;

  const renderSlot = (slot: EquipmentSlot, label: string) => {
    const item = character.equipment[slot];
    const def = item ? ITEMS_DATABASE[item.defId] : null;

    const badgeClass = def ? getRarityBadge(def.rarity) : 'border-[#3d4857] bg-[#0e1218] text-slate-300';

    return (
      <button
        onClick={() => {
          if (item) setSelectedItem(item);
        }}
        className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center rounded border shadow-inner transition hover:border-[#facc15] ${badgeClass}`}
        title={def ? `${def.name} (${label})` : label}
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

  const selectedDef = selectedItem ? ITEMS_DATABASE[selectedItem.defId] : null;

  return (
    <div className={TIBIA_WINDOW_CLASSES.modalOverlay}>
      <div className={TIBIA_WINDOW_CLASSES.modalWindow}>
        {/* Header da janela (SEMPRE igual) */}
        <div className={TIBIA_WINDOW_CLASSES.header}>
          <div className="flex items-center gap-2">
            <Backpack className="h-4 w-4 text-amber-400" />
            <h2 className={TIBIA_WINDOW_CLASSES.title}>
              Equipment & Inventory
            </h2>
          </div>
          <button
            onClick={onClose}
            className={TIBIA_WINDOW_CLASSES.closeButton}
            title="Fechar Janela"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corpo da janela */}
        <div className={TIBIA_WINDOW_CLASSES.body}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Classic Tibia Paperdoll */}
            <div className="flex flex-col items-center justify-center p-3 rounded border border-[#3d4857] bg-[#1a1f26] shadow-xl">
              <h3 className="text-[10px] font-bold text-[#facc15] uppercase tracking-wider mb-3">
                Character Equipment
              </h3>

              <div className="flex flex-col gap-1 items-center">
                {/* Row 1: Amulet, Helmet, Backpack */}
                <div className="flex gap-1">
                  {renderSlot('amulet', 'Neck')}
                  {renderSlot('helmet', 'Head')}
                  {renderSlot('backpack', 'Pack')}
                </div>

                {/* Row 2: Weapon, Armor, Shield */}
                <div className="flex gap-1">
                  {renderSlot('weapon', 'Wpn')}
                  {renderSlot('armor', 'Body')}
                  {renderSlot('shield', 'Shld')}
                </div>

                {/* Row 3: Ring, Legs, Boots */}
                <div className="flex gap-1">
                  {renderSlot('ring', 'Ring')}
                  {renderSlot('legs', 'Legs')}
                  {renderSlot('boots', 'Boot')}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-[10px] text-slate-300 font-mono">
                <div>Cap: <span className="font-bold text-slate-200">{character.capacity} oz</span></div>
                <div>Gold: <span className="font-bold text-[#facc15]">{character.gold}</span></div>
              </div>
            </div>

            {/* Right: Backpack Grid & Selected Item Info */}
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded border border-[#3d4857] bg-[#1a1f26] shadow-xl">
                <div className="flex items-center justify-between text-[10px] font-bold text-[#facc15] uppercase tracking-wider mb-2">
                  <span>Backpack ({character.inventory.length}/24)</span>
                </div>

                <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-1">
                  {character.inventory.map((invItem) => {
                    const def = ITEMS_DATABASE[invItem.defId];
                    if (!def) return null;

                    const isSelected = selectedItem?.instanceId === invItem.instanceId;
                    const badgeClass = getRarityBadge(def.rarity);
                    const selectedBorder = isSelected ? 'border-[#facc15] ring-1 ring-[#facc15]' : '';

                    return (
                       <button
                         key={invItem.instanceId}
                         onClick={() => setSelectedItem(invItem)}
                         className={`group relative flex aspect-square w-full cursor-pointer items-center justify-center rounded border shadow-inner transition hover:border-[#facc15] ${badgeClass} ${selectedBorder}`}
                         title={`${def.name} x${invItem.count}`}
                       >
                         <ItemIcon defId={def.id} className="h-8 w-8 object-contain" />
                         {invItem.count > 1 && (
                           <span className="absolute bottom-0 right-0.5 text-[8px] font-mono font-bold text-[#facc15] drop-shadow">
                             {invItem.count}
                           </span>
                         )}
                       </button>
                    );
                  })}

                  {/* Empty slots placeholders */}
                  {Array.from({ length: Math.max(0, 24 - character.inventory.length) }).map((_, idx) => (
                    <div
                      key={`empty_${idx}`}
                      className="aspect-square rounded border border-[#2d3744] bg-[#090c10] shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Selected Item Details */}
              {selectedItem && selectedDef ? (
                <div className="p-3 rounded border border-[#3d4857] bg-[#1a1f26] flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-xs font-bold ${
                        selectedDef.rarity === 'unique' ? 'text-amber-300' : selectedDef.rarity === 'rare' ? 'text-cyan-300' : 'text-slate-200'
                      }`}>
                        {selectedDef.name}
                      </h4>
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                        {selectedDef.rarity} {selectedDef.type}
                      </span>
                    </div>
                    <div className="text-right text-[10px] font-mono font-bold text-[#facc15]">
                      Sell: {Math.max(1, Math.floor(selectedDef.price * 0.4 * (selectedItem.count || 1)))}g
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ItemIcon defId={selectedDef.id} className="h-12 w-12 object-contain" />
                    <p className="text-[10px] text-slate-300 italic flex-1">
                      "{selectedDef.description}"
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-mono mt-1">
                    {selectedDef.attack && <span className="text-rose-400 font-bold">Atk: +{selectedDef.attack}</span>}
                    {selectedDef.defense && <span className="text-emerald-400 font-bold">Def: +{selectedDef.defense}</span>}
                    {selectedDef.armor && <span className="text-cyan-400 font-bold">Arm: +{selectedDef.armor}</span>}
                    {selectedDef.magicBoost && <span className="text-purple-400 font-bold">ML: +{selectedDef.magicBoost}</span>}
                    {selectedDef.healthRestore && <span className="text-emerald-400 font-bold">Heals: {selectedDef.healthRestore} HP</span>}
                    {selectedDef.manaRestore && <span className="text-cyan-400 font-bold">Restores: {selectedDef.manaRestore} MP</span>}
                    {selectedDef.reqLevel && <span className="text-amber-300 font-bold">Lv {selectedDef.reqLevel}+</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#3d4857]">
                    {selectedDef.slot && (
                      <button
                        onClick={() => {
                          onEquip(selectedItem.instanceId, selectedDef.slot!);
                          setSelectedItem(null);
                          sounds.playSwordSwing();
                        }}
                        className="flex-1 py-1 rounded border-2 border-[#5c4a38] bg-[#1a1f26] text-[10px] font-bold text-amber-300 shadow-xl hover:bg-[#252c38] transition"
                      >
                        Equip Item
                      </button>
                    )}

                    {selectedDef.type === 'potion' && (
                      <button
                        onClick={() => {
                          onUseItem(selectedDef.id);
                          sounds.playHeal();
                        }}
                        className="flex-1 py-1 rounded border-2 border-[#5c4a38] bg-[#1a1f26] text-[10px] font-bold text-emerald-400 shadow-xl hover:bg-[#252c38] transition"
                      >
                        Drink Potion
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSellItem(selectedItem.instanceId);
                        setSelectedItem(null);
                        sounds.playCoin();
                      }}
                      className="px-3 py-1 rounded border border-[#3d4857] bg-[#202731] hover:bg-[#2b3442] text-amber-300 transition text-[10px] font-bold flex items-center gap-1"
                      title="Sell to Merchant"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Sell</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#090c10] border border-dashed border-[#2d3744] rounded p-4 text-center text-[10px] text-slate-500">
                  Select an item from the backpack to view details and equip/sell.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

