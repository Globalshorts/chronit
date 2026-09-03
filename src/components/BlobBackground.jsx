import { useEffect, useRef } from 'react'

const FRAG = `precision highp float;
uniform vec2 u_res; uniform float u_t;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  float asp=u_res.x/u_res.y;
  vec2 p=vec2(uv.x*asp,uv.y)*2.0;
  float t=u_t*0.13;
  float w=fbm(p*1.7 - t*1.0);
  float n=fbm(p*1.3 + vec2(t*1.2, t*0.8) + w*1.4);
  vec3 c1=vec3(0.0,0.39,1.0);
  vec3 c2=vec3(0.486,0.36,1.0);
  vec3 c3=vec3(0.133,0.827,0.933);
  vec3 col=mix(c1,c2,smoothstep(0.28,0.72,n));
  col=mix(col,c3,smoothstep(0.5,0.92,fbm(p*0.95+t*1.1)));
  vec3 base=vec3(0.956,0.961,0.969);
  col=mix(base,col,0.3);
  gl_FragColor=vec4(col,1.0);
}`

export default function BlobBackground() {
  const cvs = useRef(null)
  useEffect(() => {
    const canvas = cvs.current
    if (!canvas) return
    let gl
    try { gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') } catch { gl = null }
    if (!gl) { canvas.style.background = 'radial-gradient(60vw 44vw at 20% 10%, rgba(0,100,255,.35), transparent 60%), radial-gradient(56vw 44vw at 85% 90%, rgba(124,92,255,.3), transparent 60%), #f4f5f7'; return }
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
    let raf, last = 0, t0 = performance.now(), running = true
    const loop = (now) => { if (!running) return; if (now - last > 33) { last = now; gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform1f(uT, (now - t0) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3) } raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    const onVis = () => { running = !document.hidden; if (running) raf = requestAnimationFrame(loop) }
    document.addEventListener('visibilitychange', onVis)
    return () => { running = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return <canvas ref={cvs} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />
}
