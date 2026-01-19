import React, { useEffect } from 'react';
import { Icon } from '../components/Icon';

export const LandingScreen: React.FC = () => {
    const [planPeriod, setPlanPeriod] = React.useState<'1month' | '2months'>('1month');
    
    useEffect(() => {
        // Load fonts and scripts if needed
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        // Add landing page specific styles to body class if needed
        document.body.classList.add('landing-page');
        return () => {
            document.body.classList.remove('landing-page');
        };
    }, []);

    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const images = [
        "screen1.jpg", "screen2.jpg", "screen3.jpg", "screen4.jpg",
        "screen5.jpg", "screen6.jpg", "screen7.jpg"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(interval);
    }, [images.length]);

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const openVideo = () => {
        const modal = document.getElementById('videoModal');
        if (modal) modal.classList.add('active');
    };

    const closeVideo = () => {
        const modal = document.getElementById('videoModal');
        if (modal) modal.classList.remove('active');
    };

    return (
        <div className="landing-wrapper bg-[#0f172a] text-white font-['Inter'] relative">
            {/* Custom CSS for Landing Page only */}
            <style>{`
                .landing-wrapper { --primary: #2563eb; --whatsapp: #22c55e; --warning: #f59e0b; }
                .navbar { padding: 15px 0; position: fixed; width: 100%; top: 0; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(10px); z-index: 1000; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                .hero { padding: 120px 0 100px; background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 70%); }
                .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 8px; font-weight: 600; transition: all 0.3s; cursor: pointer; border: none; text-decoration: none; }
                .btn-primary { background: var(--whatsapp); color: white; box-shadow: 0 4px 14px 0 rgba(34, 197, 94, 0.39); }
                .btn-outline { border: 1px solid rgba(255, 255, 255, 0.2); color: white; background: transparent; }
                .pricing-card.featured { border: 2px solid var(--primary); transform: scale(1.05); }
                .video-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; align-items: center; justify-content: center; padding: 20px; }
                .video-modal.active { display: flex; }
                .video-container { width: 90%; max-width: 900px; aspect-ratio: 16/9; position: relative; background: black; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
                .close-video { position: absolute; top: -40px; right: 0; color: white; font-size: 30px; background: none; border: none; cursor: pointer; }
                .urgency-banner { background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%); text-align: center; padding: 12px; margin-top: 70px; }
            `}</style>

            <nav className="navbar">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <a href="#" className="flex items-center gap-2 text-xl font-extrabold">
                        <img src="logo.png" alt="Logo" className="h-10" />
                        Monitor <span className="text-blue-500">Pro</span>
                    </a>
                    <div className="hidden md:flex gap-8 items-center text-gray-400 font-medium">
                        <a href="#funcionalidades" className="hover:text-white">Funcionalidades</a>
                        <a href="#planos" className="hover:text-white">Planos</a>
                        <a href="#faq" className="hover:text-white">Dúvidas</a>
                        <a href="https://wa.me/5522999837547?text=Oi!%20Quero%20testar%20grátis" className="btn btn-primary text-sm px-4 py-2">Testar Grátis</a>
                    </div>
                </div>
            </nav>

            <div className="urgency-banner">
                <p className="font-bold">🎁 LANÇAMENTO ESPECIAL — Desconto válido só até <span>20/01</span></p>
            </div>

            <header className="hero px-4">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Chega de caderno, planilha e <span className="text-blue-500">bagunça.</span>
                        </h1>
                        <p className="text-xl text-gray-400 mb-8">
                            O app que organiza toda a sua van escolar em um só lugar. Rotas, chamada, financeiro, manutenção e contratos — tudo no celular, funcionando até sem internet.
                        </p>
                        <div className="flex flex-wrap gap-4 mb-8">
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-sm">
                                <Icon name="check-circle" className="text-blue-500" size={16} /> Funciona Offline
                            </div>
                            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 text-sm">
                                <Icon name="save" className="text-blue-500" size={16} /> Backup Seguro
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <a href="https://wa.me/5522999837547?text=Oi!%20Quero%20testar%20o%20Monitor%20Pro" className="btn btn-primary text-lg">Começar Agora Grátis →</a>
                            <button onClick={openVideo} className="btn btn-outline flex items-center justify-center gap-2"><Icon name="play-circle" /> Ver Vídeo</button>
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="w-[280px] mx-auto rounded-[36px] overflow-hidden border-8 border-gray-800 shadow-2xl bg-black relative">
                            <img src={images[currentImageIndex]} alt="App Preview" className="w-full h-auto transition-all duration-500" />

                            {/* Navigation Arrows */}
                            <button onClick={(e) => { e.preventDefault(); prevImage(); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100 cursor-pointer z-10">
                                <Icon name="chevron-down" className="rotate-90" size={24} />
                            </button>
                            <button onClick={(e) => { e.preventDefault(); nextImage(); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 transition opacity-0 group-hover:opacity-100 cursor-pointer z-10">
                                <Icon name="chevron-up" className="rotate-90" size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* SECTION: PROBLEMS */}
            <section className="py-20 px-4 bg-[#0F172A] border-t border-white/5">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Você se identifica com isso?</h2>
                    <p className="text-gray-400 text-lg">A rotina do transporte escolar pode ser caótica. Veja se algum desses problemas é seu:</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="book" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Anota tudo no caderno e vive perdendo informação importante</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="dollar-sign" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Não sabe direito quanto tem pra receber no final do mês</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="tool" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Esquece a manutenção da van e só lembra quando dá problema</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="clipboard" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Perde tempo montando listas de chamada no papel toda semana</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="file-minus" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Não tem um contrato profissional pra passar pros pais</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-red-500/10 rounded-full">
                            <Icon name="shield-off" size={40} className="text-red-400" />
                        </div>
                        <p className="text-gray-400">Quando surge uma reclamação, não tem registro nenhum pra se defender</p>
                    </div>
                </div>
                <div className="text-center mt-12">
                    <p className="text-xl font-bold text-blue-500">Se você marcou pelo menos 2 desses, o Monitor Pro foi feito pra você.</p>
                </div>
            </section>

            {/* SECTION: SOLUTION (New) */}
            <section className="py-20 px-4 bg-[#ffcb73] text-[#1e293b]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-[#1e293b]">Apresentamos o Monitor Pro</h2>
                    <p className="text-xl leading-relaxed font-medium">
                        O aplicativo mais completo para quem trabalha com transporte escolar. Desenvolvido por quem entende a correria do seu dia a dia. Simples de usar, funciona offline e organiza TUDO em um só lugar.
                    </p>
                    <div className="mt-8">
                        <p className="text-2xl font-black text-[#0f172a]">Chega de gambiarras. É hora de profissionalizar.</p>
                    </div>
                </div>
            </section>

            <section id="funcionalidades" className="py-20 px-4 bg-[#0b1120]">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Tudo o que você precisa em um único app</h2>
                    <p className="text-gray-400">Cada função foi pensada pra facilitar sua rotina — não pra complicar.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {[
                        { icon: 'check-circle', title: 'Chamada Digital', desc: 'Registre presença e falta com um toque. Acabou a era do papel e caneta. Rápido, prático e organizado.' },
                        { icon: 'map', title: 'Rotas com GPS', desc: 'Visualize seus pontos de embarque no mapa. Otimize o trajeto, economize combustível e nunca se perca.' },
                        { icon: 'dollar-sign', title: 'Controle Financeiro', desc: 'Saiba exatamente quanto tem a receber. Controle mensalidades, pagamentos atrasados e fluxo de caixa.' },
                        { icon: 'file-text', title: 'Relatórios em PDF', desc: 'Gere relatórios de frequência com um clique. Envie direto pros pais pelo WhatsApp. Profissionalismo na prática.' },
                        { icon: 'tool', title: 'Manutenção por Km', desc: 'Receba avisos antes do problema acontecer. Cadastre as manutenções e o app te lembra na quilometragem certa.' },
                        { icon: 'clipboard', title: 'Geração de Contratos', desc: 'Contratos prontos e profissionais. Preencha os dados e envie pros responsáveis. Sem dor de cabeça.' },
                        { icon: 'alert-triangle', title: 'Registro de Ocorrências', desc: 'Documentou, tá protegido. Registre qualquer incidente durante o trajeto com data e detalhes.' },
                        { icon: 'smartphone', title: 'Funciona 100% Offline', desc: 'Sem internet? Sem problema. Seus dados ficam salvos no celular. Use em qualquer lugar.' },
                        { icon: 'cloud-upload', title: 'Backup Seguro', desc: 'Seus dados sempre protegidos. Faça backup e restaure quando precisar. Você no controle.' },
                    ].map((f, i) => (
                        <div key={i} className="bg-[#1E293B] p-8 rounded-2xl border border-white/5 hover:-translate-y-2 transition-transform duration-300">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl flex items-center justify-center mb-6">
                                <Icon name={f.icon as any} size={32} className="text-white" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                            <p className="text-gray-400">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* SECTION: HOW IT WORKS */}
            <section className="py-20 px-4 bg-[#0F172A]">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona?</h2>
                    <p className="text-gray-400">É mais simples do que usar WhatsApp.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-blue-900/50">1</div>
                        <h3 className="text-xl font-bold mb-3">Cadastre</h3>
                        <p className="text-gray-400">Adicione seus alunos e crie a rota em minutos.</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-blue-900/50">2</div>
                        <h3 className="text-xl font-bold mb-3">Use no dia a dia</h3>
                        <p className="text-gray-400">Faça a chamada e siga o GPS otimizado.</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-blue-900/50">3</div>
                        <h3 className="text-xl font-bold mb-3">Receba</h3>
                        <p className="text-gray-400">O app avisa quem pagou e quem está devendo.</p>
                    </div>
                </div>
            </section>

            {/* SECTION: DIFFERENTIALS */}
            <section className="py-20 px-4 bg-[#0b1120] border-y border-white/5">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
                    <div className="bg-[#1E293B] p-8 rounded-3xl border-2 border-red-500/30">
                        <h3 className="text-2xl font-bold mb-6 text-red-500 flex items-center gap-3">❌ Outros Apps</h3>
                        <ul className="space-y-4 text-gray-400">
                            <li className="flex gap-3"><span className="text-red-500 font-bold">✗</span> Focam só no financeiro ou só na chamada</li>
                            <li className="flex gap-3"><span className="text-red-500 font-bold">✗</span> Precisam de internet pra funcionar</li>
                            <li className="flex gap-3"><span className="text-red-500 font-bold">✗</span> Suporte demorado ou inexistente</li>
                            <li className="flex gap-3"><span className="text-red-500 font-bold">✗</span> Você precisa de vários apps diferentes</li>
                            <li className="flex gap-3"><span className="text-red-500 font-bold">✗</span> Interface complicada e confusa</li>
                        </ul>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-3xl border-2 border-green-500 transform md:scale-105 shadow-2xl shadow-green-900/20">
                        <h3 className="text-2xl font-bold mb-6 text-green-500 flex items-center gap-3">✅ Monitor Pro</h3>
                        <ul className="space-y-4 text-gray-300">
                            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> Gestão COMPLETA em um único app</li>
                            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> Funciona 100% offline</li>
                            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> Suporte humano 7 dias por semana</li>
                            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> Tudo integrado: chamada, rotas, financeiro...</li>
                            <li className="flex gap-3"><span className="text-green-500 font-bold">✓</span> Interface simples e fácil de usar</li>
                        </ul>
                    </div>
                </div>
                <div className="text-center mt-12">
                    <p className="text-xl font-bold text-gray-300">Enquanto outros resolvem um pedaço do problema, nós resolvemos tudo.</p>
                </div>
            </section>

            {/* SECTION: TESTIMONIALS */}
            <section className="py-20 px-4 bg-[#0F172A]">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Quem já testou, aprovou</h2>
                    <p className="text-gray-400">Veja o que os profissionais do transporte escolar estão dizendo:</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5">
                        <div className="text-yellow-500 text-xl mb-4">⭐️⭐️⭐️⭐️⭐️</div>
                        <p className="text-gray-300 italic mb-6">"Finalmente consigo saber quanto tenho pra receber no mês. Antes era tudo no caderno e eu vivia me perdendo."</p>
                        <p className="font-bold">Sr. João, condutor em SP</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5">
                        <div className="text-yellow-500 text-xl mb-4">⭐️⭐️⭐️⭐️⭐️</div>
                        <p className="text-gray-300 italic mb-6">"O app é muito fácil de usar. Achei que ia ser complicado mas em 10 minutos já tava funcionando."</p>
                        <p className="font-bold">Maria, monitora em Curitiba</p>
                    </div>
                    <div className="bg-[#1E293B] p-8 rounded-2xl border border-white/5">
                        <div className="text-yellow-500 text-xl mb-4">⭐️⭐️⭐️⭐️⭐️</div>
                        <p className="text-gray-300 italic mb-6">"O melhor é funcionar sem internet. Na minha rota pega mal o sinal e mesmo assim uso normal."</p>
                        <p className="font-bold">Carlos, condutor em BH</p>
                    </div>
                </div>
            </section>

            <section id="planos" className="py-20 px-4 bg-[#0b1120]">
                <div className="max-w-7xl mx-auto text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Planos que cabem no seu bolso</h2>
                    <p className="text-gray-400">Escolha o plano ideal para você ou sua equipe.</p>
                </div>

                {/* Toggle 1 mês / 2 meses */}
                <div className="max-w-md mx-auto mb-12 flex bg-[#1e293b] rounded-full p-1 border border-white/10">
                    <button 
                        onClick={() => setPlanPeriod('1month')}
                        className={`flex-1 py-3 rounded-full font-bold transition-all ${planPeriod === '1month' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
                    >
                        1 Mês
                    </button>
                    <button 
                        onClick={() => setPlanPeriod('2months')}
                        className={`flex-1 py-3 rounded-full font-bold transition-all ${planPeriod === '2months' ? 'bg-green-500 text-white' : 'text-gray-400'}`}
                    >
                        2 Meses 🔥
                    </button>
                </div>

                {planPeriod === '2months' && (
                    <div className="max-w-5xl mx-auto mb-12 bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-xl text-center text-white">
                        <h3 className="text-xl font-bold mb-2">💰 ECONOMIZE MAIS — Plano de 2 Meses</h3>
                        <p>Pague 2 meses e garanta desconto especial!</p>
                    </div>
                )}

                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-6">
                    {/* PLANO BÁSICO */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-white/5 text-center flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Básico</h3>
                        <div className="mb-6">
                            <span className="text-3xl font-extrabold text-blue-400">
                                R$ {planPeriod === '1month' ? '6,90' : '9,90'}
                            </span>
                            <span className="text-gray-500 text-sm">
                                /{planPeriod === '1month' ? 'mês' : '2 meses'}
                            </span>
                        </div>
                        <ul className="text-left space-y-3 mb-6 text-gray-400 flex-1 text-sm">
                            <li>✓ Cadastro de alunos</li>
                            <li>✓ Chamada digital</li>
                            <li>✓ Relatórios básicos</li>
                            <li>✓ Funciona offline</li>
                            <li>✓ Backup seguro</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic mb-4">Ideal pra começar</p>
                        <a 
                            href={planPeriod === '1month' 
                                ? 'https://www.asaas.com/c/3smmkesyfaijj04d' 
                                : 'https://www.asaas.com/c/t97resq2oi6pxo79'
                            } 
                            target="_blank"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition"
                        >
                            Assinar Básico
                        </a>
                    </div>

                    {/* PLANO PRO SOLO */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border-2 border-blue-500 text-center relative transform md:scale-105 shadow-2xl flex flex-col">
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold">⭐ POPULAR</span>
                        <h3 className="text-xl font-bold mb-4">Pro Solo</h3>
                        <div className="mb-2">
                            <span className="text-3xl font-extrabold text-blue-500">
                                R$ {planPeriod === '1month' ? '12,90' : '19,90'}
                            </span>
                            <span className="text-gray-500 text-sm">
                                /{planPeriod === '1month' ? 'mês' : '2 meses'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">1 pessoa</p>
                        <ul className="text-left space-y-3 mb-6 text-gray-400 flex-1 text-sm">
                            <li>✓ <strong className="text-blue-400">TUDO do Básico</strong></li>
                            <li>✓ Rotas com GPS</li>
                            <li>✓ Controle financeiro</li>
                            <li>✓ Manutenção por km</li>
                            <li>✓ Contratos digitais</li>
                            <li>✓ Ocorrências</li>
                            <li>✓ PDFs avançados</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic mb-4">Gestão completa</p>
                        <a 
                            href={planPeriod === '1month' 
                                ? 'https://www.asaas.com/c/h6xsvjbh4nyt6ksm' 
                                : 'https://www.asaas.com/c/rrt48s4pufgttn9b'
                            } 
                            target="_blank"
                            className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl transition"
                        >
                            Assinar Pro Solo
                        </a>
                    </div>

                    {/* PLANO PRO DUO */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-purple-500/50 text-center flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Pro Duo</h3>
                        <div className="mb-2">
                            <span className="text-3xl font-extrabold text-purple-400">
                                R$ {planPeriod === '1month' ? '19,90' : '33,90'}
                            </span>
                            <span className="text-gray-500 text-sm">
                                /{planPeriod === '1month' ? 'mês' : '2 meses'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">2 pessoas</p>
                        <ul className="text-left space-y-3 mb-6 text-gray-400 flex-1 text-sm">
                            <li>✓ <strong className="text-purple-400">TUDO do Pro</strong></li>
                            <li>✓ 2 contas simultâneas</li>
                            <li>✓ Ideal para duplas</li>
                            <li>✓ Monitor + Motorista</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic mb-4">Para duplas</p>
                        <a 
                            href={planPeriod === '1month' 
                                ? 'https://www.asaas.com/c/9l0f5jv7soevywwe' 
                                : 'https://www.asaas.com/c/zzijfvihayzxw3n5'
                            } 
                            target="_blank"
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition"
                        >
                            Assinar Pro Duo
                        </a>
                    </div>

                    {/* PLANO EQUIPE */}
                    <div className="bg-[#1e293b] p-6 rounded-3xl border border-green-500/50 text-center flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Equipe</h3>
                        <div className="mb-2">
                            <span className="text-3xl font-extrabold text-green-400">
                                R$ {planPeriod === '1month' ? '32,90' : '59,90'}
                            </span>
                            <span className="text-gray-500 text-sm">
                                /{planPeriod === '1month' ? 'mês' : '2 meses'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">3 a 5 pessoas</p>
                        <ul className="text-left space-y-3 mb-6 text-gray-400 flex-1 text-sm">
                            <li>✓ <strong className="text-green-400">TUDO do Pro</strong></li>
                            <li>✓ Até 5 contas</li>
                            <li>✓ Gestão de equipe</li>
                            <li>✓ Permissões por usuário</li>
                        </ul>
                        <p className="text-xs text-gray-500 italic mb-4">Para empresas</p>
                        <a 
                            href={planPeriod === '1month' 
                                ? 'https://www.asaas.com/c/zoncahpoy4it8r45' 
                                : 'https://www.asaas.com/c/fvmlt9vlqbb4ukhp'
                            } 
                            target="_blank"
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition"
                        >
                            Assinar Equipe
                        </a>
                    </div>
                </div>
                <div className="text-center mt-12 text-gray-500 text-sm">
                    💳 Pagamento via Pix ou Boleto • Acesso imediato • Suporte incluso
                </div>
            </section>


            {/* SECTION: FAQ */}
            <section id="faq" className="py-20 px-4 bg-[#0F172A] border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Dúvidas Frequentes</h2>
                    </div>
                    <div className="space-y-4">
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                Funciona sem internet?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Sim! O Monitor Pro funciona 100% offline. Seus dados ficam salvos no celular. Você só precisa de internet pra fazer backup ou atualizações.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                Posso testar antes de pagar?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Sim! Oferecemos um período de teste gratuito pra você conhecer o app antes de decidir. É só chamar no WhatsApp.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                É difícil de usar?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Não! O app foi feito pra ser simples. Se você usa WhatsApp, consegue usar o Monitor Pro. E qualquer dúvida, nosso suporte te ajuda.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                E se eu não gostar?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Sem problemas. Se não ficar satisfeito nos primeiros 7 dias, devolvemos seu dinheiro. Sem burocracia.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                Funciona no meu celular?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">O Monitor Pro funciona em celulares Android. Em breve teremos versão para iPhone também.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                Como funciona o suporte?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Nosso suporte é humano e funciona 7 dias por semana pelo WhatsApp. Nada de robô ou espera de dias pra resposta.</p>
                        </details>
                        <details className="bg-[#1E293B] p-6 rounded-2xl cursor-pointer group">
                            <summary className="font-bold text-lg list-none flex justify-between items-center text-white">
                                Meus dados ficam seguros?
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <p className="mt-4 text-gray-400">Sim! Você pode fazer backup a qualquer momento. Seus dados são seus e ficam protegidos.</p>
                        </details>
                    </div>
                </div>
            </section>

            {/* SECTION: FINAL CTA */}
            <section className="py-24 px-4 bg-[#ffcb73] text-[#1e293b] text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-[#1e293b] mb-6">Pronto pra profissionalizar sua van?</h2>
                    <p className="text-xl text-[#0f172a] mb-10 font-medium">Enquanto você continua no caderno, outros condutores já estão organizados.</p>
                    <div className="bg-white/20 p-6 rounded-2xl inline-block mb-10 border border-black/10">
                        <p className="text-lg font-bold text-[#1e293b]">⏰ Oferta de lançamento válida só até 26/01.<br />Depois o preço volta ao normal.</p>
                    </div>
                    <div>
                        <a href="https://wa.me/5522999837547?text=Quero%20começar" className="bg-[#2563eb] hover:scale-105 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-2xl transition-all inline-flex items-center gap-3">
                            Quero Começar Agora →
                        </a>
                    </div>
                    <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-[#0f172a] font-bold">
                        <span className="flex items-center gap-2">✓ Teste grátis disponível</span>
                        <span className="flex items-center gap-2">✓ Suporte 7 dias por semana</span>
                        <span className="flex items-center gap-2">✓ Satisfação garantida ou dinheiro de volta</span>
                    </div>
                </div>
            </section>

            <footer className="bg-black py-12 text-center border-t border-white/10">
                <a href="#" className="flex justify-center items-center gap-2 text-2xl font-extrabold mb-6">
                    <img src="logo.png" alt="Logo" className="h-8" />
                    Monitor <span className="text-blue-500">Pro</span>
                </a>
                <p className="text-gray-600 text-sm mb-4">Feito para Tios e Tias com 💙</p>
                <p className="text-gray-800 text-xs">© 2025 Monitor Pro. Todos os direitos reservados.</p>
            </footer>

            <div id="videoModal" className="video-modal" onClick={closeVideo}>
                <div className="video-container" onClick={e => e.stopPropagation()}>
                    <button className="close-video" onClick={closeVideo}>&times;</button>
                    <iframe id="videoFrame" width="100%" height="100%"
                        src="https://www.youtube-nocookie.com/embed/00tGCurv3rs" title="Vídeo"
                        frameBorder="0" allowFullScreen></iframe>
                </div>
            </div>

            <a href="https://wa.me/5522999837547" className="fixed bottom-8 right-8 bg-[#22c55e] p-4 rounded-full shadow-2xl hover:scale-110 transition z-[1001]">
                <Icon name="message-circle" size={32} />
            </a>
        </div >
    );
};
