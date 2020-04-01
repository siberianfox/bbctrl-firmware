/******************************************************************************\

                    Copyright 2018. Buildbotics LLC
                              All Rights Reserved.

                  For information regarding this software email:
                                 Joseph Coffland
                              joseph@buildbotics.com

        This software is free software: you clan redistribute it and/or
        modify it under the terms of the GNU Lesser General Public License
        as published by the Free Software Foundation, either version 2.1 of
        the License, or (at your option) any later version.

        This software is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
        Lesser General Public License for more details.

        You should have received a copy of the GNU Lesser General Public
        License along with the C! library.  If not, see
        <http://www.gnu.org/licenses/>.

\******************************************************************************/

'use strict'

var orbit  = require('./orbit');
var cookie = require('./cookie');
var api    = require('./api');
var font   = require('./helvetiker_regular.typeface.json')


function get(obj, name, defaultValue) {
  return typeof obj[name] == 'undefined' ? defaultValue : obj[name];
}


function sizeOf(obj) {
  obj.geometry.computeBoundingBox();
  return obj.geometry.boundingBox.getSize(new THREE.Vector3());
}


var surfaceModes = ['cut', 'wire', 'solid', 'off'];


module.exports = {
  template: '#path-viewer-template',
  props: ['toolpath', 'state', 'config'],


  data: function () {
    return {
      enabled: false,
      loading: false,
      dirty: true,
      snapView: cookie.get('snap-view', 'angled'),
      surfaceMode: 'cut',
      axes: {},
      show: {
        path: cookie.get_bool('show-path', true),
        tool: cookie.get_bool('show-tool', true),
        bbox: cookie.get_bool('show-bbox', true),
        axes: cookie.get_bool('show-axes', true),
        grid: cookie.get_bool('show-grid', true),
        dims: cookie.get_bool('show-dims', true),
        intensity: cookie.get_bool('show-intensity', false)
      }
    }
  },


  computed: {
    target: function () {return $(this.$el).find('.path-viewer-content')[0]},


    metric: function () {
      return this.config.settings.units.toLowerCase() == 'metric';
    },


    envelope: function () {
      if (!this.axes.homed || !this.enabled) return undefined;

      var min = new THREE.Vector3();
      var max = new THREE.Vector3();

      for (var axis of 'xyz') {
        min[axis] = this[axis].min - this[axis].off;
        max[axis] = this[axis].max - this[axis].off;
      }

      return new THREE.Box3(min, max);
    }
  },


  watch: {
    toolpath: function () {Vue.nextTick(this.update)},
    envelope: function () {Vue.nextTick(this.redraw)},
    metric: function () {Vue.nextTick(this.redraw)},
    surfaceMode: function (mode) {this.update_surface_mode(mode)},

    x: function () {this.axis_changed()},
    y: function () {this.axis_changed()},
    z: function () {this.axis_changed()}
  },


  ready: function () {
    this.graphics();
    Vue.nextTick(this.update);
  },


  methods: {
    setShow: function (name, show) {
      this.show[name] = show;
      cookie.set_bool('show-' + name, show);

      if (name == 'path')      this.pathView.visible = show;
      if (name == 'tool')      this.toolView.visible = show;
      if (name == 'axes')      this.axesView.visible = show;
      if (name == 'grid')      this.gridView.visible = show;
      if (name == 'dims')      this.dimsView.visible = show;
      if (name == 'intensity') Vue.nextTick(this.redraw)
      this.render_frame();
    },


    getShow: function (name) {return this.show[name]},
    toggle: function (name) {this.setShow(name, !this.getShow(name))},


    clear: function () {
      this.scene = new THREE.Scene();
      if (this.renderer != undefined) this.render_frame();
    },


    redraw: function () {
      if (!this.enabled || this.loading) return;
      this.scene = new THREE.Scene();
      this.draw(this.scene);
    },


    update: function () {
      if (!this.toolpath.path && !this.loading) {
        this.loading = true;
        this.dirty = true;
      }

      if (!this.enabled || !this.toolpath.path) return;

      var path = this.toolpath.path;
      var d1 = api.download('positions/' + path, 'arraybuffer');
      var d2 = api.download('speeds/' + path, 'arraybuffer');

      $.when(d1, d2).done(function (positions, speeds) {
        this.positions = new Float32Array(positions[0]);
        this.speeds = new Float32Array(speeds[0]);
        this.loading = false;
        this.redraw();
        this.snap(this.snapView);
        this.update_view();
      }.bind(this))
    },


    update_surface_mode: function (mode) {
      if (!this.enabled) return;

      if (typeof this.surfaceMaterial != 'undefined') {
        this.surfaceMaterial.wireframe = mode == 'wire';
        this.surfaceMaterial.needsUpdate = true;
      }

      this.set_visible(this.surfaceMesh, mode == 'cut' || mode == 'wire');
      this.set_visible(this.workpieceMesh, mode == 'solid');
    },


    load_surface: function (surface) {
      if (typeof surface == 'undefined') {
        this.vertices = undefined;
        this.normals = undefined;
        return;
      }

      this.vertices = surface.vertices;

      // Expand normals
      this.normals = [];
      for (var i = 0; i < surface.normals.length / 3; i++)
        for (var j = 0; j < 3; j++)
          for (var k = 0; k < 3; k++)
            this.normals.push(surface.normals[i * 3 + k]);
    },


    set_visible: function (target, visible) {
      if (typeof target != 'undefined') target.visible = visible;
      this.dirty = true;
    },


    get_dims: function () {
      var t = $(this.target);
      var width = t.innerWidth();
      var height = t.innerHeight();
      return {width: width, height: height};
    },


    update_view: function () {
      if (!this.enabled) return;
      var dims = this.get_dims();

      this.camera.aspect = dims.width / dims.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(dims.width, dims.height);
      this.dirty = true;
    },


    update_tool: function (tool) {
      if (!this.enabled) return;
      if (typeof tool == 'undefined') tool = this.toolView;
      if (typeof tool == 'undefined') return;
      tool.position.x = this.x.pos;
      tool.position.y = this.y.pos;
      tool.position.z = this.z.pos;
    },


    axis_changed: function () {
      if (!this.enabled) return;
      this.update_tool();
      this.dirty = true;
    },


    graphics: function () {
      try {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0, 0);
        this.target.appendChild(this.renderer.domElement);

      } catch (e) {
        console.log('WebGL not supported: ', e);
        return;
      }
      this.enabled = true;

      // Camera
      this.camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);
      this.camera.up.set(0, 0, 1);

      // Lighting
      this.ambient = new THREE.AmbientLight(0xffffff, 0.5);

      var keyLight = new THREE.DirectionalLight
      (new THREE.Color('hsl(30, 100%, 75%)'), 0.75);
      keyLight.position.set(-100, 0, 100);

      var fillLight = new THREE.DirectionalLight
      (new THREE.Color('hsl(240, 100%, 75%)'), 0.25);
      fillLight.position.set(100, 0, 100);

      var backLight = new THREE.DirectionalLight(0xffffff, 0.5);
      backLight.position.set(100, 0, -100).normalize();

      this.lights = new THREE.Group();
      this.lights.add(keyLight);
      this.lights.add(fillLight);
      this.lights.add(backLight);

      // Surface material
      this.surfaceMaterial = this.create_surface_material();

      // Controls
      this.controls =
        new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.2;
      this.controls.rotateSpeed = 0.5;

      // Move lights with scene
      this.controls.addEventListener('change', function (scope) {
        return function () {
          keyLight.position.copy(scope.camera.position);
          fillLight.position.copy(scope.camera.position);
          backLight.position.copy(scope.camera.position);
          keyLight.lookAt(scope.controls.target);
          fillLight.lookAt(scope.controls.target);
          backLight.lookAt(scope.controls.target);
          scope.dirty = true;
        }
      }(this))

      // Events
      window.addEventListener('resize', this.update_view, false);

      // Start it
      this.render();
    },


    create_surface_material: function () {
      return new THREE.MeshPhongMaterial({
        specular: 0x111111,
        shininess: 10,
        side: THREE.FrontSide,
        color: 0x0c2d53
      });
    },


    draw_workpiece: function (scene, material) {
      if (typeof this.workpiece == 'undefined') return undefined;

      var min = this.workpiece.min;
      var max = this.workpiece.max;

      min = new THREE.Vector3(min[0], min[1], min[2]);
      max = new THREE.Vector3(max[0], max[1], max[2]);
      var dims = max.clone().sub(min);

      var geometry = new THREE.BoxGeometry(dims.x, dims.y, dims.z)
      var mesh = new THREE.Mesh(geometry, material);

      var offset = dims.clone();
      offset.divideScalar(2);
      offset.add(min);

      mesh.position.add(offset);

      geometry.computeBoundingBox();

      scene.add(mesh);

      return mesh;
    },


    draw_surface: function (scene, material) {
      if (typeof this.vertices == 'undefined') return;

      var geometry = new THREE.BufferGeometry();

      geometry.addAttribute
      ('position', new THREE.Float32BufferAttribute(this.vertices, 3));
      geometry.addAttribute
      ('normal', new THREE.Float32BufferAttribute(this.normals, 3));

      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();

      return new THREE.Mesh(geometry, material);
    },


    draw_tool: function (scene, bbox) {
      // Tool size is relative to bounds
      var size = bbox.getSize(new THREE.Vector3());
      var length = (size.x + size.y + size.z) / 24;

      if (length < 1) length = 1;

      var material = new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: 0.75,
        specular: 0x161616,
        shininess: 10,
        color: 0xffa500 // Orange
      });

      var geometry = new THREE.CylinderGeometry(length / 2, 0, length, 128);
      geometry.translate(0, length / 2, 0);
      geometry.rotateX(0.5 * Math.PI);

      var mesh = new THREE.Mesh(geometry, material);
      this.update_tool(mesh);
      mesh.visible = this.show.tool;
      scene.add(mesh);
      return mesh;
    },


    draw_axis: function (axis, up, length, radius) {
      var color;

      if (axis == 0)      color = 0xff0000; // Red
      else if (axis == 1) color = 0x00ff00; // Green
      else if (axis == 2) color = 0x0000ff; // Blue

      var group = new THREE.Group();
      var material = new THREE.MeshPhongMaterial({
          specular: 0x161616, shininess: 10, color: color
      });
      var geometry = new THREE.CylinderGeometry(radius, radius, length, 128);
      geometry.translate(0, -length / 2, 0);
      group.add(new THREE.Mesh(geometry, material));

      geometry = new THREE.CylinderGeometry(1.5 * radius, 0, 2 * radius, 128);
      geometry.translate(0, -length - radius, 0);
      group.add(new THREE.Mesh(geometry, material));

      if (axis == 0)      group.rotateZ((up ? 0.5 : 1.5) * Math.PI);
      else if (axis == 1) group.rotateX((up ? 0   : 1  ) * Math.PI);
      else if (axis == 2) group.rotateX((up ? 1.5 : 0.5) * Math.PI);

      return group;
    },


    draw_axes: function (scene, bbox) {
      var size = bbox.getSize(new THREE.Vector3());
      var length = (size.x + size.y + size.z) / 3;
      length /= 10;

      if (length < 1) length = 1;

      var radius = length / 20;

      var group = new THREE.Group();

      for (var axis = 0; axis < 3; axis++)
        for (var up = 0; up < 2; up++)
          group.add(this.draw_axis(axis, up, length, radius));

      group.visible = this.show.axes;
      scene.add(group);

      return group;
    },


    draw_grid: function (scene, bbox) {
      // Grid size is relative to bounds
      var size = bbox.getSize(new THREE.Vector3());
      size = Math.max(size.x, size.y) * 16;
      var step = this.metric ? 10 : 25.4;
      var divs = Math.ceil(size / step);
      size = divs * step;

      var material = new THREE.MeshPhongMaterial({
        shininess: 0,
        specular: 0,
        color: 0,
        opacity: 0.2,
        transparent: true
      });

      var grid = new THREE.GridHelper(size, divs);
      grid.material = material;
      grid.rotation.x = Math.PI / 2;

      scene.add(grid);

      return grid;
    },


    draw_text: function (text, size, color) {
      var geometry = new THREE.TextGeometry(text, {
        font: new THREE.Font(font),
        size: size,
        height: 0.001,
        curveSegments: 12,
        bevelEnabled: false
      });

      var material = new THREE.MeshBasicMaterial({color: color});

      return new THREE.Mesh(geometry, material);
    },


    format_dim(dim) {
      if (!this.metric) dim /= 25.4;
      return dim.toFixed(1) + (this.metric ? ' mm' : ' in');
    },


    draw_box_dims: function (bounds, color) {
      var group = new THREE.Group();

      var dims = bounds.getSize(new THREE.Vector3());
      var size = Math.max(dims.x, dims.y, dims.z) / 40;

      var xDim = this.draw_text(this.format_dim(dims.x), size, color);
      xDim.position.x = bounds.min.x + (dims.x - sizeOf(xDim).x) / 2;
      xDim.position.y = bounds.max.y + size;
      xDim.position.z = bounds.max.z;
      group.add(xDim);

      var yDim = this.draw_text(this.format_dim(dims.y), size, color);
      yDim.position.x = bounds.max.x + size;
      yDim.position.y = bounds.min.y + (dims.y + sizeOf(yDim).x) / 2;
      yDim.position.z = bounds.max.z;
      yDim.rotateZ(-Math.PI / 2);
      group.add(yDim);

      var zDim = this.draw_text(this.format_dim(dims.z), size, color);
      zDim.position.x = bounds.max.x + size;
      zDim.position.y = bounds.max.y
      zDim.position.z = bounds.min.z + (dims.z - sizeOf(zDim).y) / 2;
      zDim.rotateX(Math.PI / 2);
      group.add(zDim);

      var material = new THREE.LineBasicMaterial({
        linewidth: 2,
        color: color,
        opacity: 0.4,
        transparent: true
      });

      var box = new THREE.Box3Helper(bounds);
      box.material = material;
      group.add(box);

      return group;
    },


    draw_dims: function (scene, bbox) {
      var group = new THREE.Group();
      group.visible = this.show.dims;
      scene.add(group);

      // Bounds
      group.add(this.draw_box_dims(bbox, 0x0c2d53));

      // Envelope
      if (this.envelope)
        group.add(this.draw_box_dims(this.envelope, 0x00f7ff));

      return group;
    },


    get_color: function (speed) {
      if (isNaN(speed)) return [255, 0, 0]; // Rapid

      var intensity = speed / this.toolpath.maxSpeed;
      if (typeof speed == 'undefined' || !this.show.intensity) intensity = 1;
      return [0, 255 * intensity, 127 * (1 - intensity)];
    },


    draw_path: function (scene) {
      var geometry = new THREE.BufferGeometry();
      var material =
          new THREE.LineBasicMaterial({
            vertexColors: THREE.VertexColors,
            linewidth: 1.5
          });

      var positions = new THREE.Float32BufferAttribute(this.positions, 3);
      geometry.addAttribute('position', positions);

      var colors = [];
      for (var i = 0; i < this.speeds.length; i++) {
        var color = this.get_color(this.speeds[i]);
        Array.prototype.push.apply(colors, color);
      }

      colors = new THREE.Uint8BufferAttribute(colors, 3, true);
      geometry.addAttribute('color', colors);

      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();

      var line = new THREE.Line(geometry, material);

      line.visible = this.show.path;
      scene.add(line);

      return line;
    },


    draw: function (scene) {
      // Lights
      scene.add(this.ambient);
      scene.add(this.lights);

      // Model
      this.pathView      = this.draw_path(scene);
      this.surfaceMesh   = this.draw_surface(scene, this.surfaceMaterial);
      this.workpieceMesh = this.draw_workpiece(scene, this.surfaceMaterial);
      this.update_surface_mode(this.surfaceMode);

      // Compute bounding box
      var bbox = this.get_model_bounds();

      // Tool, axes & bounds
      this.toolView     = this.draw_tool(scene, bbox);
      this.axesView     = this.draw_axes(scene, bbox);
      this.gridView     = this.draw_grid(scene, bbox);
      this.dimsView     = this.draw_dims(scene, bbox);
    },


    render_frame: function () {this.renderer.render(this.scene, this.camera)},


    render: function () {
      window.requestAnimationFrame(this.render);
      if (typeof this.scene == 'undefined') return;

      if (this.controls.update() || this.dirty) {
        this.dirty = false;
        this.render_frame();
      }
    },


    get_model_bounds: function () {
      var bbox = undefined;

      function add(o) {
        if (typeof o != 'undefined') {
          var oBBox = new THREE.Box3();
          oBBox.setFromObject(o);
          if (bbox == undefined) bbox = oBBox;
          else bbox.union(oBBox);
        }
      }

      add(this.pathView);
      add(this.surfaceMesh);
      add(this.workpieceMesh);

      return bbox;
    },


    snap: function (view) {
      if (this.loading) return;
      if (view != this.snapView) {
        this.snapView = view;
        cookie.set('snap-view', view);
      }

      var bbox = this.get_model_bounds();
      var corners = [
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
        new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
      ]

      this.controls.reset();
      bbox.getCenter(this.controls.target);
      this.update_view();

      // Compute new camera position
      var center = bbox.getCenter(new THREE.Vector3());
      var offset = new THREE.Vector3();

      if (view == 'angled') {offset.y -= 1; offset.z += 1;}
      if (view == 'front')  offset.y -= 1;
      if (view == 'back')   offset.y += 1;
      if (view == 'left')   {offset.x -= 1; offset.z += 0.0001;}
      if (view == 'right')  {offset.x += 1; offset.z += 0.0001;}
      if (view == 'top')    offset.z += 1;
      if (view == 'bottom') offset.z -= 1;
      offset.normalize();

      // Initial camera position
      var position = center.clone().add(offset);
      this.camera.position.copy(position);
      this.camera.lookAt(center); // Get correct camera orientation

      var theta = this.camera.fov / 180 * Math.PI; // View angle
      var cameraLine = new THREE.Line3(center, position);
      var cameraUp = new THREE.Vector3().copy(this.camera.up)
          .applyQuaternion(this.camera.quaternion);
      var cameraLeft =
          new THREE.Vector3().copy(offset).cross(cameraUp).normalize();

      var dist = this.camera.near; // Min camera dist

      for (var i = 0; i < corners.length; i++) {
        // Project on to camera line
        var p1 = cameraLine
            .closestPointToPoint(corners[i], false, new THREE.Vector3());

        // Compute distance from projection to center
        var d = p1.distanceTo(center);
        if (cameraLine.closestPointToPointParameter(p1, false) < 0) d = -d;

        // Compute up line
        var up =
            new THREE.Line3(p1, new THREE.Vector3().copy(p1).add(cameraUp));

        // Project on to up line
        var p2 = up.closestPointToPoint(corners[i], false, new THREE.Vector3());

        // Compute length
        var l = p1.distanceTo(p2);

        // Update min camera distance
        dist = Math.max(dist, d + l / Math.tan(theta / 2) / this.camera.aspect);

        // Compute left line
        var left =
            new THREE.Line3(p1, new THREE.Vector3().copy(p1).add(cameraLeft));

        // Project on to left line
        var p3 =
            left.closestPointToPoint(corners[i], false, new THREE.Vector3());

        // Compute length
        l = p1.distanceTo(p3);

        // Update min camera distance
        dist = Math.max(dist, d + l / Math.tan(theta / 2));
      }

      this.camera.position.copy(offset.multiplyScalar(dist * 1.2).add(center));
    }
  },


  mixins: [require('./axis-vars')]
}
