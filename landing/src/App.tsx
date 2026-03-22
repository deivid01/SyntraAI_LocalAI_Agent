import { motion } from 'framer-motion';
import { BrainCircuit, Zap, Download, Mic, GlobeLock, Code } from 'lucide-react';

const App = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/syntra_logo.png" alt="Syntra AI" className="h-8 object-contain" />
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-indigo-300">
              Syntra AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Recursos</a>
            <a href="#showcase" className="hover:text-white transition-colors">Interface</a>
            <a href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <button className="bg-white/10 hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2">
            <Download size={16} />
            <span className="hidden sm:inline">Baixar Agora</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img 
              src="/assets/syntra_logo.png" 
              alt="Syntra Logo Hero" 
              className="h-32 md:h-48 object-contain animate-float drop-shadow-[0_0_25px_rgba(139,92,246,0.3)]"
            />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl"
          >
            O fim da dependência da nuvem. <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-400 via-indigo-400 to-cyan-400">
              Inteligência 100% Local.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl font-light"
          >
            O Syntra AI controla seu computador, lê seus documentos e automatiza suas tarefas usando LLMs na sua própria máquina. Nenhuma conversa é enviada para servidores. Privado, rápido e nativo.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button className="bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] flex items-center justify-center gap-2">
              <Download size={20} />
               Download V1.0 (Windows)
            </button>
            <a href="https://github.com/deivid01/SyntraAI_LocalAI_Agent" target="_blank" rel="noreferrer" className="glass hover:bg-white/10 px-8 py-4 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2">
              <Code size={20} />
              Ver Código Fonte
            </a>
          </motion.div>
        </div>
      </section>

      {/* Main App Showcase Float */}
      <section className="px-6 pb-32 relative z-20">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="glass-card rounded-2xl md:rounded-[40px] p-2 md:p-4 shadow-2xl border border-white/10"
          >
            <img 
              src="/assets/imgs_lp/1.png" 
              alt="Syntra Interface Principal" 
              className="w-full h-auto rounded-xl md:rounded-[32px] object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-black/50 border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Poder Computacional Genuíno</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Construído do zero para extrair o máximo do seu hardware através de modelos integrados via Ollama e TTS/STT nativos avançados.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <GlobeLock size={32} className="text-purple-400" />,
                title: "Privacidade Absoluta",
                desc: "Rode modelos gigantes como LLaMA e Phi-3 internamente. Nenhum kilobyte é trafegado pela internet."
              },
              {
                icon: <Zap size={32} className="text-amber-400" />,
                title: "Automação Nativa",
                desc: "Conectado diretamente ao Windows, o Syntra manipula arquivos e executa integrações OS complexas para você."
              },
              {
                icon: <Mic size={32} className="text-cyan-400" />,
                title: "Ouvidos Rápidos",
                desc: "Ativado por voz usando o modelo Whisper local. Respostas de voz ultra-realistas direto na sua saída de som."
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
                <p className="text-gray-400 leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternate Showcase */}
      <section id="showcase" className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-16 mb-32">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Visualização do Pensamento Direta</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Acompanhe o que a memória contextual e o mecanismo LLM estão operando nos bastidores. Com logs em tempo real transparentes, você tem total visibilidade da arquitetura subjacente.
              </p>
              <ul className="space-y-4">
                {['Mecanismo de Hotword Otimizado', 'Visão de Status da Máquina', 'Transcrições Diretas'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <div className="glass-card rounded-[32px] p-2 relative">
                <div className="absolute -inset-1 bg-linear-to-r from-purple-600/30 to-indigo-600/30 rounded-[34px] blur-xl opacity-50 -z-10" />
                <img src="/assets/imgs_lp/2.png" alt="Showcase Memory" className="rounded-[24px] w-full" />
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-16">
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">Contexto Global (RAG) Exclusivo</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-6">
                Gerencie arquivos cruciais usando o Synapse RAG. Syntra armazena e lê documentações complexas localmente no banco de dados isolado da sua máquina, combinando perfeitamente a IA com a vida real. 
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <div className="glass-card rounded-[32px] p-2 relative">
                <div className="absolute -inset-1 bg-linear-to-r from-cyan-600/20 to-blue-600/20 rounded-[34px] blur-xl opacity-50 -z-10" />
                <img src="/assets/imgs_lp/3.png" alt="Showcase RAG" className="rounded-[24px] w-full" />
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-24 px-6 relative border-t border-white/5">
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-purple-900/10 blur-[150px] pointer-events-none" />
         
         <div className="max-w-4xl mx-auto text-center relative z-10 glass-card p-12 md:p-20 rounded-[40px]">
            <BrainCircuit size={48} className="mx-auto mb-6 text-purple-400" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Pronto para ter sua própria IA?</h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Instale, configure o Ollama no seu PC e deixe a mágica do processamento descentralizado e focado em privacidade tomar conta da sua rotina.
            </p>
            <button className="bg-white text-black hover:bg-gray-200 px-10 py-5 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              Descubra no GitHub
            </button>
         </div>

         <div className="max-w-7xl mx-auto mt-24 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm">
            <div className="flex items-center gap-2 font-medium mb-4 md:mb-0">
               <img src="/assets/syntra_logo.png" alt="logo footer" className="h-5 opacity-50" />
               © 2026 Syntra AI.
            </div>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer transition-colors">Portfólio</span>
              <span className="hover:text-white cursor-pointer transition-colors">Repositório</span>
              <span className="hover:text-white cursor-pointer transition-colors">Termos</span>
            </div>
         </div>
      </section>
    </div>
  );
};

export default App;
