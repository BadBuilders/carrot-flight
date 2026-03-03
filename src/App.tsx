import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { playPopSound, playThunderSound, initAmbientSounds, updateWeatherSounds } from './audio';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [weather, setWeather] = useState<'CLEAR' | 'STORM'>('CLEAR');
  const [gameOver, setGameOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  
  const scoreRef = useRef(0);
  const isGameOverRef = useRef(false);
  // Store key states in a ref so the animation loop can read them without re-rendering
  const keys = useRef<Record<string, boolean>>({});
  const tilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!started || !mountRef.current) return;

    // --- Setup Scene ---
    const w = window.innerWidth;
    const h = window.innerHeight;
    let isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111827'); // Dark gray background
    scene.fog = new THREE.Fog('#111827', 50, 300);

    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
    camera.position.set(0, 15, 60);
    camera.lookAt(0, 0, -50);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xc5f5f5, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 20, 0);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- Materials (from user's code) ---
    const mats = {
        orange: new THREE.MeshPhongMaterial({ color: 0xB7513C, flatShading: true }),
        green:  new THREE.MeshPhongMaterial({ color: 0x379351, flatShading: true }),
        brown:  new THREE.MeshPhongMaterial({ color: 0x5C2C22, flatShading: true }),
        pink:   new THREE.MeshPhongMaterial({ color: 0xB1325E, flatShading: true }),
        gray:   new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true }),
        clouds: new THREE.MeshPhongMaterial({ color: 0xeeeeee, flatShading: true }),
        specialClouds: new THREE.MeshPhongMaterial({ color: 0x1a1a1a, flatShading: true }),
        rabbit: new THREE.MeshPhongMaterial({ color: 0xaaaaaa, flatShading: true })
    };

    const enableShadows = (obj: THREE.Object3D) => {
        obj.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    };

    // --- Airplane (Carrot) ---
    const airplane = new THREE.Group();
    
    // Body
    const bodyGeom = new THREE.CylinderGeometry(5, 2, 25, 8);
    const body = new THREE.Mesh(bodyGeom, mats.orange);
    body.rotation.x = Math.PI / 2; // Thick end (radius 5) faces -Z
    airplane.add(body);
    
    // Wings
    const wingGeom = new THREE.BoxGeometry(20, 0.5, 6);
    const wings = new THREE.Mesh(wingGeom, mats.brown);
    wings.position.set(0, 0, -2);
    airplane.add(wings);

    // Tail
    const tailGeom = new THREE.BoxGeometry(1, 4, 4);
    const tail = new THREE.Mesh(tailGeom, mats.brown);
    tail.position.set(0, 2, 10);
    airplane.add(tail);

    // Propeller (Leafs)
    const propeller = new THREE.Group();
    const leafGeom = new THREE.CylinderGeometry(1.5, 1, 5, 4);
    for(let i=0; i<3; i++) {
        const leaf = new THREE.Mesh(leafGeom, mats.green);
        leaf.position.y = 3;
        const pivot = new THREE.Group();
        pivot.rotation.z = (Math.PI * 2 / 3) * i;
        pivot.add(leaf);
        propeller.add(pivot);
    }
    propeller.position.z = 12.5; // Moved to the back (tail)
    airplane.add(propeller);
    
    // --- Pilot (Rabbit) ---
    const pilot = new THREE.Group();
    
    const pBody = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), mats.rabbit);
    pBody.position.y = 2.5;
    pilot.add(pBody);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), mats.brown);
    seat.position.set(0, -2.5, 0);
    pBody.add(seat);

    // Ears
    const earGeom = new THREE.BoxGeometry(2, 6, 0.5);
    
    const earL = new THREE.Group();
    earL.position.set(-1.5, 2.5, 0);
    const earMeshL = new THREE.Mesh(earGeom, mats.rabbit);
    earMeshL.position.y = 3;
    const earInsideL = new THREE.Mesh(earGeom, mats.pink);
    earInsideL.scale.set(0.5, 0.7, 0.5);
    earInsideL.position.set(0, 3, -0.26); // Moved to the front
    earL.add(earMeshL, earInsideL);
    pBody.add(earL);

    const earR = new THREE.Group();
    earR.position.set(1.5, 2.5, 0);
    const earMeshR = new THREE.Mesh(earGeom, mats.rabbit);
    earMeshR.position.y = 3;
    const earInsideR = new THREE.Mesh(earGeom, mats.pink);
    earInsideR.scale.set(0.5, 0.7, 0.5);
    earInsideR.position.set(0, 3, -0.26); // Moved to the front
    earR.add(earMeshR, earInsideR);
    pBody.add(earR);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), mats.gray);
    eyeL.position.set(-1, 0.5, -2.5);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), mats.gray);
    eyeR.position.set(1, 0.5, -2.5);
    pBody.add(eyeL, eyeR);

    // Nose
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mats.pink);
    nose.position.set(0, -0.5, -2.5);
    pBody.add(nose);

    // Mouth
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.5), mats.gray);
    mouth.position.set(0, -1.5, -2.5);
    pBody.add(mouth);

    pilot.position.set(0, 3, 2);
    airplane.add(pilot);
    
    enableShadows(airplane);
    scene.add(airplane);

    // --- Clouds ---
    const clouds: { group: THREE.Group, isSpecial: boolean, active: boolean }[] = [];

    const createCloud = (isSpecial: boolean) => {
        const group = new THREE.Group();
        const mat = isSpecial ? mats.specialClouds : mats.clouds;
        const cloudGeo = new THREE.SphereGeometry(5, 4, 6);
        
        const c1 = new THREE.Mesh(cloudGeo, mat);
        c1.scale.set(1, 0.8, 1);
        
        const c2 = new THREE.Mesh(cloudGeo, mat);
        c2.scale.set(0.55, 0.35, 1);
        c2.position.set(5, -1.5, 2);
        
        const c3 = new THREE.Mesh(cloudGeo, mat);
        c3.scale.set(0.75, 0.5, 1);
        c3.position.set(-5.5, -2, -1);
        
        group.add(c1, c2, c3);
        
        enableShadows(group);
        return { group };
    };

    for (let i = 0; i < 40; i++) {
        const isSpecial = Math.random() < 0.25;
        const { group: cloudGroup } = createCloud(isSpecial);
        cloudGroup.position.set(
            (Math.random() - 0.5) * (isMobile ? 70 : 150),
            (Math.random() - 0.5) * (isMobile ? 50 : 80),
            -100 - Math.random() * 400
        );
        scene.add(cloudGroup);
        clouds.push({ group: cloudGroup, isSpecial, active: true });
    }

    // --- Boss Cloud ---
    const bossCloud = new THREE.Group();
    const bossMat = new THREE.MeshPhongMaterial({ color: 0x050505, flatShading: true });
    for (let j = 0; j < 12; j++) {
        const geom = new THREE.DodecahedronGeometry(12 + Math.random() * 8);
        const mesh = new THREE.Mesh(geom, bossMat);
        mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 40);
        bossCloud.add(mesh);
    }
    enableShadows(bossCloud);
    bossCloud.visible = false;
    scene.add(bossCloud);
    let bossActive = false;
    let rainCycleCount = 0;

    // --- Lightning ---
    const lightningMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const lightningGeometry = new THREE.BufferGeometry();
    const lightningBolt = new THREE.Line(lightningGeometry, lightningMaterial);
    lightningBolt.visible = false;
    scene.add(lightningBolt);

    const lightningLight = new THREE.PointLight(0xccffff, 0, 200);
    scene.add(lightningLight);

    let flashTimer = 0;
    let isFlashing = false;

    function triggerLightning() {
        playThunderSound();
        const startX = (Math.random() - 0.5) * 150;
        const startZ = -100 - Math.random() * 200;
        const startY = 50 + Math.random() * 50;

        lightningLight.position.set(startX, startY, startZ);
        lightningLight.intensity = 500 + Math.random() * 500;

        const points = [];
        let currPos = new THREE.Vector3(startX, startY, startZ);
        points.push(currPos.clone());

        while(currPos.y > -50) {
            currPos.y -= 10 + Math.random() * 10;
            currPos.x += (Math.random() - 0.5) * 20;
            currPos.z += (Math.random() - 0.5) * 20;
            points.push(currPos.clone());
        }

        lightningBolt.geometry.dispose();
        lightningBolt.geometry = new THREE.BufferGeometry().setFromPoints(points);
        lightningBolt.visible = true;
        scene.background = new THREE.Color('#374151');
        flashTimer = 5 + Math.floor(Math.random() * 10);
        isFlashing = true;
    }

    function triggerMassiveLightning(targetPos?: THREE.Vector3) {
        playThunderSound();
        const startX = targetPos ? targetPos.x : bossCloud.position.x;
        const startZ = targetPos ? targetPos.z : bossCloud.position.z;
        const startY = (targetPos ? targetPos.y : bossCloud.position.y) + 50;

        lightningLight.position.set(startX, startY, startZ);
        lightningLight.intensity = 10000;

        const points = [];
        let currPos = new THREE.Vector3(startX, startY, startZ);
        points.push(currPos.clone());

        const endY = targetPos ? targetPos.y : -100;

        while(currPos.y > endY) {
            currPos.y -= 15 + Math.random() * 15;
            currPos.x += (Math.random() - 0.5) * 20;
            currPos.z += (Math.random() - 0.5) * 20;
            points.push(currPos.clone());
        }

        if (targetPos) {
            points.push(targetPos.clone());
        }

        lightningBolt.geometry.dispose();
        lightningBolt.geometry = new THREE.BufferGeometry().setFromPoints(points);
        lightningBolt.visible = true;
        scene.background = new THREE.Color('#ffffff'); // Huge flash
        flashTimer = 30; // Longer flash
        isFlashing = true;
    }

    function triggerDistantFlash() {
        playThunderSound();
        const startX = (Math.random() - 0.5) * 200;
        const startZ = -400 - Math.random() * 100; // Far away
        const startY = 100 + Math.random() * 50;

        lightningLight.position.set(startX, startY, startZ);
        lightningLight.intensity = 8000;

        const points = [];
        let currPos = new THREE.Vector3(startX, startY, startZ);
        points.push(currPos.clone());

        while(currPos.y > -50) {
            currPos.y -= 20 + Math.random() * 20;
            currPos.x += (Math.random() - 0.5) * 40;
            currPos.z += (Math.random() - 0.5) * 40;
            points.push(currPos.clone());
        }

        lightningBolt.geometry.dispose();
        lightningBolt.geometry = new THREE.BufferGeometry().setFromPoints(points);
        lightningBolt.visible = true;
        scene.background = new THREE.Color('#e0e7ff'); // Bright flash
        flashTimer = 15; // Medium flash duration
        isFlashing = true;
    }

    // --- Rain ---
    const rainCount = 3000;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount; i++) {
        rainPos[i*3] = (Math.random() - 0.5) * 200;
        rainPos[i*3+1] = (Math.random() - 0.5) * 100 + 20;
        rainPos[i*3+2] = (Math.random() - 0.5) * 400 - 100;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.3,
        transparent: true,
        opacity: 0.6
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);

    // --- Animation Loop ---
    let animationId: number;
    let targetX = 0;
    let targetY = 0;
    const speed = 2.5;
    let wasRaining = false;
    let currentEarRot = -0.3;
    let lastTime = 0;

    let cinematicState = 0;
    let cinematicProgress = 0;
    let lastCinematicScore = 0;
    let currentLookAt = new THREE.Vector3(0, 0, -50);
    let flash8sTriggered = false;
    let isCrashed = false;
    let crashTimer = 0;

    const colorLight = new THREE.Color(0xeeeeee);
    const colorDark = new THREE.Color(0x1a1a1a);

    const animate = (timeMs: number) => {
        animationId = requestAnimationFrame(animate);
        const delta = lastTime === 0 ? 0 : (timeMs - lastTime) / 1000;
        lastTime = timeMs;
        const timeSec = timeMs / 1000;

        if (isGameOverRef.current) {
            if (isFlashing) {
                flashTimer--;
                lightningLight.intensity = Math.random() * 1000;
                if (flashTimer <= 0) {
                    isFlashing = false;
                    lightningLight.intensity = 0;
                    lightningBolt.visible = false;
                    scene.background = new THREE.Color('#111827');
                }
            }
            renderer.render(scene, camera);
            return;
        }

        if (isCrashed) {
            crashTimer -= delta;
            
            // Shake the airplane to simulate being stuck in the cloud
            airplane.position.x += (Math.random() - 0.5) * 0.4;
            airplane.position.y += (Math.random() - 0.5) * 0.4;
            propeller.rotation.z -= 0.2;
            
            if (crashTimer <= 0) {
                isCrashed = false;
                triggerMassiveLightning(airplane.position);
                isGameOverRef.current = true;
                setGameOver(true);
            }
            
            renderer.render(scene, camera);
            return; // Freeze the rest of the game world
        }

        // Rain (Every 1:25 minutes, lasts 30 seconds)
        const cycle = timeSec % 85;
        const isRaining = cycle < 30;
        
        // Update ambient weather sounds
        updateWeatherSounds(isRaining, delta);
        
        // Smoothly transition cloud colors based on weather
        const targetCloudColor = isRaining ? colorDark : colorLight;
        const targetSpecialColor = isRaining ? colorLight : colorDark;
        
        mats.clouds.color.lerp(targetCloudColor, delta * 2);
        mats.specialClouds.color.lerp(targetSpecialColor, delta * 2);
        
        if (isRaining !== wasRaining) {
            if (wasRaining && !isRaining) {
                // Rain just ended
                rainCycleCount++;
                if (rainCycleCount % 2 === 0) {
                    // Spawn boss cloud
                    bossCloud.position.set(
                        (Math.random() - 0.5) * (isMobile ? 40 : 80),
                        (Math.random() - 0.5) * (isMobile ? 30 : 40),
                        -400
                    );
                    bossCloud.visible = true;
                    bossActive = true;
                }
            } else if (!wasRaining && isRaining) {
                // Rain just started
                flash8sTriggered = false;
            }
            wasRaining = isRaining;
            setWeather(isRaining ? 'STORM' : 'CLEAR');
        }

        if (isRaining && cycle >= 8 && !flash8sTriggered) {
            flash8sTriggered = true;
            if (rainCycleCount % 2 !== 0) { // No boss cloud will spawn at the end of this rain
                triggerDistantFlash();
            }
        }

        // Propeller
        propeller.rotation.z -= 0.5;

        // Rabbit Ears (bend back during storm)
        const targetEarRot = isRaining ? 0.8 : -0.3;
        currentEarRot += (targetEarRot - currentEarRot) * 0.05;
        earL.rotation.x = currentEarRot + Math.sin(timeSec * 10) * 0.1;
        earR.rotation.x = currentEarRot + Math.sin(timeSec * 10 + Math.PI) * 0.1;

        // Rabbit Eyes Blinking
        if (Math.random() < 0.01) {
            eyeL.scale.y = 0.1;
            eyeR.scale.y = 0.1;
        } else {
            eyeL.scale.y += (1 - eyeL.scale.y) * 0.2;
            eyeR.scale.y += (1 - eyeR.scale.y) * 0.2;
        }

        // Cinematic Check
        if (scoreRef.current > 0 && scoreRef.current % 100 === 0 && scoreRef.current !== lastCinematicScore && cinematicState === 0) {
            cinematicState = 1;
            cinematicProgress = 0;
            lastCinematicScore = scoreRef.current;
        }

        // Controls
        if (cinematicState === 0) {
            const k = keys.current;
            const t = tilt.current;
            if (k['ArrowLeft'] || k['KeyA']) targetX -= 1.2;
            if (k['ArrowRight'] || k['KeyD']) targetX += 1.2;
            if (k['ArrowUp'] || k['KeyW']) targetY += 1.2;
            if (k['ArrowDown'] || k['KeyS']) targetY -= 1.2;

            if (t.x !== 0) targetX += t.x * 1.2;
            if (t.y !== 0) targetY += t.y * 1.2;
        }

        // Circular boundary to keep airplane near center
        const maxRadius = isMobile ? 22 : 40;
        const dist = Math.sqrt(targetX * targetX + targetY * targetY);
        if (dist > maxRadius) {
            targetX = (targetX / dist) * maxRadius;
            targetY = (targetY / dist) * maxRadius;
        }

        airplane.position.x += (targetX - airplane.position.x) * 0.1;
        airplane.position.y += (targetY - airplane.position.y) * 0.1;

        airplane.rotation.z = (airplane.position.x - targetX) * 0.05;
        airplane.rotation.x = (targetY - airplane.position.y) * 0.05;

        // Clouds
        clouds.forEach(cloud => {
            cloud.group.position.z += speed;

            if (cloud.active && cloud.isSpecial) {
                const dist = airplane.position.distanceTo(cloud.group.position);
                if (dist < 12) {
                    playPopSound();
                    cloud.active = false;
                    cloud.group.visible = false;
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                }
            }

            if (cloud.isSpecial) {
                let targetScale = 1;
                if (isRaining) {
                    targetScale = 1.4 + Math.sin(timeSec * 4 + cloud.group.position.x) * 0.4;
                }
                cloud.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
            }

            if (cloud.group.position.z > 50) {
                cloud.group.position.set(
                    (Math.random() - 0.5) * (isMobile ? 70 : 150),
                    (Math.random() - 0.5) * (isMobile ? 50 : 80),
                    -300 - Math.random() * 200
                );
                cloud.active = true;
                cloud.group.visible = true;
            }
        });

        // Boss Cloud Logic
        if (bossActive) {
            bossCloud.position.z += speed * 1.2; // slightly faster
            if (airplane.position.distanceTo(bossCloud.position) < 30) {
                // Hit boss cloud! Survived.
                bossActive = false;
                bossCloud.visible = false;
                triggerMassiveLightning();
            } else if (bossCloud.position.z > 50) {
                // Missed boss cloud! Game Over!
                bossActive = false;
                bossCloud.visible = false;
                triggerMassiveLightning(airplane.position); // Strike the player
                isGameOverRef.current = true;
                setGameOver(true);
            }
        }

        // Lightning (only during storm)
        if (isFlashing) {
            flashTimer--;
            lightningLight.intensity = Math.random() * 1000;
            if (flashTimer <= 0) {
                isFlashing = false;
                lightningLight.intensity = 0;
                lightningBolt.visible = false;
                scene.background = new THREE.Color('#111827');
            }
        } else if (isRaining) {
            if (Math.random() < 0.005) triggerLightning();
        }

        // Rain Opacity Fade
        const targetRainOpacity = isRaining ? 0.6 : 0;
        rainMat.opacity += (targetRainOpacity - rainMat.opacity) * delta * 2;
        rainSystem.visible = rainMat.opacity > 0.01;

        if (rainSystem.visible) {
            const positions = rainSystem.geometry.attributes.position.array as Float32Array;
            for(let i=0; i<rainCount; i++) {
                positions[i*3+2] += 15; // Move fast towards camera (+Z)
                positions[i*3+1] -= 1;  // Fall down slightly
                if (positions[i*3+2] > 50) {
                    positions[i*3+2] = -300 - Math.random() * 100;
                    positions[i*3+1] = (Math.random() - 0.5) * 100 + 20;
                    positions[i*3] = (Math.random() - 0.5) * 200;
                }
            }
            rainSystem.geometry.attributes.position.needsUpdate = true;
        }

        // Camera follow
        const baseCamZ = isMobile ? 90 : 60;
        const baseCamY = isMobile ? 25 : 15;
        const normalCamPos = new THREE.Vector3(airplane.position.x * 0.4, baseCamY + airplane.position.y * 0.4, baseCamZ);
        const normalLookAt = new THREE.Vector3(airplane.position.x * 0.1, airplane.position.y * 0.1, -50);
        
        // Wider cinematic shot
        const frontCamPos = new THREE.Vector3(airplane.position.x + (isMobile ? 35 : 25), airplane.position.y + 10, airplane.position.z - (isMobile ? 45 : 35));
        const frontLookAt = new THREE.Vector3(airplane.position.x, airplane.position.y + 2, airplane.position.z);

        if (cinematicState > 0) {
            if (cinematicState === 1) {
                cinematicProgress += delta;
                const t = Math.min(cinematicProgress / 1.5, 1.0); // 1.5s transition
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                camera.position.lerpVectors(normalCamPos, frontCamPos, ease);
                currentLookAt.lerpVectors(normalLookAt, frontLookAt, ease);
                if (t >= 1.0) {
                    cinematicState = 2;
                    cinematicProgress = 0;
                }
            } else if (cinematicState === 2) {
                cinematicProgress += delta;
                camera.position.copy(frontCamPos);
                currentLookAt.copy(frontLookAt);
                if (cinematicProgress >= 2.5) { // 2.5s hold
                    cinematicState = 3;
                    cinematicProgress = 0;
                }
            } else if (cinematicState === 3) {
                cinematicProgress += delta;
                const t = Math.min(cinematicProgress / 1.5, 1.0); // 1.5s transition
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                camera.position.lerpVectors(frontCamPos, normalCamPos, ease);
                currentLookAt.lerpVectors(frontLookAt, normalLookAt, ease);
                if (t >= 1.0) {
                    cinematicState = 0;
                }
            }
        } else {
            camera.position.lerp(normalCamPos, 0.05);
            currentLookAt.lerp(normalLookAt, 0.05);
        }
        
        camera.lookAt(currentLookAt);

        renderer.render(scene, camera);
    };

    animationId = requestAnimationFrame(animate);

    // --- Resize Handler ---
    const handleResize = () => {
        isMobile = window.innerWidth < 768;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
    };
  }, [started, gameKey]);

  // --- React Event Handlers for Controls ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
      }
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
      keys.current[e.code] = false;
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      let x = e.gamma / 30;
      let y = -(e.beta - 45) / 30; // 45 degrees is neutral holding position
      x = Math.max(-1, Math.min(1, x));
      y = Math.max(-1, Math.min(1, y));
      tilt.current = { x, y };
  };

  useEffect(() => {
      return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const startGame = async () => {
      playPopSound();
      initAmbientSounds();
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
              const permission = await (DeviceOrientationEvent as any).requestPermission();
              if (permission === 'granted') {
                  window.addEventListener('deviceorientation', handleOrientation);
              }
          } catch (e) {
              console.error("Device orientation permission error:", e);
          }
      } else {
          window.addEventListener('deviceorientation', handleOrientation);
      }
      setStarted(true);
      setTimeout(() => containerRef.current?.focus(), 100);
  };

  const restartGame = () => {
      playPopSound();
      setScore(0);
      scoreRef.current = 0;
      setGameOver(false);
      isGameOverRef.current = false;
      setWeather('CLEAR');
      setGameKey(k => k + 1);
      tilt.current = { x: 0, y: 0 };
      setTimeout(() => containerRef.current?.focus(), 100);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-slate-900 focus:outline-none" 
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {!started ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-50 text-white backdrop-blur-sm px-4">
            <h1 className="text-4xl md:text-6xl font-black text-orange-500 mb-4 tracking-tight text-center">CARROT FLIGHT</h1>
            <p className="mb-2 text-base md:text-xl text-slate-300 text-center">Use <strong className="text-white">WASD / Arrows</strong> or <strong className="text-white">Tilt your device</strong> to fly</p>
            <p className="mb-2 text-sm md:text-xl text-orange-400 font-medium whitespace-normal md:whitespace-nowrap text-center max-w-3xl">Collect dark clouds in clear weather, and white clouds during storms!</p>
            <p className="mb-10 text-sm md:text-xl text-orange-400 font-medium whitespace-normal md:whitespace-nowrap text-center max-w-3xl">Fly into the large cloud to survive.</p>
            <button 
                onClick={startGame}
                className="px-8 py-4 md:px-10 md:py-5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-2xl text-xl md:text-2xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-orange-500/30"
            >
                START GAME
            </button>
        </div>
      ) : (
        <>
            <div ref={mountRef} className="absolute inset-0" />
            
            {/* Score UI */}
            <div className="absolute top-4 left-4 md:top-6 md:left-6 text-white font-mono bg-slate-900/60 px-4 py-3 md:px-6 md:py-4 rounded-2xl pointer-events-none border border-white/10 shadow-2xl backdrop-blur-md flex flex-col gap-1">
                <span className="text-teal-400 text-xs md:text-sm font-bold uppercase tracking-wider">Score</span>
                <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-2xl md:text-3xl">☁️</span>
                    <span className="font-black text-3xl md:text-5xl tracking-tighter">{score}</span>
                </div>
            </div>

            {/* Weather UI */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 text-white font-mono bg-slate-900/60 px-4 py-3 md:px-6 md:py-4 rounded-2xl pointer-events-none border border-white/10 shadow-2xl backdrop-blur-md flex flex-col gap-1 items-end">
                <span className="text-slate-400 text-xs md:text-sm font-bold uppercase tracking-wider">Weather</span>
                <div className="flex items-center gap-2">
                    <span className={`font-black text-xl md:text-2xl tracking-tighter ${weather === 'STORM' ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {weather === 'STORM' ? '🌧️ STORM' : '☀️ CLEAR'}
                    </span>
                </div>
            </div>
            
            {/* Controls Hint */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-slate-400 font-mono text-xs md:text-sm bg-slate-900/40 px-3 py-2 md:px-4 md:py-2 rounded-lg pointer-events-none backdrop-blur-sm">
                WASD / Arrows / Tilt to move
            </div>

            {/* Game Over Screen */}
            {gameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-50 text-white backdrop-blur-md px-4">
                    <h1 className="text-4xl md:text-6xl font-black text-orange-500 mb-4 tracking-tight uppercase text-center">Flight Interrupted!</h1>
                    <p className="mb-6 text-lg md:text-2xl text-pink-400 text-center whitespace-normal md:whitespace-nowrap">You missed the storm cloud and were struck by lightning.</p>
                    
                    <div className="bg-black/50 p-6 md:p-8 rounded-3xl mb-8 md:mb-10 text-center border border-orange-500/30 shadow-2xl">
                        <p className="text-slate-400 uppercase tracking-widest text-xs md:text-sm font-bold mb-2">Clouds Collected</p>
                        <p className="text-5xl md:text-7xl font-black text-orange-400">{score}</p>
                    </div>

                    <button 
                        onClick={restartGame}
                        className="px-8 py-4 md:px-10 md:py-5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 rounded-2xl text-xl md:text-2xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-orange-500/30 text-white"
                    >
                        BACK TO BEGINNING
                    </button>
                </div>
            )}
        </>
      )}
    </div>
  );
}
