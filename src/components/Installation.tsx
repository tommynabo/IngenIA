import React, { useState, useEffect } from 'react';
import { LayoutDashboard, UserCircle, Download, LogOut, CheckCircle2, Copy } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { VSLVideo } from './VSLVideo';

export const Installation: React.FC = () => {
    const [userAvatar, setUserAvatar] = useState('https://cdn-icons-png.flaticon.com/512/3135/3135715.png');
    const [userName, setUserName] = useState('Usuario');
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.id) {
                supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
                    .then(({ data }) => {
                        if (data) {
                            if (data.avatar_url) setUserAvatar(data.avatar_url);
                            if (data.full_name) setUserName(data.full_name);
                        }
                    });
            }
        });
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText('chrome://extensions');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const steps = [
        {
            title: "1. Descarga y Descomprime",
            desc: "Descarga el archivo y haz doble clic para descomprimirlo. ¡Importante! Necesitas la carpeta descomprimida.",
            action: (
                <a href="/ingenia.zip" download className="group relative overflow-hidden inline-flex items-center gap-4 px-8 py-5 bg-gradient-neon rounded-2xl text-lg font-black text-white shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-pulse-slow">
                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12"></div>
                    <Download size={28} className="animate-bounce" />
                    <span>DESCARGAR INGENIA.ZIP</span>
                </a>
            ),
            img: "step-license-dashboard.png"
        },
        {
            title: "2. Ve a Extensiones",
            desc: "Escribe chrome://extensions en tu navegador o ve al menú > Extensiones > Gestionar extensiones.",
            action: (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 w-fit mt-2">
                    <code className="text-sm text-blue-400 font-mono px-2">chrome://extensions</code>
                    <button
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white"
                        title="Copiar URL"
                    >
                        {copied ? <CheckCircle2 size={18} className="text-green-400" /> : <Copy size={18} />}
                    </button>
                </div>
            ),
            img: "step-1-extensions.png"
        },
        {
            title: "3. Modo Desarrollador",
            desc: "Activa el interruptor 'Modo de desarrollador' en la esquina superior derecha.",
            img: "step-2-dev-mode.png"
        },
        {
            title: "4. Cargar Descomprimida",
            desc: "Haz clic en el botón 'Cargar descomprimida' que aparecerá arriba a la izquierda.",
            img: "step-2-dev-mode.png"
        },
        {
            title: "5. Selecciona la Carpeta",
            desc: "Busca y selecciona la carpeta 'ingenia' que descomprimiste en el Paso 1.",
            img: "step-4-folder.png"
        },
        {
            title: "6. ¡Fíjala y Listo!",
            desc: "Haz clic en el icono del puzzle 🧩, busca IngenIA y dale a la chincheta 📌 para tenerla siempre a mano.",
            img: "step-5-verify.png"
        }
    ];

    return (
        <div className="max-w-[800px] mx-auto">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-5xl font-extrabold tracking-tight">Instalación Rápida</h1>
                <p className="text-white/40 text-lg">Configura tu motor de ingenio en menos de 2 minutos.</p>
            </div>

            {/* Video Section */}
            <div className="max-w-3xl mx-auto mb-20">
                <VSLVideo className="w-full" />
            </div>

            <div className="space-y-16 relative">
                {/* Connection Line */}
                <div className="absolute left-[39px] top-10 bottom-10 w-1 bg-gradient-to-b from-blue-500/50 to-purple-500/50 rounded-full"></div>

                {steps.map((step, idx) => (
                    <div key={idx} className="relative pl-24 group">
                        {/* Step Indicator */}
                        <div className="absolute left-0 top-0 w-20 h-20 bg-[#050508] rounded-full border-4 border-blue-500/20 flex items-center justify-center z-10 group-hover:border-blue-500 group-hover:scale-110 transition-all shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                            <span className="text-3xl font-black text-blue-500">{idx + 1}</span>
                        </div>

                        {/* Arrow Connector (except last item) */}
                        {idx < steps.length - 1 && (
                            <div className="absolute left-[28px] -bottom-12 text-blue-500/30 animate-bounce">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                            </div>
                        )}

                        <div className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-2xl font-bold">{step.title}</h3>
                                    <p className="text-white/60 leading-relaxed text-base">{step.desc}</p>
                                    {step.action && <div className="pt-4">{step.action}</div>}
                                </div>
                                <div
                                    className="w-full md:w-56 aspect-video bg-black/40 rounded-xl border border-white/5 flex items-center justify-center text-white/20 overflow-hidden cursor-zoom-in relative group/img shadow-xl"
                                    onClick={() => setZoomedImage(step.img)}
                                >
                                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all duration-300 transform scale-90 group-hover/img:scale-100">
                                        <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                            <span className="text-xs font-bold text-white tracking-widest">AMPLIAR</span>
                                        </div>
                                    </div>
                                    <img src={`/${step.img}`} alt={step.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-sm font-bold border border-green-500/20">
                    <CheckCircle2 size={16} /> Una vez instalada, abre LinkedIn y recarga.
                </div>
            </div>

            {/* Lightbox */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                >
                    <button
                        onClick={() => setZoomedImage(null)}
                        className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <LogOut className="rotate-45" size={24} /> {/* X icon alternative */}
                    </button>
                    <img
                        src={`/${zoomedImage}`}
                        alt="Zoom"
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 scale-100 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
