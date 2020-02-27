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


module.exports = {
  template: '#video-template',


  ready: function () {
    Vue.nextTick(this.resize);
    window.addEventListener('resize', this.resize, false);
  },


  methods: {
    reload: function () {this.$els.img.src = '/api/video?' + Math.random()},


    resize: function () {
      var width = this.$els.video.clientWidth;
      var height = this.$els.video.clientHeight;
      var aspect = 480 / 640; // TODO should probably not be hard coded

      if (!width) return;

      width = Math.min(width, height / aspect);
      height = Math.min(height, width * aspect);

      this.$els.img.style.width = width + 'px';
      this.$els.img.style.height = height + 'px';
    }
  }
}
