const drawInitial = () => {
  const canvas = document.getElementById('initialImage');
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'green';
  const size = 100;
  ctx.fillRect(width / 2 - size/2, height / 2 - size/2, size, size);

  return ctx
}

const regl = createREGL(document.getElementById('canvas'))
const RADIUS = Math.pow(2, 9)

const state = (Array(2)).fill().map(() =>
  regl.framebuffer({
    color: regl.texture({
      radius: RADIUS, // width AND height
      data: drawInitial(),
      wrap: 'repeat'
    }),
    depthStencil: false
  }))

const updateLife = regl({
  // language=GLSL
  frag: `
      precision mediump float;
      uniform sampler2D prevState;
      uniform float radius;
      varying vec2 uv;

      vec2 get(int dx, int dy) {
          return texture2D(prevState, uv + vec2(dx, dy)/radius).rg;
      }

      void main() {
          float da = 1.0;
          float db = 0.3;
          float dt = 1.0;
          float feedRate = 0.027;
          float killRate = 0.0549;

          vec2 ab = get(0, 0).rg;

          vec2 laplaceAB =
            get(-1, -1) * 0.05 +
            get(0, -1) * 0.2 +
            get(1, -1) * 0.05 +
            get(-1, 0) * 0.2 +
            ab * -1.0 +
            get(1, 0) * 0.2 +
            get(-1, 1) * 0.05 +
            get(0, 1) * 0.2 +
            get(1, 1) * 0.05;

          float a = ab.r;
          float b = ab.g;

          float reaction = a*b*b;

          float ap = a + (da * laplaceAB.r - reaction + feedRate * (1.0 - a)) * dt;
          float bp = b + (db * laplaceAB.g + reaction - (feedRate + killRate) * b) * dt;

          gl_FragColor = vec4(ap, bp, 0, 1);
      }`,

  framebuffer: ({tick}) => state[(tick + 1) % 2]
})

const setupQuad = regl({
  // language=GLSL
  frag: `
      precision mediump float;
      uniform sampler2D prevState;
      varying vec2 uv;
      void main() {
          float a = texture2D(prevState, uv).r;
          float b = texture2D(prevState, uv).g;
          gl_FragColor = vec4(vec3(1)*smoothstep(0.1, 0.6, b), 1);
      }`,

  // language=GLSL
  vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
          uv = 0.5 * (position + 1.0);
          gl_Position = vec4(position, 0, 1);
      }`,

  attributes: {
    position: [[-4, -4], [4, -4], [0, 4]] // big triangle outside of screen
  },

  uniforms: {
    prevState: ({tick}) => state[tick % 2],
    radius: RADIUS
  },

  depth: {enable: false},

  // 3 vertices
  count: 3
})

regl.frame(() => {
  setupQuad(() => {
    regl.draw()
    updateLife()
  })
})
