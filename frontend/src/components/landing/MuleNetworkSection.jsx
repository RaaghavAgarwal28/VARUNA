import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";

// Orbiting node sphere
function NodeOrbit({ angle, radius, speed, color }) {
  const mesh = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed + angle;
    mesh.current.position.x = Math.cos(t) * radius;
    mesh.current.position.y = Math.sin(t) * radius * 0.4;
    mesh.current.position.z = Math.sin(t * 0.7) * 1.5;
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.22, 16, 16]} />
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.1}
        emissive={color}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

// Central pulsing core
function BrainCore() {
  const mesh = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    mesh.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    mesh.current.rotation.y = t * 0.3;
  });
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.9, 2]} />
      <meshStandardMaterial
        color="#FF4500"
        metalness={0.95}
        roughness={0.05}
        emissive="#FF4500"
        emissiveIntensity={0.35}
        wireframe={false}
      />
    </mesh>
  );
}

// Thin orbit ring
function OrbitRing({ radius, color, tiltX = 0 }) {
  return (
    <mesh rotation={[tiltX, 0, 0]}>
      <torusGeometry args={[radius, 0.018, 8, 80]} />
      <meshStandardMaterial color={color} transparent opacity={0.2} />
    </mesh>
  );
}

function GATScene() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <pointLight position={[0, 0, 3]} intensity={4} color="#FF4500" />

      {/* Rings */}
      <OrbitRing radius={2.4} color="#FF4500" tiltX={0.3} />
      <OrbitRing radius={3.2} color="#888888" tiltX={-0.5} />
      <OrbitRing radius={4.0} color="#FF4500" tiltX={0.8} />

      {/* Core */}
      <BrainCore />

      {/* Orbiting nodes */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <NodeOrbit
          key={i}
          angle={(i / 8) * Math.PI * 2}
          radius={2.4 + (i % 3) * 0.65}
          speed={0.28 + i * 0.06}
          color={i % 2 === 0 ? "#FF4500" : "#FFFFFF"}
        />
      ))}

      <Environment preset="city" />
    </>
  );
}

export function MuleNetworkSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const graphY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const titleY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section
      id="network"
      ref={ref}
      className="landing-dark relative overflow-hidden py-[18vh] md:py-[22vh]"
    >
      <div className="grid-dark pointer-events-none absolute inset-0 opacity-100" />

      {/* Warm glow center */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#FF4500]/6 blur-[200px]" />

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center px-6 md:px-8 text-center">

        <motion.h2
          style={{ y: titleY }}
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-[clamp(2.8rem,7vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.04em] text-white max-w-5xl"
        >
          Uncover mule chains with
          <br />
          <span className="text-[#FF4500]">Graph Attention.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-10 max-w-2xl text-[1.2rem] leading-[1.6] text-white/50 tracking-[-0.01em]"
        >
          VarunaGAT maps transaction flows across up to 45 banks, identifies
          time-synchronized coordination patterns, and scores every node's risk in real time.
        </motion.p>

        {/* WebGL GAT visualization */}
        <motion.div
          style={{ y: graphY }}
          className="mt-24 h-[480px] w-full max-w-[680px] rounded-[40px] border border-white/[0.07] bg-black/40 overflow-hidden backdrop-blur-md shadow-[0_40px_80px_rgba(0,0,0,0.5)]"
        >
          <Canvas
            camera={{ position: [0, 0, 7], fov: 50 }}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true }}
            style={{ background: "transparent" }}
          >
            <GATScene />
          </Canvas>
        </motion.div>

        {/* Stat row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 flex flex-wrap items-center justify-center gap-5"
        >
          {[
            { label: "Accounts Scored", value: "12K+" },
            { label: "Banks Connected", value: "45" },
            { label: "Detection Rate", value: "97.6%" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/8 bg-white/[0.03] px-8 py-5 text-center backdrop-blur-sm"
            >
              <div className="font-display text-[2.2rem] font-bold tracking-[-0.04em] text-white">
                {s.value}
              </div>
              <div className="mt-1 text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-white/30">
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
