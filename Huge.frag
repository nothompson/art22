
    //what we see

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