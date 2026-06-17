import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Heart, ThumbsDown, MessageCircle, X, Image as ImageIcon, Send, FileText, BarChart3, Images } from 'lucide-react'

export default function Feed({ perfil: perfilProp, onVerPerfil }) {
  const { usuario } = useAuth()
  const [items, setItems] = useState([])
  const [perfil, setPerfil] = useState(perfilProp || null)
  const [cargando, setCargando] = useState(true)
  const [modoComposer, setModoComposer] = useState(null)
  const [texto, setTexto] = useState('')
  const [imagen, setImagen] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [pregunta, setPregunta] = useState('')
  const [opciones, setOpciones] = useState(['', ''])
  const [fotoA, setFotoA] = useState(null)
  const [fotoB, setFotoB] = useState(null)
  const [comentariosAbiertos, setComentariosAbiertos] = useState({})
  const [comentarios, setComentarios] = useState({})
  const [textoComentario, setTextoComentario] = useState({})
  const [reacciones, setReacciones] = useState({})
  const [misReacciones, setMisReacciones] = useState({})
  const [misVotosEnc, setMisVotosEnc] = useState({})
  const [misVotosFoto, setMisVotosFoto] = useState({})

  useEffect(() => {
    if (!usuario?.id) return
    if (!perfilProp) cargarPerfil()
    cargarTodo()
  }, [usuario])

  useEffect(() => {
    if (perfilProp) setPerfil(perfilProp)
  }, [perfilProp])

  async function cargarPerfil() {
    const { data } = await supabase
      .from('profiles').select('nombre, carrera, foto_perfil_url')
      .eq('id', usuario.id).single()
    if (data) setPerfil(data)
  }

  async function cargarTodo() {
    setCargando(true)
    const [pubs, encs, comps] = await Promise.all([
      supabase.from('publicaciones').select('*, profiles(nombre, carrera, foto_perfil_url)').order('created_at', { ascending: false }).limit(30),
      supabase.from('encuestas').select('*, profiles(nombre, foto_perfil_url)').order('created_at', { ascending: false }).limit(20),
      supabase.from('comparaciones').select('*, profiles(nombre, foto_perfil_url)').order('created_at', { ascending: false }).limit(20),
    ])

    const publicaciones = (pubs.data || []).map(p => ({ ...p, tipo: 'publicacion' }))
    const encuestas = (encs.data || []).map(e => ({ ...e, tipo: 'encuesta' }))
    const comparaciones = (comps.data || []).map(c => ({ ...c, tipo: 'comparacion' }))

    if (encuestas.length > 0) {
      const encIds = encuestas.map(e => e.id)
      const { data: votosEnc } = await supabase
        .from('votos_encuesta').select('encuesta_id, opcion_index, user_id')
        .in('encuesta_id', encIds)
      const misVotosMap = {}
      const conteosMap = {}
      ;(votosEnc || []).forEach(v => {
        if (v.user_id === usuario.id) misVotosMap[v.encuesta_id] = v.opcion_index
        if (!conteosMap[v.encuesta_id]) conteosMap[v.encuesta_id] = {}
        conteosMap[v.encuesta_id][v.opcion_index] = (conteosMap[v.encuesta_id][v.opcion_index] || 0) + 1
      })
      setMisVotosEnc(misVotosMap)
      encuestas.forEach(enc => {
        enc.conteos = enc.opciones.map((_, i) => conteosMap[enc.id]?.[i] || 0)
        enc.totalVotos = enc.conteos.reduce((a, b) => a + b, 0)
      })
    }

    if (comparaciones.length > 0) {
      const compIds = comparaciones.map(c => c.id)
      const { data: misVotosFotoData } = await supabase
        .from('votos_comparacion')
        .select('comparacion_id, voto')
        .in('comparacion_id', compIds)
        .eq('user_id', usuario.id)
      const misVotosMap = {}
      ;(misVotosFotoData || []).forEach(v => {
        misVotosMap[v.comparacion_id] = v.voto
      })
      setMisVotosFoto(misVotosMap)
    }

    if (publicaciones.length > 0) {
      const pubIds = publicaciones.map(p => p.id)
      const { data: reacs } = await supabase
        .from('reacciones').select('publicacion_id, tipo, user_id')
        .in('publicacion_id', pubIds)
      const reacMap = {}
      const misReacMap = {}
      ;(reacs || []).forEach(r => {
        if (!reacMap[r.publicacion_id]) reacMap[r.publicacion_id] = { corazon: 0, nomeGusta: 0 }
        reacMap[r.publicacion_id][r.tipo]++
        if (r.user_id === usuario.id) misReacMap[r.publicacion_id] = r.tipo
      })
      setReacciones(reacMap)
      setMisReacciones(misReacMap)
    }

    const todo = [...publicaciones, ...encuestas, ...comparaciones]
    todo.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setItems(todo)
    setCargando(false)
  }

  async function publicar(e) {
    e.preventDefault()
    if (!texto.trim() && !imagen) return
    setEnviando(true)
    let imagen_url = null
    if (imagen) {
      const ext = imagen.name.split('.').pop()
      const nombre = `${usuario.id}/post_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('fotos').upload(nombre, imagen)
      if (!error) {
        const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
        imagen_url = data.publicUrl
      }
    }
    const { data: nuevaPub } = await supabase
      .from('publicaciones')
      .insert({ user_id: usuario.id, contenido: texto.trim(), imagen_url })
      .select('*, profiles(nombre, carrera, foto_perfil_url)')
      .single()
    if (nuevaPub) {
      setItems(prev => [{ ...nuevaPub, tipo: 'publicacion' }, ...prev])
      setReacciones(prev => ({ ...prev, [nuevaPub.id]: { corazon: 0, nomeGusta: 0 } }))
    }
    setTexto(''); setImagen(null); setModoComposer(null)
    setEnviando(false)
  }

  async function crearEncuesta(e) {
    e.preventDefault()
    const opcionesValidas = opciones.filter(o => o.trim())
    if (!pregunta.trim() || opcionesValidas.length < 2) return
    setEnviando(true)
    const { data: nuevaEnc } = await supabase
      .from('encuestas')
      .insert({ user_id: usuario.id, pregunta: pregunta.trim(), opciones: opcionesValidas })
      .select('*, profiles(nombre, foto_perfil_url)')
      .single()
    if (nuevaEnc) {
      setItems(prev => [{ ...nuevaEnc, tipo: 'encuesta', conteos: opcionesValidas.map(() => 0), totalVotos: 0 }, ...prev])
    }
    setPregunta(''); setOpciones(['', '']); setModoComposer(null)
    setEnviando(false)
  }

  async function subirComparacion(e) {
    e.preventDefault()
    if (!fotoA || !fotoB) return
    setEnviando(true)
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
      const { data: nuevaComp } = await supabase
        .from('comparaciones')
        .insert({ user_id: usuario.id, foto_a_url: urlA, foto_b_url: urlB })
        .select('*, profiles(nombre, foto_perfil_url)')
        .single()
      if (nuevaComp) {
        setItems(prev => [{ ...nuevaComp, tipo: 'comparacion', votos_a: 0, votos_b: 0 }, ...prev])
      }
    }
    setFotoA(null); setFotoB(null); setModoComposer(null)
    setEnviando(false)
  }

  async function eliminar(e, item) {
    e.stopPropagation()
    if (item.tipo === 'publicacion') await supabase.from('publicaciones').delete().eq('id', item.id)
    if (item.tipo === 'encuesta') await supabase.from('encuestas').delete().eq('id', item.id)
    if (item.tipo === 'comparacion') await supabase.from('comparaciones').delete().eq('id', item.id)
    setItems(prev => prev.filter(i => !(i.id === item.id && i.tipo === item.tipo)))
  }

  async function reaccionar(e, pubId, tipo) {
    e.stopPropagation()
    const miReaccion = misReacciones[pubId]
    if (miReaccion === tipo) {
      await supabase.from('reacciones').delete().eq('publicacion_id', pubId).eq('user_id', usuario.id)
      setMisReacciones(prev => { const n = { ...prev }; delete n[pubId]; return n })
      setReacciones(prev => ({ ...prev, [pubId]: { ...prev[pubId], [tipo]: Math.max((prev[pubId]?.[tipo] || 1) - 1, 0) } }))
    } else {
      if (miReaccion) {
        await supabase.from('reacciones').delete().eq('publicacion_id', pubId).eq('user_id', usuario.id)
        setReacciones(prev => ({ ...prev, [pubId]: { ...prev[pubId], [miReaccion]: Math.max((prev[pubId]?.[miReaccion] || 1) - 1, 0) } }))
      }
      await supabase.from('reacciones').insert({ publicacion_id: pubId, user_id: usuario.id, tipo })
      setMisReacciones(prev => ({ ...prev, [pubId]: tipo }))
      setReacciones(prev => ({ ...prev, [pubId]: { ...prev[pubId], [tipo]: (prev[pubId]?.[tipo] || 0) + 1 } }))
    }
  }

  async function votarEncuesta(e, encuestaId, opcionIndex) {
    e.stopPropagation()
    const miVoto = misVotosEnc[encuestaId]
    if (miVoto === opcionIndex) {
      await supabase.from('votos_encuesta').delete().eq('encuesta_id', encuestaId).eq('user_id', usuario.id)
      setMisVotosEnc(prev => { const n = { ...prev }; delete n[encuestaId]; return n })
      setItems(prev => prev.map(item => {
        if (item.id !== encuestaId || item.tipo !== 'encuesta') return item
        const nuevosConteos = [...item.conteos]
        nuevosConteos[opcionIndex] = Math.max(nuevosConteos[opcionIndex] - 1, 0)
        return { ...item, conteos: nuevosConteos, totalVotos: Math.max(item.totalVotos - 1, 0) }
      }))
    } else {
      if (miVoto !== undefined) {
        await supabase.from('votos_encuesta').delete().eq('encuesta_id', encuestaId).eq('user_id', usuario.id)
        setItems(prev => prev.map(item => {
          if (item.id !== encuestaId || item.tipo !== 'encuesta') return item
          const nuevosConteos = [...item.conteos]
          nuevosConteos[miVoto] = Math.max(nuevosConteos[miVoto] - 1, 0)
          return { ...item, conteos: nuevosConteos }
        }))
      }
      await supabase.from('votos_encuesta').insert({ encuesta_id: encuestaId, user_id: usuario.id, opcion_index: opcionIndex })
      setMisVotosEnc(prev => ({ ...prev, [encuestaId]: opcionIndex }))
      setItems(prev => prev.map(item => {
        if (item.id !== encuestaId || item.tipo !== 'encuesta') return item
        const nuevosConteos = [...item.conteos]
        nuevosConteos[opcionIndex] = nuevosConteos[opcionIndex] + 1
        return { ...item, conteos: nuevosConteos, totalVotos: miVoto === undefined ? item.totalVotos + 1 : item.totalVotos }
      }))
    }
  }

  async function votarFoto(e, compId, voto) {
    e.stopPropagation()
    const votoActual = misVotosFoto[compId]

    if (votoActual === voto) {
      await supabase.from('votos_comparacion')
        .delete()
        .eq('comparacion_id', compId)
        .eq('user_id', usuario.id)
      setMisVotosFoto(prev => { const n = { ...prev }; delete n[compId]; return n })
      setItems(prev => prev.map(item => {
        if (item.id !== compId || item.tipo !== 'comparacion') return item
        const campo = voto === 'A' ? 'votos_a' : 'votos_b'
        return { ...item, [campo]: Math.max((item[campo] || 1) - 1, 0) }
      }))
    } else {
      if (votoActual) {
        await supabase.from('votos_comparacion')
          .delete()
          .eq('comparacion_id', compId)
          .eq('user_id', usuario.id)
        setItems(prev => prev.map(item => {
          if (item.id !== compId || item.tipo !== 'comparacion') return item
          const campoAnterior = votoActual === 'A' ? 'votos_a' : 'votos_b'
          return { ...item, [campoAnterior]: Math.max((item[campoAnterior] || 1) - 1, 0) }
        }))
      }
      await supabase.from('votos_comparacion').insert({
        comparacion_id: compId, user_id: usuario.id, voto
      })
      setMisVotosFoto(prev => ({ ...prev, [compId]: voto }))
      setItems(prev => prev.map(item => {
        if (item.id !== compId || item.tipo !== 'comparacion') return item
        const campo = voto === 'A' ? 'votos_a' : 'votos_b'
        return { ...item, [campo]: (item[campo] || 0) + 1 }
      }))
    }
  }

  async function cargarComentarios(id) {
    const { data } = await supabase.from('comentarios').select('*, profiles(nombre, foto_perfil_url)')
      .eq('publicacion_id', id).order('created_at', { ascending: true })
    if (data) setComentarios(prev => ({ ...prev, [id]: data }))
  }

  async function comentar(e, id) {
    e.stopPropagation()
    const t = textoComentario[id]?.trim()
    if (!t) return
    await supabase.from('comentarios').insert({ publicacion_id: id, user_id: usuario.id, contenido: t })
    setTextoComentario(prev => ({ ...prev, [id]: '' }))
    cargarComentarios(id)
  }

  async function borrarComentario(comentarioId) {
    await supabase.from('comentarios').delete().eq('id', comentarioId)
    setComentarios(prev => {
      const nuevo = { ...prev }
      Object.keys(nuevo).forEach(key => {
        nuevo[key] = nuevo[key].filter(c => c.id !== comentarioId)
      })
      return nuevo
    })
  }

  function toggleComentarios(e, id) {
    e.stopPropagation()
    const abierto = comentariosAbiertos[id]
    setComentariosAbiertos(prev => ({ ...prev, [id]: !abierto }))
    if (!abierto) cargarComentarios(id)
  }

  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .feed-card { background:var(--surface-1); border:1px solid var(--border-subtle); border-radius:var(--r-xl); margin-bottom:16px; overflow:hidden; transition:border-color 200ms ease; animation:fadeUp 300ms var(--ease-out) both; }
        .feed-card:hover { border-color:var(--border-default); }
        .tipo-badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:var(--r-full); font-size:11px; font-weight:600; }
        .reac-btn { background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center; font-size:20px; transition:transform 150ms ease, background 150ms ease; }
        .reac-btn:hover { transform:scale(1.2); background:var(--surface-2); }
        .reac-btn:active { transform:scale(0.95); }
        .delete-btn { background:none; border:none; cursor:pointer; padding:4px 8px; border-radius:var(--r-sm); color:var(--ink-muted); font-size:16px; line-height:1; transition:color 150ms ease,background 150ms ease; }
        .delete-btn:hover { color:var(--danger); background:rgba(239,68,68,0.08); }
        .opcion-row { border:1px solid var(--border-subtle); border-radius:var(--r-md); padding:10px 14px; margin-bottom:8px; cursor:pointer; position:relative; overflow:hidden; background:var(--surface-2); transition:border-color 150ms ease; }
        .opcion-row:hover { border-color:var(--border-default); }
        .opcion-row.mi-voto { border-color:var(--accent); background:var(--accent-muted); }
        .foto-vote { cursor:pointer; border-radius:var(--r-lg); overflow:hidden; border:2px solid transparent; transition:border-color 200ms ease,box-shadow 200ms ease,transform 150ms ease; position:relative; }
        .foto-vote:hover { transform:translateY(-2px); }
        .foto-vote.voted { border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-muted); }
        .composer-type-btn { flex:1; padding:10px 0; border:none; border-radius:var(--r-md); cursor:pointer; font-family:DM Sans; font-size:13px; font-weight:600; transition:all 150ms ease; display:flex; align-items:center; justify-content:center; gap:6px; }
        .comment-input { flex:1; padding:9px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-full); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:13px; outline:none; transition:border-color 150ms ease; }
        .comment-input:focus { border-color:var(--accent); }
        .send-btn { padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:13px; cursor:pointer; transition:all 150ms ease; }
        .send-btn:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .submit-btn { padding:10px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:14px; cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 8px var(--accent-glow); }
        .submit-btn:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .submit-btn:disabled { background:var(--surface-3); color:var(--ink-tertiary); cursor:not-allowed; box-shadow:none; transform:none; }
        .enc-input { width:100%; padding:10px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-md); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:14px; outline:none; margin-bottom:8px; }
        .enc-input:focus { border-color:var(--accent); }
        .foto-slot { display:flex; flex-direction:column; align-items:center; justify-content:center; border:1.5px dashed var(--border-default); border-radius:var(--r-lg); cursor:pointer; min-height:140px; background:var(--surface-2); overflow:hidden; transition:all 200ms ease; }
        .foto-slot:hover { border-color:var(--accent); background:var(--accent-muted); }
      `}</style>

      {/* Composer */}
      <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'20px', marginBottom:16 }}>
        {!modoComposer && (
          <>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <Avatar texto={iniciales} foto={perfil?.foto_perfil_url} />
              <button onClick={() => setModoComposer('post')} style={{
                flex:1, padding:'10px 16px', textAlign:'left',
                background:'var(--surface-2)', border:'1px solid var(--border-subtle)',
                borderRadius:'var(--r-full)', cursor:'pointer',
                color:'var(--ink-muted)', fontFamily:'DM Sans', fontSize:14, transition:'all 150ms ease'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.color='var(--ink-tertiary)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.color='var(--ink-muted)' }}
              >¿Que estas pensando?</button>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              {[
                { id:'post', icon:FileText, label:'Publicacion' },
                { id:'encuesta', icon:BarChart3, label:'Encuesta' },
                { id:'fotos', icon:Images, label:'Comparar fotos' },
              ].map(t => {
                const Icon = t.icon
                return (
                <button key={t.id} onClick={() => setModoComposer(t.id)}
                  className="composer-type-btn"
                  style={{ background:'var(--surface-2)', border:'1px solid var(--border-subtle)', color:'var(--ink-tertiary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent-bright)'; e.currentTarget.style.background='var(--accent-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.color='var(--ink-tertiary)'; e.currentTarget.style.background='var(--surface-2)' }}
                >
                  <Icon size={15} /> {t.label}
                </button>
              )})}
            </div>
          </>
        )}

        {modoComposer === 'post' && (
          <div style={{ animation:'slideDown 200ms var(--ease-out) both' }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <Avatar texto={iniciales} foto={perfil?.foto_perfil_url} />
              <form onSubmit={publicar} style={{ flex:1 }}>
                <textarea value={texto} onChange={e => setTexto(e.target.value)}
                  placeholder="¿Que estas pensando?" rows={3}
                  style={{ width:'100%', border:'none', outline:'none', resize:'none', fontFamily:'DM Sans', fontSize:15, background:'transparent', color:'var(--ink-primary)', lineHeight:1.6 }} />
                {imagen && (
                  <div style={{ position:'relative', marginBottom:12, borderRadius:'var(--r-md)', overflow:'hidden' }}>
                    <img src={URL.createObjectURL(imagen)} alt="preview" style={{ width:'100%', height:260, objectFit:'cover', display:'block' }} />
                    <button type="button" onClick={() => setImagen(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.7)', border:'none', borderRadius:'50%', width:28, height:28, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14} /></button>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border-subtle)', paddingTop:12, marginTop:8 }}>
                  
                     <label style={{ cursor:'pointer', color:'var(--accent-bright)', fontWeight:600, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                    <ImageIcon size={15} /> Imagen
                    <input type="file" accept="image/*" onChange={e => setImagen(e.target.files[0])} style={{ display:'none' }} />
                  </label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={() => { setModoComposer(null); setTexto(''); setImagen(null) }} style={{ padding:'7px 14px', background:'none', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-md)', color:'var(--ink-tertiary)', fontFamily:'DM Sans', fontSize:13, cursor:'pointer' }}>Cancelar</button>
                    <button type="submit" disabled={enviando || (!texto.trim() && !imagen)} className="submit-btn" style={{ width:'auto', padding:'7px 20px' }}>
                      {enviando ? 'Publicando...' : 'Publicar'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {modoComposer === 'encuesta' && (
          <div style={{ animation:'slideDown 200ms var(--ease-out) both' }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--ink-primary)', marginBottom:12 }}>Nueva encuesta</p>
            <form onSubmit={crearEncuesta}>
              <input value={pregunta} onChange={e => setPregunta(e.target.value)}
                placeholder="¿Cual es tu pregunta?" required className="enc-input" style={{ fontSize:15, marginBottom:12 }} />
              <p style={{ fontSize:11, fontWeight:600, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:8 }}>OPCIONES</p>
              {opciones.map((op, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input value={op} onChange={e => { const n=[...opciones]; n[i]=e.target.value; setOpciones(n) }}
                    placeholder={`Opcion ${i+1}`} className="enc-input" style={{ flex:1, margin:0 }} />
                  {opciones.length > 2 && (
                    <button type="button" onClick={() => setOpciones(opciones.filter((_,j) => j!==i))} className="delete-btn" style={{ fontSize:14 }}><X size={14} /></button>
                  )}
                </div>
              ))}
              {opciones.length < 5 && (
                <button type="button" onClick={() => setOpciones([...opciones,''])} style={{ width:'100%', padding:'8px 0', background:'none', border:'1px dashed var(--border-default)', borderRadius:'var(--r-md)', color:'var(--ink-tertiary)', fontFamily:'DM Sans', fontSize:13, cursor:'pointer', marginBottom:12 }}>+ Agregar opcion</button>
              )}
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={() => { setModoComposer(null); setPregunta(''); setOpciones(['','']) }} style={{ padding:'7px 14px', background:'none', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-md)', color:'var(--ink-tertiary)', fontFamily:'DM Sans', fontSize:13, cursor:'pointer' }}>Cancelar</button>
                <button type="submit" disabled={enviando || !pregunta.trim()} className="submit-btn" style={{ width:'auto', padding:'7px 20px' }}>
                  {enviando ? 'Publicando...' : 'Publicar encuesta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {modoComposer === 'fotos' && (
          <div style={{ animation:'slideDown 200ms var(--ease-out) both' }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--ink-primary)', marginBottom:12 }}>¿Cual foto es mejor?</p>
            <form onSubmit={subirComparacion}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <SelectorFoto label="Foto A" archivo={fotoA} onChange={setFotoA} />
                <SelectorFoto label="Foto B" archivo={fotoB} onChange={setFotoB} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button type="button" onClick={() => { setModoComposer(null); setFotoA(null); setFotoB(null) }} style={{ padding:'7px 14px', background:'none', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-md)', color:'var(--ink-tertiary)', fontFamily:'DM Sans', fontSize:13, cursor:'pointer' }}>Cancelar</button>
                <button type="submit" disabled={!fotoA || !fotoB || enviando} className="submit-btn" style={{ width:'auto', padding:'7px 20px' }}>
                  {enviando ? 'Subiendo...' : 'Publicar comparacion'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Feed */}
      {cargando ? (
        <div style={{ textAlign:'center', padding:'48px 0' }}>
          <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid var(--border-subtle)', borderTop:'2px solid var(--accent)', animation:'spin 0.8s linear infinite', margin:'0 auto' }}/>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 0', color:'var(--ink-tertiary)', fontSize:15 }}>
          Aun no hay publicaciones. Se el primero.
        </div>
      ) : (
        items.map((item, idx) => (
          <div key={`${item.tipo}-${item.id}`} className="feed-card" style={{ animationDelay:`${idx*30}ms` }}>
            <CardHeader item={item} usuario={usuario} onEliminar={eliminar} onVerPerfil={onVerPerfil} />
            {item.tipo === 'publicacion' && (
              <CardPublicacion item={item} miReac={misReacciones[item.id]}
                reacs={reacciones[item.id] || { corazon:0, nomeGusta:0 }}
                abierto={comentariosAbiertos[item.id]} coms={comentarios[item.id] || []}
                textoComentario={textoComentario[item.id] || ''}
                onReaccionar={reaccionar} onToggleComentarios={toggleComentarios}
                onComentarChange={t => setTextoComentario(prev => ({ ...prev, [item.id]:t }))}
                onComentar={comentar} iniciales={iniciales} perfil={perfil}
              onBorrarComentario={borrarComentario} usuario={usuario} />
            )}
            {item.tipo === 'encuesta' && (
              <CardEncuesta item={item} miVoto={misVotosEnc[item.id]}
                abierto={comentariosAbiertos[item.id]} coms={comentarios[item.id] || []}
                textoComentario={textoComentario[item.id] || ''}
                onVotar={votarEncuesta} onToggleComentarios={toggleComentarios}
                onComentarChange={t => setTextoComentario(prev => ({ ...prev, [item.id]:t }))}
                onComentar={comentar} iniciales={iniciales} perfil={perfil}
              onBorrarComentario={borrarComentario} usuario={usuario} />
            )}
            {item.tipo === 'comparacion' && (
              <CardComparacion item={item} miVoto={misVotosFoto[item.id]}
                abierto={comentariosAbiertos[item.id]} coms={comentarios[item.id] || []}
                textoComentario={textoComentario[item.id] || ''}
                onVotar={votarFoto} onToggleComentarios={toggleComentarios}
                onComentarChange={t => setTextoComentario(prev => ({ ...prev, [item.id]:t }))}
                onComentar={comentar} iniciales={iniciales} perfil={perfil}
              onBorrarComentario={borrarComentario} usuario={usuario} />
            )}
          </div>
        ))
      )}
    </div>
  )
}

function CardHeader({ item, usuario, onEliminar, onVerPerfil }) {
  const nombres = { publicacion:'Publicacion', encuesta:'Encuesta', comparacion:'Fotos' }
  const colores = {
    publicacion: { bg:'rgba(37,99,235,0.1)', color:'#60a5fa' },
    encuesta: { bg:'rgba(16,185,129,0.1)', color:'#34d399' },
    comparacion: { bg:'rgba(245,158,11,0.1)', color:'#fbbf24' }
  }
  const ini = item.profiles?.nombre
    ? item.profiles.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'
  return (
    <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <Avatar texto={ini} foto={item.profiles?.foto_perfil_url} />
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
            <p onClick={() => onVerPerfil && item.profiles?.id && onVerPerfil(item.profiles.id)}
              style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14, cursor: onVerPerfil ? 'pointer' : 'default', transition:'color 150ms ease' }}
              onMouseEnter={e => { if(onVerPerfil) e.currentTarget.style.color='var(--accent-bright)' }}
              onMouseLeave={e => { if(onVerPerfil) e.currentTarget.style.color='var(--ink-primary)' }}
            >
              {item.profiles?.nombre || 'Estudiante'}
            </p>
            <span className="tipo-badge" style={{ background:colores[item.tipo].bg, color:colores[item.tipo].color }}>
              {nombres[item.tipo]}
            </span>
          </div>
          <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>
            {item.profiles?.carrera && `${item.profiles.carrera} · `}
            {new Date(item.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
      </div>
      {item.user_id === usuario?.id && (
        <button className="delete-btn" onClick={e => onEliminar(e, item)}><X size={15} /></button>
      )}
    </div>
  )
}

function CardPublicacion({ item, miReac, reacs, abierto, coms, textoComentario, onReaccionar, onToggleComentarios, onComentarChange, onComentar, iniciales, perfil, onBorrarComentario, usuario }) {
  return (
    <>
      <div style={{ padding:'0 20px 12px' }}>
        {item.contenido && <p style={{ margin:item.imagen_url?'0 0 12px':0, lineHeight:1.65, color:'var(--ink-primary)', fontSize:15 }}>{item.contenido}</p>}
        {item.imagen_url && (
          <div style={{ borderRadius:'var(--r-md)', overflow:'hidden' }}>
            <img src={item.imagen_url} alt="publicacion" style={{ width:'100%', height:320, objectFit:'cover', display:'block' }} />
          </div>
        )}
      </div>
      {(reacs.corazon > 0 || reacs.nomeGusta > 0 || coms.length > 0) && (
        <div style={{ padding:'0 20px 10px', display:'flex', gap:16, borderBottom:'1px solid var(--border-subtle)' }}>
          {reacs.corazon > 0 && <span style={{ fontSize:13, color:'var(--ink-tertiary)', display:'flex', alignItems:'center', gap:4 }}><Heart size={13} fill="#f43f5e" stroke="#f43f5e" /> {reacs.corazon}</span>}
          {reacs.nomeGusta > 0 && <span style={{ fontSize:13, color:'var(--ink-tertiary)', display:'flex', alignItems:'center', gap:4 }}><ThumbsDown size={13} fill="var(--accent-bright)" stroke="var(--accent-bright)" /> {reacs.nomeGusta}</span>}
          {coms.length > 0 && <span style={{ fontSize:13, color:'var(--ink-tertiary)', marginLeft:'auto' }}>{coms.length} comentario{coms.length>1?'s':''}</span>}
        </div>
      )}
      <div style={{ padding:'4px 12px', display:'flex', gap:2, borderTop:'1px solid var(--border-subtle)' }}>
        <button className="reac-btn" onClick={e => onReaccionar(e, item.id, 'corazon')} title="Me gusta"
          style={{ color: miReac==='corazon' ? '#f43f5e' : 'var(--ink-tertiary)' }}>
          <Heart size={19} fill={miReac==='corazon' ? '#f43f5e' : 'none'} />
        </button>
        <button className="reac-btn" onClick={e => onReaccionar(e, item.id, 'nomeGusta')} title="No me gusta"
          style={{ color: miReac==='nomeGusta' ? 'var(--accent-bright)' : 'var(--ink-tertiary)' }}>
          <ThumbsDown size={19} fill={miReac==='nomeGusta' ? 'var(--accent-bright)' : 'none'} />
        </button>
        <button className="reac-btn" onClick={e => onToggleComentarios(e, item.id)} title="Comentar"
          style={{ color: abierto ? 'var(--accent-bright)' : 'var(--ink-tertiary)' }}>
          <MessageCircle size={19} fill={abierto ? 'var(--accent-bright)' : 'none'} />
        </button>
      </div>
      <SeccionComentarios abierto={abierto} coms={coms} textoComentario={textoComentario}
        onComentarChange={onComentarChange} onComentar={e => onComentar(e, item.id)}
        iniciales={iniciales} perfil={perfil}
        onBorrarComentario={onBorrarComentario} usuario={usuario} />
    </>
  )
}

function CardEncuesta({ item, miVoto, abierto, coms, textoComentario, onVotar, onToggleComentarios, onComentarChange, onComentar, iniciales, perfil }) {
  const yaVote = miVoto !== undefined
  const conteos = item.conteos || item.opciones.map(() => 0)
  const totalVotos = item.totalVotos || 0
  const maxVotos = yaVote && totalVotos > 0 ? Math.max(...conteos) : -1
  return (
    <>
      <div style={{ padding:'0 20px 16px' }}>
        <p style={{ fontSize:16, fontWeight:600, color:'var(--ink-primary)', marginBottom:14, lineHeight:1.4 }}>{item.pregunta}</p>
        <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:10 }}>{totalVotos} votos {yaVote && '· toca para cambiar'}</p>
        {item.opciones.map((op, i) => {
          const pct = totalVotos > 0 ? Math.round((conteos[i]/totalVotos)*100) : 0
          const esMiVoto = miVoto === i
          const esGanador = yaVote && totalVotos > 0 && conteos[i] === maxVotos && maxVotos > 0
          return (
            <div key={i} onClick={e => onVotar(e, item.id, i)} className={`opcion-row${esMiVoto?' mi-voto':''}`}>
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
      <div style={{ padding:'4px 12px', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:2 }}>
        <button className="reac-btn" onClick={e => onToggleComentarios(e, item.id)} title="Comentar"
          style={{ color: abierto ? 'var(--accent-bright)' : 'var(--ink-tertiary)' }}>
          <MessageCircle size={19} fill={abierto ? 'var(--accent-bright)' : 'none'} />
        </button>
        {coms.length > 0 && <span style={{ color:'var(--ink-tertiary)', fontSize:13, alignSelf:'center', marginLeft:2 }}>{coms.length}</span>}
      </div>
      <SeccionComentarios abierto={abierto} coms={coms} textoComentario={textoComentario}
        onComentarChange={onComentarChange} onComentar={e => onComentar(e, item.id)}
        iniciales={iniciales} perfil={perfil}
        onBorrarComentario={onBorrarComentario} usuario={usuario} />
    </>
  )
}

function CardComparacion({ item, miVoto, abierto, coms, textoComentario, onVotar, onToggleComentarios, onComentarChange, onComentar, iniciales, perfil }) {
  const total = (item.votos_a||0) + (item.votos_b||0)
  const pctA = total > 0 ? Math.round((item.votos_a/total)*100) : 50
  const pctB = total > 0 ? Math.round((item.votos_b/total)*100) : 50
  const ganandoA = miVoto && total > 0 && item.votos_a > item.votos_b
  const ganandoB = miVoto && total > 0 && item.votos_b > item.votos_a
  return (
    <>
      <div style={{ padding:'0 20px 16px' }}>
        <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:12 }}>
          {total} votos · {miVoto?'toca para cambiar':'toca para votar'}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {['A','B'].map(lado => {
            const url = lado==='A' ? item.foto_a_url : item.foto_b_url
            const pct = lado==='A' ? pctA : pctB
            const votos = lado==='A' ? item.votos_a : item.votos_b
            const esMiVoto = miVoto === lado
            const ganando = lado==='A' ? ganandoA : ganandoB
            return (
              <div key={lado}>
                <div className={`foto-vote${esMiVoto?' voted':''}`} onClick={e => onVotar(e, item.id, lado)}>
                  <img src={url} alt={`Foto ${lado}`} style={{ width:'100%', height:220, objectFit:'cover', display:'block' }} />
                  {!miVoto && (
                    <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 200ms ease' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(0,0,0,0.35)'; e.currentTarget.querySelector('span').style.opacity='1' }}
                      onMouseLeave={e => { e.currentTarget.style.background='rgba(0,0,0,0)'; e.currentTarget.querySelector('span').style.opacity='0' }}>
                      <span style={{ opacity:0, transition:'opacity 200ms ease', background:'var(--accent)', color:'#fff', fontFamily:'DM Sans', fontWeight:600, fontSize:14, padding:'8px 20px', borderRadius:'var(--r-full)' }}>Votar {lado}</span>
                    </div>
                  )}
                  {esMiVoto && (
                    <div style={{ position:'absolute', top:10, right:10, background:'var(--accent)', borderRadius:'var(--r-full)', padding:'3px 10px', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'DM Sans' }}>
                      ✓ Tu voto
                    </div>
                  )}
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
      </div>
      <div style={{ padding:'4px 12px', borderTop:'1px solid var(--border-subtle)', display:'flex', gap:2 }}>
        <button className="reac-btn" onClick={e => onToggleComentarios(e, item.id)} title="Comentar"
          style={{ color: abierto ? 'var(--accent-bright)' : 'var(--ink-tertiary)' }}>
          <MessageCircle size={19} fill={abierto ? 'var(--accent-bright)' : 'none'} />
        </button>
        {coms.length > 0 && <span style={{ color:'var(--ink-tertiary)', fontSize:13, alignSelf:'center', marginLeft:2 }}>{coms.length}</span>}
      </div>
      <SeccionComentarios abierto={abierto} coms={coms} textoComentario={textoComentario}
        onComentarChange={onComentarChange} onComentar={e => onComentar(e, item.id)}
        iniciales={iniciales} perfil={perfil}
        onBorrarComentario={onBorrarComentario} usuario={usuario} />
    </>
  )
}

function SeccionComentarios({ abierto, coms, textoComentario, onComentarChange, onComentar, iniciales, perfil, onBorrarComentario, usuario }) {
  if (!abierto) return null
  return (
    <div style={{ padding:'12px 20px 16px', borderTop:'1px solid var(--border-subtle)' }}>
      {coms.map(com => (
        <div key={com.id} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
          <Avatar texto={com.profiles?.nombre?.[0]?.toUpperCase()||'?'} foto={com.profiles?.foto_perfil_url} size={32} />
          <div style={{ background:'var(--surface-2)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-md)', padding:'8px 12px', flex:1, position:'relative' }}>
            <p style={{ margin:'0 0 3px', fontWeight:600, fontSize:13, color:'var(--accent-bright)' }}>{com.profiles?.nombre||'Estudiante'}</p>
            <p style={{ margin:0, fontSize:14, color:'var(--ink-secondary)', lineHeight:1.5 }}>{com.contenido}</p>
            {com.user_id === usuario?.id && (
              <button onClick={() => onBorrarComentario(com.id)} style={{
                position:'absolute', top:6, right:8, background:'none', border:'none',
                cursor:'pointer', color:'var(--ink-muted)', padding:2, borderRadius:'var(--r-sm)',
                display:'flex', alignItems:'center', transition:'color 150ms ease'
              }}
                onMouseEnter={e => e.currentTarget.style.color='var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--ink-muted)'}
              ><X size={13} /></button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8 }}>
        <Avatar texto={iniciales} foto={perfil?.foto_perfil_url} size={32} />
        <input value={textoComentario} onChange={e => onComentarChange(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') { e.stopPropagation(); onComentar(e) } }}
          placeholder="Escribe un comentario..." className="comment-input" />
        <button onClick={onComentar} className="send-btn" style={{ display:'flex', alignItems:'center', gap:6 }}><Send size={14} /> Enviar</button>
      </div>
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