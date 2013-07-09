#!/usr/bin/env python

import csv
import json

with open('data/cues.csv') as f:
    rows = list(csv.reader(f))

cues = []

for row in rows[2:]:
    cue = {
        'cue': float(row[0]),
        'name': row[1],
    }

    cues.append(cue)

with open('www/cues.json', 'w') as f:
    f.write(json.dumps(cues))
