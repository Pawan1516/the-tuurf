import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, ContactShadows, Text, Html } from '@react-three/drei';
import { connectSocket, disconnectSocket } from '../utils/socketClient';
import apiClient from '../api/client';
import * as THREE from 'three';
import { toast } from 'react-toastify';

function Pitch() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[3, 20]} />
      <meshStandardMaterial color="#c2b280" />
    </mesh>
  );
}

function Outfield() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[40, 64]} />
      <meshStandardMaterial color="#2d5a27" roughness={1} />
    </mesh>
  );
}

function Boundary() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[39.5, 40, 64]} />
      <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
    </mesh>
  );
}

function Stumps({ position }) {
  return (
    <group position={position}>
      {/* 3 stumps */}
      <mesh position={[-0.15, 0.4, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.15, 0.4, 0]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.8]} /><meshStandardMaterial color="#ffffff" /></mesh>
      {/* 2 bails */}
      <mesh position={[-0.075, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.15]} /><meshStandardMaterial color="#ffffff" /></mesh>
      <mesh position={[0.075, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 0.15]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
  );
}

function Player({ position, color, role }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.25]} />
        <meshStandardMaterial color="#ffccaa" />
      </mesh>
      <Html position={[0, 2.5, 0]} center>
        <div className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap">
          {role}
        </div>
      </Html>
    </group>
  );
}

function Ball({ trajectory }) {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (!trajectory || !trajectory.active) return;
    
    // Simple parabolic animation
    const elapsedTime = (Date.now() - trajectory.startTime) / 1000;
    const duration = trajectory.duration || 2; // seconds
    
    if (elapsedTime < duration) {
      const progress = elapsedTime / duration;
      
      // Interpolate X and Z
      const currentX = THREE.MathUtils.lerp(trajectory.start[0], trajectory.end[0], progress);
      const currentZ = THREE.MathUtils.lerp(trajectory.start[2], trajectory.end[2], progress);
      
      // Parabolic Y (bounce effect)
      // height = 4 * max_height * progress * (1 - progress)
      const maxHeight = trajectory.maxHeight || 2;
      const currentY = trajectory.start[1] + (4 * maxHeight * progress * (1 - progress));
      
      meshRef.current.position.set(currentX, currentY, currentZ);
    } else {
      // Animation complete
      meshRef.current.position.set(trajectory.end[0], trajectory.end[1], trajectory.end[2]);
    }
  });

  return (
    <mesh ref={meshRef} position={trajectory?.start || [0, 0.1, 9]} castShadow>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} />
    </mesh>
  );
}

export default function Live3DMatch() {
  const { id } = useParams();
  const [matchDetails, setMatchDetails] = useState(null);
  const [connected, setConnected] = useState(false);
  const [ballTrajectory, setBallTrajectory] = useState(null);
  const [scoreboard, setScoreboard] = useState({ runs: 0, wickets: 0, overs: '0.0', ballByBall: [] });

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await apiClient.get(`/matches/${id}`);
        if (res.data.success) {
          setMatchDetails(res.data.match);
        }
      } catch (err) {
        toast.error('Failed to load match details.');
      }
    };
    fetchMatch();

    const socket = connectSocket();
    
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_match', id);
    });
    
    socket.on('disconnect', () => setConnected(false));
    
    // Handle socket events
    socket.on('score_update', (data) => {
      console.log('Ball Update Received:', data);
      
      // Calculate Trajectory based on runs
      // Bowler bowls from z=9 to z=-9
      // Batsman hits it based on score
      
      const startPos = [0, 0.1, 9]; // Bowler's end
      const hitPos = [0, 0.5, -8.5]; // Batsman's end
      let endPos = [0, 0.1, -9]; // Default (Dot ball)
      let maxHeight = 0.5;
      
      if (data.runs === 6) {
        endPos = [Math.random() * 20 - 10, 0.1, 45]; // Over the boundary
        maxHeight = 15;
      } else if (data.runs === 4) {
        endPos = [Math.random() * 30 - 15, 0.1, 40]; // Boundary rider
        maxHeight = 2;
      } else if (data.runs > 0) {
        endPos = [Math.random() * 10 - 5, 0.1, 15]; // Infield/Midfield
        maxHeight = 1;
      }
      
      // Animate Bowler -> Batter first (fast)
      setBallTrajectory({
        active: true,
        start: startPos,
        end: hitPos,
        maxHeight: 0.2,
        duration: 0.5,
        startTime: Date.now()
      });
      
      // Then animate Batter -> Field (after 500ms)
      setTimeout(() => {
        setBallTrajectory({
          active: true,
          start: hitPos,
          end: endPos,
          maxHeight: maxHeight,
          duration: data.runs >= 4 ? 2.5 : 1.5,
          startTime: Date.now()
        });
      }, 500);

      // Update UI Scoreboard
      setScoreboard(prev => ({
        ...prev,
        runs: prev.runs + (data.runs || 0) + (data.extras?.total || 0),
        wickets: prev.wickets + (data.type === 'wicket' ? 1 : 0),
        overs: data.overs || prev.overs
      }));
    });

    return () => {
      socket.off('score_update');
      disconnectSocket();
    };
  }, [id]);

  return (
    <div className="w-full h-screen bg-slate-900 relative">
      {/* 2D HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-white shadow-2xl">
          <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-2">Live 3D Match Engine</h2>
          <div className="text-4xl font-black italic tracking-tighter">
            {scoreboard.runs}/{scoreboard.wickets}
          </div>
          <p className="text-sm font-bold text-slate-300 mt-1">Overs: {scoreboard.overs}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${connected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {connected ? 'Socket Connected' : 'Connecting...'}
           </div>
           {matchDetails && (
             <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs border border-white/5 font-bold">
               {matchDetails.team_a?.name} vs {matchDetails.team_b?.name}
             </div>
           )}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows camera={{ position: [0, 15, -25], fov: 60 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 50, 25]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048} 
        />
        
        <Outfield />
        <Boundary />
        <Pitch />
        
        {/* Stumps */}
        <Stumps position={[0, 0, 9.5]} /> {/* Bowler End */}
        <Stumps position={[0, 0, -9.5]} /> {/* Batter End */}
        
        {/* Players */}
        <Player position={[0, 0, -9]} color="#2563eb" role="Batter" />
        <Player position={[1, 0, 9]} color="#2563eb" role="Non-Striker" />
        <Player position={[0, 0, 10]} color="#dc2626" role="Bowler" />
        <Player position={[0, 0, -11]} color="#dc2626" role="Wicket Keeper" />
        
        {/* Fielders (Randomly placed for effect) */}
        <Player position={[-15, 0, 0]} color="#dc2626" role="Point" />
        <Player position={[15, 0, -5]} color="#dc2626" role="Square Leg" />
        <Player position={[5, 0, 20]} color="#dc2626" role="Long On" />
        <Player position={[-20, 0, 25]} color="#dc2626" role="Deep Cover" />

        <Ball trajectory={ballTrajectory} />
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={50}
        />
        <ContactShadows resolution={512} scale={40} blur={2} opacity={0.5} far={10} color="#000000" />
      </Canvas>
    </div>
  );
}
