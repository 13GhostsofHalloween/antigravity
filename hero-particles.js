import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class GPGPUParticleSystem {
    constructor(container) {
        this.container = container;
        this.particleCount = 10000;
        this.width = container.offsetWidth;
        this.height = container.offsetHeight;

        this.states = {
            random: { value: 1, target: 0 },
            logo: { value: 0, target: 1 }, // Start with Logo
            sphere: { value: 0, target: 0 },
            dna: { value: 0, target: 0 },
            grid: { value: 0, target: 0 },
            datagrid: { value: 0, target: 0 },
            torus: { value: 0, target: 0 },
            galaxy: { value: 0, target: 0 },
            cube: { value: 0, target: 0 }
        };

        this.mouse = new THREE.Vector2();
        this.mouseInfluence = new THREE.Vector2();

        this.init();
        this.createParticles();
        this.createTargetPositions();
        this.animate();
        this.setupEventListeners();

        // Auto morphing
        this.startAutoMorph();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);

        this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
        this.camera.position.z = 300;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
    }

    createParticles() {
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            positions[i3] = (Math.random() - 0.5) * 600;
            positions[i3 + 1] = (Math.random() - 0.5) * 600;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;

            // Green-teal color palette based on #007048
            const colorVariant = Math.random();
            let color;
            if (colorVariant < 0.4) {
                // Dark green (#007048)
                color = new THREE.Color(0x007048);
            } else if (colorVariant < 0.7) {
                // Medium green (#00a86b)
                color = new THREE.Color(0x00a86b);
            } else if (colorVariant < 0.9) {
                // Teal (#20b2aa)
                color = new THREE.Color(0x20b2aa);
            } else {
                // Light cyan (#40e0d0)
                color = new THREE.Color(0x40e0d0);
            }
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 0.5;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uLogo: { value: 0 },
                uSphere: { value: 0 },
                uDna: { value: 0 },
                uGrid: { value: 0 },
                uDatagrid: { value: 0 },
                uTorus: { value: 0 },
                uGalaxy: { value: 0 },
                uCube: { value: 0 },
                mouseInfluence: { value: new THREE.Vector2() },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: this.vertexShader(),
            fragmentShader: this.fragmentShader(),
            transparent: true,
            blending: THREE.NormalBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);
    }

    createTargetPositions() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;

        ctx.fillStyle = '#007048';
        ctx.font = 'bold 120px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BeccoCRO', canvas.width / 2, canvas.height / 2);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const textPositions = [];
        const step = 4;

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                if (pixels[(y * canvas.width + x) * 4 + 3] > 128) {
                    textPositions.push({
                        x: (x - canvas.width / 2) * 0.5,
                        y: -(y - canvas.height / 2) * 0.5,
                        z: 0
                    });
                }
            }
        }

        const logoPos = new Float32Array(this.particleCount * 3);
        const spherePos = new Float32Array(this.particleCount * 3);
        const dnaPos = new Float32Array(this.particleCount * 3);
        const gridPos = new Float32Array(this.particleCount * 3);
        const datagridPos = new Float32Array(this.particleCount * 3);
        const torusPos = new Float32Array(this.particleCount * 3);
        const galaxyPos = new Float32Array(this.particleCount * 3);
        const cubePos = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            // Logo
            if (i < textPositions.length) {
                const p = textPositions[i];
                logoPos[i3] = p.x;
                logoPos[i3 + 1] = p.y;
                logoPos[i3 + 2] = p.z + (Math.random() - 0.5) * 20;
            } else {
                const p = textPositions[Math.floor(Math.random() * textPositions.length)];
                logoPos[i3] = p.x + (Math.random() - 0.5) * 100;
                logoPos[i3 + 1] = p.y + (Math.random() - 0.5) * 100;
                logoPos[i3 + 2] = (Math.random() - 0.5) * 50;
            }

            // Sphere
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 150 + Math.random() * 10;
            spherePos[i3] = r * Math.sin(phi) * Math.cos(theta);
            spherePos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            spherePos[i3 + 2] = r * Math.cos(phi);

            // DNA Helix
            const t = (i / this.particleCount) * Math.PI * 20;
            const helixR = 60;
            const helixH = 400;
            const y = ((i / this.particleCount) - 0.5) * helixH;
            const strand = i % 2 === 0 ? 0 : Math.PI;
            dnaPos[i3] = helixR * Math.cos(t + strand);
            dnaPos[i3 + 1] = y;
            dnaPos[i3 + 2] = helixR * Math.sin(t + strand);

            // Wave Grid
            const gridSize = 200;
            const gx = (i % gridSize) - gridSize / 2;
            const gz = Math.floor(i / gridSize) - gridSize / 2;
            gridPos[i3] = gx * 3;
            gridPos[i3 + 1] = 0;
            gridPos[i3 + 2] = gz * 3;

            // DataGrid
            const dataGridSize = 100;
            const dataCol = (i % dataGridSize);
            const dataRow = Math.floor(i / dataGridSize);
            const dataSpacing = 6;
            datagridPos[i3] = (dataCol - dataGridSize / 2) * dataSpacing;
            datagridPos[i3 + 1] = (dataRow - dataGridSize / 2) * dataSpacing;
            datagridPos[i3 + 2] = Math.sin(dataCol * 0.2) * 20 + Math.cos(dataRow * 0.2) * 20;

            // Torus
            const torusAngle = (i / this.particleCount) * Math.PI * 2;
            const torusR1 = 120;
            const torusR2 = 40 + Math.random() * 10;
            const torusTheta = Math.random() * Math.PI * 2;
            torusPos[i3] = (torusR1 + torusR2 * Math.cos(torusTheta)) * Math.cos(torusAngle);
            torusPos[i3 + 1] = torusR2 * Math.sin(torusTheta);
            torusPos[i3 + 2] = (torusR1 + torusR2 * Math.cos(torusTheta)) * Math.sin(torusAngle);

            // Spiral Galaxy
            const galaxyArm = i % 3;
            const galaxyRadius = Math.pow(Math.random(), 0.5) * 200;
            const galaxyAngle = (i / this.particleCount) * Math.PI * 8 + galaxyArm * (Math.PI * 2 / 3);
            const galaxySpiral = galaxyRadius * 0.02;
            galaxyPos[i3] = galaxyRadius * Math.cos(galaxyAngle + galaxySpiral);
            galaxyPos[i3 + 1] = (Math.random() - 0.5) * 20 * Math.exp(-galaxyRadius / 100);
            galaxyPos[i3 + 2] = galaxyRadius * Math.sin(galaxyAngle + galaxySpiral);

            // Cube
            const cubeFace = Math.floor(Math.random() * 6);
            const cubeSize = 200;
            const cubeU = (Math.random() - 0.5) * cubeSize;
            const cubeV = (Math.random() - 0.5) * cubeSize;

            switch (cubeFace) {
                case 0: cubePos[i3] = cubeU; cubePos[i3 + 1] = cubeV; cubePos[i3 + 2] = cubeSize / 2; break;
                case 1: cubePos[i3] = cubeU; cubePos[i3 + 1] = cubeV; cubePos[i3 + 2] = -cubeSize / 2; break;
                case 2: cubePos[i3] = cubeU; cubePos[i3 + 1] = cubeSize / 2; cubePos[i3 + 2] = cubeV; break;
                case 3: cubePos[i3] = cubeU; cubePos[i3 + 1] = -cubeSize / 2; cubePos[i3 + 2] = cubeV; break;
                case 4: cubePos[i3] = cubeSize / 2; cubePos[i3 + 1] = cubeU; cubePos[i3 + 2] = cubeV; break;
                case 5: cubePos[i3] = -cubeSize / 2; cubePos[i3 + 1] = cubeU; cubePos[i3 + 2] = cubeV; break;
            }
        }

        this.geometry.setAttribute('targetLogo', new THREE.BufferAttribute(logoPos, 3));
        this.geometry.setAttribute('targetSphere', new THREE.BufferAttribute(spherePos, 3));
        this.geometry.setAttribute('targetDna', new THREE.BufferAttribute(dnaPos, 3));
        this.geometry.setAttribute('targetGrid', new THREE.BufferAttribute(gridPos, 3));
        this.geometry.setAttribute('targetDatagrid', new THREE.BufferAttribute(datagridPos, 3));
        this.geometry.setAttribute('targetTorus', new THREE.BufferAttribute(torusPos, 3));
        this.geometry.setAttribute('targetGalaxy', new THREE.BufferAttribute(galaxyPos, 3));
        this.geometry.setAttribute('targetCube', new THREE.BufferAttribute(cubePos, 3));
    }

    vertexShader() {
        return `
            uniform float time;
            uniform float uLogo;
            uniform float uSphere;
            uniform float uDna;
            uniform float uGrid;
            uniform float uDatagrid;
            uniform float uTorus;
            uniform float uGalaxy;
            uniform float uCube;
            uniform vec2 mouseInfluence;
            uniform float pixelRatio;
            
            attribute vec3 targetLogo;
            attribute vec3 targetSphere;
            attribute vec3 targetDna;
            attribute vec3 targetGrid;
            attribute vec3 targetDatagrid;
            attribute vec3 targetTorus;
            attribute vec3 targetGalaxy;
            attribute vec3 targetCube;
            attribute vec3 color;
            attribute float size;
            
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec3 pos = position;
                vec3 finalPos = pos;
                
                if (uLogo > 0.0) finalPos = mix(finalPos, targetLogo, uLogo);
                if (uSphere > 0.0) finalPos = mix(finalPos, targetSphere, uSphere);
                if (uDna > 0.0) finalPos = mix(finalPos, targetDna, uDna);
                if (uTorus > 0.0) finalPos = mix(finalPos, targetTorus, uTorus);
                if (uCube > 0.0) finalPos = mix(finalPos, targetCube, uCube);
                
                if (uGrid > 0.0) {
                    vec3 gridP = targetGrid;
                    float dist = length(gridP.xz);
                    gridP.y = sin(dist * 0.05 - time * 2.0) * 20.0;
                    finalPos = mix(finalPos, gridP, uGrid);
                }
                
                if (uDatagrid > 0.0) {
                    vec3 datagridP = targetDatagrid;
                    float wave = sin(datagridP.x * 0.1 + time) * cos(datagridP.y * 0.1 + time * 0.7);
                    datagridP.z += wave * 15.0;
                    finalPos = mix(finalPos, datagridP, uDatagrid);
                }
                
                if (uGalaxy > 0.0) {
                    vec3 galaxyP = targetGalaxy;
                    float angle = time * 0.3;
                    float c = cos(angle);
                    float s = sin(angle);
                    mat3 rot = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
                    galaxyP = rot * galaxyP;
                    finalPos = mix(finalPos, galaxyP, uGalaxy);
                }
                
                vec2 mouseOffset = mouseInfluence * 50.0;
                float shapeFactor = max(max(max(uLogo, uSphere), max(uDna, uGrid)), max(max(uTorus, uGalaxy), max(uCube, uDatagrid)));
                float influence = 1.0 - shapeFactor * 0.8;
                
                finalPos.x += mouseOffset.x * influence;
                finalPos.y += mouseOffset.y * influence;
                
                if (uSphere > 0.5 || uDna > 0.5 || uTorus > 0.5 || uCube > 0.5) {
                    float angle = time * 0.2;
                    float c = cos(angle);
                    float s = sin(angle);
                    mat3 rot = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
                    finalPos = rot * finalPos;
                }
                
                vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                float distanceFactor = 300.0 / -mvPosition.z;
                gl_PointSize = size * distanceFactor * pixelRatio;
                
                vColor = color;
                vAlpha = 1.0 - smoothstep(200.0, 1000.0, -mvPosition.z);
                vAlpha *= (0.4 + shapeFactor * 0.6);
            }
        `;
    }

    fragmentShader() {
        return `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                alpha *= vAlpha;
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
    }

    setupEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / this.width) * 2 - 1;
            this.mouse.y = -(e.clientY / this.height) * 2 + 1;
        });

        window.addEventListener('resize', () => {
            this.width = this.container.offsetWidth;
            this.height = this.container.offsetHeight;
            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        });
    }

    setTargetState(stateName) {
        Object.keys(this.states).forEach(key => {
            this.states[key].target = (key === stateName) ? 1 : 0;
        });
    }

    startAutoMorph() {
        const shapes = ['logo', 'dna', 'sphere', 'galaxy'];
        let currentIndex = 0;

        setInterval(() => {
            currentIndex = (currentIndex + 1) % shapes.length;
            this.setTargetState(shapes[currentIndex]);
        }, 5000); // Change shape every 5 seconds
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        Object.keys(this.states).forEach(key => {
            const s = this.states[key];
            s.value += (s.target - s.value) * 2.0 * dt;
        });

        this.mouseInfluence.x += (this.mouse.x - this.mouseInfluence.x) * 0.1;
        this.mouseInfluence.y += (this.mouse.y - this.mouseInfluence.y) * 0.1;

        this.material.uniforms.time.value = time;
        this.material.uniforms.uLogo.value = this.states.logo.value;
        this.material.uniforms.uSphere.value = this.states.sphere.value;
        this.material.uniforms.uDna.value = this.states.dna.value;
        this.material.uniforms.uGrid.value = this.states.grid.value;
        this.material.uniforms.uDatagrid.value = this.states.datagrid.value;
        this.material.uniforms.uTorus.value = this.states.torus.value;
        this.material.uniforms.uGalaxy.value = this.states.galaxy.value;
        this.material.uniforms.uCube.value = this.states.cube.value;
        this.material.uniforms.mouseInfluence.value = this.mouseInfluence;

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('particle-container');
    if (container) {
        new GPGPUParticleSystem(container);
    } else {
        console.error('Particle container not found');
    }
});
