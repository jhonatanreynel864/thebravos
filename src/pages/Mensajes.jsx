import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Send, Search, MessageCircle, ArrowLeft } from 'lucide-react'

export default function Mensajes() {
  const { usuario } = useAuth()
  const [conversaciones, setConversaciones] = useState([])
  const [contactoActivo, setContactoActivo] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(true)
  const mensajesEndRef = useRef(null)

  useEffect(() => {
    if (!usuario?.id) return
    cargarConversaciones()
  }, [usuario])

  useEffect(() => {
    if (contactoActivo) {
      cargarMensajes(contactoActivo.id)
      marcarLeidos(contactoActivo.id)
    }
  }, [contactoActivo])

  useEffect(() => {
    mensajesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (!usuario?.id || !contactoActivo) return
    const canal = supabase
      .channel('mensajes_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `receptor_id=eq.${usuario.id}`
      }, payload => {
        if (payload.new.emisor_id === contactoActivo?.id) {
          setMensajes(prev => [...prev, payload.new])
          marcarLeidos(contactoActivo.id)
        } else {
          cargarConversaciones()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [usuario, contactoActivo])

  async function cargarConversaciones() {
    setCargando(true)
    const { data: enviados } = await supabase
      .from('mensajes')
      .select('receptor_id, profiles!mensajes_receptor_id_fkey(id, nombre, foto_perfil_url, carrera)')
      .eq('emisor_id', usuario.id)
      .order('created_at', { ascending: false })

    const { data: recibidos } = await supabase
      .from('mensajes')
      .select('emisor_id, profiles!mensajes_emisor_id_fkey(id, nombre, foto_perfil_url, carrera), leido')
      .eq('receptor_id', usuario.id)
      .order('created_at', { ascending: false })

    const mapaContactos = {}
    ;(enviados || []).forEach(m => {
      const p = m.profiles
      if (p && !mapaContactos[p.id]) mapaContactos[p.id] = { ...p, noLeidos: 0 }
    })
    ;(recibidos || []).forEach(m => {
      const p = m.profiles
      if (p && !mapaContactos[p.id]) mapaContactos[p.id] = { ...p, noLeidos: 0 }
      if (p && !m.leido) mapaContactos[p.id].noLeidos = (mapaContactos[p.id].noLeidos || 0) + 1
    })

    setConversaciones(Object.values(mapaContactos))
    setCargando(false)
  }

  async function cargarMensajes(contactoId) {
    const { data } = await supabase
      .from('mensajes')
      .select('*')
      .or(`and(emisor_id.eq.${usuario.id},receptor_id.eq.${contactoId}),and(emisor_id.eq.${contactoId},receptor_id.eq.${usuario.id})`)
      .order('created_at', { ascending: true })
    if (data) setMensajes(data)
  }

  async function marcarLeidos(contactoId) {
    await supabase.from('mensajes')
      .update({ leido: true })
      .eq('emisor_id', contactoId)
      .eq('receptor_id', usuario.id)
      .eq('leido', false)
    cargarConversaciones()
  }

  async function enviarMensaje(e) {
    e.preventDefault()
    if (!texto.trim() || !contactoActivo) return
    const contenido = texto.trim()
    setTexto('')
    const { data } = await supabase.from('mensajes')
      .insert({ emisor_id: usuario.id, receptor_id: contactoActivo.id, contenido })
      .select().single()
    if (data) setMensajes(prev => [...prev, data])
  }

  async function buscarUsuarios(e) {
    e.preventDefault()
    if (!busqueda.trim()) return
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, carrera, foto_perfil_url')
      .ilike('nombre', `%${busqueda}%`)
      .neq('id', usuario.id)
      .limit(8)
    if (data) setResultados(data)
  }

  const iniciales = (nombre) => nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const formatearHora = (fecha) => {
    const d = new Date(fecha)
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both' }}>
      <style>{`
        .msg-input { flex:1; padding:10px 16px; border:1px solid var(--border-subtle); border-radius:var(--r-full); background:var(--surface-2); color:var(--ink-primary); font-family:'DM Sans'; font-size:14px; outline:none; transition:all 150ms ease; }
        .msg-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
        .msg-input::placeholder { color:var(--ink-muted); }
        .contacto-row { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; border-radius:var(--r-md); transition:background 150ms ease; }
        .contacto-row:hover { background:var(--surface-2); }
        .contacto-row.active { background:var(--accent-muted); }
        .burbuja { max-width:75%; padding:10px 14px; border-radius:18px; font-size:14px; line-height:1.5; word-break:break-word; }
        .burbuja-enviada { background:var(--accent); color:#fff; border-bottom-right-radius:4px; }
        .burbuja-recibida { background:var(--surface-2); color:var(--ink-primary); border:1px solid var(--border-subtle); border-bottom-left-radius:4px; }
        .send-msg-btn { width:40px; height:40px; border-radius:50%; background:var(--accent); border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; transition:all 150ms ease; flex-shrink:0; box-shadow:0 2px 8px var(--accent-glow); }
        .send-msg-btn:hover { background:var(--accent-bright); transform:scale(1.05); }
        .buscar-contacto-input { width:100%; padding:8px 14px 8px 36px; border:1px solid var(--border-subtle); border-radius:var(--r-full); background:var(--surface-2); color:var(--ink-primary); font-family:'DM Sans'; font-size:13px; outline:none; transition:all 150ms ease; }
        .buscar-contacto-input:focus { border-color:var(--accent); }
        .buscar-contacto-input::placeholder { color:var(--ink-muted); }
      `}</style>

      <div style={{
        background:'var(--surface-1)', border:'1px solid var(--border-subtle)',
        borderRadius:'var(--r-xl)', overflow:'hidden',
        display:'grid', gridTemplateColumns:'280px 1fr', height:'calc(100vh - 120px)'
      }}>

        {/* Panel izquierdo - Conversaciones */}
        <div style={{ borderRight:'1px solid var(--border-subtle)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px', borderBottom:'1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize:16, fontWeight:700, color:'var(--ink-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <MessageCircle size={18} style={{ color:'var(--accent-bright)' }} /> Mensajes
            </h2>
            <form onSubmit={buscarUsuarios} style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-muted)' }} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar usuario..."
                className="buscar-contacto-input"
              />
            </form>
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            {/* Resultados de busqueda */}
            {resultados.length > 0 && (
              <div style={{ padding:'8px 8px 0' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--ink-tertiary)', padding:'4px 8px', letterSpacing:'0.05em' }}>RESULTADOS</p>
                {resultados.map(p => (
                  <div key={p.id} className="contacto-row"
                    onClick={() => { setContactoActivo(p); setResultados([]); setBusqueda('') }}>
                    <Avatar texto={iniciales(p.nombre)} foto={p.foto_perfil_url} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:11 }}>{p.carrera}</p>
                    </div>
                  </div>
                ))}
                <div style={{ height:1, background:'var(--border-subtle)', margin:'8px 0' }}/>
              </div>
            )}

            {/* Conversaciones existentes */}
            {cargando ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--ink-tertiary)', fontSize:13 }}>Cargando...</div>
            ) : conversaciones.length === 0 && resultados.length === 0 ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--ink-tertiary)', fontSize:13 }}>
                <MessageCircle size={32} style={{ margin:'0 auto 8px', display:'block', opacity:0.3 }} />
                Busca un compañero para empezar a chatear
              </div>
            ) : (
              <div style={{ padding:'8px' }}>
                {conversaciones.length > 0 && (
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--ink-tertiary)', padding:'4px 8px', letterSpacing:'0.05em' }}>CONVERSACIONES</p>
                )}
                {conversaciones.map(c => (
                  <div key={c.id}
                    className={`contacto-row${contactoActivo?.id === c.id ? ' active' : ''}`}
                    onClick={() => setContactoActivo(c)}>
                    <div style={{ position:'relative' }}>
                      <Avatar texto={iniciales(c.nombre)} foto={c.foto_perfil_url} />
                      {c.noLeidos > 0 && (
                        <span style={{
                          position:'absolute', top:-4, right:-4,
                          background:'var(--danger)', color:'#fff',
                          fontSize:10, fontWeight:700, width:18, height:18,
                          borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                          border:'2px solid var(--surface-1)'
                        }}>{c.noLeidos}</span>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight: c.noLeidos > 0 ? 700 : 600, color:'var(--ink-primary)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:11 }}>{c.carrera}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho - Chat */}
        {!contactoActivo ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--ink-tertiary)' }}>
            <MessageCircle size={48} style={{ marginBottom:16, opacity:0.2 }} />
            <p style={{ fontSize:15, fontWeight:500 }}>Selecciona una conversacion</p>
            <p style={{ fontSize:13, marginTop:4 }}>o busca un compañero para chatear</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column' }}>
            {/* Header chat */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setContactoActivo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-tertiary)', display:'flex', padding:4, borderRadius:'var(--r-sm)', transition:'all 150ms ease' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar texto={iniciales(contactoActivo.nombre)} foto={contactoActivo.foto_perfil_url} />
              <div>
                <p style={{ margin:0, fontWeight:700, color:'var(--ink-primary)', fontSize:14 }}>{contactoActivo.nombre}</p>
                <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{contactoActivo.carrera}</p>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              {mensajes.length === 0 ? (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-tertiary)', fontSize:13 }}>
                  Inicia la conversacion con {contactoActivo.nombre}
                </div>
              ) : (
                mensajes.map(msg => {
                  const esPropio = msg.emisor_id === usuario.id
                  return (
                    <div key={msg.id} style={{ display:'flex', justifyContent: esPropio ? 'flex-end' : 'flex-start', gap:8, alignItems:'flex-end' }}>
                      {!esPropio && <Avatar texto={iniciales(contactoActivo.nombre)} foto={contactoActivo.foto_perfil_url} size={28} />}
                      <div>
                        <div className={`burbuja ${esPropio ? 'burbuja-enviada' : 'burbuja-recibida'}`}>
                          {msg.contenido}
                        </div>
                        <p style={{ margin:'2px 0 0', fontSize:10, color:'var(--ink-muted)', textAlign: esPropio ? 'right' : 'left' }}>
                          {formatearHora(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={mensajesEndRef} />
            </div>

            {/* Input mensaje */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-subtle)' }}>
              <form onSubmit={enviarMensaje} style={{ display:'flex', gap:10, alignItems:'center' }}>
                <input
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  placeholder={`Mensaje para ${contactoActivo.nombre}...`}
                  className="msg-input"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) enviarMensaje(e) }}
                />
                <button type="submit" className="send-msg-btn" disabled={!texto.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        )}
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