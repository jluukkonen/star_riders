import * as THREE from 'three';
import { addRimLight } from './utils';

export class CatPilotAvatar {
    public mesh: THREE.Group;

    // Animatable components
    private bodyMesh: THREE.Mesh;
    private leftEar: THREE.Group;
    private rightEar: THREE.Group;
    private leftEye: THREE.Group;
    private rightEye: THREE.Group;
    private leftFoot: THREE.Mesh;
    private rightFoot: THREE.Mesh;
    private leftHand: THREE.Mesh;
    private rightHand: THREE.Mesh;
    private tail: THREE.Mesh;
    private mouth: THREE.Mesh;

    // Animation state
    private time: number = 0;
    private blinkTimer: number = 0;
    private earTwitchTimer: number = 0;
    private earTwitchAmount: number = 0;
    private shootTimer: number = 0;
    private hitTimer: number = 0;

    constructor(parent: THREE.Object3D, furColor: number = 0xffeebb) {
        this.mesh = new THREE.Group();

        // Materials
        const furMaterial = addRimLight(new THREE.MeshPhongMaterial({ color: furColor, flatShading: false }));
        const pinkMaterial = addRimLight(new THREE.MeshPhongMaterial({ color: 0xff99aa, flatShading: false }));
        const blackMaterial = new THREE.MeshPhongMaterial({ color: 0x222222, flatShading: false });
        const whiteMaterial = addRimLight(new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: false }));

        // 1. Main Body (Kirby-like spherical body)
        const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
        this.bodyMesh = new THREE.Mesh(bodyGeo, furMaterial);
        this.bodyMesh.position.y = 1; // Center of mass
        this.mesh.add(this.bodyMesh);

        // 2. Ears (Cones with pink inners)
        const earOutGeo = new THREE.ConeGeometry(0.35, 0.6, 16);
        const earInGeo = new THREE.ConeGeometry(0.18, 0.4, 16);
        earOutGeo.translate(0, 0.3, 0); // Shift pivot to base
        earInGeo.translate(0, 0.2, 0);

        this.leftEar = new THREE.Group();
        const lEarOut = new THREE.Mesh(earOutGeo, furMaterial);
        const lEarIn = new THREE.Mesh(earInGeo, pinkMaterial);
        lEarIn.position.z = 0.12; 
        lEarIn.position.y = 0.05;
        this.leftEar.add(lEarOut, lEarIn);
        this.leftEar.position.set(-0.5, 0.7, 0);
        this.leftEar.rotation.z = Math.PI / 6;
        this.leftEar.rotation.x = -Math.PI / 12;
        this.bodyMesh.add(this.leftEar);

        this.rightEar = new THREE.Group();
        const rEarOut = new THREE.Mesh(earOutGeo, furMaterial);
        const rEarIn = new THREE.Mesh(earInGeo, pinkMaterial);
        rEarIn.position.z = 0.12;
        rEarIn.position.y = 0.05;
        this.rightEar.add(rEarOut, rEarIn);
        this.rightEar.position.set(0.5, 0.7, 0);
        this.rightEar.rotation.z = -Math.PI / 6;
        this.rightEar.rotation.x = -Math.PI / 12;
        this.bodyMesh.add(this.rightEar);

        // 3. Face
        // Eyes
        this.leftEye = new THREE.Group();
        this.leftEye.position.set(-0.28, 0.15, 0.92);
        this.leftEye.rotation.y = -0.15;
        this.leftEye.rotation.z = 0.05;

        const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const lEyeMesh = new THREE.Mesh(eyeGeo, blackMaterial);
        lEyeMesh.scale.set(0.75, 1, 0.25);
        
        const highlightGeo = new THREE.SphereGeometry(0.035, 12, 12);
        const lHighlight = new THREE.Mesh(highlightGeo, whiteMaterial);
        lHighlight.position.set(0.03, 0.04, 0.03);

        this.leftEye.add(lEyeMesh, lHighlight);
        this.leftEye.scale.set(1, 1.25, 1);

        this.rightEye = new THREE.Group();
        this.rightEye.position.set(0.28, 0.15, 0.92);
        this.rightEye.rotation.y = 0.15;
        this.rightEye.rotation.z = -0.05;

        const rEyeMesh = new THREE.Mesh(eyeGeo, blackMaterial);
        rEyeMesh.scale.set(0.75, 1, 0.25);

        const rHighlight = new THREE.Mesh(highlightGeo, whiteMaterial);
        rHighlight.position.set(0.03, 0.04, 0.03);

        this.rightEye.add(rEyeMesh, rHighlight);
        this.rightEye.scale.set(1, 1.25, 1);

        this.bodyMesh.add(this.leftEye, this.rightEye);

        // Cheeks
        const cheekGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const lCheek = new THREE.Mesh(cheekGeo, pinkMaterial);
        lCheek.scale.set(1.4, 0.6, 0.3);
        lCheek.position.set(-0.45, -0.02, 0.88);
        lCheek.rotation.y = -0.2;
        lCheek.rotation.z = 0.1;
        
        const rCheek = new THREE.Mesh(cheekGeo, pinkMaterial);
        rCheek.scale.set(1.4, 0.6, 0.3);
        rCheek.position.set(0.45, -0.02, 0.88);
        rCheek.rotation.y = 0.2;
        rCheek.rotation.z = -0.1;

        this.bodyMesh.add(lCheek, rCheek);

        // Nose/Muzzle
        const noseGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const nose = new THREE.Mesh(noseGeo, pinkMaterial);
        nose.scale.set(1.4, 0.8, 0.5);
        nose.position.set(0, -0.02, 0.98);
        this.bodyMesh.add(nose);

        // Mouth (Small black sphere below nose that we can scale)
        const mouthGeo = new THREE.SphereGeometry(0.035, 16, 16);
        this.mouth = new THREE.Mesh(mouthGeo, blackMaterial);
        this.mouth.position.set(0, -0.12, 0.94);
        this.bodyMesh.add(this.mouth);

        // Whiskers
        // Default cylinder points along Y. Rotate it to point along X.
        const whiskerGeo = new THREE.CylinderGeometry(0.008, 0.002, 0.4, 8);
        whiskerGeo.rotateZ(Math.PI / 2); // Now points along X. Thick root is at -X, thin tip is at +X.
        whiskerGeo.translate(0.2, 0, 0); // Move so root is at origin (0,0,0) and tip is at +0.4 along X.
        for (let i = -1; i <= 1; i++) {
            // Left Whiskers
            const lw = new THREE.Mesh(whiskerGeo, whiteMaterial);
            lw.position.set(-0.55, -0.05, 0.85); // mount point naturally behind the cheek
            // Since it points +X by default, we need it to point -X for the left side -> rotate Z by PI
            // Add spread using `i`
            lw.rotation.z = Math.PI + (i * 0.15);
            lw.rotation.y = -0.3; // Angle slightly back
            
            // Right Whiskers
            const rw = new THREE.Mesh(whiskerGeo, whiteMaterial);
            rw.position.set(0.55, -0.05, 0.85);
            // Right side points +X, so base rotation is 0
            rw.rotation.z = -(i * 0.15); // Negate i so spread goes outward same way
            rw.rotation.y = 0.3; // Angle slightly back
            
            this.bodyMesh.add(lw, rw);
        }

        // 4. Hands
        const handGeo = new THREE.SphereGeometry(0.22, 24, 24);
        this.leftHand = new THREE.Mesh(handGeo, furMaterial);
        this.leftHand.position.set(-0.95, -0.1, 0.2);
        this.rightHand = new THREE.Mesh(handGeo, furMaterial);
        this.rightHand.position.set(0.95, -0.1, 0.2);
        this.bodyMesh.add(this.leftHand, this.rightHand);

        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.12, 0.05, 0.6, 16);
        tailGeo.translate(0, 0.3, 0); // pivot at base
        this.tail = new THREE.Mesh(tailGeo, furMaterial);
        this.tail.position.set(0, -0.2, -0.9);
        this.tail.rotation.x = -Math.PI / 2.5; // angle upwards
        this.bodyMesh.add(this.tail);

        // 5. Feet (Flattened Spheres)
        const footGeo = new THREE.SphereGeometry(0.28, 24, 24);
        this.leftFoot = new THREE.Mesh(footGeo, furMaterial);
        this.leftFoot.scale.set(1.1, 0.6, 1.4);
        this.leftFoot.position.set(-0.45, 0.15, 0.2);
        this.rightFoot = new THREE.Mesh(footGeo, furMaterial);
        this.rightFoot.scale.set(1.1, 0.6, 1.4);
        this.rightFoot.position.set(0.45, 0.15, 0.2);
        this.mesh.add(this.leftFoot, this.rightFoot);

        // Cast & Receive Shadows
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Add to parent
        parent.add(this.mesh);

        // Intitialize timers
        this.blinkTimer = Math.random() * 3 + 2;
        this.earTwitchTimer = Math.random() * 4 + 1;
    }

    public setPosition(x: number, z: number) {
        this.mesh.position.set(x, this.mesh.position.y, z);
    }

    public dispose() {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }

    public triggerShoot() {
        this.shootTimer = 0.3;
    }

    public triggerHit() {
        this.hitTimer = 0.5;
    }

    public update(deltaTime: number, isMoving: boolean, isAirborne: boolean, isCharging: boolean = false, bankAngle: number = 0, spinAngle: number = 0, yVelocity: number = 0, state: 'normal' | 'crashed' | 'victory' = 'normal', isDrifting: boolean = false) {
        this.time += deltaTime;

        // 1. Blinking Logic
        this.blinkTimer -= deltaTime;
        if (this.blinkTimer <= 0) {
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
            this.blinkTimer = Math.random() * 3 + 2;
        } else if (this.blinkTimer < 1.8) {
            this.leftEye.scale.y = THREE.MathUtils.lerp(this.leftEye.scale.y, 1.25, 15 * deltaTime);
            this.rightEye.scale.y = THREE.MathUtils.lerp(this.rightEye.scale.y, 1.25, 15 * deltaTime);
        }

        // Ear Twitch Logic
        this.earTwitchTimer -= deltaTime;
        if (this.earTwitchTimer <= 0) {
            this.earTwitchAmount = 0.4; // spike
            this.earTwitchTimer = Math.random() * 4 + 1;
        }
        this.earTwitchAmount = THREE.MathUtils.lerp(this.earTwitchAmount, 0, 10 * deltaTime);

        // 2. Animation Target States
        let bodyRz = 0, bodyRx = 0, bodyRy = 0;
        let lFootPx = -0.45, lFootPy = 0.15, lFootPz = 0.2;
        let rFootPx = 0.45, rFootPy = 0.15, rFootPz = 0.2;
        let lFootRx = 0, lFootRz = 0;
        let rFootRx = 0, rFootRz = 0;
        let lHandPx = -0.95, lHandPy = -0.1, lHandPz = 0.2;
        let rHandPx = 0.95, rHandPy = -0.1, rHandPz = 0.2;
        let lHandRz = 0, rHandRz = 0;
        let lEarRz = Math.PI / 6, rEarRz = -Math.PI / 6;
        let bodyY = 1;
        let pScaleX = 1, pScaleY = 1, pScaleZ = 1;
        let tailRx = -Math.PI / 2.5, tailRz = 0;
        let mouthSx = 1, mouthSy = 1;

        // Apply external spin trick + 180 degrees rotation so cat faces the same direction as the ship's nose
        this.mesh.rotation.y = spinAngle + Math.PI;
        
        // Head tracking: Gaze into the turn universally
        bodyRy = bankAngle * -0.6; // Look direction

        if (state === 'crashed') {
            // Crash / Dizzy State
            bodyY = 0.3;
            bodyRx = -Math.PI / 2; // Flat on back
            bodyRz = 0;
            bodyRy = this.time * 2; // slowly spin around on ground
            lHandPx = -1.1; lHandPy = 0.2; lHandRz = Math.PI / 4;
            rHandPx = 1.1; rHandPy = -0.2; rHandRz = -Math.PI / 4;
            lFootPx = -0.6; lFootPy = 0.5; lFootRx = Math.PI / 4;
            rFootPx = 0.6; rFootPy = 0.2; rFootRx = -Math.PI / 4;
            lEarRz = Math.PI / 2; rEarRz = -Math.PI / 2; // ears flat
            mouthSx = 0.5; mouthSy = 0.5;
            pScaleY = 0.8; // flattened
            tailRx = -Math.PI / 2.5;

            // Spirals in eyes (we'll just flutter the scales to look dizzy)
            this.leftEye.scale.set(1 + Math.sin(this.time * 20) * 0.2, 0.2, 1);
            this.rightEye.scale.set(1 + Math.cos(this.time * 20) * 0.2, 0.2, 1);
            this.blinkTimer = 10; // disable blink

        } else if (state === 'victory') {
            // Victory Pose
            bodyY = 1.8 + Math.abs(Math.sin(this.time * 5)) * 0.5; // bouncing high
            bodyRy = this.time * 3; // spinning in joy
            pScaleX = 0.9; pScaleY = 1.1; pScaleZ = 0.9; // stretched out
            
            // Standing on one foot
            lFootPx = 0; lFootPy = 0.1; lFootPz = 0; 
            lFootRx = 0; 
            
            // Other foot up
            rFootPx = 0.6; rFootPy = 0.8; rFootRx = -Math.PI / 4;

            // Waving arms
            lHandPx = -1.0; lHandPy = 0.8; lHandRz = -Math.PI / 4 + Math.sin(this.time * 15) * 0.5;
            rHandPx = 1.0; rHandPy = 0.8; rHandRz = Math.PI / 4 - Math.sin(this.time * 15) * 0.5;

            lEarRz = Math.PI / 8; rEarRz = -Math.PI / 8; // alert ears
            mouthSx = 1.2; mouthSy = 2.0; // Big smile/open mouth

            tailRx = -Math.PI / 6; // tail straight up
            tailRz = Math.sin(this.time * 10) * 0.5; // fast wagging
            
        } else if (isDrifting) {
            // Drift / Slide
            pScaleX = 1.1; pScaleY = 0.8; pScaleZ = 1.1; // lower center of gravity
            bodyY = 0.7;
            bodyRz = bankAngle * -0.6; // heavy lean
            bodyRy = bankAngle * -0.8; // gaze hard into turn

            // Grip edges deeply
            lHandPx = -1.0; lHandPy = -0.5; lHandRz = Math.PI / 6;
            rHandPx = 1.0; rHandPy = -0.5; rHandRz = -Math.PI / 6;
            
            // Widen stance
            lFootPx = -0.8; lFootPy = 0.1;
            rFootPx = 0.8; rFootPy = 0.1;

            lEarRz = Math.PI / 4; rEarRz = -Math.PI / 4; // Ears back slightly from wind
            lEarRz -= bankAngle * 0.3; rEarRz -= bankAngle * 0.3;
            
            tailRx = -Math.PI / 1.5; // Tail low
            tailRz = bankAngle * 0.5; // Tail whips opposite direction
            mouthSx = 1.5; mouthSy = 0.5; // Gritting teeth 
        } else if (isCharging && !isAirborne) {
            // Charging/Squatting (Building Boost)
            pScaleX = 1.15; pScaleY = 0.75; pScaleZ = 1.15;
            bodyY = 0.8;
            lHandPx = -0.8; lHandPy = -0.45; lHandPz = 0.4;
            rHandPx = 0.8; rHandPy = -0.45; rHandPz = 0.4;
            lFootPx = -0.6; lFootPy = 0.1;
            rFootPx = 0.6; rFootPy = 0.1;
            
            lEarRz = Math.PI / 3; rEarRz = -Math.PI / 3;
            bodyRz = bankAngle * -0.2;
            
            tailRx = -Math.PI / 1.8; // Tail straight out back due to compression
            mouthSx = 0.5; mouthSy = 2.5; // Straining "o" face
            
        } else if (isAirborne) {
            if (yVelocity < -2.0) {
                // Gliding/Falling (Parachute pose)
                const flutter = Math.sin(this.time * 25) * 0.05;
                pScaleX = 1.05 + flutter; pScaleY = 0.95; pScaleZ = 1.05 + flutter;
                lFootPx = -0.7; lFootPy = 0.4; lFootRz = Math.PI / 4;
                rFootPx = 0.7; rFootPy = 0.4; rFootRz = -Math.PI / 4;
                lHandPx = -1.1; lHandPy = 0.2; lHandRz = Math.PI / 4;
                rHandPx = 1.1; rHandPy = 0.2; rHandRz = -Math.PI / 4;
                lEarRz = Math.PI / 4 + flutter; rEarRz = -Math.PI / 4 - flutter;
                bodyRz = bankAngle * -0.3;
                
                tailRx = -Math.PI / 4;
                tailRz = flutter * 2; // Tail fluttering up
                mouthSx = 0.8; mouthSy = 2.0; // Open mouth falling
            } else {
                // Jumping up (Squash & Stretch)
                const stretch = Math.min(Math.abs(yVelocity) * 0.05, 0.25);
                pScaleX = 0.85 - stretch; pScaleY = 1.15 + stretch; pScaleZ = 0.85 - stretch;
                lFootPy = 0.3; rFootPy = 0.3;
                lFootRx = Math.PI / 6; rFootRx = Math.PI / 6;
                lHandPy = 0.3; rHandPy = 0.3;
                lHandRz = -Math.PI / 4; rHandRz = Math.PI / 4;
                lEarRz = Math.PI / 8; rEarRz = -Math.PI / 8;
                bodyRz = bankAngle * -0.2;
                
                tailRx = -Math.PI / 1.5; // Tail pointing down-ish
                mouthSx = 0.8; mouthSy = 1.5; // Excitement
            }
        } else if (isMoving) {
            // Waddle forward with banking
            const moveSpeed = 15;
            const walkPhase = this.time * moveSpeed;
            const rockAmount = Math.sin(walkPhase);

            bodyRz = rockAmount * 0.15 + (bankAngle * -0.4); // Lean heavily into turn
            bodyRx = Math.sin(walkPhase * 2) * 0.05;
            bodyY = 1 + Math.abs(Math.sin(walkPhase)) * 0.1;

            lFootPz = 0.2 + rockAmount * 0.4;
            rFootPz = 0.2 - rockAmount * 0.4;
            lFootPy = 0.15 + Math.max(0, rockAmount * 0.2);
            rFootPy = 0.15 + Math.max(0, -rockAmount * 0.2);

            lHandPy = -0.1 + Math.sin(walkPhase) * 0.1;
            rHandPy = -0.1 - Math.sin(walkPhase) * 0.1;

            lEarRz = Math.PI / 6 + rockAmount * 0.1;
            rEarRz = -Math.PI / 6 + rockAmount * 0.1;
            
            tailRx = -Math.PI / 2.2;
            tailRz = rockAmount * 0.4; // tail wags enthusiastically with step
        } else {
            // Idle breathing
            const breathPhase = this.time * 2.5;
            const pulse = Math.sin(breathPhase) * 0.02;
            pScaleX = 1 + pulse; pScaleY = 1 + pulse; pScaleZ = 1 + pulse;
            bodyY = 1 + pulse * 2;
            
            bodyRz = bankAngle * -0.2; 

            lEarRz = Math.PI / 6 + Math.sin(breathPhase * 0.8) * 0.04;
            rEarRz = -Math.PI / 6 - Math.sin(breathPhase * 0.8) * 0.04;
            
            tailRx = -Math.PI / 3;
            tailRz = Math.sin(this.time * 2) * 0.2; // slow swish
        }
        
        // 2b. Additive / Override Animations
        this.hitTimer -= deltaTime;
        if (this.hitTimer > 0) {
            // Hit / Flinch override
            const flinchIntensity = this.hitTimer / 0.5;
            bodyRx -= 0.3 * flinchIntensity; // recoil back
            bodyRy += Math.sin(this.time * 50) * 0.1 * flinchIntensity; // rapid shake
            lEarRz = Math.PI / 2; rEarRz = -Math.PI / 2; // ears flat
            mouthSx = 0.5; mouthSy = 0.5; // wince
            
            // force eyes closed
            this.leftEye.scale.y = 0.1;
            this.rightEye.scale.y = 0.1;
            this.blinkTimer = 1; // pause blinking
        }

        this.shootTimer -= deltaTime;
        if (this.shootTimer > 0 && state !== 'crashed') {
            // Shoot / Throw motion with right arm
            const progress = 1.0 - (this.shootTimer / 0.3); // 0.0 to 1.0
            
            if (progress < 0.3) {
                // Wind up
                rHandPx = 1.2;
                rHandPy = 0.5;
                rHandPz = 0.5; // pull back
                rHandRz = Math.PI / 4;
            } else {
                // Throw forward rapidly
                const swipeProgress = (progress - 0.3) / 0.7;
                rHandPx = 0.5;
                rHandPy = 0.2;
                rHandPz = -1.2; // thrust totally forward
                rHandRz = -Math.PI / 2;
                
                // Additive shoulder twist
                bodyRy -= 0.2 * (1 - swipeProgress);
            }
        }

        // Add ear twitch layer (only if not flinching/crashed)
        if (this.hitTimer <= 0 && state !== 'crashed') {
            lEarRz += this.earTwitchAmount;
            rEarRz -= this.earTwitchAmount;
        }

        // Apply banking offsets to ears so they don't break
        lEarRz -= bankAngle * 0.1;
        rEarRz -= bankAngle * 0.1;

        // 3. Apply Smooth Interpolations
        const dtLerp = 15 * deltaTime;
        this.bodyMesh.scale.lerp(new THREE.Vector3(pScaleX, pScaleY, pScaleZ), dtLerp);
        this.bodyMesh.position.y = THREE.MathUtils.lerp(this.bodyMesh.position.y, bodyY, dtLerp);
        this.bodyMesh.rotation.x = THREE.MathUtils.lerp(this.bodyMesh.rotation.x, bodyRx, dtLerp);
        this.bodyMesh.rotation.y = THREE.MathUtils.lerp(this.bodyMesh.rotation.y, bodyRy, dtLerp);
        this.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.bodyMesh.rotation.z, bodyRz, dtLerp);

        this.leftFoot.position.lerp(new THREE.Vector3(lFootPx, lFootPy, lFootPz), dtLerp);
        this.rightFoot.position.lerp(new THREE.Vector3(rFootPx, rFootPy, rFootPz), dtLerp);
        this.leftFoot.rotation.x = THREE.MathUtils.lerp(this.leftFoot.rotation.x, lFootRx, dtLerp);
        this.rightFoot.rotation.x = THREE.MathUtils.lerp(this.rightFoot.rotation.x, rFootRx, dtLerp);
        this.leftFoot.rotation.z = THREE.MathUtils.lerp(this.leftFoot.rotation.z, lFootRz, dtLerp);
        this.rightFoot.rotation.z = THREE.MathUtils.lerp(this.rightFoot.rotation.z, rFootRz, dtLerp);

        this.leftHand.position.lerp(new THREE.Vector3(lHandPx, lHandPy, lHandPz), dtLerp);
        this.rightHand.position.lerp(new THREE.Vector3(rHandPx, rHandPy, rHandPz), dtLerp);
        this.leftHand.rotation.z = THREE.MathUtils.lerp(this.leftHand.rotation.z, lHandRz, dtLerp);
        this.rightHand.rotation.z = THREE.MathUtils.lerp(this.rightHand.rotation.z, rHandRz, dtLerp);

        this.leftEar.rotation.z = THREE.MathUtils.lerp(this.leftEar.rotation.z, lEarRz, dtLerp);
        this.rightEar.rotation.z = THREE.MathUtils.lerp(this.rightEar.rotation.z, rEarRz, dtLerp);
        
        this.tail.rotation.x = THREE.MathUtils.lerp(this.tail.rotation.x, tailRx, dtLerp);
        this.tail.rotation.z = THREE.MathUtils.lerp(this.tail.rotation.z, tailRz, dtLerp);
        this.mouth.scale.lerp(new THREE.Vector3(mouthSx, mouthSy, 1), dtLerp);
    }
}

