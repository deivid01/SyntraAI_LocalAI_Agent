document.addEventListener('DOMContentLoaded', () => {
  const btnOpen = document.getElementById('synapse-access-btn') as HTMLButtonElement | null;
  const modal = document.getElementById('synapse-modal') as HTMLDivElement | null;
  const btnClose = document.getElementById('synapse-close') as HTMLButtonElement | null;
  const tabBtns = document.querySelectorAll('.synapse-tab-btn');
  const tabContents = document.querySelectorAll('.synapse-tab-content');

  // Stats
  const statFiles = document.getElementById('synapse-stat-files');
  const statChunks = document.getElementById('synapse-stat-chunks');
  const statStatus = document.getElementById('synapse-stat-status');
  
  // Toggle
  const toggleInput = document.getElementById('synapse-training-toggle') as HTMLInputElement | null;
  const toggleLabel = document.getElementById('synapse-toggle-label');

  // Upload
  const dropzone = document.getElementById('synapse-dropzone');
  const browseBtn = document.getElementById('synapse-browse-btn');
  const fileInput = document.getElementById('synapse-file-input') as HTMLInputElement | null;
  const progressDiv = document.getElementById('synapse-upload-progress');
  const progressText = document.getElementById('synapse-progress-text');
  
  // Data / Logs
  const filesTbody = document.querySelector('#synapse-files-table tbody');
  const logsList = document.getElementById('synapse-logs-list');

  // Core Modal Logic
  if (btnOpen && modal && btnClose) {
    btnOpen.addEventListener('click', () => {
      modal.classList.remove('hidden');
      refreshAll();
    });
    btnClose.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  }

  // Tabs
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLElement;
      const tabName = target.getAttribute('data-tab');

      tabBtns.forEach(b => {
        b.classList.remove('active', 'bg-white/5', 'text-white');
        b.classList.add('text-zinc-400');
      });
      tabContents.forEach(c => c.classList.add('hidden'));

      target.classList.add('active', 'bg-white/5', 'text-white');
      target.classList.remove('text-zinc-400');
      
      const content = document.getElementById(`tab-${tabName}`);
      if (content) {
         content.classList.remove('hidden');
         // Slider animation or other effects can be added here
         if (tabName === 'data') loadFiles();
         if (tabName === 'logs') loadLogs();
      }
    });
  });

  // Fetch Stats
  async function loadStats() {
    try {
      const stats = await window.syntra.synapseGetStats();
      if (statFiles) statFiles.innerText = stats.total_files.toString();
      if (statChunks) statChunks.innerText = stats.total_chunks.toString();
      if (statStatus) {
        if (stats.training_active) {
          statStatus.innerText = 'ACTIVE';
          statStatus.className = 'text-xl font-black uppercase text-emerald-500 tracking-tighter animate-pulse';
        } else {
          statStatus.innerText = 'OFFLINE';
          statStatus.className = 'text-xl font-black uppercase text-red-500 tracking-tighter';
        }
      }
      if (toggleInput) toggleInput.checked = stats.training_active;
    } catch (e) {
      console.error('Failed to load Synapse stats:', e);
    }
  }

  // Toggle Mode
  if (toggleInput) {
    toggleInput.addEventListener('change', async (e) => {
      const active = (e.target as HTMLInputElement).checked;
      await window.syntra.synapseToggleTraining(active);
      loadStats();
    });
  }

  // Upload Handling (File browse)
  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        await processFiles(Array.from(files));
        fileInput.value = ''; // Reset
      }
    });
  }

  // Upload Handling (Drag and Drop)
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        await processFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  async function processFiles(files: File[]) {
    if (progressDiv) progressDiv.classList.remove('hidden');
    
    for (const file of files) {
      if (progressText) progressText.innerText = file.name;
      try {
        // file.path only works in Electron environment natively allowing file paths, which nodeIntegration=false breaks.
        // But our contextBridge expects string args. Actually `file.path` works inside the renderer in Electron.
        const filePath = (file as any).path; 
        if (!filePath) {
          console.error("Browser restricted absolute path access.");
          continue;
        }
        await window.syntra.synapseUploadFile(filePath, file.name);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    if (progressDiv) progressDiv.classList.add('hidden');
    refreshAll();
  }

  // Load Data Table
  async function loadFiles() {
    if (!filesTbody) return;
    try {
      const files = await window.syntra.synapseGetFiles();
      filesTbody.innerHTML = '';
      files.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${f.name}</td>
          <td>${f.type.toUpperCase()}</td>
          <td style="color:${f.status === 'processed' ? '#0f0' : (f.status === 'error' ? '#f00' : '#ffa500')}">${f.status.toUpperCase()}</td>
          <td>${new Date(f.created_at).toLocaleString()}</td>
        `;
        filesTbody.appendChild(tr);
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Load Logs
  async function loadLogs() {
    if (!logsList) return;
    try {
      const logs = await window.syntra.synapseGetLogs();
      logsList.innerHTML = '';
      logs.forEach(lg => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span class="synapse-log-time">[${new Date(lg.created_at).toLocaleTimeString()}]</span>
          <span class="synapse-log-event">${lg.event}</span>
          <span>${lg.message}</span>
        `;
        logsList.appendChild(li);
      });
    } catch (e) {
      console.error(e);
    }
  }

  function refreshAll() {
    loadStats();
    loadFiles();
    loadLogs();
  }
});
