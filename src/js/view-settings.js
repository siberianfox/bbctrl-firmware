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


var api = require('./api');


module.exports = {
  template: '#view-settings-template',
  props: ['config', 'template', 'state'],


  data: function () {
    return {
      index: -1,
      view: undefined,
      modified: false
    }
  },


  components: {
    'settings-not-found': {template: '<h2>Settings page not found</h2>'},
    'settings-general':   require('./settings-general'),
    'settings-motor':     require('./settings-motor'),
    'settings-tool':      require('./settings-tool'),
    'settings-io':        require('./settings-io'),
    'settings-network':   require('./settings-network'),
    'settings-admin':     require('./settings-admin')
  },


  events: {
    'config-changed': function () {
      this.modified = true;
      return false;
    },


    'input-changed': function() {
      this.$dispatch('config-changed');
      return false;
    }
  },


  ready: function () {
    $(window).on('hashchange', this.parse_hash);
    this.parse_hash();
  },


  methods: {
    parse_hash: function () {
      var hash = location.hash.substr(1);

      if (!hash.trim().length) {
        location.hash = 'settings:general';
        return;
      }

      var parts = hash.split(':');
      var view = parts.length == 1 ? 'general' : parts[1];

      if (parts.length == 3) this.index = parts[2];

      if (typeof this.$options.components['settings-' + view] == 'undefined')
        this.view = 'not-found';

      else this.view = view;
    },


    save: function () {
      api.put('config/save', this.config).done(function (data) {
        this.modified = false;
      }.bind(this)).fail(function (error) {
        this.api_error('Save failed', error);
      }.bind(this));
    }
  }
}
