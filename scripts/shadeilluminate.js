class GlApp {
    constructor(canvas_id, width, height, scene) {
        this.canvas = document.getElementById(canvas_id);
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) {
            alert('Unable to initialize WebGL 2. Your browser may not support it.');
        }

        this.scene = scene;
        this.algorithm = 'gouraud'
        this.shader = {gouraud_color: null, gouraud_texture: null,
                       phong_color: null,   phong_texture: null};
        this.vertex_position_attrib = 0;
        this.vertex_normal_attrib = 1;
        this.vertex_texcoord_attrib = 2;

        this.projection_matrix = glMatrix.mat4.create();
        this.view_matrix = glMatrix.mat4.create();
        this.model_matrix = glMatrix.mat4.create();

        this.vertex_array = {plane: null, cube: null, sphere: null};

        let gouraud_color_vs = this.GetFile('shaders/gouraud_color.vert');
        let gouraud_color_fs = this.GetFile('shaders/gouraud_color.frag');
        let gouraud_texture_vs = this.GetFile('shaders/gouraud_texture.vert');
        let gouraud_texture_fs = this.GetFile('shaders/gouraud_texture.frag');
        let phong_color_vs = this.GetFile('shaders/phong_color.vert');
        let phong_color_fs = this.GetFile('shaders/phong_color.frag');
        let phong_texture_vs = this.GetFile('shaders/phong_texture.vert');
        let phong_texture_fs = this.GetFile('shaders/phong_texture.frag');
        let emissive_vs = this.GetFile('shaders/emissive.vert');
        let emissive_fs = this.GetFile('shaders/emissive.frag');

        Promise.all([gouraud_color_vs, gouraud_color_fs, gouraud_texture_vs, gouraud_texture_fs,
                     phong_color_vs, phong_color_fs, phong_texture_vs, phong_texture_fs,
                     emissive_vs, emissive_fs])
        .then((shaders) => this.LoadShaders(shaders))
        .catch((error) => this.GetFileError(error));
    }

    InitializeGlApp() {
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        this.gl.clearColor(0.8, 0.8, 0.8, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.vertex_array.plane = CreatePlaneVao(this);
        this.vertex_array.cube = CreateCubeVao(this);
        this.vertex_array.sphere = CreateSphereVao(this);

        let fov = 45.0 * (Math.PI / 180.0);
        let aspect = this.canvas.width / this.canvas.height;
        glMatrix.mat4.perspective(this.projection_matrix, fov, aspect, 1.0, 50.0);
        
        let cam_pos = this.scene.camera.position;
        let cam_target = glMatrix.vec3.create();
        let cam_up = this.scene.camera.up;
        glMatrix.vec3.add(cam_target, cam_pos, this.scene.camera.direction);
        glMatrix.mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        this.Render();
    }

    InitializeTexture(image_url) {
        // create a texture, and upload a temporary 1px white RGBA array [255,255,255,255]
		var white =  [255,255,255,255];
		let texture = this.gl.createTexture();
		this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0,this.gl.RGBA, 1, 1, 0,this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(white));
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);

        // load the actual image
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', (event) => {
            this.UpdateTexture(texture, image);
        }, false);
        image.src = image_url;
        
        return texture;
    }

    UpdateTexture(texture, image_element) {
		
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA,this.gl.UNSIGNED_BYTE, image_element);
		this.gl.generateMipmap(this.gl.TEXTURE_2D);
		this.gl.bindTexture(this.gl.TEXTURE_2D, null);
		this.Render();
    }

    Render() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // draw all models --> note you need to properly select shader here
        for (let i = 0; i < this.scene.models.length; i ++) {
			
            this.gl.useProgram(this.shader[this.algorithm + "_" + this.scene.models[i].shader].program);

            glMatrix.mat4.identity(this.model_matrix);
            glMatrix.mat4.translate(this.model_matrix, this.model_matrix, this.scene.models[i].center);
            glMatrix.mat4.scale(this.model_matrix, this.model_matrix, this.scene.models[i].size);
			
            // material_shininess, n
            this.gl.uniform1f(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.shininess, this.scene.models[i].material.shininess);
            // material_color, Ka and Kd
            this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.material_col, this.scene.models[i].material.color);
            // material_specular, Ks
            this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.material_spec, this.scene.models[i].material.specular);
            // model_matrix
            this.gl.uniformMatrix4fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.model, false, this.model_matrix);
            // view_matrix
            this.gl.uniformMatrix4fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.view, false, this.view_matrix);
            // projection_matrix
            this.gl.uniformMatrix4fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.projection, false, this.projection_matrix);
            // camera_position
            this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.camera_pos, this.scene.camera.position);
            // light_ambient
            this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.light_ambient, this.scene.light.ambient);
            // nums of light
            this.gl.uniform1i(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.nums_light, this.scene.light.point_lights.length);
            
            for (let j = 0; j < this.scene.light.point_lights.length; j++) {
                // light_position
                this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.light_pos[j], this.scene.light.point_lights[j].position);
                // light_color
                this.gl.uniform3fv(this.shader[this.algorithm + "_" + this.scene.models[i].shader].uniform.light_col[j], this.scene.light.point_lights[j].color);
            }
            
            if (this.scene.models[i].shader === "texture") {
                // texture_scale
                this.gl.uniform2fv(this.shader[this.algorithm + "_texture"].uniform.tex_scale, this.scene.models[i].texture.scale);
                // image
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.scene.models[i].texture.id);
                this.gl.uniform1i(this.shader[this.algorithm + '_texture'].uniform.image, 0);
				
            }
			
			
            this.gl.bindVertexArray(this.vertex_array[this.scene.models[i].type]);
            this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array[this.scene.models[i].type].face_index_count, this.gl.UNSIGNED_SHORT, 0);
            this.gl.bindVertexArray(null);
        }

        // draw all light sources
        for (let i = 0; i < this.scene.light.point_lights.length; i ++) {
            this.gl.useProgram(this.shader['emissive'].program);

            glMatrix.mat4.identity(this.model_matrix);
            glMatrix.mat4.translate(this.model_matrix, this.model_matrix, this.scene.light.point_lights[i].position);
            glMatrix.mat4.scale(this.model_matrix, this.model_matrix, glMatrix.vec3.fromValues(0.1, 0.1, 0.1));


            this.gl.uniform3fv(this.shader['emissive'].uniform.material_col, this.scene.light.point_lights[i].color);
            this.gl.uniformMatrix4fv(this.shader['emissive'].uniform.projection, false, this.projection_matrix);
            this.gl.uniformMatrix4fv(this.shader['emissive'].uniform.view, false, this.view_matrix);
            this.gl.uniformMatrix4fv(this.shader['emissive'].uniform.model, false, this.model_matrix);

            this.gl.bindVertexArray(this.vertex_array['sphere']);
            this.gl.drawElements(this.gl.TRIANGLES, this.vertex_array['sphere'].face_index_count, this.gl.UNSIGNED_SHORT, 0);
            this.gl.bindVertexArray(null);
        }
    }

    UpdateScene(scene) {
        this.scene = scene;
        
        let cam_pos = this.scene.camera.position;
        let cam_target = glMatrix.vec3.create();
        let cam_up = this.scene.camera.up;
        glMatrix.vec3.add(cam_target, cam_pos, this.scene.camera.direction);
        glMatrix.mat4.lookAt(this.view_matrix, cam_pos, cam_target, cam_up);

        this.Render();
    }

    SetShadingAlgorithm(algorithm) {
        this.algorithm = algorithm;
        this.Render();
    }

    GetFile(url) {
        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();
            req.onreadystatechange = function() {
                if (req.readyState === 4 && req.status === 200) {
                    resolve(req.response);
                }
                else if (req.readyState === 4) {
                    reject({url: req.responseURL, status: req.status});
                }
            };
            req.open('GET', url, true);
            req.send();
        });
    }

    GetFileError(error) {
        console.log('Error:', error);
    }

    LoadShaders(shaders) {
        this.LoadColorShader(shaders[0], shaders[1], 'gouraud_color');
        this.LoadTextureShader(shaders[2], shaders[3], 'gouraud_texture');
        this.LoadColorShader(shaders[4], shaders[5], 'phong_color');
        this.LoadTextureShader(shaders[6], shaders[7], 'phong_texture');
        this.LoadEmissiveShader(shaders[8], shaders[9], 'emissive');

        this.InitializeGlApp();
    }

    LoadColorShader(vs_source, fs_source, program_name) {
        let vertex_shader = this.CompileShader(vs_source, this.gl.VERTEX_SHADER);
        let fragment_shader = this.CompileShader(fs_source, this.gl.FRAGMENT_SHADER);

        let program = this.CreateShaderProgram(vertex_shader, fragment_shader);

        this.gl.bindAttribLocation(program, this.vertex_position_attrib, 'vertex_position');
        this.gl.bindAttribLocation(program, this.vertex_normal_attrib, 'vertex_normal');
        this.gl.bindAttribLocation(program, 0, 'FragColor');

        this.LinkShaderProgram(program);

        let light_ambient_uniform = this.gl.getUniformLocation(program, 'light_ambient');
        
		let light_pos_uniform_0 = this.gl.getUniformLocation(program, 'light_position[0]');
        let light_pos_uniform_1 = this.gl.getUniformLocation(program, 'light_position[1]');
        let light_pos_uniform_2 = this.gl.getUniformLocation(program, 'light_position[2]');
        let light_pos_uniform_3 = this.gl.getUniformLocation(program, 'light_position[3]');
        let light_pos_uniform_4 = this.gl.getUniformLocation(program, 'light_position[4]');
        let light_pos_uniform_5 = this.gl.getUniformLocation(program, 'light_position[5]');
        let light_pos_uniform_6 = this.gl.getUniformLocation(program, 'light_position[6]');
        let light_pos_uniform_7 = this.gl.getUniformLocation(program, 'light_position[7]');
        let light_pos_uniform_8 = this.gl.getUniformLocation(program, 'light_position[8]');
        let light_pos_uniform_9 = this.gl.getUniformLocation(program, 'light_position[9]');
        
        let light_col_uniform_0 = this.gl.getUniformLocation(program, 'light_color[0]');
        let light_col_uniform_1 = this.gl.getUniformLocation(program, 'light_color[1]');
        let light_col_uniform_2 = this.gl.getUniformLocation(program, 'light_color[2]');
        let light_col_uniform_3 = this.gl.getUniformLocation(program, 'light_color[3]');
        let light_col_uniform_4 = this.gl.getUniformLocation(program, 'light_color[4]');
        let light_col_uniform_5 = this.gl.getUniformLocation(program, 'light_color[5]');
        let light_col_uniform_6 = this.gl.getUniformLocation(program, 'light_color[6]');
        let light_col_uniform_7 = this.gl.getUniformLocation(program, 'light_color[7]');
        let light_col_uniform_8 = this.gl.getUniformLocation(program, 'light_color[8]');
        let light_col_uniform_9 = this.gl.getUniformLocation(program, 'light_color[9]');
        
        let camera_pos_uniform = this.gl.getUniformLocation(program, 'camera_position');
        let material_col_uniform = this.gl.getUniformLocation(program, 'material_color');
        let material_spec_uniform = this.gl.getUniformLocation(program, 'material_specular');
        let shininess_uniform = this.gl.getUniformLocation(program, 'material_shininess');
        let projection_uniform = this.gl.getUniformLocation(program, 'projection_matrix');
        let view_uniform = this.gl.getUniformLocation(program, 'view_matrix');
        let model_uniform = this.gl.getUniformLocation(program, 'model_matrix');
        let nums_light_uniform = this.gl.getUniformLocation(program, 'nums_light');

        this.shader[program_name] = {
            program: program,
            uniform: {
				light_ambient: light_ambient_uniform,
                light_pos: [light_pos_uniform_0,
                            light_pos_uniform_1,
                            light_pos_uniform_2,
                            light_pos_uniform_3,
                            light_pos_uniform_4,
                            light_pos_uniform_5,
                            light_pos_uniform_6,
                            light_pos_uniform_7,
                            light_pos_uniform_8,
                            light_pos_uniform_9],
                light_col: [light_col_uniform_0,
                            light_col_uniform_1,
                            light_col_uniform_2,
                            light_col_uniform_3,
                            light_col_uniform_4,
                            light_col_uniform_5,
                            light_col_uniform_6,
                            light_col_uniform_7,
                            light_col_uniform_8,
                            light_col_uniform_9],
                camera_pos: camera_pos_uniform,
                material_col: material_col_uniform,
                material_spec: material_spec_uniform,
                shininess: shininess_uniform,
                projection: projection_uniform,
                view: view_uniform,
                model: model_uniform,
                nums_light: nums_light_uniform
            }
        };
    }

    LoadTextureShader(vs_source, fs_source, program_name) {
        let vertex_shader = this.CompileShader(vs_source, this.gl.VERTEX_SHADER);
        let fragment_shader = this.CompileShader(fs_source, this.gl.FRAGMENT_SHADER);

        let program = this.CreateShaderProgram(vertex_shader, fragment_shader);

        this.gl.bindAttribLocation(program, this.vertex_position_attrib, 'vertex_position');
        this.gl.bindAttribLocation(program, this.vertex_normal_attrib, 'vertex_normal');
        this.gl.bindAttribLocation(program, this.vertex_texcoord_attrib, 'vertex_texcoord');
        this.gl.bindAttribLocation(program, 0, 'FragColor');

        this.LinkShaderProgram(program);

		let light_ambient_uniform = this.gl.getUniformLocation(program, 'light_ambient');
        
        let light_pos_uniform_0 = this.gl.getUniformLocation(program, 'light_position[0]');
        let light_pos_uniform_1 = this.gl.getUniformLocation(program, 'light_position[1]');
        let light_pos_uniform_2 = this.gl.getUniformLocation(program, 'light_position[2]');
        let light_pos_uniform_3 = this.gl.getUniformLocation(program, 'light_position[3]');
        let light_pos_uniform_4 = this.gl.getUniformLocation(program, 'light_position[4]');
        let light_pos_uniform_5 = this.gl.getUniformLocation(program, 'light_position[5]');
        let light_pos_uniform_6 = this.gl.getUniformLocation(program, 'light_position[6]');
        let light_pos_uniform_7 = this.gl.getUniformLocation(program, 'light_position[7]');
        let light_pos_uniform_8 = this.gl.getUniformLocation(program, 'light_position[8]');
        let light_pos_uniform_9 = this.gl.getUniformLocation(program, 'light_position[9]');
        
        let light_col_uniform_0 = this.gl.getUniformLocation(program, 'light_color[0]');
        let light_col_uniform_1 = this.gl.getUniformLocation(program, 'light_color[1]');
        let light_col_uniform_2 = this.gl.getUniformLocation(program, 'light_color[2]');
        let light_col_uniform_3 = this.gl.getUniformLocation(program, 'light_color[3]');
        let light_col_uniform_4 = this.gl.getUniformLocation(program, 'light_color[4]');
        let light_col_uniform_5 = this.gl.getUniformLocation(program, 'light_color[5]');
        let light_col_uniform_6 = this.gl.getUniformLocation(program, 'light_color[6]');
        let light_col_uniform_7 = this.gl.getUniformLocation(program, 'light_color[7]');
        let light_col_uniform_8 = this.gl.getUniformLocation(program, 'light_color[8]');
        let light_col_uniform_9 = this.gl.getUniformLocation(program, 'light_color[9]');
        
        let camera_pos_uniform = this.gl.getUniformLocation(program, 'camera_position');
        let material_col_uniform = this.gl.getUniformLocation(program, 'material_color');
        let material_spec_uniform = this.gl.getUniformLocation(program, 'material_specular');
        let tex_scale_uniform = this.gl.getUniformLocation(program, 'texture_scale');
        let image_uniform = this.gl.getUniformLocation(program, 'image');
        let shininess_uniform = this.gl.getUniformLocation(program, 'material_shininess');
        let projection_uniform = this.gl.getUniformLocation(program, 'projection_matrix');
        let view_uniform = this.gl.getUniformLocation(program, 'view_matrix');
        let model_uniform = this.gl.getUniformLocation(program, 'model_matrix');
        let nums_light_uniform = this.gl.getUniformLocation(program, 'nums_light');

        this.shader[program_name] = {
            program: program,
            uniform: {
				light_ambient: light_ambient_uniform,
                light_pos: [light_pos_uniform_0,
                            light_pos_uniform_1,
                            light_pos_uniform_2,
                            light_pos_uniform_3,
                            light_pos_uniform_4,
                            light_pos_uniform_5,
                            light_pos_uniform_6,
                            light_pos_uniform_7,
                            light_pos_uniform_8,
                            light_pos_uniform_9],
                light_col: [light_col_uniform_0,
                            light_col_uniform_1,
                            light_col_uniform_2,
                            light_col_uniform_3,
                            light_col_uniform_4,
                            light_col_uniform_5,
                            light_col_uniform_6,
                            light_col_uniform_7,
                            light_col_uniform_8,
                            light_col_uniform_9],
                camera_pos: camera_pos_uniform,
                material_col: material_col_uniform,
                material_spec: material_spec_uniform,
                tex_scale: tex_scale_uniform,
                image: image_uniform,
                shininess: shininess_uniform,
                projection: projection_uniform,
                view: view_uniform,
                model: model_uniform,
                nums_light: nums_light_uniform
            }
        };
    }

    LoadEmissiveShader(vs_source, fs_source, program_name) {
        let vertex_shader = this.CompileShader(vs_source, this.gl.VERTEX_SHADER);
        let fragment_shader = this.CompileShader(fs_source, this.gl.FRAGMENT_SHADER);

        let program = this.CreateShaderProgram(vertex_shader, fragment_shader);

        this.gl.bindAttribLocation(program, this.vertex_position_attrib, 'vertex_position');
        this.gl.bindAttribLocation(program, 0, 'FragColor');

        this.LinkShaderProgram(program);

        let material_col_uniform = this.gl.getUniformLocation(program, 'material_color');
        let projection_uniform = this.gl.getUniformLocation(program, 'projection_matrix');
        let view_uniform = this.gl.getUniformLocation(program, 'view_matrix');
        let model_uniform = this.gl.getUniformLocation(program, 'model_matrix');

        this.shader[program_name] = {
            program: program,
            uniform: {
                material_col: material_col_uniform,
                projection: projection_uniform,
                view: view_uniform,
                model: model_uniform
            }
        };
    }

    CompileShader(source, type) {
        // Create a shader object
        let shader = this.gl.createShader(type);

        // Send the source to the shader object
        this.gl.shaderSource(shader, source);

        // Compile the shader program
        this.gl.compileShader(shader);

        // Check to see if it compiled successfully
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shader: ' + this.gl.getShaderInfoLog(shader));
        }

        return shader;
    }

    CreateShaderProgram(vertex_shader, fragment_shader) {
        let program = this.gl.createProgram();
        this.gl.attachShader(program, vertex_shader);
        this.gl.attachShader(program, fragment_shader);

        return program;
    }

    LinkShaderProgram(program) {
        this.gl.linkProgram(program);

        // Check to see if it linked successfully
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            alert('An error occurred linking the shader program.');
        }
    }
}
