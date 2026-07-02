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

// --- Conversion HSV <-> HEX para el selector tipo gradiente ---
function hsvAHex(h, s, v) {
  s = s / 100; v = v / 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const rr = Math.round((r + m) * 255)
  const gg = Math.round((g + m) * 255)
  const bb = Math.round((b + m) * 255)
  return '#' + [rr, gg, bb].map(n => n.toString(16).padStart(2, '0')).join('')
}

function hexAHsv(hex) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return { h: 220, s: 78, v: 92 }
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
  }
  if (h < 0) h += 360
  const s = max === 0 ? 0 : (d / max) * 100
  const v = max * 100
  return { h, s, v }
}

function esHexValido(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
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
  const [hsv, setHsv] = useState({ h: 220, s: 78, v: 92 })
  const [hexTexto, setHexTexto] = useState('#2563eb')
  const [arrastrando, setArrastrando] = useState(null) // 'sat' | 'hue' | null
  const mensajesEndRef = useRef(null)
  const selectorRef = useRef(null)
  const boxRef = useRef(null)
  const hueRef = useRef(null)

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

  // Arrastre del cuadro de saturacion/brillo y de la barra de tono
  useEffect(() => {
    if (!arrastrando) return

    function calcularDesdeCuadro(e) {
      if (!boxRef.current) return
      const rect = boxRef.current.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1)
      setHsv(prev => {
        const nuevo = { ...prev, s: x * 100, v: (1 - y) * 100 }
        const hex = hsvAHex(nuevo.h, nuevo.s, nuevo.v)
        setMiColor(hex)
        setHexTexto(hex)
        return nuevo
      })
    }

    function calcularDesdeHue(e) {
      if (!hueRef.current) return
      const rect = hueRef.current.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      setHsv(prev => {
        const nuevo = { ...prev, h: x * 360 }
        const hex = hsvAHex(nuevo.h, nuevo.s, nuevo.v)
        setMiColor(hex)
        setHexTexto(hex)
        return nuevo
      })
    }

    function mover(e) {
      if (arrastrando === 'sat') calcularDesdeCuadro(e)
      if (arrastrando === 'hue') calcularDesdeHue(e)
    }
    function soltar() {
      setArrastrando(null)
      setMiColor(actual => { guardarColor(actual); return actual })
    }

    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
    window.addEventListener('touchmove', mover, { passive: false })
    window.addEventListener('touchend', soltar)
    return () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      window.removeEventListener('touchmove', mover)
      window.removeEventListener('touchend', soltar)
    }
  }, [arrastrando])

  async function cargarMiColor() {
    const { data } = await supabase
      .from('profiles').select('color_chat')
      .eq('id', usuario.id).single()
    if (data?.color_chat) {
      setMiColor(data.color_chat)
      setHexTexto(data.color_chat)
      setHsv(hexAHsv(data.color_chat))
    }
  }

  async function guardarColor(hex) {
    await supabase.from('profiles').update({ color_chat: hex }).eq('id', usuario.id)
  }

  // Para clics rapidos (paleta de favoritos): actualiza y guarda de inmediato
  async function cambiarColor(nuevoColor) {
    setMiColor(nuevoColor)
    setHexTexto(nuevoColor)
    setHsv(hexAHsv(nuevoColor))
    await guardarColor(nuevoColor)
  }

  function manejarCambioHex(valor) {
    setHexTexto(valor)
    if (esHexValido(valor)) {
      setMiColor(valor)
      setHsv(hexAHsv(valor))
      guardarColor(valor)
    }
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

  const colorHueBase = hsvAHex(hsv.h, 100, 100)

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
          z-index:50; width:236px;
          animation:fadeUp 150ms var(--ease-out) both;
        }

        /* Cuadro de saturacion/brillo */
        .sv-box {
          position:relative; width:100%; height:150px;
          border-radius:var(--r-md); cursor:crosshair;
          margin-bottom:12px; overflow:hidden;
          touch-action:none; user-select:none;
        }
        .sv-box-blanco { position:absolute; inset:0; background:linear-gradient(to right, #fff, rgba(255,255,255,0)); }
        .sv-box-negro { position:absolute; inset:0; background:linear-gradient(to top, #000, rgba(0,0,0,0)); }
        .sv-cursor {
          position:absolute; width:16px; height:16px; border-radius:50%;
          border:2px solid #fff; box-shadow:0 0 0 1px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.4);
          transform:translate(-50%, -50%); pointer-events:none;
        }

        /* Barra de tono (hue) */
        .hue-bar {
          position:relative; width:100%; height:14px;
          border-radius:var(--r-full); margin-bottom:14px; cursor:pointer;
          background:linear-gradient(to right,
            #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
          touch-action:none; user-select:none;
        }
        .hue-cursor {
          position:absolute; top:50%; width:18px; height:18px; border-radius:50%;
          background:#fff; border:2px solid rgba(0,0,0,0.15);
          box-shadow:0 1px 4px rgba(0,0,0,0.35);
          transform:translate(-50%, -50%); pointer-events:none;
        }

        .swatch-grid { display:grid; grid-template-columns:repeat(5, 1fr); gap:7px; margin-bottom:12px; }
        .swatch {
          width:28px; height:28px; border-radius:50%; cursor:pointer;
          border:2px solid transparent; display:flex; align-items:center; justify-content:center;
          transition:transform 150ms ease, border-color 150ms ease;
        }
        .swatch:hover { transform:scale(1.1); }
        .swatch.selected { border-color:var(--ink-primary); }

        .hex-row {
          display:flex; align-items:center; gap:8px;
          border-top:1px solid var(--border-subtle); padding-top:12px;
        }
        .hex-preview {
          width:28px; height:28px; border-radius:50%; flex-shrink:0;
          border:2px solid var(--border-default);
        }
        .hex-input {
          flex:1; min-width:0; padding:7px 10px;
          border:1px solid var(--border-subtle); border-radius:var(--r-sm);
          background:var(--surface-2); color:var(--ink-primary);
          font-family:'DM Mono', monospace; font-size:13px; outline:none;
          text-transform:uppercase; transition:border-color 150ms ease;
        }
        .hex-input:focus { border-color:var(--mi-color); }

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

                    {/* Cuadro de saturacion / brillo */}
                    <div
                      ref={boxRef}
                      className="sv-box"
                      style={{ background: colorHueBase }}
                      onMouseDown={e => setArrastrando('sat')}
                      onTouchStart={e => setArrastrando('sat')}
                    >
                      <div className="sv-box-blanco" />
                      <div className="sv-box-negro" />
                      <div className="sv-cursor" style={{
                        left: `${hsv.s}%`,
                        top: `${100 - hsv.v}%`,
                        background: miColor
                      }} />
                    </div>

                    {/* Barra de tono */}
                    <div
                      ref={hueRef}
                      className="hue-bar"
                      onMouseDown={e => setArrastrando('hue')}
                      onTouchStart={e => setArrastrando('hue')}
                    >
                      <div className="hue-cursor" style={{ left: `${(hsv.h / 360) * 100}%`, background: colorHueBase }} />
                    </div>

                    {/* Favoritos rapidos */}
                    <div className="swatch-grid">
                      {PALETA_COLORES.map(c => (
                        <div key={c} className={`swatch${miColor.toLowerCase()===c.toLowerCase()?' selected':''}`}
                          style={{ background:c }} onClick={() => cambiarColor(c)}>
                          {miColor.toLowerCase()===c.toLowerCase() && <Check size={13} style={{ color:'#fff' }} />}
                        </div>
                      ))}
                    </div>

                    {/* Hex manual */}
                    <div className="hex-row">
                      <div className="hex-preview" style={{ background: esHexValido(hexTexto) ? hexTexto : miColor }} />
                      <input
                        className="hex-input"
                        value={hexTexto}
                        onChange={e => manejarCambioHex(e.target.value)}
                        maxLength={7}
                        placeholder="#2563EB"
                      />
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