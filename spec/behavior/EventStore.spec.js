require( "../setup.js" );
var _ = require( "lodash" );
describe( "Event Store Behavior", function() {
	var EventStore;
	before( function() {
		EventStore = require( "../../src/EventStore.js" );
	} );

	describe( "initialization", function() {
		describe( "when custom bucket names and prefix are given", function() {
			var instance;
			var db;
			var bucketConfig;
			before( function() {
				db = {
					bucket: sinon.stub()
				};

				bucketConfig = {
					bucket_type: "default"
				};

				instance = new EventStore( db, "card", {
					bucketPrefix: "somePrefix",
					eventBucket: "eventsgohere",
					eventPackBucket: "packsofevents"
				} );
			} );

			it( "should form the correct event bucket name", function() {
				db.bucket.should.have.been.calledWith( "somePrefix_eventsgohere", bucketConfig );
			} );

			it( "should form the correct event pack bucket name", function() {
				db.bucket.should.have.been.calledWith( "somePrefix_packsofevents", bucketConfig );
			} );
		} );
	} );
} );
