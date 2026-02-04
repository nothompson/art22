

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
            freq *= 1.0;
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


    void frag(out vec4 fragColor, in vec2 fragCoord){
        vec2 uv = vUV;

        float speed = 0.1;
        vec2 dir = vec2(-1.0,1.0);
        vec2 scale = vec2(2.0);

        //output values from nested fbm
        vec2 q; vec2 r; vec2 p; vec2 g;

        float warp1 = abs(dualWarp(uv * scale, 0.9, q, r));

        float warp2 = fbm(vec2(dualWarp(uv * scale, 0.9, p, g),dualWarp(uv * scale, 0.1, p, g)),0.5);

        float gain = 5.0;

        float min = 0.0;
        vec3 col = vec3(uv.x * abs(iRands.x) + 0.1,uv.y * abs(iRands.y) + 0.1, 0.5 * abs(iRands.z) + 0.1);


        col += min;

        col *= warp1 * gain;

        vec4 sig = vec4(col,1.0);

        fragColor = sig;
    }

    void main(){
        frag(gl_FragColor, gl_FragCoord.xy);
    }