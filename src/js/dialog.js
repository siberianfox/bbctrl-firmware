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


function get_icon(action) {
  switch (action.toLowerCase()) {
  case 'ok': case 'yes': return 'check';
  case 'cancel': case 'no': return 'times';
  }

  return undefined
}


module.exports = {
  template: '#dialog-template',


  data: function () {
    return {
      show: false,
      config: {},
      buttons: []
    }
  },


  methods: {
    click_away: function () {
      if (typeof this.config.click_away == 'undefined')
        this.close('click-away');

      if (this.config.click_away) this.close(this.config.click_away);
    },


    close: function (action) {
      this.show = false

      if (typeof this.config.callback == 'function')
        this.config.callback(action);

      if (typeof this.config.callback == 'object' &&
          typeof this.config.callback[action] == 'function')
        this.config.callback[action]();
    },


    open: function(config) {
      this.config = config;

      var buttons = config.buttons || 'OK';
      if (typeof buttons == 'string') buttons = buttons.split(' ');

      this.buttons = [];
      for (var i = 0; i < buttons.length; i++) {
        if (typeof buttons[i] == 'string')
          this.buttons.push({
            action: buttons[i].toLowerCase(),
            text: buttons[i],
            icon: get_icon(buttons[i])
          })

        else {
          buttons[i].action = buttons[i].action || buttons[i].text.toLowerCase()
          this.buttons.push(buttons[i]);
        }
      }

      this.show = true;
    },


    error: function (msg) {
      this.open({
        icon: 'exclamation',
        title: 'Error',
        body: msg
      })
    },


    warning: function (msg) {
      this.open({
        icon: 'exclamation-triangle',
        title: 'Warning',
        body: msg
      })
    },


    success: function (msg) {
      this.open({
        icon: 'check',
        title: 'Success',
        body: msg
      })
    }
  }
}
