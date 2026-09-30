// @ts-nocheck
import { type Message } from 'ai';

const STORAGE_KEYS = {
  CHAT_HISTORY: 'tattoo_chat_history',
  SAVED_STYLES: 'tattoo_saved_styles',
  IMAGES: 'tattoo_images',
};

const MAX_IMAGE_STORAGE_SIZE = 4.5 * 1024 * 1024;

export type TattooStyle = {
  id: string;
  inkPalette: string[];
  technique: string;
  lineWeight: string;
  scale: number;
  previewUrl?: string;
  createdAt: number;
}

export const getChatHistory = (): Message[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
  return stored ? JSON.parse(stored) : [];
};

export const saveChatHistory = (messages: Message[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
};

export const getSavedStyles = (): TattooStyle[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.SAVED_STYLES);
  return stored ? JSON.parse(stored) : [];
};

export const saveStyle = (style: TattooStyle) => {
  if (typeof window === 'undefined') return;
  const styles = getSavedStyles();
  styles.unshift(style);
  localStorage.setItem(STORAGE_KEYS.SAVED_STYLES, JSON.stringify(styles));
};

interface ImageCacheItem {
  id: string;
  dataUrl: string;
  timestamp: number;
}

const getImageCache = (): ImageCacheItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.IMAGES);
  return stored ? JSON.parse(stored) : [];
}

const saveImageCache = (cache: ImageCacheItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.IMAGES, JSON.stringify(cache));
}

const calculateCacheSize = (cache: ImageCacheItem[]): number => {
  return JSON.stringify(cache).length;
}

export const saveImage = (id: string, dataUrl: string): string => {
  if (typeof window === 'undefined') return id;

  let cache = getImageCache();
  cache = cache.filter(item => item.id !== id);
  cache.unshift({ id, dataUrl, timestamp: Date.now() });

  while (calculateCacheSize(cache) > MAX_IMAGE_STORAGE_SIZE && cache.length > 1) {
    cache.pop();
  }

  saveImageCache(cache);
  return id;
}

export const getImage = (id: string): string | null => {
  if (typeof window === 'undefined') return null;
  const cache = getImageCache();
  const item = cache.find(img => img.id === id);
  if (item) {
    item.timestamp = Date.now();
    const newCache = [item, ...cache.filter(img => img.id !== id)];
    saveImageCache(newCache);
    return item.dataUrl;
  }
  return null;
}
