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

import bbctrl


class Events(object):
  def __init__(self, ctrl):
    self.ctrl = ctrl
    self.listeners = {}
    self.log = ctrl.log.get('Events')


  def on(self, event, listener):
    if not event in self.listeners: self.listeners[event] = []
    self.listeners[event].append(listener)


  def off(self, event, listener):
    if event in self.listeners:
      self.listeners[event].remove(listener)


  def emit(self, event, *args, **kwargs):
    if event in self.listeners:
      for listener in self.listeners[event]:
        try:
          listener(*args, **kwargs)
        except Exception as e:
          self.log.exception()
