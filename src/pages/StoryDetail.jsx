import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { C } from "../theme.js";
import { getStoryImg } from "../utils/storyImages.js";

// All static stories — combined source of truth
const STATIC_ALL = [
  {
    id:"sf1", category:"Medical", location:"Mogadishu", date:"June 2026", icon:"",
    title:"Eight-Year-Old Receives Life-Saving Heart Surgery",
    lead:"After a field agent documented the case and donors responded within 72 hours, young Fatima underwent successful cardiac surgery. She is now recovering at home.",
    challenge:"Fatima's family had exhausted every option. The $2,100 procedure was impossible on a daily wage of less than $3. Without surgery within weeks, her condition would become inoperable.",
    response:"A Kafaala Qaad field agent visited, documented, and verified the case within 24 hours. The case was published and fully funded in 72 hours by 14 donors across 6 countries.",
    outcome:"Surgery was completed successfully at Mogadishu's referral hospital. Fatima is now recovering at home. Her mother described the day the operation was confirmed as 'the day I started breathing again.'",
    amountDistributed:"$2,100", daysToDeliver:"9", beneficiaries:1,
    tags:["medical","child","surgery"],
  },
  {
    id:"sf2", category:"Shelter", location:"Baidoa", date:"May 2026", icon:"🏠",
    title:"Family of Six Rehoused After Flash Flooding",
    lead:"Within two weeks of the case being verified, a new shelter was constructed and a family of six moved in with three months of food supplies.",
    challenge:"Flash flooding in Baidoa's Bay region swept through the family's home overnight. Six people — including four children under 10 — were left sheltering in a partially collapsed structure with no walls on two sides.",
    response:"Emergency shelter materials were procured locally to minimise delivery time. Construction was completed with the help of community volunteers. A food basket covering three months was delivered alongside.",
    outcome:"The family has a secure, weatherproof shelter. The children are back in school. The father has resumed daily labour work. The mother said: 'We had nothing. Now we have a home.'",
    amountDistributed:"$780", daysToDeliver:"12", beneficiaries:6,
    tags:["shelter","flood","food","emergency"],
  },
  {
    id:"sf3", category:"Education", location:"Garowe", date:"June 2026", icon:"📚",
    title:"Three Orphaned Siblings Return to School",
    lead:"After losing both parents, three brothers aged 9, 11, and 13 had been out of school for two years. All three are now enrolled and attending every day.",
    challenge:"The brothers had been surviving on charity from neighbours since both parents died within six months of each other. School fees, uniforms, and books were completely out of reach. Their elderly aunt had no income.",
    response:"An education sponsorship was matched within one week. School fees for the full academic year were paid directly to the school. Uniforms, bags, and stationery were purchased locally and delivered.",
    outcome:"All three brothers are enrolled and attending daily. Their eldest, Ahmed, ranked 4th in his class in the first term. Their aunt told our field agent: 'My sister would be so proud.'",
    amountDistributed:"$540", daysToDeliver:"7", beneficiaries:3,
    tags:["education","orphan","children"],
  },
  {
    id:"sf4", category:"Water", location:"Kismayo", date:"April 2026", icon:"",
    title:"Clean Water Reaches 280 Families in Kismayo",
    lead:"A deep borehole drilled in Kismayo's eastern district now serves 280 families with clean, tested water — reducing waterborne disease by an estimated 60%.",
    challenge:"Community members had walked 4 km daily for water from an unprotected surface source. Waterborne illness was common, particularly among children under five. Women and girls spent 3–4 hours a day on water collection.",
    response:"Kafaala Qaad partnered with a local drilling company to sink a 60-metre borehole. Water quality was independently tested by the regional health authority before commissioning.",
    outcome:"The borehole has been operational for two months. Waterborne illness cases reported at the local clinic dropped by roughly 60%. Children — especially girls — are attending school more consistently now that water collection no longer takes most of the morning.",
    amountDistributed:"$3,200", daysToDeliver:"21", beneficiaries:280,
    tags:["water","community","health"],
  },
  {
    id:"sf5", category:"Food", location:"Beledweyne", date:"May 2026", icon:"",
    title:"Elderly Widow Receives Monthly Food Support",
    lead:"78-year-old Halima now receives a monthly food basket after a community member filed a case on her behalf. Her health has improved significantly over three months.",
    challenge:"Halima has no surviving children and no income. She had gone multiple days without eating before a neighbour submitted her case. She had been selling her last household items for food money.",
    response:"A monthly food sponsorship was arranged and the first basket was delivered within 11 days of case verification. A community health worker now visits monthly as part of the same programme.",
    outcome:"Halima's health has improved markedly. She has gained weight and her blood pressure — dangerously high at the time of case intake — is now within normal range. She attends the community women's group weekly.",
    amountDistributed:"$460", daysToDeliver:"11", beneficiaries:1,
    tags:["food","elderly"],
  },
  {
    id:"sf6", category:"Orphan", location:"Afgooye", date:"June 2026", icon:"👶",
    title:"Infant Orphan Given Safe Home and Monthly Care",
    lead:"14-month-old Ibrahim is now cared for by a verified foster family, with monthly sponsorship covering nutrition, formula, and regular health checks.",
    challenge:"Ibrahim's mother died in childbirth. His father died three months later. He was left in the care of his 74-year-old grandmother, who had no income and could not afford formula or medical visits. Ibrahim was malnourished at intake.",
    response:"A foster family was vetted and approved by our child welfare coordinator within five days. Monthly sponsorship was matched on the same day the case was published. A paediatric health check was arranged on day one.",
    outcome:"Ibrahim is gaining weight normally and has had all required vaccinations. His foster family reports he is healthy and thriving. His grandmother visits weekly.",
    amountDistributed:"$360", daysToDeliver:"5", beneficiaries:1,
    tags:["orphan","infant","foster"],
  },
  {
    id:"sf7", category:"Medical", location:"Mogadishu", date:"March 2026", icon:"",
    title:"Dialysis Lifeline for 68-Year-Old Patient",
    lead:"Sponsorship covers six months of bi-weekly dialysis for Rooda, 68, who had run out of options. Her family says the support 'gave her back to us.'",
    challenge:"Rooda requires dialysis twice a week to survive end-stage kidney disease. Each session costs $60. Her family of four earns less than $200 a month and had already borrowed from everyone they knew.",
    response:"A medical sponsorship was verified and matched within four days. Treatment was arranged with the dialysis unit at Mogadishu's largest hospital. Transport costs are also covered.",
    outcome:"Rooda has now completed three months of treatment. Her condition is stable. She attends family gatherings, helps with cooking, and tells our field agent she feels 'like herself again.'",
    amountDistributed:"$1,800", daysToDeliver:"4", beneficiaries:1,
    tags:["medical","elderly","dialysis"],
  },
  {
    id:"st1", category:"Success Story", date:"2026-05-12", location:"Mogadishu", icon:"🏠",
    title:"Family of Seven Finds Safety After Flood Displacement",
    lead:"After losing their home to seasonal flooding, a family of seven was living in a collapsed structure. Within 14 days of verification, they had a safe home.",
    challenge:"Family of 7 were living in a collapsed structure with no clean water or food access. Four children under 12 were exposed to the elements. The mother was recovering from illness.",
    response:"Kafaala Qaad verified the case within 48 hours and matched emergency shelter and food donors within three days. Shelter was constructed in under two weeks.",
    outcome:"Temporary shelter erected, food supply secured for 3 months, children back in school. The family plans to transition to permanent housing in the next quarter.",
    daysToDeliver:"14", amountDistributed:"$820", beneficiaries:7,
    tags:["shelter","food","emergency"],
  },
  {
    id:"st2", category:"Medical", date:"2026-04-28", location:"Baidoa", icon:"",
    title:"8-Year-Old Girl Receives Critical Medication",
    lead:"A young girl in Baidoa had been without essential medication for weeks. Sponsors covered four months of doctor visits and medication costs.",
    challenge:"Critical medication had become unavailable locally and the family could not afford to source it elsewhere. The child's health had deteriorated noticeably over three weeks.",
    response:"A verified medical sponsor was matched within six days. Medication was sourced and delivered. Ongoing specialist visits were arranged and pre-paid for four months.",
    outcome:"Full medication course delivered, 4 months of specialist visits funded. The child's doctor confirmed full stabilisation within six weeks.",
    daysToDeliver:"9", amountDistributed:"$540", beneficiaries:1,
    tags:["medical","child"],
  },
  {
    id:"st3", category:"Education", date:"2026-04-10", location:"Kismayo", icon:"📚",
    title:"Three Orphaned Brothers Return to School",
    lead:"Three brothers aged 9, 11, and 13 had dropped out after losing both parents. An education sponsor covered all three children for a full academic year.",
    challenge:"Three brothers out of school, surviving on charity from neighbours. No adult family member had income. The eldest had begun looking for daily labour despite being 13.",
    response:"Education sponsorship was identified and matched within one week. School fees were paid directly. Uniforms, bags, and supplies were purchased locally and delivered.",
    outcome:"All three enrolled, school fees paid, uniforms and supplies provided. The eldest is now studying for secondary school entrance exams.",
    daysToDeliver:"21", amountDistributed:"$960", beneficiaries:3,
    tags:["education","orphan","children"],
  },
  {
    id:"st4", category:"Food & Nutrition", date:"2026-03-22", location:"Garowe", icon:"",
    title:"Weekly Food Deliveries Reach Isolated Elder",
    lead:"A 78-year-old man living alone with no income now receives weekly food deliveries and regular health worker visits.",
    challenge:"No food security, no family contact, deteriorating health. He had been selling household possessions for food and had not had a full meal in four days at the time of intake.",
    response:"A monthly food programme was activated. Weekly deliveries were arranged with a local community organisation. A reconnection effort identified a distant family member who agreed to visit monthly.",
    outcome:"Weekly food delivery, monthly health check, reconnected with distant family. His weight has returned to a healthy range within 10 weeks.",
    daysToDeliver:"11", amountDistributed:"$460", beneficiaries:1,
    tags:["food","elderly"],
  },
  {
    id:"st5", category:"Press Release", date:"2026-03-05", location:"Mogadishu", icon:"",
    title:"Kafaala Qaad Reaches 500 Verified Cases Milestone",
    lead:"The platform announces verification and aid delivery for its 500th case, representing families in 12 regions. Total funds distributed exceed $380,000.",
    challenge:"When Kafaala Qaad launched, the challenge was simple but enormous: create a system of trust between donors abroad and families in Somalia who had no digital footprint and no formal documentation.",
    response:"A network of 34 field agents was trained and deployed. Every case goes through a multi-step verification protocol. A transparent public ledger of distributions was built.",
    outcome:"500 cases verified and closed. $380,000+ distributed. Zero funds returned for non-delivery. Average delivery time: 11.4 days.",
    daysToDeliver:null, amountDistributed:"$380,000+", beneficiaries:1800,
    tags:["milestone","platform"],
  },
  {
    id:"st6", category:"Partnership", date:"2026-02-18", location:"Mogadishu", icon:"",
    title:"New Partnership with Regional Health Ministry",
    lead:"A formal agreement with the Regional Health Ministry now enables Kafaala Qaad field agents to coordinate directly with clinics, cutting verification time from 14 days to under 5.",
    challenge:"Medical case verification had been a bottleneck. Field agents had to independently confirm diagnoses and treatment availability — a process that could take two weeks in remote areas.",
    response:"A memorandum of understanding was signed with the Regional Health Ministry. Field agents now have direct access to clinic records and can fast-track referrals for verified medical cases.",
    outcome:"Medical case verification time dropped from an average of 14 days to under 5. The first 20 cases processed under the new agreement were closed within 4 days on average.",
    daysToDeliver:null, amountDistributed:null, beneficiaries:null,
    tags:["partnership","health","ministry"],
  },
];

function readingTime(story) {
  const words = [story.lead, story.challenge, story.response, story.outcome].filter(Boolean).join(" ").split(/\s+/).length;
  return Math.max(2, Math.round(words / 200));
}

const CAT_COLORS = {
  Medical:"#3B82F6", Shelter:"#10B981", Education:"#F59E0B", Water:"#06B6D4",
  Food:"#EC4899", "Food & Nutrition":"#EC4899", Orphan:"#8B5CF6",
  Emergency:"#C0392B", "Success Story":"#10B981", "Press Release":"#8B5CF6",
  Partnership:"#DB2777", Other:"#5A6E8A",
};
const catColor = (cat) => CAT_COLORS[cat] || "#5A6E8A";

const fmt = (d) => {
  try { return new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }); }
  catch { return d || ""; }
};

export default function StoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    // Check localStorage sources first, then static
    let found = null;
    try {
      const pub = JSON.parse(localStorage.getItem("kf_published_stories") || "[]");
      found = pub.find(s => s.id === id);
      if (!found) {
        const imp = JSON.parse(localStorage.getItem("kf_impact_stories") || "[]");
        found = imp.find(s => s.id === id);
      }
    } catch {}
    if (!found) found = STATIC_ALL.find(s => s.id === id);
    setStory(found || null);

    // Related: same category, different id
    const allRel = STATIC_ALL.filter(s => s.id !== id && s.category === (found?.category));
    setRelated(allRel.slice(0, 3));
  }, [id]);

  if (!story) return (
    <div style={{ minHeight:"60vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:"system-ui", textAlign:"center", padding:24 }}>
      <div style={{ fontSize:64 }}></div>
      <h2 style={{ fontSize:24, fontWeight:900, color:C.navy }}>Story Not Found</h2>
      <p style={{ color:C.muted, fontSize:15 }}>This story may have been removed or the link is incorrect.</p>
      <Link to="/stories" style={{ padding:"12px 28px", background:C.primary, color:"#fff", borderRadius:12, textDecoration:"none", fontWeight:700 }}>← Back to Stories</Link>
    </div>
  );

  const col = catColor(story.category);
  const mins = readingTime(story);

  return (
    <div style={{ fontFamily:"'Segoe UI', system-ui, sans-serif", color:C.text, background:"#fff" }}>

      {/* ── Hero image / gradient ── */}
      <div style={{ position:"relative", width:"100%", maxHeight:520, overflow:"hidden", background:C.navy }}>
        <img src={getStoryImg(story)} alt={story.title} style={{ width:"100%", height:480, objectFit:"cover", display:"block" }} />
      </div>

      {/* ── Article body ── */}
      <div style={{ maxWidth:780, margin:"0 auto", padding:"0 24px 80px" }}>

        {/* Photo credit */}
        {story.afterImg && (
          <div style={{ fontSize:11, color:C.muted, margin:"8px 0 0", textAlign:"right" }}>
            Kafaala Qaad / Field Documentation
          </div>
        )}

        {/* Breadcrumb */}
        <div style={{ display:"flex", gap:8, alignItems:"center", fontSize:13, color:C.muted, margin:"28px 0 0", flexWrap:"wrap" }}>
          <Link to="/" style={{ color:C.muted, textDecoration:"none" }}>Home</Link>
          <span>›</span>
          <Link to="/stories" style={{ color:C.muted, textDecoration:"none" }}>Stories</Link>
          <span>›</span>
          <span style={{ color:col, fontWeight:700 }}>{story.category}</span>
        </div>

        {/* Category tag + reading time */}
        <div style={{ display:"flex", alignItems:"center", gap:14, margin:"18px 0 0", flexWrap:"wrap" }}>
          <span style={{ background:col, color:"#fff", borderRadius:6, padding:"4px 14px", fontSize:12, fontWeight:800 }}>
            {story.category}
          </span>
          {story.location && (
            <span style={{ fontSize:13, color:C.muted }}>{story.location}</span>
          )}
          <span style={{ fontSize:13, color:C.muted }}>Reading time: {mins} minute{mins !== 1 ? "s" : ""}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize:"clamp(24px,4vw,38px)", fontWeight:900, color:C.navy, margin:"20px 0 0", lineHeight:1.25, letterSpacing:-0.5 }}>
          {story.title}
        </h1>

        {/* Date + location dateline — UNICEF style bold lead */}
        {(story.location || story.date) && (
          <div style={{ fontSize:16, fontWeight:700, color:C.text, margin:"20px 0 0", lineHeight:1.7 }}>
            <strong style={{ textTransform:"uppercase" }}>
              {[story.location, story.date].filter(Boolean).join(", ")}
            </strong>
            {story.lead && <span style={{ fontWeight:400 }}> – {story.lead}</span>}
          </div>
        )}
        {!(story.location || story.date) && story.lead && (
          <p style={{ fontSize:17, fontWeight:400, color:C.text, margin:"20px 0 0", lineHeight:1.75 }}>{story.lead}</p>
        )}

        {/* Divider */}
        <div style={{ borderTop:`2px solid ${C.border}`, margin:"32px 0" }} />

        {/* The Challenge */}
        {story.challenge && (
          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:13, fontWeight:800, color:col, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 14px" }}>
              The Challenge
            </h2>
            <p style={{ fontSize:16, lineHeight:1.85, color:C.text, margin:0 }}>{story.challenge}</p>
          </section>
        )}

        {/* The Response */}
        {story.response && (
          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:13, fontWeight:800, color:col, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 14px" }}>
              Our Response
            </h2>
            <p style={{ fontSize:16, lineHeight:1.85, color:C.text, margin:0 }}>{story.response}</p>
          </section>
        )}

        {/* Fallback: beforeDesc / afterDesc if no structured sections */}
        {!story.challenge && story.beforeDesc && (
          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:13, fontWeight:800, color:col, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 14px" }}>Background</h2>
            <p style={{ fontSize:16, lineHeight:1.85, color:C.text, margin:0 }}>{story.beforeDesc}</p>
          </section>
        )}

        {/* The Outcome */}
        {(story.outcome || story.afterDesc) && (
          <section style={{ marginBottom:32 }}>
            <h2 style={{ fontSize:13, fontWeight:800, color:col, textTransform:"uppercase", letterSpacing:1.5, margin:"0 0 14px" }}>
              The Outcome
            </h2>
            <p style={{ fontSize:16, lineHeight:1.85, color:C.text, margin:0 }}>{story.outcome || story.afterDesc}</p>
          </section>
        )}

        {/* Impact stats bar */}
        {(story.amountDistributed || story.daysToDeliver || story.beneficiaries) && (
          <div style={{ background:`linear-gradient(135deg, ${C.navy}08, ${col}12)`, border:`1px solid ${col}30`, borderRadius:16, padding:"24px 28px", marginBottom:36, display:"flex", gap:28, flexWrap:"wrap" }}>
            {story.amountDistributed && (
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:col }}>{story.amountDistributed}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2, textTransform:"uppercase", letterSpacing:0.5 }}>Distributed</div>
              </div>
            )}
            {story.daysToDeliver && (
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:col }}>{story.daysToDeliver} days</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2, textTransform:"uppercase", letterSpacing:0.5 }}>Response time</div>
              </div>
            )}
            {story.beneficiaries && (
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:col }}>{story.beneficiaries.toLocaleString()}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2, textTransform:"uppercase", letterSpacing:0.5 }}>Beneficiar{story.beneficiaries === 1 ? "y" : "ies"}</div>
              </div>
            )}
            <div style={{ marginLeft:"auto", alignSelf:"center" }}>
              <span style={{ background:C.secondary+"20", color:C.secondary, borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:800 }}>✓ Field Verified</span>
            </div>
          </div>
        )}

        {/* Tags */}
        {story.tags?.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:36 }}>
            {story.tags.map(t => (
              <span key={t} style={{ background:C.bg, color:C.muted, borderRadius:99, padding:"4px 12px", fontSize:12, fontWeight:600, border:`1px solid ${C.border}` }}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Share + Actions */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", paddingTop:24, borderTop:`1px solid ${C.border}`, marginBottom:56 }}>
          <button onClick={() => {
            if (navigator.share) navigator.share({ title: story.title, url: window.location.href });
            else { navigator.clipboard?.writeText(window.location.href); }
          }} style={{ padding:"11px 22px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", fontSize:13, fontWeight:700, color:C.text }}>
            Share Story
          </button>
          <Link to="/donate" style={{ padding:"11px 22px", borderRadius:10, border:"none", background:C.gold, color:"#fff", fontWeight:800, fontSize:13, textDecoration:"none" }}>
            Donate Now
          </Link>
          <Link to="/cases" style={{ padding:"11px 22px", borderRadius:10, border:`1.5px solid ${C.primary}`, color:C.primary, fontWeight:700, fontSize:13, textDecoration:"none", background:"#fff" }}>
            View Open Cases
          </Link>
        </div>

        {/* Related stories */}
        {related.length > 0 && (
          <section>
            <h3 style={{ fontSize:18, fontWeight:900, color:C.navy, margin:"0 0 20px", paddingBottom:12, borderBottom:`2px solid ${C.border}` }}>
              Related Stories
            </h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
              {related.map(s => (
                <Link key={s.id} to={`/stories/${s.id}`} style={{ textDecoration:"none", display:"block", borderRadius:14, overflow:"hidden", border:`1px solid ${C.border}`, background:C.bg, transition:"box-shadow .2s" }}
                  onMouseOver={e => e.currentTarget.style.boxShadow="0 6px 20px rgba(0,38,81,0.12)"}
                  onMouseOut={e  => e.currentTarget.style.boxShadow="none"}
                >
                  <div style={{ height:100, background:`linear-gradient(135deg,${catColor(s.category)}25,${catColor(s.category)}55)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>
                    {s.icon || ""}
                  </div>
                  <div style={{ padding:"12px 14px" }}>
                    <span style={{ background:catColor(s.category), color:"#fff", borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:800 }}>{s.category}</span>
                    <div style={{ fontSize:13, fontWeight:800, color:C.navy, margin:"8px 0 4px", lineHeight:1.4 }}>{s.title}</div>
                    <div style={{ fontSize:11, color:C.primary, fontWeight:700 }}>Read now →</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back link */}
        <div style={{ marginTop:48 }}>
          <button onClick={() => navigate(-1)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14, fontWeight:700, padding:0 }}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
