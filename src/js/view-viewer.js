/******************************************************************************\

                 This file is part of the Buildbotics firmware.

                   Copyright (c) 2015 - 2018, Buildbotics LLC
                              All rights reserved.

      This file ("the software") is free software: you can redistribute it
      and/or modify it under the terms of the GNU General Public License,
       version 2 as published by the Free Software Foundation. You should
       have received a copy of the GNU General Public License, version 2
      along with the software. If not, see <http://www.gnu.org/licenses/>.

      The software is distributed in the hope that it will be useful, but
           WITHOUT ANY WARRANTY; without even the implied warranty of
       MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
                Lesser General Public License for more details.

        You should have received a copy of the GNU Lesser General Public
                 License along with the software.  If not, see
                        <http://www.gnu.org/licenses/>.

                 For information regarding this software email:
                   "Joseph Coffland" <joseph@buildbotics.com>

\******************************************************************************/

'use strict'

var api    = require('./api');
var cookie = require('./cookie');
var util   = require('./util');


module.exports = {
  template: '#view-viewer-template',
  props: ['config', 'template', 'state'],


  data: function () {
    return {
      loading: false,
      retry: 0,
      path: undefined,
      toolpath: {},
      progress: 0,
      snaps: 'angled top bottom front back left right'.split(' ')
    }
  },


  components: {
    'viewer-help-dialog': require('./viewer-help-dialog'),
    'path-viewer':        require('./path-viewer')
  },


  computed: {
    filename: function () {return util.display_path(this.path)},


    show: function () {
      if (this.$refs.viewer == undefined) return {};
      return this.$refs.viewer.show;
    }
  },


  watch: {
    'state.queued': function () {
      if (!this.path && this.state.queued) this.load(this.state.queued);
    }
  },


  attached: function () {
    var path = cookie.get('selected-path');
    if (!path) path = this.state.queued;
    this.load(path)
  },


  methods: {
    _load: function (path) {
      this.loading = true;

      api.get('path/' + path).done(function (toolpath) {
        if (path != this.path) return;
        this.retry = 0;

        if (toolpath.progress == undefined) {
          toolpath.path = path;
          this.progress = 1;
          this.toolpath = toolpath;
          this.loading = false;

        } else {
          this._load(path); // Try again
          this.progress = toolpath.progress;
        }

      }.bind(this)).fail(function (error, xhr) {
        if (xhr.status == 404) {
          this.loading = false;
          this.$root.api_error('', error);
          return
        }

        if (++this.retry < 10)
          setTimeout(function () {this._load(path)}.bind(this), 5000);
        else {
          this.loading = false;
          this.$root.api_error('3D view loading failed', error);
        }
      }.bind(this))
    },


    load: function(path) {
      if (!path || this.path == path) return;

      cookie.set('selected-path', path)
      this.path = path;
      this.progress = 0;
      this.toolpath = {};
      this.$refs.viewer.clear();

      if (path) this._load(path);
    },


    open: function () {
      this.$root.file_dialog({
        callback: function (path) {this.load(path)}.bind(this),
        dir: util.dirname(this.path)
      })
    },


    toggle: function (name) {this.$refs.viewer.toggle(name)},
    snap: function (view) {this.$refs.viewer.snap(view)}
  }
}
