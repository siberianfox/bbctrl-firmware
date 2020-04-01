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

var api  = require('./api');
var util = require('./util');


module.exports = {
  template: '#view-control-template',
  props: ['config', 'template', 'state'],


  data: function () {
    return {
      mach_units: 'METRIC',
      mdi: '',
      axes: 'xyzabc',
      history: [],
      speed_override: 1,
      feed_override: 1,
      manual_home: {x: false, y: false, z: false, a: false, b: false, c: false},
      position_msg:
      {x: false, y: false, z: false, a: false, b: false, c: false},
      axis_position: 0,
      jog_adjust: 100,
      tab: 'auto',
      highlighted_line: 0
    }
  },


  components: {
    'axis-control': require('./axis-control')
  },


  watch: {
    'state.imperial': {
      handler: function (imperial) {
        this.mach_units = imperial ? 'IMPERIAL' : 'METRIC';
      },
      immediate: true
    },


    mach_units: function (units) {
      if ((units == 'METRIC') != this.metric)
        this.send(units == 'METRIC' ? 'G21' : 'G20');
    },


    'state.line': function () {
      if (this.mach_state != 'HOMING') this.highlight_gcode();
    },


    'state.queued_modified': function () {this.load(this.state.queued)}
  },


  computed: {
    filename: function () {return util.display_path(this.state.queued)},
    metric: function () {return !this.state.imperial},


    mach_state: function () {
      var cycle = this.state.cycle;
      var state = this.state.xx;

      if (typeof cycle != 'undefined' && state != 'ESTOPPED' &&
          (cycle == 'jogging' || cycle == 'homing'))
        return cycle.toUpperCase();
      return state || ''
    },


    pause_reason: function () {return this.state.pr},


    is_running: function () {
      return this.mach_state == 'RUNNING' || this.mach_state == 'HOMING';
    },


    is_stopping: function () {return this.mach_state == 'STOPPING'},
    is_holding: function () {return this.mach_state == 'HOLDING'},
    is_ready: function () {return this.mach_state == 'READY'},
    is_idle: function () {return this.state.cycle == 'idle'},


    is_paused: function () {
      return this.is_holding &&
        (this.pause_reason == 'User pause' ||
         this.pause_reason == 'Program pause')
    },


    can_mdi: function () {return this.is_idle || this.state.cycle == 'mdi'},


    can_set_axis: function () {
      return this.is_idle
      // TODO allow setting axis position during pause
      return this.is_idle || this.is_paused
    },


    message: function () {
      if (this.mach_state == 'ESTOPPED') return this.state.er;
      if (this.mach_state == 'HOLDING') return this.state.pr;
      if (this.state.messages.length)
        return this.state.messages.slice(-1)[0].text;
      return '';
    },


    highlight_state: function () {
      return this.mach_state == 'ESTOPPED' || this.mach_state == 'HOLDING';
    },


    total_time: function () {return this.state.queued_time},
    plan_time: function () {return this.state.plan_time},


    remaining: function () {
      if (!(this.is_stopping || this.is_running || this.is_holding)) return 0;
      if (this.total_time < this.plan_time) return 0;
      return this.total_time - this.plan_time
    },


    eta: function () {
      if (this.mach_state != 'RUNNING') return '';
      var d = new Date();
      d.setSeconds(d.getSeconds() + this.remaining);
      return d.toLocaleString();
    },


    simulating: function () {
      return 0 < this.state.queued_progress && this.state.queued_progress < 1
    },


    progress: function () {
      if (this.simulating) return this.state.queued_progress;

      if (!this.total_time || this.is_ready) return 0;
      var p = this.plan_time / this.total_time;
      return p < 1 ? p : 1;
    }
  },


  events: {
    jog: function (axis, power) {
      var data = {ts: new Date().getTime()};
      data[axis] = power;
      api.put('jog', data);
    }
  },


  ready: function () {
    this.editor = CodeMirror.fromTextArea(this.$els.gcodeView, {
      readOnly: true,
      lineNumbers: true,
      mode: 'gcode'
    })

    this.editor.on('scrollCursorIntoView', this.on_scroll);

    this.load(this.state.queued)
  },


  methods: {
    send: function (msg) {this.$dispatch('send', msg)},
    on_scroll: function (cm, e) {e.preventDefault()},


    highlight_gcode: function () {
      if (typeof this.editor == 'undefined') return;
      var line = this.state.line - 1;
      var doc = this.editor.getDoc();

      doc.removeLineClass(this.highlighted_line, 'wrap', 'highlight');

      if (0 <= line) {
        doc.addLineClass(line, 'wrap', 'highlight');
        this.highlighted_line = line;
        this.editor.scrollIntoView({line: line, ch: 0}, 200);
      }
    },


    load: function (path) {
      api.download('fs/' + path)
        .done(function (data) {
          if (this.state.queued != path) return;
          this.editor.setValue(data);
          this.highlight_gcode();
        }.bind(this))
    },


    submit_mdi: function () {
      this.send(this.mdi);
      if (!this.history.length || this.history[0] != this.mdi)
        this.history.unshift(this.mdi);
      this.mdi = '';
    },


    mdi_start_pause: function () {
      if (this.state.xx == 'RUNNING') this.pause();

      else if (this.state.xx == 'STOPPING' || this.state.xx == 'HOLDING')
        this.unpause();

      else this.submit_mdi();
    },


    load_history: function (index) {this.mdi = this.history[index];},


    home: function (axis) {
      if (typeof axis == 'undefined') api.put('home');

      else {
        if (this[axis].homingMode != 'manual') api.put('home/' + axis);
        else this.manual_home[axis] = true;
      }
    },


    set_home: function (axis, position) {
      this.manual_home[axis] = false;
      api.put('home/' + axis + '/set', {position: parseFloat(position)});
    },


    unhome: function (axis) {
      this.position_msg[axis] = false;
      api.put('home/' + axis + '/clear');
    },


    show_set_position: function (axis) {
      this.axis_position = 0;
      this.position_msg[axis] = true;
    },


    set_position: function (axis, position) {
      this.position_msg[axis] = false;
      api.put('position/' + axis, {'position': parseFloat(position)});
    },


    zero_all: function () {
      for (var axis of 'xyzabc')
        if (this[axis].enabled) this.zero(axis);
    },


    zero: function (axis) {
      if (typeof axis == 'undefined') this.zero_all();
      else this.set_position(axis, 0);
    },


    start_pause: function () {
      if (this.state.xx == 'RUNNING') this.pause();

      else if (this.state.xx == 'STOPPING' || this.state.xx == 'HOLDING')
        this.unpause();

      else this.start();
    },


    start: function () {api.put('start')},
    pause: function () {api.put('pause')},
    unpause: function () {api.put('unpause')},
    optional_pause: function () {api.put('pause/optional')},
    stop: function () {api.put('stop')},
    step: function () {api.put('step')},


    open: function () {
      var path = this.state.queued;

      this.$root.file_dialog({
        callback: function (path) {if (path) api.put('queue/' + path)},
        dir: path ? util.dirname(path) : '/'
      })
    },


    edit: function () {this.$root.edit(this.state.queued)},
    view: function () {this.$root.view(this.state.queued)},


    override_feed: function () {api.put('override/feed/' + this.feed_override)},


    override_speed: function () {
      api.put('override/speed/' + this.speed_override)
    },


    current: function (axis, value) {
      var x = value / 32.0;
      if (this.state[axis + 'pl'] == x) return;

      var data = {};
      data[axis + 'pl'] = x;
      this.send(JSON.stringify(data));
    }
  },


  mixins: [require('./axis-vars')]
}
