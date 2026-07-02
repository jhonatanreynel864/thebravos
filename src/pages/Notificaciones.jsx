import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Bell, Heart, ThumbsDown, MessageCircle, UserPlus, Check, Trash2, Repeat2 } from 'lucide-react'

export default function Notificaciones() {
  const { usuario } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuario?.id) return
    cargarNotificaciones()

    const canalReacciones = supabase
      .channel('notif_reacciones')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'reacciones' }, async (payload) => {
        if (payload.new.user_id === usuario.id) return
        const { data: pub } = await supabase.from('publicaciones').select('user_id').eq('id', payload.new.publicacion_id).single()
        if (pub?.user_id === usuario.id) cargarNotificaciones()
      })
      .subscribe()

    const canalComentarios = supabase
      .channel('notif_comentarios')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'comentarios' }, async (payload) => {
        if (payload.new.user_id === usuario.id) return
        const { data: pub } = await supabase.from('publicaciones').select('user_id').eq('id', payload.new.publicacion_id).single()
        if (pub?.user_id === usuario.id) cargarNotificaciones()
      })
      .subscribe()

    const canalReposts = supabase
      .channel('notif_reposts')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'reposts' }, async (payload) => {
        if (payload.new.user_id === usuario.id) return
        const { data: pub } = await supabase.from('publicaciones').select('user_id').eq('id', payload.new.publicacion_id).single()
        if (pub?.user_id === usuario.id) cargarNotificaciones()
      })
      .subscribe()

    const canalAmigos = supabase
      .channel('notif_amigos_pantalla')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'amigos', filter:`amigo_id=eq.${usuario.id}` }, () => cargarNotificaciones())
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'amigos' }, () => cargarNotificaciones())
      .subscribe()

    return () => {
      supabase.removeChannel(canalReacciones)
      supabase.removeChannel(canalComentarios)
      supabase.removeChannel(canalReposts)
      supabase.removeChannel(canalAmigos)
    }
  }, [usuario])

  async function cargarNotificaciones() {
    setCargando(true)

    // Obtener desde cuando ya vio las notificaciones
    const { data: vistasData } = await supabase
      .from('notificaciones_vistas')
      .select('vistas_hasta')
      .eq('user_id', usuario.id)
      .single()
    const vistasHasta = vistasData?.vistas_hasta || null

    // Mis publicaciones
    const { data: misPubs } = await supabase
      .from('publicaciones').select('id').eq('user_id', usuario.id)
    const misPubIds = (misPubs || []).map(p => p.id)

    const [reacciones, comentarios, solicitudes, repostsData] = await Promise.all([
      misPubIds.length > 0
        ? supabase.from('reacciones')
            .select('tipo, created_at, publicacion_id, user_id, profiles!reacciones_user_id_fkey(nombre, foto_perfil_url), publicaciones!reacciones_publicacion_id_fkey(contenido)')
            .in('publicacion_id', misPubIds)
            .neq('user_id', usuario.id)
            .order('created_at', { ascending: false })
            .limit(15)
        : { data: [] },

      misPubIds.length > 0
        ? supabase.from('comentarios')
            .select('contenido, created_at, publicacion_id, user_id, profiles!comentarios_user_id_fkey(nombre, foto_perfil_url), publicaciones!comentarios_publicacion_id_fkey(contenido)')
            .in('publicacion_id', misPubIds)
            .neq('user_id', usuario.id)
            .order('created_at', { ascending: false })
            .limit(15)
        : { data: [] },

      supabase.from('amigos')
        .select('id, estado, created_at, profiles!amigos_user_id_fkey(nombre, foto_perfil_url)')
        .eq('amigo_id', usuario.id)
        .order('created_at', { ascending: false })
        .limit(10),

      misPubIds.length > 0
        ? supabase.from('reposts')
            .select('created_at, publicacion_id, user_id, profiles!reposts_user_id_fkey(nombre, foto_perfil_url), publicaciones!reposts_publicacion_id_fkey(contenido)')
            .in('publicacion_id', misPubIds)
            .neq('user_id', usuario.id)
            .order('created_at', { ascending: false })
            .limit(10)
        : { data: [] },
    ])

    const todas = [
      ...(reacciones.data || []).map(r => ({
        id: `reac-${r.publicacion_id}-${r.user_id}-${r.tipo}`,
        tipo: r.tipo === 'corazon' ? 'like' : 'dislike',
        nombre: r.profiles?.nombre || 'Alguien',
        foto: r.profiles?.foto_perfil_url,
        texto: r.tipo === 'corazon' ? 'le dio me gusta a tu publicacion' : 'no le gusto tu publicacion',
        preview: r.publicaciones?.contenido?.slice(0, 50),
        fecha: r.created_at,
        nueva: vistasHasta ? new Date(r.created_at) > new Date(vistasHasta) : true
      })),
      ...(comentarios.data || []).map(c => ({
        id: `com-${c.publicacion_id}-${c.user_id}`,
        tipo: 'comentario',
        nombre: c.profiles?.nombre || 'Alguien',
        foto: c.profiles?.foto_perfil_url,
        texto: 'comento en tu publicacion',
        preview: c.contenido?.slice(0, 50),
        fecha: c.created_at,
        nueva: vistasHasta ? new Date(c.created_at) > new Date(vistasHasta) : true
      })),
      ...(solicitudes.data || []).map(s => ({
        id: `amigo-${s.id}`,
        tipo: s.estado === 'aceptado' ? 'amigo_aceptado' : 'solicitud',
        nombre: s.profiles?.nombre || 'Alguien',
        foto: s.profiles?.foto_perfil_url,
        texto: s.estado === 'aceptado' ? 'ahora es tu amigo' : 'te envio una solicitud de amistad',
        fecha: s.created_at,
        nueva: vistasHasta ? new Date(s.created_at) > new Date(vistasHasta) : true
      })),
      ...(repostsData.data || []).map(r => ({
        id: `repost-${r.publicacion_id}-${r.user_id}`,
        tipo: 'repost',
        nombre: r.profiles?.nombre || 'Alguien',
        foto: r.profiles?.foto_perfil_url,
        texto: 'compartio tu publicacion',
        preview: r.publicaciones?.contenido?.slice(0, 50),
        fecha: r.created_at,
        nueva: vistasHasta ? new Date(r.created_at) > new Date(vistasHasta) : true
      })),
    ]

    todas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    setNotificaciones(todas)
    setCargando(false)
  }

  async function limpiar() {
  const ahora = new Date().toISOString()
  const { error } = await supabase.from('notificaciones_vistas')
    .upsert({ user_id: usuario.id, vistas_hasta: ahora }, { onConflict: 'user_id' })
  if (error) {
    console.error('Error guardando vistas_hasta:', error)
    return
  }
  setNotificaciones(prev => prev.map(n => ({ ...n, nueva: false })))
}

  const hayNuevas = notificaciones.some(n => n.nueva)

  const iconoPorTipo = (tipo) => {
    if (tipo === 'like') return <Heart size={14} fill="#f43f5e" stroke="#f43f5e" />
    if (tipo === 'dislike') return <ThumbsDown size={14} style={{ color:'var(--accent-bright)' }} />
    if (tipo === 'comentario') return <MessageCircle size={14} style={{ color:'var(--accent-bright)' }} />
    if (tipo === 'solicitud') return <UserPlus size={14} style={{ color:'var(--success)' }} />
    if (tipo === 'amigo_aceptado') return <Check size={14} style={{ color:'var(--success)' }} />
    if (tipo === 'repost') return <Repeat2 size={14} style={{ color:'var(--success)' }} />
    return <Bell size={14} />
  }

  const colorPorTipo = (tipo) => {
    if (tipo === 'like') return 'rgba(244,63,94,0.12)'
    if (tipo === 'dislike') return 'var(--accent-muted)'
    if (tipo === 'comentario') return 'var(--accent-muted)'
    if (tipo === 'solicitud') return 'rgba(16,185,129,0.12)'
    if (tipo === 'amigo_aceptado') return 'rgba(16,185,129,0.12)'
    if (tipo === 'repost') return 'rgba(16,185,129,0.12)'
    return 'var(--surface-2)'
  }

  const formatearFecha = (fecha) => {
    const d = new Date(fecha)
    const ahora = new Date()
    const diff = Math.floor((ahora - d) / 1000)
    if (diff < 60) return 'Ahora'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
    return d.toLocaleDateString('es-CO', { day:'numeric', month:'short' })
  }

  const iniciales = (nombre) => nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both' }}>
      <style>{`
        .notif-row {
          display:flex; align-items:flex-start; gap:12px; padding:14px 20px;
          border-bottom:1px solid var(--border-subtle); transition:background 150ms ease;
          position:relative;
        }
        .notif-row:hover { background:var(--surface-2); }
        .notif-row:last-child { border-bottom:none; }
        .notif-row.nueva { background:var(--accent-muted); }
        .notif-row.nueva:hover { background:rgba(37,99,235,0.15); }
      `}</style>

      <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px', borderBottom:'1px solid var(--border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--ink-primary)', display:'flex', alignItems:'center', gap:8 }}>
            <Bell size={20} style={{ color:'var(--accent-bright)' }} /> Notificaciones
            {hayNuevas && (
              <span style={{ fontSize:11, fontWeight:700, background:'var(--accent)', color:'#fff', padding:'2px 8px', borderRadius:'var(--r-full)' }}>
                {notificaciones.filter(n => n.nueva).length} nuevas
              </span>
            )}
          </h2>
          {hayNuevas && (
            <button onClick={limpiar} style={{
              background:'none', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-sm)',
              padding:'5px 10px', color:'var(--ink-tertiary)', fontFamily:'DM Sans',
              fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, transition:'all 150ms ease'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent-bright)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.color='var(--ink-tertiary)' }}
            >
              <Check size={13} /> Marcar como vistas
            </button>
          )}
        </div>

        {/* Lista */}
        {cargando ? (
          <div style={{ padding:'48px', textAlign:'center', color:'var(--ink-tertiary)', fontSize:14 }}>Cargando...</div>
        ) : notificaciones.length === 0 ? (
          <div style={{ padding:'64px 24px', textAlign:'center' }}>
            <Bell size={48} style={{ margin:'0 auto 16px', display:'block', opacity:0.2, color:'var(--ink-tertiary)' }} />
            <p style={{ fontSize:15, fontWeight:500, color:'var(--ink-tertiary)', marginBottom:4 }}>Sin notificaciones</p>
            <p style={{ fontSize:13, color:'var(--ink-muted)' }}>Cuando alguien interactue contigo apareceran aqui</p>
          </div>
        ) : notificaciones.map(notif => (
          <div key={notif.id} className={`notif-row${notif.nueva ? ' nueva' : ''}`}>
            {/* Punto azul si es nueva */}
            {notif.nueva && (
              <div style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} />
            )}
            <div style={{ position:'relative', flexShrink:0 }}>
              {notif.foto ? (
                <img src={notif.foto} alt="avatar" style={{ width:44, height:44, borderRadius:'50%', objectFit:'cover', border:'1.5px solid var(--border-default)' }} />
              ) : (
                <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--accent-muted)', border:'1.5px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:14, fontFamily:'DM Mono' }}>
                  {iniciales(notif.nombre)}
                </div>
              )}
              <div style={{
                position:'absolute', bottom:-2, right:-2, width:22, height:22, borderRadius:'50%',
                background:colorPorTipo(notif.tipo), border:'2px solid var(--surface-1)',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                {iconoPorTipo(notif.tipo)}
              </div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:'0 0 2px', fontSize:14, color:'var(--ink-primary)', lineHeight:1.4 }}>
                <span style={{ fontWeight:700 }}>{notif.nombre}</span>{' '}{notif.texto}
              </p>
              {notif.preview && (
                <p style={{ margin:'0 0 4px', fontSize:12, color:'var(--ink-tertiary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  "{notif.preview}{notif.preview?.length >= 50 ? '...' : ''}"
                </p>
              )}
              <p style={{ margin:0, fontSize:11, color:'var(--ink-muted)' }}>{formatearFecha(notif.fecha)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}