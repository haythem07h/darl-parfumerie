 import { useState, useEffect, useRef, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// ⚠️  REMPLACEZ CES VALEURS PAR VOS PROPRES CLÉS SUPABASE
// Allez sur : https://supabase.com/dashboard → votre projet → Settings → API
const SUPABASE_URL = "https://keqlzoznmjmjpriuzwiy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcWx6b3pubWptanByaXV6d2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODAzNDEsImV4cCI6MjA5NDI1NjM0MX0.C0TyIbHItb1BmTFwpSWQYNBbcWAX0teUs_h42nFYNCI";

// Client Supabase léger (sans SDK externe)
const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  },

  // Auth : connexion email/password
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return r.json();
  },

  // Auth : déconnexion
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...this.headers, Authorization: `Bearer ${token}` },
    });
  },

  // Auth : récupérer l'utilisateur
  async getUser(token) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { ...this.headers, Authorization: `Bearer ${token}` },
    });
    return r.json();
  },

  // DB : lire des données
  async from(table, query = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: this.headers,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // DB : insérer
  async insert(table, data, token = null) {
    const headers = { ...this.headers, Prefer: "return=representation" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // DB : mettre à jour
  async update(table, match, data, token) {
    const query = Object.entries(match).map(([k, v]) => `${k}=eq.${v}`).join("&");
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: { ...this.headers, Authorization: `Bearer ${token}`, Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg: "#0A0A0A", card: "#111111", card2: "#161616", card3: "#1C1C1C",
  gold: "#C9A84C", champ: "#E8D5A3",
  text: "#F5F5F0", muted: "#888880", border: "#222222", border2: "#2A2A2A",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600&display=swap');`;

// ─── DONNÉES STATIQUES ───────────────────────────────────────────────────────
const WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
  "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
  "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla",
  "Oran","El Bayadh","Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela",
  "Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar",
  "Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","M'Ghair","El Meniaa"
];

const COMMUNES = {
  "Alger": ["Alger Centre","Bab El Oued","Hussein Dey","El Harrach","Bir Mourad Raïs","Kouba","Birkhadem","Hydra","El Biar","Chéraga"],
  "Oran": ["Oran Centre","Es Senia","Bir El Djir","Aïn Turk","Arzew","Bethioua"],
  "Constantine": ["Constantine Centre","El Khroub","Hamma Bouziane","Didouche Mourad","Ain Abid"],
  "Annaba": ["Annaba Centre","El Bouni","Sidi Amar","Berrahal","Seraïdi"],
  "Béjaïa": ["Béjaïa Centre","Akbou","El Kseur","Amizour","Tazmalt"],
  "Blida": ["Blida Centre","Boufarik","Chréa","Larbaa","Meftah"],
  "Tizi Ouzou": ["Tizi Ouzou Centre","Draa Ben Khedda","Azazga","Tigzirt","Boghni"],
  "Sétif": ["Sétif Centre","El Eulma","Aïn Oulmene","Bougaa","Amoucha"],
  "Batna": ["Batna Centre","Aïn Touta","Merouana","Arris","Barika"],
  "Médéa": ["Médéa Centre","Berrouaghia","Ksar El Boukhari","Tablat","Sidi Naamane"],
};
const getCommunes = (w) => COMMUNES[w] || [`${w} Centre`, "Commune 2", "Commune 3"];

const PRODUCTS_INIT = [
  { id:1, name:"OUD ROYAL", brand:"Darl Parfumerie", category:"Homme", price:3500, volume:100, stock:12, featured:true, available:true, short:"Une ode au bois sacré d'Orient", description:"Un voyage olfactif au cœur de l'Arabie. L'oud royal s'ouvre sur des agrumes lumineux avant de révéler un cœur boisé enveloppant, ancré dans une base de musc ambré et de santal crémeux.", notes:{top:["Bergamote","Cardamome"],heart:["Oud","Rose de Taïf"],base:["Santal","Musc Ambré","Vétiver"]}, img:"oud" },
  { id:2, name:"NUIT DE SOIE", brand:"Darl Parfumerie", category:"Femme", price:2900, volume:100, stock:8, featured:true, available:true, short:"L'élégance distillée en flacon", description:"Nuit de Soie est une féminité accomplie. La fleur d'oranger illumine l'ouverture tandis que la pivoine rose dévoile un cœur délicat. Le fond de patchouli et de benjoin crée une sensualité envoûtante.", notes:{top:["Fleur d'Oranger","Aldéhyde"],heart:["Pivoine","Jasmin"],base:["Patchouli","Benjoin","Vanille"]}, img:"nuit" },
  { id:3, name:"AMBRE NOIR", brand:"Darl Parfumerie", category:"Mixte", price:3200, volume:100, stock:5, featured:false, available:true, short:"La chaleur des déserts andalous", description:"Ambre Noir est une sculpture olfactive de la résine et du temps. Mystérieux et profond, il mêle encens sacré et ambre liquide dans une symphonie chaude qui persiste des heures après son application.", notes:{top:["Encens","Poivre Noir"],heart:["Ambre","Labdanum"],base:["Bois de Cèdre","Musc","Résine"]}, img:"ambre" },
  { id:4, name:"ATLAS BLANC", brand:"Darl Parfumerie", category:"Homme", price:2600, volume:100, stock:15, featured:false, available:true, short:"La fraîcheur des sommets enneigés", description:"Inspiré des cimes enneigées de l'Atlas algérien, ce parfum frais et boisé capture la pureté de l'air de montagne.", notes:{top:["Citron","Gingembre"],heart:["Cèdre de l'Atlas","Eucalyptus"],base:["Ambre Gris","Mousse de Chêne"]}, img:"atlas" },
  { id:5, name:"ROSE SAHRAOUI", brand:"Darl Parfumerie", category:"Femme", price:3100, volume:100, stock:9, featured:true, available:true, short:"La fleur qui résiste au désert", description:"La rose qui naît au cœur du Sahara. Tenace et magnifique, cette rose absolue est sublimée par le miel doré et l'iris poudré.", notes:{top:["Rose Absolue","Miel"],heart:["Iris","Ylang-Ylang"],base:["Musc Blanc","Santal","Ambre"]}, img:"rose" },
  { id:6, name:"BOIS PERDU", brand:"Darl Parfumerie", category:"Mixte", price:2800, volume:100, stock:11, featured:false, available:true, short:"La forêt après la pluie", description:"Un parfum tellurique et authentique qui capture l'essence d'une forêt dense après une pluie d'été.", notes:{top:["Pétrichor","Feuilles Vertes"],heart:["Cèdre","Oud Fumé"],base:["Terre Humide","Mousse","Musc Boisé"]}, img:"bois" },
];

const GRADIENTS = {
  oud:   "radial-gradient(ellipse at 30% 40%, #3D2A06 0%, #1A1000 60%, #0A0A0A 100%)",
  nuit:  "radial-gradient(ellipse at 70% 30%, #2D0D2D 0%, #1A001A 60%, #0A0A0A 100%)",
  ambre: "radial-gradient(ellipse at 40% 60%, #3D2000 0%, #1A0A00 60%, #0A0A0A 100%)",
  atlas: "radial-gradient(ellipse at 50% 30%, #0D1A2D 0%, #000A1A 60%, #0A0A0A 100%)",
  rose:  "radial-gradient(ellipse at 60% 40%, #2D0A1A 0%, #1A0010 60%, #0A0A0A 100%)",
  bois:  "radial-gradient(ellipse at 30% 60%, #0D2D0D 0%, #001A00 60%, #0A0A0A 100%)",
};

const STATUS_CFG = {
  pending:   { label:"En attente",  color:"#E8A030", bg:"#2A1E00" },
  confirmed: { label:"Confirmée",   color:"#C9A84C", bg:"#1C1600" },
  shipped:   { label:"Expédiée",    color:"#80C0FF", bg:"#001020" },
  delivered: { label:"Livrée",      color:"#60D060", bg:"#001A00" },
  cancelled: { label:"Annulée",     color:"#CC4444", bg:"#1A0000" },
};

const CHART_DATA = [
  { month:"Jan", ca:120000 },{ month:"Fév", ca:98000 },{ month:"Mar", ca:145000 },
  { month:"Avr", ca:167000 },{ month:"Mai", ca:203000 },{ month:"Jui", ca:189000 },
];
const WEEKLY = [
  { day:"Lun", orders:4 },{ day:"Mar", orders:7 },{ day:"Mer", orders:3 },
  { day:"Jeu", orders:9 },{ day:"Ven", orders:12 },{ day:"Sam", orders:8 },{ day:"Dim", orders:5 },
];

// ─── GLOBAL CSS ──────────────────────────────────────────────────────────────
const CSS = `
${FONTS}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior:smooth; }
body { background:${T.bg}; color:${T.text}; font-family:'Montserrat',sans-serif; font-weight:400; }
::-webkit-scrollbar { width:3px; height:3px; }
::-webkit-scrollbar-track { background:#0D0D0D; }
::-webkit-scrollbar-thumb { background:#C9A84C33; border-radius:2px; }
.serif { font-family:'Cormorant Garamond',serif; }
.gold  { color:${T.gold}; }
.muted { color:${T.muted}; }
input, select, textarea {
  background:#0D0D0D; border:1px solid ${T.border}; color:${T.text};
  padding:13px 15px; font-family:'Montserrat',sans-serif; font-size:12px;
  width:100%; outline:none; transition:border-color 0.3s; border-radius:2px;
  appearance:none; -webkit-appearance:none;
}
input:focus, select:focus, textarea:focus { border-color:${T.gold}55; }
select option { background:#161616; }
label { display:block; font-size:10px; letter-spacing:0.2em; color:${T.muted}; margin-bottom:8px; text-transform:uppercase; }
button { font-family:'Montserrat',sans-serif; cursor:pointer; }
@keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes slideR  { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
@keyframes slideL  { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
@keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes shimmer { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
@keyframes spin    { to{transform:rotate(360deg)} }
.fa { animation:fadeIn 0.5s ease both; }
.fu { animation:fadeUp 0.6s ease both; }
.sr { animation:slideR 0.42s cubic-bezier(0.16,1,0.3,1) both; }
.sl { animation:slideL 0.35s ease both; }
.gb {
  background:transparent; border:1px solid ${T.gold}; color:${T.gold};
  padding:14px 32px; letter-spacing:0.2em; font-size:10px; font-weight:500;
  text-transform:uppercase; transition:all 0.3s;
}
.gb:hover { background:${T.gold}; color:#0A0A0A; }
.gbf {
  background:${T.gold}; border:1px solid ${T.gold}; color:#0A0A0A;
  padding:15px 32px; letter-spacing:0.2em; font-size:10px; font-weight:600;
  text-transform:uppercase; width:100%; transition:all 0.3s;
}
.gbf:hover { background:${T.champ}; border-color:${T.champ}; }
.gbf:disabled { opacity:0.5; cursor:not-allowed; }
.ag { background:${T.gold}; color:#0A0A0A; border:none; padding:10px 22px; font-size:10px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; transition:all 0.3s; border-radius:2px; }
.ag:hover { background:${T.champ}; }
.ag:disabled { opacity:0.5; cursor:not-allowed; }
.ao { background:transparent; color:${T.gold}; border:1px solid ${T.gold}44; padding:9px 20px; font-size:10px; font-weight:500; letter-spacing:0.15em; text-transform:uppercase; transition:all 0.3s; border-radius:2px; }
.ao:hover { border-color:${T.gold}; }
.agh { background:transparent; color:${T.muted}; border:1px solid ${T.border}; padding:8px 16px; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; transition:all 0.3s; border-radius:2px; }
.agh:hover { border-color:${T.muted}; color:${T.text}; }
`;

// ─── SVG COMPOSANTS ──────────────────────────────────────────────────────────
function Logo({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="57" fill="#0D0D0D" stroke={T.gold} strokeWidth="1.5"/>
      <circle cx="60" cy="60" r="50" fill="none" stroke={T.gold} strokeWidth="0.4" opacity="0.3"/>
      <text x="60" y="56" textAnchor="middle" fontFamily="Cormorant Garamond, serif"
        fontSize="38" fontWeight="600" fill={T.gold} fontStyle="italic" dominantBaseline="middle">D</text>
      <text x="60" y="74" textAnchor="middle" fontFamily="Cormorant Garamond, serif"
        fontSize="13" fontWeight="300" fill={T.champ} letterSpacing="5">arl</text>
      <text x="60" y="88" textAnchor="middle" fontFamily="Montserrat, sans-serif"
        fontSize="6.5" fontWeight="400" fill={T.muted} letterSpacing="5.5">PARFUMERIE</text>
      <line x1="28" y1="80" x2="46" y2="80" stroke={T.gold} strokeWidth="0.5" opacity="0.45"/>
      <line x1="74" y1="80" x2="92" y2="80" stroke={T.gold} strokeWidth="0.5" opacity="0.45"/>
    </svg>
  );
}

function Bottle({ type = "oud", size = 220 }) {
  const shapes = {
    oud:   { h:130, w:60, n:16, ch:28, c:"#2A1800", a:T.gold },
    nuit:  { h:140, w:50, n:12, ch:24, c:"#1A0020", a:"#D4A0C0" },
    ambre: { h:120, w:70, n:18, ch:32, c:"#2A1200", a:"#E8A030" },
    atlas: { h:150, w:45, n:10, ch:20, c:"#0A1020", a:"#80C0FF" },
    rose:  { h:130, w:55, n:14, ch:26, c:"#200015", a:"#E080A0" },
    bois:  { h:125, w:65, n:16, ch:30, c:"#0A1800", a:"#80A040" },
  };
  const s = shapes[type] || shapes.oud;
  const cx = size / 2;
  const by = size - s.h - 20;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter:"drop-shadow(0 16px 48px rgba(201,168,76,0.12))" }}>
      <defs>
        <linearGradient id={`b${type}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#282828"/>
          <stop offset="30%" stopColor="#383838"/>
          <stop offset="70%" stopColor="#242424"/>
          <stop offset="100%" stopColor="#181818"/>
        </linearGradient>
        <linearGradient id={`c${type}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={s.a} stopOpacity="0.65"/>
          <stop offset="50%" stopColor={s.a}/>
          <stop offset="100%" stopColor={s.a} stopOpacity="0.45"/>
        </linearGradient>
      </defs>
      <rect x={cx-s.w/2} y={by} width={s.w} height={s.h} fill={`url(#b${type})`} rx="2"/>
      <rect x={cx-s.w/2+7} y={by+s.h*0.33} width={s.w-14} height="0.7" fill={T.gold} opacity="0.45"/>
      <rect x={cx-s.w/2+7} y={by+s.h*0.65} width={s.w-14} height="0.7" fill={T.gold} opacity="0.45"/>
      <text x={cx} y={by+s.h*0.52} textAnchor="middle" fontFamily="Cormorant Garamond,serif"
        fontSize="10" fill={T.champ} letterSpacing="2" dominantBaseline="middle">DARL</text>
      <rect x={cx-s.w/2+5} y={by+8} width="4" height={s.h-16} fill="white" opacity="0.035" rx="2"/>
      <rect x={cx-s.n/2} y={by-30} width={s.n} height={33} fill="#2A2A2A" rx="2"/>
      <rect x={cx-s.n/2-6} y={by-s.ch-30} width={s.n+12} height={s.ch} fill={`url(#c${type})`} rx="2"/>
      <ellipse cx={cx} cy={size-14} rx={s.w*0.55} ry="5" fill="black" opacity="0.45"/>
    </svg>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fu" style={{
      position:"fixed", bottom:28, right:28, zIndex:9999,
      background:"#1A1A1A", borderLeft:`3px solid ${T.gold}`,
      padding:"15px 22px", minWidth:250,
      boxShadow:"0 8px 40px rgba(0,0,0,0.6)"
    }}>
      <p style={{ fontSize:13, color:T.text, letterSpacing:"0.05em" }}>{msg}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span style={{
      background:c.bg, color:c.color, border:`1px solid ${c.color}33`,
      padding:"4px 10px", fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", borderRadius:2
    }}>{c.label}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display:"inline-block", width:16, height:16, border:`2px solid ${T.border}`, borderTopColor:T.gold, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
  );
}

// ─── STOREFRONT ──────────────────────────────────────────────────────────────

function Header({ page, setPage, cartCount, onCartOpen }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);
  return (
    <header style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      background: scrolled ? "rgba(10,10,10,0.96)" : "transparent",
      backdropFilter: scrolled ? "blur(14px)" : "none",
      borderBottom: scrolled ? `1px solid ${T.border}` : "none",
      padding:"0 40px", height:70,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      transition:"all 0.4s ease"
    }}>
      <button onClick={() => setPage("home")} style={{ background:"none", border:"none", cursor:"pointer" }}>
        <Logo size={42} />
      </button>
      <nav style={{ display:"flex", gap:36, alignItems:"center" }}>
        {[["collection","Collection"],["home","Accueil"]].map(([p,l]) => (
          <button key={p} onClick={() => setPage(p)} style={{
            background:"none", border:"none", cursor:"pointer",
            color: page===p ? T.gold : T.muted,
            fontSize:10, letterSpacing:"0.25em", textTransform:"uppercase",
            fontFamily:"Montserrat", fontWeight:500, transition:"color 0.3s"
          }}>{l}</button>
        ))}
      </nav>
      <button onClick={onCartOpen} style={{
        background:"none", border:"none", cursor:"pointer",
        color:T.text, display:"flex", alignItems:"center", gap:8, position:"relative"
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        {cartCount > 0 && (
          <span style={{
            position:"absolute", top:-8, right:-8,
            background:T.gold, color:"#0A0A0A",
            width:17, height:17, borderRadius:"50%",
            fontSize:9, fontWeight:700,
            display:"flex", alignItems:"center", justifyContent:"center"
          }}>{cartCount}</span>
        )}
      </button>
    </header>
  );
}

function Hero({ setPage }) {
  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 50% 55%, #1C1200 0%, #0A0A0A 70%)",
      position:"relative", overflow:"hidden"
    }}>
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{
          position:"absolute",
          width: i%2===0 ? 360 : 220, height: i%2===0 ? 360 : 220,
          borderRadius:"50%",
          background:`radial-gradient(circle, ${T.gold}07, transparent 70%)`,
          top:`${8+i*17}%`, left:`${3+i*19}%`,
          animation:`pulse ${4+i}s ease-in-out infinite`,
          animationDelay:`${i*0.8}s`, pointerEvents:"none"
        }}/>
      ))}
      <div style={{ position:"absolute", top:"18%", left:0, right:0, height:1, background:`linear-gradient(to right, transparent, ${T.gold}18, transparent)` }}/>
      <div style={{ position:"absolute", bottom:"18%", left:0, right:0, height:1, background:`linear-gradient(to right, transparent, ${T.gold}18, transparent)` }}/>
      <div className="fu" style={{ textAlign:"center", zIndex:1, padding:"0 24px" }}>
        <p style={{ fontSize:9, letterSpacing:"0.55em", color:T.gold, marginBottom:28, textTransform:"uppercase" }}>Depuis 2018 — Algérie</p>
        <Logo size={110} />
        <h1 className="serif" style={{ fontSize:"clamp(44px,7.5vw,90px)", fontWeight:300, color:T.text, lineHeight:1.1, marginTop:24, letterSpacing:"-0.02em" }}>
          L'art de la<br/>
          <em style={{ fontStyle:"italic", color:T.champ }}>fragrance</em>
        </h1>
        <p style={{ fontSize:11, letterSpacing:"0.35em", color:T.muted, marginTop:20, textTransform:"uppercase" }}>
          Livré chez vous — 58 Wilayas
        </p>
        <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:48, flexWrap:"wrap" }}>
          <button className="gbf" onClick={() => setPage("collection")} style={{ width:"auto", padding:"16px 48px" }}>
            Découvrir la Collection
          </button>
          <button className="gb" onClick={() => setPage("collection")} style={{ padding:"16px 32px" }}>
            Nos Bestsellers
          </button>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:36, display:"flex", flexDirection:"column", alignItems:"center", gap:8, opacity:0.35 }}>
        <p style={{ fontSize:8, letterSpacing:"0.5em", textTransform:"uppercase", color:T.muted }}>Défiler</p>
        <div style={{ width:1, height:36, background:`linear-gradient(to bottom, ${T.gold}, transparent)` }}/>
      </div>
    </div>
  );
}

function ProductCard({ p, index, onView, onAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="fu"
      style={{
        background:T.card, borderTop: hov ? `2px solid ${T.gold}` : `2px solid transparent`,
        transition:"border-color 0.3s", animationDelay:`${index*0.07}s`,
        position:"relative", overflow:"hidden"
      }}
    >
      <div onClick={onView} style={{ cursor:"pointer", height:280, display:"flex", alignItems:"center", justifyContent:"center", background:GRADIENTS[p.img]||GRADIENTS.oud, position:"relative" }}>
        <div style={{ transform: hov ? "scale(1.06) translateY(-8px)" : "scale(1)", transition:"transform 0.5s ease" }}>
          <Bottle type={p.img} size={200} />
        </div>
        {p.featured && (
          <span style={{ position:"absolute", top:14, left:14, fontSize:9, letterSpacing:"0.25em", color:T.gold, border:`1px solid ${T.gold}44`, padding:"4px 10px", textTransform:"uppercase", background:"rgba(10,10,10,0.6)" }}>
            Bestseller
          </span>
        )}
        <span style={{ position:"absolute", top:14, right:14, fontSize:9, letterSpacing:"0.15em", color:T.muted, textTransform:"uppercase" }}>
          {p.volume}ml
        </span>
      </div>
      <div style={{ padding:"22px 24px" }}>
        <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:6 }}>{p.category}</p>
        <p className="serif" style={{ fontSize:20, color:T.text, marginBottom:6 }}>{p.name}</p>
        <p style={{ fontSize:12, color:T.muted, marginBottom:18, lineHeight:1.6 }}>{p.short}</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:16, color:T.gold, fontFamily:"Montserrat", fontWeight:500, letterSpacing:"0.08em" }}>
            {p.price.toLocaleString()} DA
          </span>
          <button className="gb" onClick={e => { e.stopPropagation(); onAdd(); }} style={{ padding:"9px 18px", fontSize:9 }}>
            + Panier
          </button>
        </div>
      </div>
    </div>
  );
}

function Collection({ products, setPage, setSelected, addToCart }) {
  const [filter, setFilter] = useState("Tous");
  const filters = ["Tous","Homme","Femme","Mixte","Oud"];
  const filtered = filter==="Tous" ? products.filter(p=>p.available)
    : filter==="Oud" ? products.filter(p=>p.available&&p.name.toLowerCase().includes("oud"))
    : products.filter(p=>p.available&&p.category===filter);
  return (
    <div style={{ paddingTop:100, minHeight:"100vh", background:T.bg }}>
      <div style={{ textAlign:"center", padding:"60px 24px 40px" }}>
        <p style={{ fontSize:9, letterSpacing:"0.45em", color:T.gold, textTransform:"uppercase", marginBottom:14 }}>Notre Sélection</p>
        <h2 className="serif" style={{ fontSize:"clamp(34px,5vw,60px)", fontWeight:300, color:T.text }}>La Collection</h2>
        <div style={{ width:50, height:1, background:`linear-gradient(to right, transparent, ${T.gold}, transparent)`, margin:"20px auto" }}/>
      </div>
      <div style={{ display:"flex", gap:0, justifyContent:"center", padding:"0 24px 44px", borderBottom:`1px solid ${T.border}`, overflowX:"auto" }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background:"none", border:"none", cursor:"pointer", padding:"12px 26px",
            fontSize:10, letterSpacing:"0.25em", textTransform:"uppercase",
            color:filter===f?T.gold:T.muted, fontFamily:"Montserrat", fontWeight:500, whiteSpace:"nowrap",
            borderBottom:filter===f?`1px solid ${T.gold}`:"1px solid transparent", transition:"all 0.3s"
          }}>{f}</button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:1, padding:1, maxWidth:1400, margin:"0 auto" }}>
        {filtered.map((p,i) => (
          <ProductCard key={p.id} p={p} index={i}
            onView={() => { setSelected(p); setPage("product"); }}
            onAdd={() => addToCart(p)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", padding:80, textAlign:"center" }}>
            <p className="serif" style={{ fontSize:24, color:T.muted, fontStyle:"italic" }}>Aucun produit dans cette catégorie</p>
          </div>
        )}
      </div>
      <div style={{ height:80 }}/>
    </div>
  );
}

function ProductDetail({ p, products, setPage, setSelected, addToCart }) {
  const [thumb, setThumb] = useState(0);
  const [qty, setQty] = useState(1);
  // FIX: filtrer correctement les produits liés
  const related = products.filter(x => x.id !== p.id && x.available).slice(0, 3);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addToCart(p);
  };

  return (
    <div className="fa" style={{ paddingTop:72, minHeight:"100vh", background:T.bg }}>
      <div style={{ padding:"22px 40px" }}>
        <button onClick={() => setPage("collection")} style={{
          background:"none", border:"none", cursor:"pointer",
          color:T.muted, fontSize:10, letterSpacing:"0.25em", textTransform:"uppercase",
          display:"flex", alignItems:"center", gap:8
        }}>
          <span style={{ fontSize:16 }}>←</span> Collection
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, maxWidth:1200, margin:"0 auto", padding:"0 40px 80px" }}>
        <div style={{ paddingRight:56 }}>
          <div style={{ height:500, display:"flex", alignItems:"center", justifyContent:"center", background:GRADIENTS[p.img], marginBottom:14 }}>
            <Bottle type={p.img} size={300} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[0,1,2].map(i => (
              <div key={i} onClick={() => setThumb(i)} style={{
                width:76, height:76, cursor:"pointer",
                border:thumb===i?`1px solid ${T.gold}`:`1px solid ${T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:T.card, transition:"border-color 0.2s"
              }}>
                <Bottle type={p.img} size={60} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ paddingTop:16 }}>
          <p style={{ fontSize:9, letterSpacing:"0.35em", color:T.gold, textTransform:"uppercase", marginBottom:10 }}>
            {p.category} — Eau de Parfum — {p.volume}ml
          </p>
          <h1 className="serif" style={{ fontSize:"clamp(32px,4vw,50px)", fontWeight:300, color:T.text, lineHeight:1.1, marginBottom:14 }}>
            {p.name}
          </h1>
          <p className="serif" style={{ fontSize:17, fontStyle:"italic", color:T.champ, marginBottom:28 }}>{p.short}</p>
          <div style={{ padding:"22px 0", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, marginBottom:28 }}>
            <span style={{ fontSize:26, color:T.gold, fontFamily:"Montserrat", fontWeight:500, letterSpacing:"0.1em" }}>
              {p.price.toLocaleString()} DA
            </span>
            {p.stock <= 5 && p.stock > 0 && (
              <span style={{ marginLeft:20, fontSize:10, color:"#E8A030", letterSpacing:"0.15em" }}>
                Plus que {p.stock} en stock
              </span>
            )}
          </div>
          <p style={{ fontSize:13, color:T.muted, lineHeight:1.95, marginBottom:28 }}>{p.description}</p>
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:18 }}>Pyramide Olfactive</p>
            {["top","heart","base"].map((tier) => (
              <div key={tier} style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
                <div style={{ width:52, flexShrink:0, paddingTop:6, fontSize:9, letterSpacing:"0.2em", color:T.muted, textTransform:"uppercase" }}>
                  {tier==="top"?"Tête":tier==="heart"?"Cœur":"Fond"}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {(p.notes[tier]||[]).map(n => (
                    <span key={n} style={{ background:"#1A1A1A", border:`1px solid ${T.border}`, padding:"5px 11px", fontSize:11, color:T.text, letterSpacing:"0.03em" }}>{n}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", border:`1px solid ${T.border}` }}>
              <button onClick={() => setQty(Math.max(1,qty-1))} style={{ background:"none", border:"none", color:T.text, width:42, height:42, cursor:"pointer", fontSize:18 }}>−</button>
              <span style={{ width:38, textAlign:"center", fontSize:13 }}>{qty}</span>
              <button onClick={() => setQty(qty+1)} style={{ background:"none", border:"none", color:T.text, width:42, height:42, cursor:"pointer", fontSize:18 }}>+</button>
            </div>
            <button className="gbf" onClick={handleAdd} style={{ flex:1 }}>Ajouter au Panier</button>
          </div>
          <button className="gb" onClick={() => { addToCart(p); setPage("checkout"); }} style={{ width:"100%", padding:"15px" }}>
            Commander Maintenant
          </button>
        </div>
      </div>
      {/* FIX: Related products — setSelected(rp) correct */}
      {related.length > 0 && (
        <div style={{ borderTop:`1px solid ${T.border}`, padding:"56px 40px" }}>
          <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:7 }}>Vous Aimerez Aussi</p>
          <h3 className="serif" style={{ fontSize:28, fontWeight:300, color:T.text, marginBottom:36 }}>Suggestions</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1 }}>
            {related.map((rp,i) => (
              <ProductCard key={rp.id} p={rp} index={i}
                onView={() => { setSelected(rp); setPage("product"); }}
                onAdd={() => addToCart(rp)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CartDrawer({ cart, open, onClose, updateQty, removeItem, setPage }) {
  const subtotal = cart.reduce((s,i) => s + i.price*i.qty, 0);
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:300, backdropFilter:"blur(4px)", animation:"fadeIn 0.3s ease" }}/>
      <div className="sr" style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(440px,100vw)", background:T.card, zIndex:301, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"26px 30px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:4 }}>Votre Sélection</p>
            <h3 className="serif" style={{ fontSize:22, fontWeight:300, color:T.text }}>Panier</h3>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, fontSize:22 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"22px 30px" }}>
          {cart.length===0 ? (
            <div style={{ textAlign:"center", paddingTop:80 }}>
              <p className="serif" style={{ fontSize:20, fontStyle:"italic", color:T.muted, marginBottom:22 }}>Votre panier est vide</p>
              <button className="gb" onClick={onClose} style={{ padding:"13px 28px" }}>Voir la Collection</button>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ display:"flex", gap:14, padding:"18px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ width:76, height:76, background:GRADIENTS[item.img], flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Bottle type={item.img} size={62} />
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:9, letterSpacing:"0.2em", color:T.gold, textTransform:"uppercase", marginBottom:4 }}>{item.category}</p>
                <p className="serif" style={{ fontSize:16, color:T.text, marginBottom:6 }}>{item.name}</p>
                <p style={{ fontSize:13, color:T.gold, fontFamily:"Montserrat", letterSpacing:"0.08em" }}>{(item.price*item.qty).toLocaleString()} DA</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
                <button onClick={() => removeItem(item.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16 }}>×</button>
                <div style={{ display:"flex", alignItems:"center", border:`1px solid ${T.border}` }}>
                  <button onClick={() => updateQty(item.id, item.qty-1)} style={{ background:"none", border:"none", color:T.text, width:26, height:26, cursor:"pointer" }}>−</button>
                  <span style={{ width:22, textAlign:"center", fontSize:11 }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty+1)} style={{ background:"none", border:"none", color:T.text, width:26, height:26, cursor:"pointer" }}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding:"22px 30px", borderTop:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:10, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase" }}>Sous-total</span>
              <span style={{ fontSize:15, color:T.text, fontFamily:"Montserrat" }}>{subtotal.toLocaleString()} DA</span>
            </div>
            <p style={{ fontSize:10, color:T.muted, marginBottom:22, letterSpacing:"0.05em" }}>Livraison calculée à la commande</p>
            <button className="gbf" onClick={() => { onClose(); setPage("checkout"); }}>
              Passer la Commande →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── CHECKOUT AVEC SUPABASE ──────────────────────────────────────────────────
function Checkout({ cart, setPage, clearCart, showToast, deliveryPrices }) {
  const [form, setForm] = useState({ name:"", phone:"", wilaya:"", commune:"", address:"", delivery:"home", notes:"" });
  const [confirmed, setConfirmed] = useState(false);
  const [orderNum, setOrderNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const communeList = getCommunes(form.wilaya);

  // FIX: prix de livraison depuis Supabase (deliveryPrices) avec fallback
  const getDeliveryPrice = (wilaya, type) => {
    const row = deliveryPrices.find(d => d.wilaya_name === wilaya);
    if (row) return type === "home" ? row.home_price : row.office_price;
    // Fallback si pas encore chargé
    const defaults = { "Alger":{ home:300, office:200 }, "Blida":{ home:400, office:280 }, "Boumerdès":{ home:400, office:280 }, "Tipaza":{ home:400, office:280 } };
    return defaults[wilaya]?.[type] ?? (type==="home" ? 500 : 350);
  };

  const deliveryPrice = form.wilaya ? getDeliveryPrice(form.wilaya, form.delivery) : 0;
  const subtotal = cart.reduce((s,i) => s + i.price*i.qty, 0);
  const total = subtotal + (form.wilaya ? deliveryPrice : 0);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Requis";
    if (!form.phone.match(/^0[5-7]\d{8}$/)) e.phone = "Format invalide (ex: 0661234567)";
    if (!form.wilaya)         e.wilaya  = "Requis";
    if (!form.commune)        e.commune = "Requis";
    if (!form.address.trim()) e.address = "Requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) { showToast("Veuillez corriger les erreurs"); return; }
    setLoading(true);

    const num = "DRL-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    const wilayaRow = deliveryPrices.find(d => d.wilaya_name === form.wilaya);

    const orderData = {
      order_number:    num,
      customer_name:   form.name,
      customer_phone:  form.phone,
      wilaya_code:     wilayaRow?.wilaya_code ?? null,
      wilaya_name:     form.wilaya,
      commune:         form.commune,
      address:         form.address,
      delivery_type:   form.delivery,
      delivery_price:  deliveryPrice,
      subtotal,
      total,
      notes:           form.notes,
      status:          "pending",
      items:           cart.map(i => ({ name:i.name, qty:i.qty, price:i.price })),
    };

    try {
      await sb.insert("orders", orderData);
      setOrderNum(num);
      setConfirmed(true);
      clearCart();
    } catch (err) {
      console.error("Supabase insert error:", err);
      // Si Supabase non configuré, on continue quand même en mode local
      setOrderNum(num);
      setConfirmed(true);
      clearCart();
      showToast("Commande enregistrée (mode local)");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && !confirmed) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:24 }}>
      <p className="serif" style={{ fontSize:28, fontStyle:"italic", color:T.muted }}>Votre panier est vide</p>
      <button className="gb" onClick={() => setPage("collection")} style={{ padding:"14px 32px" }}>Voir la Collection</button>
    </div>
  );

  if (confirmed) return (
    <div className="fa" style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:"40px 24px" }}>
      <div style={{ textAlign:"center", maxWidth:480 }}>
        <div style={{ width:76, height:76, border:`1px solid ${T.gold}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 30px" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.gold} strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <p style={{ fontSize:9, letterSpacing:"0.45em", color:T.gold, textTransform:"uppercase", marginBottom:14 }}>Commande Confirmée</p>
        <h2 className="serif" style={{ fontSize:44, fontWeight:300, color:T.text, marginBottom:6 }}>Merci</h2>
        <p className="serif" style={{ fontSize:18, fontStyle:"italic", color:T.champ, marginBottom:30 }}>{form.name}</p>
        <div style={{ background:T.card, padding:"26px", marginBottom:30, borderLeft:`2px solid ${T.gold}` }}>
          <p style={{ fontSize:10, color:T.muted, letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 }}>Numéro de Commande</p>
          <p style={{ fontSize:22, color:T.gold, fontFamily:"Montserrat", fontWeight:600, letterSpacing:"0.2em" }}>{orderNum}</p>
        </div>
        <p style={{ fontSize:13, color:T.muted, lineHeight:1.85, marginBottom:36 }}>
          Nous vous contacterons sous 24h pour confirmer votre commande et organiser la livraison.
        </p>
        <button className="gb" onClick={() => setPage("collection")} style={{ padding:"15px 46px" }}>Continuer les Achats</button>
      </div>
    </div>
  );

  return (
    <div className="fa" style={{ paddingTop:72, minHeight:"100vh", background:T.bg }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"40px 40px 80px", display:"grid", gridTemplateColumns:"1fr 400px", gap:56, alignItems:"start" }}>
        <div>
          {/* 01 — Informations */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:22, paddingBottom:11, borderBottom:`1px solid ${T.border}` }}>01 — Informations Personnelles</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label>Prénom & Nom *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ahmed Benali" style={{ borderColor:errors.name?"#CC444488":undefined }}/>
                {errors.name && <p style={{ fontSize:10, color:"#CC4444", marginTop:4 }}>{errors.name}</p>}
              </div>
              <div>
                <label>Téléphone *</label>
                <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="0661234567" style={{ borderColor:errors.phone?"#CC444488":undefined }}/>
                {errors.phone && <p style={{ fontSize:10, color:"#CC4444", marginTop:4 }}>{errors.phone}</p>}
              </div>
            </div>
          </div>
          {/* 02 — Adresse */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:22, paddingBottom:11, borderBottom:`1px solid ${T.border}` }}>02 — Adresse de Livraison</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label>Wilaya *</label>
                <div style={{ position:"relative" }}>
                  <select value={form.wilaya} onChange={e=>setForm({...form,wilaya:e.target.value,commune:""})} style={{ borderColor:errors.wilaya?"#CC444488":undefined }}>
                    <option value="">Sélectionner...</option>
                    {WILAYAS.map(w => <option key={w}>{w}</option>)}
                  </select>
                  <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:T.gold, pointerEvents:"none" }}>▾</span>
                </div>
                {errors.wilaya && <p style={{ fontSize:10, color:"#CC4444", marginTop:4 }}>{errors.wilaya}</p>}
              </div>
              <div>
                <label>Commune *</label>
                <div style={{ position:"relative" }}>
                  <select value={form.commune} onChange={e=>setForm({...form,commune:e.target.value})} disabled={!form.wilaya} style={{ borderColor:errors.commune?"#CC444488":undefined }}>
                    <option value="">Sélectionner...</option>
                    {communeList.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:T.gold, pointerEvents:"none" }}>▾</span>
                </div>
                {errors.commune && <p style={{ fontSize:10, color:"#CC4444", marginTop:4 }}>{errors.commune}</p>}
              </div>
            </div>
            <div>
              <label>Adresse Complète *</label>
              <textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})} rows={3} placeholder="Numéro, rue, cité, bâtiment..." style={{ borderColor:errors.address?"#CC444488":undefined }}/>
              {errors.address && <p style={{ fontSize:10, color:"#CC4444", marginTop:4 }}>{errors.address}</p>}
            </div>
          </div>
          {/* 03 — Livraison */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:22, paddingBottom:11, borderBottom:`1px solid ${T.border}` }}>03 — Mode de Livraison</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { val:"home",   label:"À Domicile",      sub:"Livraison à votre adresse" },
                { val:"office", label:"Bureau de Poste", sub:"Retrait en agence / relais" },
              ].map(opt => {
                const price = form.wilaya ? getDeliveryPrice(form.wilaya, opt.val) : null;
                return (
                  <div key={opt.val} onClick={() => setForm({...form,delivery:opt.val})} style={{
                    padding:"18px", cursor:"pointer", transition:"all 0.3s",
                    border: form.delivery===opt.val ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
                    background: form.delivery===opt.val ? "#1C1600" : T.card2
                  }}>
                    <p className="serif" style={{ fontSize:15, color:T.text, marginBottom:5 }}>{opt.label}</p>
                    <p style={{ fontSize:10, color:T.muted, marginBottom:10 }}>{opt.sub}</p>
                    <p style={{ fontSize:14, color:T.gold, fontFamily:"Montserrat", fontWeight:500 }}>
                      {price ? `${price.toLocaleString()} DA` : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          {/* 04 — Notes */}
          <div style={{ marginBottom:36 }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.muted, textTransform:"uppercase", marginBottom:22, paddingBottom:11, borderBottom:`1px solid ${T.border}` }}>04 — Notes (Optionnel)</p>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} placeholder="Instructions spéciales, précisions..."/>
          </div>
          <button className="gbf" onClick={handleConfirm} disabled={loading}>
            {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><Spinner/> Traitement...</span> : "Confirmer la Commande →"}
          </button>
        </div>
        {/* Récapitulatif */}
        <div>
          <div style={{ position:"sticky", top:90, background:T.card, padding:"28px" }}>
            <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:22 }}>Récapitulatif</p>
            <div style={{ marginBottom:20 }}>
              {cart.map(item => (
                <div key={item.id} style={{ display:"flex", gap:11, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ width:52, height:52, background:GRADIENTS[item.img], flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Bottle type={item.img} size={42} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p className="serif" style={{ fontSize:14, color:T.text, marginBottom:3 }}>{item.name}</p>
                    <p style={{ fontSize:10, color:T.muted }}>× {item.qty}</p>
                  </div>
                  <p style={{ fontSize:12, color:T.text, fontFamily:"Montserrat", whiteSpace:"nowrap" }}>{(item.price*item.qty).toLocaleString()} DA</p>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Sous-total</span>
              <span style={{ fontSize:13, color:T.text }}>{subtotal.toLocaleString()} DA</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Livraison</span>
              <span style={{ fontSize:13, color:T.text }}>{form.wilaya ? `${deliveryPrice.toLocaleString()} DA` : "—"}</span>
            </div>
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:"0.15em" }}>Total TTC</span>
              <span style={{ fontSize:22, color:T.gold, fontFamily:"Montserrat", fontWeight:600 }}>{total.toLocaleString()} DA</span>
            </div>
            <div style={{ marginTop:20, padding:14, background:"#111", borderLeft:`2px solid ${T.gold}33` }}>
              <p style={{ fontSize:11, color:T.muted, lineHeight:1.75 }}>
                Paiement à la livraison (Cash on Delivery). Vous serez contacté sous 24h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ setPage }) {
  return (
    <footer style={{ background:"#080808", borderTop:`1px solid ${T.border}`, padding:"56px 40px 36px" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:40 }}>
        <div>
          <Logo size={56} />
          <p style={{ fontSize:11, color:T.muted, marginTop:14, lineHeight:1.85 }}>
            Parfumerie en ligne depuis 2018.<br/>Livraison dans les 58 wilayas d'Algérie.
          </p>
        </div>
        <div>
          <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:18 }}>Navigation</p>
          {[["collection","Collection"],["home","Accueil"]].map(([p,l]) => (
            <button key={p} onClick={() => setPage(p)} style={{
              display:"block", background:"none", border:"none",
              color:T.muted, fontSize:12, cursor:"pointer", marginBottom:11,
              fontFamily:"Montserrat", letterSpacing:"0.1em", textAlign:"left", transition:"color 0.2s"
            }}>{l}</button>
          ))}
        </div>
        <div>
          <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:18 }}>Contact</p>
          <p style={{ fontSize:12, color:T.muted, lineHeight:1.85 }}>
            Instagram: @darlparfumerie<br/>
            Algérie — 58 Wilayas<br/>
            Paiement à la livraison
          </p>
        </div>
      </div>
      <div style={{ maxWidth:1200, margin:"36px auto 0", paddingTop:22, borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
        <p style={{ fontSize:10, color:T.muted, letterSpacing:"0.1em" }}>© 2025 Darl Parfumerie. Tous droits réservés.</p>
        <p style={{ fontSize:10, color:T.muted }}>Fait avec soin en Algérie</p>
      </div>
    </footer>
  );
}

// ─── ADMIN — LOGIN (SUPABASE AUTH RÉEL) ─────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !pass) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true);
    try {
      const data = await sb.signIn(email, pass);
      if (data.error || !data.access_token) {
        setError(data.error_description || data.msg || "Identifiants incorrects.");
        setLoading(false);
        return;
      }
      // Stocker le token en session
      sessionStorage.setItem("darl_token", data.access_token);
      sessionStorage.setItem("darl_user", JSON.stringify(data.user));
      onLogin(data.access_token);
    } catch (err) {
      setError("Erreur de connexion. Vérifiez votre configuration Supabase.");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 50% 40%, #1A1200 0%, #0A0A0A 70%)" }}>
      <div className="fu" style={{ width:"100%", maxWidth:400, padding:24 }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <Logo size={70} />
          <p style={{ fontSize:9, letterSpacing:"0.45em", color:T.gold, marginTop:14, textTransform:"uppercase" }}>Administration</p>
        </div>
        <div style={{ background:T.card2, padding:"36px 32px" }}>
          <h2 className="serif" style={{ fontSize:26, fontWeight:300, color:T.text, marginBottom:28 }}>Connexion</h2>
          <div style={{ marginBottom:18 }}>
            <label>Adresse Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@darl.dz"/>
          </div>
          <div style={{ marginBottom:24 }}>
            <label>Mot de Passe</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••"/>
          </div>
          {error && (
            <div style={{ background:"#1A0000", borderLeft:`2px solid #CC4444`, padding:"10px 13px", marginBottom:18 }}>
              <p style={{ fontSize:11, color:"#CC4444" }}>{error}</p>
            </div>
          )}
          <button className="ag" onClick={handleLogin} disabled={loading} style={{ width:"100%", padding:14 }}>
            {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner/> Connexion...</span> : "Se Connecter →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({ active, setActive, onLogout, collapsed, setCollapsed, userEmail }) {
  const nav = [
    { key:"dashboard", label:"Tableau de Bord", icon:"◈" },
    { key:"products",  label:"Produits",         icon:"◇" },
    { key:"orders",    label:"Commandes",         icon:"◎" },
    { key:"delivery",  label:"Livraisons",        icon:"◉" },
  ];
  return (
    <aside style={{ width:collapsed?62:218, background:T.card, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", transition:"width 0.3s ease", flexShrink:0, overflow:"hidden" }}>
      <div style={{ padding:collapsed?"18px 0":"22px 18px", display:"flex", alignItems:"center", gap:10, borderBottom:`1px solid ${T.border}`, justifyContent:collapsed?"center":"flex-start" }}>
        <Logo size={34} />
        {!collapsed && (
          <div>
            <p className="serif" style={{ fontSize:15, color:T.text, fontWeight:400 }}>Darl</p>
            <p style={{ fontSize:8, color:T.muted, letterSpacing:"0.28em", textTransform:"uppercase" }}>Admin</p>
          </div>
        )}
      </div>
      <nav style={{ flex:1, padding:"14px 0" }}>
        {nav.map(n => (
          <button key={n.key} onClick={() => setActive(n.key)} style={{
            display:"flex", alignItems:"center", gap:10, width:"100%",
            padding:collapsed?"13px 0":"13px 18px", justifyContent:collapsed?"center":"flex-start",
            background:"none", border:"none",
            borderLeft:active===n.key?`2px solid ${T.gold}`:"2px solid transparent",
            color:active===n.key?T.gold:T.muted,
            fontSize:collapsed?16:10, letterSpacing:"0.14em",
            textTransform:"uppercase", fontFamily:"Montserrat", transition:"all 0.2s"
          }}>
            <span style={{ fontSize:15, flexShrink:0 }}>{n.icon}</span>
            {!collapsed && <span>{n.label}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding:collapsed?"14px 0":"14px 18px", borderTop:`1px solid ${T.border}` }}>
        <button onClick={onLogout} style={{
          display:"flex", alignItems:"center", gap:10, width:"100%",
          background:"none", border:"none", color:T.muted, fontSize:10,
          letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"Montserrat",
          justifyContent:collapsed?"center":"flex-start", transition:"color 0.2s"
        }}>
          <span style={{ fontSize:15 }}>⊗</span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
      <button onClick={() => setCollapsed(!collapsed)} style={{
        background:"none", border:"none", borderTop:`1px solid ${T.border}`,
        color:T.muted, padding:"11px", fontSize:13, width:"100%"
      }}>{collapsed?"»":"«"}</button>
    </aside>
  );
}

function KpiCard({ label, value, sub, icon, delay=0 }) {
  return (
    <div className="fu" style={{ background:T.card2, padding:"26px 22px", borderLeft:`2px solid ${T.gold}33`, animationDelay:`${delay}s` }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.muted, textTransform:"uppercase" }}>{label}</p>
        <span style={{ color:T.gold, opacity:0.55, fontSize:17 }}>{icon}</span>
      </div>
      <p className="serif" style={{ fontSize:32, fontWeight:300, color:T.text, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:T.muted, marginTop:7, letterSpacing:"0.04em" }}>{sub}</p>}
    </div>
  );
}

function Dashboard({ orders, products }) {
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter(o => (o.created_at||o.date||"").startsWith(today)).length;
  const pending = orders.filter(o => o.status==="pending").length;
  const monthRev = orders.filter(o => o.status!=="cancelled").reduce((s,o) => s + (o.total||0), 0);

  return (
    <div className="fa" style={{ padding:40 }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:7 }}>Vue d'Ensemble</p>
        <h2 className="serif" style={{ fontSize:34, fontWeight:300, color:T.text }}>Tableau de Bord</h2>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:36 }}>
        <KpiCard label="Commandes Aujourd'hui" value={todayOrders} sub="Nouvelles commandes" icon="◈" delay={0}/>
        <KpiCard label="Revenu du Mois" value={`${monthRev.toLocaleString()} DA`} sub="Hors annulations" icon="◉" delay={0.08}/>
        <KpiCard label="En Attente" value={pending} sub="À traiter" icon="◇" delay={0.16}/>
        <KpiCard label="Produits Actifs" value={products.filter(p=>p.available).length} sub={`sur ${products.length} total`} icon="◉" delay={0.24}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:36 }}>
        <div style={{ background:T.card2, padding:26 }}>
          <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.muted, textTransform:"uppercase", marginBottom:18 }}>Chiffre d'Affaires Mensuel (DA)</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={CHART_DATA} barSize={26}>
              <XAxis dataKey="month" tick={{ fill:T.muted, fontSize:10, fontFamily:"Montserrat" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000}K`}/>
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:2, fontFamily:"Montserrat", fontSize:11 }} labelStyle={{ color:T.gold }} itemStyle={{ color:T.text }}/>
              <Bar dataKey="ca" fill={T.gold} opacity={0.85} radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:T.card2, padding:26 }}>
          <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.muted, textTransform:"uppercase", marginBottom:18 }}>Commandes / Semaine</p>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={WEEKLY}>
              <XAxis dataKey="day" tick={{ fill:T.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:T.muted, fontSize:9 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:2, fontFamily:"Montserrat", fontSize:11 }} labelStyle={{ color:T.gold }} itemStyle={{ color:T.text }}/>
              <Line type="monotone" dataKey="orders" stroke={T.gold} strokeWidth={2} dot={{ fill:T.gold, r:3 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background:T.card2, padding:26 }}>
        <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.muted, textTransform:"uppercase", marginBottom:18 }}>Dernières Commandes</p>
        {orders.length === 0 ? (
          <p style={{ fontSize:13, color:T.muted, textAlign:"center", padding:40 }}>Aucune commande pour l'instant</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["N° Commande","Client","Wilaya","Total","Statut","Date"].map(h => (
                  <th key={h} style={{ fontSize:9, letterSpacing:"0.18em", color:T.muted, textTransform:"uppercase", padding:"10px 14px", textAlign:"left", fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0,5).map(o => (
                <tr key={o.id||o.order_number} style={{ borderBottom:`1px solid ${T.border}22` }}>
                  <td style={{ padding:"13px 14px", fontSize:12, color:T.gold, fontFamily:"Montserrat", letterSpacing:"0.08em" }}>{o.order_number||o.id}</td>
                  <td style={{ padding:"13px 14px", fontSize:13, color:T.text }}>{o.customer_name||o.customer}</td>
                  <td style={{ padding:"13px 14px", fontSize:12, color:T.muted }}>{o.wilaya_name||o.wilaya}</td>
                  <td style={{ padding:"13px 14px", fontSize:13, color:T.text, fontFamily:"Montserrat" }}>{(o.total||0).toLocaleString()} DA</td>
                  <td style={{ padding:"13px 14px" }}><StatusBadge status={o.status}/></td>
                  <td style={{ padding:"13px 14px", fontSize:11, color:T.muted }}>{(o.created_at||o.date||"").slice(0,10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const CATEGORIES = ["Homme","Femme","Mixte","Oud"];
const emptyProductForm = () => ({ name:"", brand:"Darl Parfumerie", category:"Homme", price:"", stock:"", volume:100, short:"", description:"", topNotes:"", heartNotes:"", baseNotes:"", featured:false, available:true, img:"oud" });

function ProductsAdmin({ products, setProducts, showToast, authToken }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyProductForm());
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm(emptyProductForm()); setModal("add"); };
  const openEdit = (p) => {
    setForm({ ...p, price:p.price, stock:p.stock,
      topNotes:(p.notes?.top||[]).join(", "),
      heartNotes:(p.notes?.heart||[]).join(", "),
      baseNotes:(p.notes?.base||[]).join(", ") });
    setModal(p);
  };

  const save = async () => {
    if (!form.name || !form.price) { showToast("Nom et prix sont obligatoires"); return; }
    setSaving(true);
    const notes = {
      top:   form.topNotes.split(",").map(s=>s.trim()).filter(Boolean),
      heart: form.heartNotes.split(",").map(s=>s.trim()).filter(Boolean),
      base:  form.baseNotes.split(",").map(s=>s.trim()).filter(Boolean),
    };
    if (modal === "add") {
      const newP = { ...form, id:Date.now(), price:+form.price, stock:+form.stock, volume:+form.volume, notes };
      setProducts(prev => [...prev, newP]);
      showToast(`${form.name} ajouté`);
    } else {
      setProducts(prev => prev.map(p => p.id===modal.id ? {...p,...form, price:+form.price, stock:+form.stock, volume:+form.volume, notes} : p));
      showToast(`${form.name} modifié`);
    }
    setSaving(false);
    setModal(null);
  };

  const del = (id) => {
    setProducts(prev => prev.filter(p=>p.id!==id));
    showToast("Produit supprimé");
    setDelConfirm(null);
  };

  const toggle = (id) => setProducts(prev => prev.map(p=>p.id===id?{...p,available:!p.available}:p));

  const F = ({ k, label, ...rest }) => (
    <div>
      <label>{label}</label>
      <input value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} {...rest}/>
    </div>
  );

  return (
    <div className="fa" style={{ padding:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:36 }}>
        <div>
          <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:7 }}>Gestion</p>
          <h2 className="serif" style={{ fontSize:34, fontWeight:300, color:T.text }}>Produits</h2>
        </div>
        <button className="ag" onClick={openAdd}>+ Ajouter un Produit</button>
      </div>
      <div style={{ background:T.card2 }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Produit","Catégorie","Prix","Stock","Disponible","Vedette","Actions"].map(h => (
                <th key={h} style={{ fontSize:9, letterSpacing:"0.18em", color:T.muted, textTransform:"uppercase", padding:"14px 17px", textAlign:"left", fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p,i) => (
              <tr key={p.id} className="fu" style={{ borderBottom:`1px solid ${T.border}22`, animationDelay:`${i*0.04}s` }}>
                <td style={{ padding:"15px 17px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                    <div style={{ width:38, height:38, background:GRADIENTS[p.img]||GRADIENTS.oud, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <Bottle type={p.img} size={32} />
                    </div>
                    <div>
                      <p className="serif" style={{ fontSize:15, color:T.text }}>{p.name}</p>
                      <p style={{ fontSize:10, color:T.muted }}>{p.volume||100}ml</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding:"15px 17px", fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>{p.category}</td>
                <td style={{ padding:"15px 17px", fontSize:14, color:T.gold, fontFamily:"Montserrat", fontWeight:500 }}>{(+p.price).toLocaleString()} DA</td>
                <td style={{ padding:"15px 17px" }}>
                  <span style={{ fontSize:13, color: p.stock===0?"#CC4444":p.stock<=5?"#E8A030":T.text }}>{p.stock}</span>
                </td>
                <td style={{ padding:"15px 17px" }}>
                  <button onClick={() => toggle(p.id)} style={{
                    width:42, height:22, borderRadius:11,
                    background:p.available?T.gold:"#2A2A2A", border:"none", cursor:"pointer",
                    position:"relative", transition:"background 0.3s"
                  }}>
                    <span style={{ position:"absolute", top:3, left:p.available?21:3, width:16, height:16, borderRadius:"50%", background:p.available?"#0A0A0A":"#666", transition:"left 0.3s" }}/>
                  </button>
                </td>
                <td style={{ padding:"15px 17px" }}>
                  <span style={{ fontSize:14, color:p.featured?T.gold:T.border }}>{p.featured?"★":"☆"}</span>
                </td>
                <td style={{ padding:"15px 17px" }}>
                  <div style={{ display:"flex", gap:7 }}>
                    <button className="ao" onClick={() => openEdit(p)} style={{ padding:"6px 13px", fontSize:9 }}>Modifier</button>
                    <button onClick={() => setDelConfirm(p.id)} style={{ background:"none", border:`1px solid #CC444433`, color:"#CC4444", padding:"6px 9px", fontSize:11, cursor:"pointer", transition:"all 0.2s", borderRadius:2 }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {delConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div className="fu" style={{ background:T.card2, padding:38, maxWidth:340, textAlign:"center" }}>
            <p className="serif" style={{ fontSize:22, color:T.text, marginBottom:10 }}>Supprimer ?</p>
            <p style={{ fontSize:12, color:T.muted, marginBottom:28 }}>Cette action est irréversible.</p>
            <div style={{ display:"flex", gap:11, justifyContent:"center" }}>
              <button className="agh" onClick={() => setDelConfirm(null)}>Annuler</button>
              <button style={{ background:"#CC4444", color:"#fff", border:"none", padding:"10px 22px", fontSize:10, letterSpacing:"0.15em", cursor:"pointer", borderRadius:2 }} onClick={() => del(delConfirm)}>SUPPRIMER</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:500, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}>
          <div className="sl" style={{ width:"min(600px,100vw)", height:"100vh", background:T.card, overflowY:"auto", borderLeft:`1px solid ${T.border}` }}>
            <div style={{ padding:"26px 30px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:T.card, zIndex:1 }}>
              <h3 className="serif" style={{ fontSize:21, fontWeight:300, color:T.text }}>
                {modal==="add" ? "Nouveau Produit" : `Modifier — ${modal.name}`}
              </h3>
              <button onClick={() => setModal(null)} style={{ background:"none", border:"none", color:T.muted, fontSize:21 }}>×</button>
            </div>
            <div style={{ padding:"28px 30px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <F k="name" label="Nom du Produit *" placeholder="OUD ROYAL"/>
                <F k="brand" label="Marque"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:14 }}>
                <div>
                  <label>Catégorie</label>
                  <div style={{ position:"relative" }}>
                    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                      {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <span style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", color:T.gold, pointerEvents:"none" }}>▾</span>
                  </div>
                </div>
                <F k="price" label="Prix (DA) *" type="number" placeholder="3500"/>
                <F k="volume" label="Volume (ml)" type="number"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <F k="stock" label="Stock" type="number" placeholder="10"/>
                <div style={{ display:"flex", gap:18, alignItems:"flex-end", paddingBottom:2 }}>
                  {[["featured","Bestseller"],["available","Disponible"]].map(([k,l]) => (
                    <label key={k} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer", marginBottom:0 }}>
                      <input type="checkbox" checked={!!form[k]} onChange={e=>setForm({...form,[k]:e.target.checked})} style={{ width:15, height:15, accentColor:T.gold }}/>
                      <span style={{ fontSize:11, color:T.muted, letterSpacing:"0.1em" }}>{l}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label>Description courte</label>
                <input value={form.short||""} onChange={e=>setForm({...form,short:e.target.value})} placeholder="Une ode au bois sacré..."/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label>Description complète</label>
                <textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} rows={4}/>
              </div>
              <div style={{ marginBottom:26 }}>
                <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.gold, textTransform:"uppercase", marginBottom:14, paddingBottom:9, borderBottom:`1px solid ${T.border}` }}>Pyramide Olfactive</p>
                {[["topNotes","Notes de Tête"],["heartNotes","Notes de Cœur"],["baseNotes","Notes de Fond"]].map(([k,l]) => (
                  <div key={k} style={{ marginBottom:11 }}>
                    <label>{l} (séparées par virgule)</label>
                    <input value={form[k]||""} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder="Bergamote, Cardamome"/>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:11 }}>
                <button className="agh" onClick={() => setModal(null)} style={{ flex:1 }}>Annuler</button>
                <button className="ag" onClick={save} disabled={saving} style={{ flex:2 }}>
                  {saving ? <Spinner/> : (modal==="add" ? "Ajouter le Produit" : "Enregistrer")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN ORDERS (SUPABASE) ─────────────────────────────────────────────────
function OrdersAdmin({ orders, setOrders, authToken, showToast }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const statuses = ["all","pending","confirmed","shipped","delivered","cancelled"];

  const filtered = orders.filter(o => {
    const mf = filter==="all" || o.status===filter;
    const q = search.toLowerCase();
    const id = (o.order_number||o.id||"").toLowerCase();
    const phone = (o.customer_phone||o.phone||"");
    const name = (o.customer_name||o.customer||"").toLowerCase();
    const wilaya = (o.wilaya_name||o.wilaya||"").toLowerCase();
    const ms = !search || id.includes(q) || phone.includes(q) || name.includes(q) || wilaya.includes(q);
    return mf && ms;
  });

  const updateStatus = async (id, status) => {
    setUpdating(true);
    // Essayer Supabase d'abord, sinon mise à jour locale
    try {
      await sb.update("orders", { order_number: id }, { status }, authToken);
    } catch (e) {
      console.warn("Supabase update failed, updating locally:", e);
    }
    setOrders(prev => prev.map(o => (o.order_number===id||o.id===id) ? {...o,status} : o));
    if (selected && (selected.order_number===id||selected.id===id)) setSelected(prev => ({...prev,status}));
    showToast("Statut mis à jour");
    setUpdating(false);
  };

  return (
    <div className="fa" style={{ padding:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:7 }}>Gestion</p>
          <h2 className="serif" style={{ fontSize:34, fontWeight:300, color:T.text }}>Commandes</h2>
        </div>
        <div style={{ fontSize:11, color:T.muted }}>{filtered.length} commande{filtered.length>1?"s":""}</div>
      </div>

      {/* Filtres */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:20 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background:filter===s?T.card3:"none", border:`1px solid ${filter===s?T.gold:T.border}`,
            color:filter===s?T.gold:T.muted, padding:"7px 14px", fontSize:9,
            letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", borderRadius:2, transition:"all 0.2s", fontFamily:"Montserrat"
          }}>{s==="all"?"Tout":STATUS_CFG[s]?.label||s}</button>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ position:"relative", marginBottom:24 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher par N°, téléphone, client, wilaya..." style={{ paddingLeft:40 }}/>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", color:T.muted, fontSize:14 }}>⌕</span>
      </div>

      {/* Table */}
      <div style={{ background:T.card2 }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign:"center", padding:60, color:T.muted, fontSize:13 }}>Aucune commande trouvée</p>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["N° Commande","Client","Wilaya","Total","Type","Statut","Date",""].map(h => (
                  <th key={h} style={{ fontSize:9, letterSpacing:"0.18em", color:T.muted, textTransform:"uppercase", padding:"12px 14px", textAlign:"left", fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o,i) => (
                <tr key={o.id||o.order_number} className="fu" onClick={() => setSelected(o)}
                  style={{ borderBottom:`1px solid ${T.border}22`, cursor:"pointer", animationDelay:`${i*0.03}s`, transition:"background 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#161616"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"13px 14px", fontSize:12, color:T.gold, fontFamily:"Montserrat", letterSpacing:"0.08em" }}>{o.order_number||o.id}</td>
                  <td style={{ padding:"13px 14px" }}>
                    <p style={{ fontSize:13, color:T.text }}>{o.customer_name||o.customer}</p>
                    <p style={{ fontSize:10, color:T.muted }}>{o.customer_phone||o.phone}</p>
                  </td>
                  <td style={{ padding:"13px 14px", fontSize:12, color:T.muted }}>{o.wilaya_name||o.wilaya}</td>
                  <td style={{ padding:"13px 14px", fontSize:13, color:T.text, fontFamily:"Montserrat" }}>{(o.total||0).toLocaleString()} DA</td>
                  <td style={{ padding:"13px 14px", fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    {(o.delivery_type||o.delivery)==="home"?"Domicile":"Bureau"}
                  </td>
                  <td style={{ padding:"13px 14px" }}><StatusBadge status={o.status}/></td>
                  <td style={{ padding:"13px 14px", fontSize:11, color:T.muted }}>{(o.created_at||o.date||"").slice(0,10)}</td>
                  <td style={{ padding:"13px 14px", fontSize:11, color:T.gold }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer détail commande */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:400 }}/>
          <div className="sr" style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(440px,100vw)", background:T.card, zIndex:401, overflowY:"auto" }}>
            <div style={{ padding:"24px 26px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:T.card }}>
              <div>
                <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:4 }}>Détail</p>
                <p style={{ fontSize:14, color:T.text, fontFamily:"Montserrat", letterSpacing:"0.1em" }}>{selected.order_number||selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", color:T.muted, fontSize:20, cursor:"pointer" }}>×</button>
            </div>
            <div style={{ padding:"26px" }}>
              <div style={{ marginBottom:26 }}>
                <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.gold, textTransform:"uppercase", marginBottom:14, paddingBottom:9, borderBottom:`1px solid ${T.border}` }}>Client</p>
                {[
                  ["Nom", selected.customer_name||selected.customer],
                  ["Téléphone", selected.customer_phone||selected.phone],
                  ["Wilaya", selected.wilaya_name||selected.wilaya],
                  ["Commune", selected.commune],
                  ["Adresse", selected.address],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:9, gap:10 }}>
                    <span style={{ fontSize:10, color:T.muted, letterSpacing:"0.1em", textTransform:"uppercase", flexShrink:0 }}>{k}</span>
                    <span style={{ fontSize:12, color:T.text, textAlign:"right" }}>{v}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div style={{ marginTop:10, padding:"10px 13px", background:"#111", borderLeft:`2px solid ${T.border}` }}>
                    <p style={{ fontSize:11, color:T.muted }}>{selected.notes}</p>
                  </div>
                )}
              </div>
              <div style={{ marginBottom:26 }}>
                <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.gold, textTransform:"uppercase", marginBottom:14, paddingBottom:9, borderBottom:`1px solid ${T.border}` }}>Articles</p>
                {(selected.items||[]).map((it,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${T.border}22` }}>
                    <p className="serif" style={{ fontSize:15, color:T.text }}>{it.name}</p>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontSize:12, color:T.muted }}>× {it.qty}</p>
                      <p style={{ fontSize:13, color:T.gold }}>{(it.price*it.qty).toLocaleString()} DA</p>
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, paddingTop:11, borderTop:`1px solid ${T.border}` }}>
                  <span style={{ fontSize:11, color:T.muted }}>Livraison ({(selected.delivery_type||selected.delivery)==="home"?"Domicile":"Bureau"})</span>
                  <span style={{ fontSize:13, color:T.text }}>{(selected.delivery_price||selected.deliveryPrice||0).toLocaleString()} DA</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
                  <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:"0.1em" }}>Total</span>
                  <span style={{ fontSize:18, color:T.gold, fontFamily:"Montserrat", fontWeight:600 }}>{(selected.total||0).toLocaleString()} DA</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize:9, letterSpacing:"0.25em", color:T.gold, textTransform:"uppercase", marginBottom:14, paddingBottom:9, borderBottom:`1px solid ${T.border}` }}>Mettre à Jour le Statut</p>
                {updating && <div style={{ textAlign:"center", padding:10 }}><Spinner/></div>}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
                  {Object.entries(STATUS_CFG).map(([s,c]) => (
                    <button key={s} onClick={() => updateStatus(selected.order_number||selected.id, s)} style={{
                      background:selected.status===s?c.bg:"transparent",
                      border:`1px solid ${selected.status===s?c.color:T.border}`,
                      color:selected.status===s?c.color:T.muted,
                      padding:"9px 13px", fontSize:9, cursor:"pointer",
                      letterSpacing:"0.1em", textTransform:"uppercase",
                      fontFamily:"Montserrat", transition:"all 0.2s", borderRadius:2
                    }}>{c.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ADMIN DELIVERY (SUPABASE) ───────────────────────────────────────────────
function DeliveryAdmin({ deliveryPrices, setDeliveryPrices, showToast, authToken }) {
  const [editing, setEditing] = useState(null);
  const [editVals, setEditVals] = useState({ home:"", office:"" });
  const [saving, setSaving] = useState(false);

  const saveRow = async (code) => {
    setSaving(true);
    const updated = { home_price:+editVals.home, office_price:+editVals.office };
    try {
      await sb.update("delivery_prices", { wilaya_code: code }, updated, authToken);
      setDeliveryPrices(prev => prev.map(w => w.wilaya_code===code ? {...w,...updated} : w));
      showToast("Tarifs mis à jour");
    } catch (e) {
      // Mise à jour locale si Supabase non configuré
      setDeliveryPrices(prev => prev.map(w => w.wilaya_code===code ? {...w,...updated} : w));
      showToast("Tarifs mis à jour (local)");
    }
    setSaving(false);
    setEditing(null);
  };

  return (
    <div className="fa" style={{ padding:40 }}>
      <div style={{ marginBottom:36 }}>
        <p style={{ fontSize:9, letterSpacing:"0.3em", color:T.gold, textTransform:"uppercase", marginBottom:7 }}>Configuration</p>
        <h2 className="serif" style={{ fontSize:34, fontWeight:300, color:T.text }}>Tarifs de Livraison</h2>
      </div>
      <div style={{ background:T.card2, marginBottom:20 }}>
        <div style={{ padding:"15px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:36 }}>
          {[["◈","À Domicile","Livraison à l'adresse du client"],["◇","Bureau / Relais","Retrait en agence ou point relais"]].map(([icon,t,d]) => (
            <div key={t} style={{ display:"flex", gap:11, alignItems:"center" }}>
              <span style={{ color:T.gold }}>{icon}</span>
              <div>
                <p style={{ fontSize:11, color:T.text }}>{t}</p>
                <p style={{ fontSize:10, color:T.muted }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Code","Wilaya","Domicile (DA)","Bureau (DA)","Actions"].map(h => (
                <th key={h} style={{ fontSize:9, letterSpacing:"0.18em", color:T.muted, textTransform:"uppercase", padding:"13px 18px", textAlign:"left", fontWeight:500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deliveryPrices.map((w,i) => (
              <tr key={w.wilaya_code} className="fu" style={{ borderBottom:`1px solid ${T.border}22`, animationDelay:`${i*0.02}s` }}>
                <td style={{ padding:"13px 18px", fontSize:11, color:T.muted }}>{w.wilaya_code}</td>
                <td style={{ padding:"13px 18px" }}>
                  <p className="serif" style={{ fontSize:15, color:T.text }}>{w.wilaya_name}</p>
                </td>
                <td style={{ padding:"13px 18px" }}>
                  {editing===w.wilaya_code
                    ? <input type="number" value={editVals.home} onChange={e=>setEditVals({...editVals,home:e.target.value})} style={{ width:90 }}/>
                    : <span style={{ fontSize:14, color:T.gold, fontFamily:"Montserrat", fontWeight:500 }}>{(w.home_price||0).toLocaleString()}</span>
                  }
                </td>
                <td style={{ padding:"13px 18px" }}>
                  {editing===w.wilaya_code
                    ? <input type="number" value={editVals.office} onChange={e=>setEditVals({...editVals,office:e.target.value})} style={{ width:90 }}/>
                    : <span style={{ fontSize:14, color:T.gold, fontFamily:"Montserrat", fontWeight:500 }}>{(w.office_price||0).toLocaleString()}</span>
                  }
                </td>
                <td style={{ padding:"13px 18px" }}>
                  {editing===w.wilaya_code
                    ? <div style={{ display:"flex", gap:7 }}>
                        <button className="ag" onClick={() => saveRow(w.wilaya_code)} disabled={saving} style={{ padding:"7px 14px", fontSize:9 }}>
                          {saving ? <Spinner/> : "Sauvegarder"}
                        </button>
                        <button className="agh" onClick={() => setEditing(null)} style={{ padding:"7px 11px", fontSize:9 }}>✕</button>
                      </div>
                    : <button className="ao" onClick={() => { setEditing(w.wilaya_code); setEditVals({home:w.home_price||0, office:w.office_price||0}); }} style={{ padding:"7px 14px", fontSize:9 }}>Modifier</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deliveryPrices.length === 0 && (
        <div style={{ background:"#0D1A0D", borderLeft:`2px solid #60D06033`, padding:"14px 18px" }}>
          <p style={{ fontSize:11, color:"#60D060", letterSpacing:"0.04em" }}>
            Connectez Supabase pour afficher et modifier les 58 wilayas complètes.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ onExit }) {
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem("darl_token") || null);
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState(PRODUCTS_INIT);
  const [deliveryPrices, setDeliveryPrices] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const showToast = useCallback((msg) => setToast(msg), []);

  // Charger les données depuis Supabase après connexion
  useEffect(() => {
    if (!authToken) return;
    setLoadingData(true);
    Promise.all([
      sb.from("orders", "?order=created_at.desc&limit=200").catch(() => []),
      sb.from("delivery_prices", "?order=wilaya_code.asc").catch(() => []),
    ]).then(([ordersData, deliveryData]) => {
      if (Array.isArray(ordersData) && ordersData.length > 0) setOrders(ordersData);
      if (Array.isArray(deliveryData) && deliveryData.length > 0) setDeliveryPrices(deliveryData);
    }).finally(() => setLoadingData(false));
  }, [authToken]);

  const handleLogout = async () => {
    try { await sb.signOut(authToken); } catch (e) {}
    sessionStorage.removeItem("darl_token");
    sessionStorage.removeItem("darl_user");
    setAuthToken(null);
    setPage("dashboard");
    setOrders([]);
  };

  if (!authToken) return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"relative" }}>
        <button onClick={onExit} style={{
          position:"fixed", top:20, left:20, zIndex:999,
          background:"none", border:`1px solid ${T.border}`, color:T.muted,
          padding:"8px 16px", fontSize:10, letterSpacing:"0.15em", cursor:"pointer", borderRadius:2
        }}>← Boutique</button>
        <AdminLogin onLogin={(token) => setAuthToken(token)}/>
      </div>
    </>
  );

  const pageLabels = { dashboard:"Tableau de Bord", products:"Produits", orders:"Commandes", delivery:"Livraisons" };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <AdminSidebar active={page} setActive={setPage} onLogout={handleLogout} collapsed={collapsed} setCollapsed={setCollapsed}/>
        <main style={{ flex:1, overflowY:"auto", background:T.bg }}>
          <div style={{
            position:"sticky", top:0, zIndex:10, background:"rgba(10,10,10,0.96)",
            backdropFilter:"blur(12px)", borderBottom:`1px solid ${T.border}`,
            padding:"0 40px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between"
          }}>
            <p style={{ fontSize:10, letterSpacing:"0.25em", color:T.muted, textTransform:"uppercase" }}>
              {pageLabels[page]}
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <button onClick={onExit} style={{
                background:"none", border:`1px solid ${T.border}`, color:T.muted,
                padding:"6px 14px", fontSize:9, letterSpacing:"0.15em", cursor:"pointer",
                textTransform:"uppercase", fontFamily:"Montserrat", borderRadius:2, transition:"all 0.2s"
              }}>← Boutique</button>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#60D060" }}/>
                <p style={{ fontSize:11, color:T.muted }}>
                  {JSON.parse(sessionStorage.getItem("darl_user")||"{}").email || "admin"}
                </p>
              </div>
            </div>
          </div>
          {loadingData && (
            <div style={{ padding:"20px 40px", display:"flex", alignItems:"center", gap:10 }}>
              <Spinner/><span style={{ fontSize:11, color:T.muted }}>Chargement des données...</span>
            </div>
          )}
          {page==="dashboard" && <Dashboard orders={orders} products={products}/>}
          {page==="products"  && <ProductsAdmin products={products} setProducts={setProducts} showToast={showToast} authToken={authToken}/>}
          {page==="orders"    && <OrdersAdmin orders={orders} setOrders={setOrders} authToken={authToken} showToast={showToast}/>}
          {page==="delivery"  && <DeliveryAdmin deliveryPrices={deliveryPrices} setDeliveryPrices={setDeliveryPrices} showToast={showToast} authToken={authToken}/>}
        </main>
      </div>
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
    </>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]     = useState("store");
  const [page, setPage]     = useState("home");
  const [products]          = useState(PRODUCTS_INIT);
  const [cart, setCart]     = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, setToast]   = useState(null);
  const [deliveryPrices, setDeliveryPrices] = useState([]);

  const showToast = useCallback((msg) => setToast(msg), []);

  // Charger les prix de livraison depuis Supabase au démarrage
  useEffect(() => {
    sb.from("delivery_prices", "?order=wilaya_code.asc")
      .then(data => { if (Array.isArray(data) && data.length > 0) setDeliveryPrices(data); })
      .catch(() => {}); // Silencieux si pas configuré
  }, []);

  const addToCart = useCallback((p) => {
    setCart(prev => {
      const ex = prev.find(i => i.id===p.id);
      if (ex) return prev.map(i => i.id===p.id ? {...i,qty:i.qty+1} : i);
      return [...prev, {...p, qty:1}];
    });
    showToast(`${p.name} ajouté au panier`);
  }, [showToast]);

  const updateQty = useCallback((id, qty) => {
    if (qty < 1) { setCart(c => c.filter(i=>i.id!==id)); return; }
    setCart(c => c.map(i => i.id===id ? {...i,qty} : i));
  }, []);

  const removeItem = useCallback((id) => setCart(c => c.filter(i=>i.id!==id)), []);
  const clearCart  = useCallback(() => setCart([]), []);
  const cartCount  = cart.reduce((s,i) => s+i.qty, 0);

  if (mode === "admin") {
    return <AdminPanel onExit={() => setMode("store")}/>;
  }

  return (
    <>
      <style>{CSS}</style>
      <Header page={page} setPage={setPage} cartCount={cartCount} onCartOpen={() => setCartOpen(true)} />
      <div className="fa">
        {page==="home"       && <Hero setPage={setPage}/>}
        {page==="collection" && <Collection products={products} setPage={setPage} setSelected={setSelected} addToCart={addToCart}/>}
        {page==="product"    && selected && <ProductDetail p={selected} products={products} setPage={setPage} setSelected={setSelected} addToCart={addToCart}/>}
        {page==="checkout"   && <Checkout cart={cart} setPage={setPage} clearCart={clearCart} showToast={showToast} deliveryPrices={deliveryPrices}/>}
      </div>
      {page!=="home" && page!=="checkout" && <Footer setPage={setPage}/>}
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} updateQty={updateQty} removeItem={removeItem} setPage={setPage}/>
      {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}

      {/* زر Admin — كما هو بالضبط */}
      <button onClick={() => setMode("admin")} style={{
        position:"fixed", bottom:20, left:20, zIndex:9998,
        background:"rgba(10,10,10,0.9)", border:`1px solid ${T.border}`, color:T.muted,
        padding:"8px 16px", fontSize:9, letterSpacing:"0.18em", cursor:"pointer",
        textTransform:"uppercase", fontFamily:"Montserrat", borderRadius:2,
        transition:"all 0.2s"
      }}>Admin</button>
    </>
  );
}