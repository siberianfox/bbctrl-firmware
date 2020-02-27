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


CodeMirror.defineMode('gcode', function (config, parserConfig) {
  return {
    token: function (stream, state) {
      if (stream.eatSpace()) return null;

      if (stream.match(';')) {
        stream.skipToEnd();
        return 'comment';
      }

      if (stream.match('(')) {
        if (stream.skipTo(')')) stream.next();
        else stream.skipToEnd();
        return 'comment';
      }

      if (stream.match(/[+-]?[\d.]+/))     return 'number';
      if (stream.match(/[\/*%=+-]/))       return 'operator';
      if (stream.match('[\[\]]'))          return 'bracket';
      if (stream.match(/N\d+/i))           return 'line';
      if (stream.match(/O\d+\s*[a-z]+/i))  return 'ocode';
      if (stream.match(/[F][+-]?[\d.]+/i)) return 'feed';
      if (stream.match(/[S][+-]?[\d.]+/i)) return 'speed';
      if (stream.match(/[T]\d+/i))         return 'tool';
      if (stream.match(/[GM][\d.]+/i))     return 'gcode';
      if (stream.match(/[A-Z]/i))          return 'id';
      if (stream.match(/#<[_a-z\d]+>/i))   return 'variable';
      if (stream.match(/#\d+/))            return 'ref';

      stream.next();
      return 'error';
    }
  }
})
