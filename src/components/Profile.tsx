import React from 'react';
import { UserCircle, ChevronRight, Activity, History, ExternalLink } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface ProfileProps {
    session: any;
    userName: string;
    userAvatar: string;
    totalUsage: number;
    memberSince: string;
    history: any[];
    onClearHistory: () => void;
    onAvatarChange: (e: any) => void;
}

export const Profile: React.FC<ProfileProps> = ({ session, userName, userAvatar, totalUsage, memberSince, history, onClearHistory, onAvatarChange }) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <a href="/panel" className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                    <ChevronRight className="rotate-180" size={24} />
                </a>
                <h1 className="text-4xl font-extrabold tracking-tight">Tu Cuenta</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    {/* Profile Card */}
                    <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.02] transition-colors relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><UserCircle size={20} /></div>
                            <div>
                                <h3 className="text-xl font-bold">{userName}</h3>
                                <p className="text-sm text-white/40">{session?.user?.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="glass rounded-[2rem] p-6 space-y-4">
                        <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Estadísticas Generales</h4>
                        <div className="flex justify-between py-3 border-b border-white/5">
                            <span className="text-sm text-white/60 font-medium">Total Generado</span>
                            <span className="text-sm font-bold">{totalUsage}</span>
                        </div>
                        <div className="flex justify-between py-3">
                            <span className="text-sm text-white/60 font-medium">Miembro desde</span>
                            <span className="text-sm font-bold capitalize">{memberSince}</span>
                        </div>
                    </div>

                    {/* Subscription Management (Hidden/Subtle) */}
                    <div className="flex justify-center pt-2">
                        <button
                            onClick={async () => {
                                // Simple confirmation
                                if (!confirm('¿Quieres gestionar tu suscripción (cancelar/facturas) en Stripe?')) return;
                                try {
                                    const res = await fetch('/api/create-portal-session', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: session.user.email })
                                    });
                                    const data = await res.json();
                                    if (data.url) window.location.href = data.url;
                                    else alert('No se pudo acceder al portal. Verifica que tengas una suscripción activa.');
                                } catch (e) { alert('Error de conexión'); }
                            }}
                            className="text-[10px] font-bold text-white/10 hover:text-red-500/50 transition-colors uppercase tracking-widest"
                        >
                            Cancelar Suscripción
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    {/* Tutorial Section */}
                    <div className="glass rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><ExternalLink size={20} /></div>
                            <h3 className="text-xl font-bold">Cómo generar comentarios, resúmenes y respuestas</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div
                                onClick={() => window.open('/uploaded_image_0_1768230367657.png', '_blank')}
                                className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 group cursor-pointer relative aspect-[16/5]"
                            >
                                <img src="/uploaded_image_0_1768230367657.png" alt="Tutorial paso 1" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-white">Ver Imagen</span>
                                </div>
                            </div>
                            <div
                                onClick={() => window.open('/uploaded_image_1_1768230367657.png', '_blank')}
                                className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 group cursor-pointer relative aspect-[16/5]"
                            >
                                <img src="/uploaded_image_1_1768230367657.png" alt="Tutorial paso 2" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-xs font-bold uppercase tracking-widest text-white">Ver Imagen</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-[2.5rem] overflow-hidden flex flex-col h-full max-h-[650px]">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><History size={20} /></div>
                                <h3 className="text-xl font-bold">Historial de Generaciones</h3>
                            </div>
                            <button onClick={onClearHistory} className="text-xs font-bold text-white/20 hover:text-red-400 transition-colors">LIMPIAR TODO</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {history.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-white/20 gap-4">
                                    <Activity size={48} />
                                    <p className="font-bold uppercase tracking-widest text-sm">Sin actividad reciente</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest">Post de referencia</span>
                                                <p className="text-sm font-bold text-white/60 truncate max-w-md">{item.postSnippet}</p>
                                            </div>
                                            <span className="text-[10px] text-white/20 font-medium">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 text-white/90 italic text-sm leading-relaxed relative">
                                            "{item.comment}"
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
