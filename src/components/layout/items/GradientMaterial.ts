import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// Custom Gradient Shader Material
export const GradientMaterial = shaderMaterial(
    { color: new THREE.Color(0.2, 0.6, 1.0), opacity: 0.5, height: 5.0 },
    // Vertex Shader
    `
    varying float vHeight;
    void main() {
      vHeight = position.z; // Extrusion is along Z in local space
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `,
    // Fragment Shader
    `
    uniform vec3 color;
    uniform float opacity;
    uniform float height;
    varying float vHeight;
    void main() {
      // Fade from bottom (0) to top (height)
      float alpha = 1.0 - smoothstep(0.0, height, vHeight);
      
      // Add a bit of "rim" or "edge" glow at the bottom
      alpha = pow(alpha, 0.8); 
      
      gl_FragColor = vec4(color, alpha * opacity);
    }
    `
);

extend({ GradientMaterial });

// Add type definition for the custom material
declare global {
    namespace JSX {
        interface IntrinsicElements {
            gradientMaterial: any;
        }
    }
}
