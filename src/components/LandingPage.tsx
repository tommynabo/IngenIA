import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Loader2, ArrowRight, CheckCircle2, Star, X, FileText } from 'lucide-react';

interface LandingPageProps {
    onLoginSuccess: (session: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'landing' | 'login'>('landing'); // 'landing' = Hero+Register, 'login' = Login Only
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookies, setShowCookies] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showCouponInput, setShowCouponInput] = useState(false);

    const handleRegisterAndRedirect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Sign Up with Password
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                },
            });

            if (error) {
                console.error("Registration error:", error);
                alert(error.message);
                setLoading(false);
                return;
            }

            // 2. Redirect to Stripe
            // Using the link provided previously with prefilled email
            const stripeUrl = `https://buy.stripe.com/fZuaEQ2crbFB6Hrd0k0Ny08?prefilled_email=${encodeURIComponent(email)}`;
            window.location.href = stripeUrl;

        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            // Auth state change will be detected by App.tsx
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Login View (Simple Modal-like or specialized view)
    if (view === 'login') {
        return (
            <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="fixed top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="fixed bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 relative z-10 animate-in fade-in zoom-in-95 duration-300">
                    <button onClick={() => setView('landing')} className="absolute top-6 left-6 text-white/30 hover:text-white text-sm transition-colors">← Volver</button>
                    <div className="text-center mb-8 mt-4">
                        <h2 className="text-2xl font-bold mb-2">Acceder a tu Cuenta</h2>
                        <p className="text-white/40 text-sm">Introduce tus credenciales.</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tucorreo@empresa.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-white hover:bg-white/90 text-black rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "Entrar al Panel"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }



    // ... (keep Login view)

    // ... (keep Login view)

    // ... (keep existing login logic)

    const handleSubscribe = async (interval: 'month' | 'year') => {
        setLoading(true);
        try {
            const response = await fetch('/api/create-connect-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billingInterval: interval,
                    // No email known yet, Stripe will ask
                }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Error al iniciar: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        } finally {
            setLoading(false);
            setShowPlanModal(false);
        }
    };

    // ... (keep Login view)

    // Hero View
    return (
        <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050508]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-neon rounded-lg flex items-center justify-center -rotate-3">
                            <span className="text-lg">⚡️</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight">INGENIA</span>
                    </div>
                    <button
                        onClick={() => setView('login')}
                        className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold transition-colors"
                    >
                        Iniciar Sesión
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative pt-32 pb-20 px-6 max-w-[1200px] mx-auto">
                {/* Decor */}
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

                <div className="relative z-10 grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
                            <Star size={12} fill="currentColor" /> Nueva Versión 2.0
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1]">
                            Tu Copiloto de <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Crecimiento Viral</span>
                        </h1>
                        <p className="text-xl text-white/50 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            Genera contenido de alto impacto para LinkedIn en segundos. Gestiona tu marca personal y ahorra horas cada semana con IA.
                        </p>

                        {/* CTA Section (No Form) */}
                        <div className="p-1 rounded-[2rem] bg-gradient-to-r from-blue-500/30 to-purple-500/30 lg:max-w-md">
                            <div className="bg-[#0a0a0f] rounded-[1.8rem] p-8 border border-white/10 text-center space-y-6">
                                <h3 className="text-xl font-bold">¿Listo para despegar?</h3>
                                <p className="text-white/50 text-sm">
                                    Obtén acceso inmediato al panel y herramientas.
                                    <br />
                                    Sin compromiso. 3 Días de Prueba.
                                </p>

                                {/* Simple Button triggers Modal */}
                                <button
                                    onClick={() => setShowPlanModal(true)}
                                    className="w-full py-4 bg-white text-black rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                                >
                                    Empezar Prueba Gratis <ArrowRight size={20} />
                                </button>

                                <p className="text-[10px] text-white/20 font-medium">
                                    Pagos seguros vía Stripe.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Visual / Mockup */}
                    <div className="relative hidden lg:block perspective-1000">
                        {/* ... (Keep existing Mockup code) ... */}
                        <div className="relative z-10 transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-y-[0deg] hover:rotate-x-[0deg] transition-transform duration-700 ease-out">
                            <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl bg-[#050508]/50 backdrop-blur-xl">
                                {/* Fake UI Mockup */}
                                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                                    </div>
                                    <div className="h-2 w-20 bg-white/10 rounded-full"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-1/3 space-y-3">
                                            <div className="h-24 bg-white/5 rounded-2xl animate-pulse"></div>
                                            <div className="h-24 bg-white/5 rounded-2xl animate-pulse delay-75"></div>
                                            <div className="h-24 bg-white/5 rounded-2xl animate-pulse delay-150"></div>
                                        </div>
                                        <div className="w-2/3 bg-white/5 rounded-2xl h-80 p-4 border border-white/5 relative overflow-hidden group">
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050508] to-transparent z-10"></div>
                                            <div className="space-y-3 opacity-50">
                                                <div className="h-4 w-3/4 bg-white/10 rounded"></div>
                                                <div className="h-4 w-1/2 bg-white/10 rounded"></div>
                                                <div className="h-4 w-full bg-white/10 rounded"></div>
                                                <div className="h-4 w-5/6 bg-white/10 rounded"></div>
                                            </div>
                                            {/* Floating Element */}
                                            <div className="absolute bottom-8 right-8 left-8 bg-[#0a0a0f] p-4 rounded-xl border border-white/10 shadow-xl z-20 flex items-center gap-3 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                                <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><CheckCircle2 size={16} /></div>
                                                <div>
                                                    <div className="text-xs text-white/40 font-bold uppercase">Estado</div>
                                                    <div className="text-sm font-bold text-white">Post Viral Generado</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Background Glow behind mockup */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[60px] -z-10 rounded-full"></div>
                    </div>
                </div>
            </div>
            {/* Footer */}
            <div className="border-t border-white/5 bg-[#050508] py-8 mt-20">
                <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-white/20 font-medium">© 2026 IngenIA. Todos los derechos reservados.</p>
                    <div className="flex gap-6">
                        <button onClick={() => setShowPrivacy(true)} className="text-xs text-white/20 hover:text-white/40 transition-colors">Política de Privacidad</button>
                        <button onClick={() => setShowCookies(true)} className="text-xs text-white/20 hover:text-white/40 transition-colors">Política de Cookies</button>
                    </div>
                </div>
            </div>

            {/* Plan Selection Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
                        <button
                            onClick={() => setShowPlanModal(false)}
                            className="absolute top-4 right-4 p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-full transition-all"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 text-center">
                            <h2 className="text-3xl font-black mb-2 tracking-tight">Elige tu Plan</h2>
                            <p className="text-white/50 mb-8">Ambos incluyen 3 días de prueba gratis.</p>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => handleSubscribe('month')}
                                    disabled={loading}
                                    className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all text-left flex items-center justify-between"
                                >
                                    <div>
                                        <div className="text-sm font-bold text-blue-400 mb-1">MENSUAL</div>
                                        <div className="text-2xl font-bold">10€ <span className="text-sm text-white/40 font-normal">/ mes</span></div>
                                    </div>
                                    {loading ? <Loader2 className="animate-spin text-white/20" /> : <ArrowRight className="text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />}
                                </button>

                                <button
                                    onClick={() => handleSubscribe('year')}
                                    disabled={loading}
                                    className="group relative p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 transition-all text-left flex items-center justify-between"
                                >
                                    {/* <div className="absolute -top-3 -right-3 bg-gradient-neon px-3 py-1 rounded-full text-[10px] font-bold shadow-lg rotate-3">
                                        AHORRA 2 MESES
                                    </div> */}
                                    <div>
                                        <div className="text-sm font-bold text-purple-400 mb-1">ANUAL</div>
                                        <div className="text-2xl font-bold">120€ <span className="text-sm text-white/40 font-normal">/ año</span></div>
                                    </div>
                                    {loading ? <Loader2 className="animate-spin text-white/20" /> : <ArrowRight className="text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />}
                                </button>
                            </div>

                            {/* Subtle Coupon Input */}
                            <div className="mt-6">
                                {!showCouponInput ? (
                                    <button
                                        onClick={() => setShowCouponInput(true)}
                                        className="text-[10px] text-white/20 hover:text-white/40 underline decoration-white/20 transition-all font-medium uppercase tracking-widest"
                                    >
                                        ¿Tienes un código?
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                                        <input
                                            type="text"
                                            placeholder="CÓDIGO"
                                            className="bg-transparent border-b border-white/10 text-center text-xs py-1 w-32 focus:outline-none focus:border-white/40 transition-colors uppercase placeholder:text-white/10"
                                            onChange={(e) => {
                                                if (e.target.value === 'INGENIAESLOMEJOR2026') {
                                                    alert("¡Código Lifetime detectado! Introdúcelo en la siguiente pantalla de pago.");
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Legal Modals */}
            {(showPrivacy || showCookies) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    {/* ... (Same as before) ... */}
                    <div className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText size={18} className="text-blue-400" />
                                {showPrivacy ? 'Política de Privacidad' : 'Política de Cookies'}
                            </h3>
                            <button onClick={() => { setShowPrivacy(false); setShowCookies(false); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto text-sm text-white/60 space-y-4 leading-relaxed">
                            {showPrivacy ? (
                                <>
                                    <p><strong>1. Responsable del Tratamiento:</strong> IngenIA Software, con domicilio en España.</p>
                                    <p><strong>2. Finalidad:</strong> Gestionar el registro, la prestación del servicio y la facturación.</p>
                                    <p><strong>3. Legitimación:</strong> Ejecución del contrato y consentimiento del interesado.</p>
                                    <p><strong>4. Destinatarios:</strong> No se cederán datos a terceros, salvo obligación legal o proveedores de servicios (como Stripe/Supabase).</p>
                                    <p><strong>5. Derechos:</strong> Acceder, rectificar y suprimir los datos, así como otros derechos, como se explica en la información adicional.</p>
                                </>
                            ) : (
                                <>
                                    <p><strong>1. Qué son las cookies:</strong> Ficheros que se descargan en su dispositivo al acceder a determinadas páginas web.</p>
                                    <p><strong>2. Tipos de cookies:</strong> Utilizamos cookies técnicas (necesarias para el funcionamiento) y de análisis (para medir el uso de la web).</p>
                                    <p><strong>3. Desactivación:</strong> Puede configurar su navegador para bloquearlas, aunque algunos servicios podrían no funcionar correctamente.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
