require("dotenv").config(); 
const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── In-memory Users Store ───────────────────────────────────────────────────
let users = [
  { id: "ADM-001", role: "admin", name: "Sh. Rajesh Kumar", dept: "Commissioner's Office", email: "admin@dmc.delhi.gov.in", pass: "Admin@123" },
  { id: "CIT-001", role: "citizen", name: "Vikram Mehra", email: "citizen@delhi.gov.in", pass: "Citizen@123", phone: "9876543210" }
];

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post("/api/register", (req, res) => {
  const { name, email, phone, pass } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  const newUser = { 
    id: `CIT-${Date.now().toString().slice(-5)}`, 
    role: "citizen", 
    name, email, phone, pass 
  };
  
  users.push(newUser);
  
  const { pass: _, ...userWithoutPass } = newUser;
  res.status(201).json(userWithoutPass);
});

app.post("/api/login", (req, res) => {
  const { email, pass, role } = req.body;
  
  const user = users.find(u => u.email === email && u.pass === pass && u.role === role);
  
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials. Please check your email and password." });
  }

  const { pass: _, ...userWithoutPass } = user;
  res.status(200).json(userWithoutPass);
});

// ─── In-memory Complaints Store ──────────────────────────────────────────────
const SEED = [
  { id:"DMC-001", title:"Overflowing garbage bins near Lajpat Nagar Market", desc:"Three large municipal bins have been overflowing for 5 days. Waste spilling onto the footpath causing health hazard and foul odour.", dept:"Sanitation & Solid Waste", zone:"South Delhi", priority:"High", status:"In Progress", citizenId:"CIT-001", citizenName:"Vikram Mehra", citizenPhone:"9876543210", citizenEmail:"citizen@delhi.gov.in", createdAt:"25 Mar, 10:30 AM", updatedAt:"26 Mar, 02:15 PM", aiConfidence:96, timeline:[{s:"Submitted",t:"25 Mar, 10:30 AM",by:"Vikram Mehra",note:""},{s:"Under Review",t:"25 Mar, 12:00 PM",by:"Admin",note:""},{s:"Assigned",t:"25 Mar, 04:00 PM",by:"Admin",note:"Assigned to Ward Officer Sharma"},{s:"In Progress",t:"26 Mar, 09:00 AM",by:"Admin",note:"Sanitation team dispatched"}] },
  { id:"DMC-002", title:"Large pothole on Outer Ring Road causing accidents", desc:"A 3-foot wide pothole has developed near the Mukundpur flyover junction. Two two-wheelers have already skidded. Urgent repair needed.", dept:"Roads & Infrastructure", zone:"North-West Delhi", priority:"Critical", status:"Assigned", citizenId:"CIT-002", citizenName:"Priya Sharma", citizenPhone:"9812345678", citizenEmail:"priya@gmail.com", createdAt:"26 Mar, 08:45 AM", updatedAt:"26 Mar, 11:00 AM", aiConfidence:98, timeline:[{s:"Submitted",t:"26 Mar, 08:45 AM",by:"Priya Sharma",note:""},{s:"Under Review",t:"26 Mar, 09:30 AM",by:"Admin",note:""},{s:"Assigned",t:"26 Mar, 11:00 AM",by:"Admin",note:"Road maintenance team alerted. Priority repair scheduled."}] },
  { id:"DMC-003", title:"Street light not working for 10 days — Rohini Sector 7", desc:"Multiple street lights on the main road are non-functional since 15th March. Area becomes pitch dark at night, creating safety risk especially for women.", dept:"Electricity & Streetlights", zone:"North-West Delhi", priority:"High", status:"Under Review", citizenId:"CIT-003", citizenName:"Amit Rawat", citizenPhone:"9900112233", citizenEmail:"amit.rawat@yahoo.com", createdAt:"26 Mar, 11:20 AM", updatedAt:"26 Mar, 11:20 AM", aiConfidence:94, timeline:[{s:"Submitted",t:"26 Mar, 11:20 AM",by:"Amit Rawat",note:""},{s:"Under Review",t:"26 Mar, 12:30 PM",by:"Admin",note:""}] },
  { id:"DMC-004", title:"No water supply in DDA Flats, Dwarka Sector 10", desc:"Water supply has been completely cut off for 3 days. Over 200 families are affected. People are buying water at high cost from private tankers.", dept:"Water Supply & Drainage", zone:"West Delhi", priority:"Critical", status:"Resolved", citizenId:"CIT-004", citizenName:"Sunita Nair", citizenPhone:"9871234560", citizenEmail:"sunita.nair@gmail.com", createdAt:"23 Mar, 07:00 AM", updatedAt:"25 Mar, 06:00 PM", aiConfidence:97, timeline:[{s:"Submitted",t:"23 Mar, 07:00 AM",by:"Sunita Nair",note:""},{s:"Under Review",t:"23 Mar, 08:00 AM",by:"Admin",note:""},{s:"Assigned",t:"23 Mar, 10:00 AM",by:"Admin",note:"Water supply team deployed"},{s:"In Progress",t:"24 Mar, 09:00 AM",by:"Admin",note:"Main pipeline repair underway"},{s:"Resolved",t:"25 Mar, 06:00 PM",by:"Admin",note:"Pipeline repaired. Supply restored to all 200 units."}] },
];

let complaints = JSON.parse(JSON.stringify(SEED));
const nowStr = () => new Date().toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true });

// ─── COMPLAINT ROUTES ────────────────────────────────────────────────────────
app.get("/api/complaints", (req, res) => res.json(complaints));

app.post("/api/complaints", (req, res) => {
  const c = { ...req.body, createdAt: nowStr(), updatedAt: nowStr() };
  complaints = [c, ...complaints];
  res.status(201).json(c);
});

app.patch("/api/complaints/:id", (req, res) => {
  const { id } = req.params;
  const changes = req.body;
  let found = false;
  complaints = complaints.map(c => {
    if (c.id !== id) return c;
    found = true;
    const newTimeline = changes.status && changes.status !== c.status
      ? [...c.timeline, { s: changes.status, t: nowStr(), by: "Admin", note: changes.adminNote || "" }]
      : c.timeline;
    return { ...c, ...changes, timeline: newTimeline, updatedAt: nowStr() };
  });
  if (!found) return res.status(404).json({ error: "Not found" });
  res.json(complaints.find(c => c.id === id));
});

// ─── GEMINI AI ROUTE ─────────────────────────────────────────────────────────
app.post("/api/gemini", async (req, res) => {
  const { system, userMsg, max_tokens = 300 } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set in .env file" });
  }

  try {
    const config = { maxOutputTokens: max_tokens };
    if (system) config.systemInstruction = system;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: userMsg,
      config: config
    });

    res.json({ text: response.text });
  } catch (err) {
    console.error("Gemini API error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🏛  DMC CRM Backend running on http://localhost:${PORT}`);
  console.log(`   API key: ${process.env.GEMINI_API_KEY ? "✅ configured" : "❌ NOT SET"}\n`);
});