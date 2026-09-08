import { useEffect, useRef } from 'react'

const STATIC_BG =
  'radial-gradient(60vw 44vw at 20% 8%, rgba(0,100,255,.13), transparent 60%), radial-gradient(56vw 44vw at 85% 92%, rgba(124,92,255,.10), transparent 60%), linear-gradient(180deg,#0b0d13,#0a0b0f)'

const FRAG = `precision mediump float;
uniform vec2 u_res; uniform float u_t;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<3;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  float asp=u_res.x/u_res.y;
  vec2 p=vec2(uv.x*asp,uv.y);
  float t=u_t*0.09;
  vec2 q=p*3.0 + vec2(t,0.0);
  float billow=fbm(q + fbm(q*0.6 + t*0.3)*1.3);
  float clouds=smoothstep(0.46,0.86,billow);
  vec3 skyTop=vec3(0.055,0.065,0.105);
  vec3 skyBot=vec3(0.02,0.022,0.035);
  vec3 sky=mix(skyBot,skyTop,uv.y);
  sky=mix(sky, vec3(0.03,0.09,0.22), 0.22);
  vec3 cloud=vec3(0.11,0.14,0.22);
  vec3 col=mix(sky, cloud, clouds*0.5);
  gl_FragColor=vec4(col,1.0);
}`

export default function BlobBackground() {
  const cvs = useRef(null)
  useEffect(() => {
    const canvas = cvs.current
    if (!canvas) return

    // 모바일 / 저사양 / 모션 최소화 선호 → WebGL 루프 없이 정적 그라디언트
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 767px)').matches
    if (reduce || isMobile) { canvas.style.background = STATIC_BG; return }

    let gl
    try { gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') } catch { gl = null }
    if (!gl) { canvas.style.background = STATIC_BG; return }

    const vsh = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vsh, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}'); gl.compileShader(vsh)
    const fsh = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fsh, FRAG); gl.compileShader(fsh)
    const prog = gl.createProgram(); gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog); gl.useProgram(prog)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uRes = gl.getUniformLocation(prog, 'u_res'), uT = gl.getUniformLocation(prog, 'u_t')
    const resize = () => { const s = 0.5; canvas.width = Math.max(2, Math.floor(innerWidth * s)); canvas.height = Math.max(2, Math.floor(innerHeight * s)); gl.viewport(0, 0, canvas.width, canvas.height) }
    resize(); addEventListener('resize', resize)

    let raf = 0, last = 0, t0 = performance.now()
    let paused = false          // 첫 화면 벗어나면 정지(배경이 콘텐츠에 가려짐)
    let hidden = false          // 탭 비활성
    const active = () => !paused && !hidden
    const frame = (now) => {
      raf = 0
      if (!active()) return
      if (now - last > 45) {    // ~22fps
        last = now
        gl.uniform2f(uRes, canvas.width, canvas.height)
        gl.uniform1f(uT, (now - t0) / 1000)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      raf = requestAnimationFrame(frame)
    }
    const kick = () => { if (active() && !raf) raf = requestAnimationFrame(frame) }

    const onScroll = () => { const p = window.scrollY > innerHeight * 1.25; if (p !== paused) { paused = p; kick() } }
    const onVis = () => { hidden = document.hidden; kick() }
    addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVis)
    kick()

    return () => {
      paused = true; if (raf) cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return <canvas ref={cvs} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />
}
