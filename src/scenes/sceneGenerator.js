/**
 * Three.js scene generator.
 * Creates visually distinct 3D environments with dynamic particles and camera animations.
 * Each environment uses procedural geometry — no external assets required.
 */

import * as THREE from 'three';

export class SceneGenerator {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.clock = new THREE.Clock();
    this.animationId = null;

    // Particle systems
    this.rainSystem = null;
    this.particleSystems = [];

    // Animation lists
    this.floatingObjects = [];
    this.glowObjects = [];
    this._particleData = []; // { mesh, type, userData }

    // Camera animation state
    this._camOrbit = null;   // { radius, height, speed, offsetAngle, target }
    this._camPan = null;     // { baseX, baseY, baseZ, range, speed, target }
    this._camShake = false;
    this._camBase = new THREE.Vector3();

    this.setSize();
    this.setupBaseAmbient();
    this.startRenderLoop();

    this._resizeHandler = () => this.setSize();
    window.addEventListener('resize', this._resizeHandler);
  }

  setSize() {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || Math.round(window.innerHeight * 0.55);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setupBaseAmbient() {
    const a = new THREE.AmbientLight(0x0a0a18, 0.6);
    this.scene.add(a);
  }

  // ─── MAIN ENTRY POINT ────────────────────────────────────────────────────

  generateScene(visualData) {
    if (!visualData) return;
    this.clearScene();
    this._camOrbit = null;
    this._camPan = null;
    this._camShake = false;
    this.floatingObjects = [];
    this.glowObjects = [];
    this.rainSystem = null;
    this._particleData = [];

    this.scene.fog = new THREE.FogExp2(0x05050f, 0.04);
    this.setupBaseAmbient();

    switch (visualData.environment) {
      case 'neon-lit alley':      this.createNeonAlley(visualData);       break;
      case 'abandoned warehouse': this.createWarehouse(visualData);        break;
      case 'rooftop':             this.createRooftop(visualData);          break;
      case 'corporate office':    this.createCorporateOffice(visualData);  break;
      case 'underground club':    this.createUndergroundClub(visualData);  break;
      case 'cyberspace':          this.createCyberspace(visualData);       break;
      case 'apartment':           this.createApartment(visualData);        break;
      case 'police station':      this.createPoliceStation(visualData);    break;
      case 'sewer':               this.createSewer(visualData);            break;
      case 'market':              this.createMarket(visualData);           break;
      case 'hospital':            this.createHospital(visualData);         break;
      default:                    this.createGenericUrban(visualData);     break;
    }

    // Add particle system based on `particles` field
    const pt = visualData.particles;
    if (pt === 'rain')    this.addRain();
    else if (pt === 'smoke')   this.addSmoke();
    else if (pt === 'sparks')  this.addSparks();
    else if (pt === 'embers')  this.addEmbers();
    else if (pt === 'digital') this.addDigitalParticles();

    // Also handle legacy objects array
    if (Array.isArray(visualData.objects)) {
      visualData.objects.forEach(obj => {
        switch (obj) {
          case 'rain':             if (pt !== 'rain')   this.addRain();   break;
          case 'smoke':            if (pt !== 'smoke')  this.addSmoke();  break;
          case 'sparks':           if (pt !== 'sparks') this.addSparks(); break;
          case 'dumpster':         this.addDumpster();  break;
          case 'broken neon sign': this.addBrokenSign(); break;
          default: break;
        }
      });
    }

    // Apply camera animation style
    this.applyCameraStyle(visualData.cameraStyle || 'static');
  }

  clearScene() {
    // Dispose all children
    const toRemove = [...this.scene.children];
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      obj.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    });
  }

  // ─── CAMERA ANIMATION ────────────────────────────────────────────────────

  applyCameraStyle(style) {
    this._camBase.copy(this.camera.position);
    this._camOrbit = null;
    this._camPan = null;
    this._camShake = false;

    const pos = this.camera.position;
    const radius = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

    switch (style) {
      case 'orbit':
        this._camOrbit = {
          radius: radius || 16,
          height: pos.y,
          speed: 0.12,
          offsetAngle: Math.atan2(pos.z, pos.x),
          target: new THREE.Vector3(0, 2, 0)
        };
        break;
      case 'slow-pan':
        this._camPan = {
          baseX: pos.x,
          baseY: pos.y,
          baseZ: pos.z,
          range: 3,
          speed: 0.35,
          target: new THREE.Vector3(0, 2, 0)
        };
        break;
      case 'shake':
        this._camShake = true;
        break;
      case 'static':
      default:
        break;
    }
  }

  // ─── ENVIRONMENT BUILDERS ────────────────────────────────────────────────

  createNeonAlley(data) {
    this.scene.background = new THREE.Color(0x020208);
    this.scene.fog = new THREE.FogExp2(0x04040e, 0.06);

    // Wet asphalt (reflective)
    const ground = this.addMesh(
      new THREE.PlaneGeometry(20, 70),
      new THREE.MeshStandardMaterial({ color: 0x0a0a18, roughness: 0.15, metalness: 0.75 })
    );
    ground.rotation.x = -Math.PI / 2;

    // Puddles (emissive reflections)
    for (let i = 0; i < 5; i++) {
      const puddle = this.addMesh(
        new THREE.PlaneGeometry(1.5 + Math.random(), 0.6 + Math.random() * 0.5),
        new THREE.MeshBasicMaterial({ color: 0x001122, transparent: true, opacity: 0.6 })
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * 12, 0.01, -4 + Math.random() * -20);
    }

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x141424, roughness: 0.9 });
    const lw = this.addMesh(new THREE.BoxGeometry(0.4, 12, 70), wallMat);
    lw.position.set(-10, 6, 0);
    const rw = this.addMesh(new THREE.BoxGeometry(0.4, 12, 70), wallMat);
    rw.position.set(10, 6, 0);

    // Wall detail panels
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a30, roughness: 1 });
    for (let z = -5; z >= -30; z -= 7) {
      const p = this.addMesh(new THREE.BoxGeometry(0.15, 3 + Math.random() * 4, 4), panelMat);
      p.position.set(-9.7, 2 + Math.random() * 4, z);
      const p2 = this.addMesh(new THREE.BoxGeometry(0.15, 3 + Math.random() * 4, 4), panelMat);
      p2.position.set(9.7, 2 + Math.random() * 4, z);
    }

    // Neon signs
    this.addNeonSign(-9.3, 6, -5,  0x00ffff, 3);
    this.addNeonSign( 9.3, 7, -11, 0xff0088, 2.5);
    this.addNeonSign(-9.3, 5, -18, 0xff6600, 3.5);
    this.addNeonSign( 9.3, 8, -25, 0xaa00ff, 2);

    this.addNeonLights(data.lighting);

    this.camera.position.set(0, 4, 20);
    this.camera.lookAt(0, 3, 0);
  }

  createWarehouse(data) {
    this.scene.background = new THREE.Color(0x040408);
    this.scene.fog = new THREE.FogExp2(0x070710, 0.05);

    const floor = this.addMesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 1 });
    [-20, 20].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.4, 14, 40), wallMat);
      w.position.set(x, 7, 0);
    });
    const bw = this.addMesh(new THREE.BoxGeometry(40, 14, 0.4), wallMat);
    bw.position.set(0, 7, -20);

    // Industrial ceiling beams
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 });
    for (let z = -15; z <= 15; z += 8) {
      const beam = this.addMesh(new THREE.BoxGeometry(40, 0.5, 0.5), beamMat);
      beam.position.set(0, 13, z);
    }
    // Vertical supports
    for (let x = -12; x <= 12; x += 12) {
      const col = this.addMesh(new THREE.BoxGeometry(0.4, 14, 0.4), beamMat);
      col.position.set(x, 7, 0);
    }

    // Hanging lights with cones
    [[-8, 0], [0, -8], [8, 4], [-4, 8]].forEach(([x, z]) => {
      const cable = this.addMesh(new THREE.BoxGeometry(0.05, 3, 0.05), beamMat);
      cable.position.set(x, 11.5, z);
      const bulb = this.addMesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe8c0 })
      );
      bulb.position.set(x, 10, z);
      const pl = new THREE.PointLight(0xffe8b0, 4, 18);
      pl.position.set(x, 10, z);
      this.scene.add(pl);
      this.glowObjects.push({ light: pl, flicker: Math.random() > 0.6, baseIntensity: 4 });
    });

    // Crates
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
    [[-5, -5], [7, -8], [-8, 3], [5, 5], [0, -14], [-10, -10]].forEach(([x, z]) => {
      const h = 1.5 + Math.random();
      const crate = this.addMesh(new THREE.BoxGeometry(2, h, 2), crateMat);
      crate.position.set(x, h / 2, z);
      if (Math.random() > 0.5) {
        const crate2 = this.addMesh(new THREE.BoxGeometry(1.8, 1.5, 1.8), crateMat);
        crate2.position.set(x, h + 0.75, z);
      }
    });

    this.camera.position.set(0, 5, 17);
    this.camera.lookAt(0, 2, 0);
  }

  createRooftop(data) {
    this.scene.background = new THREE.Color(0x080818);
    this.scene.fog = new THREE.FogExp2(0x080818, 0.025);

    const roof = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.85 })
    );
    roof.rotation.x = -Math.PI / 2;

    // Raised ledge
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x252538, roughness: 0.9 });
    [
      [0, -15, 30, 0.8, 0.8],
      [0,  15, 30, 0.8, 0.8],
      [-15, 0, 0.8, 0.8, 30],
      [ 15, 0, 0.8, 0.8, 30],
    ].forEach(([x, z, w, h, d]) => {
      const l = this.addMesh(new THREE.BoxGeometry(w, h, d), ledgeMat);
      l.position.set(x, 0.4, z);
    });

    // HVAC units
    const hvacMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.5 });
    [[-9, -7], [9, -5], [-4, 6], [7, 8]].forEach(([x, z]) => {
      const hv = this.addMesh(new THREE.BoxGeometry(3, 2.5, 2), hvacMat);
      hv.position.set(x, 1.25, z);
      // Fan grille detail
      const grille = this.addMesh(new THREE.BoxGeometry(1.5, 1.5, 0.1), new THREE.MeshBasicMaterial({ color: 0x333344, wireframe: true }));
      grille.position.set(x, 1.5, z + 1.05);
    });

    // Water tower
    const tower = this.addMesh(new THREE.CylinderGeometry(1, 1, 3, 12), new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 1 }));
    tower.position.set(-12, 1.5, -10);

    // City skyline
    const skylineMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1e });
    const glowMat    = new THREE.MeshBasicMaterial({ color: 0xff0066, wireframe: true, transparent: true, opacity: 0.3 });
    for (let i = 0; i < 20; i++) {
      const h = 6 + Math.random() * 25;
      const b = this.addMesh(new THREE.BoxGeometry(3 + Math.random() * 5, h, 3 + Math.random() * 5), skylineMat);
      b.position.set(-40 + i * 4.5 + Math.random() * 3, h / 2 - 3, -25 - Math.random() * 10);
      // Some buildings have window lights
      if (Math.random() > 0.5) {
        for (let wy = 2; wy < h - 1; wy += 2.5) {
          const winLight = new THREE.PointLight(Math.random() > 0.5 ? 0xff0044 : 0x0033ff, 0.3, 4);
          winLight.position.set(b.position.x, wy, b.position.z);
          this.scene.add(winLight);
        }
      }
    }

    // City glow from below
    const glow = new THREE.HemisphereLight(0xff0044, 0x0022ff, 0.8);
    this.scene.add(glow);

    this.addStars();
    this.addNeonLights(data.lighting);

    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 2, -4);
  }

  createCorporateOffice(data) {
    this.scene.background = new THREE.Color(0x06060e);
    this.scene.fog = new THREE.FogExp2(0x080812, 0.035);

    // Polished marble floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0e0e20, roughness: 0.08, metalness: 0.5 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Glass walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111128, roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.9 });
    [-15, 15].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.2, 14, 30), wallMat);
      w.position.set(x, 7, 0);
    });
    const bw = this.addMesh(new THREE.BoxGeometry(30, 14, 0.2), wallMat);
    bw.position.set(0, 7, -15);

    // Desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1a1a33, metalness: 0.6, roughness: 0.3 });
    const desk = this.addMesh(new THREE.BoxGeometry(10, 0.15, 3), deskMat);
    desk.position.set(0, 1, -6);
    const legs = [[-4, -7], [4, -7], [-4, -5], [4, -5]];
    legs.forEach(([x, z]) => {
      const leg = this.addMesh(new THREE.BoxGeometry(0.15, 1, 0.15), deskMat);
      leg.position.set(x, 0.5, z);
    });

    // Monitors
    for (let x = -3; x <= 3; x += 3) {
      const screen = this.addMesh(new THREE.BoxGeometry(2, 1.2, 0.08), new THREE.MeshBasicMaterial({ color: 0x001133 }));
      screen.position.set(x, 2.2, -6.8);
      const screenGlow = new THREE.PointLight(0x0044ff, 2, 8);
      screenGlow.position.set(x, 2.2, -6);
      this.scene.add(screenGlow);
      this.glowObjects.push({ light: screenGlow, flicker: false, pulse: true, baseIntensity: 2, speed: 0.5 + Math.random() });
    }

    // Cold overhead strips
    for (let x = -10; x <= 10; x += 5) {
      const strip = this.addMesh(new THREE.BoxGeometry(0.1, 0.05, 8), new THREE.MeshBasicMaterial({ color: 0x8899ff }));
      strip.position.set(x, 13, 0);
      const sl = new THREE.SpotLight(0xaabbff, 3, 20, Math.PI / 5);
      sl.position.set(x, 12, 0);
      sl.target.position.set(x, 0, 0);
      this.scene.add(sl); this.scene.add(sl.target);
    }

    // Floating corp logo
    const logo = this.addMesh(
      new THREE.BoxGeometry(2.5, 2.5, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x0033cc, wireframe: true })
    );
    logo.position.set(0, 6, -14.5);
    this.floatingObjects.push({ mesh: logo, axis: 'y', speed: 0.4, bobAmp: 0.3 });

    const logoLight = new THREE.PointLight(0x0033ff, 3, 10);
    logoLight.position.set(0, 6, -13);
    this.scene.add(logoLight);

    this.camera.position.set(0, 5, 13);
    this.camera.lookAt(0, 3, 0);
  }

  createUndergroundClub(data) {
    this.scene.background = new THREE.Color(0x030005);
    this.scene.fog = new THREE.FogExp2(0x060008, 0.06);

    // Dance floor with grid pattern
    const floor = this.addMesh(
      new THREE.PlaneGeometry(25, 25),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Floor grid tiles
    const gridHelper = new THREE.GridHelper(24, 12, 0x220033, 0x110022);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a000f, roughness: 1 });
    [-12.5, 12.5].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.3, 10, 25), wallMat);
      w.position.set(x, 5, 0);
    });
    const bw = this.addMesh(new THREE.BoxGeometry(25, 10, 0.3), wallMat);
    bw.position.set(0, 5, -12.5);

    // Bar
    const barMat = new THREE.MeshStandardMaterial({ color: 0x1a0022, roughness: 0.5, metalness: 0.3 });
    const bar = this.addMesh(new THREE.BoxGeometry(16, 1.2, 2.5), barMat);
    bar.position.set(0, 0.6, -11);
    const barTop = this.addMesh(new THREE.BoxGeometry(16, 0.1, 2.5), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 }));
    barTop.position.set(0, 1.25, -11);

    // Neon bar backlighting
    const barGlow = new THREE.PointLight(0x6600ff, 3, 12);
    barGlow.position.set(0, 1.5, -9.5);
    this.scene.add(barGlow);

    // Speakers
    const spkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    [-11, 11].forEach(x => {
      const spk = this.addMesh(new THREE.BoxGeometry(2.5, 5, 2.5), spkMat);
      spk.position.set(x, 2.5, -11.5);
      const cone = this.addMesh(new THREE.CylinderGeometry(0.6, 0.8, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x333333 }));
      cone.position.set(x, 3, -10.3);
      const cone2 = cone.clone();
      cone2.position.set(x, 1.5, -10.3);
      this.scene.add(cone2);
    });

    // VU meter bars on back wall
    for (let x = -5; x <= 5; x += 2) {
      const h = 1 + Math.random() * 4;
      const bar2 = this.addMesh(new THREE.BoxGeometry(0.4, h, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
      bar2.position.set(x, h / 2, -12.3);
      this.floatingObjects.push({ mesh: bar2, axis: 'scale-y', speed: 2 + Math.random() * 3 });
    }

    // Club spot lights — rotating
    const clubColors = [0xff0066, 0x00ffff, 0xff6600, 0xaa00ff, 0x00ff44];
    clubColors.forEach((color, i) => {
      const sl = new THREE.SpotLight(color, 10, 28, Math.PI / 10, 0.3);
      sl.position.set(-8 + i * 4, 9, 2);
      sl.target.position.set(0, 0, 0);
      this.scene.add(sl); this.scene.add(sl.target);
      this.glowObjects.push({ light: sl, baseAngle: (i / clubColors.length) * Math.PI * 2, speed: 0.8 + i * 0.25 });
    });

    this.camera.position.set(0, 6, 14);
    this.camera.lookAt(0, 1, 0);
  }

  createCyberspace(data) {
    this.scene.background = new THREE.Color(0x000011);
    this.scene.fog = new THREE.FogExp2(0x000011, 0.018);

    // Grid floor
    const gridH = new THREE.GridHelper(80, 40, 0x003366, 0x001133);
    this.scene.add(gridH);

    // Second grid rotated (matrix effect)
    const gridH2 = new THREE.GridHelper(80, 80, 0x001122, 0x000a11);
    gridH2.rotation.y = Math.PI / 4;
    this.scene.add(gridH2);

    // Floating wireframe cubes of various shapes
    const matCyan  = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const matBlue  = new THREE.MeshBasicMaterial({ color: 0x0044ff, wireframe: true });
    const matGreen = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });

    for (let i = 0; i < 30; i++) {
      const type = Math.floor(Math.random() * 3);
      const size = 0.4 + Math.random() * 2.5;
      let geo;
      if (type === 0) geo = new THREE.BoxGeometry(size, size, size);
      else if (type === 1) geo = new THREE.OctahedronGeometry(size * 0.8);
      else geo = new THREE.IcosahedronGeometry(size * 0.7, 0);

      const mat = [matCyan, matBlue, matGreen][Math.floor(Math.random() * 3)].clone();
      const cube = this.addMesh(geo, mat);
      cube.position.set(
        (Math.random() - 0.5) * 50,
        1 + Math.random() * 15,
        (Math.random() - 0.5) * 50
      );
      this.floatingObjects.push({
        mesh: cube,
        axis: Math.random() > 0.5 ? 'y' : 'x',
        speed: 0.1 + Math.random() * 0.8,
        bobAmp: 0.3 + Math.random() * 0.5,
        bobOffset: Math.random() * Math.PI * 2
      });
    }

    // Data streams (vertical lines) with varying colors
    for (let i = 0; i < 25; i++) {
      const geo = new THREE.BufferGeometry();
      const pts = [];
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      for (let y = 0; y <= 20; y += 0.3) pts.push(new THREE.Vector3(x, y, z));
      geo.setFromPoints(pts);
      const color = [0x00ff66, 0x00ffff, 0x0044ff][Math.floor(Math.random() * 3)];
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.2 + Math.random() * 0.6 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      this.glowObjects.push({ line, flicker: true, baseIntensity: mat.opacity });
    }

    // Central node with halo rings
    const nodeLight = new THREE.PointLight(0x00ffff, 8, 25);
    nodeLight.position.set(0, 6, -12);
    this.scene.add(nodeLight);
    this.glowObjects.push({ light: nodeLight, pulse: true, baseIntensity: 8, speed: 1.5 });

    const node = this.addMesh(
      new THREE.IcosahedronGeometry(2, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true })
    );
    node.position.set(0, 6, -12);
    this.floatingObjects.push({ mesh: node, axis: 'y', speed: 2, bobAmp: 0.5 });

    // Ring around node
    const ring = this.addMesh(
      new THREE.TorusGeometry(3.5, 0.05, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x0088ff })
    );
    ring.position.set(0, 6, -12);
    ring.rotation.x = Math.PI / 2;
    this.floatingObjects.push({ mesh: ring, axis: 'y', speed: 0.8 });

    this.camera.position.set(0, 10, 22);
    this.camera.lookAt(0, 4, 0);
  }

  createApartment(data) {
    this.scene.background = new THREE.Color(0x070710);
    this.scene.fog = new THREE.FogExp2(0x070710, 0.07);

    // Floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(12, 15),
      new THREE.MeshStandardMaterial({ color: 0x171720, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x121220 });
    const bw = this.addMesh(new THREE.BoxGeometry(12, 8, 0.2), wallMat);
    bw.position.set(0, 4, -7.5);
    const sw = this.addMesh(new THREE.BoxGeometry(0.2, 8, 15), wallMat);
    sw.position.set(-6, 4, 0);

    // Window — rain + city glow through it
    const windowFrame = this.addMesh(new THREE.BoxGeometry(3.5, 3, 0.15), new THREE.MeshStandardMaterial({ color: 0x2a2a3a }));
    windowFrame.position.set(3, 4, -7.4);
    const windowGlass = this.addMesh(new THREE.PlaneGeometry(3, 2.5), new THREE.MeshBasicMaterial({ color: 0x050a1a, transparent: true, opacity: 0.7 }));
    windowGlass.position.set(3, 4, -7.3);

    const winGlow = new THREE.PointLight(0xff0033, 2.5, 14);
    winGlow.position.set(3.5, 4.5, -6.5);
    this.scene.add(winGlow);
    this.glowObjects.push({ light: winGlow, pulse: true, baseIntensity: 2.5, speed: 0.3 });

    // Second window, cyan hue
    const winGlow2 = new THREE.PointLight(0x00aaff, 1.5, 10);
    winGlow2.position.set(-1, 5, -6.5);
    this.scene.add(winGlow2);

    // Desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x252530 });
    const desk = this.addMesh(new THREE.BoxGeometry(3.5, 0.1, 1.5), deskMat);
    desk.position.set(-1.5, 1.1, -3.5);

    // Computer setup
    const monitor = this.addMesh(new THREE.BoxGeometry(1.8, 1.1, 0.08), new THREE.MeshBasicMaterial({ color: 0x001122 }));
    monitor.position.set(-1.5, 1.8, -3.9);
    const keyboard = this.addMesh(new THREE.BoxGeometry(1.2, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x1a1a22 }));
    keyboard.position.set(-1.5, 1.17, -3.2);

    const screenGlow = new THREE.PointLight(0x0099ff, 2.5, 7);
    screenGlow.position.set(-1.5, 2, -3.5);
    this.scene.add(screenGlow);
    this.glowObjects.push({ light: screenGlow, pulse: true, baseIntensity: 2.5, speed: 0.8 });

    // Mattress on floor
    const mattress = this.addMesh(new THREE.BoxGeometry(2.5, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x1a1520, roughness: 1 }));
    mattress.position.set(3, 0.15, 1);

    // Ambient neon from outside
    const ambient = new THREE.AmbientLight(0x110022, 0.5);
    this.scene.add(ambient);

    this.camera.position.set(2, 3.5, 7.5);
    this.camera.lookAt(-1, 2, 0);
  }

  createPoliceStation(data) {
    this.scene.background = new THREE.Color(0x040407);

    const floor = this.addMesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 1 });
    [-15, 15].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.2, 12, 30), wallMat);
      w.position.set(x, 6, 0);
    });
    const bw = this.addMesh(new THREE.BoxGeometry(30, 12, 0.2), wallMat);
    bw.position.set(0, 6, -15);

    // Interrogation table + chairs
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5 });
    const table = this.addMesh(new THREE.BoxGeometry(4.5, 0.12, 2), tableMat);
    table.position.set(0, 0.85, 0);
    const tableLegs = [[-2, -0.8], [2, -0.8], [-2, 0.8], [2, 0.8]];
    tableLegs.forEach(([x, z]) => {
      const leg = this.addMesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), tableMat);
      leg.position.set(x, 0.42, z);
    });

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4 });
    [-2.8, 2.8].forEach(x => {
      const seat = this.addMesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), chairMat);
      seat.position.set(x, 0.55, 0);
      const back = this.addMesh(new THREE.BoxGeometry(0.8, 0.7, 0.06), chairMat);
      back.position.set(x, 0.93, -0.37);
    });

    // Overhead spots — harsh
    [[-8, 0], [0, 0], [8, 0], [0, -8]].forEach(([x, z]) => {
      const sl = new THREE.SpotLight(0xaaccff, 5, 22, Math.PI / 5);
      sl.position.set(x, 10, z);
      sl.target.position.set(x, 0, z);
      sl.castShadow = true;
      this.scene.add(sl); this.scene.add(sl.target);
    });

    // Red warning light
    const warn = new THREE.PointLight(0xff0000, 2, 10);
    warn.position.set(-12, 7, -12);
    this.scene.add(warn);
    this.glowObjects.push({ light: warn, flicker: true, baseIntensity: 2 });

    // Blue strobe in corner
    const strobe = new THREE.PointLight(0x0000ff, 1.5, 8);
    strobe.position.set(12, 7, -12);
    this.scene.add(strobe);
    this.glowObjects.push({ light: strobe, flicker: true, baseIntensity: 1.5 });

    // One-way mirror
    const mirror = this.addMesh(
      new THREE.PlaneGeometry(4, 2),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.05 })
    );
    mirror.position.set(0, 2, -14.8);

    this.camera.position.set(0, 5, 13);
    this.camera.lookAt(0, 1, 0);
  }

  // ─── NEW ENVIRONMENTS ────────────────────────────────────────────────────

  createSewer(data) {
    this.scene.background = new THREE.Color(0x020204);
    this.scene.fog = new THREE.FogExp2(0x030308, 0.07);

    // Curved tunnel floor (approximated with plank segments)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x101414, roughness: 0.95 });
    for (let z = -25; z <= 5; z += 2) {
      const seg = this.addMesh(new THREE.PlaneGeometry(8, 2), floorMat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(0, 0, z);
    }

    // Walls — curved arch cross-sections
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x151e18, roughness: 1 });
    for (let z = -24; z <= 4; z += 4) {
      // Arch sides
      const lw = this.addMesh(new THREE.BoxGeometry(0.5, 4, 3.5), wallMat);
      lw.position.set(-4, 2, z);
      const rw = this.addMesh(new THREE.BoxGeometry(0.5, 4, 3.5), wallMat);
      rw.position.set(4, 2, z);
      // Arch ceiling
      const ceiling = this.addMesh(new THREE.BoxGeometry(8.5, 0.5, 3.5), wallMat);
      ceiling.position.set(0, 4.2, z);
    }

    // Stagnant water channel
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x051208, roughness: 0.02, metalness: 0.3, transparent: true, opacity: 0.8 });
    const water = this.addMesh(new THREE.PlaneGeometry(3, 30), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.02, -10);

    // Green/yellow emergency lights
    [[-10], [-18], [-5]].forEach(([z]) => {
      const emColor = Math.random() > 0.5 ? 0x00aa22 : 0xaaaa00;
      const em = new THREE.PointLight(emColor, 2.5, 12);
      em.position.set(Math.random() > 0.5 ? -3 : 3, 3.5, z);
      this.scene.add(em);
      this.glowObjects.push({ light: em, flicker: true, baseIntensity: 2.5 });

      const bulb = this.addMesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: emColor })
      );
      bulb.position.copy(em.position);
    });

    // Pipes on ceiling
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x223322, metalness: 0.4, roughness: 0.7 });
    for (let x = -3; x <= 3; x += 3) {
      const pipe = this.addMesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 8), pipeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x, 3.8, -10);
    }

    // Dripping water particles
    this.addDrips();

    this.camera.position.set(0, 2.5, 8);
    this.camera.lookAt(0, 1.5, -8);
  }

  createMarket(data) {
    this.scene.background = new THREE.Color(0x040308);
    this.scene.fog = new THREE.FogExp2(0x060508, 0.04);

    // Street ground
    const ground = this.addMesh(
      new THREE.PlaneGeometry(30, 50),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;

    // Market stalls
    const stallColors = [0x2a1a0a, 0x0a1a2a, 0x1a0a2a, 0x0a2a1a];
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -6 : 6;
      const z = -20 + i * 5;
      const stall = this.addMesh(
        new THREE.BoxGeometry(4.5, 0.08, 2.5),
        new THREE.MeshStandardMaterial({ color: stallColors[i % stallColors.length], roughness: 0.9 })
      );
      stall.position.set(side, 1, z);

      // Awning
      const awning = this.addMesh(
        new THREE.BoxGeometry(5, 0.06, 2.8),
        new THREE.MeshBasicMaterial({ color: stallColors[i % stallColors.length] })
      );
      awning.position.set(side, 2.5, z);

      // Neon sign above stall
      const neonColors = [0xff0088, 0x00ffcc, 0xff6600, 0xaa00ff, 0x00aaff];
      const nc = neonColors[i % neonColors.length];
      const stallLight = new THREE.PointLight(nc, 3, 8);
      stallLight.position.set(side, 2.8, z);
      this.scene.add(stallLight);
      this.glowObjects.push({ light: stallLight, pulse: true, baseIntensity: 3, speed: 0.5 + Math.random() });

      const signMesh = this.addMesh(new THREE.BoxGeometry(0.06, 0.6, 2), new THREE.MeshBasicMaterial({ color: nc }));
      signMesh.position.set(side, 3, z);
    }

    // Overhead string lights
    for (let z = -18; z <= -2; z += 3) {
      for (let x = -8; x <= 8; x += 4) {
        const bulb = this.addMesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffaa }));
        bulb.position.set(x, 4.5, z);
        const bl = new THREE.PointLight(0xffffcc, 0.5, 5);
        bl.position.copy(bulb.position);
        this.scene.add(bl);
      }
    }

    // People/crowd silhouettes (simple cylinders + spheres)
    for (let i = 0; i < 12; i++) {
      const silMat = new THREE.MeshBasicMaterial({ color: 0x0a0a12 });
      const body = this.addMesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8), silMat);
      const head = this.addMesh(new THREE.SphereGeometry(0.2, 8, 8), silMat);
      const x = (Math.random() - 0.5) * 10;
      const z = -5 + Math.random() * -18;
      body.position.set(x, 0.75, z);
      head.position.set(x, 1.7, z);
    }

    this.camera.position.set(0, 4, 14);
    this.camera.lookAt(0, 2, -4);
  }

  createHospital(data) {
    this.scene.background = new THREE.Color(0x06060a);
    this.scene.fog = new THREE.FogExp2(0x08080e, 0.04);

    // Sterile floor
    const floor = this.addMesh(
      new THREE.PlaneGeometry(25, 30),
      new THREE.MeshStandardMaterial({ color: 0x0e0e14, roughness: 0.2, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;

    // White tile floor grid
    const tileGrid = new THREE.GridHelper(24, 24, 0x111120, 0x0e0e18);
    tileGrid.position.y = 0.01;
    this.scene.add(tileGrid);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x12121e, roughness: 0.9 });
    [-12.5, 12.5].forEach(x => {
      const w = this.addMesh(new THREE.BoxGeometry(0.3, 10, 30), wallMat);
      w.position.set(x, 5, 0);
    });
    const bw = this.addMesh(new THREE.BoxGeometry(25, 10, 0.3), wallMat);
    bw.position.set(0, 5, -15);

    // Hospital beds
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x1a1a24, roughness: 0.9 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 1 });
    [[-8, -5], [8, -5], [-8, -10], [8, -10]].forEach(([x, z]) => {
      const bed = this.addMesh(new THREE.BoxGeometry(2, 0.5, 5), bedMat);
      bed.position.set(x, 0.6, z);
      const sheet = this.addMesh(new THREE.BoxGeometry(1.9, 0.2, 4.5), sheetMat);
      sheet.position.set(x, 0.95, z);
      const pillow = this.addMesh(new THREE.BoxGeometry(1.5, 0.15, 0.7), sheetMat);
      pillow.position.set(x, 1.1, z + 2);
      // IV stand
      const iv = this.addMesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), bedMat);
      iv.position.set(x + 1.5, 0.9, z - 2);
      const bag = this.addMesh(new THREE.BoxGeometry(0.3, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: 0x003333, transparent: true, opacity: 0.7 }));
      bag.position.set(x + 1.5, 1.9, z - 2);
    });

    // Medical monitors
    for (let i = 0; i < 4; i++) {
      const x = i % 2 === 0 ? -8 : 8;
      const z = -5 - Math.floor(i / 2) * 5;
      const mon = this.addMesh(new THREE.BoxGeometry(0.6, 0.5, 0.08), new THREE.MeshBasicMaterial({ color: 0x001a00 }));
      mon.position.set(x, 2, z - 3.2);
      const monGlow = new THREE.PointLight(0x00ff44, 1.5, 5);
      monGlow.position.set(x, 2, z - 3);
      this.scene.add(monGlow);
      this.glowObjects.push({ light: monGlow, pulse: true, baseIntensity: 1.5, speed: 1.2 });
    }

    // Overhead fluorescent lights
    for (let x = -8; x <= 8; x += 8) {
      for (let z = -4; z >= -12; z -= 6) {
        const strip = this.addMesh(new THREE.BoxGeometry(0.2, 0.04, 3), new THREE.MeshBasicMaterial({ color: 0xaaccff }));
        strip.position.set(x, 9.9, z);
        const fl = new THREE.SpotLight(0xaabbff, 3, 18, Math.PI / 4);
        fl.position.set(x, 9.5, z);
        fl.target.position.set(x, 0, z);
        this.scene.add(fl); this.scene.add(fl.target);
      }
    }

    // Red emergency light (dim)
    const redLight = new THREE.PointLight(0xff0000, 1, 10);
    redLight.position.set(0, 8, 0);
    this.scene.add(redLight);
    this.glowObjects.push({ light: redLight, flicker: true, baseIntensity: 0.8 });

    this.camera.position.set(0, 5, 14);
    this.camera.lookAt(0, 2, -5);
  }

  createGenericUrban(data) {
    this.scene.background = new THREE.Color(0x030308);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.045);

    const ground = this.addMesh(
      new THREE.PlaneGeometry(30, 60),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.75 })
    );
    ground.rotation.x = -Math.PI / 2;

    const buildMat = new THREE.MeshStandardMaterial({ color: 0x0c0c1c });
    for (let i = 0; i < 10; i++) {
      const h = 4 + Math.random() * 18;
      const b = this.addMesh(
        new THREE.BoxGeometry(3 + Math.random() * 5, h, 3 + Math.random() * 5),
        buildMat
      );
      b.position.set((Math.random() - 0.5) * 26, h / 2, -10 - Math.random() * 25);
      // Window lights
      if (Math.random() > 0.4) {
        const wl = new THREE.PointLight(Math.random() > 0.5 ? 0xff0044 : 0x0033ff, 0.5, 5);
        wl.position.set(b.position.x, b.position.y + Math.random() * (h * 0.4), b.position.z + 2);
        this.scene.add(wl);
      }
    }

    this.addNeonLights(data.lighting);

    this.camera.position.set(0, 4, 18);
    this.camera.lookAt(0, 2, 0);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  addMesh(geometry, material) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  addNeonLights(lightingType) {
    const colorMap = {
      'dim red':         0xff0020,
      'harsh white':     0xffffff,
      'flickering neon': 0x00ffff,
      'purple haze':     0x9900ff,
      'cold blue':       0x0066ff,
      'golden warm':     0xff9944,
      'blood red':       0xcc0000,
      'emergency orange':0xff6600,
    };
    const color = colorMap[lightingType] ?? 0x00ffff;

    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(color, 3, 14);
      light.position.set(
        (Math.random() - 0.5) * 18,
        2.5 + Math.random() * 5,
        (Math.random() - 0.5) * 22
      );
      this.scene.add(light);

      const glow = this.addMesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      glow.position.copy(light.position);
    }
  }

  addNeonSign(x, y, z, color, length) {
    const sign = this.addMesh(
      new THREE.BoxGeometry(0.08, 0.45, length),
      new THREE.MeshBasicMaterial({ color })
    );
    sign.position.set(x, y, z);
    const sl = new THREE.PointLight(color, 4, 7);
    sl.position.set(x + (x > 0 ? -0.5 : 0.5), y, z);
    this.scene.add(sl);
    this.glowObjects.push({ light: sl, flicker: Math.random() > 0.7, baseIntensity: 4 });
  }

  addStars() {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 200;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 })));
  }

  // ─── PARTICLE SYSTEMS ────────────────────────────────────────────────────

  /** Rain as line-segment streaks */
  addRain() {
    const count = 800;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 45;
      const y = Math.random() * 30;
      const z = (Math.random() - 0.5) * 65;
      const bi = i * 6;
      positions[bi]   = x;   positions[bi+1] = y;     positions[bi+2] = z;
      positions[bi+3] = x;   positions[bi+4] = y-1.2; positions[bi+5] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainSystem = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x7799bb, transparent: true, opacity: 0.45 })
    );
    this.scene.add(this.rainSystem);
  }

  /** Smoke drifting upward */
  addSmoke() {
    const count = 300;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3); // velocity per particle
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 6;
      pos[i*3+1] = Math.random() * 5;
      pos[i*3+2] = (Math.random() - 0.5) * 6;
      vel[i*3]   = (Math.random() - 0.5) * 0.02;
      vel[i*3+1] = 0.02 + Math.random() * 0.03;
      vel[i*3+2] = (Math.random() - 0.5) * 0.02;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x444444, size: 0.5, transparent: true, opacity: 0.18 }));
    pts.position.set(2, 0, 2);
    this.scene.add(pts);
    this._particleData.push({ mesh: pts, type: 'smoke', vel, maxY: 8 });
  }

  /** Sparks flying around */
  addSparks() {
    const count = 150;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 2;
      pos[i*3+1] = 1 + Math.random() * 2;
      pos[i*3+2] = (Math.random() - 0.5) * 2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.04 + Math.random() * 0.08;
      vel[i*3]   = Math.cos(angle) * speed;
      vel[i*3+1] = 0.04 + Math.random() * 0.06;
      vel[i*3+2] = Math.sin(angle) * speed;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff8800, size: 0.15, transparent: true, opacity: 0.9 }));
    pts.position.set(0, 0, -2);
    this.scene.add(pts);
    this._particleData.push({ mesh: pts, type: 'sparks', vel, origin: new THREE.Vector3(0, 1, -2) });
  }

  /** Floating embers */
  addEmbers() {
    const count = 200;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 20;
      pos[i*3+1] = Math.random() * 8;
      pos[i*3+2] = (Math.random() - 0.5) * 20;
      vel[i*3]   = (Math.random() - 0.5) * 0.015;
      vel[i*3+1] = 0.008 + Math.random() * 0.015;
      vel[i*3+2] = (Math.random() - 0.5) * 0.015;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff4400, size: 0.12, transparent: true, opacity: 0.7 }));
    this.scene.add(pts);
    this._particleData.push({ mesh: pts, type: 'embers', vel, maxY: 12 });
  }

  /** Matrix-style digital rain (green dots falling) */
  addDigitalParticles() {
    const count = 500;
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 50;
      pos[i*3+1] = Math.random() * 25;
      pos[i*3+2] = (Math.random() - 0.5) * 50;
      speeds[i]  = 0.1 + Math.random() * 0.3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x00ff44, size: 0.18, transparent: true, opacity: 0.7 }));
    this.scene.add(pts);
    this._particleData.push({ mesh: pts, type: 'digital', speeds, maxY: 25 });
  }

  /** Dripping water for sewer */
  addDrips() {
    const count = 80;
    const pos = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random() - 0.5) * 6;
      pos[i*3+1] = 1 + Math.random() * 3;
      pos[i*3+2] = -2 + Math.random() * -22;
      speeds[i]  = 0.05 + Math.random() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x224433, size: 0.08, transparent: true, opacity: 0.6 }));
    this.scene.add(pts);
    this._particleData.push({ mesh: pts, type: 'drips', speeds, maxY: 4 });
  }

  addDumpster() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a5523, roughness: 0.9 });
    const d = this.addMesh(new THREE.BoxGeometry(2, 1.5, 1), mat);
    d.position.set(-7, 0.75, -3);
    const lid = this.addMesh(new THREE.BoxGeometry(2.1, 0.1, 1.1), mat);
    lid.position.set(-7, 1.55, -3);
    lid.rotation.z = 0.3;
  }

  addBrokenSign() {
    const colors = [0xff0066, 0x00ffff, 0xff6600];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const sign = this.addMesh(new THREE.BoxGeometry(0.08, 1, 3), new THREE.MeshBasicMaterial({ color }));
    sign.position.set(9, 5, -8);
    sign.rotation.z = 0.25;
    const sl = new THREE.PointLight(color, 1.5, 6);
    sl.position.set(8.5, 5, -8);
    this.scene.add(sl);
    this.glowObjects.push({ light: sl, flicker: true, baseIntensity: 1.5 });
  }

  // ─── RENDER LOOP ─────────────────────────────────────────────────────────

  startRenderLoop() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const elapsed = this.clock.getElapsedTime();
      const dt = this.clock.getDelta ? 0.016 : 0.016;

      // ── Rain streaks ──
      if (this.rainSystem) {
        const pos = this.rainSystem.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 6) {
          pos[i+1] -= 0.45;
          pos[i+4] -= 0.45;
          if (pos[i+1] < -2) { pos[i+1] = 30; pos[i+4] = 28.8; }
        }
        this.rainSystem.geometry.attributes.position.needsUpdate = true;
      }

      // ── Particle systems ──
      this._particleData.forEach(pd => {
        const pos = pd.mesh.geometry.attributes.position.array;
        const count = pos.length / 3;

        if (pd.type === 'smoke' || pd.type === 'embers') {
          for (let i = 0; i < count; i++) {
            pos[i*3]   += pd.vel[i*3];
            pos[i*3+1] += pd.vel[i*3+1];
            pos[i*3+2] += pd.vel[i*3+2];
            if (pos[i*3+1] > pd.maxY) {
              pos[i*3]   = (Math.random() - 0.5) * (pd.type === 'embers' ? 20 : 6);
              pos[i*3+1] = 0;
              pos[i*3+2] = (Math.random() - 0.5) * (pd.type === 'embers' ? 20 : 6);
            }
          }
        } else if (pd.type === 'sparks') {
          for (let i = 0; i < count; i++) {
            pos[i*3]   += pd.vel[i*3];
            pos[i*3+1] += pd.vel[i*3+1] - 0.004; // gravity
            pos[i*3+2] += pd.vel[i*3+2];
            if (pos[i*3+1] < -1) {
              pos[i*3]   = (Math.random() - 0.5) * 2;
              pos[i*3+1] = 1 + Math.random() * 2;
              pos[i*3+2] = (Math.random() - 0.5) * 2;
              const a = Math.random() * Math.PI * 2;
              const s = 0.04 + Math.random() * 0.08;
              pd.vel[i*3]   = Math.cos(a) * s;
              pd.vel[i*3+1] = 0.04 + Math.random() * 0.06;
              pd.vel[i*3+2] = Math.sin(a) * s;
            }
          }
        } else if (pd.type === 'digital' || pd.type === 'drips') {
          for (let i = 0; i < count; i++) {
            pos[i*3+1] -= pd.speeds[i];
            if (pos[i*3+1] < 0) { pos[i*3+1] = pd.maxY; }
          }
        }

        pd.mesh.geometry.attributes.position.needsUpdate = true;
      });

      // ── Floating objects ──
      this.floatingObjects.forEach(item => {
        const { mesh, axis, speed, bobAmp = 0.2, bobOffset = 0 } = item;
        if (axis === 'y') mesh.rotation.y = elapsed * speed;
        else if (axis === 'x') mesh.rotation.x = elapsed * speed;
        else if (axis === 'scale-y') {
          mesh.scale.y = 0.3 + Math.abs(Math.sin(elapsed * speed)) * 2.5;
        }
        if (axis !== 'scale-y') {
          mesh.position.y += Math.sin(elapsed * speed + bobOffset) * bobAmp * 0.01;
        }
      });

      // ── Glow / flicker objects ──
      this.glowObjects.forEach(item => {
        if (item.flicker && item.light) {
          item.light.intensity = item.baseIntensity * (0.6 + Math.abs(Math.sin(elapsed * 17 + Math.random() * 0.5)) * 0.4);
        } else if (item.pulse && item.light) {
          item.light.intensity = item.baseIntensity * (0.75 + Math.sin(elapsed * (item.speed || 1.0)) * 0.25);
        } else if (item.baseAngle !== undefined && item.light) {
          // Club spinning lights
          item.light.target.position.x = Math.cos(elapsed * item.speed + item.baseAngle) * 9;
          item.light.target.position.z = Math.sin(elapsed * item.speed + item.baseAngle) * 9;
          if (!item.light.target.parent) this.scene.add(item.light.target);
          item.light.target.updateMatrixWorld();
        } else if (item.flicker && item.line) {
          item.line.material.opacity = item.baseIntensity * (0.5 + Math.abs(Math.sin(elapsed * 3 + Math.random())) * 0.5);
        }
      });

      // ── Camera animations ──
      if (this._camOrbit) {
        const o = this._camOrbit;
        this.camera.position.x = Math.cos(elapsed * o.speed + o.offsetAngle) * o.radius;
        this.camera.position.z = Math.sin(elapsed * o.speed + o.offsetAngle) * o.radius;
        this.camera.position.y = o.height;
        this.camera.lookAt(o.target);
      } else if (this._camPan) {
        const p = this._camPan;
        this.camera.position.x = p.baseX + Math.sin(elapsed * p.speed * 0.3) * p.range;
        this.camera.position.y = p.baseY + Math.sin(elapsed * p.speed * 0.1) * 0.3;
        this.camera.position.z = p.baseZ;
        this.camera.lookAt(p.target);
      } else if (this._camShake) {
        const s = 0.04;
        this.camera.position.x = this._camBase.x + (Math.random() - 0.5) * s;
        this.camera.position.y = this._camBase.y + (Math.random() - 0.5) * s;
        this.camera.position.z = this._camBase.z + (Math.random() - 0.5) * s;
      }

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
