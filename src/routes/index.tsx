import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Brain, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, FileText, GraduationCap, Hand, Library, Mic, Pause, Play, Send, Settings, Sparkles, Sun, TrendingUp, Upload, UserRound, Volume2, X } from "lucide-react";
import { modules } from "@/lib/curriculum";
import { ClassroomScene } from "@/components/classroom/ClassroomScene";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "AI KYRO — Metacognitive Classroom" },
    { name: "description", content: "Learn complete university topics through an interactive AI classroom grounded in your own materials." },
    { property: "og:title", content: "AI KYRO — Metacognitive Classroom" },
    { property: "og:description", content: "An immersive AI classroom for active, measurable learning." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: App,
});

type Panel = "classroom" | "library" | "progress";
type Material = { id:string; title:string; file_name:string; status:string; page_count:number|null; extracted_summary:string|null; storage_path:string };
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function App() {
  const [panel,setPanel]=useState<Panel>("classroom");
  const [moduleIndex,setModuleIndex]=useState(0); const [conceptIndex,setConceptIndex]=useState(1); const [stageIndex,setStageIndex]=useState(0);
  const [playing,setPlaying]=useState(false); const [speed,setSpeed]=useState(1); const [response,setResponse]=useState(""); const [attempted,setAttempted]=useState(false);
  const [question,setQuestion]=useState(""); const [answer,setAnswer]=useState(""); const [asking,setAsking]=useState(false); const [materials,setMaterials]=useState<Material[]>([]);
  const [user,setUser]=useState<User|null>(null); const [uploading,setUploading]=useState(false); const [authOpen,setAuthOpen]=useState(false); const [sourceOpen,setSourceOpen]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const module=required(modules[moduleIndex] ?? modules[0], "module");
  const concept=required(module.concepts[conceptIndex] ?? module.concepts[0], "concept");
  const stage=required(concept.stages[stageIndex] ?? concept.stages[0], "lesson stage");

  useEffect(()=>{ supabase.auth.getUser().then(({data})=>setUser(data.user)); const {data}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null)); return ()=>data.subscription.unsubscribe(); },[]);
  useEffect(()=>{ if(!user) return; supabase.from("learning_materials").select("id,title,file_name,status,page_count,extracted_summary,storage_path").order("created_at",{ascending:false}).then(({data})=>setMaterials(data??[])); },[user]);
  useEffect(()=>{ if(!playing) return; const t=window.setTimeout(()=>setStageIndex(i=>i<concept.stages.length-1?i+1:i), Math.max(3500,9000/speed)); return ()=>window.clearTimeout(t); },[playing,stageIndex,speed,concept.stages.length]);
  useEffect(()=>{ setAttempted(false); setResponse(""); setAnswer(""); },[stageIndex,conceptIndex,moduleIndex]);

  const stageProgress=Math.round(((stageIndex+1)/concept.stages.length)*100);
  const sourceSummary=materials[0]?.extracted_summary ?? "";
  const speakerName=stage.speaker==="teacher"?"Dr Rao":stage.speaker==="maya"?"Maya · foundational learner":"Arjun · probing learner";
  const speak=()=>{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(stage.text); u.rate=stage.speaker==="teacher"?.94:1.02; u.pitch=stage.speaker==="maya"?1.12:.94; speechSynthesis.speak(u); };
  const submitAttempt=()=>{ if(!response.trim()) return; setAttempted(true); setPlaying(false); };
  const ask=async()=>{ if(!question.trim()||asking) return; setAsking(true); setAnswer(""); try { const r=await fetch("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question,context:concept.stages.slice(0,stageIndex+1).map(s=>`${s.speaker}: ${s.text}`).join("\n"),source:sourceSummary})}); if(!r.ok){const e=await r.json(); throw new Error(e.message);} const reader=r.body?.getReader(); const decoder=new TextDecoder(); if(reader){while(true){const {done,value}=await reader.read(); if(done)break; setAnswer(a=>a+decoder.decode(value,{stream:true}));}} } catch(e){setAnswer(e instanceof Error?e.message:"The teacher could not answer right now.");} finally{setAsking(false);} };
  const upload=async(file:File)=>{ if(!user){setAuthOpen(true);return;} setUploading(true); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"); const path=`${user.id}/${crypto.randomUUID()}-${safe}`; const {error}=await supabase.storage.from("learning-materials").upload(path,file); if(!error){ const {data}=await supabase.from("learning_materials").insert({user_id:user.id,title:file.name.replace(/\.[^.]+$/,""),file_name:file.name,file_type:file.type||"application/octet-stream",storage_path:path,status:"ready",extracted_summary:`Uploaded course material: ${file.name}. Select it to ground your next classroom session.`}).select("id,title,file_name,status,page_count,extracted_summary,storage_path").single(); if(data)setMaterials(m=>[data,...m]); } setUploading(false); };
  const google=async()=>{await lovable.auth.signInWithOAuth("google",{redirect_uri:window.location.origin});};

  const visibleStages=concept.stages.slice(0,stageIndex+1);

  return <main className="app-shell">
    <aside className="main-sidebar">
      <div className="brand"><span className="brand-mark"><Sun/></span><div><strong>AI KYRO</strong><small>Learn · Think · Grow</small></div></div>
      <div className="room-card"><span><BookOpen/></span><div><strong>Room 617</strong><small>Your learning space</small></div><b>›</b></div>
      <nav aria-label="Primary"><Button variant="ghost" className={panel==="classroom"?"active":""} onClick={()=>setPanel("classroom")}><BookOpen/><span>My Desk</span></Button><Button variant="ghost" className={panel==="library"?"active":""} onClick={()=>setPanel("library")}><Library/><span>Class Library</span></Button><Button variant="ghost" onClick={()=>setPanel("classroom")}><ClipboardCheck/><span>Quick Checks</span></Button><Button variant="ghost" className={panel==="progress"?"active":""} onClick={()=>setPanel("progress")}><TrendingUp/><span>Report Card</span></Button></nav>
      <div className="sidebar-note"><i/><p>Small steps<br/>build big ideas.</p><Sparkles/></div>
      <div className="sidebar-profile"><span>{user?.email?.charAt(0).toUpperCase()??"S"}</span><div><strong>{user?.email?.split("@")[0]??"Student"}</strong><small>Keep exploring</small></div><Settings/></div>
    </aside>

    <div className="app-content">
      <header className="topbar"><div><span className="header-icon"><Sun/></span><div><strong>{panel==="classroom"?"Classroom":panel==="library"?"Class Library":"Report Card"}</strong><small>{panel==="classroom"?`${module.code} · ${concept.title}`:"AI KYRO"}</small></div></div><div className="top-actions"><span className="encouragement"><Sparkles/> Keep going!</span><span className="points">1,240 points</span>{user?<Button variant="outline" onClick={()=>supabase.auth.signOut()}>Sign out</Button>:<Button variant="outline" onClick={()=>setAuthOpen(true)}>Sign in</Button>}</div></header>

      {panel==="classroom"&&<div className="classroom-page">
        <div className="classroom-toolbar"><div><span>NOW LEARNING</span><strong>{module.title}</strong><small>{concept.title} · {concept.bloom}</small></div><div className="module-tabs">{modules.map((m,i)=><Button size="sm" variant="ghost" key={m.slug} className={i===moduleIndex?"active":""} onClick={()=>{setModuleIndex(i);setConceptIndex(0);setStageIndex(0)}}>{m.code}</Button>)}</div><Button variant="outline" onClick={speak}><Volume2/> Read aloud</Button></div>
        <div className="classroom-layout">
          <section className="classroom-stage"><div className="scene"><ClassroomScene speaker={stage.speaker} board={stage.board}/><div className="scene-top"><span className="live-dot"><i/> LIVE CLASS</span><span>{concept.title}</span><Button variant="ghost" onClick={()=>setSourceOpen(!sourceOpen)}><FileText/> {materials.length?`${materials.length} sources`:"Course source"}</Button></div><div className="speaker-card"><div className={`speaker-avatar ${stage.speaker}`}>{stage.speaker==="teacher"?<GraduationCap/>:stage.speaker==="maya"?<BookOpen/>:<Brain/>}</div><div><small>{stage.label}</small><strong>{speakerName}</strong><p>{stage.text}</p></div></div>{sourceOpen&&<div className="source-drawer"><div><strong>Sources in this class</strong><Button size="icon" variant="ghost" onClick={()=>setSourceOpen(false)} aria-label="Close sources"><X/></Button></div>{materials.length?materials.map(m=><article key={m.id}><FileText/><div><b>{m.title}</b><small>{m.file_name}</small></div><span>Ready</span></article>):<p>This lesson uses the verified AI KYRO pilot curriculum. Add your own slides to ground the next class.</p>}</div>}</div>
            <div className="transport"><div><Button size="icon" variant="outline" onClick={()=>setStageIndex(i=>Math.max(0,i-1))} aria-label="Previous turn"><ChevronLeft/></Button><Button size="icon" onClick={()=>setPlaying(p=>!p)} aria-label={playing?"Pause":"Play"}>{playing?<Pause/>:<Play/>}</Button><Button size="icon" variant="outline" onClick={()=>setStageIndex(i=>Math.min(concept.stages.length-1,i+1))} aria-label="Next turn"><ChevronRight/></Button></div><div className="timeline"><Progress value={stageProgress}/><small>Class discussion · {stageIndex+1} of {concept.stages.length}</small></div><Button variant="outline" className="speed" onClick={()=>setSpeed(s=>s===1?1.5:s===1.5?2:1)}>{speed}×</Button></div>
          </section>
          <aside className="class-transcript"><div className="transcript-header"><div><small>CLASS TRANSCRIPT</small><h2>Follow the discussion</h2></div><span><i/> LIVE</span></div><div className="transcript-list">{visibleStages.map((item,i)=><article key={`${item.speaker}-${i}`} className={i===stageIndex?"current":""}><span className={`transcript-avatar ${item.speaker}`}>{item.speaker==="teacher"?<GraduationCap/>:item.speaker==="maya"?<BookOpen/>:<Brain/>}</span><div><header><strong>{item.speaker==="teacher"?"Dr Rao":item.speaker==="maya"?"Maya":"Arjun"}</strong>{i===stageIndex&&<em>speaking</em>}</header><p>{item.text}</p></div></article>)}</div>{stage.prompt&&<div className="transcript-response"><small>YOUR GUESS, BEFORE THE ANSWER</small><p>{stage.prompt}</p><Textarea value={response} onChange={e=>setResponse(e.target.value)} placeholder="Type your reasoning…"/><div><Button variant="ghost" onClick={()=>setAttempted(true)} disabled={!response.trim()}><CircleHelp/>Hint</Button><Button onClick={submitAttempt} disabled={!response.trim()}>Commit</Button></div>{attempted&&<p className="feedback-text">{stage.hint??"State the principle, connect it to this situation, then test your conclusion."}</p>}</div>}</aside>
        </div>
        <div className="question-bar"><Hand/><Textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Raise your hand to ask Dr Rao a question…"/><Button size="icon" variant="ghost" aria-label="Speak question"><Mic/></Button><Button size="icon" onClick={ask} disabled={asking||!question.trim()} aria-label="Send question"><Send/></Button></div>{answer&&<div className="teacher-answer"><strong>Dr Rao</strong><p>{answer}</p></div>}
        <div className="concept-strip">{module.concepts.map((c,i)=><Button variant="ghost" key={c.slug} className={i===conceptIndex?"active":""} onClick={()=>{setConceptIndex(i);setStageIndex(0)}}><span>{i+1}</span><div><strong>{c.title}</strong><small>{c.bloom} · {c.mastery}% mastery</small></div></Button>)}</div>
      </div>}

    {panel==="library"&&<section className="page-view"><div className="page-title"><div><small>PERSONAL KNOWLEDGE BASE</small><h1>Learn from your own material</h1><p>Bring slides, notes, readings or diagrams. AI KYRO turns them into a complete classroom—not a summary.</p></div><Button onClick={()=>inputRef.current?.click()} disabled={uploading}><Upload/>{uploading?"Uploading…":"Add material"}</Button><input ref={inputRef} hidden type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></div><div className="upload-zone" onClick={()=>inputRef.current?.click()} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")inputRef.current?.click()}} role="button" tabIndex={0}><Upload/><h2>Drop your class material here</h2><p>PDF, PowerPoint, Word, text or images · up to 20 MB</p><span>We keep the original private and cite the exact source inside lessons.</span></div><div className="material-grid">{materials.map(m=><article key={m.id} className="material-card"><FileText/><div><small>{m.status.toUpperCase()}</small><h3>{m.title}</h3><p>{m.extracted_summary}</p><span>{m.file_name}</span></div><Button onClick={()=>{setPanel("classroom");setSourceOpen(true)}}>Build class</Button></article>)}{!materials.length&&<div className="empty-material"><Library/><h3>Your materials will appear here</h3><p>Sign in and upload a file to create a grounded class.</p></div>}</div></section>}

    {panel==="progress"&&<section className="page-view"><div className="page-title"><div><small>LEARNING EVIDENCE</small><h1>Your understanding, not your streak</h1><p>Mastery grows from explanation, transfer and delayed recall—not from opening a lesson.</p></div></div><div className="metric-row"><div><small>CONCEPTS ACTIVE</small><strong>7</strong><span>across 2 modules</span></div><div><small>READY TO REVIEW</small><strong>3</strong><span>from your doubt log</span></div><div><small>TRANSFER SCORE</small><strong>72%</strong><span>+9 this week</span></div></div><div className="progress-board">{modules.flatMap(m=>m.concepts).filter(c=>c.mastery>0).map(c=><article key={c.slug}><div><strong>{c.title}</strong><span>{c.bloom}</span></div><Progress value={c.mastery}/><b>{c.mastery}%</b></article>)}</div></section>}

      {authOpen&&<div className="modal-backdrop"><div className="auth-dialog"><Button size="icon" variant="ghost" className="modal-close" onClick={()=>setAuthOpen(false)}><X/></Button><span className="brand-mark">AK</span><h2>Keep your learning with you</h2><p>Sign in to save materials, sessions, mastery and review schedules across devices.</p><Button className="google" onClick={google}>Continue with Google</Button><small>Your uploads remain private to your account.</small></div></div>}
    </div>
  </main>;
}
