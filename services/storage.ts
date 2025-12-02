
import { FrameData, CaptionOption, SubPanel } from './gemini';
import { WorkflowStep } from '../components/art/types';
import { Tag } from '../types';

export interface ProjectState {
  id: string; // UUID - PRIMARY KEY
  name: string; // Project Name (Editable)
  videoUrl: string; // The playable stream URL (can change over time for same ID)
  
  // Source Tracking for Restoration
  sourceType: 'local' | 'web'; 
  originalSource: string; // For web: the share link; For local: original filename (reference)

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
  
  videoBlob?: Blob; // Optional local caching
}

const DB_NAME = 'ClipSketchDB';
const STORE_NAME = 'projects';
const DB_VERSION = 2; // Keep at 2 for now, schema compatible

export class StorageService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (db.objectStoreNames.contains(STORE_NAME)) {
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
          const existing = request.result;
          if (existing) {
             // Merge updates
             const updated = { ...existing, ...updates, id, lastUpdated: Date.now() };
             const putReq = store.put(updated);
             putReq.onsuccess = () => resolve();
             putReq.onerror = () => reject(putReq.error);
          } else {
             // Fallback for new projects created via update
             const newProject = { 
                 id, 
                 name: 'New Project', 
                 videoUrl: '', 
                 lastUpdated: Date.now(), 
                 sourceFrames: [],
                 stepDescriptions: [],
                 subPanels: [],
                 captionOptions: [],
                 sourceType: 'local', // Default fallback
                 originalSource: '',
                 ...updates 
             } as ProjectState;
             const putReq = store.put(newProject);
             putReq.onsuccess = () => resolve();
             putReq.onerror = () => reject(putReq.error);
          }
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

  static async getAllProjects(): Promise<ProjectState[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result as ProjectState[];
          // Sort by lastUpdated desc
          results.sort((a, b) => b.lastUpdated - a.lastUpdated);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
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
