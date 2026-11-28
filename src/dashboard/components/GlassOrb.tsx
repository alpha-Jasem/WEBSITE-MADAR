import { useEffect, useRef } from 'react'

// «اسأل مدار» orb: a glass bead with a slow cyan and violet liquid inside, drawn in a small WebGL shader.
// `energy` (0 to 1) speeds the liquid up and brightens it: hover, panel open, and while an answer is being written.

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'
const FS = `precision highp float;uniform float t,en;uniform vec2 res;
const vec3 c1=vec3(.02,.05,.2),c2=vec3(.1,.75,.95),c3=vec3(.49,.36,1.),c4=vec3(.8,.95,1.);
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec2 uv=(gl_FragCoord.xy/res)*2.-1.;float r=length(uv);float al=smoothstep(1.,.975,r);if(al<=0.){gl_FragColor=vec4(0.);return;}
vec3 nn=vec3(uv,sqrt(max(0.,1.-r*r)));float tt=t*(.12+en*.22);vec2 p=nn.xy*1.15+nn.z*.5;
vec2 q=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt*.8));vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+tt*.6),fbm(p+3.*q+vec2(8.3,2.8)-tt*.5));float f=fbm(p+3.*w);
vec3 col=mix(c1,c2,smoothstep(.3,.62,f));col=mix(col,c3,smoothstep(.5,.85,length(q)*1.1)*.8);col=mix(col,c4,smoothstep(.8,1.05,w.x*1.25)*(.7+en*.4));
float rg=1.-abs(2.*fbm(p*1.5+w*2.5+tt)-1.);col=mix(col,c4,pow(rg,6.)*.8);float rg2=1.-abs(2.*fbm(p*1.1-w*2.+tt*.7)-1.);col=mix(col,c3,pow(rg2,7.)*.7);
float fr=pow(1.-nn.z,2.4);col=mix(vec3(.02,.04,.12),col,smoothstep(.0,.9,f+.1));col*=.85+.5*fr;
col*=mix(.28,1.,pow(nn.z,.55));col=mix(col,vec3(.95,.97,1.),fr*.55);
vec3 L=normalize(vec3(-.45,.55,.7));col+=vec3(1.)*pow(max(dot(nn,L),0.),28.);
vec3 L2=normalize(vec3(.5,-.6,.55));col+=c3*pow(max(dot(nn,L2),0.),12.)*.35;
col*=1.+en*.25;gl_FragColor=vec4(col*al,al);}`

export function GlassOrb({ size, energy = 0 }: { size: number; energy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const target = useRef(energy)
  target.current = energy

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(size * dpr)
    canvas.width = px; canvas.height = px
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
    const fallback = () => { canvas.style.borderRadius = '50%'; canvas.style.background = 'radial-gradient(circle at 35% 30%, #cfeaff, #4b7bff 55%, #1b0f6a)' }
    if (!gl) { fallback(); return }
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const pr = gl.createProgram()!
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fallback(); return }
    gl.useProgram(pr)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(pr, 't'), uE = gl.getUniformLocation(pr, 'en')
    gl.uniform2f(gl.getUniformLocation(pr, 'res'), px, px)
    gl.viewport(0, 0, px, px); gl.clearColor(0, 0, 0, 0)

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const seed = Math.random() * 20
    const start = performance.now()
    let en = 0, raf = 0
    const draw = (now: number) => {
      en += (target.current - en) * 0.06
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(uT, (reduce ? 3 : (now - start) / 1000) + seed); gl.uniform1f(uE, en)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); gl.getExtension('WEBGL_lose_context')?.loseContext() }
  }, [size])

  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} aria-hidden="true" />
}
