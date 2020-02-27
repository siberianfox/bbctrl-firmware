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


var util = {
  SEC_PER_YEAR:  365 * 24 * 60 * 60,
  SEC_PER_MONTH: 30 * 24 * 60 * 60,
  SEC_PER_WEEK:  7 * 24 * 60 * 60,
  SEC_PER_DAY:   24 * 60 * 60,
  SEC_PER_HOUR:  60 * 60,
  SEC_PER_MIN:   60,
  uuid_chars:
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_+',


  duration: function (x, name, precision) {
    x = x.toFixed(typeof precision == 'undefined' ? 0 : precision);
    return x + ' ' + name + (x == 1 ? '' : 's')
  },


  human_duration: function (x, precision) {
    if (util.SEC_PER_YEAR <= x)
      return util.duration(x / util.SEC_PER_YEAR,  'year',  precision);
    if (util.SEC_PER_MONTH <= x)
      return util.duration(x / util.SEC_PER_MONTH, 'month', precision);
    if (util.SEC_PER_WEEK <= x)
      return util.duration(x / util.SEC_PER_WEEK,  'week',  precision);
    if (util.SEC_PER_DAY <= x)
      return util.duration(x / util.SEC_PER_DAY,   'day',   precision);
    if (util.SEC_PER_HOUR <= x)
      return util.duration(x / util.SEC_PER_HOUR,  'hour',  precision);
    if (util.SEC_PER_MIN <= x)
      return util.duration(x / util.SEC_PER_MIN,   'min',   precision);
    return util.duration(x, 'sec', precision);
  },


  human_size: function (x, precision) {
    if (typeof precision == 'undefined') precision = 1;

    if (1e12 <= x) return (x / 1e12).toFixed(precision) + 'T'
    if (1e9  <= x) return (x / 1e9 ).toFixed(precision) + 'B'
    if (1e6  <= x) return (x / 1e6 ).toFixed(precision) + 'M'
    if (1e3  <= x) return (x / 1e3 ).toFixed(precision) + 'K'
    return x;
  },


  unix_path: function (path) {
    if (/Win/i.test(navigator.platform)) return path.replace('\\', '/');
    return path;
  },


  dirname: function (path) {
    var sep = path.lastIndexOf('/');
    return sep == -1 ? '.' : (sep == 0 ? '/' : path.substr(0, sep));
  },


  basename: function (path) {return path.substr(path.lastIndexOf('/') + 1)},


  join_path: function (a, b) {
    if (!a) return b;
    return a[a.length - 1] == '/' ? a + b : (a + '/' + b);
  },


  display_path: function (path) {
    if (path == undefined) return path;
    return path.startsWith('Home/') ? path.substr(5) : path;
  },


  uuid: function (length) {
    if (typeof length == 'undefined') length = 52;

    var s = '';
    for (var i = 0; i < length; i++)
      s += util.uuid_chars[Math.floor(Math.random() * util.uuid_chars.length)];

    return s
  }
}


module.exports = util;
