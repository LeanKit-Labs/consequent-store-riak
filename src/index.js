var riaktive = require( 'riaktive' );
var sliver = require( './sliver.js' )();
riaktive.setIdStrategy( sliver.getId.bind( sliver ) );

var EventStore = require( './EventStore' );

var cache = {};

module.exports = function( _config ) {
	var config = _config || {};

	var riak = riaktive.connect( config.riak );

	return {
		create: function( actorType, config ) {
			if ( cache[ actorType ] ) {
				return cache[ actorType ];
			}
			return new EventStore( riak, actorType, config );
		},
		riak: riak
	};

};
