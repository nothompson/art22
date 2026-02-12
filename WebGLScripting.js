let canvas, gl, program, positionBuffer;

let chromeTexture, spectraTexture;

let resolution, time, rands;

let index = 0;

let start = 0.0;

let renderIndex = null;
let valueLoc;

let value = 0.0;
let output = 0.0; 

//ensure canvas/aspect ratio fits to screen 
function resize(){
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight

    if(gl != null){
        gl.viewport(0,0,canvas.width,canvas.height);
    }
}

async function LoadShader(url){
    //get text from fragment shader 
    let file = await fetch(url).then(
        output => output.text()
    );
    //no #includes in glsl, need to prepend text to the file 
    file = (await fetch("Shaders/ShaderFunctions.frag").then(
        output => output.text()
    )) + file;
    return file;
}

    
const Shaders = [
        {name: "TextureWarp", path: "Shaders/TextureWarp.frag"},
        {name: "Voronoi", path: "Shaders/Voronoi.frag"},
        {name: "FBM", path: "Shaders/FBM.frag"},
        {name: "ColorWarp", path: "Shaders/ColorWarp.frag"},
        {name: "Lavalamp", path: "Shaders/Lavalamp.frag"},
        {name: "test", path: "Shaders/test.frag"},
    ];

//probably useless
function GetRandomFloat(min, max){
    let range = max - min;
    return Math.random() * range + min;
}

function setup(){

}

function keyReleased(){
    Envelope(1000,1);
}

function main(){
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
    //initial sizing
    resize();
    window.addEventListener('resize', resize);

    InitMidi();

    //lots of shader functions inspired/taken from inigo quilez


    //vertex shader for 2d is very simple
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

    let selectedShader = Shaders[index];

    gl.useProgram(null);
    if(program != null) gl.deleteProgram(program);

    if(renderIndex != null)
    {
        cancelAnimationFrame(renderIndex)
        renderIndex = null;
    };

    console.log(renderIndex);

    //'then' calls the lambda functions after function returns. allows us to use frag returned from shader, but after its not null
    LoadShader(selectedShader.path).then(Frag =>
    {
        console.log("fragment shader path loaded", selectedShader.path);
        program = CreateShader(gl,Vert,Frag);
        if(!program){
            console.error("creating shader failed");
            return;
        }

        gl.useProgram(program);
        InitAttributes(gl,program);
        InitTextures(gl,program);
        InitUniforms(gl,program);

        let frameCount = 0;
        function render(t){
            if(frameCount++ === 0){
                console.log("renderframe init", t);
            }
            t -= start;
            t *= 0.0001;
            resize();
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(resolution, canvas.width, canvas.height);
            gl.uniform1f(valueLoc, value);
            gl.uniform1f(time, t);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            renderIndex = requestAnimationFrame(render);
        }

        start = performance.now();

        renderIndex = requestAnimationFrame(render);
        console.log(renderIndex);
    })
    .catch(e => {
        console.error("failed to load frag", selectedShader.path, e);
    });

}
//end of main

function InitAttributes(gl, program)
{
    const position = gl.getAttribLocation(program, 'aPosition');
    const uv = gl.getAttribLocation(program, 'aUV');
    
    positionBuffer = gl.createBuffer();
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
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    
    gl.enableVertexAttribArray(uv);
    gl.vertexAttribPointer(
        uv,2, gl.FLOAT, false, 16, 8
    );
}

function InitTextures(gl, program)
{
    chromeTexture = loadTexture(gl, "images/chromanellesvisage.png");
    spectraTexture = loadTexture(gl, "images/spectralmap.png");


    const chromeLocation = gl.getUniformLocation(program, 'iChrome');
    const texLocation = gl.getUniformLocation(program, 'iTexture');
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, chromeTexture);
    gl.uniform1i(chromeLocation, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, spectraTexture);
    gl.uniform1i(texLocation, 1);

}

function InitUniforms(gl, program){
    resolution = gl.getUniformLocation(program, 'iResolution');
    time = gl.getUniformLocation(program, 'iTime');
    const randomFloats = gl.getUniformLocation(program, 'iRands');
    valueLoc = gl.getUniformLocation(program, "iValue");
    
    gl.uniform4f(randomFloats, GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0));
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

 function NextShader(){
        index++;
        if(index > Shaders.length - 1){
            index = 0;
        };
        main();
        console.log(index);
    }
function PrevShader(){
    index--;
        if(index < 0){
            index = Shaders.length - 1;
        } 
        main();
        console.log(index);
}

function RefreshShader(){
    main();
}

function InitMidi(){
    navigator.permissions.query({ name: "midi", sysex: true }).then((result) => {
  if (result.state === "granted") {
    console.log("midi access granted");
    // Access granted.
  } else if (result.state === "prompt") {
    // Using API will prompt for permission
    console.log("midi access granted");
  }
  else{// Permission was denied by user prompt or permission policy
  console.error("midi access denied");
  }
});
}

function iLerp(a, b, t){
    return a * (1.0 - t) + b * t;
}

function Envelope(dur, attack){
    const starttime = performance.now();
    // const attacktime = attack * dur;


    function update(time){
        
        let elapsed = time - starttime;
        
        const t = Math.min(elapsed / dur,1);

        // if(elapsed < attacktime)
        // {
        //     const a = elapsed / attacktime;
        //     value = iLerp(0, 1, a);
        // }

        // else
        // {
        //     const decayTime = elapsed - attacktime;
        //     const decayDur = dur - elapsed || 1;
        //     const d = Math.min(decayTime / decayDur, 1);
        //     value = iLerp(1, 0, d);
        // }

        output += attack * 0.001;

        value = iLerp(value,output,t);


        console.log("current value: " + value);  

        if(t < 1){
            requestAnimationFrame(update)
        }
    }
    requestAnimationFrame(update);
}

function Increment(dur, target){

}



document.addEventListener('DOMContentLoaded', main);
