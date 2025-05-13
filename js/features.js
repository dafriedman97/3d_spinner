import * as THREE from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
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

function addThickSeams(sphere) {
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
  seams.name = 'seams';

  // 5) Add to your sphere
  sphere.add(seams);
}

function addSeams(sphere){
    // ——— Build great‐circle points from equator to north pole ———
    const N = 360; 
    const s = 2; // step size
    const a = 0.4;
    const delta = 0.025;
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
      // points.push(...P.clone().add(PP.clone().multiplyScalar(-delta)).toArray());
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

      sphere.add(pivotUp);
      sphere.add(pivotDown);
    }

    // const lineGeo = new LineGeometry().setPositions( points );
    // lineMat.resolution.set( window.innerWidth, window.innerHeight );
    // const lineMesh = new Line2( lineGeo, lineMat );


    // sphere.add(lineMesh);
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
    // addThickSeams(sphere);
    addSeams(sphere);

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


export async function makeSkin() {
    let starterQuaternion = new THREE.Quaternion();
    starterQuaternion.setFromEuler(new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0, 'XYZ'));

    const spinAxis = new THREE.Vector3(1, 0, 0);
    const surfaceVector = new THREE.Vector3(1, 0, 0);
    let quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(surfaceVector, spinAxis);

    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    // Wait for the model to load
    const gltf = await loader.loadAsync('../assets/smallball.glb');

    // Get original mesh
    const originalMesh = gltf.scene.children[0];

    // clone it so you don’t mutate the original scene
    const skin = originalMesh.clone(true);
    skin.setRotationFromQuaternion(starterQuaternion);
    skin.scale.set(35, 35, 35);
    skin.quaternion.premultiply(quaternion);

    // add skin to container & return container so we don't scale everything by/
    const container = new THREE.Group();
    container.add(skin);

    return container
  }

export function makeLongitudeRings() {
    const lonGeometry = new THREE.CylinderGeometry(1.1, 1.1, .05, 30, 30, false, 0, Math.PI);
    const lonMaterial = new THREE.MeshPhysicalMaterial({color: "purple", transparent: true, opacity : 0.5});

    // lon 90 ring
    const lon90Ring = new THREE.Mesh(lonGeometry, lonMaterial);
    lon90Ring.rotation.x = Math.PI / 2;
    lon90Ring.rotation.z = 0;
    lon90Ring.name = "lon90";

    // lon 0 ring
    const lon0Ring = new THREE.Mesh(lonGeometry, lonMaterial);
    lon0Ring.rotation.x = Math.PI / 2;
    lon0Ring.rotation.z = Math.PI / 2;
    lon0Ring.name = "lon0";

    // lon Neg90 ring
    const lonNeg90Ring = new THREE.Mesh(lonGeometry, lonMaterial);
    lonNeg90Ring.rotation.x = Math.PI / 2;
    lonNeg90Ring.rotation.z = Math.PI;
    lonNeg90Ring.name = "lonNeg90";

    // lon 180 ring
    const lon180Ring = new THREE.Mesh(lonGeometry, lonMaterial);
    lon180Ring.rotation.x = Math.PI / 2;
    lon180Ring.rotation.z = 3 * Math.PI / 2;
    lon180Ring.name = "lon180";

    // group
    const lonRings = new THREE.Group();
    lonRings.add(lon0Ring);
    lonRings.add(lon90Ring);
    lonRings.add(lon180Ring);
    lonRings.add(lonNeg90Ring);
    lonRings.name = "lonRings";

    // make labels
    const labels = [];
    new FontLoader().load(
      'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_bold.typeface.json',
      font => {
        const mat = new THREE.MeshBasicMaterial({ color: "purple" });

        // helper to make a text mesh and attach
        function makeTextLabel(str, parent, offset) {
          const geo = new TextGeometry(str, {
            font: font,
            size: 0.15,
            curveSegments: 4,
            depth: 0.01
          });

          geo.computeBoundingBox();
          // center the text horizontally
          const xShift = -0.5 * (geo.boundingBox.max.x - geo.boundingBox.min.x);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(offset.x + xShift, offset.y, offset.z);
          mesh.rotation.x = - Math.PI / 2;
          mesh.rotation.y = Math.PI / 2;
          parent.add(mesh);
          labels.push(mesh);
          return mesh;
        }

        // Make labels
        const pos = new THREE.Vector3(1.4, -.05, -.1);
        const lon0Text = makeTextLabel('0°',  lon0Ring, pos);
        const lon90Text = makeTextLabel('90°',  lon90Ring, pos);
        const lon180Text = makeTextLabel('180°',  lon180Ring, pos);
        const lonNeg90Text = makeTextLabel('-90°',  lonNeg90Ring, pos);
      }
    );

    return lonRings;
}

export function makeLatitudeRings() {
    const latMaterial = new THREE.MeshPhysicalMaterial({color: "#9c4600", transparent: true, opacity : 0.5});

    const lat0Geometry = new THREE.CylinderGeometry(1.1, 1.1, .05, 30, 30);
    const lat0Ring = new THREE.Mesh(lat0Geometry, latMaterial);
    lat0Ring.name = 'lat0';

    const lat45Geometry = new THREE.CylinderGeometry(.85, .85, .05, 30, 30);
    const lat45Ring = new THREE.Mesh(lat45Geometry, latMaterial);
    lat45Ring.position.y = .7; // not scientific but this is just for a helper vizi
    lat45Ring.name = 'lat45';

    const latNeg45Geometry = new THREE.CylinderGeometry(.85, .85, .05, 30, 30);
    const latNeg45Ring = new THREE.Mesh(latNeg45Geometry, latMaterial);
    latNeg45Ring.position.y = -.7; // not scientific but this is just for a helper vizi
    latNeg45Ring.name = 'latNeg45';

    const latRings = new THREE.Group();
    latRings.add(lat0Ring);
    latRings.add(lat45Ring);
    latRings.add(latNeg45Ring);
    latRings.name = "latRings";


    const labels = [];
    new FontLoader().load(
      'https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_bold.typeface.json',
      font => {
        const mat = new THREE.MeshBasicMaterial({ color: "#9c4600" });

        // helper to make a text mesh and attach
        function makeTextLabel(str, parent, offset) {
          const geo = new TextGeometry(str, {
            font: font,
            size: 0.15,
            curveSegments: 4,
            depth: 0.01
          });

          geo.computeBoundingBox();
          // center the text horizontally
          const xShift = -0.5 * (geo.boundingBox.max.x - geo.boundingBox.min.x);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(offset.x + xShift, offset.y, offset.z);
          parent.add(mesh);
          labels.push(mesh);
          return mesh;
        }

        // Make labels
        makeTextLabel('0°',  lat0Ring, new THREE.Vector3(.6, 0, 1.1));
        makeTextLabel('45°',  lat45Ring, new THREE.Vector3(.6, 0, .9));
        makeTextLabel('-45°',  latNeg45Ring, new THREE.Vector3(.6, .1, .9));
        const back0 = makeTextLabel('0°',  lat0Ring, new THREE.Vector3(-.55, .1, -1.1));
        const back45 = makeTextLabel('45°',  lat45Ring, new THREE.Vector3(-.5, .1, -.85));
        const backNeg45 = makeTextLabel('-45°',  latNeg45Ring, new THREE.Vector3(-.5, .1, -.85));
        back0.rotation.y = Math.PI;
        back45.rotation.y = Math.PI;
        backNeg45.rotation.y = Math.PI;
      }
    );

    return latRings;
}
