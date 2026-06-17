import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Heart, ThumbsDown, MessageCircle, Calendar, User, BookOpen, Trash2 } from 'lucide-react'

export default function PerfilUsuario({ usuarioId, onVolver }) {
  const { usuario } = useAuth()
  const [perfil, setPerfil] = useState(null)
  const [publicaciones, setPublicaciones] = useState([])
  const [encuestas, setEncuestas] = useState([])
  const [comparaciones, setComparaciones] = useState([])
  const [tabActiva, setTabActiva] = useState('publicaciones')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!usuarioId) return
    cargarTodo()
  }, [usuarioId])

  async function cargarTodo() {
    setCargando(true)
    const [perfilData, pubsData, encsData, compsData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', usuarioId).single(),
      supabase.from('publicaciones').select('*').eq('user_id', usuarioId).order('created_at', { ascending: false }),
      supabase.from('encuestas').select('*').eq('user_id', usuarioId).order('created_at', { ascending: false }),
      supabase.from('comparaciones').select('*').eq('user_id', usuarioId).order('created_at', { ascending: false }),
    ])
    if (perfilData.data) setPerfil(perfilData.data)
    if (pubsData.data) setPublicaciones(pubsData.data)
    if (encsData.data) setEncuestas(encsData.data)
    if (compsData.data) setComparaciones(compsData.data)
    setCargando(false)
  }

  const calcularEdad = (fecha) => {
    if (!fecha) return null
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  const iniciales = (nombre) => nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  if (cargando) return (
    <div style={{ textAlign:'center', padding:'64px', color:'var(--ink-tertiary)' }}>
      Cargando perfil...
    </div>
  )

  if (!perfil) return (
    <div style={{ textAlign:'center', padding:'64px', color:'var(--ink-tertiary)' }}>
      Perfil no encontrado
    </div>
  )

  const edad = calcularEdad(perfil.fecha_nacimiento)
  const tabs = [
    { id:'publicaciones', label:`Publicaciones (${publicaciones.length})` },
    { id:'encuestas', label:`Encuestas (${encuestas.length})` },
    { id:'fotos', label:`Fotos (${comparaciones.length})` },
  ]

  return (
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both' }}>
      <style>{`
        .perfil-tab { padding:10px 16px; background:none; border:none; border-bottom:2px solid transparent; color:var(--ink-tertiary); font-family:'DM Sans'; font-size:13px; font-weight:500; cursor:pointer; transition:all 150ms ease; }
        .perfil-tab:hover { color:var(--ink-secondary); }
        .perfil-tab.active { color:var(--accent-bright); border-bottom-color:var(--accent-bright); font-weight:600; }
        .pub-item { background:var(--surface-2); border:1px solid var(--border-subtle); border-radius:var(--r-lg); padding:16px; margin-bottom:12px; transition:border-color 150ms ease; }
        .pub-item:hover { border-color:var(--border-default); }
        .badge-info { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:var(--r-full); font-size:12px; font-weight:600; }
      `}</style>

      {/* Header */}
      <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', overflow:'hidden', marginBottom:16 }}>

        {/* Volver */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-subtle)' }}>
          <button onClick={onVolver} style={{
            background:'none', border:'none', cursor:'pointer', color:'var(--ink-tertiary)',
            display:'flex', alignItems:'center', gap:8, fontFamily:'DM Sans', fontSize:13,
            transition:'color 150ms ease', padding:0
          }}
            onMouseEnter={e => e.currentTarget.style.color='var(--ink-primary)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--ink-tertiary)'}
          >
            <ArrowLeft size={16} /> Volver
          </button>
        </div>

        {/* Info perfil */}
        <div style={{ padding:'24px 24px 0' }}>
          <div style={{ display:'flex', gap:20, alignItems:'flex-start', marginBottom:20 }}>
            {perfil.foto_perfil_url ? (
              <img src={perfil.foto_perfil_url} alt="perfil" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border-default)', flexShrink:0 }} />
            ) : (
              <div style={{ width:80, height:80, borderRadius:'50%', background:'var(--accent-muted)', border:'2px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:24, fontFamily:'DM Mono', flexShrink:0 }}>
                {iniciales(perfil.nombre)}
              </div>
            )}
            <div style={{ flex:1 }}>
              <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:700, color:'var(--ink-primary)' }}>{perfil.nombre}</h2>
              {perfil.carrera && <p style={{ margin:'0 0 10px', fontSize:14, color:'var(--ink-tertiary)' }}>{perfil.carrera}</p>}
              {perfil.presentacion && <p style={{ margin:'0 0 12px', fontSize:14, color:'var(--ink-secondary)', lineHeight:1.6 }}>{perfil.presentacion}</p>}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {perfil.sexo && (
                  <span className="badge-info" style={{ background:'var(--accent-muted)', color:'var(--accent-bright)' }}>
                    <User size={12} /> {perfil.sexo === 'masculino' ? 'Masculino' : perfil.sexo === 'femenino' ? 'Femenino' : 'Otro'}
                  </span>
                )}
                {edad !== null && (
                  <span className="badge-info" style={{ background:'var(--surface-2)', color:'var(--ink-tertiary)', border:'1px solid var(--border-subtle)' }}>
                    <Calendar size={12} /> {edad} años
                  </span>
                )}
                {perfil.situacion_sentimental && (
                  <span className="badge-info" style={{
                    background: perfil.situacion_sentimental === 'en relacion' ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
                    color: perfil.situacion_sentimental === 'en relacion' ? '#f43f5e' : 'var(--success)'
                  }}>
                    {perfil.situacion_sentimental === 'en relacion' ? '❤️ En relacion' : '💚 Soltero/a'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, borderTop:'1px solid var(--border-subtle)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTabActiva(t.id)} className={`perfil-tab${tabActiva===t.id?' active':''}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div>
        {tabActiva === 'publicaciones' && (
          publicaciones.length === 0 ? (
            <EmptyState icono={<BookOpen size={40} />} texto="Sin publicaciones aun" />
          ) : publicaciones.map(pub => (
            <div key={pub.id} className="pub-item">
              <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:8 }}>
                {new Date(pub.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}
              </p>
              {pub.contenido && <p style={{ fontSize:14, color:'var(--ink-primary)', lineHeight:1.6, margin:0 }}>{pub.contenido}</p>}
              {pub.imagen_url && (
                <img src={pub.imagen_url} alt="publicacion" style={{ width:'100%', maxHeight:300, objectFit:'cover', borderRadius:'var(--r-md)', marginTop:10, display:'block' }} />
              )}
            </div>
          ))
        )}

        {tabActiva === 'encuestas' && (
          encuestas.length === 0 ? (
            <EmptyState icono={<BookOpen size={40} />} texto="Sin encuestas aun" />
          ) : encuestas.map(enc => (
            <div key={enc.id} className="pub-item">
              <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:8 }}>
                {new Date(enc.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}
              </p>
              <p style={{ fontSize:15, fontWeight:600, color:'var(--ink-primary)', marginBottom:10 }}>{enc.pregunta}</p>
              {enc.opciones.map((op, i) => (
                <div key={i} style={{ padding:'8px 12px', background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-sm)', marginBottom:6, fontSize:13, color:'var(--ink-secondary)' }}>
                  {op}
                </div>
              ))}
            </div>
          ))
        )}

        {tabActiva === 'fotos' && (
          comparaciones.length === 0 ? (
            <EmptyState icono={<BookOpen size={40} />} texto="Sin comparaciones aun" />
          ) : comparaciones.map(comp => (
            <div key={comp.id} className="pub-item">
              <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:10 }}>
                {new Date(comp.created_at).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}
                {' · '}{(comp.votos_a||0) + (comp.votos_b||0)} votos
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <img src={comp.foto_a_url} alt="A" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:'var(--r-md)', display:'block' }} />
                <img src={comp.foto_b_url} alt="B" style={{ width:'100%', height:160, objectFit:'cover', borderRadius:'var(--r-md)', display:'block' }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EmptyState({ icono, texto }) {
  return (
    <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'48px', textAlign:'center', color:'var(--ink-tertiary)' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom:12, opacity:0.3 }}>{icono}</div>
      <p style={{ fontSize:14 }}>{texto}</p>
    </div>
  )
}