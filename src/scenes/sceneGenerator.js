/**
 * Three.js scene generator.
 * Creates visually distinct 3D environments for each scene type.
 * Each environment uses procedural geometry - no external assets required.
 */

import * as THREE from 'three';

export class SceneGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    this.rainParticles = null;
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.glowObjects = [];
    this.floatingObjects = [];

    this.setSize();
    this.setupLighting();
    this.startRenderLoop();

    // Handle resize
    this._resizeHandler = () => this.setSize();
    window.addEventListener('resize', this._resizeHandler);
  }

  setSize() {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight * 0.6;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x111122, 0.5);
    this.scene.add(ambient);
  }

  // ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────

  generateScene(visualData) {
    if (!visualData) return;

    this.clearScene();
    this.rainParticles = null;
    this.glowObjects = [];
    this.floatingObjects = [];

    // Add fog for depth
    this.scene.fog = new THREE.FogExp2(0x05050f, 0.04);

    switch (visualData.environment) {
      case 'neon-lit alley':        this.createNeonAlley(visualData);       break;
      case 'abandoned warehouse':   this.createWarehouse(visualData);       break;
      case 'rooftop':               this.createRooftop(visualData);         break;
      case 'corporate office':      this.createCorporateOffice(visualData); break;
      case 'underground club':      this.createUndergroundClub(visualData); break;
      case 'cyberspace':            this.createCyberspace(visualData);      break;
      case 'apartment':             this.createApartment(visualData);       break;
      case 'police station':        this.createPoliceStation(visualData);   break;
      default:                      this.createGenericUrban(visualData);    break;
    }
  }

  clearScene() {
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
  }

  // ─── ENVIRONMENT BUILDERS ──────────────────────────────────────────────────

  createNeonAlley(data) {
    this.scene.background = new THREE.Color(0x02020a);
    this.scene.fog = new THREE.FogExp2(0x05050f, 0.06);

    // Ground (wet asphalt)
    const ground = this.addMesh(
      new THREE.PlaneGeometry(20, 60),
      new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.2, metalness: 0.6 })
    );
    ground.rotation.x = -Math.PI / 2;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 });
    const leftWall = this.addMesh(new THREE.BoxGeometry(0.5, 10, 60), wallMat);
    leftWall.position.set(-10, 5, 0);
    const rightWall = this.addMesh(new THREE.BoxGeometry(0.5, 10, 60), wallMat);
    rightWall.position.set(10, 5, 0);

    // Add neon signs on walls
    this.addNeonSign(-9.5, 6, -5, 0x00ffff, 'NEON');
    this.addNeonSign(9.5, 7, -10, 0xff0080, 'BAR');
    this.addNeonSign(-9.5, 5, -20, 0xff6600, 'CYBER');

    this.addNeonLights(data.lighting);
    this.addObjects(data.objects);

    this.camera.position.set(0, 4, 18);
    this.camera.lookAt(0, 2, 0);
  }

  createWarehouse(data) {
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.FogExp2(0x080808, 0.05);

    // Floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 1 });
    [-20, 20].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.5, 12, 40), wallMat);
      w.position.set(x, 6, 0);
    });
    const backWall = this.addMesh(new THREE.BoxGeometry(40, 12, 0.5), wallMat);
    backWall.position.set(0, 6, -20);

    // Ceiling with industrial beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    for (let z = -15; z <= 15; z += 10) {
      const beam = this.addMesh(new THREE.BoxGeometry(40, 0.4, 0.4), beamMat);
      beam.position.set(0, 11, z);
    }

    // Hanging lights
    const hangingLight = new THREE.PointLight(0xffe8b0, 3, 20);
    hangingLight.position.set(0, 9, 0);
    this.scene.add(hangingLight);

    // Dim industrial light
    const indLight = new THREE.SpotLight(0xfff0cc, 2, 30, Math.PI / 4);
    indLight.position.set(0, 11, 5);
    indLight.target.position.set(0, 0, 0);
    this.scene.add(indLight);
    this.scene.add(indLight.target);

    // Crates
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    [[-5, 0, -5], [7, 0, -8], [-8, 0, 3], [5, 0, 5]].forEach(([x, , z]) => {
      const crate = this.addMesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
      crate.position.set(x, 1, z);
    });

    this.addObjects(data.objects);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 2, 0);
  }

  createRooftop(data) {
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.03);

    // Rooftop surface
    const roof = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 })
    );
    roof.rotation.x = -Math.PI / 2;

    // HVAC units
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
    [[-8, 0, -8], [8, 0, -6], [-4, 0, 5]].forEach(([x, , z]) => {
      const hvac = this.addMesh(new THREE.BoxGeometry(3, 2, 2), hvacMat);
      hvac.position.set(x, 1, z);
    });

    // City skyline in background (simple box shapes)
    const skylineMat = new THREE.MeshStandardMaterial({ color: 0x0f0f22 });
    for (let i = 0; i < 12; i++) {
      const h = 5 + Math.random() * 20;
      const building = this.addMesh(
        new THREE.BoxGeometry(3 + Math.random() * 4, h, 3 + Math.random() * 4),
        skylineMat
      );
      building.position.set(
        -30 + i * 6 + Math.random() * 4,
        h / 2 - 2,
        -20 + Math.random() * 4
      );
    }

    // Neon city glow from below
    const cityGlow = new THREE.HemisphereLight(0xff0066, 0x0033ff, 0.6);
    this.scene.add(cityGlow);

    // Stars
    this.addStars();

    this.addNeonLights(data.lighting);
    this.addObjects(data.objects);

    this.camera.position.set(0, 8, 18);
    this.camera.lookAt(0, 2, -5);
  }

  createCorporateOffice(data) {
    this.scene.background = new THREE.Color(0x080812);
    this.scene.fog = new THREE.FogExp2(0x080812, 0.04);

    // Floor - polished marble
    const floor = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.4 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Walls - glass and steel
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a33, roughness: 0.3, metalness: 0.7 });
    [-15, 15].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.3, 12, 30), wallMat);
      w.position.set(x, 6, 0);
    });

    // Corporate desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x222244, metalness: 0.5 });
    const desk = this.addMesh(new THREE.BoxGeometry(8, 0.2, 3), deskMat);
    desk.position.set(0, 1, -5);

    // Holographic blue light from screens
    const screenGlow = new THREE.PointLight(0x0066ff, 3, 15);
    screenGlow.position.set(0, 3, -5);
    this.scene.add(screenGlow);

    // Cold overhead lights
    for (let x = -8; x <= 8; x += 8) {
      const light = new THREE.SpotLight(0xccddff, 2, 20, Math.PI / 6);
      light.position.set(x, 10, 0);
      light.target.position.set(x, 0, 0);
      this.scene.add(light);
      this.scene.add(light.target);
    }

    // Corp logo - floating cube with glow
    const logo = this.addMesh(
      new THREE.BoxGeometry(2, 2, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x0044ff, wireframe: true })
    );
    logo.position.set(0, 5, -14);
    this.floatingObjects.push({ mesh: logo, axis: 'y', speed: 0.5 });

    this.camera.position.set(0, 4, 12);
    this.camera.lookAt(0, 2, 0);
  }

  createUndergroundClub(data) {
    this.scene.background = new THREE.Color(0x050005);
    this.scene.fog = new THREE.FogExp2(0x080008, 0.07);

    // Dance floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(25, 25),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.5 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Bar counter
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a0022, roughness: 0.5 });
    const bar = this.addMesh(new THREE.BoxGeometry(15, 1, 2), barMat);
    bar.position.set(0, 0.5, -10);

    // Club lights - rotating colors
    const clubColors = [0xff0066, 0x00ffff, 0xff6600, 0x9900ff];
    clubColors.forEach((color, i) => {
      const light = new THREE.SpotLight(color, 8, 25, Math.PI / 8);
      light.position.set(-6 + i * 4, 8, -2);
      light.target.position.set(0, 0, 0);
      this.scene.add(light);
      this.scene.add(light.target);
      this.glowObjects.push({ light, baseAngle: (i / clubColors.length) * Math.PI * 2, speed: 1 + i * 0.3 });
    });

    // Speakers
    const spkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-10, 10].forEach(x => {
      const spk = this.addMesh(new THREE.BoxGeometry(2, 4, 2), spkMat);
      spk.position.set(x, 2, -11);
    });

    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 1, 0);
  }

  createCyberspace(data) {
    this.scene.background = new THREE.Color(0x000011);
    this.scene.fog = new THREE.FogExp2(0x000011, 0.02);

    // Grid floor
    const gridHelper = new THREE.GridHelper(60, 30, 0x003366, 0x001133);
    this.scene.add(gridHelper);

    // Floating data cubes
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    for (let i = 0; i < 20; i++) {
      const size = 0.5 + Math.random() * 2;
      const cube = this.addMesh(new THREE.BoxGeometry(size, size, size), cubeMat.clone());
      cube.position.set(
        (Math.random() - 0.5) * 30,
        1 + Math.random() * 10,
        (Math.random() - 0.5) * 30
      );
      this.floatingObjects.push({
        mesh: cube,
        axis: Math.random() > 0.5 ? 'y' : 'x',
        speed: 0.2 + Math.random() * 0.8
      });
    }

    // Data streams (vertical lines)
    for (let i = 0; i < 15; i++) {
      const streamGeo = new THREE.BufferGeometry();
      const points = [];
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      for (let y = 0; y <= 20; y += 0.5) {
        points.push(new THREE.Vector3(x, y, z));
      }
      streamGeo.setFromPoints(points);
      const streamMat = new THREE.LineBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.7
      });
      this.scene.add(new THREE.Line(streamGeo, streamMat));
    }

    // Central node
    const nodeLight = new THREE.PointLight(0x00ffff, 5, 20);
    nodeLight.position.set(0, 5, -10);
    this.scene.add(nodeLight);

    const node = this.addMesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    );
    node.position.set(0, 5, -10);
    this.floatingObjects.push({ mesh: node, axis: 'y', speed: 1.5 });

    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 3, 0);
  }

  createApartment(data) {
    this.scene.background = new THREE.Color(0x080810);
    this.scene.fog = new THREE.FogExp2(0x080810, 0.08);

    // Floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(12, 15),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x151520 });
    const backWall = this.addMesh(new THREE.BoxGeometry(12, 8, 0.3), wallMat);
    backWall.position.set(0, 4, -7.5);
    const sideWall = this.addMesh(new THREE.BoxGeometry(0.3, 8, 15), wallMat);
    sideWall.position.set(-6, 4, 0);

    // Window with city glow
    const windowGlow = new THREE.PointLight(0xff0044, 2, 12);
    windowGlow.position.set(3, 4, -7);
    this.scene.add(windowGlow);

    // Desk + computer glow
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a });
    const desk = this.addMesh(new THREE.BoxGeometry(3, 0.1, 1.5), deskMat);
    desk.position.set(-2, 1, -3);

    const screenGlow = new THREE.PointLight(0x0099ff, 2, 6);
    screenGlow.position.set(-2, 2, -3.5);
    this.scene.add(screenGlow);

    // Dim ambient light (neon from window)
    const ambientLight = new THREE.AmbientLight(0x110022, 0.8);
    this.scene.add(ambientLight);

    this.camera.position.set(2, 3.5, 7);
    this.camera.lookAt(-1, 2, 0);
  }

  createPoliceStation(data) {
    this.scene.background = new THREE.Color(0x050508);

    // Floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Harsh white/blue overhead lights
    const lights = [[-8, 0], [0, 0], [8, 0], [0, -8]];
    lights.forEach(([x, z]) => {
      const light = new THREE.SpotLight(0xaaccff, 4, 20, Math.PI / 5);
      light.position.set(x, 10, z);
      light.target.position.set(x, 0, z);
      light.castShadow = true;
      this.scene.add(light);
      this.scene.add(light.target);
    });

    // Interrogation table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 });
    const table = this.addMesh(new THREE.BoxGeometry(4, 0.1, 2), tableMat);
    table.position.set(0, 0.8, 0);

    // Chairs
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [-2.5, 2.5].forEach(x => {
      const chair = this.addMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), chairMat);
      chair.position.set(x, 0.4, 0);
    });

    // Red warning light in corner
    const warnLight = new THREE.PointLight(0xff0000, 1, 8);
    warnLight.position.set(-12, 6, -12);
    this.scene.add(warnLight);

    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 1, 0);
  }

  createGenericUrban(data) {
    this.scene.background = new THREE.Color(0x030308);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.05);

    // Ground
    const ground = this.addMesh(
      new THREE.PlaneGeometry(30, 60),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.7 })
    );
    ground.rotation.x = -Math.PI / 2;

    // Random city blocks
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x0f0f1f });
    for (let i = 0; i < 8; i++) {
      const h = 4 + Math.random() * 12;
      const b = this.addMesh(
        new THREE.BoxGeometry(3 + Math.random() * 5, h, 3 + Math.random() * 5),
        buildMat
      );
      b.position.set(
        (Math.random() - 0.5) * 25,
        h / 2,
        -10 - Math.random() * 20
      );
    }

    this.addNeonLights(data.lighting);
    this.addObjects(data.objects);

    this.camera.position.set(0, 4, 16);
    this.camera.lookAt(0, 2, 0);
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  addMesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  addNeonLights(lightingType) {
    const colorMap = {
      'dim red':        0xff0020,
      'harsh white':    0xffffff,
      'flickering neon': 0x00ffff,
      'purple haze':    0x9900ff,
      'cold blue':      0x0066ff,
      'golden warm':    0xff9944
    };
    const color = colorMap[lightingType] ?? 0x00ffff;

    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(color, 2.5, 12);
      light.position.set(
        (Math.random() - 0.5) * 16,
        3 + Math.random() * 4,
        (Math.random() - 0.5) * 20
      );
      this.scene.add(light);

      // Glow sphere
      const glow = this.addMesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      glow.position.copy(light.position);
    }
  }

  addNeonSign(x, y, z, color, text) {
    // Simple neon sign represented as emissive box
    const signMesh = this.addMesh(
      new THREE.BoxGeometry(0.1, 0.5, 2),
      new THREE.MeshBasicMaterial({ color })
    );
    signMesh.position.set(x, y, z);

    const signLight = new THREE.PointLight(color, 3, 6);
    signLight.position.set(x + 0.3, y, z);
    this.scene.add(signLight);
  }

  addStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 1000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });
    this.scene.add(new THREE.Points(starGeo, starMat));
  }

  addObjects(objects) {
    if (!Array.isArray(objects)) return;
    objects.forEach(obj => {
      switch (obj) {
        case 'rain':          this.addRain();          break;
        case 'dumpster':      this.addDumpster();      break;
        case 'broken neon sign': this.addBrokenSign(); break;
        case 'smoke':         this.addSmoke();         break;
        default: break; // Ignore unknown objects gracefully
      }
    });
  }

  addRain() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i]     = (Math.random() - 0.5) * 40;
      positions[i + 1] = Math.random() * 25;
      positions[i + 2] = (Math.random() - 0.5) * 60;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.rainParticles = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x8899bb, size: 0.07, transparent: true, opacity: 0.5 })
    );
    this.scene.add(this.rainParticles);
  }

  addDumpster() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a5523, roughness: 0.9 });
    const dumpster = this.addMesh(new THREE.BoxGeometry(2, 1.5, 1), mat);
    dumpster.position.set(-7, 0.75, -3);

    const lid = this.addMesh(new THREE.BoxGeometry(2.1, 0.1, 1.1), mat);
    lid.position.set(-7, 1.55, -3);
    lid.rotation.z = 0.3; // Slightly open
  }

  addBrokenSign() {
    const colors = [0xff0066, 0x00ffff, 0xff6600];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const sign = this.addMesh(
      new THREE.BoxGeometry(0.1, 1, 3),
      new THREE.MeshBasicMaterial({ color })
    );
    sign.position.set(9, 5, -8);
    sign.rotation.z = 0.2;

    // Flickering light
    const signLight = new THREE.PointLight(color, 1.5, 5);
    signLight.position.set(8.5, 5, -8);
    this.scene.add(signLight);
    this.glowObjects.push({ light: signLight, flicker: true, baseIntensity: 1.5 });
  }

  addSmoke() {
    // Simple particle-based smoke puff
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i]     = (Math.random() - 0.5) * 4;
      positions[i + 1] = Math.random() * 3;
      positions[i + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x444444, size: 0.4, transparent: true, opacity: 0.2 })
    );
    pts.position.set(3, 0, 2);
    this.scene.add(pts);
  }

  // ─── RENDER LOOP ──────────────────────────────────────────────────────────

  startRenderLoop() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const elapsed = this.clock.getElapsedTime();

      // Animate rain falling
      if (this.rainParticles) {
        const pos = this.rainParticles.geometry.attributes.position.array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= 0.25;
          if (pos[i] < 0) pos[i] = 25;
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      // Rotate/float objects
      this.floatingObjects.forEach(({ mesh, axis, speed }) => {
        if (axis === 'y') mesh.rotation.y = elapsed * speed;
        else mesh.rotation.x = elapsed * speed;
        mesh.position.y += Math.sin(elapsed * speed) * 0.001;
      });

      // Flicker glow objects (signs, club lights)
      this.glowObjects.forEach(item => {
        if (item.flicker) {
          item.light.intensity = item.baseIntensity * (0.7 + Math.sin(elapsed * 20) * 0.3);
        } else if (item.baseAngle !== undefined) {
          // Rotating club light
          item.light.target.position.x = Math.cos(elapsed * item.speed + item.baseAngle) * 8;
          item.light.target.position.z = Math.sin(elapsed * item.speed + item.baseAngle) * 8;
          if (item.light.target.parent === null) this.scene.add(item.light.target);
          item.light.target.updateMatrixWorld();
        }
      });

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this._resizeHandler);
    this.clearScene();
    this.renderer.dispose();
  }
}
