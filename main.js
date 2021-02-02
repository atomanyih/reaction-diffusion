// (() => {
//   const regl = createREGL()
//
//   const drawTriangle = regl({
//     // fragment shader
//     // language=GLSL
//     frag: `
//         precision mediump float;
//         uniform vec4 color;
//         void main () {
//             gl_FragColor = color;
//         }`,
//
//     // vertex shader
//     // language=GLSL
//     vert: `
//         precision mediump float;
//         attribute vec2 position;
//         void main () {
//             gl_Position = vec4(position, 0, 1);
//         }`,
//
//     // attributes
//     attributes: {
//       position: function(context, props) {
//         return [
//           [-1 * Math.cos(context.tick / 100), 0],
//           [Math.sin(context.tick / 100), -1],
//           [Math.sin(context.tick / 100), 1]
//         ];
//       }
//     },
//
//     // uniforms
//     uniforms: {
//       // color: function(context, props) {
//       //   return props.color;
//       // }
//       color: regl.prop('color'),
//     },
//
//     // vertex count
//     count: 3
//   });
//
//   // regl.frame(function(context) {
//   //   drawTriangle({color: [Math.sin(context.tick / 100),1,0,1]});
//   // });
// })()

// const regl = createREGL()
//
// const drawDots = regl({
//   // language=GLSL
//   frag: `
//   precision mediump float;
//   uniform vec4 color;
//   void main () {
//     gl_FragColor = color;
//   }`,
//
//   // language=GLSL
//   vert: `
//   precision mediump float;
//   attribute vec2 position;
//   // @change acquire the pointWidth uniform
//   //  this is set by the uniforms section below
//   uniform float pointWidth;
//
//   void main () {
//     // @change Set gl_PointSize global to
//     //  configure point size
//     gl_PointSize = pointWidth;
//     gl_Position = vec4(position, 0, 1);
//   }`,
//
//   attributes: {
//     position: function(context, props) {
//       // @change I tweaked the constants here so
//       //  the dots are not off the screen
//       return [
//         [-1 * Math.cos(context.tick / 100), 0.2],
//         [Math.sin(context.tick / 100), -0.8],
//         [Math.sin(context.tick / 100), 0.8]
//       ];
//     }
//   },
//
//   uniforms: {
//     color: function(context, props) {
//       return props.color;
//     },
//     // @change: Add a pointWidth uniform -
//     //  set by a prop
//     pointWidth: regl.prop("pointWidth")
//   },
//
//   count: 3,
//   // @change: Set our primitive to points
//   primitive: "points"
// });
//
// regl.frame(function(context) {
//   drawDots({
//     color: [0.208, 0.304, 1.0, 1.0],
//     // @change: Pass in the pointWidth prop
//     pointWidth: 10.0
//   });
// });


/*
put A in r
put B in g
 */

(() => {
  const regl = createREGL()
  const RADIUS = Math.pow(2, 8)
  // const INITIAL_CONDITIONS = (Array(RADIUS * RADIUS)).fill(0).map(
  //   () => [
  //     Math.random() > 0.9 ? 255 : 0,
  //     Math.random() > 0.9 ? 255 : 0,
  //     Math.random() > 0.9 ? 255 : 0,
  //     1
  //   ]).flat()

  const INITIAL_CONDITIONS = (Array(RADIUS * RADIUS)).fill(0).map(
    (v, i) => [
      (i%RADIUS > RADIUS/2) ? 255 : 0,
      (i%RADIUS < RADIUS/2) ? 255 : 0,
      0,
      255
    ]).flat()

  const state = (Array(2)).fill().map(() =>
    regl.framebuffer({
      color: regl.texture({
        radius: RADIUS, // width AND height
        data: INITIAL_CONDITIONS,
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
        void main() {
            float a = texture2D(prevState, uv).r;
            float b = texture2D(prevState, uv).g;
            float dt = 1.0;
            float feedRate = 0.055;
            float killRate = 0.062;

            float ap = a + (feedRate * (1.0 - a)) * dt;
            float bp = b - ((feedRate + killRate) * b) * dt;

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
            gl_FragColor = vec4(a,b,0, 1);
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

})()