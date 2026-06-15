import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Compass, Bookmark, GraduationCap, RotateCcw, ArrowRight, Palette, Settings, Cpu, Package, Zap, Bot, FlaskConical } from 'lucide-react'

const PREGUNTAS = [
  {
    texto: '¿Qué actividad te llama más la atención?',
    opciones: [
      { texto: 'Diseñar y crear cosas visuales', tags: ['diseno'] },
      { texto: 'Resolver problemas técnicos y mecánicos', tags: ['mecanica'] },
      { texto: 'Trabajar con sistemas y tecnología', tags: ['sistemas'] },
      { texto: 'Organizar procesos y logística', tags: ['logistica'] },
    ]
  },
  {
    texto: '¿En qué ambiente te imaginas trabajando?',
    opciones: [
      { texto: 'Un estudio creativo o de diseño', tags: ['diseno'] },
      { texto: 'Una planta industrial o taller', tags: ['mecanica', 'electronica'] },
      { texto: 'Una oficina con computadores', tags: ['sistemas'] },
      { texto: 'Una bodega o centro de distribución', tags: ['logistica'] },
    ]
  },
  {
    texto: '¿Qué materia te gustaba más en el colegio?',
    opciones: [
      { texto: 'Artes o dibujo', tags: ['diseno'] },
      { texto: 'Física o electricidad', tags: ['electronica', 'mecatronica'] },
      { texto: 'Tecnología e informática', tags: ['sistemas'] },
      { texto: 'Matemáticas aplicadas', tags: ['materiales', 'logistica'] },
    ]
  },
  {
    texto: '¿Qué tipo de proyecto te emociona más?',
    opciones: [
      { texto: 'Crear una marca o producto visual', tags: ['diseno'] },
      { texto: 'Construir o reparar maquinas', tags: ['mecanica', 'mecatronica'] },
      { texto: 'Programar una aplicacion', tags: ['sistemas'] },
      { texto: 'Mejorar un proceso de produccion', tags: ['materiales', 'logistica'] },
    ]
  },
  {
    texto: '¿Cómo te describirias mejor?',
    opciones: [
      { texto: 'Creativo y detallista', tags: ['diseno'] },
      { texto: 'Practico y manos a la obra', tags: ['mecanica', 'electronica'] },
      { texto: 'Analitico y logico', tags: ['sistemas', 'mecatronica'] },
      { texto: 'Organizado y estrategico', tags: ['logistica', 'materiales'] },
    ]
  },
]

const CARRERAS = {
  diseno: {
    nombre: 'Gestión del Diseño',
    facultad: 'Facultad de Produccion y Diseño',
    descripcion: 'Formate en la creacion, gestion y desarrollo de productos y proyectos de diseño con vision estrategica e innovadora.',
    icono: Palette
  },
  mecanica: {
    nombre: 'Tecnologia en Sistemas Mecanicos',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Aprende a diseñar, mantener y optimizar sistemas mecanicos industriales para el sector productivo.',
    icono: Settings
  },
  sistemas: {
    nombre: 'Ingenieria de Sistemas',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Desarrolla software, gestiona infraestructuras tecnologicas y resuelve problemas con programacion.',
    icono: Cpu
  },
  logistica: {
    nombre: 'Ingenieria en Logistica',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Especializate en la gestion de cadenas de suministro, transporte y distribucion de mercancias.',
    icono: Package
  },
  electronica: {
    nombre: 'Tecnologia en Electronica Industrial',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Trabaja con sistemas electronicos aplicados a la automatizacion de procesos industriales.',
    icono: Zap
  },
  mecatronica: {
    nombre: 'Tecnologia en Sistemas Mecatronicos',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Combina mecanica, electronica y programacion para crear sistemas automatizados inteligentes.',
    icono: Bot
  },
  materiales: {
    nombre: 'Ingenieria de Materiales',
    facultad: 'Facultad de Ingenieria',
    descripcion: 'Estudia, desarrolla y mejora materiales para aplicaciones industriales y tecnologicas.',
    icono: FlaskConical
  }
}

export default function Explorar() {
  const { usuario } = useAuth()
  const [vista, setVista] = useState('inicio') // inicio | test | resultado
  const [preguntaActual, setPreguntaActual] = useState(0)
  const [respuestas, setRespuestas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [carrerasGuardadas, setCarrerasGuardadas] = useState([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!usuario?.id) return
    cargarCarrerasGuardadas()
  }, [usuario])

  async function cargarCarrerasGuardadas() {
    const { data } = await supabase
      .from('carreras_guardadas')
      .select('carrera')
      .eq('user_id', usuario.id)
    if (data) setCarrerasGuardadas(data.map(c => c.carrera))
  }

  function responder(tags) {
    const nuevas = [...respuestas, tags]
    setRespuestas(nuevas)
    if (preguntaActual + 1 < PREGUNTAS.length) {
      setPreguntaActual(preguntaActual + 1)
    } else {
      calcularResultado(nuevas)
    }
  }

  function calcularResultado(todasRespuestas) {
    const conteo = {}
    todasRespuestas.flat().forEach(tag => {
      conteo[tag] = (conteo[tag] || 0) + 1
    })
    const mejorTag = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0]
    setResultado(CARRERAS[mejorTag])
    setVista('resultado')
  }

  function reiniciarTest() {
    setPreguntaActual(0)
    setRespuestas([])
    setResultado(null)
    setVista('test')
  }

  async function guardarCarrera(nombreCarrera) {
    if (carrerasGuardadas.includes(nombreCarrera)) return
    setGuardando(true)
    const { error } = await supabase.from('carreras_guardadas').insert({
      user_id: usuario.id, carrera: nombreCarrera
    })
    if (!error) setCarrerasGuardadas(prev => [...prev, nombreCarrera])
    setGuardando(false)
  }

  return (
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both' }}>
      <style>{`
        .opcion-test {
          display:block; width:100%; text-align:left; padding:16px 20px;
          background:var(--surface-2); border:1px solid var(--border-subtle);
          border-radius:var(--r-md); color:var(--ink-primary); font-family:'DM Sans';
          font-size:14px; cursor:pointer; margin-bottom:10px; transition:all 150ms ease;
        }
        .opcion-test:hover { border-color:var(--accent); background:var(--accent-muted); color:var(--accent-bright); transform:translateX(4px); }
        .progreso-bar { height:6px; background:var(--surface-2); border-radius:var(--r-full); overflow:hidden; margin-bottom:24px; }
        .progreso-fill { height:100%; background:var(--accent); transition:width 400ms var(--ease-out); border-radius:var(--r-full); }
        .carrera-card {
          background:var(--surface-1); border:1px solid var(--border-subtle);
          border-radius:var(--r-xl); padding:24px; transition:all 200ms ease;
        }
        .carrera-card:hover { border-color:var(--border-default); }
        .guardar-btn {
          padding:10px 24px; background:var(--accent); color:#fff; border:none;
          border-radius:var(--r-md); font-family:'DM Sans'; font-weight:700; font-size:13px;
          cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 8px var(--accent-glow);
        }
        .guardar-btn:hover { background:var(--accent-bright); transform:translateY(-1px); }
        .guardar-btn:disabled { background:var(--success); cursor:default; box-shadow:none; }
        .reiniciar-btn {
          padding:10px 24px; background:none; border:1px solid var(--border-default);
          border-radius:var(--r-md); color:var(--ink-secondary); font-family:'DM Sans';
          font-weight:600; font-size:13px; cursor:pointer; transition:all 150ms ease;
        }
        .reiniciar-btn:hover { border-color:var(--accent); color:var(--accent-bright); }
      `}</style>

      {/* Vista inicio */}
      {vista === 'inicio' && (
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'48px 32px', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16, color:'var(--accent-bright)' }}>
            <Compass size={56} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, color:'var(--ink-primary)', marginBottom:10 }}>
            Descubre tu camino
          </h2>
          <p style={{ fontSize:14, color:'var(--ink-tertiary)', maxWidth:420, margin:'0 auto 24px', lineHeight:1.7 }}>
            Responde 5 preguntas rapidas sobre tus gustos e intereses y te recomendaremos
            una carrera del Pascual Bravo que podria ir contigo.
          </p>
          <button onClick={() => setVista('test')} style={{
            padding:'12px 32px', background:'var(--accent)', color:'#fff', border:'none',
            borderRadius:'var(--r-md)', fontFamily:'DM Sans', fontWeight:700, fontSize:14,
            cursor:'pointer', boxShadow:'0 4px 16px var(--accent-glow)', transition:'all 150ms ease',
            display:'inline-flex', alignItems:'center', gap:8
          }}>Comenzar test <ArrowRight size={16} /></button>

          {carrerasGuardadas.length > 0 && (
            <div style={{ marginTop:40, textAlign:'left' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:12 }}>
                TUS CARRERAS GUARDADAS
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {carrerasGuardadas.map(nombre => (
                  <div key={nombre} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    background:'var(--surface-2)', borderRadius:'var(--r-md)', border:'1px solid var(--border-subtle)'
                  }}>
                    <GraduationCap size={18} style={{ color:'var(--accent-bright)' }} />
                    <span style={{ fontSize:14, color:'var(--ink-primary)', fontWeight:500 }}>{nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista test */}
      {vista === 'test' && (
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'32px' }}>
          <div className="progreso-bar">
            <div className="progreso-fill" style={{ width:`${((preguntaActual)/PREGUNTAS.length)*100}%` }} />
          </div>
          <p style={{ fontSize:12, color:'var(--ink-tertiary)', marginBottom:8 }}>
            Pregunta {preguntaActual + 1} de {PREGUNTAS.length}
          </p>
          <h3 style={{ fontSize:18, fontWeight:700, color:'var(--ink-primary)', marginBottom:20, lineHeight:1.4 }}>
            {PREGUNTAS[preguntaActual].texto}
          </h3>
          {PREGUNTAS[preguntaActual].opciones.map((op, i) => (
            <button key={i} className="opcion-test" onClick={() => responder(op.tags)}>
              {op.texto}
            </button>
          ))}
        </div>
      )}

      {/* Vista resultado */}
      {vista === 'resultado' && resultado && (
        <div className="carrera-card">
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--accent-bright)', letterSpacing:'0.1em', marginBottom:8 }}>
              TU CARRERA IDEAL ES
            </p>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:8, color:'var(--accent-bright)' }}>
              <resultado.icono size={56} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize:24, fontWeight:700, color:'var(--ink-primary)', marginBottom:6 }}>
              {resultado.nombre}
            </h2>
            <p style={{ fontSize:13, color:'var(--ink-tertiary)', marginBottom:16 }}>{resultado.facultad}</p>
            <p style={{ fontSize:14, color:'var(--ink-secondary)', lineHeight:1.7, maxWidth:480, margin:'0 auto 24px' }}>
              {resultado.descripcion}
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button
                className="guardar-btn"
                disabled={carrerasGuardadas.includes(resultado.nombre) || guardando}
                onClick={() => guardarCarrera(resultado.nombre)}
                style={{ display:'inline-flex', alignItems:'center', gap:8 }}
              >
                {carrerasGuardadas.includes(resultado.nombre)
                  ? <>✓ Guardada</>
                  : guardando ? 'Guardando...' : <><Bookmark size={15} /> Guardar carrera</>}
              </button>
              <button className="reiniciar-btn" onClick={reiniciarTest} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                <RotateCcw size={14} /> Repetir test
              </button>
              <button className="reiniciar-btn" onClick={() => setVista('inicio')}>Volver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 