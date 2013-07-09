$(function() {
    var $nav = $('#nav');
    var $topper = $('#topper');

    var MAX_X = 8550;
    var MAX_Y = 5768;
    var MIN_ZOOM = 0;
    var MAX_ZOOM = 4;
    var COORDINATE_MULTIPLIER = 1 / Math.pow(2, MAX_ZOOM - MIN_ZOOM);

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

    //var tiles = L.tileLayer('/img/tiles/{z}/{x}/{y}.jpg', {
    var tiles = L.tileLayer('http://{s}.npr.org/bob-boilens-wristbands-2012/img/tiles/{z}/{x}/{y}.jpg', {
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

    $('#about').click(function(){
        if($('.modal-body').children().length < 1 ) {
            $('.modal h3').html($('.legend-contents .headline').html());
            $('.legend-contents').clone().appendTo('.modal-body');
            $('.modal-body .legend-contents .headline').hide();
        }
    });

    window.superzoom_to = function(x, y, zoom) {
        superzoom.setView(xy(x, y), zoom);
        $('.modal').modal('hide');
    }

    // Load!
    superzoom.setView(CENTER_COORDS, MIN_ZOOM);
});
