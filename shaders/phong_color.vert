#version 300 es

precision highp float;

in vec3 vertex_position;
in vec3 vertex_normal;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 frag_pos;
out vec3 frag_normal;

void main() {
    gl_Position = projection_matrix * view_matrix * model_matrix * vec4(vertex_position, 1.0);
    
    //finding world position of the current vertex
    vec4 vertex_world_position = view_matrix*model_matrix * vec4(vertex_position,1.0);
    
    //casting to a vector 3 to get xyz coordinates
    vec3 normalized_pos = vec3(vertex_world_position);
    
    //normalizing and sending the fragment
    frag_normal = normalize(normalized_pos);
    
    //normalizing the vertex normal
    frag_normal = normalize(vertex_normal);
}
