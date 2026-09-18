import { ITEMS_DATABASE } from '../../constants/items';

const iconCache = new Map<string, HTMLImageElement | null>();

function getIcon(defId: string): string {
  const item = ITEMS_DATABASE[defId];
  if (!item) return 'QuestionMark';
  return item.icon || 'QuestionMark';
}

async function loadItemIcon(iconPath: string): Promise<HTMLImageElement> {
  const cacheKey = iconPath;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const img = document.createElement('img') as HTMLImageElement;
  img.crossOrigin = 'anonymous';

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => {
      iconCache.set(cacheKey, img);
      resolve(img);
    };
    img.onerror = (err) => {
      iconCache.set(cacheKey, null);
      reject(err);
    };
    img.src = iconPath;
  });

  await promise;
  return img;
}

export async function useItemIcon(defId: string): Promise<{ img: HTMLImageElement | null; icon: string }> {
  const item = ITEMS_DATABASE[defId];
  if (!item) return { img: null, icon: 'QuestionMark' };

  const iconPath = item.iconPath;
  let img: HTMLImageElement | null = null;

  if (iconPath) {
    try {
      img = await loadItemIcon(iconPath);
    } catch (e) {
      console.warn(`Failed to load item icon: ${iconPath}`, e);
      img = null;
    }
  }

  return { img, icon: item.icon || 'QuestionMark' };
}

export function preloadItemIcons(defIds: string[]): void {
  for (const defId of defIds) {
    const item = ITEMS_DATABASE[defId];
    if (!item || !item.iconPath) continue;
    loadItemIcon(item.iconPath).catch(() => {});
  }
}

export function clearItemIconCache(): void {
  iconCache.clear();
}

export { getIcon };