import { ParsedIntent } from './intentParser';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface LLMResponse {
  intent: string;
  response?: string;
  params?: Record<string, unknown>;
}

export type Dispatcher = (intent: ParsedIntent) => Promise<ExecutionResult>;

// --- Domain Entities ---

export interface IInteraction {
  id?: number | string;
  timestamp?: string;
  input: string;
  intent: string;
  response?: string;
  params: string; // JSON string in DB
  success: number; // 0 or 1
}

export interface ICommandRecord {
  id?: number | string;
  timestamp?: string;
  command: string;
  params?: string;
  output?: string;
  success: number;
}

export interface ISequence {
  name: string;
  steps: string; // JSON string
  created_at?: string;
}

export interface ISynapseFile {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
  created_at?: string;
}

export interface ISynapseChunk {
  id: string;
  file_id: string;
  chunk_index: number;
  content: string;
  embedding_json: string;
}

export interface ISynapseLog {
  id?: number;
  event: string;
  message: string;
  created_at?: string;
}

// --- Repository Interfaces ---

export interface IRepository<T> {
  save(entity: T): Promise<void>;
  getAll(): Promise<T[]>;
  getById(id: string | number): Promise<T | null>;
  delete(id: string | number): Promise<void>;
}

export interface IInteractionRepository extends IRepository<IInteraction> {
  getRecent(limit: number): Promise<IInteraction[]>;
}

export interface ISequenceRepository extends IRepository<ISequence> {
  findByName(name: string): Promise<ISequence | null>;
}

export interface ISynapseRepository {
  saveFile(file: ISynapseFile): Promise<void>;
  updateFileStatus(id: string, status: string): Promise<void>;
  saveChunk(chunk: ISynapseChunk): Promise<void>;
  getFiles(): Promise<ISynapseFile[]>;
  getProcessedChunks(): Promise<any[]>;
  getChunksForFile(file_id: string): Promise<ISynapseChunk[]>;
  logEvent(event: string, message: string): Promise<void>;
  getLogs(): Promise<ISynapseLog[]>;
  getStats(): Promise<{ total_files: number; total_chunks: number; training_active: boolean }>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}
