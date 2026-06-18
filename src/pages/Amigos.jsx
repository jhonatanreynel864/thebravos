import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Users, UserPlus, UserX, Search, Check, X, Shield, ShieldOff, Sparkles } from 'lucide-react'

export default function Amigos({ onCerrar, embebido }) {
  const { usuario } = useAuth()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [amigos, setAmigos] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [bloqueados, setBloqueados] = useState([])
  const [sugeridos, setSugeridos] = useState([])
  const [cargandoSugeridos, setCargandoSugeridos] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [tab, setTab] = useState('amigos')

  useEffect(() => {
    if (!usuario?.id) return
    cargarAmigos()
    cargarSolicitudes()
    cargarBloqueados()
    cargarSugeridos()
  }, [usuario?.id])

  async function cargarAmigos() {
    const { data } = await supabase
      .from('amigos')
      .select('*, perfil_usuario:user_id(id, nombre, foto_perfil_url, carrera), perfil_amigo:amigo_id(id, nombre, foto_perfil_url, carrera)')
      .or(`user_id.eq.${usuario.id},amigo_id.eq.${usuario.id}`)
      .eq('estado', 'aceptado')
    if (data) setAmigos(data)
  }

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('amigos')
      .select('*, perfil_usuario:user_id(id, nombre, foto_perfil_url, carrera)')
      .eq('amigo_id', usuario.id)
      .eq('estado', 'pendiente')
    if (data) setSolicitudes(data)
  }

  async function cargarBloqueados() {
    const { data } = await supabase
      .from('bloqueos')
      .select('*, perfil_bloqueado:bloqueado_id(id, nombre, foto_perfil_url, carrera)')
      .eq('user_id', usuario.id)
    if (data) setBloqueados(data)
  }

  async function cargarSugeridos() {
    setCargandoSugeridos(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, carrera, foto_perfil_url')
      .neq('id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      const unicos = Array.from(new Map(data.map(p => [p.id, p])).values())
      setSugeridos(unicos)
    }
    setCargandoSugeridos(false)
  }

  async function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return
    setCargando(true)
    const bloqueadosIds = bloqueados.map(b => b.bloqueado_id)
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, carrera, foto_perfil_url')
      .ilike('nombre', `%${busqueda}%`)
      .neq('id', usuario.id)
      .limit(10)
    if (data) {
      setResultados(data.filter(p => !bloqueadosIds.includes(p.id)))
    }
    setCargando(false)
  }

  async function enviarSolicitud(amigoId) {
    const { error } = await supabase.from('amigos').insert({
      user_id: usuario.id, amigo_id: amigoId, estado: 'pendiente'
    })
    if (!error) setResultados(prev => prev.map(p => p.id === amigoId ? { ...p, solicitudEnviada: true } : p))
  }

  async function enviarSolicitudSugerido(amigoId) {
    const { error } = await supabase.from('amigos').insert({
      user_id: usuario.id, amigo_id: amigoId, estado: 'pendiente'
    })
    if (!error) setSugeridos(prev => prev.map(p => p.id === amigoId ? { ...p, solicitudEnviada: true } : p))
  }

  async function aceptarSolicitud(solicitudId) {
    await supabase.from('amigos').update({ estado: 'aceptado' }).eq('id', solicitudId)
    cargarAmigos(); cargarSolicitudes()
  }

  async function rechazarSolicitud(solicitudId) {
    await supabase.from('amigos').delete().eq('id', solicitudId)
    cargarSolicitudes()
  }

  async function eliminarAmigo(amigoId) {
    await supabase.from('amigos').delete()
      .or(`and(user_id.eq.${usuario.id},amigo_id.eq.${amigoId}),and(user_id.eq.${amigoId},amigo_id.eq.${usuario.id})`)
    cargarAmigos()
  }

  async function bloquearUsuario(usuarioId) {
    await supabase.from('amigos').delete()
      .or(`and(user_id.eq.${usuario.id},amigo_id.eq.${usuarioId}),and(user_id.eq.${usuarioId},amigo_id.eq.${usuario.id})`)
    await supabase.from('bloqueos').insert({ user_id: usuario.id, bloqueado_id: usuarioId })
    cargarAmigos(); cargarBloqueados()
    setResultados(prev => prev.filter(p => p.id !== usuarioId))
    setSugeridos(prev => prev.filter(p => p.id !== usuarioId))
  }

  async function desbloquearUsuario(bloqueoId) {
    await supabase.from('bloqueos').delete().eq('id', bloqueoId)
    cargarBloqueados()
  }

  const obtenerPerfil = (rel) => rel.user_id === usuario.id ? rel.perfil_amigo : rel.perfil_usuario
  const iniciales = (nombre) => nombre ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  const tabs = [
    { id:'amigos', label:`Amigos (${amigos.length})` },
    { id:'sugeridos', label:'Sugeridos' },
    { id:'solicitudes', label:`Solicitudes${solicitudes.length > 0 ? ` (${solicitudes.length})` : ''}` },
    { id:'buscar', label:'Buscar' },
    { id:'bloqueados', label:`Bloqueados${bloqueados.length > 0 ? ` (${bloqueados.length})` : ''}` },
  ]

  const bloqueadosIds = bloqueados.map(b => b.bloqueado_id)
  const sugeridosFiltrados = sugeridos.filter(p => !bloqueadosIds.includes(p.id))

  const contenido = (
    <div>
      <style>{`
        .amigos-tab { padding:10px 16px; background:none; border:none; border-bottom:2px solid transparent; color:var(--ink-tertiary); font-family:'DM Sans'; font-size:13px; font-weight:500; cursor:pointer; transition:all 150ms ease; white-space:nowrap; }
        .amigos-tab:hover { color:var(--ink-secondary); }
        .amigos-tab.active { color:var(--accent-bright); border-bottom-color:var(--accent-bright); font-weight:600; }
        .amigo-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--border-subtle); }
        .amigo-row:last-child { border-bottom:none; }
        .accion-btn { padding:6px 12px; border-radius:var(--r-sm); font-family:'DM Sans'; font-size:12px; font-weight:600; cursor:pointer; transition:all 150ms ease; display:flex; align-items:center; gap:4px; }
        .accion-btn-primary { background:var(--accent); color:#fff; border:none; }
        .accion-btn-primary:hover { background:var(--accent-bright); }
        .accion-btn-secondary { background:none; border:1px solid var(--border-default); color:var(--ink-secondary); }
        .accion-btn-secondary:hover { border-color:var(--danger); color:var(--danger); }
        .accion-btn-danger { background:none; border:1px solid var(--border-subtle); color:var(--ink-tertiary); }
        .accion-btn-danger:hover { border-color:var(--danger); color:var(--danger); }
        .buscar-input { flex:1; padding:9px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-md); background:var(--surface-2); color:var(--ink-primary); font-family:'DM Sans'; font-size:14px; outline:none; transition:all 150ms ease; }
        .buscar-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
      `}</style>

      {/* Header */}
      <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom: embebido ? 0 : 16 }}>
        <div style={{ padding:'20px 20px 0', borderBottom:'1px solid var(--border-subtle)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--ink-primary)', display:'flex', alignItems:'center', gap:8 }}>
              <Users size={20} style={{ color:'var(--accent-bright)' }} /> Personas
            </h2>
          </div>
          <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`amigos-tab${tab===t.id?' active':''}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido tabs */}
        <div style={{ padding:20 }}>

          {/* Amigos */}
          {tab === 'amigos' && (
            <div>
              {amigos.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  <Users size={40} style={{ margin:'0 auto 12px', opacity:0.3, display:'block' }} />
                  Aun no tienes amigos. Busca compañeros para agregarlos.
                </div>
              ) : amigos.map(rel => {
                const perfil = obtenerPerfil(rel)
                if (!perfil) return null
                return (
                  <div key={rel.id} className="amigo-row">
                    <Avatar texto={iniciales(perfil.nombre)} foto={perfil.foto_perfil_url} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{perfil.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{perfil.carrera}</p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => bloquearUsuario(perfil.id)} className="accion-btn accion-btn-danger">
                        <Shield size={13} /> Bloquear
                      </button>
                      <button onClick={() => eliminarAmigo(perfil.id)} className="accion-btn accion-btn-secondary">
                        <UserX size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sugeridos */}
          {tab === 'sugeridos' && (
            <div>
              {cargandoSugeridos ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  Cargando...
                </div>
              ) : sugeridosFiltrados.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  <Sparkles size={40} style={{ margin:'0 auto 12px', opacity:0.3, display:'block' }} />
                  No hay usuarios para sugerir todavia.
                </div>
              ) : sugeridosFiltrados.map(perfil => {
                const yaEsAmigo = amigos.some(a =>
                  (a.user_id === usuario.id && a.amigo_id === perfil.id) ||
                  (a.amigo_id === usuario.id && a.user_id === perfil.id)
                )
                return (
                  <div key={perfil.id} className="amigo-row">
                    <Avatar texto={iniciales(perfil.nombre)} foto={perfil.foto_perfil_url} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{perfil.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{perfil.carrera}</p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {yaEsAmigo ? (
                        <span style={{ fontSize:12, color:'var(--success)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                          <Check size={13} /> Amigos
                        </span>
                      ) : perfil.solicitudEnviada ? (
                        <span style={{ fontSize:12, color:'var(--ink-tertiary)' }}>Enviada</span>
                      ) : (
                        <button onClick={() => enviarSolicitudSugerido(perfil.id)} className="accion-btn accion-btn-primary">
                          <UserPlus size={13} /> Agregar
                        </button>
                      )}
                      <button onClick={() => bloquearUsuario(perfil.id)} className="accion-btn accion-btn-danger">
                        <Shield size={13} /> Bloquear
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Solicitudes */}
          {tab === 'solicitudes' && (
            <div>
              {solicitudes.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  <Check size={40} style={{ margin:'0 auto 12px', opacity:0.3, display:'block' }} />
                  No tienes solicitudes pendientes.
                </div>
              ) : solicitudes.map(sol => {
                const perfil = sol.perfil_usuario
                if (!perfil) return null
                return (
                  <div key={sol.id} className="amigo-row">
                    <Avatar texto={iniciales(perfil.nombre)} foto={perfil.foto_perfil_url} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{perfil.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{perfil.carrera}</p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => aceptarSolicitud(sol.id)} className="accion-btn accion-btn-primary">
                        <Check size={13} /> Aceptar
                      </button>
                      <button onClick={() => rechazarSolicitud(sol.id)} className="accion-btn accion-btn-danger">
                        <X size={13} /> Rechazar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Buscar */}
          {tab === 'buscar' && (
            <div>
              <form onSubmit={buscar} style={{ display:'flex', gap:8, marginBottom:16 }}>
                <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre..." className="buscar-input" />
                <button type="submit" disabled={cargando} className="accion-btn accion-btn-primary" style={{ padding:'9px 18px', fontSize:14 }}>
                  <Search size={15} /> {cargando ? '...' : 'Buscar'}
                </button>
              </form>

              {resultados.map(perfil => {
                const yaEsAmigo = amigos.some(a =>
                  (a.user_id === usuario.id && a.amigo_id === perfil.id) ||
                  (a.amigo_id === usuario.id && a.user_id === perfil.id)
                )
                return (
                  <div key={perfil.id} className="amigo-row">
                    <Avatar texto={iniciales(perfil.nombre)} foto={perfil.foto_perfil_url} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{perfil.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{perfil.carrera}</p>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {yaEsAmigo ? (
                        <span style={{ fontSize:12, color:'var(--success)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                          <Check size={13} /> Amigos
                        </span>
                      ) : perfil.solicitudEnviada ? (
                        <span style={{ fontSize:12, color:'var(--ink-tertiary)' }}>Solicitud enviada</span>
                      ) : (
                        <button onClick={() => enviarSolicitud(perfil.id)} className="accion-btn accion-btn-primary">
                          <UserPlus size={13} /> Agregar
                        </button>
                      )}
                      <button onClick={() => bloquearUsuario(perfil.id)} className="accion-btn accion-btn-danger">
                        <Shield size={13} /> Bloquear
                      </button>
                    </div>
                  </div>
                )
              })}

              {resultados.length === 0 && busqueda && !cargando && (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  No se encontraron resultados para "{busqueda}"
                </div>
              )}
            </div>
          )}

          {/* Bloqueados */}
          {tab === 'bloqueados' && (
            <div>
              {bloqueados.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-tertiary)', fontSize:14 }}>
                  <ShieldOff size={40} style={{ margin:'0 auto 12px', opacity:0.3, display:'block' }} />
                  No has bloqueado a nadie.
                </div>
              ) : bloqueados.map(bloqueo => {
                const perfil = bloqueo.perfil_bloqueado
                if (!perfil) return null
                return (
                  <div key={bloqueo.id} className="amigo-row">
                    <Avatar texto={iniciales(perfil.nombre)} foto={perfil.foto_perfil_url} />
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--ink-primary)', fontSize:14 }}>{perfil.nombre}</p>
                      <p style={{ margin:0, color:'var(--ink-tertiary)', fontSize:12 }}>{perfil.carrera}</p>
                    </div>
                    <button onClick={() => desbloquearUsuario(bloqueo.id)} className="accion-btn accion-btn-secondary">
                      <ShieldOff size={13} /> Desbloquear
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (embebido) return contenido

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24
    }} onClick={onCerrar}>
      <div style={{
        background:'var(--surface-1)', border:'1px solid var(--border-default)',
        borderRadius:'var(--r-xl)', width:'100%', maxWidth:520,
        maxHeight:'85vh', overflow:'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:20 }}>
          {contenido}
        </div>
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