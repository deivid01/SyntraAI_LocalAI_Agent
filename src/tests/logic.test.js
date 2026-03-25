// Pure logic test for App Mapping
const APP_MAP = {
  chrome: 'chrome.exe',
  'google chrome': 'chrome.exe',
  spotify: 'Spotify.exe',
  notepad: 'notepad.exe',
};

function resolveApp(appName) {
  const lower = appName.toLowerCase().trim();
  return APP_MAP[lower] ?? appName;
}

function generateCmd(appName) {
  const executable = resolveApp(appName);
  // Simulation of osController logic
  let cmd = `start "" "${executable}"`;
  
  // Fallback simulation
  let fallbackCmd = `start "" "${appName}"`;
  if (appName.toLowerCase() === 'chrome') fallbackCmd = 'start chrome';
  if (appName.toLowerCase() === 'spotify') fallbackCmd = 'start spotify';
  
  return { primary: cmd, fallback: fallbackCmd };
}

console.log('--- TESTE DE LÓGICA DE COMANDOS ---');
const apps = ['chrome', 'spotify', 'notepad', 'calc'];
apps.forEach(app => {
  const res = generateCmd(app);
  console.log(`App: ${app} -> Primary: ${res.primary} | Fallback: ${res.fallback}`);
});
console.log('--- FIM DO TESTE ---');
