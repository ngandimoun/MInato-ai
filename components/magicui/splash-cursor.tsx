"use client";
import { useEffect, useRef, useState } from "react";

interface PointerPrototype {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: Color;
}

interface Color {
  r: number;
  g: number;
  b: number;
}

interface Config {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  CAPTURE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLOR_UPDATE_SPEED: number;
  PAUSED: boolean;
  BACK_COLOR: Color;
  TRANSPARENT: boolean;
  BLOOM: boolean;
  SUNRAYS: boolean;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  BLOOM_SOFT_KNEE: number;
  SUNRAYS_WEIGHT: number;
}

interface WebGLContext {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  ext: WebGLExtensions;
}

interface WebGLExtensions {
  halfFloat: OES_texture_half_float | null;
  formatRGBA: { internalFormat: number; format: number; } | null;
  formatRG: { internalFormat: number; format: number; } | null;
  formatR: { internalFormat: number; format: number; } | null;
  halfFloatTexType: number;
  supportLinearFiltering: boolean;
}

interface MaterialUniforms {
  [key: string]: WebGLUniformLocation | null;
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
}

interface ProgramConstructor {
  new(gl: WebGLRenderingContext | WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): Program;
    }

    class Program {
  uniforms: MaterialUniforms;
  program: WebGLProgram;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.gl = gl;
    const program = createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error("Failed to create WebGL program");
    }
    this.program = program;
    this.uniforms = getUniforms(this.gl, this.program);
  }

      bind() {
    this.gl.useProgram(this.program);
  }
}

const ProgramClass = Program as unknown as ProgramConstructor;

function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }

      return program;
    }

function getUniforms(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram
): MaterialUniforms {
  const uniforms: MaterialUniforms = {};
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      const uniformName = uniformInfo.name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
      }
      return uniforms;
    }

// Shader source code
const baseVertexShaderSource = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
`;

const copyShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
`;

const clearShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const splatShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
`;

const advectionShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
`;

const divergenceShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
`;

const curlShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
`;

const vorticityShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
`;

const pressureShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + T + B - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
`;

const gradientSubtractShaderSource = `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
`;

function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
  keywords: string[] | null | undefined
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  let shaderSource = source;
  if (keywords) {
    let keywordsString = "";
    keywords.forEach((keyword) => {
      keywordsString += "#define " + keyword + "\n";
    });
    shaderSource = keywordsString + source;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function initializeWebGL(canvas: HTMLCanvasElement | null): WebGLContext | null {
  if (!canvas) return null;

  const params = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false
  };

  const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
  const isWebGL2 = !!gl2;
  const gl = isWebGL2 ? gl2 : (canvas.getContext('webgl') as WebGLRenderingContext | null);
  if (!gl) return null;

  function getSupportedFormat(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    internalFormat: number,
    format: number,
    type: number
  ): { internalFormat: number; format: number; } | null {
    if (!gl) return null;

    if (isWebGL2) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      (gl as WebGL2RenderingContext).texStorage2D(gl.TEXTURE_2D, 1, internalFormat, 4, 4);
      const error = gl.getError();
      gl.deleteTexture(texture);
      if (error !== gl.NO_ERROR) return null;
      return { internalFormat, format };
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, 4, 4, 0, format, type, null);
    const error = gl.getError();
    gl.deleteTexture(texture);
    if (error !== gl.NO_ERROR) return null;
    return { internalFormat: format, format };
  }

  const halfFloatTexType = isWebGL2 
    ? (gl as WebGL2RenderingContext).HALF_FLOAT
    : (gl.getExtension('OES_texture_half_float') as OES_texture_half_float)?.HALF_FLOAT_OES || gl.FLOAT;

  let formatRGBA, formatRG, formatR;

  if (isWebGL2) {
    const gl2 = gl as WebGL2RenderingContext;
    formatRGBA = getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl2, gl2.RG16F, gl2.RG, halfFloatTexType);
    formatR = getSupportedFormat(gl2, gl2.R16F, gl2.RED, halfFloatTexType);
  } else {
    formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
  }

  const ext: WebGLExtensions = {
    halfFloat: isWebGL2 ? null : gl.getExtension('OES_texture_half_float'),
    formatRGBA,
    formatRG,
    formatR,
    halfFloatTexType,
    supportLinearFiltering: isWebGL2 
      ? !!(gl as WebGL2RenderingContext).getExtension('EXT_color_buffer_float')
      : !!gl.getExtension('OES_texture_half_float_linear')
  };

  return { gl, ext };
}

function SplashCursor({
  // Add whatever props you like for customization
  SIM_RESOLUTION = 128,
  DYE_RESOLUTION = 1440,
  CAPTURE_RESOLUTION = 512,
  DENSITY_DISSIPATION = 3.5,
  VELOCITY_DISSIPATION = 2,
  PRESSURE = 0.1,
  PRESSURE_ITERATIONS = 20,
  CURL = 3,
  SPLAT_RADIUS = 0.25,
  SPLAT_FORCE = 6000,
  SHADING = true,
  COLOR_UPDATE_SPEED = 10,
  PAUSED = false,
  BACK_COLOR = { r: 0, g: 0, b: 0 },
  TRANSPARENT = true,
  BLOOM = true,
  SUNRAYS = true,
  BLOOM_INTENSITY = 0.8,
  BLOOM_THRESHOLD = 0.6,
  BLOOM_SOFT_KNEE = 0.7,
  SUNRAYS_WEIGHT = 1.0,
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [glContext, setGlContext] = useState<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const [ext, setExt] = useState<WebGLExtensions | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = initializeWebGL(canvas);
    if (!context) return;

    const { gl, ext } = context;
    setGlContext(gl);
    setExt(ext);

    const config = {
      SPLAT_RADIUS,
      SPLAT_FORCE,
      SHADING,
      COLOR_UPDATE_SPEED,
      PAUSED,
      BACK_COLOR,
      TRANSPARENT,
      BLOOM,
      SUNRAYS,
      BLOOM_INTENSITY,
      BLOOM_THRESHOLD,
      BLOOM_SOFT_KNEE,
      SUNRAYS_WEIGHT,
    };

    // Initialize shaders
    const baseVertexShader = compileShader(gl, gl.VERTEX_SHADER, baseVertexShaderSource, null);
    if (!baseVertexShader) {
      console.error("Failed to compile base vertex shader");
      return;
    }

    const copyShader = compileShader(gl, gl.FRAGMENT_SHADER, copyShaderSource, null);
    if (!copyShader) {
      console.error("Failed to compile copy shader");
      return;
    }

    const clearShader = compileShader(gl, gl.FRAGMENT_SHADER, clearShaderSource, null);
    if (!clearShader) {
      console.error("Failed to compile clear shader");
      return;
    }

    const splatShader = compileShader(gl, gl.FRAGMENT_SHADER, splatShaderSource, null);
    if (!splatShader) {
      console.error("Failed to compile splat shader");
      return;
    }

    const advectionShader = compileShader(gl, gl.FRAGMENT_SHADER, advectionShaderSource, null);
    if (!advectionShader) {
      console.error("Failed to compile advection shader");
      return;
    }

    const divergenceShader = compileShader(gl, gl.FRAGMENT_SHADER, divergenceShaderSource, null);
    if (!divergenceShader) {
      console.error("Failed to compile divergence shader");
      return;
    }

    const curlShader = compileShader(gl, gl.FRAGMENT_SHADER, curlShaderSource, null);
    if (!curlShader) {
      console.error("Failed to compile curl shader");
      return;
    }

    const vorticityShader = compileShader(gl, gl.FRAGMENT_SHADER, vorticityShaderSource, null);
    if (!vorticityShader) {
      console.error("Failed to compile vorticity shader");
      return;
    }

    const pressureShader = compileShader(gl, gl.FRAGMENT_SHADER, pressureShaderSource, null);
    if (!pressureShader) {
      console.error("Failed to compile pressure shader");
      return;
    }

    const gradientSubtractShader = compileShader(gl, gl.FRAGMENT_SHADER, gradientSubtractShaderSource, null);
    if (!gradientSubtractShader) {
      console.error("Failed to compile gradient subtract shader");
      return;
    }

    try {
      // Initialize programs
      const copyProgram = new ProgramClass(gl, baseVertexShader, copyShader);
      const clearProgram = new ProgramClass(gl, baseVertexShader, clearShader);
      const splatProgram = new ProgramClass(gl, baseVertexShader, splatShader);
      const advectionProgram = new ProgramClass(gl, baseVertexShader, advectionShader);
      const divergenceProgram = new ProgramClass(gl, baseVertexShader, divergenceShader);
      const curlProgram = new ProgramClass(gl, baseVertexShader, curlShader);
      const vorticityProgram = new ProgramClass(gl, baseVertexShader, vorticityShader);
      const pressureProgram = new ProgramClass(gl, baseVertexShader, pressureShader);
      const gradienSubtractProgram = new ProgramClass(gl, baseVertexShader, gradientSubtractShader);

      // ... Initialize other resources and start animation loop ...
    } catch (error) {
      console.error("Failed to initialize WebGL programs:", error);
      return;
    }

    // ... rest of the initialization code ...
  }, [
    SPLAT_RADIUS,
    SPLAT_FORCE,
    SHADING,
    COLOR_UPDATE_SPEED,
    PAUSED,
    BACK_COLOR,
    TRANSPARENT,
    BLOOM,
    SUNRAYS,
    BLOOM_INTENSITY,
    BLOOM_THRESHOLD,
    BLOOM_SOFT_KNEE,
    SUNRAYS_WEIGHT,
  ]);

  return (
    <div className="fixed top-0 left-0 z-50 pointer-events-none">
      <canvas ref={canvasRef} id="fluid" className="w-screen h-screen" />
    </div>
  );
}

export { SplashCursor };
