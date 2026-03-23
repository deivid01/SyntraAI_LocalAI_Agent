# ◈ Syntra AI v2.0 — Local Intelligence System

<div align="center">
  <img src="/assets/syntra_logo.png" alt="Syntra AI Logo" width="160" style="margin-bottom: 20px;">

![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge\&logo=electron\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge\&logo=tailwind-css\&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge\&logo=sqlite\&logoColor=white)

  <h3>Private. Local. Intelligent. — Your AI, fully under your control.</h3>

  <p>
    <a href="#-english">English</a> • <a href="#-português">Português</a>
  </p>
</div>

---

# 🇺🇸 English

## 🚀 About the Project

**Syntra AI** is a fully local, modular, and production-ready artificial intelligence system designed to deliver **high-performance automation, contextual intelligence, and complete privacy**.

Unlike cloud-based assistants, Syntra AI runs entirely on your machine, combining:

* 🧠 Local LLMs (via Ollama)
* ⚡ Real-time automation engine
* 📚 Intelligent knowledge ingestion (RAG)
* 🖥️ Desktop experience powered by Electron

> This project was built as a **real-world AI system**, not just a demo.

---

## ✨ Core Features

### 🧠 Multi-Model AI System

* Supports multiple LLMs (phi3, llama3)
* Smart routing between fast and advanced responses
* Context-aware responses with memory

---

### 📚 Synapse Access — AI Training System (RAG)

* Upload PDFs, code, or text files
* Automatic content extraction and chunking
* Semantic search with embeddings
* Injects relevant knowledge into AI responses

---

### ⚙️ Automation Engine

* Natural language → real OS actions
* Mouse & keyboard control
* Script execution
* Automation sequences (create, save, run)

---

### 🧠 Context Memory

* Stores previous actions
* Repeat last command
* Context-aware execution

---

### 🖥️ Modern UI/UX

* SaaS-level interface (Tailwind CSS)
* Dark mode first
* Smooth animations & microinteractions
* Fully responsive layout

---

### 🔒 Privacy First

* 100% local processing
* No external API calls
* Your data never leaves your machine

---

## 🏗️ Architecture

This project follows a **clean and scalable architecture**:

```
src/
 ├── core/          → Core system logic
 ├── modules/       → Independent modules
 ├── features/      → Feature-based structure
 ├── ai/            → AI & RAG system
 ├── automation/    → OS control engine
 ├── database/      → SQLite + repositories
 ├── ui/            → Frontend (Tailwind)
 └── infra/         → Electron + IPC
```

### Patterns Used:

* Service Layer
* Controller Layer
* Repository Pattern
* Modular Feature Architecture

---

## ⚡ How It Works

1. User sends a command
2. System detects intent
3. Routes to:

   * AI (LLM)
   * Automation engine
   * Local execution
4. Injects context (memory + RAG)
5. Returns optimized response

---

## 🧰 Tech Stack

* **Electron** — Desktop application
* **TypeScript** — Strong typing
* **Tailwind CSS v4** — Modern UI
* **SQLite** — Local database
* **Ollama** — Local LLM runtime
* **Node.js** — Backend engine

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/syntra-ai.git
cd syntra-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Ollama

Download and install:
👉 https://ollama.com

### 4. Run the project

```bash
npm start
```

---

## 🤖 First Run (Important)

On the first execution:

* The system will:

  * Check Ollama installation
  * Download required models (phi3, llama3)
  * Prepare AI environment automatically

⏳ This may take a few minutes.

---

## 🧪 Running as Desktop App

```bash
npm run build
```

Or use the generated:

```
SyntraAI.exe
```

✔️ Double-click to run
✔️ No terminal required

---

---

## 📝 Changelog v2.0

### 🚀 New Features
* **Autopilot Learning**: Recursive knowledge expansion system.
* **Intelligent Fallback**: Automatic query splitting and keyword retry logic.
* **Search-First Wikipedia**: Robust page title discovery for 100% success rate on summaries.
* **StackOverflow Advanced**: Deeper integration with code bodies and top answers.
* **RAG Ingestion Queue**: Unified background processing for all source types.
* **Real-time Progress**: Visual ingestion bars and granular activity status.
* **Extended File Support**: Local ingestion of `.ts`, `.js`, `.py`, `.md` and more.

### 🛠️ Improvements
* Fixed `SyntraAI.exe` build process.
* Optimized embedding generation concurrency.
* Advanced telemetry console with API logging.

---

## 👨‍💻 Author

Developed by **Deivid Peres**
Frontend & Fullstack Developer

👉 https://github.com/deivid01

---

---

# 🇧🇷 Português

## 🚀 Sobre o Projeto

O **Syntra AI** é um sistema de inteligência artificial local, modular e pronto para produção, criado para oferecer:

* 🧠 Inteligência contextual
* ⚡ Automação em tempo real
* 🔒 Privacidade total

Tudo rodando **100% localmente**, sem depender de APIs externas.

---

## ✨ Funcionalidades

* Sistema multi-modelo (phi3 + llama3)
* Treinamento de IA via arquivos (RAG)
* Automação de sistema operacional
* Memória contextual
* Interface moderna estilo SaaS
* Execução totalmente local

---

## 📦 Instalação

```bash
npm install
npm start
```

---

---

## 📝 Registro de Alterações (Changelog) v2.0

* **Autopilot Learning**: Expansão recursiva de conhecimento.
* **Fallback Inteligente**: Divisão automática de termos para buscas sem erro.
* **Wikipedia Robusta**: Estratégia Search-First para eliminar erros 404.
* **StackOverflow Avançado**: Captura profunda de respostas e códigos.
* **Fila de Ingestão RAG**: Processamento em segundo plano para todos os arquivos.
* **Progresso em Tempo Real**: Barras de status e telemetria granular na UI.
* **Suporte a Código Local**: Ingestão de arquivos `.ts`, `.py`, `.js` e mais.

---

## 👨‍💻 Autor

Desenvolvido por **Deivid Peres**

---

<div align="center">
  <p><b>Syntra AI © 2026</b></p>
</div>