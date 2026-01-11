import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { LayoutDashboard, UserCircle, Download, LogOut, Loader2 } from 'lucide-react';

// Components
import { LandingPage } from './src/components/LandingPage';
import { Panel } from './src/components/Panel';
import { Profile } from './src/components/Profile';
import { Installation } from './src/components/Installation';
import { Register } from './src/components/Register';

// Types
enum RiskLevel {
  LOW = 'BAJO',
  MEDIUM = 'MEDIO',
  HIGH = 'ALTO'
}

interface GenerationHistoryRecord {
  id: string;
  timestamp: string;
  postSnippet: string;
  comment: string;
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [profile, setProfile] = useState<any>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.LOW);
  const [usedToday, setUsedToday] = useState(0);
  const [totalUsage, setTotalUsage] = useState(0);
  const [personality, setPersonality] = useState('');
  const [history, setHistory] = useState<GenerationHistoryRecord[]>([]);

  // Settings
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('active'); // Optimistic: Default to active to prevent flicker
  const [userAvatar, setUserAvatar] = useState('https://cdn-icons-png.flaticon.com/512/3135/3135715.png');

  // --- Fetch Logic ---
  const fetchHistory = async (userId: string) => {
    const { data } = await supabase.from('generation_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    if (data) {
      setHistory(data.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        postSnippet: item.post_snippet,
        comment: item.comment
      })));
      if (data.length > 0) setTotalUsage(prev => (prev === 0 ? Math.max(prev, data.length) : prev));
    }
  };

  const checkDailyReset = async (userId: string, currentSettings: any) => {
    const now = new Date();
    const currentHour = now.getHours();
    let cycleDate = new Date(now);
    if (currentHour < 8) cycleDate.setDate(cycleDate.getDate() - 1);
    const dateString = cycleDate.toISOString().split('T')[0];

    if (!currentSettings.last_reset_date || currentSettings.last_reset_date !== dateString) {
      const { error } = await supabase.from('user_settings').update({ daily_usage: 0, last_reset_date: dateString }).eq('user_id', userId);
      if (!error) setUsedToday(0);
    }
  };

  const fetchProfile = async (userId: string) => {
    // Profile
    const { data: pData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (pData) {
      setProfile(pData);
      if (pData.avatar_url) setUserAvatar(pData.avatar_url);
    }

    const FULL_PROMPT = `# ROL
ERES: [TU NOMBRE]. [TU PUESTO ACTUAL]. [TU EMPRESA].
TUS PALABRAS CLAVE: [KEYWORD 1], [KEYWORD 2], [KEYWORD 3].
TU BIO: [BREVE DESCRIPCIÓN DE TU PROPUESTA DE VALOR] + [HOBBIES/INTERESES].

# TAREA
Genera un comentario para LinkedIn basado en el post proporcionado abajo.
Contexto: Estás tomando un café. Hablas directo, sin filtros corporativos, pensando en voz alta.

## ⛔ REGLAS CRÍTICAS (NO HACER)
1. CERO emojis, hashtags, comillas, listas o bullets.
2. NUNCA empieces con: "Excelente", "Gran post", "Muy interesante", "Totalmente".
3. NUNCA saludes ("Hola") ni te despidas ("Saludos").
4. NO preguntes al autor (salvo duda técnica real o retórica muy obvia).
5. NO repitas el texto del post; apórtale valor, resume o dale la vuelta.

## ✅ DIRECTRICES DE ESTILO
* Tono: Conversacional, humilde, "de la calle" pero profesional.
* Conectores permitidos: la verdad, ojo que, justo, total que, al final, la cosa es que.
* Longitud: Idealmente 1-2 frases (<70 caracteres). Máximo 4 líneas solo si cuentas una historia personal.
* CIERRE OBLIGATORIO: Integra siempre la mención al autor al final de la frase o idea: @NOMBREDEPERFIL

## 🎲 MATRIZ DE RESPUESTA (Elige 1 enfoque al azar para variar)
1. Selección: "Me quedo con el [número]..." + razón práctica inmediata.
2. Reformulación: "No es X, es Y..." (Dale una vuelta al concepto central).
3. Historia: Conecta el tema con una vivencia breve tuya (máx 3 líneas).
4. Insight: Valida el post y añade una capa extra de profundidad en 1 frase.
5. Contraste: "En mi caso funciona distinto..." (Discrepa con respeto y fundamento).
6. Advertencia: "Brutal, pero ojo con..." (Equilibrio positivo/aviso).
7. Metáfora/Humor: Breve, inteligente y natural (si aplica al tema).
8. Emoción: Solo para posts personales. Valida el sentimiento sin ser cursi.

## INPUT DEL USUARIO
[PEGAR AQUÍ EL POST DE LINKEDIN]`;

    // Settings
    const { data: sData } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    if (sData) {
      setUsedToday(sData.daily_usage || 0);
      setTotalUsage(sData.total_usage || 0);

      // AUTO-FIX: If prompt is the broken/truncated placeholder, replace it instantly.
      const currentPrompt = sData.persona_prompt || '';
      if (currentPrompt.includes('RESTO DEL PROMPT ORIGINAL') || currentPrompt.length < 50) {
        setPersonality(FULL_PROMPT);
        // Silent DB Repair
        supabase.from('user_settings').update({ persona_prompt: FULL_PROMPT }).eq('user_id', userId).then(() => console.log('Fixed broken prompt'));
      } else {
        setPersonality(currentPrompt);
      }

      checkDailyReset(userId, sData);
    } else {
      // Fallback if no settings exist
      setPersonality(FULL_PROMPT);
    }

    // License
    const { data: lData } = await supabase.from('licenses').select('*').eq('user_id', userId).single();
    if (lData) {
      setLicenseKey(lData.key);
      setLicenseStatus(lData.status);
    }

    // History
    fetchHistory(userId);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Check payment param logic is now in Panel or App?
    // User asked for logic in Panel probably, or Global?
    // We can keep the global check here if it affects routing, but usually it updates DB.
    // The previous implementation had it in App.tsx useEffect.
    // I will add it here to ensure it runs on any protected route.
    // Insecure payment check removed. License activation must be handled by server-side webhook.
    // const params = new URLSearchParams(window.location.search);
    // if (params.get('payment') === 'success' && session) { ... }

    return () => subscription.unsubscribe();
  }, [session?.user?.id]); // Re-run if user changes

  if (loading) return <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <Routes>
      <Route path="/" element={!session ? <LandingPage onLoginSuccess={(s) => setSession(s)} /> : <Navigate to="/panel" />} />
      <Route path="/registro" element={!session ? <Register /> : <Navigate to="/panel" />} />

      {/* Protected Routes */}
      <Route path="/*" element={session ? (
        <AuthorizedLayout
          session={session}
          profile={profile}
          userAvatar={userAvatar}
          userName={profile?.full_name || 'Usuario'}
          licenseStatus={licenseStatus}
        >
          <Routes>
            <Route path="panel" element={
              <Panel
                session={session}
                profile={profile}
                stats={{ usedToday, totalUsage, activeStreak: 0, riskLevel }}
                settings={{ licenseKey, licenseStatus, personality }}
                onUpdateStats={(s) => { setRiskLevel(s.riskLevel); setUsedToday(s.usedToday); }}
                onUpdateSettings={(s) => setPersonality(s.personality)}
                history={history}
                onClearHistory={() => setHistory([])}
              />
            } />
            <Route path="user" element={
              <Profile
                session={session}
                userName={profile?.full_name || 'Usuario'}
                userAvatar={userAvatar}
                totalUsage={totalUsage}
                memberSince={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Reciente'}
                history={history}
                onClearHistory={() => setHistory([])}
                onAvatarChange={(e: any) => {
                  // Mock avatar change
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setUserAvatar(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            } />
            <Route path="instalacion" element={<Installation />} />
            <Route path="*" element={<Navigate to="/panel" />} />
          </Routes>
        </AuthorizedLayout>
      ) : (
        <Navigate to="/" />
      )} />
    </Routes>
  );
};

// Paywall Component
const Paywall: React.FC<{ session: any }> = ({ session }) => (
  <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-4">
    <div className="max-w-md w-full glass p-12 rounded-[3rem] border-blue-500/20 text-center space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden">
      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="relative z-10">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full text-blue-400 mx-auto flex items-center justify-center mb-6 animate-pulse">
          <Loader2 size={40} />
        </div>
        <h2 className="text-4xl font-black tracking-tighter">Completa tu Acceso</h2>
        <p className="text-white/50 text-lg">Para acceder al panel y activar tu licencia, completa tu suscripción de prueba.</p>

        <a
          href={`https://buy.stripe.com/fZuaEQ2crbFB6Hrd0k0Ny08?prefilled_email=${encodeURIComponent(session?.user?.email || '')}`}
          className="w-full py-4 bg-gradient-neon rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform"
        >
          Activar Prueba Gratis
        </a>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-white/30 hover:text-white mt-4 underline decoration-white/30 underline-offset-4">
          Cerrar Sesión
        </button>
      </div>
    </div>
  </div>
);

// Layout for Authenticated Views
const AuthorizedLayout: React.FC<{ children: React.ReactNode, session: any, userAvatar: string, userName: string, licenseStatus: string }> = ({ children, session, userAvatar, userName, licenseStatus }) => {
  const location = useLocation();

  // STRICT PAYWALL GUARD: If not active, show Paywall ONLY.
  if (licenseStatus !== 'active') {
    return <Paywall session={session} />;
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-purple-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/panel" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-neon rounded-xl flex items-center justify-center rotate-3">
                <span className="text-xl">⚡️</span>
              </div>
              <span className="text-xl font-black tracking-tighter">INGENIA</span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
              <a href="/panel" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('panel') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <LayoutDashboard size={16} /> Panel
              </a>
              <a href="/user" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('user') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <UserCircle size={16} /> Perfil
              </a>
              <a href="/instalacion" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('instalacion') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <Download size={16} /> Instalación
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* REMOVED USER CHIP AS REQUESTED */}
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-white/30 hover:text-white transition-colors" title="Cerrar Sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-20">
        {children}
      </main>
    </div>
  );
};

export default App;
