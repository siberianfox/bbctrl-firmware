/******************************************************************************\

                 This file is part of the Buildbotics firmware.

                   Copyright (c) 2015 - 2020, Buildbotics LLC
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

var util = require('./util');


var filters = {
  number: function (value) {
    if (isNaN(value)) return 'NaN';
    return value.toLocaleString();
  },


  percent: function (value, precision) {
    if (typeof value == 'undefined') return '';
    if (typeof precision == 'undefined') precision = 2;
    return (value * 100.0).toFixed(precision) + '%';
  },



  non_zero_percent: function (value, precision) {
    if (!value) return '';
    if (typeof precision == 'undefined') precision = 2;
    return (value * 100.0).toFixed(precision) + '%';
  },


  fixed: function (value, precision) {
    if (typeof value == 'undefined') return '0';
    return parseFloat(value).toFixed(precision)
  },


  upper: function (value) {
    if (typeof value == 'undefined') return '';
    return value.toUpperCase()
  },


  time: function (value, precision) {
    if (isNaN(value)) return '';
    if (isNaN(precision)) precision = 0;

    var MIN = 60;
    var HR  = MIN * 60;
    var DAY = HR * 24;
    var parts = [];

    if (DAY <= value) {
      parts.push(Math.floor(value / DAY));
      value %= DAY;
    }

    if (HR <= value) {
      parts.push(Math.floor(value / HR));
      value %= HR;
    }

    if (MIN <= value) {
      parts.push(Math.floor(value / MIN));
      value %= MIN;

    } else parts.push(0);

    parts.push(value);

    for (var i = 0; i < parts.length; i++) {
      parts[i] = parts[i].toFixed(i == parts.length - 1 ? precision : 0);
      if (i && parts[i] < 10) parts[i] = '0' + parts[i];
    }

    return parts.join(':');
  },


  ago: function (ts) {
    if (typeof ts == 'string') ts = Date.parse(ts) / 1000;

    return util.human_duration(new Date().getTime() / 1000 - ts) + ' ago';
  },


  duration: function (ts, precision) {
    return util.human_duration(parseInt(ts), precision)
  },


  size: function (x, precision) {return util.human_size(x, precision)}
}


module.exports = function () {
  for (var name in filters)
    Vue.filter(name, filters[name])
}
