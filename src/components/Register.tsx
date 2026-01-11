import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, ArrowRight, User, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }
                }
            });

            if (error) throw error;

            if (data.session) {
                // Initial check - The trigger should have set the status based on payment.
                // We'll redirect to /panel and let the App's AuthGuard handle the rest (locking if inactive).
                navigate('/panel');
            } else {
                // Should not happen with email/password unless email confirm is on. 
                // Assuming email confirm is OFF for this flow or they need to confirm.
                // If confirm is ON, show message. But user wanted simplification.
                alert('Registro completado. Si se requiere confirmación, revisa tu correo.');
            }

        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-neon rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 rotate-3">
                        <span className="text-3xl">⚡️</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter mb-2">Crea tu Cuenta</h1>
                    <p className="text-white/40">Pago verificado. Configura tu acceso.</p>
                </div>

                <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    placeholder="Nombre Completo"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input
                                    type="email"
                                    placeholder="Correo Electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                    required
                                />
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-neon rounded-2xl font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <>Finalizar Registro <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>}
                        </button>
                    </form>
                </div>

                <p className="text-center mt-8 text-xs text-white/20 font-medium">
                    © 2024 IngenIA Software
                </p>
            </div>
        </div>
    );
};
