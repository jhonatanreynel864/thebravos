import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Compass, Bookmark, GraduationCap, RotateCcw, ArrowRight,
  Palette, Settings, Cpu, Package, Zap, Bot, FlaskConical,
  Code2, Plug, Wrench, Car, Factory, Layers, Wind,
  BarChart3, Truck, ClipboardList, Shirt, PenTool,
  Film, Scissors, Printer, Cog, CircuitBoard, Cable,
  Gauge, ShoppingBag, Target, Building2, BookOpen, Rocket,
  Lightbulb, Globe, Gamepad2, Bug, Heart, Brain,
  ClipboardCheck, Shirt as ShirtIcon, Wind as WindIcon
} from 'lucide-react'

const PREGUNTAS = [
  {
    Icono: Target,
    texto: '¿Qué te emociona más hacer en tu tiempo libre?',
    opciones: [
      { Icono: Palette, texto: 'Dibujar, diseñar o crear cosas visuales', tags: ['diseno', 'grafico', 'vestuario', 'animacion'] },
      { Icono: Wrench, texto: 'Armar, desarmar o reparar aparatos', tags: ['mecanica', 'automotriz', 'industrial', 'electromecanico'] },
      { Icono: Cpu, texto: 'Programar, usar apps o jugar videojuegos', tags: ['software', 'desarrollo_sw', 'animacion'] },
      { Icono: Zap, texto: 'Experimentar con electricidad o electrónica', tags: ['electrica_tec', 'electronica', 'energia'] },
      { Icono: Package, texto: 'Organizar, planear y coordinar cosas', tags: ['logistica', 'logistica_tec', 'administrativa', 'industrial_ing'] },
    ]
  },
  {
    Icono: Building2,
    texto: '¿En qué ambiente te imaginas trabajando?',
    opciones: [
      { Icono: Palette, texto: 'Un estudio creativo lleno de colores', tags: ['diseno', 'grafico', 'vestuario', 'animacion', 'produccion_grafica'] },
      { Icono: Factory, texto: 'Una planta industrial o taller mecánico', tags: ['mecanica', 'industrial', 'automotriz', 'electromecanico', 'produccion_industrial'] },
      { Icono: Cpu, texto: 'Una oficina con computadores y código', tags: ['software', 'desarrollo_sw', 'administrativa'] },
      { Icono: Settings, texto: 'Una sala de máquinas o subestación eléctrica', tags: ['electrica_tec', 'electronica', 'energia', 'electromecanico'] },
      { Icono: Truck, texto: 'Una bodega, puerto o centro de distribución', tags: ['logistica', 'logistica_tec', 'industrial_ing'] },
    ]
  },
  {
    Icono: BookOpen,
    texto: '¿Cuál materia del colegio te gustaba más?',
    opciones: [
      { Icono: PenTool, texto: 'Artes, dibujo técnico o educación visual', tags: ['diseno', 'grafico', 'vestuario', 'produccion_grafica'] },
      { Icono: FlaskConical, texto: 'Física, química o ciencias naturales', tags: ['materiales', 'electrica_tec', 'mecanica', 'electromecanico'] },
      { Icono: Code2, texto: 'Tecnología e informática', tags: ['software', 'desarrollo_sw', 'animacion'] },
      { Icono: BarChart3, texto: 'Matemáticas y cálculo', tags: ['logistica', 'industrial_ing', 'administrativa', 'energia'] },
      { Icono: CircuitBoard, texto: 'Electricidad o electrónica básica', tags: ['electronica', 'electrica_tec', 'mecatronica', 'energia'] },
    ]
  },
  {
    Icono: Rocket,
    texto: '¿Cuál de estos proyectos te entusiasma más?',
    opciones: [
      { Icono: Shirt, texto: 'Diseñar una colección de ropa o una identidad visual', tags: ['vestuario', 'diseno', 'grafico', 'produccion_vestuario'] },
      { Icono: Bot, texto: 'Construir un robot o una máquina automatizada', tags: ['mecatronica', 'electromecanico', 'electronica'] },
      { Icono: Gamepad2, texto: 'Crear una app o un videojuego', tags: ['software', 'desarrollo_sw', 'animacion'] },
      { Icono: Printer, texto: 'Diseñar piezas industriales o hacer impresión 3D', tags: ['fabricacion_digital', 'materiales', 'mecanica', 'industrial'] },
      { Icono: ClipboardCheck, texto: 'Optimizar una cadena de suministro o empresa', tags: ['logistica', 'administrativa', 'industrial_ing', 'logistica_tec'] },
    ]
  },
  {
    Icono: Lightbulb,
    texto: '¿Cómo te describirías mejor?',
    opciones: [
      { Icono: Palette, texto: 'Creativo/a y con ojo para el detalle estético', tags: ['diseno', 'grafico', 'animacion', 'vestuario'] },
      { Icono: Wrench, texto: 'Práctico/a y bueno/a con las manos', tags: ['mecanica', 'automotriz', 'industrial', 'fabricacion_digital'] },
      { Icono: Brain, texto: 'Analítico/a y lógico/a', tags: ['software', 'materiales', 'mecatronica', 'energia'] },
      { Icono: ClipboardList, texto: 'Organizado/a y estratégico/a', tags: ['logistica', 'administrativa', 'industrial_ing', 'logistica_tec'] },
      { Icono: Zap, texto: 'Técnico/a y apasionado/a por la energía', tags: ['electrica_tec', 'electronica', 'energia', 'electromecanico'] },
    ]
  },
  {
    Icono: Globe,
    texto: '¿Cuál de estos temas te parece más interesante?',
    opciones: [
      { Icono: Film, texto: 'Animación, cine o producción multimedia', tags: ['animacion', 'produccion_grafica'] },
      { Icono: Car, texto: 'Motores, vehículos y mecánica automotriz', tags: ['automotriz', 'mecanica', 'electromecanico'] },
      { Icono: WindIcon, texto: 'Sostenibilidad energética y energías renovables', tags: ['energia', 'electrica_tec', 'electromecanico'] },
      { Icono: Truck, texto: 'Logística, importaciones y cadena de valor', tags: ['logistica', 'logistica_tec', 'industrial_ing'] },
      { Icono: ShirtIcon, texto: 'Moda, confección y tendencias de vestuario', tags: ['vestuario', 'produccion_vestuario', 'diseno'] },
    ]
  },
  {
    Icono: Gamepad2,
    texto: '¿Qué tipo de retos prefieres enfrentar?',
    opciones: [
      { Icono: Bug, texto: 'Encontrar y corregir errores en código', tags: ['software', 'desarrollo_sw'] },
      { Icono: Cog, texto: 'Reparar una máquina averiada bajo presión', tags: ['mecanica', 'industrial', 'automotriz', 'mantenimiento'] },
      { Icono: Heart, texto: 'Crear un diseño que enamore al cliente', tags: ['diseno', 'grafico', 'vestuario', 'produccion_grafica'] },
      { Icono: BarChart3, texto: 'Mejorar procesos para ahorrar tiempo y dinero', tags: ['administrativa', 'industrial_ing', 'logistica'] },
      { Icono: Plug, texto: 'Instalar y mantener sistemas eléctricos', tags: ['electrica_tec', 'electronica', 'energia'] },
    ]
  },
]

const CARRERAS = {
  materiales: { nombre:'Ingeniería de Materiales', facultad:'Facultad de Ingeniería', descripcion:'Estudia, desarrolla y mejora materiales para aplicaciones industriales y tecnológicas avanzadas.', icono: FlaskConical },
  software: { nombre:'Ingeniería de Software', facultad:'Facultad de Ingeniería', descripcion:'Diseña y desarrolla sistemas de software complejos aplicando ingeniería y buenas prácticas de programación.', icono: Code2 },
  electrica_tec: { nombre:'Ingeniería Eléctrica', facultad:'Facultad de Ingeniería', descripcion:'Diseña y gestiona sistemas de generación, transmisión y distribución de energía eléctrica.', icono: Plug },
  mecanica: { nombre:'Ingeniería Mecánica', facultad:'Facultad de Ingeniería', descripcion:'Diseña, construye y mantiene sistemas mecánicos industriales y de manufactura.', icono: Cog },
  fabricacion_digital: { nombre:'Técnica Profesional en Fabricación Digital e Impresión 3D', facultad:'Facultad de Ingeniería', descripcion:'Domina las tecnologías de fabricación digital, impresión 3D y manufactura aditiva.', icono: Printer },
  electrica: { nombre:'Tecnología Eléctrica', facultad:'Facultad de Ingeniería', descripcion:'Instala, opera y mantiene sistemas eléctricos industriales y residenciales.', icono: Cable },
  desarrollo_sw: { nombre:'Tecnología en Desarrollo de Software', facultad:'Facultad de Ingeniería', descripcion:'Crea aplicaciones web, móviles y de escritorio usando las tecnologías más modernas.', icono: Cpu },
  electronica: { nombre:'Tecnología en Electrónica Industrial', facultad:'Facultad de Ingeniería', descripcion:'Trabaja con sistemas electrónicos aplicados a la automatización de procesos industriales.', icono: CircuitBoard },
  mantenimiento: { nombre:'Tecnología en Gestión del Mantenimiento Aeronáutico', facultad:'Facultad de Ingeniería', descripcion:'Mantiene y repara aeronaves cumpliendo los más altos estándares de seguridad aeronáutica.', icono: Wind },
  automotriz: { nombre:'Tecnología en Mecánica Automotriz', facultad:'Facultad de Ingeniería', descripcion:'Diagnostica, repara y mantiene vehículos automotores con tecnología de punta.', icono: Car },
  industrial: { nombre:'Tecnología en Mecánica Industrial', facultad:'Facultad de Ingeniería', descripcion:'Opera y mantiene maquinaria industrial para optimizar los procesos de producción.', icono: Factory },
  electromecanico: { nombre:'Tecnología en Sistemas Electromecánicos', facultad:'Facultad de Ingeniería', descripcion:'Integra sistemas eléctricos y mecánicos para la automatización de procesos industriales.', icono: Settings },
  mecatronica: { nombre:'Tecnología en Sistemas Mecatrónicos', facultad:'Facultad de Ingeniería', descripcion:'Combina mecánica, electrónica y programación para crear sistemas automatizados inteligentes.', icono: Bot },
  energia: { nombre:'Tecnología en Supervisión de Sistemas de Generación y Distribución de Energía Eléctrica', facultad:'Facultad de Ingeniería', descripcion:'Supervisa y controla sistemas de generación y distribución de energía eléctrica a gran escala.', icono: Gauge },
  administrativa: { nombre:'Ingeniería Administrativa', facultad:'Facultad de Ingeniería', descripcion:'Combina ingeniería y administración para gestionar empresas y procesos productivos con eficiencia.', icono: BarChart3 },
  logistica: { nombre:'Ingeniería en Logística', facultad:'Facultad de Ingeniería', descripcion:'Especialízate en cadenas de suministro, transporte y distribución de mercancías a nivel global.', icono: Truck },
  industrial_ing: { nombre:'Ingeniería Industrial', facultad:'Facultad de Ingeniería', descripcion:'Optimiza procesos productivos y sistemas de manufactura para mejorar la eficiencia empresarial.', icono: ClipboardList },
  vestuario: { nombre:'Profesional en Diseño de Vestuario', facultad:'Facultad de Producción y Diseño', descripcion:'Diseña colecciones de moda innovadoras combinando creatividad, tendencias y técnica de confección.', icono: Shirt },
  grafico: { nombre:'Profesional en Diseño Gráfico', facultad:'Facultad de Producción y Diseño', descripcion:'Crea identidades visuales, publicidad y comunicación gráfica con impacto y creatividad.', icono: PenTool },
  diseno: { nombre:'Profesional en Gestión del Diseño', facultad:'Facultad de Producción y Diseño', descripcion:'Gestiona proyectos de diseño con visión estratégica, creatividad e innovación empresarial.', icono: Palette },
  animacion: { nombre:'Tecnología en Animación Digital', facultad:'Facultad de Producción y Diseño', descripcion:'Crea animaciones, efectos especiales y contenido multimedia para cine, TV y videojuegos.', icono: Film },
  produccion_vestuario: { nombre:'Tecnología en Diseño y Producción de Vestuario', facultad:'Facultad de Producción y Diseño', descripcion:'Diseña y produce prendas de vestir dominando técnicas de confección y patronaje profesional.', icono: Scissors },
  produccion_grafica: { nombre:'Tecnología en Diseño y Producción Gráfica', facultad:'Facultad de Producción y Diseño', descripcion:'Produce piezas gráficas para medios impresos y digitales con dominio técnico y creativo.', icono: Layers },
  logistica_tec: { nombre:'Tecnología en Gestión Logística', facultad:'Facultad de Ingeniería', descripcion:'Gestiona operaciones logísticas, inventarios y distribución para optimizar cadenas de suministro.', icono: Package },
  produccion_industrial: { nombre:'Tecnología en Producción Industrial', facultad:'Facultad de Ingeniería', descripcion:'Supervisa y mejora procesos de producción industrial aplicando técnicas de manufactura moderna.', icono: ShoppingBag },
}

export default function Explorar({ onCarreraGuardada }) {
  const { usuario } = useAuth()
  const [vista, setVista] = useState('inicio')
  const [preguntaActual, setPreguntaActual] = useState(0)
  const [respuestas, setRespuestas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [carrerasGuardadas, setCarrerasGuardadas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [animandoOpcion, setAnimandoOpcion] = useState(null)
  const [animandoEntrada, setAnimandoEntrada] = useState(false)

  useEffect(() => {
    if (!usuario?.id) return
    cargarCarrerasGuardadas()
  }, [usuario])

  async function cargarCarrerasGuardadas() {
    const { data } = await supabase
      .from('carreras_guardadas').select('carrera').eq('user_id', usuario.id)
    if (data) setCarrerasGuardadas(data.map(c => c.carrera))
  }

  function responder(tags, index) {
    setAnimandoOpcion(index)
    setTimeout(() => {
      setAnimandoOpcion(null)
      setAnimandoEntrada(true)
      const nuevas = [...respuestas, tags]
      setRespuestas(nuevas)
      if (preguntaActual + 1 < PREGUNTAS.length) {
        setPreguntaActual(preguntaActual + 1)
        setTimeout(() => setAnimandoEntrada(false), 400)
      } else {
        calcularResultado(nuevas)
      }
    }, 350)
  }

  function calcularResultado(todasRespuestas) {
    const conteo = {}
    todasRespuestas.flat().forEach(tag => {
      conteo[tag] = (conteo[tag] || 0) + 1
    })
    const mejorTag = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0]
    const carrera = CARRERAS[mejorTag] || CARRERAS['software']
    setResultado(carrera)
    setVista('resultado')
  }

  function reiniciarTest() {
    setPreguntaActual(0)
    setRespuestas([])
    setResultado(null)
    setAnimandoEntrada(false)
    setVista('test')
  }

  async function guardarCarrera(nombreCarrera) {
    if (carrerasGuardadas.includes(nombreCarrera)) return
    setGuardando(true)
    const { error } = await supabase.from('carreras_guardadas')
      .insert({ user_id: usuario.id, carrera: nombreCarrera })
    if (!error) {
      setCarrerasGuardadas(prev => [...prev, nombreCarrera])
      if (onCarreraGuardada) onCarreraGuardada()
    }
    setGuardando(false)
  }

  const pregunta = PREGUNTAS[preguntaActual]
  const progreso = Math.round((preguntaActual / PREGUNTAS.length) * 100)

  return (
    <div style={{ animation:'fadeUp 300ms var(--ease-out) both' }}>
      <style>{`
        @keyframes opcionSeleccionada {
          0% { transform:scale(1); }
          30% { transform:scale(0.97); }
          60% { transform:scale(1.03); background: var(--accent); color: #fff; }
          100% { transform:scale(1); }
        }
        @keyframes entradaPregunta {
          from { opacity:0; transform:translateX(32px); }
          to { opacity:1; transform:translateX(0); }
        }
        @keyframes salidaPregunta {
          from { opacity:1; transform:translateX(0); }
          to { opacity:0; transform:translateX(-32px); }
        }
        .opcion-test {
          display:block; width:100%; text-align:left; padding:14px 20px;
          background:var(--surface-2); border:1.5px solid var(--border-subtle);
          border-radius:var(--r-lg); color:var(--ink-primary); font-family:'DM Sans';
          font-size:14px; cursor:pointer; margin-bottom:10px;
          transition:border-color 150ms ease, background 150ms ease, transform 150ms ease;
          line-height:1.5;
        }
        .opcion-test:hover {
          border-color:var(--accent); background:var(--accent-muted);
          color:var(--accent-bright); transform:translateX(6px);
        }
        .opcion-test.seleccionada {
          animation: opcionSeleccionada 350ms ease forwards;
          border-color:var(--accent);
        }
        .pregunta-container {
          animation: entradaPregunta 350ms var(--ease-out) both;
        }
        .pregunta-container.saliendo {
          animation: salidaPregunta 200ms ease forwards;
        }
        .progreso-bar { height:8px; background:var(--surface-3); border-radius:var(--r-full); overflow:hidden; margin-bottom:28px; }
        .progreso-fill { height:100%; background:linear-gradient(90deg, var(--accent), var(--accent-bright)); transition:width 500ms var(--ease-out); border-radius:var(--r-full); }
        .carrera-card { background:var(--surface-1); border:1px solid var(--border-subtle); border-radius:var(--r-xl); padding:32px; }
        .guardar-btn { padding:10px 24px; background:var(--accent); color:#fff; border:none; border-radius:var(--r-md); font-family:'DM Sans'; font-weight:700; font-size:13px; cursor:pointer; transition:all 150ms ease; box-shadow:0 2px 8px var(--accent-glow); display:inline-flex; align-items:center; gap:8px; }
        .guardar-btn:hover { background:var(--accent-bright); transform:translateY(-1px); box-shadow:0 4px 16px var(--accent-glow); }
        .guardar-btn:disabled { background:var(--success); cursor:default; box-shadow:none; transform:none; }
        .reiniciar-btn { padding:10px 24px; background:none; border:1px solid var(--border-default); border-radius:var(--r-md); color:var(--ink-secondary); font-family:'DM Sans'; font-weight:600; font-size:13px; cursor:pointer; transition:all 150ms ease; display:inline-flex; align-items:center; gap:8px; }
        .reiniciar-btn:hover { border-color:var(--accent); color:var(--accent-bright); }
        .paso-badge { display:inline-flex; align-items:center; gap:6px; background:var(--accent-muted); color:var(--accent-bright); padding:4px 12px; border-radius:var(--r-full); font-size:12px; font-weight:700; margin-bottom:12px; }
      `}</style>

      {/* Vista inicio */}
      {vista === 'inicio' && (
        <div style={{ background:'var(--surface-1)', border:'1px solid var(--border-subtle)', borderRadius:'var(--r-xl)', padding:'48px 32px', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:16, color:'var(--accent-bright)' }}>
            <Compass size={56} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize:24, fontWeight:700, color:'var(--ink-primary)', marginBottom:10 }}>
            Descubre tu camino
          </h2>
          <p style={{ fontSize:14, color:'var(--ink-tertiary)', maxWidth:440, margin:'0 auto 8px', lineHeight:1.7 }}>
            Responde <strong>7 preguntas</strong> sobre tus gustos e intereses y te recomendaremos
            una carrera del <strong>Pascual Bravo</strong> que podría ir contigo.
          </p>
          <p style={{ fontSize:13, color:'var(--ink-muted)', marginBottom:28 }}>
            25 programas disponibles · 2 minutos
          </p>
          <button onClick={() => setVista('test')} style={{
            padding:'13px 36px', background:'var(--accent)', color:'#fff', border:'none',
            borderRadius:'var(--r-md)', fontFamily:'DM Sans', fontWeight:700, fontSize:15,
            cursor:'pointer', boxShadow:'0 4px 20px var(--accent-glow)', transition:'all 150ms ease',
            display:'inline-flex', alignItems:'center', gap:10
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px var(--accent-glow)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 20px var(--accent-glow)' }}
          >
            Comenzar test <ArrowRight size={18} />
          </button>

          {carrerasGuardadas.length > 0 && (
            <div style={{ marginTop:40, textAlign:'left' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:12 }}>
                TUS CARRERAS GUARDADAS
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {carrerasGuardadas.map(nombre => (
                  <div key={nombre} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--surface-2)', borderRadius:'var(--r-md)', border:'1px solid var(--border-subtle)' }}>
                    <GraduationCap size={18} style={{ color:'var(--accent-bright)', flexShrink:0 }} />
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
            <div className="progreso-fill" style={{ width:`${progreso}%` }} />
          </div>

          <div className={`pregunta-container${animandoEntrada ? ' saliendo' : ''}`}>
            <div className="paso-badge">
              <pregunta.Icono size={14} />
              Pregunta {preguntaActual + 1} de {PREGUNTAS.length}
            </div>
            <h3 style={{ fontSize:19, fontWeight:700, color:'var(--ink-primary)', marginBottom:20, lineHeight:1.4 }}>
              {pregunta.texto}
            </h3>
            {pregunta.opciones.map((op, i) => (
              <button
                key={i}
                className={`opcion-test${animandoOpcion === i ? ' seleccionada' : ''}`}
                onClick={() => animandoOpcion === null && responder(op.tags, i)}
                disabled={animandoOpcion !== null}
                style={{ display:'flex', alignItems:'center', gap:12 }}
              >
                <op.Icono size={18} style={{ flexShrink:0, opacity:0.85 }} />
                {op.texto}
              </button>
            ))}
          </div>

          <button onClick={() => { setPreguntaActual(0); setRespuestas([]); setVista('inicio') }} style={{
            background:'none', border:'none', color:'var(--ink-muted)', fontSize:13,
            cursor:'pointer', fontFamily:'DM Sans', marginTop:16, display:'flex', alignItems:'center', gap:6
          }}>
            <RotateCcw size={13} /> Cancelar test
          </button>
        </div>
      )}

      {/* Vista resultado */}
      {vista === 'resultado' && resultado && (() => {
        const IconoCarrera = resultado.icono
        return (
          <div className="carrera-card">
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--accent-bright)', letterSpacing:'0.12em', marginBottom:12 }}>
                🎉 TU CARRERA IDEAL ES
              </p>
              <div style={{
                width:80, height:80, borderRadius:'50%', background:'var(--accent-muted)',
                border:'2px solid var(--accent)', display:'flex', alignItems:'center',
                justifyContent:'center', margin:'0 auto 16px', color:'var(--accent-bright)'
              }}>
                <IconoCarrera size={36} strokeWidth={1.5} />
              </div>
              <h2 style={{ fontSize:22, fontWeight:700, color:'var(--ink-primary)', marginBottom:6, lineHeight:1.3 }}>
                {resultado.nombre}
              </h2>
              <p style={{ fontSize:13, color:'var(--accent-bright)', fontWeight:600, marginBottom:16 }}>
                {resultado.facultad}
              </p>
              <p style={{ fontSize:14, color:'var(--ink-secondary)', lineHeight:1.7, maxWidth:500, margin:'0 auto 28px' }}>
                {resultado.descripcion}
              </p>
              <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <button
                  className="guardar-btn"
                  disabled={carrerasGuardadas.includes(resultado.nombre) || guardando}
                  onClick={() => guardarCarrera(resultado.nombre)}
                >
                  {carrerasGuardadas.includes(resultado.nombre)
                    ? <><span>✓</span> Guardada</>
                    : guardando ? 'Guardando...' : <><Bookmark size={15} /> Guardar carrera</>
                  }
                </button>
                <button className="reiniciar-btn" onClick={reiniciarTest}>
                  <RotateCcw size={14} /> Repetir test
                </button>
                <button className="reiniciar-btn" onClick={() => setVista('inicio')}>
                  Volver
                </button>
              </div>
            </div>

            {/* Otras carreras relacionadas */}
            <div style={{ borderTop:'1px solid var(--border-subtle)', paddingTop:24, marginTop:8 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--ink-tertiary)', letterSpacing:'0.05em', marginBottom:14 }}>
                TAMBIÉN PODRÍAN GUSTARTE
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {Object.entries(CARRERAS)
                  .filter(([_, c]) => c.nombre !== resultado.nombre)
                  .slice(0, 4)
                  .map(([key, c]) => {
                    const Icono = c.icono
                    return (
                      <div key={key} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                        background:'var(--surface-2)', borderRadius:'var(--r-md)',
                        border:'1px solid var(--border-subtle)', cursor:'pointer',
                        transition:'all 150ms ease'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.background='var(--accent-muted)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-subtle)'; e.currentTarget.style.background='var(--surface-2)' }}
                        onClick={() => guardarCarrera(c.nombre)}
                      >
                        <Icono size={18} style={{ color:'var(--accent-bright)', flexShrink:0 }} />
                        <span style={{ fontSize:12, color:'var(--ink-primary)', fontWeight:500, lineHeight:1.3 }}>{c.nombre}</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}