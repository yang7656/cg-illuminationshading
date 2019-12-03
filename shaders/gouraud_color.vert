#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform int num_lights;
uniform vec3 light_ambient;
//uniform vec3 light_position;
uniform vec3 light_position[10];
uniform vec3 light_color;
uniform vec3 camera_position;
uniform float material_shininess; // n
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;

void main() {
    //http://www.shaderific.com/glsl-functions list of all glsl functions
    //https://gist.github.com/patriciogonzalezvivo/986341af1560138dde52 list of glsl math help/functions

    //??
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);    

    //finding world position of the current vertex
    vec4 vertex_world_position = model_matrix * vec4(vertex_position,1.0);
    
    //normalizing the vertex normal
    vec3 normalizedVNormal = normalize(vertex_normal);
    
    //direction of the normal of the camera to the obeject (normalized)
    vec3 viewDirection = normalize(camera_position - vec3(vertex_world_position));
    
    //--specular--
    float specularIntensity = 0.0;
    float diffuseIntensity = 0.0;
    for (int i=0; i<num_lights; i++) {
        //-direction of the normal of the light to the object (normalized)
        vec3 lightDirection = normalize(light_position[i] - vec3(vertex_world_position));
        
        //this gives the reflected normal over the vertex_normal
        vec3 reflectedLightDirection = reflect(-lightDirection, normalizedVNormal);
        
        //finds the angle of the reflected light and the view direction normals, cant be negative. raised to N
        specularIntensity += pow(max(dot(reflectedLightDirection, viewDirection), 0.0), material_shininess);
        
        //--diffuse--
           
        //-need to change the name of this. this is the angle of the light normal and lightDirection. clamped to 0, 1
        diffuseIntensity += clamp(dot(normalizedVNormal,lightDirection),0.0, 1.0);
        
       
    }
    
    //Ip * (R dot V)^n
    specular = vec3(light_color * (specularIntensity));
    //Ip * (N dot L)
    diffuse = vec3(diffuseIntensity*light_color);
    //pushing the ambient directly. this maybe needs an intesity added? mult by .1 or something
    ambient = light_ambient;
}
