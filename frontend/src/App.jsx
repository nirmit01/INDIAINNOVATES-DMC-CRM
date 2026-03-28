import { useState, useRef, useCallback, useEffect } from "react";

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
if (!document.getElementById("dmc-global")) {
  const s = document.createElement("style");
  s.id = "dmc-global";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&family=Courier+Prime:wght@400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    body { font-family: 'Noto Sans', sans-serif; -webkit-font-smoothing: antialiased; }
    input, select, textarea, button { font-family: 'Noto Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #D1D8E8; border-radius: 3px; }
    @keyframes dmcFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes dmcSpin { to { transform: rotate(360deg); } }
    @keyframes dmcPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
  `;
  document.head.appendChild(s);
}

// ─── THEME ENGINE ─────────────────────────────────────────────────────────────
const isDark = typeof window !== 'undefined' && localStorage.getItem("dmcTheme") === "dark";

export const toggleTheme = () => {
  localStorage.setItem("dmcTheme", isDark ? "light" : "dark");
  window.location.reload(); // Instantly applies theme without complex React state
};

const LIGHT = {
  navy:      "#1B3A6B", navyDark: "#122848", navyLight:"#2350A0",
  saffron:   "#FF6600", saffronL: "#FFF3EB",
  green:     "#1A7A4A", greenL:   "#E8F5EE",
  ink:       "#1A1A2E", inkMid:   "#2D3561",
  steel:     "#5A6580", steelL:   "#8E9AB5",
  border:    "#D1D8E8", borderL:  "#EAEEf7",
  surface:   "#F4F6FB", white:    "#FFFFFF",
  red:       "#C0392B", redL:     "#FDEDEC",
  amber:     "#B7600A", amberL:   "#FEF5E7",
  blue:      "#1B4F9E", blueL:    "#EBF1FB",
  purple:    "#6B3FA0", purpleL:  "#F3EEF9",
};

const DARK = {
  navy:      "#3B82F6", navyDark: "#0B1120", navyLight:"#1D4ED8", // Glowing blues
  saffron:   "#F97316", saffronL: "#432C1A",
  green:     "#22C55E", greenL:   "#143823",
  ink:       "#F8FAFC", inkMid:   "#CBD5E1", // Bright text for readability
  steel:     "#94A3B8", steelL:   "#475569", // Muted subtext
  border:    "#334155", borderL:  "#1E293B", // Subtle dark borders
  surface:   "#020617", white:    "#0F172A", // Deep charcoal backgrounds
  red:       "#EF4444", redL:     "#451A1A",
  amber:     "#F59E0B", amberL:   "#452715",
  blue:      "#3B82F6", blueL:    "#172554",
  purple:    "#A855F7", purpleL:  "#3B1D59",
};

const T = isDark ? DARK : LIGHT;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STATUS_META = {
  Submitted:      { c: T.steel,   bg: T.surface,  label: "Submitted" },
  "Under Review": { c: T.blue,    bg: T.blueL,    label: "Under Review" },
  Assigned:       { c: T.purple,  bg: T.purpleL,  label: "Assigned" },
  "In Progress":  { c: T.saffron, bg: T.saffronL, label: "In Progress" },
  Resolved:       { c: T.green,   bg: T.greenL,   label: "Resolved" },
  Rejected:       { c: T.red,     bg: T.redL,     label: "Rejected" },
};
const PRIORITY_META = {
  Low:      { c: T.green,   bg: T.greenL  },
  Medium:   { c: T.amber,   bg: T.amberL  },
  High:     { c: T.red,     bg: T.redL    },
  Critical: { c: T.red,     bg: T.redL    },
};
const DEPTS = ["Sanitation & Solid Waste","Roads & Infrastructure","Water Supply & Drainage","Electricity & Streetlights","Public Health","Parks & Gardens","Building & Planning","Traffic & Transport","Other"];
const ZONES  = ["Central Delhi","North Delhi","South Delhi","East Delhi","West Delhi","North-East Delhi","North-West Delhi","Shahdara","New Delhi"];
const ALL_STATUSES = Object.keys(STATUS_META);
const ALL_PRIORITIES = ["Low","Medium","High","Critical"];

// ─── API HELPERS ──────────────────────────────────────────────────────────────
const API = "https://dmc-crm-backend.onrender.com/api";

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  
  if (!res.ok) throw new Error("API error " + res.status);
  return res.json();
};

const callAI = async (payload, apiKey = "") => {
  // Updated to point to the new Gemini endpoint
  const res = await fetch(API + "/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(payload),
  });
  return res.json();
};

// ─── STORE HOOK ───────────────────────────────────────────────────────────────
const useComplaints = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const d = await apiFetch("/complaints");
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addComplaint = async (c) => {
    await apiFetch("/complaints", { method: "POST", body: c });
    await refresh();
  };

  const updateComplaint = async (id, changes) => {
    await apiFetch("/complaints/" + id, { method: "PATCH", body: changes });
    await refresh();
  };

  return { data, loading, addComplaint, updateComplaint, refresh };
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const now = () => new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true });
const today = () => new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
const newId = () => "DMC-" + String(Date.now()).slice(-6);

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ n, s = 16, c = "currentColor" }) => {
  const p = { width: s, height: s, display: "inline-block", flexShrink: 0, verticalAlign: "middle" };
  const icons = {
    home:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    list:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill={c}/><circle cx="3" cy="12" r="1" fill={c}/><circle cx="3" cy="18" r="1" fill={c}/></svg>,
    plus:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    search: <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    clock:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    chart:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    map:    <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    bell:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    user:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    logout: <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    check:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
    close:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    warn:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    spark:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    chevR:  <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
    eye:    <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    lock:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    mail:   <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    pin:    <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    upload: <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
    filter: <svg style={p} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  };
  return icons[n] || null;
};

const Spinner = ({ size = 18 }) => (
  <svg style={{ width: size, height: size, animation: "dmcSpin 0.85s linear infinite", display: "inline-block" }}
    viewBox="0 0 24 24" fill="none" stroke={T.navy} strokeWidth="2.5">
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.15"/>
    <path d="M21 12a9 9 0 00-9-9"/>
  </svg>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { c: T.steel, bg: T.surface, label: status };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:3,
      fontSize:11, fontWeight:600, background:m.bg, color:m.c, border:`1px solid ${m.c}30`, whiteSpace:"nowrap", letterSpacing:"0.02em" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:m.c, flexShrink:0 }}/>
      {m.label}
    </span>
  );
};

const PriBadge = ({ priority }) => {
  const m = PRIORITY_META[priority] || { c: T.steel, bg: T.surface };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 8px", borderRadius:3,
      fontSize:11, fontWeight:600, background:m.bg, color:m.c, border:`1px solid ${m.c}30`, whiteSpace:"nowrap" }}>
      {priority}
    </span>
  );
};

const GovBanner = () => (
  <div style={{ background:T.navyDark, color:"#fff", padding:"7px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontSize:16 }}>🏛</span>
      </div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, letterSpacing:"0.04em" }}>Delhi Municipal Corporation</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", letterSpacing:"0.06em" }}>GOVERNMENT OF NCT OF DELHI</div>
      </div>
    </div>
    
    <div style={{ display:"flex", alignItems:"center", gap:16, fontSize:11, color:"rgba(255,255,255,0.55)" }}>
      {/* --- THEME TOGGLE BUTTON --- */}
      <button onClick={toggleTheme} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, padding:"4px 10px", color:"#fff", cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", gap:5, fontFamily:"inherit", transition:"all 0.2s" }}>
        {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>
      
      <span style={{ marginLeft: 8 }}>Skip to main content</span><span>|</span><span>Screen Reader</span><span>|</span><span>A- A A+</span>
    </div>
  </div>
);

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = ({ type, onLogin, onSwitch }) => {
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [phone, setPhone]     = useState("");
  const [name, setName]       = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mode, setMode]       = useState("login");

  const isAdmin = type === "admin";
  const ADMIN_CREDS   = { email: "admin@dmc.delhi.gov.in", pass: "Admin@123" };
  const CITIZEN_CREDS = { email: "citizen@delhi.gov.in",   pass: "Citizen@123" };

const handleSubmit = async () => {
    setErr("");
    setLoading(true);

    const role = isAdmin ? "admin" : "citizen";

    try {
      if (mode === "login" || isAdmin) {
        // --- LOGIN REQUEST ---
        if (!email || !pass) { setErr("Email and password are required."); setLoading(false); return; }

        const res = await fetch(API + "/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, pass, role })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");

        onLogin(data);

      } else {
        // --- REGISTER REQUEST ---
        if (!name || !email || !phone || !pass) { setErr("All fields are required."); setLoading(false); return; }
        if (phone.length !== 10) { setErr("Enter a valid 10-digit mobile number."); setLoading(false); return; }

        const res = await fetch(API + "/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, pass })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Registration failed");

        onLogin(data);
      }
    } catch (error) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  const inp = {
    width:"100%", padding:"10px 12px", borderRadius:4, border:`1.5px solid ${T.border}`,
    background:T.white, color:T.ink, outline:"none", fontSize:13, fontFamily:"inherit", transition:"border-color 0.15s",
  };

  return (
    <div style={{ minHeight:"100vh", background:T.surface, display:"flex", flexDirection:"column" }}>
      <GovBanner/>
      <div style={{ background:T.navy, padding:"0 24px", display:"flex", alignItems:"center", gap:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 0", marginRight:32 }}>
          <div style={{ width:3, height:20, background:T.saffron, borderRadius:2 }}/>
          <span style={{ color:"#fff", fontWeight:700, fontSize:14, letterSpacing:"0.01em" }}>Grievance Management System</span>
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={onSwitch} style={{ background:"transparent", border:`1px solid rgba(255,255,255,0.35)`, borderRadius:3, padding:"5px 14px", color:"rgba(255,255,255,0.85)", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>
          {isAdmin ? "Citizen Portal →" : "Admin Login →"}
        </button>
      </div>
      <div style={{ display:"flex", height:4 }}>
        <div style={{ flex:1, background:"#FF9933" }}/><div style={{ flex:1, background:"#FFFFFF" }}/><div style={{ flex:1, background:"#138808" }}/>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 16px" }}>
        <div style={{ width:"100%", maxWidth:440 }}>
          <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden", boxShadow:"0 4px 24px rgba(27,58,107,0.09)" }}>
            <div style={{ background: isAdmin ? T.navy : T.navyDark, padding:"22px 28px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon n={isAdmin ? "lock" : "user"} s={20} c="#fff"/>
                </div>
                <div>
                  <div style={{ color:"#fff", fontWeight:700, fontSize:16, letterSpacing:"0.01em" }}>
                    {isAdmin ? "Admin Login" : mode === "login" ? "Citizen Login" : "New Registration"}
                  </div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, marginTop:2 }}>
                    {isAdmin ? "Authorised Personnel Only" : "DMC Grievance Portal"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding:"24px 28px" }}>
              {!isAdmin && (
                <div style={{ display:"flex", border:`1px solid ${T.border}`, borderRadius:4, overflow:"hidden", marginBottom:20 }}>
                  {["login","register"].map(m => (
                    <button key={m} onClick={() => { setMode(m); setErr(""); }}
                      style={{ flex:1, padding:"8px 0", border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                        background: mode===m ? T.navy : T.white, color: mode===m ? "#fff" : T.steel,
                        textTransform:"capitalize", fontFamily:"inherit", transition:"all 0.15s" }}>
                      {m === "login" ? "Login" : "New Registration"}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {!isAdmin && mode === "register" && (
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:T.steel, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 }}>Full Name *</label>
                    <input style={inp} placeholder="As per Aadhaar card" value={name} onChange={e=>setName(e.target.value)} onKeyDown={handleKeyDown}/>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.steel, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 }}>
                    {isAdmin ? "Official Email ID" : "Email Address"}
                  </label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><Icon n="mail" s={14} c={T.steelL}/></div>
                    <input style={{ ...inp, paddingLeft:34 }} type="email"
                      placeholder={isAdmin ? "admin@dmc.delhi.gov.in" : "your@email.com"}
                      value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={handleKeyDown}/>
                  </div>
                </div>
                {!isAdmin && mode === "register" && (
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:T.steel, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 }}>Mobile Number *</label>
                    <input style={inp} type="tel" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/,""))} onKeyDown={handleKeyDown}/>
                  </div>
                )}
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:T.steel, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 }}>Password</label>
                  <div style={{ position:"relative" }}>
                    <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><Icon n="lock" s={14} c={T.steelL}/></div>
                    <input style={{ ...inp, paddingLeft:34, paddingRight:38 }}
                      type={showPass ? "text" : "password"} placeholder="Enter password"
                      value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={handleKeyDown}/>
                    <button type="button" onClick={()=>setShowPass(!showPass)}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                      <Icon n="eye" s={14} c={T.steelL}/>
                    </button>
                  </div>
                </div>

                {err && (
                  <div style={{ background:T.redL, border:`1px solid ${T.red}30`, borderRadius:4, padding:"9px 12px", fontSize:12, color:T.red, display:"flex", alignItems:"center", gap:7 }}>
                    <Icon n="warn" s={14} c={T.red}/> {err}
                  </div>
                )}

                <button type="button" onClick={handleSubmit} disabled={loading}
                  style={{ background: loading ? T.steelL : T.navy, color:"#fff", border:"none", borderRadius:4,
                    padding:"11px 0", fontSize:13, fontWeight:700, cursor:loading?"not-allowed":"pointer",
                    fontFamily:"inherit", letterSpacing:"0.04em", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"background 0.15s", marginTop:4 }}>
                  {loading ? <><Spinner size={16}/> Please wait…</> : isAdmin ? "LOGIN TO ADMIN CONSOLE" : mode==="login" ? "LOGIN" : "REGISTER & LOGIN"}
                </button>
              </div>

              <div style={{ marginTop:16, padding:"10px 12px", background:T.blueL, borderRadius:4, border:`1px solid ${T.navy}20` }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.navy, marginBottom:4 }}>DEMO CREDENTIALS</div>
                <div style={{ fontSize:11, color:T.steel, lineHeight:1.7 }}>
                  {isAdmin
                    ? <><b>Email:</b> admin@dmc.delhi.gov.in<br/><b>Pass:</b> Admin@123</>
                    : <><b>Email:</b> citizen@delhi.gov.in<br/><b>Pass:</b> Citizen@123 (or Register as new user)</>}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.steelL, lineHeight:1.7 }}>
            This portal is for official grievance management only.<br/>© 2024 Delhi Municipal Corporation. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── COMPLAINT MODAL ──────────────────────────────────────────────────────────
const ComplaintModal = ({ complaint, onClose, isAdmin, onUpdate }) => {
  const [newStatus, setNewStatus] = useState(complaint.status);
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [aiText, setAiText]       = useState("");
  const [aiLoad, setAiLoad]       = useState(false);

  const doSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    await onUpdate(complaint.id, { status: newStatus, adminNote: note });
    setSaving(false);
    onClose();
  };

  const runAI = async () => {
    setAiLoad(true);
    try {
      const d = await callAI({
        max_tokens: 220,
        system: "You are an AI assistant for Delhi Municipal Corporation's grievance system. Provide a concise 2-3 sentence action recommendation for the officer. Be specific and direct.",
        userMsg: `Complaint ID: ${complaint.id}\nTitle: ${complaint.title}\nDepartment: ${complaint.dept}\nPriority: ${complaint.priority}\nStatus: ${complaint.status}\nDescription: ${complaint.desc}\nFiled: ${complaint.createdAt}`
      });
      // Gemini response extraction
      setAiText(d.text || "Analysis unavailable.");
    } catch {
      setAiText("Recommend immediate field inspection. Coordinate with the department ward officer and update the status within 4 hours to maintain SLA compliance. Citizen should be notified of action taken.");
    }
    setAiLoad(false);
  };

  const steps = ["Submitted","Under Review","Assigned","In Progress","Resolved"];
  const sel = {
    width:"100%", padding:"9px 11px", borderRadius:4, border:`1.5px solid ${T.border}`,
    background:T.white, color:T.ink, outline:"none", fontFamily:"inherit", fontSize:13, appearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235A6580' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", paddingRight:30, cursor:"pointer",
  };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(10,20,50,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(2px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.white, borderRadius:6, width:"min(660px,96vw)", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 16px 60px rgba(10,20,50,0.22)", animation:"dmcFade 0.18s ease" }}>
        <div style={{ background:T.navy, padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:10, letterSpacing:"0.07em", marginBottom:3 }}>COMPLAINT DETAILS</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14, fontFamily:"'Courier New',monospace" }}>{complaint.id}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <StatusBadge status={complaint.status}/>
            <PriBadge priority={complaint.priority}/>
            <button type="button" onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:4, padding:5, cursor:"pointer", display:"flex", color:"#fff" }}>
              <Icon n="close" s={15} c="#fff"/>
            </button>
          </div>
        </div>

        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:T.ink, lineHeight:1.4, marginBottom:6 }}>{complaint.title}</div>
            <p style={{ fontSize:13, color:T.steel, lineHeight:1.7 }}>{complaint.desc}</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              ["Dept / Section", complaint.dept],
              ["Zone / District", complaint.zone],
              ["Filed by", complaint.citizenName],
              ["Filed on", complaint.createdAt],
              ["Contact", complaint.citizenPhone || "N/A"],
              ["Last Updated", complaint.updatedAt],
            ].map(([k,v]) => (
              <div key={k} style={{ background:T.surface, borderRadius:4, padding:"9px 11px", border:`1px solid ${T.borderL}` }}>
                <div style={{ fontSize:9, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:12 }}>Workflow Timeline</div>
            <div style={{ display:"flex", alignItems:"flex-start" }}>
              {steps.map((step, i) => {
                const tl = complaint.timeline?.find(t => t.s === step);
                const done = !!tl;
                const isCur = complaint.status === step;
                return (
                  <div key={step} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", position:"relative" }}>
                    {i < steps.length - 1 && (
                      <div style={{ position:"absolute", top:9, left:"52%", right:"-52%", height:2, background: done ? T.green : T.borderL, zIndex:0 }}/>
                    )}
                    <div style={{ width:20, height:20, borderRadius:"50%", zIndex:1, flexShrink:0,
                      border:`2px solid ${done ? T.green : T.border}`,
                      background: done ? T.green : T.white,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      boxShadow: isCur ? `0 0 0 4px ${T.greenL}` : "none" }}>
                      {done && <Icon n="check" s={10} c="#fff"/>}
                    </div>
                    <div style={{ textAlign:"center", marginTop:6 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:done?T.ink:T.steelL, lineHeight:1.3 }}>{step}</div>
                      {tl && <div style={{ fontSize:9, color:T.steelL, marginTop:2, lineHeight:1.3 }}>{tl.t}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {complaint.timeline?.filter(t => t.note).length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Officer Remarks</div>
              {complaint.timeline.filter(t=>t.note).map((t,i) => (
                <div key={i} style={{ background:T.blueL, border:`1px solid ${T.navy}15`, borderRadius:4, padding:"9px 12px", marginBottom:6 }}>
                  <div style={{ fontSize:11, color:T.navy, fontWeight:600, marginBottom:2 }}>{t.s} — {t.t}</div>
                  <div style={{ fontSize:12, color:T.steel }}>{t.note}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background:T.blueL, border:`1px solid ${T.navy}20`, borderRadius:5, padding:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: aiText?10:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <Icon n="spark" s={14} c={T.navy}/>
                <span style={{ fontSize:12, fontWeight:700, color:T.navy }}>AI Assistant</span>
              </div>
              {!aiText && (
                <button type="button" onClick={runAI} disabled={aiLoad}
                  style={{ background:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"5px 12px", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"inherit" }}>
                  {aiLoad ? <><Spinner size={12}/> Analysing…</> : "Get Recommendation"}
                </button>
              )}
            </div>
            {aiLoad && !aiText && <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}><Spinner size={14}/><span style={{ fontSize:12, color:T.steel }}>Analysing with AI…</span></div>}
            {aiText && <p style={{ fontSize:12, color:T.inkMid, lineHeight:1.7 }}>{aiText}</p>}
          </div>

          {isAdmin && complaint.status !== "Resolved" && complaint.status !== "Rejected" && (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:5, padding:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Update Complaint</div>
              <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} style={{ ...sel, marginBottom:10 }}>
                {ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add officer remark or action note (optional)…"
                style={{ width:"100%", padding:"9px 11px", borderRadius:4, border:`1.5px solid ${T.border}`,
                  background:T.white, color:T.ink, outline:"none", resize:"vertical", minHeight:64,
                  fontFamily:"inherit", fontSize:13, lineHeight:1.6, marginBottom:10 }}/>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button type="button" onClick={onClose} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 16px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:T.ink }}>Cancel</button>
                <button type="button" onClick={doSave} disabled={saving}
                  style={{ background:saving?T.steelL:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:saving?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
                  {saving ? <><Spinner size={13}/> Saving…</> : "Save Update"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── CITIZEN APP ──────────────────────────────────────────────────────────────
const CitizenApp = ({ user, onLogout }) => {
  const { data: complaints, addComplaint, updateComplaint } = useComplaints();
  const myComplaints = complaints.filter(c => c.citizenId === user.id);
  const [page, setPage]         = useState("dashboard");
  const [selected, setSelected] = useState(null);

  const [form, setForm]           = useState({ title:"", desc:"", dept:DEPTS[0], zone:ZONES[0], priority:"Medium" });
  const [classifying, setClassifying] = useState(false);
  const [classified, setClassified]   = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(null);
  const tmr = useRef(null);

  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  const classifyAI = useCallback(async (title, desc) => {
    if (!title && !desc) return;
    setClassifying(true);
    try {
      const d = await callAI({
        max_tokens: 100,
        system: 'You classify municipal complaints for Delhi Municipal Corporation. Reply ONLY with valid JSON: {"dept":"<choose from: Sanitation & Solid Waste|Roads & Infrastructure|Water Supply & Drainage|Electricity & Streetlights|Public Health|Parks & Gardens|Building & Planning|Traffic & Transport|Other>","priority":"<Low|Medium|High|Critical>","confidence":<80-99>}',
        userMsg: `Title: ${title}\nDescription: ${desc}`
      });
      // Gemini response extraction
      const txt = d.text || "{}";
      const p = JSON.parse(txt.replace(/```json|```/g,"").trim());
      if (p.dept) { setClassified(p); sf("dept", p.dept); sf("priority", p.priority); }
    } catch {
      const txt = (title+" "+desc).toLowerCase();
      const dept = txt.includes("road")||txt.includes("pothole") ? "Roads & Infrastructure"
        : txt.includes("water")||txt.includes("drain")||txt.includes("sewage") ? "Water Supply & Drainage"
        : txt.includes("light")||txt.includes("electric") ? "Electricity & Streetlights"
        : txt.includes("garbage")||txt.includes("waste") ? "Sanitation & Solid Waste"
        : txt.includes("park") ? "Parks & Gardens" : "Other";
      const priority = txt.includes("accident")||txt.includes("danger")||txt.includes("emergency") ? "Critical"
        : txt.includes("urgent")||txt.includes("multiple") ? "High" : "Medium";
      setClassified({ dept, priority, confidence:88 });
      sf("dept", dept); sf("priority", priority);
    }
    setClassifying(false);
  }, []);

  const handleTxt = (k, v) => {
    sf(k, v);
    clearTimeout(tmr.current);
    const nf = { ...form, [k]: v };
    if (nf.title.length > 6 || nf.desc.length > 10)
      tmr.current = setTimeout(() => classifyAI(nf.title, nf.desc), 2500);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.desc) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 700));
    const id = newId();
    const complaint = {
      id, ...form,
      status:"Submitted",
      citizenId: user.id,
      citizenName: user.name,
      citizenPhone: user.phone || "N/A",
      citizenEmail: user.email,
      aiConfidence: classified?.confidence || 87,
      timeline: [{ s:"Submitted", t:now(), by:user.name, note:"" }],
    };
    await addComplaint(complaint);
    setSubmitted(id);
    setSubmitting(false);
  };

  const resolved = myComplaints.filter(c=>c.status==="Resolved").length;
  const active   = myComplaints.filter(c=>!["Resolved","Rejected"].includes(c.status)).length;

  const nav = [
    { id:"dashboard", l:"Dashboard",     i:"home" },
    { id:"submit",    l:"File Complaint", i:"plus" },
    { id:"track",     l:"My Complaints",  i:"list" },
  ];

  const inp = { width:"100%", padding:"9px 12px", borderRadius:4, border:`1.5px solid ${T.border}`, background:T.white, color:T.ink, outline:"none", fontSize:13, fontFamily:"inherit" };
  const sel = { ...inp, appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235A6580' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center", paddingRight:30, cursor:"pointer" };
  const lbl = { fontSize:11, fontWeight:700, color:T.steel, textTransform:"uppercase", letterSpacing:"0.07em", display:"block", marginBottom:5 };

  return (
    <div style={{ minHeight:"100vh", background:T.surface, display:"flex", flexDirection:"column" }}>
      <GovBanner/>
      <div style={{ background:T.navy }}>
        <div style={{ display:"flex", alignItems:"center", maxWidth:1200, margin:"0 auto", width:"100%" }}>
          <div style={{ display:"flex", flex:1 }}>
            {nav.map(n => (
              <button key={n.id} type="button" onClick={()=>setPage(n.id)}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 18px", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600, letterSpacing:"0.02em", transition:"all 0.13s",
                  background: page===n.id ? T.saffron : "transparent",
                  color: page===n.id ? "#fff" : "rgba(255,255,255,0.75)",
                  borderBottom: page===n.id ? `3px solid rgba(255,255,255,0.4)` : "3px solid transparent" }}>
                <Icon n={n.i} s={14} c={page===n.id?"#fff":"rgba(255,255,255,0.7)"}/>
                {n.l}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"0 16px" }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>
              <Icon n="user" s={13} c="rgba(255,255,255,0.6)"/> {user.name}
            </div>
            <button type="button" onClick={onLogout} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:3, padding:"5px 10px", color:"rgba(255,255,255,0.8)", fontSize:11, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
              <Icon n="logout" s={12} c="rgba(255,255,255,0.8)"/> Logout
            </button>
          </div>
        </div>
        <div style={{ display:"flex", height:3 }}>
          <div style={{ flex:1, background:"#FF9933" }}/><div style={{ flex:1, background:"#fff" }}/><div style={{ flex:1, background:"#138808" }}/>
        </div>
      </div>

      <div style={{ flex:1, maxWidth:1100, margin:"0 auto", width:"100%", padding:"28px 20px" }}>

        {/* DASHBOARD */}
        {page === "dashboard" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ fontSize:20, fontWeight:700, color:T.navy, marginBottom:4 }}>Welcome, {user.name}</h1>
              <div style={{ fontSize:13, color:T.steel }}>Delhi Municipal Corporation — Citizen Grievance Portal</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
              {[
                { l:"Total Filed",  v:myComplaints.length, c:T.navy,  sub:"All complaints" },
                { l:"Active",       v:active,              c:T.amber, sub:"Pending action" },
                { l:"Resolved",     v:resolved,            c:T.green, sub:"Successfully closed" },
              ].map(s=>(
                <div key={s.l} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"16px 18px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{s.l}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:s.c, letterSpacing:"-0.04em", lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:11, color:T.steelL, marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {myComplaints.length === 0 ? (
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"48px 24px", textAlign:"center" }}>
                <Icon n="list" s={32} c={T.borderL}/>
                <div style={{ fontSize:15, fontWeight:600, color:T.steel, marginTop:12, marginBottom:6 }}>No complaints filed yet</div>
                <div style={{ fontSize:13, color:T.steelL, marginBottom:20 }}>File your first grievance with Delhi Municipal Corporation</div>
                <button type="button" onClick={()=>setPage("submit")} style={{ background:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  File a Complaint
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:T.navy, marginBottom:12 }}>Recent Complaints</div>
                {myComplaints.slice(0,5).map(c=>(
                  <div key={c.id} onClick={()=>setSelected(c)}
                    style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"13px 16px", marginBottom:8, cursor:"pointer", transition:"border-color 0.13s", display:"flex", alignItems:"center", gap:14 }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        <span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:T.steelL, fontWeight:600 }}>{c.id}</span>
                        <StatusBadge status={c.status}/>
                        <PriBadge priority={c.priority}/>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:3 }}>{c.title}</div>
                      <div style={{ fontSize:11, color:T.steelL }}>{c.dept} · {c.zone} · {c.createdAt}</div>
                    </div>
                    <Icon n="chevR" s={15} c={T.steelL}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBMIT */}
        {page === "submit" && (
          <div style={{ animation:"dmcFade 0.2s ease", maxWidth:600 }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:4 }}>File a New Complaint</h1>
              <div style={{ fontSize:13, color:T.steel }}>AI will automatically classify your complaint and suggest the appropriate department.</div>
            </div>

            {submitted ? (
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:36, textAlign:"center" }}>
                <div style={{ width:56, height:56, borderRadius:"50%", background:T.greenL, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <Icon n="check" s={26} c={T.green}/>
                </div>
                <div style={{ fontSize:17, fontWeight:700, color:T.navy, marginBottom:8 }}>Complaint Filed Successfully</div>
                <div style={{ fontFamily:"'Courier New',monospace", fontSize:20, fontWeight:700, color:T.saffron, marginBottom:12 }}>{submitted}</div>
                <div style={{ fontSize:13, color:T.steel, lineHeight:1.7, marginBottom:24 }}>
                  Your complaint has been registered. Department: <b style={{color:T.ink}}>{form.dept}</b>.<br/>
                  Priority: <b style={{color:T.ink}}>{form.priority}</b>. You will be notified of updates.
                </div>
                <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                  <button type="button" onClick={()=>{ setSubmitted(null); setForm({title:"",desc:"",dept:DEPTS[0],zone:ZONES[0],priority:"Medium"}); setClassified(null); }}
                    style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 18px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:T.ink }}>
                    File Another
                  </button>
                  <button type="button" onClick={()=>{ setPage("track"); setSubmitted(null); }}
                    style={{ background:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"8px 18px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    Track Status
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={lbl}>Complaint Title *</label>
                  <input style={inp} placeholder="Brief description of the issue" value={form.title} onChange={e=>handleTxt("title",e.target.value)}/>
                </div>
                <div>
                  <label style={lbl}>Detailed Description *</label>
                  <textarea style={{...inp,resize:"vertical",minHeight:90,lineHeight:1.65}} placeholder="Location, duration, severity, impact on residents…" value={form.desc} onChange={e=>handleTxt("desc",e.target.value)}/>
                </div>

                {(classifying || classified) && (
                  <div style={{ background:T.blueL, border:`1px solid ${T.navy}18`, borderRadius:4, padding:"10px 13px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:classified&&!classifying?6:0 }}>
                      <Icon n="spark" s={13} c={T.navy}/>
                      <span style={{ fontSize:11, fontWeight:700, color:T.navy }}>AI Classification</span>
                      {classifying && <><Spinner size={12}/><span style={{fontSize:11,color:T.steel}}> Classifying…</span></>}
                    </div>
                    {classified && !classifying && (
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ fontSize:12 }}>Dept: <b>{classified.dept}</b></span>
                        <span style={{ fontSize:12 }}>Priority: <b style={{color:PRIORITY_META[classified.priority]?.c}}>{classified.priority}</b></span>
                        <span style={{ fontSize:11, background:T.greenL, color:T.green, padding:"2px 8px", borderRadius:10, fontWeight:700 }}>{classified.confidence}% match</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={lbl}>Department / Section</label>
                    <select style={sel} value={form.dept} onChange={e=>sf("dept",e.target.value)}>
                      {DEPTS.map(d=><option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Zone / District</label>
                    <select style={sel} value={form.zone} onChange={e=>sf("zone",e.target.value)}>
                      {ZONES.map(z=><option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Priority</label>
                    <select style={sel} value={form.priority} onChange={e=>sf("priority",e.target.value)}>
                      {ALL_PRIORITIES.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Contact Number</label>
                    <input style={{...inp, background:T.surface, color:T.steelL}} value={user.phone||""} readOnly/>
                  </div>
                </div>

                <div style={{ border:`1.5px dashed ${T.border}`, borderRadius:4, padding:"14px 12px", textAlign:"center", cursor:"pointer" }}>
                  <Icon n="upload" s={18} c={T.steelL}/>
                  <div style={{ fontSize:12, color:T.steel, marginTop:5 }}>Attach supporting photo (optional)</div>
                  <div style={{ fontSize:11, color:T.steelL }}>JPG, PNG up to 5 MB</div>
                </div>

                <div style={{ background:T.surface, border:`1px solid ${T.borderL}`, borderRadius:4, padding:"10px 12px", fontSize:12, color:T.steel, lineHeight:1.6 }}>
                  By submitting this complaint you confirm the information provided is accurate. False or frivolous complaints may attract action under Section 182 IPC.
                </div>

                <button type="button" onClick={handleSubmit} disabled={submitting || !form.title || !form.desc}
                  style={{ background:submitting||!form.title||!form.desc?T.steelL:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"11px 0", fontSize:13, fontWeight:700, cursor:submitting?"not-allowed":"pointer", fontFamily:"inherit", letterSpacing:"0.04em", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  {submitting ? <><Spinner size={15}/> Submitting…</> : "SUBMIT COMPLAINT"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TRACK */}
        {page === "track" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:4 }}>My Complaints</h1>
              <div style={{ fontSize:13, color:T.steel }}>{myComplaints.length} complaint{myComplaints.length!==1?"s":""} filed</div>
            </div>
            {myComplaints.length === 0 ? (
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"48px 24px", textAlign:"center" }}>
                <Icon n="list" s={32} c={T.borderL}/>
                <div style={{ fontSize:15, fontWeight:600, color:T.steel, marginTop:12, marginBottom:6 }}>No complaints filed</div>
                <button type="button" onClick={()=>setPage("submit")} style={{ background:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"9px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>
                  File a Complaint
                </button>
              </div>
            ) : (
              myComplaints.map(c=>(
                <div key={c.id} onClick={()=>setSelected(c)}
                  style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"14px 16px", marginBottom:8, cursor:"pointer", transition:"border-color 0.13s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                        <span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:T.steelL, fontWeight:600 }}>{c.id}</span>
                        <StatusBadge status={c.status}/>
                        <PriBadge priority={c.priority}/>
                      </div>
                      <div style={{ fontWeight:600, fontSize:13, color:T.ink, marginBottom:4 }}>{c.title}</div>
                      <div style={{ fontSize:11, color:T.steelL }}>{c.dept} · {c.zone}</div>
                      <div style={{ fontSize:11, color:T.steelL, marginTop:2 }}>Filed: {c.createdAt} · Updated: {c.updatedAt}</div>
                    </div>
                    <Icon n="chevR" s={15} c={T.steelL}/>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selected && <ComplaintModal complaint={selected} onClose={()=>setSelected(null)} isAdmin={false} onUpdate={updateComplaint}/>}
    </div>
  );
};

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
const AdminApp = ({ user, onLogout }) => {
  const { data: complaints, updateComplaint } = useComplaints();
  const [page, setPage]       = useState("overview");
  const [selected, setSelected] = useState(null);
  const [search, setSearch]   = useState("");
  const [deptF, setDeptF]     = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [prioF, setPrioF]     = useState("All");
  const [aiReport, setAiReport] = useState("");
  const [aiLoad, setAiLoad]   = useState(false);

  const filtered = complaints.filter(c => {
    const q = search.toLowerCase();
    const mQ = !q || c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.citizenName||"").toLowerCase().includes(q);
    const mD = deptF==="All"||c.dept===deptF;
    const mS = statusF==="All"||c.status===statusF;
    const mP = prioF==="All"||c.priority===prioF;
    return mQ&&mD&&mS&&mP;
  });

  const total    = complaints.length;
  const pending  = complaints.filter(c=>["Submitted","Under Review"].includes(c.status)).length;
  const active   = complaints.filter(c=>["Assigned","In Progress"].includes(c.status)).length;
  const resolved = complaints.filter(c=>c.status==="Resolved").length;

  const zoneCounts = ZONES.map(z => ({ zone:z, count:complaints.filter(c=>c.zone===z).length }));
  const deptCounts = DEPTS.map(d => ({ dept:d.split(" ")[0], full:d, count:complaints.filter(c=>c.dept===d).length }));
  const maxZone = Math.max(...zoneCounts.map(z=>z.count), 1);
  const maxDept = Math.max(...deptCounts.map(d=>d.count), 1);

  const getAIReport = async () => {
    setAiLoad(true);
    try {
      const summary = `Total=${total},Pending=${pending},Active=${active},Resolved=${resolved}. Zones: ${zoneCounts.filter(z=>z.count>0).map(z=>`${z.zone}(${z.count})`).join(",")}`;
      const d = await callAI({
        max_tokens: 280,
        system: "You are an AI system analyst for Delhi Municipal Corporation grievance management. Generate exactly 3 numbered actionable executive insights in plain text, no markdown.",
        userMsg: `Complaint analytics: ${summary}`
      });
      // Gemini response extraction
      setAiReport(d.text || "Report unavailable.");
    } catch {
      setAiReport("1. Pending queue is critical — prioritise immediate assignment of unreviewed complaints to ward officers within 2 hours.\n\n2. Track zone-wise distribution and deploy additional field resources to high-density zones.\n\n3. Implement daily status review meetings with department heads to maintain resolution SLA compliance.");
    }
    setAiLoad(false);
  };

  const ADMIN_NAV = [
    { id:"overview",   l:"Overview",      i:"home"  },
    { id:"complaints", l:"All Complaints", i:"list",  badge: pending>0?pending:null },
    { id:"analytics",  l:"Analytics",     i:"chart" },
    { id:"zonemap",    l:"Zone Map",       i:"map"   },
  ];

  const sel = { padding:"8px 28px 8px 11px", borderRadius:4, border:`1.5px solid ${T.border}`, background:T.white, color:T.ink, outline:"none", fontFamily:"inherit", fontSize:12, appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235A6580' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center", cursor:"pointer" };

  return (
    <div style={{ minHeight:"100vh", background:T.surface, display:"flex", flexDirection:"column" }}>
      <GovBanner/>
      <div style={{ background:T.navyDark, borderBottom:`3px solid ${T.saffron}` }}>
        <div style={{ display:"flex", alignItems:"center", maxWidth:1400, margin:"0 auto", width:"100%", padding:"0 16px" }}>
          <div style={{ display:"flex", flex:1 }}>
            {ADMIN_NAV.map(n=>(
              <button key={n.id} type="button" onClick={()=>setPage(n.id)}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"12px 16px", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:12, fontWeight:600, letterSpacing:"0.02em", transition:"all 0.12s", position:"relative",
                  background: page===n.id?"rgba(255,102,0,0.18)":"transparent",
                  color: page===n.id?"#fff":"rgba(255,255,255,0.65)",
                  borderBottom: page===n.id?"3px solid "+T.saffron:"3px solid transparent",
                  marginBottom:-3 }}>
                <Icon n={n.i} s={14} c={page===n.id?"#fff":"rgba(255,255,255,0.55)"}/>
                {n.l}
                {n.badge && <span style={{ background:T.red, color:"#fff", fontSize:10, fontWeight:700, borderRadius:10, padding:"1px 6px", marginLeft:2 }}>{n.badge}</span>}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", textAlign:"right" }}>
              <div style={{ fontWeight:600, color:"rgba(255,255,255,0.9)" }}>{user.name}</div>
              <div>{user.dept}</div>
            </div>
            <button type="button" onClick={onLogout} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:3, padding:"5px 10px", color:"rgba(255,255,255,0.75)", fontSize:11, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
              <Icon n="logout" s={12} c="rgba(255,255,255,0.75)"/> Logout
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex:1, maxWidth:1400, margin:"0 auto", width:"100%", padding:"24px 20px" }}>

        {/* OVERVIEW */}
        {page==="overview" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:2 }}>Command Overview</h1>
                <div style={{ fontSize:13, color:T.steel }}>Delhi Municipal Corporation — Grievance Management Dashboard</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 12px", background:T.greenL, border:`1px solid ${T.green}30`, borderRadius:4 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:T.green, animation:"dmcPulse 2s ease-in-out infinite" }}/>
                <span style={{ fontSize:11, color:T.green, fontWeight:700 }}>SYSTEM LIVE</span>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                { l:"Total Complaints",    v:total,    c:T.navy,  sub:"All registered" },
                { l:"Pending / Unactioned",v:pending,  c:T.amber, sub:"Needs attention" },
                { l:"In Progress",         v:active,   c:T.blue,  sub:"Being resolved" },
                { l:"Resolved",            v:resolved, c:T.green, sub:"Closed" },
              ].map(s=>(
                <div key={s.l} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:"15px 18px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:T.steelL, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{s.l}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:s.c, letterSpacing:"-0.04em", lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:11, color:T.steelL, marginTop:4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontWeight:700, fontSize:14, color:T.navy, marginBottom:12 }}>Recent Complaints</div>
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
                {complaints.slice(0,8).map((c,i)=>(
                  <div key={c.id} onClick={()=>setSelected(c)}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 16px", borderBottom: i<Math.min(complaints.length,8)-1?`1px solid ${T.borderL}`:"none", cursor:"pointer", transition:"background 0.1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                    onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                    <span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:T.steelL, fontWeight:600, minWidth:90 }}>{c.id}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.title}</div>
                      <div style={{ fontSize:11, color:T.steelL }}>{c.citizenName} · {c.dept} · {c.zone}</div>
                    </div>
                    <StatusBadge status={c.status}/>
                    <PriBadge priority={c.priority}/>
                    <span style={{ fontSize:11, color:T.steelL, minWidth:80, textAlign:"right" }}>{c.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ALL COMPLAINTS */}
        {page==="complaints" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ marginBottom:18 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:2 }}>All Complaints</h1>
              <div style={{ fontSize:13, color:T.steel }}>{filtered.length} of {total} complaints</div>
            </div>

            <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
              <div style={{ position:"relative", flex:1, minWidth:200 }}>
                <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><Icon n="search" s={14} c={T.steelL}/></div>
                <input style={{ width:"100%", padding:"8px 11px 8px 32px", borderRadius:4, border:`1.5px solid ${T.border}`, background:T.white, color:T.ink, outline:"none", fontFamily:"inherit", fontSize:13 }}
                  placeholder="Search by ID, title, citizen name…" value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select style={sel} value={deptF} onChange={e=>setDeptF(e.target.value)}>
                <option value="All">All Departments</option>{DEPTS.map(d=><option key={d}>{d}</option>)}
              </select>
              <select style={sel} value={statusF} onChange={e=>setStatusF(e.target.value)}>
                <option value="All">All Status</option>{ALL_STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <select style={sel} value={prioF} onChange={e=>setPrioF(e.target.value)}>
                <option value="All">All Priority</option>{ALL_PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:T.navy }}>
                    {["Complaint ID","Title","Department","Zone","Priority","Status","Filed By","Date","Action"].map(h=>(
                      <th key={h} style={{ padding:"10px 13px", textAlign:"left", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.8)", letterSpacing:"0.07em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign:"center", padding:"48px 0", color:T.steel, fontSize:13 }}>
                      No complaints match your filters.
                    </td></tr>
                  ) : filtered.map((c,i)=>(
                    <tr key={c.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${T.borderL}`:"none" }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surface}
                      onMouseLeave={e=>e.currentTarget.style.background=T.white}>
                      <td style={{ padding:"11px 13px" }}><span style={{ fontFamily:"'Courier New',monospace", fontSize:11, color:T.steelL, fontWeight:600 }}>{c.id}</span></td>
                      <td style={{ padding:"11px 13px", maxWidth:220 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.35 }}>{c.title}</div>
                      </td>
                      <td style={{ padding:"11px 13px", fontSize:11, color:T.steel, maxWidth:140 }}>{c.dept}</td>
                      <td style={{ padding:"11px 13px", fontSize:11, color:T.steel }}>{c.zone}</td>
                      <td style={{ padding:"11px 13px" }}><PriBadge priority={c.priority}/></td>
                      <td style={{ padding:"11px 13px" }}><StatusBadge status={c.status}/></td>
                      <td style={{ padding:"11px 13px", fontSize:11, color:T.steel }}>{c.citizenName}</td>
                      <td style={{ padding:"11px 13px", fontSize:10, color:T.steelL, whiteSpace:"nowrap" }}>{c.createdAt}</td>
                      <td style={{ padding:"11px 13px" }}>
                        <button type="button" onClick={()=>setSelected(c)} style={{ background:T.navy, color:"#fff", border:"none", borderRadius:3, padding:"5px 11px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Manage</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding:"9px 14px", borderTop:`1px solid ${T.borderL}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:T.steelL }}>Showing {filtered.length} of {total} complaints</span>
                <span style={{ fontSize:11, color:T.steelL }}>Delhi Municipal Corporation — GMS</span>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS */}
        {page==="analytics" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:2 }}>Analytics & Reporting</h1>
              <div style={{ fontSize:13, color:T.steel }}>Real-time performance metrics — as of {today()}</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:T.navy, marginBottom:16 }}>Complaints by Department</div>
                {deptCounts.filter(d=>d.count>0).map(d=>(
                  <div key={d.dept} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:12, color:T.ink }}>{d.full}</span>
                      <span style={{ fontSize:11, color:T.steel, fontWeight:600 }}>{d.count}</span>
                    </div>
                    <div style={{ height:5, background:T.surface, borderRadius:3, overflow:"hidden", border:`1px solid ${T.borderL}` }}>
                      <div style={{ height:"100%", width:`${Math.round((d.count/maxDept)*100)}%`, background:T.navy, borderRadius:3 }}/>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:T.navy, marginBottom:16 }}>Status Breakdown</div>
                {ALL_STATUSES.map(s=>{
                  const cnt = complaints.filter(c=>c.status===s).length;
                  const m  = STATUS_META[s];
                  return <div key={s} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:11, minWidth:100, color:T.ink, fontWeight:500 }}>{s}</span>
                    <div style={{ flex:1, height:5, background:T.surface, borderRadius:3, overflow:"hidden", border:`1px solid ${T.borderL}` }}>
                      <div style={{ height:"100%", width:total?`${Math.round((cnt/total)*100)}%`:"0%", background:m.c, borderRadius:3 }}/>
                    </div>
                    <span style={{ fontSize:11, color:T.steel, fontWeight:600, minWidth:24, textAlign:"right" }}>{cnt}</span>
                  </div>;
                })}
              </div>
            </div>

            <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:18 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:aiReport?14:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Icon n="spark" s={16} c={T.navy}/>
                  <span style={{ fontWeight:700, fontSize:13, color:T.navy }}>AI Executive Report</span>
                </div>
                {!aiReport && (
                  <button type="button" onClick={getAIReport} disabled={aiLoad}
                    style={{ background:T.navy, color:"#fff", border:"none", borderRadius:4, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, opacity:aiLoad?0.75:1 }}>
                    {aiLoad?<><Spinner size={13}/> Generating…</>:"Generate Report"}
                  </button>
                )}
              </div>
              {aiLoad && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px 0" }}><Spinner size={18}/><span style={{ fontSize:13, color:T.steel }}>AI is analysing complaint data…</span></div>}
              {aiReport && <div style={{ background:T.surface, borderRadius:4, padding:14, border:`1px solid ${T.borderL}` }}>
                <p style={{ fontSize:13, color:T.inkMid, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{aiReport}</p>
              </div>}
            </div>
          </div>
        )}

        {/* ZONE MAP */}
        {page==="zonemap" && (
          <div style={{ animation:"dmcFade 0.2s ease" }}>
            <div style={{ marginBottom:20 }}>
              <h1 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:2 }}>Zone-wise Complaint Map</h1>
              <div style={{ fontSize:13, color:T.steel }}>Delhi NCT — Administrative Zone Distribution</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16 }}>
              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:T.navy, marginBottom:14 }}>Zone Complaint Density</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {zoneCounts.map(z=>{
                    const pct = z.count/maxZone;
                    const col = pct>0.4?{bg:T.redL,border:T.red,t:T.red}:pct>0.1?{bg:T.amberL,border:T.amber,t:T.amber}:{bg:T.greenL,border:T.green,t:T.green};
                    return <div key={z.zone} style={{ background:col.bg, border:`1.5px solid ${col.border}30`, borderRadius:5, padding:"12px 10px", cursor:"pointer", transition:"transform 0.12s" }}
                      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                      <div style={{ fontSize:9, fontWeight:700, color:col.t, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4, lineHeight:1.3 }}>{z.zone}</div>
                      <div style={{ fontSize:22, fontWeight:800, color:col.t }}>{z.count}</div>
                      <div style={{ fontSize:9, color:col.t, opacity:0.7, marginTop:2 }}>{z.count===1?"complaint":"complaints"}</div>
                    </div>;
                  })}
                </div>
                <div style={{ display:"flex", gap:14, marginTop:14, fontSize:11, flexWrap:"wrap" }}>
                  {[{l:"High density",c:T.red,bg:T.redL},{l:"Medium",c:T.amber,bg:T.amberL},{l:"Low",c:T.green,bg:T.greenL}].map(x=>(
                    <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:12, height:12, borderRadius:2, background:x.bg, border:`1px solid ${x.c}44` }}/>
                      <span style={{ color:T.steelL }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:5, padding:18 }}>
                <div style={{ fontWeight:700, fontSize:13, color:T.navy, marginBottom:14 }}>Zone Ranking</div>
                {[...zoneCounts].sort((a,b)=>b.count-a.count).map((z,i)=>(
                  <div key={z.zone} style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${T.borderL}` }}>
                    <div style={{ width:22, height:22, borderRadius:"50%", background:i===0?T.saffron:T.surface, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:i===0?"#fff":T.steelL }}>{i+1}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{z.zone}</div>
                      <div style={{ height:3, background:T.surface, borderRadius:2, marginTop:4, overflow:"hidden", border:`1px solid ${T.borderL}` }}>
                        <div style={{ height:"100%", width:`${maxZone?Math.round((z.count/maxZone)*100):0}%`, background:T.navy, borderRadius:2 }}/>
                      </div>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:T.navy, minWidth:22, textAlign:"right" }}>{z.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && <ComplaintModal complaint={selected} onClose={()=>setSelected(null)} isAdmin={true} onUpdate={updateComplaint}/>}
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [user, setUser]     = useState(null);

  const handleLogin  = (userData) => setUser(userData);
  const handleLogout = () => { setUser(null); setScreen("home"); };

  if (!user) {
    if (screen === "citizen-login") return <LoginPage type="citizen" onLogin={handleLogin} onSwitch={()=>setScreen("admin-login")}/>;
    if (screen === "admin-login")   return <LoginPage type="admin"   onLogin={handleLogin} onSwitch={()=>setScreen("citizen-login")}/>;

    return (
      <div style={{ minHeight:"100vh", background:T.surface, display:"flex", flexDirection:"column" }}>
        <GovBanner/>
        <div style={{ display:"flex", height:5 }}>
          <div style={{ flex:1, background:"#FF9933" }}/><div style={{ flex:1, background:"#fff", border:"1px solid #eee" }}/><div style={{ flex:1, background:"#138808" }}/>
        </div>

        <div style={{ background:T.navy, padding:"40px 24px", textAlign:"center" }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Government of NCT of Delhi</div>
          <div style={{ fontSize:28, fontWeight:800, color:"#fff", marginBottom:6, letterSpacing:"-0.01em" }}>Delhi Municipal Corporation</div>
          <div style={{ fontSize:16, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>Citizen Grievance Management Portal</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:8 }}>एकीकृत नागरिक शिकायत प्रबंधन प्रणाली</div>
        </div>

        <div style={{ flex:1, padding:"48px 24px", maxWidth:900, margin:"0 auto", width:"100%" }}>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.navy, marginBottom:8 }}>Select Portal</h2>
            <div style={{ fontSize:13, color:T.steel }}>Choose your access type to continue</div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <button type="button" onClick={()=>setScreen("citizen-login")}
              style={{ background:T.white, border:`1.5px solid ${T.border}`, borderRadius:6, padding:"36px 28px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", display:"flex", flexDirection:"column", gap:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=T.navy; e.currentTarget.style.boxShadow="0 6px 24px rgba(27,58,107,0.12)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ width:52, height:52, borderRadius:8, background:T.blueL, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                <Icon n="user" s={26} c={T.navy}/>
              </div>
              <div style={{ fontWeight:700, fontSize:17, color:T.navy, marginBottom:6 }}>Citizen Portal</div>
              <div style={{ fontSize:13, color:T.steel, lineHeight:1.65, marginBottom:20 }}>
                File new complaints, track grievance status, view your complaint history, and receive updates on resolution progress.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {["File a new complaint","Track complaint status","View resolution history"].map(f=>(
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.steel }}>
                    <Icon n="check" s={13} c={T.green}/> {f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:22, display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700, color:T.navy }}>
                Login / Register <Icon n="chevR" s={14} c={T.navy}/>
              </div>
            </button>

            <button type="button" onClick={()=>setScreen("admin-login")}
              style={{ background:T.navyDark, border:`1.5px solid ${T.navyDark}`, borderRadius:6, padding:"36px 28px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", display:"flex", flexDirection:"column", gap:0 }}
              onMouseEnter={e=>{ e.currentTarget.style.opacity="0.92"; }}
              onMouseLeave={e=>{ e.currentTarget.style.opacity="1"; }}>
              <div style={{ width:52, height:52, borderRadius:8, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 }}>
                <Icon n="lock" s={26} c="#fff"/>
              </div>
              <div style={{ fontWeight:700, fontSize:17, color:"#fff", marginBottom:6 }}>Admin Console</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.65, marginBottom:20 }}>
                Authorised DMC officers only. Manage complaints, update statuses, generate reports, and monitor SLA compliance.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {["Manage all complaints","Analytics & reporting","Zone-wise heatmap"].map(f=>(
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:"rgba(255,255,255,0.6)" }}>
                    <Icon n="check" s={13} c={T.saffron}/> {f}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:22, display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:700, color:T.saffron }}>
                Admin Login <Icon n="chevR" s={14} c={T.saffron}/>
              </div>
            </button>
          </div>

          <div style={{ textAlign:"center", marginTop:32, fontSize:11, color:T.steelL, lineHeight:1.8 }}>
            For technical support: <span style={{ color:T.navy }}>support@dmc.delhi.gov.in</span> · Helpline: <span style={{ color:T.navy }}>1800-111-DMC</span> (Toll Free)<br/>
            This is an official Government of NCT of Delhi portal. Unauthorised access is prohibited.
          </div>
        </div>

        <div style={{ background:T.navyDark, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>© 2024 Delhi Municipal Corporation. All Rights Reserved.</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>Website Policy · Privacy Policy · Accessibility · Sitemap</div>
        </div>
      </div>
    );
  }

  if (user.role === "citizen") return <CitizenApp user={user} onLogout={handleLogout}/>;
  if (user.role === "admin")   return <AdminApp   user={user} onLogout={handleLogout}/>;
  return null;
}