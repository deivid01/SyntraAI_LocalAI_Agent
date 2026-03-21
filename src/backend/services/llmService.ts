import axios from 'axios';
import { config } from '../utils/config';
import logger from '../utils/logger';
import memoryService from './memoryService';

export interface LLMResponse {
  intent: string;
  response?: string;
  params?: Record<string, unknown>;
}

async function callOllama(model: string, prompt: string): Promise<string> {
  const url = `${config.ollamaUrl}/api/generate`;
  const body = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.3,
      num_predict: 300,
      top_k: 10,
      top_p: 0.9,
    },
  };

  const response = await axios.post(url, body, { timeout: 120000 }); // 120s for slow CPU inference
  return response.data.response as string;
}

async function buildPrompt(userInput: string): Promise<string> {
  const context = await memoryService.getContextSummary(3);
  const contextSection = context ? `\n\nContexto recente:\n${context}\n` : '';
  return `${config.systemPrompt}${contextSection}\n\nComando do usuário: ${userInput}\n\nResposta JSON:`;
}

function parseJSON(raw: string): LLMResponse | null {
  // Extract JSON from response (model may add extra text)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as LLMResponse;
    if (!parsed.intent) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function queryLLM(userInput: string): Promise<LLMResponse> {
  const prompt = await buildPrompt(userInput);
  logger.info('LLM', `Consultando modelo: ${config.ollamaModel}`);

  let raw: string;

  try {
    raw = await callOllama(config.ollamaModel, prompt);
  } catch (primaryErr) {
    logger.warn('LLM', `Falha com modelo primário (${config.ollamaModel}), tentando fallback...`, primaryErr);
    try {
      raw = await callOllama(config.ollamaFallbackModel, prompt);
    } catch (fallbackErr) {
      logger.error('LLM', 'Falha também no modelo fallback.', fallbackErr);
      return {
        intent: 'chat',
        response: 'Desculpe, não consegui me conectar ao motor de IA. Verifique se o Ollama está rodando.',
        params: {},
      };
    }
  }

  logger.debug('LLM', 'Resposta bruta:', raw);
  const parsed = parseJSON(raw);

  if (!parsed) {
    logger.warn('LLM', 'Resposta não era JSON válido, usando como chat.', raw);
    return {
      intent: 'chat',
      response: raw.substring(0, 300),
      params: {},
    };
  }

  logger.info('LLM', `Intent detectado: ${parsed.intent}`, parsed.params);
  return parsed;
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await axios.get(`${config.ollamaUrl}/api/tags`, { timeout: 10000 }); // 10s for health check
    return true;
  } catch {
    return false;
  }
}
