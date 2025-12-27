
import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Activity,
  UserCircle,
  Save,
  RotateCcw,
  LogOut,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  History,
  LayoutDashboard,
  Settings,
  Mail,
  Fingerprint,
  Download
} from 'lucide-react';
import { RiskLevel, RISK_LIMITS, GenerationHistoryRecord } from './types';
import { generateComment } from './services/aiService';

// --- Atomic Components ---

const GlassCard: React.FC<{
  title: string;
  children: React.ReactNode;
  icon: any;
  className?: string
}> = ({ title, children, icon: Icon, className = "" }) => (
  <div className={`glass rounded-3xl p-6 flex flex-col transition-all hover:border-blue-500/30 group ${className}`}>
    <div className="flex items-center gap-4 mb-6">
      <div className="p-3 rounded-2xl bg-white/5 text-blue-400 group-hover:scale-110 transition-transform">
        <Icon size={22} />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-white/90">{title}</h2>
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  icon?: any;
  placeholder?: string;
}> = ({ label, value, onChange, type = "text", icon: Icon, placeholder }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</label>
    <div className="relative group">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-white/20"
      />
      {Icon && <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-blue-400 transition-colors" size={18} />}
    </div>
  </div>
);

// --- Views ---

import { supabase } from './services/supabaseClient';

const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        // Auto login or ask to check email? For now assuming auto-login or success message
        alert('Registro exitoso! Por favor verifica tu email o inicia sesión.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020205]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-block p-4 rounded-3xl bg-gradient-neon shadow-lg mb-4">
            <Fingerprint className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            ingen<span className="text-blue-500">IA</span>
          </h1>
          <p className="text-white/50 font-medium">
            {isLogin ? 'Accede a tu cuenta profesional' : 'Crea tu cuenta profesional'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-neon"></div>

          {!isLogin && (
            <InputField
              label="Nombre Completo"
              value={fullName}
              onChange={setFullName}
              icon={UserCircle}
              placeholder="Juan Pérez"
            />
          )}

          <InputField
            label="Email"
            value={email}
            onChange={setEmail}
            icon={Mail}
            placeholder="mary@whitestars.io"
          />
          <InputField
            label="Contraseña"
            value={password}
            onChange={setPassword}
            type="password"
            icon={Lock}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-neon text-white rounded-2xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? "Iniciar Sesión" : "Registrarse")}
          </button>

          <div className="pt-4 text-center space-y-3">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-xs text-white/50 hover:text-white transition-colors font-medium"
            >
              {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia Sesión"}
            </button>

            {isLogin && (
              <div>
                <a href="#" className="text-[10px] text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest">¿Olvidaste tu contraseña?</a>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'profile'>('dashboard');
  const [usedToday, setUsedToday] = useState(0);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.MEDIUM);
  const [personality, setPersonality] = useState('Estratega de negocios, tono empático y profesional.');
  const [history, setHistory] = useState<GenerationHistoryRecord[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIp, setCurrentIp] = useState<string>('Detectando...');
  const [totalUsage, setTotalUsage] = useState(0);
  const [memberSince, setMemberSince] = useState('Reciente');
  const [licenseKey, setLicenseKey] = useState<string>('');

  const currentLimit = RISK_LIMITS[riskLevel];
  const progressPercentage = Math.min((usedToday / currentLimit) * 100, 100);

  // Fetch session and profile on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoggedIn(!!session);
      if (session) fetchProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoggedIn(!!session);
      if (session) fetchProfile(session.user.id);
    });

    // Detect IP (simple fetch)
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setCurrentIp(data.ip))
      .catch(() => setCurrentIp('Desconocida'));

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Also fetch settings (mocked for now or added to fetched data if needed)
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (settings) {
        setUsedToday(settings.daily_usage || 0);
        setTotalUsage(settings.total_usage || 0);
        setPersonality(settings.persona_prompt || personality);
      } else {
        // Create default settings if missing (should be handled by trigger, but just in case)
      }

      if (data && data.created_at) {
        const date = new Date(data.created_at);
        setMemberSince(date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
      }

      // Fetch License Key (Added Fix)
      const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (license) {
        setLicenseKey(license.key);
      } else {
        setLicenseKey("No encontrada. Contacta soporte.");
      }

    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Upload logic would go here. For now, we'll try to use a data URL for immediate feedback implies storage setup needs.
    // Assuming Supabase Storage 'avatars' bucket exists or similar. 
    // Since I can't easily set up storage buckets via SQL only safely without knowing perms, 
    // I will mock the visual change locally for the user session.

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setProfile({ ...profile, avatar_url: ev.target.result as string });
      }
    };
    reader.readAsDataURL(file);

    // TODO: Implement actual Supabase Storage upload
    // const fileExt = file.name.split('.').pop();
    // const filePath = `${session.user.id}/avatar.${fileExt}`;
    // await supabase.storage.from('avatars').upload(filePath, file);
    // const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    // await supabase.from('user_profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
  };

  const handleTestComment = async () => {
    if (!session) return;
    setIsGenerating(true);
    setError(null);
    setLastGenerated(null);

    try {
      const response = await generateComment(
        "AI transparency is crucial for the future of professional networks.",
        usedToday,
        riskLevel,
        true,
        personality,
        session.user.id // Pass ID for backend verification
      );

      if (response.success && response.comment) {
        setLastGenerated(response.comment);
        setUsedToday(prev => prev + 1);

        const newRecord: GenerationHistoryRecord = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          postSnippet: "AI transparency is crucial...",
          comment: response.comment
        };
        setHistory(prev => [newRecord, ...prev]);
      } else {
        setError(response.error || "Error desconocido");
      }
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoggedIn) return <LoginPage onLogin={() => { }} />; // LoginPage handles auth state change via supabase listener

  const userName = profile?.full_name || session?.user?.email?.split('@')[0] || "Usuario";
  const userAvatar = profile?.avatar_url || `https://ui-avatars.com/api/?name=${userName}&background=3b82f6&color=fff`;

  return (
    <div className="min-h-screen bg-[#020205] text-white">
      {/* Header */}
      <nav className="glass sticky top-0 z-[100] border-b border-white/5 py-4 px-6 mb-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-extrabold tracking-tighter">
              ingen<span className="text-blue-500">IA</span>
            </div>
            <div className="hidden md:flex gap-6 text-sm font-semibold text-white/50">
              <button
                onClick={() => setView('dashboard')}
                className={`transition-colors flex items-center gap-2 ${view === 'dashboard' ? 'text-white' : 'hover:text-white'}`}
              >
                <LayoutDashboard size={18} />
                Panel
              </button>
              <button
                onClick={() => setView('profile')}
                className={`transition-colors flex items-center gap-2 ${view === 'profile' ? 'text-white' : 'hover:text-white'}`}
              >
                <UserCircle size={18} />
                Perfil
              </button>
              <button
                onClick={() => window.location.href = '/install.html'}
                className="transition-colors flex items-center gap-2 hover:text-white"
              >
                <Download size={18} />
                Instalación
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              onClick={() => setView('profile')}
              className="flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-neon flex items-center justify-center overflow-hidden">
                <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-white/80">{userName}</span>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-white/30 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-20">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
              <div className="space-y-2">
                <h1 className="text-5xl font-extrabold tracking-tight">Bienvenido, {userName.split(' ')[0]}.</h1>
                <p className="text-white/40 text-lg font-medium">Tu motor de ingenio está listo para trabajar.</p>
              </div>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            {lastGenerated && (
              <div className="mb-8 p-6 glass border-green-500/20 rounded-[2rem] animate-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Generación Exitosa</span>
                </div>
                <p className="text-lg italic text-white/80 leading-relaxed font-medium">"{lastGenerated}"</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {/* Tarjeta 1: Control de Riesgo */}
              <GlassCard title="Control de Riesgo" icon={Activity}>
                <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-2">
                    {[RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH].map(level => (
                      <button
                        key={level}
                        onClick={() => setRiskLevel(level)}
                        className={`py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-widest transition-all border ${riskLevel === level
                          ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20'
                          : 'bg-white/5 text-white/30 border-white/5 hover:border-white/10'
                          }`}
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
                      <div
                        className="h-full bg-gradient-neon rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                    <button
                      onClick={() => setUsedToday(0)}
                      className="text-[10px] font-bold text-white/20 hover:text-white/50 transition-colors flex items-center gap-2 mx-auto"
                    >
                      <RotateCcw size={12} /> REINICIAR CONTADOR
                    </button>
                  </div>
                </div>
              </GlassCard>

              {/* Tarjeta 2: Personalidad */}
              <GlassCard title="Personalidad IA" icon={UserCircle}>
                <div className="flex flex-col h-full space-y-4">
                  <p className="text-sm text-white/40 font-medium">Define cómo debe sonar tu voz digital.</p>
                  <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none placeholder:text-white/10"
                    placeholder="Ej: Directivo senior, irónico pero constructivo..."
                  />
                  <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <Save size={16} /> Guardar Configuración
                  </button>
                </div>
              </GlassCard>

              {/* Tarjeta 3: Seguridad Renovada */}
              <GlassCard title="Conexión Extension" icon={ShieldCheck}>
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">TU CLAVE DE LICENCIA</span>
                      <div className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                        PARA LA EXTENSIÓN
                      </div>
                    </div>
                    {/* Display License Key */}
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black/20 p-2 rounded-lg text-xs font-mono text-white/80 break-all select-all">
                        {licenseKey || "Cargando..."}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(licenseKey)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                        title="Copiar"
                      >
                        <Save size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">Estado</p>
                      <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div> ACTIVO
                      </div>
                    </div>
                    <p className="text-xs text-white/60">IP Vinculada: <strong>{currentIp}</strong></p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setView('dashboard')}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              >
                <ChevronRight className="rotate-180" size={24} />
              </button>
              <h1 className="text-4xl font-extrabold tracking-tight">Tu Cuenta</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <GlassCard title="Perfil" icon={UserCircle}>
                  <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto group cursor-pointer">
                      <div className="absolute inset-0 bg-black/50 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <span className="text-xs font-bold text-white">CAMBIAR</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                      />
                      <div className="w-full h-full rounded-[2.5rem] bg-gradient-neon p-1">
                        <div className="w-full h-full rounded-[2.2rem] overflow-hidden border-4 border-[#020205]">
                          <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">{userName}</h3>
                      <p className="text-sm text-white/40">{session?.user?.email}</p>
                    </div>
                    {/* Hiding Badges as requested */}
                  </div>
                </GlassCard>

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
              </div>

              <div className="lg:col-span-2">
                <div className="glass rounded-[2.5rem] overflow-hidden flex flex-col h-full max-h-[650px]">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                        <History size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Historial de Generaciones</h3>
                    </div>
                    <button
                      onClick={() => setHistory([])}
                      className="text-xs font-bold text-white/20 hover:text-red-400 transition-colors"
                    >
                      LIMPIAR TODO
                    </button>
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
                            <span className="text-[10px] text-white/20 font-medium">{item.timestamp.toLocaleTimeString()}</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 text-white/90 italic text-sm leading-relaxed relative">
                            "{item.comment}"
                            <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button className="p-2 rounded-lg bg-white/10 hover:bg-blue-500/20 text-blue-400 transition-colors">
                                <ExternalLink size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Background Decor */}
      <div className="fixed bottom-0 right-0 p-10 pointer-events-none opacity-20">
        <div className="text-8xl font-black tracking-tighter text-white/5 select-none">
          INGENIA
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
