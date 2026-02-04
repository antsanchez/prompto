import { Injectable } from '@angular/core';
import { STORAGE_KEYS, DEFAULTS } from '../core/constants';

export type StoredItem = {
  key: string;
  name: string;
};

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  getRawItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading raw item from localStorage key "${key}":`, error);
      return null;
    }
  }

  setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  }

  setRawItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing raw item to localStorage key "${key}":`, error);
      return false;
    }
  }

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  }

  getKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Error getting localStorage keys:', error);
      return [];
    }
  }

  getKeysWithPrefix(prefix: string): string[] {
    return this.getKeys().filter(key => key.startsWith(prefix));
  }

  removeItemsWithPrefix(prefix: string): void {
    const keys = this.getKeysWithPrefix(prefix);
    keys.forEach(key => this.removeItem(key));
  }

  private loadItemsByPrefix(
    prefix: string,
    nameProperty: string,
    defaultName: string
  ): StoredItem[] {
    const items: StoredItem[] = [];
    const keys = this.getKeysWithPrefix(prefix);

    for (const key of keys) {
      try {
        const item = this.getItem<Record<string, unknown>>(key);
        if (item) {
          items.push({
            key,
            name: (item[nameProperty] as string) || defaultName
          });
        }
      } catch (error) {
        console.error(`Error loading item with key "${key}":`, error);
      }
    }

    return items;
  }

  loadChats(): StoredItem[] {
    return this.loadItemsByPrefix(STORAGE_KEYS.CHAT, 'name', DEFAULTS.UNTITLED_CHAT);
  }

  loadArenas(): StoredItem[] {
    return this.loadItemsByPrefix(STORAGE_KEYS.ARENA, 'name', DEFAULTS.UNTITLED_ARENA);
  }

  loadDiscussions(): StoredItem[] {
    return this.loadItemsByPrefix(STORAGE_KEYS.DISCUSSION, 'title', DEFAULTS.UNTITLED_DISCUSSION);
  }
}
