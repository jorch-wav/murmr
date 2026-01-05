// =====================================================
// MURMR - GPU Boids Murmuration (from reference)
// Exact replica with shader-based wing flapping
// =====================================================

// GPUComputationRenderer - From Three.js examples
class GPUComputationRenderer {
    constructor(sizeX, sizeY, renderer) {
        this.variables = [];
        this.currentTextureIndex = 0;
        
        let dataType = THREE.FloatType;
        
        const scene = new THREE.Scene();
        const camera = new THREE.Camera();
        camera.position.z = 1;
        
        const passThruUniforms = { passThruTexture: { value: null } };
        
        const passThruShader = createShaderMaterial(getPassThroughFragmentShader(), passThruUniforms);
        
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passThruShader);
        scene.add(mesh);
        
        this.setDataType = function(type) {
            dataType = type;
            return this;
        };
        
        this.addVariable = function(variableName, computeFragmentShader, initialValueTexture) {
            const material = this.createShaderMaterial(computeFragmentShader);
            const variable = {
                name: variableName,
                initialValueTexture: initialValueTexture,
                material: material,
                dependencies: null,
                renderTargets: [],
                wrapS: null,
                wrapT: null,
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter
            };
            this.variables.push(variable);
            return variable;
        };
        
        this.setVariableDependencies = function(variable, dependencies) {
            variable.dependencies = dependencies;
        };
        
        this.init = function() {
            if (renderer.capabilities.isWebGL2 === false && renderer.extensions.has('OES_texture_float') === false) {
                return 'No OES_texture_float support for float textures.';
            }
            
            for (let i = 0; i < this.variables.length; i++) {
                const variable = this.variables[i];
                variable.renderTargets[0] = this.createRenderTarget(sizeX, sizeY, variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter);
                variable.renderTargets[1] = this.createRenderTarget(sizeX, sizeY, variable.wrapS, variable.wrapT, variable.minFilter, variable.magFilter);
                this.renderTexture(variable.initialValueTexture, variable.renderTargets[0]);
                this.renderTexture(variable.initialValueTexture, variable.renderTargets[1]);
                
                const material = variable.material;
                const uniforms = material.uniforms;
                
                if (variable.dependencies !== null) {
                    for (let d = 0; d < variable.dependencies.length; d++) {
                        const depVar = variable.dependencies[d];
                        if (depVar.name !== variable.name) {
                            let found = false;
                            for (let j = 0; j < this.variables.length; j++) {
                                if (depVar.name === this.variables[j].name) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                return 'Variable dependency not found. Variable=' + variable.name + ', dependency=' + depVar.name;
                            }
                        }
                        uniforms[depVar.name] = { value: null };
                    }
                }
            }
            
            this.currentTextureIndex = 0;
            return null;
        };
        
        this.compute = function() {
            const currentTextureIndex = this.currentTextureIndex;
            const nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;
            
            for (let i = 0, il = this.variables.length; i < il; i++) {
                const variable = this.variables[i];
                
                if (variable.dependencies !== null) {
                    const uniforms = variable.material.uniforms;
                    for (let d = 0, dl = variable.dependencies.length; d < dl; d++) {
                        const depVar = variable.dependencies[d];
                        uniforms[depVar.name].value = depVar.renderTargets[currentTextureIndex].texture;
                    }
                }
                
                this.doRenderTarget(variable.material, variable.renderTargets[nextTextureIndex]);
            }
            
            this.currentTextureIndex = nextTextureIndex;
        };
        
        this.getCurrentRenderTarget = function(variable) {
            return variable.renderTargets[this.currentTextureIndex];
        };
        
        this.getAlternateRenderTarget = function(variable) {
            return variable.renderTargets[this.currentTextureIndex === 0 ? 1 : 0];
        };
        
        function addResolutionDefine(materialShader) {
            materialShader.defines.resolution = 'vec2( ' + sizeX.toFixed(1) + ', ' + sizeY.toFixed(1) + ' )';
        }
        
        this.addResolutionDefine = addResolutionDefine;
        
        function createShaderMaterial(computeFragmentShader, uniforms) {
            uniforms = uniforms || {};
            const material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: getPassThroughVertexShader(),
                fragmentShader: computeFragmentShader
            });
            addResolutionDefine(material);
            return material;
        }
        
        this.createShaderMaterial = createShaderMaterial;
        
        this.createRenderTarget = function(sizeXTexture, sizeYTexture, wrapS, wrapT, minFilter, magFilter) {
            sizeXTexture = sizeXTexture || sizeX;
            sizeYTexture = sizeYTexture || sizeY;
            wrapS = wrapS || THREE.ClampToEdgeWrapping;
            wrapT = wrapT || THREE.ClampToEdgeWrapping;
            minFilter = minFilter || THREE.NearestFilter;
            magFilter = magFilter || THREE.NearestFilter;
            
            const renderTarget = new THREE.WebGLRenderTarget(sizeXTexture, sizeYTexture, {
                wrapS: wrapS,
                wrapT: wrapT,
                minFilter: minFilter,
                magFilter: magFilter,
                format: THREE.RGBAFormat,
                type: dataType,
                depthBuffer: false
            });
            
            return renderTarget;
        };
        
        this.createTexture = function() {
            const data = new Float32Array(sizeX * sizeY * 4);
            const texture = new THREE.DataTexture(data, sizeX, sizeY, THREE.RGBAFormat, THREE.FloatType);
            texture.needsUpdate = true;
            return texture;
        };
        
        this.renderTexture = function(input, output) {
            passThruUniforms.passThruTexture.value = input;
            this.doRenderTarget(passThruShader, output);
            passThruUniforms.passThruTexture.value = null;
        };
        
        this.doRenderTarget = function(material, output) {
            const currentRenderTarget = renderer.getRenderTarget();
            mesh.material = material;
            renderer.setRenderTarget(output);
            renderer.render(scene, camera);
            mesh.material = passThruShader;
            renderer.setRenderTarget(currentRenderTarget);
        };
        
        function getPassThroughVertexShader() {
            return 'void main() { gl_Position = vec4( position, 1.0 ); }';
        }
        
        function getPassThroughFragmentShader() {
            return 'uniform sampler2D passThruTexture; void main() { vec2 uv = gl_FragCoord.xy / resolution.xy; gl_FragColor = texture2D( passThruTexture, uv ); }';
        }
    }
}

// =====================================================
// Bird Geometry - 3 triangles per bird with flapping wings
// =====================================================
class BirdGeometry extends THREE.BufferGeometry {
    constructor(birdCount, width, cohortColors = null) {
        super();

        const trianglesPerBird = 3;
        const triangles = birdCount * trianglesPerBird;
        const points = triangles * 3;

        const vertices = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
        const birdColors = new THREE.BufferAttribute(new Float32Array(points * 3), 3);
        const references = new THREE.BufferAttribute(new Float32Array(points * 2), 2);
        const birdVertex = new THREE.BufferAttribute(new Float32Array(points), 1);

        this.setAttribute('position', vertices);
        this.setAttribute('birdColor', birdColors);
        this.setAttribute('reference', references);
        this.setAttribute('birdVertex', birdVertex);

        let v = 0;
        function verts_push() {
            for (let i = 0; i < arguments.length; i++) {
                vertices.array[v++] = arguments[i];
            }
        }

        const wingsSpan = 20;

        for (let f = 0; f < birdCount; f++) {
            // Body
            verts_push(0, -0, -20, 0, 4, -20, 0, 0, 30);
            // Left wing
            verts_push(0, 0, -15, -wingsSpan, 0, 0, 0, 0, 15);
            // Right wing
            verts_push(0, 0, 15, wingsSpan, 0, 0, 0, 0, -15);
        }

        for (let vi = 0; vi < triangles * 3; vi++) {
            const triangleIndex = ~~(vi / 3);
            const birdIndex = ~~(triangleIndex / trianglesPerBird);
            const x = (birdIndex % width) / width;
            const y = ~~(birdIndex / width) / width;

            // Use cohort color if provided, otherwise black
            let c;
            if (cohortColors && cohortColors.length > 0) {
                const cohortIndex = birdIndex % cohortColors.length;
                c = cohortColors[cohortIndex];
            } else {
                c = new THREE.Color(0x000000);
            }

            birdColors.array[vi * 3 + 0] = c.r;
            birdColors.array[vi * 3 + 1] = c.g;
            birdColors.array[vi * 3 + 2] = c.b;

            references.array[vi * 2] = x;
            references.array[vi * 2 + 1] = y;

            birdVertex.array[vi] = vi % 9;
        }

        this.scale(0.2, 0.2, 0.2);
    }
}

// =====================================================
// Main Murmuration Class
// =====================================================
class Murmuration {
    constructor(canvasId) {
        this.canvasContainer = document.getElementById(canvasId).parentElement;
        
        // Bird count - starts with 1, width is sqrt of count
        this.WIDTH = 1;
        this.BIRDS = 1;
        this.BOUNDS = 800;
        this.BOUNDS_HALF = 400;
        
        // State
        this.targetBirdCount = 1;
        this.last = performance.now();
        this.colorMode = localStorage.getItem('murmr_color_mode') === 'true';
        
        // Color palette for cohorts (12 rainbow colors)
        this.cohortColors = [
            new THREE.Color(0xff6b6b), // coral red
            new THREE.Color(0xffa94d), // orange
            new THREE.Color(0xffd43b), // yellow
            new THREE.Color(0x69db7c), // green
            new THREE.Color(0x38d9a9), // teal
            new THREE.Color(0x4dabf7), // sky blue
            new THREE.Color(0x748ffc), // indigo
            new THREE.Color(0x9775fa), // purple
            new THREE.Color(0xda77f2), // violet
            new THREE.Color(0xf783ac), // pink
            new THREE.Color(0xff8787), // light red
            new THREE.Color(0x63e6be), // mint
        ];
        
        // Touch/Mouse
        this.mouseX = 10000;
        this.mouseY = 10000;
        this.lastPinchDistance = 0;
        
        // GPU Compute
        this.gpuCompute = null;
        this.velocityVariable = null;
        this.positionVariable = null;
        this.positionUniforms = null;
        this.velocityUniforms = null;
        this.birdUniforms = null;
        this.birdMesh = null;
        
        // Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Initialize
        this.init();
        this.initComputeRenderer();
        this.initBirds();
        this.bindEvents();
        this.animate();
    }
    
    init() {
        // Check dark mode preference
        const isDarkMode = localStorage.getItem('murmr_dark_mode') === 'true';
        const bgColor = isDarkMode ? 0x000000 : 0x87CEEB;
        
        // Scene with background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.Fog(bgColor, 100, 1000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1,
            3000
        );
        this.camera.position.z = 350;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Replace canvas
        const oldCanvas = document.getElementById('murmuration-canvas');
        oldCanvas.style.display = 'none';
        this.renderer.domElement.id = 'murmuration-webgl';
        this.renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;';
        this.canvasContainer.insertBefore(this.renderer.domElement, oldCanvas);
    }
    
    initComputeRenderer() {
        this.gpuCompute = new GPUComputationRenderer(this.WIDTH, this.WIDTH, this.renderer);

        const dtPosition = this.gpuCompute.createTexture();
        const dtVelocity = this.gpuCompute.createTexture();
        this.fillPositionTexture(dtPosition);
        this.fillVelocityTexture(dtVelocity);

        this.velocityVariable = this.gpuCompute.addVariable('textureVelocity', document.getElementById('fragmentShaderVelocity').textContent, dtVelocity);
        this.positionVariable = this.gpuCompute.addVariable('texturePosition', document.getElementById('fragmentShaderPosition').textContent, dtPosition);

        this.gpuCompute.setVariableDependencies(this.velocityVariable, [this.positionVariable, this.velocityVariable]);
        this.gpuCompute.setVariableDependencies(this.positionVariable, [this.positionVariable, this.velocityVariable]);

        this.positionUniforms = this.positionVariable.material.uniforms;
        this.velocityUniforms = this.velocityVariable.material.uniforms;

        this.positionUniforms['time'] = { value: 0.0 };
        this.positionUniforms['delta'] = { value: 0.0 };
        this.positionUniforms['deathMode'] = { value: 0.0 };
        this.velocityUniforms['time'] = { value: 1.0 };
        this.velocityUniforms['delta'] = { value: 0.0 };
        this.velocityUniforms['separationDistance'] = { value: 20.0 };
        this.velocityUniforms['alignmentDistance'] = { value: 20.0 };
        this.velocityUniforms['cohesionDistance'] = { value: 20.0 };
        this.velocityUniforms['predator'] = { value: new THREE.Vector3() };
        this.velocityUniforms['deathMode'] = { value: 0.0 };
        this.velocityUniforms['attractMode'] = { value: 0.0 };
        this.velocityVariable.material.defines.BOUNDS = this.BOUNDS.toFixed(2);

        this.velocityVariable.wrapS = THREE.RepeatWrapping;
        this.velocityVariable.wrapT = THREE.RepeatWrapping;
        this.positionVariable.wrapS = THREE.RepeatWrapping;
        this.positionVariable.wrapT = THREE.RepeatWrapping;

        const error = this.gpuCompute.init();
        if (error !== null) {
            console.error(error);
        }
    }
    
    initBirds() {
        // Generate cohort colors for each bird based on streak time
        const cohortColorsForBirds = this.generateCohortColorsForBirds(this.BIRDS);
        const geometry = new BirdGeometry(this.BIRDS, this.WIDTH, cohortColorsForBirds);
        
        // Check if dark mode is active
        const isDark = document.body.classList.contains('dark-mode');
        const birdColorValue = isDark ? new THREE.Vector3(0.9, 0.9, 0.9) : new THREE.Vector3(0.0, 0.0, 0.0);

        this.birdUniforms = {
            'color': { value: new THREE.Color(0x000000) },
            'birdColor': { value: birdColorValue },
            'colorMode': { value: this.colorMode ? 1.0 : 0.0 },
            'texturePosition': { value: null },
            'textureVelocity': { value: null },
            'time': { value: 1.0 },
            'delta': { value: 0.0 }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.birdUniforms,
            vertexShader: document.getElementById('birdVS').textContent,
            fragmentShader: document.getElementById('birdFS').textContent,
            side: THREE.DoubleSide
        });

        this.birdMesh = new THREE.Mesh(geometry, material);
        this.birdMesh.rotation.y = Math.PI / 2;
        this.birdMesh.matrixAutoUpdate = false;
        this.birdMesh.updateMatrix();

        this.scene.add(this.birdMesh);
    }
    
    // Generate cohort colors for each bird
    // Under 24h: hourly cohorts (10 birds/hour)
    // Over 24h: daily cohorts (240 birds/day)
    generateCohortColorsForBirds(birdCount) {
        const colors = [];
        const streakMs = this.getStreakDuration();
        const streakHours = streakMs / (1000 * 60 * 60);
        const isOverDay = streakHours >= 24;
        
        // Birds per cohort: 10 per hour, or 240 per day (10 * 24)
        const birdsPerCohort = isOverDay ? 240 : 10;
        
        for (let i = 0; i < birdCount; i++) {
            // Assign color based on which cohort this bird belongs to
            const cohortIndex = Math.floor(i / birdsPerCohort) % this.cohortColors.length;
            colors.push(this.cohortColors[cohortIndex]);
        }
        
        return colors;
    }
    
    // Get streak duration from storage
    getStreakDuration() {
        const streakStart = localStorage.getItem('murmr_streak_start');
        if (!streakStart) return 0;
        return Date.now() - parseInt(streakStart, 10);
    }
    
    fillPositionTexture(texture) {
        const theArray = texture.image.data;
        for (let k = 0, kl = theArray.length; k < kl; k += 4) {
            const x = Math.random() * this.BOUNDS - this.BOUNDS_HALF;
            const y = Math.random() * this.BOUNDS - this.BOUNDS_HALF;
            const z = Math.random() * this.BOUNDS - this.BOUNDS_HALF;

            theArray[k + 0] = x;
            theArray[k + 1] = y;
            theArray[k + 2] = z;
            theArray[k + 3] = 1;
        }
        texture.needsUpdate = true;
    }
    
    fillVelocityTexture(texture) {
        const theArray = texture.image.data;
        for (let k = 0, kl = theArray.length; k < kl; k += 4) {
            const x = Math.random() - 0.5;
            const y = Math.random() - 0.5;
            const z = Math.random() - 0.5;

            theArray[k + 0] = x * 10;
            theArray[k + 1] = y * 10;
            theArray[k + 2] = z * 10;
            theArray[k + 3] = 1;
        }
        texture.needsUpdate = true;
    }
    
    // =====================================================
    // ANIMATION
    // =====================================================
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();
    }
    
    render() {
        const now = performance.now();
        let delta = (now - this.last) / 1000;
        if (delta > 1) delta = 1;
        this.last = now;

        // Check if we need to change bird count
        const targetWidth = Math.ceil(Math.sqrt(this.targetBirdCount));
        if (targetWidth !== this.WIDTH) {
            this.changeBirdCount(targetWidth);
        }

        this.positionUniforms['time'].value = now;
        this.positionUniforms['delta'].value = delta;
        this.velocityUniforms['time'].value = now;
        this.velocityUniforms['delta'].value = delta;
        this.birdUniforms['time'].value = now;
        this.birdUniforms['delta'].value = delta;

        this.velocityUniforms['predator'].value.set(
            0.5 * this.mouseX / (window.innerWidth / 2),
            -0.5 * this.mouseY / (window.innerHeight / 2),
            0
        );

        this.mouseX = 10000;
        this.mouseY = 10000;

        this.gpuCompute.compute();

        this.birdUniforms['texturePosition'].value = this.gpuCompute.getCurrentRenderTarget(this.positionVariable).texture;
        this.birdUniforms['textureVelocity'].value = this.gpuCompute.getCurrentRenderTarget(this.velocityVariable).texture;

        this.renderer.render(this.scene, this.camera);
    }
    
    changeBirdCount(newWidth) {
        newWidth = Math.max(1, Math.min(85, newWidth));
        if (newWidth === this.WIDTH) return;
        
        this.WIDTH = newWidth;
        this.BIRDS = this.WIDTH * this.WIDTH;
        
        // Remove old mesh
        this.scene.remove(this.birdMesh);
        this.birdMesh.geometry.dispose();
        this.birdMesh.material.dispose();
        
        // Reinitialize
        this.initComputeRenderer();
        this.initBirds();
    }
    
    // =====================================================
    // PUBLIC API
    // =====================================================
    
    setBoidCount(count) {
        this.targetBirdCount = Math.max(1, Math.min(7200, count));
    }
    
    getBoidCount() {
        return this.BIRDS;
    }
    
    scatter(screenX, screenY) {
        this.mouseX = screenX - window.innerWidth / 2;
        this.mouseY = screenY - window.innerHeight / 2;
    }
    
    reset() {
        this.targetBirdCount = 1;
    }
    
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    setDarkMode(isDark) {
        if (!this.renderer || !this.scene) return;
        
        const bgColor = isDark ? 0x000000 : 0x87CEEB;
        
        // Update scene background and fog
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog.color = new THREE.Color(bgColor);
        
        // Update renderer clear color
        this.renderer.setClearColor(bgColor, 1);
        
        // Update bird color
        if (this.birdUniforms) {
            if (isDark) {
                this.birdUniforms['birdColor'].value.set(0.9, 0.9, 0.9);
            } else {
                this.birdUniforms['birdColor'].value.set(0.0, 0.0, 0.0);
            }
        }
    }
    
    setColorMode(enabled) {
        this.colorMode = enabled;
        localStorage.setItem('murmr_color_mode', enabled);
        
        if (this.birdUniforms) {
            this.birdUniforms['colorMode'].value = enabled ? 1.0 : 0.0;
        }
    }
    
    // Combined theme setter: 'light', 'dark', or 'color'
    setTheme(mode) {
        if (!this.renderer || !this.scene) return;
        
        let bgColor;
        let birdColorR, birdColorG, birdColorB;
        let colorModeValue = 0.0;
        
        if (mode === 'dark') {
            // Dark mode: black bg, white birds
            bgColor = 0x000000;
            birdColorR = 0.9; birdColorG = 0.9; birdColorB = 0.9;
            colorModeValue = 0.0;
        } else if (mode === 'color') {
            // Color mode: dark blue bg, rainbow birds
            bgColor = 0x0a1628;
            birdColorR = 0.9; birdColorG = 0.9; birdColorB = 0.9;
            colorModeValue = 1.0;
        } else {
            // Light mode: sky blue bg, black birds
            bgColor = 0x87CEEB;
            birdColorR = 0.0; birdColorG = 0.0; birdColorB = 0.0;
            colorModeValue = 0.0;
        }
        
        // Update scene background and fog
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog.color = new THREE.Color(bgColor);
        
        // Update renderer clear color
        this.renderer.setClearColor(bgColor, 1);
        
        // Update bird uniforms
        if (this.birdUniforms) {
            this.birdUniforms['birdColor'].value.set(birdColorR, birdColorG, birdColorB);
            this.birdUniforms['colorMode'].value = colorModeValue;
        }
        
        this.colorMode = (mode === 'color');
    }
    
    // Trigger death animation - birds dive down
    triggerDeath(callback) {
        if (!this.velocityUniforms) return;
        
        // Set death mode immediately so wings stop flapping
        this.positionUniforms['deathMode'].value = 1.0;
        
        // Animate death velocity from 0 to 1 over 8 seconds for full fall off screen
        const duration = 8000;
        const startTime = performance.now();
        
        const animateDeath = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // Ease in - starts slow, accelerates like gravity
            const eased = progress * progress;
            this.velocityUniforms['deathMode'].value = eased;
            
            if (progress < 1) {
                requestAnimationFrame(animateDeath);
            } else {
                // Death complete - wait for birds to fall off screen, then reset
                setTimeout(() => {
                    this.velocityUniforms['deathMode'].value = 0;
                    this.positionUniforms['deathMode'].value = 0;
                    if (callback) callback();
                }, 3000);
            }
        };
        
        animateDeath();
    }
    
    // =====================================================
    // EVENT BINDING
    // =====================================================
    
    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        const canvas = this.renderer.domElement;
        
        // Track touch hold state
        this.touchHoldTimer = null;
        this.isHolding = false;
        
        // Touch - pinch zoom, tap to scatter, hold to attract
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
                this.isHolding = false;
                clearTimeout(this.touchHoldTimer);
            } else if (e.touches.length === 1) {
                // Start scatter immediately
                this.scatter(e.touches[0].clientX, e.touches[0].clientY);
                
                // After 200ms of holding, switch to attract mode
                this.touchHoldTimer = setTimeout(() => {
                    this.isHolding = true;
                    if (this.velocityUniforms) {
                        this.velocityUniforms['attractMode'].value = 1.0;
                    }
                }, 200);
            }
        }, { passive: true });
        
        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (this.lastPinchDistance > 0) {
                    const delta = this.lastPinchDistance - distance;
                    this.camera.position.z = Math.max(100, Math.min(1500, this.camera.position.z + delta * 1.5));
                }
                this.lastPinchDistance = distance;
            } else if (e.touches.length === 1) {
                // Update position - attract or scatter based on hold state
                this.mouseX = e.touches[0].clientX - window.innerWidth / 2;
                this.mouseY = e.touches[0].clientY - window.innerHeight / 2;
            }
        }, { passive: true });
        
        canvas.addEventListener('touchend', () => {
            this.lastPinchDistance = 0;
            this.isHolding = false;
            clearTimeout(this.touchHoldTimer);
            // Reset attract mode
            if (this.velocityUniforms) {
                this.velocityUniforms['attractMode'].value = 0.0;
            }
            // Reset mouse position to far away
            this.mouseX = 10000;
            this.mouseY = 10000;
        }, { passive: true });
        
        // Mouse for desktop - hold to attract
        let mouseDown = false;
        let mouseHoldTimer = null;
        
        canvas.addEventListener('pointerdown', (e) => {
            mouseDown = true;
            this.scatter(e.clientX, e.clientY);
            
            mouseHoldTimer = setTimeout(() => {
                if (mouseDown && this.velocityUniforms) {
                    this.velocityUniforms['attractMode'].value = 1.0;
                }
            }, 200);
        });
        
        canvas.addEventListener('pointermove', (e) => {
            if (mouseDown) {
                this.mouseX = e.clientX - window.innerWidth / 2;
                this.mouseY = e.clientY - window.innerHeight / 2;
            }
        });
        
        canvas.addEventListener('pointerup', () => {
            mouseDown = false;
            clearTimeout(mouseHoldTimer);
            if (this.velocityUniforms) {
                this.velocityUniforms['attractMode'].value = 0.0;
            }
            this.mouseX = 10000;
            this.mouseY = 10000;
        });
        
        canvas.addEventListener('wheel', (e) => {
            this.camera.position.z = Math.max(100, Math.min(1500, this.camera.position.z + e.deltaY * 0.5));
        }, { passive: true });
    }
}

// Export
window.Murmuration = Murmuration;
