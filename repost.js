//. repost.js
var { BskyAgent, RichText } = require( '@atproto/api' );

require( 'dotenv' ).config();

var BSKY_SVC = 'BSKY_SVC' in process.env ? process.env.BSKY_SVC : 'https://bsky.social';
var BSKY_ID = 'BSKY_ID' in process.env ? process.env.BSKY_ID : '';
var BSKY_PW = 'BSKY_PW' in process.env ? process.env.BSKY_PW : '';
var interval = 'REPOST_INTERVAL' in process.env ? parseInt( process.env.REPOST_INTERVAL ) : 30;  //. 30min

async function reposts( before, after ){
  return new Promise( async ( resolve, reject ) => {
    //console.log( 'reposts: before=' + before + ', after=' + after );
    var finished = false;
    var new_before = null;
    var resp0 = await fetch( 'https://mydoodles.yellowmix.net/images/' + before );
    var json = JSON.parse( await( resp0.text() ) );
    //console.log( {json} );  //. {"status":true,"images":[{"id":"1612005","image_url":"","user_name","","title":"","created":""},..]}
    if( json && json.status && json.images ){
      for( var i = 0; i < json.images.length && !finished; i ++ ){
        var created = json.images[i].created;
        if( typeof created == 'string' ){ created = parseInt( created ); }

        //console.log( ' reposts[' + i + ']: after=' + after + ', created=' + created );
        if( after < created ){
          new_before = created;
          var url = 'https://mydoodles.yellowmix.net/doodle/' + json.images[i].id;

          var title = json.images[i].title;
          var creator = json.images[i].user_name;
          var text = 'New doodle has been released! ' + title + ' ' + url + ' @' + creator + ' #mydoodles';

          //. embed image
          var ogpImg = 'https://mydoodles.yellowmix.net/attachment/' + json.images[i].id;
          var blob = await fetch( ogpImg );
          var buffer = await blob.arrayBuffer();
          var response = await agent.uploadBlob( new Uint8Array( buffer ), { encoding: "image/jpeg" } );
          var embed_params = {
            $type: "app.bsky.embed.external",
            external: {
              uri: url,
              thumb: {
                $type: "blob",
                ref: {
                  $link: response.data.blob.ref.toString()
  	            },
                mimeType: response.data.blob.mimeType,
                size: response.data.blob.size
              },
              description: '',
              title: title
            }
          };

          //. rith text
          var rt = new RichText({ text: text });
          await rt.detectFacets( agent );
      
          //console.log( ' reposts[' + i + ']: new_before=' + new_before );
          var post = {
            $type: 'app.bsky.feed.post',
            text: rt.text,
            facets: rt.facets,
            embed: embed_params,
            createdAt: new Date().toISOString()
          };
          //console.log( ' reposts[' + i+ ']: post', post );
          var res = await agent.post( post );
          console.log( {res} );
        }else{
          finished = true;
        }
      }
    }else{
      finished = true;
    }

    if( finished ){ new_before = null; }

    resolve( new_before );
  });
}

var agent = new BskyAgent({
  service: BSKY_SVC
});
agent.login({
  identifier: BSKY_ID,
  password: BSKY_PW,
}).then( async function(){
  var before = ( new Date() ).getTime();
  var after = before - ( interval * 60 * 1000 );  //. 10min

  do{
    before = await reposts( before, after );
  }while( before );
});

