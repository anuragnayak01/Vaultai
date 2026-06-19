import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'

// ── Helpers ───────────────────────────────────────────────────
const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB'
const fmtTime  = ts => new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
const fmtDate  = ts => new Date(ts).toLocaleDateString([], { month:'short', day:'numeric' })
const isText   = n  => /\.(py|txt|md|csv|json|js|jsx|ts|tsx|ipynb|yaml|yml|toml|sh|r|sql|log)$/i.test(n)
const fIcon    = n  => ({ py:'🐍',ipynb:'📓',pdf:'📄',txt:'📝',md:'📋',csv:'📊',json:'🔧',js:'📜',ts:'📘',r:'📉',sql:'🗄️',sh:'⚙️' })[(n.split('.').pop()||'').toLowerCase()] || '📁'

// ── Color palette ─────────────────────────────────────────────
const C = {
  bg:'#080A0F', sb:'#0B0D14', panel:'#111318',
  b1:'#14161F', b2:'#1A1D2E',
  text:'#F1F5F9', muted:'#64748B', dim:'#374151',
  acc:'#7C3AED', grad:'linear-gradient(135deg,#7C3AED,#4F46E5)'
}
const btn = (active, danger) => ({
  padding:'6px 13px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12.5, fontWeight:500,
  background: danger ? '#160A0A' : active ? C.acc : C.panel,
  color:       danger ? '#F87171' : active ? '#fff' : C.muted,
  transition:'all .15s'
})

// ── Code block renderer ───────────────────────────────────────
function MsgContent({ text = '' }) {
  return (
    <>{text.split(/(```[\s\S]*?```)/g).map((p,i) => {
      if (!p.startsWith('```')) return <span key={i} style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{p}</span>
      const inner = p.slice(3,-3), nl = inner.indexOf('\n')
      const lang = nl > -1 ? inner.slice(0,nl).trim() : ''
      const code = nl > -1 ? inner.slice(nl+1) : inner
      return (
        <pre key={i} style={{background:'#0D1117',border:'1px solid #30363D',borderRadius:8,padding:'12px 14px',
          overflowX:'auto',fontSize:12.5,fontFamily:"'JetBrains Mono',monospace",color:'#E2E8F0',margin:'8px 0',lineHeight:1.6}}>
          {lang && <div style={{color:'#58A6FF',fontSize:10,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>{lang}</div>}
          <code style={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{code}</code>
        </pre>
      )
    })}</>
  )
}

// ── Thinking block ─────────────────────────────────────────────
function ThinkBlock({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{marginBottom:8}}>
      <button onClick={() => setOpen(x=>!x)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'5px 11px',background:'#120A22',border:'1px solid #3D1F7A',borderRadius:7,cursor:'pointer',fontSize:12,color:'#A78BFA',marginBottom:open?6:0}}>
        {open?'▾':'▸'} 💭 Claude's reasoning {!open && <span style={{color:'#5B4090'}}>(expand)</span>}
      </button>
      {open && (
        <div style={{padding:'12px 14px',background:'#0A061A',border:'1px solid #2A1455',borderRadius:9,
          fontSize:12.5,color:'#7B6BAE',fontFamily:"'JetBrains Mono',monospace",lineHeight:1.75,
          whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:280,overflowY:'auto'}}>
          {text}
        </div>
      )}
    </div>
  )
}

// ── Guide Modal ────────────────────────────────────────────────
function GuideModal({ onClose }) {
  const steps = [
    { icon:'🗄️', title:'Create Supabase project',      desc:'Go to supabase.com → New project → copy Project URL and anon key from Settings → API.' },
    { icon:'📋', title:'Run the SQL schema',            desc:'In Supabase → SQL Editor → paste the contents of schema.sql → click Run. This creates all tables and enables real-time.' },
    { icon:'🚀', title:'Deploy to Vercel',              desc:'Push this repo to GitHub → go to vercel.com → Import repo → add env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY → Deploy.' },
    { icon:'🔗', title:'Share the Vercel URL',          desc:'Vercel gives you a URL like https://vaultai-xyz.vercel.app — share this with any teammate. Anyone who opens it joins the same vault.' },
    { icon:'🙋', title:'Enter your name',               desc:'Each user types their name on first open. That is all — no API key, no signup, no cost. Claude responds via the MCP server running on your machine.' },
    { icon:'📂', title:'Create a project',              desc:'Click + New Project, name it (e.g. "MIR Spectroscopy"), add a description. It appears in everyone\'s sidebar instantly via Supabase real-time.' },
    { icon:'📋', title:'Fill the Context tab',          desc:'Go to 📋 Context → write everything Claude should always know: tech stack, findings, decisions, file summaries, hypotheses. Claude reads this on every message.' },
    { icon:'💬', title:'Chat simultaneously',           desc:'All users can type messages at the same time. Each message is a separate database row — no overwriting, no conflicts. Responses appear live for everyone.' },
    { icon:'💭', title:'Read Claude\'s thinking',       desc:'Every Claude reply has a purple 💭 block — click to see the full chain-of-thought reasoning. Toggle all thinking with 💭 in the header.' },
    { icon:'📁', title:'Upload files',                  desc:'Go to 📁 Files → upload .py, .pdf, .ipynb, .md, .csv, .json (up to 5 MB). Files are stored in Supabase Storage. All users can download or delete.' },
    { icon:'↓',  title:'Export chat',                  desc:'Click ↓ in the chat header to download the full conversation as Markdown — includes all messages, thinking blocks, and timestamps.' },
  ]
  return (
    <div style={{position:'fixed',inset:0,background:'#000000AA',display:'flex',alignItems:'center',justifyContent:'center',zIndex:300}}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{background:'#0D0F17',border:`1px solid ${C.b2}`,borderRadius:18,width:'min(740px,96vw)',maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 40px 80px #00000080'}}>
        <div style={{padding:'18px 22px',borderBottom:`1px solid ${C.b1}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h2 style={{color:C.text,fontSize:19,fontWeight:700,margin:'0 0 2px'}}>🗺️ How to Use VaultAI</h2>
            <p style={{color:C.muted,fontSize:12.5,margin:0}}>Full setup + usage guide</p>
          </div>
          <button onClick={onClose} style={{padding:'6px 14px',background:'#160A0A',border:'1px solid #3A1010',borderRadius:8,color:'#F87171',fontSize:13,cursor:'pointer'}}>✕ Close</button>
        </div>
        <div style={{overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:10}}>
          {steps.map((s,i) => (
            <div key={i} style={{display:'flex',gap:14,padding:'13px 15px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>{s.icon}</div>
              <div>
                <div style={{color:C.text,fontSize:13.5,fontWeight:600,marginBottom:3}}>
                  <span style={{color:C.muted,fontSize:11.5,fontWeight:400,marginRight:8}}>Step {i+1}</span>{s.title}
                </div>
                <div style={{color:C.muted,fontSize:12.5,lineHeight:1.65}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [name,  setName]  = useState('')
  const [guide, setGuide] = useState(false)
  const [err,   setErr]   = useState('')

  function submit() {
    if (!name.trim()) { setErr('Please enter your name'); return }
    onLogin(name.trim())
  }

  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(135deg,${C.bg} 0%,#0F0B1E 100%)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:420,padding:32,width:'100%'}}>
        <div style={{width:80,height:80,background:C.grad,borderRadius:22,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,margin:'0 auto 20px',boxShadow:`0 0 50px ${C.acc}55`}}>🧠</div>
        <h1 style={{color:C.text,fontSize:32,fontWeight:700,margin:'0 0 6px',letterSpacing:-0.8}}>VaultAI</h1>
        <p style={{color:C.muted,fontSize:14,margin:'0 0 6px'}}>Shared AI project notebooks · real-time multi-user</p>
        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#7C3AED18',border:'1px solid #7C3AED44',borderRadius:20,padding:'4px 14px',marginBottom:28}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#22C55E',boxShadow:'0 0 6px #22C55E'}}/>
          <span style={{color:'#A78BFA',fontSize:12}}>AI via Claude Desktop MCP · no API key needed</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
          <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()}
            placeholder="Your name" autoFocus
            style={{width:'100%',padding:'13px 14px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:'none'}}/>
          {err && <p style={{color:'#F87171',fontSize:13,margin:0,textAlign:'left'}}>{err}</p>}
        </div>
        <button onClick={submit}
          style={{width:'100%',padding:'13px',background:C.grad,border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:12}}>
          Enter Workspace →
        </button>
        <button onClick={() => setGuide(true)}
          style={{background:'none',border:'none',color:C.muted,fontSize:13,cursor:'pointer',textDecoration:'underline'}}>
          📖 Setup & usage guide
        </button>
        <p style={{color:'#1E293B',fontSize:11.5,marginTop:16}}>Free · Claude responds via MCP · no API key required</p>
      </div>
      {guide && <GuideModal onClose={() => setGuide(false)} />}
    </div>
  )
}


// ── File Tree Component ───────────────────────────────────────
function FileTree({ files, onPreview, onDownload, onDelete }) {
  const [collapsed, setCollapsed] = React.useState({})
  const C2 = { panel:"#111318", b2:"#1A1D2E", dim:"#374151", text:"#F1F5F9" }

  // Build nested tree from flat files list
  function buildTree(files) {
    const tree = {}
    for (const f of files) {
      const parts = (f.folder || 'general').split('/')
      let node = tree
      for (const part of parts) {
        if (!node[part]) node[part] = { __files: [] }
        node = node[part]
      }
      node.__files.push(f)
    }
    return tree
  }

  function toggleFolder(path) {
    setCollapsed(prev => ({ ...prev, [path]: !prev[path] }))
  }

  function countFiles(node) {
    let count = (node.__files || []).length
    for (const [k, v] of Object.entries(node)) {
      if (k !== '__files') count += countFiles(v)
    }
    return count
  }

  function FolderIcon({ name }) {
    const icons = { config:'⚙️', src:'📦', tests:'🧪', quality_control:'🔍',
      preprocessing:'🔧', partitioning:'✂️', feature_extraction:'🔬',
      selection:'🎯', clustering:'🔗', neural:'🧠', modeling:'📐',
      uncertainty:'📊', evaluation:'📈', general:'📁', code:'🐍',
      docs:'📄', data:'📊', results:'📉' }
    return <span>{icons[name] || '📁'}</span>
  }

  function RenderNode({ node, name, depth, path }) {
    const isOpen = !collapsed[path]
    const files  = node.__files || []
    const subdirs = Object.entries(node).filter(([k]) => k !== '__files')
    const total  = countFiles(node)
    const indent = depth * 16

    return (
      <div key={path}>
        {/* Folder row */}
        <div
          onClick={() => toggleFolder(path)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
            paddingLeft: 10 + indent, cursor:'pointer', borderRadius:7,
            background: isOpen ? '#0D0F1A' : 'transparent',
            border: isOpen ? '1px solid #1A1D2E' : '1px solid transparent',
            marginBottom:2, transition:'all .15s',
            userSelect:'none' }}
          onMouseEnter={e => { if(!isOpen) e.currentTarget.style.background='#0A0C12' }}
          onMouseLeave={e => { if(!isOpen) e.currentTarget.style.background='transparent' }}
        >
          <span style={{fontSize:11,color:'#475569',width:10}}>{isOpen ? '▾' : '▸'}</span>
          <FolderIcon name={name}/>
          <span style={{color:'#A78BFA',fontSize:12.5,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{name}/</span>
          <span style={{color:'#374151',fontSize:11,marginLeft:'auto'}}>{total} file{total!==1?'s':''}</span>
        </div>

        {/* Contents */}
        {isOpen && (
          <div style={{marginLeft: indent + 8, marginBottom:4}}>
            {/* Subdirectories first */}
            {subdirs.map(([k, v]) => (
              <RenderNode key={k} node={v} name={k} depth={depth+1} path={path+'/'+k} />
            ))}
            {/* Files */}
            {files.map(f => (
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'7px 10px', paddingLeft: 10 + (depth+1)*16,
                borderRadius:7, marginBottom:2,
                background:'#0B0D14', border:'1px solid #14161F',
                transition:'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#1A1D2E'}
                onMouseLeave={e => e.currentTarget.style.borderColor='#14161F'}
              >
                <span style={{fontSize:14,flexShrink:0}}>{fIcon(f.name)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:'#C4B5FD',fontSize:12.5,fontWeight:500,
                    fontFamily:"'JetBrains Mono',monospace",
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
                  <div style={{color:'#374151',fontSize:10.5,marginTop:1}}>
                    {fmtBytes(f.size_bytes)} · {f.username} · {fmtDate(f.created_at)}
                  </div>
                </div>
                <div style={{display:'flex',gap:4,flexShrink:0}}>
                  {isText(f.name) && (
                    <button onClick={()=>onPreview(f)}
                      style={{padding:'3px 8px',background:'#0A1929',border:'1px solid #1E3A5F',
                        borderRadius:5,color:'#60A5FA',fontSize:11,cursor:'pointer'}}>👁</button>
                  )}
                  <button onClick={()=>onDownload(f)}
                    style={{padding:'3px 8px',background:'#0A1929',border:'1px solid #1E3A5F',
                      borderRadius:5,color:'#38BDF8',fontSize:11,cursor:'pointer'}}>↓</button>
                  <button onClick={()=>onDelete(f)}
                    style={{padding:'3px 7px',background:'#160A0A',border:'1px solid #3A1010',
                      borderRadius:5,color:'#F87171',fontSize:11,cursor:'pointer'}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const tree = buildTree(files)
  const totalFiles = files.length
  const totalFolders = new Set(files.map(f => f.folder || 'general')).size

  return (
    <div>
      {/* Tree header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'8px 12px',background:'#0A0C14',borderRadius:9,
        border:'1px solid #1A1D2E',marginBottom:12}}>
        <span style={{color:'#64748B',fontSize:12}}>📂 {totalFolders} folder{totalFolders!==1?'s':''} · {totalFiles} file{totalFiles!==1?'s':''}</span>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setCollapsed({})}
            style={{padding:'3px 10px',background:'transparent',border:'1px solid #1A1D2E',
              borderRadius:5,color:'#64748B',fontSize:11,cursor:'pointer'}}>Expand all</button>
          <button onClick={()=>{
            const all={}
            for(const f of files){ const p=(f.folder||'general').split('/').reduce((acc,p,i,arr)=>{ acc[arr.slice(0,i+1).join('/')]= true; return acc },{}) ; Object.assign(all,p) }
            setCollapsed(all)
          }}
            style={{padding:'3px 10px',background:'transparent',border:'1px solid #1A1D2E',
              borderRadius:5,color:'#64748B',fontSize:11,cursor:'pointer'}}>Collapse all</button>
        </div>
      </div>
      {/* Tree */}
      {Object.entries(tree).map(([k, v]) => (
        <RenderNode key={k} node={v} name={k} depth={0} path={k} />
      ))}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [username, setUsername] = useState('')

  const [projects,  setProjects]  = useState([])
  const [proj,      setProj]      = useState(null)
  const [tab,       setTab]       = useState('chat')

  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [typing,     setTyping]     = useState(false)
  const [showThink,  setShowThink]  = useState(true)
  const [newMsgBanner, setNewMsgBanner] = useState(false)

  const [files,     setFiles]     = useState([])
  const [uploading, setUploading] = useState(false)
  const [viewFile,  setViewFile]  = useState(null)
  const [viewText,  setViewText]  = useState('')

  const [context,  setContext]  = useState('')
  const [editCtx,  setEditCtx]  = useState(false)
  const [ctxDraft, setCtxDraft] = useState('')

  const [activeUsers, setActiveUsers] = useState([])
  const [dbProgress,  setDbProgress]  = useState([])
  const [testResults, setTestResults] = useState([])
  const [aiReviews,   setAiReviews]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [showNew,     setShowNew]     = useState(false)
  const [showGuide,   setShowGuide]   = useState(false)
  const [npName,      setNpName]      = useState('')
  const [npDesc,      setNpDesc]      = useState('')
  const [error,       setError]       = useState('')

  const bottomRef    = useRef(null)
  const fileRef      = useRef(null)
  const inputRef     = useRef(null)
  const projRef      = useRef(null)
  const channelRef   = useRef(null)
  const presenceRef  = useRef(null)
  const isAtBottom   = useRef(true)

  useEffect(() => { projRef.current = proj }, [proj])

  // scroll tracking
  useEffect(() => {
    const el = bottomRef.current?.parentElement
    if (!el) return
    const onScroll = () => { isAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 60 }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // auto-scroll
  useEffect(() => {
    if (isAtBottom.current) bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages, typing])

  // ── Presence channel ────────────────────────────────────────
  useEffect(() => {
    if (!username) return
    const ch = supabase.channel('vault-presence', {
      config: { presence: { key: username } }
    })
    ch.on('presence', { event:'sync' }, () => {
      const state = ch.presenceState()
      setActiveUsers(Object.keys(state))
    })
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') await ch.track({ username, online_at: new Date().toISOString() })
    })
    presenceRef.current = ch
    return () => { ch.unsubscribe() }
  }, [username])

  // ── Load projects ────────────────────────────────────────────
  useEffect(() => {
    if (!username) return
    loadProjects()
    // subscribe to new projects
    const ch = supabase.channel('projects-changes')
      .on('postgres_changes', { event:'*', schema:'public', table:'projects' }, () => loadProjects())
      .subscribe()
    return () => ch.unsubscribe()
  }, [username])

  // ── Subscribe to current project messages ────────────────────
  useEffect(() => {
    if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null }
    if (!proj) return
    loadProjectData(proj.id)

    const ch = supabase.channel(`messages-${proj.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `project_id=eq.${proj.id}`
      }, payload => {
        const msg = payload.new
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev
          if (!isAtBottom.current) setNewMsgBanner(true)
          return [...prev, msg]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'project_context',
        filter: `project_id=eq.${proj.id}`
      }, payload => {
        setContext(payload.new.content || '')
      })
      .subscribe()
    channelRef.current = ch
    return () => { ch.unsubscribe(); channelRef.current = null }
  }, [proj?.id])

  async function loadProjects() {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending:true })
    if (!error) setProjects(data || [])
  }

  async function loadProjectData(pid) {
    setLoading(true)
    const [{ data: msgs }, { data: fls }, { data: ctx }] = await Promise.all([
      supabase.from('messages').select('*').eq('project_id', pid).order('created_at', { ascending:true }),
      supabase.from('files').select('*').eq('project_id', pid).order('created_at', { ascending:true }),
      supabase.from('project_context').select('*').eq('project_id', pid).maybeSingle()
    ])
    setMessages(msgs || [])
    setFiles(fls || [])
    setContext(ctx?.content || '')
    setLoading(false)
    isAtBottom.current = true
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'auto' }), 50)
  }

  async function createProject() {
    if (!npName.trim()) return
    const { data, error } = await supabase.from('projects').insert({
      name: npName.trim(), description: npDesc.trim(), created_by: username
    }).select().single()
    if (error) { setError('Could not create project: ' + error.message); return }
    setProj(data)
    setMessages([]); setFiles([]); setContext('')
    setNpName(''); setNpDesc(''); setShowNew(false); setTab('chat')
  }

  async function sendMessage() {
    if (!input.trim() || typing) return
    const content = input.trim()
    setInput('')
    isAtBottom.current = true
    inputRef.current?.focus()

    // Save user message to Supabase — Claude picks it up via MCP
    const { error: uErr } = await supabase.from('messages').insert({
      project_id: proj.id, role: 'user', content, username, thinking: null
    })
    if (uErr) { setError('Send failed: ' + uErr.message); return }
    // Claude Desktop (with VaultAI MCP) will see this message and respond automatically
  }

  async function saveContext() {
    await supabase.from('project_context').upsert({
      project_id: proj.id, content: ctxDraft, updated_by: username, updated_at: new Date().toISOString()
    })
    setContext(ctxDraft); setEditCtx(false)
  }

  async function uploadFile(e) {
    const file = e.target.files[0]; if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Max file size is 5 MB'); return }
    setUploading(true)
    try {
      // Read file
      const data = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result); r.onerror = rej
        isText(file.name) ? r.readAsText(file) : r.readAsDataURL(file)
      })
      // Upload to Supabase Storage
      const path = `${proj.id}/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('vault-files').upload(path, new Blob([data]), { contentType: 'text/plain' })
      if (upErr) throw upErr
      // Save metadata
      await supabase.from('files').insert({
        project_id: proj.id, name: file.name, mime_type: file.type,
        size_bytes: file.size, username, storage_path: path
      })
      const { data: fls } = await supabase.from('files').select('*').eq('project_id', proj.id).order('created_at', { ascending:true })
      setFiles(fls || [])
    } catch (err) { alert('Upload failed: ' + err.message) }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  // Tries file_contents table first (MCP-saved files), then falls back to Storage (web uploads)
  async function getFileText(f) {
    const { data: fc } = await supabase
      .from('file_contents').select('content').eq('file_id', f.id).maybeSingle()
    if (fc?.content) return { text: fc.content, fromDB: true }
    const { data: blob, error } = await supabase.storage.from('vault-files').download(f.storage_path)
    if (error) throw new Error(error.message)
    return { text: await blob.text(), fromDB: false }
  }

  async function downloadFile(f) {
    try {
      const { text } = await getFileText(f)
      const blob = new Blob([text], { type: 'text/plain' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url; a.download = f.name; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Download failed: ' + e.message) }
  }

  async function previewFile(f) {
    try {
      const { text } = await getFileText(f)
      setViewText(text); setViewFile(f)
    } catch (e) { alert('Preview failed: ' + e.message) }
  }

  async function deleteFile(f) {
    await supabase.from('file_contents').delete().eq('file_id', f.id)
    await supabase.storage.from('vault-files').remove([f.storage_path]).catch(() => {})
    await supabase.from('files').delete().eq('id', f.id)
    setFiles(prev => prev.filter(x => x.id !== f.id))
  }

  async function clearChat() {
    if (!confirm('Clear all messages for this project?')) return
    await supabase.from('messages').delete().eq('project_id', proj.id)
    setMessages([])
  }

  async function exportChat() {
    const lines = messages.map(m => {
      let o = `[${new Date(m.created_at).toISOString()}] **${m.username}**:\n${m.content}`
      if (m.thinking) o += `\n\n> 💭 Reasoning:\n> ${m.thinking.replace(/\n/g, '\n> ')}`
      return o
    }).join('\n\n---\n\n')
    const blob = new Blob([`# ${proj.name} — Chat Export\n\n${lines}`], { type:'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = proj.name.replace(/\s+/g,'_')+'_chat.md'; a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteProject(p) {
    if (!confirm(`Delete project "${p.name}"? This cannot be undone.`)) return
    await supabase.from('projects').delete().eq('id', p.id)
    if (proj?.id === p.id) { setProj(null); setMessages([]); setFiles([]); setContext('') }
  }

  function handleLogin(name) { setUsername(name) }

  // ── LOGIN ──────────────────────────────────────────────────
  if (!username) return <LoginScreen onLogin={handleLogin} />

  // ── MAIN UI ───────────────────────────────────────────────
  return (
    <div style={{display:'flex',height:'100vh',background:C.bg,overflow:'hidden',fontSize:14}}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <div style={{width:252,background:C.sb,borderRight:`1px solid ${C.b1}`,display:'flex',flexDirection:'column',flexShrink:0}}>

        {/* Brand */}
        <div style={{padding:'15px 14px 12px',borderBottom:`1px solid ${C.b1}`}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              <div style={{width:30,height:30,background:C.grad,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🧠</div>
              <span style={{color:C.text,fontWeight:700,fontSize:15,letterSpacing:-0.3}}>VaultAI</span>
            </div>
            <button onClick={() => setShowGuide(true)}
              style={{background:'none',border:`1px solid ${C.b2}`,borderRadius:7,padding:'3px 8px',color:C.muted,fontSize:11.5,cursor:'pointer'}}>? Guide</button>
          </div>

          {/* Live presence */}
          <div style={{fontSize:11,color:C.dim,marginBottom:4}}>Online now</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'4px 10px'}}>
            {activeUsers.length === 0
              ? <span style={{color:'#1E293B',fontSize:11}}>No one active</span>
              : activeUsers.map(u => (
                <div key={u} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:6,height:6,borderRadius:'50%',
                    background: u===username ? '#22C55E' : '#F59E0B',
                    boxShadow:  u===username ? '0 0 5px #22C55E' : '0 0 5px #F59E0B'}}/>
                  <span style={{color: u===username ? '#22C55E':'#F59E0B', fontSize:11}}>
                    {u}{u===username?' (you)':''}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* New project button */}
        <div style={{padding:'10px 10px 4px'}}>
          <button onClick={() => setShowNew(true)}
            style={{width:'100%',padding:'8px 10px',background:'#7C3AED18',border:'1px solid #7C3AED35',borderRadius:9,
              color:'#A78BFA',fontSize:13,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16}}>＋</span> New Project
          </button>
        </div>

        {/* Project list */}
        <div style={{flex:1,overflowY:'auto',padding:'4px 6px'}}>
          {projects.length === 0
            ? <p style={{color:'#2D3A4A',fontSize:13,padding:'18px 8px',textAlign:'center',lineHeight:1.7}}>No projects yet.<br/>Create your first!</p>
            : projects.map(p => (
              <button key={p.id} onClick={() => { setProj(p); setTab('chat'); setNewMsgBanner(false) }}
                style={{width:'100%',textAlign:'left',padding:'9px 10px',borderRadius:9,border:'none',
                  background: proj?.id===p.id ? '#7C3AED22' : 'transparent',cursor:'pointer',marginBottom:2,transition:'background .15s'}}
                onMouseEnter={e=>{ if(proj?.id!==p.id) e.currentTarget.style.background='#FFFFFF06' }}
                onMouseLeave={e=>{ if(proj?.id!==p.id) e.currentTarget.style.background='transparent' }}>
                <div style={{color: proj?.id===p.id ? '#C4B5FD':'#94A3B8',fontSize:12.5,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  📂 {p.name}
                </div>
                <div style={{color:C.dim,fontSize:11,marginTop:2}}>{p.created_by} · {fmtDate(p.created_at)}</div>
              </button>
            ))
          }
        </div>

        {/* Footer */}
        <div style={{padding:'8px',borderTop:`1px solid ${C.b1}`,display:'flex',gap:5}}>
          <button onClick={() => { setUsername(''); setApiKey(''); setProj(null) }}
            style={{flex:1,padding:'7px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:7,color:C.muted,fontSize:12,cursor:'pointer'}}>⇄ Switch</button>
          <button onClick={() => { setUsername(''); setProj(null); setMessages([]); setFiles([]); setContext('') }}
            style={{flex:1,padding:'7px',background:'#160A0A',border:'1px solid #2D1515',borderRadius:7,color:'#F87171',fontSize:12,cursor:'pointer'}}>✕ Logout</button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Error banner */}
        {error && (
          <div style={{background:'#2D0A0A',borderBottom:'1px solid #5A1010',padding:'8px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
            <span style={{color:'#F87171',fontSize:13}}>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{background:'none',border:'none',color:'#F87171',cursor:'pointer',fontSize:16}}>✕</button>
          </div>
        )}

        {!proj ? (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14}}>
            <div style={{fontSize:50}}>📂</div>
            <p style={{color:C.dim,fontSize:16,margin:0}}>Select or create a project</p>
            <div style={{display:'flex',gap:10}}>
              <button onClick={() => setShowNew(true)} style={{padding:'10px 22px',background:C.grad,border:'none',borderRadius:9,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>+ New Project</button>
              <button onClick={() => setShowGuide(true)} style={{padding:'10px 16px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:9,color:C.muted,fontSize:14,cursor:'pointer'}}>📖 Guide</button>
            </div>
          </div>
        ) : loading ? (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:14}}>Loading project…</div>
        ) : (
          <>
            {/* Header */}
            <div style={{padding:'11px 18px',borderBottom:`1px solid ${C.b1}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <h2 style={{color:C.text,fontSize:15,fontWeight:700,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.name}</h2>
                {proj.description && <p style={{color:'#475569',fontSize:11.5,margin:'1px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.description}</p>}
              </div>
              <div style={{display:'flex',gap:5,flexShrink:0}}>
                {[
                  { k:'state',   l:'🎯 Project State' },
                  { k:'files',   l:`📁 Files (${files.length})` },
                  { k:'context', l:'📋 Context' },
                  { k:'chat',    l:`💬 Chat${newMsgBanner&&tab!=='chat'?' 🔴':''}` },
                ].map(({k,l}) => (
                  <button key={k} onClick={() => { setTab(k); if(k==='chat') setNewMsgBanner(false) }}
                    style={btn(tab===k)}>
                    {l}
                  </button>
                ))}
                {tab==='chat' && messages.length > 0 && <>
                  <button onClick={() => setShowThink(x=>!x)} title="Toggle thinking"
                    style={{...btn(false), background: showThink?'#120A22':C.panel, color: showThink?'#A78BFA':C.muted, border:`1px solid ${showThink?'#3D1F7A':C.b2}`}}>💭</button>
                  <button onClick={exportChat} style={btn(false)}>↓</button>
                  <button onClick={clearChat} style={btn(false,true)}>🗑</button>
                </>}
                <button onClick={() => deleteProject(proj)} style={btn(false,true)}>✕</button>
              </div>
            </div>

            {/* New messages banner */}
            {newMsgBanner && tab==='chat' && (
              <div style={{background:'#7C3AED22',borderBottom:'1px solid #7C3AED44',padding:'7px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                <span style={{color:'#A78BFA',fontSize:13}}>🔔 New messages from teammate</span>
                <button onClick={() => { setNewMsgBanner(false); isAtBottom.current=true; bottomRef.current?.scrollIntoView({behavior:'smooth'}) }}
                  style={{padding:'4px 12px',background:C.acc,border:'none',borderRadius:6,color:'#fff',fontSize:12,cursor:'pointer'}}>Jump ↓</button>
              </div>
            )}


            {/* ── PROJECT STATE TAB ─────────────────────────────── */}
            {tab==='state' && (
              <div style={{flex:1,overflowY:'auto',padding:22,display:'flex',flexDirection:'column',gap:16}}>

                {/* Stats bar from real DB */}
                {dbProgress.length > 0 && (() => {
                  const done=dbProgress.filter(r=>r.status==='✅ Done').length
                  const wip=dbProgress.filter(r=>r.status==='🔄 In Progress').length
                  const todo=dbProgress.filter(r=>r.status==='⬜ Todo').length
                  const blk=dbProgress.filter(r=>r.status==='❌ Blocked').length
                  const pct=Math.round((done/dbProgress.length)*100)
                  return (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {[{l:'Done',c:done,bg:'#052E16',col:'#4ADE80',b:'#166534'},{l:'In Progress',c:wip,bg:'#172554',col:'#60A5FA',b:'#1E3A5F'},{l:'Todo',c:todo,bg:'#1C1917',col:'#A8A29E',b:'#292524'},{l:'Blocked',c:blk,bg:'#2D0A0A',col:'#F87171',b:'#5A1010'}].filter(s=>s.c>0).map(s=>(
                          <div key={s.l} style={{padding:'8px 16px',background:s.bg,border:`1px solid ${s.b}`,borderRadius:9,textAlign:'center',minWidth:72}}>
                            <div style={{color:s.col,fontSize:22,fontWeight:700}}>{s.c}</div>
                            <div style={{color:s.col,fontSize:11,opacity:.8}}>{s.l}</div>
                          </div>
                        ))}
                        <div style={{flex:1,display:'flex',alignItems:'center',gap:10,paddingLeft:4}}>
                          <div style={{flex:1,height:7,background:'#1A1D2E',borderRadius:4,overflow:'hidden'}}>
                            <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#22C55E,#4ADE80)',borderRadius:4,transition:'width .5s'}}/>
                          </div>
                          <span style={{color:'#4ADE80',fontSize:13,fontWeight:600,flexShrink:0}}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Module progress table from DB */}
                {dbProgress.length > 0 && (
                  <div style={{background:C.panel,border:`1px solid ${C.b2}`,borderRadius:10,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',background:'#0A0C14',borderBottom:`1px solid ${C.b2}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{color:'#A78BFA',fontSize:13,fontWeight:600}}>Module Progress</span>
                      <span style={{color:C.dim,fontSize:11}}>{dbProgress.filter(r=>r.status==='🔄 In Progress').map(r=>r.module).join(', ')||'nothing active'}</span>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                        <thead>
                          <tr style={{background:'#0D0F17'}}>
                            {['Module','File','Status','Notes','Updated'].map(h=>(
                              <th key={h} style={{padding:'7px 12px',textAlign:'left',color:C.muted,fontWeight:500,borderBottom:`1px solid ${C.b2}`,whiteSpace:'nowrap'}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dbProgress.map((r,i)=>{
                            const testRow = testResults.find(t=>t.module===r.module)
                            const statusColor = r.status.includes('✅')?'#4ADE80':r.status.includes('🔄')?'#60A5FA':r.status.includes('❌')?'#F87171':'#64748B'
                            return (
                              <tr key={r.id} style={{borderBottom:`1px solid ${C.b1}`,background:i%2===0?'transparent':'#0A0C12'}}>
                                <td style={{padding:'6px 12px',color:'#C4B5FD',fontFamily:"'JetBrains Mono',monospace",fontSize:11.5}}>{r.module}</td>
                                <td style={{padding:'6px 12px',color:'#375569',fontFamily:"'JetBrains Mono',monospace",fontSize:10.5,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.file_path||'-'}</td>
                                <td style={{padding:'6px 12px',color:statusColor,whiteSpace:'nowrap',fontSize:11.5}}>{r.status}</td>
                                <td style={{padding:'6px 12px',color:C.muted,fontSize:11.5}}>
                                  {r.notes||''}
                                  {testRow && <span style={{marginLeft:6,color:testRow.failed===0?'#4ADE80':'#F87171',fontSize:10}}>({testRow.passed}/{testRow.total} tests)</span>}
                                </td>
                                <td style={{padding:'6px 12px',color:C.dim,fontSize:10.5,whiteSpace:'nowrap'}}>{r.updated_by} {fmtDate(r.updated_at)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI Reviews section */}
                {aiReviews.length > 0 && (
                  <div style={{background:C.panel,border:`1px solid ${C.b2}`,borderRadius:10,overflow:'hidden'}}>
                    <div style={{padding:'8px 14px',background:'#0A0C14',borderBottom:`1px solid ${C.b2}`}}>
                      <span style={{color:'#A78BFA',fontSize:13,fontWeight:600}}>AI Code Reviews</span>
                      <span style={{color:C.dim,fontSize:11,marginLeft:10}}>{aiReviews.filter(r=>!r.approved).length} pending · {aiReviews.filter(r=>r.approved).length} approved</span>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:0}}>
                      {aiReviews.slice(0,5).map((r,i)=>(
                        <div key={r.id} style={{padding:'10px 14px',borderBottom:i<4?`1px solid ${C.b1}`:'none',display:'flex',gap:10,alignItems:'flex-start'}}>
                          <div style={{flexShrink:0,width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,background:r.approved?'#052E16':'#2D0A0A',border:`1px solid ${r.approved?'#166534':'#5A1010'}`}}>{r.approved?'✅':'⚠️'}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',gap:8,marginBottom:3,flexWrap:'wrap'}}>
                              <span style={{color:'#E2E8F0',fontSize:12.5,fontWeight:500}}>{r.file_name||'unknown file'}</span>
                              <span style={{color:'#A78BFA',fontSize:11}}>by {r.reviewer}</span>
                              <span style={{fontSize:11,padding:'1px 7px',borderRadius:10,background:r.severity==='critical'?'#5A1010':r.severity==='high'?'#3A1F0A':'#1A1D2E',color:r.severity==='critical'?'#F87171':r.severity==='high'?'#FB923C':'#64748B'}}>{r.severity}</span>
                            </div>
                            <div style={{color:C.muted,fontSize:12,lineHeight:1.5}}>{r.review.slice(0,180)}{r.review.length>180?'...':''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context document (non-progress sections) */}
                {context && (
                  <div style={{background:C.panel,border:`1px solid ${C.b2}`,borderRadius:10,padding:'14px 16px'}}>
                    <div style={{color:'#A78BFA',fontSize:12.5,fontWeight:600,marginBottom:8}}>📋 Project Knowledge Base</div>
                    <pre style={{color:'#94A3B8',fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:'Inter,system-ui,sans-serif',margin:0}}>
                      {context.replace(/PROGRESS_START[\s\S]*?PROGRESS_END/g,'').trim()}
                    </pre>
                  </div>
                )}

                {!context && dbProgress.length===0 && (
                  <div style={{textAlign:'center',color:'#2D3A4A',marginTop:40}}>
                    <div style={{fontSize:40,marginBottom:10}}>🎯</div>
                    <p style={{fontSize:14,margin:'0 0 6px'}}>No project state yet</p>
                    <p style={{fontSize:12,color:'#1E2A36'}}>Paste SOILMIR_INITIAL_STATE.md into 📋 Context tab to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAT TAB ──────────────────────────────────────── */}
            {tab==='chat' && (
              <>
                <div style={{flex:1,overflowY:'auto',padding:'18px 22px',display:'flex',flexDirection:'column',gap:14}}>
                  {messages.length===0 && (
                    <div style={{textAlign:'center',color:'#2D3A4A',marginTop:60}}>
                      <div style={{fontSize:40,marginBottom:10}}>💬</div>
                      <p style={{fontSize:15,margin:'0 0 4px',color:'#475569'}}>No messages yet in <strong>{proj.name}</strong></p>
                      <div style={{marginTop:16,padding:'14px 20px',background:'#0A1020',border:'1px solid #1A2A40',borderRadius:12,display:'inline-block',textAlign:'left'}}>
                        <p style={{fontSize:12,color:'#374151',margin:'0 0 6px',fontWeight:600}}>How Claude responds here:</p>
                        <p style={{fontSize:12,color:'#2D3A4A',margin:'0 0 4px'}}>1. You type a message → it saves to Supabase</p>
                        <p style={{fontSize:12,color:'#2D3A4A',margin:'0 0 4px'}}>2. Claude Desktop (with VaultAI MCP) sees it</p>
                        <p style={{fontSize:12,color:'#2D3A4A',margin:'0 0 4px'}}>3. Claude replies → auto-saves back here</p>
                        <p style={{fontSize:12,color:'#2D3A4A',margin:0}}>4. All teammates see everything in real-time ✅</p>
                      </div>
                    </div>
                  )}
                  {messages.map(m => (
                    <div key={m.id} style={{display:'flex',gap:10,justifyContent: m.role==='user'?'flex-end':'flex-start',alignItems:'flex-start'}}>
                      {m.role==='assistant' && (
                        <div style={{width:28,height:28,borderRadius:'50%',background:C.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0,marginTop:2}}>🤖</div>
                      )}
                      <div style={{maxWidth:'76%'}}>
                        <div style={{fontSize:11,color:C.dim,marginBottom:3,textAlign: m.role==='user'?'right':'left'}}>
                          {m.username} · {fmtTime(m.created_at)}
                        </div>
                        {m.thinking && showThink && <ThinkBlock text={m.thinking} />}
                        <div style={{padding:'10px 13px',fontSize:13.5,lineHeight:1.65,
                          borderRadius: m.role==='user'?'14px 4px 14px 14px':'4px 14px 14px 14px',
                          background:   m.role==='user'?C.grad:C.panel,
                          color:        m.role==='user'?'#fff':'#CBD5E1',
                          border:       m.role==='assistant'?`1px solid ${C.b2}`:'none'}}>
                          <MsgContent text={m.content} />
                        </div>
                      </div>
                      {m.role==='user' && (
                        <div style={{width:28,height:28,borderRadius:'50%',background:'#1E2130',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,color:'#94A3B8',fontWeight:700,marginTop:2}}>
                          {m.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {typing && (
                    <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:C.grad,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>🤖</div>
                      <div style={{padding:'11px 15px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:'4px 14px 14px 14px',display:'flex',gap:5}}>
                        {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:C.acc,animation:`dot 1.4s ease-in-out ${i*.22}s infinite`}}/>)}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef}/>
                </div>

                {/* Input */}
                <div style={{padding:'10px 18px',borderTop:`1px solid ${C.b1}`,display:'flex',gap:8,flexShrink:0}}>
                  <textarea ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={`Message Claude about ${proj.name}… (Enter to send · Shift+Enter for newline)`}
                    rows={1}
                    style={{flex:1,padding:'10px 13px',background:'#0F1118',border:`1px solid ${C.b2}`,borderRadius:10,
                      color:C.text,fontSize:13.5,outline:'none',resize:'none',fontFamily:'Inter,system-ui,sans-serif',
                      lineHeight:1.5,maxHeight:120,overflowY:'auto'}}
                    onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px' }}
                  />
                  <button onClick={sendMessage} disabled={!input.trim()||typing}
                    style={{padding:'10px 18px',background: input.trim()&&!typing?C.grad:'#1A1D2E',border:'none',
                      borderRadius:10,color:'#fff',fontSize:14,fontWeight:600,cursor: input.trim()&&!typing?'pointer':'not-allowed',
                      flexShrink:0,alignSelf:'flex-end'}}>
                    Send ↑
                  </button>
                </div>
              </>
            )}

            {/* ── FILES TAB ─────────────────────────────────────── */}
            {tab==='files' && (
              <div style={{flex:1,overflowY:'auto',padding:22}}>
                <div onClick={() => !uploading && fileRef.current?.click()}
                  style={{border:'2px dashed #1E2130',borderRadius:14,padding:'24px',textAlign:'center',
                    cursor: uploading?'wait':'pointer',marginBottom:18,transition:'all .2s'}}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.acc; e.currentTarget.style.background='#7C3AED08' }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='#1E2130'; e.currentTarget.style.background='transparent' }}>
                  <div style={{fontSize:30,marginBottom:7}}>{uploading?'⏳':'📤'}</div>
                  <p style={{color:C.muted,margin:0,fontSize:13.5,fontWeight:500}}>{uploading?'Uploading…':'Click to upload a file'}</p>
                  <p style={{color:C.dim,margin:'4px 0 0',fontSize:12}}>.py .pdf .ipynb .md .csv .json .txt .r .sql and more · Max 5 MB</p>
                  <input ref={fileRef} type="file" style={{display:'none'}} onChange={uploadFile}
                    accept=".py,.pdf,.ipynb,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.r,.sql,.yaml,.yml,.sh,.log"/>
                </div>
                {files.length===0
                  ? <p style={{textAlign:'center',color:'#2D3A4A',fontSize:14,marginTop:40}}>No files yet.<br/>Claude saves files here automatically via MCP.</p>
                  : <FileTree files={files} onPreview={previewFile} onDownload={downloadFile} onDelete={deleteFile} />
                }
              </div>
            )}

            {/* ── CONTEXT TAB ───────────────────────────────────── */}
            {tab==='context' && (
              <div style={{flex:1,overflowY:'auto',padding:22}}>
                <div style={{marginBottom:14,display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{flex:1}}>
                    <h3 style={{color:C.text,fontSize:15,fontWeight:700,margin:'0 0 4px'}}>📋 Project Context</h3>
                    <p style={{color:'#475569',fontSize:12.5,margin:0,lineHeight:1.65}}>
                      Claude reads this as a knowledge base on every message. Add tech stack, findings, decisions, code notes.
                      Any user can update it — changes are live for everyone instantly.
                    </p>
                  </div>
                  {!editCtx && (
                    <button onClick={() => { setCtxDraft(context); setEditCtx(true) }}
                      style={{padding:'7px 14px',background:'#7C3AED22',border:'1px solid #7C3AED44',borderRadius:8,color:'#A78BFA',fontSize:13,fontWeight:500,cursor:'pointer',flexShrink:0,marginLeft:14}}>
                      ✏️ Edit
                    </button>
                  )}
                </div>
                {editCtx ? (
                  <>
                    <textarea value={ctxDraft} onChange={e => setCtxDraft(e.target.value)}
                      placeholder={"Everything Claude should always know:\n\n- Tech stack & versions\n- Current architecture / approach\n- Key findings so far\n- Important decisions made\n- Code file summaries\n- Open questions & hypotheses\n- Collaborator names & roles"}
                      style={{width:'100%',minHeight:360,padding:'13px 15px',background:'#0F1118',border:`1px solid ${C.b2}`,
                        borderRadius:10,color:'#E2E8F0',fontSize:13.5,outline:'none',resize:'vertical',
                        fontFamily:'Inter,system-ui,sans-serif',lineHeight:1.75,boxSizing:'border-box'}}
                    />
                    <div style={{display:'flex',gap:10,marginTop:10}}>
                      <button onClick={() => setEditCtx(false)} style={{flex:1,padding:'10px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:9,color:C.muted,cursor:'pointer',fontSize:14}}>Cancel</button>
                      <button onClick={saveContext} style={{flex:2,padding:'10px',background:C.grad,border:'none',borderRadius:9,color:'#fff',fontWeight:600,cursor:'pointer',fontSize:14}}>💾 Save Context</button>
                    </div>
                  </>
                ) : (
                  <div style={{padding:'15px 17px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:10,minHeight:200}}>
                    {context
                      ? <pre style={{color:'#94A3B8',fontSize:13.5,lineHeight:1.75,whiteSpace:'pre-wrap',wordBreak:'break-word',fontFamily:'Inter,system-ui,sans-serif',margin:0}}>{context}</pre>
                      : <p style={{color:C.dim,fontSize:13.5,margin:0,textAlign:'center',marginTop:50,lineHeight:1.8}}>
                          No context yet.<br/><span style={{color:'#2D3A4A'}}>Click ✏️ Edit to add project knowledge.</span>
                        </p>
                    }
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── New Project Modal ─────────────────────────────────── */}
      {showNew && (
        <div style={{position:'fixed',inset:0,background:'#00000088',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}
          onClick={e => e.target===e.currentTarget && setShowNew(false)}>
          <div style={{background:'#0D0F17',border:`1px solid ${C.b2}`,borderRadius:18,padding:26,width:420,boxShadow:'0 30px 60px #00000070'}}>
            <h3 style={{color:C.text,fontSize:17,fontWeight:700,margin:'0 0 3px'}}>Create New Project</h3>
            <p style={{color:C.muted,fontSize:13,margin:'0 0 16px'}}>Visible to all users · live in real-time</p>
            <input value={npName} onChange={e => setNpName(e.target.value)} onKeyDown={e => e.key==='Enter'&&createProject()} autoFocus
              placeholder="Project name (e.g. MIR Spectroscopy)"
              style={{width:'100%',padding:'11px 13px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',marginBottom:10,boxSizing:'border-box'}}/>
            <textarea value={npDesc} onChange={e => setNpDesc(e.target.value)}
              placeholder="Short description / intro for Claude (optional)…"
              rows={2}
              style={{width:'100%',padding:'11px 13px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:9,color:C.text,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box',fontFamily:'Inter,system-ui,sans-serif'}}/>
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button onClick={() => setShowNew(false)} style={{flex:1,padding:'11px',background:C.panel,border:`1px solid ${C.b2}`,borderRadius:9,color:C.muted,cursor:'pointer',fontSize:14}}>Cancel</button>
              <button onClick={createProject} disabled={!npName.trim()}
                style={{flex:2,padding:'11px',background:npName.trim()?C.grad:'#1A1D2E',border:'none',borderRadius:9,color:'#fff',fontWeight:600,cursor:npName.trim()?'pointer':'not-allowed',fontSize:14}}>
                Create ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ───────────────────────────────── */}
      {viewFile && (
        <div style={{position:'fixed',inset:0,background:'#000000AA',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}}
          onClick={e => e.target===e.currentTarget && setViewFile(null)}>
          <div style={{background:'#0D0F17',border:`1px solid ${C.b2}`,borderRadius:14,width:'80%',maxWidth:840,height:'80vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:`1px solid ${C.b2}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:C.text,fontWeight:600,fontSize:14}}>{fIcon(viewFile.name)} {viewFile.name}</span>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => downloadFile(viewFile)} style={{padding:'5px 13px',background:'#0A1929',border:'1px solid #1E3A5F',borderRadius:7,color:'#38BDF8',fontSize:13,cursor:'pointer'}}>↓ Download</button>
                <button onClick={() => setViewFile(null)} style={{padding:'5px 11px',background:'#160A0A',border:'1px solid #3A1010',borderRadius:7,color:'#F87171',fontSize:13,cursor:'pointer'}}>✕</button>
              </div>
            </div>
            <pre style={{flex:1,overflowY:'auto',margin:0,padding:'15px 18px',color:'#CBD5E1',fontSize:13,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.75,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
              {viewText}
            </pre>
          </div>
        </div>
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}
