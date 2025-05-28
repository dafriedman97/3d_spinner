import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { addBackground } from './background.js';
import { createArrow, onMollyClick, onWindowResize, latLonToMollweide } from './helpers.js';
import { makeBall, addHemisphereDisk, makeSimpleSkin } from './features.js';


let renderer = new THREE.WebGLRenderer({antialias:true});
let scene, controls, camera, rpm;
let gyro = 0;
let container, dot, halfWidth, halfHeight; // molly stuff
let spinAxis = new THREE.Vector3(1, 0, 0);
let surfaceVector = new THREE.Vector3(1, 0, 0);
let defaultAngle = new THREE.Vector3(0, 1.6, 5);
let pitcherAngle = new THREE.Vector3(0, 0, 5);
let firstBaseAngle = new THREE.Vector3(-5, 0, 0);
let catcherAngle = new THREE.Vector3(0, 0, -5);
let thirdBaseAngle = new THREE.Vector3(5, 0, 0);
let gyroAngle;
let started = false;
let rotating = false;
let showingHemisphereDisk = false;
let default_surface_lat = document.getElementById('surface_lat').value;
let default_surface_lon = document.getElementById('surface_lon').value;
let default_rpm = document.getElementById('rpm').value;
let quaternion = new THREE.Quaternion()
quaternion.setFromUnitVectors(surfaceVector, spinAxis);

const redColor = 0xde1d1d;
const redMaterial = new THREE.MeshStandardMaterial({ color: redColor});
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Scenery
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
let scenery = new THREE.Group();

// Get background
const background = addBackground();
scenery.add(background);

// Spatial Axis Arrow. Not actually setting here, just need something to remove when we initially orient.
let spatialAxisArrow = new THREE.Mesh();
scenery.add(spatialAxisArrow);

// Ball
let ball = makeBall();
scenery.add(ball);

// Baseball "skin"
let skin = makeSimpleSkin();
ball.add(skin);

// Hemisphere Disk
let hemisphereDisk = addHemisphereDisk()
scenery.add(hemisphereDisk);
hemisphereDisk.visible = false;



// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Listeners
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function playOrPause() {
    if (started) {
        // if it's already started, switch rotating on/off
        rotating = ! rotating;
    }
    else {
        // if it hasn't started, start it & then call
        started = true;
        orient();
        getRPM();
        playOrPause();
    }
}

function getRPM() {
  rpm = parseFloat(document.getElementById('rpm').value);
}

function resetRotation() {
    rotating = false;
    orient();
}

function setGyroAngle() {
  gyroAngle = new THREE.Vector3(5 * Math.sin(gyro), 0, 5 * Math.cos(gyro))
  setAngle(gyroAngle);
}

function setAngle(angle) {
  camera.position.set(angle['x'], angle['y'], angle['z']);
}

function clearRotation() {
  const confirmed = confirm("Clear all inputs?");
  if (! confirmed) {return false;}
  // stop the rotation
  rotating = false;

  // reset input boxes
  document.getElementById('tilt').value = "00:00";
  document.getElementById('efficiency').value = "100";
  document.getElementById('surface_lat').value = default_surface_lat;
  document.getElementById('surface_lon').value = default_surface_lon;
  document.getElementById('rpm').value = default_rpm;

  // orient
  orient();
}

function showDisk() {
    if (showingHemisphereDisk) {
      // Hide disk
      hemisphereDisk.visible = false;

    } else {
      // Show disk
      hemisphereDisk.visible = true;
    }
    showingHemisphereDisk = ! showingHemisphereDisk;
}

function swapSeams() {
  const seams = skin.getObjectByName('seams');
  seams.visible = ! seams.visible;
  const simpleSeams = skin.getObjectByName('simpleSeams');
  simpleSeams.visible = ! simpleSeams.visible;
}

function orient() {
  ball.quaternion.identity();

  var efficiency = parseInt(document.getElementById("efficiency").value);
  var negGyro = document.getElementById("neg_gyro").checked ? -1 : 1;
  gyro = negGyro * Math.acos(efficiency / 100);

  var tilt = document.getElementById("tilt").value.split(":");
  var hh = parseInt(tilt[0]);
  var mm = parseInt(tilt[1]);
  if (hh >= 12) { // handle PM
    hh -= 12;
  }
  tilt = 2 * Math.PI * (hh * 60 + mm) / 720;
  spinAxis.set(1, 0, 0).normalize();
  spinAxis.applyAxisAngle(new THREE.Vector3(0, 1, 0), gyro);
  spinAxis.applyAxisAngle(new THREE.Vector3(0, 0, 1), -tilt);

  // Spin vector surface location
  const surface_lat = THREE.MathUtils.degToRad(parseFloat(document.getElementById('surface_lat').value));
  const surface_lon = THREE.MathUtils.degToRad(parseFloat(document.getElementById('surface_lon').value));
  const surface_x = Math.cos(surface_lat) * Math.cos(surface_lon);
  const surface_y = Math.cos(surface_lat) * Math.sin(surface_lon);
  const surface_z = Math.sin(surface_lat);
  surfaceVector.set(surface_y, surface_z, surface_x).normalize();

  // Quaternion for orienting ball
  skin.rotation.set(0, 0, 0);
  quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(surfaceVector, spinAxis);
  skin.quaternion.premultiply(quaternion);

  // Spin axis
  scenery.remove(spatialAxisArrow);
  spatialAxisArrow = createArrow({
      to: spinAxis.clone().multiplyScalar(2),
      material: redMaterial,
  });
  scenery.add(spatialAxisArrow);

  // Update spin center on Molly plot
  const [ moll_x, moll_y ] = latLonToMollweide(surface_lat, surface_lon);
  const nx = moll_x / (2 * Math.SQRT2);
  const ny = moll_y / (    Math.SQRT2);
  const offsetX = halfWidth  * (1 + nx);
  const offsetY = halfHeight * (1 - ny);
  dot.style.left    = `${offsetX}px`;
  dot.style.top     = `${offsetY}px`;
  dot.style.display = 'block';
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Animation
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
function animate() {
    requestAnimationFrame(animate);
    const frameRate = 100;
    const radiansPerSecond = rpm / 60 * 2 * Math.PI / 100;
    const radiansPerFrame = radiansPerSecond / frameRate;

    if (rotating) {
      ball.rotateOnAxis(spinAxis, radiansPerFrame);
    }

    controls.update(); // Required for damping
    renderer.render(scene, camera);
  }

function init() {
  // Scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.set(defaultAngle['x'], defaultAngle['y'], defaultAngle['z']);
  camera.lookAt(0,0,0);
  scene.add(camera);

  // Renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls( camera, renderer.domElement );
  controls.enableDamping = true;     // smooth inertial motion

  // Light
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(0, 1, 1);
  const ambientLight = new THREE.AmbientLight({intensity: `3`});
  scene.add(light, ambientLight);

  // Backdrop
  scene.background = new THREE.Color("skyblue");

  // Scenery
  scene.add(scenery);

  // Molly stuff
  container = document.getElementById('hud-container');
  dot = container.querySelector('.dot');
  const rect = container.getBoundingClientRect();
  halfWidth = rect.width / 2;
  halfHeight = rect.height / 2;

  // Orient
  orient();

  // Listeners
  window.addEventListener('resize', () => onWindowResize(camera, renderer), false);
  document.getElementById('play_or_pause').addEventListener('click', playOrPause);
  document.getElementById('reset').addEventListener('click', resetRotation);
  document.getElementById('clear').addEventListener('click', clearRotation);
  document.getElementById('efficiency').addEventListener('input', orient);
  document.getElementById('neg_gyro').addEventListener('input', orient);
  document.getElementById('tilt').addEventListener('input', orient);
  document.getElementById('surface_lat').addEventListener('input', orient);
  document.getElementById('surface_lon').addEventListener('input', orient);
  document.getElementById('rpm').addEventListener('input', getRPM);
  document.getElementById('default').addEventListener('click', () => setAngle(defaultAngle));
  document.getElementById('P').addEventListener('click', () => setAngle(pitcherAngle));
  document.getElementById('1B').addEventListener('click', () => setAngle(firstBaseAngle));
  document.getElementById('C').addEventListener('click', () => setAngle(catcherAngle));
  document.getElementById('3B').addEventListener('click', () => setAngle(thirdBaseAngle));
  document.getElementById('g').addEventListener('click', () => setGyroAngle(gyroAngle));
  document.getElementById('disk').addEventListener('change', showDisk);
  document.getElementById('simple_seams').addEventListener('change', swapSeams);
  container.addEventListener('click', function(event) {
    onMollyClick(event, this);
    orient();
  });

  // Animate
  animate();
}


init();
