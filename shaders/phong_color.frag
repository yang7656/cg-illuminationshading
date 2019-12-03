#version 300 es

precision mediump float;

in vec3 frag_pos;
in vec3 frag_normal;

uniform vec3 light_ambient;
uniform vec3 light_position;
uniform vec3 light_color;
uniform vec3 camera_position;
uniform vec3 material_color;      // Ka and Kd
uniform vec3 material_specular;   // Ks
uniform float material_shininess; // n

out vec4 FragColor;

void main() {
    
    //--specular--
    //-direction of the normal of the light to the object (normalized)
    vec3 lightDirection = normalize(light_position - frag_pos);
    
    //direction of the normal of the camera to the obeject (normalized)
    vec3 viewDirection = normalize(camera_position - frag_pos);
    
    //this gives the reflected normal over the vertex_normal
    vec3 reflectedLightDirection = reflect(-lightDirection, frag_normal);
    
    //finds the angle of the reflected light and the view direction normals, cant be nagative. raised to N
    float specularIntensity = pow(max(dot(reflectedLightDirection, viewDirection), 0.0), material_shininess);
    
    //Ip * (R dot V)^n
    vec3 specular = vec3(light_color * specularIntensity);

    //--diffuse--
       
    //-need to change the name of this. this is the angle of the light normal and lightDirection. clamped to 0, 1
    float n_dot_l = clamp(dot(frag_normal,lightDirection),0.0, 1.0);
    
    //-this will hold it to 0.0 if it is negative
    float diffuseIntensity = max(n_dot_l, 0.0);
    
    //Ip * Kd (N dot L)
    vec3 diffuse = vec3(diffuseIntensity*light_color);
    
    //pushing the ambient directly. this maybe needs an intesity added? mult by .1 or something

    vec3 multiplied_specular = specular * material_specular;
    vec3 mult = (light_ambient + diffuse) * material_color + multiplied_specular;
    FragColor = vec4(mult, 1.0);
}
