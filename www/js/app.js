// Utility for computing constants
function xy(x, y) {
    /*
     * Convert image-space pixel coords into map-space pseudo-lat-lng coords.
     */
    return new L.LatLng(-y * COORDINATE_MULTIPLIER, x * COORDINATE_MULTIPLIER);
}

// Constants
var WIDTH = 3772;
var HEIGHT = 1845;
var MIN_ZOOM = 0;
var DEFAULT_ZOOM = 3;
var MAX_ZOOM = 4;
var COORDINATE_MULTIPLIER = 1 / Math.pow(2, MAX_ZOOM - MIN_ZOOM);
var MIN_COORDS = new L.LatLng(0, 0);
var CENTER_COORDS = xy(WIDTH / 2, HEIGHT / 2);
var MAX_COORDS = xy(WIDTH, HEIGHT); 
var MAX_BOUNDS = new L.LatLngBounds(xy(-WIDTH / 2, -HEIGHT / 2), xy(WIDTH + WIDTH / 2, HEIGHT + HEIGHT / 2));
var PAN_DURATION = 1.0;

// Elements
var $superzoom;
var $nav;
var $topper;
var $audio;
var $progress;
var $next;
var $back;
var $player;
var $browse_btn;
var $current_cue;
var $browse_list;
var $modal_intro;
var $modal_end;

// State
var superzoom = null;
var zoom_control = null;
var audio_length = 7;
var num_cues = 0; 
var active_cue = 0;
var cue_data = [];
var pop = null;
var browse_list_open = false;

function setup_superzoom() {
    /*
     * Setup the "map".
     */
    superzoom = L.map('superzoom', {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        maxBounds: MAX_BOUNDS,
        crs: L.CRS.Simple,
        zoomControl: false,
        attributionControl: false
    });

    zoom_control = new L.Control.Zoom({
        position: 'topright'
    }).addTo(superzoom);

    var tiles = L.tileLayer('/img/tiles/{z}/{x}/{y}.jpg', {
    //var tiles = L.tileLayer('http://{s}.npr.org/bob-boilens-wristbands-2012/img/tiles/{z}/{x}/{y}.jpg', {
        subdomains: ['apps', 'apps2'],
        continuousWorld: true,
        noWrap: true
    }).addTo(superzoom);

    // Load!
    superzoom.setView(CENTER_COORDS, DEFAULT_ZOOM);
}

function superzoom_to(x, y, zoom) {
    /*
     * Zoom to a given x, y point and zoom (in pixel space).
     */
    /*superzoom.panTo(xy(x, y), {
        animate: true,
        duration: 0.5
    });
    superzoom.setZoom(zoom);*/
    superzoom.setView(xy(x, y), zoom, {
        animate: true,
        pan: { duration: PAN_DURATION } 
    });
}

function freeze_superzoom() {
    /*
     * Disable pan/zoom controls.
     */
    superzoom.dragging.disable();
    superzoom.touchZoom.disable();
    superzoom.doubleClickZoom.disable();
    superzoom.boxZoom.disable();
    superzoom.keyboard.disable();
    zoom_control.removeFrom(superzoom);
    $superzoom.addClass('frozen');
}

function unfreeze_superzoom() {
    /*
     * Enable pan/zoom controls.
     */
    superzoom.dragging.enable();
    superzoom.touchZoom.enable();
    superzoom.doubleClickZoom.enable();
    superzoom.boxZoom.enable();
    superzoom.keyboard.enable();
    zoom_control.addTo(superzoom);
    $superzoom.removeClass('frozen');
}

function setup_jplayer() {
    /* 
     * Load audio player
     */
    $player.jPlayer({
        ready: function () {
            $(this).jPlayer('setMedia', {
                mp3: "http://apps.npr.org/sotomayor-family-photos/narration.mp3",
                oga: "http://apps.npr.org/sotomayor-family-photos/narration.ogg"
            }).jPlayer("pause");

            load_cue_data();
        },
        play: function() {
            freeze_superzoom();
        },
        pause: function() {
            unfreeze_superzoom();
        },
        ended: function () {
            $(this).jPlayer("pause", audio_length - 1);
        },
        swfPath: "js",
        supplied: "oga, mp3"
    });

    // Associate jPlayer with Popcorn
    pop = Popcorn('#jp_audio_0');
}

function load_cue_data() {
    /* 
     * Load cue data from external JSON.
     */
    var browse_output = '';
    
    $.getJSON('cues.json', function(data) {
        num_cues += data.length;
        
        $.each(data, function(id, cue) {
            cue['id'] = id;
            cue['width'] = 100 * parseFloat(cue['length']) / audio_length;

            cue['show_number'] = (id != 0 && id != num_cues - 1);

            cue_data.push(cue);
            
            var cue_time = parseFloat(cue["cue"]);
        
            // Markup for this cue and its entry in the cue nav
            // via Underscore template / JST
            browse_output += JST.browse(cue);

            // Popcorn cuepoint for this cue
            pop.code({
                start: cue_time,
                end: cue_time + .1,
                onStart: function(options) {         
                    goto_cue(id);

                    return false;
                }
            });
            
        });

        $browse_list.append(browse_output);

        $browse_list.find('.browse-0').click(open_intro_modal);
        $browse_list.find('.browse-cue:last').click(open_end_modal);

        update_current_cue(0);
    });
}

function goto_cue(id) {
    /*
     * Jump to a cue and update all display info, including superzoom.
     */
    var cue = cue_data[id];
    console.log(cue);
    var x = parseInt(cue['x']);
    var y = parseInt(cue['y']);

    if (id == 0) {
        $player.jPlayer('pause', cue['cue']);
        open_intro_modal();
        superzoom_to(x, y, DEFAULT_ZOOM);
    } else if (id == num_cues - 1) {
        $player.jPlayer('pause', cue['cue']);
        open_end_modal();
        superzoom_to(x, y, DEFAULT_ZOOM);
    } else {
        superzoom_to(x, y, MAX_ZOOM);
    }

    update_current_cue(id);

    active_cue = id;
}

function update_current_cue(id) {
    /*
     * Update the display of the current cue name.
     */
    $('.browse-cue a').removeClass('active');
    $('.browse-' + id + ' a').addClass('active');

    var browse_text = $('.browse-' + id + ' a h2').text();
    $current_cue.text(browse_text);
}

function browse_list_toggle(mode) {
    /*
     * Open or close the cue list.
     */
    var browse_btn_position = $browse_btn.offset();
     
    if (browse_list_open || mode == 'close') {
        $browse_list.hide();
        $browse_btn.removeClass('active');
        browse_list_open = false;
    } else if (!browse_list_open || mode == 'open') {
        $browse_list.css('top', browse_btn_position.top + $browse_btn.height());
        $browse_list.css('left', browse_btn_position.left);
        $browse_list.show();
        $browse_btn.addClass('active');
        browse_list_open = true;
    }
}

function goto_next_cue() {
    /*
     * Jump to the next cue.
     */
    if (active_cue < (num_cues - 1)) {
        var id = active_cue + 1;
        $player.jPlayer('play', cue_data[id]['cue']);
    }

    return false;
}

function goto_previous_cue() {
    /*
     * Jump to the previous cue.
     */
    if (active_cue > 0) {
        var id = active_cue - 1;
        $player.jPlayer('play', cue_data[id]['cue']);
    }

    return false;
}

function open_intro_modal() {
    browse_list_toggle('close');
    $modal_intro.modal();
    active_cue = 0;
}

function open_end_modal() {
    browse_list_toggle('close');
    $modal_end.modal();
    active_cue = num_cues - 1;
}

$(function() {
    // Get element refs
    $superzoom = $('#superzoom');
    $nav = $('#nav');
    $topper = $('#topper');
    $audio = $('#audio');
	$progress = $audio.find('.jp-progress-container');
	$next = $('#next-btn');
	$back = $('#back-btn');
	$player = $('#pop-audio');
	$browse_btn = $('#browse-btn');
    $current_cue = $('#current-cue');
    $browse_list = $('#browse-list');
    $modal_intro = $('#modal-intro');
    $modal_end = $('#modal-end');

    // Setup the zoomer
    setup_superzoom()

    // Setup the audio
    setup_jplayer();

    // Event handlers
	$browse_btn.click(browse_list_toggle);
	$browse_list.mouseleave(browse_list_toggle('close'));
    $next.click(goto_next_cue);
	$back.click(goto_previous_cue);

    $browse_list.on('click', 'a', function() {
        var id = parseInt($(this).attr('data-id'));
        $player.jPlayer('play', cue_data[id]['cue']);
        browse_list_toggle('close');
    });

    // Keyboard controls 
    $(document).keydown(function(ev) {
        if (ev.which == 37) {
            goto_previous_cue();
            return false;
        } else if (ev.which == 39) {
            goto_next_cue();
            return false;
        } else if (ev.which == 32 && audio_supported) {
            if ($player.data().jPlayer.status.paused) {
                $player.jPlayer('play');
            } else {
                $player.jPlayer('pause');
            }
            return false;
        }

        return true;
    });
});
