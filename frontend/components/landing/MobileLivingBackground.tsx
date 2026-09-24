import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Path, Rect } from 'react-native-svg';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MobileLivingBackgroundProps {
  colorStops?: string[]; // [primary, secondary, tertiary]
  amplitude?: number;
  blend?: number;
  speed?: number;
  lightMode?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Convert hex string "#RRGGBB" to [r, g, b] float [0..1]
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [isNaN(r) ? 1 : r, isNaN(g) ? 0.42 : g, isNaN(b) ? 0 : b];
};

/**
 * MobileLivingBackground
 *
 * Mobile-native counterpart to web's WebGL Aurora shader from React Bits.
 *
 * Architecture:
 * 1. Hardware-accelerated WebGL Canvas in transparent background WebView:
 *    Executes the exact same Simplex noise undulating wave algorithm and color ramp
 *    as web's Aurora.tsx with zero lag.
 * 2. Instant-render ambient SVG ribbon waves underneath:
 *    Guarantees rich luminous aesthetic from frame 0 before WebView initializes.
 * 3. Dynamic color morphing:
 *    Responds to slide/theme color changes via postMessage into the WebGL context.
 * 4. pointerEvents="none" across all layers:
 *    Ensures touch and gesture handling (e.g. onboarding swipes, taps) never get blocked.
 */
export const MobileLivingBackground: React.FC<MobileLivingBackgroundProps> = ({
  colorStops = ['#FF6B00', '#7C3AED', '#3166BE'],
  amplitude = 1.0,
  blend = 0.5,
  speed = 0.5,
  lightMode = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewOpacity = useRef(new Animated.Value(0)).current;

  // Native ambient ribbon drift animations (0-overhead NativeDriver)
  const wave1TranslateY = useRef(new Animated.Value(0)).current;
  const wave2TranslateY = useRef(new Animated.Value(0)).current;
  const ribbonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave1TranslateY, {
          toValue: -24,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wave1TranslateY, {
          toValue: 0,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.timing(wave2TranslateY, {
          toValue: 20,
          duration: 6000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wave2TranslateY, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const animScale = Animated.loop(
      Animated.sequence([
        Animated.timing(ribbonScale, {
          toValue: 1.05,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ribbonScale, {
          toValue: 1.0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    anim1.start();
    anim2.start();
    animScale.start();

    return () => {
      anim1.stop();
      anim2.stop();
      animScale.stop();
    };
  }, []);

  // Fade in WebGL layer once WebView signals ready
  useEffect(() => {
    if (webViewReady) {
      Animated.timing(webViewOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [webViewReady]);

  // Send uniform updates to WebView whenever props change
  useEffect(() => {
    if (!webViewReady) return;
    const colors = colorStops.map(hexToRgb);
    const payload = JSON.stringify({
      type: 'UPDATE_UNIFORMS',
      colorStops: colors,
      amplitude,
      blend,
      speed,
      lightMode: lightMode ? 1 : 0,
    });
    webViewRef.current?.postMessage(payload);
  }, [colorStops, amplitude, blend, speed, lightMode, webViewReady]);

  const initialColors = useMemo(() => colorStops.map(hexToRgb), [colorStops]);

  // HTML + WebGL Shader source identical to Aurora.tsx
  const webGLHtml = useMemo(() => {
    const c0 = initialColors[0] || [1.0, 0.42, 0.0];
    const c1 = initialColors[1] || [0.49, 0.23, 0.93];
    const c2 = initialColors[2] || [0.19, 0.40, 0.75];

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent;
      touch-action: none;
      user-select: none;
    }
    canvas {
      display: block;
      width: 100%;
      height: 100%;
      background: transparent;
    }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    (function() {
      var canvas = document.getElementById('c');
      var gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
      var isWebGL2 = !!gl;
      if (!gl) {
        gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true }) || canvas.getContext('experimental-webgl');
      }
      if (!gl) return;

      var vsSource = isWebGL2 ?
        '#version 300 es\\n' +
        'in vec2 position;\\n' +
        'void main() { gl_Position = vec4(position, 0.0, 1.0); }' :
        'attribute vec2 position;\\n' +
        'void main() { gl_Position = vec4(position, 0.0, 1.0); }';

      var fsSource = isWebGL2 ?
        '#version 300 es\\n' +
        'precision highp float;\\n' +
        'uniform float uTime;\\n' +
        'uniform float uAmplitude;\\n' +
        'uniform vec3 uColorStops[3];\\n' +
        'uniform vec2 uResolution;\\n' +
        'uniform float uBlend;\\n' +
        'uniform float uLightMode;\\n' +
        'out vec4 fragColor;\\n' +
        'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }\\n' +
        'float snoise(vec2 v){\\n' +
        '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\\n' +
        '  vec2 i  = floor(v + dot(v, C.yy));\\n' +
        '  vec2 x0 = v - i + dot(i, C.xx);\\n' +
        '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\\n' +
        '  vec4 x12 = x0.xyxy + C.xxzz;\\n' +
        '  x12.xy -= i1;\\n' +
        '  i = mod(i, 289.0);\\n' +
        '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\\n' +
        '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\\n' +
        '  m = m * m; m = m * m;\\n' +
        '  vec3 x = 2.0 * fract(p * C.www) - 1.0;\\n' +
        '  vec3 h = abs(x) - 0.5;\\n' +
        '  vec3 ox = floor(x + 0.5);\\n' +
        '  vec3 a0 = x - ox;\\n' +
        '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\\n' +
        '  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;\\n' +
        '  return 130.0 * dot(m, g);\\n' +
        '}\\n' +
        'struct ColorStop { vec3 color; float position; };\\n' +
        'void main() {\\n' +
        '  vec2 uv = gl_FragCoord.xy / uResolution;\\n' +
        '  ColorStop colors[3];\\n' +
        '  colors[0] = ColorStop(uColorStops[0], 0.0);\\n' +
        '  colors[1] = ColorStop(uColorStops[1], 0.5);\\n' +
        '  colors[2] = ColorStop(uColorStops[2], 1.0);\\n' +
        '  vec3 rampColor;\\n' +
        '  if (uv.x <= 0.5) {\\n' +
        '    float f = uv.x / 0.5;\\n' +
        '    rampColor = mix(colors[0].color, colors[1].color, f);\\n' +
        '  } else {\\n' +
        '    float f = (uv.x - 0.5) / 0.5;\\n' +
        '    rampColor = mix(colors[1].color, colors[2].color, f);\\n' +
        '  }\\n' +
        '  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;\\n' +
        '  height = exp(height);\\n' +
        '  height = (uv.y * 2.0 - height + 0.2);\\n' +
        '  float intensity = 0.6 * height;\\n' +
        '  float midPoint = 0.20;\\n' +
        '  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);\\n' +
        '  vec3 auroraColor = intensity * rampColor;\\n' +
        '  if (uLightMode > 0.5) {\\n' +
        '    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);\\n' +
        '    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);\\n' +
        '    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));\\n' +
        '    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));\\n' +
        '    chroma /= max(chromaPeak, 0.0001);\\n' +
        '    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);\\n' +
        '  } else {\\n' +
        '    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);\\n' +
        '  }\\n' +
        '}' :
        'precision highp float;\\n' +
        'uniform float uTime;\\n' +
        'uniform float uAmplitude;\\n' +
        'uniform vec3 uColorStops[3];\\n' +
        'uniform vec2 uResolution;\\n' +
        'uniform float uBlend;\\n' +
        'uniform float uLightMode;\\n' +
        'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }\\n' +
        'float snoise(vec2 v){\\n' +
        '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);\\n' +
        '  vec2 i  = floor(v + dot(v, C.yy));\\n' +
        '  vec2 x0 = v - i + dot(i, C.xx);\\n' +
        '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\\n' +
        '  vec4 x12 = x0.xyxy + C.xxzz;\\n' +
        '  x12.xy -= i1;\\n' +
        '  i = mod(i, 289.0);\\n' +
        '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));\\n' +
        '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);\\n' +
        '  m = m * m; m = m * m;\\n' +
        '  vec3 x = 2.0 * fract(p * C.www) - 1.0;\\n' +
        '  vec3 h = abs(x) - 0.5;\\n' +
        '  vec3 ox = floor(x + 0.5);\\n' +
        '  vec3 a0 = x - ox;\\n' +
        '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);\\n' +
        '  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;\\n' +
        '  return 130.0 * dot(m, g);\\n' +
        '}\\n' +
        'void main() {\\n' +
        '  vec2 uv = gl_FragCoord.xy / uResolution;\\n' +
        '  vec3 rampColor;\\n' +
        '  if (uv.x <= 0.5) {\\n' +
        '    rampColor = mix(uColorStops[0], uColorStops[1], uv.x * 2.0);\\n' +
        '  } else {\\n' +
        '    rampColor = mix(uColorStops[1], uColorStops[2], (uv.x - 0.5) * 2.0);\\n' +
        '  }\\n' +
        '  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;\\n' +
        '  height = exp(height);\\n' +
        '  height = (uv.y * 2.0 - height + 0.2);\\n' +
        '  float intensity = 0.6 * height;\\n' +
        '  float midPoint = 0.20;\\n' +
        '  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);\\n' +
        '  vec3 auroraColor = intensity * rampColor;\\n' +
        '  if (uLightMode > 0.5) {\\n' +
        '    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);\\n' +
        '    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);\\n' +
        '    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));\\n' +
        '    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));\\n' +
        '    chroma /= max(chromaPeak, 0.0001);\\n' +
        '    gl_FragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);\\n' +
        '  } else {\\n' +
        '    gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);\\n' +
        '  }\\n' +
        '}';

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

      // Full screen quad (triangle covering clip space)
      var buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

      var posLoc = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

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
      var currentAmplitude = ${amplitude};
      var currentBlend = ${blend};
      var currentSpeed = ${speed};
      var currentLightMode = ${lightMode ? 1.0 : 0.0};

      function resize() {
        var w = window.innerWidth || document.documentElement.clientWidth;
        var h = window.innerHeight || document.documentElement.clientHeight;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        if (uResolution) gl.uniform2f(uResolution, w, h);
      }
      window.addEventListener('resize', resize);
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
          var data = JSON.parse(e.data);
          if (data.type === 'UPDATE_UNIFORMS') {
            if (data.colorStops && data.colorStops.length >= 3) {
              currentColors = [
                data.colorStops[0][0], data.colorStops[0][1], data.colorStops[0][2],
                data.colorStops[1][0], data.colorStops[1][1], data.colorStops[1][2],
                data.colorStops[2][0], data.colorStops[2][1], data.colorStops[2][2]
              ];
            }
            if (typeof data.amplitude === 'number') currentAmplitude = data.amplitude;
            if (typeof data.blend === 'number') currentBlend = data.blend;
            if (typeof data.speed === 'number') currentSpeed = data.speed;
            if (typeof data.lightMode === 'number') currentLightMode = data.lightMode;
            updateUniforms();
          }
        } catch(err) {}
      }
      window.addEventListener('message', onMessage);
      document.addEventListener('message', onMessage);

      // Signal ready to React Native
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage('READY');
      }

      var startTime = performance.now();
      function render(now) {
        requestAnimationFrame(render);
        var elapsed = (now - startTime) * 0.001;
        if (uTime) gl.uniform1f(uTime, elapsed * currentSpeed * 0.1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(render);
    })();
  </script>
</body>
</html>`;
  }, [initialColors, amplitude, blend, speed, lightMode]);

  const primaryColor = colorStops[0] || '#FF6B00';
  const secondaryColor = colorStops[1] || '#7C3AED';
  const tertiaryColor = colorStops[2] || '#3166BE';

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      {/* ── Layer 1: Instant Native Ambient Aurora Ribbon Waves (Underneath) ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Upper Radiant Flame Orb */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              top: -SCREEN_HEIGHT * 0.12,
              left: -SCREEN_WIDTH * 0.2,
              width: SCREEN_WIDTH * 1.4,
              height: SCREEN_HEIGHT * 0.45,
              transform: [{ translateY: wave1TranslateY }, { scale: ribbonScale }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 400 300">
            <Defs>
              <RadialGradient id="ambientGrad1" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
                <Stop offset="50%" stopColor={secondaryColor} stopOpacity="0.22" />
                <Stop offset="100%" stopColor="#070514" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="400" height="300" fill="url(#ambientGrad1)" />
          </Svg>
        </Animated.View>

        {/* Lower Cyber Violet & Azure Stream Ribbon */}
        <Animated.View
          style={[
            styles.ambientGlow,
            {
              bottom: -SCREEN_HEIGHT * 0.15,
              right: -SCREEN_WIDTH * 0.25,
              width: SCREEN_WIDTH * 1.5,
              height: SCREEN_HEIGHT * 0.55,
              transform: [{ translateY: wave2TranslateY }],
            },
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 500 400">
            <Defs>
              <RadialGradient id="ambientGrad2" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor={secondaryColor} stopOpacity="0.32" />
                <Stop offset="45%" stopColor={tertiaryColor} stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#070514" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="500" height="400" fill="url(#ambientGrad2)" />
          </Svg>
        </Animated.View>
      </View>

      {/* ── Layer 2: True WebGL Aurora Shader (Hardware-Accelerated via WebView) ── */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: webViewOpacity }]}
        pointerEvents="none"
      >
        <WebView
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
          onMessage={(event) => {
            if (event.nativeEvent.data === 'READY') {
              setWebViewReady(true);
            }
          }}
        />
      </Animated.View>
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
  ambientGlow: {
    position: 'absolute',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
    opacity: 0.99, // Hint to Android compositor for alpha blending
  },
});

export default MobileLivingBackground;
