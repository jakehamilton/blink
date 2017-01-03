(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class ajax
 * @description Performs HTTP requests
 */
var ajax = function () {
  /**
   * @constructor
   */
  function ajax() {
    _classCallCheck(this, ajax);

    /**
     * @member {XMLHttpRequest} request The request being made
     */
    this.request;
  }

  /**
   * @method get
   * @description Performs a `get` request to a given endpoint
   * @param {String} url The url to request
   * @param [Bool=false] parseJSON Whether or not to parse the response before resolution
   * @param [Object] headers A map of headers to send
   * 
   * @promise
   * @resolve {Object|String} response The response from the server
   * @reject {Error} err The error that occurred
   * 
   * @example
   * let http = new ajax()
   * 
   * http.get('example.com')
   *   .then(response => ...)
   */


  _createClass(ajax, [{
    key: 'get',
    value: function get(url, parseJSON, headers) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.request = new XMLHttpRequest();
        _this.request.open('GET', url, true);

        // Append headers if they were passed
        if (headers) {
          Object.keys(headers).forEach(function (key) {
            _this.request.setRequestHeader(key, headers[key]);
          });
        }

        // When the request finishes, resolve with the response
        _this.request.addEventListener('load', function () {
          resolve(parseJSON ? JSON.parse(_this.request.response) : _this.request.response);
        });

        // Or reject with an error
        _this.request.addEventListener('error', function () {
          reject('Failed to communicate with server at url: ' + url);
        });

        // Send the response
        _this.request.send();
      });
    }
  }]);

  return ajax;
}();

exports.default = ajax;

},{}],2:[function(require,module,exports){
'use strict';

var _twitch = require('./twitch.js');

var _twitch2 = _interopRequireDefault(_twitch);

var _storage = require('./storage.js');

var _storage2 = _interopRequireDefault(_storage);

var _heroSlide = require('./hero-slide.js');

var _heroSlide2 = _interopRequireDefault(_heroSlide);

var _videoRow = require('./video-row.js');

var _videoRow2 = _interopRequireDefault(_videoRow);

var _router = require('./router.js');

var _router2 = _interopRequireDefault(_router);

var _player = require('./player.js');

var _player2 = _interopRequireDefault(_player);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Twitch client id for api requests
var client_id = 'bm02n8wxxzqmzvfb0zlebd5ye2rn0r7';

// Construct an api wrapper instance, storage instance, and a view router
var api = new _twitch2.default(client_id);
var db = new _storage2.default('blink');
var router = new _router2.default();

// Attempt to load a previous token from local storage
var OAUTH_TOKEN = db.load('oauth_token');

// If we don't have an oauth token, then check in the url hash
if (!OAUTH_TOKEN) {
  var hash = document.location.hash.substr(1, document.location.hash.length);
  var pairs = hash.split('&');
  pairs.forEach(function (pair) {
    var keys = pair.split('=');

    // If we have a token, then save it and wipe the url hash
    if (keys[0] == 'access_token') {
      OAUTH_TOKEN = keys[1];
      db.save('oauth_token', OAUTH_TOKEN);
      document.location.hash = '/';
    }
  });
}

window.addEventListener('load', function (event) {
  // Construct a new wrapper for the twitch player
  var player = new _player2.default('player-wrapper');

  // Routing
  router.add_route([{ 'videos': document.querySelector('#videos') }, { 'player': document.querySelector('#player') }, { 'search': document.querySelector('#search') }, { 'prompt': document.querySelector('#prompt') }]);

  if (!OAUTH_TOKEN) {
    // If we don't have an oauth token, ask the user to sign in
    router.route('prompt');
  } else {
    // Otherwise, let them view their content
    router.route('videos');
  }

  // Exits the player on click
  document.querySelector('.exit-btn').addEventListener('click', function (event) {
    player.destroy();
    router.route('videos');
  });

  // Loads the player when a video is selected
  _videoRow2.default.set_video_click_callback(function (video) {
    if (video.type == 'archive') {
      player.load({ video: video.id });
    } else if (video.type == 'stream') {
      player.load({ channel: video.channel.name });
    }
    router.route('player');
  });

  // Load more content when the user scrolls to the side
  _videoRow2.default.set_navigation_callback(function (event) {
    if (event.section >= event.total_sections - 2 && event.data) {
      api.get_user_videos(event.data.username, event.data.limit, event.videos).then(function (response) {
        event.row.push(response.videos);
      });
    }
  });

  // Load the player when the user clicks on the "watch now"
  //  button in the banner
  _heroSlide2.default.set_watch_now_callback(function (stream) {
    player.load({ channel: stream.name });
    router.route('player');
  });

  // Get the current user's info
  api.get_user(OAUTH_TOKEN).then(function (user) {
    // Get all live followed channels
    api.get_user_stream_follows(OAUTH_TOKEN).then(function (streams) {
      // Populate the hero banner
      var is_first = true;
      streams.forEach(function (stream) {
        var s = new _heroSlide2.default(stream);
        var element = s.element;
        if (is_first) {
          element.querySelector('.hero__slide').classList.add('visible');
          is_first = false;
        }
        document.querySelector('.hero').appendChild(element);
      });

      // Create a video row of "live" streams
      var row = new _videoRow2.default('Live', streams);
      document.querySelector('#videos').appendChild(row.element);

      return;
    }).then(function () {
      // Populate the rest
      api.get_follows(OAUTH_TOKEN, user.name).then(function (channels) {
        queue_rows(channels.follows);
      });
    });
  });

  var hero_highlight_spots = 1;
  var hero_spotlights = [];

  // Async creates video rows
  function queue_rows(users) {
    return new Promise(function (resolve, reject) {
      if (users.length > 0) {
        fill(users[0]).then(function () {
          if (users.length > 0) {
            queue_rows(users.slice(1, users.length)).then(resolve);
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Creates an individual video row and fills it with available content
  function fill(user, isLast) {
    var row = new _videoRow2.default(user.channel.display_name, null, { username: user.channel.name, limit: 10 });
    return new Promise(function (resolve, reject) {
      api.get_user_videos(user.channel.name, 10).then(function (response) {
        if (response.videos.length > 0) {
          row.push(response.videos);
          document.querySelector('#videos').appendChild(row.element);
        }
        resolve();
      });
    });
  }
});

},{"./hero-slide.js":3,"./player.js":4,"./router.js":6,"./storage.js":7,"./twitch.js":8,"./video-row.js":9}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class slide
 * @description An individual hero slide
 */
var slide = function () {
  /**
   * @constructor
   */
  function slide(stream) {
    _classCallCheck(this, slide);

    /**
     * @member slide
     * @description The base DOM element of the component
     */
    this.slide = document.importNode(document.querySelector('#hero-template').content, true);

    // Attempt to find an image for the video
    this.slide.querySelector('.slide__image').src = stream.channel.profile_banner || stream.channel.video_banner || stream.channel.logo;

    // Populate the content
    this.slide.querySelector('.slide__content__channel').innerText = stream.channel.display_name;
    this.slide.querySelector('.slide__content__description').innerText = stream.channel.status || "Streaming Live";

    // When a user clicks the "Watch Now" button, load the stream in the player
    this.slide.querySelector('.watch-now-button').addEventListener('click', function (event) {
      slide.prototype.watch_now_callback({
        name: stream.channel.name
      });
    });
  }

  /**
   * @static
   * @method set_watch_now_callback
   * @description Assigns a function as a callback for when a user clicks the "watch now" button
   * 
   * @void
   */


  _createClass(slide, [{
    key: 'element',


    /**
     * @get element
     * @description Returns the base DOM element of the component
     * 
     * @return {HTMLElement} slide The base DOM element of the component
     */
    get: function get() {
      return this.slide;
    }
  }], [{
    key: 'set_watch_now_callback',
    value: function set_watch_now_callback(fn) {
      slide.prototype.watch_now_callback = fn;
    }
  }]);

  return slide;
}();

exports.default = slide;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class player
 * @description A wrapper for the official Twitch player
 */
var player = function () {
  /**
   * @constructor
   * @param {String} id The id of the element to mount
   */
  function player(id) {
    var _this = this;

    _classCallCheck(this, player);

    /**
     * @member {String} id The id of the element which the player is mounted on
     */
    this.id = id;

    /**
     * @member {Object} player The Twitch player instance
     */
    this.player;

    // Resize the player if necessary
    window.addEventListener('resize', function (event) {
      if (_this.player) {
        var i = document.querySelector('iframe');
        i.width = window.innerWidth;
        i.height = window.innerHeight;
      }
    });
  }

  /**
   * @method load
   * @description Loads a video or stream into the player
   * @param {Object} options
   * @param [String] options.video The video id to load
   * @param [String] options.channel The channel stream to load
   * 
   * @void
   */


  _createClass(player, [{
    key: 'load',
    value: function load() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { video: video, channel: channel };

      var config = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      if (options.video) config.video = options.video;
      if (options.channel) config.channel = options.channel;

      this.player = new Twitch.Player(this.id, config);
    }

    /**
     * @method play
     * @description Plays the player
     * 
     * @void
     */

  }, {
    key: 'play',
    value: function play() {
      this.player.play();
    }

    /**
     * @method pause
     * @description Pauses the player
     * 
     * @void
     */

  }, {
    key: 'pause',
    value: function pause() {
      this.player.pause();
    }

    /**
     * @method destroy
     * @description Destroys the player instance and removes it from the page
     * 
     * @void
     */

  }, {
    key: 'destroy',
    value: function destroy() {
      this.player = '';
      document.getElementById(this.id).innerHTML = '';
    }
  }]);

  return player;
}();

exports.default = player;

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class poster
 * @description A single video poster component
 */
var poster = function () {
  /**
   * @constructor
   * @param {Object} game A game video object from the Twitch API to laod
   */
  function poster(game) {
    _classCallCheck(this, poster);

    /**
     * @member poster
     * @description The base DOM node for the component
     */
    this.poster = document.importNode(document.querySelector('#poster-template').content, true);

    // If this is a stream, then use the channel's banner and name if available
    if (game.type == 'stream') {
      game.thumbnail = game.channel.profile_banner || game.channel.logo || '';
      game.name = game.channel.display_name || game.channel.name;
    }

    // Populate the thumbnail and title
    this.poster.querySelector('.video__image').src = game.thumbnail;
    this.poster.querySelector('.video__title').innerText = game.name.length > 16 ? game.name.substr(0, 16) + '...' : game.name;
  }

  /**
   * @get element
   * @description Returns the base DOM element of the component
   * 
   * @return {HTMLElement} slide The base DOM element of the component
   */


  _createClass(poster, [{
    key: 'element',
    get: function get() {
      return this.poster;
    }
  }]);

  return poster;
}();

exports.default = poster;

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class router
 * @description Handles routing for the application
 */
var router = function () {
  /**
   * @constructor
   * @param [Object] routes A routes object to use for routing
   */
  function router() {
    var routes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, router);

    /**
     * @member {Object} routes
     * @description The map of routes available in the application
     */
    this.routes = routes;

    /**
     * @member {Object} active_route
     * @description The current, visible route
     */
    this.active_route;
  }

  /**
   * @method route
   * @description Changes the view to a new route
   * @param {String} name The route to switch to
   * 
   * @void
   */


  _createClass(router, [{
    key: 'route',
    value: function route(name) {
      if (this.active_route) this.active_route.classList.remove('visible');
      this.active_route = this.routes[name];
      this.routes[name].classList.add('visible');
    }

    /**
     * @method add_route
     * @description Adds a new route or multiple routes from an Array
     * @param {Object|Array<Object>} route The route(s) to add
     * 
     * @void
     */

  }, {
    key: 'add_route',
    value: function add_route(route) {
      var _this = this;

      if (Array.isArray(route)) {
        route.forEach(function (r) {
          _this.add_route(r);
        });
        return;
      }

      var keys = Object.keys(route);
      this.routes[keys[0]] = route[keys[0]];
    }
  }]);

  return router;
}();

exports.default = router;

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class storage
 * @description A wrapper for the native local storage api
 * 
 * Mostly implemented because I thought it would be a fun little challenge
 */
var storage = function () {
  function storage(namespace) {
    _classCallCheck(this, storage);

    this.load_storage_map(namespace);
  }

  // Creates a (very likely) unique id


  _createClass(storage, [{
    key: 'unique_id',
    value: function (_unique_id) {
      function unique_id(_x) {
        return _unique_id.apply(this, arguments);
      }

      unique_id.toString = function () {
        return _unique_id.toString();
      };

      return unique_id;
    }(function (size) {
      var alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890$&-_+';
      var id = '';
      for (var i = 0; i < size; i++) {
        id += alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      Object.keys(this.storage_map).forEach(function (key) {
        if (key === id) {
          return unique_id(size);
        }
      });

      return id;
    })

    // Saves some data in local storage

  }, {
    key: 'save',
    value: function save(name, data) {
      if (!this.storage_map[name]) {
        this.storage_map[name] = this.unique_id(5);
      }
      var key = this.storage_map[name];
      window.localStorage.setItem('storage-' + this.namespace + '-' + key, typeof data == 'Object' ? JSON.stringify(data) : data);
      this.save_storage_map();
    }

    // Loads some data from local storage

  }, {
    key: 'load',
    value: function load(name) {
      return window.localStorage.getItem('storage-' + this.namespace + '-' + this.storage_map[name]) || false;
    }

    // Removes some data from local storage

  }, {
    key: 'delete',
    value: function _delete(name) {
      window.localStorage.removeItem('storage-' + this.namespace + '-' + this.storage_map[name]);
    }

    // Saves the current storage map state 

  }, {
    key: 'save_storage_map',
    value: function save_storage_map() {
      window.localStorage.setItem('storage-' + this.namespace, JSON.stringify(this.storage_map));
    }

    // Loads the a storage map from local storage (and in a certain namespace)

  }, {
    key: 'load_storage_map',
    value: function load_storage_map(namespace) {
      this.namespace = namespace;
      this.storage_map = JSON.parse(window.localStorage.getItem('storage-' + this.namespace) || '{}');
    }
  }]);

  return storage;
}();

exports.default = storage;

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ajax = require('./ajax.js');

var _ajax2 = _interopRequireDefault(_ajax);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var http = new _ajax2.default();

/**
 * @class twitch
 * @description A wrapper for the Twitch API
 */

var twitch = function () {
  /**
   * @constructor
   * @param {String} client_id The client id for the Twitch app
   */
  function twitch(client_id) {
    _classCallCheck(this, twitch);

    if (!client_id) throw new Error('Twitch API requires `client_id` to be set');

    /**
     * @member base_url
     * @description The base Twitch API url
     */
    this.base_url = 'https://api.twitch.tv/kraken';

    /**
     * @member client_id
     * @description The client id to send on requests
     */
    this.client_id = client_id;
  }

  /**
   * @method get_user
   * @description Retrieves a single user given an authentication token
   * @param {String} token The authentication token from Twitch
   * 
   * @promise
   * @resolve {Object} _data The user object from the Twitch server
   * @reject {null} _ No return value
   */


  _createClass(twitch, [{
    key: 'get_user',
    value: function get_user(token) {
      var _this = this;

      var url = this.base_url + '/user?oauth_token=' + token;
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this.client_id }).then(function (_data) {
          resolve(_data);
        }).catch(console.error);
      });
    }

    /**
     * @method get_follows
     * @description Retrieves all followed channels (up to 100) for a user
     * @param {String} token The authentication token
     * @param {String} user The user to request follows for
     * 
     * @promise
     * @resolve {Object} _data The follows object from the Twitch server
     * @reject {null} _ No return value
     */

  }, {
    key: 'get_follows',
    value: function get_follows(token, user) {
      var _this2 = this;

      var url = this.base_url + '/users/' + user + '/follows/channels?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this2.client_id }).then(function (_data) {
          // The `_data` name is here because previously there was
          //  a `data` variable in the same closure being constructed
          _data.follows.sort(function (a, b) {
            if (a.channel.display_name.toLowerCase() < b.channel.display_name.toLowerCase()) {
              return -1;
            } else if (a.channel.display_name.toLowerCase() > b.channel.display_name.toLowerCase()) {
              return 1;
            } else {
              return 0;
            }
          });

          resolve(_data);
        }).catch(console.error);
      });
    }

    /**
     * @method get_top_games
     * @description Retrieves the top games on Twitch at the current moment
     * @param [Number=15] limit The max number of games to request
     * @param [Number=0] offset The offset to start at in the games list
     * 
     * @promise
     * @resolve {Object} _data The games from the Twitch server
     * @reject {null} _ No data is returned
     */

  }, {
    key: 'get_top_games',
    value: function get_top_games() {
      var _this3 = this;

      var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var url = this.base_url + '/games/top?limit=' + limit + '&offset=' + offset;
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this3.client_id }).then(function (_data) {
          data.next = _data._links.next;
          data.games = [];

          _data.top.forEach(function (item) {
            var game = {};
            game.viewers = item.viewers;
            game.channels = item.channels;
            game.name = item.game.name;
            game.posters = {
              large: item.game.box.large,
              medium: item.game.box.medium,
              small: item.game.box.small
            };
            game.thumbnail = item.game.box.medium;

            data.games.push(game);
          });

          resolve(data);
        }).catch(console.error);
      });
    }

    // Retrieves the top videos on Twitch
    /**
     * @method get_top_videos
     * @description Retrieves the top videos on Twitch
     * @param [Number=15] limit The max amount of games to recieve
     * @param [Number=0] offset The offset for requesting games from the list
     * @param {String} game The game to request
     * @param {String} period The period to request
     * 
     * @promise
     * @resolve {Object} data The top videos from the twitch API
     * @reject {null} _ No data is returned
     * 
     */

  }, {
    key: 'get_top_videos',
    value: function get_top_videos() {
      var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 15;
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      var _this4 = this;

      var game = arguments[2];
      var period = arguments[3];

      var url = this.base_url + '/videos/top?limit=' + limit + '&offset=' + offset + (game ? '&game=' + game : '') + (period ? '&period=' + period : '');
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this4.client_id }).then(function (_data) {
          data.next = _data._links.next;
          data.videos = [];

          _data.videos.forEach(function (item) {
            var video = {};
            video.name = item.title;
            video.description = item.description;
            video.broadcast_id = item.broadcast_id;
            video.id = item._id;
            video.type = item.broadcast_type;
            video.views = item.views;
            video.created_at = item.created_at;
            video.game = item.game;
            video.channel = item.channel.name;
            video.channel_display_name = item.channel.display_name;
            video.thumbnail = item.thumbnails[0].url;

            data.videos.push(video);
          });

          resolve(data);
        }).catch(console.error);
      });
    }

    // Retrieves a user's videos
    /**
     * @method get_user_videos
     * @description Retrieves a user's videos
     * @param {String} channel The channel to request videos from
     * @param [Number=15] limit The max amount of videos to request
     * @param [Number=0] offset The offset to start at in the videos list
     * @param [Bool=true] broadcasts Whether or not to request broadcasts
     * @param [Bool=false] hls_only Whether or not to request HLS video only
     * 
     * @promise
     * @resolve {Object} data The videos from the Twitch API
     * @reject {null} _ No data is returned
     */

  }, {
    key: 'get_user_videos',
    value: function get_user_videos(channel) {
      var limit = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 15;
      var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

      var _this5 = this;

      var broadcasts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
      var hls_only = arguments[4];

      var url = this.base_url + '/channels/' + channel + '/videos?limit=' + limit + '&offset=' + offset + (broadcasts ? '&broadcasts=true' : '') + (hls_only ? '&hls=true' : '');
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this5.client_id }).then(function (_data) {
          data.next = _data._links.next;
          data.videos = [];

          _data.videos.forEach(function (item) {
            console.log(item);
            var video = {};
            video.name = item.title;
            video.description = item.description;
            video.broadcast_id = item.broadcast_id;
            video.id = item._id;
            video.type = item.broadcast_type;
            video.views = item.views;
            video.created_at = item.created_at;
            video.game = item.game;
            video.channel = item.channel.name;
            video.channel_display_name = item.channel.display_name;

            if (!item.thumbnails[0]) {
              video.thumbnail = 'http://localhost:3000/assets/img/placeholder.jpg';
            } else {
              video.thumbnail = item.thumbnails[0].url;
            }

            data.videos.push(video);
          });

          resolve(data);
        }).catch(console.error);
      });
    }

    /**
     * @method get_stream
     * @description Retrieves a given channel's stream if it is available
     * @param {String} channel The channel to request
     * 
     * @promise
     * @resolve {Object} _data The stream data from the Twitch API
     */

  }, {
    key: 'get_stream',
    value: function get_stream(channel) {
      var _this6 = this;

      var url = this.base_url + '/streams/' + channel;
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this6.client_id }).then(function (_data) {
          resolve(_data);
        });
      }).catch(console.error);
    }

    // Retrieves a user's video follows given an authentication token
    /**
     * @method get_user_video_follows
     * @description Retrieves a user's video follows given an authentication token
     * @param {String} token The authentication token to use
     * 
     * @promise
     * @resolve {Object} _data The video follows from the Twitch API
     * @reject {null} _ No data is returned
     */

  }, {
    key: 'get_user_video_follows',
    value: function get_user_video_follows(token) {
      var _this7 = this;

      var url = this.base_url + '/videos/followed?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this7.client_id }).then(function (_data) {
          resolve(_data.streams);
        }).catch(console.error);
      });
    }

    // Retrieves a user's stream follows given an authentication token
    /**
     * @method get_user_stream_follows
     * @description Retrieves a user's stream follows given an authentication token
     * @param {String} token The authentication token to use
     * 
     * @promise
     * @resolve {Object} _data The streams from the Twitch API
     * @reject {null} _ No data is returned
     */

  }, {
    key: 'get_user_stream_follows',
    value: function get_user_stream_follows(token) {
      var _this8 = this;

      var url = this.base_url + '/streams/followed?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this8.client_id }).then(function (_data) {
          resolve(_data.streams.map(function (stream) {
            stream.type = 'stream';
            return stream;
          }));
        }).catch(console.error);
      });
    }
  }]);

  return twitch;
}();

exports.default = twitch;

},{"./ajax.js":1}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _poster = require('./poster.js');

var _poster2 = _interopRequireDefault(_poster);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @class video_row
 * @description The video row component, constructs a video row
 */
var video_row = function () {
  /**
   * @constructor
   * @param {String} name The name of the row
   * @param [Array] initial_videos An array of video objects to add
   * @param [Any=false] data An optional data object
   */
  function video_row(name, initial_videos, data) {
    var _this = this;

    _classCallCheck(this, video_row);

    this.videos = [];
    this.data = data || false;

    // Construct the element from a template
    this.row = document.importNode(document.querySelector('#row-template').content, true);
    this.row.querySelector('.title').innerText = name;
    this.wrapper = this.row.querySelector('.videos');

    // Some setup
    // Track the section of videos visible on screen
    this.section = 0;
    // The width of each video element
    this.video_width = 315;
    // The total sections loaded
    this.total_sections = 0;

    // Cache important DOM nodes
    this.videos_mask = this.row.querySelector('.videos__mask');
    this.control_left = this.row.querySelector('.row-control--left');
    this.control_right = this.row.querySelector('.row-control--right');

    // Navigate the row left by translating it
    this.control_left.addEventListener('click', function (event) {
      if (_this.section > 0) {
        _this.section--;
        // `translate3d` for graphics acceleration if available
        _this.videos_mask.style.transform = 'translate3d(' + _this.video_width * (window.innerWidth / _this.video_width) * -_this.section + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'left', section: _this.section, total_sections: _this.total_sections, row: _this, data: _this.data, videos: _this.videos.length });
    });
    // Navigate the row right
    this.control_right.addEventListener('click', function (event) {
      if (!(window.innerWidth * .7 * (_this.section + 1) > _this.wrapper.offsetWidth)) {
        _this.section++;
        _this.videos_mask.style.transform = 'translate3d(' + _this.video_width * (window.innerWidth / _this.video_width) * -_this.section + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'right', section: _this.section, total_sections: _this.total_sections, row: _this, data: _this.data, videos: _this.videos.length });
    });

    // Append the videos we were given
    if (initial_videos) {
      this.push(initial_videos);
    }
  }

  /**
   * @static
   * @method set_video_click_callback
   * @description Assign a callback to be run when a user clicks on a video poster
   * @param {Function} fn The function callback
   * 
   * @void
   */


  _createClass(video_row, [{
    key: 'push',


    // Add a video (or videos) to the row
    /**
     * @method push
     * @description Add a video (or videos) to the row
     * @param {Object|Array<Object>} video The video(s) to add
     * 
     * @void
     */
    value: function push(video) {
      var _this2 = this;

      // If we got an array, then call push for each item
      if (Array.isArray(video)) {
        video.forEach(function (v) {
          _this2.push(v);
        });
        return;
      }

      // Create a brand new poster for each video
      var element = new _poster2.default(video).element;

      // Register our click handler
      element.querySelector('.video').addEventListener('click', function () {
        video_row.prototype.video_click_callback(video);
      });
      this.videos.push(video);
      this.wrapper.appendChild(element);

      // Calculate the total number of sections loaded
      this.total_sections = this.wrapper.offsetWidth / (this.video_width * (window.innerWidth / this.video_width));
    }

    /**
     * @get element
     * @description Returns the base DOM element of the component
     * 
     * @return {HTMLElement} slide The base DOM element of the component
     */

  }, {
    key: 'element',
    get: function get() {
      return this.row;
    }
  }], [{
    key: 'set_video_click_callback',
    value: function set_video_click_callback(fn) {
      video_row.prototype.video_click_callback = fn;
    }

    /**
     * @static
     * @method set_navigation_callback
     * @description Assign a callback to be run when a user navigates left or right in the row
     * @param {Function} fn The function callback
     * 
     * @void
     */

  }, {
    key: 'set_navigation_callback',
    value: function set_navigation_callback(fn) {
      video_row.prototype.navigation_callback = fn;
    }
  }]);

  return video_row;
}();

exports.default = video_row;

},{"./poster.js":5}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYWpheC5qcyIsInNyYy9qcy9hcHAuanMiLCJzcmMvanMvaGVyby1zbGlkZS5qcyIsInNyYy9qcy9wbGF5ZXIuanMiLCJzcmMvanMvcG9zdGVyLmpzIiwic3JjL2pzL3JvdXRlci5qcyIsInNyYy9qcy9zdG9yYWdlLmpzIiwic3JjL2pzL3R3aXRjaC5qcyIsInNyYy9qcy92aWRlby1yb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FDQUE7Ozs7SUFJTSxJO0FBQ0o7OztBQUdBLGtCQUFjO0FBQUE7O0FBQ1o7OztBQUdBLFNBQUssT0FBTDtBQUNEOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBaUJJLEcsRUFBSyxTLEVBQVcsTyxFQUFTO0FBQUE7O0FBQzNCLGFBQU8sSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtBQUN0QyxjQUFLLE9BQUwsR0FBZSxJQUFJLGNBQUosRUFBZjtBQUNBLGNBQUssT0FBTCxDQUFhLElBQWIsQ0FBa0IsS0FBbEIsRUFBeUIsR0FBekIsRUFBOEIsSUFBOUI7O0FBRUE7QUFDQSxZQUFJLE9BQUosRUFBYTtBQUNYLGlCQUFPLElBQVAsQ0FBWSxPQUFaLEVBQ0csT0FESCxDQUNXLGVBQU87QUFDZCxrQkFBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsR0FBOUIsRUFBbUMsUUFBUSxHQUFSLENBQW5DO0FBQ0QsV0FISDtBQUlEOztBQUVEO0FBQ0EsY0FBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsTUFBOUIsRUFBc0MsWUFBTTtBQUMxQyxrQkFBUSxZQUFZLEtBQUssS0FBTCxDQUFXLE1BQUssT0FBTCxDQUFhLFFBQXhCLENBQVosR0FBZ0QsTUFBSyxPQUFMLENBQWEsUUFBckU7QUFDRCxTQUZEOztBQUlBO0FBQ0EsY0FBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsT0FBOUIsRUFBdUMs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LElBQVosQ0FBaUIsS0FBakI7QUFDQSxXQUFLLE9BQUwsQ0FBYSxXQUFiLENBQXlCLE9BQXpCOztBQUVBO0FBQ0EsV0FBSyxjQUFMLEdBQXNCLEtBQUssT0FBTCxDQUFhLFdBQWIsSUFBNkIsS0FBSyxXQUFMLElBQW9CLE9BQU8sVUFBUCxHQUFvQixLQUFLLFdBQTdDLENBQTdCLENBQXRCO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozt3QkFNYztBQUNaLGFBQU8sS0FBSyxHQUFaO0FBQ0Q7Ozs2Q0F2RCtCLEUsRUFBSTtBQUNsQyxnQkFBVSxTQUFWLENBQW9CLG9CQUFwQixHQUEyQyxFQUEzQztBQUNEOztBQUVEOzs7Ozs7Ozs7Ozs0Q0FRK0IsRSxFQUFJO0FBQ2pDLGdCQUFVLFNBQVYsQ0FBb0IsbUJBQXBCLEdBQTBDLEVBQTFDO0FBQ0Q7Ozs7OztrQkE0Q1ksUyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcclxuICogQGNsYXNzIGFqYXhcclxuICogQGRlc2NyaXB0aW9uIFBlcmZvcm1zIEhUVFAgcmVxdWVzdHNcclxuICovXHJcbmNsYXNzIGFqYXgge1xyXG4gIC8qKlxyXG4gICAqIEBjb25zdHJ1Y3RvclxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgLyoqXHJcbiAgICAgKiBAbWVtYmVyIHtYTUxIdHRwUmVxdWVzdH0gcmVxdWVzdCBUaGUgcmVxdWVzdCBiZWluZyBtYWRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVxdWVzdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZXRob2QgZ2V0XHJcbiAgICogQGRlc2NyaXB0aW9uIFBlcmZvcm1zIGEgYGdldGAgcmVxdWVzdCB0byBhIGdpdmVuIGVuZHBvaW50XHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBUaGUgdXJsIHRvIHJlcXVlc3RcclxuICAgKiBAcGFyYW0gW0Jvb2w9ZmFsc2VdIHBhcnNlSlNPTiBXaGV0aGVyIG9yIG5vdCB0byBwYXJzZSB0aGUgcmVzcG9uc2UgYmVmb3JlIHJlc29sdXRpb25cclxuICAgKiBAcGFyYW0gW09iamVjdF0gaGVhZGVycyBBIG1hcCBvZiBoZWFkZXJzIHRvIHNlbmRcclxuICAgKiBcclxuICAgKiBAcHJvbWlzZVxyXG4gICAqIEByZXNvbHZlIHtPYmplY3R8U3RyaW5nfSByZXNwb25zZSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXHJcbiAgICogQHJlamVjdCB7RXJyb3J9IGVyciBUaGUgZXJyb3IgdGhhdCBvY2N1cnJlZFxyXG4gICAqIFxyXG4gICAqIEBleGFtcGxlXHJcbiAgICogbGV0IGh0dHAgPSBuZXcgYWpheCgpXHJcbiAgICogXHJcbiAgICogaHR0cC5nZXQoJ2V4YW1wbGUuY29tJylcclxuICAgKiAgIC50aGVuKHJlc3BvbnNlID0+IC4uLilcclxuICAgKi9cclxuICBnZXQodXJsLCBwYXJzZUpTT04sIGhlYWRlcnMpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIHRoaXMucmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgICB0aGlzLnJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcclxuXHJcbiAgICAgIC8vIEFwcGVuZCBoZWFkZXJzIGlmIHRoZXkgd2VyZSBwYXNzZWRcclxuICAgICAgaWYgKGhlYWRlcnMpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhoZWFkZXJzKVxyXG4gICAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pXHJcbiAgICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBXaGVuIHRoZSByZXF1ZXN0IGZpbmlzaGVzLCByZXNvbHZlIHdpdGggdGhlIHJlc3BvbnNlXHJcbiAgICAgIHRoaXMucmVxdWVzdC5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgKCkgPT4ge1xyXG4gICAgICAgIHJlc29sdmUocGFyc2VKU09OID8gSlNPTi5wYXJzZSh0aGlzLnJlcXVlc3QucmVzcG9uc2UpIDogdGhpcy5yZXF1ZXN0LnJlc3BvbnNlKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBPciByZWplY3Qgd2l0aCBhbiBlcnJvclxyXG4gICAgICB0aGlzLnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoKSA9PiB7XHJcbiAgICAgICAgcmVqZWN0KCdGYWlsZWQgdG8gY29tbXVuaWNhdGUgd2l0aCBzZXJ2ZXIgYXQgdXJsOiAnICsgdXJsKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBTZW5kIHRoZSByZXNwb25zZVxyXG4gICAgICB0aGlzLnJlcXVlc3Quc2VuZCgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBhamF4O1xyXG4iLCJpbXBvcnQgdHdpdGNoIGZyb20gJy4vdHdpdGNoLmpzJztcclxuaW1wb3J0IHN0b3JhZ2UgZnJvbSAnLi9zdG9yYWdlLmpzJztcclxuaW1wb3J0IHNsaWRlIGZyb20gJy4vaGVyby1zbGlkZS5qcyc7XHJcbmltcG9ydCB2aWRlb19yb3cgZnJvbSAnLi92aWRlby1yb3cuanMnO1xyXG5pbXBvcnQge2RlZmF1bHQgYXMgYmxpbmtfcm91dGVyfSBmcm9tICcuL3JvdXRlci5qcyc7XHJcbmltcG9ydCB7ZGVmYXVsdCBhcyBibGlua19wbGF5ZXJ9IGZyb20gJy4vcGxheWVyLmpzJztcclxuXHJcbi8vIFR3aXRjaCBjbGllbnQgaWQgZm9yIGFwaSByZXF1ZXN0c1xyXG5jb25zdCBjbGllbnRfaWQgPSAnYm0wMm44d3h4enFtenZmYjB6bGViZDV5ZTJybjByNyc7XHJcblxyXG4vLyBDb25zdHJ1Y3QgYW4gYXBpIHdyYXBwZXIgaW5zdGFuY2UsIHN0b3JhZ2UgaW5zdGFuY2UsIGFuZCBhIHZpZXcgcm91dGVyXHJcbmxldCBhcGkgPSBuZXcgdHdpdGNoKGNsaWVudF9pZCk7XHJcbmxldCBkYiA9IG5ldyBzdG9yYWdlKCdibGluaycpO1xyXG5sZXQgcm91dGVyID0gbmV3IGJsaW5rX3JvdXRlcigpO1xyXG5cclxuLy8gQXR0ZW1wdCB0byBsb2FkIGEgcHJldmlvdXMgdG9rZW4gZnJvbSBsb2NhbCBzdG9yYWdlXHJcbmxldCBPQVVUSF9UT0tFTiA9IGRiLmxvYWQoJ29hdXRoX3Rva2VuJyk7XHJcblxyXG4vLyBJZiB3ZSBkb24ndCBoYXZlIGFuIG9hdXRoIHRva2VuLCB0aGVuIGNoZWNrIGluIHRoZSB1cmwgaGFzaFxyXG5pZiAoIU9BVVRIX1RPS0VOKSB7XHJcbiAgbGV0IGhhc2ggPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLnN1YnN0cigxLCBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmxlbmd0aCk7XHJcbiAgbGV0IHBhaXJzID0gaGFzaC5zcGxpdCgnJicpO1xyXG4gIHBhaXJzLmZvckVhY2goKHBhaXIpID0+IHtcclxuICAgIGxldCBrZXlzID0gcGFpci5zcGxpdCgnPScpO1xyXG5cclxuICAgIC8vIElmIHdlIGhhdmUgYSB0b2tlbiwgdGhlbiBzYXZlIGl0IGFuZCB3aXBlIHRoZSB1cmwgaGFzaFxyXG4gICAgaWYgKGtleXNbMF0gPT0gJ2FjY2Vzc190b2tlbicpIHtcclxuICAgICAgT0FVVEhfVE9LRU4gPSBrZXlzWzFdO1xyXG4gICAgICBkYi5zYXZlKCdvYXV0aF90b2tlbicsIE9BVVRIX1RPS0VOKTtcclxuICAgICAgZG9jdW1lbnQubG9jYXRpb24uaGFzaCA9ICcvJztcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpID0+IHtcclxuICAvLyBDb25zdHJ1Y3QgYSBuZXcgd3JhcHBlciBmb3IgdGhlIHR3aXRjaCBwbGF5ZXJcclxuICBsZXQgcGxheWVyID0gbmV3IGJsaW5rX3BsYXllcigncGxheWVyLXdyYXBwZXInKTtcclxuXHJcbiAgLy8gUm91dGluZ1xyXG4gIHJvdXRlci5hZGRfcm91dGUoW1xyXG4gICAgeyd2aWRlb3MnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdmlkZW9zJyl9LFxyXG4gICAgeydwbGF5ZXInOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGxheWVyJyl9LFxyXG4gICAgeydzZWFyY2gnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2VhcmNoJyl9LFxyXG4gICAgeydwcm9tcHQnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJvbXB0Jyl9XHJcbiAgXSk7XHJcblxyXG4gIGlmICghT0FVVEhfVE9LRU4pIHtcclxuICAgIC8vIElmIHdlIGRvbid0IGhhdmUgYW4gb2F1dGggdG9rZW4sIGFzayB0aGUgdXNlciB0byBzaWduIGluXHJcbiAgICByb3V0ZXIucm91dGUoJ3Byb21wdCcpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBPdGhlcndpc2UsIGxldCB0aGVtIHZpZXcgdGhlaXIgY29udGVudFxyXG4gICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcclxuICB9XHJcblxyXG4gIC8vIEV4aXRzIHRoZSBwbGF5ZXIgb24gY2xpY2tcclxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZXhpdC1idG4nKVxyXG4gICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgIHBsYXllci5kZXN0cm95KCk7XHJcbiAgICAgIHJvdXRlci5yb3V0ZSgndmlkZW9zJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgLy8gTG9hZHMgdGhlIHBsYXllciB3aGVuIGEgdmlkZW8gaXMgc2VsZWN0ZWRcclxuICB2aWRlb19yb3cuc2V0X3ZpZGVvX2NsaWNrX2NhbGxiYWNrKCh2aWRlbykgPT4ge1xyXG4gICAgaWYgKHZpZGVvLnR5cGUgPT0gJ2FyY2hpdmUnKSB7XHJcbiAgICAgIHBsYXllci5sb2FkKHsgdmlkZW86IHZpZGVvLmlkIH0pO1xyXG4gICAgfSBlbHNlIGlmICh2aWRlby50eXBlID09ICdzdHJlYW0nKSB7XHJcbiAgICAgIHBsYXllci5sb2FkKHsgY2hhbm5lbDogdmlkZW8uY2hhbm5lbC5uYW1lIH0pO1xyXG4gICAgfVxyXG4gICAgcm91dGVyLnJvdXRlKCdwbGF5ZXInKTtcclxuICB9KTtcclxuXHJcbiAgLy8gTG9hZCBtb3JlIGNvbnRlbnQgd2hlbiB0aGUgdXNlciBzY3JvbGxzIHRvIHRoZSBzaWRlXHJcbiAgdmlkZW9fcm93LnNldF9uYXZpZ2F0aW9uX2NhbGxiYWNrKChldmVudCkgPT4ge1xyXG4gICAgaWYgKGV2ZW50LnNlY3Rpb24gPj0gZXZlbnQudG90YWxfc2VjdGlvbnMgLSAyICYmIGV2ZW50LmRhdGEpIHtcclxuICAgICAgYXBpLmdldF91c2VyX3ZpZGVvcyhldmVudC5kYXRhLnVzZXJuYW1lLCBldmVudC5kYXRhLmxpbWl0LCBldmVudC52aWRlb3MpXHJcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICBldmVudC5yb3cucHVzaChyZXNwb25zZS52aWRlb3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvLyBMb2FkIHRoZSBwbGF5ZXIgd2hlbiB0aGUgdXNlciBjbGlja3Mgb24gdGhlIFwid2F0Y2ggbm93XCJcclxuICAvLyAgYnV0dG9uIGluIHRoZSBiYW5uZXJcclxuICBzbGlkZS5zZXRfd2F0Y2hfbm93X2NhbGxiYWNrKChzdHJlYW0pID0+IHtcclxuICAgIHBsYXllci5sb2FkKHsgY2hhbm5lbDogc3RyZWFtLm5hbWUgfSk7XHJcbiAgICByb3V0ZXIucm91dGUoJ3BsYXllcicpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBHZXQgdGhlIGN1cnJlbnQgdXNlcidzIGluZm9cclxuICBhcGkuZ2V0X3VzZXIoT0FVVEhfVE9LRU4pXHJcbiAgICAudGhlbigodXNlcikgPT4ge1xyXG4gICAgICAvLyBHZXQgYWxsIGxpdmUgZm9sbG93ZWQgY2hhbm5lbHNcclxuICAgICAgYXBpLmdldF91c2VyX3N0cmVhbV9mb2xsb3dzKE9BVVRIX1RPS0VOKVxyXG4gICAgICAgIC50aGVuKChzdHJlYW1zKSA9PiB7XHJcbiAgICAgICAgICAvLyBQb3B1bGF0ZSB0aGUgaGVybyBiYW5uZXJcclxuICAgICAgICAgIGxldCBpc19maXJzdCA9IHRydWU7XHJcbiAgICAgICAgICBzdHJlYW1zLmZvckVhY2goKHN0cmVhbSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgcyA9IG5ldyBzbGlkZShzdHJlYW0pO1xyXG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHMuZWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKGlzX2ZpcnN0KSB7XHJcbiAgICAgICAgICAgICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcuaGVyb19fc2xpZGUnKS5jbGFzc0xpc3QuYWRkKCd2aXNpYmxlJyk7XHJcbiAgICAgICAgICAgICAgaXNfZmlyc3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaGVybycpLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gQ3JlYXRlIGEgdmlkZW8gcm93IG9mIFwibGl2ZVwiIHN0cmVhbXNcclxuICAgICAgICAgIGxldCByb3cgPSBuZXcgdmlkZW9fcm93KCdMaXZlJywgc3RyZWFtcyk7XHJcbiAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdmlkZW9zJykuYXBwZW5kQ2hpbGQocm93LmVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgIC8vIFBvcHVsYXRlIHRoZSByZXN0XHJcbiAgICAgICAgICBhcGkuZ2V0X2ZvbGxvd3MoT0FVVEhfVE9LRU4sIHVzZXIubmFtZSlcclxuICAgICAgICAgICAgLnRoZW4oKGNoYW5uZWxzKSA9PiB7XHJcbiAgICAgICAgICAgICAgcXVldWVfcm93cyhjaGFubmVscy5mb2xsb3dzKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICBsZXQgaGVyb19oaWdobGlnaHRfc3BvdHMgPSAxO1xyXG4gIGxldCBoZXJvX3Nwb3RsaWdodHMgPSBbXTtcclxuXHJcbiAgLy8gQXN5bmMgY3JlYXRlcyB2aWRlbyByb3dzXHJcbiAgZnVuY3Rpb24gcXVldWVfcm93cyh1c2Vycykge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaWYgKHVzZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBmaWxsKHVzZXJzWzBdKVxyXG4gICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodXNlcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgIHF1ZXVlX3Jvd3ModXNlcnMuc2xpY2UoMSwgdXNlcnMubGVuZ3RoKSkudGhlbihyZXNvbHZlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLy8gQ3JlYXRlcyBhbiBpbmRpdmlkdWFsIHZpZGVvIHJvdyBhbmQgZmlsbHMgaXQgd2l0aCBhdmFpbGFibGUgY29udGVudFxyXG4gIGZ1bmN0aW9uIGZpbGwodXNlciwgaXNMYXN0KSB7XHJcbiAgICBsZXQgcm93ID0gbmV3IHZpZGVvX3Jvdyh1c2VyLmNoYW5uZWwuZGlzcGxheV9uYW1lLCBudWxsLCB7IHVzZXJuYW1lOiB1c2VyLmNoYW5uZWwubmFtZSwgbGltaXQ6IDEwfSk7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKHVzZXIuY2hhbm5lbC5uYW1lLCAxMClcclxuICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgIGlmIChyZXNwb25zZS52aWRlb3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByb3cucHVzaChyZXNwb25zZS52aWRlb3MpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdmlkZW9zJykuYXBwZW5kQ2hpbGQocm93LmVsZW1lbnQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuICB9XHJcbn0pO1xyXG4iLCIvKipcclxuICogQGNsYXNzIHNsaWRlXHJcbiAqIEBkZXNjcmlwdGlvbiBBbiBpbmRpdmlkdWFsIGhlcm8gc2xpZGVcclxuICovXHJcbmNsYXNzIHNsaWRlIHtcclxuICAvKipcclxuICAgKiBAY29uc3RydWN0b3JcclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihzdHJlYW0pIHtcclxuICAgIC8qKlxyXG4gICAgICogQG1lbWJlciBzbGlkZVxyXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBiYXNlIERPTSBlbGVtZW50IG9mIHRoZSBjb21wb25lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5zbGlkZSA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2hlcm8tdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcclxuXHJcbiAgICAvLyBBdHRlbXB0IHRvIGZpbmQgYW4gaW1hZ2UgZm9yIHRoZSB2aWRlb1xyXG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcuc2xpZGVfX2ltYWdlJykuc3JjID0gc3RyZWFtLmNoYW5uZWwucHJvZmlsZV9iYW5uZXIgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbS5jaGFubmVsLnZpZGVvX2Jhbm5lciB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmNoYW5uZWwubG9nbztcclxuXHJcbiAgICAvLyBQb3B1bGF0ZSB0aGUgY29udGVudFxyXG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcuc2xpZGVfX2NvbnRlbnRfX2NoYW5uZWwnKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5kaXNwbGF5X25hbWU7XHJcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9fY29udGVudF9fZGVzY3JpcHRpb24nKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5zdGF0dXMgfHwgXCJTdHJlYW1pbmcgTGl2ZVwiO1xyXG5cclxuICAgIC8vIFdoZW4gYSB1c2VyIGNsaWNrcyB0aGUgXCJXYXRjaCBOb3dcIiBidXR0b24sIGxvYWQgdGhlIHN0cmVhbSBpbiB0aGUgcGxheWVyXHJcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy53YXRjaC1ub3ctYnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcclxuICAgICAgc2xpZGUucHJvdG90eXBlLndhdGNoX25vd19jYWxsYmFjayh7XHJcbiAgICAgICAgbmFtZTogc3RyZWFtLmNoYW5uZWwubmFtZVxyXG4gICAgICB9KVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1ldGhvZCBzZXRfd2F0Y2hfbm93X2NhbGxiYWNrXHJcbiAgICogQGRlc2NyaXB0aW9uIEFzc2lnbnMgYSBmdW5jdGlvbiBhcyBhIGNhbGxiYWNrIGZvciB3aGVuIGEgdXNlciBjbGlja3MgdGhlIFwid2F0Y2ggbm93XCIgYnV0dG9uXHJcbiAgICogXHJcbiAgICogQHZvaWRcclxuICAgKi9cclxuICBzdGF0aWMgc2V0X3dhdGNoX25vd19jYWxsYmFjayhmbikge1xyXG4gICAgc2xpZGUucHJvdG90eXBlLndhdGNoX25vd19jYWxsYmFjayA9IGZuO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQGdldCBlbGVtZW50XHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHVybnMgdGhlIGJhc2UgRE9NIGVsZW1lbnQgb2YgdGhlIGNvbXBvbmVudFxyXG4gICAqIFxyXG4gICAqIEByZXR1cm4ge0hUTUxFbGVtZW50fSBzbGlkZSBUaGUgYmFzZSBET00gZWxlbWVudCBvZiB0aGUgY29tcG9uZW50XHJcbiAgICovXHJcbiAgZ2V0IGVsZW1lbnQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5zbGlkZTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHNsaWRlO1xyXG4iLCIvKipcclxuICogQGNsYXNzIHBsYXllclxyXG4gKiBAZGVzY3JpcHRpb24gQSB3cmFwcGVyIGZvciB0aGUgb2ZmaWNpYWwgVHdpdGNoIHBsYXllclxyXG4gKi9cclxuY2xhc3MgcGxheWVyIHtcclxuICAvKipcclxuICAgKiBAY29uc3RydWN0b3JcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBlbGVtZW50IHRvIG1vdW50XHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoaWQpIHtcclxuICAgIC8qKlxyXG4gICAgICogQG1lbWJlciB7U3RyaW5nfSBpZCBUaGUgaWQgb2YgdGhlIGVsZW1lbnQgd2hpY2ggdGhlIHBsYXllciBpcyBtb3VudGVkIG9uXHJcbiAgICAgKi9cclxuICAgIHRoaXMuaWQgPSBpZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBtZW1iZXIge09iamVjdH0gcGxheWVyIFRoZSBUd2l0Y2ggcGxheWVyIGluc3RhbmNlXHJcbiAgICAgKi9cclxuICAgIHRoaXMucGxheWVyO1xyXG5cclxuICAgIC8vIFJlc2l6ZSB0aGUgcGxheWVyIGlmIG5lY2Vzc2FyeVxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcclxuICAgICAgICBsZXQgaSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lmcmFtZScpO1xyXG4gICAgICAgIGkud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgICAgICBpLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWV0aG9kIGxvYWRcclxuICAgKiBAZGVzY3JpcHRpb24gTG9hZHMgYSB2aWRlbyBvciBzdHJlYW0gaW50byB0aGUgcGxheWVyXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcclxuICAgKiBAcGFyYW0gW1N0cmluZ10gb3B0aW9ucy52aWRlbyBUaGUgdmlkZW8gaWQgdG8gbG9hZFxyXG4gICAqIEBwYXJhbSBbU3RyaW5nXSBvcHRpb25zLmNoYW5uZWwgVGhlIGNoYW5uZWwgc3RyZWFtIHRvIGxvYWRcclxuICAgKiBcclxuICAgKiBAdm9pZFxyXG4gICAqL1xyXG4gIGxvYWQob3B0aW9ucyA9IHt2aWRlbywgY2hhbm5lbH0pIHtcclxuICAgIGxldCBjb25maWcgPSB7XHJcbiAgICAgIHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCxcclxuICAgICAgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHRcclxuICAgIH07XHJcbiAgICBpZiAob3B0aW9ucy52aWRlbykgY29uZmlnLnZpZGVvID0gb3B0aW9ucy52aWRlbztcclxuICAgIGlmIChvcHRpb25zLmNoYW5uZWwpIGNvbmZpZy5jaGFubmVsID0gb3B0aW9ucy5jaGFubmVsO1xyXG5cclxuICAgIHRoaXMucGxheWVyID0gbmV3IFR3aXRjaC5QbGF5ZXIodGhpcy5pZCwgY29uZmlnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZXRob2QgcGxheVxyXG4gICAqIEBkZXNjcmlwdGlvbiBQbGF5cyB0aGUgcGxheWVyXHJcbiAgICogXHJcbiAgICogQHZvaWRcclxuICAgKi9cclxuICBwbGF5KCkge1xyXG4gICAgdGhpcy5wbGF5ZXIucGxheSgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBwYXVzZVxyXG4gICAqIEBkZXNjcmlwdGlvbiBQYXVzZXMgdGhlIHBsYXllclxyXG4gICAqIFxyXG4gICAqIEB2b2lkXHJcbiAgICovXHJcbiAgcGF1c2UoKSB7XHJcbiAgICB0aGlzLnBsYXllci5wYXVzZSgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBkZXN0cm95XHJcbiAgICogQGRlc2NyaXB0aW9uIERlc3Ryb3lzIHRoZSBwbGF5ZXIgaW5zdGFuY2UgYW5kIHJlbW92ZXMgaXQgZnJvbSB0aGUgcGFnZVxyXG4gICAqIFxyXG4gICAqIEB2b2lkXHJcbiAgICovXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMucGxheWVyID0gJyc7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmlkKS5pbm5lckhUTUwgPSAnJztcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHBsYXllcjtcclxuIiwiLyoqXHJcbiAqIEBjbGFzcyBwb3N0ZXJcclxuICogQGRlc2NyaXB0aW9uIEEgc2luZ2xlIHZpZGVvIHBvc3RlciBjb21wb25lbnRcclxuICovXHJcbmNsYXNzIHBvc3RlciB7XHJcbiAgLyoqXHJcbiAgICogQGNvbnN0cnVjdG9yXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGdhbWUgQSBnYW1lIHZpZGVvIG9iamVjdCBmcm9tIHRoZSBUd2l0Y2ggQVBJIHRvIGxhb2RcclxuICAgKi9cclxuICBjb25zdHJ1Y3RvcihnYW1lKSB7XHJcbiAgICAvKipcclxuICAgICAqIEBtZW1iZXIgcG9zdGVyXHJcbiAgICAgKiBAZGVzY3JpcHRpb24gVGhlIGJhc2UgRE9NIG5vZGUgZm9yIHRoZSBjb21wb25lbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5wb3N0ZXIgPSBkb2N1bWVudC5pbXBvcnROb2RlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwb3N0ZXItdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcclxuXHJcbiAgICAvLyBJZiB0aGlzIGlzIGEgc3RyZWFtLCB0aGVuIHVzZSB0aGUgY2hhbm5lbCdzIGJhbm5lciBhbmQgbmFtZSBpZiBhdmFpbGFibGVcclxuICAgIGlmIChnYW1lLnR5cGUgPT0gJ3N0cmVhbScpIHtcclxuICAgICAgZ2FtZS50aHVtYm5haWwgPSBnYW1lLmNoYW5uZWwucHJvZmlsZV9iYW5uZXIgfHwgZ2FtZS5jaGFubmVsLmxvZ28gfHwgJyc7XHJcbiAgICAgIGdhbWUubmFtZSA9IGdhbWUuY2hhbm5lbC5kaXNwbGF5X25hbWUgfHwgZ2FtZS5jaGFubmVsLm5hbWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUG9wdWxhdGUgdGhlIHRodW1ibmFpbCBhbmQgdGl0bGVcclxuICAgIHRoaXMucG9zdGVyLnF1ZXJ5U2VsZWN0b3IoJy52aWRlb19faW1hZ2UnKS5zcmMgPSBnYW1lLnRodW1ibmFpbDtcclxuICAgIHRoaXMucG9zdGVyLnF1ZXJ5U2VsZWN0b3IoJy52aWRlb19fdGl0bGUnKS5pbm5lclRleHQgPSBnYW1lLm5hbWUubGVuZ3RoID4gMTYgPyBnYW1lLm5hbWUuc3Vic3RyKDAsIDE2KSArICcuLi4nIDogZ2FtZS5uYW1lO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQGdldCBlbGVtZW50XHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHVybnMgdGhlIGJhc2UgRE9NIGVsZW1lbnQgb2YgdGhlIGNvbXBvbmVudFxyXG4gICAqIFxyXG4gICAqIEByZXR1cm4ge0hUTUxFbGVtZW50fSBzbGlkZSBUaGUgYmFzZSBET00gZWxlbWVudCBvZiB0aGUgY29tcG9uZW50XHJcbiAgICovXHJcbiAgZ2V0IGVsZW1lbnQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5wb3N0ZXI7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBwb3N0ZXI7XHJcbiIsIi8qKlxyXG4gKiBAY2xhc3Mgcm91dGVyXHJcbiAqIEBkZXNjcmlwdGlvbiBIYW5kbGVzIHJvdXRpbmcgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gKi9cclxuY2xhc3Mgcm91dGVyIHtcclxuICAvKipcclxuICAgKiBAY29uc3RydWN0b3JcclxuICAgKiBAcGFyYW0gW09iamVjdF0gcm91dGVzIEEgcm91dGVzIG9iamVjdCB0byB1c2UgZm9yIHJvdXRpbmdcclxuICAgKi9cclxuICBjb25zdHJ1Y3Rvcihyb3V0ZXMgPSB7fSkge1xyXG4gICAgLyoqXHJcbiAgICAgKiBAbWVtYmVyIHtPYmplY3R9IHJvdXRlc1xyXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBtYXAgb2Ygcm91dGVzIGF2YWlsYWJsZSBpbiB0aGUgYXBwbGljYXRpb25cclxuICAgICAqL1xyXG4gICAgdGhpcy5yb3V0ZXMgPSByb3V0ZXM7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAbWVtYmVyIHtPYmplY3R9IGFjdGl2ZV9yb3V0ZVxyXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBjdXJyZW50LCB2aXNpYmxlIHJvdXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYWN0aXZlX3JvdXRlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCByb3V0ZVxyXG4gICAqIEBkZXNjcmlwdGlvbiBDaGFuZ2VzIHRoZSB2aWV3IHRvIGEgbmV3IHJvdXRlXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIHJvdXRlIHRvIHN3aXRjaCB0b1xyXG4gICAqIFxyXG4gICAqIEB2b2lkXHJcbiAgICovXHJcbiAgcm91dGUobmFtZSkge1xyXG4gICAgaWYgKHRoaXMuYWN0aXZlX3JvdXRlKSB0aGlzLmFjdGl2ZV9yb3V0ZS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XHJcbiAgICB0aGlzLmFjdGl2ZV9yb3V0ZSA9IHRoaXMucm91dGVzW25hbWVdO1xyXG4gICAgdGhpcy5yb3V0ZXNbbmFtZV0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBhZGRfcm91dGVcclxuICAgKiBAZGVzY3JpcHRpb24gQWRkcyBhIG5ldyByb3V0ZSBvciBtdWx0aXBsZSByb3V0ZXMgZnJvbSBhbiBBcnJheVxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fEFycmF5PE9iamVjdD59IHJvdXRlIFRoZSByb3V0ZShzKSB0byBhZGRcclxuICAgKiBcclxuICAgKiBAdm9pZFxyXG4gICAqL1xyXG4gIGFkZF9yb3V0ZShyb3V0ZSkge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkocm91dGUpKSB7XHJcbiAgICAgIHJvdXRlLmZvckVhY2goKHIpID0+IHtcclxuICAgICAgICB0aGlzLmFkZF9yb3V0ZShyKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQga2V5cyA9IE9iamVjdC5rZXlzKHJvdXRlKTtcclxuICAgIHRoaXMucm91dGVzW2tleXNbMF1dID0gcm91dGVba2V5c1swXV07XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCByb3V0ZXI7XHJcbiIsIi8qKlxyXG4gKiBAY2xhc3Mgc3RvcmFnZVxyXG4gKiBAZGVzY3JpcHRpb24gQSB3cmFwcGVyIGZvciB0aGUgbmF0aXZlIGxvY2FsIHN0b3JhZ2UgYXBpXHJcbiAqIFxyXG4gKiBNb3N0bHkgaW1wbGVtZW50ZWQgYmVjYXVzZSBJIHRob3VnaHQgaXQgd291bGQgYmUgYSBmdW4gbGl0dGxlIGNoYWxsZW5nZVxyXG4gKi9cclxuY2xhc3Mgc3RvcmFnZSB7XHJcbiAgY29uc3RydWN0b3IobmFtZXNwYWNlKSB7XHJcbiAgICB0aGlzLmxvYWRfc3RvcmFnZV9tYXAobmFtZXNwYWNlKTtcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZXMgYSAodmVyeSBsaWtlbHkpIHVuaXF1ZSBpZFxyXG4gIHVuaXF1ZV9pZChzaXplKSB7XHJcbiAgICBsZXQgYWxwaGFiZXQgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjEyMzQ1Njc4OTAkJi1fKyc7XHJcbiAgICBsZXQgaWQgPSAnJztcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XHJcbiAgICAgIGlkICs9IGFscGhhYmV0W01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFscGhhYmV0Lmxlbmd0aCldO1xyXG4gICAgfVxyXG5cclxuICAgIE9iamVjdC5rZXlzKHRoaXMuc3RvcmFnZV9tYXApLmZvckVhY2goKGtleSkgPT4ge1xyXG4gICAgICBpZiAoa2V5ID09PSBpZCkge1xyXG4gICAgICAgIHJldHVybiB1bmlxdWVfaWQoc2l6ZSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBpZDtcclxuICB9XHJcblxyXG4gIC8vIFNhdmVzIHNvbWUgZGF0YSBpbiBsb2NhbCBzdG9yYWdlXHJcbiAgc2F2ZShuYW1lLCBkYXRhKSB7XHJcbiAgICBpZiAoIXRoaXMuc3RvcmFnZV9tYXBbbmFtZV0pIHtcclxuICAgICAgdGhpcy5zdG9yYWdlX21hcFtuYW1lXSA9IHRoaXMudW5pcXVlX2lkKDUpO1xyXG4gICAgfVxyXG4gICAgbGV0IGtleSA9IHRoaXMuc3RvcmFnZV9tYXBbbmFtZV07XHJcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX0tJHtrZXl9YCwgKHR5cGVvZiBkYXRhID09ICdPYmplY3QnKSA/IEpTT04uc3RyaW5naWZ5KGRhdGEpIDogZGF0YSk7XHJcbiAgICB0aGlzLnNhdmVfc3RvcmFnZV9tYXAoKTtcclxuICB9XHJcblxyXG4gIC8vIExvYWRzIHNvbWUgZGF0YSBmcm9tIGxvY2FsIHN0b3JhZ2VcclxuICBsb2FkKG5hbWUpIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX0tJHt0aGlzLnN0b3JhZ2VfbWFwW25hbWVdfWApIHx8IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gUmVtb3ZlcyBzb21lIGRhdGEgZnJvbSBsb2NhbCBzdG9yYWdlXHJcbiAgZGVsZXRlKG5hbWUpIHtcclxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfS0ke3RoaXMuc3RvcmFnZV9tYXBbbmFtZV19YCk7XHJcbiAgfVxyXG5cclxuICAvLyBTYXZlcyB0aGUgY3VycmVudCBzdG9yYWdlIG1hcCBzdGF0ZSBcclxuICBzYXZlX3N0b3JhZ2VfbWFwKCkge1xyXG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9YCwgSlNPTi5zdHJpbmdpZnkodGhpcy5zdG9yYWdlX21hcCkpO1xyXG4gIH1cclxuXHJcbiAgLy8gTG9hZHMgdGhlIGEgc3RvcmFnZSBtYXAgZnJvbSBsb2NhbCBzdG9yYWdlIChhbmQgaW4gYSBjZXJ0YWluIG5hbWVzcGFjZSlcclxuICBsb2FkX3N0b3JhZ2VfbWFwKG5hbWVzcGFjZSkge1xyXG4gICAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XHJcbiAgICB0aGlzLnN0b3JhZ2VfbWFwID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX1gKSB8fCAne30nKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHN0b3JhZ2U7XHJcbiIsImltcG9ydCBhamF4IGZyb20gJy4vYWpheC5qcyc7XHJcblxyXG5sZXQgaHR0cCA9IG5ldyBhamF4KCk7XHJcblxyXG4vKipcclxuICogQGNsYXNzIHR3aXRjaFxyXG4gKiBAZGVzY3JpcHRpb24gQSB3cmFwcGVyIGZvciB0aGUgVHdpdGNoIEFQSVxyXG4gKi9cclxuY2xhc3MgdHdpdGNoIHtcclxuICAvKipcclxuICAgKiBAY29uc3RydWN0b3JcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY2xpZW50X2lkIFRoZSBjbGllbnQgaWQgZm9yIHRoZSBUd2l0Y2ggYXBwXHJcbiAgICovXHJcbiAgY29uc3RydWN0b3IoY2xpZW50X2lkKSB7XHJcbiAgICBpZiAoIWNsaWVudF9pZCkgdGhyb3cgbmV3IEVycm9yKCdUd2l0Y2ggQVBJIHJlcXVpcmVzIGBjbGllbnRfaWRgIHRvIGJlIHNldCcpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQG1lbWJlciBiYXNlX3VybFxyXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBiYXNlIFR3aXRjaCBBUEkgdXJsXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYmFzZV91cmwgPSAnaHR0cHM6Ly9hcGkudHdpdGNoLnR2L2tyYWtlbic7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBAbWVtYmVyIGNsaWVudF9pZFxyXG4gICAgICogQGRlc2NyaXB0aW9uIFRoZSBjbGllbnQgaWQgdG8gc2VuZCBvbiByZXF1ZXN0c1xyXG4gICAgICovXHJcbiAgICB0aGlzLmNsaWVudF9pZCA9IGNsaWVudF9pZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZXRob2QgZ2V0X3VzZXJcclxuICAgKiBAZGVzY3JpcHRpb24gUmV0cmlldmVzIGEgc2luZ2xlIHVzZXIgZ2l2ZW4gYW4gYXV0aGVudGljYXRpb24gdG9rZW5cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gdG9rZW4gVGhlIGF1dGhlbnRpY2F0aW9uIHRva2VuIGZyb20gVHdpdGNoXHJcbiAgICogXHJcbiAgICogQHByb21pc2VcclxuICAgKiBAcmVzb2x2ZSB7T2JqZWN0fSBfZGF0YSBUaGUgdXNlciBvYmplY3QgZnJvbSB0aGUgVHdpdGNoIHNlcnZlclxyXG4gICAqIEByZWplY3Qge251bGx9IF8gTm8gcmV0dXJuIHZhbHVlXHJcbiAgICovXHJcbiAgZ2V0X3VzZXIodG9rZW4pIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS91c2VyP29hdXRoX3Rva2VuPSR7dG9rZW59YDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWV0aG9kIGdldF9mb2xsb3dzXHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHJpZXZlcyBhbGwgZm9sbG93ZWQgY2hhbm5lbHMgKHVwIHRvIDEwMCkgZm9yIGEgdXNlclxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgYXV0aGVudGljYXRpb24gdG9rZW5cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXNlciBUaGUgdXNlciB0byByZXF1ZXN0IGZvbGxvd3MgZm9yXHJcbiAgICogXHJcbiAgICogQHByb21pc2VcclxuICAgKiBAcmVzb2x2ZSB7T2JqZWN0fSBfZGF0YSBUaGUgZm9sbG93cyBvYmplY3QgZnJvbSB0aGUgVHdpdGNoIHNlcnZlclxyXG4gICAqIEByZWplY3Qge251bGx9IF8gTm8gcmV0dXJuIHZhbHVlXHJcbiAgICovXHJcbiAgZ2V0X2ZvbGxvd3ModG9rZW4sIHVzZXIpIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS91c2Vycy8ke3VzZXJ9L2ZvbGxvd3MvY2hhbm5lbHM/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIC8vIFRoZSBgX2RhdGFgIG5hbWUgaXMgaGVyZSBiZWNhdXNlIHByZXZpb3VzbHkgdGhlcmUgd2FzXHJcbiAgICAgICAgICAvLyAgYSBgZGF0YWAgdmFyaWFibGUgaW4gdGhlIHNhbWUgY2xvc3VyZSBiZWluZyBjb25zdHJ1Y3RlZFxyXG4gICAgICAgICAgX2RhdGEuZm9sbG93cy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPCBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYS5jaGFubmVsLmRpc3BsYXlfbmFtZS50b0xvd2VyQ2FzZSgpID4gYi5jaGFubmVsLmRpc3BsYXlfbmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWV0aG9kIGdldF90b3BfZ2FtZXNcclxuICAgKiBAZGVzY3JpcHRpb24gUmV0cmlldmVzIHRoZSB0b3AgZ2FtZXMgb24gVHdpdGNoIGF0IHRoZSBjdXJyZW50IG1vbWVudFxyXG4gICAqIEBwYXJhbSBbTnVtYmVyPTE1XSBsaW1pdCBUaGUgbWF4IG51bWJlciBvZiBnYW1lcyB0byByZXF1ZXN0XHJcbiAgICogQHBhcmFtIFtOdW1iZXI9MF0gb2Zmc2V0IFRoZSBvZmZzZXQgdG8gc3RhcnQgYXQgaW4gdGhlIGdhbWVzIGxpc3RcclxuICAgKiBcclxuICAgKiBAcHJvbWlzZVxyXG4gICAqIEByZXNvbHZlIHtPYmplY3R9IF9kYXRhIFRoZSBnYW1lcyBmcm9tIHRoZSBUd2l0Y2ggc2VydmVyXHJcbiAgICogQHJlamVjdCB7bnVsbH0gXyBObyBkYXRhIGlzIHJldHVybmVkXHJcbiAgICovXHJcbiAgZ2V0X3RvcF9nYW1lcyhsaW1pdCA9IDE1LCBvZmZzZXQgPSAwKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vZ2FtZXMvdG9wP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH1gO1xyXG4gICAgbGV0IGRhdGEgPSB7fTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIGRhdGEubmV4dCA9IF9kYXRhLl9saW5rcy5uZXh0O1xyXG4gICAgICAgICAgZGF0YS5nYW1lcyA9IFtdO1xyXG5cclxuICAgICAgICAgIF9kYXRhLnRvcC5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBnYW1lID0ge307XHJcbiAgICAgICAgICAgIGdhbWUudmlld2VycyA9IGl0ZW0udmlld2VycztcclxuICAgICAgICAgICAgZ2FtZS5jaGFubmVscyA9IGl0ZW0uY2hhbm5lbHM7XHJcbiAgICAgICAgICAgIGdhbWUubmFtZSA9IGl0ZW0uZ2FtZS5uYW1lO1xyXG4gICAgICAgICAgICBnYW1lLnBvc3RlcnMgPSB7XHJcbiAgICAgICAgICAgICAgbGFyZ2U6IGl0ZW0uZ2FtZS5ib3gubGFyZ2UsXHJcbiAgICAgICAgICAgICAgbWVkaXVtOiBpdGVtLmdhbWUuYm94Lm1lZGl1bSxcclxuICAgICAgICAgICAgICBzbWFsbDogaXRlbS5nYW1lLmJveC5zbWFsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWUudGh1bWJuYWlsID0gaXRlbS5nYW1lLmJveC5tZWRpdW07XHJcblxyXG4gICAgICAgICAgICBkYXRhLmdhbWVzLnB1c2goZ2FtZSk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZXRyaWV2ZXMgdGhlIHRvcCB2aWRlb3Mgb24gVHdpdGNoXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBnZXRfdG9wX3ZpZGVvc1xyXG4gICAqIEBkZXNjcmlwdGlvbiBSZXRyaWV2ZXMgdGhlIHRvcCB2aWRlb3Mgb24gVHdpdGNoXHJcbiAgICogQHBhcmFtIFtOdW1iZXI9MTVdIGxpbWl0IFRoZSBtYXggYW1vdW50IG9mIGdhbWVzIHRvIHJlY2lldmVcclxuICAgKiBAcGFyYW0gW051bWJlcj0wXSBvZmZzZXQgVGhlIG9mZnNldCBmb3IgcmVxdWVzdGluZyBnYW1lcyBmcm9tIHRoZSBsaXN0XHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdhbWUgVGhlIGdhbWUgdG8gcmVxdWVzdFxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwZXJpb2QgVGhlIHBlcmlvZCB0byByZXF1ZXN0XHJcbiAgICogXHJcbiAgICogQHByb21pc2VcclxuICAgKiBAcmVzb2x2ZSB7T2JqZWN0fSBkYXRhIFRoZSB0b3AgdmlkZW9zIGZyb20gdGhlIHR3aXRjaCBBUElcclxuICAgKiBAcmVqZWN0IHtudWxsfSBfIE5vIGRhdGEgaXMgcmV0dXJuZWRcclxuICAgKiBcclxuICAgKi9cclxuICBnZXRfdG9wX3ZpZGVvcyhsaW1pdCA9IDE1LCBvZmZzZXQgPSAwLCBnYW1lLCBwZXJpb2QpIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS92aWRlb3MvdG9wP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH0ke2dhbWUgPyAnJmdhbWU9JyArIGdhbWUgOiAnJ30ke3BlcmlvZCA/ICcmcGVyaW9kPScgKyBwZXJpb2QgOiAnJ31gO1xyXG4gICAgbGV0IGRhdGEgPSB7fTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIGRhdGEubmV4dCA9IF9kYXRhLl9saW5rcy5uZXh0O1xyXG4gICAgICAgICAgZGF0YS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgICBfZGF0YS52aWRlb3MuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdmlkZW8gPSB7fTtcclxuICAgICAgICAgICAgdmlkZW8ubmFtZSA9IGl0ZW0udGl0bGU7XHJcbiAgICAgICAgICAgIHZpZGVvLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdmlkZW8uYnJvYWRjYXN0X2lkID0gaXRlbS5icm9hZGNhc3RfaWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmlkID0gaXRlbS5faWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLnR5cGUgPSBpdGVtLmJyb2FkY2FzdF90eXBlO1xyXG4gICAgICAgICAgICB2aWRlby52aWV3cyA9IGl0ZW0udmlld3M7XHJcbiAgICAgICAgICAgIHZpZGVvLmNyZWF0ZWRfYXQgPSBpdGVtLmNyZWF0ZWRfYXQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmdhbWUgPSBpdGVtLmdhbWU7XHJcbiAgICAgICAgICAgIHZpZGVvLmNoYW5uZWwgPSBpdGVtLmNoYW5uZWwubmFtZTtcclxuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbF9kaXNwbGF5X25hbWUgPSBpdGVtLmNoYW5uZWwuZGlzcGxheV9uYW1lO1xyXG4gICAgICAgICAgICB2aWRlby50aHVtYm5haWwgPSBpdGVtLnRodW1ibmFpbHNbMF0udXJsO1xyXG5cclxuICAgICAgICAgICAgZGF0YS52aWRlb3MucHVzaCh2aWRlbyk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZXRyaWV2ZXMgYSB1c2VyJ3MgdmlkZW9zXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBnZXRfdXNlcl92aWRlb3NcclxuICAgKiBAZGVzY3JpcHRpb24gUmV0cmlldmVzIGEgdXNlcidzIHZpZGVvc1xyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjaGFubmVsIFRoZSBjaGFubmVsIHRvIHJlcXVlc3QgdmlkZW9zIGZyb21cclxuICAgKiBAcGFyYW0gW051bWJlcj0xNV0gbGltaXQgVGhlIG1heCBhbW91bnQgb2YgdmlkZW9zIHRvIHJlcXVlc3RcclxuICAgKiBAcGFyYW0gW051bWJlcj0wXSBvZmZzZXQgVGhlIG9mZnNldCB0byBzdGFydCBhdCBpbiB0aGUgdmlkZW9zIGxpc3RcclxuICAgKiBAcGFyYW0gW0Jvb2w9dHJ1ZV0gYnJvYWRjYXN0cyBXaGV0aGVyIG9yIG5vdCB0byByZXF1ZXN0IGJyb2FkY2FzdHNcclxuICAgKiBAcGFyYW0gW0Jvb2w9ZmFsc2VdIGhsc19vbmx5IFdoZXRoZXIgb3Igbm90IHRvIHJlcXVlc3QgSExTIHZpZGVvIG9ubHlcclxuICAgKiBcclxuICAgKiBAcHJvbWlzZVxyXG4gICAqIEByZXNvbHZlIHtPYmplY3R9IGRhdGEgVGhlIHZpZGVvcyBmcm9tIHRoZSBUd2l0Y2ggQVBJXHJcbiAgICogQHJlamVjdCB7bnVsbH0gXyBObyBkYXRhIGlzIHJldHVybmVkXHJcbiAgICovXHJcbiAgZ2V0X3VzZXJfdmlkZW9zKGNoYW5uZWwsIGxpbWl0ID0gMTUsIG9mZnNldCA9IDAsIGJyb2FkY2FzdHMgPSB0cnVlLCBobHNfb25seSkge1xyXG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L2NoYW5uZWxzLyR7Y2hhbm5lbH0vdmlkZW9zP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH0ke2Jyb2FkY2FzdHMgPyAnJmJyb2FkY2FzdHM9dHJ1ZScgOiAnJ30ke2hsc19vbmx5ID8gJyZobHM9dHJ1ZScgOiAnJ31gO1xyXG4gICAgbGV0IGRhdGEgPSB7fTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIGRhdGEubmV4dCA9IF9kYXRhLl9saW5rcy5uZXh0O1xyXG4gICAgICAgICAgZGF0YS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgICBfZGF0YS52aWRlb3MuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtKVxyXG4gICAgICAgICAgICBsZXQgdmlkZW8gPSB7fTtcclxuICAgICAgICAgICAgdmlkZW8ubmFtZSA9IGl0ZW0udGl0bGU7XHJcbiAgICAgICAgICAgIHZpZGVvLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdmlkZW8uYnJvYWRjYXN0X2lkID0gaXRlbS5icm9hZGNhc3RfaWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmlkID0gaXRlbS5faWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLnR5cGUgPSBpdGVtLmJyb2FkY2FzdF90eXBlO1xyXG4gICAgICAgICAgICB2aWRlby52aWV3cyA9IGl0ZW0udmlld3M7XHJcbiAgICAgICAgICAgIHZpZGVvLmNyZWF0ZWRfYXQgPSBpdGVtLmNyZWF0ZWRfYXQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmdhbWUgPSBpdGVtLmdhbWU7XHJcbiAgICAgICAgICAgIHZpZGVvLmNoYW5uZWwgPSBpdGVtLmNoYW5uZWwubmFtZTtcclxuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbF9kaXNwbGF5X25hbWUgPSBpdGVtLmNoYW5uZWwuZGlzcGxheV9uYW1lO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFpdGVtLnRodW1ibmFpbHNbMF0pIHtcclxuICAgICAgICAgICAgICB2aWRlby50aHVtYm5haWwgPSAnaHR0cDovL2xvY2FsaG9zdDozMDAwL2Fzc2V0cy9pbWcvcGxhY2Vob2xkZXIuanBnJztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB2aWRlby50aHVtYm5haWwgPSBpdGVtLnRodW1ibmFpbHNbMF0udXJsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkYXRhLnZpZGVvcy5wdXNoKHZpZGVvKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHJlc29sdmUoZGF0YSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZXRob2QgZ2V0X3N0cmVhbVxyXG4gICAqIEBkZXNjcmlwdGlvbiBSZXRyaWV2ZXMgYSBnaXZlbiBjaGFubmVsJ3Mgc3RyZWFtIGlmIGl0IGlzIGF2YWlsYWJsZVxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjaGFubmVsIFRoZSBjaGFubmVsIHRvIHJlcXVlc3RcclxuICAgKiBcclxuICAgKiBAcHJvbWlzZVxyXG4gICAqIEByZXNvbHZlIHtPYmplY3R9IF9kYXRhIFRoZSBzdHJlYW0gZGF0YSBmcm9tIHRoZSBUd2l0Y2ggQVBJXHJcbiAgICovXHJcbiAgZ2V0X3N0cmVhbShjaGFubmVsKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vc3RyZWFtcy8ke2NoYW5uZWx9YDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICB9XHJcblxyXG4gIC8vIFJldHJpZXZlcyBhIHVzZXIncyB2aWRlbyBmb2xsb3dzIGdpdmVuIGFuIGF1dGhlbnRpY2F0aW9uIHRva2VuXHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBnZXRfdXNlcl92aWRlb19mb2xsb3dzXHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHJpZXZlcyBhIHVzZXIncyB2aWRlbyBmb2xsb3dzIGdpdmVuIGFuIGF1dGhlbnRpY2F0aW9uIHRva2VuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRva2VuIFRoZSBhdXRoZW50aWNhdGlvbiB0b2tlbiB0byB1c2VcclxuICAgKiBcclxuICAgKiBAcHJvbWlzZVxyXG4gICAqIEByZXNvbHZlIHtPYmplY3R9IF9kYXRhIFRoZSB2aWRlbyBmb2xsb3dzIGZyb20gdGhlIFR3aXRjaCBBUElcclxuICAgKiBAcmVqZWN0IHtudWxsfSBfIE5vIGRhdGEgaXMgcmV0dXJuZWRcclxuICAgKi9cclxuICBnZXRfdXNlcl92aWRlb19mb2xsb3dzKHRva2VuKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vdmlkZW9zL2ZvbGxvd2VkP29hdXRoX3Rva2VuPSR7dG9rZW59JmxpbWl0PTEwMGA7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBodHRwLmdldCh1cmwsIHRydWUsIHsgJ0NsaWVudC1JRCc6IHRoaXMuY2xpZW50X2lkIH0pXHJcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XHJcbiAgICAgICAgICByZXNvbHZlKF9kYXRhLnN0cmVhbXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZXRyaWV2ZXMgYSB1c2VyJ3Mgc3RyZWFtIGZvbGxvd3MgZ2l2ZW4gYW4gYXV0aGVudGljYXRpb24gdG9rZW5cclxuICAvKipcclxuICAgKiBAbWV0aG9kIGdldF91c2VyX3N0cmVhbV9mb2xsb3dzXHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHJpZXZlcyBhIHVzZXIncyBzdHJlYW0gZm9sbG93cyBnaXZlbiBhbiBhdXRoZW50aWNhdGlvbiB0b2tlblxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0b2tlbiBUaGUgYXV0aGVudGljYXRpb24gdG9rZW4gdG8gdXNlXHJcbiAgICogXHJcbiAgICogQHByb21pc2VcclxuICAgKiBAcmVzb2x2ZSB7T2JqZWN0fSBfZGF0YSBUaGUgc3RyZWFtcyBmcm9tIHRoZSBUd2l0Y2ggQVBJXHJcbiAgICogQHJlamVjdCB7bnVsbH0gXyBObyBkYXRhIGlzIHJldHVybmVkXHJcbiAgICovXHJcbiAgZ2V0X3VzZXJfc3RyZWFtX2ZvbGxvd3ModG9rZW4pIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS9zdHJlYW1zL2ZvbGxvd2VkP29hdXRoX3Rva2VuPSR7dG9rZW59JmxpbWl0PTEwMGA7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICBodHRwLmdldCh1cmwsIHRydWUsIHsgJ0NsaWVudC1JRCc6IHRoaXMuY2xpZW50X2lkIH0pXHJcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XHJcbiAgICAgICAgICByZXNvbHZlKF9kYXRhLnN0cmVhbXMubWFwKChzdHJlYW0pID0+IHtcclxuICAgICAgICAgICAgc3RyZWFtLnR5cGUgPSAnc3RyZWFtJztcclxuICAgICAgICAgICAgcmV0dXJuIHN0cmVhbTtcclxuICAgICAgICAgIH0pKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgdHdpdGNoO1xyXG4iLCJpbXBvcnQgcG9zdGVyIGZyb20gJy4vcG9zdGVyLmpzJztcclxuXHJcbi8qKlxyXG4gKiBAY2xhc3MgdmlkZW9fcm93XHJcbiAqIEBkZXNjcmlwdGlvbiBUaGUgdmlkZW8gcm93IGNvbXBvbmVudCwgY29uc3RydWN0cyBhIHZpZGVvIHJvd1xyXG4gKi9cclxuY2xhc3MgdmlkZW9fcm93IHtcclxuICAvKipcclxuICAgKiBAY29uc3RydWN0b3JcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgcm93XHJcbiAgICogQHBhcmFtIFtBcnJheV0gaW5pdGlhbF92aWRlb3MgQW4gYXJyYXkgb2YgdmlkZW8gb2JqZWN0cyB0byBhZGRcclxuICAgKiBAcGFyYW0gW0FueT1mYWxzZV0gZGF0YSBBbiBvcHRpb25hbCBkYXRhIG9iamVjdFxyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGluaXRpYWxfdmlkZW9zLCBkYXRhKSB7XHJcbiAgICB0aGlzLnZpZGVvcyA9IFtdO1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YSB8fCBmYWxzZTtcclxuXHJcbiAgICAvLyBDb25zdHJ1Y3QgdGhlIGVsZW1lbnQgZnJvbSBhIHRlbXBsYXRlXHJcbiAgICB0aGlzLnJvdyA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Jvdy10ZW1wbGF0ZScpLmNvbnRlbnQsIHRydWUpO1xyXG4gICAgdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnRpdGxlJykuaW5uZXJUZXh0ID0gbmFtZTtcclxuICAgIHRoaXMud3JhcHBlciA9IHRoaXMucm93LnF1ZXJ5U2VsZWN0b3IoJy52aWRlb3MnKTtcclxuXHJcbiAgICAvLyBTb21lIHNldHVwXHJcbiAgICAvLyBUcmFjayB0aGUgc2VjdGlvbiBvZiB2aWRlb3MgdmlzaWJsZSBvbiBzY3JlZW5cclxuICAgIHRoaXMuc2VjdGlvbiA9IDA7XHJcbiAgICAvLyBUaGUgd2lkdGggb2YgZWFjaCB2aWRlbyBlbGVtZW50XHJcbiAgICB0aGlzLnZpZGVvX3dpZHRoID0gMzE1O1xyXG4gICAgLy8gVGhlIHRvdGFsIHNlY3Rpb25zIGxvYWRlZFxyXG4gICAgdGhpcy50b3RhbF9zZWN0aW9ucyA9IDA7XHJcblxyXG4gICAgLy8gQ2FjaGUgaW1wb3J0YW50IERPTSBub2Rlc1xyXG4gICAgdGhpcy52aWRlb3NfbWFzayA9IHRoaXMucm93LnF1ZXJ5U2VsZWN0b3IoJy52aWRlb3NfX21hc2snKTtcclxuICAgIHRoaXMuY29udHJvbF9sZWZ0ID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnJvdy1jb250cm9sLS1sZWZ0Jyk7XHJcbiAgICB0aGlzLmNvbnRyb2xfcmlnaHQgPSB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcucm93LWNvbnRyb2wtLXJpZ2h0Jyk7XHJcblxyXG4gICAgLy8gTmF2aWdhdGUgdGhlIHJvdyBsZWZ0IGJ5IHRyYW5zbGF0aW5nIGl0XHJcbiAgICB0aGlzLmNvbnRyb2xfbGVmdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAodGhpcy5zZWN0aW9uID4gMCkge1xyXG4gICAgICAgIHRoaXMuc2VjdGlvbi0tO1xyXG4gICAgICAgIC8vIGB0cmFuc2xhdGUzZGAgZm9yIGdyYXBoaWNzIGFjY2VsZXJhdGlvbiBpZiBhdmFpbGFibGVcclxuICAgICAgICB0aGlzLnZpZGVvc19tYXNrLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgnICsgKCh0aGlzLnZpZGVvX3dpZHRoICogKHdpbmRvdy5pbm5lcldpZHRoIC8gdGhpcy52aWRlb193aWR0aCkpICogLXRoaXMuc2VjdGlvbikgKyAncHgsIDAsIDApJztcclxuICAgICAgfVxyXG4gICAgICB2aWRlb19yb3cucHJvdG90eXBlLm5hdmlnYXRpb25fY2FsbGJhY2soeyBkaXJlY3Rpb246ICdsZWZ0JyAsIHNlY3Rpb246IHRoaXMuc2VjdGlvbiwgdG90YWxfc2VjdGlvbnM6IHRoaXMudG90YWxfc2VjdGlvbnMsIHJvdzogdGhpcywgZGF0YTogdGhpcy5kYXRhLCB2aWRlb3M6IHRoaXMudmlkZW9zLmxlbmd0aH0pO1xyXG4gICAgfSk7XHJcbiAgICAvLyBOYXZpZ2F0ZSB0aGUgcm93IHJpZ2h0XHJcbiAgICB0aGlzLmNvbnRyb2xfcmlnaHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcclxuICAgICAgaWYgKCEoKHdpbmRvdy5pbm5lcldpZHRoICogLjcpICogKHRoaXMuc2VjdGlvbiArIDEpID4gdGhpcy53cmFwcGVyLm9mZnNldFdpZHRoKSkge1xyXG4gICAgICAgIHRoaXMuc2VjdGlvbisrO1xyXG4gICAgICAgIHRoaXMudmlkZW9zX21hc2suc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKCcgKyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkgKiAtdGhpcy5zZWN0aW9uKSArICdweCwgMCwgMCknO1xyXG4gICAgICB9XHJcbiAgICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUubmF2aWdhdGlvbl9jYWxsYmFjayh7IGRpcmVjdGlvbjogJ3JpZ2h0JyAsIHNlY3Rpb246IHRoaXMuc2VjdGlvbiwgdG90YWxfc2VjdGlvbnM6IHRoaXMudG90YWxfc2VjdGlvbnMsIHJvdzogdGhpcywgZGF0YTogdGhpcy5kYXRhLCB2aWRlb3M6IHRoaXMudmlkZW9zLmxlbmd0aH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXBwZW5kIHRoZSB2aWRlb3Mgd2Ugd2VyZSBnaXZlblxyXG4gICAgaWYgKGluaXRpYWxfdmlkZW9zKSB7XHJcbiAgICAgIHRoaXMucHVzaChpbml0aWFsX3ZpZGVvcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAc3RhdGljXHJcbiAgICogQG1ldGhvZCBzZXRfdmlkZW9fY2xpY2tfY2FsbGJhY2tcclxuICAgKiBAZGVzY3JpcHRpb24gQXNzaWduIGEgY2FsbGJhY2sgdG8gYmUgcnVuIHdoZW4gYSB1c2VyIGNsaWNrcyBvbiBhIHZpZGVvIHBvc3RlclxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBmdW5jdGlvbiBjYWxsYmFja1xyXG4gICAqIFxyXG4gICAqIEB2b2lkXHJcbiAgICovXHJcbiAgc3RhdGljIHNldF92aWRlb19jbGlja19jYWxsYmFjayhmbikge1xyXG4gICAgdmlkZW9fcm93LnByb3RvdHlwZS52aWRlb19jbGlja19jYWxsYmFjayA9IGZuO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQHN0YXRpY1xyXG4gICAqIEBtZXRob2Qgc2V0X25hdmlnYXRpb25fY2FsbGJhY2tcclxuICAgKiBAZGVzY3JpcHRpb24gQXNzaWduIGEgY2FsbGJhY2sgdG8gYmUgcnVuIHdoZW4gYSB1c2VyIG5hdmlnYXRlcyBsZWZ0IG9yIHJpZ2h0IGluIHRoZSByb3dcclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gY2FsbGJhY2tcclxuICAgKiBcclxuICAgKiBAdm9pZFxyXG4gICAqL1xyXG4gIHN0YXRpYyBzZXRfbmF2aWdhdGlvbl9jYWxsYmFjayhmbikge1xyXG4gICAgdmlkZW9fcm93LnByb3RvdHlwZS5uYXZpZ2F0aW9uX2NhbGxiYWNrID0gZm47XHJcbiAgfVxyXG5cclxuICAvLyBBZGQgYSB2aWRlbyAob3IgdmlkZW9zKSB0byB0aGUgcm93XHJcbiAgLyoqXHJcbiAgICogQG1ldGhvZCBwdXNoXHJcbiAgICogQGRlc2NyaXB0aW9uIEFkZCBhIHZpZGVvIChvciB2aWRlb3MpIHRvIHRoZSByb3dcclxuICAgKiBAcGFyYW0ge09iamVjdHxBcnJheTxPYmplY3Q+fSB2aWRlbyBUaGUgdmlkZW8ocykgdG8gYWRkXHJcbiAgICogXHJcbiAgICogQHZvaWRcclxuICAgKi9cclxuICBwdXNoKHZpZGVvKSB7XHJcbiAgICAvLyBJZiB3ZSBnb3QgYW4gYXJyYXksIHRoZW4gY2FsbCBwdXNoIGZvciBlYWNoIGl0ZW1cclxuICAgIGlmIChBcnJheS5pc0FycmF5KHZpZGVvKSkge1xyXG4gICAgICB2aWRlby5mb3JFYWNoKCh2KSA9PiB7XHJcbiAgICAgICAgdGhpcy5wdXNoKHYpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgYSBicmFuZCBuZXcgcG9zdGVyIGZvciBlYWNoIHZpZGVvXHJcbiAgICBsZXQgZWxlbWVudCA9IG5ldyBwb3N0ZXIodmlkZW8pLmVsZW1lbnQ7XHJcblxyXG4gICAgLy8gUmVnaXN0ZXIgb3VyIGNsaWNrIGhhbmRsZXJcclxuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnZpZGVvJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUudmlkZW9fY2xpY2tfY2FsbGJhY2sodmlkZW8pO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLnZpZGVvcy5wdXNoKHZpZGVvKTtcclxuICAgIHRoaXMud3JhcHBlci5hcHBlbmRDaGlsZChlbGVtZW50KTtcclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgdGhlIHRvdGFsIG51bWJlciBvZiBzZWN0aW9ucyBsb2FkZWRcclxuICAgIHRoaXMudG90YWxfc2VjdGlvbnMgPSB0aGlzLndyYXBwZXIub2Zmc2V0V2lkdGggLyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQGdldCBlbGVtZW50XHJcbiAgICogQGRlc2NyaXB0aW9uIFJldHVybnMgdGhlIGJhc2UgRE9NIGVsZW1lbnQgb2YgdGhlIGNvbXBvbmVudFxyXG4gICAqIFxyXG4gICAqIEByZXR1cm4ge0hUTUxFbGVtZW50fSBzbGlkZSBUaGUgYmFzZSBET00gZWxlbWVudCBvZiB0aGUgY29tcG9uZW50XHJcbiAgICovXHJcbiAgZ2V0IGVsZW1lbnQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5yb3c7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCB2aWRlb19yb3c7XHJcbiJdfQ==
