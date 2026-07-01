import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Send, Search, MessageCircle, ArrowLeft, Palette, Check } from 'lucide-react'

const PALETA_COLORES = [
  '#2563eb', // azul (default)
  '#dc2626', // rojo
  '#ea580c', // naranja
  '#d97706', // ambar
  '#16a34a', // verde
  '#0d9488', // teal
  '#7c3aed', // violeta
  '#c026d3', // magenta
  '#e11d48', // rosa
  '#475569', // gris pizarra
]

function hexARgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function oscurecer(hex, factor = 0.85) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor)
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor)
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

export default function Mensajes() {
  const { usuario } = useAuth()
  const [conversaciones, setConversaciones] = useState([])
  const [contactoActivo, setContactoActivo] = useState(null)
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [miColor, setMiColor] = useState('#2563eb')
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [colorPersonalizado, setColorPersonalizado] = useState('#2563eb')
  const mensajesEndRef = useRef(null)
  const selectorRef = useRef(null)

  useEffect(() => {
    if (!usuario?.id) return
    cargarConversaciones()
    cargarMiColor()
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

  // Cerrar selector de color al hacer clic afuera
  useEffect(() => {
    function manejarClicAfuera(e) {
      if (selectorRef.current && !selectorRef.current.contains(e.target)) {
        setSelectorAbierto(false)
      }
    }
    if (selectorAbierto) document.addEventListener('mousedown', manejarClicAfuera)
    return () => document.removeEventListener('mousedown', manejarClicAfuera)
  }, [selectorAbierto])

  async function cargarMiColor() {
    const { data } = await supabase
      .from('profiles').select('color_chat')
      .eq('id', usuario.id).single()
    if (data?.color_chat) {
      setMiColor(data.color_chat)
      setColorPersonalizado(data.color_chat)
    }
  }

  async function cambiarColor(nuevoColor) {
    setMiColor(nuevoColor)
    setColorPersonalizado(nuevoColor)
    await supabase.from('profiles').update({ color_chat: nuevoColor }).eq('id', usuario.id)
  }

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
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both', '--mi-color': miColor, '--mi-color-oscuro': oscurecer(miColor) }}>
      <style>{`
        .msg-input {
          flex:1; padding:10px 16px;
          border:1px solid var(--border-subtle);
          border-radius:var(--r-full);
          background:var(--surface-2);
          color:var(--ink-primary);
          font-family:'DM Sans'; font-size:14px; outline:none;
          transition:all 150ms ease;
        }
        .msg-input:focus { border-color:var(--mi-color); box-shadow:0 0 0 3px ${hexARgba(miColor,0.14)}; }
        .msg-input::placeholder { color:var(--ink-muted); }
        .contacto-row {
          display:flex; align-items:center; gap:12px;
          padding:10px 12px; cursor:pointer;
          border-radius:var(--r-md); transition:background 150ms ease;
        }
        .contacto-row:hover { background:var(--surface-2); }
        .contacto-row.active { background:${hexARgba(miColor,0.1)}; }
        .burbuja-enviada {
          background: linear-gradient(155deg, var(--mi-color) 0%, var(--mi-color-oscuro) 100%);
          color:#fff;
          padding:10px 16px; border-radius:18px 18px 4px 18px;
          font-size:14px; line-height:1.6;
          max-width:420px; width:fit-content;
          word-break:break-word; white-space:pre-wrap;
          box-shadow: 0 2px 8px ${hexARgba(miColor,0.25)};
        }
        .burbuja-recibida {
          background:var(--surface-2); color:var(--ink-primary);
          border:1px solid var(--border-subtle);
          padding:10px 16px; border-radius:18px 18px 18px 4px;
          font-size:14px; line-height:1.6;
          max-width:420px; width:fit-content;
          word-break:break-word; white-space:pre-wrap;
        }
        .send-msg-btn {
          width:40px; height:40px; border-radius:50%;
          background:var(--mi-color); border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:#fff; transition:all 150ms ease; flex-shrink:0;
          box-shadow:0 2px 8px ${hexARgba(miColor,0.35)};
        }
        .send-msg-btn:hover { transform:scale(1.05); filter:brightness(1.08); }
        .send-msg-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .buscar-input {
          width:100%; padding:8px 14px 8px 36px;
          border:1px solid var(--border-subtle);
          border-radius:var(--r-full);
          background:var(--surface-2); color:var(--ink-primary);
          font-family:'DM Sans'; font-size:13px; outline:none;
          transition:all 150ms ease;
        }
        .buscar-input:focus { border-color:var(--mi-color); }
        .buscar-input::placeholder { color:var(--ink-muted); }

        .msgs-container {
          background:var(--surface-1);
          border:1px solid var(--border-subtle);
          border-radius:var(--r-xl); overflow:hidden;
          display:grid; grid-template-columns:260px 1fr;
          height:calc(100vh - 112px); min-height:500px;
        }
        .msgs-lista-panel {
          border-right:1px solid var(--border-subtle);
          display:flex; flex-direction:column; overflow:hidden;
        }
        .msgs-chat-panel {
          display:flex; flex-direction:column; overflow:hidden;
        }
        .msgs-hilo {
          background: linear-gradient(180deg, ${hexARgba(miColor,0.04)} 0%, transparent 220px);
        }

        .color-picker-btn {
          width:34px; height:34px; border-radius:50%;
          border:2px solid var(--border-default); cursor:pointer;
          background:var(--mi-color); flex-shrink:0;
          transition:transform 150ms ease, border-color 150ms ease;
          display:flex; align-items:center; justify-content:center;
        }
        .color-picker-btn:hover { transform:scale(1.08); border-color:var(--ink-tertiary); }
        .color-popover {
          position:absolute; top:calc(100% + 10px); right:0;
          background:var(--surface-1); border:1px solid var(--border-default);
          border-radius:var(--r-lg); padding:14px;
          box-shadow:0 8px 28px rgba(0,0,0,0.22);
          z-index:50; width:216px;
          animation:fadeUp 150ms var(--ease-out) both;
        }
        .swatch-grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:8px; margin-bottom:12px; }
        .swatch {
          width:32px; height:32px; border-radius:50%; cursor:pointer;
          border:2px solid transparent; display:flex; align-items:center; justify-content:center;
          transition:transform 150ms ease, border-color 150ms ease;
        }
        .swatch:hover { transform:scale(1.1); }
        .swatch.selected { border-color:var(--ink-primary); }
        .custom-color-row {
          display:flex; align-items:center; gap:8px;
          border-top:1px solid var(--border-subtle); padding-top:12px;
        }
        .custom-color-input {
          -webkit-appearance:none; appearance:none; width:32px; height:32px;
          border:none; border-radius:50%; cursor:pointer; padding:0; background:none;
          overflow:hidden; flex-shrink:0;
        }
        .custom-color-input::-webkit-color-swatch-wrapper { padding:0; }
        .custom-color-input::-webkit-color-swatch { border:2px solid var(--border-default); border-radius:50%; }

        @media (max-width: 768px) {
          .msgs-container {
            grid-template-columns: 1fr !important;
            height: calc(100vh - 150px) !important;
            border-radius: var(--r-lg) !important;
            border: none !important;
          }
          .msgs-lista-panel.oculto-movil { display: none !important; }
          .msgs-chat-panel.oculto-movil { display: none !important; }
        }
      `}</style>

      <div className="msgs-container">
        {/* Panel izquierdo */}
        <div className={`msgs-lista-panel${contactoActivo ? ' oculto-movil' : ''}`}>
          <div style={{ padding:'16px', borderBottom:'1px solid var(--border-subtle)', flexShrink:0 }}>
            <h2 style={{ fontSize:15, fontWeight:700, color:'var(--ink-primary)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <MessageCircle size={17} style={{ color:'var(--mi-color)' }} /> Mensajes
            </h2>
            <form onSubmit={buscarUsuarios} style={{ position:'relative' }}>
              <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--ink-muted)', pointerEvents:'none' }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar usuario..." className="buscar-input" />
            </form>
          </div>

          <div style={{ overflowY:'auto', flex:1, padding:'8px' }}>
            {resultados.length > 0 && (
              <>
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
              </>
            )}

            {cargando ? (
              <p style={{ textAlign:'center', padding:20, color:'var(--ink-tertiary)', fontSize:13 }}>Cargando...</p>
            ) : conversaciones.length === 0 && resultados.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--ink-tertiary)' }}>
                <MessageCircle size={32} style={{ margin:'0 auto 8px', display:'block', opacity:0.2 }} />
                <p style={{ fontSize:13 }}>Busca un compañero para chatear</p>
              </div>
            ) : (
              <>
                {conversaciones.length > 0 && <p style={{ fontSize:11, fontWeight:700, color:'var(--ink-tertiary)', padding:'4px 8px', letterSpacing:'0.05em' }}>CONVERSACIONES</p>}
                {conversaciones.map(c => (
                  <div key={c.id} className={`contacto-row${contactoActivo?.id === c.id ? ' active' : ''}`}
                    onClick={() => setContactoActivo(c)}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <Avatar texto={iniciales(c.nombre)} foto={c.foto_perfil_url} />
                      {c.noLeidos > 0 && (
                        <span style={{ position:'absolute', top:-4, right:-4, background:'var(--danger)', color:'#fff', fontSize:10, fontWeight:700, width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--surface-1)' }}>{c.noLeidos}</span>
                      )}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight: c.noLeidos > 0 ? 700 : 600, color:'var(--ink-primary)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.carrera}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Panel derecho - Chat */}
        {!contactoActivo ? (
          <div className="msgs-chat-panel oculto-movil" style={{ alignItems:'center', justifyContent:'center', color:'var(--ink-tertiary)', gap:12 }}>
            <MessageCircle size={48} style={{ opacity:0.15 }} />
            <p style={{ fontSize:15, fontWeight:500, color:'var(--ink-secondary)' }}>Selecciona una conversacion</p>
            <p style={{ fontSize:13 }}>o busca un compañero para chatear</p>
          </div>
        ) : (
          <div className="msgs-chat-panel">
            {/* Header */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <button onClick={() => setContactoActivo(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-tertiary)', display:'flex', padding:4, borderRadius:'var(--r-sm)', transition:'all 150ms ease' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}
              >
                <ArrowLeft size={18} />
              </button>
              <Avatar texto={iniciales(contactoActivo.nombre)} foto={contactoActivo.foto_perfil_url} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontWeight:700, color:'var(--ink-primary)', fontSize:14 }}>{contactoActivo.nombre}</p>
                <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{contactoActivo.carrera}</p>
              </div>

              {/* Selector de color */}
              <div ref={selectorRef} style={{ position:'relative', flexShrink:0 }}>
                <button className="color-picker-btn" title="Personalizar color del chat" onClick={() => setSelectorAbierto(v => !v)}>
                  <Palette size={14} style={{ color:'#fff', opacity:0.9 }} />
                </button>
                {selectorAbierto && (
                  <div className="color-popover">
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--ink-tertiary)', letterSpacing:'0.04em', marginBottom:10 }}>COLOR DE TUS MENSAJES</p>
                    <div className="swatch-grid">
                      {PALETA_COLORES.map(c => (
                        <div key={c} className={`swatch${miColor.toLowerCase()===c.toLowerCase()?' selected':''}`}
                          style={{ background:c }} onClick={() => cambiarColor(c)}>
                          {miColor.toLowerCase()===c.toLowerCase() && <Check size={14} style={{ color:'#fff' }} />}
                        </div>
                      ))}
                    </div>
                    <div className="custom-color-row">
                      <input type="color" value={colorPersonalizado} className="custom-color-input"
                        onChange={e => cambiarColor(e.target.value)} />
                      <span style={{ fontSize:12, color:'var(--ink-tertiary)' }}>Color personalizado</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="msgs-hilo" style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:12 }}>
              {mensajes.length === 0 ? (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-tertiary)', fontSize:13 }}>
                  Inicia la conversacion con {contactoActivo.nombre}
                </div>
              ) : mensajes.map((msg, idx) => {
                const esPropio = msg.emisor_id === usuario.id
                const anterior = mensajes[idx - 1]
                const mismoEmisor = anterior && anterior.emisor_id === msg.emisor_id
                return (
                  <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems: esPropio ? 'flex-end' : 'flex-start', gap:2 }}>
                    {!mismoEmisor && !esPropio && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                        <Avatar texto={iniciales(contactoActivo.nombre)} foto={contactoActivo.foto_perfil_url} size={24} />
                        <span style={{ fontSize:12, color:'var(--ink-tertiary)', fontWeight:600 }}>{contactoActivo.nombre}</span>
                      </div>
                    )}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:8, flexDirection: esPropio ? 'row-reverse' : 'row' }}>
                      <div className={esPropio ? 'burbuja-enviada' : 'burbuja-recibida'}>
                        {msg.contenido}
                      </div>
                    </div>
                    <span style={{ fontSize:10, color:'var(--ink-muted)', marginTop:2, paddingLeft: esPropio ? 0 : 4, paddingRight: esPropio ? 4 : 0 }}>
                      {formatearHora(msg.created_at)}
                    </span>
                  </div>
                )
              })}
              <div ref={mensajesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-subtle)', flexShrink:0 }}>
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

function Avatar({ texto, foto, size=38 }) {
  return foto ? (
    <img src={foto} alt="avatar" style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block', border:'1.5px solid var(--border-default)' }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--accent-muted)', border:'1.5px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, flexShrink:0, fontSize:size>30?13:10, fontFamily:'DM Mono, monospace' }}>{texto}</div>
  )
}