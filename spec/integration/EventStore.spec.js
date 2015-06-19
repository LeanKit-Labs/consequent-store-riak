require( '../setup.js' );

var when = require( 'when' );
var _ = require( 'lodash' );
var adapter;
var riak;
var sliver;

describe( 'Event Store Interface', function() {

	before( function() {
		adapter = require( '../../src/index.js' )( config );
		riak = adapter.riak;

		sliver = require( '../../src/sliver.js' )();
	} );

	describe( 'when storing events', function() {
		var store;
		var aggId;
		var events = [
			{ name: 'card1' },
			{ name: 'card2' },
			{ description: 'abc123' }
		];
		var ids;
		var records;
		before( function( done ) {
			aggId = sliver.getId();
			store = adapter.events.create( 'card', {} );

			store.storeEvents( aggId, events )
				.then( function( results ) {
					ids = results;
					return ids;
				} )
				.then( function( ids ) {

					var gets = _.map( ids, function( id ) {
						return riak.card_events.get( id );
					} );

					return when.all( gets );
				} )
				.then( function( results ) {
					records = results;
					done();
				} );
		} );

		after( function( done ) {

			var deletes = _.each( ids, function( id ) {
				return riak.card_events.del( id );
			} );

			when.all( deletes )
				.then( function() {
					done();
				} );
		} );

		it( 'should save a document for each event', function() {
			_.pick( records[ 0 ], 'aggregate_id', 'event' ).should.eql( {
				aggregate_id: aggId,
				event: events[ 0 ]
			} );

			_.pick( records[ 1 ], 'aggregate_id', 'event' ).should.eql( {
				aggregate_id: aggId,
				event: events[ 1 ]
			} );

			_.pick( records[ 2 ], 'aggregate_id', 'event' ).should.eql( {
				aggregate_id: aggId,
				event: events[ 2 ]
			} );
		} );

		it( 'should index on the aggregate id', function() {
			var indexes = _.pluck( records, "_indexes.aggregate_id" );

			_.map( indexes, function( i ) {
				return i.toString()
			} ).should.eql( [
				aggId,
				aggId,
				aggId
			] );

			var event_id_indexes = _.pluck( records, "_indexes.aggregate_event_id" );
			_.map( event_id_indexes, function( i ) {
				return i.toString()
			} ).should.eql( [
				aggId + '-' + records[ 0 ].id,
				aggId + '-' + records[ 1 ].id,
				aggId + '-' + records[ 2 ].id
			] );
		} );

	} );

	describe( 'when retrieving events', function() {
		var store;
		var aggId;
		var events = [
			{ name: 'card1' },
			{ name: 'card2' },
			{ description: 'abc123' },
			{ lane: 'lane123' },
			{ title: 'a new title' }
		];
		var ids;
		var records;
		before( function( done ) {
			aggId = sliver.getId();
			store = adapter.events.create( 'card', {} );

			store.storeEvents( aggId, events )
				.then( function( results ) {
					ids = results;
					return ids;
				} )
				.then( function() {
					return store.getEventsFor( aggId, ids[ 2 ] );
				} )
				.then( function( results ) {
					records = results;
					done();
				} );
		} );

		after( function( done ) {
			var deletes = _.each( ids, function( id ) {
				return riak.card_events.del( id );
			} );

			when.all( deletes )
				.then( function() {
					done();
				} );
		} );

		it( 'should return the correct events', function() {
			records.length.should.equal( 2 );
		} );
	} );

	describe( 'when storing event packs', function() {
		var store;
		var aggId;
		var events = [
			{ name: 'card1' },
			{ name: 'card2' },
			{ description: 'abc123' }
		];
		var id;
		var record;
		var clock;
		before( function( done ) {
			aggId = sliver.getId();
			clock = sliver.getId();
			store = adapter.events.create( 'card', {} );

			store.storeEventPack( aggId, clock, events )
				.then( function( result ) {
					id = result;
					return id;
				} )
				.then( function( ids ) {
					return riak.card_event_packs.get( id );
				} )
				.then( function( result ) {
					record = result;
					done();
				} );
		} );

		after( function( done ) {
			riak.card_event_packs.del( id )
				.then( function() {
					done();
				} );
		} );

		it( 'should save a document with embedded events', function() {
			var eventList = record.events;
			eventList.should.eql( events );
		} );

		it( 'should index on the aggregate id', function() {
			record._indexes.aggregate_id.toString().should.equal( aggId );
			record._indexes.aggregate_pack_id.toString().should.equal( aggId + "-" + id );
			record._indexes.aggregate_clock.toString().should.equal( aggId + "-" + clock );
		} );

	} );

	describe( 'when retrieving event packs', function() {
		var store;
		var aggId;
		var events;
		var id;
		var records;
		var clock;
		before( function( done ) {

			events = [
				{ name: 'card1', id: sliver.getId() },
				{ name: 'card2', id: sliver.getId() },
				{ description: 'abc123', id: sliver.getId() }
			];

			aggId = sliver.getId();
			clock = sliver.getId();
			store = adapter.events.create( 'card', {} );

			store.storeEventPack( aggId, clock, events )
				.then( function( packId ) {
					id = packId;
					store.getEventPackFor( aggId, clock )
						.then( function( res ) {
							records = res;
							done();
						} );
				} );
		} );

		after( function( done ) {
			riak.card_event_packs.del( id )
				.then( function() {
					done();
				} );
		} );

		it( 'should return the list of events', function() {
			records.should.eql( events );
		} );

	} );

} );
