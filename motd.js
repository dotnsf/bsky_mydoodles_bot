//. motd.js
var { parse } = require( 'node-html-parser' );
var { BskyAgent, RichText } = require( '@atproto/api' );

require( 'dotenv' ).config();

var BSKY_SVC = 'BSKY_SVC' in process.env ? process.env.BSKY_SVC : 'https://bsky.social';
var BSKY_ID = 'BSKY_ID' in process.env ? process.env.BSKY_ID : '';
var BSKY_PW = 'BSKY_PW' in process.env ? process.env.BSKY_PW : '';

var agent = new BskyAgent({
  service: BSKY_SVC
});
agent.login({
  identifier: BSKY_ID,
  password: BSKY_PW,
}).then( async function(){
  //. motd(manholemap of the day)
  var resp0 = await fetch( 'https://manholemap.juge.me/motd' );
  var json = JSON.parse( await( resp0.text() ) );
  //console.log( {json} );  //. {"status":true,"motd":{"id":"1612005","text":"建国記念日","m":2,"d":11}}
  if( json && json.status && json.motd ){
    var url = 'https://manholemap.juge.me/page?id=' + json.motd.id;

    var resp1 = await fetch( url );
    var html = parse( await( resp1.text() ) );
    var title = html.querySelector( "meta[property='og:description']" ).getAttribute( "content" );
    var creator = html.querySelector( "meta[name='twitter:creator']" ).getAttribute( "content" );

    var text = '[今日の蓋] ' + json.motd.m + '月' + json.motd.d + '日 #' + json.motd.text + ' : '
      + title
      + ' ' + url + ' @' + creator + ' #manhotalk';

    //. embed image
    var ogpImg = html.querySelector( "meta[property='og:image']" ).getAttribute( "content" );
    var blob = await fetch( ogpImg );
    var buffer = await blob.arrayBuffer();
    var response = await agent.uploadBlob( new Uint8Array( buffer ), { encoding: "image/jpeg" } );
    var embed_params = {
      $type: "app.bsky.embed.external",
      external: {
        uri: "https://manholemap.juge.me/",
        thumb: {
          $type: "blob",
          ref: {
            $link: response.data.blob.ref.toString()
	        },
          mimeType: response.data.blob.mimeType,
          size: response.data.blob.size
        },
        title: title,
        description: title
      }
    };

    //. rith text
    var rt = new RichText({ text: text });
    await rt.detectFacets( agent );

    var res = await agent.post({
      $type: 'app.bsky.feed.post',
      text: rt.text,
      facets: rt.facets,
      embed: embed_params,
      createdAt: new Date().toISOString()
    });
    console.log( {res} );
  }
});

