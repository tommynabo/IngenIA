import React, { useState, useEffect } from 'react';
import { LayoutDashboard, UserCircle, Download, LogOut, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

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
                <a href="/ingenia.zip" download className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-neon rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity">
                    <Download size={16} /> Descargar ingenia.zip
                </a>
            ),
            img: "step-license-dashboard.png"
        },
        {
            title: "2. Ve a Extensiones",
            desc: "Escribe chrome://extensions en tu navegador o ve al menú > Extensiones > Gestionar extensiones.",
            action: (
                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/5 w-fit">
                    <code className="text-xs text-blue-400 font-mono">chrome://extensions</code>
                    <button
                        onClick={copyToClipboard}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                        title="Copiar URL"
                    >
                        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Download size={14} className="rotate-0" />} {/* Reusing Download icon as copy icon strictly to avoid import errors if Lucide Copy isn't available, but I'll add Copy to import */}
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

            <div className="space-y-12 relative before:absolute before:left-[19px] before:top-10 before:bottom-10 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:to-purple-500 before:opacity-30">
                {steps.map((step, idx) => (
                    <div key={idx} className="relative pl-16 group">
                        {/* Step Indicator */}
                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#050508] border-2 border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm group-hover:border-blue-500 group-hover:scale-110 transition-all z-10 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            {idx + 1}
                        </div>

                        <div className="glass p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all">
                            <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="flex-1 space-y-4">
                                    <h3 className="text-xl font-bold">{step.title}</h3>
                                    <p className="text-white/60 leading-relaxed text-sm">{step.desc}</p>
                                    {step.action && <div className="pt-2">{step.action}</div>}
                                </div>
                                <div
                                    className="w-full md:w-48 aspect-video bg-black/40 rounded-xl border border-white/5 flex items-center justify-center text-white/20 overflow-hidden cursor-zoom-in relative group/img"
                                    onClick={() => setZoomedImage(step.img)}
                                >
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center z-10">
                                        <span className="text-xs font-bold text-white bg-black/80 px-3 py-1 rounded-full">VER GRANDE</span>
                                    </div>
                                    <img src={`/${step.img}`} alt={step.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
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
