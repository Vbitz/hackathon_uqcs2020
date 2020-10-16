#!/usr/bin/env python3

import sys
import os

_, *args = sys.argv

os.execvp("npm", ["npm", "run", *args])
