#!/usr/bin/env python

import os

from PIL import Image

TILE_WIDTH = 256
TILE_HEIGHT = 256
MIN_ZOOM = 0 
MAX_ZOOM = 4

# Open original image
full_image = Image.open('maplayersLPsize.png')
full_width, full_height = full_image.size

zoom = MAX_ZOOM 

while zoom >= MIN_ZOOM:
    # Max zoom level is pixel-perfect
    if zoom == MAX_ZOOM:
        image = full_image

        width = full_width
        height = full_height
    # Other zoom levels are downsampled
    else:
        width = full_width / (2 ** (MAX_ZOOM - zoom))
        height = full_height / (2 ** (MAX_ZOOM - zoom))

        image = full_image.resize((width, height), Image.ANTIALIAS)

    max_x = width + 256 - (width % TILE_WIDTH)
    max_y = height + 256 - (height % TILE_HEIGHT) 
    
    x = 0

    while x < max_x:
        tile_x = x / TILE_WIDTH 
        
        y = 0
        
        while y < max_y:
            tile_y = y / TILE_HEIGHT

            tile = image.crop((x, y, x + TILE_WIDTH, y + TILE_HEIGHT))

            folder = 'www/img/tiles/%i/%i/' % (zoom, tile_x)

            if not os.path.exists(folder):
                os.makedirs(folder)

            path = os.path.join(folder, '%i.jpg' % tile_y)

            print path

            tile.save(path, 'JPEG')

            y += TILE_HEIGHT
        
        x += TILE_WIDTH

    zoom -= 1
