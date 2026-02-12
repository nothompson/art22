

    #define numOctaves 4
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
            value += gradientNoise(freq * x).x * amplitude;

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
            fbm(p + vec2(fbm(vec2(iTime * iRands.w * 0.01 + iValue * iRands.w * 0.1,iTime * iRands.z * 0.01 + iValue * iRands.z * 0.1),H),fbm(vec2(iTime * iRands.y * 0.01 + iValue * iRands.y * 0.1,iTime * iRands.x * 0.01 + iValue * iRands.x * 0.1),H)), H);

        q.y = 
            fbm(p + vec2(fbm(vec2(iTime * iRands.x * 0.01 + iValue * iRands.x * 0.1,iTime * iRands.y * 0.01 + iValue * iRands.y * 0.1),H),fbm(vec2(iTime * iRands.z * 0.01 + iValue * iRands.z * 0.1,iTime * iRands.w * 0.01 + iValue * iRands.w * 0.1),H)), H);

        r.x = 
            fbm(p + vec2(0.0 + iTime,0.0 - iTime) + q + iValue * 0.1, H);

        r.y = 
            fbm(p + vec2(0.0 - iTime,0.0 + iTime) + q + iValue * 0.1, H);
        
        float sig = 
            fbm(p + r + sin(iValue),H);
        
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


    void frag(out vec4 fragColor, in vec2 fragCoord){
        vec2 uv = vUV;

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

        float basicDualWarp = dualWarp(uv, 0.5 + (abs(sin(iValue)) * 0.25), q, r);

        float basicWarp = warp(uv,0.9);

        float texGain = 0.5;
        float gain = 1.0;

        vec2 warpedUV = uv * basicDualWarp;
        
        float basicVoronoi = smoothVoronoi(uv * 1.0);

        float min = 0.0;
        vec3 col = vec3(0.9,0.75,1.0);

        // col *= basicDualWarp * abs(sin(iTime) * fbm(uv,0.5));    
        col += min;

        vec4 chrome = texture2D(iChrome,warpedUV);

        vec4 tex = texture2D(iTexture, warpedUV);

        vec4 fragCol = vec4(col,1.0);

        vec4 sig = mix(chrome,tex, basicVoronoi * 0.5);
        // sig = mix(sig, fragCol, abs(sin(iTime) * fbm(uv,0.1)));

        fragColor = sig;
    }

    void main(){
        frag(gl_FragColor, gl_FragCoord.xy);
    }