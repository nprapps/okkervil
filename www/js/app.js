// Utility for computing constants
function xy(x, y) {
    /*
     * Convert image-space pixel coords into map-space pseudo-lat-lng coords.
     */
    return new L.LatLng(-y * COORDINATE_MULTIPLIER, x * COORDINATE_MULTIPLIER);
}

// Constants
var MAX_X = 3772;
var MAX_Y = 1845;
var MIN_ZOOM = 0;
var DEFAULT_ZOOM = 3;
var MAX_ZOOM = 4;
var COORDINATE_MULTIPLIER = 1 / Math.pow(2, MAX_ZOOM - MIN_ZOOM);
var MIN_COORDS = new L.LatLng(0, 0);
var CENTER_COORDS = xy(MAX_X / 2, MAX_Y / 2);
var MAX_COORDS = xy(MAX_X, MAX_Y); 

// Elements
var $nav;
var $topper;
var $audio;
var $progress;
var $next;
var $back;
var $player;
var $browse_btn;
var $cue_list;
var $cue_nav;
var $modal_intro;
var $modal_end;

// State
var superzoom = null;
var audio_length = 10;
var num_cues = 0; 
var active_cue = 0;
var cue_data = [];
var pop = null;
var cue_list_open = false;

function setup_superzoom() {
    /*
     * Setup the "map".
     */
    superzoom = L.map('superzoom', {
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        crs: L.CRS.Simple,
        zoomControl: false,
        attributionControl: false
    });

    var zoom_control = new L.Control.Zoom({
        position: 'topright'
    }).addTo(superzoom);

    var tiles = L.tileLayer('/img/tiles/{z}/{x}/{y}.jpg', {
    //var tiles = L.tileLayer('http://{s}.npr.org/bob-boilens-wristbands-2012/img/tiles/{z}/{x}/{y}.jpg', {
        subdomains: ['apps', 'apps2'],
        continuousWorld: true,
        noWrap: true
    }).addTo(superzoom);

    superzoom.on('load', recalculate_map_offset);
    superzoom.on('zoomend', recalculate_map_offset);
    $(window).resize(recalculate_map_offset);

    // Load!
    superzoom.setView(CENTER_COORDS, DEFAULT_ZOOM);

}

function recalculate_map_offset() {
    /*
     * Calculates an appropriate map offset to compensate for the header.
     */
    var header_height = $nav.height();
    
    if ($topper.is(':visible')) {
        header_height += $topper.height();
    }

    var offset = superzoom.unproject(new L.Point(0, -header_height), superzoom.getZoom());
    //superzoom.setMaxBounds(new L.LatLngBounds(offset, MAX_COORDS));
}

function superzoom_to(x, y, zoom) {
    /*
     * Zoom to a given x, y point and zoom (in pixel space).
     */
    superzoom.setView(xy(x, y), zoom);
    $('.modal').modal('hide');
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
        ended: function (event) {
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
    var audio_output = '';
    var browse_output = '';
    
    $.getJSON('cues.json', function(data) {
        num_cues = data.length;
        
        $.each(data, function(k, v) {
            v['id'] = k;
            cue_data.push(v);
            
            var cue = parseFloat(v["cue"]);
        
            // Markup for this cue and its entry in the cue nav
            // via Underscore template / JST
            browse_output += JST.browse(v);
            audio_output += JST.cue_nav(v);

            // Popcorn cuepoint for this cue
            pop.code({
                start: cue,
                end: cue + .5,
                onStart: function(options) {         
                    active_cue = k;
                    console.log('HERE');
                    // TODO - pan map to point 
                    return false;
                }
            });
            
        });

        // Append credits to drop-down nav
        browse_output += JST.browse({
            'id': num_cues + 1,
            'name': 'Index & Credits'
        });
        
        $cue_nav.append(audio_output);

        $cue_nav.find('.cue-nav-item').click( function() {
            var id = parseInt($(this).attr('data-id'));
            $player.jPlayer('play', cue_data[id]['cue']);
        });

    });
}

function cue_list_toggle(mode) {
    /*
     * Open or close the cue list.
     */
    if (cue_list_open || mode == 'close') {
        $cue_list.hide();
        $browse_btn.removeClass('active');
        cue_list_open = false;
    } else if (!cue_list_open || mode == 'open') {
        $cue_list.show();
        $browse_btn.addClass('active');
        cue_list_open = true;
    }
}

function goto_next_cue() {
    /*
     * Jump to the next cue.
     */
    console.log(active_cue);
    console.log(num_cues);
    if (active_cue < (num_cues - 1)) {
        var id = active_cue + 1;
        $player.jPlayer('play', cue_data[id]['cue']);;
    }

    return false;
}

function goto_previous_cue() {
    /*
     * Jump to the previous cue.
     */
    if (active_cue > 0) {
        var id = active_cue - 1;
        $player.jPlayer('play', cue_data[id]['cue']);;
    }

    return false;
}


$(function() {
    // Get element refs
    $nav = $('#nav');
    $topper = $('#topper');
    $audio = $('#audio');
	$progress = $audio.find('.jp-progress-container');
	$next = $('#next-btn');
	$back = $('#back-btn');
	$player = $('#pop-audio');
	$browse_btn = $('#browse-btn');
    $cue_list = $('#cue-list');
    $cue_nav = $('#cue-nav');
    $modal_intro = $('#modal-intro');
    $modal_end = $('#modal-end');

    // Setup the zoomer
    setup_superzoom()

    // Setup the audio
    setup_jplayer();

    // Event handlers
	$browse_btn.click(cue_list_toggle());
    $next.click(goto_next_cue);
	$back.click(goto_previous_cue);

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
    
    // Modals
    $modal_intro.modal();

});
