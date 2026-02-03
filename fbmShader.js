let canvas; 
let gl;

function resize(){
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight

    if(gl != null){
        gl.viewport(0,0,canvas.width,canvas.height);
    }
}

function GetRandomFloat(min, max){
    let range = max - min;
    return Math.random() * range + min;
}

function init(){
    canvas = document.getElementById("canvas");
    if(canvas == null){
        console.error("canvas null!");
        return;
    }
    gl = canvas.getContext("webgl");
    if(gl == null){
        console.error("webgl null!!!");
        return;
    }
    resize();
    window.addEventListener('resize', resize);

    //lots of shader functions inspired/taken from inigo quilez

    const Vert = 
    `
        precision highp float;

        attribute vec2 aPosition;
        attribute vec2 aUV;

        varying vec2 vPosition;
        varying vec2 vUV;

        void main(){
            gl_Position = vec4(aPosition, 0.0, 1.0);
            vPosition = gl_Position.xy;
            vUV = aUV;
        }
    `;

    const Frag = 
    `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 iRands;
    uniform sampler2D iChrome;
    uniform sampler2D iTexture;

    varying vec2 vUV;

    #define numOctaves 3
    int randomOctave(in float x)
    {
        return int(floor(x));
    }

    float random(in vec2 x)
    {
        return fract(sin(dot(x.xy, vec2(abs(iRands.x) + 1.0,abs(iRands.y) + 1.0))) *44.1334);
    }
    
    vec2 hash(in vec2 x)
    {
        vec2 k = vec2(abs(iRands.x) + 1.0,abs(iRands.y) + 1.0);
        // vec2 k = vec2(1.98592,1.123985);

        x = x*k + k.yx;
        return -1.0 + 2.0 * fract(8.0 * k * (x.x*x.y *(x.x + x.y)));
    }

    float noise(in vec2 x)
    {
        vec2 i = floor(x);
        vec2 f = fract(x);

        float a = random(i);
        float b = random(i + vec2(1.0,0.0));
        float c = random(i + vec2(0.0,1.0));
        float d = random(i + vec2(1.0,1.0));

        vec2 u = f * f * (3.0-2.0 * f);

        float n = mix(a,b,u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;

        return n;
    }

    vec3 gradientNoise(in vec2 x)
    {
        vec2 i = floor(x);
        vec2 f = fract(x);
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        vec2 du = 2.0 * f * (1.0 - f);

        vec2 ga = hash(i + vec2(0.0,0.0));
        vec2 gb = hash(i + vec2(1.0,0.0));
        vec2 gc = hash(i + vec2(0.0, 1.0));
        vec2 gd = hash(i + vec2(1.0,1.0));

        float va = dot(ga, f - vec2(0.0,0.0));
        float vb = dot(gb, f - vec2(1.0,0.0));
        float vc = dot(gc, f - vec2(0.0,1.0));
        float vd = dot(gd, f - vec2(1.0,1.0));

        return vec3( va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd),
                 ga + u.x*(gb-ga) + u.y*(gc-ga) + u.x*u.y*(ga-gb-gc+gd) + 
                 du * (u.yx*(va-vb-vc+vd) + vec2(vb,vc) - va));
    }

    float smoothVoronoi(in vec2 x)
    {
        ivec2 p = ivec2(floor(x));
        vec2 f = fract(x);

        float res = 0.0;
        for(int j = -3; j <= 3; j++){
        for(int i = -3; i <= 3; i++){
            ivec2 b = ivec2(i, j);
            vec2 r = vec2(b) - f + hash(vec2(p) + vec2(b));
            float d = dot(r,r);
            res += 1.0/pow(d,8.0);
        }
        }
        return pow(1.0/res, 1.0/16.0);
    }

    //input  and Hurst exponent
    //fractal dimension and power spectrum
    //integrate white noise fractionally, given values 0 to 1
    //H = 0 decays slower per octave and is equivalent to pink noise
    //H = 1/2 decays faster and has less high frequencies
    // H = 1 decays fastest, lowest frequency

    float fbm(in vec2 x, in float H)
    {
        // exponential decay of Hurst 
        float gain = exp2(-H);
        // wavelength 
        float freq = 1.0;
        float amplitude = 1.0;
        // output 
        float value = 0.0;
        for(int i = 0; i < numOctaves; i++)
        {
            value += gradientNoise(freq * x).z * amplitude;

            // value += smoothVoronoi(freq * x) * amplitude;

            // value += noise(freq * x) * amplitude;

            // each "octave" is twice the frequency
            freq *= 2.0;
            amplitude *= gain;
        }
        return value;
    }

    float warp(in vec2 p, in float H)
    {
        vec2 q = vec2(fbm(p + vec2(0.0,0.0), H), fbm(p + vec2(0.0,0.0),H));

        return fbm(p + q,H);
    }
    
    //nested fractal brownian motions
    float dualWarp(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
            
        q.x = 
            fbm(p + vec2(fbm(vec2(iTime * iRands.w * 0.01,iTime * iRands.z * 0.01),H),fbm(vec2(iTime * iRands.y * 0.01,iTime * iRands.x * 0.01),H)), H);

        q.y = 
            fbm(p + vec2(fbm(vec2(iTime * iRands.x * 0.01,iTime * iRands.y * 0.01),H),fbm(vec2(iTime * iRands.z * 0.01,iTime * iRands.w * 0.01),H)), H);

        r.x = 
            fbm(p + vec2(0.0 + iTime,0.0 + iTime) + q, H);

        r.y = 
            fbm(p + vec2(0.0 + iTime,0.0 + iTime) + q, H);
        
        float sig = 
            // fbm(p + abs(fbm(vec2(0,iTime * 0.1),H)) * r * 5.0, H);
            // fbm((p + sin(iTime)) + r, H);
            fbm(p + r,H);
        
        return sig;
    }

    float dualWarpStatic(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
        q.x = 
            fbm(p + vec2(0.0,0.0), H);

        q.y = 
            fbm(p + vec2(0.0,0.0), H);

        r.x = 
            fbm(p + vec2(0.0,0.0) + q, H); 

        r.y = 
            fbm(p + vec2(0.0,0.0) + q, H);
        
        float sig = 
            fbm(p + r,H);
        
        return sig;
    }

    //what we see

    void frag(out vec4 fragColor, in vec2 fragCoord){
        vec2 uv = vUV;

        // uv += fragCoord / iResolution;

        float speed = 0.1;
        vec2 dir = vec2(-1.0,1.0);
        vec2 scale = vec2(10.0,10.0);

        float basicFbm = fbm(uv, 0.5);

        vec2 animate = vec2(dir.x * iTime * speed, dir.y * iTime * speed);

        float scrollingFbm = fbm(vec2(uv.x + animate.x, uv.y + animate.y), 0.5);

        float zoomingFbm = fbm(vec2(uv.x * animate.x, uv.y * animate.y), 0.5);

        float scaledFbm = fbm(vec2(uv.x * scale.x, uv.y * scale.y),1.0);

        //output values from nested fbm
        vec2 q; vec2 r; vec2 p; vec2 g;

        float basicDualWarp = dualWarp(uv, 0.3, q, r);

        // float scaledDualWarp = dualWarp(uv * scale, 0.2, q,r);

        float basicWarp = warp(uv,0.9);

        float texGain = 0.5;
        float gain = 1.0;

        // vec2 warpedUV = (uv + (r * dualWarp(uv.yx, 0.5,p,g)));
        vec2 warpedUV = uv * basicDualWarp;
        
        float basicVoronoi = smoothVoronoi(uv * 20.0 + iTime);

        float min = 0.0;
        vec3 col = vec3(1.0,1.0,1.0);
        // vec3 col = vec3(fbm(r * 0.5 + uv * 0.5,abs(sin(-iTime * iRands.x))),fbm(q * 0.5 - uv * 0.5,abs(sin(iTime * iRands.y))),(uv.x + uv.y)) * basicDualWarp;
        // col = vec3(fbm(r * 0.5 + uv * 0.5,abs(sin(-iTime * iRands.x))),fbm(q * 0.5 - uv * 0.5,abs(sin(iTime * iRands.y))),(uv.x + uv.y));

        // col = mix(col, vec3(0.05, 0.1, 0.3), 0.5 * smoothstep(0.5,1.5,abs(r.y) + abs(r.x)));
        // col = mix(col, vec3(0.2, 0.125, 0.03), 0.5 * smoothstep(1.1,1.2,abs(p.y) + abs(p.x)));

        col *= basicDualWarp * gain;
        col += min;

        vec4 chrome = texture2D(iChrome,warpedUV);

        vec4 tex = texture2D(iTexture, warpedUV);

        vec4 fragCol = vec4(col,1.0);

        vec4 sig = mix(chrome,tex, basicVoronoi * 0.25);
        sig = mix(sig, fragCol, abs(sin(iTime) * fbm(uv,0.5)));

        // sig = mix(sig, chrome, fbm(uv,0.5) * (q.x + q.y));
        // sig = mix(sig, tex, r.x + r.y);

        fragColor = sig;
    }

    void main(){
        frag(gl_FragColor, gl_FragCoord.xy);
    }
    `;

    const program = CreateShader(gl, Vert, Frag);
    if(program == null) {
        console.error("shader is null!");
        return;
    }

    gl.useProgram(program);

    const position = gl.getAttribLocation(program, 'aPosition');
    const uv = gl.getAttribLocation(program, 'aUV');
    
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   0, 0,
    1, -1,   1, 0,
    -1,  1,   0, 1,

    -1,  1,   0, 1,
    1, -1,   1, 0,
    1,  1,   1, 1,
    ]), gl.STATIC_DRAW);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 4 * 4, 0);
    
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(
        uv,2, gl.FLOAT, false, 4 * 4, 2 * 4
    );
    const chrome = loadTexture(gl, "images/chrome.png");
    const texture = loadTexture(gl, "images/spectralmap.png");


    const chromeLocation = gl.getUniformLocation(program, 'iChrome');
    const texLocation = gl.getUniformLocation(program, 'iTexture');
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, chrome);
    gl.uniform1i(chromeLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(texLocation, 1);

    const resolution = gl.getUniformLocation(program, 'iResolution');
    const time = gl.getUniformLocation(program, 'iTime');
    const randomFloats = gl.getUniformLocation(program, 'iRands');
    
    gl.uniform4f(randomFloats, GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0));
    

    function render(t){
        t *= 0.0001;
        resize();
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, t);
        // console.log(t);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function loadTexture(gl, url){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0,0,255,255]);

    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel,
    );

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image,
        );


        if(isPowerOf2(image.width) && isPowerOf2(image.height))
        {
            gl.generateMipmap(gl.TEXTURE_2D);     
        } 
        else
        {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_FILTER, gl.LINEAR);
        }
    };

    image.src = url;

    return texture;
}

function isPowerOf2(value){
    return(value & (value - 1)) === 0;
}

function CreateShader(gl, vertSource, fragSource)
{
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex,vertSource);
    gl.compileShader(vertex);

    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment,fragSource);
    gl.compileShader(fragment);

    const shader = gl.createProgram();
    gl.attachShader(shader, vertex);
    gl.attachShader(shader, fragment);
    gl.linkProgram(shader);

    return shader;

}

document.addEventListener('DOMContentLoaded', init);
