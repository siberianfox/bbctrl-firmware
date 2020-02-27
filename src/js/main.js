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

'use strict';


var cookie = require('./cookie');
var util   = require('./util');


function ui() {
  var layout   = document.getElementById('layout');
  var menu     = document.getElementById('menu');
  var menuLink = document.getElementById('menuLink');

  menuLink.onclick = function (e) {
    e.preventDefault();
    layout.classList.toggle('active');
    menu.classList.toggle('active');
    menuLink.classList.toggle('active');
  }

  menu.onclick = function (e) {
    layout.classList.remove('active');
    menu.classList.remove('active');
    menuLink.classList.remove('active');
  }
}


$(function() {
  ui();

  if (typeof cookie.get('client-id') == 'undefined')
    cookie.set('client-id', util.uuid());

  // Vue debugging
  Vue.config.debug = true;

  // CodeMirror GCode mode
  require('./cm-gcode');

  // Register global components
  Vue.component('templated-input', require('./templated-input'));
  Vue.component('message',         require('./message'));
  Vue.component('loading-message', require('./loading-message'));
  Vue.component('dialog',          require('./dialog'));
  Vue.component('indicators',      require('./indicators'));
  Vue.component('io-indicator',    require('./io-indicator'));
  Vue.component('console',         require('./console'));
  Vue.component('unit-value',      require('./unit-value'));
  Vue.component('files',           require('./files'));
  Vue.component('file-dialog',     require('./file-dialog'));
  Vue.component('nav-menu',        require('./nav-menu'));
  Vue.component('nav-item',        require('./nav-item'));
  Vue.component('video',           require('./video'));

  require('./filters')();

  // Vue app
  require('./app');
});
