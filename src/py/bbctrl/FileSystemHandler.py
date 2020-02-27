################################################################################
#                                                                              #
#                This file is part of the Buildbotics firmware.                #
#                                                                              #
#                  Copyright (c) 2015 - 2018, Buildbotics LLC                  #
#                             All rights reserved.                             #
#                                                                              #
#     This file ("the software") is free software: you can redistribute it     #
#     and/or modify it under the terms of the GNU General Public License,      #
#      version 2 as published by the Free Software Foundation. You should      #
#      have received a copy of the GNU General Public License, version 2       #
#     along with the software. If not, see <http://www.gnu.org/licenses/>.     #
#                                                                              #
#     The software is distributed in the hope that it will be useful, but      #
#          WITHOUT ANY WARRANTY; without even the implied warranty of          #
#      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU       #
#               Lesser General Public License for more details.                #
#                                                                              #
#       You should have received a copy of the GNU Lesser General Public       #
#                License along with the software.  If not, see                 #
#                       <http://www.gnu.org/licenses/>.                        #
#                                                                              #
#                For information regarding this software email:                #
#                  "Joseph Coffland" <joseph@buildbotics.com>                  #
#                                                                              #
################################################################################

import os
import stat
import json
import bbctrl
from datetime import datetime
from tornado import gen
from tornado.web import HTTPError


def clean_path(path):
    if path is None: return ''

    path = os.path.normpath(path)
    if path.startswith('..'): raise HTTPError(400, 'Invalid path')
    return path.lstrip('./')


def timestamp_to_iso8601(ts):
    return datetime.fromtimestamp(ts).replace(microsecond = 0).isoformat() + 'Z'


class FileSystemHandler(bbctrl.RequestHandler):
    def get_fs(self): return self.get_ctrl().fs
    def delete(self, path): self.get_fs().delete(clean_path(path))


    def put(self, path):
        path = clean_path(path)

        if 'file' in self.request.files:
            self.get_fs().mkdir(os.path.dirname(path))
            file = self.request.files['file'][0]
            self.get_fs().write(path, file['body'])

        else: self.get_fs().mkdir(path)


    @gen.coroutine
    def get(self, path):
        path = clean_path(path)
        if path == '': path = 'Home'
        realpath = self.get_fs().realpath(path)

        if not os.path.exists(realpath): raise HTTPError(404, 'File not found')
        elif os.path.isdir(realpath):
            files = []

            if os.path.exists(realpath):
                for name in os.listdir(realpath):
                    s = os.stat(realpath + '/' + name)

                    d = dict(name = name)
                    d['created']  = timestamp_to_iso8601(s.st_ctime)
                    d['modified'] = timestamp_to_iso8601(s.st_mtime)
                    d['size']     = s.st_size
                    d['dir']      = stat.S_ISDIR(s.st_mode)

                    files.append(d)

            d = dict(path = path, files = files)

            self.set_header('Content-Type', 'application/json')
            self.write(json.dumps(d, separators = (',', ':')))

        else:
            with open(realpath, 'r') as f:
                self.write(f.read())
