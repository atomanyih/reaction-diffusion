const drawInitial = () => {
  const canvas = document.getElementById('initialImage');
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgb(255,0,0)';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgb(255,255,0)';
  const size = 100;
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2, size, size, Math.PI * .25, 0, Math.PI * 2);
  ctx.fill();

  return ctx
}

const regl = createREGL(document.getElementById('canvas'))
const RADIUS = Math.pow(2, 9)

const state = (Array(2)).fill().map(
  () =>
    regl.framebuffer({
      color: regl.texture({
        radius: RADIUS, // width AND height
        data: drawInitial(),
        wrap: 'repeat'
      }),
      depthStencil: false
    })
);

const parameters = regl.framebuffer({
  color: regl.texture({
    radius: RADIUS, // width AND height
    data: Array(RADIUS * RADIUS * 4).fill(255 * 0.27)
  }),
  depthStencil: false
})


const updateLife = regl({
  // language=GLSL
  frag: `
      precision mediump float;
      uniform sampler2D srcTexture;
      uniform sampler2D parameters;
      uniform float radius;
      varying vec2 uv;

      vec2 get(int dx, int dy) {
          return texture2D(srcTexture, uv + vec2(dx, dy)/radius).rg;
      }

      void main() {
          float da = 1.0;
          float db = texture2D(parameters, uv).r;

          float dt = 1.0;
          float feedRate = 0.037;
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
  uniforms: {
    srcTexture: regl.prop('srcTexture'),
    parameters: parameters
  },

  framebuffer: regl.prop('dstTexture')
})

const setupQuad = regl({
  // language=GLSL
  frag: `
      precision mediump float;
      uniform sampler2D srcTexture;
      varying vec2 uv;
      void main() {
          float a = texture2D(srcTexture, uv).r;
          float b = texture2D(srcTexture, uv).g;
          gl_FragColor = vec4(vec3(smoothstep(0.25, 0.3, b)), 1);
          //          gl_FragColor = vec4(vec3(step(0.25, b)), 1);
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
    srcTexture: regl.prop('srcTexture'),
    radius: RADIUS
  },

  depth: {enable: false},

  // 3 vertices
  count: 3
})

const drawParameters = regl({
  //language=GLSL
  frag: `
      precision mediump float;
      varying vec2 uv;

      void main() {
          float diffusionB = 0.27 * (uv.x + uv.y);
          gl_FragColor = vec4(vec3(diffusionB), 1);
      }
  `,
  //language=GLSL
  vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 uv;
      void main() {
          uv = 0.5 * (position + 1.0); //goes from 0 -> 1
          gl_Position = vec4(position, 0, 1);
      }`,

  uniforms: {
    radius: RADIUS
  },

  attributes: {
    position: [[-4, -4], [4, -4], [0, 4]]
  },

  depth: {enable: false},

  count: 3,
  framebuffer: regl.prop('dstTexture')
})

drawParameters({dstTexture: parameters});

regl.frame(() => {
  setupQuad({srcTexture: state[0]}, () => {
    regl.draw()
    updateLife({srcTexture: state[0], dstTexture: state[1]})
    updateLife({srcTexture: state[1], dstTexture: state[0]});
  })
})
