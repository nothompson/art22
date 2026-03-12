let canvas, gl, program, positionBuffer;

const SampleRate = 44100;

let chromeTexture, spectraTexture;

let resolution, time, rands;

let index = 0;

let start = 0.0;

let renderIndex = null;

let valueLoc;
let incValue = 0.0;
let increment = 0.0;

let envValueLoc;
let envValue = 0.0;

let midi = null;

let iKnob1 = 0;
let knob1Loc;


let iKnob2 = 0;
let knob2Loc;


let iKnob3 = 0;
let knob3Loc;


let iKnob4x = 1.0;
let iKnob4y = 1.0;

let context;

let analyze; 

let bufferLength;

let dataArray;

let knob4Loc;

let s;

let knob5 = 1.0;

let knob6 = 10000;

let CarrierWave = 'sine';

let ModulatorWave = 'sine';

let modPitchIndex = 0;

let timeMultiplier = 1;

let modPitches = [
    0.25,
    0.5,
    1,
    2,
    4
];

let modPitch = 1;

function setup(){
    //needed for p5 functions
}

//#region GLSL

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

        let accumulatedTime = 0;
        let lastTimestamp = null;

        function render(t){
            if(lastTimestamp == null) lastTimestamp = t;
            let delta = (t - lastTimestamp) * (0.0001 * timeMultiplier);
            
            accumulatedTime += delta;

            lastTimestamp = t;

            resize();
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(resolution, canvas.width, canvas.height);
            gl.uniform1f(valueLoc, incValue);
            gl.uniform1f(envValueLoc, envValue);

            gl.uniform1f(knob1Loc, iKnob1);
            gl.uniform1f(knob2Loc, iKnob2);
            gl.uniform1f(knob3Loc, iKnob3);
            gl.uniform2f(knob4Loc, iKnob4x, iKnob4y);

            gl.uniform1f(time, accumulatedTime);
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
    envValueLoc = gl.getUniformLocation(program, "iEnv");

    knob1Loc = gl.getUniformLocation(program, "iKnob1");
    knob2Loc = gl.getUniformLocation(program, "iKnob2");
    knob3Loc = gl.getUniformLocation(program, "iKnob3");
    knob4Loc = gl.getUniformLocation(program, "iKnob4");
    
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

//#endregion

//#region Keymap

const Keymap ={

    //c4 to e5
    "z": 60,
    "x": 62,
    "c": 64,
    "v": 65,
    "b": 67,
    "n": 69,
    "m": 71,
    ",": 72, 
    ".": 74,
    "/": 76,

    //c#4 to d#5
    "s": 61,
    "d": 63,
    "g": 66,
    "h": 68,
    "j": 70,
    "l": 73,
    ";": 75,

    //c5 to e6
    "q": 72,
    "w": 74,
    "e": 76,
    "r": 77,
    "t": 79,
    "y": 81,
    "u": 83,
    "i": 84,
    "o": 86,
    "p": 88,
    "[": 89,
    "]": 91,

    //c#5 to f#6
    "2": 73,
    "3": 75,
    "5": 78,
    "6": 80,
    "7": 82,
    "9": 85,
    "0": 87,
    "=": 90,

};

//https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event

window.addEventListener('blur', () => {
    Object.values(activeVoices).forEach(voice => voice.stop());
    activeVoices = {};
});

function keyPressed(){
    if(Keymap[key]){
        let note = Keymap[key]
        let freq = MidiToFreq(note);
        Increment(500,3);
        Envelope(450,0.25);
        var voice = new Voice(freq);

        activeVoices[note] = voice;

        voice.start();
    }
    // console.log(Keymap[key]);
}

function keyReleased(){
    if(Keymap[key]){
        let note = Keymap[key];
        activeVoices[note].stop();
        delete activeVoices[note];
    }
}

//#endregion

//#region Midi



//setting up midi from Web MidiAPI 
//https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API

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

function onMidiSuccess(midiAccess){
    console.log("midi ready");
    midi = midiAccess;
    listMidiInputsAndOutputs(midi);

    startLoggingMidiInput(midi);
}

function onMidiFailure(e){
    console.error("midi failed", e);
}

navigator.requestMIDIAccess().then(onMidiSuccess,onMidiFailure);

function listMidiInputsAndOutputs(midiAccess){
    for(const entry of midiAccess.inputs){
        const input = entry[1];
        console.log(
            `Input port [type: '${input.type}']` + 
            `id: '${input.id}'`,
        );
    }

    for(const entry of midiAccess.outputs){
        const output = entry[1];
        console.log(
            `Output port [type: '${output.type}']` +
            `id: '${output.id}`,
        );
    }
}

//event data is array of bytes, status (note off), 

activeVoices = {};

function onMidiMessage(event){
    let str = `midi message received at timestamp: ${event.timeStamp}[${event.data.length} bytes]: `;
    for(const char of event.data){
        str += `0x${char.toString(16)}` ;
    }
    
    const [status,note, velocity] = event.data;

    if(status == 217) return;

    // console.log(status, note, velocity);
    // active_voices = {};

    //KEYDOWN
    if((velocity > 0 && (status == 128 || status == 144))){
        // console.log(`Note Pressed: ${note}`);

        const freq = MidiToFreq(note);
        // console.log("frequency of note",freq);

        Increment(500,3);
        Envelope(450,0.25);

        var voice = new Voice(freq);

        activeVoices[note] = voice;

        voice.start();
        // voice.update();
    }

    //KEYRELEASE
    if(velocity <= 0 && (status == 128 || status == 144)){
        // console.log(`Note released: ${note}`);
        activeVoices[note].stop();
        delete activeVoices[note];
    }

    //PAD DOWN
    if(status == 153){
        if(note == 37){
            ChangeModWaveform('sine');
        }

        if(note == 36){
            ChangeModWaveform('triangle');
        }

        if(note == 42){
            ChangeModWaveform('sawtooth');
        }

        if(note == 54){
            ChangeModWaveform('square');
        }

        if(note == 40){
            ChangeCarrierWaveform('sine');
        }

        if(note == 38){
            ChangeCarrierWaveform('triangle');
        }

        if(note == 46){
            ChangeCarrierWaveform('sawtooth');
        }

        if(note == 44){
            ChangeCarrierWaveform('square');
        }
    }

    if(status == 224){
        if(note == 0 && velocity == 0){
            modPitchIndex--;
            if(modPitchIndex <= 0) modPitchIndex = 0;
            modPitch = modPitches[modPitchIndex];
            console.log(modPitch);

        }
        if(note == 127 && velocity == 127){
            modPitchIndex++;
            if(modPitchIndex >= modPitches.length) modPitchIndex = modPitches.length - 1;
            modPitch = modPitches[modPitchIndex];
            console.log(modPitch);
        }
    }


    //PAD UP
    if(status == 137){
        // probably wont use..?
    }

    //knob 1
    if(status > 148 && event.data[1] == 70){
        let v = event.data[2];
        let out = iNormalize(v, 0, 127);
        Parameters.setFBMFrequency(out);
        setSliderPosition("fbm", out);
    }

     //knob 2
    if(status > 148 && event.data[1] == 71){
        let v = event.data[2];
        let hurst = iNormalize(v, 0, 127);
        Parameters.setHurstAndFM(hurst);
        setSliderPosition("hurst", hurst);
    }

     //knob 3
    if(status > 148 && event.data[1] == 72){

        let v = event.data[2];
        let cutoff = iNormalize(v, 0, 127);
        Parameters.setCutoffAndTimestep(cutoff);
        setSliderPosition("filter", cutoff);
    }

     //knob 4
    if(status > 148 && event.data[1] == 73){
        let v = event.data[2];
        let q = iNormalize(v, 0, 127);
        
        Parameters.setFilterQ(q);
        setSliderPosition("q",q);
    }

     //knob 5
    if(status > 148 && event.data[1] == 74){
        let v = event.data[2];
        let wet = iNormalize(v, 0, 127);
        Parameters.setDelayWet(wet);
        setSliderPosition("delayWet", wet);
    }

    //knob6
    if(status > 148 && event.data[1] == 75){
        let v = event.data[2];
        let fb = iNormalize(v, 0, 127);
        Parameters.setFeedback(fb);
        setSliderPosition("feedback", fb);
    }

    //knob7
    if(status > 148 && event.data[1] == 76){
        let v = event.data[2];
        let del = iNormalize(v, 0, 127);
        
        Parameters.setDelayTime(del);
        setSliderPosition("delayTime", del);
    }

    //knob8
    if(status > 148 && event.data[1] == 77){
        let v = event.data[2];
        let crush = iNormalize(v, 0, 127);
        Parameters.setBitcrush(crush);
        setSliderPosition("bitcrush",crush);
    }

    //   let v = event.data[2];
    //     let crush = iNormalize(v, 0, 127);
    //     Parameters.setBitcrush(crush);
    
    // let v = event.data[2];
    // let out = iNormalize(v, 0, 127);
    // Parameters.setKnob3(out);

    // let v = event.data[2];
    // let out = iNormalize(v, 0, 127);
    // Parameters.setDirection(out);
    // setSliderPosition("direction", out);
}

function startLoggingMidiInput(midiAccess){
    midiAccess.inputs.forEach((entry) => {
        entry.onmidimessage = onMidiMessage;
    });
}

function setSliderPosition(id, norm){
    let dial = document.getElementById(id);
    if(dial == null) return;

    dial._norm = norm;

    if(dial.className == "knob"){
        dial.style.transform = `rotate(${-norm * 270}deg)`;
        return;
    }

    if(dial.className == "spriteSlider"){
        if(id == "feedback" && mouthSprite.image){
            setFeedbackFrame(norm);
        }
        if(id == "bitcrush" && crushSprite.image){
            setCrushFrame(1.0 - norm);
        }
        return;
    }

    let slider = dial.closest(".sliderBody");
    if(slider == null) return;
    let rect = slider.getBoundingClientRect();
    let dialWidth = dial.offsetWidth;
    let minX = 10;
    let maxX = rect.width - dialWidth - 10;
    dial.style.left = (minX + norm * (maxX - minX)) + "px";
}

//#endregion

//#region Audio

window.addEventListener('load', initAudioContext, false);

function initAudioContext(){
    try {
        context = new AudioContext();
        if(context != null){
            biquad = context.createBiquadFilter();
            analyze = context.createAnalyser();
        }
        if(analyze != null){
            bufferLength = analyze.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }
    }
    catch(er){
        alert("web audio not supported!");
    }
}

const Parameters = {
    setFBMFrequency(norm){
        iKnob1 = norm;
    },
    setHurstAndFM(norm){
        iKnob2 = 1.0 - norm;

        SynthSettings.fmAmount = norm * 2000.0;

        Object.values(activeVoices).forEach(voice => voice.updateFM(SynthSettings.fmAmount));
    },
    setKnob3(norm){
        iKnob3 = norm;
    },
    setCutoffAndTimestep(norm){
        let exp = Math.pow(norm,2);
        
        timeMultiplier = (exp * 0.9) + 0.1;

        SynthSettings.filterCutoff = (exp * 18000) + 250;
        
        Object.values(activeVoices).forEach(voice => voice.updateFilterCutoff(SynthSettings.filterCutoff)); 
    },

    setFilterQ(norm){
        SynthSettings.filterQ = norm * 20.0;
        Object.values(activeVoices).forEach(voice => voice.updateFilterQ(SynthSettings.filterQ)); 
    },

    setDirection(norm){
        let degrees = norm * 360.0;

        // console.log("knob 4", out);
        let x = cos(degrees * Math.PI / 180);
        let y = sin(degrees * Math.PI / 180);

        iKnob4x = x;
        iKnob4y = y;
    },
    setCarrierWave(wave){
        SynthSettings.Carrier = wave;
    },
    setModulatorWave(wave){
        SynthSettings.Modulator = wave;
    },

    setBitcrush(crush){
        let c = (1.0 - crush) * 6.0;
        SynthSettings.bitcrushed = c;

        Object.values(activeVoices).forEach(voice => voice.updateBitcrush(SynthSettings.bitcrushed)); 
    },

    setDelayTime(del){
        let d = Math.pow(del,3);
        SynthSettings.delayTime = (d * 4.0) + 0.001;
        let voices = [...Object.values(activeVoices), ...delayLine];
        voices.forEach(voice => {
            voice.updateDelayTime(SynthSettings.delayTime);
        })
    },

    setDelayWet(wet){
        SynthSettings.delayWet = wet;
        let voices = [...Object.values(activeVoices), ...delayLine];
        voices.forEach(voice => {
            voice.updateDelayWet(SynthSettings.delayWet);
        })
    },

    setFeedback(fb){
        SynthSettings.feedback = Math.pow(fb,2) * 1.1;
        let voices = [...Object.values(activeVoices), ...delayLine];
        voices.forEach(voice => {
            voice.updateFeedback(SynthSettings.feedback);
        });
    },
}

//https://stackoverflow.com/questions/7884081/what-is-the-use-of-the-init-usage-in-javascript

const AllSliders = {
    "fbm": {func: norm => Parameters.setFBMFrequency(norm), init: 0.5},
    "hurst": {func: norm => Parameters.setHurstAndFM(norm), init: 0.5},
    "filter": {func: norm => Parameters.setCutoffAndTimestep(norm), init: 1.0}, 
    "q": {func: norm => Parameters.setFilterQ(norm), init: 0.2},
    "delayWet" : {func: norm => Parameters.setDelayWet(norm), init: 0.5},
    "feedback" : {func: norm => Parameters.setFeedback(norm), init: 0.0},
    "delayTime" : {func: norm => Parameters.setDelayTime(norm), init: 0.0},
    "bitcrush" : {func: norm => Parameters.setBitcrush(norm), init: 0.0}
};

const carrierWaveGlyphs = {
    'sine': document.getElementById('sine'),
    'triangle': document.getElementById('triangle'),
    'sawtooth': document.getElementById('sawtooth'),
    'square': document.getElementById('square')
};

const modWaveGlyphs = {
    'sine': document.getElementById('modSine'),
    'triangle': document.getElementById('modTriangle'),
    'sawtooth': document.getElementById('modSawtooth'),
    'square': document.getElementById('modSquare')
}

//https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API

let oscillatorCanvas = document.getElementById("oscillator");
let oscillator = oscillatorCanvas.getContext("2d");

function visualize(){
    requestAnimationFrame(visualize);
    
    if(analyze == null) return;
    analyze.getByteTimeDomainData(dataArray);

    oscillator.clearRect(0,0,oscillatorCanvas.width, oscillatorCanvas.height);

    oscillator.lineWidth = 2;
    oscillator.strokeStyle = "rgb(255, 255, 255)";
    oscillator.beginPath();

    let slice = oscillatorCanvas.width / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++){
        let y = (dataArray[i] / 255.0) * oscillatorCanvas.height;

        i == 0 ? oscillator.moveTo(x,y) : oscillator.lineTo(x,y);
        x += slice;
    }

    oscillator.lineTo(oscillatorCanvas.width, oscillatorCanvas.height * 0.5);
    oscillator.stroke();
}

visualize();

//poly sine
let gain = 0.25;
let attack = 0.05;
let decay = 1.0;
let sustain = 0.3;
let release = 0.5;

let delayLine = [];

const SynthSettings = {
    Carrier: "sine",
    Modulator: "sine",
    
    fmAmount: 0,

    filterCutoff: 18000,
    filterQ: 5,
    
    delayTime: 0.5,
    feedback: 0.1,
    delayWet: 0.5,
    
    bitcrushed: 16,
}

var Voice = (function(){
    function Voice(frequency){
        this.frequency = frequency;
        this.oscillators = [];
        this.vca = null;
        this.mod = null;
        this.filter = null;
        this.delay = null;
        this.feedback = null;
        this.delayWet = null;
        this.bitcrush = null;
        this.delayLineConnected = true;
};

    Voice.prototype.start = function(){
        const now = context.currentTime;

        //BASIC
        var vco = context.createOscillator();
        vco.type = SynthSettings.Carrier;
        vco.frequency.value = this.frequency;

        //FM
        var mod = context.createOscillator();
        mod.type = SynthSettings.Modulator;
        mod.frequency.value = (this.frequency * modPitch);
        var modGain = context.createGain();
        modGain.gain.value = SynthSettings.fmAmount;
        mod.connect(modGain);
        modGain.connect(vco.frequency);

        //FILTER
        var filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = SynthSettings.filterCutoff;
        filter.Q.value = SynthSettings.filterQ;
        
        //ADSR
        var vca = context.createGain();
        vca.gain.cancelScheduledValues(now);    
        vca.gain.setValueAtTime(0.0, now);
        vca.gain.linearRampToValueAtTime(gain, now + attack);
        vca.gain.linearRampToValueAtTime(gain * sustain, now + attack + decay);

        //DELAY
        var delay = context.createDelay();
        delay.delayTime.value = SynthSettings.delayTime;

        var feedback = context.createGain();
        feedback.gain.value = SynthSettings.feedback;

        var delayWet = context.createGain();
        delayWet.gain.value = SynthSettings.delayWet * gain;

        //DISTORTION

        var bitcrusher = context.createWaveShaper();

        var bitcrusherGain = context.createGain();

        bitcrusher.curve = bitcrush(SynthSettings.bitcrushed);


        //CLIPPING

        var softclip = context.createWaveShaper();
        var softclipOut = context.createGain();

        softclip.curve = sigmoid(0);
        
        //OUTPUT
        
        vco.connect(bitcrusherGain);

        bitcrusherGain.connect(bitcrusher);

        bitcrusher.connect(filter);

        filter.connect(vca);
        
        vca.connect(delay);

        //dry signal
        vca.connect(softclip);

        //delay line
        delay.connect(feedback);
        feedback.connect(delay);

        delay.connect(delayWet);
        delayWet.connect(softclipOut);

        softclipOut.connect(softclip);

        softclip.connect(analyze);

        analyze.connect(context.destination);

        mod.start(now);
        vco.start(now);

        //VOICE ALLOCATION
        this.oscillators.push(vco);
        this.oscillators.push(mod);
        this.vca = vca;
        this.mod = modGain;
        this.filter = filter;
        this.delay = delay;
        this.feedback = feedback;
        this.delayWet = delayWet;
        this.bitcrush = bitcrusher;
    };

    Voice.prototype.stop = function(){
            const now = context.currentTime;
            const current = this.vca.gain.value;

            this.vca.gain.cancelScheduledValues(now);
            this.vca.gain.setValueAtTime(current,now);
            this.vca.gain.linearRampToValueAtTime(0.0, now + release);

            this.oscillators.forEach(function(osc, _){
                osc.stop(now + release);
            })

            delayLine.push(this);

            this.checkSilence();
    }

    Voice.prototype.checkSilence = function(){
        let buffer = new Float32Array(analyze.fftSize);
        let check = () => {
            analyze.getFloatTimeDomainData(buffer);
            let peak = buffer.reduce((max, val) => Math.max(max, Math.abs(val)), 0);

            if(peak < 0.001){
                delayLine = delayLine.filter(v => v !== this);
            }else{
                requestAnimationFrame(check);
            }
        }

        requestAnimationFrame(check);
    }

    Voice.prototype.updateFM = function(fm){
        this.mod.gain.value = fm;
    }

    Voice.prototype.updateFilterCutoff = function(cutoff){
        this.filter.frequency.value = cutoff;
    }

    Voice.prototype.updateDelayTime = function(del){
        this.delay.delayTime.setTargetAtTime(del, context.currentTime, 0.05);
    }

    Voice.prototype.updateFeedback = function(fb){
        this.feedback.gain.value = fb;
    }

    Voice.prototype.updateFilterQ = function(q){
        this.filter.Q.value = q;
    }

    Voice.prototype.updateDelayWet = function(wet){
        this.delayWet.gain.value = wet * gain;
    }

     Voice.prototype.updateBitcrush = function(crush){
        this.bitcrush.curve = bitcrush(crush);
    }

    return Voice;

})(context);

//mono sine
function sine(){

    s = context.createOscillator();
    var gain = context.createGain();

    s.type = "sine";

    gain.gain.setValueAtTime(0.25, context.currentTime);

    s.connect(gain);

    gain.connect(context.destination);
}

function onSine(freq){
    s.frequency.setValueAtTime(freq, context.currentTime);
    s.start(context.currentTime);
}

function offSine(){
    s.stop(context.currentTime);
}

//https://alexanderleon.medium.com/web-audio-series-part-2-designing-distortion-using-javascript-and-the-web-audio-api-446301565541

function sigmoid(drive){
    var k = drive;
    var curve = new Float32Array(SampleRate);
    var x;

    for(let i = 0; i < SampleRate; i++){
        x = i * 2 / SampleRate - 1;
        curve[i] = (3 + k) * Math.atan(Math.sinh(x * 0.25) * 5) / (Math.PI + k * Math.abs(x));
    }

    return curve;
}

function tanh(drive){
    var curve = new Float32Array(SampleRate);
    var x;
    for(let i = 0; i < SampleRate; i++){
        x = i * 2 / SampleRate - 1;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
    }
    return curve;
}

function bitcrush(bits){
    var curve = new Float32Array(SampleRate);
    var step = Math.pow(0.5, bits);
    for(let i = 0; i < SampleRate; i++){
        var x = i * 2 / SampleRate - 1;
        curve[i] = step * Math.round(x / step);
    }
    return curve;
}

//#endregion

//#region Interface

let dragging = false;

let xOffset = 0;

let currentDial = null;
let currentSlider = null;

let currentCarrierWave = null;
let currentModWave = null;

let lastCarrierWave = document.getElementById("sine");

let lastModWave = document.getElementById("modSine");

let env = document.getElementById("adsrCanvas");

let adsr = env.getContext("2d");

let baseHandle = document.getElementById("base");

let attackHandle = document.getElementById("attack");

let decayHandle = document.getElementById("decay");

let releaseHandle = document.getElementById("release");

//https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fill

function DrawEnvelope(){
    let container = document.querySelector(".adsr");
    let rect = container.getBoundingClientRect();

    env.width = rect.width;
    env.height = rect.height;

    adsr.clearRect(0,0,env.width, env.height);


    adsr.lineWidth =4;
    adsr.strokeStyle = "rgb(255, 255, 255)";

    adsr.beginPath();

    adsr.moveTo(baseHandle.offsetLeft + baseHandle.offsetWidth * 0.5, baseHandle.offsetTop + baseHandle.offsetHeight * 0.5);
    adsr.lineTo(attackHandle.offsetLeft + attackHandle.offsetWidth * 0.5, attackHandle.offsetTop + attackHandle.offsetHeight * 0.5);

    adsr.lineTo(decayHandle.offsetLeft + decayHandle.offsetWidth * 0.5, decayHandle.offsetTop + decayHandle.offsetHeight * 0.5);

    adsr.lineTo(releaseHandle.offsetLeft + releaseHandle.offsetWidth * 0.5, releaseHandle.offsetTop + releaseHandle.offsetHeight * 0.5);

    adsr.stroke();
}


const mouthSprite = {
    image: null,
    width: 512,
    height: 512,
    currentFrame: 0,
    totalFrames: 10
}

const crushSprite = {
    image: null,
    width: 512,
    height: 512,
    currentFrame: 0,
    totalFrames: 9
}


function InitInterface(){
    InitADSR();
    InitSliders();
    InitWaves();
    InitSprites();
}

function InitSprites(){
    mouthSprite.image = new Image();
    mouthSprite.image.onload = () => setFeedbackFrame(0);
    mouthSprite.image.src = "images/feedback.png";

    crushSprite.image = new Image();
    crushSprite.image.onload = () => setCrushFrame(0);
    crushSprite.image.src = "images/crush.png";
}

function setFeedbackFrame(norm){
    mouthSprite.currentFrame = Math.floor(norm * (mouthSprite.totalFrames - 1));
    drawFeedback();
}

function setCrushFrame(norm){
    crushSprite.currentFrame = Math.floor(norm * (crushSprite.totalFrames - 1));
    drawCrush();
}

function drawFeedback(){
    if(!mouthSprite.image) return;
    let canv = document.getElementById("feedback");
    let sprite = canv.getContext("2d");

    sprite.clearRect(0,0,canv.width, canv.height);
    sprite.drawImage(mouthSprite.image,mouthSprite.width * mouthSprite.currentFrame,0, mouthSprite.width, mouthSprite.height, 0,0,canv.width, canv.height);
}

function drawCrush(){
    if(!crushSprite.image) return;
    let canv = document.getElementById("bitcrush");
    let sprite = canv.getContext("2d");

    sprite.clearRect(0,0,canv.width, canv.height);
    sprite.drawImage(crushSprite.image,crushSprite.width * crushSprite.currentFrame,0, crushSprite.width, crushSprite.height, 0,0,canv.width, canv.height);
}

function InitSliders(){
    Object.entries(AllSliders).forEach(([id,slider]) =>{
        slider.func(slider.init);
        setSliderPosition(id,slider.init);
    });

}

function ResetSliders(){
       Object.entries(AllSliders).forEach(([id,slider]) =>{
        let dial = document.getElementById(id);
        if(id == "filter"){
            console.log(dial._norm);

        }
        let norm = (dial && dial._norm != null) ? dial._norm : slider.init;
        setSliderPosition(id,norm);
    });

}

function InitWaves(){
    ChangeCarrierWaveform(SynthSettings.Carrier);
    ChangeModWaveform(SynthSettings.Modulator);
}

function InitADSR(){
    let container = document.querySelector(".adsr");
    let rect = container.getBoundingClientRect();

    let handleW = baseHandle.getBoundingClientRect().width;
    let handleH = baseHandle.getBoundingClientRect().height;

    let areaW = rect.width;
    let areaH = rect.height;

    let attackNorm = (attack - 0.01) / 3.0;
    attackHandle.style.left = iDenormalize(attackNorm, 0, areaW - handleW * 2) + "px";
    attackHandle.style.top = "0px";

    let decayNorm = (decay - 0.1) / (3.0 - 1.0);
    let sustainY = (1.0 - sustain);

    decayHandle.style.left = iDenormalize(decayNorm, attackHandle.offsetLeft, areaW - handleW) + "px";
    decayHandle.style.top = iDenormalize(sustainY, 0, areaH - handleH) + "px";

    let releaseNorm = (release - 0.05) / 3.0;
    releaseHandle.style.left = iDenormalize(releaseNorm, decayHandle.offsetLeft, areaW - handleW) + "px";
    releaseHandle.style.top = (areaH - handleH + "px");

    baseHandle.style.left = "0px"
    baseHandle.style.top = (areaH - handleH) + "px";

    DrawEnvelope();
}

function ChangeCarrierWaveform(wave){
    //allows both a string or html element to be passed in
    let target = (typeof wave == 'string') ? carrierWaveGlyphs[wave] : wave;
    if(target == null) return;
    lastCarrierWave.firstElementChild.style.display = "none"
    currentCarrierWave = target;
    Parameters.setCarrierWave(currentCarrierWave.id);
    target.firstElementChild.style.display = "block"
    lastCarrierWave = target;
}

function ChangeModWaveform(wave){
    let target = (typeof wave == 'string') ? modWaveGlyphs[wave] : wave;
    if(target == null) return;
    lastModWave.firstElementChild.style.display = "none"
    currentModWave = target;
    Parameters.setModulatorWave(currentModWave.id);
    target.firstElementChild.style.display = "block"
    lastModWave = target;
}

let knobStart = 0;
let ksNorm = 0;

function ChangeSliderValue(event, dial){
    dragging = true;
    currentDial = dial;
    xOffset = event.clientX - currentDial.getBoundingClientRect().left;

    if(dial.className == "knob"){
        knobStart = event.clientX;
        ksNorm = dial._norm || 0;
    }

    if(dial.className == "spriteSlider"){
        knobStart = event.clientY;
        ksNorm = dial._norm || 0;
    }

    event.preventDefault();
}

document.addEventListener("mousemove", (e) => {
    if(!dragging || !currentDial) return;

    if(currentDial.className == "knob"){
        let delta = knobStart - e.clientX;
        let range = 200;

        let norm = Math.max(0, Math.min(1, ksNorm + (delta / range)));

        currentDial._norm = norm;

        let deg = norm * 270;

        currentDial.style.transform = `rotate(${-deg}deg)`;
        
        if(AllSliders[currentDial.id]){
            AllSliders[currentDial.id].func(1.0 - norm);
        }

        return;
    } 

    if(currentDial.className == "spriteSlider"){
        console.log("sprite!");
        let delta = knobStart - e.clientY;
        let range = 100;

        let norm = Math.max(0, Math.min(1, ksNorm + (delta / range)));

        currentDial._norm = norm;

        if(currentDial.id == "feedback"){
            setFeedbackFrame(norm);
            if(AllSliders[currentDial.id]){
            AllSliders[currentDial.id].func(norm);
        }
        }

        if(currentDial.id == "bitcrush"){
            setCrushFrame(1.0 - norm);
        if(AllSliders[currentDial.id]){
            AllSliders[currentDial.id].func(1.0 - norm);
        }
        }
        return;
    }

    if(currentDial.className == "adsrHandle"){
        let container = currentDial.closest(".adsr");
        let rect = container.getBoundingClientRect();

        var width = currentDial.offsetWidth;
        var height = currentDial.offsetHeight;

        let translateX = (e.clientX - rect.left) - (width * 0.5);
        let translateY = (e.clientY - rect.top) - (height * 0.5);

        translateX = Math.max(0, Math.min(rect.width - width, translateX));
        translateY = Math.max(0,Math.min(rect.height - height, translateY));

        if(currentDial.id == "attack"){
            translateX = Math.min(translateX, decayHandle.offsetLeft);
            let norm = iNormalize(translateX, 0, rect.width - width * 2);

            attack = (norm * 3.0) + 0.01;

        }
        else if(currentDial.id == "decay"){
            translateX = Math.max(translateX, attackHandle.offsetLeft);
            translateX = Math.min(translateX, releaseHandle.offsetLeft);
            currentDial.style.top = translateY + "px";

            let normx = iNormalize(translateX, attackHandle.offsetLeft, rect.width - width);
            let normy = iNormalize(translateY, 0, rect.height - height);

            decay = (normx * (3.0 - 0.1)) + 0.1;

            sustain = 1.0 - normy;

        }
        else if(currentDial.id == "release"){
            translateX = Math.max(translateX, decayHandle.offsetLeft);
            
            let norm = iNormalize(translateX, decayHandle.offsetLeft, rect.width - width)

            console.log(norm);

            release = (norm * 3.0) + 0.05;
        }
        
        currentDial.style.left = translateX + "px";
        DrawEnvelope();

    }

    if(currentDial.className == "sliderDial"){

        currentSlider = currentDial.closest(".sliderBody");

        var rect = currentSlider.getBoundingClientRect();
        var dialWidth = currentDial.offsetWidth;

        let translate = e.clientX - rect.left - xOffset;

        let minX = 10;
        let maxX = rect.width - dialWidth - 10;

        translate = Math.max(minX, Math.min(maxX, translate));
        
        currentDial.style.left = translate + "px";
        
        let sliderValue = iNormalize(translate, minX, maxX);

        currentDial._norm = sliderValue;

        if(AllSliders[currentDial.id]){
            AllSliders[currentDial.id].func(sliderValue);
        }
    }

})

document.addEventListener("mouseup", () => {
    dragging = false;
    currentDial = null;
    currentSlider = null;
})

//horizontal slider
    //background image decides mouse x and y collider
    //slider/fill image is is cropped based on mouse x when dragging or when clicked
    //handle image is positioned based on mouse x when dragging or clicked

//#endregion

//#region Functions

//ensure canvas/aspect ratio fits to screen 
function resize(){
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight

    if(gl != null){
        gl.viewport(0,0,canvas.width,canvas.height);
    }

    let adsrCanvas = document.getElementById("adsrCanvas");
    let adsrRect = adsrCanvas.getBoundingClientRect();
    adsrCanvas.width = adsrRect.width;
    adsrCanvas.height = adsrRect.height;

    DrawEnvelope();
    
}

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        InitADSR();
        ResetSliders();
    }, 150);
});

function GetRandomFloat(min, max){
    let range = max - min;
    return Math.random() * range + min;
}

function iNormalize(input, min, max){
    return ((input - min) / (max - min));
}

function iDenormalize(input, min, max){
    return min + input * (max - min);
}


function iLerp(a, b, t){
    return a * (1.0 - t) + b * t;
}

function Increment(dur, target){
    const starttime = performance.now();

    function update(time){
        
        let elapsed = time - starttime;
        
        const t = Math.min(elapsed / dur,1);

        let easeOut = t * (2.0 - t * t * t);
        let easeIn = t * t * t;

        increment += target * 0.0015;

        incValue = iLerp(incValue,increment,easeOut);

        if(t < 1){
            requestAnimationFrame(update)
        }
    }
    requestAnimationFrame(update);
}

function Envelope(dur, attack){
    const starttime = performance.now();
    const attacktime = attack * dur;

    function update(time){
        
        let elapsed = time - starttime;
        
        const t = Math.min(elapsed / dur, 1);

        if(elapsed < attacktime)
        {
            const a = elapsed / attacktime;
            envValue = iLerp(envValue, 1, a);
        }

        else
        {
            const decayTime = elapsed - attacktime;
            const decayDur = dur - elapsed || 1;
            const d = Math.min(decayTime / decayDur, 1);
            const easeOut = d * d * d;
            envValue = iLerp(1, 0, d);
        }

        // console.log("current value: " + envValue);  

        if(t < 1){
            requestAnimationFrame(update)
        }
        else{
            envValue = 0.0;
        }
    }
    requestAnimationFrame(update);
}

function MidiToFreq(note){
    let freq;

    freq = Math.pow(2,(note - 69)/12) * 440;

    return freq
}

//#endregion

document.addEventListener('DOMContentLoaded', main);
window.addEventListener("load", () =>{
    InitInterface();
})

//https://www.youtube.com/watch?v=1bj7g6sXit8


