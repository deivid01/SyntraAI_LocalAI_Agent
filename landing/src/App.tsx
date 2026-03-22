import { motion } from 'framer-motion';
import { BrainCircuit, Zap, Mic, GlobeLock, Code, Database, Layers, CheckCircle2 } from 'lucide-react';

// Import assets directly so Vite handles hashing and base paths correctly for GitHub Pages
import logo from './assets/logo.png';
import heroImg from './assets/hero.png';
import showcase1 from './assets/imgs_lp/1.png'; // Main UI
import showcase2 from './assets/imgs_lp/2.png'; // Real-time Logs
import showcase3 from './assets/imgs_lp/3.png'; // Original RAG/File list
import rag1 from './assets/imgs_lp/4.png';      // Synapse Access Dashboard
import rag2 from './assets/imgs_lp/5.png';      // Training Mode Injection

const App = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Syntra AI" className="h-8 object-contain" />
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-indigo-300">
              Syntra AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Princípios</a>
            <a href="#showcase" className="hover:text-white transition-colors">Interface</a>
            <a href="#rag" className="hover:text-white transition-colors">Synapse RAG</a>
          </div>
          <a 
            href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" 
            target="_blank" 
            rel="noreferrer"
            className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
          >
            <Code size={16} />
            <span>GitHub Repository</span>
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="mb-8"
          >
            <img 
              src={heroImg} 
              alt="Syntra Icon" 
              className="h-32 md:h-48 object-contain animate-float drop-shadow-[0_0_35px_rgba(139,92,246,0.5)]"
            />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl"
          >
            Inteligência Artificial <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-indigo-400 to-cyan-400">
              100% Local e Privada.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl font-light"
          >
            Controle seu computador e automatize tarefas usando LLMs rodando na sua própria máquina. Sem nuvem, sem assinaturas, sem perda de dados.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <a href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" target="_blank" rel="noreferrer" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:scale-105 flex items-center justify-center gap-2">
              Explore o Repositório
              <Code size={20} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Main Showcase */}
      <section id="showcase" className="px-6 pb-32 relative z-20">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card rounded-2xl md:rounded-[40px] p-2 md:p-4 shadow-2xl border border-white/10"
          >
            <img 
              src={showcase1} 
              alt="Syntra UI Desktop" 
              className="w-full h-auto rounded-xl md:rounded-[32px] object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-black/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <GlobeLock size={32} className="text-purple-400" />,
                title: "Invisível para a Rede",
                desc: "Seus dados nunca saem do seu SSD. A IA é isolada, rodando via Ollama e Whisper local."
              },
              {
                icon: <Zap size={32} className="text-amber-400" />,
                title: "Controle Operacional",
                desc: "Execute comandos de sistema, abra apps e manipule arquivos através de voz ou texto."
              },
              {
                icon: <Mic size={32} className="text-cyan-400" />,
                title: "Fala e Audição Natural",
                desc: "Motor TTS personalizado e STT de baixa latência para uma interação fluida em português."
              }
            ].map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card p-8 rounded-3xl hover:bg-white/2 transition-colors"
              >
                <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  {feat.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-gray-400 leading-relaxed font-light">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* RAG Section */}
      <section id="rag" className="py-32 px-6 bg-linear-to-b from-transparent to-purple-900/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-bold mb-6">
              <Database size={14} />
              SYNAPSE ENGINE (RAG)
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">A Memória Infinita do seu PC</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
              Transformamos seus documentos PDF, TXT e Markdown em vetores neurais para que a IA possa consultar qualquer detalhe dos seus arquivos privados.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <motion.div 
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="space-y-8"
            >
               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Ingestão de Dados em Massa</h4>
                    <p className="text-gray-400 font-light">Arraste e solte seus arquivos diretamente no hub de documentos para uma indexação local instantânea.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Neural Overview</h4>
                    <p className="text-gray-400 font-light">Visualize em tempo real o status dos vetores, chunks de memória e a atividade do motor RAG.</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Treinamento Contextual</h4>
                    <p className="text-gray-400 font-light">Ative ou desative a injeção de memória RAG conforme a necessidade da conversa, otimizando o processamento.</p>
                  </div>
               </div>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               className="relative grid grid-cols-1 gap-4"
            >
              <div className="glass-card rounded-2xl p-1 relative z-10 overflow-hidden shadow-2xl">
                <img src={rag1} alt="RAG Dashboard" className="w-full rounded-xl" />
              </div>
              <div className="glass-card rounded-2xl p-1 absolute -bottom-10 -right-10 md:-right-20 w-3/4 z-20 shadow-2xl border-white/20 transform rotate-2">
                <img src={rag2} alt="RAG Training Mode" className="w-full rounded-xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Real-time Logs Section */}
      <section className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-6 tracking-widest uppercase">
              Debug & Transparência
            </div>
            <h2 className="text-4xl font-bold mb-6">Acompanhe a Execução em Tempo Real</h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-8 font-light">
              Diferente de IAs "caixa-preta", o Syntra AI exibe cada passo do pipeline de voz, transcrição e consulta ao LLM. Você vê exatamente o que está acontecendo sob o capô.
            </p>
            <div className="space-y-4">
               {[
                 "Logs de Pipeline STT/TTS",
                 "Monitor de Memória RAM System-Aware",
                 "Fallback Inteligente de Processamento"
               ].map((text, i) => (
                 <div key={i} className="flex items-center gap-3 text-gray-300">
                   <CheckCircle2 size={18} className="text-cyan-400" />
                   <span className="font-light">{text}</span>
                 </div>
               ))}
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="glass-card rounded-[32px] p-2 relative group italic">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[34px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src={showcase2} alt="Real-time Logs" className="rounded-[24px] w-full border border-white/5" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Synapse Grid (Additional images context) */}
      <section className="py-24 px-6 relative">
         <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
               <h2 className="text-4xl font-bold mb-6">Orquestração de Arquivos</h2>
               <p className="text-gray-400 text-lg mb-8 font-light">
                  A nossa interface de Gerenciamento de Synapse permite que você selecione granularmente quais bases de conhecimento serão ativadas para o LLM.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                     <Layers className="text-purple-400 mb-4" />
                     <h5 className="font-bold mb-2">Modular</h5>
                     <p className="text-xs text-gray-500">Bases separadas por projeto ou assunto.</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                     <Database className="text-indigo-400 mb-4" />
                     <h5 className="font-bold mb-2">Escalável</h5>
                     <p className="text-xs text-gray-500">Milhares de chunks processados localmente.</p>
                  </div>
               </div>
            </div>
            <motion.div 
               initial={{ opacity: 0, x: 30 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="lg:w-1/2"
            >
               <img src={showcase3} alt="Base list" className="rounded-[32px] shadow-2xl border border-white/5" />
            </motion.div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 relative border-t border-white/5">
         <div className="max-w-4xl mx-auto text-center relative z-10 glass-card p-12 md:p-20 rounded-[40px]">
            <BrainCircuit size={48} className="mx-auto mb-6 text-purple-400" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Evolua seu Workspace</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto font-light">
              O projeto está em constante evolução. Contribua com a comunidade localizando modelos e melhorando a lógica de automação.
            </p>
            <a 
              href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" 
              target="_blank" 
              rel="noreferrer"
              className="bg-white text-black hover:bg-gray-200 px-10 py-5 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] inline-block"
            >
              Github do Projeto
            </a>
         </div>

         <div className="max-w-7xl mx-auto mt-24 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
            <div className="flex items-center gap-2 font-medium mb-4 md:mb-0">
               <img src={logo} alt="logo footer" className="h-5 opacity-50" />
               © 2026 Syntra AI.
            </div>
            <div className="flex gap-8">
              <a href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" className="hover:text-white transition-colors">Código Fonte</a>
              <span className="hover:text-white cursor-pointer transition-colors">Portfólio</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contribute</span>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default App;
