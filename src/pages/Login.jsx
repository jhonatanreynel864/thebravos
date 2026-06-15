import { useState } from 'react'
import { supabase, esCorreoValido, DOMINIO_PERMITIDO } from '../lib/supabase'

export default function Login() {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [carrera, setCarrera] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [focusField, setFocusField] = useState(null)
  const [verTerminos, setVerTerminos] = useState(false)
  const [verPrivacidad, setVerPrivacidad] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!esCorreoValido(email)) {
      setError(`Solo correos @${DOMINIO_PERMITIDO}`)
      return
    }
    setCargando(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setCargando(false)
  }

  async function handleRegistro(e) {
    e.preventDefault()
    setError('')
    if (!esCorreoValido(email)) {
      setError(`Solo correos @${DOMINIO_PERMITIDO}`)
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (!aceptaTerminos) {
      setError('Debes aceptar los Términos y Condiciones para continuar')
      return
    }
    setCargando(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre, carrera } }
    })
    if (error) {
      setError(error.message)
    } else {
      setMensaje('Cuenta creada. Revisa tu correo para verificarla.')
    }
    setCargando(false)
  }

  return (
    <div style={{
      minHeight:'100vh', width:'100%', display:'flex',
      background:'var(--surface-base)', fontFamily:'DM Sans, sans-serif'
    }}>
      {/* Modal Términos */}
      {verTerminos && (
        <Modal titulo="Términos y Condiciones" onCerrar={() => setVerTerminos(false)}>
          <Seccion titulo="1. Aceptación">
            Al utilizar esta página web, el usuario acepta los presentes Términos y Condiciones.
          </Seccion>
          <Seccion titulo="2. Uso de la plataforma">
            El usuario se compromete a utilizar la plataforma de forma responsable y respetuosa.
          </Seccion>
          <Seccion titulo="3. Información proporcionada">
            El usuario es responsable de la veracidad de la información que registre en la plataforma.
          </Seccion>
          <Seccion titulo="4. Contenido subido por los usuarios">
            El usuario declara que posee los derechos necesarios sobre las fotografías y demás contenidos que cargue en la plataforma. No está permitido publicar contenido ilegal, ofensivo, difamatorio, discriminatorio o que vulnere derechos de terceros.
          </Seccion>
          <Seccion titulo="5. Eliminación de contenido">
            El administrador podrá eliminar contenido o suspender usuarios que incumplan estos términos.
          </Seccion>
          <Seccion titulo="6. Limitación de responsabilidad">
            La plataforma se ofrece con fines académicos y educativos. El administrador no será responsable por daños derivados del uso indebido del sitio.
          </Seccion>
          <Seccion titulo="7. Modificaciones">
            Los presentes términos podrán ser modificados cuando sea necesario para mejorar el servicio o cumplir requisitos legales.
          </Seccion>
        </Modal>
      )}

      {/* Modal Privacidad */}
      {verPrivacidad && (
        <Modal titulo="Política de Privacidad" onCerrar={() => setVerPrivacidad(false)}>
          <Seccion titulo="1. Información que recopilamos">
            Esta página web recopila: nombre completo, correo electrónico, fotografías cargadas por el usuario e información adicional que el usuario decida compartir.
          </Seccion>
          <Seccion titulo="2. Uso de la información">
            La información recopilada será utilizada únicamente para permitir el funcionamiento de la plataforma, gestionar cuentas de usuario, mostrar información dentro de la aplicación y mejorar la experiencia de los usuarios.
          </Seccion>
          <Seccion titulo="3. Almacenamiento de datos">
            Los datos proporcionados por los usuarios se almacenarán en una base de datos protegida y solo serán utilizados para los fines descritos en esta política.
          </Seccion>
          <Seccion titulo="4. Fotografías">
            Las imágenes cargadas por los usuarios serán almacenadas en el servidor y podrán ser visualizadas dentro de la plataforma según las funcionalidades disponibles.
          </Seccion>
          <Seccion titulo="5. Protección de la información">
            Se implementan medidas de seguridad razonables para proteger la información contra accesos no autorizados, pérdida o alteración.
          </Seccion>
          <Seccion titulo="6. Derechos del usuario">
            Los usuarios podrán solicitar la actualización o eliminación de sus datos personales contactando al administrador de la plataforma.
          </Seccion>
          <Seccion titulo="7. Cambios en la política">
            Esta Política de Privacidad puede ser modificada en cualquier momento. Los cambios serán publicados en esta misma página.
          </Seccion>
        </Modal>
      )}

      {/* Panel izquierdo */}
      <div style={{
        flex:1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:'48px',
        background:`linear-gradient(rgba(8,12,16,0.65), rgba(8,12,16,0.80)), url('/campus.jpg') center/cover no-repeat`,
        borderRight:'1px solid var(--border-subtle)',
        position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'relative', zIndex:1, maxWidth:320, width:'100%', textAlign:'center' }}>
          <div style={{
            width:110, height:110, borderRadius:'50%', background:'#2563eb',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 28px', boxShadow:'0 8px 32px rgba(37,99,235,0.4)'
          }}>
            <span style={{ color:'#fff', fontWeight:900, fontSize:'1.25rem', textAlign:'center', lineHeight:1.2, letterSpacing:'-0.5px' }}>the<br/>bravos</span>
          </div>
          <h1 style={{ fontSize:32, fontWeight:700, color:'#f0f4f8', letterSpacing:'-1px', lineHeight:1.1, marginBottom:12 }}>
            the bravos
          </h1>
          <p style={{ fontSize:15, color:'rgba(240,244,248,0.7)', lineHeight:1.6 }}>
            La plataforma exclusiva para estudiantes del Pascual Bravo.
          </p>
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{
        width:'100%', maxWidth:460, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        padding:'48px 40px', background:'var(--surface-1)',
        overflowY:'auto'
      }}>
        <div style={{ width:'100%', maxWidth:360 }}>
          <h2 style={{ fontSize:24, fontWeight:700, color:'var(--ink-primary)', letterSpacing:'-0.5px', marginBottom:6 }}>
            {modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h2>
          <p style={{ fontSize:14, color:'var(--ink-tertiary)', marginBottom:28 }}>
            {modo === 'login' ? 'Inicia sesion con tu correo institucional' : 'Registrate con tu correo institucional'}
          </p>

          {/* Tabs */}
          <div style={{ display:'flex', background:'var(--surface-2)', borderRadius:'var(--r-md)', padding:4, marginBottom:24, border:'1px solid var(--border-subtle)' }}>
            {['login', 'registro'].map(m => (
              <button key={m} onClick={() => { setModo(m); setError(''); setMensaje(''); setAceptaTerminos(false) }} style={{
                flex:1, padding:'8px 0', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer',
                fontFamily:'DM Sans', fontWeight:modo===m?600:400, fontSize:14,
                background:modo===m?'var(--accent)':'transparent',
                color:modo===m?'#fff':'var(--ink-tertiary)',
                transition:'background 180ms ease, color 180ms ease'
              }}>
                {m === 'login' ? 'Iniciar sesion' : 'Registrarse'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:13, marginBottom:16 }}>
              {error}
            </div>
          )}
          {mensaje && (
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', color:'#6ee7b7', padding:'10px 14px', borderRadius:'var(--r-sm)', fontSize:13, marginBottom:16 }}>
              {mensaje}
            </div>
          )}

          <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
            {modo === 'registro' && (
              <>
                <Campo label="Nombre completo" value={nombre} onChange={setNombre}
                  placeholder="Tu nombre" focus={focusField==='nombre'}
                  onFocus={() => setFocusField('nombre')} onBlur={() => setFocusField(null)} />
                <Campo label="Carrera" value={carrera} onChange={setCarrera}
                  placeholder="Tu carrera" focus={focusField==='carrera'}
                  onFocus={() => setFocusField('carrera')} onBlur={() => setFocusField(null)} />
              </>
            )}
            <Campo label="Correo institucional" value={email} onChange={setEmail}
              placeholder={`estudiante@${DOMINIO_PERMITIDO}`} type="email"
              focus={focusField==='email'}
              onFocus={() => setFocusField('email')} onBlur={() => setFocusField(null)} />
            <Campo label="Contraseña" value={password} onChange={setPassword}
              placeholder="••••••••" type="password"
              focus={focusField==='pass'}
              onFocus={() => setFocusField('pass')} onBlur={() => setFocusField(null)} />

            {/* Checkbox términos */}
            {modo === 'registro' && (
              <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', gap:10 }}>
                <input
                  type="checkbox"
                  id="terminos"
                  checked={aceptaTerminos}
                  onChange={e => setAceptaTerminos(e.target.checked)}
                  style={{ marginTop:3, width:16, height:16, cursor:'pointer', accentColor:'var(--accent)' }}
                />
                <label htmlFor="terminos" style={{ fontSize:13, color:'var(--ink-tertiary)', lineHeight:1.5, cursor:'pointer' }}>
                  He leído y acepto los{' '}
                  <span onClick={e => { e.preventDefault(); setVerTerminos(true) }} style={{ color:'var(--accent-bright)', cursor:'pointer', textDecoration:'underline' }}>
                    Términos y Condiciones
                  </span>
                  {' '}y la{' '}
                  <span onClick={e => { e.preventDefault(); setVerPrivacidad(true) }} style={{ color:'var(--accent-bright)', cursor:'pointer', textDecoration:'underline' }}>
                    Política de Privacidad
                  </span>
                </label>
              </div>
            )}

            <button type="submit" disabled={cargando || (modo === 'registro' && !aceptaTerminos)} style={{
              width:'100%', padding:'11px 0',
              background: cargando || (modo === 'registro' && !aceptaTerminos) ? 'var(--surface-3)' : 'var(--accent)',
              color: cargando || (modo === 'registro' && !aceptaTerminos) ? 'var(--ink-tertiary)' : '#fff',
              border:'none', borderRadius:'var(--r-md)',
              fontFamily:'DM Sans', fontWeight:600, fontSize:15,
              cursor: cargando || (modo === 'registro' && !aceptaTerminos) ? 'not-allowed' : 'pointer',
              marginTop:4, transition:'all 150ms ease',
              boxShadow: cargando || (modo === 'registro' && !aceptaTerminos) ? 'none' : '0 4px 16px var(--accent-glow)'
            }}>
              {cargando ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function Modal({ titulo, onCerrar, children }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', padding:24
    }} onClick={onCerrar}>
      <div style={{
        background:'var(--surface-1)', border:'1px solid var(--border-default)',
        borderRadius:'var(--r-xl)', padding:32, maxWidth:560, width:'100%',
        maxHeight:'80vh', overflowY:'auto'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--ink-primary)', margin:0 }}>{titulo}</h2>
          <button onClick={onCerrar} style={{ background:'none', border:'none', color:'var(--ink-tertiary)', cursor:'pointer', fontSize:20, padding:'4px 8px', borderRadius:'var(--r-sm)' }}>✕</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {children}
        </div>
        <button onClick={onCerrar} style={{
          width:'100%', padding:'10px 0', background:'var(--accent)',
          color:'#fff', border:'none', borderRadius:'var(--r-md)',
          fontFamily:'DM Sans', fontWeight:600, fontSize:14,
          cursor:'pointer', marginTop:24,
          boxShadow:'0 2px 8px var(--accent-glow)'
        }}>
          Entendido
        </button>
      </div>
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <p style={{ fontSize:13, fontWeight:700, color:'var(--accent-bright)', marginBottom:6 }}>{titulo}</p>
      <p style={{ fontSize:13, color:'var(--ink-secondary)', lineHeight:1.7, margin:0 }}>{children}</p>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type='text', focus, onFocus, onBlur }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{
        display:'block', fontSize:13, fontWeight:500,
        color: focus ? 'var(--accent-bright)' : 'var(--ink-tertiary)',
        marginBottom:6, transition:'color 150ms ease'
      }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required onFocus={onFocus} onBlur={onBlur}
        style={{
          width:'100%', padding:'10px 14px',
          border:`1px solid ${focus ? 'var(--accent)' : 'var(--border-default)'}`,
          borderRadius:'var(--r-sm)', background:'var(--surface-2)',
          color:'var(--ink-primary)', fontFamily:'DM Sans', fontSize:14,
          outline:'none',
          boxShadow: focus ? '0 0 0 3px var(--accent-muted)' : 'none',
          transition:'border-color 150ms ease, box-shadow 150ms ease'
        }} />
    </div>
  )
}