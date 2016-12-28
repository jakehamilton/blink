(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ajax = function () {
  function ajax() {
    _classCallCheck(this, ajax);

    this.request;
  }

  _createClass(ajax, [{
    key: 'get',
    value: function get(url, parseJSON, headers) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.request = new XMLHttpRequest();
        _this.request.open('GET', url, true);

        if (headers) {
          Object.keys(headers).forEach(function (key) {
            _this.request.setRequestHeader(key, headers[key]);
          });
        }

        _this.request.addEventListener('load', function () {
          resolve(parseJSON ? JSON.parse(_this.request.response) : _this.request.response);
        });
        _this.request.addEventListener('error', function () {
          reject('Failed to communicate with server at url: ' + url);
        });
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

var slide = function () {
  function slide(stream) {
    _classCallCheck(this, slide);

    this.slide = document.importNode(document.querySelector('#hero-template').content, true);

    this.slide.querySelector('.slide__image').src = stream.channel.profile_banner || stream.channel.video_banner || stream.channel.logo;
    this.slide.querySelector('.slide__content__channel').innerText = stream.channel.display_name;
    this.slide.querySelector('.slide__content__description').innerText = stream.channel.status || "Streaming Live";
    this.slide.querySelector('.watch-now-button').addEventListener('click', function (event) {
      slide.prototype.watch_now_callback({
        name: stream.channel.name
      });
    });
  }

  _createClass(slide, [{
    key: 'element',
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

var player = function () {
  function player(id) {
    var _this = this;

    _classCallCheck(this, player);

    this.id = id;
    this.player;

    window.addEventListener('resize', function (event) {
      if (_this.player) {
        var i = document.querySelector('iframe');
        i.width = window.innerWidth;
        i.height = window.innerHeight;
      }
    });
  }

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
  }, {
    key: 'play',
    value: function play() {
      this.player.play();
    }
  }, {
    key: 'pause',
    value: function pause() {
      this.player.pause();
    }
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

var poster = function () {
  function poster(game) {
    _classCallCheck(this, poster);

    this.poster = document.importNode(document.querySelector('#poster-template').content, true);

    if (!game.thumbnail) {}

    if (game.type == 'stream') {
      game.thumbnail = game.channel.profile_banner || game.channel.logo || '';
      game.name = game.channel.display_name || game.channel.name;
    }

    this.poster.querySelector('.video__image').src = game.thumbnail;
    this.poster.querySelector('.video__title').innerText = game.name.length > 16 ? game.name.substr(0, 16) + '...' : game.name;
  }

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

var router = function () {
  function router() {
    var routes = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, router);

    this.routes = routes;
    this.active_route;
  }

  _createClass(router, [{
    key: 'route',
    value: function route(name) {
      if (this.active_route) this.active_route.classList.remove('visible');
      this.active_route = this.routes[name];
      this.routes[name].classList.add('visible');
    }
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
      console.log(this.routes[keys[0]]);
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

var storage = function () {
  function storage(namespace) {
    _classCallCheck(this, storage);

    this.load_storage_map(namespace);
  }

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
  }, {
    key: 'load',
    value: function load(name) {
      return window.localStorage.getItem('storage-' + this.namespace + '-' + this.storage_map[name]) || false;
    }
  }, {
    key: 'delete',
    value: function _delete(name) {
      window.localStorage.removeItem('storage-' + this.namespace + '-' + this.storage_map[name]);
    }
  }, {
    key: 'save_storage_map',
    value: function save_storage_map() {
      window.localStorage.setItem('storage-' + this.namespace, JSON.stringify(this.storage_map));
    }
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

var twitch = function () {
  function twitch(client_id) {
    _classCallCheck(this, twitch);

    if (!client_id) throw new Error('Twitch API requires `client_id` to be set');

    this.base_url = 'https://api.twitch.tv/kraken';
    this.client_id = client_id;
  }

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
  }, {
    key: 'get_follows',
    value: function get_follows(token, user) {
      var _this2 = this;

      var url = this.base_url + '/users/' + user + '/follows/channels?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true, { 'Client-ID': _this2.client_id }).then(function (_data) {
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

var video_row = function () {
  function video_row(name, initial_videos, data) {
    var _this = this;

    _classCallCheck(this, video_row);

    this.videos = [];
    this.data = data || false;
    this.row = document.importNode(document.querySelector('#row-template').content, true);
    this.row.querySelector('.title').innerText = name;
    this.wrapper = this.row.querySelector('.videos');

    this.section = 0;
    this.video_width = 315;
    this.total_sections = 0;
    this.videos_mask = this.row.querySelector('.videos__mask');
    this.control_left = this.row.querySelector('.row-control--left');
    this.control_right = this.row.querySelector('.row-control--right');

    this.control_left.addEventListener('click', function (event) {
      if (_this.section > 0) {
        _this.section--;
        _this.videos_mask.style.transform = 'translate3d(' + _this.video_width * (window.innerWidth / _this.video_width) * -_this.section + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'left', section: _this.section, total_sections: _this.total_sections, row: _this, data: _this.data, videos: _this.videos.length });
    });
    this.control_right.addEventListener('click', function (event) {
      if (!(window.innerWidth * .7 * (_this.section + 1) > _this.wrapper.offsetWidth)) {
        _this.section++;
        _this.videos_mask.style.transform = 'translate3d(' + _this.video_width * (window.innerWidth / _this.video_width) * -_this.section + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'right', section: _this.section, total_sections: _this.total_sections, row: _this, data: _this.data, videos: _this.videos.length });
    });

    if (initial_videos) {
      this.push(initial_videos);
    }
  }

  _createClass(video_row, [{
    key: 'push',
    value: function push(video) {
      var _this2 = this;

      if (Array.isArray(video)) {
        video.forEach(function (v) {
          _this2.push(v);
        });
        return;
      }

      var element = new _poster2.default(video).element;
      element.querySelector('.video').addEventListener('click', function () {
        video_row.prototype.video_click_callback(video);
      });
      this.videos.push(video);
      this.wrapper.appendChild(element);
      this.total_sections = this.wrapper.offsetWidth / (this.video_width * (window.innerWidth / this.video_width));
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYWpheC5qcyIsInNyYy9qcy9hcHAuanMiLCJzcmMvanMvaGVyby1zbGlkZS5qcyIsInNyYy9qcy9wbGF5ZXIuanMiLCJzcmMvanMvcG9zdGVyLmpzIiwic3JjL2pzL3JvdXRlci5qcyIsInNyYy9qcy9zdG9yYWdlLmpzIiwic3JjL2pzL3R3aXRjaC5qcyIsInNyYy9qcy92aWRlby1yb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0lDQU0sSTtBQUNKLGtCQUFjO0FBQUE7O0FBQ1osU0FBSyxPQUFMO0FBQ0Q7Ozs7d0JBRUcsRyxFQUFLLFMsRUFBVyxPLEVBQVM7QUFBQTs7QUFDM0IsYUFBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3RDLGNBQUssT0FBTCxHQUFlLElBQUksY0FBSixFQUFmO0FBQ0EsY0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QixJQUE5Qjs7QUFFQSxZQUFJLE9BQUosRUFBYTtBQUNYLGlCQUFPLElBQVAsQ0FBWSxPQUFaLEVBQ0csT0FESCxDQUNXLGVBQU87QUFDZCxrQkFBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsR0FBOUIsRUFBbUMsUUFBUSxHQUFSLENBQW5DO0FBQ0QsV0FISDtBQUlEOztBQUVELGNBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE1BQTlCLEVBQXNDLFlBQU07QUFDMUMsa0JBQVEsWUFBWSxLQUFLLEtBQUwsQ0FBVyxNQUFLLE9BQUwsQ0FBYSxRQUF4QixDQUFaLEdBQWdELE1BQUssT0FBTCxDQUFhLFFBQXJFO0FBQ0QsU0FGRDtBQUdBLGNBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE9BQTlCLEVBQXVDLFlBQU07QUFDM0MsaUJBQU8sK0NBQStDLEdBQXREO0FBQ0QsU0FGRDtBQUdBLGNBQUssT0FBTCxDQUFhLElB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OztBQUNWLFVBQUksTUFBTSxPQUFOLENBQWMsS0FBZCxDQUFKLEVBQTBCO0FBQ3hCLGNBQU0sT0FBTixDQUFjLFVBQUMsQ0FBRCxFQUFPO0FBQ25CLGlCQUFLLElBQUwsQ0FBVSxDQUFWO0FBQ0QsU0FGRDtBQUdBO0FBQ0Q7O0FBRUQsVUFBSSxVQUFVLHFCQUFXLEtBQVgsRUFBa0IsT0FBaEM7QUFDQSxjQUFRLGFBQVIsQ0FBc0IsUUFBdEIsRUFBZ0MsZ0JBQWhDLENBQWlELE9BQWpELEVBQTBELFlBQU07QUFDOUQsa0JBQVUsU0FBVixDQUFvQixvQkFBcEIsQ0FBeUMsS0FBekM7QUFDRCxPQUZEO0FBR0EsV0FBSyxNQUFMLENBQVksSUFBWixDQUFpQixLQUFqQjtBQUNBLFdBQUssT0FBTCxDQUFhLFdBQWIsQ0FBeUIsT0FBekI7QUFDQSxXQUFLLGNBQUwsR0FBc0IsS0FBSyxPQUFMLENBQWEsV0FBYixJQUE2QixLQUFLLFdBQUwsSUFBb0IsT0FBTyxVQUFQLEdBQW9CLEtBQUssV0FBN0MsQ0FBN0IsQ0FBdEI7QUFDRDs7O3dCQUVhO0FBQ1osYUFBTyxLQUFLLEdBQVo7QUFDRDs7OzZDQTNCK0IsRSxFQUFJO0FBQ2xDLGdCQUFVLFNBQVYsQ0FBb0Isb0JBQXBCLEdBQTJDLEVBQTNDO0FBQ0Q7Ozs0Q0FFOEIsRSxFQUFJO0FBQ2pDLGdCQUFVLFNBQVYsQ0FBb0IsbUJBQXBCLEdBQTBDLEVBQTFDO0FBQ0Q7Ozs7OztrQkF3QlksUyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjbGFzcyBhamF4IHtcclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMucmVxdWVzdDtcclxuICB9XHJcblxyXG4gIGdldCh1cmwsIHBhcnNlSlNPTiwgaGVhZGVycykge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgdGhpcy5yZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgIHRoaXMucmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xyXG5cclxuICAgICAgaWYgKGhlYWRlcnMpIHtcclxuICAgICAgICBPYmplY3Qua2V5cyhoZWFkZXJzKVxyXG4gICAgICAgICAgLmZvckVhY2goa2V5ID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pXHJcbiAgICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcclxuICAgICAgICByZXNvbHZlKHBhcnNlSlNPTiA/IEpTT04ucGFyc2UodGhpcy5yZXF1ZXN0LnJlc3BvbnNlKSA6IHRoaXMucmVxdWVzdC5yZXNwb25zZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgICB0aGlzLnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoKSA9PiB7XHJcbiAgICAgICAgcmVqZWN0KCdGYWlsZWQgdG8gY29tbXVuaWNhdGUgd2l0aCBzZXJ2ZXIgYXQgdXJsOiAnICsgdXJsKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHRoaXMucmVxdWVzdC5zZW5kKCk7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFqYXg7XHJcbiIsImltcG9ydCB0d2l0Y2ggZnJvbSAnLi90d2l0Y2guanMnO1xyXG5pbXBvcnQgc3RvcmFnZSBmcm9tICcuL3N0b3JhZ2UuanMnO1xyXG5pbXBvcnQgc2xpZGUgZnJvbSAnLi9oZXJvLXNsaWRlLmpzJztcclxuaW1wb3J0IHZpZGVvX3JvdyBmcm9tICcuL3ZpZGVvLXJvdy5qcyc7XHJcbmltcG9ydCB7ZGVmYXVsdCBhcyBibGlua19yb3V0ZXJ9IGZyb20gJy4vcm91dGVyLmpzJztcclxuaW1wb3J0IHtkZWZhdWx0IGFzIGJsaW5rX3BsYXllcn0gZnJvbSAnLi9wbGF5ZXIuanMnO1xyXG5cclxuLy8gVHdpdGNoIGNsaWVudCBpZCBmb3IgYXBpIHJlcXVlc3RzXHJcbmNvbnN0IGNsaWVudF9pZCA9ICdibTAybjh3eHh6cW16dmZiMHpsZWJkNXllMnJuMHI3JztcclxuXHJcbi8vIENvbnN0cnVjdCBhbiBhcGkgd3JhcHBlciBpbnN0YW5jZSwgc3RvcmFnZSBpbnN0YW5jZSwgYW5kIGEgdmlldyByb3V0ZXJcclxubGV0IGFwaSA9IG5ldyB0d2l0Y2goY2xpZW50X2lkKTtcclxubGV0IGRiID0gbmV3IHN0b3JhZ2UoJ2JsaW5rJyk7XHJcbmxldCByb3V0ZXIgPSBuZXcgYmxpbmtfcm91dGVyKCk7XHJcblxyXG4vLyBBdHRlbXB0IHRvIGxvYWQgYSBwcmV2aW91cyB0b2tlbiBmcm9tIGxvY2FsIHN0b3JhZ2VcclxubGV0IE9BVVRIX1RPS0VOID0gZGIubG9hZCgnb2F1dGhfdG9rZW4nKTtcclxuXHJcbi8vIElmIHdlIGRvbid0IGhhdmUgYW4gb2F1dGggdG9rZW4sIHRoZW4gY2hlY2sgaW4gdGhlIHVybCBoYXNoXHJcbmlmICghT0FVVEhfVE9LRU4pIHtcclxuICBsZXQgaGFzaCA9IGRvY3VtZW50LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEsIGRvY3VtZW50LmxvY2F0aW9uLmhhc2gubGVuZ3RoKTtcclxuICBsZXQgcGFpcnMgPSBoYXNoLnNwbGl0KCcmJyk7XHJcbiAgcGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xyXG4gICAgbGV0IGtleXMgPSBwYWlyLnNwbGl0KCc9Jyk7XHJcblxyXG4gICAgLy8gSWYgd2UgaGF2ZSBhIHRva2VuLCB0aGVuIHNhdmUgaXQgYW5kIHdpcGUgdGhlIHVybCBoYXNoXHJcbiAgICBpZiAoa2V5c1swXSA9PSAnYWNjZXNzX3Rva2VuJykge1xyXG4gICAgICBPQVVUSF9UT0tFTiA9IGtleXNbMV07XHJcbiAgICAgIGRiLnNhdmUoJ29hdXRoX3Rva2VuJywgT0FVVEhfVE9LRU4pO1xyXG4gICAgICBkb2N1bWVudC5sb2NhdGlvbi5oYXNoID0gJy8nO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIChldmVudCkgPT4ge1xyXG4gIC8vIENvbnN0cnVjdCBhIG5ldyB3cmFwcGVyIGZvciB0aGUgdHdpdGNoIHBsYXllclxyXG4gIGxldCBwbGF5ZXIgPSBuZXcgYmxpbmtfcGxheWVyKCdwbGF5ZXItd3JhcHBlcicpO1xyXG5cclxuICAvLyBSb3V0aW5nXHJcbiAgcm91dGVyLmFkZF9yb3V0ZShbXHJcbiAgICB7J3ZpZGVvcyc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKX0sXHJcbiAgICB7J3BsYXllcic6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwbGF5ZXInKX0sXHJcbiAgICB7J3NlYXJjaCc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzZWFyY2gnKX0sXHJcbiAgICB7J3Byb21wdCc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcm9tcHQnKX1cclxuICBdKTtcclxuXHJcbiAgaWYgKCFPQVVUSF9UT0tFTikge1xyXG4gICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhbiBvYXV0aCB0b2tlbiwgYXNrIHRoZSB1c2VyIHRvIHNpZ24gaW5cclxuICAgIHJvdXRlci5yb3V0ZSgncHJvbXB0Jyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIE90aGVyd2lzZSwgbGV0IHRoZW0gdmlldyB0aGVpciBjb250ZW50XHJcbiAgICByb3V0ZXIucm91dGUoJ3ZpZGVvcycpO1xyXG4gIH1cclxuXHJcbiAgLy8gRXhpdHMgdGhlIHBsYXllciBvbiBjbGlja1xyXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5leGl0LWJ0bicpXHJcbiAgICAuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcclxuICAgICAgcGxheWVyLmRlc3Ryb3koKTtcclxuICAgICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcclxuICAgIH0pO1xyXG5cclxuICAvLyBMb2FkcyB0aGUgcGxheWVyIHdoZW4gYSB2aWRlbyBpcyBzZWxlY3RlZFxyXG4gIHZpZGVvX3Jvdy5zZXRfdmlkZW9fY2xpY2tfY2FsbGJhY2soKHZpZGVvKSA9PiB7XHJcbiAgICBpZiAodmlkZW8udHlwZSA9PSAnYXJjaGl2ZScpIHtcclxuICAgICAgcGxheWVyLmxvYWQoeyB2aWRlbzogdmlkZW8uaWQgfSk7XHJcbiAgICB9IGVsc2UgaWYgKHZpZGVvLnR5cGUgPT0gJ3N0cmVhbScpIHtcclxuICAgICAgcGxheWVyLmxvYWQoeyBjaGFubmVsOiB2aWRlby5jaGFubmVsLm5hbWUgfSk7XHJcbiAgICB9XHJcbiAgICByb3V0ZXIucm91dGUoJ3BsYXllcicpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBMb2FkIG1vcmUgY29udGVudCB3aGVuIHRoZSB1c2VyIHNjcm9sbHMgdG8gdGhlIHNpZGVcclxuICB2aWRlb19yb3cuc2V0X25hdmlnYXRpb25fY2FsbGJhY2soKGV2ZW50KSA9PiB7XHJcbiAgICBpZiAoZXZlbnQuc2VjdGlvbiA+PSBldmVudC50b3RhbF9zZWN0aW9ucyAtIDIgJiYgZXZlbnQuZGF0YSkge1xyXG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKGV2ZW50LmRhdGEudXNlcm5hbWUsIGV2ZW50LmRhdGEubGltaXQsIGV2ZW50LnZpZGVvcylcclxuICAgICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgIGV2ZW50LnJvdy5wdXNoKHJlc3BvbnNlLnZpZGVvcyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIC8vIExvYWQgdGhlIHBsYXllciB3aGVuIHRoZSB1c2VyIGNsaWNrcyBvbiB0aGUgXCJ3YXRjaCBub3dcIlxyXG4gIC8vICBidXR0b24gaW4gdGhlIGJhbm5lclxyXG4gIHNsaWRlLnNldF93YXRjaF9ub3dfY2FsbGJhY2soKHN0cmVhbSkgPT4ge1xyXG4gICAgcGxheWVyLmxvYWQoeyBjaGFubmVsOiBzdHJlYW0ubmFtZSB9KTtcclxuICAgIHJvdXRlci5yb3V0ZSgncGxheWVyJyk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIEdldCB0aGUgY3VycmVudCB1c2VyJ3MgaW5mb1xyXG4gIGFwaS5nZXRfdXNlcihPQVVUSF9UT0tFTilcclxuICAgIC50aGVuKCh1c2VyKSA9PiB7XHJcbiAgICAgIC8vIEdldCBhbGwgbGl2ZSBmb2xsb3dlZCBjaGFubmVsc1xyXG4gICAgICBhcGkuZ2V0X3VzZXJfc3RyZWFtX2ZvbGxvd3MoT0FVVEhfVE9LRU4pXHJcbiAgICAgICAgLnRoZW4oKHN0cmVhbXMpID0+IHtcclxuICAgICAgICAgIC8vIFBvcHVsYXRlIHRoZSBoZXJvIGJhbm5lclxyXG4gICAgICAgICAgbGV0IGlzX2ZpcnN0ID0gdHJ1ZTtcclxuICAgICAgICAgIHN0cmVhbXMuZm9yRWFjaCgoc3RyZWFtKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBzID0gbmV3IHNsaWRlKHN0cmVhbSk7XHJcbiAgICAgICAgICAgIGxldCBlbGVtZW50ID0gcy5lbGVtZW50O1xyXG4gICAgICAgICAgICBpZiAoaXNfZmlyc3QpIHtcclxuICAgICAgICAgICAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvX19zbGlkZScpLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcclxuICAgICAgICAgICAgICBpc19maXJzdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvJykuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBDcmVhdGUgYSB2aWRlbyByb3cgb2YgXCJsaXZlXCIgc3RyZWFtc1xyXG4gICAgICAgICAgbGV0IHJvdyA9IG5ldyB2aWRlb19yb3coJ0xpdmUnLCBzdHJlYW1zKTtcclxuICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKS5hcHBlbmRDaGlsZChyb3cuZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgLy8gUG9wdWxhdGUgdGhlIHJlc3RcclxuICAgICAgICAgIGFwaS5nZXRfZm9sbG93cyhPQVVUSF9UT0tFTiwgdXNlci5uYW1lKVxyXG4gICAgICAgICAgICAudGhlbigoY2hhbm5lbHMpID0+IHtcclxuICAgICAgICAgICAgICBxdWV1ZV9yb3dzKGNoYW5uZWxzLmZvbGxvd3MpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG5cclxuXHJcbiAgbGV0IGhlcm9faGlnaGxpZ2h0X3Nwb3RzID0gMTtcclxuICBsZXQgaGVyb19zcG90bGlnaHRzID0gW107XHJcblxyXG4gIC8vIEFzeW5jIGNyZWF0ZXMgdmlkZW8gcm93c1xyXG4gIGZ1bmN0aW9uIHF1ZXVlX3Jvd3ModXNlcnMpIHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGlmICh1c2Vycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgZmlsbCh1c2Vyc1swXSlcclxuICAgICAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHVzZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICBxdWV1ZV9yb3dzKHVzZXJzLnNsaWNlKDEsIHVzZXJzLmxlbmd0aCkpLnRoZW4ocmVzb2x2ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZXMgYW4gaW5kaXZpZHVhbCB2aWRlbyByb3cgYW5kIGZpbGxzIGl0IHdpdGggYXZhaWxhYmxlIGNvbnRlbnRcclxuICBmdW5jdGlvbiBmaWxsKHVzZXIsIGlzTGFzdCkge1xyXG4gICAgbGV0IHJvdyA9IG5ldyB2aWRlb19yb3codXNlci5jaGFubmVsLmRpc3BsYXlfbmFtZSwgbnVsbCwgeyB1c2VybmFtZTogdXNlci5jaGFubmVsLm5hbWUsIGxpbWl0OiAxMH0pO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgYXBpLmdldF91c2VyX3ZpZGVvcyh1c2VyLmNoYW5uZWwubmFtZSwgMTApXHJcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICBpZiAocmVzcG9uc2UudmlkZW9zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcm93LnB1c2gocmVzcG9uc2UudmlkZW9zKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ZpZGVvcycpLmFwcGVuZENoaWxkKHJvdy5lbGVtZW50KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pXHJcbiAgfVxyXG59KTtcclxuIiwiY2xhc3Mgc2xpZGUge1xyXG4gIGNvbnN0cnVjdG9yKHN0cmVhbSkge1xyXG4gICAgdGhpcy5zbGlkZSA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2hlcm8tdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcclxuXHJcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9faW1hZ2UnKS5zcmMgPSBzdHJlYW0uY2hhbm5lbC5wcm9maWxlX2Jhbm5lciB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmNoYW5uZWwudmlkZW9fYmFubmVyIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJlYW0uY2hhbm5lbC5sb2dvO1xyXG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcuc2xpZGVfX2NvbnRlbnRfX2NoYW5uZWwnKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5kaXNwbGF5X25hbWU7XHJcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9fY29udGVudF9fZGVzY3JpcHRpb24nKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5zdGF0dXMgfHwgXCJTdHJlYW1pbmcgTGl2ZVwiO1xyXG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcud2F0Y2gtbm93LWJ1dHRvbicpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XHJcbiAgICAgIHNsaWRlLnByb3RvdHlwZS53YXRjaF9ub3dfY2FsbGJhY2soe1xyXG4gICAgICAgIG5hbWU6IHN0cmVhbS5jaGFubmVsLm5hbWVcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIHNldF93YXRjaF9ub3dfY2FsbGJhY2soZm4pIHtcclxuICAgIHNsaWRlLnByb3RvdHlwZS53YXRjaF9ub3dfY2FsbGJhY2sgPSBmbjtcclxuICB9XHJcblxyXG4gIGdldCBlbGVtZW50KCkge1xyXG4gICAgcmV0dXJuIHRoaXMuc2xpZGU7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBzbGlkZTtcclxuIiwiY2xhc3MgcGxheWVyIHtcclxuICBjb25zdHJ1Y3RvcihpZCkge1xyXG4gICAgdGhpcy5pZCA9IGlkO1xyXG4gICAgdGhpcy5wbGF5ZXI7XHJcblxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcclxuICAgICAgICBsZXQgaSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lmcmFtZScpO1xyXG4gICAgICAgIGkud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcclxuICAgICAgICBpLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBsb2FkKG9wdGlvbnMgPSB7dmlkZW8sIGNoYW5uZWx9KSB7XHJcbiAgICBsZXQgY29uZmlnID0ge1xyXG4gICAgICB3aWR0aDogd2luZG93LmlubmVyV2lkdGgsXHJcbiAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0XHJcbiAgICB9O1xyXG4gICAgaWYgKG9wdGlvbnMudmlkZW8pIGNvbmZpZy52aWRlbyA9IG9wdGlvbnMudmlkZW87XHJcbiAgICBpZiAob3B0aW9ucy5jaGFubmVsKSBjb25maWcuY2hhbm5lbCA9IG9wdGlvbnMuY2hhbm5lbDtcclxuXHJcbiAgICB0aGlzLnBsYXllciA9IG5ldyBUd2l0Y2guUGxheWVyKHRoaXMuaWQsIGNvbmZpZyk7XHJcbiAgfVxyXG5cclxuICBwbGF5KCkge1xyXG4gICAgdGhpcy5wbGF5ZXIucGxheSgpO1xyXG4gIH1cclxuXHJcbiAgcGF1c2UoKSB7XHJcbiAgICB0aGlzLnBsYXllci5wYXVzZSgpO1xyXG4gIH1cclxuXHJcbiAgZGVzdHJveSgpIHtcclxuICAgIHRoaXMucGxheWVyID0gJyc7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmlkKS5pbm5lckhUTUwgPSAnJztcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHBsYXllcjtcclxuIiwiY2xhc3MgcG9zdGVyIHtcclxuICBjb25zdHJ1Y3RvcihnYW1lKSB7XHJcbiAgICB0aGlzLnBvc3RlciA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Bvc3Rlci10ZW1wbGF0ZScpLmNvbnRlbnQsIHRydWUpO1xyXG5cclxuICAgIGlmICghZ2FtZS50aHVtYm5haWwpIHtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGdhbWUudHlwZSA9PSAnc3RyZWFtJykge1xyXG4gICAgICBnYW1lLnRodW1ibmFpbCA9IGdhbWUuY2hhbm5lbC5wcm9maWxlX2Jhbm5lciB8fCBnYW1lLmNoYW5uZWwubG9nbyB8fCAnJztcclxuICAgICAgZ2FtZS5uYW1lID0gZ2FtZS5jaGFubmVsLmRpc3BsYXlfbmFtZSB8fCBnYW1lLmNoYW5uZWwubmFtZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnBvc3Rlci5xdWVyeVNlbGVjdG9yKCcudmlkZW9fX2ltYWdlJykuc3JjID0gZ2FtZS50aHVtYm5haWw7XHJcbiAgICB0aGlzLnBvc3Rlci5xdWVyeVNlbGVjdG9yKCcudmlkZW9fX3RpdGxlJykuaW5uZXJUZXh0ID0gZ2FtZS5uYW1lLmxlbmd0aCA+IDE2ID8gZ2FtZS5uYW1lLnN1YnN0cigwLCAxNikgKyAnLi4uJyA6IGdhbWUubmFtZTtcclxuICB9XHJcblxyXG4gIGdldCBlbGVtZW50KCkge1xyXG4gICAgcmV0dXJuIHRoaXMucG9zdGVyO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgcG9zdGVyO1xyXG4iLCJjbGFzcyByb3V0ZXIge1xyXG4gIGNvbnN0cnVjdG9yKHJvdXRlcyA9IHt9KSB7XHJcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcztcclxuICAgIHRoaXMuYWN0aXZlX3JvdXRlO1xyXG4gIH1cclxuXHJcbiAgcm91dGUobmFtZSkge1xyXG4gICAgaWYgKHRoaXMuYWN0aXZlX3JvdXRlKSB0aGlzLmFjdGl2ZV9yb3V0ZS5jbGFzc0xpc3QucmVtb3ZlKCd2aXNpYmxlJyk7XHJcbiAgICB0aGlzLmFjdGl2ZV9yb3V0ZSA9IHRoaXMucm91dGVzW25hbWVdO1xyXG4gICAgdGhpcy5yb3V0ZXNbbmFtZV0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xyXG4gIH1cclxuXHJcbiAgYWRkX3JvdXRlKHJvdXRlKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShyb3V0ZSkpIHtcclxuICAgICAgcm91dGUuZm9yRWFjaCgocikgPT4ge1xyXG4gICAgICAgIHRoaXMuYWRkX3JvdXRlKHIpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXMocm91dGUpO1xyXG4gICAgdGhpcy5yb3V0ZXNba2V5c1swXV0gPSByb3V0ZVtrZXlzWzBdXTtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMucm91dGVzW2tleXNbMF1dKTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHJvdXRlcjtcclxuIiwiY2xhc3Mgc3RvcmFnZSB7XHJcbiAgY29uc3RydWN0b3IobmFtZXNwYWNlKSB7XHJcbiAgICB0aGlzLmxvYWRfc3RvcmFnZV9tYXAobmFtZXNwYWNlKTtcclxuICB9XHJcbiAgdW5pcXVlX2lkKHNpemUpIHtcclxuICAgIGxldCBhbHBoYWJldCA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMTIzNDU2Nzg5MCQmLV8rJztcclxuICAgIGxldCBpZCA9ICcnO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcclxuICAgICAgaWQgKz0gYWxwaGFiZXRbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYWxwaGFiZXQubGVuZ3RoKV07XHJcbiAgICB9XHJcblxyXG4gICAgT2JqZWN0LmtleXModGhpcy5zdG9yYWdlX21hcCkuZm9yRWFjaCgoa2V5KSA9PiB7XHJcbiAgICAgIGlmIChrZXkgPT09IGlkKSB7XHJcbiAgICAgICAgcmV0dXJuIHVuaXF1ZV9pZChzaXplKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGlkO1xyXG4gIH1cclxuICBzYXZlKG5hbWUsIGRhdGEpIHtcclxuICAgIGlmICghdGhpcy5zdG9yYWdlX21hcFtuYW1lXSkge1xyXG4gICAgICB0aGlzLnN0b3JhZ2VfbWFwW25hbWVdID0gdGhpcy51bmlxdWVfaWQoNSk7XHJcbiAgICB9XHJcbiAgICBsZXQga2V5ID0gdGhpcy5zdG9yYWdlX21hcFtuYW1lXTtcclxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfS0ke2tleX1gLCAodHlwZW9mIGRhdGEgPT0gJ09iamVjdCcpID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkgOiBkYXRhKTtcclxuICAgIHRoaXMuc2F2ZV9zdG9yYWdlX21hcCgpO1xyXG4gIH1cclxuICBsb2FkKG5hbWUpIHtcclxuICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX0tJHt0aGlzLnN0b3JhZ2VfbWFwW25hbWVdfWApIHx8IGZhbHNlO1xyXG4gIH1cclxuICBkZWxldGUobmFtZSkge1xyXG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9LSR7dGhpcy5zdG9yYWdlX21hcFtuYW1lXX1gKTtcclxuICB9XHJcbiAgc2F2ZV9zdG9yYWdlX21hcCgpIHtcclxuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfWAsIEpTT04uc3RyaW5naWZ5KHRoaXMuc3RvcmFnZV9tYXApKTtcclxuICB9XHJcbiAgbG9hZF9zdG9yYWdlX21hcChuYW1lc3BhY2UpIHtcclxuICAgIHRoaXMubmFtZXNwYWNlID0gbmFtZXNwYWNlO1xyXG4gICAgdGhpcy5zdG9yYWdlX21hcCA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9YCkgfHwgJ3t9Jyk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBzdG9yYWdlO1xyXG4iLCJpbXBvcnQgYWpheCBmcm9tICcuL2FqYXguanMnO1xyXG5cclxubGV0IGh0dHAgPSBuZXcgYWpheCgpO1xyXG5cclxuY2xhc3MgdHdpdGNoIHtcclxuICBjb25zdHJ1Y3RvcihjbGllbnRfaWQpIHtcclxuICAgIGlmICghY2xpZW50X2lkKSB0aHJvdyBuZXcgRXJyb3IoJ1R3aXRjaCBBUEkgcmVxdWlyZXMgYGNsaWVudF9pZGAgdG8gYmUgc2V0Jyk7XHJcblxyXG4gICAgdGhpcy5iYXNlX3VybCA9ICdodHRwczovL2FwaS50d2l0Y2gudHYva3Jha2VuJztcclxuICAgIHRoaXMuY2xpZW50X2lkID0gY2xpZW50X2lkO1xyXG4gIH1cclxuXHJcbiAgZ2V0X3VzZXIodG9rZW4pIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS91c2VyP29hdXRoX3Rva2VuPSR7dG9rZW59YDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRfZm9sbG93cyh0b2tlbiwgdXNlcikge1xyXG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3VzZXJzLyR7dXNlcn0vZm9sbG93cy9jaGFubmVscz9vYXV0aF90b2tlbj0ke3Rva2VufSZsaW1pdD0xMDBgO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxyXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xyXG4gICAgICAgICAgX2RhdGEuZm9sbG93cy5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPCBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYS5jaGFubmVsLmRpc3BsYXlfbmFtZS50b0xvd2VyQ2FzZSgpID4gYi5jaGFubmVsLmRpc3BsYXlfbmFtZS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgZ2V0X3RvcF9nYW1lcyhsaW1pdCA9IDE1LCBvZmZzZXQgPSAwKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vZ2FtZXMvdG9wP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH1gO1xyXG4gICAgbGV0IGRhdGEgPSB7fTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIGRhdGEubmV4dCA9IF9kYXRhLl9saW5rcy5uZXh0O1xyXG4gICAgICAgICAgZGF0YS5nYW1lcyA9IFtdO1xyXG5cclxuICAgICAgICAgIF9kYXRhLnRvcC5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBnYW1lID0ge307XHJcbiAgICAgICAgICAgIGdhbWUudmlld2VycyA9IGl0ZW0udmlld2VycztcclxuICAgICAgICAgICAgZ2FtZS5jaGFubmVscyA9IGl0ZW0uY2hhbm5lbHM7XHJcbiAgICAgICAgICAgIGdhbWUubmFtZSA9IGl0ZW0uZ2FtZS5uYW1lO1xyXG4gICAgICAgICAgICBnYW1lLnBvc3RlcnMgPSB7XHJcbiAgICAgICAgICAgICAgbGFyZ2U6IGl0ZW0uZ2FtZS5ib3gubGFyZ2UsXHJcbiAgICAgICAgICAgICAgbWVkaXVtOiBpdGVtLmdhbWUuYm94Lm1lZGl1bSxcclxuICAgICAgICAgICAgICBzbWFsbDogaXRlbS5nYW1lLmJveC5zbWFsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWUudGh1bWJuYWlsID0gaXRlbS5nYW1lLmJveC5tZWRpdW07XHJcblxyXG4gICAgICAgICAgICBkYXRhLmdhbWVzLnB1c2goZ2FtZSk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRfdG9wX3ZpZGVvcyhsaW1pdCA9IDE1LCBvZmZzZXQgPSAwLCBnYW1lLCBwZXJpb2QpIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS92aWRlb3MvdG9wP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH0ke2dhbWUgPyAnJmdhbWU9JyArIGdhbWUgOiAnJ30ke3BlcmlvZCA/ICcmcGVyaW9kPScgKyBwZXJpb2QgOiAnJ31gO1xyXG4gICAgbGV0IGRhdGEgPSB7fTtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIGRhdGEubmV4dCA9IF9kYXRhLl9saW5rcy5uZXh0O1xyXG4gICAgICAgICAgZGF0YS52aWRlb3MgPSBbXTtcclxuXHJcbiAgICAgICAgICBfZGF0YS52aWRlb3MuZm9yRWFjaCgoaXRlbSkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgdmlkZW8gPSB7fTtcclxuICAgICAgICAgICAgdmlkZW8ubmFtZSA9IGl0ZW0udGl0bGU7XHJcbiAgICAgICAgICAgIHZpZGVvLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgdmlkZW8uYnJvYWRjYXN0X2lkID0gaXRlbS5icm9hZGNhc3RfaWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmlkID0gaXRlbS5faWQ7XHJcbiAgICAgICAgICAgIHZpZGVvLnR5cGUgPSBpdGVtLmJyb2FkY2FzdF90eXBlO1xyXG4gICAgICAgICAgICB2aWRlby52aWV3cyA9IGl0ZW0udmlld3M7XHJcbiAgICAgICAgICAgIHZpZGVvLmNyZWF0ZWRfYXQgPSBpdGVtLmNyZWF0ZWRfYXQ7XHJcbiAgICAgICAgICAgIHZpZGVvLmdhbWUgPSBpdGVtLmdhbWU7XHJcbiAgICAgICAgICAgIHZpZGVvLmNoYW5uZWwgPSBpdGVtLmNoYW5uZWwubmFtZTtcclxuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbF9kaXNwbGF5X25hbWUgPSBpdGVtLmNoYW5uZWwuZGlzcGxheV9uYW1lO1xyXG4gICAgICAgICAgICB2aWRlby50aHVtYm5haWwgPSBpdGVtLnRodW1ibmFpbHNbMF0udXJsO1xyXG5cclxuICAgICAgICAgICAgZGF0YS52aWRlb3MucHVzaCh2aWRlbyk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBnZXRfdXNlcl92aWRlb3MoY2hhbm5lbCwgbGltaXQgPSAxNSwgb2Zmc2V0ID0gMCwgYnJvYWRjYXN0cyA9IHRydWUsIGhsc19vbmx5KSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vY2hhbm5lbHMvJHtjaGFubmVsfS92aWRlb3M/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fSR7YnJvYWRjYXN0cyA/ICcmYnJvYWRjYXN0cz10cnVlJyA6ICcnfSR7aGxzX29ubHkgPyAnJmhscz10cnVlJyA6ICcnfWA7XHJcbiAgICBsZXQgZGF0YSA9IHt9O1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxyXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xyXG4gICAgICAgICAgZGF0YS5uZXh0ID0gX2RhdGEuX2xpbmtzLm5leHQ7XHJcbiAgICAgICAgICBkYXRhLnZpZGVvcyA9IFtdO1xyXG5cclxuICAgICAgICAgIF9kYXRhLnZpZGVvcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGl0ZW0pXHJcbiAgICAgICAgICAgIGxldCB2aWRlbyA9IHt9O1xyXG4gICAgICAgICAgICB2aWRlby5uYW1lID0gaXRlbS50aXRsZTtcclxuICAgICAgICAgICAgdmlkZW8uZGVzY3JpcHRpb24gPSBpdGVtLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICB2aWRlby5icm9hZGNhc3RfaWQgPSBpdGVtLmJyb2FkY2FzdF9pZDtcclxuICAgICAgICAgICAgdmlkZW8uaWQgPSBpdGVtLl9pZDtcclxuICAgICAgICAgICAgdmlkZW8udHlwZSA9IGl0ZW0uYnJvYWRjYXN0X3R5cGU7XHJcbiAgICAgICAgICAgIHZpZGVvLnZpZXdzID0gaXRlbS52aWV3cztcclxuICAgICAgICAgICAgdmlkZW8uY3JlYXRlZF9hdCA9IGl0ZW0uY3JlYXRlZF9hdDtcclxuICAgICAgICAgICAgdmlkZW8uZ2FtZSA9IGl0ZW0uZ2FtZTtcclxuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbCA9IGl0ZW0uY2hhbm5lbC5uYW1lO1xyXG4gICAgICAgICAgICB2aWRlby5jaGFubmVsX2Rpc3BsYXlfbmFtZSA9IGl0ZW0uY2hhbm5lbC5kaXNwbGF5X25hbWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWl0ZW0udGh1bWJuYWlsc1swXSkge1xyXG4gICAgICAgICAgICAgIHZpZGVvLnRodW1ibmFpbCA9ICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXNzZXRzL2ltZy9wbGFjZWhvbGRlci5qcGcnO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHZpZGVvLnRodW1ibmFpbCA9IGl0ZW0udGh1bWJuYWlsc1swXS51cmw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRhdGEudmlkZW9zLnB1c2godmlkZW8pO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0X3N0cmVhbShjaGFubmVsKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vc3RyZWFtcy8ke2NoYW5uZWx9YDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSlcclxuICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICB9XHJcblxyXG4gIGdldF91c2VyX3ZpZGVvX2ZvbGxvd3ModG9rZW4pIHtcclxuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS92aWRlb3MvZm9sbG93ZWQ/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcclxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcclxuICAgICAgICAgIHJlc29sdmUoX2RhdGEuc3RyZWFtcyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGdldF91c2VyX3N0cmVhbV9mb2xsb3dzKHRva2VuKSB7XHJcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vc3RyZWFtcy9mb2xsb3dlZD9vYXV0aF90b2tlbj0ke3Rva2VufSZsaW1pdD0xMDBgO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxyXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xyXG4gICAgICAgICAgcmVzb2x2ZShfZGF0YS5zdHJlYW1zLm1hcCgoc3RyZWFtKSA9PiB7XHJcbiAgICAgICAgICAgIHN0cmVhbS50eXBlID0gJ3N0cmVhbSc7XHJcbiAgICAgICAgICAgIHJldHVybiBzdHJlYW07XHJcbiAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHR3aXRjaDtcclxuIiwiaW1wb3J0IHBvc3RlciBmcm9tICcuL3Bvc3Rlci5qcyc7XHJcblxyXG5jbGFzcyB2aWRlb19yb3cge1xyXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGluaXRpYWxfdmlkZW9zLCBkYXRhKSB7XHJcbiAgICB0aGlzLnZpZGVvcyA9IFtdO1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YSB8fCBmYWxzZTtcclxuICAgIHRoaXMucm93ID0gZG9jdW1lbnQuaW1wb3J0Tm9kZShkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcm93LXRlbXBsYXRlJykuY29udGVudCwgdHJ1ZSk7XHJcbiAgICB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcudGl0bGUnKS5pbm5lclRleHQgPSBuYW1lO1xyXG4gICAgdGhpcy53cmFwcGVyID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnZpZGVvcycpO1xyXG5cclxuICAgIHRoaXMuc2VjdGlvbiA9IDA7XHJcbiAgICB0aGlzLnZpZGVvX3dpZHRoID0gMzE1O1xyXG4gICAgdGhpcy50b3RhbF9zZWN0aW9ucyA9IDA7XHJcbiAgICB0aGlzLnZpZGVvc19tYXNrID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnZpZGVvc19fbWFzaycpO1xyXG4gICAgdGhpcy5jb250cm9sX2xlZnQgPSB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcucm93LWNvbnRyb2wtLWxlZnQnKTtcclxuICAgIHRoaXMuY29udHJvbF9yaWdodCA9IHRoaXMucm93LnF1ZXJ5U2VsZWN0b3IoJy5yb3ctY29udHJvbC0tcmlnaHQnKTtcclxuXHJcbiAgICB0aGlzLmNvbnRyb2xfbGVmdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAodGhpcy5zZWN0aW9uID4gMCkge1xyXG4gICAgICAgIHRoaXMuc2VjdGlvbi0tO1xyXG4gICAgICAgIHRoaXMudmlkZW9zX21hc2suc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKCcgKyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkgKiAtdGhpcy5zZWN0aW9uKSArICdweCwgMCwgMCknO1xyXG4gICAgICB9XHJcbiAgICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUubmF2aWdhdGlvbl9jYWxsYmFjayh7IGRpcmVjdGlvbjogJ2xlZnQnICwgc2VjdGlvbjogdGhpcy5zZWN0aW9uLCB0b3RhbF9zZWN0aW9uczogdGhpcy50b3RhbF9zZWN0aW9ucywgcm93OiB0aGlzLCBkYXRhOiB0aGlzLmRhdGEsIHZpZGVvczogdGhpcy52aWRlb3MubGVuZ3RofSk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMuY29udHJvbF9yaWdodC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xyXG4gICAgICBpZiAoISgod2luZG93LmlubmVyV2lkdGggKiAuNykgKiAodGhpcy5zZWN0aW9uICsgMSkgPiB0aGlzLndyYXBwZXIub2Zmc2V0V2lkdGgpKSB7XHJcbiAgICAgICAgdGhpcy5zZWN0aW9uKys7XHJcbiAgICAgICAgdGhpcy52aWRlb3NfbWFzay5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoJyArICgodGhpcy52aWRlb193aWR0aCAqICh3aW5kb3cuaW5uZXJXaWR0aCAvIHRoaXMudmlkZW9fd2lkdGgpKSAqIC10aGlzLnNlY3Rpb24pICsgJ3B4LCAwLCAwKSc7XHJcbiAgICAgIH1cclxuICAgICAgdmlkZW9fcm93LnByb3RvdHlwZS5uYXZpZ2F0aW9uX2NhbGxiYWNrKHsgZGlyZWN0aW9uOiAncmlnaHQnICwgc2VjdGlvbjogdGhpcy5zZWN0aW9uLCB0b3RhbF9zZWN0aW9uczogdGhpcy50b3RhbF9zZWN0aW9ucywgcm93OiB0aGlzLCBkYXRhOiB0aGlzLmRhdGEsIHZpZGVvczogdGhpcy52aWRlb3MubGVuZ3RofSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoaW5pdGlhbF92aWRlb3MpIHtcclxuICAgICAgdGhpcy5wdXNoKGluaXRpYWxfdmlkZW9zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpYyBzZXRfdmlkZW9fY2xpY2tfY2FsbGJhY2soZm4pIHtcclxuICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUudmlkZW9fY2xpY2tfY2FsbGJhY2sgPSBmbjtcclxuICB9XHJcblxyXG4gIHN0YXRpYyBzZXRfbmF2aWdhdGlvbl9jYWxsYmFjayhmbikge1xyXG4gICAgdmlkZW9fcm93LnByb3RvdHlwZS5uYXZpZ2F0aW9uX2NhbGxiYWNrID0gZm47XHJcbiAgfVxyXG5cclxuICBwdXNoKHZpZGVvKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2aWRlbykpIHtcclxuICAgICAgdmlkZW8uZm9yRWFjaCgodikgPT4ge1xyXG4gICAgICAgIHRoaXMucHVzaCh2KTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbGV0IGVsZW1lbnQgPSBuZXcgcG9zdGVyKHZpZGVvKS5lbGVtZW50O1xyXG4gICAgZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcudmlkZW8nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgdmlkZW9fcm93LnByb3RvdHlwZS52aWRlb19jbGlja19jYWxsYmFjayh2aWRlbyk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMudmlkZW9zLnB1c2godmlkZW8pO1xyXG4gICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xyXG4gICAgdGhpcy50b3RhbF9zZWN0aW9ucyA9IHRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCAvICgodGhpcy52aWRlb193aWR0aCAqICh3aW5kb3cuaW5uZXJXaWR0aCAvIHRoaXMudmlkZW9fd2lkdGgpKSk7XHJcbiAgfVxyXG5cclxuICBnZXQgZWxlbWVudCgpIHtcclxuICAgIHJldHVybiB0aGlzLnJvdztcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHZpZGVvX3JvdztcclxuIl19
