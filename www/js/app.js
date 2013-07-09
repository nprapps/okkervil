$(function() {
    var $nav = $('#nav');
    var $topper = $('#topper');
    var $audio = $('#audio');
	var $progress = $audio.find('.jp-progress-container');
	var $next = $('#next-btn');
	var $back = $('#back-btn');
	var $player = $('#pop-audio');
	var $browse_btn = $('#browse-btn');
    var $cue_list = $('#cue-list');
    var $cue_nav = $('#cue-nav');
    var $modal_intro = $('#modal-intro');
    var $modal_end = $('#modal-end');

    var MAX_X = 8550;
    var MAX_Y = 5768;
    var MIN_ZOOM = 0;
    var MAX_ZOOM = 4;
    var COORDINATE_MULTIPLIER = 1 / Math.pow(2, MAX_ZOOM - MIN_ZOOM);

    var audio_length = 10; // TODO
    var num_cues = 0; 
    var cue_data = [];
    var pop = null;
    var cue_list_open = false;

    function xy(x, y) {
        /*
         * Convert image-space pixel coords into map-space pseudo-lat-lng coords.
         */
        return new L.LatLng(-y * COORDINATE_MULTIPLIER, x * COORDINATE_MULTIPLIER);
    }

    var MIN_COORDS = new L.LatLng(0, 0);
    var CENTER_COORDS = xy(4275, 2884);
    var MAX_COORDS = xy(MAX_X, MAX_Y); 

    var superzoom = L.map('superzoom', {
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

    function recalculate_map_offset() {
        /*
         * Calculates an appropriate map offset to compensate for the header.
         */
        var header_height = $nav.height();
        
        if ($topper.is(':visible')) {
            header_height += $topper.height();
        }

        var offset = superzoom.unproject(new L.Point(0, -header_height), superzoom.getZoom());
        superzoom.setMaxBounds(new L.LatLngBounds(offset, MAX_COORDS));
    }

    superzoom.on('load', recalculate_map_offset);
    superzoom.on('zoomend', recalculate_map_offset);
    $(window).resize(recalculate_map_offset);

    window.superzoom_to = function(x, y, zoom) {
        superzoom.setView(xy(x, y), zoom);
        $('.modal').modal('hide');
    }

    // Load!
    superzoom.setView(CENTER_COORDS, MIN_ZOOM);

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
    // associate jPlayer with Popcorn
    pop = Popcorn('#jp_audio_0');

	function load_cue_data() {
        /* 
         * Load cueshow data from external JSON
         */
		var audio_output = '';
        var browse_output = '';
		
		$.getJSON('cues.json', function(data) {
			cue_data.push(undefined);
            
			$.each(data, function(k, v) {
				cue_data.push(v);
			
				// Markup for this cue and its entry in the cue nav
				// via Underscore template / JST
                var context = v;
                context['id'] = k + 1;

				num_cues++;
				
                var cue = v["cue"];
                
                browse_output += JST.browse(cue);
                audio_output += JST.cue_nav(cue);

                // Popcorn cuepoint for this cue
                pop.code({
                    start: cue,
                    end: cue + .5,
                    onStart: function(options) {         
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

	$browse_btn.on('click', function(e){
		cue_list_toggle();
	});

	function goto_next_cue() {
		if (active_cue < (num_cues-1)) {
            var id = active_cue + 1;
            goto_cue(id);
		}
		return false;
	}
    $next.click(goto_next_cue);

	function goto_previous_cue() {
		if (active_cue > 0) {
            var id = active_cue - 1;
            goto_cue(id);
		}
		return false;
	}
	$back.click(goto_previous_cue);

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
    
    
    /*
        MODALS
    */
    $modal_intro.modal();

});
