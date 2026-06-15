import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Comparador() {
  const { usuario } = useAuth()
  const [comparaciones, setComparaciones] = useState([])
  const [fotoA, setFotoA] = useState(null)
  const [fotoB, setFotoB] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [misVotos, setMisVotos] = useState({})
  const [mostrarForm, setMostrarForm] = useState(false)
  const [comentariosAbiertos, setComentariosAbiertos] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [textoComentario, setTextoComentario] = useState({})
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!usuario?.id) return
    cargarComparaciones()
    cargarMisVotos()
    cargarPerfil()
  }, [usuario])

  async function cargarPerfil() {
    const { data } = await supabase.from('profiles').select('nombre, foto_perfil_url').eq('id', usuario.id).single()
    if (data) setPerfil(data)
  }

  async function cargarComparaciones() {
    const { data } = await supabase.from('comparaciones').select('*, profiles(nombre, foto_perfil_url)').order('created_at', { ascending: false })
    if (data) setComparaciones(data)
  }

  async function cargarMisVotos() {
    const { data } = await supabase.from('votos_comparacion').select('comparacion_id, voto').eq('user_id', usuario.id)
    if (data) {
      const mapa = {}
      data.forEach(v => { mapa[v.comparacion_id] = v.voto })
      setMisVotos(mapa)
    }
  }

  async function cargarComentarios(compId) {
    const { data } = await supabase.from('comentarios').select('*, profiles(nombre, foto_perfil_url)').eq('publicacion_id', compId).order('created_at', { ascending: true })
    if (data) setComentarios(prev => ({ ...prev, [compId]: data }))
  }

  async function subirComparacion(e) {
    e.preventDefault()
    if (!fotoA || !fotoB) return
    setSubiendo(true)
    const subir = async (archivo, prefijo) => {
      const ext = archivo.name.split('.').pop()
      const nombre = `${usuario.id}/${prefijo}_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fotos').upload(nombre, archivo)
      if (error) return null
      const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
      return data.publicUrl
    }
    const urlA = await subir(fotoA, 'A')
    const urlB = await subir(fotoB, 'B')
    if (urlA && urlB) {
      await supabase.from('comparaciones').insert({ user_id: usuario.id, foto_a_url: urlA, foto_b_url: urlB })
    }
    setFotoA(null); setFotoB(null); setSubiendo(false); setMostrarForm(false)
    cargarComparaciones()
  }

  async function eliminarComparacion(id) {
    await supabase.from('comparaciones').delete().eq('id', id)
    cargarComparaciones()
  }

  async function votar(comparacionId, voto) {
    const votoActual = misVotos[comparacionId]
    if (votoActual === voto) {
      await supabase.from('votos_comparacion').delete().eq('comparacion_id', comparacionId).eq('user_id', usuario.id)
      const comp = comparaciones.find(c => c.id === comparacionId)
      const campo = voto === 'A' ? 'votos_a' : 'votos_b'
      await supabase.from('comparaciones').update({ [campo]: Math.max((comp[campo]||1)-1, 0) }).eq('id', comparacionId)
      setMisVotos(prev => { const n={...prev}; delete n[comparacionId]; return n })
    } else {
      if (votoActual) {
        await supabase.from('votos_comparacion').delete().eq('comparacion_id', comparacionId).eq('user_id', usuario.id)
        const comp = comparaciones.find(c => c.id === comparacionId)
        const campoAnterior = votoActual === 'A' ? 'votos_a' : 'votos_b'
        await supabase.from('comparaciones').update({ [campoAnterior]: Math.max((comp[campoAnterior]||1)-1, 0) }).eq('id', comparacionId)
      }
      await supabase.from('votos_comparacion').insert({ comparacion_id: comparacionId, user_id: usuario.id, voto })
      const comp = comparaciones.find(c => c.id === comparacionId)
      const campo = voto === 'A' ? 'votos_a' : 'votos_b'
      await supabase.from('comparaciones').update({ [campo]: (comp[campo]||0)+1 }).eq('id', comparacionId)
      setMisVotos(prev => ({ ...prev, [comparacionId]: voto }))
    }
    cargarComparaciones()
  }

  async function comentar(compId) {
    const texto = textoComentario[compId]?.trim()
    if (!texto) return
    await supabase.from('comentarios').insert({ publicacion_id: compId, user_id: usuario.id, contenido: texto })
    setTextoComentario(prev => ({ ...prev, [compId]: '' }))
    cargarComentarios(compId)
  }

  function toggleComentarios(compId) {
    const abierto = comentariosAbiertos[compId]
    setComentariosAbiertos(prev => ({ ...prev, [compId]: !abierto }))
    if (!abierto) cargarComentarios(compId)
  }

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .comp-card { background:var(--surface-1); border:1px solid var(--border-subtle); border-radius:var(--r-xl); margin-bottom:16px; overflow:hidden; transition:border-color 200ms ease; animation:fadeUp 300ms var(--ease-out) both; }
        .comp-card:hover { border-color:var(--border-default); }
        .subir-btn { width:100%; padding:11px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-lg); font-family:DM Sans; font-weight:600; font-size:14px; cursor:pointer; margin-bottom:16px; transition:all 150ms ease; box-shadow:0 2px 12px var(--accent-glow); }
        .subir-btn:hover { background:var(--accent-bright); transform:translateY(-1px); box-shadow:0 4px 20px var(--accent-glow); }
        .subir-btn.cancelar { background:var(--surface-2); color:var(--ink-tertiary); box-shadow:none; border:1px solid var(--border-subtle); }
        .subir-btn.cancelar:hover { background:var(--surface-3); color:var(--ink-secondary); transform:none; box-shadow:none; }
        .foto-vote { cursor:pointer; border-radius:var(--r-lg); overflow:hidden; border:2px solid transparent; transition:border-color 200ms ease,box-shadow 200ms ease,transform 150ms ease; position:relative; }
        .foto-vote:hover { transform:translateY(-2px); }
        .foto-vote.voted { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-muted); }
        .delete-btn { background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:var(--r-sm); color:var(--ink-muted); font-size:16px; line-height:1; transition:color 150ms ease,background 150ms ease; }
        .delete-btn:hover { color:var(--danger); background:rgba(239,68,68,0.08); }
        .reac-btn { background:none; border:none; cursor:pointer; padding:6px 12px; border-radius:var(--r-sm); display:flex; align-items:center; gap:6px; font-family:DM Sans; font-size:13px; font-weight:500; color:var(--ink-tertiary); transition:background 150ms ease,color 150ms ease; }
        .reac-btn:hover { background:var(--surface-2); color:var(--ink-secondary); }
        .reac-btn.active { color:var(--accent-bright); }
        .comment-input { flex:1; padding:9px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-full); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:13px; outline:none; transition:border-color 150ms ease,box-shadow 150ms ease; }
        .comment-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
        .send-btn { padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:13px; cursor:pointer; transition:background 150ms ease,transform 100ms ease; }
        .send-btn:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .foto-slot { display:flex; flex-direction:column; align-items:center; justify-content:center; border:1.5px dashed var(--border-default); border-radius:var(--r-lg); cursor:pointer; min-height:140px; background:var(--surface-2); overflow:hidden; transition:border-color 200ms ease,background 200ms ease; }
        .foto-slot:hover { border-color:var(--accent); background:var(--accent-muted); }
        .publicar-comp { width:100%; padding:10px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:14px; cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 8px var(--accent-glow); }
        .publicar-comp:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .publicar-comp:disabled { background:var(--surface-3); color:var(--ink-tertiary); cursor:not-allowed; box-shadow:none; transform:none; }
      `}</style>

      <button onClick={() => setMostrarForm(!mostrarForm)} className={`subir-btn${mostrarForm?' cancelar':''}`}>
        {mostrarForm ? 'Cancelar' : '+ Subir comparacion de fotos'}
      </button>

      {mostrarForm && (
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'20px', marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--ink-primary)', marginBottom:16 }}>¿Cual foto es mejor?</p>
          <form onSubmit={subirComparacion}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <SelectorFoto label="Foto A" archivo={fotoA} onChange={setFotoA} />
              <SelectorFoto label="Foto B" archivo={fotoB} onChange={setFotoB} />
            </div>
            <button type="submit" disabled={!fotoA||!fotoB||subiendo} className="publicar-comp">
              {subiendo ? 'Subiendo...' : 'Publicar comparacion'}
            </button>
          </form>
        </div>
      )}

      {comparaciones.map((comp, idx) => {
        const total = (comp.votos_a||0)+(comp.votos_b||0)
        const pctA = total > 0 ? Math.round((comp.votos_a/total)*100) : 50
        const pctB = total > 0 ? Math.round((comp.votos_b/total)*100) : 50
        const miVoto = misVotos[comp.id]
        const ini = comp.profiles?.nombre ? comp.profiles.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() : '?'
        const coms = comentarios[comp.id] || []
        const abierto = comentariosAbiertos[comp.id]

        return (
          <div key={comp.id} className="comp-card" style={{ animationDelay:`${idx*40}ms` }}>
            <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <Avatar texto={ini} foto={comp.profiles?.foto_perfil_url} />
                <div>
                  <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{comp.profiles?.nombre||'Estudiante'}</p>
                  <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{total} votos · {miVoto?'toca para cambiar':'toca para votar'}</p>
                </div>
              </div>
              {comp.user_id === usuario?.id && <button className="delete-btn" onClick={() => eliminarComparacion(comp.id)}>✕</button>}
            </div>

            <div style={{ padding:'0 20px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {['A','B'].map(lado => {
                const url = lado==='A' ? comp.foto_a_url : comp.foto_b_url
                const pct = lado==='A' ? pctA : pctB
                const votos = lado==='A' ? comp.votos_a : comp.votos_b
                const esMiVoto = miVoto === lado
                const ganando = miVoto && pct >= (lado==='A' ? pctB : pctA)
                return (
                  <div key={lado}>
                    <div className={`foto-vote${esMiVoto?' voted':''}`} onClick={() => votar(comp.id, lado)}>
                      <img src={url} alt={`Foto ${lado}`} style={{ width:'100%', height:220, objectFit:'cover', display:'block' }} />
                      {!miVoto && (
                        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 200ms ease' }}
                          onMouseEnter={e => { e.currentTarget.style.background='rgba(0,0,0,0.35)'; e.currentTarget.querySelector('span').style.opacity='1' }}
                          onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,0)'; e.currentTarget.querySelector('span').style.opacity='0' }}>
                          <span style={{ opacity:0, transition:'opacity 200ms ease', background:'var(--accent)', color:'#fff', fontFamily:'DM Sans', fontWeight:600, fontSize:14, padding:'8px 20px', borderRadius:'var(--r-full)' }}>Votar {lado}</span>
                        </div>
                      )}
                      {esMiVoto && <div style={{ position:'absolute', top:10, right:10, background:'var(--accent)', borderRadius:'var(--r-full)', padding:'3px 10px', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'DM Sans' }}>✓ Tu voto</div>}
                    </div>
                    {miVoto && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ background:'var(--surface-2)', borderRadius:'var(--r-full)', height:4, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:ganando?'var(--accent)':'var(--border-default)', transition:'width 700ms var(--ease-out)', borderRadius:'var(--r-full)' }}/>
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:5 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:ganando?'var(--accent-bright)':'var(--ink-tertiary)', fontFamily:'DM Mono' }}>{pct}%</span>
                          <div style={{ display:'flex', gap:4 }}>
                            {esMiVoto && <span style={{ fontSize:11, color:'var(--accent)', background:'var(--accent-muted)', padding:'1px 6px', borderRadius:'var(--r-full)', fontWeight:600 }}>Tu voto</span>}
                            {ganando && <span style={{ fontSize:11, color:'var(--success)', background:'rgba(16,185,129,0.1)', padding:'1px 6px', borderRadius:'var(--r-full)', fontWeight:600 }}>Ganando</span>}
                          </div>
                          <span style={{ fontSize:12, color:'var(--ink-tertiary)' }}>{votos||0} votos</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ padding:'6px 12px', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:4 }}>
              <button className={`reac-btn${abierto?' active':''}`} onClick={() => toggleComentarios(comp.id)}>
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
                  <input value={textoComentario[comp.id]||''} onChange={e => setTextoComentario(prev => ({ ...prev, [comp.id]:e.target.value }))} onKeyDown={e => e.key==='Enter' && comentar(comp.id)} placeholder="Escribe un comentario..." className="comment-input" />
                  <button onClick={() => comentar(comp.id)} className="send-btn">Enviar</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {comparaciones.length === 0 && !mostrarForm && (
        <div style={{ textAlign:'center', padding:'64px 0', color:'var(--ink-tertiary)', fontSize:15 }}>
          No hay comparaciones aun. Sube la primera.
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

function SelectorFoto({ label, archivo, onChange }) {
  return (
    <label className="foto-slot">
      {archivo ? (
        <img src={URL.createObjectURL(archivo)} alt={label} style={{ width:'100%', height:160, objectFit:'cover', display:'block' }} />
      ) : (
        <div style={{ textAlign:'center', padding:'20px' }}>
          <div style={{ width:40, height:40, borderRadius:'var(--r-md)', background:'var(--accent-muted)', border:'1px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', fontSize:18, color:'var(--accent-bright)' }}>+</div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:'var(--accent-bright)', fontFamily:'DM Sans' }}>{label}</p>
          <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--ink-tertiary)', fontFamily:'DM Sans' }}>Clic para elegir</p>
        </div>
      )}
      <input type="file" accept="image/*" onChange={e => onChange(e.target.files[0])} style={{ display:'none' }} />
    </label>
  )
}