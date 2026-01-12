
import React, { useState } from 'react';
import { Download, ShieldCheck, FileInput, Key, ChevronRight, CheckCircle2 } from 'lucide-react';
import { VSLVideo } from '../src/components/VSLVideo';

const GlassCard: React.FC<{
    children: React.ReactNode;
    className?: string
}> = ({ children, className = "" }) => (
    <div className={`glass rounded-3xl p-8 flex flex-col transition-all hover:border-blue-500/30 ${className}`}>
        {children}
    </div>
);

const Step: React.FC<{
    number: number;
    title: string;
    description: string;
    icon: any;
    placeholderText: string;
    gifSrc?: string;
}> = ({ number, title, description, icon: Icon, placeholderText, gifSrc }) => (
    <div className="flex flex-col gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all group">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-neon flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                {number}
            </div>
            <div className="p-3 rounded-xl bg-white/5 text-blue-400 group-hover:scale-110 transition-transform">
                <Icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-white/90">{title}</h3>
        </div>

        <p className="text-white/60 font-medium leading-relaxed ml-16">
            {description}
        </p>

        <div className="ml-16 aspect-video rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-blue-500/30 transition-colors">
            {gifSrc ? (
                <img src={gifSrc} alt={placeholderText} className="w-full h-full object-cover rounded-2xl" />
            ) : (
                /* Placeholder for GIF */
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-3 text-white/20">
                    <div className="w-16 h-16 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">{placeholderText}</span>
                </div>
            )}
        </div>
    </div>
);

const InstallPage: React.FC = () => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = () => {
        setDownloading(true);
        // Simulating download start for UX
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = '/ingenia.zip'; // Assumes file is in public/ingenia.zip
            link.download = 'ingenia-beta.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownloading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[#020205] text-white selection:bg-blue-500/30">

            {/* Header */}
            <nav className="glass sticky top-0 z-[100] border-b border-white/5 py-6 px-6 mb-12 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="text-3xl font-extrabold tracking-tighter cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'}>
                        ingen<span className="text-blue-500">IA</span>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
                        BETA ACCESS
                    </div>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 pb-32">
                <div className="text-center space-y-6 mb-12 animate-in slide-in-from-bottom-8 fade-in duration-700">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white pb-2">
                        Instalación Rápida
                    </h1>
                    <p className="text-xl text-white/40 font-medium max-w-2xl mx-auto">
                        Configura tu motor de ingenio en menos de 2 minutos.
                    </p>
                </div>

                {/* VSL Video Section - Top & 3D Style */}
                <div className="relative perspective-1000 mb-20 max-w-3xl mx-auto animate-in slide-in-from-top-8 fade-in duration-1000">
                    <div className="relative z-10 transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-[0deg] hover:rotate-x-[0deg] transition-transform duration-700 ease-out">
                        <VSLVideo className="w-full shadow-2xl" />
                    </div>
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[60px] -z-10 rounded-full"></div>
                </div>

                {/* VSL Video Section */}


                {/* Download Section */}
                <div className="flex justify-center mb-24 animate-in zoom-in-50 duration-700 delay-200">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="group relative px-12 py-8 bg-gradient-neon rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] hover:shadow-[0_0_80px_-12px_rgba(59,130,246,0.7)] hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-full bg-white/20 text-white ${downloading ? 'animate-bounce' : 'group-hover:animate-bounce'}`}>
                                <Download size={32} strokeWidth={3} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Versión 1.0.0 (BETA)</div>
                                <div className="text-3xl font-black text-white tracking-tight">DESCARGAR INGENIA</div>
                            </div>
                        </div>
                        {/* Shiny effect */}
                        <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                            <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] translate-x-[-150%] group-hover:animate-[shine_1.5s_infinite]" />
                        </div>
                    </button>
                </div>

                {/* Steps Section */}
                <div className="space-y-12 relative">
                    <div className="absolute left-[29px] top-24 bottom-24 w-0.5 bg-gradient-to-b from-blue-500 to-purple-600 opacity-20 hidden md:block"></div>

                    <div className="flex items-center gap-4 mb-8">
                        <h2 className="text-3xl font-bold tracking-tight">Instrucciones de Activación</h2>
                        <div className="h-px flex-1 bg-white/10"></div>
                    </div>

                    <div className="space-y-8">
                        {/* Step 1 */}
                        <Step
                            number={1}
                            title="Ir a Extensiones"
                            description="Escribe chrome://extensions en la barra de direcciones de tu navegador y presiona Enter."
                            icon={ShieldCheck}
                            placeholderText="CHROME EXTENSIONS"
                            gifSrc="/step-1-extensions.png"
                        />
                        <div className="ml-16 mb-4">
                            <div className="flex gap-2 items-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 w-fit">
                                <span className="text-blue-400 font-mono text-sm select-all">chrome://extensions</span>
                                <button className="text-white/40 hover:text-white" onClick={() => navigator.clipboard.writeText('chrome://extensions')}>
                                    <span className="text-xs font-bold uppercase">Copiar</span>
                                </button>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <Step
                            number={2}
                            title="Modo Desarrollador"
                            description="Activa el interruptor 'Developer mode' (Modo de desarrollador) que encontrarás en la esquina superior derecha."
                            icon={ShieldCheck}
                            placeholderText="DEV MODE ON"
                            gifSrc="/step-2-dev-mode.png"
                        />

                        {/* Step 3 */}
                        <Step
                            number={3}
                            title="Cargar Descomprimida"
                            description="Haz clic en el botón 'Load unpacked' (Cargar descomprimida) que aparecerá arriba a la izquierda."
                            icon={FileInput}
                            placeholderText="LOAD UNPACKED BUTTON"
                            gifSrc="/step-2-dev-mode.png" // Reusing same image as it shows the button too, user didn't provide separate one but distinct step requested
                        />

                        {/* Step 4 */}
                        <Step
                            number={4}
                            title="Seleccionar Carpeta"
                            description="Busca y selecciona la carpeta 'linkedin-extension' que obtuviste al descomprimir el ZIP descargado."
                            icon={FileInput}
                            placeholderText="SELECT FOLDER"
                            gifSrc="/step-4-folder.png"
                        />

                        {/* Step 5 */}
                        <Step
                            number={5}
                            title="Verificar Instalación"
                            description="¡Listo! Verifica que la tarjeta de 'IngenIA - Smart Assistant' aparece ahora en tu lista de extensiones activas."
                            icon={CheckCircle2}
                            placeholderText="VERIFY EXTENSION"
                            gifSrc="/step-5-verify.png"
                        />

                        {/* Step 6 */}
                        <Step
                            number={6}
                            title="Vincular Licencia"
                            description="Copia tu 'Clave de Licencia' desde esta misma web (ver imagen) y pégala en la extensión para activarla."
                            icon={Key}
                            placeholderText="DASHBOARD LICENSE LOCATION"
                            gifSrc="/step-license-dashboard.png"
                        />
                    </div>
                </div>

                {/* Footer help */}
                <div className="mt-24 text-center p-8 rounded-[2rem] bg-white/5 border border-white/5">
                    <p className="text-white/40 font-medium">¿Tienes problemas?</p>
                    <a href="mailto:soporte@ingenia.ai" className="text-blue-400 font-bold hover:underline mt-2 inline-block">Contáctanos por soporte</a>
                </div>

            </main>

            <style>{`
        @keyframes shine {
            0% { transform: translateX(-150%) skewX(-20deg); }
            100% { transform: translateX(250%) skewX(-20deg); }
        }
      `}</style>
        </div>
    );
};

export default InstallPage;
