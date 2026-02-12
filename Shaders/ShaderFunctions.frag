    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform float iValue;
    uniform vec4 iRands;
    uniform sampler2D iChrome;
    uniform sampler2D iTexture;

    varying vec2 vUV;
    
    int randomOctave(in float x)
    {
        return int(floor(x));
    }

    float random(in vec2 x)
    {
        return fract(sin(dot(x.xy, vec2(abs(iRands.x) + 1.0,abs(iRands.y) + 1.0))) *12394.1123450334);
    }
    
    vec2 hash(in vec2 x)
    {
        vec2 k = vec2(abs(iRands.x) + 1.12324905,abs(iRands.y) + 1.12324905);
        // vec2 k = vec2(1.985924124,1.12398585910);

        x = x*k + k.yx;
        return -1.0 + 2.0 * fract(0.025 * k * (x.x*x.y *(x.x + x.y)));
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
