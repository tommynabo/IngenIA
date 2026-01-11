import React, { useState } from 'react';
import { Activity, RotateCcw, Save, ShieldCheck, History, ExternalLink, Lock } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

// Types (should be shared ideally)
enum RiskLevel { LOW = 'BAJO', MEDIUM = 'MEDIO', HIGH = 'ALTO' }
interface GenerationHistoryRecord {
    id: string;
    timestamp: string;
    postSnippet: string;
    comment: string;
}

interface PanelProps {
    session: any;
    profile: any;
    stats: { usedToday: number; totalUsage: number; activeStreak: number; riskLevel: RiskLevel };
    settings: { licenseKey: string; licenseStatus: string; personality: string };
    onUpdateStats: (newStats: any) => void;
    onUpdateSettings: (newSettings: any) => void;
    history: GenerationHistoryRecord[];
    onClearHistory: () => void;
}

const RISK_LIMITS = { [RiskLevel.LOW]: 25, [RiskLevel.MEDIUM]: 50, [RiskLevel.HIGH]: 100 };

export const Panel: React.FC<PanelProps> = ({
    session, profile, stats, settings, onUpdateStats, onUpdateSettings, history, onClearHistory
}) => {
    const { usedToday, totalUsage, riskLevel } = stats;
    const { licenseKey, licenseStatus, personality } = settings;
    const currentLimit = RISK_LIMITS[riskLevel];
    const progressPercentage = Math.min((usedToday / currentLimit) * 100, 100);
    const [lastGenerated, setLastGenerated] = useState<string | null>(null);

    // Paywall Check
    const showPaywall = licenseStatus !== 'active';

    const handleSaveSettings = async () => {
        const { error } = await supabase.from('user_settings').update({ persona_prompt: personality }).eq('user_id', session.user.id);
        if (error) alert("Error al guardar");
        else alert("Configuración guardada");
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
                <div className="space-y-2">
                    <h1 className="text-5xl font-extrabold tracking-tight">Bienvenido, {profile?.full_name?.split(' ')[0] || 'Usuario'}.</h1>
                    <p className="text-white/40 text-lg font-medium">Tu motor de ingenio está listo para trabajar.</p>
                </div>
            </div>

            {showPaywall ? (
                <div className="flex flex-col items-center justify-center p-12 glass rounded-[3rem] border-blue-500/20 text-center space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="p-6 bg-blue-500/10 rounded-full text-blue-400 mb-4 animate-pulse">
                        <Lock size={64} />
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">¡Ya casi estás dentro!</h2>
                    <a
                        href={`https://buy.stripe.com/fZuaEQ2crbFB6Hrd0k0Ny08?prefilled_email=${encodeURIComponent(session?.user?.email || '')}`}
                        className="px-8 py-5 bg-gradient-neon rounded-2xl font-bold text-white shadow-xl flex items-center gap-3"
                    >
                        <Activity className="animate-bounce" size={24} />
                        Activar Suscripción & Prueba Gratis
                    </a>
                    <p className="text-xs text-white/30 uppercase tracking-widest font-bold">Cancela cuando quieras • 0€ hoy</p>
                </div>
            ) : (
                <>
                    {/* Dashboard Content */}
                    <div className="space-y-8">
                        {/* Top Row: Risk & License */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Card 1: Risk Control */}
                            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors relative overflow-hidden h-full min-h-[300px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><Activity size={20} /></div>
                                    <h3 className="text-lg font-bold">Control de Riesgo</h3>
                                </div>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.values(RiskLevel).map(level => (
                                            <button
                                                key={level}
                                                onClick={() => onUpdateStats({ ...stats, riskLevel: level })}
                                                className={`py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest border transition-all ${riskLevel === level ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/5 text-white/30 border-white/5'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Uso Diario</span>
                                            <span className="text-3xl font-black text-white">{usedToday} <span className="text-white/20 text-sm">/ {currentLimit}</span></span>
                                        </div>
                                        <div className="h-4 w-full bg-white/5 rounded-full p-1 overflow-hidden">
                                            <div className="h-full bg-gradient-neon rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                                        </div>
                                        <button onClick={() => onUpdateStats({ ...stats, usedToday: 0 })} className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-2 mx-auto">
                                            <RotateCcw size={12} /> REINICIAR CONTADOR
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: License (Moved up) */}
                            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors relative overflow-hidden h-full min-h-[300px]">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><ShieldCheck size={20} /></div>
                                    <h3 className="text-lg font-bold">Conexión Extension</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 block">TU CLAVE DE LICENCIA</span>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-black/20 p-3 rounded-xl text-sm font-mono text-white/80 break-all select-all block">{licenseKey}</code>
                                            <button onClick={() => navigator.clipboard.writeText(licenseKey)} className="p-3 hover:bg-white/10 rounded-xl transition-colors text-white/40 hover:text-white" title="Copiar"><Save size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center">
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest">Estado</p>
                                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> ACTIVO
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row: Personality (Full Width) */}
                        <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Activity size={20} /></div>
                                    <h3 className="text-lg font-bold">Personalidad IA</h3>
                                </div>
                                <button onClick={handleSaveSettings} className="px-6 py-2 bg-white text-black hover:bg-white/90 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
                                    <Save size={16} /> Guardar Cambios
                                </button>
                            </div>
                            <div className="flex flex-col space-y-4">
                                <textarea
                                    value={personality}
                                    onChange={(e) => onUpdateSettings({ ...settings, personality: e.target.value })}
                                    className="w-full h-64 bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 text-base leading-relaxed focus:outline-none focus:border-purple-500/50 resize-none placeholder:text-white/10 font-mono text-white/80"
                                    placeholder="Define tu rol, tono y estilo..."
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
