#version 300 es

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;
in vec2 frag_texcoord;

uniform int nums_light;
uniform vec3 light_ambient;
uniform vec3 light_position[10];
uniform vec3 light_color[10];
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n
uniform sampler2D image;          // use in conjunction with Ka and Kd

out vec4 FragColor;

void main() {
    
    vec3 ambient;
    vec3 diffuse = vec3(0.0, 0.0, 0.0);
    vec3 specular = vec3(0.0, 0.0, 0.0);
        
    for (int i = 0; i < nums_light; i++) {
        // N.L
        vec3 lightDirection = normalize(light_position[i] - frag_pos);
        float N_dot_L = clamp(dot(frag_normal, lightDirection), 0.0, 1.0);
        
        // R
        vec3 reflectedLightDirection = normalize(reflect(-lightDirection, frag_normal));
        
        // V
        vec3 viewDirection = normalize(camera_position - frag_pos);
        
        diffuse = diffuse + light_color[i] * N_dot_L;
        specular = specular + light_color[i] * pow(clamp(dot(reflectedLightDirection, viewDirection), 0.0, 1.0), material_shininess);
    }
    
    diffuse = min(diffuse,1.0);
    specular = min(specular,1.0);
    
    vec3 fragMaterial = material_color * texture(image, frag_texcoord).rgb;
    FragColor =  vec4((ambient * fragMaterial), 1.0) + vec4((diffuse * fragMaterial), 1.0) + vec4((specular * material_specular), 1.0);
}
