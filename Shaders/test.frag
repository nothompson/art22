   
   void frag(out vec4 fragColor, in vec2 fragCoord)
   {
    vec2 uv = vUV;
    float speed = 3.0;
    vec2 dir = vec2(-1.0,1.0);
    vec2 scale = vec2(10.0,10.0);
    float gain = 0.75;

    vec3 color = vec3(iEnv);

    vec4 sig = vec4(color,1.0);

    fragColor = sig;
   }

   void main(){
    frag(gl_FragColor, gl_FragCoord.xy);
   }