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
var Sock   = require('./sock');


function compare_versions(a, b) {
    var reStripTrailingZeros = /(\.0+)+$/;
    var segsA = a.replace(reStripTrailingZeros, '').split('.');
    var segsB = b.replace(reStripTrailingZeros, '').split('.');
    var l = Math.min(segsA.length, segsB.length);

    for (var i = 0; i < l; i++) {
      var diff = parseInt(segsA[i], 10) - parseInt(segsB[i], 10);
      if (diff) return diff;
    }

    return segsA.length - segsB.length;
}


function is_object(o) {return o !== null && typeof o == 'object'}
function is_array(o) {return Array.isArray(o)}


function update_array(dst, src) {
  while (dst.length) dst.pop()
  for (var i = 0; i < src.length; i++)
    Vue.set(dst, i, src[i]);
}


function update_object(dst, src, remove) {
  var props, index, key, value;

  if (remove) {
    props = Object.getOwnPropertyNames(dst);

    for (index in props) {
      key = props[index];
      if (!src.hasOwnProperty(key))
        Vue.delete(dst, key);
    }
  }

  props = Object.getOwnPropertyNames(src);
  for (index in props) {
    key = props[index];
    value = src[key];

    if (is_array(value) && dst.hasOwnProperty(key) && is_array(dst[key]))
      update_array(dst[key], value);

    else if (is_object(value) && dst.hasOwnProperty(key) && is_object(dst[key]))
      update_object(dst[key], value, remove);

    else Vue.set(dst, key, value);
  }
}


module.exports = new Vue({
  el: 'body',


  data: function () {
    return {
      status: 'connecting',
      currentView: 'loading',
      template: require('../resources/config-template.json'),
      config: {
        settings: {units: 'METRIC'},
        motors: [{}, {}, {}, {}],
        version: '<loading>'
      },
      state: {messages: []},
      crosshair: cookie.get_bool('crosshair', false),
      errorTimeout: 30,
      errorTimeoutStart: 0,
      errorMessage: '',
      checkedUpgrade: false,
      latestVersion: '',
      showError: false
    }
  },


  components: {
    'estop':          {template: '#estop-template'},
    'view-not-found': {template: '<h1>Error: View not found</h1>'},
    'view-loading':   {template: '<h1>Loading...</h1>'},
    'view-control':   require('./view-control'),
    'view-viewer':    require('./view-viewer'),
    'view-editor':    require('./view-editor'),
    'view-settings':  require('./view-settings'),
    'view-files':     require('./view-files'),
    'view-camera':    {template: '#view-camera-template'},
    'view-help':      {template: '#view-help-template'},
    'view-cheat-sheet': {
      template: '#view-cheat-sheet-template',
      data: function () {return {showUnimplemented: false}}
    }
  },


  watch: {
    crosshair: function () {cookie.set_bool('crosshair', this.crosshair)}
  },


  events: {
    'hostname-changed': function (hostname) {this.hostname = hostname},


    send: function (msg) {
      if (this.status == 'connected') {
        console.debug('>', msg);
        this.sock.send(msg);
      }
    },


    connected: function () {this.update()},
    update: function () {this.update()},


    check: function (show_message) {
      this.latestVersion = '';

      $.ajax({
        type: 'GET',
        url: 'https://buildbotics.com/bbctrl/latest.txt',
        data: {hid: this.state.hid},
        cache: false

      }).done(function (data) {
        this.latestVersion = data;
        if (!show_message) return;
        var cmp = compare_versions(this.config.version, this.latestVersion);

        var msg;
        if (cmp == 0) msg = 'You have the latest official firmware.'
        else {
          msg = 'Your firmware is ' + (cmp < 0 ? 'older': 'newer') +
            ' than the latest official firmware release, version' +
            this.latestVersion + '.'

          if (cmp < 0) msg += ' Please upgrade.';
        }

        this.open_dialog({
          icon: cmp ? (cmp < 0 ? 'chevron-left' : 'chevron-right') : 'check',
          title: 'Firmware check',
          body: msg
        })

      }.bind(this))
    },


    error: function (msg) {
      // Honor user error blocking
      if (Date.now() - this.errorTimeoutStart < this.errorTimeout * 1000)
        return;

      // Wait at least 1 sec to pop up repeated errors
      if (1 < msg.repeat && Date.now() - msg.ts < 1000) return;

      // Popup error dialog
      this.showError = true;
      this.errorMessage = msg.msg;
    }
  },


  computed: {
    popupMessages: function () {
      var msgs = [];

      for (var i = 0; i < this.state.messages.length; i++) {
        var text = this.state.messages[i].text;
        if (!/^#/.test(text)) msgs.push(text);
      }

      return msgs;
    },


    show_upgrade: function () {
      if (!this.latestVersion) return false;
      return compare_versions(this.config.version, this.latestVersion) < 0;
    }
  },


  ready: function () {
    $(window).on('hashchange', this.parse_hash);
    this.connect();
  },


  methods: {
    metric: function () {return this.config.settings.units != 'IMPERIAL'},


    block_error_dialog: function () {
      this.errorTimeoutStart = Date.now();
      this.showError = false;
    },


    estop: function () {
      if (this.state.xx == 'ESTOPPED') api.put('clear');
      else api.put('estop');
    },


    update: function () {
      api.get('config/load').done(function (config) {
        update_object(this.config, config, true);
        this.parse_hash();

        if (!this.checkedUpgrade) {
          this.checkedUpgrade = true;

          var check = this.config.admin['auto-check-upgrade'];
          if (typeof check == 'undefined' || check)
            this.$emit('check');
        }
      }.bind(this))
    },


    connect: function () {
      this.sock = new Sock('//' + window.location.host + '/sockjs');

      this.sock.onmessage = function (e) {
        if (typeof e.data != 'object') return;

        if ('log' in e.data) {
          this.$broadcast('log', e.data.log);
          delete e.data.log;
        }

        // Check for session ID change on controller
        if ('sid' in e.data) {
          if (typeof this.sid == 'undefined') this.sid = e.data.sid;

          else if (this.sid != e.data.sid) {
            if (typeof this.hostname != 'undefined' &&
                String(location.hostname) != 'localhost')
              location.hostname = this.hostname;
            location.reload(true);
          }
        }

        update_object(this.state, e.data, false);
        this.$broadcast('update');

      }.bind(this)

      this.sock.onopen = function (e) {
        this.status = 'connected';
        this.$emit(this.status);
        this.$broadcast(this.status);
      }.bind(this)

      this.sock.onclose = function (e) {
        this.status = 'disconnected';
        this.$emit(this.status);
        this.$broadcast(this.status);
      }.bind(this)
    },


    parse_hash: function () {
      var hash = location.hash.substr(1);

      if (!hash.trim().length) {
        location.hash = 'control';
        return;
      }

      var parts = hash.split(':');

      if (typeof this.$options.components['view-' + parts[0]] == 'undefined')
        this.currentView = 'not-found';

      else this.currentView = parts[0];
    },


    close_messages: function (action) {
      if (action == 'stop') api.put('stop');
      if (action == 'continue') api.put('unpause');

      // Acknowledge messages
      if (this.state.messages.length) {
        var id = this.state.messages.slice(-1)[0].id
        api.put('message/' + id + '/ack');
      }
    },


    file_dialog: function (config) {this.$refs.fileDialog.open(config)},
    open_dialog: function (config) {this.$refs.dialog.open(config)},
    error_dialog:   function (msg) {this.$refs.dialog.error(msg)},
    warning_dialog: function (msg) {this.$refs.dialog.warning(msg)},
    success_dialog: function (msg) {this.$refs.dialog.success(msg)},


    api_error: function (msg, error) {
      if (typeof error != 'undefined') {
        if (typeof error.message != 'undefined')
          msg += '\n' + error.message;
        else msg += '\n' + JSON.stringify(error);
      }

      this.error_dialog(msg);
    },


    run: function (path) {
      if (this.state.xx != 'READY') return;

      api.put('queue/' + path).done(function () {
        location.hash = 'control';
        api.put('start');
      })
    },


    edit: function (path) {
      cookie.set('selected-path', path);
      location.hash = 'editor';
    },


    view: function (path) {
      cookie.set('selected-path', path);
      location.hash = 'viewer';
    }
  }
})
