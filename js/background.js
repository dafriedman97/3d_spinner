import * as THREE from "three";

// ------------------------------------------------
// Constants
// ------------------------------------------------

const grassColor = 0x228B22;
const dirtColor = 0x8B4513;
const wallColor = 0x7a7676;
const whiteColor = 0xffffff;

const grassMaterial = new THREE.MeshPhysicalMaterial({ color: grassColor });
const dirtMaterial = new THREE.MeshPhysicalMaterial({ color: dirtColor });
const wallMaterial = new THREE.MeshPhysicalMaterial({color: wallColor, side: THREE.BackSide});
const whiteMaterial = new THREE.MeshPhysicalMaterial({ color: whiteColor });

export function addBackground() {
    let scenery = new THREE.Group()

    // Grass field
    const grassGeometry = new THREE.CircleGeometry(75, 100);
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -2
    scenery.add(grass);

    // Strip to first
    const firstGeometry = new THREE.PlaneGeometry(5, 45);
    const firstStrip = new THREE.Mesh(firstGeometry, dirtMaterial);
    firstStrip.rotation.x = -Math.PI / 2;
    firstStrip.rotation.z = -Math.PI / 4;
    firstStrip.position.y = -1.99;
    firstStrip.position.z = -15;
    firstStrip.position.x = -15;
    scenery.add(firstStrip);

    // Strip to third
    const thirdGeometry = new THREE.PlaneGeometry(5, 45);
    const thirdStrip = new THREE.Mesh(thirdGeometry, dirtMaterial);
    thirdStrip.rotation.x = -Math.PI / 2;
    thirdStrip.rotation.z = Math.PI / 4;
    thirdStrip.position.y = -1.99;
    thirdStrip.position.z = -15;
    thirdStrip.position.x = 15;
    scenery.add(thirdStrip);

    // Strip to mound (old school)
    const moundStripGeometry = new THREE.PlaneGeometry(3, 40);
    const moundStrip = new THREE.Mesh(moundStripGeometry, dirtMaterial);
    moundStrip.rotation.x = -Math.PI / 2;
    moundStrip.position.y = -1.99;
    moundStrip.position.z = -15;
    // thirdStrip.position.x = 15;
    scenery.add(moundStrip);

    // Backstop/wall
    const radiusTop = 75;
    const radiusBottom = 75;
    const height = 8;
    const radialSegments = 32;
    const heightSegments = 1;
    const openEnded = true;
    const thetaStart = Math.PI / 2;
    const thetaLength = Math.PI;
    const wallGeometry = new THREE.CylinderGeometry(
        radiusTop,
        radiusBottom,
        height,
        radialSegments,
        heightSegments,
        openEnded,
        thetaStart,
        thetaLength
    );
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = 2;
    scenery.add(wall);

    // Mound
    const moundGeometry = new THREE.CircleGeometry(5, 32);
    const mound = new THREE.Mesh(moundGeometry, dirtMaterial);
    mound.position.y = -1.99;
    mound.position.z = 1.5;
    mound.rotation.x = -Math.PI / 2;
    scenery.add(mound);

    // Rubber
    const rubberGeometry = new THREE.PlaneGeometry(.5, 3);
    const rubber = new THREE.Mesh(rubberGeometry, whiteMaterial);
    rubber.rotation.z = Math.PI / 2;
    rubber.rotation.x = -Math.PI / 2;
    rubber.position.y = -1.98;
    rubber.position.z = 1.5;
    scenery.add(rubber);

    // Circle around home
    const circleGeometry = new THREE.CircleGeometry(5, 32);
    const circle = new THREE.Mesh(circleGeometry, dirtMaterial);
    circle.position.y = -1.99;
    circle.position.z = -30;
    circle.rotation.x = -Math.PI / 2;
    scenery.add(circle);

    // Home plate
    const shape = new THREE.Shape();
    shape.moveTo(-1, 0);
    shape.lineTo(-1, 1);
    shape.lineTo(0, 2);
    shape.lineTo(1, 1);
    shape.lineTo(1, 0);
    const homePlateGeometry = new THREE.ShapeGeometry(shape);
    const homePlate = new THREE.Mesh(homePlateGeometry, whiteMaterial);
    homePlate.rotation.x = -Math.PI / 2;
    homePlate.position.set(0, -1.9, -30);
    scenery.add(homePlate);

    return scenery;
}
