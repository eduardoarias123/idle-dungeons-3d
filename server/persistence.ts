import fs from 'fs';
import path from 'path';
import { CharacterData } from '../src/types/game';

export interface DatabaseSchema {
  version: number;
  characters: Record<string, CharacterData>;
  accounts: Record<string, { username: string; characterId: string; createdAt: number }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'game_database.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedbacks.json');

export interface PlaytestFeedback {
  id: string;
  category: 'bug' | 'balance' | 'suggestion' | 'performance';
  rating: number;
  title: string;
  description: string;
  characterName: string;
  vocation: string;
  level: number;
  currentMapId: string;
  floorNumber?: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  isAutoHunting: boolean;
  screenResolution?: string;
  userAgent?: string;
  recentLogs?: string[];
  createdAt: number;
}

class DatabaseManager {
  private data: DatabaseSchema = {
    version: 1,
    characters: {},
    accounts: {},
  };

  private feedbacks: PlaytestFeedback[] = [];
  private dirty = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          version: parsed.version || 1,
          characters: parsed.characters || {},
          accounts: parsed.accounts || {},
        };
        console.log(`[Persistence] Loaded database with ${Object.keys(this.data.characters).length} characters.`);
      } else {
        this.save();
        console.log('[Persistence] Initialized new persistent game database.');
      }

      if (fs.existsSync(FEEDBACK_FILE)) {
        const rawFeedback = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
        this.feedbacks = JSON.parse(rawFeedback) || [];
        console.log(`[Persistence] Loaded ${this.feedbacks.length} playtest feedback reports.`);
      }
    } catch (err) {
      console.error('[Persistence] Failed to read database, starting fresh:', err);
    }

    // Auto-save interval every 5 seconds
    setInterval(() => {
      if (this.dirty) {
        this.save();
      }
    }, 5000);
  }

  public getCharacter(id: string): CharacterData | null {
    return this.data.characters[id] ? JSON.parse(JSON.stringify(this.data.characters[id])) : null;
  }

  public getCharacterByName(name: string): CharacterData | null {
    const lower = name.trim().toLowerCase();
    for (const char of Object.values(this.data.characters)) {
      if (char.name.toLowerCase() === lower) {
        return JSON.parse(JSON.stringify(char));
      }
    }
    return null;
  }

  public saveCharacter(char: CharacterData): void {
    char.lastSavedAt = Date.now();
    this.data.characters[char.id] = JSON.parse(JSON.stringify(char));
    this.dirty = true;
  }

  public linkAccount(username: string, characterId: string): void {
    this.data.accounts[username.toLowerCase()] = {
      username,
      characterId,
      createdAt: Date.now(),
    };
    this.dirty = true;
  }

  public getAccount(username: string) {
    return this.data.accounts[username.toLowerCase()] || null;
  }

  public saveFeedback(feedback: PlaytestFeedback): void {
    this.feedbacks.unshift(feedback);
    // Keep up to 200 most recent feedback reports
    if (this.feedbacks.length > 200) {
      this.feedbacks = this.feedbacks.slice(0, 200);
    }
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(this.feedbacks, null, 2), 'utf-8');
      console.log(`[Persistence] Saved new feedback #${feedback.id} (${feedback.category}): "${feedback.title}"`);
    } catch (e) {
      console.error('[Persistence] Error writing feedbacks file:', e);
    }
  }

  public getFeedbacks(): PlaytestFeedback[] {
    return [...this.feedbacks];
  }

  public getAllCharacters(): CharacterData[] {
    return Object.values(this.data.characters);
  }

  public save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      this.dirty = false;
    } catch (err) {
      console.error('[Persistence] Error saving database file:', err);
    }
  }
}

export const db = new DatabaseManager();
