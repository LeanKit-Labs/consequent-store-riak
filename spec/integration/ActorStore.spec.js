require( "../setup.js" );

var when = require( "when" );
var _ = require( "lodash" );
var VClock = require( "vectorclock" );
var adapter;
var riak;
var sliver;

describe( "Actor Store Interface", function() {
	before( function() {
		adapter = require( "../../src/index.js" )( config );
		riak = adapter.riak;

		sliver = require( "../../src/sliver.js" )();
	} );

	describe( "when fetching an actor", function() {
		describe( "when siblings exist", function() {
			var id;
			var doc;
			var doc2;
			var store;
			var result;
			before( function( done ) {
				store = adapter.actors.create( "boards" );
				id = sliver.getId();
				doc = {
					name: "my actor"
				};
				doc2 = {
					name: "my other actor"
				};

				riak.boards.put( id, doc );
				riak.boards.put( id, doc2 );

				setTimeout( function() {
					return store.fetch( id )
						.then( function( res ) {
							result = res;
							done();
						} );
				}, 100 );
			} );

			after( function( done ) {
				riak.boards.del( id )
					.then( function() {
						done();
					} );
			} );

			it( "should return all objects", function() {
				result.length.should.equal( 2 );
			} );
		} );
	} );

	describe( "when storing an actor", function() {
		var version1;
		var version2;
		var actorId;
		var vectorClock1;
		var vectorClock2;
		var store;
		var results;
		var actorStore;
		var actoreIdPrefix;

		before( function( done ) {
			actorStore = adapter.actors.create( "boards" );
			actorId = sliver.getId();
			vectorClock1 = "v1";
			vectorClock2 = "v2";

			version1 = {
				name: "a board",
				description: "does some stuff"
			};

			version2 = {
				name: "a board",
				description: "i hope this works",
				vector: vectorClock1
			};

			actorStore.store( actorId, vectorClock1, version1 )
				.then( function() {
					return actorStore.store( actorId, vectorClock2, version2 );
				} ).then( function( res ) {
				return when.all( [
					riak.boards.get( actorId ),
					riak.boards.get( actorId + "-" + vectorClock2 ),
					riak.boards.get( actorId + "-" + vectorClock1 )
				] );
			} ).then( function( res ) {
				results = res;
				done();
			} );
		} );

		it( "should store the current version", function() {
			var b = results[ 0 ];
			_.pick( b, "name", "description", "vector" ).should.eql( _.merge( version2, { vector: "v2" } ) );
		} );

		it( "should store a snapshot of the current version", function() {
			var b = results[ 1 ];
			_.pick( b, "name", "description", "vector" ).should.eql( _.merge( version2, { vector: "v2" } ) );
		} );

		it( "should store a snapshot of the previous version", function() {
			var b = results[ 2 ];
			_.pick( b, "name", "description", "vector" ).should.eql( _.merge( version1, { vector: "v1" } ) );
		} );
	} );

	describe( "when finding an ancestor", function() {
		describe( "when there are two children of the same node", function() {
			var getStub;
			var actorId;
			var result;
			var actorIdPrefix;
			var N0, N1, N2, N3, N4, N5, N6;
			before( function( done ) {
				actorId = sliver.getId();
				actorIdPrefix = actorId + "-";

				/* N0: Top most node */
				N0 = {
					name: "very top node",
					vector: VClock.increment( { clock: {} }, "A" ),
					ancestor: null
				};

				N0.id = actorIdPrefix + JSON.stringify( N0.vector );

				/* N1: First direct descendent */

				N1 = {
					name: "top node",
					vector: VClock.increment( _.cloneDeep( N0.vector ), "A" ),
					ancestor: _.cloneDeep( N0.vector )
				};

				N1.id = actorIdPrefix + JSON.stringify( N1.vector );

				/*	N2
					Direct descendent of N1
					Sibling of N3
				*/

				N2 = {
					name: "first child",
					vector: VClock.increment( _.cloneDeep( N1.vector ), "A" ),
					ancestor: _.cloneDeep( N1.vector )
				};

				N2.id = actorIdPrefix + JSON.stringify( N2.vector );

				/*	N3
					Direct descendent of N1
					Sibling of N2
				*/

				N3 = {
					name: "second child",
					vector: VClock.increment( _.cloneDeep( N1.vector ), "B" ),
					ancestor: _.cloneDeep( N1.vector )
				};

				N3.id = actorIdPrefix + JSON.stringify( N3.vector );

				/*	N4: Direct descendent of N3	*/

				N4 = {
					name: "1st B-side child",
					vector: VClock.increment( _.cloneDeep( N3.vector ), "B" ),
					ancestor: _.cloneDeep( N3.vector )
				};

				N4.id = actorIdPrefix + JSON.stringify( N4.vector );

				/*	N5
					Direct descendent of N4
					Sibling to N6
				*/

				N5 = {
					name: "1st B-side sibling",
					vector: VClock.increment( _.cloneDeep( N4.vector ), "B" ),
					ancestor: _.cloneDeep( N4.vector )
				};

				N5.id = actorIdPrefix + JSON.stringify( N5.vector );

				/*	N6
					Direct descendent of N4
					Sibling to N5
				*/

				N6 = {
					name: "2nd B-side sibling",
					vector: VClock.increment( _.cloneDeep( N4.vector ), "C" ),
					ancestor: _.cloneDeep( N4.vector )
				};

				N6.id = actorIdPrefix + JSON.stringify( N6.vector );

				var records = [ N0, N1,	N2,	N3,	N4,	N5,	N6 ];

				var store = adapter.actors.create( "boards" );

				getStub = sinon.stub( store.actorBucket, "get", function( key ) {
					var record = _.find( records, { id: key } );
					if ( record ) {
						return when( record );
					} else {
						console.log( "Invalid Record ID: " );
						console.log( key );
						return when.reject( new Error( "No document" ) );
					}
				} );

				store.findAncestor( actorId, [ N2, N5, N6 ] )
					.then( function( res ) {
						result = res;
						done();
					} );
			} );

			after( function() {
				getStub.restore();
			} );

			it( "should resolve to the parent", function() {
				result.should.eql( N1 );
			} );
		} );
	} );
} );
