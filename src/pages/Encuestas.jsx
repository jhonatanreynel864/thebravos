import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Encuestas() {
  const { usuario } = useAuth()
  const [encuestas, setEncuestas] = useState([])
  const [misVotos, setMisVotos] = useState({})
  const [creando, setCreando] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [opciones, setOpciones] = useState(['', ''])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [comentariosAbiertos, setComentariosAbiertos] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [textoComentario, setTextoComentario] = useState({})
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!usuario?.id) return
    cargarEncuestas()
    cargarMisVotos()
    cargarPerfil()
  }, [usuario])

  async function cargarPerfil() {
    const { data } = await supabase.from('profiles').select('nombre, foto_perfil_url').eq('id', usuario.id).single()
    if (data) setPerfil(data)
  }

  async function cargarEncuestas() {
    const { data } = await supabase.from('encuestas').select('*, profiles(nombre, foto_perfil_url)').order('created_at', { ascending: false })
    if (!data) return
    const encuestasConVotos = await Promise.all(data.map(async enc => {
      const { data: votos } = await supabase.from('votos_encuesta').select('opcion_index').eq('encuesta_id', enc.id)
      const conteos = enc.opciones.map((_, i) => (votos || []).filter(v => v.opcion_index === i).length)
      return { ...enc, conteos, totalVotos: (votos || []).length }
    }))
    setEncuestas(encuestasConVotos)
  }

  async function cargarMisVotos() {
    const { data } = await supabase.from('votos_encuesta').select('encuesta_id, opcion_index').eq('user_id', usuario.id)
    if (data) {
      const mapa = {}
      data.forEach(v => { mapa[v.encuesta_id] = v.opcion_index })
      setMisVotos(mapa)
    }
  }

  async function cargarComentarios(encId) {
    const { data } = await supabase.from('comentarios').select('*, profiles(nombre, foto_perfil_url)').eq('publicacion_id', encId).order('created_at', { ascending: true })
    if (data) setComentarios(prev => ({ ...prev, [encId]: data }))
  }

  async function crearEncuesta(e) {
    e.preventDefault()
    const opcionesValidas = opciones.filter(o => o.trim())
    if (opcionesValidas.length < 2) return
    setCreando(true)
    await supabase.from('encuestas').insert({ user_id: usuario.id, pregunta: pregunta.trim(), opciones: opcionesValidas })
    setPregunta(''); setOpciones(['', '']); setCreando(false); setMostrarForm(false)
    cargarEncuestas()
  }

  async function eliminarEncuesta(id) {
    await supabase.from('encuestas').delete().eq('id', id)
    cargarEncuestas()
  }

  async function votar(encuestaId, opcionIndex) {
    const miVoto = misVotos[encuestaId]
    if (miVoto === opcionIndex) {
      await supabase.from('votos_encuesta').delete().eq('encuesta_id', encuestaId).eq('user_id', usuario.id)
      setMisVotos(prev => { const n = { ...prev }; delete n[encuestaId]; return n })
    } else {
      if (miVoto !== undefined) await supabase.from('votos_encuesta').delete().eq('encuesta_id', encuestaId).eq('user_id', usuario.id)
      await supabase.from('votos_encuesta').insert({ encuesta_id: encuestaId, user_id: usuario.id, opcion_index: opcionIndex })
      setMisVotos(prev => ({ ...prev, [encuestaId]: opcionIndex }))
    }
    cargarEncuestas()
  }

  async function comentar(encId) {
    const texto = textoComentario[encId]?.trim()
    if (!texto) return
    await supabase.from('comentarios').insert({ publicacion_id: encId, user_id: usuario.id, contenido: texto })
    setTextoComentario(prev => ({ ...prev, [encId]: '' }))
    cargarComentarios(encId)
  }

  function toggleComentarios(encId) {
    const abierto = comentariosAbiertos[encId]
    setComentariosAbiertos(prev => ({ ...prev, [encId]: !abierto }))
    if (!abierto) cargarComentarios(encId)
  }

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .enc-card { background:var(--surface-1); border:1px solid var(--border-subtle); border-radius:var(--r-xl); margin-bottom:16px; overflow:hidden; transition:border-color 200ms ease; animation:fadeUp 300ms var(--ease-out) both; }
        .enc-card:hover { border-color:var(--border-default); }
        .crear-btn { width:100%; padding:11px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-lg); font-family:DM Sans; font-weight:600; font-size:14px; cursor:pointer; margin-bottom:16px; transition:all 150ms ease; box-shadow:0 2px 12px var(--accent-glow); }
        .crear-btn:hover { background:var(--accent-bright); transform:translateY(-1px); box-shadow:0 4px 20px var(--accent-glow); }
        .crear-btn.cancelar { background:var(--surface-2); color:var(--ink-tertiary); box-shadow:none; border:1px solid var(--border-subtle); }
        .crear-btn.cancelar:hover { background:var(--surface-3); color:var(--ink-secondary); transform:none; box-shadow:none; }
        .opcion-row { border:1px solid var(--border-subtle); border-radius:var(--r-md); padding:10px 14px; margin-bottom:8px; cursor:pointer; position:relative; overflow:hidden; background:var(--surface-2); transition:border-color 150ms ease; }
        .opcion-row:hover { border-color:var(--border-default); }
        .opcion-row.mi-voto { border-color:var(--accent); background:var(--accent-muted); }
        .reac-btn { background:none; border:none; cursor:pointer; padding:6px 12px; border-radius:var(--r-sm); display:flex; align-items:center; gap:6px; font-family:DM Sans; font-size:13px; font-weight:500; color:var(--ink-tertiary); transition:background 150ms ease,color 150ms ease; }
        .reac-btn:hover { background:var(--surface-2); color:var(--ink-secondary); }
        .reac-btn.active { color:var(--accent-bright); }
        .delete-btn { background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:var(--r-sm); color:var(--ink-muted); font-size:16px; line-height:1; transition:color 150ms ease,background 150ms ease; }
        .delete-btn:hover { color:var(--danger); background:rgba(239,68,68,0.08); }
        .enc-input { width:100%; padding:10px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-md); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:14px; outline:none; margin-bottom:8px; transition:border-color 150ms ease,box-shadow 150ms ease; }
        .enc-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
        .comment-input { flex:1; padding:9px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-full); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:13px; outline:none; transition:border-color 150ms ease,box-shadow 150ms ease; }
        .comment-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
        .send-btn { padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:13px; cursor:pointer; transition:background 150ms ease,transform 100ms ease; }
        .send-btn:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .submit-enc { width:100%; padding:10px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:14px; cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 8px var(--accent-glow); }
        .submit-enc:hover { background:var(--accent-bright); transform:translateY(-1px); box-shadow:0 4px 16px var(--accent-glow); }
        .submit-enc:disabled { background:var(--surface-3); color:var(--ink-tertiary); cursor:not-allowed; box-shadow:none; transform:none; }
      `}</style>

      <button onClick={() => setMostrarForm(!mostrarForm)} className={`crear-btn${mostrarForm ? ' cancelar' : ''}`}>
        {mostrarForm ? 'Cancelar' : '+ Crear nueva encuesta'}
      </button>

      {mostrarForm && (
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'20px', marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--ink-primary)', marginBottom:16 }}>Nueva encuesta</p>
          <form onSubmit={crearEncuesta}>
            <input value={pregunta} onChange={e => setPregunta(e.target.value)} placeholder="¿Cual es tu pregunta?" required className="enc-input" style={{ fontSize:15, marginBottom:12 }} />
            <p style={{ fontSize:11, fontWeight:600, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:8 }}>OPCIONES</p>
            {opciones.map((op, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input value={op} onChange={e => { const n=[...opciones]; n[i]=e.target.value; setOpciones(n) }} placeholder={`Opcion ${i+1}`} className="enc-input" style={{ flex:1, margin:0 }} />
                {opciones.length > 2 && <button type="button" onClick={() => setOpciones(opciones.filter((_,j) => j!==i))} className="delete-btn" style={{ fontSize:14 }}>✕</button>}
              </div>
            ))}
            {opciones.length < 5 && (
              <button type="button" onClick={() => setOpciones([...opciones,''])} style={{ width:'100%', padding:'8px 0', background:'none', border:'1px dashed var(--border-default)', borderRadius:'var(--r-md)', color:'var(--ink-tertiary)', fontFamily:'DM Sans', fontSize:13, cursor:'pointer', marginBottom:12 }}>+ Agregar opcion</button>
            )}
            <button type="submit" disabled={creando || !pregunta.trim()} className="submit-enc">
              {creando ? 'Publicando...' : 'Publicar encuesta'}
            </button>
          </form>
        </div>
      )}

      {encuestas.map((enc, idx) => {
        const miVoto = misVotos[enc.id]
        const yaVote = miVoto !== undefined
        const ini = enc.profiles?.nombre ? enc.profiles.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'
        const coms = comentarios[enc.id] || []
        const abierto = comentariosAbiertos[enc.id]
        const maxVotos = yaVote ? Math.max(...enc.conteos) : 0

        return (
          <div key={enc.id} className="enc-card" style={{ animationDelay:`${idx*40}ms` }}>
            <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <Avatar texto={ini} foto={enc.profiles?.foto_perfil_url} />
                <div>
                  <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{enc.profiles?.nombre||'Estudiante'}</p>
                  <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{enc.totalVotos} votos{yaVote && ' · toca para cambiar'}</p>
                </div>
              </div>
              {enc.user_id === usuario?.id && <button className="delete-btn" onClick={() => eliminarEncuesta(enc.id)}>✕</button>}
            </div>

            <div style={{ padding:'0 20px 16px' }}>
              <p style={{ fontSize:16, fontWeight:600, color:'var(--ink-primary)', marginBottom:14, lineHeight:1.4 }}>{enc.pregunta}</p>
              {enc.opciones.map((op, i) => {
                const pct = enc.totalVotos > 0 ? Math.round((enc.conteos[i]/enc.totalVotos)*100) : 0
                const esMiVoto = miVoto === i
                const esGanador = yaVote && enc.conteos[i] === maxVotos && maxVotos > 0
                return (
                  <div key={i} onClick={() => votar(enc.id, i)} className={`opcion-row${esMiVoto?' mi-voto':''}`}>
                    {yaVote && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:esMiVoto?'rgba(37,99,235,0.2)':'rgba(255,255,255,0.03)', transition:'width 600ms var(--ease-out)', zIndex:0, borderRadius:'var(--r-md)' }}/>}
                    <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:14, color:esMiVoto?'var(--accent-bright)':'var(--ink-secondary)', fontWeight:esMiVoto?600:400, display:'flex', alignItems:'center', gap:8 }}>
                        {op}
                        {esMiVoto && <span style={{ fontSize:11, color:'var(--accent)', background:'var(--accent-muted)', padding:'1px 6px', borderRadius:'var(--r-full)', fontWeight:600 }}>Tu voto</span>}
                        {esGanador && <span style={{ fontSize:11, color:'var(--success)', background:'rgba(16,185,129,0.1)', padding:'1px 6px', borderRadius:'var(--r-full)', fontWeight:600 }}>Ganando</span>}
                      </span>
                      {yaVote && <span style={{ fontSize:13, fontWeight:700, color:esMiVoto?'var(--accent-bright)':'var(--ink-tertiary)', fontFamily:'DM Mono' }}>{pct}%</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding:'6px 12px', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:4 }}>
              <button className={`reac-btn${abierto?' active':''}`} onClick={() => toggleComentarios(enc.id)}>
                <span style={{ fontSize:18 }}>💬</span> {coms.length > 0 ? coms.length : 'Comentar'}
              </button>
            </div>

            {abierto && (
              <div style={{ padding:'12px 20px 16px', borderTop:'1px solid var(--border-subtle)' }}>
                {coms.map(com => (
                  <div key={com.id} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                    <Avatar texto={com.profiles?.nombre?.[0]?.toUpperCase()||'?'} foto={com.profiles?.foto_perfil_url} size={32} />
                    <div style={{ background:'var(--surface-2)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-md)', padding:'8px 12px', flex:1 }}>
                      <p style={{ margin:'0 0 3px', fontWeight:600, fontSize:13, color:'var(--accent-bright)' }}>{com.profiles?.nombre||'Estudiante'}</p>
                      <p style={{ margin:0, fontSize:14, color:'var(--ink-secondary)', lineHeight:1.5 }}>{com.contenido}</p>
                    </div>
                  </div>
                ))}
                <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8 }}>
                  <Avatar texto={iniciales} foto={perfil?.foto_perfil_url} size={32} />
                  <input value={textoComentario[enc.id]||''} onChange={e => setTextoComentario(prev => ({ ...prev, [enc.id]:e.target.value }))} onKeyDown={e => e.key==='Enter' && comentar(enc.id)} placeholder="Escribe un comentario..." className="comment-input" />
                  <button onClick={() => comentar(enc.id)} className="send-btn">Enviar</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {encuestas.length === 0 && !mostrarForm && (
        <div style={{ textAlign:'center', padding:'64px 0', color:'var(--ink-tertiary)', fontSize:15 }}>
          No hay encuestas aun. Crea la primera.
        </div>
      )}
    </div>
  )
}

function Avatar({ texto, foto, size=40 }) {
  return foto ? (
    <img src={foto} alt="avatar" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block', border:'1.5px solid var(--border-default)' }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--accent-muted)', border:'1.5px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, flexShrink:0, fontSize:size>36?14:11, fontFamily:'DM Mono, monospace' }}>{texto}</div>
  )
}