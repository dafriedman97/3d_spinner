import * as THREE from "three";
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { Line2 }       from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';


const seamColor = 0xb31520;

export function makeBall() {
    const geo = new THREE.SphereGeometry(0, .1, .1);
    const mat = new THREE.MeshPhysicalMaterial();
    const ball = new THREE.Mesh(geo, mat);
    return ball;
}


function addSimpleSeams(sphere) {
  const N = 360;
  const a = 0.4;

  const positions = new Float32Array((N + 1) * 3);
  for (let i = 0; i <= N; i++) {
    const d = 360 * i / N;
    const r = THREE.MathUtils.degToRad(d);

    const y = (1 - a) * Math.cos(r) * Math.sin(2 * r) + a * Math.sin(r);
    const z = (1 - a) * Math.sin(r) * Math.sin(2 * r) + a * Math.cos(r);
    const x = Math.sign(Math.cos(2 * r)) *
              Math.sqrt(Math.max(0, 1 - (y*y + z*z)));

    positions[3*i + 0] = y;
    positions[3*i + 1] = z;
    positions[3*i + 2] = x;
  }

  // 2) Create a LineGeometry and feed it the positions
  const seamsGeom = new LineGeometry();
  seamsGeom.setPositions(positions);

  // 3) Create a LineMaterial with a world‐space linewidth
  const seamsMat = new LineMaterial({
    color:     0xb5001e,
    linewidth: 5,     // thickness in world‐units
    dashed:    false
  });
  // Must set resolution so it can map world→screen size
  seamsMat.resolution.set(window.innerWidth, window.innerHeight);

  // 4) Build the Line2 and name it
  const seams = new Line2(seamsGeom, seamsMat);
  seams.name = 'simpleSeams';

  // 5) Add to your sphere
  sphere.add(seams);

  // by default, make invisible (can be toggled in Options)
  seams.visible = false;
}

function addSeams(skin){
    // ——— Build great‐circle points from equator to north pole ———
    const N = 360; 
    const s = 2; // step size
    const a = 0.4;
    const delta = 0.025;

    const seamsGroup = new THREE.Group();
    seamsGroup.name = "seams";
    for (let i = 0; i <= N; i += s) {
      // Get x, y, z
      const d = i;
      const r = THREE.MathUtils.degToRad(d);
      const y = (1 - a) * Math.cos(r) * Math.sin(2 * r) + a * Math.sin(r);
      const z = (1 - a) * Math.sin(r) * Math.sin(2 * r) + a * Math.cos(r);

      const D   = 1 - (y*y + z*z);
      const s   = Math.sign(Math.cos(2*r));
      const x   = s * Math.sqrt(Math.max(0, D));
      const yP = (1 - a) * (
                   - Math.sin(r) * Math.sin(2*r)
                   + 2 * Math.cos(r) * Math.cos(2*r)
                 )
                 + a * Math.cos(r);
      
      const zP = (1 - a) * (
                   Math.cos(r) * Math.sin(2*r)
                   + 2 * Math.sin(r) * Math.cos(2*r)
                 )
                 - a * Math.sin(r);
      const xP  = - s * (y*yP + z*zP) / Math.sqrt(Math.max(.0001, D));
  
      const points = [];
      const P = new THREE.Vector3( y, z, x);
      const PP = new THREE.Vector3( yP, zP, xP);
      points.push(...P.clone().toArray());
      points.push(...P.clone().add(PP.clone().multiplyScalar(delta)).toArray());
  
      const lineGeo = new LineGeometry().setPositions(points);
      const lineMat = new LineMaterial({
        color:       seamColor,
        linewidth:   0.02,
        worldUnits:  true
      });
  
      lineMat.resolution.set( window.innerWidth, window.innerHeight );
      const lineMesh = new Line2( lineGeo, lineMat );
  
      // pivot
      const pivotUp = new THREE.Object3D();
      const pivotDown = new THREE.Object3D();
      const axis = P.clone().normalize();
  
      pivotUp.add( lineMesh.clone() );
      pivotUp.rotateOnAxis(axis, 2.5 * Math.PI / 4);

      pivotDown.add( lineMesh.clone() );
      pivotDown.rotateOnAxis(axis, -2.5 * Math.PI / 4);

      seamsGroup.add(pivotUp, pivotDown);
    }
    skin.add(seamsGroup);
}

function addDecal(texURL, sphereMesh, position, size) {
  const loader = new THREE.TextureLoader();
  loader.load(import.meta.env.BASE_URL + texURL, texture => {

    // 1️⃣ Compute the normal at that point (assumes a unit‐sphere centered at 0,0,0)
    const normal = position.clone().normalize();

    // 2️⃣ Build a quaternion that maps the decal's local +Z → that normal
    const quat = new THREE.Quaternion()
      .setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),  // decal's default forward
        normal                       // desired forward
      );

    // 4️⃣ Convert to Euler for the DecalGeometry API
    const orientation = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

    // 5️⃣ Create the decal material
    const decalMat = new THREE.MeshPhysicalMaterial({
      map:         texture,
      transparent: true,
      depthTest:   true,    // usually want true so it clips nicely
      depthWrite:  false,
      emissive: "white",
      emissiveIntensity: 0.05,
      polygonOffset:       true,
      polygonOffsetFactor: -1,   // try -1 … -4
      polygonOffsetUnits:  1,    // try 1 … 4    
    });
    

    // 6️⃣ Make the decal geometry
    const decalGeo = new DecalGeometry(
      sphereMesh,     // the target mesh
      position,       // where on the surface
      orientation,    // how it’s rotated
      size            // Vector3(width, height, depth)
    );

    // 7️⃣ Build & attach
    const decalMesh = new THREE.Mesh(decalGeo, decalMat);
    sphereMesh.add(decalMesh);
  });
}

export function makeSimpleSkin() {  
    // Sphere
    const sphereMaterial = new THREE.MeshPhysicalMaterial({
      side : THREE.DoubleSide,
      color: "#f5f3f0",
    });
    const sphereGeometry = new THREE.SphereGeometry(.995, 64, 64);
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

    // Seams
    addSeams(sphere);
    addSimpleSeams(sphere);


    // Signature
    addDecal('images/signature.png',
      sphere,
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, .4, 1),
    );
  
    addDecal('images/batterman.png',
      sphere,
      new THREE.Vector3(0, -.75, .75),
      new THREE.Vector3(.5, .5, 1)
    );

    addDecal('images/rawlings.png',
      sphere,
      new THREE.Vector3(0, .75, .75),
      new THREE.Vector3(.7, .3, 1)
    );
    return sphere;
}

export function addHemisphereDisk() {
    const diskMaterial = new THREE.MeshPhysicalMaterial({color: "purple", transparent: true, opacity : 0.5});
    const diskGeo = new THREE.CylinderGeometry(1.2, 1.2, .05, 60, 60);
    const disk = new THREE.Mesh(diskGeo, diskMaterial);
    disk.rotation.x = Math.PI / 2;
    disk.name = 'hemisphereDisk';
    return disk;
}