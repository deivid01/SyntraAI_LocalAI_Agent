import { osHandlers } from '../automation/osController';
import { parseIntent } from '../core/intentParser';

async function runTest() {
  console.log('--- TESTE DE AUTOMAÇÃO SYNTRA AI ---');

  const tests = [
    { name: 'Abrir Chrome', text: 'abra o chrome', intent: 'open_app', params: { app: 'chrome' } },
    { name: 'Abrir Spotify', text: 'abra o spotify', intent: 'open_app', params: { app: 'spotify' } },
    { name: 'Abrir Bloco de Notas', text: 'abra o bloco de notas', intent: 'open_app', params: { app: 'notepad' } }
  ];

  for (const t of tests) {
    console.log(`\n[Teste] ${t.name}...`);
    
    // 1. Simular Parser
    const intent = parseIntent({ intent: t.intent, params: t.params }, t.text);
    console.log(`Intent Parsed: ${intent.intent}`, intent.params);

    // 2. Simular Execução (Mockando o safeExec para não abrir de verdade no servidor se não quisermos, 
    // mas aqui queremos ver se o comando gerado está correto)
    try {
        const result = await osHandlers.open_app(intent);
        if (result.success) {
            console.log(`✅ Sucesso: Aplicativo ${t.params.app} disparado.`);
        } else {
            console.warn(`⚠️ Aviso: ${result.error} (Isso é esperado se o app não estiver instalado no ambiente de teste)`);
        }
    } catch (e) {
        console.error(`❌ Erro crítico no handler:`, e);
    }
  }

  console.log('\n--- FIM DOS TESTES ---');
}

runTest();
