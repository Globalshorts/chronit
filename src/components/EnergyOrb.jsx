import { useEffect, useRef } from 'react'

// 베라 에너지 오브 — WebGL 셰이더(파란 유체 글로우). 색·속도 코드로 조절.
const FS = [
  'precision highp float;',
  'uniform vec2 u_res;uniform float u_time;',
  'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
  'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}',
  'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}',
  'void main(){',
  ' vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);',
  ' float t=u_time*.42;float r=length(uv);',
  ' float ang=atan(uv.y,uv.x);',
  ' vec2 q=uv+.22*vec2(cos(ang*3.+t*2.),sin(ang*2.-t*1.6))*smoothstep(.5,0.,r);',
  ' float n=fbm(q*3.2+vec2(t,-t*.7));',
  ' n=fbm(q*3.2+n*1.6+vec2(t*.6,t*.4));',
  ' float energy=pow(n,1.5);',
  ' vec3 c1=vec3(.04,.30,1.0);vec3 c2=vec3(.52,.22,1.0);vec3 c3=vec3(.20,.80,1.0);',
  ' vec3 col=mix(c1,c2,energy);col=mix(col,c3,smoothstep(.5,.92,energy)*.75);',
  ' col*=(.5+1.35*energy);',
  ' float orb=smoothstep(.47,.43,r);',
  ' float rim=smoothstep(.33,.46,r)*smoothstep(.485,.44,r);',
  ' col+=vec3(.22,.45,1.0)*rim*0.55;',
  ' col+=vec3(.3,.5,1.)*smoothstep(.32,0.,r)*.5;',
  ' float glow=smoothstep(.64,.44,r);',
  ' float alpha=clamp(orb+glow*.4,0.,1.);',
  ' col*=orb+.6*glow;',
  ' gl_FragColor=vec4(col,alpha);',
  '}'].join('\n')
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'

export default function EnergyOrb({ size = 84, className = '', style = {} }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr)
    const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: false }) || cv.getContext('experimental-webgl')
    if (!gl) return
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o }
    const pr = gl.createProgram()
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const uRes = gl.getUniformLocation(pr, 'u_res'), uT = gl.getUniformLocation(pr, 'u_time')
    const t0 = performance.now()
    let raf = 0, alive = true
    const frame = () => {
      if (!alive) return
      gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uRes, cv.width, cv.height); gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      alive = false; cancelAnimationFrame(raf)
      const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext()
    }
  }, [size])
  return <canvas ref={ref} className={className} style={{ width: size, height: size, display: 'block', ...style }} aria-hidden="true" />
}
