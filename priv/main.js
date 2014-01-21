(function() {

function setSessions(val) {
  if (navigator.id) {
    navigator.id.sessions = val ? val : [ ];
  }
}

function loggedIn(userCtx) {
  setSessions([ {'email':userCtx.name} ]);
  $(document).trigger('on_browserid_login', [null, userCtx]);
}

function notLoggedIn(userCtx) {
  setSessions();
  $(document).trigger('on_browserid_logout', [null, userCtx]);
}

function gotVerifiedEmail(assertion) {
  if (assertion) {
    // Verify through CouchDB.
    var url = '/_browserid';
    if(typeof window != 'undefined' && window && window.BROWSERID_URL)
      url = window.BROWSERID_URL;

    var to_verify = { 'assertion': window.encodeURIComponent(assertion)
                    };

    $.ajax({
      url: url,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(to_verify),
      dataType: "json",
      success: function(data, textStatus, jqXHR) {
        loggedIn(data.userCtx);
      },

      error: function(jqXHR, textStatus, errorThrown) {
        $("#browserid .login"); // .css('opacity', '1');
      }
    });
  } else {
    // something went wrong!  the user isn't logged in.
    $("#browserid .login").removeClass('pending');
    $(document).trigger('on_browserid_login', [new Error("BrowserID assertion failed")]);
  }
}

$(document).ready(function() {
  var widget = $('#browserid .login');
  var state = $('<span class="state">Login...</span>');

  widget.append(state);
  $.ajax({ url : '/_session'
         , dataType: 'json'
         , success: on_success
         , error  : on_error
         });

  function on_success(session, textStatus, jqXHR) {
    on_session(session);
  }

  function on_error(data, textStatus, errorThrown) {
    on_session({name:null, roles:[]});
  }

  function on_session(session) {
    state.remove();

    var is_email = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)$/i

    if(session && session.userCtx && is_email.test(session.userCtx.name)) {
      // Logged in.
      loggedIn(session.userCtx);
    } else {
      // Not logged in.
      notLoggedIn(session.userCtx);
      widget.find('> img').show();
      widget.addClass("clickable");
      widget.click(function() {
        start_login();
      });
    }
  }
});

function start_login() {
  $("#browserid .login").addClass('pending');
  navigator.id.get(gotVerifiedEmail);
}


// You can programatically start a login or logout by running
//   $(document).trigger('browserid_login');
//   or
//   $(document).trigger('browserid_logout');
$(document).bind('browserid_login', function(event) {
  start_login();
});

$(document).bind("browserid_logout", function(event) {
  $.ajax({ url : '/_session'
         , type: 'DELETE'
         , dataType: 'json'
         , success: on_success
         , error  : on_error
         });

  function on_success(data, textStatus, jqXHR) {
    $(document).trigger('on_browserid_logout');
  }

  function on_error(data, textStatus, errorThrown) {
    $(document).trigger('on_browserid_logout', [errorThrown]);
  }
});


// A convenience API to trigger and be notified of login and logout.
//
// Start the login process:
// $.couch.browserid.login();
//
// Be notified of a successful login:
// $.couch.browserid.login(function(err, info) { if(err) throw err; });
//
// Log out:
// $.couch.browserid.logout();
//
// Be notified of a logout:
// $.couch.browserid.logout(function(err) { if(err) throw err; });

$.couch           = $.couch || {};
$.couch.browserid = $.couch.browserid || {};

$.couch.browserid.login = function(callback) {
  if(callback)
    $(document).bind('on_browserid_login', callback);
  else
    $(document).trigger('browserid_login');
};

$.couch.browserid.logout = function(callback) {
  if(callback)
    $(document).bind('on_browserid_logout', callback);
  else
    $(document).trigger('browserid_logout');
};


// Some UI tricks for login and logout.

$.couch.browserid.login(function(ev, er, userCtx) {
  if(er)
    return;

  var email = userCtx.name;
  var widget = $("#browserid .login").removeClass('clickable');

  var bid_icon = widget.find('> img');
  bid_icon.hide();

  widget.removeClass('pending');

  widget.append($('<span>').text("Hi ").addClass('greeting'))
   .append($('<span>').text(email).addClass('username'))
   .append($('<span>').text('.').addClass('farewell'));

  widget.unbind('click');

  var iurl = 'https://www.gravatar.com/avatar/' + Crypto.MD5($.trim(email).toLowerCase()) + "?s=32";
  if (email.indexOf('@') === -1) {
    // it is probably already a gravatar hash
    iurl = 'https://www.gravatar.com/avatar/' + email + "?s=32";
  }
  var gravatar_img = $("<img>").attr('src', iurl);
  gravatar_img.appendTo($("#browserid .picture"));

  var logout = $('<a class="logout" href="/" >(logout)</a>');
  logout.click(function(ev) {
    widget.addClass('pending');
    logout.addClass('logging_out').text('Logging out...');

    $.couch.browserid.logout();

    ev.preventDefault();
    return false;
  });

  widget.append(logout);
});

$.couch.browserid.logout(function(ev, er) {
  if(er)
    return;

  var widget = $('#browserid .login');
  var icon = widget.find('> img');

  widget.show().removeClass('pending');
  icon.show();

  $('#browserid .picture').empty();
  widget.find('span').remove();
  widget.find('a.logout').remove();

  widget.addClass("clickable");
  widget.click(function() {
    start_login();
  });
});

setSessions();

})();

//
// http://crypto-js.googlecode.com/files/2.2.0-crypto-md5.js
//

if(typeof Crypto=="undefined"||!Crypto.util)(function(){var n=window.Crypto={},o=n.util={rotl:function(g,i){return g<<i|g>>>32-i},rotr:function(g,i){return g<<32-i|g>>>i},endian:function(g){if(g.constructor==Number)return o.rotl(g,8)&16711935|o.rotl(g,24)&4278255360;for(var i=0;i<g.length;i++)g[i]=o.endian(g[i]);return g},randomBytes:function(g){for(var i=[];g>0;g--)i.push(Math.floor(Math.random()*256));return i},bytesToWords:function(g){for(var i=[],h=0,a=0;h<g.length;h++,a+=8)i[a>>>5]|=g[h]<<24-
a%32;return i},wordsToBytes:function(g){for(var i=[],h=0;h<g.length*32;h+=8)i.push(g[h>>>5]>>>24-h%32&255);return i},bytesToHex:function(g){for(var i=[],h=0;h<g.length;h++){i.push((g[h]>>>4).toString(16));i.push((g[h]&15).toString(16))}return i.join("")},hexToBytes:function(g){for(var i=[],h=0;h<g.length;h+=2)i.push(parseInt(g.substr(h,2),16));return i},bytesToBase64:function(g){if(typeof btoa=="function")return btoa(p.bytesToString(g));for(var i=[],h=0;h<g.length;h+=3)for(var a=g[h]<<16|g[h+1]<<
8|g[h+2],b=0;b<4;b++)h*8+b*6<=g.length*8?i.push("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(a>>>6*(3-b)&63)):i.push("=");return i.join("")},base64ToBytes:function(g){if(typeof atob=="function")return p.stringToBytes(atob(g));g=g.replace(/[^A-Z0-9+\/]/ig,"");for(var i=[],h=0,a=0;h<g.length;a=++h%4)a!=0&&i.push(("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(g.charAt(h-1))&Math.pow(2,-2*a+8)-1)<<a*2|"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(g.charAt(h))>>>
6-a*2);return i}};n.mode={};n=n.charenc={};n.UTF8={stringToBytes:function(g){return p.stringToBytes(unescape(encodeURIComponent(g)))},bytesToString:function(g){return decodeURIComponent(escape(p.bytesToString(g)))}};var p=n.Binary={stringToBytes:function(g){for(var i=[],h=0;h<g.length;h++)i.push(g.charCodeAt(h)&255);return i},bytesToString:function(g){for(var i=[],h=0;h<g.length;h++)i.push(String.fromCharCode(g[h]));return i.join("")}}})();
(function(){var n=Crypto,o=n.util,p=n.charenc,g=p.UTF8,i=p.Binary,h=n.MD5=function(a,b){var j=o.wordsToBytes(h._md5(a));return b&&b.asBytes?j:b&&b.asString?i.bytesToString(j):o.bytesToHex(j)};h._md5=function(a){if(a.constructor==String)a=g.stringToBytes(a);var b=o.bytesToWords(a),j=a.length*8;a=1732584193;for(var d=-271733879,e=-1732584194,c=271733878,f=0;f<b.length;f++)b[f]=(b[f]<<8|b[f]>>>24)&16711935|(b[f]<<24|b[f]>>>8)&4278255360;b[j>>>5]|=128<<j%32;b[(j+64>>>9<<4)+14]=j;j=h._ff;var k=h._gg,l=
h._hh,m=h._ii;for(f=0;f<b.length;f+=16){var q=a,r=d,s=e,t=c;a=j(a,d,e,c,b[f+0],7,-680876936);c=j(c,a,d,e,b[f+1],12,-389564586);e=j(e,c,a,d,b[f+2],17,606105819);d=j(d,e,c,a,b[f+3],22,-1044525330);a=j(a,d,e,c,b[f+4],7,-176418897);c=j(c,a,d,e,b[f+5],12,1200080426);e=j(e,c,a,d,b[f+6],17,-1473231341);d=j(d,e,c,a,b[f+7],22,-45705983);a=j(a,d,e,c,b[f+8],7,1770035416);c=j(c,a,d,e,b[f+9],12,-1958414417);e=j(e,c,a,d,b[f+10],17,-42063);d=j(d,e,c,a,b[f+11],22,-1990404162);a=j(a,d,e,c,b[f+12],7,1804603682);c=
j(c,a,d,e,b[f+13],12,-40341101);e=j(e,c,a,d,b[f+14],17,-1502002290);d=j(d,e,c,a,b[f+15],22,1236535329);a=k(a,d,e,c,b[f+1],5,-165796510);c=k(c,a,d,e,b[f+6],9,-1069501632);e=k(e,c,a,d,b[f+11],14,643717713);d=k(d,e,c,a,b[f+0],20,-373897302);a=k(a,d,e,c,b[f+5],5,-701558691);c=k(c,a,d,e,b[f+10],9,38016083);e=k(e,c,a,d,b[f+15],14,-660478335);d=k(d,e,c,a,b[f+4],20,-405537848);a=k(a,d,e,c,b[f+9],5,568446438);c=k(c,a,d,e,b[f+14],9,-1019803690);e=k(e,c,a,d,b[f+3],14,-187363961);d=k(d,e,c,a,b[f+8],20,1163531501);
a=k(a,d,e,c,b[f+13],5,-1444681467);c=k(c,a,d,e,b[f+2],9,-51403784);e=k(e,c,a,d,b[f+7],14,1735328473);d=k(d,e,c,a,b[f+12],20,-1926607734);a=l(a,d,e,c,b[f+5],4,-378558);c=l(c,a,d,e,b[f+8],11,-2022574463);e=l(e,c,a,d,b[f+11],16,1839030562);d=l(d,e,c,a,b[f+14],23,-35309556);a=l(a,d,e,c,b[f+1],4,-1530992060);c=l(c,a,d,e,b[f+4],11,1272893353);e=l(e,c,a,d,b[f+7],16,-155497632);d=l(d,e,c,a,b[f+10],23,-1094730640);a=l(a,d,e,c,b[f+13],4,681279174);c=l(c,a,d,e,b[f+0],11,-358537222);e=l(e,c,a,d,b[f+3],16,-722521979);
d=l(d,e,c,a,b[f+6],23,76029189);a=l(a,d,e,c,b[f+9],4,-640364487);c=l(c,a,d,e,b[f+12],11,-421815835);e=l(e,c,a,d,b[f+15],16,530742520);d=l(d,e,c,a,b[f+2],23,-995338651);a=m(a,d,e,c,b[f+0],6,-198630844);c=m(c,a,d,e,b[f+7],10,1126891415);e=m(e,c,a,d,b[f+14],15,-1416354905);d=m(d,e,c,a,b[f+5],21,-57434055);a=m(a,d,e,c,b[f+12],6,1700485571);c=m(c,a,d,e,b[f+3],10,-1894986606);e=m(e,c,a,d,b[f+10],15,-1051523);d=m(d,e,c,a,b[f+1],21,-2054922799);a=m(a,d,e,c,b[f+8],6,1873313359);c=m(c,a,d,e,b[f+15],10,-30611744);
e=m(e,c,a,d,b[f+6],15,-1560198380);d=m(d,e,c,a,b[f+13],21,1309151649);a=m(a,d,e,c,b[f+4],6,-145523070);c=m(c,a,d,e,b[f+11],10,-1120210379);e=m(e,c,a,d,b[f+2],15,718787259);d=m(d,e,c,a,b[f+9],21,-343485551);a=a+q>>>0;d=d+r>>>0;e=e+s>>>0;c=c+t>>>0}return o.endian([a,d,e,c])};h._ff=function(a,b,j,d,e,c,f){a=a+(b&j|~b&d)+(e>>>0)+f;return(a<<c|a>>>32-c)+b};h._gg=function(a,b,j,d,e,c,f){a=a+(b&d|j&~d)+(e>>>0)+f;return(a<<c|a>>>32-c)+b};h._hh=function(a,b,j,d,e,c,f){a=a+(b^j^d)+(e>>>0)+f;return(a<<c|a>>>
32-c)+b};h._ii=function(a,b,j,d,e,c,f){a=a+(j^(b|~d))+(e>>>0)+f;return(a<<c|a>>>32-c)+b};h._blocksize=16;h._digestsize=16})();
