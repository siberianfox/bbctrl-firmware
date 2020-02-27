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


var util = require('./util');
var api  = require('./api');


module.exports = {
  template: '#view-files-template',
  props: ['state'],


  data: function () {
    return {
      first: true,
      selected: '',
      is_dir: false
    }
  },


  attached: function () {
    if (this.first) this.first = false;
    else this.$refs.files.reload();
  },


  methods: {
    upload: function () {this.$refs.files.upload()},
    new_folder: function () {this.$refs.files.new_folder()},


    set_selected: function (path, dir) {
      this.selected = path
      this.is_dir = dir;
    },


    edit: function () {
      if (this.selected && !this.is_dir) this.$root.edit(this.selected)
    },


    view: function () {
      if (this.selected && !this.is_dir) this.$root.view(this.selected)
    },


    download: function () {
      if (this.selected && !this.is_dir) this.$els.download.click();
    },


    delete: function () {
      if (!this.selected) return;

      var filename = util.basename(this.selected);

      this.$root.open_dialog({
        title: 'Delete ' + (this.is_dir ? 'directory' : 'file') + '?',
        body: 'Are you sure you want to delete <tt>' + filename +
          (this.is_dir ? '</tt> and all the files under it?' : '</tt>?'),
        buttons: 'Cancel OK',
        callback: function (action) {
          if (action == 'ok')
            api.delete('fs/' + this.selected)
            .done(this.$refs.files.reload)
        }.bind(this)
      });
    }
  }
}
