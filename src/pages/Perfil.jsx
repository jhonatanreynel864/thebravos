import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Perfil({ onVolver, onActualizar, tema, onToggleTema }) {
  const { usuario } = useAuth()
  const [nombre, setNombre] = useState('')
  const [carrera, setCarrera] = useState('')
  const [presentacion, setPresentacion] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [sexo, setSexo] = useState('')
  const [situacion, setSituacion] = useState('')
  const [fotoUrl, setFotoUrl] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [focusField, setFocusField] = useState(null)

  useEffect(() => {
    if (!usuario?.id) return
    cargarPerfil()
  }, [usuario])

  async function cargarPerfil() {
    const { data, error } = await supabase
      .from('profiles')
      .select('nombre, carrera, presentacion, fecha_nacimiento, sexo, situacion_sentimental, foto_perfil_url')
      .eq('id', usuario.id)
      .single()
    if (data) {
      setNombre(data.nombre || '')
      setCarrera(data.carrera || '')
      setPresentacion(data.presentacion || '')
      setFechaNacimiento(data.fecha_nacimiento || '')
      setSexo(data.sexo || '')
      setSituacion(data.situacion_sentimental || '')
      setFotoUrl(data.foto_perfil_url || null)
    }
  }

  async function subirFotoPerfil(archivo) {
    if (!archivo) return
    setSubiendoFoto(true)
    const ext = archivo.name.split('.').pop()
    const nombreArchivo = `${usuario.id}/perfil_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('fotos').upload(nombreArchivo, archivo)
    if (!error) {
      const { data } = supabase.storage.from('fotos').getPublicUrl(nombreArchivo)
      const url = data.publicUrl
      await supabase.from('profiles').update({ foto_perfil_url: url }).eq('id', usuario.id)
      setFotoUrl(url)
      if (onActualizar) onActualizar(prev => ({ ...prev, foto_perfil_url: url }))
    }
    setSubiendoFoto(false)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')
    setMensaje('')

    const updates = {
      nombre: nombre.trim(),
      carrera: carrera.trim(),
      presentacion: presentacion.trim() || null,
      fecha_nacimiento: fechaNacimiento || null,
      sexo: sexo || null,
      situacion_sentimental: situacion || null
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', usuario.id)

    if (error) {
      setError('Error al guardar. Intenta de nuevo.')
    } else {
      if (onActualizar) onActualizar(prev => ({ ...prev, nombre: nombre.trim() }))
      setMensaje('Perfil actualizado correctamente')
      setTimeout(() => setMensaje(''), 3000)
    }
    setGuardando(false)
  }

  const iniciales = nombre
    ? nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || '?'

  const calcularEdad = (fecha) => {
    if (!fecha) return null
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  const edad = calcularEdad(fechaNacimiento)

  return (
    <div style={{ minHeight:'100vh', width:'100%', background:'var(--surface-base)', fontFamily:'DM Sans, sans-serif', color:'var(--ink-primary)' }}>
      <style>{`
        .perfil-input { width:100%; padding:10px 14px; border:1px solid var(--border-subtle); border-radius:var(--r-md); background:var(--surface-2); color:var(--ink-primary); font-family:DM Sans; font-size:14px; outline:none; transition:border-color 150ms ease,box-shadow 150ms ease; }
        .perfil-input:focus { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-muted); }
        .perfil-input::placeholder { color:var(--ink-muted); }
        .toggle-btn { flex:1; padding:10px 0; border:none; border-radius:var(--r-md); cursor:pointer; font-family:DM Sans; font-size:13px; font-weight:500; transition:all 150ms ease; }
        .save-btn { width:100%; padding:11px 0; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:DM Sans; font-weight:600; font-size:15px; cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 12px var(--accent-glow); }
        .save-btn:hover { background:var(--accent-bright); transform:translateY(-1px); box-shadow:0 4px 20px var(--accent-glow); }
        .save-btn:disabled { background:var(--surface-3); color:var(--ink-tertiary); cursor:not-allowed; box-shadow:none; transform:none; }
        .back-btn { background:none; border:1px solid var(--border-subtle); border-radius:var(--r-sm); padding:6px 14px; color:var(--ink-tertiary); font-family:DM Sans; font-size:13px; cursor:pointer; transition:all 150ms ease; display:flex; align-items:center; gap:6px; }
        .back-btn:hover { border-color:var(--border-default); color:var(--ink-secondary); background:var(--surface-2); }
        .foto-wrap { position:relative; display:inline-block; cursor:pointer; }
        .foto-overlay { position:absolute; inset:0; border-radius:50%; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:4px; transition:background 200ms ease; }
        .foto-wrap:hover .foto-overlay { background:rgba(0,0,0,0.55); }
        .foto-overlay-content { opacity:0; transition:opacity 200ms ease; text-align:center; }
        .foto-wrap:hover .foto-overlay-content { opacity:1; }
        .badge { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:var(--r-full); font-size:12px; font-weight:600; }
      `}</style>

      {/* Header */}
      <header style={{ background:'var(--surface-1)', borderBottom:'1px solid var(--border-subtle)', padding:'0 24px', height:56, display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:10, width:'100%' }}>
        <button className="back-btn" onClick={onVolver}>← Volver</button>
        <span style={{ fontSize:15, fontWeight:600, color:'var(--ink-primary)' }}>Mi perfil</span>
        {mensaje && (
          <span style={{ marginLeft:'auto', fontSize:13, color:'var(--success)', background:'rgba(16,185,129,0.1)', padding:'4px 12px', borderRadius:'var(--r-full)', border:'1px solid rgba(16,185,129,0.2)' }}>
            {mensaje}
          </span>
        )}
        {error && (
          <span style={{ marginLeft:'auto', fontSize:13, color:'var(--danger)', background:'rgba(239,68,68,0.1)', padding:'4px 12px', borderRadius:'var(--r-full)', border:'1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </span>
        )}
      </header>

      <div style={{ maxWidth:640, margin:'0 auto', padding:'32px 24px' }}>

        {/* Tarjeta visual */}
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'32px 24px', marginBottom:20, textAlign:'center' }}>
          <div style={{ marginBottom:20 }}>
            <label className="foto-wrap">
              {fotoUrl ? (
                <img src={fotoUrl} alt="perfil" style={{ width:96, height:96, borderRadius:'50%', objectFit:'cover', display:'block', border:'2px solid var(--border-default)' }} />
              ) : (
                <div style={{ width:96, height:96, borderRadius:'50%', background:'var(--accent-muted)', border:'2px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--accent-bright)', fontWeight:700, fontSize:28, fontFamily:'DM Mono' }}>{iniciales}</div>
              )}
              <div className="foto-overlay">
                <div className="foto-overlay-content">
                  <span style={{ fontSize:24 }}>📷</span>
                  <p style={{ margin:0, fontSize:11, color:'#fff', fontWeight:600 }}>{subiendoFoto ? 'Subiendo...' : 'Cambiar'}</p>
                </div>
              </div>
              <input type="file" accept="image/*" onChange={e => { const f=e.target.files[0]; if(f) subirFotoPerfil(f) }} style={{ display:'none' }} />
            </label>
          </div>

          {nombre && (
            <>
              <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px', color:'var(--ink-primary)', margin:'0 0 4px' }}>{nombre}</h2>
              {carrera && <p style={{ fontSize:14, color:'var(--ink-tertiary)', margin:'0 0 12px' }}>{carrera}</p>}
              {presentacion && <p style={{ fontSize:14, color:'var(--ink-secondary)', lineHeight:1.6, margin:'0 0 16px', maxWidth:400, marginLeft:'auto', marginRight:'auto' }}>{presentacion}</p>}
              <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                {sexo && (
                  <span className="badge" style={{ background:'var(--accent-muted)', color:'var(--accent-bright)', border:'1px solid rgba(37,99,235,0.2)' }}>
                    {sexo === 'masculino' ? '♂ Masculino' : sexo === 'femenino' ? '♀ Femenino' : '⚧ Otro'}
                  </span>
                )}
                {situacion && (
                  <span className="badge" style={{
                    background: situacion === 'en relacion' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    color: situacion === 'en relacion' ? '#fca5a5' : '#6ee7b7',
                    border: `1px solid ${situacion === 'en relacion' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`
                  }}>
                    {situacion === 'en relacion' ? '❤️ En relacion' : '💚 Soltero/a'}
                  </span>
                )}
                {edad !== null && (
                  <span className="badge" style={{ background:'var(--surface-2)', color:'var(--ink-tertiary)', border:'1px solid var(--border-subtle)' }}>
                     {edad} años
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Formulario */}
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'24px' }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:20 }}>EDITAR INFORMACION</p>

          {/* Tema */}
<div style={{ marginBottom:24, padding:'16px', background:'var(--surface-2)', borderRadius:'var(--r-md)', border:'1px solid var(--border-subtle)' }}>
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
    <div>
      <p style={{ margin:0, fontSize:14, fontWeight:600, color:'var(--ink-primary)' }}>
        {tema === 'oscuro' ? '🌙 Tema oscuro' : '☀️ Tema claro'}
      </p>
      <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--ink-tertiary)' }}>
        Cambia la apariencia de la aplicacion
      </p>
    </div>
    <button type="button" onClick={onToggleTema} style={{
      width:52, height:28, borderRadius:14, border:'none', cursor:'pointer',
      background: tema === 'oscuro' ? 'var(--surface-3)' : 'var(--accent)',
      position:'relative', transition:'background 300ms ease',
      flexShrink:0
    }}>
      <div style={{
        position:'absolute', top:3, left: tema === 'oscuro' ? 3 : 27,
        width:22, height:22, borderRadius:'50%',
        background: tema === 'oscuro' ? 'var(--ink-tertiary)' : '#fff',
        transition:'left 300ms var(--ease-out)',
        boxShadow:'0 1px 4px rgba(0,0,0,0.3)'
      }}/>
    </button>
  </div>
</div>

          <form onSubmit={guardar}>
            <div style={{ marginBottom:16 }}>
              <label style={labelStyle(focusField==='nombre')}>Nombre completo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre" className="perfil-input"
                onFocus={() => setFocusField('nombre')} onBlur={() => setFocusField(null)} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle(focusField==='carrera')}>Carrera</label>
              <input value={carrera} onChange={e => setCarrera(e.target.value)}
                placeholder="Tu carrera" className="perfil-input"
                onFocus={() => setFocusField('carrera')} onBlur={() => setFocusField(null)} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle(focusField==='pres')}>Presentacion</label>
              <textarea value={presentacion} onChange={e => setPresentacion(e.target.value)}
                placeholder="Cuentale algo a tus compañeros..." rows={3}
                className="perfil-input" style={{ resize:'none', lineHeight:1.6 }}
                onFocus={() => setFocusField('pres')} onBlur={() => setFocusField(null)} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle(focusField==='fecha')}>Fecha de nacimiento</label>
              <input type="date" value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
                className="perfil-input" style={{ colorScheme:'dark' }}
                onFocus={() => setFocusField('fecha')} onBlur={() => setFocusField(null)} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={labelStyle()}>Sexo</label>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { valor:'masculino', label:'♂ Masculino' },
                  { valor:'femenino', label:'♀ Femenino' },
                  { valor:'otro', label:'⚧ Otro' }
                ].map(s => (
                  <button key={s.valor} type="button"
                    onClick={() => setSexo(sexo === s.valor ? '' : s.valor)}
                    className="toggle-btn" style={{
                      background: sexo === s.valor ? 'var(--accent-muted)' : 'var(--surface-2)',
                      border: sexo === s.valor ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      color: sexo === s.valor ? 'var(--accent-bright)' : 'var(--ink-tertiary)',
                      fontWeight: sexo === s.valor ? 600 : 400
                    }}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={labelStyle()}>Situacion sentimental</label>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { valor:'soltero', label:'💚 Soltero/a' },
                  { valor:'en relacion', label:'❤️ En relacion' }
                ].map(s => (
                  <button key={s.valor} type="button"
                    onClick={() => setSituacion(situacion === s.valor ? '' : s.valor)}
                    className="toggle-btn" style={{
                      background: situacion === s.valor
                        ? s.valor === 'en relacion' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'
                        : 'var(--surface-2)',
                      border: situacion === s.valor
                        ? s.valor === 'en relacion' ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(16,185,80,0.4)'
                        : '1px solid var(--border-subtle)',
                      color: situacion === s.valor
                        ? s.valor === 'en relacion' ? '#fca5a5' : '#6ee7b7'
                        : 'var(--ink-tertiary)',
                      fontWeight: situacion === s.valor ? 600 : 400
                    }}>{s.label}</button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={guardando} className="save-btn">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function labelStyle(focused) {
  return {
    display:'block', fontSize:12, fontWeight:600,
    letterSpacing:'0.04em',
    color: focused ? 'var(--accent-bright)' : 'var(--ink-tertiary)',
    marginBottom:6, transition:'color 150ms ease'
  }
}