import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Aurora from './Aurora';

// Safely resolve WebView on native platforms (iOS & Android)
let WebViewComponent: any = null;
if (Platform.OS !== 'web') {
  try {
    WebViewComponent = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('Failed to load react-native-webview:', e);
  }
}

export interface MobileLivingBackgroundProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  lightMode?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Parses hex color strings (e.g. #FF6B00, #FFF) or rgb(...) into normalized [r, g, b] (0..1)
 */
function parseColorToRgb(colorStr: string): [number, number, number] {
  if (!colorStr) return [1, 1, 1];
  let hex = colorStr.trim();
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length >= 6) {
      const num = parseInt(hex.slice(0, 6), 16);
      return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255,
      ];
    }
  }
  const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1], 10) / 255,
      parseInt(rgbMatch[2], 10) / 255,
      parseInt(rgbMatch[3], 10) / 255,
    ];
  }
  return [1, 1, 1];
}

/**
 * Generates self-contained hardware-accelerated WebGL HTML that duplicates
 * the web Aurora shader with dynamic screen size and aspect-ratio adaptation.
 */
function generateAuroraHtml(
  initialColors: [number, number, number][],
  amplitude: number,
  blend: number,
  speed: number,
  lightMode: boolean
): string {
  const c0 = initialColors[0] || [1.0, 0.42, 0.0];
  const c1 = initialColors[1] || [0.486, 0.227, 0.929];
  const c2 = initialColors[2] || [0.192, 0.4, 0.745];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #070514;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <canvas id="auroraCanvas"></canvas>
  <script>
  (function() {
    var canvas = document.getElementById('auroraCanvas');
    var gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance'
    });
    var isWebGL2 = !!gl;
    if (!gl) {
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
        powerPreference: 'high-performance'
      }) || canvas.getContext('experimental-webgl');
    }

    if (!gl) {
      document.body.style.backgroundColor = '#070514';
      return;
    }

    var vsSource = isWebGL2 ? \`#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
\` : \`
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
\`;

    var fsSource = isWebGL2 ? \`#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  // ── Screen Size & Aspect Ratio Adjustment ──
  // Portrait mobile displays have aspect ratio ~0.45 - 0.56, while landscape web is ~1.78.
  // Smoothly adapt frequency, vertical placement, and color angle for optimal mobile presentation.
  float aspect = uResolution.x / uResolution.y;
  float tAspect = clamp((aspect - 0.45) / 0.75, 0.0, 1.0);

  float rampFactor = mix(clamp(uv.x * 0.75 + (1.0 - uv.y) * 0.25, 0.0, 1.0), uv.x, tAspect);
  vec3 rampColor;
  COLOR_RAMP(colors, rampFactor, rampColor);

  float freqX = mix(1.25, 2.0, tAspect);
  float yScale = mix(1.55, 2.0, tAspect);
  float yOffset = mix(0.30, 0.20, tAspect);
  float heightAmp = mix(0.88, 1.0, tAspect);

  float noiseVal = snoise(vec2(uv.x * freqX + uTime * 0.12, uTime * 0.28)) * 0.5 * uAmplitude;
  float expHeight = exp(noiseVal) * heightAmp;
  float height = (uv.y * yScale - expHeight + yOffset);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
\` : \`
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  // ── Screen Size & Aspect Ratio Adjustment ──
  float aspect = uResolution.x / uResolution.y;
  float tAspect = clamp((aspect - 0.45) / 0.75, 0.0, 1.0);

  float rampFactor = mix(clamp(uv.x * 0.75 + (1.0 - uv.y) * 0.25, 0.0, 1.0), uv.x, tAspect);
  vec3 rampColor;
  COLOR_RAMP(colors, rampFactor, rampColor);

  float freqX = mix(1.25, 2.0, tAspect);
  float yScale = mix(1.55, 2.0, tAspect);
  float yOffset = mix(0.30, 0.20, tAspect);
  float heightAmp = mix(0.88, 1.0, tAspect);

  float noiseVal = snoise(vec2(uv.x * freqX + uTime * 0.12, uTime * 0.28)) * 0.5 * uAmplitude;
  float expHeight = exp(noiseVal) * heightAmp;
  float height = (uv.y * yScale - expHeight + yOffset);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    gl_FragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
\`;

    function createShader(gl, type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    var vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    var fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.027, 0.02, 0.078, 1.0);

    var uTime = gl.getUniformLocation(program, 'uTime');
    var uAmplitude = gl.getUniformLocation(program, 'uAmplitude');
    var uColorStops = gl.getUniformLocation(program, 'uColorStops');
    var uResolution = gl.getUniformLocation(program, 'uResolution');
    var uBlend = gl.getUniformLocation(program, 'uBlend');
    var uLightMode = gl.getUniformLocation(program, 'uLightMode');

    var currentColors = [
      ${c0[0]}, ${c0[1]}, ${c0[2]},
      ${c1[0]}, ${c1[1]}, ${c1[2]},
      ${c2[0]}, ${c2[1]}, ${c2[2]}
    ];
    var targetColors = currentColors.slice();
    var currentAmplitude = ${amplitude};
    var currentBlend = ${blend};
    var currentSpeed = ${speed};
    var currentLightMode = ${lightMode ? 1.0 : 0.0};
    var isAnimated = true;

    function resize() {
      var w = window.innerWidth || document.documentElement.clientWidth;
      var h = window.innerHeight || document.documentElement.clientHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function() {
      setTimeout(resize, 100);
    });
    resize();

    function updateUniforms() {
      if (uColorStops) gl.uniform3fv(uColorStops, new Float32Array(currentColors));
      if (uAmplitude) gl.uniform1f(uAmplitude, currentAmplitude);
      if (uBlend) gl.uniform1f(uBlend, currentBlend);
      if (uLightMode) gl.uniform1f(uLightMode, currentLightMode);
    }
    updateUniforms();

    function onMessage(e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.type === 'UPDATE_UNIFORMS') {
          if (data.colorStops && data.colorStops.length >= 3) {
            targetColors = [
              data.colorStops[0][0], data.colorStops[0][1], data.colorStops[0][2],
              data.colorStops[1][0], data.colorStops[1][1], data.colorStops[1][2],
              data.colorStops[2][0], data.colorStops[2][1], data.colorStops[2][2]
            ];
          }
          if (typeof data.amplitude === 'number') currentAmplitude = data.amplitude;
          if (typeof data.blend === 'number') currentBlend = data.blend;
          if (typeof data.speed === 'number') currentSpeed = data.speed;
          if (typeof data.lightMode === 'number') currentLightMode = data.lightMode;
          if (typeof data.animated === 'boolean') isAnimated = data.animated;
          updateUniforms();
        }
      } catch(err) {}
    }
    window.addEventListener('message', onMessage);
    document.addEventListener('message', onMessage);

    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage('AURORA_READY');
    }

    var startTime = performance.now();
    function render(now) {
      requestAnimationFrame(render);

      var colorChanged = false;
      for (var i = 0; i < 9; i++) {
        var diff = targetColors[i] - currentColors[i];
        if (Math.abs(diff) > 0.001) {
          currentColors[i] += diff * 0.08;
          colorChanged = true;
        } else {
          currentColors[i] = targetColors[i];
        }
      }
      if (colorChanged && uColorStops) {
        gl.uniform3fv(uColorStops, new Float32Array(currentColors));
      }

      if (isAnimated) {
        var elapsed = (now - startTime) * 0.001;
        if (uTime) gl.uniform1f(uTime, elapsed * currentSpeed * 1.35);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(render);
  })();
  </script>
</body>
</html>`;
}

/**
 * MobileLivingBackground
 *
 * Duplicates the web WebGL Aurora background (from Aurora.tsx) directly onto
 * mobile devices, dynamically adjusting wave frequency, vertical amplitude, and
 * color distribution for mobile portrait and varied screen aspect ratios.
 *
 * - Zero static WebP or video media dependencies
 * - Full hardware-accelerated WebGL 2/1 execution
 * - Smooth real-time color morphing when colorStops update
 * - Respects system reduced-motion preferences
 */
export const MobileLivingBackground: React.FC<MobileLivingBackgroundProps> = ({
  colorStops = ['#FF6B00', '#7C3AED', '#3166BE'],
  amplitude = 1.0,
  blend = 0.5,
  speed = 0.45,
  lightMode = false,
  animated = true,
  style,
}) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<any>(null);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Accessibility: detect reduced motion preferences
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      sub?.remove?.();
    };
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  // Web fallback: render Aurora directly on web platforms
  if (Platform.OS === 'web') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.container,
          style,
        ]}
      >
        <Aurora
          colorStops={colorStops}
          amplitude={amplitude}
          blend={blend}
          speed={shouldAnimate ? speed * 1.35 : 0}
          lightMode={lightMode}
        />
      </View>
    );
  }

  // Parse color stops into RGB triples
  const rgbStops = useMemo(
    () => (colorStops || []).map(parseColorToRgb),
    [colorStops]
  );

  // Generate self-contained WebGL HTML with initial uniforms
  const webGLHtml = useMemo(
    () => generateAuroraHtml(rgbStops, amplitude, blend, speed, lightMode),
    [] // Initial HTML setup; dynamic updates dispatched via postMessage
  );

  // Send uniform updates to WebView dynamically
  useEffect(() => {
    if (!webViewReady || !webViewRef.current) return;
    try {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_UNIFORMS',
          colorStops: rgbStops,
          amplitude,
          blend,
          speed,
          lightMode: lightMode ? 1.0 : 0.0,
          animated: shouldAnimate,
        })
      );
    } catch (e) {
      // WebView not ready or detached
    }
  }, [rgbStops, amplitude, blend, speed, lightMode, shouldAnimate, webViewReady]);

  // Handle shader ready event with smooth fade-in
  const handleMessage = (event: any) => {
    const data = event?.nativeEvent?.data;
    if (data === 'AURORA_READY') {
      setWebViewReady(true);
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      {WebViewComponent ? (
        <Animated.View
          style={[StyleSheet.absoluteFillObject, { opacity: opacityAnim }]}
          pointerEvents="none"
        >
          <WebViewComponent
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: webGLHtml }}
            style={styles.webView}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            pointerEvents="none"
            androidLayerType="hardware"
            onMessage={handleMessage}
          />
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070514',
    overflow: 'hidden',
    zIndex: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99, // Hint for Android compositor hardware alpha blending
  },
});

export default MobileLivingBackground;
