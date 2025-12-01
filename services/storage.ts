
import { FrameData, CaptionOption, SubPanel } from './gemini';
import { WorkflowStep } from '../components/art/types';
import { Tag } from '../types';

export interface ProjectState {
  id: string; // Normalized key (e.g. xhslink.com/o/123) - PRIMARY KEY
  videoUrl: string; // The playable stream URL (can change over time for same ID)
  lastUpdated: number;
  tags?: Tag[];
  activeStrategyId: string | null;
  sourceFrames: FrameData[];
  stepDescriptions: string[];
  baseArt: string | null;
  generatedArt: string | null;
  avatarImage: string | null;
  watermarkText: string;
  panelCount: number;
  subPanels: SubPanel[];
  captionOptions: CaptionOption[];
  // New fields
  selectedCaption: CaptionOption | null;
  coverImage: string | null;
  
  workflowStep: WorkflowStep;
  contextDescription: string;
  customPrompt: string;
  batchJobId: string | null;
  batchStatus: 'idle' | 'pending' | 'completed' | 'failed';
  viewStep: number;
}

const DB_NAME = 'ClipSketchDB';
const STORE_NAME = 'projects';
const DB_VERSION = 2; // Bump version to support schema change

export class StorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // If store exists from v1, we might need to recreate it or migrate.
        // For simplicity in this update, we'll create a new store if version changed.
        if (db.objectStoreNames.contains(STORE_NAME)) {
          // Delete old store to apply new keyPath 'id'
          db.deleteObjectStore(STORE_NAME);
        }
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  static async saveProject(state: ProjectState): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ ...state, lastUpdated: Date.now() });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }

  static async updateProject(id: string, updates: Partial<ProjectState>): Promise<void> {
    if (!id) return;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          const existing = request.result || { id };
          // Merge updates, ensure id is preserved
          const updated = { ...existing, ...updates, id, lastUpdated: Date.now() };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  }

  static async getProject(id: string): Promise<ProjectState | null> {
    if (!id) return null;
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }

  static async deleteProject(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }
}
