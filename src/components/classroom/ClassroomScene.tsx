import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

type Speaker = "teacher" | "maya" | "arjun";
const C = { wall: "#d8d1bf", floor: "#805d3d", wood: "#a8784f", dark: "#253039", board: "#183e35", chalk: "#f5f2e8", teacher: "#2f6f71", maya: "#d06a52", arjun: "#d7a83e", skin: "#b97a55", metal: "#536874", window: "#a9d9df" };

function Person({ position, color, speaking, teacher = false }: { position: [number, number, number]; color: string; speaking: boolean; teacher?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, .05);
    if (!group.current) return;
    const target = speaking ? 0.08 + Math.sin(clock.elapsedTime * 4) * .035 : 0;
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, target, 8, dt);
    if (arm.current) arm.current.rotation.z = THREE.MathUtils.damp(arm.current.rotation.z, speaking ? -.7 + Math.sin(clock.elapsedTime * 5) * .12 : -.15, 7, dt);
  });
  return <group ref={group} position={position}>
    <mesh position={[0, teacher ? 1.72 : 1.35, 0]} castShadow><sphereGeometry args={[.28, 24, 18]} /><meshStandardMaterial color={C.skin} roughness={.8} /></mesh>
    <mesh position={[0, teacher ? 1.05 : .72, 0]} castShadow><capsuleGeometry args={[.34, .82, 8, 16]} /><meshStandardMaterial color={color} roughness={.75} /></mesh>
    <mesh ref={arm} position={[.4, teacher ? 1.2 : .8, 0]} rotation-z={-.15} castShadow><capsuleGeometry args={[.09, .7, 6, 10]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[-.4, teacher ? 1.18 : .78, 0]} rotation-z={.18} castShadow><capsuleGeometry args={[.09, .7, 6, 10]} /><meshStandardMaterial color={color} /></mesh>
    {teacher && <><mesh position={[-.16,.35,0]} castShadow><capsuleGeometry args={[.11,.72,6,10]} /><meshStandardMaterial color={C.dark}/></mesh><mesh position={[.16,.35,0]} castShadow><capsuleGeometry args={[.11,.72,6,10]} /><meshStandardMaterial color={C.dark}/></mesh></>}
  </group>;
}

function Desk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
 return <group position={position} rotation-y={rotation}><RoundedBox args={[1.8,.16,.75]} radius={.05} position={[0,.85,0]} castShadow><meshStandardMaterial color={C.wood} roughness={.75}/></RoundedBox>{[-.72,.72].flatMap(x=>[-.25,.25].map((z,i)=><mesh key={`${x}-${i}`} position={[x,.4,z]} castShadow><boxGeometry args={[.1,.8,.1]}/><meshStandardMaterial color={C.metal}/></mesh>))}</group>
}

function CameraRig({ speaker }: { speaker: Speaker }) {
 const { camera } = useThree();
 useFrame((_, delta) => {
  const target = speaker === "teacher" ? new THREE.Vector3(0,3.1,8.8) : speaker === "maya" ? new THREE.Vector3(-3.6,2.4,6.5) : new THREE.Vector3(3.6,2.4,6.5);
  camera.position.lerp(target, 1-Math.exp(-1.5*Math.min(delta,.05)));
  const lookAt = speaker === "teacher"
   ? new THREE.Vector3(0, 2.2, -2)
   : speaker === "maya"
     ? new THREE.Vector3(-2.7, 1.3, -.5)
     : new THREE.Vector3(2.7, 1.3, -.5);
  camera.lookAt(lookAt);
 });
 return null;
}

function Room({ speaker, board }: { speaker: Speaker; board: string }) {
 return <>
  <CameraRig speaker={speaker}/><color attach="background" args={[C.wall]}/><fog attach="fog" args={[C.wall,14,30]}/>
  <ambientLight intensity={.65}/><directionalLight position={[5,10,7]} intensity={1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
  <Environment><Lightformer intensity={2} position={[0,7,0]} scale={[12,12,1]}/><Lightformer intensity={1} color={C.window} position={[-7,4,0]} rotation-y={Math.PI/2} scale={[7,4,1]}/></Environment>
  <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[18,20]}/><meshStandardMaterial color={C.floor} roughness={.95}/></mesh>
  <mesh position={[0,4,-5]} receiveShadow><boxGeometry args={[18,8,.2]}/><meshStandardMaterial color={C.wall}/></mesh>
  <mesh position={[-6.1,3.9,-4.75]}><boxGeometry args={[2.35,3.7,.12]}/><meshStandardMaterial color={C.window} emissive={C.window} emissiveIntensity={.18}/></mesh>
  <mesh position={[-6.1,3.9,-4.58]}><boxGeometry args={[.08,3.7,.05]}/><meshStandardMaterial color={C.dark}/></mesh>
  <mesh position={[-6.1,3.9,-4.58]}><boxGeometry args={[2.35,.08,.05]}/><meshStandardMaterial color={C.dark}/></mesh>
  <mesh position={[6.2,2.1,-4.68]}><boxGeometry args={[1.25,2.6,.16]}/><meshStandardMaterial color={C.wood}/></mesh>
  <mesh position={[6.2,2.1,-4.52]}><boxGeometry args={[1.03,2.25,.04]}/><meshStandardMaterial color={C.dark}/></mesh>
  <RoundedBox args={[8,3.2,.18]} radius={.06} position={[0,3.6,-4.78]} castShadow><meshStandardMaterial color={C.board} roughness={.85}/></RoundedBox>
  <Text position={[0,3.7,-4.65]} fontSize={.34} maxWidth={6.8} textAlign="center" anchorX="center" anchorY="middle" color={C.chalk}>{board}</Text>
  <Person position={[0,0,-3.2]} color={C.teacher} speaking={speaker==="teacher"} teacher/>
  <Desk position={[-2.8,0,-.2]} rotation={-.06}/><Person position={[-2.8,.88,-.3]} color={C.maya} speaking={speaker==="maya"}/>
  <Desk position={[2.8,0,-.2]} rotation={.06}/><Person position={[2.8,.88,-.3]} color={C.arjun} speaking={speaker==="arjun"}/>
  <Desk position={[-2.7,0,3.1]}/><Person position={[-2.7,.88,3]} color={C.dark} speaking={false}/>
  <Desk position={[2.7,0,3.1]}/><Person position={[2.7,.88,3]} color={C.dark} speaking={false}/>
  <Desk position={[0,0,5.2]}/>
  <group position={[-6.4,0,-2.7]}><mesh position={[0,.55,0]}><cylinderGeometry args={[.46,.34,1,16]}/><meshStandardMaterial color={C.dark}/></mesh><mesh position={[0,1.45,0]}><sphereGeometry args={[.65,16,12]}/><meshStandardMaterial color="#487963" roughness={.9}/></mesh></group>
 </>;
}

export function ClassroomScene({ speaker, board }: { speaker: Speaker; board: string }) {
 return <Canvas shadows dpr={[1,1.5]} camera={{ position:[0,3.1,8.8], fov:48 }} gl={{ antialias:true }}><Suspense fallback={null}><Room speaker={speaker} board={board}/></Suspense></Canvas>;
}
