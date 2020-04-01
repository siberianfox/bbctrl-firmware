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

var api    = require('./api');
var util   = require('./util');
var cookie = require('./cookie');


module.exports = {
  template: '#view-editor-template',
  props: ['config', 'template', 'state'],


  data: function () {
    return {
      loading: false,
      path: undefined,
      dirty: false,
      canRedo: false,
      canUndo: false,
      clipboard: ''
    }
  },


  computed: {
    filename: function () {
      return (this.dirty ? '* ' : '') +
        (util.display_path(this.path) || '(unnamed)')
    },


    basename: function () {
      return this.path ? util.basename(this.path) : 'unnamed.txt';
    }
  },


  watch: {
    'state.queued': function () {
      if (!this.path && this.state.queued) this.load(this.state.queued);
    }
  },


  attached: function (done) {
    if (typeof this.doc == 'undefined') return;
    this.load(cookie.get('selected-path'));
  },


  ready: function () {
    this.editor = CodeMirror.fromTextArea(this.$els.textarea, {
      lineNumbers: true,
      mode: 'gcode'
    });
    this.doc = this.editor.getDoc();
    this.doc.on('change', this.change);

    var path = cookie.get('selected-path');
    if (!path) path = this.state.queued;
    this.load(path);
  },


  methods: {
    change: function () {
      this.dirty = !this.doc.isClean()

      var size = this.doc.historySize();
      this.canRedo = !!size.redo;
      this.canUndo = !!size.undo;
    },


    do_load: function (path) {
      if (!path) this.set_path();
      else {
        this.loading = true;

        api.download('fs/' + path)
          .done(function (data) {
            this.set_path(path);
            this.set(data);
            this.loading = false;

          }.bind(this)).fail(function (text, xhr, status) {
            this.loading = false;
            this.$root.error_dialog('Failed to open <tt>' + path + '</tt>');
            if (cookie.get('selected-path') == path)
              cookie.set('selected-path', '');
          }.bind(this))
      }
    },


    load: function (path) {
      if (this.path == path) return;
      this.check_save(function () {this.do_load(path)}.bind(this));
    },


    set_path: function (path) {
      this.path = path;
      cookie.set('selected-path', path || '');
    },


    set: function (text) {
      this.doc.setValue(text);
      this.doc.clearHistory();
      this.doc.markClean();
      this.dirty = false;
      this.canRedo = false;
      this.canUndo = false;
    },


    check_save: function (ok) {
      if (!this.dirty) ok();
      else this.$root.open_dialog({
        title: 'Save file?',
        body: 'The current file has been modified.  ' +
          'Would you like to save it first?',
        buttons: 'Cancel No Yes',
        callback: {
          yes: function () {this.save(ok)}.bind(this),
          no: ok
        }
      })
    },


    new_file: function () {
      this.check_save(function () {
        this.set_path();
        this.set('');
      }.bind(this));
    },


    open: function () {
      this.check_save(function () {
        this.$root.file_dialog({
          callback: function (path) {
            if (path) this.load(path)
          }.bind(this),
          dir: this.path ? util.dirname(this.path) : '/'
        })
      }.bind(this))
    },


    do_save: function (path, ok) {
      var fd = new FormData();
      var file = new File([new Blob([this.doc.getValue()])], path);
      fd.append('file', file);

      api.upload('fs/' + path, fd)
        .done(function () {
          this.set_path(path);
          this.dirty = false;
          this.doc.markClean();
          if (typeof ok != 'undefined') ok()

        }.bind(this)).fail(function (error) {
          this.$root.error_dialog({body: 'Save failed'})
        }.bind(this));
    },


    save: function (ok) {
      if (!this.path) this.save_as(ok);
      else this.do_save(this.path, ok);
    },


    save_as: function (ok) {
      this.$root.file_dialog({
        save: true,
        callback: function (path) {
          if (path) this.do_save(path, ok);
        }.bind(this),
        dir: this.path ? util.dirname(this.path) : '/'
      })
    },


    revert: function () {
      if (this.dirty) {
        var path = this.path;
        this.path = undefined;
        this.dirty = false;
        this.load(path)
      }
    },


    download: function () {
      var data = new Blob([this.doc.getValue()], {type: 'text/plain'});
      window.URL.revokeObjectURL(this.$els.download.href);
      this.$els.download.href = window.URL.createObjectURL(data);
      this.$els.download.click();
    },


    view: function () {
      this.check_save(function () {this.$root.view(this.path)}.bind(this))
    },


    undo: function () {this.doc.undo()},
    redo: function () {this.doc.redo()},


    cut: function () {
      this.clipboard = this.doc.getSelection();
      this.doc.replaceSelection('');
    },


    copy: function () {this.clipboard = this.doc.getSelection()},
    paste: function () {this.doc.replaceSelection(this.clipboard)}
  }
}
