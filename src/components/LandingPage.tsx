import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2 } from 'lucide-react';

interface LandingPageProps {
    onLoginSuccess: (session: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [authSent, setAuthSent] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin + '/panel', // Redirect to panel
                },
            });

            if (error) throw error;
            setAuthSent(true);
        } catch (err: any) {
            setError(err.message || 'Error al enviar el magic link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-purple-500/30 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Glow Effects */}
            <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Logo Area */}
                    <div className="text-center mb-10 relative">
                        <div className="w-20 h-20 mx-auto bg-gradient-neon rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 rotate-3 hover:rotate-6 transition-transform duration-500">
                            <span className="text-4xl">⚡️</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter mb-2 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                            IngenIA
                        </h1>
                        <p className="text-white/40 font-medium">Tu copiloto de crecimiento en LinkedIn</p>
                    </div>

                    {authSent ? (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h3 className="text-xl font-bold">¡Revisa tu correo!</h3>
                            <p className="text-white/60 text-sm leading-relaxed">
                                Hemos enviado un enlace mágico a <span className="text-white font-bold">{email}</span>.
                                <br />Haz clic para entrar automáticamente.
                            </p>
                            <button
                                onClick={() => setAuthSent(false)}
                                className="text-xs text-white/30 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors"
                            >
                                Usar otro correo
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/30 uppercase tracking-widest ml-1">Email Profesional</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tucorreo@empresa.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gradient-neon text-white rounded-2xl font-bold text-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
                            >
                                {loading ? <Loader2 className="animate-spin" size={24} /> : "Empezar prueba gratis de 3 días"}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-white/20 mt-8 font-medium">
                    Al continuar aceptas nuestros términos y condiciones.
                </p>
            </div>
        </div>
    );
};
