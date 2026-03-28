import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ── Rupee symbol drawn as an SVG-texture on a cylinder ──
function RupeeCoinMesh({ position, scale, speed, color }) {
  const mesh = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.y = t * speed;
    mesh.current.rotation.z = Math.sin(t * speed * 0.3) * 0.3;
    mesh.current.position.y = position[1] + Math.sin(t * speed * 0.5) * 0.4;
  });

  return (
    <mesh ref={mesh} position={position} scale={scale} castShadow>
      <cylinderGeometry args={[1, 1, 0.18, 64]} />
      <meshStandardMaterial
        color={color}
        metalness={0.9}
        roughness={0.08}
        envMapIntensity={2}
      />
    </mesh>
  );
}

// ── Thin ring / halo ──
function Ring({ position, radius, color }) {
  const mesh = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.x = t * 0.4;
    mesh.current.rotation.y = t * 0.6;
  });
  return (
    <mesh ref={mesh} position={position}>
      <torusGeometry args={[radius, 0.05, 16, 60]} />
      <meshStandardMaterial color={color} metalness={0.95} roughness={0.1} />
    </mesh>
  );
}

// ── Main camera parallax ──
function CameraRig() {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    camera.position.x += (state.pointer.x * 1.5 - camera.position.x) * 0.04;
    camera.position.y += (-state.pointer.y * 1.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function HeroScene({ theme = 'light' }) {
  const accent = '#FF4500';
  const silver = '#C0C0C0';
  const gold = '#D4AF37';

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Soft gradient fog that makes coins blend into page */}
      {theme === 'light' ? (
        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-[#FAF9F6]/60 to-transparent z-10" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
      )}

      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <CameraRig />
        <ambientLight intensity={theme === 'light' ? 2 : 1.5} />
        <directionalLight position={[5, 8, 5]} intensity={3} color="#ffffff" castShadow />
        <directionalLight position={[-5, -3, 2]} intensity={1.5} color={accent} />
        <pointLight position={[0, 0, 4]} intensity={2} color={accent} />

        {/* Large coin (left) */}
        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1.5}>
          <RupeeCoinMesh position={[-4.5, 1, -1]} scale={1.8} speed={0.7} color={gold} />
        </Float>

        {/* Medium coin (right) */}
        <Float speed={2.5} rotationIntensity={0.6} floatIntensity={2}>
          <RupeeCoinMesh position={[5, -1.5, 0]} scale={1.3} speed={1.2} color={accent} />
        </Float>

        {/* Small coin (top-right) */}
        <Float speed={3} rotationIntensity={1} floatIntensity={3}>
          <RupeeCoinMesh position={[3.5, 3, -2]} scale={0.7} speed={1.8} color={silver} />
        </Float>

        {/* Tiny coin bottom-left */}
        <Float speed={2} rotationIntensity={0.3} floatIntensity={2.5}>
          <RupeeCoinMesh position={[-3, -3.5, 1]} scale={0.5} speed={2.2} color={gold} />
        </Float>

        {/* Accent rings */}
        <Ring position={[-5, 0, -3]} radius={1.6} color={accent} />
        <Ring position={[6, 2, -4]} radius={1.0} color={silver} />

        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
