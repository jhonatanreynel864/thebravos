import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Perfil from './pages/Perfil'
import Amigos from './pages/Amigos'
import Explorar from './pages/Explorar'
import Mensajes from './pages/Mensajes'
import Notificaciones from './pages/Notificaciones'
import PerfilUsuario from './pages/PerfilUsuario'
import { Home, Compass, MessageCircle, Bell, Users, User, Sun, Moon, Search, Sparkles, Trophy, GraduationCap, Award, BarChart3, FileText, Menu, X as XIcon } from 'lucide-react'

const getCss = (tema) => `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; overflow-x: hidden; }

  :root {
    ${tema === 'claro' ? `
    --ink-primary: #0f172a;
    --ink-secondary: #1e293b;
    --ink-tertiary: #475569;
    --ink-muted: #94a3b8;
    --surface-base: #f1f5f9;
    --surface-1: #ffffff;
    --surface-2: #f8fafc;
    --surface-3: #e2e8f0;
    --border-subtle: rgba(0,0,0,0.08);
    --border-default: rgba(0,0,0,0.15);
    --border-emphasis: rgba(0,0,0,0.25);
    ` : `
    --ink-primary: #f0f4f8;
    --ink-secondary: #8899a6;
    --ink-tertiary: #4a5568;
    --ink-muted: #2d3748;
    --surface-base: #080c10;
    --surface-1: #0e1318;
    --surface-2: #141b22;
    --surface-3: #1a2332;
    --border-subtle: rgba(255,255,255,0.06);
    --border-default: rgba(255,255,255,0.1);
    --border-emphasis: rgba(255,255,255,0.18);
    `}
    --accent: #2563eb;
    --accent-bright: #3b82f6;
    --accent-glow: rgba(37,99,235,0.25);
    --accent-muted: rgba(37,99,235,0.12);
    --success: #10b981;
    --danger: #ef4444;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --r-sm: 8px; --r-md: 12px; --r-lg: 16px; --r-xl: 20px; --r-full: 9999px;
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--surface-base); color: var(--ink-primary); -webkit-font-smoothing: antialiased; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

  .navbar-icon-btn {
    display:flex; align-items:center; gap:6px; padding:8px 14px;
    border-radius: var(--r-md); background:none; border:none; cursor:pointer;
    color: var(--ink-tertiary); font-family:'DM Sans'; font-size:13px; font-weight:500;
    transition: all 150ms ease; position:relative;
  }
  .navbar-icon-btn:hover { background: var(--surface-2); color: var(--ink-secondary); }
  .navbar-icon-btn.active { color: var(--accent-bright); background: var(--accent-muted); }

  .navbar-badge {
    position:absolute; top:2px; right:4px;
    background: var(--danger); color:#fff;
    font-size:10px; font-weight:700; min-width:16px; height:16px;
    border-radius: 999px; display:flex; align-items:center; justify-content:center;
    padding: 0 4px; line-height:1;
  }

  .search-input {
    background: var(--surface-2); border:1px solid var(--border-subtle);
    border-radius: var(--r-full); padding: 8px 16px 8px 36px;
    font-family:'DM Sans'; font-size:13px; color: var(--ink-primary);
    outline:none; width: 100%; transition: all 150ms ease;
  }
  .search-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-muted); }
  .search-input::placeholder { color: var(--ink-muted); }

  .theme-toggle-btn {
    width:36px; height:36px; border-radius:50%; border:1px solid var(--border-subtle);
    background: var(--surface-2); cursor:pointer; display:flex; align-items:center;
    justify-content:center; font-size:16px; transition: all 150ms ease; flex-shrink:0;
  }
  .theme-toggle-btn:hover { border-color: var(--accent); background: var(--accent-muted); }

  .side-nav-item {
    display:flex; align-items:center; gap:12px; padding:10px 14px;
    border-radius: var(--r-md); cursor:pointer;
    color: var(--ink-secondary); font-family:'DM Sans'; font-size:14px; font-weight:500;
    transition: all 150ms ease; border:none; background:none; width:100%; text-align:left;
    position: relative;
  }
  .side-nav-item:hover { background: var(--surface-2); color: var(--ink-primary); }
  .side-nav-item.active { background: var(--accent-muted); color: var(--accent-bright); font-weight:600; }
  .side-nav-item .nav-icon { font-size:18px; width:22px; text-align:center; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .side-nav-badge {
    margin-left:auto; background: var(--accent); color:#fff;
    font-size:11px; font-weight:700; min-width:20px; height:20px;
    border-radius:999px; display:flex; align-items:center; justify-content:center; padding:0 6px;
  }

  .salir-side-btn {
    width: 100%; padding: 10px 0; background: none; color: var(--ink-tertiary);
    border: 1px solid var(--border-subtle); border-radius: var(--r-md);
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer;
    transition: all 150ms ease; display:flex; align-items:center; justify-content:center; gap:8px;
  }
  .salir-side-btn:hover { border-color: var(--border-default); color: var(--ink-secondary); }

  .estudiante-badge {
    display:inline-block; background: var(--accent-muted); color: var(--accent-bright);
    font-size:11px; font-weight:700; padding:3px 12px; border-radius: var(--r-full);
    margin-top:4px;
  }

  @media (max-width: 1100px) {
    .sidebar-right { display: none !important; }
    .layout-grid { grid-template-columns: 240px 1fr !important; }
  }
  @media (max-width: 768px) {
    .layout-grid { grid-template-columns: 1fr !important; padding: 12px !important; }
    .sidebar-left { display: none !important; }
    .navbar-search { display: none !important; }
    .navbar-logo-text { display: none !important; }
    .mobile-bottom-nav { display: flex !important; }
    .mobile-menu-btn { display: flex !important; }
  }
  @media (min-width: 769px) {
    .mobile-bottom-nav { display: none !important; }
    .mobile-menu-btn { display: none !important; }
  }

  .mobile-bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 150;
    background: var(--surface-1); border-top: 1px solid var(--border-subtle);
    padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
    justify-content: space-around; align-items: center;
  }
  .mobile-bottom-nav-item {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    background: none; border: none; cursor: pointer; padding: 6px 14px;
    color: var(--ink-tertiary); font-family: 'DM Sans'; font-size: 10px;
    font-weight: 500; position: relative; border-radius: var(--r-md);
    transition: color 150ms ease;
  }
  .mobile-bottom-nav-item.active { color: var(--accent-bright); }
  .mobile-bottom-nav-item .nav-pill {
    position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 40px; height: 32px; border-radius: var(--r-md);
    background: var(--accent-muted);
    opacity: 0; transition: opacity 150ms ease;
    pointer-events: none;
  }
  .mobile-bottom-nav-item.active .nav-pill { opacity: 1; }
  .mobile-badge {
    position: absolute; top:2px; right:6px;
    background: var(--danger); color:#fff; font-size:9px; font-weight:700;
    min-width:14px; height:14px; border-radius:999px;
    display:flex; align-items:center; justify-content:center; padding:0 3px;
  }

  .mobile-menu-btn {
    width: 36px; height: 36px; border-radius: 50%;
    border: 1px solid var(--border-subtle); background: var(--surface-2);
    cursor: pointer; align-items: center; justify-content: center;
    color: var(--ink-secondary); flex-shrink: 0;
  }

  .mobile-drawer-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 250;
  }
  .mobile-drawer {
    position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
    background: var(--surface-1); z-index: 251; overflow-y: auto;
    box-shadow: 4px 0 24px rgba(0,0,0,0.2);
    animation: slideInDrawer 200ms var(--ease-out) both;
  }
  @keyframes slideInDrawer { from { transform: translateX(-100%); } to { transform: translateX(0); } }

  body.con-bottom-nav { padding-bottom: 0; }
  @media (max-width: 768px) {
    .main-content-mobile { padding-bottom: 76px; }
  }
`

const NAV_ITEMS = [
  { id: 'perfil', icon: User, label: 'Mi perfil' },
  { id: 'feed', icon: Home, label: 'Inicio' },
  { id: 'explorar', icon: Compass, label: 'Explorar' },
  { id: 'mensajes', icon: MessageCircle, label: 'Mensajes' },
  { id: 'notificaciones', icon: Bell, label: 'Notificaciones' },
  { id: 'amigos', icon: Users, label: 'Amigos' },
]

export default function App() {
  const { usuario, cargando, cerrarSesion } = useAuth()
  const [vista, setVista] = useState('feed')
  const [perfil, setPerfil] = useState(null)
  const [totalAmigos, setTotalAmigos] = useState(0)
  const [totalNotificaciones, setTotalNotificaciones] = useState(0)
  const [totalMensajes, setTotalMensajes] = useState(0)
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'oscuro')
  const [perfilUsuarioId, setPerfilUsuarioId] = useState(null)
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [carrerasGuardadas, setCarrerasGuardadas] = useState([])
  const [logros, setLogros] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState(false)
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  

  useEffect(() => {
    if (!usuario?.id) return
    supabase.from('profiles').select('nombre, foto_perfil_url')
      .eq('id', usuario.id).single()
      .then(({ data }) => { if (data) setPerfil(data) })
    cargarTotalAmigos()
    cargarCarrerasGuardadas()
    calcularLogros()
    cargarTotalNotificaciones()
    cargarTotalMensajes()

    // Realtime: solicitudes de amistad
    const canalAmigos = supabase
      .channel('notif_amigos')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'amigos',
        filter: `amigo_id=eq.${usuario.id}`
      }, () => { cargarTotalNotificaciones() })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'amigos',
      }, () => { cargarTotalNotificaciones() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'amigos',
      }, () => { cargarTotalNotificaciones() })
      .subscribe()

    // Realtime: mensajes nuevos
    const canalMensajes = supabase
      .channel('notif_mensajes')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `receptor_id=eq.${usuario.id}`
      }, () => { cargarTotalMensajes() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'mensajes',
        filter: `receptor_id=eq.${usuario.id}`
      }, () => { cargarTotalMensajes() })
      .subscribe()

    return () => {
      supabase.removeChannel(canalAmigos)
      supabase.removeChannel(canalMensajes)
    }
  }, [usuario])

  async function cargarTotalAmigos() {
    if (!usuario?.id) return
    const { data } = await supabase
      .from('amigos').select('id')
      .or(`user_id.eq.${usuario.id},amigo_id.eq.${usuario.id}`)
      .eq('estado', 'aceptado')
    if (data) setTotalAmigos(data.length)
  }

  async function cargarCarrerasGuardadas() {
    if (!usuario?.id) return
    const { data } = await supabase
      .from('carreras_guardadas').select('carrera')
      .eq('user_id', usuario.id)
    if (data) setCarrerasGuardadas(data.map(c => c.carrera))
  }

  async function calcularLogros() {
    if (!usuario?.id) return
    const logrosObtenidos = []

    const { count: pubsCount } = await supabase
      .from('publicaciones').select('*', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
    if ((pubsCount || 0) >= 1) logrosObtenidos.push({ id:'primera_pub', titulo:'Primera publicacion' })
    if ((pubsCount || 0) >= 5) logrosObtenidos.push({ id:'5_pubs', titulo:'5 publicaciones realizadas' })
    if ((pubsCount || 0) >= 10) logrosObtenidos.push({ id:'10_pubs', titulo:'10 publicaciones realizadas' })

    const { count: amigosCount } = await supabase
      .from('amigos').select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${usuario.id},amigo_id.eq.${usuario.id}`)
      .eq('estado', 'aceptado')
    if ((amigosCount || 0) >= 1) logrosObtenidos.push({ id:'primer_amigo', titulo:'Primer amigo agregado' })
    if ((amigosCount || 0) >= 5) logrosObtenidos.push({ id:'5_amigos', titulo:'5 amigos en la red' })

    const { count: encCount } = await supabase
      .from('votos_encuesta').select('*', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
    if ((encCount || 0) >= 1) logrosObtenidos.push({ id:'primer_voto', titulo:'Participaste en una encuesta' })
    if ((encCount || 0) >= 5) logrosObtenidos.push({ id:'5_votos', titulo:'5 encuestas respondidas' })

    const { count: compCount } = await supabase
      .from('votos_comparacion').select('*', { count: 'exact', head: true })
      .eq('user_id', usuario.id)
    if ((compCount || 0) >= 1) logrosObtenidos.push({ id:'primer_comp', titulo:'Primera comparacion votada' })

    setLogros(logrosObtenidos)
  }

  async function cargarTotalNotificaciones() {
  if (!usuario?.id) return

  // Solicitudes de amistad pendientes
  const { count: solicitudes } = await supabase
    .from('amigos').select('*', { count:'exact', head:true })
    .eq('amigo_id', usuario.id).eq('estado', 'pendiente')

  // Mis publicaciones
  const { data: misPubs } = await supabase
    .from('publicaciones').select('id').eq('user_id', usuario.id)
  const misPubIds = (misPubs || []).map(p => p.id)

  let likes = 0, comentarios = 0, reposts = 0
  if (misPubIds.length > 0) {
    const [r, c, rp] = await Promise.all([
      supabase.from('reacciones').select('*', { count:'exact', head:true })
        .in('publicacion_id', misPubIds).neq('user_id', usuario.id),
      supabase.from('comentarios').select('*', { count:'exact', head:true })
        .in('publicacion_id', misPubIds).neq('user_id', usuario.id),
      supabase.from('reposts').select('*', { count:'exact', head:true })
        .in('publicacion_id', misPubIds).neq('user_id', usuario.id),
    ])
    likes = r.count || 0
    comentarios = c.count || 0
    reposts = rp.count || 0
  }

  setTotalNotificaciones((solicitudes || 0) + likes + comentarios + reposts)
}

  async function cargarTotalMensajes() {
    if (!usuario?.id) return
    const { count: noLeidos } = await supabase
      .from('mensajes').select('*', { count:'exact', head:true })
      .eq('receptor_id', usuario.id).eq('leido', false)
    setTotalMensajes(noLeidos || 0)
  }

  async function buscarContenido(texto) {
    if (!texto.trim()) { setResultadosBusqueda([]); return }
    const [usuarios, publicaciones, encuestas] = await Promise.all([
      supabase.from('profiles').select('id, nombre, carrera, foto_perfil_url')
        .ilike('nombre', `%${texto}%`).neq('id', usuario.id).limit(4),
      supabase.from('publicaciones').select('id, contenido, profiles(nombre)')
        .ilike('contenido', `%${texto}%`).limit(3),
      supabase.from('encuestas').select('id, pregunta, profiles(nombre)')
        .ilike('pregunta', `%${texto}%`).limit(3),
    ])

    const resultados = [
      ...(usuarios.data || []).map(u => ({
        tipo: 'usuario', nombre: u.nombre, subtitulo: u.carrera, foto: u.foto_perfil_url, id: u.id
      })),
      ...(publicaciones.data || []).map(p => ({
        tipo: 'publicacion', nombre: p.contenido?.slice(0, 60) + (p.contenido?.length > 60 ? '...' : ''),
        subtitulo: `Por ${p.profiles?.nombre || 'Estudiante'}`, id: p.id
      })),
      ...(encuestas.data || []).map(e => ({
        tipo: 'encuesta', nombre: e.pregunta, subtitulo: `Por ${e.profiles?.nombre || 'Estudiante'}`, id: e.id
      })),
    ]
    setResultadosBusqueda(resultados)
  }

  function toggleTema() {
    const nuevoTema = tema === 'oscuro' ? 'claro' : 'oscuro'
    setTema(nuevoTema)
    localStorage.setItem('tema', nuevoTema)
  }

  const css = getCss(tema)
  const iniciales = perfil?.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  if (cargando) return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface-base)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', border:'2px solid var(--border-subtle)', borderTop:'2px solid var(--accent)', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
          <p style={{ color:'var(--ink-tertiary)', fontSize:14 }}>Cargando...</p>
        </div>
      </div>
    </>
  )

  if (!usuario) return <><style>{css}</style><Login /></>

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight:'100vh', width:'100%', background:'var(--surface-base)' }}>

        {/* Navbar */}
        <header style={{ background:'var(--surface-1)', borderBottom:'1px solid var(--border-subtle)', position:'sticky', top:0, zIndex:100, width:'100%' }}>
          <div style={{ maxWidth:1400, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60, gap:16 }}>

            {/* Logo + Menu movil */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <button className="mobile-menu-btn" style={{ display:'none' }} onClick={() => setMenuMovilAbierto(true)}>
                <Menu size={18} />
              </button>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#2563eb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 12px rgba(37,99,235,0.4)' }}>
                <span style={{ color:'#fff', fontWeight:900, fontSize:'0.6rem', textAlign:'center', lineHeight:1.15 }}>the<br/>bravos</span>
              </div>
              <span className="navbar-logo-text" style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:17, color:'var(--ink-primary)', letterSpacing:'-0.3px' }}>the bravos</span>
            </div>

            {/* Buscador */}
            <div className="navbar-search" style={{ flex:1, maxWidth:380, position:'relative' }}>
              <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--ink-muted)', zIndex:1 }} />
              <input
                className="search-input"
                placeholder="Buscar usuarios o publicaciones..."
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); buscarContenido(e.target.value) }}
                onFocus={() => setBusquedaActiva(true)}
                onBlur={() => setTimeout(() => setBusquedaActiva(false), 200)}
              />
              {busquedaActiva && busqueda && (
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', left:0, right:0,
                  background:'var(--surface-1)', border:'1px solid var(--border-default)',
                  borderRadius:'var(--r-lg)', boxShadow:'0 8px 32px rgba(0,0,0,0.2)',
                  zIndex:200, overflow:'hidden', maxHeight:400, overflowY:'auto'
                }}>
                  {resultadosBusqueda.length === 0 ? (
                    <div style={{ padding:'20px', textAlign:'center', color:'var(--ink-tertiary)', fontSize:13 }}>
                      No se encontraron resultados
                    </div>
                  ) : (
                    resultadosBusqueda.map((r, i) => (
                      <div key={i} onClick={() => {
                        if (r.tipo === 'usuario') { setVista('amigos'); setBusquedaActiva(false); setBusqueda('') }
                        else { setVista('feed'); setBusquedaActiva(false); setBusqueda('') }
                      }} style={{
                        display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                        cursor:'pointer', borderBottom:'1px solid var(--border-subtle)',
                        transition:'background 150ms ease'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}
                      >
                        {r.tipo === 'usuario' ? (
                          r.foto ? (
                            <img src={r.foto} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'1.5px solid var(--border-default)' }} />
                          ) : (
                            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-muted)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:13 }}>
                              {r.nombre?.[0]?.toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div style={{ width:36, height:36, borderRadius:'var(--r-sm)', background:'var(--surface-2)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border-subtle)', color:'var(--accent-bright)' }}>
                            {r.tipo === 'encuesta' ? <BarChart3 size={16} /> : <FileText size={16} />}
                          </div>
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {r.nombre}
                          </p>
                          <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:11 }}>{r.subtitulo}</p>
                        </div>
                        <span style={{
                          fontSize:10, fontWeight:700, padding:'2px 8px',
                          borderRadius:'var(--r-full)', background:'var(--accent-muted)',
                          color:'var(--accent-bright)', flexShrink:0
                        }}>
                          {r.tipo === 'usuario' ? 'Usuario' : r.tipo === 'encuesta' ? 'Encuesta' : 'Publicacion'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Derecha */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
              <button className="theme-toggle-btn" onClick={toggleTema} title="Cambiar tema">
                {tema === 'oscuro' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setVista('perfil')} style={{
                background:'none', border:'none', cursor:'pointer', padding:0,
                display:'flex', alignItems:'center', gap:6
              }}>
                {perfil?.foto_perfil_url ? (
                  <img src={perfil.foto_perfil_url} alt="perfil" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border-default)' }} />
                ) : (
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-muted)', border:'2px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:13, fontFamily:'DM Mono' }}>{iniciales}</div>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Layout 3 columnas */}
        <div className="layout-grid" style={{ maxWidth:1400, margin:'0 auto', padding:'24px', display:'grid', gridTemplateColumns:'260px 1fr 300px', gap:24, alignItems:'start' }}>

          {/* Sidebar izquierdo */}
          <aside className="sidebar-left">
            <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'20px', position:'sticky', top:84 }}>

              {/* Perfil card */}
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <div style={{ position:'relative', width:64, margin:'0 auto 10px' }}>
                  {perfil?.foto_perfil_url ? (
                    <img src={perfil.foto_perfil_url} alt="perfil" style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', display:'block', border:'2px solid var(--border-default)' }} />
                  ) : (
                    <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-muted)', border:'2px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:20, fontFamily:'DM Mono' }}>{iniciales}</div>
                  )}
                  <div style={{ position:'absolute', bottom:0, right:0, width:12, height:12, borderRadius:'50%', background:'var(--success)', border:'2px solid var(--surface-1)' }}/>
                </div>
                <p style={{ fontSize:15, fontWeight:700, color:'var(--ink-primary)', marginBottom:2 }}>{perfil?.nombre||'Estudiante'}</p>
                <p style={{ fontSize:12, color:'var(--ink-tertiary)' }}>Pascual Bravo</p>
                <span className="estudiante-badge">Estudiante</span>
                <p style={{ fontSize:12, color:'var(--accent-bright)', fontWeight:500, marginTop:6 }}>
                  {totalAmigos} {totalAmigos === 1 ? 'amigo' : 'amigos'}
                </p>
              </div>

              <div style={{ height:1, background:'var(--border-subtle)', margin:'4px 0 12px' }}/>

              {/* Nav items */}
              <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.id} onClick={() => setVista(item.id)}
                      className={`side-nav-item${vista===item.id?' active':''}`}>
                      <span className="nav-icon"><Icon size={18} /></span>
                      {item.label}
                      {item.id === 'amigos' && totalAmigos > 0 && <span className="side-nav-badge">{totalAmigos}</span>}
                      {item.id === 'notificaciones' && totalNotificaciones > 0 && <span className="side-nav-badge">{totalNotificaciones}</span>}
                      {item.id === 'mensajes' && totalMensajes > 0 && <span className="side-nav-badge">{totalMensajes}</span>}
                    </button>
                  )
                })}
              </nav>

              <div style={{ height:1, background:'var(--border-subtle)', margin:'12px 0' }}/>

              <button className="salir-side-btn" onClick={cerrarSesion}>
                Cerrar sesion
              </button>
            </div>
          </aside>

          {/* Contenido central */}
          <main style={{ minWidth:0 }} className="main-content-mobile">
            {vista === 'feed' && !perfilUsuarioId && <Feed perfil={perfil} onVerPerfil={setPerfilUsuarioId} />}
            {vista === 'feed' && perfilUsuarioId && <PerfilUsuario usuarioId={perfilUsuarioId} onVolver={() => setPerfilUsuarioId(null)} />}
            {vista === 'perfil' && (
              <Perfil onVolver={() => setVista('feed')} onActualizar={setPerfil} tema={tema} onToggleTema={toggleTema} />
            )}
            {vista === 'amigos' && (
              <Amigos onCerrar={() => { setVista('feed'); cargarTotalAmigos() }} embebido />
            )}
            {vista === 'explorar' && <Explorar onCarreraGuardada={cargarCarrerasGuardadas} />}
            {vista === 'mensajes' && <Mensajes />}
            {vista === 'notificaciones' && <Notificaciones />}
          </main>

          {/* Sidebar derecho */}
          <aside className="sidebar-right">
            <div style={{ position:'sticky', top:84, display:'flex', flexDirection:'column', gap:16 }}>

              {/* Descubre tu camino - ROJO */}
              <div style={{
                background:'#dc2626',
                borderRadius:'var(--r-xl)', padding:20,
                boxShadow:'0 8px 24px rgba(220,38,38,0.45)'
              }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                  <Sparkles size={16} /> Descubre tu camino
                </p>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.88)', lineHeight:1.5, marginBottom:14 }}>
                  Responde el test y encuentra la carrera que va contigo.
                </p>
                <button onClick={() => setVista('explorar')} style={{
                  width:'100%', padding:'10px 0', background:'#fff', color:'#dc2626',
                  border:'none', borderRadius:'var(--r-md)', fontFamily:'DM Sans',
                  fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 150ms ease'
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity='0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity='1'}
                >Comenzar test →</button>
              </div>

              {/* Logros academicos - AZUL */}
              <div style={{
                background:'#1d4ed8',
                borderRadius:'var(--r-xl)', padding:20,
                boxShadow:'0 8px 24px rgba(29,78,216,0.45)'
              }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <Trophy size={16} /> Logros academicos
                </p>
                {logros.length === 0 ? (
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.75)', textAlign:'center', padding:'8px 0' }}>
                    Empieza a participar para desbloquear logros
                  </p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {logros.map(logro => (
                      <div key={logro.id} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                        background:'rgba(255,255,255,0.15)', borderRadius:'var(--r-md)',
                        border:'1px solid rgba(255,255,255,0.2)'
                      }}>
                        <Award size={15} style={{ color:'#fff', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'#fff', fontWeight:500 }}>{logro.titulo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Carreras guardadas - MORADO */}
              <div style={{
                background:'#7c3aed',
                borderRadius:'var(--r-xl)', padding:20,
                boxShadow:'0 8px 24px rgba(124,58,237,0.45)'
              }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <GraduationCap size={16} /> Mis carreras guardadas
                </p>
                {carrerasGuardadas.length === 0 ? (
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.75)', textAlign:'center', padding:'8px 0' }}>
                    Aun no has guardado carreras
                  </p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {carrerasGuardadas.map(c => (
                      <div key={c} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                        background:'rgba(255,255,255,0.15)', borderRadius:'var(--r-md)',
                        border:'1px solid rgba(255,255,255,0.2)'
                      }}>
                        <GraduationCap size={15} style={{ color:'#fff', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'#fff', fontWeight:500 }}>{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </aside>
        </div>

        {/* Drawer movil */}
        {menuMovilAbierto && (
          <>
            <div className="mobile-drawer-overlay" onClick={() => setMenuMovilAbierto(false)} />
            <div className="mobile-drawer">
              <div style={{ padding:'20px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <span style={{ fontFamily:'DM Sans', fontWeight:700, fontSize:16, color:'var(--ink-primary)' }}>Menu</span>
                  <button onClick={() => setMenuMovilAbierto(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--ink-tertiary)' }}>
                    <XIcon size={20} />
                  </button>
                </div>

                {/* Perfil card */}
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ position:'relative', width:64, margin:'0 auto 10px' }}>
                    {perfil?.foto_perfil_url ? (
                      <img src={perfil.foto_perfil_url} alt="perfil" style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', display:'block', border:'2px solid var(--border-default)' }} />
                    ) : (
                      <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--accent-muted)', border:'2px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:20, fontFamily:'DM Mono' }}>{iniciales}</div>
                    )}
                  </div>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--ink-primary)', marginBottom:2 }}>{perfil?.nombre||'Estudiante'}</p>
                  <p style={{ fontSize:12, color:'var(--ink-tertiary)' }}>Pascual Bravo</p>
                  <span className="estudiante-badge">Estudiante</span>
                </div>

                <div style={{ height:1, background:'var(--border-subtle)', margin:'4px 0 12px' }}/>

                <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {NAV_ITEMS.map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.id} onClick={() => { setVista(item.id); setMenuMovilAbierto(false); setPerfilUsuarioId(null) }}
                        className={`side-nav-item${vista===item.id?' active':''}`}>
                        <span className="nav-icon"><Icon size={18} /></span>
                        {item.label}
                        {item.id === 'amigos' && totalAmigos > 0 && <span className="side-nav-badge">{totalAmigos}</span>}
                        {item.id === 'notificaciones' && totalNotificaciones > 0 && <span className="side-nav-badge">{totalNotificaciones}</span>}
                        {item.id === 'mensajes' && totalMensajes > 0 && <span className="side-nav-badge">{totalMensajes}</span>}
                      </button>
                    )
                  })}
                </nav>

                <div style={{ height:1, background:'var(--border-subtle)', margin:'12px 0' }}/>

                <button className="salir-side-btn" onClick={cerrarSesion}>Cerrar sesion</button>
              </div>
            </div>
          </>
        )}

        {/* Barra inferior movil */}
        <nav className="mobile-bottom-nav">
          {NAV_ITEMS.filter(i => ['feed','explorar','mensajes','notificaciones','perfil'].includes(i.id)).map(item => {
            const Icon = item.icon
            const activo = vista === item.id
            return (
              <button key={item.id} onClick={() => { setVista(item.id); setPerfilUsuarioId(null) }}
                className={`mobile-bottom-nav-item${activo ? ' active' : ''}`}>
                {/* Pill de fondo cuando está activo */}
                <span className="nav-pill" />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Icon size={20} strokeWidth={activo ? 2.5 : 1.8} />
                  {item.id === 'notificaciones' && totalNotificaciones > 0 && <span className="mobile-badge">{totalNotificaciones}</span>}
                  {item.id === 'mensajes' && totalMensajes > 0 && <span className="mobile-badge">{totalMensajes}</span>}
                </div>
                <span style={{ position: 'relative', zIndex: 1, fontWeight: activo ? 700 : 500 }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}

function VistaProximamente({ icono: Icono, titulo, descripcion }) {
  return (
    <div style={{
      background:'var(--surface-1)', border:'1px solid var(--border-subtle)',
      borderRadius:'var(--r-xl)', padding:'64px 24px', textAlign:'center',
      animation:'fadeUp 300ms var(--ease-out) both'
    }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16, color:'var(--accent-bright)' }}>
        <Icono size={48} strokeWidth={1.5} />
      </div>
      <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink-primary)', marginBottom:8 }}>{titulo}</h2>
      <p style={{ fontSize:14, color:'var(--ink-tertiary)', maxWidth:340, margin:'0 auto', lineHeight:1.6 }}>{descripcion}</p>
    </div>
  )
}