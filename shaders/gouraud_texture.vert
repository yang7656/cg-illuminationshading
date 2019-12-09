#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;
in vec2 vertex_texcoord;

uniform int nums_light;
uniform vec3 light_ambient;
uniform vec3 light_position[10];
uniform vec3 light_color[10];
uniform vec3 camera_position;
uniform float material_shininess;
uniform vec2 texture_scale;
uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 ambient;
out vec3 diffuse;
out vec3 specular;
out vec2 frag_texcoord;

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);
    frag_texcoord = vertex_texcoord * texture_scale;
    
    // N
	vec3 scaling = inverse(transpose(mat3(model_matrix))) * vertex_normal;
	vec3 surfaceNormal = normalize(scaling);
	
	// L
	vec3 vertex_world_position = vec3(model_matrix * vec4(vertex_position,1.0));
    
    diffuse = vec3(0.0, 0.0, 0.0);
    specular = vec3(0.0, 0.0, 0.0);
    
    for (int i = 0; i < nums_light; i++) {
        vec3 lightDirection = normalize(light_position[i] - vertex_world_position);
        
        // R
        vec3 reflectedLightDirection = normalize(reflect(-lightDirection, surfaceNormal));
        
        // V
        vec3 viewDirection = normalize(camera_position - vertex_world_position);
        
        diffuse = diffuse + light_color[i] * clamp(dot(surfaceNormal, lightDirection), 0.0, 1.0);
        specular = specular + light_color[i] * pow(clamp(dot(reflectedLightDirection, viewDirection), 0.0, 1.0), material_shininess);
    }
    
    ambient = light_ambient;
    diffuse = min(diffuse, 1.0);
    specular = min(specular, 1.0);
}
