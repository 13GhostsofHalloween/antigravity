import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class GPGPUParticleSystem {
    constructor(container) {
        this.container = container;
        this.particleCount = 50000;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // 상태
        this.currentState = 'random'; // 'random', 'logo', 'sphere'
        this.morphProgress = 0;
        this.targetMorphProgress = 0;

        // 마우스
        this.mouse = new THREE.Vector2();
        this.mouseInfluence = new THREE.Vector2();

        this.init();
        this.createParticles();
        this.createTargetPositions();
        this.animate();

        this.setupEventListeners();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.width / this.height,
            0.1,
            1000
        );
        this.camera.position.z = 300;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        // Clock
        this.clock = new THREE.Clock();
    }

    createParticles() {
        const positions = new Float32Array(this.particleCount * 3);
        const velocities = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);

        // 초기 위치 및 속성 설정
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            // 랜덤 초기 위치
            positions[i3] = (Math.random() - 0.5) * 600;
            positions[i3 + 1] = (Math.random() - 0.5) * 600;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;

            // 초기 속도
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

            // 색상 (그라디언트)
            const hue = Math.random();
            const color = new THREE.Color().setHSL(
                0.6 + hue * 0.2, // 파란색-보라색 범위
                0.8,
                0.6
            );
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            // 크기
            sizes[i] = Math.random() * 2 + 0.5;
        }

        // Geometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Shader Material
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                morphProgress: { value: 0 },
                mouseInfluence: { value: new THREE.Vector2() },
                pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
            },
            vertexShader: this.vertexShader(),
            fragmentShader: this.fragmentShader(),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Points
        this.particles = new THREE.Points(this.geometry, this.material);
        this.scene.add(this.particles);
    }

    createTargetPositions() {
        // 로고 텍스트를 캔버스에 렌더링하여 좌표 추출
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1024;
        canvas.height = 256;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 120px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BeccoCRO', canvas.width / 2, canvas.height / 2);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // 텍스트 픽셀 좌표 수집
        const textPositions = [];
        const step = 4; // 샘플링 간격

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const index = (y * canvas.width + x) * 4;
                const alpha = pixels[index + 3];

                if (alpha > 128) {
                    textPositions.push({
                        x: (x - canvas.width / 2) * 0.5,
                        y: -(y - canvas.height / 2) * 0.5,
                        z: 0
                    });
                }
            }
        }

        // 파티클에 타겟 위치 할당
        const targetPositions = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;

            if (i < textPositions.length) {
                // 텍스트 위치
                const pos = textPositions[i];
                targetPositions[i3] = pos.x;
                targetPositions[i3 + 1] = pos.y;
                targetPositions[i3 + 2] = pos.z + (Math.random() - 0.5) * 20;
            } else {
                // 여분의 파티클은 주변에 배치
                const randomPos = textPositions[Math.floor(Math.random() * textPositions.length)];
                targetPositions[i3] = randomPos.x + (Math.random() - 0.5) * 100;
                targetPositions[i3 + 1] = randomPos.y + (Math.random() - 0.5) * 100;
                targetPositions[i3 + 2] = (Math.random() - 0.5) * 50;
            }
        }

        this.geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
    }

    vertexShader() {
        return `
            uniform float time;
            uniform float morphProgress;
            uniform vec2 mouseInfluence;
            uniform float pixelRatio;
            
            attribute vec3 velocity;
            attribute vec3 targetPosition;
            attribute vec3 color;
            attribute float size;
            
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                vec3 pos = position;
                
                // Morph to target position
                pos = mix(pos, targetPosition, morphProgress);
                
                // Add wave motion
                float wave = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 10.0;
                pos.z += wave * (1.0 - morphProgress);
                
                // Mouse influence
                vec2 mouseOffset = mouseInfluence * 50.0;
                pos.x += mouseOffset.x * (1.0 - morphProgress * 0.5);
                pos.y += mouseOffset.y * (1.0 - morphProgress * 0.5);
                
                // Rotation
                float angle = time * 0.1;
                float cosA = cos(angle);
                float sinA = sin(angle);
                mat3 rotationY = mat3(
                    cosA, 0.0, sinA,
                    0.0, 1.0, 0.0,
                    -sinA, 0.0, cosA
                );
                pos = rotationY * pos * (1.0 - morphProgress * 0.8);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // Size based on distance
                float distanceFactor = 300.0 / -mvPosition.z;
                gl_PointSize = size * distanceFactor * pixelRatio;
                
                // Color and alpha
                vColor = color;
                vAlpha = 1.0 - (length(mvPosition.xyz) / 1000.0);
                vAlpha *= (0.5 + morphProgress * 0.5);
            }
        `;
    }

    fragmentShader() {
        return `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                // Circular particle shape
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                
                if (dist > 0.5) discard;
                
                // Soft edge
                float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                alpha *= vAlpha;
                
                // Glow effect
                vec3 glow = vColor * (1.0 + (1.0 - dist) * 0.5);
                
                gl_FragColor = vec4(glow, alpha);
            }
        `;
    }

    setupEventListeners() {
        // Mouse move
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / this.width) * 2 - 1;
            this.mouse.y = -(e.clientY / this.height) * 2 + 1;
        });

        // Resize
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.width, this.height);
        });

        // Scroll - morph on scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

            // 스크롤에 따라 morphing
            if (scrollPercent < 0.2) {
                this.targetMorphProgress = 0; // Random state
            } else if (scrollPercent < 0.8) {
                this.targetMorphProgress = 1; // Logo state
            } else {
                this.targetMorphProgress = 0.5; // Intermediate state
            }
        });
    }

    morphToLogo() {
        this.targetMorphProgress = 1;
    }

    morphToRandom() {
        this.targetMorphProgress = 0;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsedTime = this.clock.getElapsedTime();

        // Smooth morph transition
        this.morphProgress += (this.targetMorphProgress - this.morphProgress) * 0.05;

        // Mouse influence with easing
        this.mouseInfluence.x += (this.mouse.x - this.mouseInfluence.x) * 0.1;
        this.mouseInfluence.y += (this.mouse.y - this.mouseInfluence.y) * 0.1;

        // Update uniforms
        this.material.uniforms.time.value = elapsedTime;
        this.material.uniforms.morphProgress.value = this.morphProgress;
        this.material.uniforms.mouseInfluence.value = this.mouseInfluence;

        // Camera movement
        this.camera.position.x = Math.sin(elapsedTime * 0.1) * 50;
        this.camera.position.y = Math.cos(elapsedTime * 0.15) * 30;
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
    }
}

// Export
export default GPGPUParticleSystem;
