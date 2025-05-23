import * as THREE from "three";


const redColor = 0xde1d1d;
const redMaterial = new THREE.MeshStandardMaterial({ color: redColor});


export function createArrow({to, from = new THREE.Vector3(0, 0, 0), shaftRadius = 0.025, material = redMaterial, radialSegments = 16}) {
    // 1) Compute direction + full length
    const dir     = new THREE.Vector3().subVectors(to, from);
    const length  = dir.length();
    dir.normalize();

    // 2) Define head dimensions
    const headRadius = shaftRadius * 4;
    const headHeight = headRadius;  // you can tweak this ratio if you like

    // 3) Shaft length is what's left over after carving out the cone head
    const shaftLength = Math.max(0, length - headHeight);

    // 4) Create a parent container
    const arrow = new THREE.Group();

    // 5) Shaft: CylinderGeometry(height = shaftLength)
    const shaftGeo = new THREE.CylinderGeometry(
      shaftRadius,    // top radius
      shaftRadius,    // bottom radius
      shaftLength,    // height
      radialSegments
    );
    const shaft = new THREE.Mesh(shaftGeo, material);
    // By default cylinder runs from y= -shaftLength/2 to +shaftLength/2
    // We want its base at y=0, tip at y=shaftLength → shift up by half
    shaft.position.y = shaftLength / 2;
    arrow.add(shaft);

    // 6) Head: ConeGeometry(radiusTop=0, radiusBottom=headRadius, height=headHeight)
    const headGeo = new THREE.ConeGeometry(
      headRadius,  // radius of the base
      headHeight,  // height from base to tip
      radialSegments
    );
    const head = new THREE.Mesh(headGeo, material);
    // Cone by default runs from y=0 (base) to y=headHeight (tip)
    // We want base at y=shaftLength, tip at y=shaftLength + headHeight
    head.position.y = shaftLength;
    arrow.add(head);

    // 7) Orient arrow so its +Y axis points in the `dir`
    const plusYDir = new THREE.Vector3(0, 1, 0)
    arrow.quaternion.setFromUnitVectors(
      plusYDir,
      dir
    );

    // 8) Finally, move the whole arrow so its base sits at `from`
    arrow.position.copy(from);

    // Also add back end (dashed line)
    const back = createDashedLine({to: plusYDir.clone().multiplyScalar(-2), material: redMaterial});
    arrow.add(back);

    // Give a name
    arrow.name = "spatialAxisArrow";

    return arrow;
  }

  function createDashedLine({
    to,
    from = new THREE.Vector3(0, 0, 0),
    radius = .025,
    dashSize = .075,
    gapSize = .05,
    material = redMaterial,
    radialSegments = 16
  }) {
    // 1) compute direction & lengths
    const dir        = new THREE.Vector3().subVectors(to, from);
    const length     = dir.length();
    const unitDir    = dir.clone().normalize();

    // 2) build the Group
    const line = new THREE.Group();

    // 3) add dashed shaft segments along +Y
    let pos = 0;
    while (pos < length) {
      // how long is this dash segment?
      const segLen = Math.min(dashSize, length - pos);
      // skip if segLen <= 0
      if (segLen > 0) {
        const geo = new THREE.CylinderGeometry(
          radius, radius,
          segLen,
          radialSegments
        );
        const mesh = new THREE.Mesh(geo, material);
        // Cylinder runs from -segLen/2 → +segLen/2 on Y, so shift up:
        mesh.position.y = pos + segLen/2;
        line.add(mesh);
      }
      // advance past dash + gap
      pos += dashSize + gapSize;
    }

    // 5) orient + position the whole line
    line.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      unitDir
    );
    line.position.copy(from);

    return line;
  }

export function onWindowResize(camera, renderer) {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 1) Update your WebGLRenderer & camera
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
}


function mollToLatLon(x, y) {
  // 1) recover the auxiliary θ from y
  const theta = Math.asin(y / Math.SQRT2);

  // 2) longitude λ
  const lon = THREE.MathUtils.radToDeg((Math.PI * x) / (2 * Math.SQRT2 * Math.cos(theta)));

  // 3) latitude φ
  const lat = THREE.MathUtils.radToDeg(Math.asin((2 * theta + Math.sin(2 * theta)) / Math.PI));

  return { lat, lon };
}

export function latLonToMollweide(phiRad, lamRad) {

  // 1) Initial guess for θ is just φ
  const theta0 = phiRad;
  const twoTheta0 = 2 * theta0;

  // 2) Compute f(θ) = 2θ + sin(2θ) − π·sinφ and f′(θ) = 2 + 2cos(2θ) = 4 cos²θ
  const f0      = twoTheta0 + Math.sin(twoTheta0) - Math.PI * Math.sin(phiRad);
  const f0prime = 4 * Math.cos(theta0) ** 2;

  // 3) One Newton step: θ ≈ θ0 − f(θ0)/f′(θ0)
  const theta   = theta0 - f0 / f0prime;

  // 4) Now compute the actual projection
  const x = (2 * Math.SQRT2 / Math.PI) * lamRad * Math.cos(theta);
  const y = Math.SQRT2 * Math.sin(theta);
  return [ x , y ];
}


export function onMollyClick(event, hud) {
  ////// Update lat/lon values in select box /////
  const rect = hud.getBoundingClientRect();
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  // mouse offset inside the image
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  // normalize
  const nx = (offsetX - halfWidth) / halfWidth;
  const ny = -(offsetY - halfHeight) / halfHeight;
  // Mollweide-ize
  const mx = 2 * Math.SQRT2 * nx;
  const my = Math.SQRT2 * ny;
  // Cartesian
  const { lat, lon } = mollToLatLon(mx, my);
  if ( lat > 90 || lat < -90 || lon > 180 || lon < -180) {
    return null;
  }
  document.getElementById('surface_lat').value = Math.round(lat, 2);
  document.getElementById('surface_lon').value = Math.round(lon, 2);

  ////// Show little red dot //////
  const dot = hud.querySelector('.dot');
  console.log(offsetX, offsetY);
  dot.style.left    = `${offsetX}px`;
  dot.style.top     = `${offsetY}px`;
  dot.style.display = 'block';
}
