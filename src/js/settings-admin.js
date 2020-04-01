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
  template: '#settings-admin-template',
  props: ['config', 'state'],


  data: function () {
    return {
      autoCheckUpgrade: true,
      password: '',
      firmwareName: '',
      show: {
        upgrade: false,
        upgrading: false,
        upload: false
      }
    }
  },


  ready: function () {
    this.autoCheckUpgrade = this.config.admin['auto-check-upgrade']
  },


  methods: {
    backup: function () {
      document.getElementById('download-target').src = '/api/config/download';
    },


    restore_config: function () {
      // If we don't reset the form the browser may cache file if name is same
      // even if contents have changed
      $('.restore-config')[0].reset();
      $('.restore-config input').click();
    },


    restore: function (e) {
      var files = e.target.files || e.dataTransfer.files;
      if (!files.length) return;

      var fr = new FileReader();
      fr.onload = function (e) {
        var config;

        try {
          config = JSON.parse(e.target.result);
        } catch (ex) {
          this.$root.error_dialog("Invalid config file");
          return;
        }

        api.put('config/save', config).done(function (data) {
          this.$dispatch('update');
          this.$root.success_dialog('Configuration restored.');

        }.bind(this)).fail(function (error) {
          this.$root.api_error('Restore failed', error);
        }.bind(this))
      }.bind(this);

      fr.readAsText(files[0]);
    },


    do_reset: function () {
      api.put('config/reset').done(function () {
        this.$dispatch('update');
        this.$root.success_dialog('Configuration reset.')

      }.bind(this)).fail(function (error) {
        this.$root.api_error('Reset failed', error);
      }.bind(this));
    },


    reset: function () {
      this.$root.open_dialog({
        title: 'Reset to default configuration?',
        body: 'Non-network configuration changes will be lost.',
        buttons: 'Cancel OK',
        callback: {ok: this.do_reset}
      })
    },

    check: function () {this.$dispatch('check', true)},


    upgrade: function () {
      this.password = '';
      this.show.upgrade = true;
    },


    upgrade_confirmed: function () {
      this.show.upgrade = false;

      api.put('upgrade', {password: this.password}).done(function () {
        this.show.upgrading = true;

      }.bind(this)).fail(function () {
        this.error_dialog('Invalid password');
      }.bind(this))
    },


    upload_firmware: function () {
      // If we don't reset the form the browser may cache file if name is same
      // even if contents have changed
      $('.upload-firmware')[0].reset();
      $('.upload-firmware input').click();
    },


    upload: function (e) {
      var files = e.target.files || e.dataTransfer.files;
      if (!files.length) return;

      this.firmware = files[0];
      this.firmwareName = files[0].name;
      this.password = '';
      this.show.upload = true;
    },


    upload_confirmed: function () {
      this.show.upload = false;

      var form = new FormData();
      form.append('firmware', this.firmware);
      if (this.password) form.append('password', this.password);

      $.ajax({
        url: '/api/firmware/update',
        type: 'PUT',
        data: form,
        cache: false,
        contentType: false,
        processData: false

      }).success(function () {
        this.show.upgrading = true;

      }.bind(this)).error(function () {
        this.error_dialog('Invalid password or bad firmware');
      }.bind(this))
    },


    change_auto_check_upgrade: function () {
      this.config.admin['auto-check-upgrade'] = this.autoCheckUpgrade;
      this.$dispatch('config-changed');
    }
  }
}
