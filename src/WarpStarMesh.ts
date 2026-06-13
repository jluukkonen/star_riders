import * as THREE from 'three';
import { addRimLight } from './utils';

export function createWarpStar(color: number = 0xfffcdb): THREE.Group {
    const group = new THREE.Group();

    // 1. Create the 2D Star Shape
    const numPoints = 5;
    const outerRadius = 1.3;
    const innerRadius = 0.75;
    const shape = new THREE.Shape();
    const PI2 = Math.PI * 2;

    for (let i = 0; i < numPoints * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        // Start tip at top (-PI / 2)
        const angle = (i / (numPoints * 2)) * PI2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();

    // 2. Extrude the Star into 3D
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.3, // Thickness
        bevelEnabled: true,
        bevelSegments: 12,    // Smooth thick border
        steps: 1,
        bevelSize: 0.3,       // Plump edge outwards
        bevelThickness: 0.3,  // Plump edge downwards
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.computeVertexNormals(); // Ensure smooth normals

    // Center geometry on Z-axis locally before rotating
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
        const zOffset = -0.5 * (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
        geometry.translate(0, 0, zOffset - 0.25); // Adjust for bevel
    }
    
    // Rotate so the star lies flat as a horizontal riding deck
    geometry.rotateX(Math.PI / 2);

    // 3. Main Glowing Material
    const material = addRimLight(new THREE.MeshPhongMaterial({
        color: color,
        emissive: 0xffe87a,
        emissiveIntensity: 0.4,
        shininess: 40
    }));

    const mainMesh = new THREE.Mesh(geometry, material);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // 4. Inner Decorative Star Detail
    const detailSettings: THREE.ExtrudeGeometryOptions = {
        depth: 0.1,
        bevelEnabled: true,
        bevelSegments: 6,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08,
    };
    const detailGeometry = new THREE.ExtrudeGeometry(shape, detailSettings);
    detailGeometry.computeVertexNormals();
    
    // Center it
    detailGeometry.computeBoundingBox();
    if (detailGeometry.boundingBox) {
        const dOffset = -0.5 * (detailGeometry.boundingBox.max.z - detailGeometry.boundingBox.min.z);
        detailGeometry.translate(0, 0, dOffset);
    }
    detailGeometry.rotateX(Math.PI / 2);

    const detailMaterial = addRimLight(new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xfffae6,
        emissiveIntensity: 0.7,
    }));

    const detailMesh = new THREE.Mesh(detailGeometry, detailMaterial);
    detailMesh.scale.set(0.65, 0.5, 0.65);
    detailMesh.position.y = 0.22; // Layered slightly above
    detailMesh.castShadow = true;
    group.add(detailMesh);

    // 5. Splatter Anchor (for paint logic reference)
    const splatterAnchor = new THREE.Group();
    splatterAnchor.name = 'splatterAnchor';
    splatterAnchor.position.y = 0.35;
    group.add(splatterAnchor);

    // Store references for animation
    group.userData.mainMaterial = material;
    group.userData.detailMaterial = detailMaterial;

    return group;
}
