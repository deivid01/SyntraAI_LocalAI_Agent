import { executeIntent } from '../automation/commandExecutor';
import { memoryService } from '../modules/memoryService';
import { ragService } from '../ai/ragService';
import { synapseService } from '../ai/synapseService';
import logger from '../core/logger';

async function runTests() {
  logger.info('TestSuite', '🚀 Iniciando Verificação Global do Syntra AI...');

  // 1. Test OS Intents (Mocked/Safe)
  logger.info('TestSuite', 'Testing OS: volume_up');
  const resVolume = await executeIntent({ intent: 'volume_up', params: {}, raw: 'aumentar volume' });
  console.log('Result volume_up:', resVolume.success ? 'PASS' : 'FAIL', resVolume.error || '');

  // 2. Test File System (Safe Path)
  const testFile = 'C:\\Users\\Wellington Luiz\\Documents\\Jarvis\\tmp\\test_verification.txt';
  logger.info('TestSuite', 'Testing FileSystem: create_file');
  const resFile = await executeIntent({ 
    intent: 'create_file', 
    params: { path: testFile, content: 'Syntra AI Verification 2026' }, 
    raw: 'criar arquivo de teste' 
  });
  console.log('Result create_file:', resFile.success ? 'PASS' : 'FAIL', resFile.error || '');

  // 3. Test Synapse RAG Ingestion
  logger.info('TestSuite', 'Testing Synapse: processFile');
  try {
    // We create a dummy file for training
    const trainingFile = 'C:\\Users\\Wellington Luiz\\Documents\\Jarvis\\tmp\\training_data.txt';
    require('fs').writeFileSync(trainingFile, 'O segredo do Syntra AI é a sua arquitetura modular e escalável baseada em Repositories e Services.');
    
    await synapseService.processFile(trainingFile, 'secret_architecture.txt');
    console.log('Result Synapse Upload: PASS');

    // 4. Test RAG Search
    logger.info('TestSuite', 'Testing RAG: semanticSearch');
    await synapseService.toggleTrainingMode(true);
    const topChunks = await ragService.semanticSearch('qual o segredo do syntra ai?', 1);
    const found = topChunks.some(c => c.content.includes('arquitetura modular'));
    console.log('Result RAG Search:', found ? 'PASS' : 'FAIL');
  } catch (err: any) {
    console.log('Result RAG Test: FAIL', err.message);
  }

  // 5. Test Fast-Path Router
  logger.info('TestSuite', 'Testing Fast-Path: cache & lookup');
  const fastPathRouter = require('../core/fastPathRouter').default;
  fastPathRouter.cacheIntent('teste rapido', { intent: 'test_success', params: {} });
  const cached = fastPathRouter.tryFastPath('teste rapido');
  console.log('Result Fast-Path:', cached?.intent === 'test_success' ? 'PASS' : 'FAIL');

  logger.info('TestSuite', '🏁 Verificação concluída.');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Suite Crashed:', err);
  process.exit(1);
});
