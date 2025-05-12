import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { addBackground } from './background.js';
import { createArrow, onMollyClick, onWindowResize, latLonToMollweide } from './helpers.js';
import { makeBall, makeSkin, makeSimpleSkin, makeLongitudeRings, makeLatitudeRings } from './features.js';


let renderer = new THREE.WebGLRenderer({antialias:true});
let scene, controls, camera, rpm;
let container, dot, halfWidth, halfHeight; // molly stuff
let spinAxis = new THREE.Vector3(1, 0, 0);
let surfaceVector = new THREE.Vector3(1, 0, 0);
let defaultAngle = new THREE.Vector3(0, 1.9, 5);
let pitcherAngle = new THREE.Vector3(0, 0, 5);
let firstBaseAngle = new THREE.Vector3(-5, 0, 0);
let catcherAngle = new THREE.Vector3(0, 0, -5);
let thirdBaseAngle = new THREE.Vector3(5, 0, 0);
let started = false;
let rotating = false;
let showingHelpers = false;
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

// // Baseball "skin"
// // const skin = await makeSkin();
// ball.add(skin);

const skin = makeSimpleSkin();
ball.add(skin);

// Helpers
let lonRings = makeLongitudeRings();
let latRings = makeLatitudeRings();
skin.add(lonRings);
skin.add(latRings);
latRings.visible = false;
lonRings.visible = false;


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
  document.getElementById('gyro').value = "0";
  document.getElementById('surface_lat').value = default_surface_lat;
  document.getElementById('surface_lon').value = default_surface_lon;
  document.getElementById('rpm').value = default_rpm;

  // orient
  orient();
}

function showHelpers() {
    if (showingHelpers) {
      // Hide rings
      lonRings.visible = false;
      latRings.visible = false;

    } else {
      // Show rings
      lonRings.visible = true;
      latRings.visible = true;
    }
    showingHelpers = ! showingHelpers;
}

function orient() {
  ball.quaternion.identity();

  var gyro = parseInt(document.getElementById("gyro").value);
  gyro = THREE.MathUtils.degToRad(gyro);

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
  document.getElementById('angle').addEventListener('click', () => setAngle(defaultAngle));
  document.getElementById('clear').addEventListener('click', clearRotation);
  document.getElementById('gyro').addEventListener('input', orient);
  document.getElementById('tilt').addEventListener('input', orient);
  document.getElementById('surface_lat').addEventListener('input', orient);
  document.getElementById('surface_lon').addEventListener('input', orient);
  document.getElementById('helpers').addEventListener('change', showHelpers);
  document.getElementById('rpm').addEventListener('input', getRPM);
  document.getElementById('P').addEventListener('click', () => setAngle(pitcherAngle));
  document.getElementById('1B').addEventListener('click', () => setAngle(firstBaseAngle));
  document.getElementById('C').addEventListener('click', () => setAngle(catcherAngle));
  document.getElementById('3B').addEventListener('click', () => setAngle(thirdBaseAngle));
  container.addEventListener('click', function(event) {
    onMollyClick(event, this);
    orient();
  });

  // Animate
  animate();
}


init();
