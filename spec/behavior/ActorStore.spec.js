require( "../setup.js" );
var _ = require( "lodash" );
describe( "Actor Store Behavior", function() {
	var EventStore;
	before( function() {
		EventStore = require( "../../src/ActorStore.js" );
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
					actorBucket: "actorsgohere"
				} );
			} );

			it( "should form the correct event bucket name", function() {
				db.bucket.should.have.been.calledWith( "somePrefix_actorsgohere", bucketConfig );
			} );
		} );
	} );
} );
